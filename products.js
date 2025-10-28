// products.js
// Robustere Produkt-Lade-Logik mit API-Fallback und lokalem Mock.
// Leg diese Datei an Stelle der bestehenden products.js im Repo (gleiches Verzeichnis wie produkte.html).

(async function () {
  const CONTAINER_ID = 'products-container';
  const CATEGORY_FILTER_ID = 'category-filter';
  const MOCK_URL = '/BANKetTISCH/products.mock.json'; // Pfad, damit GitHub Pages die Datei unter /BANKetTISCH/... findet
  const API_BASE = (window.API_BASE || '').replace(/\/$/, '');

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

  function renderProducts(products) {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;
    container.innerHTML = ''; // clear loading state
    if (!Array.isArray(products) || products.length === 0) {
      container.appendChild(el('div', { class: 'alert-info', style: 'color:#666;padding:1rem;text-align:center;' }, 'Keine Produkte verfügbar.'));
      return;
    }

    const grid = el('div', { class: 'product-grid', style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem;' });

    products.forEach(p => {
      const imgSrc = p.image || '/BANKetTISCH/images/placeholder.jpg';
      const slug = p.slug ? encodeURIComponent(p.slug) : String(p.id);
      const card = el('article', { class: 'product-card', style: 'background:#fff;border-radius:8px;padding:0.75rem;box-shadow:0 1px 4px rgba(0,0,0,0.05);' });
      const link = el('a', { href: `/BANKetTISCH/${slug}.html`, class: 'product-link', style: 'color:inherit;text-decoration:none;display:block;' });
      const imgWrap = el('div', { class: 'product-image-wrap', style: 'height:140px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f7f7f7;border-radius:6px;margin-bottom:0.5rem;' });
      const img = el('img', { src: imgSrc, alt: escapeHtml(p.title || ''), style: 'max-width:100%;max-height:100%;object-fit:cover;' });
      imgWrap.appendChild(img);
      link.appendChild(imgWrap);
      link.appendChild(el('h3', { style: 'margin:0 0 0.5rem 0;font-size:1.05rem;' }, escapeHtml(p.title || 'Produkt')));
      card.appendChild(link);
      if (p.description) card.appendChild(el('p', { style: 'margin:0 0 0.5rem;color:#555;font-size:0.95rem;' }, escapeHtml(p.description)));
      if (p.price) card.appendChild(el('p', { style: 'margin:0;color:#1b7a3a;font-weight:600;' }, escapeHtml(p.price)));
      grid.appendChild(card);
    });

    container.appendChild(grid);

    // Optional: populate categories if present
    const categories = Array.from(new Set((products || []).map(x => x.category).filter(Boolean)));
    const catContainer = document.getElementById(CATEGORY_FILTER_ID);
    if (catContainer && categories.length > 0) {
      catContainer.innerHTML = '';
      const allBtn = el('button', { type: 'button', class: 'cat-btn', style: 'margin-right:0.5rem;' }, 'Alle');
      allBtn.addEventListener('click', () => renderProducts(products));
      catContainer.appendChild(allBtn);
      categories.forEach(cat => {
        const btn = el('button', { type: 'button', class: 'cat-btn', style: 'margin-right:0.5rem;' }, escapeHtml(cat));
        btn.addEventListener('click', () => renderProducts(products.filter(p => p.category === cat)));
        catContainer.appendChild(btn);
      });
    }
  }

  async function fetchJson(url, opts = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    try {
      const res = await fetch(url, Object.assign({}, opts, { signal: controller.signal }));
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  // boot
  const container = document.getElementById(CONTAINER_ID);
  if (container) container.innerHTML = '<div style="text-align:center;padding:2rem;color:#666;">Produkte werden geladen…</div>';
  clearError();

  // 1) try remote API if configured
  if (API_BASE) {
    try {
      const data = await fetchJson(`${API_BASE.replace(/\/$/, '')}/products`);
      const products = Array.isArray(data) ? data : (data.products || []);
      renderProducts(products);
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
    const products = Array.isArray(local) ? local : (local.products || []);
    renderProducts(products);
    clearError();
    return;
  } catch (err) {
    console.error('Local mock fetch failed:', err && err.message);
    showError('Produkte konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
    if (container) container.innerHTML = '';
  }
})();
