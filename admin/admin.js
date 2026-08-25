/* Blue Bird parent portal admin panel */

const API = '';
let token = sessionStorage.getItem('admin_token') || '';
let siteData = {};
let currentSection = 'branding';
let pendingChanges = {};

// ===== HELPERS =====
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (res.status === 401) {
    sessionStorage.removeItem('admin_token');
    token = '';
    showLogin();
    throw new Error('Unauthorized');
  }
  return res.json();
}

async function uploadImage(file) {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(API + '/api/admin/upload', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: form
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

// ===== AUTH =====
function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminPanel').style.display = 'none';
}

function showAdmin() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'flex';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = document.getElementById('loginPassword').value;
  const err = document.getElementById('loginError');
  try {
    const res = await api('POST', '/api/login', { password: pw });
    if (res.token) {
      token = res.token;
      sessionStorage.setItem('admin_token', token);
      err.textContent = '';
      await loadData();
      showAdmin();
      renderSection();
    }
  } catch (ex) {
    err.textContent = 'Неверный пароль';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  try { await api('POST', '/api/logout'); } catch {}
  sessionStorage.removeItem('admin_token');
  token = '';
  showLogin();
});

// ===== DATA =====
async function loadData() {
  siteData = await api('GET', '/api/admin/data');
}

async function saveSection(section, value) {
  await api('PUT', '/api/admin/data/' + section, { value });
  siteData[section] = value;
  showToast('✅ Сохранено!');
}

// ===== SAVE BUTTON =====
document.getElementById('saveBtn').addEventListener('click', async () => {
  try {
    await collectAndSave();
  } catch (ex) {
    showToast('❌ Ошибка сохранения');
  }
});

// Collect current form data and save
async function collectAndSave() {
  const section = currentSection;
  switch (section) {
    case 'branding': return saveSection('branding', collectBranding());
    case 'hero': return saveSection('hero', collectHero());
    case 'parentInfo': return saveSection('parentInfo', collectParentInfo());
    case 'guide': return saveSection('guide', collectGuide());
    case 'barbers': return saveSection('barbers', collectBarbers());
    case 'gallery': return saveSection('gallery', collectGallery());
    case 'hits': {
      await saveSection('hitsSection', collectHitsSection());
      return saveSection('hits', collectHits());
    }
    case 'banner': return saveSection('bannerText', collectBanner());
    case 'faq': return saveSection('faq', collectFaq());
    case 'reviews': return saveSection('reviews', collectReviews());
    case 'contacts': return saveSection('contacts', collectContacts());
    case 'categories': return saveSection('categories', collectCategories());
    case 'products': return saveSection('products', collectProducts());
    case 'stores': return saveSection('stores', collectStores());
    case 'cities': return saveSection('cities', collectCities());
    case 'orderForm': return saveSection('orderForm', collectOrderForm());
  }
}

// ===== NAVIGATION =====
const sectionTitles = {
  branding: 'Бренд магазина',
  hero: 'Главная страница',
  parentInfo: 'Сегодня в саду',
  guide: 'Разделы для родителей',
  barbers: 'Педагоги и команда',
  gallery: 'Фотографии сада',
  hits: 'Карточки главной',
  banner: 'Баннер',
  faq: 'Часто задаваемые вопросы',
  reviews: 'Отзывы',
  contacts: 'Контакты',
  categories: 'Категории каталога',
  products: 'Поступление',
  stores: 'Филиалы',
  cities: 'Города',
  orderForm: 'Форма заказа'
};

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSection = btn.dataset.section;
    document.getElementById('sectionTitle').textContent = sectionTitles[currentSection];
    renderSection();
    // Close mobile sidebar
    document.querySelector('.sidebar').classList.remove('open');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) overlay.classList.remove('show');
  });
});

// Mobile menu
document.getElementById('mobileMenuBtn').addEventListener('click', () => {
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('open');
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  }
  overlay.classList.toggle('show');
});

// ===== RENDER SECTIONS =====
function renderSection() {
  const c = document.getElementById('adminContent');
  switch (currentSection) {
    case 'branding': return renderBranding(c);
    case 'hero': return renderHero(c);
    case 'parentInfo': return renderParentInfo(c);
    case 'guide': return renderGuide(c);
    case 'barbers': return renderBarbers(c);
    case 'gallery': return renderGallery(c);
    case 'hits': return renderHits(c);
    case 'banner': return renderBanner(c);
    case 'faq': return renderFaq(c);
    case 'reviews': return renderReviews(c);
    case 'contacts': return renderContacts(c);
    case 'categories': return renderCategories(c);
    case 'products': return renderProducts(c);
    case 'stores': return renderStores(c);
    case 'cities': return renderCities(c);
    case 'orderForm': return renderOrderForm(c);
  }
}

// --- BRANDING ---
function renderBranding(c) {
  const d = siteData.branding || {};
  c.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>Логотип и название</h3></div>
      <div class="form-group">
        <label>Логотип (круглый)</label>
        <div style="display:flex;align-items:center;gap:12px;">
          <div id="brandLogoPreview" style="width:64px;height:64px;border-radius:50%;background:#f0f0f0;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:2px dashed #ccc;">
            ${d.logo ? `<img src="${escHtml(d.logo)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />` : '<span style="color:#aaa;font-size:24px;">+</span>'}
          </div>
          <div style="flex:1;">
            <input type="file" id="brandLogoFile" accept="image/*" style="display:none;" />
            <button type="button" class="btn btn-small" onclick="document.getElementById('brandLogoFile').click()">Загрузить</button>
            ${d.logo ? '<button type="button" class="btn btn-small btn-danger" onclick="clearBrandLogo()" style="margin-left:8px;">Удалить</button>' : ''}
          </div>
        </div>
        <input type="hidden" id="brandLogoUrl" value="${escHtml(d.logo)}" />
      </div>
      <div class="form-group">
        <label>Название магазина</label>
        <input type="text" id="brandStoreName" value="${escHtml(d.storeName)}" placeholder="Например: Floristyle" />
      </div>
    </div>`;

  document.getElementById('brandLogoFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await uploadImage(file);
      document.getElementById('brandLogoUrl').value = res.url;
      document.getElementById('brandLogoPreview').innerHTML = `<img src="${escHtml(res.url)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
      showToast('Логотип загружен');
    } catch { showToast('❌ Ошибка загрузки'); }
  });
}

window.clearBrandLogo = function() {
  document.getElementById('brandLogoUrl').value = '';
  document.getElementById('brandLogoPreview').innerHTML = '<span style="color:#aaa;font-size:24px;">+</span>';
};

function collectBranding() {
  return {
    logo: document.getElementById('brandLogoUrl').value.trim(),
    storeName: document.getElementById('brandStoreName').value.trim()
  };
}

// --- HERO ---
function renderHero(c) {
  const d = siteData.hero || {};
  c.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>Настройки главной страницы</h3></div>
      <div class="form-group">
        <label>Заголовок</label>
        <input type="text" id="heroTitle" value="${escHtml(d.title)}" />
      </div>
      <div class="form-group">
        <label>Подзаголовок (\\n = перенос строки)</label>
        <input type="text" id="heroSubtitle" value="${escHtml((d.subtitle || '').replace(/\n/g, '\\n'))}" />
      </div>
      <div class="form-group">
        <label>Текст кнопки</label>
        <input type="text" id="heroButton" value="${escHtml(d.buttonText)}" />
      </div>
    </div>`;
}

function collectHero() {
  return {
    title: document.getElementById('heroTitle').value,
    subtitle: document.getElementById('heroSubtitle').value.replace(/\\n/g, '\n'),
    buttonText: document.getElementById('heroButton').value
  };
}

// --- PARENT UPDATES ---
function renderParentInfo(c) {
  const d = siteData.parentInfo || {};
  const meals = d.meals || [];
  const announcements = d.announcements || [];
  c.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>Блок «Сегодня в саду»</h3></div>
      <p style="color:#777;font-size:13px;margin:-8px 0 18px;">Эти данные видят родители во вкладке «Питание». Обновляйте меню и объявления каждый день.</p>
      <div class="form-row">
        <div class="form-group"><label>Заголовок</label><input type="text" id="parentTitle" value="${escHtml(d.title)}" /></div>
        <div class="form-group"><label>Дата</label><input type="text" id="parentDate" value="${escHtml(d.date)}" placeholder="Сегодня · 25 августа" /></div>
      </div>
      <div class="form-group"><label>Короткое описание</label><textarea id="parentIntro" rows="2">${escHtml(d.intro)}</textarea></div>
      <div class="form-group"><label>Подпись обновления</label><input type="text" id="parentUpdatedAt" value="${escHtml(d.updatedAt)}" placeholder="Обновлено утром" /></div>
    </div>
    <div class="section-header"><h2>Меню на сегодня</h2><button class="add-btn" onclick="addParentMeal()">+ Добавить приём пищи</button></div>
    <div class="card" id="parentMealsList">
      <div class="form-group"><label>Заголовок меню</label><input type="text" class="parent-menu-title-input" value="${escHtml(d.menuTitle || 'Меню на сегодня')}" /></div>
      ${meals.map((meal, i) => `
        <div class="item-card parent-meal-row" data-idx="${i}">
          <div class="item-card-header"><span class="item-number">Приём пищи #${i + 1}</span><button class="delete-btn" onclick="deleteParentMeal(${i})">Удалить</button></div>
          <div class="form-row"><div class="form-group"><label>Название</label><input type="text" class="parent-meal-time" value="${escHtml(meal.time)}" placeholder="Завтрак" /></div><div class="form-group"><label>Что входит</label><input type="text" class="parent-meal-text" value="${escHtml(meal.text)}" placeholder="Каша, фрукт, чай" /></div></div>
        </div>`).join('')}
    </div>
    <div class="card">
      <div class="card-header"><h3>Напоминание</h3></div>
      <div class="form-group"><label>Заголовок</label><input type="text" id="parentNoticeTitle" value="${escHtml(d.noticeTitle)}" /></div>
      <div class="form-group"><label>Текст</label><textarea id="parentNoticeText" rows="2">${escHtml(d.noticeText)}</textarea></div>
    </div>
    <div class="section-header"><h2>Объявления (${announcements.length})</h2><button class="add-btn" onclick="addParentAnnouncement()">+ Добавить</button></div>
    <div id="parentAnnouncementsList">${announcements.map((item, i) => `
      <div class="item-card parent-announcement-row" data-idx="${i}">
        <div class="item-card-header"><span class="item-number">Объявление #${i + 1}</span><button class="delete-btn" onclick="deleteParentAnnouncement(${i})">Удалить</button></div>
        <div class="form-row"><div class="form-group"><label>Заголовок</label><input type="text" class="parent-announcement-title" value="${escHtml(item.title)}" /></div><div class="form-group"><label>Дата / метка</label><input type="text" class="parent-announcement-date" value="${escHtml(item.date)}" /></div></div>
        <div class="form-group"><label>Текст</label><textarea class="parent-announcement-text" rows="2">${escHtml(item.text)}</textarea></div>
      </div>`).join('')}</div>`;
}

window.addParentMeal = function() {
  siteData.parentInfo = siteData.parentInfo || { meals: [], announcements: [] };
  siteData.parentInfo.meals = siteData.parentInfo.meals || [];
  siteData.parentInfo.meals.push({ time: '', text: '' });
  renderParentInfo(document.getElementById('adminContent'));
};

window.deleteParentMeal = function(i) {
  siteData.parentInfo.meals.splice(i, 1);
  renderParentInfo(document.getElementById('adminContent'));
};

window.addParentAnnouncement = function() {
  siteData.parentInfo = siteData.parentInfo || { meals: [], announcements: [] };
  siteData.parentInfo.announcements = siteData.parentInfo.announcements || [];
  siteData.parentInfo.announcements.push({ title: '', text: '', date: '' });
  renderParentInfo(document.getElementById('adminContent'));
};

window.deleteParentAnnouncement = function(i) {
  siteData.parentInfo.announcements.splice(i, 1);
  renderParentInfo(document.getElementById('adminContent'));
};

function collectParentInfo() {
  const source = siteData.parentInfo || {};
  return {
    title: document.getElementById('parentTitle').value.trim(),
    intro: document.getElementById('parentIntro').value.trim(),
    date: document.getElementById('parentDate').value.trim(),
    updatedAt: document.getElementById('parentUpdatedAt').value.trim(),
    menuTitle: document.querySelector('.parent-menu-title-input').value.trim(),
    meals: Array.from(document.querySelectorAll('.parent-meal-row')).map(row => ({
      time: row.querySelector('.parent-meal-time').value.trim(),
      text: row.querySelector('.parent-meal-text').value.trim()
    })),
    noticeTitle: document.getElementById('parentNoticeTitle').value.trim(),
    noticeText: document.getElementById('parentNoticeText').value.trim(),
    announcements: Array.from(document.querySelectorAll('.parent-announcement-row')).map(row => ({
      title: row.querySelector('.parent-announcement-title').value.trim(),
      text: row.querySelector('.parent-announcement-text').value.trim(),
      date: row.querySelector('.parent-announcement-date').value.trim()
    }))
  };
}

// --- GUIDE CONTENT ---
function renderGuide(c) {
  const guide = siteData.guide || {};
  const labels = { program: 'Программа', menu: 'Питание', day: 'Распорядок дня', admission: 'Поступление' };
  c.innerHTML = `<p style="color:#777;font-size:13px;margin:0 0 20px;">Редактируйте содержание родительских разделов. Кнопка заявки показывается только в разделе «Поступление».</p>${Object.entries(labels).map(([key, label]) => {
    const item = guide[key] || {};
    const entries = item.schedule || item.points || [];
    return `<div class="card guide-admin-card" data-guide-key="${key}">
      <div class="card-header"><h3>${label}</h3></div>
      <div class="form-group"><label>Надзаголовок</label><input type="text" class="guide-eyebrow" value="${escHtml(item.eyebrow)}" /></div>
      <div class="form-group"><label>Заголовок</label><input type="text" class="guide-title" value="${escHtml(item.title)}" /></div>
      <div class="form-group"><label>Описание</label><textarea class="guide-intro" rows="3">${escHtml(item.intro)}</textarea></div>
      <div class="form-group"><label>Примечание</label><textarea class="guide-note" rows="2">${escHtml(item.note)}</textarea></div>
      <div class="form-group"><label>${item.schedule ? 'Расписание' : 'Ключевые пункты'} (JSON)</label><textarea class="guide-items" rows="6">${escHtml(JSON.stringify(entries, null, 2))}</textarea></div>
    </div>`;
  }).join('')}`;
}

function collectGuide() {
  const current = siteData.guide || {};
  const result = {};
  document.querySelectorAll('.guide-admin-card').forEach(card => {
    const key = card.dataset.guideKey;
    const original = current[key] || {};
    let entries = original.schedule || original.points || [];
    try {
      const parsed = JSON.parse(card.querySelector('.guide-items').value || '[]');
      if (Array.isArray(parsed)) entries = parsed;
    } catch { showToast(`Проверьте JSON в разделе «${key}»`); }
    result[key] = {
      ...original,
      eyebrow: card.querySelector('.guide-eyebrow').value.trim(),
      title: card.querySelector('.guide-title').value.trim(),
      intro: card.querySelector('.guide-intro').value.trim(),
      note: card.querySelector('.guide-note').value.trim(),
      ...(original.schedule ? { schedule: entries } : { points: entries })
    };
  });
  return result;
}

// --- TEAM ---
function renderBarbers(c) {
  const people = siteData.barbers || [];
  c.innerHTML = `<div class="section-header"><h2>Педагоги (${people.length})</h2><button class="add-btn" onclick="addBarber()">+ Добавить педагога</button></div><div id="barbersList">${people.map((person, i) => `
    <div class="item-card barber-admin-row">
      <div class="item-card-header"><span class="item-number">Педагог #${i + 1}</span><button class="delete-btn" onclick="deleteBarber(${i})">Удалить</button></div>
      <div class="inline-flex"><div class="image-upload" style="width:100px;height:100px;"><img src="${escHtml(person.image || '')}" /><input type="file" accept="image/*" onchange="uploadBarberImage(${i}, this)" /></div><div style="flex:1;"><div class="form-row"><div class="form-group"><label>Имя</label><input type="text" class="barber-name" value="${escHtml(person.name)}" /></div><div class="form-group"><label>Роль / метка</label><input type="text" class="barber-badge" value="${escHtml(person.badge)}" /></div></div><div class="form-group"><label>Описание</label><input type="text" class="barber-role-input" value="${escHtml(person.role)}" /></div></div></div>
      <input type="hidden" class="barber-image-url" value="${escHtml(person.image)}" />
    </div>`).join('')}</div>`;
}

window.addBarber = function() { siteData.barbers = siteData.barbers || []; siteData.barbers.push({ id: Date.now(), name: '', role: '', badge: 'педагог', category: 'pedagogues', image: '' }); renderBarbers(document.getElementById('adminContent')); };
window.deleteBarber = function(i) { siteData.barbers.splice(i, 1); renderBarbers(document.getElementById('adminContent')); };
window.uploadBarberImage = async function(i, input) {
  if (!input.files[0]) return;
  try { const { url } = await uploadImage(input.files[0]); siteData.barbers[i].image = url; renderBarbers(document.getElementById('adminContent')); showToast('Фото педагога загружено'); } catch { showToast('Ошибка загрузки'); }
};
function collectBarbers() {
  return Array.from(document.querySelectorAll('.barber-admin-row')).map((row, i) => ({
    id: siteData.barbers[i]?.id || Date.now() + i,
    name: row.querySelector('.barber-name').value.trim(),
    badge: row.querySelector('.barber-badge').value.trim(),
    role: row.querySelector('.barber-role-input').value.trim(),
    category: siteData.barbers[i]?.category || 'pedagogues',
    image: row.querySelector('.barber-image-url').value
  }));
}

// --- GALLERY ---
function renderGallery(c) {
  const photos = siteData.gallery || [];
  c.innerHTML = `<div class="section-header"><h2>Фотографии (${photos.length})</h2><button class="add-btn" onclick="addGalleryPhoto()">+ Добавить фото</button></div><div id="galleryAdminList">${photos.map((photo, i) => `
    <div class="item-card gallery-admin-row">
      <div class="item-card-header"><span class="item-number">Фото #${i + 1}</span><button class="delete-btn" onclick="deleteGalleryPhoto(${i})">Удалить</button></div>
      <div class="inline-flex"><div class="image-upload" style="width:130px;height:90px;"><img src="${escHtml(photo.image || '')}" /><input type="file" accept="image/*" onchange="uploadGalleryPhoto(${i}, this)" /></div><div style="flex:1;"><div class="form-group"><label>Заголовок</label><input type="text" class="gallery-title" value="${escHtml(photo.title)}" /></div><div class="form-group"><label>Описание</label><input type="text" class="gallery-text" value="${escHtml(photo.text)}" /></div></div></div>
      <input type="hidden" class="gallery-image-url" value="${escHtml(photo.image)}" />
    </div>`).join('')}</div>`;
}
window.addGalleryPhoto = function() { siteData.gallery = siteData.gallery || []; siteData.gallery.push({ id: Date.now(), image: '', title: '', text: '' }); renderGallery(document.getElementById('adminContent')); };
window.deleteGalleryPhoto = function(i) { siteData.gallery.splice(i, 1); renderGallery(document.getElementById('adminContent')); };
window.uploadGalleryPhoto = async function(i, input) {
  if (!input.files[0]) return;
  try { const { url } = await uploadImage(input.files[0]); siteData.gallery[i].image = url; renderGallery(document.getElementById('adminContent')); showToast('Фото загружено'); } catch { showToast('Ошибка загрузки'); }
};
function collectGallery() {
  return Array.from(document.querySelectorAll('.gallery-admin-row')).map((row, i) => ({
    id: siteData.gallery[i]?.id || Date.now() + i,
    image: row.querySelector('.gallery-image-url').value,
    title: row.querySelector('.gallery-title').value.trim(),
    text: row.querySelector('.gallery-text').value.trim()
  }));
}

// --- HITS ---
function renderHits(c) {
  const sec = siteData.hitsSection || {};
  const hits = siteData.hits || [];
  let hitsHtml = hits.map((h, i) => `
    <div class="item-card" data-idx="${i}">
      <div class="item-card-header">
        <span class="item-number">Хит #${i + 1}</span>
        <button class="delete-btn" onclick="deleteHit(${i})">Удалить</button>
      </div>
      <div class="inline-flex">
        <div class="image-upload" id="hitImg${i}">
          ${h.image ? `<img src="${escHtml(h.image)}" />` : '<div class="upload-placeholder"><span>+</span>Фото</div>'}
          <input type="file" accept="image/*" onchange="uploadHitImage(${i}, this)" />
        </div>
        <div style="flex:1;">
          <div class="form-group">
            <label>Цена</label>
            <input type="text" class="hit-price" value="${escHtml(h.price)}" />
          </div>
          <input type="hidden" class="hit-image-url" value="${escHtml(h.image)}" />
        </div>
      </div>
    </div>`).join('');

  c.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>Настройки секции</h3></div>
      <div class="form-group">
        <label>Заголовок секции</label>
        <input type="text" id="hitsSectionTitle" value="${escHtml(sec.title)}" />
      </div>
    </div>
    <div class="section-header">
      <h2>Карточки хитов</h2>
      <button class="add-btn" onclick="addHit()">+ Добавить</button>
    </div>
    <div id="hitsList">${hitsHtml}</div>`;
}

window.addHit = function() {
  siteData.hits = siteData.hits || [];
  siteData.hits.push({ id: Date.now(), image: '', price: 'от 0 сом' });
  renderHits(document.getElementById('adminContent'));
};

window.deleteHit = function(i) {
  siteData.hits.splice(i, 1);
  renderHits(document.getElementById('adminContent'));
};

window.uploadHitImage = async function(i, input) {
  if (!input.files[0]) return;
  try {
    const { url } = await uploadImage(input.files[0]);
    siteData.hits[i].image = url;
    renderHits(document.getElementById('adminContent'));
    showToast('Изображение загружено');
  } catch { showToast('Ошибка загрузки'); }
};

function collectHitsSection() {
  return { title: document.getElementById('hitsSectionTitle').value };
}

function collectHits() {
  const items = document.querySelectorAll('#hitsList .item-card');
  return Array.from(items).map((el, i) => ({
    id: siteData.hits[i]?.id || Date.now() + i,
    image: el.querySelector('.hit-image-url').value,
    price: el.querySelector('.hit-price').value
  }));
}

// --- BANNER ---
function renderBanner(c) {
  c.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>Текст баннера</h3></div>
      <div class="form-group">
        <label>Текст</label>
        <textarea id="bannerText" rows="3">${escHtml(siteData.bannerText)}</textarea>
      </div>
    </div>`;
}

function collectBanner() {
  return document.getElementById('bannerText').value;
}

// --- FAQ ---
function renderFaq(c) {
  const faq = siteData.faq || [];
  let html = faq.map((f, i) => `
    <div class="item-card">
      <div class="item-card-header">
        <span class="item-number">Вопрос #${i + 1}</span>
        <button class="delete-btn" onclick="deleteFaq(${i})">Удалить</button>
      </div>
      <div class="form-group">
        <label>Вопрос</label>
        <input type="text" class="faq-q" value="${escHtml(f.question)}" />
      </div>
      <div class="form-group">
        <label>Ответ</label>
        <textarea class="faq-a" rows="2">${escHtml(f.answer)}</textarea>
      </div>
    </div>`).join('');

  c.innerHTML = `
    <div class="section-header">
      <h2>Вопросы и ответы</h2>
      <button class="add-btn" onclick="addFaq()">+ Добавить</button>
    </div>
    <div id="faqList">${html}</div>`;
}

window.addFaq = function() {
  siteData.faq = siteData.faq || [];
  siteData.faq.push({ id: Date.now(), question: '', answer: '' });
  renderFaq(document.getElementById('adminContent'));
};

window.deleteFaq = function(i) {
  siteData.faq.splice(i, 1);
  renderFaq(document.getElementById('adminContent'));
};

function collectFaq() {
  const items = document.querySelectorAll('#faqList .item-card');
  return Array.from(items).map((el, i) => ({
    id: siteData.faq[i]?.id || Date.now() + i,
    question: el.querySelector('.faq-q').value,
    answer: el.querySelector('.faq-a').value
  }));
}

// --- REVIEWS ---
function renderReviews(c) {
  const revs = siteData.reviews || [];
  let html = revs.map((r, i) => `
    <div class="item-card">
      <div class="item-card-header">
        <span class="item-number">Отзыв #${i + 1}</span>
        <button class="delete-btn" onclick="deleteReview(${i})">Удалить</button>
      </div>
      <div class="inline-flex" style="margin-bottom:12px;">
        <div class="image-upload" style="width:80px;height:80px;" id="revAvatar${i}">
          ${r.avatar ? `<img src="${escHtml(r.avatar)}" />` : '<div class="upload-placeholder"><span>+</span></div>'}
          <input type="file" accept="image/*" onchange="uploadReviewAvatar(${i}, this)" />
        </div>
        <div style="flex:1;">
          <div class="form-group" style="margin-bottom:8px;">
            <label>Звёзды</label>
            <div class="stars-selector" data-idx="${i}">
              ${[1,2,3,4,5].map(s => `<button type="button" class="star ${s <= r.stars ? 'active' : ''}" onclick="setStars(${i}, ${s})">⭐</button>`).join('')}
            </div>
          </div>
          <div class="color-picker-wrap">
            <label style="font-size:12px;font-weight:600;color:#555;">Цвет карточки</label>
            <input type="color" class="review-color" value="${r.color || '#ffffff'}" />
          </div>
        </div>
      </div>
      <div class="form-group">
        <label>Текст отзыва</label>
        <textarea class="review-text" rows="2">${escHtml(r.text)}</textarea>
      </div>
      <input type="hidden" class="review-avatar-url" value="${escHtml(r.avatar)}" />
      <input type="hidden" class="review-stars" value="${r.stars}" />
    </div>`).join('');

  const canAdd = revs.length < 10;
  c.innerHTML = `
    <div class="section-header">
      <h2>Отзывы (${revs.length}/10)</h2>
      ${canAdd ? '<button class="add-btn" onclick="addReview()">+ Добавить</button>' : ''}
    </div>
    <div id="reviewsList">${html}</div>`;
}

window.addReview = function() {
  if ((siteData.reviews || []).length >= 10) return showToast('Максимум 10 отзывов');
  siteData.reviews = siteData.reviews || [];
  siteData.reviews.push({ id: Date.now(), text: '', stars: 5, color: '#ffffff', avatar: '' });
  renderReviews(document.getElementById('adminContent'));
};

window.deleteReview = function(i) {
  siteData.reviews.splice(i, 1);
  renderReviews(document.getElementById('adminContent'));
};

window.setStars = function(i, stars) {
  const card = document.querySelectorAll('#reviewsList .item-card')[i];
  card.querySelector('.review-stars').value = stars;
  card.querySelectorAll('.star').forEach((s, si) => {
    s.classList.toggle('active', si < stars);
  });
};

window.uploadReviewAvatar = async function(i, input) {
  if (!input.files[0]) return;
  try {
    const { url } = await uploadImage(input.files[0]);
    siteData.reviews[i].avatar = url;
    renderReviews(document.getElementById('adminContent'));
    showToast('Аватар загружен');
  } catch { showToast('Ошибка загрузки'); }
};

function collectReviews() {
  const items = document.querySelectorAll('#reviewsList .item-card');
  return Array.from(items).map((el, i) => ({
    id: siteData.reviews[i]?.id || Date.now() + i,
    text: el.querySelector('.review-text').value,
    stars: parseInt(el.querySelector('.review-stars').value) || 5,
    color: el.querySelector('.review-color').value,
    avatar: el.querySelector('.review-avatar-url').value
  }));
}

// --- CONTACTS ---
function renderContacts(c) {
  const ct = siteData.contacts || {};
  c.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>Telegram</h3></div>
      <div class="form-row">
        <div class="form-group">
          <label>Значение</label>
          <input type="text" id="ctTgValue" value="${escHtml(ct.telegram?.value)}" />
        </div>
        <div class="form-group">
          <label>Ссылка</label>
          <input type="text" id="ctTgUrl" value="${escHtml(ct.telegram?.url)}" />
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>WhatsApp</h3></div>
      <div class="form-row">
        <div class="form-group">
          <label>Значение</label>
          <input type="text" id="ctWaValue" value="${escHtml(ct.whatsapp?.value)}" />
        </div>
        <div class="form-group">
          <label>Ссылка</label>
          <input type="text" id="ctWaUrl" value="${escHtml(ct.whatsapp?.url)}" />
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Email</h3></div>
      <div class="form-row">
        <div class="form-group">
          <label>Значение</label>
          <input type="text" id="ctEmailValue" value="${escHtml(ct.email?.value)}" />
        </div>
        <div class="form-group">
          <label>Ссылка</label>
          <input type="text" id="ctEmailUrl" value="${escHtml(ct.email?.url)}" />
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Телефон</h3></div>
      <div class="form-row">
        <div class="form-group">
          <label>Значение</label>
          <input type="text" id="ctPhoneValue" value="${escHtml(ct.phone?.value)}" />
        </div>
        <div class="form-group">
          <label>Ссылка</label>
          <input type="text" id="ctPhoneUrl" value="${escHtml(ct.phone?.url)}" />
        </div>
      </div>
    </div>`;
}

function collectContacts() {
  return {
    telegram: { label: 'Telegram', value: document.getElementById('ctTgValue').value, url: document.getElementById('ctTgUrl').value },
    whatsapp: { label: 'WhatsApp', value: document.getElementById('ctWaValue').value, url: document.getElementById('ctWaUrl').value },
    email: { label: 'Mail', value: document.getElementById('ctEmailValue').value, url: document.getElementById('ctEmailUrl').value },
    phone: { label: 'Телефон', value: document.getElementById('ctPhoneValue').value, url: document.getElementById('ctPhoneUrl').value }
  };
}

// --- CATEGORIES ---
function renderCategories(c) {
  const cats = siteData.categories || [];
  let html = cats.map((cat, i) => `
    <div class="item-card">
      <div class="item-card-header">
        <span class="item-number">#${i + 1}</span>
        <button class="delete-btn" onclick="deleteCategory(${i})">Удалить</button>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>ID (латиницей)</label>
          <input type="text" class="cat-id" value="${escHtml(cat.id)}" />
        </div>
        <div class="form-group">
          <label>Название</label>
          <input type="text" class="cat-name" value="${escHtml(cat.name)}" />
        </div>
      </div>
    </div>`).join('');

  c.innerHTML = `
    <div class="section-header">
      <h2>Категории</h2>
      <button class="add-btn" onclick="addCategory()">+ Добавить</button>
    </div>
    <div id="catList">${html}</div>`;
}

window.addCategory = function() {
  siteData.categories = siteData.categories || [];
  siteData.categories.push({ id: '', name: '' });
  renderCategories(document.getElementById('adminContent'));
};

window.deleteCategory = function(i) {
  siteData.categories.splice(i, 1);
  renderCategories(document.getElementById('adminContent'));
};

function collectCategories() {
  const items = document.querySelectorAll('#catList .item-card');
  return Array.from(items).map(el => ({
    id: el.querySelector('.cat-id').value,
    name: el.querySelector('.cat-name').value
  }));
}

// --- PRODUCTS ---
function renderProducts(c) {
  const prods = siteData.products || [];
  const cats = siteData.categories || [];
  let html = prods.map((p, i) => `
    <div class="item-card">
      <div class="item-card-header">
        <div style="display:flex;align-items:center;gap:6px;">
          <button class="move-btn" onclick="moveProduct(${i}, -1)" ${i === 0 ? 'disabled' : ''} title="Вверх">▲</button>
          <button class="move-btn" onclick="moveProduct(${i}, 1)" ${i === prods.length - 1 ? 'disabled' : ''} title="Вниз">▼</button>
          <span class="item-number">${escHtml(p.name || 'Товар #' + (i+1))}</span>
        </div>
        <button class="delete-btn" onclick="deleteProduct(${i})">Удалить</button>
      </div>
      <div class="inline-flex" style="margin-bottom:12px;">
        <div class="image-upload" id="prodImg${i}">
          ${p.image ? `<img src="${escHtml(p.image)}" />` : '<div class="upload-placeholder"><span>+</span>Фото</div>'}
          <input type="file" accept="image/*" onchange="uploadProductImage(${i}, this)" />
        </div>
        <div style="flex:1;">
          <div class="form-group">
            <label>Название</label>
            <input type="text" class="prod-name" value="${escHtml(p.name)}" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Цена (сом)</label>
              <input type="number" class="prod-price" value="${p.price}" />
            </div>
            <div class="form-group">
              <label>Категория</label>
              <select class="prod-cat">
                <option value="">Без категории</option>
                ${cats.map(ct => `<option value="${escHtml(ct.id)}" ${ct.id === p.category ? 'selected' : ''}>${escHtml(ct.name)}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
      </div>
      <input type="hidden" class="prod-image-url" value="${escHtml(p.image)}" />
    </div>`).join('');

  c.innerHTML = `
    <div class="section-header">
      <h2>Товары (${prods.length})</h2>
      <button class="add-btn" onclick="addProduct()">+ Добавить товар</button>
    </div>
    <div id="prodList">${html}</div>`;
}

window.addProduct = function() {
  siteData.products = siteData.products || [];
  siteData.products.push({ id: Date.now(), name: '', price: 0, image: '', category: '' });
  renderProducts(document.getElementById('adminContent'));
};

window.deleteProduct = function(i) {
  siteData.products.splice(i, 1);
  renderProducts(document.getElementById('adminContent'));
};

window.moveProduct = function(i, dir) {
  const prods = siteData.products;
  const j = i + dir;
  if (j < 0 || j >= prods.length) return;
  // Collect current form values before swap
  const items = document.querySelectorAll('#prodList .item-card');
  Array.from(items).forEach((el, idx) => {
    prods[idx].name = el.querySelector('.prod-name').value;
    prods[idx].price = parseInt(el.querySelector('.prod-price').value) || 0;
    prods[idx].category = el.querySelector('.prod-cat').value;
    prods[idx].image = el.querySelector('.prod-image-url').value;
  });
  [prods[i], prods[j]] = [prods[j], prods[i]];
  renderProducts(document.getElementById('adminContent'));
};

window.uploadProductImage = async function(i, input) {
  if (!input.files[0]) return;
  try {
    const { url } = await uploadImage(input.files[0]);
    siteData.products[i].image = url;
    renderProducts(document.getElementById('adminContent'));
    showToast('Изображение загружено');
  } catch { showToast('Ошибка загрузки'); }
};

function collectProducts() {
  const items = document.querySelectorAll('#prodList .item-card');
  return Array.from(items).map((el, i) => ({
    id: siteData.products[i]?.id || Date.now() + i,
    name: el.querySelector('.prod-name').value,
    price: parseInt(el.querySelector('.prod-price').value) || 0,
    image: el.querySelector('.prod-image-url').value,
    category: el.querySelector('.prod-cat').value
  }));
}

// --- STORES ---
function renderStores(c) {
  const stores = siteData.stores || [];
  let html = stores.map((s, i) => `
    <div class="item-card">
      <div class="item-card-header">
        <span class="item-number">${escHtml(s.address || 'Филиал #' + (i+1))}</span>
        <button class="delete-btn" onclick="deleteStore(${i})">Удалить</button>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Адрес</label>
          <input type="text" class="store-addr" value="${escHtml(s.address)}" />
        </div>
        <div class="form-group">
          <label>Город</label>
          <input type="text" class="store-city" value="${escHtml(s.city)}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Статус</label>
          <select class="store-status">
            <option value="open" ${s.status === 'open' ? 'selected' : ''}>Открыто</option>
            <option value="closed" ${s.status === 'closed' ? 'selected' : ''}>Закрыто</option>
          </select>
        </div>
        <div class="form-group">
          <label>Часы работы</label>
          <input type="text" class="store-hours" value="${escHtml(s.hours)}" placeholder="09:00-21:00" />
        </div>
      </div>
      <div class="form-group">
        <label>Часовой пояс</label>
        <input type="text" class="store-tz" value="${escHtml(s.timezone)}" placeholder="Asia/Bishkek" />
      </div>
    </div>`).join('');

  c.innerHTML = `
    <div class="section-header">
      <h2>Филиалы (${stores.length})</h2>
      <button class="add-btn" onclick="addStore()">+ Добавить филиал</button>
    </div>
    <div id="storesList">${html}</div>`;
}

window.addStore = function() {
  siteData.stores = siteData.stores || [];
  siteData.stores.push({ id: Date.now(), address: '', city: '', status: 'open', hours: '09:00-21:00', timezone: 'Asia/Bishkek' });
  renderStores(document.getElementById('adminContent'));
};

window.deleteStore = function(i) {
  siteData.stores.splice(i, 1);
  renderStores(document.getElementById('adminContent'));
};

function collectStores() {
  const items = document.querySelectorAll('#storesList .item-card');
  return Array.from(items).map((el, i) => ({
    id: siteData.stores[i]?.id || Date.now() + i,
    address: el.querySelector('.store-addr').value,
    city: el.querySelector('.store-city').value,
    status: el.querySelector('.store-status').value,
    hours: el.querySelector('.store-hours').value,
    timezone: el.querySelector('.store-tz').value
  }));
}

// --- CITIES ---
function renderCities(c) {
  const cities = siteData.cities || [];
  let html = cities.map((city, i) => `
    <div class="item-card" style="padding:12px 20px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <input type="text" class="city-name" value="${escHtml(city)}" style="flex:1;padding:10px 14px;border:2px solid #e5e7eb;border-radius:8px;font-size:15px;outline:none;" />
        <button class="delete-btn" onclick="deleteCity(${i})">✕</button>
      </div>
    </div>`).join('');

  c.innerHTML = `
    <div class="section-header">
      <h2>Города (${cities.length})</h2>
      <button class="add-btn" onclick="addCity()">+ Добавить</button>
    </div>
    <div id="citiesList">${html}</div>`;
}

window.addCity = function() {
  siteData.cities = siteData.cities || [];
  siteData.cities.push('');
  renderCities(document.getElementById('adminContent'));
};

window.deleteCity = function(i) {
  siteData.cities.splice(i, 1);
  renderCities(document.getElementById('adminContent'));
};

function collectCities() {
  return Array.from(document.querySelectorAll('#citiesList .city-name')).map(el => el.value);
}

// --- ORDER FORM ---
function renderOrderForm(c) {
  const d = siteData.orderForm || {};
  const fields = d.fields || [
    { id: 'name',    label: 'Ваше имя',       placeholder: 'Как к вам обращаться?',          type: 'text', required: true  },
    { id: 'phone',   label: 'Телефон',         placeholder: '+996',                           type: 'tel',  required: true  },
    { id: 'address', label: 'Адрес доставки',  placeholder: 'Улица, дом, квартира',           type: 'text', required: true  },
    { id: 'comment', label: 'Пожелания',       placeholder: 'Любые дополнительные пожелания...', type: 'text', required: false }
  ];

  c.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>Поля формы заказа</h3></div>
      <p style="color:#888;font-size:13px;margin:-8px 0 16px;">Изменяйте названия и подсказки полей. Порядок фиксирован.</p>
      <div id="orderFieldsList">
        ${fields.map((f, i) => `
          <div class="order-field-row" data-idx="${i}" style="border:1px solid #eee;border-radius:12px;padding:16px;margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
              <span style="background:#f3f0ff;color:#7c3aed;border-radius:8px;padding:2px 10px;font-size:12px;font-weight:600;">${escHtml(f.id)}</span>
              ${f.required ? '<span style="background:#fff0f0;color:#e53e3e;border-radius:8px;padding:2px 8px;font-size:11px;">обязательное</span>' : '<span style="background:#f0fdf4;color:#16a34a;border-radius:8px;padding:2px 8px;font-size:11px;">необязательное</span>'}
            </div>
            <div class="form-group" style="margin-bottom:8px;">
              <label>Название поля</label>
              <input type="text" class="of-label" value="${escHtml(f.label)}" placeholder="Название" />
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label>Подсказка (placeholder)</label>
              <input type="text" class="of-placeholder" value="${escHtml(f.placeholder)}" placeholder="Подсказка внутри поля" />
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function collectOrderForm() {
  const existing = (siteData.orderForm || {}).fields || [];
  const rows = document.querySelectorAll('#orderFieldsList .order-field-row');
  const fields = Array.from(rows).map((row, i) => ({
    id:          existing[i]?.id          || String(i),
    label:       row.querySelector('.of-label').value.trim(),
    placeholder: row.querySelector('.of-placeholder').value.trim(),
    type:        existing[i]?.type        || 'text',
    required:    existing[i]?.required    ?? false
  }));
  return { fields };
}

// ===== INIT =====
(async function init() {
  if (token) {
    try {
      await loadData();
      showAdmin();
      renderSection();
    } catch {
      showLogin();
    }
  } else {
    showLogin();
  }
})();
