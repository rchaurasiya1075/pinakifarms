// script.js - COMPLETE FIXED
import { 
    db, auth
} from './firebase-config.js';

// Import Firestore functions directly from CDN
import { 
    collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot, getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

console.log('✅ Script loaded successfully!');

// ============= STATE =============
let state = {
    products: [],
    cart: [],
    currentUser: null,
    currentUserData: null,
    currentUserRole: 'customer',
    currentFilter: 'all'
};

// ============= DOM REFS =============
const productGrid = document.getElementById('productGrid');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const cartCount = document.getElementById('cartCount');
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const authModal = document.getElementById('authModal');
const searchBar = document.getElementById('searchBar');
const searchInput = document.getElementById('searchInput');

console.log('✅ DOM elements loaded');

// ============= INIT =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM fully loaded');
    loadProducts();
    loadCartFromLocal();
    updateCartUI();
    setupAuthListener();
    loadReviews();
});

// ============= AUTH FUNCTIONS =============

// Toggle Auth Modal - GLOBAL
window.toggleAuth = function() {
    console.log('🔑 Toggle auth called');
    if (authModal) {
        authModal.classList.toggle('active');
        document.body.style.overflow = authModal.classList.contains('active') ? 'hidden' : 'auto';
        console.log('Auth modal active:', authModal.classList.contains('active'));
    } else {
        console.error('❌ Auth modal not found!');
    }
}

// Close Auth Modal - GLOBAL
window.closeAuthModal = function() {
    console.log('❌ Close auth called');
    if (authModal) {
        authModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Show Signup Form - GLOBAL
window.showSignupForm = function() {
    console.log('📝 Show signup form');
    const loginContainer = document.getElementById('loginFormContainer');
    const signupContainer = document.getElementById('signupFormContainer');
    if (loginContainer && signupContainer) {
        loginContainer.classList.remove('active');
        signupContainer.classList.add('active');
    }
    return false;
}

// Show Login Form - GLOBAL
window.showLoginForm = function() {
    console.log('🔐 Show login form');
    const loginContainer = document.getElementById('loginFormContainer');
    const signupContainer = document.getElementById('signupFormContainer');
    if (loginContainer && signupContainer) {
        signupContainer.classList.remove('active');
        loginContainer.classList.add('active');
    }
    return false;
}

// ============= HANDLE LOGIN - GLOBAL =============
window.handleLogin = async function(event) {
    event.preventDefault();
    console.log('🔑 Login form submitted');
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showToast('⚠️ Please fill all fields');
        return false;
    }
    
    try {
        showToast('⏳ Logging in...');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('✅ Login successful:', user.email);
        
        // Get user data
        const q = query(collection(db, 'users'), where('uid', '==', user.uid));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            state.currentUserData = { id: doc.id, ...doc.data() };
        });
        
        showToast('🎉 Welcome back, ' + (state.currentUserData?.name || 'User') + '!');
        window.closeAuthModal();
        document.getElementById('loginForm').reset();
        updateUserUI();
        return false;
        
    } catch (error) {
        console.error('❌ Login error:', error);
        let errorMsg = '❌ Login failed. ';
        switch(error.code) {
            case 'auth/user-not-found': errorMsg += 'No account found.';
                break;
            case 'auth/wrong-password': errorMsg += 'Wrong password.';
                break;
            case 'auth/invalid-email': errorMsg += 'Invalid email.';
                break;
            default: errorMsg += error.message;
        }
        showToast(errorMsg);
        return false;
    }
}

// ============= HANDLE SIGNUP - GLOBAL =============
window.handleSignup = async function(event) {
    event.preventDefault();
    console.log('📝 Signup form submitted');
    
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const phone = document.getElementById('signupPhone').value.trim();
    
    if (!name || !email || !password) {
        showToast('⚠️ Please fill all required fields');
        return false;
    }
    
    if (password.length < 6) {
        showToast('⚠️ Password must be at least 6 characters');
        return false;
    }
    
    try {
        showToast('⏳ Creating account...');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('✅ Signup successful:', user.email);
        
        // Save user data
        const userData = {
            uid: user.uid,
            name: name,
            email: email,
            phone: phone || '',
            role: 'customer',
            createdAt: new Date().toISOString()
        };
        
        await addDoc(collection(db, 'users'), userData);
        state.currentUserData = userData;
        
        showToast('🎉 Account created! Welcome ' + name + '!');
        window.closeAuthModal();
        document.getElementById('signupForm').reset();
        updateUserUI();
        return false;
        
    } catch (error) {
        console.error('❌ Signup error:', error);
        let errorMsg = '❌ Signup failed. ';
        switch(error.code) {
            case 'auth/email-already-in-use': errorMsg += 'Email already registered.';
                break;
            case 'auth/invalid-email': errorMsg += 'Invalid email.';
                break;
            case 'auth/weak-password': errorMsg += 'Password too weak.';
                break;
            default: errorMsg += error.message;
        }
        showToast(errorMsg);
        return false;
    }
}

// ============= LOGOUT - GLOBAL =============
window.logout = async function() {
    console.log('🚪 Logout called');
    try {
        await signOut(auth);
        state.currentUser = null;
        state.currentUserData = null;
        state.currentUserRole = 'customer';
        showToast('👋 Logged out successfully');
        updateUserUI();
        renderProducts();
    } catch (error) {
        showToast('❌ Logout failed: ' + error.message);
    }
}

// ============= AUTH LISTENER =============
function setupAuthListener() {
    console.log('👂 Setting up auth listener');
    onAuthStateChanged(auth, async (user) => {
        console.log('🔄 Auth state changed:', user ? 'Logged in' : 'Logged out');
        state.currentUser = user;
        
        if (user) {
            try {
                const q = query(collection(db, 'users'), where('uid', '==', user.uid));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => {
                    state.currentUserData = { id: doc.id, ...doc.data() };
                    state.currentUserRole = state.currentUserData.role || 'customer';
                });
            } catch (error) {
                console.error('❌ Error fetching user data:', error);
            }
        } else {
            state.currentUserData = null;
            state.currentUserRole = 'customer';
        }
        
        updateUserUI();
        renderProducts();
    });
}

// ============= UPDATE USER UI =============
function updateUserUI() {
    const authBtn = document.querySelector('.auth-toggle');
    
    if (state.currentUser && state.currentUserData) {
        authBtn.innerHTML = `<i class="fas fa-user-check"></i>`;
        authBtn.title = state.currentUserData.name || 'User';
        
        let userDisplay = document.querySelector('.user-display');
        if (!userDisplay) {
            userDisplay = document.createElement('span');
            userDisplay.className = 'user-display';
            const headerActions = document.querySelector('.header-actions');
            headerActions.insertBefore(userDisplay, authBtn);
        }
        userDisplay.textContent = '👋 ' + (state.currentUserData.name || 'User');
        
        authBtn.onclick = function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                window.logout();
            }
        };
    } else {
        authBtn.innerHTML = `<i class="fas fa-user"></i>`;
        authBtn.title = 'Login / Signup';
        authBtn.onclick = window.toggleAuth;
        
        const userDisplay = document.querySelector('.user-display');
        if (userDisplay) userDisplay.remove();
    }
}

// ============= PRODUCT FUNCTIONS =============
async function loadProducts() {
    console.log('📦 Loading products...');
    try {
        const q = collection(db, 'products');
        onSnapshot(q, (snapshot) => {
            state.products = [];
            snapshot.forEach((doc) => {
                state.products.push({ id: doc.id, ...doc.data() });
            });
            renderProducts();
        });
    } catch (error) {
        console.error('❌ Error loading products:', error);
        loadSampleProducts();
    }
}

function loadSampleProducts() {
    state.products = [
        { id: '1', name: 'Organic Tomatoes', category: 'vegetables', price: 60, originalPrice: 80, emoji: '🍅', purity: '100% Organic', unit: 'kg', inStock: true },
        { id: '2', name: 'Fresh Spinach', category: 'vegetables', price: 40, originalPrice: 55, emoji: '🥬', purity: 'Pesticide Free', unit: 'bundle', inStock: true },
        { id: '3', name: 'Organic Apples', category: 'fruits', price: 120, originalPrice: 150, emoji: '🍎', purity: 'Wax Free', unit: 'kg', inStock: true },
        { id: '4', name: 'Pure Desi Ghee', category: 'ghee', price: 450, originalPrice: 550, emoji: '🧈', purity: '100% Pure A2', unit: '500ml', inStock: true },
        { id: '5', name: 'Organic Mustard Oil', category: 'oil', price: 280, originalPrice: 350, emoji: '🫒', purity: 'Cold Pressed', unit: '1 Litre', inStock: true },
        { id: '6', name: 'Farm Fresh Mango Pickle', category: 'achar', price: 180, originalPrice: 220, emoji: '🥭', purity: 'Homemade', unit: '500g', inStock: true }
    ];
    renderProducts();
}

function renderProducts() {
    if (!productGrid) return;
    
    let filtered = state.products;
    if (state.currentFilter !== 'all') {
        filtered = state.products.filter(p => p.category === state.currentFilter);
    }
    if (searchInput && searchInput.value) {
        const q = searchInput.value.toLowerCase();
        filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    
    const isAdmin = state.currentUserRole === 'admin';
    
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
                ${product.inStock !== false ? `
                    <button class="add-to-cart" onclick="window.addToCart('${product.id}')">
                        <i class="fas fa-plus"></i> Add to Cart
                    </button>
                ` : `
                    <button class="out-of-stock" disabled>Out of Stock</button>
                `}
                ${isAdmin ? `
                    <div style="margin-top:10px;display:flex;gap:5px;">
                        <button onclick="window.editProduct('${product.id}')" style="flex:1;padding:5px;background:#3498db;color:#fff;border:none;border-radius:3px;cursor:pointer;">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button onclick="window.deleteProduct('${product.id}')" style="flex:1;padding:5px;background:#e74c3c;color:#fff;border:none;border-radius:3px;cursor:pointer;">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// ============= OTHER FUNCTIONS - GLOBAL =============
window.filterProducts = function(category) {
    state.currentFilter = category;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase() === category || (category === 'all' && btn.textContent === 'All'));
    });
    renderProducts();
}

window.searchProducts = function() {
    renderProducts();
}

window.toggleSearch = function() {
    searchBar.classList.toggle('active');
    if (searchBar.classList.contains('active')) searchInput.focus();
}

window.scrollToProducts = function() {
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

window.scrollToSection = function(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

// ============= CART FUNCTIONS - GLOBAL =============
window.addToCart = function(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    if (product.inStock === false) {
        showToast('Product is out of stock!');
        return;
    }
    if (!state.currentUser) {
        showToast('Please login to add items!');
        window.toggleAuth();
        return;
    }
    
    const existing = state.cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        state.cart.push({ ...product, quantity: 1 });
    }
    
    saveCartToLocal();
    updateCartUI();
    showToast(`${product.name} added to cart! 🛒`);
}

window.removeFromCart = function(productId) {
    state.cart = state.cart.filter(item => item.id !== productId);
    saveCartToLocal();
    updateCartUI();
}

window.updateQuantity = function(productId, change) {
    const item = state.cart.find(i => i.id === productId);
    if (!item) return;
    item.quantity += change;
    if (item.quantity <= 0) {
        window.removeFromCart(productId);
        return;
    }
    saveCartToLocal();
    updateCartUI();
}

function updateCartUI() {
    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    if (state.cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align:center;color:#999;padding:40px 0;">Your cart is empty</p>';
        cartTotal.textContent = '₹0';
        return;
    }
    
    cartItems.innerHTML = state.cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-image">${item.emoji || '🌿'}</div>
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>₹${item.price} × ${item.quantity} = ₹${item.price * item.quantity}</p>
                <div style="display:flex;gap:10px;margin-top:5px;">
                    <button onclick="window.updateQuantity('${item.id}', -1)" style="background:#eee;border:none;padding:2px 10px;border-radius:3px;cursor:pointer;">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="window.updateQuantity('${item.id}', 1)" style="background:#eee;border:none;padding:2px 10px;border-radius:3px;cursor:pointer;">+</button>
                </div>
            </div>
            <button class="cart-item-remove" onclick="window.removeFromCart('${item.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartTotal.textContent = `₹${total}`;
}

window.toggleCart = function() {
    cartDrawer.classList.toggle('active');
    cartOverlay.classList.toggle('active');
}

window.checkout = function() {
    if (state.cart.length === 0) {
        showToast('Cart is empty!');
        return;
    }
    if (!state.currentUser) {
        showToast('Please login first');
        window.toggleAuth();
        return;
    }
    
    const message = state.cart.map(item => 
        `${item.name} × ${item.quantity} = ₹${item.price * item.quantity}`
    ).join('\n');
    const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const whatsappUrl = `https://wa.me/919876543210?text=Order from ${state.currentUserData?.name || 'Customer'}:%0A${encodeURIComponent(message)}%0ATotal: ₹${total}`;
    window.open(whatsappUrl, '_blank');
    state.cart = [];
    saveCartToLocal();
    updateCartUI();
    window.toggleCart();
}

function saveCartToLocal() {
    localStorage.setItem('pinaki_cart', JSON.stringify(state.cart));
}

function loadCartFromLocal() {
    const saved = localStorage.getItem('pinaki_cart');
    if (saved) state.cart = JSON.parse(saved);
}

// ============= REVIEWS =============
async function loadReviews() {
    try {
        const querySnapshot = await getDocs(collection(db, 'reviews'));
        const reviews = [];
        querySnapshot.forEach((doc) => reviews.push({ id: doc.id, ...doc.data() }));
        renderReviews(reviews);
    } catch (error) {
        renderReviews([
            { name: 'Priya Sharma', rating: 5, comment: 'Best organic products!', date: '2024-01-15' },
            { name: 'Rahul Verma', rating: 5, comment: 'Love the farm-fresh milk.', date: '2024-01-10' },
            { name: 'Sneha Patel', rating: 4, comment: 'Great quality and fast delivery.', date: '2024-01-05' }
        ]);
    }
}

function renderReviews(reviews) {
    const grid = document.getElementById('reviewGrid');
    if (!grid) return;
    grid.innerHTML = reviews.map(review => `
        <div class="review-card">
            <div class="stars">${'⭐'.repeat(review.rating)}</div>
            <p>"${review.comment}"</p>
            <div class="reviewer">- ${review.name}</div>
            <small style="color:#999;">${review.date || ''}</small>
        </div>
    `).join('');
}

// ============= CONTACT =============
window.submitContact = async function(event) {
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
        showToast('Failed to send message.');
    }
}

// ============= TOAST =============
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

// ============= ADMIN FUNCTIONS - GLOBAL =============
window.deleteProduct = async function(productId) {
    if (!confirm('Delete this product?')) return;
    try {
        await deleteDoc(doc(db, 'products', productId));
        showToast('Product deleted!');
    } catch (error) {
        showToast('Failed to delete.');
    }
}

window.editProduct = function(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    showToast('Edit: ' + product.name + ' (Admin feature)');
}

console.log('✅ All functions loaded successfully!');
