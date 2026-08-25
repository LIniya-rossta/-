import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';
import multer from 'multer';
import pg from 'pg';
import { createBot, sendOrderToShop } from './bot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const DATABASE_URL = process.env.DATABASE_URL || '';
const SHOP_PASSWORD = process.env.SHOP_PASSWORD || '';
// URL of the central bot server (set this on OTHER shop deployments to point here)
// Leave empty on this (main) deployment where the bot actually runs
const BOT_SERVER_URL = (process.env.BOT_SERVER_URL || '').replace(/\/$/, '');

// ===== DATA LAYER =====
// Uses PostgreSQL when DATABASE_URL is set, otherwise falls back to JSON file

const DATA_DIR = join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'site-data.json');
const DEFAULT_DATA_FILE = join(DATA_DIR, 'default-data.json');
const BOOKINGS_FILE = join(DATA_DIR, 'booking-requests.json');
const UPLOADS_DIR = join(__dirname, 'dist', 'uploads');

const BLUEBIRD_IMAGE_MAP = {
  '/images/bluebird-mark.svg': '/images/bluebird-logo.jpg',
  '/images/bluebird/workshop-wide.jpg': '/images/bluebird/temp/gallery-classroom.jpg',
  '/images/bluebird/workshop.jpg': '/images/bluebird/temp/gallery-workshop.jpg',
  '/images/bluebird/activity-beads-wide.jpg': '/images/bluebird/temp/gallery-materials.jpg',
  '/images/bluebird/activity-beads.jpg': '/images/bluebird/temp/gallery-materials.jpg',
  '/images/bluebird/independent-work.jpg': '/images/bluebird/temp/gallery-reading.jpg',
  '/images/bluebird/classroom.jpg': '/images/bluebird/temp/gallery-classroom.jpg',
  '/images/bluebird/outdoor-space.jpg': '/images/bluebird/temp/gallery-outdoor.jpg'
};

function migrateBluebirdImages(value) {
  let changed = false;
  const visit = current => {
    if (typeof current === 'string') return BLUEBIRD_IMAGE_MAP[current] || current;
    if (Array.isArray(current)) return current.map(item => visit(item));
    if (!current || typeof current !== 'object') return current;
    return Object.fromEntries(Object.entries(current).map(([key, item]) => [key, visit(item)]));
  };
  const migrated = visit(value);
  changed = JSON.stringify(migrated) !== JSON.stringify(value);
  return { migrated, changed };
}

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

const VALID_SECTIONS = [
  'branding', 'hero', 'hitsSection', 'hits', 'bannerText',
  'faq', 'reviews', 'contacts', 'categories', 'barbers',
  'products', 'cities', 'stores', 'orderForm', 'guide', 'gallery'
];

let pool = null;
let useDB = false;

function getDefaultData() {
  if (existsSync(DEFAULT_DATA_FILE)) {
    return JSON.parse(readFileSync(DEFAULT_DATA_FILE, 'utf8'));
  }
  return {};
}

// --- File-based helpers ---
function fileReadData() {
  if (!existsSync(DATA_FILE)) {
    const defaults = getDefaultData();
    writeFileSync(DATA_FILE, JSON.stringify(defaults, null, 2), 'utf8');
    return defaults;
  }
  const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  // Merge new default keys
  const defaults = getDefaultData();
  let updated = false;
  const imageMigration = migrateBluebirdImages(data);
  if (imageMigration.changed) {
    Object.assign(data, imageMigration.migrated);
    updated = true;
  }
  for (const key of Object.keys(defaults)) {
    if (!(key in data)) { data[key] = defaults[key]; updated = true; }
  }
  // Migrate the previous barbershop-shaped content so an old persistent file
  // cannot bring back the obsolete filters and booking formats.
  const hasGuideSections = Array.isArray(data.categories) && data.categories.some(item => item.id === 'program') &&
    Array.isArray(data.products) && data.products.some(item => item.id === 'tour');
  if (!hasGuideSections) {
    data.hits = defaults.hits;
    data.hitsSection = defaults.hitsSection;
    data.categories = defaults.categories;
    data.products = defaults.products;
    data.orderForm = defaults.orderForm;
    data.guide = defaults.guide;
    data.gallery = defaults.gallery;
    updated = true;
  }
  if (updated) writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

function fileWriteSection(section, value) {
  const data = fileReadData();
  data[section] = value;
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function saveBookingRequest({ fields = [], items = {}, total = 0, source = 'website' }) {
  let requests = [];
  if (existsSync(BOOKINGS_FILE)) {
    try {
      requests = JSON.parse(readFileSync(BOOKINGS_FILE, 'utf8'));
      if (!Array.isArray(requests)) requests = [];
    } catch {
      requests = [];
    }
  }

  const request = {
    id: `visit_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
    createdAt: new Date().toISOString(),
    source: typeof source === 'string' ? source.slice(0, 80) : 'website',
    fields: Array.isArray(fields)
      ? fields.slice(0, 30).map(field => ({
          label: String(field?.label || '').slice(0, 120),
          value: String(field?.value || '').slice(0, 500)
        })).filter(field => field.label && field.value)
      : [],
    items: items && typeof items === 'object' ? items : {},
    total: Number.isFinite(Number(total)) ? Number(total) : 0
  };

  requests.push(request);
  writeFileSync(BOOKINGS_FILE, JSON.stringify(requests.slice(-500), null, 2), 'utf8');
  return request;
}

// --- DB helpers ---
async function dbInitDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_data (
      section TEXT PRIMARY KEY,
      value JSONB NOT NULL
    )
  `);
  const defaults = getDefaultData();
  for (const [section, value] of Object.entries(defaults)) {
    await pool.query(
      'INSERT INTO site_data (section, value) VALUES ($1, $2) ON CONFLICT (section) DO NOTHING',
      [section, JSON.stringify(value)]
    );
  }
  const current = await dbReadData();
  const imageMigration = migrateBluebirdImages(current);
  if (imageMigration.changed) {
    for (const [section, value] of Object.entries(imageMigration.migrated)) {
      await dbWriteSection(section, value);
    }
  }
  const hasGuideSections = Array.isArray(current.categories) && current.categories.some(item => item.id === 'program') &&
    Array.isArray(current.products) && current.products.some(item => item.id === 'tour');
  if (!hasGuideSections) {
    for (const section of ['hitsSection', 'hits', 'categories', 'products', 'orderForm', 'guide', 'gallery']) {
      await dbWriteSection(section, defaults[section]);
    }
  }
  console.log('Database initialized');
}

async function dbReadData() {
  const { rows } = await pool.query('SELECT section, value FROM site_data');
  const data = {};
  for (const row of rows) data[row.section] = row.value;
  return data;
}

async function dbWriteSection(section, value) {
  await pool.query(
    'INSERT INTO site_data (section, value) VALUES ($1, $2) ON CONFLICT (section) DO UPDATE SET value = EXCLUDED.value',
    [section, JSON.stringify(value)]
  );
}

// --- Unified API ---
async function readData() {
  return useDB ? dbReadData() : fileReadData();
}

async function writeSection(section, value) {
  return useDB ? dbWriteSection(section, value) : fileWriteSection(section, value);
}

// Initialize storage
async function initStorage() {
  if (DATABASE_URL) {
    try {
      pool = new pg.Pool({
        connectionString: DATABASE_URL,
        ssl: DATABASE_URL.includes('railway') || DATABASE_URL.includes('rlwy') ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
      });
      await dbInitDB();
      useDB = true;
      console.log('Using PostgreSQL storage');
    } catch (err) {
      console.warn('PostgreSQL unavailable, falling back to file storage:', err.message);
      if (pool) { try { await pool.end(); } catch {} pool = null; }
      useDB = false;
    }
  } else {
    console.log('DATABASE_URL not set, using file storage');
  }
  if (!useDB) {
    fileReadData(); // ensure file is initialized
  }
}

// Token store (in-memory, tokens expire after 24h)
const tokens = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function cleanExpiredTokens() {
  const now = Date.now();
  for (const [token, exp] of tokens) {
    if (now > exp) tokens.delete(token);
  }
}

// Auth middleware
function requireAuth(req, res, next) {
  cleanExpiredTokens();
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = auth.slice(7);
  if (!tokens.has(token)) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  next();
}

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    if (!allowed.includes(ext)) {
      return cb(new Error('Invalid file type'));
    }
    const name = crypto.randomBytes(8).toString('hex') + '.' + ext;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// JSON body parser
app.use(express.json({ limit: '10mb' }));

// ===== PUBLIC API =====

// Get site data (public, used by frontend)
app.get('/api/site-data', async (req, res) => {
  try {
    res.json(await readData());
  } catch (e) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// ===== AUTH =====

app.post('/api/login', (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD not configured' });
  }
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password required' });
  }
  // Constant-time comparison
  const pwBuf = Buffer.from(password);
  const adminBuf = Buffer.from(ADMIN_PASSWORD);
  if (pwBuf.length !== adminBuf.length || !crypto.timingSafeEqual(pwBuf, adminBuf)) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  const token = generateToken();
  tokens.set(token, Date.now() + 24 * 60 * 60 * 1000);
  res.json({ token });
});

app.post('/api/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization.slice(7);
  tokens.delete(token);
  res.json({ ok: true });
});

// ===== ADMIN API =====

// Get full data
app.get('/api/admin/data', requireAuth, async (req, res) => {
  try {
    res.json(await readData());
  } catch (e) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Update a section
app.put('/api/admin/data/:section', requireAuth, async (req, res) => {
  try {
    const section = req.params.section;
    if (!VALID_SECTIONS.includes(section)) {
      return res.status(400).json({ error: 'Invalid section' });
    }
    await writeSection(section, req.body.value);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Upload image
app.post('/api/admin/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ url: '/uploads/' + req.file.filename });
});

// ===== ORDER API =====
// This endpoint works in two modes:
//   1. BOT_SERVER_URL is empty  → bot runs here, send directly
//   2. BOT_SERVER_URL is set    → proxy to central bot server (other shop deployments)
app.post('/api/order', async (req, res) => {
  try {
    const { fields, items, total, source } = req.body || {};
    const normalizedFields = Array.isArray(fields) ? fields : [];
    const hasName = normalizedFields.some(field => /имя/i.test(String(field?.label || '')) && String(field?.value || '').trim());
    const hasPhone = normalizedFields.some(field => /телефон/i.test(String(field?.label || '')) && String(field?.value || '').trim());
    const hasFormat = normalizedFields.some(field => /формат/i.test(String(field?.label || '')) && String(field?.value || '').trim());
    if (!hasName || !hasPhone || !hasFormat) {
      return res.status(400).json({ error: 'Заполните имя, телефон и формат встречи' });
    }

    const request = saveBookingRequest({ fields: normalizedFields, items, total, source });

    if (BOT_SERVER_URL) {
      // Forward to central bot server
      const response = await fetch(`${BOT_SERVER_URL}/api/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: normalizedFields, items, total, source, requestId: request.id, shopPassword: SHOP_PASSWORD })
      });
      const result = await response.json();
      return res.status(response.status).json(result);
    }

    // Bot runs locally — shopPassword can come from env OR from proxied request
    const shopPw = req.body.shopPassword || SHOP_PASSWORD;
    const delivered = await sendOrderToShop(shopPw, { fields: normalizedFields, items, total });
    res.json({ ok: true, requestId: request.id, delivered });
  } catch (e) {
    console.error('[order] Error:', e.message);
    res.status(500).json({ error: 'Order failed' });
  }
});

// ===== BOT STATUS (debug) =====
app.get('/api/bot-status', async (req, res) => {
  try {
    let data = { shops: {}, subscriptions: {}, adminChats: [] };
    if (pool) {
      const r = await pool.query("SELECT value FROM bot_data WHERE key='main'");
      if (r.rows.length) data = JSON.parse(r.rows[0].value);
    }
    res.json({
      SHOP_PASSWORD_set: !!SHOP_PASSWORD,
      BOT_SERVER_URL: BOT_SERVER_URL || null,
      shops: Object.keys(data.shops || {}).length,
      subscriptions: Object.values(data.subscriptions || {}).reduce((s, a) => s + a.length, 0),
      adminChats: (data.adminChats || []).length
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== SERVE STATIC =====

// Admin panel
app.use('/vakuumadmens', express.static(join(__dirname, 'admin')));

// Uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

// Vite build output
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback for main site pages
app.get('/', (req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));
app.get('/catalog.html', (req, res) => res.sendFile(join(__dirname, 'dist', 'catalog.html')));
app.get('/stores.html', (req, res) => res.sendFile(join(__dirname, 'dist', 'stores.html')));
app.get('/order.html', (req, res) => res.sendFile(join(__dirname, 'dist', 'order.html')));

// Initialize storage then start server
initStorage().then(async () => {
  await createBot(useDB ? pool : null);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} | storage: ${useDB ? 'PostgreSQL' : 'file'}`);
  });
}).catch(err => {
  console.error('Unexpected startup error:', err);
  process.exit(1);
});
