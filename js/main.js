/* js/main.js - BeautyHub Storefront Logic (100% Static GitHub Pages) */

let productsState = [];
let filteredProducts = [];
let categoriesState = [];
let cartState = JSON.parse(localStorage.getItem('beautyhub_cart')) || [];

let currentCategory = 'all';
let currentOrigin = 'all';
let currentSearch = '';

document.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll();
  initEventListeners();
  loadData();
  
  // Initialize Three.js 3D Hero Stage
  if (typeof initThreeJS === 'function') {
    initThreeJS();
  }

  // Initialize GSAP Animations & 3D Card Tilt
  if (typeof initGSAPAnimations === 'function') {
    initGSAPAnimations();
  }
});

// Helper for image URLs
function getImageUrl(imgPath) {
  if (!imgPath) return 'images/dior.jpg';
  if (imgPath.startsWith('http') || imgPath.startsWith('data:') || imgPath.startsWith('images/')) {
    return imgPath;
  }
  return `images/${imgPath}`;
}

// 1. DATA LOADING (Static JSON + localStorage sync)
async function loadData() {
  const localProducts = localStorage.getItem('beautyhub_products');
  
  if (localProducts) {
    try {
      productsState = JSON.parse(localProducts);
      renderProducts(productsState);
      updateCartBadge();
      return;
    } catch (e) {
      console.warn('Erreur lecture localStorage, rechargement des JSON');
    }
  }

  // Load static JSON data
  try {
    const res = await fetch('data/products.json');
    if (res.ok) {
      const data = await res.json();
      productsState = data;
      localStorage.setItem('beautyhub_products', JSON.stringify(productsState));
      renderProducts(productsState);
      updateCartBadge();
      return;
    }
  } catch (err) {
    console.error('Erreur chargement data/products.json:', err);
  }
}

// 2. RENDER PRODUCTS GRID
function renderProducts(products) {
  const container = document.getElementById('productsGrid');
  if (!container) return;

  if (!products || products.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;" class="glass-panel">
        <i class="fa-solid fa-box-open" style="font-size: 3rem; color: var(--accent-rose-bright); margin-bottom: 1rem;"></i>
        <h3 class="font-display" style="font-size: 1.8rem; color: #fff;">Aucun produit trouvé</h3>
        <p style="color: var(--text-rose); margin-top: 0.5rem; opacity: 0.8;">Essayez une autre recherche ou réinitialisez les filtres.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(p => {
    const isKorea = (p.origin || '').includes('Corée');
    const flag = isKorea ? '🇰🇷' : '🇫🇷';
    const badgeClass = isKorea ? 'korea' : 'france';
    const categoryName = p.category_name || (p.categorie ? p.categorie.toUpperCase() : 'COSMÉTIQUE');
    const priceFormatted = parseFloat(p.price).toFixed(2);
    const imgSrc = getImageUrl(p.image);

    return `
      <div class="product-card" data-id="${p.id}">
        <div class="card-badge-container">
          <span class="origin-badge ${badgeClass}">${flag} ${p.origin || 'France'}</span>
          ${p.is_featured ? '<i class="fa-solid fa-star featured-star" title="Produit Vedette"></i>' : ''}
        </div>

        <div class="card-img-wrapper">
          <img src="${imgSrc}" alt="${p.title}" class="card-img" onerror="this.src='images/dior.jpg'" />
          <button class="card-quickview-btn" onclick="openQuickViewModal(${p.id})">
            <i class="fa-solid fa-eye"></i> Aperçu 3D
          </button>
        </div>

        <div class="card-category">${categoryName}</div>
        <h3 class="card-title">${p.title}</h3>
        <div class="card-brand">${p.brand_name || 'BeautyHub'}</div>

        <div class="card-footer">
          <div class="card-price">${priceFormatted} <span>DH</span></div>
          <button class="btn-add-cart" onclick="addToCart(${p.id})" title="Ajouter au panier">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Apply 3D Tilt interaction to cards
  if (typeof apply3DTiltToCards === 'function') {
    apply3DTiltToCards();
  }
}

// 3. FILTERING & SEARCH LOGIC
function filterProducts() {
  let result = [...productsState];

  // Category Filter
  if (currentCategory !== 'all') {
    result = result.filter(p => {
      const cat = (p.category_slug || p.categorie || '').toLowerCase();
      return cat === currentCategory.toLowerCase();
    });
  }

  // Country Origin Filter
  if (currentOrigin !== 'all') {
    result = result.filter(p => (p.origin || '').includes(currentOrigin));
  }

  // Text Search
  if (currentSearch.trim() !== '') {
    const q = currentSearch.trim().toLowerCase();
    result = result.filter(p => 
      (p.title || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.brand_name || '').toLowerCase().includes(q)
    );
  }

  renderProducts(result);
}

// 4. EVENT LISTENERS SETUP
function initEventListeners() {
  // Search input live filtering
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      filterProducts();
    });
  }

  // Category Pills Click
  const categoryPills = document.querySelectorAll('#categoryPillsContainer .pill-btn');
  categoryPills.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryPills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      filterProducts();
    });
  });

  // Origin Pills Click (if present)
  const originBtns = document.querySelectorAll('#originFiltersContainer .origin-btn');
  if (originBtns && originBtns.length > 0) {
    originBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        originBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentOrigin = btn.dataset.origin;
        filterProducts();
      });
    });
  }

  // Cart Drawer Toggle
  const cartToggleBtn = document.getElementById('cartToggleBtn');
  const closeCartBtn = document.getElementById('closeCartBtn');
  const cartOverlay = document.getElementById('cartDrawerOverlay');

  if (cartToggleBtn && cartOverlay) {
    cartToggleBtn.addEventListener('click', () => {
      cartOverlay.classList.add('active');
      renderCart();
    });
  }

  if (closeCartBtn && cartOverlay) {
    closeCartBtn.addEventListener('click', () => cartOverlay.classList.remove('active'));
    cartOverlay.addEventListener('click', (e) => {
      if (e.target === cartOverlay) cartOverlay.classList.remove('active');
    });
  }

  // QuickView Close
  const closeQuickviewBtn = document.getElementById('closeQuickviewBtn');
  const quickviewOverlay = document.getElementById('quickviewModalOverlay');

  if (closeQuickviewBtn && quickviewOverlay) {
    closeQuickviewBtn.addEventListener('click', () => quickviewOverlay.classList.remove('active'));
    quickviewOverlay.addEventListener('click', (e) => {
      if (e.target === quickviewOverlay) quickviewOverlay.classList.remove('active');
    });
  }

  // Checkout Button action -> Open Order Modal
  const checkoutBtn = document.getElementById('checkoutBtn');
  const orderOverlay = document.getElementById('orderModalOverlay');
  const closeOrderModalBtn = document.getElementById('closeOrderModalBtn');

  if (checkoutBtn && orderOverlay) {
    checkoutBtn.addEventListener('click', () => {
      if (cartState.length === 0) {
        if (typeof showToast === 'function') {
          showToast('Votre panier est vide !', 'rose');
        }
        return;
      }
      // Calculate order totals
      const count = cartState.reduce((sum, item) => sum + item.quantity, 0);
      const total = cartState.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const itemCountEl = document.getElementById('orderItemCount');
      const totalAmountEl = document.getElementById('orderTotalAmount');
      if (itemCountEl) itemCountEl.innerText = count;
      if (totalAmountEl) totalAmountEl.innerText = `${total.toFixed(2)} DH`;

      // Close cart drawer and open order modal
      const cartOverlay = document.getElementById('cartDrawerOverlay');
      if (cartOverlay) cartOverlay.classList.remove('active');

      orderOverlay.classList.add('active');
    });
  }

  if (closeOrderModalBtn && orderOverlay) {
    closeOrderModalBtn.addEventListener('click', () => orderOverlay.classList.remove('active'));
    orderOverlay.addEventListener('click', (e) => {
      if (e.target === orderOverlay) orderOverlay.classList.remove('active');
    });
  }

  // Order Form Validation & Submission
  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    // Clear validation error when user types/modifies inputs
    const requiredInputs = orderForm.querySelectorAll('[required]');
    requiredInputs.forEach(input => {
      input.addEventListener('input', () => {
        if (input.value.trim() !== '') {
          input.classList.remove('invalid');
        }
      });
    });

    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const fullNameInput = document.getElementById('orderFullName');
      const phoneInput = document.getElementById('orderPhone');
      const cityInput = document.getElementById('orderCity');
      const addressInput = document.getElementById('orderAddress');

      let isValid = true;

      // Validate Nom complet (REQUIRED)
      if (!fullNameInput || fullNameInput.value.trim() === '') {
        if (fullNameInput) fullNameInput.classList.add('invalid');
        isValid = false;
      } else {
        fullNameInput.classList.remove('invalid');
      }

      // Validate Numéro de téléphone (REQUIRED)
      if (!phoneInput || phoneInput.value.trim() === '') {
        if (phoneInput) phoneInput.classList.add('invalid');
        isValid = false;
      } else {
        phoneInput.classList.remove('invalid');
      }

      // Validate Ville / City (REQUIRED)
      if (!cityInput || cityInput.value.trim() === '') {
        if (cityInput) cityInput.classList.add('invalid');
        isValid = false;
      } else {
        cityInput.classList.remove('invalid');
      }

      // Validate Localisation / Adresse (REQUIRED)
      if (!addressInput || addressInput.value.trim() === '') {
        if (addressInput) addressInput.classList.add('invalid');
        isValid = false;
      } else {
        addressInput.classList.remove('invalid');
      }

      if (!isValid) {
        return;
      }

      // Successful order placement
      if (typeof showToast === 'function') {
        showToast('🎉 Commande confirmée avec succès ! Merci pour votre achat.', 'gold');
      }

      cartState = [];
      saveCart();
      renderCart();
      updateCartBadge();

      orderForm.reset();
      if (orderOverlay) orderOverlay.classList.remove('active');
    });
  }
}

// Navbar scroll glass backdrop effect
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

// 5. SHOPPING CART SYSTEM
function addToCart(productId) {
  const product = productsState.find(p => p.id === productId);
  if (!product) return;

  const existingItem = cartState.find(item => item.id === productId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cartState.push({
      id: product.id,
      title: product.title,
      price: parseFloat(product.price),
      image: product.image,
      quantity: 1
    });
  }

  saveCart();
  updateCartBadge();
  if (typeof showToast === 'function') {
    showToast(`"${product.title}" ajouté au panier !`, 'gold');
  }
}

function updateCartQty(productId, change) {
  const item = cartState.find(i => i.id === productId);
  if (!item) return;

  item.quantity += change;
  if (item.quantity <= 0) {
    cartState = cartState.filter(i => i.id !== productId);
  }

  saveCart();
  renderCart();
  updateCartBadge();
}

function saveCart() {
  localStorage.setItem('beautyhub_cart', JSON.stringify(cartState));
}

function updateCartBadge() {
  const count = cartState.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cartBadgeCount');
  if (badge) badge.innerText = count;

  const titleCount = document.getElementById('cartTitleCount');
  if (titleCount) titleCount.innerText = `(${count})`;
}

function renderCart() {
  const container = document.getElementById('cartBody');
  const subtotalEl = document.getElementById('cartSubtotalAmount');
  if (!container) return;

  if (cartState.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-rose); opacity:0.8;">
        <i class="fa-solid fa-basket-shopping" style="font-size: 2.5rem; color: var(--accent-rose-bright); margin-bottom: 1rem;"></i>
        <p>Votre panier est actuellement vide.</p>
      </div>
    `;
    if (subtotalEl) subtotalEl.innerText = '0.00 DH';
    return;
  }

  let total = 0;
  container.innerHTML = cartState.map(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;

    const imgSrc = getImageUrl(item.image);
    return `
      <div class="cart-item">
        <img src="${imgSrc}" class="cart-item-img" alt="${item.title}" onerror="this.src='images/dior.jpg'" />
        <div class="cart-item-info">
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-price">${item.price.toFixed(2)} DH</div>
          <div class="cart-qty-controls">
            <button class="qty-btn" onclick="updateCartQty(${item.id}, -1)">-</button>
            <span style="color:#fff; font-size: 0.9rem; font-weight:700;">${item.quantity}</span>
            <button class="qty-btn" onclick="updateCartQty(${item.id}, 1)">+</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (subtotalEl) subtotalEl.innerText = `${total.toFixed(2)} DH`;
}

// 6. QUICK VIEW MODAL & 3D STAGE TRIGGER
function openQuickViewModal(productId) {
  const product = productsState.find(p => p.id === productId);
  if (!product) return;

  const overlay = document.getElementById('quickviewModalOverlay');
  if (!overlay) return;

  document.getElementById('modalTitle').innerText = product.title;
  document.getElementById('modalCategory').innerText = product.category_name || (product.categorie || '').toUpperCase();
  document.getElementById('modalPrice').innerText = `${parseFloat(product.price).toFixed(2)} DH`;
  document.getElementById('modalDesc').innerText = product.description || 'Produit cosmétique d\'exception.';
  
  const originBadge = document.getElementById('modalOriginBadge');
  const isKorea = (product.origin || '').includes('Corée');
  originBadge.innerText = `${isKorea ? '🇰🇷' : '🇫🇷'} Origine ${product.origin || 'France'}`;
  originBadge.className = `origin-badge ${isKorea ? 'korea' : 'france'}`;

  const stockEl = document.getElementById('modalStock');
  stockEl.innerText = product.stock ? `En Stock (${product.stock} disponibles)` : 'En Stock';

  const addBtn = document.getElementById('modalAddToCartBtn');
  addBtn.onclick = () => {
    addToCart(product.id);
    overlay.classList.remove('active');
  };

  overlay.classList.add('active');

  // Trigger 3D Bottle canvas in quickview modal
  if (typeof initQuickView3D === 'function') {
    initQuickView3D('modal3dStage', product.category_slug || 'skincare');
  }
}
