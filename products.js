// products.js
// Robustere Produkt-Lade-Logik mit API-Fallback und lokalem Mock.
// Leg diese Datei an Stelle der bestehenden products.js im Repo (gleiches Verzeichnis wie produkte.html).

(async function () {
  const CONTAINER_ID = 'products-container';
  const CATEGORY_FILTER_ID = 'category-filter';
  const SEARCH_INPUT_ID = 'product-search';
  const MOCK_URL = '/BANKetTISCH/products.mock.json'; // Pfad, damit GitHub Pages die Datei unter /BANKetTISCH/... findet
  const API_BASE = (window.API_BASE || '').replace(/\/$/, '');
  const WHATSAPP_NUMBER = '4915155539947';
  const PLACEHOLDER_IMAGE = '/BANKetTISCH/ai/placeholder.svg';
  
  // Define the category order as requested
  const CATEGORY_ORDER = [
    'Mietmöbel',
    'Verkleidung',
    'Zubehör',
    'Zelte und Pavillons',
    'Personal',
    'Dekoration',
    'Gastrozubehör',
    'Event und Partyplanung'
  ];

  // Global state for filtering/search
  let allProducts = [];
  let currentCategory = 'Alle';
  let currentSearch = '';

  function el(tag, attrs = {}, html = '') {
    const e = document.createElement(tag);
    Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k]));
    if (html) e.innerHTML = html;
    return e;
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showError(message) {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;
    const box = el('div', { class: 'product-error', role: 'alert', style: 'background:#fde8e8;border:1px solid #f5c2c2;color:#b00000;padding:1rem;border-radius:6px;margin:1rem 0;text-align:center;' }, '⚠️ ' + escapeHtml(message));
    const existing = container.querySelector('.product-error');
    if (existing) existing.remove();
    container.prepend(box);
  }

  function clearError() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;
    const existing = container.querySelector('.product-error');
    if (existing) existing.remove();
  }

  function getImageSrc(p) {
    if (!p.image) return PLACEHOLDER_IMAGE;
    // If image path already starts with /, use as-is
    if (p.image.startsWith('/')) return p.image;
    // Otherwise, prefix with /BANKetTISCH/
    return '/BANKetTISCH/' + p.image;
  }

  function filterProducts() {
    let filtered = allProducts;
    
    // Apply category filter
    if (currentCategory && currentCategory !== 'Alle') {
      filtered = filtered.filter(p => p.category === currentCategory);
    }
    
    // Apply search filter
    if (currentSearch.trim()) {
      const searchLower = currentSearch.toLowerCase().trim();
      filtered = filtered.filter(p => {
        const title = (p.title || '').toLowerCase();
        const description = (p.description || p.meta || '').toLowerCase();
        const category = (p.category || '').toLowerCase();
        return title.includes(searchLower) || description.includes(searchLower) || category.includes(searchLower);
      });
    }
    
    return filtered;
  }

  function renderProducts(products, filterCategory = null) {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;
    container.innerHTML = ''; // clear loading state
    
    if (!Array.isArray(products) || products.length === 0) {
      container.appendChild(el('div', { class: 'alert-info', style: 'color:#666;padding:1rem;text-align:center;' }, 'Keine Produkte gefunden.'));
      return;
    }

    // Group products by category
    const productsByCategory = {};
    products.forEach(p => {
      const category = p.category || 'Sonstiges';
      if (!productsByCategory[category]) {
        productsByCategory[category] = [];
      }
      productsByCategory[category].push(p);
    });

    // If filter is active, show only that category
    if (filterCategory && filterCategory !== 'Alle') {
      const filtered = products.filter(p => p.category === filterCategory);
      renderProductGrid(container, filtered);
      return;
    }

    // Render categories in the specified order
    CATEGORY_ORDER.forEach(category => {
      if (productsByCategory[category] && productsByCategory[category].length > 0) {
        renderCategorySection(container, category, productsByCategory[category]);
      }
    });

    // Render any remaining categories not in the order list
    Object.keys(productsByCategory).forEach(category => {
      if (!CATEGORY_ORDER.includes(category)) {
        renderCategorySection(container, category, productsByCategory[category]);
      }
    });
  }

  function renderCategorySection(container, categoryName, products) {
    const section = el('div', { class: 'category-section', style: 'margin-bottom:2rem;' });
    const title = el('h3', { class: 'category-title', style: 'margin-bottom:1rem;color:#2a4480;border-bottom:2px solid #2a4480;padding-bottom:0.5rem;' }, escapeHtml(categoryName));
    section.appendChild(title);

    const grid = el('div', { class: 'product-grid', style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1.5rem;' });

    products.forEach(p => {
      const card = renderProductCard(p);
      grid.appendChild(card);
    });

    section.appendChild(grid);
    container.appendChild(section);
  }

  function renderProductGrid(container, products) {
    const grid = el('div', { class: 'product-grid', style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1.5rem;' });

    products.forEach(p => {
      const card = renderProductCard(p);
      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  function renderProductCard(p) {
    const imgSrc = getImageSrc(p);
    const slug = p.slug ? encodeURIComponent(p.slug) : String(p.id);
    const card = el('article', { class: 'product-card produkt', style: 'background:#eff3fa;border-radius:14px;padding:1.5rem 1rem 1rem 1rem;box-shadow:0 2px 10px rgba(100,130,200,0.07);text-align:center;transition:transform .15s, box-shadow .15s;' });
    
    const link = el('a', { href: '/BANKetTISCH/' + slug + '.html', class: 'product-link', style: 'color:inherit;text-decoration:none;display:block;' });
    const imgWrap = el('div', { class: 'product-image-wrap', style: 'height:140px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f7f7f7;border-radius:6px;margin-bottom:0.5rem;' });
    const img = el('img', { src: imgSrc, alt: escapeHtml(p.title || ''), style: 'max-width:100%;max-height:100%;object-fit:cover;', onerror: 'this.src="' + PLACEHOLDER_IMAGE + '"' });
    imgWrap.appendChild(img);
    link.appendChild(imgWrap);
    link.appendChild(el('h3', { class: 'product-title', style: 'margin:0.5rem 0;font-size:1.15rem;font-weight:600;color:#2a4480;' }, escapeHtml(p.title || 'Produkt')));
    card.appendChild(link);
    
    if (p.description || p.meta) {
      card.appendChild(el('p', { class: 'product-meta', style: 'margin:0.75rem 0;color:#3a4a68;font-size:0.95rem;' }, escapeHtml(p.description || p.meta)));
    }
    if (p.price) {
      card.appendChild(el('p', { class: 'product-price', style: 'margin:1rem 0;color:#2a4480;font-weight:600;font-size:1.1rem;' }, escapeHtml(p.price)));
    }
    
    // WhatsApp quick-action link
    const waMessage = encodeURIComponent('Hallo! Ich interessiere mich für: ' + (p.title || 'Produkt') + ' (' + (p.price || '') + ')');
    const waLink = el('a', {
      href: 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + waMessage,
      class: 'whatsapp-quick-link',
      target: '_blank',
      rel: 'noopener noreferrer',
      style: 'display:inline-block;margin-top:0.5rem;background:#25D366;color:#fff;padding:0.5rem 1rem;border-radius:6px;text-decoration:none;font-size:0.9rem;'
    }, '📱 Anfragen');
    card.appendChild(waLink);
    
    return card;
  }

  async function fetchJson(url, opts = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    try {
      const res = await fetch(url, Object.assign({}, opts, { signal: controller.signal }));
      clearTimeout(timeout);
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  function setupSearch(products) {
    const searchInput = document.getElementById(SEARCH_INPUT_ID);
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
      currentSearch = this.value;
      const filtered = filterProducts();
      renderProducts(filtered, currentCategory === 'Alle' ? null : currentCategory);
    });
  }

  function setupCategoryFilter(products) {
    const catContainer = document.getElementById(CATEGORY_FILTER_ID);
    if (!catContainer) return;
    
    const categories = Array.from(new Set((products || []).map(function(x) { return x.category; }).filter(Boolean)));
    // Sort categories according to CATEGORY_ORDER
    categories.sort(function(a, b) {
      const indexA = CATEGORY_ORDER.indexOf(a);
      const indexB = CATEGORY_ORDER.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    
    if (categories.length > 0) {
      catContainer.innerHTML = '';
      const allBtn = el('button', { type: 'button', class: 'filter-btn active', style: 'margin-right:0.5rem;margin-bottom:0.5rem;' }, 'Alle');
      allBtn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(function(btn) { btn.classList.remove('active'); });
        allBtn.classList.add('active');
        currentCategory = 'Alle';
        const filtered = filterProducts();
        renderProducts(filtered, null);
      });
      catContainer.appendChild(allBtn);
      
      categories.forEach(function(cat) {
        const btn = el('button', { type: 'button', class: 'filter-btn', style: 'margin-right:0.5rem;margin-bottom:0.5rem;' }, escapeHtml(cat));
        btn.addEventListener('click', function() {
          document.querySelectorAll('.filter-btn').forEach(function(btn) { btn.classList.remove('active'); });
          btn.classList.add('active');
          currentCategory = cat;
          const filtered = filterProducts();
          renderProducts(filtered, cat);
        });
        catContainer.appendChild(btn);
      });
    }
  }

  // boot
  const container = document.getElementById(CONTAINER_ID);
  if (container) container.innerHTML = '<div style="text-align:center;padding:2rem;color:#666;">Produkte werden geladen…</div>';
  clearError();

  // 1) try remote API if configured
  if (API_BASE) {
    try {
      const data = await fetchJson(API_BASE.replace(/\/$/, '') + '/products');
      allProducts = Array.isArray(data) ? data : (data.products || []);
      renderProducts(allProducts);
      setupCategoryFilter(allProducts);
      setupSearch(allProducts);
      clearError();
      return;
    } catch (err) {
      console.warn('API fetch failed:', err && err.message);
      showError('Produkte konnten nicht von der API geladen werden. Es werden lokale Daten verwendet.');
      // fall through to mock
    }
  }

  // 2) try local mock
  try {
    const local = await fetchJson(MOCK_URL);
    allProducts = Array.isArray(local) ? local : (local.products || []);
    renderProducts(allProducts);
    setupCategoryFilter(allProducts);
    setupSearch(allProducts);
    clearError();
    return;
  } catch (err) {
    console.error('Local mock fetch failed:', err && err.message);
    showError('Produkte konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
    if (container) container.innerHTML = '';
  }
})();
