// ============================================
// MarineChill — Marine Refrigeration Store
// ============================================

// --- Product Data ---
const PRODUCTS = [
  {
    id: 'mc-35',
    name: 'MarineChill 35L Compact',
    tagline: 'Perfect for day boats and small cabins',
    price: 549,
    capacity: 35,
    voltage: '12V/24V',
    powerDraw: 45,
    weight: 12.5,
    dimensions: '480 x 360 x 390mm',
    tempRange: '-18°C to 10°C',
    rating: 4.6,
    reviews: 124,
    category: 'compact',
    badge: null,
    gradient: 'linear-gradient(135deg, #1a5276, #17a2b8)',
    features: [
      'Digital thermostat with LED display',
      'Low-voltage battery protection',
      'Stainless steel latch',
      'LED interior light',
      'Reversible lid hinge'
    ]
  },
  {
    id: 'mc-50',
    name: 'MarineChill 50L Cruiser',
    tagline: 'The go-to choice for weekend cruisers',
    price: 749,
    capacity: 50,
    voltage: '12V/24V',
    powerDraw: 55,
    weight: 18,
    dimensions: '560 x 400 x 450mm',
    tempRange: '-18°C to 10°C',
    rating: 4.8,
    reviews: 312,
    category: 'mid',
    badge: 'Best Seller',
    gradient: 'linear-gradient(135deg, #0b1d3a, #1a5276)',
    features: [
      'Digital thermostat with LED display',
      'Low-voltage battery protection',
      'Interior divider basket',
      'Drain plug for easy cleaning',
      'Flush-mount capable',
      'Whisper-quiet compressor'
    ]
  },
  {
    id: 'mc-65',
    name: 'MarineChill 65L Voyager',
    tagline: 'Extended range for serious passages',
    price: 899,
    capacity: 65,
    voltage: '12V/24V',
    powerDraw: 60,
    weight: 23,
    dimensions: '650 x 450 x 500mm',
    tempRange: '-20°C to 10°C',
    rating: 4.7,
    reviews: 198,
    category: 'mid',
    badge: null,
    gradient: 'linear-gradient(135deg, #132d5e, #20c997)',
    features: [
      'Digital thermostat with LED display',
      'Low-voltage battery protection',
      'Two interior baskets',
      'Drain plug for easy cleaning',
      'Extra-thick 65mm insulation',
      'Turbo-freeze mode'
    ]
  },
  {
    id: 'mc-85',
    name: 'MarineChill 85L Offshore',
    tagline: 'Built for bluewater and long hauls',
    price: 1149,
    capacity: 85,
    voltage: '12V/24V',
    powerDraw: 75,
    weight: 29,
    dimensions: '750 x 500 x 550mm',
    tempRange: '-22°C to 10°C',
    rating: 4.7,
    reviews: 87,
    category: 'large',
    badge: null,
    gradient: 'linear-gradient(135deg, #0b1d3a, #128a9e)',
    features: [
      'Heavy-duty digital thermostat',
      'Dual low-voltage cutoff',
      'Three interior baskets',
      'Stainless steel hinges and latch',
      '80mm premium insulation',
      'Turbo-freeze mode',
      'Built-in thermometer probe'
    ]
  },
  {
    id: 'mc-110',
    name: 'MarineChill 110L Captain',
    tagline: 'Maximum capacity for liveaboards and charters',
    price: 1399,
    capacity: 110,
    voltage: '12V/24V',
    powerDraw: 90,
    weight: 38,
    dimensions: '850 x 550 x 600mm',
    tempRange: '-22°C to 10°C',
    rating: 4.9,
    reviews: 56,
    category: 'large',
    badge: 'New',
    gradient: 'linear-gradient(135deg, #132d5e, #17a2b8)',
    features: [
      'Heavy-duty digital thermostat',
      'Dual low-voltage cutoff',
      'Four interior baskets with dividers',
      'Full stainless steel hardware',
      '80mm premium insulation',
      'Turbo-freeze and eco modes',
      'Built-in thermometer probe',
      'Wi-Fi temperature monitoring'
    ]
  },
  {
    id: 'mc-50d',
    name: 'MarineChill 50L Dual Zone',
    tagline: 'Fridge and freezer in one compact unit',
    price: 949,
    capacity: 50,
    voltage: '12V/24V',
    powerDraw: 65,
    weight: 21,
    dimensions: '560 x 400 x 480mm',
    tempRange: '-22°C to 10°C',
    rating: 4.5,
    reviews: 143,
    category: 'dual',
    badge: null,
    gradient: 'linear-gradient(135deg, #1a5276, #87ceeb)',
    features: [
      'Independent dual-zone temperature control',
      'Digital display for both zones',
      'Low-voltage battery protection',
      'Removable divider wall',
      'LED interior lights in both zones',
      'Drain plugs in both compartments'
    ]
  },
  {
    id: 'mc-75d',
    name: 'MarineChill 75L Dual Zone',
    tagline: 'Spacious dual compartment for extended cruising',
    price: 1249,
    capacity: 75,
    voltage: '12V/24V',
    powerDraw: 80,
    weight: 28,
    dimensions: '700 x 480 x 530mm',
    tempRange: '-22°C to 10°C',
    rating: 4.8,
    reviews: 91,
    category: 'dual',
    badge: 'Premium',
    gradient: 'linear-gradient(135deg, #0b1d3a, #87ceeb)',
    features: [
      'Independent dual-zone temperature control',
      'Touch-screen display panel',
      'Dual low-voltage cutoff',
      'Adjustable divider wall',
      'LED interior lights in both zones',
      '70mm premium insulation',
      'Whisper-quiet compressor',
      'Wi-Fi temperature monitoring'
    ]
  },
  {
    id: 'mc-45s',
    name: 'MarineChill 45L Slide-Out',
    tagline: 'Slides right into your galley cabinetry',
    price: 829,
    capacity: 45,
    voltage: '12V/24V',
    powerDraw: 50,
    weight: 19,
    dimensions: '525 x 450 x 450mm',
    tempRange: '-18°C to 10°C',
    rating: 4.6,
    reviews: 167,
    category: 'compact',
    badge: 'Sale',
    gradient: 'linear-gradient(135deg, #128a9e, #20c997)',
    features: [
      'Full-extension slide rails included',
      'Front-breathing ventilation',
      'Digital thermostat',
      'Interior LED light',
      'Flush front panel',
      'Low-voltage battery protection',
      'Standard cabinet cutout dimensions'
    ]
  }
];

// --- State ---
let cart = [];
let activeFilter = 'all';
let modalQty = 1;

function loadCart() {
  try {
    const saved = localStorage.getItem('marinechill-cart');
    cart = saved ? JSON.parse(saved) : [];
  } catch {
    cart = [];
  }
}

function saveCart() {
  localStorage.setItem('marinechill-cart', JSON.stringify(cart));
}

// --- Utilities ---
function formatPrice(price) {
  return '$' + price.toLocaleString('en-US');
}

function getProduct(id) {
  return PRODUCTS.find(p => p.id === id);
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  return '\u2605'.repeat(full) + (half ? '\u00BD' : '');
}

function getBadgeClass(badge) {
  if (!badge) return '';
  const map = {
    'Best Seller': 'badge-best-seller',
    'New': 'badge-new',
    'Premium': 'badge-premium',
    'Sale': 'badge-sale'
  };
  return map[badge] || '';
}

// --- Render Products ---
function renderProducts(filter) {
  const grid = document.getElementById('product-grid');
  const filtered = filter === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === filter);

  grid.innerHTML = filtered.map(p => `
    <div class="product-card" data-id="${p.id}">
      ${p.badge ? `<span class="badge ${getBadgeClass(p.badge)}">${p.badge}</span>` : ''}
      <div class="product-image" style="background: ${p.gradient}">
        <span class="product-icon">${p.category === 'dual' ? '\u2744\uFE0F' : '\u2744\uFE0F'}</span>
      </div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-tagline">${p.tagline}</div>
        <div class="product-specs-brief">
          <span>${p.capacity}L</span>
          <span>${p.voltage}</span>
          <span>${p.powerDraw}W</span>
        </div>
        <div class="product-rating">
          <span class="stars">${renderStars(p.rating)}</span>
          <span>${p.rating}</span>
          <span class="count">(${p.reviews})</span>
        </div>
        <div class="product-bottom">
          <span class="product-price">${formatPrice(p.price)}</span>
          <button class="btn-add-cart" data-id="${p.id}">Add to Cart</button>
        </div>
      </div>
    </div>
  `).join('');
}

// --- Render Cart ---
function renderCart() {
  const container = document.getElementById('cart-items');
  const badge = document.getElementById('cart-badge');
  const totalEl = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('btn-checkout');

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => {
    const product = getProduct(item.id);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  badge.textContent = count > 0 ? count : '';
  badge.classList.toggle('bounce', count > 0);
  totalEl.textContent = formatPrice(total);
  checkoutBtn.disabled = cart.length === 0;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">\u{1F6D2}</div>
        <p>Your cart is empty</p>
      </div>
    `;
    return;
  }

  container.innerHTML = cart.map(item => {
    const p = getProduct(item.id);
    if (!p) return '';
    return `
      <div class="cart-item">
        <div class="cart-item-image" style="background: ${p.gradient}">
          <span>\u2744\uFE0F</span>
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-price">${formatPrice(p.price)}</div>
        </div>
        <div class="cart-item-controls">
          <button onclick="updateQuantity('${p.id}', -1)">&minus;</button>
          <span class="cart-item-qty">${item.quantity}</span>
          <button onclick="updateQuantity('${p.id}', 1)">+</button>
          <button class="cart-item-remove" onclick="removeFromCart('${p.id}')">&times;</button>
        </div>
      </div>
    `;
  }).join('');
}

// --- Cart Operations ---
function addToCart(productId, quantity) {
  if (typeof quantity === 'undefined') quantity = 1;
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ id: productId, quantity: quantity });
  }
  saveCart();
  renderCart();

  // Brief feedback on the card button
  const btn = document.querySelector(`.btn-add-cart[data-id="${productId}"]`);
  if (btn) {
    btn.textContent = '\u2713 Added!';
    btn.classList.add('added');
    setTimeout(() => {
      btn.textContent = 'Add to Cart';
      btn.classList.remove('added');
    }, 1200);
  }
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  renderCart();
}

function updateQuantity(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(productId);
    return;
  }
  saveCart();
  renderCart();
}

// --- Product Modal ---
function openModal(productId) {
  const p = getProduct(productId);
  if (!p) return;
  modalQty = 1;

  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <div class="modal-image" style="background: ${p.gradient}">
      <span class="product-icon">\u2744\uFE0F</span>
    </div>
    <div class="modal-details">
      <div class="product-name">${p.name}</div>
      <div class="product-price">${formatPrice(p.price)}</div>
      <div class="product-tagline">${p.tagline}</div>
      <div class="product-rating">
        <span class="stars">${renderStars(p.rating)}</span>
        <span>${p.rating}</span>
        <span class="count">(${p.reviews} reviews)</span>
      </div>
      <table class="modal-specs">
        <tr><td>Capacity</td><td>${p.capacity} Liters</td></tr>
        <tr><td>Voltage</td><td>${p.voltage}</td></tr>
        <tr><td>Power Draw</td><td>${p.powerDraw}W</td></tr>
        <tr><td>Weight</td><td>${p.weight} kg</td></tr>
        <tr><td>Dimensions</td><td>${p.dimensions}</td></tr>
        <tr><td>Temp Range</td><td>${p.tempRange}</td></tr>
      </table>
      <ul class="modal-features">
        ${p.features.map(f => `<li>${f}</li>`).join('')}
      </ul>
      <div class="modal-actions">
        <div class="qty-control">
          <button id="qty-minus">&minus;</button>
          <span class="qty-value" id="qty-value">1</span>
          <button id="qty-plus">+</button>
        </div>
        <button class="btn-primary" id="modal-add-cart">Add to Cart</button>
      </div>
    </div>
  `;

  document.getElementById('qty-minus').onclick = () => {
    if (modalQty > 1) {
      modalQty--;
      document.getElementById('qty-value').textContent = modalQty;
    }
  };

  document.getElementById('qty-plus').onclick = () => {
    modalQty++;
    document.getElementById('qty-value').textContent = modalQty;
  };

  document.getElementById('modal-add-cart').onclick = () => {
    addToCart(p.id, modalQty);
    closeModal();
  };

  document.getElementById('product-modal').classList.add('open');
  document.getElementById('modal-overlay').classList.add('open');
  document.body.classList.add('no-scroll');
}

function closeModal() {
  document.getElementById('product-modal').classList.remove('open');
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.classList.remove('no-scroll');
}

// --- Cart Drawer ---
function openCart() {
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('cart-overlay').classList.add('open');
  document.body.classList.add('no-scroll');
}

function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('open');
  document.body.classList.remove('no-scroll');
}

// --- Filter ---
function setFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderProducts(filter);
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  renderProducts('all');
  renderCart();

  // Cart button
  document.getElementById('cart-btn').addEventListener('click', openCart);
  document.getElementById('cart-close').addEventListener('click', closeCart);
  document.getElementById('cart-overlay').addEventListener('click', closeCart);

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', closeModal);

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeCart();
    }
  });

  // Filter bar
  document.getElementById('filter-bar').addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      setFilter(e.target.dataset.filter);
    }
  });

  // Product grid — card click and add-to-cart
  document.getElementById('product-grid').addEventListener('click', (e) => {
    const addBtn = e.target.closest('.btn-add-cart');
    if (addBtn) {
      e.stopPropagation();
      addToCart(addBtn.dataset.id);
      return;
    }
    const card = e.target.closest('.product-card');
    if (card) {
      openModal(card.dataset.id);
    }
  });

  // Checkout
  document.getElementById('btn-checkout').addEventListener('click', () => {
    if (cart.length === 0) return;
    const total = cart.reduce((sum, item) => {
      const p = getProduct(item.id);
      return sum + (p ? p.price * item.quantity : 0);
    }, 0);
    alert(`Order total: ${formatPrice(total)}\n\nThis is a demo store — no payment will be processed. Thanks for browsing MarineChill!`);
    cart = [];
    saveCart();
    renderCart();
    closeCart();
  });

  // Header scroll shadow
  window.addEventListener('scroll', () => {
    document.getElementById('header').classList.toggle('scrolled', window.scrollY > 10);
  });
});
