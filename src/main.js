import './site-data.js';

const BOOKING_KEY = 'bluebird_booking_draft';

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2800);
}

function readBooking() {
  try {
    return JSON.parse(sessionStorage.getItem(BOOKING_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveBooking(booking) {
  sessionStorage.setItem(BOOKING_KEY, JSON.stringify(booking));
}

function clearBooking() {
  sessionStorage.removeItem(BOOKING_KEY);
}

function safeText(value) {
  const node = document.createElement('span');
  node.textContent = value == null ? '' : String(value);
  return node.innerHTML;
}

// FAQ accordion works both for static content and content loaded from the API.
function initFaq() {
  document.querySelectorAll('.faq-list').forEach(list => {
    if (list.dataset.bound === 'true') return;
    list.dataset.bound = 'true';
    list.addEventListener('click', event => {
      const question = event.target.closest('.faq-question');
      if (!question) return;
      const item = question.closest('.faq-item');
      const isOpen = item?.getAttribute('data-open') === 'true';
      list.querySelectorAll('.faq-item').forEach(other => {
        other.setAttribute('data-open', other === item && !isOpen ? 'true' : 'false');
        const answer = other.querySelector('.faq-answer');
        if (answer) answer.style.maxHeight = other === item && !isOpen ? `${answer.scrollHeight}px` : '0';
      });
    });
  });
}

// Team preview on the home page.
function initReviewsToggle() {
  const button = document.getElementById('reviewsShowMore');
  const grid = document.querySelector('.reviews-grid');
  if (!button || !grid || button.dataset.bound === 'true') return;
  button.dataset.bound = 'true';
  button.addEventListener('click', () => {
    const open = grid.classList.toggle('show-all');
    button.classList.toggle('expanded', open);
    const label = button.querySelector('span');
    if (label) label.textContent = open ? 'Скрыть' : 'Показать ещё';
  });
}

// Location page controls.
function initStores() {
  const cityPill = document.getElementById('cityPill');
  const cityDropdown = document.getElementById('cityDropdown');
  if (cityPill && cityDropdown && cityPill.dataset.bound !== 'true') {
    cityPill.dataset.bound = 'true';
    cityPill.addEventListener('click', event => {
      event.stopPropagation();
      const open = cityDropdown.classList.toggle('open');
      cityPill.classList.toggle('open', open);
    });
    cityDropdown.addEventListener('click', event => {
      const item = event.target.closest('.city-item');
      if (!item) return;
      event.preventDefault();
      const city = item.dataset.city || '';
      cityPill.querySelector('span').textContent = city;
      cityDropdown.querySelectorAll('.city-item').forEach(other => other.classList.toggle('active', other === item));
      cityDropdown.classList.remove('open');
      cityPill.classList.remove('open');
      document.querySelectorAll('.store-card').forEach(card => {
        const cardCity = card.querySelector('.store-city')?.textContent || '';
        card.classList.toggle('city-hidden', !cardCity.toLowerCase().includes(city.toLowerCase()));
      });
      applyStoreFilter();
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('.city-selector')) {
        cityDropdown.classList.remove('open');
        cityPill.classList.remove('open');
      }
    });
  }

  const filterPill = document.querySelector('.filter-pill');
  const filterButtons = document.querySelectorAll('.filter-btn');
  if (!filterButtons.length || !filterPill || filterButtons[0].dataset.bound === 'true') return;
  filterButtons.forEach(button => {
    button.dataset.bound = 'true';
    button.addEventListener('click', () => {
      filterButtons.forEach(other => other.classList.toggle('active', other === button));
      positionFilterPill(button);
      applyStoreFilter();
    });
  });
  const active = document.querySelector('.filter-btn.active') || filterButtons[0];
  filterPill.style.transition = 'none';
  positionFilterPill(active);
  applyStoreFilter();
  requestAnimationFrame(() => { filterPill.style.transition = ''; });
}

function positionFilterPill(button) {
  const pill = document.querySelector('.filter-pill');
  if (!pill || !button) return;
  pill.style.left = `${button.offsetLeft}px`;
  pill.style.width = `${button.offsetWidth}px`;
}

function applyStoreFilter() {
  const filter = document.querySelector('.filter-btn.active')?.dataset.filter || 'open';
  document.querySelectorAll('.store-card').forEach(card => {
    card.classList.toggle('hidden', card.dataset.status !== filter || card.classList.contains('city-hidden'));
  });
}

// Parent guide tabs. The content itself is rendered by site-data.js.
function initCatalogTabs() {
  const tabs = document.querySelector('.catalog-tabs');
  const pill = tabs?.querySelector('.catalog-tab-pill');
  if (!tabs || !pill) return;

  const position = tab => {
    if (!tab) return;
    pill.style.left = `${tab.offsetLeft}px`;
    pill.style.width = `${tab.offsetWidth}px`;
  };

  tabs.querySelectorAll('.catalog-tab').forEach(tab => {
    if (tab.dataset.bound === 'true') return;
    tab.dataset.bound = 'true';
    tab.addEventListener('click', () => {
      tabs.querySelectorAll('.catalog-tab').forEach(other => other.classList.toggle('active', other === tab));
      tabs.querySelectorAll('.catalog-tab').forEach(other => other.setAttribute('aria-selected', other === tab ? 'true' : 'false'));
      position(tab);
      const scrollTarget = tab.offsetLeft - tabs.clientWidth / 2 + tab.offsetWidth / 2;
      tabs.scrollTo({ left: Math.max(0, scrollTarget), behavior: 'smooth' });
      if (typeof window.renderGuideSection === 'function') window.renderGuideSection(tab.dataset.category);
    });
  });

  const active = tabs.querySelector('.catalog-tab.active') || tabs.querySelector('.catalog-tab');
  position(active);
  window.addEventListener('resize', () => position(tabs.querySelector('.catalog-tab.active')));
}
window.initCatalogTabs = initCatalogTabs;

// A teacher can be selected, but never blocks a regular tour booking.
function initTeacherCards() {
  document.querySelectorAll('.barber-card').forEach(card => {
    if (card.dataset.bound === 'true') return;
    card.dataset.bound = 'true';
    const choose = event => {
      event.preventDefault();
      event.stopPropagation();
      window.openBarberBooking(card);
    };
    card.querySelector('[data-select-barber]')?.addEventListener('click', choose);
    card.querySelector('.card-cart-badge')?.addEventListener('click', choose);
    card.addEventListener('click', event => {
      if (!event.target.closest('button')) choose(event);
    });
  });
}
window.initCartSystem = initTeacherCards;

window.openBarberBooking = function(card) {
  const booking = readBooking();
  booking.barber = {
    id: card.dataset.barberId || '',
    name: card.dataset.name || '',
    role: card.dataset.barberRole || '',
    image: card.dataset.barberImage || card.querySelector('.product-image img')?.src || ''
  };
  saveBooking(booking);
  window.location.href = 'order.html?format=tour';
};

window.openBarberByName = function(name) {
  const card = Array.from(document.querySelectorAll('.barber-card')).find(item => item.dataset.name === name);
  if (card) return window.openBarberBooking(card);
  window.location.href = 'catalog.html?section=team';
};

// Search uses all parent-facing content, not a hidden price/service catalog.
function initSearch(data = window.__blueBirdSiteData || {}) {
  const overlay = document.getElementById('searchOverlay');
  if (!overlay || overlay.dataset.bound === 'true') return;
  overlay.dataset.bound = 'true';
  const input = document.getElementById('searchInput');
  const close = document.getElementById('searchClose');
  const results = document.getElementById('searchResults');
  const defaultBlock = document.getElementById('searchDefault');
  const empty = document.getElementById('searchNoResults');
  const hits = document.getElementById('searchHits');

  const guideItems = Object.entries(data.guide || {}).map(([id, guide]) => ({
    kind: 'guide', id, title: guide.title, text: guide.intro, href: `catalog.html?section=${id}`, image: data.gallery?.[0]?.image
  }));
  const teacherItems = (data.barbers || []).map(teacher => ({
    kind: 'teacher', id: teacher.id, title: teacher.name, text: teacher.role, href: 'catalog.html?section=team', image: teacher.image
  }));
  const formatItems = (data.products || []).map(product => ({
    kind: 'format', id: product.id, title: product.name, text: product.priceLabel || 'по записи', href: `order.html?format=${product.id}`, image: product.image
  }));
  const items = [...guideItems, ...teacherItems, ...formatItems];

  if (hits) {
    hits.innerHTML = items.slice(0, 4).map(item => `<a class="search-hit-card" href="${safeText(item.href)}"><img src="${safeText(item.image || '')}" alt="${safeText(item.title)}" /></a>`).join('');
  }

  const open = () => {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => input?.focus(), 80);
  };
  const reset = () => {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    if (input) input.value = '';
    if (results) results.innerHTML = '';
    if (empty) empty.style.display = 'none';
    if (defaultBlock) defaultBlock.style.display = '';
  };

  document.querySelectorAll('.nav-search').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    open();
  }));
  close?.addEventListener('click', reset);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && overlay.classList.contains('active')) reset();
  });
  input?.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      resetSearchResults();
      return;
    }
    if (defaultBlock) defaultBlock.style.display = 'none';
    const matched = items.filter(item => `${item.title} ${item.text}`.toLowerCase().includes(query));
    if (empty) empty.style.display = matched.length ? 'none' : 'block';
    if (results) results.innerHTML = matched.map(item => `
      <a class="search-result-item" href="${safeText(item.href)}">
        <img src="${safeText(item.image || '')}" alt="${safeText(item.title)}" />
        <div class="search-result-info"><span class="search-result-name">${safeText(item.title)}</span><span class="search-result-price">${safeText(item.text)}</span></div>
      </a>`).join('');
  });

  function resetSearchResults() {
    if (results) results.innerHTML = '';
    if (empty) empty.style.display = 'none';
    if (defaultBlock) defaultBlock.style.display = '';
  }

  const mic = document.getElementById('searchMic');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (mic && SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    mic.addEventListener('click', () => {
      mic.classList.add('listening');
      recognition.start();
    });
    recognition.addEventListener('result', event => {
      if (input) input.value = Array.from(event.results).map(result => result[0].transcript).join('');
      input?.dispatchEvent(new Event('input'));
    });
    recognition.addEventListener('end', () => mic.classList.remove('listening'));
    recognition.addEventListener('error', () => mic.classList.remove('listening'));
  } else if (mic) {
    mic.style.display = 'none';
  }
}

// Photo preview without changing the gallery layout.
function initLightbox() {
  const lightbox = document.getElementById('photoLightbox');
  const image = document.getElementById('photoLightboxImage');
  const caption = document.getElementById('photoLightboxCaption');
  if (!lightbox || lightbox.dataset.bound === 'true') return;
  lightbox.dataset.bound = 'true';
  const close = () => {
    lightbox.hidden = true;
    document.body.style.overflow = '';
  };
  document.addEventListener('click', event => {
    const card = event.target.closest('.gallery-card');
    if (card && image) {
      event.preventDefault();
      image.src = card.dataset.image || '';
      image.alt = card.dataset.title || '';
      if (caption) caption.textContent = `${card.dataset.title || ''} · ${card.dataset.text || ''}`;
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
      return;
    }
    if (event.target === lightbox || event.target.closest('.photo-lightbox-close')) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !lightbox.hidden) close();
  });
}

// Bottom navigation keeps the same sliding pill as the reference UI.
function initBottomNav() {
  const nav = document.querySelector('.bottom-nav-main');
  const pill = nav?.querySelector('.nav-pill');
  const active = nav?.querySelector('.nav-item.active');
  if (!nav || !pill || !active || nav.dataset.bound === 'true') return;
  nav.dataset.bound = 'true';
  const position = item => {
    const navRect = nav.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    pill.style.left = `${itemRect.left - navRect.left}px`;
    pill.style.width = `${itemRect.width}px`;
  };
  position(active);
  window.addEventListener('resize', () => position(active));
  nav.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', event => {
    if (item.classList.contains('active')) return;
    event.preventDefault();
    position(item);
    window.setTimeout(() => { window.location.href = item.href; }, 220);
  }));
}

function initScrollEffects() {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.section, .banner, .contacts, .faq').forEach(element => observer.observe(element));
}

// Optional teacher selection is passed into the same order form.
if (document.querySelector('.order-page')) {
  const booking = readBooking();
  const selectedTeacher = document.getElementById('selectedBarber');
  const serviceGrid = document.getElementById('serviceChoices');
  const summary = document.getElementById('orderItems');
  const submitButton = document.getElementById('orderSubmitBtn');
  const submitSubtitle = document.getElementById('orderSubmitSubtitle');

  function renderBooking() {
    if (selectedTeacher) {
      selectedTeacher.innerHTML = booking.barber?.name ? `
        <div class="booking-barber-image"><img src="${safeText(booking.barber.image)}" alt="${safeText(booking.barber.name)}" /></div>
        <div class="booking-barber-copy"><span class="booking-step">ДОПОЛНИТЕЛЬНО / ПЕДАГОГ</span><strong>${safeText(booking.barber.name)}</strong><small>${safeText(booking.barber.role)}</small></div>
        <a class="booking-change" href="catalog.html?section=team">Изменить</a>` :
        '<div class="booking-empty">Педагог не выбран — это нормально. При желании можно <a href="catalog.html?section=team">выбрать его отдельно</a>.</div>';
    }

    serviceGrid?.querySelectorAll('.service-choice').forEach(button => {
      const selected = booking.service?.id && String(booking.service.id) === String(button.dataset.serviceId);
      button.classList.toggle('selected', Boolean(selected));
      button.disabled = false;
    });

    if (summary) {
      summary.innerHTML = booking.service?.name ? `
        <div class="booking-service-summary"><span class="booking-step">ВЫБРАННЫЙ ФОРМАТ</span><strong>${safeText(booking.service.name)}</strong><span>${safeText(booking.service.label || 'по записи')}</span></div>` :
        '<div class="booking-service-empty">Выберите один формат встречи — после этого появится кнопка отправки заявки.</div>';
    }
    if (submitSubtitle) submitSubtitle.textContent = booking.service?.name ? 'Заявка без оплаты' : 'Выберите формат';
    if (submitButton) submitButton.disabled = !booking.service?.name;
  }

  function selectService(button) {
    booking.service = {
      id: button.dataset.serviceId || '',
      name: button.dataset.serviceName || '',
      price: Number(button.dataset.servicePrice) || 0,
      label: button.dataset.serviceLabel || 'по записи',
      image: button.dataset.serviceImage || ''
    };
    saveBooking(booking);
    renderBooking();
  }

  serviceGrid?.addEventListener('click', event => {
    const button = event.target.closest('.service-choice');
    if (button) selectService(button);
  });

  function applyQueryFormat() {
    const format = new URLSearchParams(location.search).get('format');
    if (!format || booking.service?.id) return;
    const button = Array.from(serviceGrid?.querySelectorAll('.service-choice') || []).find(item => item.dataset.serviceId === format);
    if (button) selectService(button);
  }

  renderBooking();
  applyQueryFormat();

  document.addEventListener('siteDataReady', () => {
    applyQueryFormat();
    renderBooking();
  });

  document.getElementById('orderForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!booking.service?.name) {
      showToast('Выберите формат встречи');
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      const title = submitButton.querySelector('.order-submit-title');
      if (title) title.textContent = 'Отправляем заявку…';
    }

    const fields = [
      ...(booking.barber?.name ? [{ label: 'Педагог', value: booking.barber.name }] : []),
      { label: 'Формат встречи', value: booking.service.name },
      ...Array.from(form.querySelectorAll('.order-field')).map(field => ({
        label: field.querySelector('label')?.textContent?.trim() || '',
        value: field.querySelector('input, textarea, select')?.value?.trim() || ''
      }))
    ];
    const items = { [booking.service.name]: { qty: 1, price: booking.service.price, image: booking.service.image } };

    try {
      const response = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, items, total: booking.service.price, source: 'bluebird-excursion' })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) throw new Error(result.error || 'Не удалось отправить заявку');
      clearBooking();
      showOrderSuccess(result.requestId);
    } catch (error) {
      if (submitButton) {
        submitButton.disabled = false;
        const title = submitButton.querySelector('.order-submit-title');
        if (title) title.textContent = 'Отправить заявку';
      }
      showToast(error.message || 'Не удалось отправить заявку. Позвоните нам, пожалуйста.');
    }
  });
}

function showOrderSuccess(requestId) {
  const existing = document.querySelector('.order-success-overlay');
  existing?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'order-success-overlay';
  overlay.innerHTML = `
    <div class="order-success-circle"><svg class="order-success-check" width="56" height="56" viewBox="0 0 56 56" fill="none"><path d="M14 29L23 38L42 19" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="order-success-label">Заявка принята</div>
    <div class="order-success-sublabel">Мы свяжемся с вами для подтверждения экскурсии.</div>
    <div class="order-success-actions"><a href="index.html">Вернуться на сайт</a><a href="https://2gis.kg/bishkek/firm/70000001019326314" target="_blank" rel="noopener">Открыть 2ГИС</a></div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('visible')));
}

initFaq();
initReviewsToggle();
initStores();
initCatalogTabs();
initTeacherCards();
initLightbox();
initBottomNav();
initScrollEffects();

document.addEventListener('siteDataReady', event => {
  initFaq();
  initReviewsToggle();
  initStores();
  initCatalogTabs();
  initTeacherCards();
  initSearch(event.detail);
});
