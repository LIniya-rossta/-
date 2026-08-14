/**
 * FlowersKg Telegram Bot
 * 
 * Env vars required:
 *   TELEGRAM_BOT_TOKEN — bot token from @BotFather
 *   Vakuum_pass        — super-admin password
 *   SHOP_PASSWORD      — this website's shop password (set per deployment)
 */

import TelegramBot from 'node-telegram-bot-api';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, 'data');
const BOT_DATA_FILE = join(DATA_DIR, 'bot-data.json');
const ADMIN_PASSWORD = process.env.Vakuum_pass || '';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

// ===== DATA LAYER =====
// Uses PostgreSQL when pool injected via initBot(pool), otherwise falls back to JSON file
// Table: bot_data (key TEXT PK, value JSONB)

let dbPool = null;

async function dbEnsureTable() {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS bot_data (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL
    )
  `);
}

async function dbRead() {
  const { rows } = await dbPool.query("SELECT value FROM bot_data WHERE key = 'main'");
  if (rows.length === 0) return { adminChats: [], shops: [], subscriptions: [] };
  return rows[0].value;
}

async function dbWrite(data) {
  await dbPool.query(
    "INSERT INTO bot_data (key, value) VALUES ('main', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    [JSON.stringify(data)]
  );
}

// File fallback
function fileRead() {
  if (!existsSync(BOT_DATA_FILE)) {
    const def = { adminChats: [], shops: [], subscriptions: [] };
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(BOT_DATA_FILE, JSON.stringify(def, null, 2));
    return def;
  }
  try {
    return JSON.parse(readFileSync(BOT_DATA_FILE, 'utf8'));
  } catch {
    return { adminChats: [], shops: [], subscriptions: [] };
  }
}

function fileWrite(data) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(BOT_DATA_FILE, JSON.stringify(data, null, 2));
}

async function readBotData() {
  if (dbPool) return dbRead();
  return fileRead();
}

async function writeBotData(data) {
  if (dbPool) return dbWrite(data);
  fileWrite(data);
}


function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ===== CONVERSATION STATE =====
// Map: chatId → { step, data }
const conv = new Map();

let bot = null;

// ===== CREATE BOT =====
export async function createBot(pool) {
  if (pool) {
    dbPool = pool;
    try {
      await dbEnsureTable();
      console.log('Bot using PostgreSQL storage');
    } catch (e) {
      console.warn('Bot DB init failed, using file storage:', e.message);
      dbPool = null;
    }
  }

  if (!BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN not set — bot disabled');
    return null;
  }

  bot = new TelegramBot(BOT_TOKEN, { polling: true });

  // /start /help
  bot.onText(/^\/start$|^\/help$/i, (msg) => {
    bot.sendMessage(msg.chat.id,
      '🌸 <b>FlowersKg Bot</b>\n\n' +
      'Бот для получения заказов из цветочных магазинов.\n\n' +
      '📲 Подписаться на заказы своего магазина:\n<code>/floria ВАШ_ПАРОЛЬ</code>\n\n' +
      '🚫 Отписаться:\n<code>/stop</code>',
      { parse_mode: 'HTML' }
    );
  });

  // /vakuumgenadmin <pass> — super admin auth
  bot.onText(/^\/vakuumgenadmin (.+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const pw = match[1].trim();
    if (!ADMIN_PASSWORD) {
      return bot.sendMessage(chatId, '❌ Vakuum_pass не задан на сервере.');
    }
    if (pw !== ADMIN_PASSWORD) {
      return bot.sendMessage(chatId, '❌ Неверный пароль.');
    }
    const data = await readBotData();
    if (!data.adminChats.includes(chatId)) {
      data.adminChats.push(chatId);
      await writeBotData(data);
    }
    bot.sendMessage(chatId,
      '✅ <b>Вы вошли как администратор.</b>\n\n' +
      'Доступные команды:\n' +
      '/add — добавить магазин\n' +
      '/list — список магазинов\n' +
      '/remove ID — удалить магазин по ID',
      { parse_mode: 'HTML' }
    );
  });

  // /add — start "add shop" conversation
  bot.onText(/^\/add$/i, async (msg) => {
    const chatId = msg.chat.id;
    const data = await readBotData();
    if (!data.adminChats.includes(chatId)) {
      return bot.sendMessage(chatId, '❌ Нет доступа. Войдите: /vakuumgenadmin &lt;пароль&gt;', { parse_mode: 'HTML' });
    }
    conv.set(chatId, { step: 'add_name', data: {} });
    bot.sendMessage(chatId, '📝 Введите <b>название магазина</b>:', { parse_mode: 'HTML' });
  });

  // /list — list shops
  bot.onText(/^\/list$/i, async (msg) => {
    const chatId = msg.chat.id;
    const data = await readBotData();
    if (!data.adminChats.includes(chatId)) {
      return bot.sendMessage(chatId, '❌ Нет доступа.');
    }
    if (!data.shops.length) {
      return bot.sendMessage(chatId, 'Список магазинов пуст. Добавьте: /add');
    }
    const text = data.shops.map(s => {
      const subs = data.subscriptions.filter(x => x.shopId === s.id).length;
      return `🏪 <b>${escHtml(s.name)}</b>\n🆔 ID: <code>${escHtml(s.id)}</code>\n🔑 Пароль: <code>${escHtml(s.password)}</code>\n👥 Подписчики: ${subs}`;
    }).join('\n\n');
    bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
  });

  // /remove <id>
  bot.onText(/^\/remove (.+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const data = await readBotData();
    if (!data.adminChats.includes(chatId)) {
      return bot.sendMessage(chatId, '❌ Нет доступа.');
    }
    const shopId = match[1].trim();
    const idx = data.shops.findIndex(s => s.id === shopId);
    if (idx === -1) {
      return bot.sendMessage(chatId, `❌ Магазин <code>${escHtml(shopId)}</code> не найден.`, { parse_mode: 'HTML' });
    }
    const name = data.shops[idx].name;
    data.shops.splice(idx, 1);
    data.subscriptions = data.subscriptions.filter(s => s.shopId !== shopId);
    await writeBotData(data);
    bot.sendMessage(chatId, `✅ Магазин <b>${escHtml(name)}</b> удалён.`, { parse_mode: 'HTML' });
  });

  // /floria <password> — subscribe as shop owner
  bot.onText(/^\/floria (.+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const pw = match[1].trim();
    const data = await readBotData();
    const shop = data.shops.find(s => s.password === pw);
    if (!shop) {
      return bot.sendMessage(chatId, '❌ Неверный пароль. Обратитесь к администратору.');
    }
    const already = data.subscriptions.find(s => s.chatId === chatId && s.shopId === shop.id);
    if (already) {
      return bot.sendMessage(chatId,
        `✅ Вы уже подписаны на заказы магазина <b>${escHtml(shop.name)}</b>`,
        { parse_mode: 'HTML' }
      );
    }
    data.subscriptions.push({
      chatId,
      shopId: shop.id,
      username: msg.from?.username || msg.from?.first_name || String(chatId)
    });
    await writeBotData(data);
    bot.sendMessage(chatId,
      `✅ Готово! Теперь вам будут приходить заказы магазина <b>${escHtml(shop.name)}</b> 🌸`,
      { parse_mode: 'HTML' }
    );
  });

  // /stop — unsubscribe
  bot.onText(/^\/stop$/i, async (msg) => {
    const chatId = msg.chat.id;
    const data = await readBotData();
    const before = data.subscriptions.length;
    data.subscriptions = data.subscriptions.filter(s => s.chatId !== chatId);
    await writeBotData(data);
    if (data.subscriptions.length < before) {
      bot.sendMessage(chatId, '✅ Вы отписались от уведомлений о заказах.');
    } else {
      bot.sendMessage(chatId, 'Вы не были подписаны ни на один магазин.');
    }
  });

  // Handle free-text conversation steps
  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    const chatId = msg.chat.id;
    const state = conv.get(chatId);
    if (!state) return;

    if (state.step === 'add_name') {
      state.data.name = msg.text.trim();
      state.step = 'add_password';
      conv.set(chatId, state);
      bot.sendMessage(chatId,
        '🔑 Введите <b>пароль</b> для магазина (владелец будет использовать его для <code>/floria пароль</code>):',
        { parse_mode: 'HTML' }
      );
    } else if (state.step === 'add_password') {
      state.data.password = msg.text.trim();
      const data = await readBotData();
      const id = 'shop_' + crypto.randomBytes(4).toString('hex');
      data.shops.push({
        id,
        name: state.data.name,
        password: state.data.password,
        createdAt: new Date().toISOString()
      });
      await writeBotData(data);
      conv.delete(chatId);
      bot.sendMessage(chatId,
        `✅ <b>Магазин добавлен!</b>\n\n` +
        `🏪 Название: <b>${escHtml(state.data.name)}</b>\n` +
        `🔑 Пароль: <code>${escHtml(state.data.password)}</code>\n` +
        `🆔 ID: <code>${escHtml(id)}</code>\n\n` +
        `Передайте пароль владельцу — он введёт:\n<code>/floria ${escHtml(state.data.password)}</code>`,
        { parse_mode: 'HTML' }
      );
    }
  });

  bot.on('polling_error', (err) => {
    console.error('Telegram polling error:', err.message);
  });

  console.log('Telegram bot started (polling)');
  return bot;
}

// ===== SEND ORDER TO SHOP =====
export async function sendOrderToShop(shopPassword, orderData) {
  if (!bot || !shopPassword) return;
  const data = await readBotData();
  const shop = data.shops.find(s => s.password === shopPassword);
  if (!shop) {
    console.warn('[bot] Shop not found for password:', shopPassword);
    return;
  }
  const subs = data.subscriptions.filter(s => s.shopId === shop.id);
  if (!subs.length) {
    console.warn('[bot] No subscribers for shop:', shop.name);
    return;
  }

  const { fields = [], items = {}, total = 0 } = orderData;

  const fieldsText = fields
    .filter(f => f.value)
    .map(f => `<b>${escHtml(f.label)}:</b> ${escHtml(f.value)}`)
    .join('\n');

  const itemsText = Object.entries(items)
    .filter(([, v]) => v.qty > 0)
    .map(([name, item]) => `  • ${escHtml(name)} × ${item.qty} — ${(item.qty * item.price).toLocaleString('ru-RU')} сом`)
    .join('\n');

  const time = new Date().toLocaleString('ru-RU', {
    timeZone: 'Asia/Bishkek',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const text =
    `🌸 <b>Новый заказ — ${escHtml(shop.name)}</b>\n\n` +
    `${fieldsText}\n\n` +
    `🛒 <b>Состав заказа:</b>\n${itemsText || '—'}\n\n` +
    `💰 <b>Итого: ${Number(total).toLocaleString('ru-RU')} сом</b>\n\n` +
    `🕐 ${time}`;

  for (const sub of subs) {
    try {
      await bot.sendMessage(sub.chatId, text, { parse_mode: 'HTML' });
    } catch (e) {
      console.error('[bot] Failed to send to', sub.chatId, e.message);
    }
  }
}
