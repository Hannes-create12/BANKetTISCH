(function () {
  'use strict';

  const PIXELS_PER_METER = 60;
  const DUPLICATE_OFFSET = 24;
  const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
  const PRODUCT_IDS = {
    tent3x6: 'zelt-3x6',
    tent4x8: 'zelt-4x8',
    pavilion3x3: 'pavillon-3x3',
    heater: 'heizstrahler',
    beerTap: 'bierzapfanlage',
    beerGlasses: 'bierglaeser',
    literGlasses: 'massglaeser',
    covers: 'hussen',
    service: 'servicekraefte'
  };

  let idCounter = 0;
  const ROOM_SIZES = {
    s: { label: 'S', width: 6, height: 4 },
    m: { label: 'M', width: 10, height: 6 },
    l: { label: 'L', width: 14, height: 8 }
  };

  const DELIVERY_COSTS = {
    innenstadt: 25,
    umland: 35,
    weit: 50
  };

  const THEME_STYLES = {
    geburtstag: ['#fff7f2', '#ffe0ca'],
    hochzeit: ['#f7f3ff', '#e9ddff'],
    firmenfeier: ['#f1f6ff', '#d7e6ff'],
    gartenparty: ['#f3fff2', '#d9f8d2'],
    kindergeburtstag: ['#fff9ec', '#ffe8b6'],
    vereinsfest: ['#f3f4f8', '#dce0ec'],
    schulveranstaltung: ['#f2fcff', '#d5f1ff']
  };

  const state = {
    products: [],
    eventType: '',
    venueType: 'garten',
    roomSize: 'm',
    guests: 0,
    deliveryZone: 'umland',
    includeSetup: false,
    zoom: 1,
    gridOn: true,
    panMode: false,
    categoryFilter: 'alle',
    searchTerm: '',
    placedItems: [],
    selectedItemId: null,
    dragItemId: null,
    dragOffset: { x: 0, y: 0 },
    panDrag: null
  };

  const elements = {
    eventType: document.getElementById('event-type'),
    venueType: document.getElementById('venue-type'),
    roomSize: document.getElementById('room-size'),
    guestCount: document.getElementById('guest-count'),
    deliveryZone: document.getElementById('delivery-zone'),
    includeSetup: document.getElementById('include-setup'),
    librarySearch: document.getElementById('library-search'),
    libraryCategory: document.getElementById('library-category'),
    libraryList: document.getElementById('library-list'),
    plannerViewport: document.getElementById('planner-viewport'),
    plannerZoomLayer: document.getElementById('planner-zoom-layer'),
    plannerStage: document.getElementById('planner-stage'),
    stepper: document.getElementById('builder-stepper'),
    priceBreakdown: document.getElementById('price-breakdown'),
    recommendations: document.getElementById('recommendations'),
    planSummary: document.getElementById('plan-summary'),
    inquiryLink: document.getElementById('inquiry-link'),
    mobileInquiryLink: document.getElementById('mobile-inquiry-link'),
    whatsappInquiry: document.getElementById('whatsapp-inquiry'),
    selectedItemCard: document.getElementById('selected-item-card'),
    selectedItemName: document.getElementById('selected-item-name'),
    selectedActions: document.getElementById('selected-actions'),
    selectedQuantity: document.getElementById('selected-quantity'),
    selectedScale: document.getElementById('selected-scale'),
    zoomRange: document.getElementById('zoom-range'),
    toggleGrid: document.getElementById('toggle-grid'),
    panMode: document.getElementById('pan-mode'),
    resetView: document.getElementById('reset-view'),
    clearPlan: document.getElementById('clear-plan'),
    rotateLeft: document.getElementById('rotate-left'),
    rotateRight: document.getElementById('rotate-right'),
    duplicateItem: document.getElementById('duplicate-item'),
    removeItem: document.getElementById('remove-item')
  };

  function safeText(value) {
    return String(value || '').replace(/[&<>'"]/g, function (char) {
      return ESCAPE_MAP[char];
    });
  }

  function generateItemId() {
    idCounter += 1;
    return crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function parsePrice(raw) {
    if (!raw) return 0;
    const match = String(raw).replace(',', '.').match(/\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  function normalizedProduct(raw) {
    const defaults = {
      priceType: 'day',
      basePrice: parsePrice(raw.price),
      dimensions: { width: 1.2, depth: 0.8, unit: 'm' },
      footprint: { width: 1.2, depth: 0.8 },
      seatsCapacity: 0,
      tags: [],
      upsellRelations: [],
      themeFit: ['geburtstag', 'gartenparty', 'vereinsfest'],
      scalable: true,
      rotatable: true,
      shortDescription: raw.meta || raw.description || ''
    };

    return {
      id: raw.id,
      name: raw.title || raw.name || 'Produkt',
      slug: raw.slug || raw.id,
      category: raw.category || 'Sonstiges',
      image: raw.image || 'ai/placeholder.svg',
      ...defaults,
      ...raw,
      basePrice: Number(raw.basePrice || defaults.basePrice) || 0,
      seatsCapacity: Number(raw.seatsCapacity || defaults.seatsCapacity) || 0,
      footprint: raw.footprint || defaults.footprint,
      dimensions: raw.dimensions || defaults.dimensions,
      tags: Array.isArray(raw.tags) ? raw.tags : defaults.tags,
      upsellRelations: Array.isArray(raw.upsellRelations) ? raw.upsellRelations : defaults.upsellRelations,
      themeFit: Array.isArray(raw.themeFit) ? raw.themeFit : defaults.themeFit
    };
  }

  function builderProduct(product) {
    const allowed = ['Mietmöbel', 'Zelte und Pavillons', 'Zubehör', 'Gastrozubehör', 'Dekoration', 'Verkleidung'];
    return allowed.includes(product.category) && product.basePrice > 0;
  }

  function activeRoom() {
    return ROOM_SIZES[state.roomSize] || ROOM_SIZES.m;
  }

  function stageSizePx() {
    const room = activeRoom();
    return {
      width: room.width * PIXELS_PER_METER,
      height: room.height * PIXELS_PER_METER
    };
  }

  function setThemeVisual() {
    const colors = THEME_STYLES[state.eventType] || ['#ffffff', '#f4f4f4'];
    elements.plannerStage.style.background = `linear-gradient(140deg, ${colors[0]}, ${colors[1]})`;
  }

  function renderStage() {
    const size = stageSizePx();
    const scaledWidth = Math.round(size.width * state.zoom);
    const scaledHeight = Math.round(size.height * state.zoom);

    elements.plannerZoomLayer.style.width = scaledWidth + 'px';
    elements.plannerZoomLayer.style.height = scaledHeight + 'px';
    elements.plannerStage.style.width = size.width + 'px';
    elements.plannerStage.style.height = size.height + 'px';
    elements.plannerStage.style.transform = `scale(${state.zoom})`;
    elements.plannerStage.style.transformOrigin = 'top left';
    elements.plannerStage.classList.toggle('grid-on', state.gridOn);

    setThemeVisual();
    renderPlacedItems();
  }

  function addItem(product) {
    const size = stageSizePx();
    const item = {
      id: generateItemId(),
      productId: product.id,
      x: size.width / 2,
      y: size.height / 2,
      rotation: 0,
      scale: 1,
      quantity: 1
    };
    state.placedItems.push(item);
    state.selectedItemId = item.id;
    syncAll();
  }

  function productById(id) {
    return state.products.find(function (product) { return product.id === id; }) || null;
  }

  function placedById(id) {
    return state.placedItems.find(function (item) { return item.id === id; }) || null;
  }

  function itemFootprint(item, product) {
    const width = (product.footprint && Number(product.footprint.width)) || 1;
    const depth = (product.footprint && Number(product.footprint.depth || product.footprint.height)) || 1;
    return {
      widthPx: Math.max(36, width * PIXELS_PER_METER * item.scale),
      heightPx: Math.max(36, depth * PIXELS_PER_METER * item.scale)
    };
  }

  function clampItemPosition(item, product) {
    const stage = stageSizePx();
    const footprint = itemFootprint(item, product);
    const halfW = footprint.widthPx / 2;
    const halfH = footprint.heightPx / 2;
    item.x = Math.min(stage.width - halfW, Math.max(halfW, item.x));
    item.y = Math.min(stage.height - halfH, Math.max(halfH, item.y));
  }

  function renderPlacedItems() {
    elements.plannerStage.innerHTML = '';

    state.placedItems.forEach(function (item) {
      const product = productById(item.productId);
      if (!product) return;

      clampItemPosition(item, product);
      const footprint = itemFootprint(item, product);

      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'placed-item' + (item.id === state.selectedItemId ? ' selected' : '');
      node.dataset.itemId = item.id;
      node.style.left = item.x + 'px';
      node.style.top = item.y + 'px';
      node.style.width = footprint.widthPx + 'px';
      node.style.height = footprint.heightPx + 'px';
      node.style.transform = `translate(-50%, -50%) rotate(${item.rotation}deg)`;
      node.innerHTML = `
        <span class="placed-item-name">${safeText(product.name)}</span>
        <span class="placed-item-qty">×${item.quantity}</span>
      `;

      node.addEventListener('click', function (event) {
        event.stopPropagation();
        state.selectedItemId = item.id;
        syncAll();
      });

      node.addEventListener('pointerdown', function (event) {
        if (state.panMode) return;
        event.preventDefault();
        state.selectedItemId = item.id;
        state.dragItemId = item.id;
        const point = stagePointer(event);
        state.dragOffset = { x: item.x - point.x, y: item.y - point.y };
      });

      elements.plannerStage.appendChild(node);
    });
  }

  function stagePointer(event) {
    const rect = elements.plannerStage.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / state.zoom,
      y: (event.clientY - rect.top) / state.zoom
    };
  }

  function onPointerMove(event) {
    if (state.dragItemId) {
      const item = placedById(state.dragItemId);
      if (!item) return;
      const point = stagePointer(event);
      item.x = point.x + state.dragOffset.x;
      item.y = point.y + state.dragOffset.y;
      const product = productById(item.productId);
      if (product) {
        clampItemPosition(item, product);
      }
      renderPlacedItems();
      renderSummaryAndPricing();
      renderRecommendations();
      return;
    }

    if (state.panDrag) {
      const dx = event.clientX - state.panDrag.startX;
      const dy = event.clientY - state.panDrag.startY;
      elements.plannerViewport.scrollLeft = state.panDrag.scrollLeft - dx;
      elements.plannerViewport.scrollTop = state.panDrag.scrollTop - dy;
    }
  }

  function onPointerUp() {
    state.dragItemId = null;
    state.panDrag = null;
  }

  function calculatePricing() {
    const subtotal = state.placedItems.reduce(function (sum, item) {
      const product = productById(item.productId);
      if (!product) return sum;
      return sum + product.basePrice * item.quantity;
    }, 0);

    const delivery = DELIVERY_COSTS[state.deliveryZone] || 0;
    const setup = state.includeSetup ? 45 : 0;

    const categories = new Set(state.placedItems
      .map(function (item) {
        const product = productById(item.productId);
        return product ? product.category : null;
      })
      .filter(Boolean));

    const hasCoreBundle = state.placedItems.some(function (item) {
      return item.productId === PRODUCT_IDS.tent3x6 || item.productId === PRODUCT_IDS.tent4x8 || item.productId === PRODUCT_IDS.pavilion3x3;
    }) && state.placedItems.some(function (item) { return item.productId === 'biertischgarnitur'; });

    let discount = 0;
    if (subtotal >= 120 && categories.size >= 3) {
      discount += subtotal * 0.1;
    }
    if (hasCoreBundle) {
      discount += 15;
    }

    const total = Math.max(0, subtotal + delivery + setup - discount);

    return {
      subtotal,
      delivery,
      setup,
      discount,
      total
    };
  }

  function fmt(value) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  }

  function usedAreaPercent() {
    const room = activeRoom();
    const roomArea = room.width * room.height;
    if (!roomArea) return 0;

    const used = state.placedItems.reduce(function (sum, item) {
      const product = productById(item.productId);
      if (!product || !product.footprint) return sum;
      const width = Number(product.footprint.width) || 0;
      const depth = Number(product.footprint.depth || product.footprint.height) || 0;
      return sum + width * depth * item.quantity * item.scale * item.scale;
    }, 0);

    return Math.min(100, (used / roomArea) * 100);
  }

  function seatCapacity() {
    return state.placedItems.reduce(function (sum, item) {
      const product = productById(item.productId);
      if (!product) return sum;
      return sum + (Number(product.seatsCapacity) || 0) * item.quantity;
    }, 0);
  }

  function renderRecommendations() {
    const list = [];
    const seats = seatCapacity();
    const usage = usedAreaPercent();

    if (state.guests >= 10 && seats > 0 && seats < state.guests) {
      list.push(`Sie haben aktuell nur ${seats} Sitzplätze für ${state.guests} Gäste.`);
    }

    if (state.guests >= 20 && seats === 0) {
      list.push('Für diese Gästezahl empfehlen wir Biertischgarnituren oder zusätzliche Sitzplätze.');
    }

    if (usage >= 85) {
      list.push('Ihre Fläche ist fast voll – prüfen Sie größere Raumgröße oder weniger Elemente.');
    }

    const has = function (id) {
      return state.placedItems.some(function (item) { return item.productId === id; });
    };

    if ((has(PRODUCT_IDS.tent3x6) || has(PRODUCT_IDS.tent4x8) || has(PRODUCT_IDS.pavilion3x3)) && !has(PRODUCT_IDS.heater)) {
      list.push('Zu Ihrem Zelt passt ein Heizstrahler für kühlere Abendstunden.');
    }

    if (has(PRODUCT_IDS.beerTap) && !has(PRODUCT_IDS.beerGlasses) && !has(PRODUCT_IDS.literGlasses)) {
      list.push('Zu Ihrer Bierzapfanlage empfehlen wir Biergläser oder Maßgläser.');
    }

    if (state.eventType === 'hochzeit' && !has(PRODUCT_IDS.covers)) {
      list.push('Für Hochzeiten werden Hussen und Chevys besonders häufig gebucht.');
    }

    if (state.guests >= 35 && !has(PRODUCT_IDS.service)) {
      list.push('Für 35+ Gäste empfehlen wir zusätzliche Servicekräfte für einen reibungslosen Ablauf.');
    }

    if (!list.length) {
      list.push('Beliebte Kombination: Biertischgarnitur + Pavillon + Heizstrahler + Getränkekühler.');
    }

    elements.recommendations.innerHTML = list.map(function (entry) {
      return `<li>${safeText(entry)}</li>`;
    }).join('');
  }

  function renderSummaryAndPricing() {
    const pricing = calculatePricing();
    const used = usedAreaPercent();
    const seats = seatCapacity();
    const room = activeRoom();

    elements.priceBreakdown.innerHTML = `
      <div><span>Zwischensumme</span><strong>${fmt(pricing.subtotal)}</strong></div>
      <div><span>Lieferkosten</span><strong>${fmt(pricing.delivery)}</strong></div>
      <div><span>Aufbauhilfe</span><strong>${fmt(pricing.setup)}</strong></div>
      <div><span>Rabatt</span><strong>-${fmt(pricing.discount)}</strong></div>
      <div class="price-total"><span>Gesamt pro Tag</span><strong>${fmt(pricing.total)}</strong></div>
      <p class="price-note">Hinweis: Endpreis nach finaler Prüfung.</p>
    `;

    const roomLabel = `${room.width} × ${room.height} m (${room.label})`;
    const summaryText = [
      `Eventart: ${state.eventType || 'nicht gewählt'}`,
      `Fläche: ${state.venueType} ${roomLabel}`,
      `Gäste: ${state.guests || 'nicht angegeben'}`,
      `Elemente: ${state.placedItems.length}`,
      `Nutzfläche: ${Math.round(used)}%`,
      `Sitzplätze: ${seats}`,
      `Gesamt: ${fmt(pricing.total)}`
    ].join(' | ');

    elements.planSummary.textContent = summaryText;

    const message = encodeURIComponent(`Hallo BANKetTISCH, ich möchte ein unverbindliches Angebot. ${summaryText}`);
    const contactUrl = `kontakt.html?planung=${message}`;
    elements.inquiryLink.href = contactUrl;
    elements.mobileInquiryLink.href = contactUrl;
    elements.whatsappInquiry.href = `https://wa.me/4915155539947?text=${message}`;
  }

  function renderStepper() {
    const steps = [
      Boolean(state.eventType),
      Boolean(state.venueType && state.roomSize),
      state.guests > 0,
      state.placedItems.length > 0,
      state.placedItems.length > 0 && state.guests > 0
    ];

    const active = Math.max(1, steps.findIndex(function (done) { return !done; }) + 1 || 5);

    Array.from(elements.stepper.querySelectorAll('li')).forEach(function (node, index) {
      const step = index + 1;
      node.classList.toggle('done', steps[index]);
      node.classList.toggle('active', step === active);
    });
  }

  function renderSelectedInspector() {
    const selected = placedById(state.selectedItemId);
    if (!selected) {
      elements.selectedItemName.textContent = 'Kein Element ausgewählt.';
      elements.selectedActions.hidden = true;
      return;
    }

    const product = productById(selected.productId);
    elements.selectedItemName.textContent = product ? product.name : 'Element';
    elements.selectedActions.hidden = false;
    elements.selectedQuantity.value = String(selected.quantity);
    elements.selectedScale.value = String(Math.round(selected.scale * 100));
  }

  function renderLibrary() {
    const categories = Array.from(new Set(state.products.map(function (p) { return p.category; }))).sort();
    elements.libraryCategory.innerHTML = '<option value="alle">Alle Kategorien</option>' + categories.map(function (category) {
      return `<option value="${safeText(category)}">${safeText(category)}</option>`;
    }).join('');
    elements.libraryCategory.value = state.categoryFilter;

    const products = state.products.filter(function (product) {
      const categoryMatch = state.categoryFilter === 'alle' || product.category === state.categoryFilter;
      const term = state.searchTerm.trim().toLowerCase();
      const searchMatch = !term ||
        product.name.toLowerCase().includes(term) ||
        (product.shortDescription || '').toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term);
      return categoryMatch && searchMatch;
    });

    if (!products.length) {
      elements.libraryList.innerHTML = '<p class="empty-library">Keine passenden Produkte gefunden.</p>';
      return;
    }

    elements.libraryList.innerHTML = products.map(function (product) {
      const themeBadge = product.themeFit.includes(state.eventType) ? '<span class="library-badge">Passend</span>' : '';
      return `
        <article class="library-item">
          <img src="${safeText(product.image)}" alt="${safeText(product.name)}" loading="lazy">
          <div>
            <h3>${safeText(product.name)} ${themeBadge}</h3>
            <p>${safeText(product.shortDescription || '')}</p>
            <div class="library-item-meta">
              <strong>${fmt(product.basePrice)} / ${product.priceType === 'hour' ? 'Stunde' : 'Tag'}</strong>
              <button type="button" class="btn-dark add-to-plan" data-product-id="${safeText(product.id)}">Hinzufügen</button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    Array.from(elements.libraryList.querySelectorAll('.add-to-plan')).forEach(function (button) {
      button.addEventListener('click', function () {
        const product = productById(button.dataset.productId);
        if (product) addItem(product);
      });
    });
  }

  function syncAll() {
    renderStage();
    renderLibrary();
    renderStepper();
    renderSelectedInspector();
    renderSummaryAndPricing();
    renderRecommendations();
  }

  function bindTabBar() {
    var tabBar = document.getElementById('builder-tab-bar');
    if (!tabBar) return;

    var panels = {
      left: document.getElementById('builder-panel-left'),
      canvas: document.getElementById('builder-panel-canvas'),
      right: document.getElementById('builder-panel-right')
    };

    function activateTab(name) {
      Array.from(tabBar.querySelectorAll('.builder-tab')).forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.panel === name);
      });
      Object.keys(panels).forEach(function (key) {
        if (panels[key]) panels[key].classList.toggle('tab-visible', key === name);
      });
    }

    // Default: show canvas panel first on mobile
    activateTab('canvas');

    Array.from(tabBar.querySelectorAll('.builder-tab')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        activateTab(btn.dataset.panel);
      });
    });

    // Auto-switch to pricing panel when an item is added
  }

  function bindEvents() {
    elements.eventType.addEventListener('change', function () {
      state.eventType = this.value;
      syncAll();
    });

    elements.venueType.addEventListener('change', function () {
      state.venueType = this.value;
      syncAll();
    });

    elements.roomSize.addEventListener('change', function () {
      state.roomSize = this.value;
      syncAll();
    });

    elements.guestCount.addEventListener('input', function () {
      state.guests = Math.max(0, Number(this.value) || 0);
      syncAll();
    });

    elements.deliveryZone.addEventListener('change', function () {
      state.deliveryZone = this.value;
      syncAll();
    });

    elements.includeSetup.addEventListener('change', function () {
      state.includeSetup = this.checked;
      syncAll();
    });

    elements.librarySearch.addEventListener('input', function () {
      state.searchTerm = this.value;
      renderLibrary();
    });

    elements.libraryCategory.addEventListener('change', function () {
      state.categoryFilter = this.value;
      renderLibrary();
    });

    elements.zoomRange.addEventListener('input', function () {
      state.zoom = Number(this.value) / 100;
      renderStage();
    });

    elements.toggleGrid.addEventListener('click', function () {
      state.gridOn = !state.gridOn;
      elements.toggleGrid.textContent = 'Raster: ' + (state.gridOn ? 'Ein' : 'Aus');
      renderStage();
    });

    elements.panMode.addEventListener('click', function () {
      state.panMode = !state.panMode;
      elements.panMode.textContent = 'Pan-Modus: ' + (state.panMode ? 'Ein' : 'Aus');
      elements.plannerViewport.classList.toggle('pan-mode', state.panMode);
    });

    elements.resetView.addEventListener('click', function () {
      state.zoom = 1;
      elements.zoomRange.value = '100';
      elements.plannerViewport.scrollLeft = 0;
      elements.plannerViewport.scrollTop = 0;
      renderStage();
    });

    elements.clearPlan.addEventListener('click', function () {
      state.placedItems = [];
      state.selectedItemId = null;
      syncAll();
    });

    elements.selectedQuantity.addEventListener('input', function () {
      const item = placedById(state.selectedItemId);
      if (!item) return;
      item.quantity = Math.max(1, Number(this.value) || 1);
      syncAll();
    });

    elements.selectedScale.addEventListener('input', function () {
      const item = placedById(state.selectedItemId);
      if (!item) return;
      const product = productById(item.productId);
      if (!product || product.scalable === false) return;
      item.scale = Math.max(0.6, Math.min(1.6, (Number(this.value) || 100) / 100));
      syncAll();
    });

    elements.rotateLeft.addEventListener('click', function () {
      const item = placedById(state.selectedItemId);
      if (!item) return;
      item.rotation = (item.rotation - 15 + 360) % 360;
      syncAll();
    });

    elements.rotateRight.addEventListener('click', function () {
      const item = placedById(state.selectedItemId);
      if (!item) return;
      item.rotation = (item.rotation + 15) % 360;
      syncAll();
    });

    elements.duplicateItem.addEventListener('click', function () {
      const item = placedById(state.selectedItemId);
      if (!item) return;
      const duplicate = { ...item, id: generateItemId(), x: item.x + DUPLICATE_OFFSET, y: item.y + DUPLICATE_OFFSET };
      state.placedItems.push(duplicate);
      state.selectedItemId = duplicate.id;
      syncAll();
    });

    elements.removeItem.addEventListener('click', function () {
      state.placedItems = state.placedItems.filter(function (item) { return item.id !== state.selectedItemId; });
      state.selectedItemId = null;
      syncAll();
    });

    elements.plannerStage.addEventListener('click', function () {
      state.selectedItemId = null;
      renderSelectedInspector();
      renderPlacedItems();
    });

    elements.plannerViewport.addEventListener('pointerdown', function (event) {
      if (!state.panMode || event.target.closest('.placed-item')) return;
      state.panDrag = {
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: elements.plannerViewport.scrollLeft,
        scrollTop: elements.plannerViewport.scrollTop
      };
    });

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }

  async function loadProducts() {
    const response = await fetch('products.json');
    if (!response.ok) {
      throw new Error('Produkte konnten nicht geladen werden.');
    }
    const json = await response.json();
    return (Array.isArray(json) ? json : []).map(normalizedProduct).filter(builderProduct);
  }

  function getQueryAdd() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('add');
    } catch (error) {
      console.warn('URL-Parameter konnten nicht gelesen werden:', error);
      return null;
    }
  }

  async function init() {
    try {
      state.products = await loadProducts();
      bindEvents();
      bindTabBar();
      renderStage();

      const preselectedSlug = getQueryAdd();
      if (preselectedSlug) {
        const found = state.products.find(function (product) { return product.slug === preselectedSlug || String(product.id) === preselectedSlug; });
        if (found) addItem(found);
      }

      syncAll();
    } catch (error) {
      elements.libraryList.innerHTML = '<p class="empty-library">Produkte konnten nicht geladen werden. Bitte später erneut versuchen.</p>';
      console.error(error);
    }
  }

  init();
})();
