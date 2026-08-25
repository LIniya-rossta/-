// Dynamic site data loader — fetches data from admin panel API and populates DOM
(async function loadSiteData() {
  let data;
  try {
    const res = await fetch('/api/site-data');
    if (!res.ok) return;
    data = await res.json();
  } catch { return; }

  const page = location.pathname.replace(/^\//, '') || 'index.html';

  // ===== INDEX PAGE =====
  if (page === 'index.html' || page === '' || page === '/') {
    // Branding (logo + store name)
    if (data.branding) {
      const logo = document.getElementById('heroLogo');
      const storeName = document.getElementById('heroStoreName');
      if (logo && data.branding.logo) {
        logo.innerHTML = `<img src="${esc(data.branding.logo)}" alt="Синяя птица" />`;
        logo.classList.add('visible');
      }
      if (storeName && data.branding.storeName) {
        storeName.textContent = data.branding.storeName;
        storeName.classList.add('visible');
      }
    }

    // Hero
    if (data.hero) {
      const title = document.querySelector('.hero-title');
      const subtitle = document.querySelector('.hero-subtitle');
      const btn = document.querySelector('.btn-primary');
      if (title) title.textContent = data.hero.title;
      if (subtitle) subtitle.innerHTML = (data.hero.subtitle || '').replace(/\n/g, '<br>');
      if (btn) btn.textContent = data.hero.buttonText;
    }

    // Hits section title
    if (data.hitsSection) {
      const h = document.querySelector('.hits .section-header h2');
      if (h) h.textContent = data.hitsSection.title;
    }

    // Hits cards
    if (data.hits && data.hits.length) {
      const scroll = document.querySelector('.hits-scroll');
      if (scroll) {
        scroll.innerHTML = data.hits.map(h => `
          <div class="hit-card">
            <div class="hit-card-bg"></div>
        <div class="hit-image"><img src="${esc(h.image)}" alt="${esc(h.alt || h.price || 'Синяя птица')}" /></div>
            <span class="hit-price">${esc(h.price)}</span>
          </div>`).join('');
      }
    }

    // Banner text
    if (data.bannerText) {
      const bt = document.querySelector('.banner-text');
      if (bt) bt.textContent = data.bannerText;
    }

    // FAQ
    if (data.faq && data.faq.length) {
      const list = document.querySelector('.faq-list');
      if (list) {
        list.innerHTML = data.faq.map(f => `
          <div class="faq-item" data-open="false">
            <div class="faq-question">
              <span>${esc(f.question)}</span>
              <svg class="faq-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            <div class="faq-answer"><p>${esc(f.answer)}</p></div>
          </div>`).join('');
        // Re-bind FAQ accordion
        list.querySelectorAll('.faq-item').forEach(item => {
          item.querySelector('.faq-question').addEventListener('click', () => {
            const isOpen = item.getAttribute('data-open') === 'true';
            item.setAttribute('data-open', !isOpen);
            const answer = item.querySelector('.faq-answer');
            if (!isOpen) {
              answer.style.maxHeight = answer.scrollHeight + 'px';
            } else {
              answer.style.maxHeight = '0';
            }
          });
        });
      }
    }

    // Reviews
    if (data.reviews && data.reviews.length) {
      const grid = document.querySelector('.reviews-grid');
      if (grid) {
        grid.innerHTML = data.reviews.map((r, i) => `
          <div class="review-card ${i >= 3 ? 'review-card-hidden' : ''}" style="background:${esc(r.color)}">
            <div class="review-avatar">
              <img src="${esc(r.avatar)}" alt="" loading="lazy" decoding="async" />
            </div>
            <p>${esc(r.text)}</p>
            <div class="review-stars"><span class="teacher-role">${esc(r.role || 'Команда «Синей птицы»')}</span></div>
          </div>`).join('');

        // Re-bind show more
        const btn = document.getElementById('reviewsShowMore');
        if (btn) {
          const hiddenCards = grid.querySelectorAll('.review-card-hidden');
          if (hiddenCards.length === 0) btn.style.display = 'none';
          btn.onclick = function() {
            hiddenCards.forEach(c => c.classList.remove('review-card-hidden'));
            btn.style.display = 'none';
          };
        }
      }
    }

    // Contacts
    if (data.contacts) {
      const icons = { telegram: 'telegram', whatsapp: 'whatsapp', instagram: 'instagram', email: 'mail', phone: 'phone', location: 'location', service: 'location' };
      const list = document.querySelector('.contacts-list');
      if (list) {
        list.innerHTML = Object.entries(data.contacts).map(([key, c]) => `
          <a class="contact-row" href="${esc(c.url)}" ${key !== 'email' && key !== 'phone' ? 'target="_blank" rel="noopener"' : ''}>
            <div class="contact-icon">
              <img src="/images/${icons[key] || key}.svg" alt="${esc(c.label)}" />
            </div>
            <span class="contact-label">${esc(c.label)}</span>
            <span class="contact-value">${esc(c.value)}</span>
          </a>`).join('');
      }
    }
  }

  // ===== CATALOG PAGE =====
  if (page === 'catalog.html') {
    // Categories tabs
    if (data.categories && data.categories.length) {
      const tabs = document.querySelector('.catalog-tabs');
      if (tabs) {
        const pill = tabs.querySelector('.catalog-tab-pill');
        // Clear all existing tabs except pill
        Array.from(tabs.children).forEach(ch => {
          if (!ch.classList.contains('catalog-tab-pill')) ch.remove();
        });
        data.categories.forEach((cat, i) => {
          const btn = document.createElement('button');
          btn.className = 'catalog-tab' + (i === 0 ? ' active' : '');
          btn.dataset.category = cat.id;
          btn.textContent = cat.name;
          tabs.appendChild(btn);
        });
      }
    }

    // Barbers — the first step of the booking flow
    if (data.barbers && data.barbers.length) {
      const grid = document.querySelector('.products-grid');
      if (grid) {
        grid.innerHTML = data.barbers.map(b => `
          <div class="product-card barber-card" data-category="${esc(b.category)}" data-name="${esc(b.name)}" data-price="0" data-barber-id="${esc(b.id)}" data-barber-role="${esc(b.role)}" data-barber-rating="${esc(b.rating || '')}" data-barber-image="${esc(b.image)}">
            <div class="product-image">
              <img src="${esc(b.image)}" alt="Педагог ${esc(b.name)}" loading="lazy" />
              <button class="card-cart-badge" type="button" aria-label="Выбрать педагога"><span>+</span></button>
            </div>
            <div class="product-info">
              <div class="product-name">${esc(b.name)}</div>
              <div class="product-price">✦ ${esc(b.badge || 'Педагог')}</div>
              <div class="product-actions">
                <button class="btn-order" type="button" data-select-barber>Выбрать педагога</button>
              </div>
              <div class="barber-role">${esc(b.role)}</div>
            </div>
          </div>`).join('');

        if (typeof window.initCartSystem === 'function') {
          window.initCartSystem();
        }
      }
    }

    // Products are still used as the service list on the booking step
    if (!data.barbers?.length && data.products && data.products.length) {
      const grid = document.querySelector('.products-grid');
      if (grid) {
        grid.innerHTML = data.products.map(p => `
          <div class="product-card" data-category="${esc(p.category)}" data-name="${esc(p.name)}" data-price="${p.price}">
            <div class="product-image">
              <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" />
                <button class="card-cart-badge" type="button" aria-label="Добавить в запись">
                <svg width="15" height="14" viewBox="0 0 15 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.5 0.875C0.5 0.391751 0.891751 0 1.375 0H2.37862C3.16085 0 3.84765 0.536031 4.03906 1.30118L4.14379 1.71875H12.8037C14.1178 1.71875 15.0456 2.98476 14.4082 4.16302L12.8142 7.11153C12.5105 7.67263 11.9339 8.01042 11.3089 8.01042H6.14354C5.36131 8.01042 4.67451 7.47438 4.48309 6.70924L3.19602 1.58074C3.13197 1.32444 2.90258 1.14583 2.63766 1.14583H1.375C0.891751 1.14583 0.5 0.753084 0.5 0.269835C0.5 -0.213414 0.891751 0.875 0.891751 0.875H1.375ZM4.57825 2.86458L5.47329 6.43079C5.53734 6.68709 5.76674 6.86558 6.03165 6.86558H11.2089C11.4173 6.86558 11.6094 6.74874 11.7108 6.56571L13.3048 3.61719C13.5178 3.21908 13.2407 2.73698 12.8037 2.73698H5.24105H4.57825V2.86458ZM6.5 10.3125C6.5 11.1062 5.85616 11.75 5.0625 11.75C4.26884 11.75 3.625 11.1062 3.625 10.3125C3.625 9.51884 4.26884 8.875 5.0625 8.875C5.85616 8.875 6.5 9.51884 6.5 10.3125ZM12.25 10.3125C12.25 11.1062 11.6062 11.75 10.8125 11.75C10.0188 11.75 9.375 11.1062 9.375 10.3125C9.375 9.51884 10.0188 8.875 10.8125 8.875C11.6062 8.875 12.25 9.51884 12.25 10.3125Z" fill="white"/></svg>
              </button>
            </div>
            <div class="product-info">
              <div class="product-name">${esc(p.name)}</div>
              <div class="product-price">${esc(p.priceLabel || `${p.price} сом`)}</div>
              <div class="product-actions">
                <button class="btn-order">Записаться</button>
                <div class="cart-qty-controls" style="display:none;">
                  <button class="qty-btn qty-minus">−</button>
                  <input type="number" class="qty-input" value="1" min="0" max="99" />
                  <button class="qty-btn qty-plus">+</button>
                </div>
              </div>
            </div>
          </div>`).join('');

        // Re-init cart system after DOM update
        if (typeof window.initCartSystem === 'function') {
          window.initCartSystem();
        }
      }
    }

    // Re-init catalog tabs after DOM update (categories + products)
    if (typeof window.initCatalogTabs === 'function') {
      window.initCatalogTabs();
    }
  }

  // ===== STORES PAGE =====
  if (page === 'stores.html') {
    // Cities
    if (data.cities && data.cities.length) {
      const dropdown = document.getElementById('cityDropdown');
      if (dropdown) {
        dropdown.innerHTML = data.cities.map(city => `
          <a href="#" class="city-item" data-city="${esc(city)}">
            <span>${esc(city)}</span>
            <svg width="7" height="12" viewBox="0 0 8 14" fill="none" stroke="#bbb" stroke-width="2"><path d="M1 1l6 6-6 6"/></svg>
          </a>`).join('');
      }
    }

    // Stores
    if (data.stores && data.stores.length) {
      const list = document.querySelector('.stores-list');
      if (list) {
        list.innerHTML = data.stores.map(s => `
          <a href="${esc(s.url || 'https://2gis.kg/bishkek/firm/70000001046783811')}" class="store-card" data-status="${esc(s.status)}" target="_blank" rel="noopener">
            <div class="store-info">
              <p class="store-address">${esc(s.address)}</p>
              <p class="store-city">${esc(s.city)}</p>
              <div class="store-status">
                <span class="status-dot ${esc(s.status)}"></span>
            <span class="status-text">${s.status === 'open' ? `Открыто · ${esc(s.hours || '10:00–21:00')}` : 'Закрыто'}</span>
              </div>
            </div>
            <svg class="store-arrow" width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="#999" stroke-width="2"><path d="M1 1l6 6-6 6"/></svg>
          </a>`).join('');

        // Re-apply current filter
        const activeBtn = document.querySelector('.filter-btn.active');
        if (activeBtn) {
          const filter = activeBtn.dataset.filter;
          list.querySelectorAll('.store-card').forEach(card => {
            card.classList.toggle('hidden', card.dataset.status !== filter);
          });
        }
      }
    }
  }

  // ===== ORDER PAGE =====
  if (page === 'order.html') {
    const serviceGrid = document.getElementById('serviceChoices');
    if (serviceGrid && data.products && data.products.length) {
      serviceGrid.innerHTML = data.products.map(p => `
        <button class="service-choice" type="button" data-service-id="${esc(p.id)}" data-service-name="${esc(p.name)}" data-service-price="${esc(p.price)}" data-service-label="${esc(p.priceLabel || `${p.price} сом`)}" data-service-image="${esc(p.image)}">
          <span class="service-choice-image"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" /></span>
          <span class="service-choice-copy"><strong>${esc(p.name)}</strong><small>${esc(p.priceLabel || `${p.price} сом`)}</small></span>
          <span class="service-choice-check">✓</span>
        </button>`).join('');
    }

    const form = document.getElementById('orderForm');
    if (form && data.orderForm && data.orderForm.fields && data.orderForm.fields.length) {
      form.innerHTML = data.orderForm.fields.map(f => `
        <div class="order-field">
          <label>${esc(f.label)}</label>
          <input type="${esc(f.type)}" name="${esc(f.id)}" placeholder="${esc(f.placeholder)}" ${f.required ? 'required' : ''} ${f.type === 'tel' ? 'maxlength="15"' : ''} />
        </div>`).join('');
    } else if (form && !form.children.length) {
      // Fallback default fields if no data
      form.innerHTML = `
        <div class="order-field"><label>Ваше имя</label><input type="text" placeholder="Как к вам обращаться?" required /></div>
        <div class="order-field"><label>Телефон</label><input type="tel" placeholder="+996" required maxlength="15" /></div>
        <div class="order-field"><label>Желаемая дата и время экскурсии</label><input type="text" placeholder="Например, в субботу после 11:00" required /></div>
        <div class="order-field"><label>Возраст ребёнка и вопросы</label><input type="text" placeholder="Возраст ребёнка, питание, адаптация или другой вопрос" /></div>`;
    }
  }
})();

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}
