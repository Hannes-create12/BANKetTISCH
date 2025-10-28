/**
 * products.js - Dynamic product renderer for BANKetTISCH
 * Loads products.json, groups by category, and renders interactive product cards
 */

(function() {
  'use strict';

  // Category order as specified
  const CATEGORY_ORDER = [
    'Mietmöbel',
    'Dekoration und Verkleidung',
    'Zubehör',
    'Zelte und Pavillions',
    'Personal',
    'Gastrozubehör'
  ];

  let currentFilter = 'all';
  let productsData = [];

  /**
   * Load products from JSON with no-cache
   */
  async function loadProducts() {
    try {
      const response = await fetch('products.json?_=' + Date.now(), {
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load products.json');
      }
      
      productsData = await response.json();
      renderCategoryFilter();
      renderProducts();
    } catch (error) {
      console.error('Error loading products:', error);
      showErrorMessage('Produkte konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
    }
  }

  /**
   * Show error message if products.json cannot be loaded
   */
  function showErrorMessage(message) {
    const container = document.getElementById('products-container');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2em; color: #d32f2f; background: #ffebee; border-radius: 8px; margin: 2em 0;">
          <strong>⚠️ ${message}</strong>
        </div>
      `;
    }
  }

  /**
   * Group products by category
   */
  function groupByCategory(products) {
    const grouped = {};
    
    products.forEach(product => {
      const category = product.category || 'Sonstige';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(product);
    });
    
    return grouped;
  }

  /**
   * Render category filter buttons
   */
  function renderCategoryFilter() {
    const filterContainer = document.getElementById('category-filter');
    if (!filterContainer) return;

    const grouped = groupByCategory(productsData);
    const availableCategories = CATEGORY_ORDER.filter(cat => grouped[cat] && grouped[cat].length > 0);

    let html = '<button class="filter-btn active" data-category="all">Alle Produkte</button>';
    
    availableCategories.forEach(category => {
      const count = grouped[category].length;
      html += `<button class="filter-btn" data-category="${escapeHtml(category)}">${escapeHtml(category)} (${count})</button>`;
    });

    filterContainer.innerHTML = html;

    // Add click event listeners
    filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        // Update active state
        filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // Update filter and re-render
        currentFilter = this.getAttribute('data-category');
        renderProducts();
      });
    });
  }

  /**
   * Render products based on current filter
   */
  function renderProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    const filtered = currentFilter === 'all' 
      ? productsData 
      : productsData.filter(p => p.category === currentFilter);

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2em; color: #666; background: #f5f5f5; border-radius: 8px; margin: 2em 0;">
          <p>Keine Produkte in dieser Kategorie verfügbar.</p>
        </div>
      `;
      return;
    }

    const grouped = groupByCategory(filtered);
    let html = '';

    // Render categories in specified order
    CATEGORY_ORDER.forEach(category => {
      if (grouped[category] && grouped[category].length > 0) {
        html += `<section class="category-section" aria-labelledby="cat-${slugify(category)}">`;
        html += `<h2 id="cat-${slugify(category)}" class="category-title">${escapeHtml(category)}</h2>`;
        html += '<div class="product-grid">';
        
        grouped[category].forEach(product => {
          html += renderProductCard(product);
        });
        
        html += '</div></section>';
      }
    });

    container.innerHTML = html;
  }

  /**
   * Render a single product card
   */
  function renderProductCard(product) {
    const topseller = product.topseller ? '<div class="topseller-label">Topseller</div>' : '';
    const topsellerClass = product.topseller ? ' topseller' : '';
    const note = product.note ? `<p class="product-note">${escapeHtml(product.note)}</p>` : '';
    const meta = product.meta ? `<p class="product-meta">${escapeHtml(product.meta)}</p>` : '';
    
    // WhatsApp message
    const whatsappText = encodeURIComponent(`Hallo! Ich interessiere mich für: ${product.title}`);
    const whatsappLink = `https://wa.me/491727323405?text=${whatsappText}`;

    return `
      <article class="produkt product-card${topsellerClass}">
        ${topseller}
        <img 
          src="${escapeHtml(product.image)}" 
          alt="${escapeHtml(product.title)}"
          loading="lazy"
          onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22300%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-family=%22Arial%22 font-size=%2214%22%3EBild nicht verfügbar%3C/text%3E%3C/svg%3E'; this.alt='Bild nicht verfügbar';"
        >
        <h3 class="product-title">${escapeHtml(product.title)}</h3>
        ${meta}
        ${note}
        <p class="product-price"><strong>${escapeHtml(product.price)}</strong></p>
        <a 
          href="${whatsappLink}" 
          class="button whatsapp-btn product-whatsapp-btn" 
          target="_blank" 
          rel="noopener noreferrer"
          aria-label="Per WhatsApp anfragen: ${escapeHtml(product.title)}"
        >
          📱 Jetzt anfragen
        </a>
      </article>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Create URL-safe slug from text
   */
  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/[äÄ]/g, 'ae')
      .replace(/[öÖ]/g, 'oe')
      .replace(/[üÜ]/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadProducts);
  } else {
    loadProducts();
  }
})();
