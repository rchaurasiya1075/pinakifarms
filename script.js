// script.js
import { 
    db, auth, storage,
    collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where,
    createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut,
    ref, uploadBytes, getDownloadURL
} from './firebase-config.js';

// ============= STATE MANAGEMENT =============
let state = {
    products: [],
    cart: [],
    currentUser: null,
    currentFilter: 'all',
    isCartOpen: false,
    isAuthOpen: false
};

// ============= DOM REFERENCES =============
const productGrid = document.getElementById('productGrid');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const cartCount = document.getElementById('cartCount');
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const authModal = document.getElementById('authModal');
const searchBar = document.getElementById('searchBar');
const searchInput = document.getElementById('searchInput');

// ============= INITIALIZATION =============
document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    loadCartFromLocal();
    updateCartUI();
    setupAuthListener();
    loadReviews();
});

// ============= PRODUCT FUNCTIONS =============
async function loadProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        state.products = [];
        querySnapshot.forEach((doc) => {
            state.products.push({ id: doc.id, ...doc.data() });
        });
        renderProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        // Load sample products if Firebase fails
        loadSampleProducts();
    }
}

function loadSampleProducts() {
    const sampleProducts = [
        { id: '1', name: 'Organic Tomatoes', category: 'vegetables', price: 60, originalPrice: 80, emoji: '🍅', purity: '100% Organic', unit: 'kg' },
        { id: '2', name: 'Fresh Spinach', category: 'vegetables', price: 40, originalPrice: 55, emoji: '🥬', purity: 'Pesticide Free', unit: 'bundle' },
        { id: '3', name: 'Organic Apples', category: 'fruits', price: 120, originalPrice: 150, emoji: '🍎', purity: 'Wax Free', unit: 'kg' },
        { id: '4', name: 'Farm Fresh Mangoes', category: 'fruits', price: 80, originalPrice: 100, emoji: '🥭', purity: 'Tree Ripened', unit: 'kg' },
        { id: '5', name: 'Brown Rice', category: 'grains', price: 90, originalPrice: 110, emoji: '🍚', purity: 'Unpolished', unit: 'kg' },
        { id: '6', name: 'Wheat Flour', category: 'grains', price: 55, originalPrice: 70, emoji: '🌾', purity: 'Stone Ground', unit: 'kg' },
        { id: '7', name: 'Farm Fresh Milk', category: 'dairy', price: 60, originalPrice: 75, emoji: '🥛', purity: 'A2 Desi', unit: 'litre' },
        { id: '8', name: 'Organic Curd', category: 'dairy', price: 50, originalPrice: 65, emoji: '🫕', purity: 'Probiotic', unit: 'kg' }
    ];
    state.products = sampleProducts;
    renderProducts();
}

function renderProducts() {
    let filtered = state.products;
    if (state.currentFilter !== 'all') {
        filtered = state.products.filter(p => p.category === state.currentFilter);
    }
    
    if (searchInput.value) {
        const query = searchInput.value.toLowerCase();
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.category.toLowerCase().includes(query)
        );
    }
    
    productGrid.innerHTML = filtered.map(product => `
        <div class="product-card">
            <div class="product-image">${product.emoji || '🌿'}</div>
            <div class="product-info">
                <span class="purity-badge">${product.purity || 'Pure'}</span>
                <h3>${product.name}</h3>
                <div class="product-price">
                    ₹${product.price}/${product.unit || 'kg'}
                    ${product.originalPrice ? `<span class="product-original">₹${product.originalPrice}</span>` : ''}
                </div>
                <button class="add-to-cart" onclick="addToCart('${product.id}')">
                    <i class="fas fa-plus"></i> Add to Cart
                </button>
            </div>
        </div>
    `).join('');
}

function filterProducts(category) {
    state.currentFilter = category;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase() === category || (category === 'all' && btn.textContent === 'All'));
    });
    renderProducts();
}

function searchProducts() {
    renderProducts();
}

function toggleSearch() {
    searchBar.classList.toggle('active');
    if (searchBar.classList.contains('active')) {
        searchInput.focus();
    }
}

function scrollToProducts() {
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

function scrollToSection(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

// ============= CART FUNCTIONS =============
function addToCart(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    const existing = state.cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        state.cart.push({ ...product, quantity: 1 });
    }
    
    saveCartToLocal();
    updateCartUI();
    showToast(`${product.name} added to cart!`);
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.id !== productId);
    saveCartToLocal();
    updateCartUI();
}

function updateQuantity(productId, change) {
    const item = state.cart.find(i => i.id === productId);
    if (!item) return;
    item.quantity += change;
    if (item.quantity <= 0) {
        removeFromCart(productId);
        return;
    }
    saveCartToLocal();
    updateCartUI();
}

function updateCartUI() {
    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    if (state.cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color
