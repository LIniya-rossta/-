// Loads the editable site content and keeps the visual structure in the HTML.
(async function loadSiteData() {
  let data;
  try {
    const response = await fetch('/api/site-data');
    if (!response.ok) return;
    data = await response.json();
  } catch {
    return;
  }

  window.__blueBirdSiteData = data;
  const page = location.pathname.replace(/^\//, '') || 'index.html';

  if (page === 'index.html' || page === '' || page === '/') {
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

    if (data.hero) {
      const title = document.querySelector('.hero-title');
      const subtitle = document.querySelector('.hero-subtitle');
      const button = document.querySelector('.btn-primary');
      if (title) title.textContent = data.hero.title;
      if (subtitle) subtitle.innerHTML = (data.hero.subtitle || '').replace(/\n/g, '<br>');
      if (button) button.textContent = data.hero.buttonText;
    }

    if (data.hitsSection) {
      const title = document.querySelector('.hits .section-header h2');
      if (title) title.textContent = data.hitsSection.title;
    }

    if (data.hits?.length) {
      const hits = document.querySelector('.hits-scroll');
      if (hits) {
        hits.innerHTML = data.hits.map(hit => `
          <a class="hit-card" href="catalog.html?section=${esc(hit.section || 'program')}">
            <div class="hit-card-bg"></div>
            <div class="hit-image"><img src="${esc(hit.image)}" alt="${esc(hit.alt || hit.price || 'Синяя птица')}" /></div>
            <span class="hit-price">${esc(hit.price)}</span>
          </a>`).join('');
      }
    }

    if (data.bannerText) {
      const banner = document.querySelector('.banner-text');
      if (banner) banner.textContent = data.bannerText;
    }

    if (data.faq?.length) {
      const list = document.querySelector('.faq-list');
      if (list) {
        list.innerHTML = data.faq.map(faq => `
          <div class="faq-item" data-open="false">
            <div class="faq-question">
              <span>${esc(faq.question)}</span>
              <svg class="faq-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            <div class="faq-answer"><p>${esc(faq.answer)}</p></div>
          </div>`).join('');

        list.querySelectorAll('.faq-question').forEach(question => {
          question.addEventListener('click', () => {
            const item = question.closest('.faq-item');
            const isOpen = item.getAttribute('data-open') === 'true';
            list.querySelectorAll('.faq-item').forEach(other => {
              other.setAttribute('data-open', other === item && !isOpen ? 'true' : 'false');
              const answer = other.querySelector('.faq-answer');
              if (answer) answer.style.maxHeight = other === item && !isOpen ? `${answer.scrollHeight}px` : '0';
            });
          });
        });
      }
    }

    if (data.reviews?.length) {
      const grid = document.querySelector('.reviews-grid');
      if (grid) {
        grid.innerHTML = data.reviews.map((review, index) => `
          <div class="review-card ${index >= 3 ? 'review-card-hidden' : ''}" style="background:${esc(review.color)}">
            <div class="review-avatar"><img src="${esc(review.avatar)}" alt="${esc(review.role || 'Команда Синей птицы')}" loading="lazy" decoding="async" /></div>
            <p>${esc(review.text)}</p>
            <div class="review-stars"><span class="teacher-role">${esc(review.role || 'Команда «Синей птицы»')}</span></div>
          </div>`).join('');

        const more = document.getElementById('reviewsShowMore');
        const hidden = grid.querySelectorAll('.review-card-hidden');
        if (more) {
          more.style.display = hidden.length ? '' : 'none';
          more.onclick = () => {
            hidden.forEach(card => card.classList.remove('review-card-hidden'));
            more.style.display = 'none';
          };
        }
      }
    }

    if (data.contacts) {
      const icons = { telegram: 'telegram', whatsapp: 'whatsapp', instagram: 'instagram', email: 'mail', phone: 'phone', location: 'location', service: 'location' };
      const list = document.querySelector('.contacts-list');
      if (list) {
        list.innerHTML = Object.entries(data.contacts).map(([key, contact]) => `
          <a class="contact-row" href="${esc(contact.url)}" ${key !== 'email' && key !== 'phone' ? 'target="_blank" rel="noopener"' : ''}>
            <div class="contact-icon"><img src="/images/${icons[key] || key}.svg" alt="${esc(contact.label)}" /></div>
            <span class="contact-label">${esc(contact.label)}</span>
            <span class="contact-value">${esc(contact.value)}</span>
          </a>`).join('');
      }
    }
  }

  if (page === 'catalog.html') {
    const tabs = document.querySelector('.catalog-tabs');
    if (tabs && data.categories?.length) {
      const pill = tabs.querySelector('.catalog-tab-pill');
      Array.from(tabs.children).forEach(child => {
        if (!child.classList.contains('catalog-tab-pill')) child.remove();
      });
      data.categories.forEach((category, index) => {
        const button = document.createElement('button');
        button.className = `catalog-tab${index === 0 ? ' active' : ''}`;
        button.type = 'button';
        button.role = 'tab';
        button.dataset.category = category.id;
        button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
        button.textContent = category.name;
        tabs.appendChild(button);
      });
      if (pill) tabs.prepend(pill);
    }

    const teamGrid = document.querySelector('#teamGrid');
    if (teamGrid && data.barbers?.length) {
      teamGrid.innerHTML = data.barbers.map(teacher => `
        <div class="product-card barber-card" data-category="${esc(teacher.category)}" data-name="${esc(teacher.name)}" data-price="0" data-barber-id="${esc(teacher.id)}" data-barber-role="${esc(teacher.role)}" data-barber-rating="${esc(teacher.rating || '')}" data-barber-image="${esc(teacher.image)}">
          <div class="product-image">
            <img src="${esc(teacher.image)}" alt="Педагог ${esc(teacher.name)}" loading="lazy" />
          </div>
          <div class="product-info">
            <div class="product-name">${esc(teacher.name)}</div>
            <div class="product-price">✦ ${esc(teacher.badge || 'педагог')}</div>
            <div class="barber-role">${esc(teacher.role)}</div>
          </div>
        </div>`).join('');
    }

    const galleryGrid = document.querySelector('#galleryGrid');
    if (galleryGrid && data.gallery?.length) {
      galleryGrid.innerHTML = data.gallery.map(photo => `
        <button class="gallery-card" type="button" data-image="${esc(photo.image)}" data-title="${esc(photo.title)}" data-text="${esc(photo.text)}">
          <span class="gallery-card-image"><img src="${esc(photo.image)}" alt="${esc(photo.title)}" loading="lazy" /></span>
          <span class="gallery-card-copy"><strong>${esc(photo.title)}</strong><small>${esc(photo.text)}</small></span>
        </button>`).join('');
    }

    const guidePanel = document.querySelector('#guidePanel');
    const teamPanel = document.querySelector('#teamPanel');
    const galleryPanel = document.querySelector('#galleryPanel');
    const guideBody = document.querySelector('#guidePanelBody');
    const guideEyebrow = document.querySelector('#guidePanelEyebrow');
    const guideTitle = document.querySelector('#guidePanelTitle');
    const guideIntro = document.querySelector('#guidePanelIntro');
    const guideNote = document.querySelector('#guidePanelNote');
    const guideCta = document.querySelector('#guidePanelCta');

    const renderParentInfo = (info = {}) => {
      const meals = Array.isArray(info.meals) ? info.meals : [];
      const announcements = Array.isArray(info.announcements) ? info.announcements : [];
      if (!meals.length && !announcements.length && !info.noticeText) return '';
      return `
        <section class="parent-info-card" aria-label="Актуальная информация для родителей">
          <div class="parent-info-heading">
            <div><span class="parent-info-kicker">ДЛЯ РОДИТЕЛЕЙ / TODAY</span><strong>${esc(info.title || 'Сегодня в саду')}</strong></div>
            <small>${esc(info.date || '')}<br>${esc(info.updatedAt || '')}</small>
          </div>
          <p class="parent-info-intro">${esc(info.intro || '')}</p>
          ${meals.length ? `<div class="parent-menu-card"><div class="parent-menu-title">${esc(info.menuTitle || 'Меню на сегодня')}</div>${meals.map(meal => `<div class="parent-menu-row"><span>${esc(meal.time)}</span><strong>${esc(meal.text)}</strong></div>`).join('')}</div>` : ''}
          ${info.noticeText ? `<div class="parent-notice"><strong>${esc(info.noticeTitle || 'Важно')}</strong><p>${esc(info.noticeText)}</p></div>` : ''}
          ${announcements.length ? `<div class="parent-announcements">${announcements.map(item => `<article class="parent-announcement"><small>${esc(item.date || '')}</small><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></article>`).join('')}</div>` : ''}
        </section>`;
    };

    window.renderGuideSection = (section) => {
      const isTeam = section === 'team';
      const isPhotos = section === 'photos';
      const guide = data.guide?.[section];
      if (guidePanel) guidePanel.hidden = isTeam || isPhotos;
      if (teamPanel) teamPanel.hidden = !isTeam;
      if (galleryPanel) galleryPanel.hidden = !isPhotos;

      document.querySelectorAll('.catalog-tab').forEach(tab => {
        const active = tab.dataset.category === section;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      if (!guide || isTeam || isPhotos) return;
      if (guideEyebrow) guideEyebrow.textContent = guide.eyebrow || '';
      if (guideTitle) guideTitle.textContent = guide.title || '';
      if (guideIntro) guideIntro.textContent = guide.intro || '';
      if (guideNote) guideNote.textContent = guide.note || '';
      if (guideCta) {
        const isAdmission = section === 'admission';
        guideCta.hidden = !isAdmission;
        if (isAdmission) {
          guideCta.textContent = guide.cta || 'Записаться по вопросам поступления';
          guideCta.href = 'order.html?format=admission';
        }
      }
      if (guideBody) {
        const guideMarkup = guide.schedule?.length
          ? `<div class="guide-schedule">${guide.schedule.map(item => `<div class="guide-schedule-item"><span class="guide-schedule-time">${esc(item.time)}</span><div><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></div></div>`).join('')}</div>`
          : `<div class="guide-points">${(guide.points || []).map(point => `<article class="guide-point"><span class="guide-point-mark">✦</span><div><h3>${esc(point.title)}</h3><p>${esc(point.text)}</p></div></article>`).join('')}</div>`;
        guideBody.innerHTML = `${guideMarkup}${section === 'menu' ? renderParentInfo(data.parentInfo) : ''}`;
      }
    };

    const requestedSection = new URLSearchParams(location.search).get('section') || data.categories?.[0]?.id || 'program';
    const validSection = data.categories?.some(category => category.id === requestedSection) ? requestedSection : 'program';
    window.renderGuideSection(validSection);
    if (typeof window.initCartSystem === 'function') window.initCartSystem();
    if (typeof window.initCatalogTabs === 'function') window.initCatalogTabs();
  }

  if (page === 'stores.html') {
    const dropdown = document.getElementById('cityDropdown');
    if (dropdown && data.cities?.length) {
      dropdown.innerHTML = data.cities.map(city => `<a href="#" class="city-item" data-city="${esc(city)}"><span>${esc(city)}</span><svg width="7" height="12" viewBox="0 0 8 14" fill="none" stroke="#bbb" stroke-width="2"><path d="M1 1l6 6-6 6"/></svg></a>`).join('');
    }

    const list = document.querySelector('.stores-list');
    if (list && data.stores?.length) {
      list.innerHTML = data.stores.map(store => `
        <a href="${esc(store.url || '#')}" class="store-card" data-status="${esc(store.status)}" target="_blank" rel="noopener">
          <div class="store-info"><p class="store-address">${esc(store.address)}</p><p class="store-city">${esc(store.city)}</p><div class="store-status"><span class="status-dot ${esc(store.status)}"></span><span class="status-text">${store.status === 'open' ? `Открыто · ${esc(store.hours || '')}` : 'Закрыто'}</span></div></div>
          <svg class="store-arrow" width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="#999" stroke-width="2"><path d="M1 1l6 6-6 6"/></svg>
        </a>`).join('');
      const activeFilter = document.querySelector('.filter-btn.active');
      if (activeFilter) list.querySelectorAll('.store-card').forEach(card => card.classList.toggle('hidden', card.dataset.status !== activeFilter.dataset.filter));
    }
  }

  if (page === 'order.html') {
    const serviceGrid = document.getElementById('serviceChoices');
    if (serviceGrid && data.products?.length) {
      const admissionProduct = data.products.find(product => product.id === 'admission') || data.products[0];
      serviceGrid.innerHTML = admissionProduct ? `
        <button class="service-choice selected" type="button" data-service-id="${esc(admissionProduct.id)}" data-service-name="${esc(admissionProduct.name)}" data-service-price="${esc(admissionProduct.price)}" data-service-label="${esc(admissionProduct.priceLabel || 'администратор свяжется с вами')}" data-service-image="${esc(admissionProduct.image)}">
          <span class="service-choice-image"><img src="${esc(admissionProduct.image)}" alt="${esc(admissionProduct.name)}" loading="lazy" /></span>
          <span class="service-choice-copy"><strong>${esc(admissionProduct.name)}</strong><small>${esc(admissionProduct.priceLabel || 'администратор свяжется с вами')}</small></span><span class="service-choice-check">✓</span>
        </button>` : '';
    }

    const form = document.getElementById('orderForm');
    if (form && data.orderForm?.fields?.length) {
      form.innerHTML = data.orderForm.fields.map(field => `<div class="order-field"><label>${esc(field.label)}</label><input type="${esc(field.type)}" name="${esc(field.id)}" placeholder="${esc(field.placeholder)}" ${field.required ? 'required' : ''} ${field.type === 'tel' ? 'maxlength="15"' : ''} /></div>`).join('');
    }
  }

  document.dispatchEvent(new CustomEvent('siteDataReady', { detail: data }));
})();

function esc(value) {
  const node = document.createElement('div');
  node.textContent = value == null ? '' : String(value);
  return node.innerHTML;
}
