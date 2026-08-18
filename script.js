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
        cartItems.innerHTML = '<p style="text-align: center; color: #999; padding: 40px 0;">Your cart is empty</p>';
        cartTotal.textContent = '₹0';
        return;
    }
    
    cartItems.innerHTML = state.cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-image">${item.emoji || '🌿'}</div>
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>₹${item.price} × ${item.quantity} = ₹${item.price * item.quantity}</p>
                <div style="display: flex; gap: 10px; margin-top: 5px;">
                    <button onclick="updateQuantity('${item.id}', -1)" style="background: #eee; border: none; padding: 2px 10px; border-radius: 3px; cursor: pointer;">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity('${item.id}', 1)" style="background: #eee; border: none; padding: 2px 10px; border-radius: 3px; cursor: pointer;">+</button>
                </div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartTotal.textContent = `₹${total}`;
}

function toggleCart() {
    state.isCartOpen = !state.isCartOpen;
    cartDrawer.classList.toggle('active');
    cartOverlay.classList.toggle('active');
}

function checkout() {
    if (state.cart.length === 0) {
        showToast('Your cart is empty!');
        return;
    }
    if (!state.currentUser) {
        toggleAuth();
        showToast('Please login to checkout');
        return;
    }
    // Redirect to WhatsApp order
    const message = state.cart.map(item => 
        `${item.name} × ${item.quantity} = ₹${item.price * item.quantity}`
    ).join('\n');
    const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const whatsappUrl = `https://wa.me/919876543210?text=Order:%0A${encodeURIComponent(message)}%0ATotal: ₹${total}`;
    window.open(whatsappUrl, '_blank');
    state.cart = [];
    saveCartToLocal();
    updateCartUI();
    toggleCart();
}

function saveCartToLocal() {
    localStorage.setItem('pinaki_cart', JSON.stringify(state.cart));
}

function loadCartFromLocal() {
    const saved = localStorage.getItem('pinaki_cart');
    if (saved) {
        state.cart = JSON.parse(saved);
    }
}

// ============= AUTH FUNCTIONS =============
function toggleAuth() {
    state.isAuthOpen = !state.isAuthOpen;
    authModal.classList.toggle('active');
}

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.auth-tab[onclick="switchAuthTab('${tab}')"]`).classList.add('active');
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('signupForm').style.display = tab === 'signup' ? 'block' : 'none';
}

async function login(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        toggleAuth();
        showToast('Login successful!');
        document.getElementById('loginForm').reset();
    } catch (error) {
        showToast('Login failed: ' + error.message);
    }
}

async function signup(event) {
    event.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Save user name to Firestore
        await addDoc(collection(db, 'users'), {
            uid: userCredential.user.uid,
            name: name,
            email: email,
            createdAt: new Date().toISOString()
        });
        toggleAuth();
        showToast('Account created successfully!');
        document.getElementById('signupForm').reset();
    } catch (error) {
        showToast('Signup failed: ' + error.message);
    }
}

async function logout() {
    try {
        await signOut(auth);
        showToast('Logged out successfully');
    } catch (error) {
        showToast('Logout failed: ' + error.message);
    }
}

function setupAuthListener() {
    onAuthStateChanged(auth, (user) => {
        state.currentUser = user;
        // Update UI based on auth state
        const authBtn = document.querySelector('.auth-toggle');
        if (user) {
            authBtn.innerHTML = `<i class="fas fa-user-check"></i>`;
            authBtn.title = 'Logout';
            authBtn.onclick = logout;
        } else {
            authBtn.innerHTML = `<i class="fas fa-user"></i>`;
            authBtn.title = 'Login';
            authBtn.onclick = toggleAuth;
        }
    });
}

// ============= REVIEWS =============
async function loadReviews() {
    try {
        const querySnapshot = await getDocs(collection(db, 'reviews'));
        const reviews = [];
        querySnapshot.forEach((doc) => {
            reviews.push({ id: doc.id, ...doc.data() });
        });
        renderReviews(reviews);
    } catch (error) {
        // Load sample reviews
        renderReviews([
            { name: 'Priya Sharma', rating: 5, comment: 'Best organic products I\'ve ever bought! The vegetables are always fresh.', date: '2024-01-15' },
            { name: 'Rahul Verma', rating: 5, comment: 'I love the farm-fresh milk. It tastes exactly like how milk should taste!', date: '2024-01-10' },
            { name: 'Sneha Patel', rating: 4, comment: 'Great quality and fast delivery. Highly recommended for health-conscious people.', date: '2024-01-05' }
        ]);
    }
}

function renderReviews(reviews) {
    const grid = document.getElementById('reviewGrid');
    grid.innerHTML = reviews.map(review => `
        <div class="review-card">
            <div class="stars">${'⭐'.repeat(review.rating)}</div>
            <p>"${review.comment}"</p>
            <div class="reviewer">- ${review.name}</div>
            <small style="color: #999;">${review.date || ''}</small>
        </div>
    `).join('');
}

// ============= CONTACT FORM =============
async function submitContact(event) {
    event.preventDefault();
    const form = event.target;
    const data = {
        name: form.querySelector('input[type="text"]').value,
        email: form.querySelector('input[type="email"]').value,
        message: form.querySelector('textarea').value,
        timestamp: new Date().toISOString()
    };
    
    try {
        await addDoc(collection(db, 'contacts'), data);
        showToast('Message sent successfully!');
        form.reset();
    } catch (error) {
        showToast('Failed to send message: ' + error.message);
    }
}

// ============= TOAST NOTIFICATION =============
function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============= EXPOSE FUNCTIONS TO GLOBAL SCOPE =============
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.toggleCart = toggleCart;
window.checkout = checkout;
window.toggleAuth = toggleAuth;
window.switchAuthTab = switchAuthTab;
window.login = login;
window.signup = signup;
window.logout = logout;
window.filterProducts = filterProducts;
window.searchProducts = searchProducts;
window.toggleSearch = toggleSearch;
window.scrollToProducts = scrollToProducts;
window.scrollToSection = scrollToSection;
window.submitContact = submitContact;
