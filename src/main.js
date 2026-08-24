import './site-data.js';

// FAQ accordion
document.querySelectorAll('.faq-question').forEach(q => {
  q.addEventListener('click', () => {
    const item = q.closest('.faq-item');
    const isOpen = item.getAttribute('data-open') === 'true';
    // Close all others
    document.querySelectorAll('.faq-item').forEach(i => {
      if (i !== item || isOpen) {
        i.setAttribute('data-open', 'false');
      }
    });
    // Toggle current
    if (!isOpen) {
      item.setAttribute('data-open', 'true');
    }
  });
});

// Reviews "Show more" toggle
const reviewsShowMore = document.getElementById('reviewsShowMore');
const reviewsGrid = document.querySelector('.reviews-grid');
if (reviewsShowMore && reviewsGrid) {
  reviewsShowMore.addEventListener('click', () => {
    const isOpen = reviewsGrid.classList.toggle('show-all');
    reviewsShowMore.classList.toggle('expanded', isOpen);
    reviewsShowMore.querySelector('span').textContent = isOpen ? 'Скрыть' : 'Показать ещё';
  });
}

// City selector dropdown (stores page)
const cityPill = document.getElementById('cityPill');
const cityDropdown = document.getElementById('cityDropdown');
if (cityPill && cityDropdown) {
  cityPill.addEventListener('click', () => {
    const isOpen = cityDropdown.classList.toggle('open');
    cityPill.classList.toggle('open', isOpen);
  });

  // Use event delegation so dynamically-rendered city items still work
  cityDropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.city-item');
    if (!item) return;
    e.preventDefault();
    e.stopPropagation();
    const selectedCity = item.dataset.city;
    cityPill.querySelector('span').textContent = selectedCity;
    cityDropdown.querySelectorAll('.city-item').forEach(c => c.classList.remove('active'));
    item.classList.add('active');
    cityDropdown.classList.remove('open');
    cityPill.classList.remove('open');
    // Filter store cards by city
    document.querySelectorAll('.store-card').forEach(card => {
      const cardCity = card.querySelector('.store-city')?.textContent || '';
      const matches = cardCity.toLowerCase().includes(selectedCity.toLowerCase());
      card.classList.toggle('city-hidden', !matches);
    });
    // Re-apply status filter
    const activeFilter = document.querySelector('.filter-btn.active');
    if (activeFilter) {
      const filter = activeFilter.dataset.filter;
      document.querySelectorAll('.store-card').forEach(card => {
        if (!card.classList.contains('city-hidden')) {
          card.classList.toggle('hidden', card.dataset.status !== filter);
        }
      });
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.city-selector')) {
      cityDropdown.classList.remove('open');
      cityPill.classList.remove('open');
    }
  });
}

// Store filter buttons with sliding pill (stores page)
const filterContainer = document.querySelector('.stores-filter');
const filterPill = document.querySelector('.filter-pill');
const filterBtns = document.querySelectorAll('.filter-btn');

function positionFilterPill(btn) {
  if (!filterPill || !btn) return;
  filterPill.style.left = btn.offsetLeft + 'px';
  filterPill.style.width = btn.offsetWidth + 'px';
}

if (filterBtns.length && filterPill) {
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      positionFilterPill(btn);
      const filter = btn.dataset.filter;
      document.querySelectorAll('.store-card').forEach(card => {
        if (!card.classList.contains('city-hidden')) {
          card.classList.toggle('hidden', card.dataset.status !== filter);
        }
      });
    });
  });

  // Initial position
  const activeBtn = document.querySelector('.filter-btn.active');
  if (activeBtn) {
    // No transition on initial position
    filterPill.style.transition = 'none';
    positionFilterPill(activeBtn);
    // Filter cards
    const filter = activeBtn.dataset.filter;
    document.querySelectorAll('.store-card').forEach(card => {
      card.classList.toggle('hidden', card.dataset.status !== filter);
    });
    requestAnimationFrame(() => {
      filterPill.style.transition = '';
    });
  }
}

// Order modal (cart checkout)
window.openOrderModal = function() {
  const overlay = document.getElementById('orderModal');
  if (overlay) overlay.classList.add('active');
};

// Direct order modal (single item)
window.openDirectOrderModal = function(name, price) {
  const overlay = document.getElementById('directOrderModal');
  if (overlay) {
    const nameEl = document.getElementById('directProductName');
    const priceEl = document.getElementById('directProductPrice');
    if (nameEl) nameEl.textContent = name;
    if (priceEl) priceEl.textContent = price + ' сом';
    overlay.classList.add('active');
  }
};

window.closeOrderModal = function() {
  document.getElementById('orderModal')?.classList.remove('active');
  document.getElementById('directOrderModal')?.classList.remove('active');
};

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    window.closeOrderModal();
  }
});

// Toast notification
window.showToast = function(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
};

// ─── SESSION CART (resets on page leave) ───
const cart = {};

function updateCartUI() {
  const bottomNav = document.getElementById('bottomNav');
  const checkoutBar = document.getElementById('checkoutBar');
  
  let totalItems = 0;
  let totalPrice = 0;
  
  for (const name in cart) {
    if (cart[name].qty > 0) {
      totalItems += cart[name].qty;
      totalPrice += cart[name].qty * cart[name].price;
    }
  }
  
  // Toggle bottom nav / checkout bar
  if (bottomNav && checkoutBar) {
    const checkoutSubtitle = document.getElementById('checkoutBarSubtitle');
    if (totalItems > 0) {
      bottomNav.classList.add('hidden-by-cart');
      checkoutBar.classList.add('visible');
      if (checkoutSubtitle) {
        checkoutSubtitle.textContent = totalItems + ' усл., ' + totalPrice.toLocaleString('ru-RU') + ' сом';
      }
    } else {
      bottomNav.classList.remove('hidden-by-cart');
      checkoutBar.classList.remove('visible');
    }
  }
}

function pluralize(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function renderCartModal() {
  const list = document.getElementById('cartItemsList');
  const modalTotal = document.getElementById('cartModalTotal');
  const submitTotal = document.getElementById('submitTotal');
  if (!list) return;
  
  let html = '';
  let total = 0;
  
  for (const name in cart) {
    if (cart[name].qty > 0) {
      const itemTotal = cart[name].qty * cart[name].price;
      total += itemTotal;
      html += `<div class="cart-modal-item">
        <span class="cart-modal-item-name">${name}</span>
        <span class="cart-modal-item-qty">×${cart[name].qty}</span>
        <span class="cart-modal-item-price">${itemTotal.toLocaleString('ru-RU')} сом</span>
      </div>`;
    }
  }
  
  list.innerHTML = html || '<p style="color:#999;font-size:14px;">Корзина пуста</p>';
  if (modalTotal) modalTotal.textContent = total.toLocaleString('ru-RU') + ' сом';
  if (submitTotal) submitTotal.textContent = total.toLocaleString('ru-RU') + ' сом';
}

// Cart controls on product cards — wrapped in function for re-init after dynamic DOM
function initCartSystem() {
  document.querySelectorAll('.product-card').forEach(card => {
    const name = card.dataset.name;
    const price = parseInt(card.dataset.price) || 0;
    const orderBtn = card.querySelector('.btn-order');
    const qtyControls = card.querySelector('.cart-qty-controls');
    const qtyInput = card.querySelector('.qty-input');
    const minusBtn = card.querySelector('.qty-minus');
    const plusBtn = card.querySelector('.qty-plus');
    const badge = card.querySelector('.card-cart-badge');
    const actions = card.querySelector('.product-actions');
    
    if (!name) return;

    // Get image URL for this card
    const cardImg = card.querySelector('.product-image img');
    const imageUrl = cardImg ? cardImg.src : '';

    // Restore cart state if item was already in cart
    if (cart[name]) {
      badge && badge.classList.add('active');
      if (qtyControls) qtyControls.style.display = '';
      if (qtyInput) qtyInput.value = cart[name].qty;
      if (actions) actions.classList.add('has-qty');
    }
    
  // "Записаться" → direct appointment (single service, not cart)
    if (orderBtn) {
      orderBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.openDirectOrderModal(name, price);
      });
    }
    
    // Badge click → toggle add to cart
    if (badge) {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        if (cart[name]) {
          // Remove from cart
          delete cart[name];
          badge.classList.remove('active');
          qtyControls.style.display = 'none';
          actions.classList.remove('has-qty');
        } else {
          // Add to cart
          cart[name] = { qty: 1, price, image: imageUrl };
          badge.classList.add('active');
          qtyControls.style.display = '';
          qtyInput.value = 1;
          actions.classList.add('has-qty');
        }
        updateCartUI();
      });
    }
    
    if (plusBtn) {
      plusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!cart[name]) cart[name] = { qty: 0, price, image: imageUrl };
        cart[name].qty = Math.min(99, cart[name].qty + 1);
        qtyInput.value = cart[name].qty;
        updateCartUI();
      });
    }
    
    if (minusBtn) {
      minusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!cart[name]) return;
        cart[name].qty--;
        if (cart[name].qty <= 0) {
          delete cart[name];
          qtyControls.style.display = 'none';
          actions.classList.remove('has-qty');
          if (badge) badge.classList.remove('active');
        } else {
          qtyInput.value = cart[name].qty;
        }
        updateCartUI();
      });
    }
    
    if (qtyInput) {
      qtyInput.addEventListener('change', (e) => {
        e.stopPropagation();
        let val = parseInt(qtyInput.value) || 0;
        val = Math.max(0, Math.min(99, val));
        if (val <= 0) {
          delete cart[name];
          qtyControls.style.display = 'none';
          actions.classList.remove('has-qty');
          if (badge) badge.classList.remove('active');
        } else {
          if (!cart[name]) cart[name] = { qty: 0, price, image: imageUrl };
          cart[name].qty = val;
          qtyInput.value = val;
        }
        updateCartUI();
      });
      qtyInput.addEventListener('click', (e) => e.stopPropagation());
    }
  });

  // Checkout bar → go to order page
  const checkoutBarBtn = document.getElementById('checkoutBarBtn');
  if (checkoutBarBtn) {
    checkoutBarBtn.addEventListener('click', () => {
      sessionStorage.setItem('flowerskg_cart', JSON.stringify(cart));
      window.location.href = 'order.html';
    });
  }
}
window.initCartSystem = initCartSystem;
initCartSystem();

// "Записаться" button → go to appointment page with single service
window.openDirectOrderModal = function(name, price) {
  const directCart = {};
  directCart[name] = { qty: 1, price };
  // Find image from product card
  const cards = document.querySelectorAll('.product-card');
  cards.forEach(card => {
    if (card.dataset.name === name) {
      const img = card.querySelector('.product-image img');
      if (img) directCart[name].image = img.src;
    }
  });
  sessionStorage.setItem('flowerskg_cart', JSON.stringify(directCart));
  window.location.href = 'order.html';
};

// Form submit (both cart and direct order forms)
document.addEventListener('submit', (e) => {
  if (e.target.closest('.order-form')) {
    e.preventDefault();
    closeOrderModal();
    
    // If it's the cart form, clear cart
    if (e.target.id === 'orderForm') {
      for (const key in cart) delete cart[key];
      document.querySelectorAll('.product-card').forEach(card => {
        const qtyControls = card.querySelector('.cart-qty-controls');
        const badge = card.querySelector('.card-cart-badge');
        const actions = card.querySelector('.product-actions');
        if (qtyControls) qtyControls.style.display = 'none';
        if (badge) badge.classList.remove('active');
        if (actions) actions.classList.remove('has-qty');
      });
      updateCartUI();
    }
    
  }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Catalog tab filtering with animation — wrapped for re-init after dynamic DOM
function initCatalogTabs() {
  const catalogTabPill = document.querySelector('.catalog-tab-pill');
  const catalogTabs = document.querySelectorAll('.catalog-tab');

  function positionCatalogPill(tab) {
    if (!catalogTabPill || !tab) return;
    catalogTabPill.style.left = (tab.offsetLeft) + 'px';
    catalogTabPill.style.width = tab.offsetWidth + 'px';
  }

  // Initial position
  const activeCatalogTab = document.querySelector('.catalog-tab.active');
  if (activeCatalogTab && catalogTabPill) {
    positionCatalogPill(activeCatalogTab);
  }

  catalogTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      catalogTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      positionCatalogPill(tab);

      // Scroll active tab into view within the container
      const container = tab.parentElement;
      const tabLeft = tab.offsetLeft;
      const tabWidth = tab.offsetWidth;
      const containerWidth = container.clientWidth;
      const scrollTarget = tabLeft - (containerWidth / 2) + (tabWidth / 2);
      container.scrollTo({ left: scrollTarget, behavior: 'smooth' });
      
      const category = tab.dataset.category;
      const cards = document.querySelectorAll('.product-card');
      let delay = 0;
      cards.forEach(card => {
        const show = category === 'all' || card.dataset.category === category;
        if (show) {
          card.style.display = '';
          card.style.opacity = '0';
          card.style.transform = 'translateY(10px)';
          setTimeout(() => {
            card.style.transition = 'opacity 0.35s cubic-bezier(0.22,1,0.36,1), transform 0.35s cubic-bezier(0.22,1,0.36,1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, delay);
          delay += 50;
        } else {
          card.style.transition = 'opacity 0.2s';
          card.style.opacity = '0';
          setTimeout(() => { card.style.display = 'none'; }, 200);
        }
      });
    });
  });
}
window.initCatalogTabs = initCatalogTabs;
initCatalogTabs();

// Price filter
const priceApplyBtn = document.getElementById('priceApply');
if (priceApplyBtn) {
  const priceMinInput = document.getElementById('priceMin');
  const priceMaxInput = document.getElementById('priceMax');
  
  function applyPriceFilter() {
    const min = parseInt(priceMinInput.value) || 0;
    const max = parseInt(priceMaxInput.value) || Infinity;
    const activeTab = document.querySelector('.catalog-tab.active');
    const category = activeTab ? activeTab.dataset.category : 'all';
    const cards = document.querySelectorAll('.product-card');
    
    cards.forEach(card => {
      const price = parseInt(card.dataset.price) || 0;
      const catMatch = category === 'all' || card.dataset.category === category;
      const priceMatch = price >= min && price <= max;
      card.style.display = (catMatch && priceMatch) ? '' : 'none';
      if (catMatch && priceMatch) {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }
    });
  }
  
  priceApplyBtn.addEventListener('click', applyPriceFilter);
  priceMinInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyPriceFilter(); });
  priceMaxInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyPriceFilter(); });
}

// Bottom nav sliding pill
const navPill = document.querySelector('.nav-pill');
const navMain = document.querySelector('.bottom-nav-main');
const activeNavItem = document.querySelector('.bottom-nav-main .nav-item.active');

function positionPillOn(item) {
  if (!navPill || !item) return;
  const parentRect = navMain.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  navPill.style.left = (itemRect.left - parentRect.left) + 'px';
  navPill.style.width = itemRect.width + 'px';
}

if (navPill && activeNavItem) {
  positionPillOn(activeNavItem);
  window.addEventListener('resize', () => positionPillOn(activeNavItem));

  // Animate pill to clicked item before navigating
  document.querySelectorAll('.bottom-nav-main .nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (item.classList.contains('active')) return;
      e.preventDefault();
      positionPillOn(item);
      const href = item.getAttribute('href');
      setTimeout(() => { window.location.href = href; }, 350);
    });
  });
}

// Section fade-in on scroll
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -40px 0px' };
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.section, .banner, .contacts, .faq').forEach(el => {
  fadeObserver.observe(el);
});

// Staggered store cards animation
const storeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const cards = entry.target.querySelectorAll('.store-card');
      cards.forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(12px)';
        setTimeout(() => {
          card.style.transition = 'opacity 0.4s cubic-bezier(0.22,1,0.36,1), transform 0.4s cubic-bezier(0.22,1,0.36,1)';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, i * 60);
      });
      storeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.05 });

document.querySelectorAll('.stores-list').forEach(el => storeObserver.observe(el));

// ─── Search Overlay ───
const searchOverlay = document.getElementById('searchOverlay');
const searchInput = document.getElementById('searchInput');
const searchClose = document.getElementById('searchClose');
const searchResults = document.getElementById('searchResults');
const searchDefault = document.getElementById('searchDefault');
const searchNoResults = document.getElementById('searchNoResults');
const searchHits = document.getElementById('searchHits');

if (searchOverlay) {
  // Populate the compact service preview without changing the existing search UI
  const hitImages = ['/images/tm-interior-hero.jpg', '/images/tm-interior-detail.jpg', '/images/tm-barber.jpg'];
  if (searchHits) {
    hitImages.forEach(src => {
      const card = document.createElement('div');
      card.className = 'search-hit-card';
      card.innerHTML = `<img src="${src}" alt="Хит" />`;
      searchHits.appendChild(card);
    });
  }

  // Collect products from catalog page cards
  const products = [];
  document.querySelectorAll('.product-card').forEach(card => {
    const name = card.querySelector('.product-name')?.textContent || '';
    const price = card.querySelector('.product-price')?.textContent || '';
    const img = card.querySelector('.product-image img')?.src || '';
    if (name) products.push({ name, price, img });
  });

  function openSearch() {
    searchOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => searchInput.focus(), 100);
  }

  function closeSearch() {
    searchOverlay.classList.remove('active');
    document.body.style.overflow = '';
    searchInput.value = '';
    searchResults.innerHTML = '';
    searchNoResults.style.display = 'none';
    if (searchDefault) searchDefault.style.display = '';
  }

  // Open on nav-search click
  document.querySelectorAll('.nav-search').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openSearch();
    });
  });

  // Close button
  searchClose.addEventListener('click', closeSearch);

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchOverlay.classList.contains('active')) {
      closeSearch();
    }
  });

  // Search filtering
  searchInput.addEventListener('input', () => {
    runSearch();
  });

  function runSearch() {
    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
      searchResults.innerHTML = '';
      searchNoResults.style.display = 'none';
      if (searchDefault) searchDefault.style.display = '';
      return;
    }

    if (searchDefault) searchDefault.style.display = 'none';

    const filtered = products.filter(p => p.name.toLowerCase().includes(query));

    if (filtered.length === 0) {
      searchResults.innerHTML = '';
      searchNoResults.style.display = 'block';
    } else {
      searchNoResults.style.display = 'none';
      searchResults.innerHTML = filtered.map(p => `
        <a class="search-result-item" href="#" onclick="openOrderModal('${p.name.replace(/'/g, "\\'")}'); return false;">
          <img src="${p.img}" alt="${p.name}" />
          <div class="search-result-info">
            <span class="search-result-name">${p.name}</span>
            <span class="search-result-price">${p.price}</span>
          </div>
        </a>
      `).join('');
    }
  }

  // Voice input (Web Speech API)
  const searchMic = document.getElementById('searchMic');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (searchMic && SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = true;
    recognition.continuous = false;

    searchMic.addEventListener('click', () => {
      searchMic.classList.add('listening');
      recognition.start();
    });

    recognition.addEventListener('result', (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('');
      searchInput.value = transcript;
      runSearch();
    });

    recognition.addEventListener('end', () => {
      searchMic.classList.remove('listening');
    });

    recognition.addEventListener('error', () => {
      searchMic.classList.remove('listening');
    });
  } else if (searchMic) {
    searchMic.style.display = 'none';
  }
}

// ===== ORDER PAGE =====
if (document.querySelector('.order-page')) {
  const orderCart = JSON.parse(sessionStorage.getItem('flowerskg_cart') || '{}');
  const orderItems = document.getElementById('orderItems');
  const submitBtn = document.getElementById('orderSubmitBtn');
  const submitSubtitle = document.getElementById('orderSubmitSubtitle');

  function renderOrderItems() {
    if (!orderItems) return;
    const entries = Object.entries(orderCart).filter(([, v]) => v.qty > 0);

    if (entries.length === 0) {
      orderItems.innerHTML = '<div style="padding:20px;text-align:center;color:#999;font-family:Nunito,sans-serif;font-size:14px;">Вы ещё не выбрали услугу</div>';
      if (submitSubtitle) submitSubtitle.textContent = '0 сом';
      return;
    }

    let totalItems = 0;
    let totalPrice = 0;

    orderItems.innerHTML = entries.map(([name, item]) => {
      totalItems += item.qty;
      totalPrice += item.qty * item.price;
      const imgSrc = item.image || '/images/placeholder.jpg';
      return `
        <div class="order-item" data-name="${name}">
          <div class="order-item-image">
            <img src="${imgSrc}" alt="${name}" />
          </div>
          <div class="order-item-info">
            <p class="order-item-name">${name}</p>
            <p class="order-item-price">${item.price} сом</p>
            <div class="order-item-qty">
              <button type="button" class="order-qty-minus">−</button>
              <span class="order-qty-val">${item.qty}</span>
              <button type="button" class="order-qty-plus">+</button>
            </div>
          </div>
        </div>`;
    }).join('');

    if (submitSubtitle) {
      submitSubtitle.textContent = totalItems + ' усл., ' + totalPrice.toLocaleString('ru-RU') + ' сом';
    }

    // Bind qty buttons
    orderItems.querySelectorAll('.order-item').forEach(el => {
      const itemName = el.dataset.name;
      el.querySelector('.order-qty-plus').addEventListener('click', () => {
        orderCart[itemName].qty = Math.min(99, orderCart[itemName].qty + 1);
        sessionStorage.setItem('flowerskg_cart', JSON.stringify(orderCart));
        renderOrderItems();
      });
      el.querySelector('.order-qty-minus').addEventListener('click', () => {
        orderCart[itemName].qty--;
        if (orderCart[itemName].qty <= 0) {
          delete orderCart[itemName];
        }
        sessionStorage.setItem('flowerskg_cart', JSON.stringify(orderCart));
        renderOrderItems();
      });
    });
  }

  renderOrderItems();

  // Form submit
  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    orderForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Collect form field values
      const fields = Array.from(orderForm.querySelectorAll('.order-field')).map(el => ({
        label: el.querySelector('label')?.textContent?.trim() || '',
        value: el.querySelector('input,textarea,select')?.value?.trim() || ''
      }));

      // Calculate total
      let total = 0;
      Object.values(orderCart).forEach(item => { total += item.qty * item.price; });

      // POST order (fire and forget — don't block animation)
      fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, items: orderCart, total })
      }).then(r => { if (!r.ok) r.text().then(t => console.error('[order] Server error:', t)); })
        .catch(e => console.error('[order] Network error:', e.message));

      sessionStorage.removeItem('flowerskg_cart');
      showOrderSuccess();
    });
  }
}

// ===== ORDER SUCCESS ANIMATION =====
function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // iPhone-style success: two ascending tones
    function playTone(freq, startTime, duration, gain) {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.connect(vol);
      vol.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.02, startTime + duration * 0.8);
      vol.gain.setValueAtTime(0, startTime);
      vol.gain.linearRampToValueAtTime(gain, startTime + 0.01);
      vol.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    }
    const t = ctx.currentTime;
    playTone(880, t,        0.12, 0.35);
    playTone(1108, t + 0.1, 0.14, 0.3);
    playTone(1320, t + 0.2, 0.22, 0.25);
  } catch {}
}

function showOrderSuccess() {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'order-success-overlay';
  overlay.innerHTML = `
    <div class="order-success-circle">
      <svg class="order-success-check" width="56" height="56" viewBox="0 0 56 56" fill="none">
        <path d="M14 29L23 38L42 19" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="order-success-label">Запись отправлена!</div>
    <div class="order-success-sublabel">Мы свяжемся с вами и подтвердим время</div>`;
  document.body.appendChild(overlay);

  // Play sound
  playSuccessSound();

  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
    });
  });

  // Redirect after animation
  setTimeout(() => {
    window.location.href = 'catalog.html';
  }, 2200);
}
