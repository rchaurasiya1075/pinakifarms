// script.js
import { 
    db, auth,
    collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot,
    createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from './firebase-config.js';

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

// ============= INIT =============
document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    loadCartFromLocal();
    updateCartUI();
    setupAuthListener();
    loadReviews();
});

// ============= AUTH FUNCTIONS =============

window.toggleAuth = function() {
    authModal.classList.toggle('active');
    document.body.style.overflow = authModal.classList.contains('active') ? 'hidden' : 'auto';
}

window.closeAuth = function() {
    authModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

window.switchToSignup = function() {
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('signupForm').classList.add('active');
}

window.switchToLogin = function() {
    document.getElementById('signupForm').classList.remove('active');
    document.getElementById('loginForm').classList.add('active');
}

window.handleLogin = async function(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showToast('Please fill all fields');
        return;
    }
    
    try {
        showToast('Logging in...');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const q = query(collection(db, 'users'), where('uid', '==', user.uid));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            state.currentUserData = { id: doc.id, ...doc.data() };
        });
        
        showToast('Welcome back, ' + (state.currentUserData?.name || 'User') + '! 🎉');
        closeAuth();
        document.getElementById('loginForm').reset();
        updateUserUI();
        
    } catch (error) {
        let errorMsg = 'Login failed. ';
        switch(error.code) {
            case 'auth/user-not-found': errorMsg += 'No account found.';
                break;
            case 'auth/wrong-password': errorMsg += 'Wrong password.';
                break;
            default: errorMsg += error.message;
        }
        showToast(errorMsg);
    }
}

window.handleSignup = async function(event) {
    event.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const phone = document.getElementById('signupPhone').value.trim();
    
    if (!name || !email || !password) {
        showToast('Please fill all required fields');
        return;
    }
    if (password.length < 6) {
        showToast('Password must be at least 6 characters');
        return;
    }
    
    try {
        showToast('Creating account...');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await addDoc(collection(db, 'users'), {
            uid: user.uid,
            name: name,
            email: email,
            phone: phone || '',
            role: 'customer',
            createdAt: new Date().toISOString()
        });
        
        showToast('Account created! Welcome ' + name + '! 🎉');
        closeAuth();
        document.getElementById('signupForm').reset();
        updateUserUI();
        
    } catch (error) {
        let errorMsg = 'Signup failed. ';
        switch(error.code) {
            case 'auth/email-already-in-use': errorMsg += 'Email already registered.';
                break;
            default: errorMsg += error.message;
        }
        showToast(errorMsg);
    }
}

window.logout = async function() {
    try {
        await signOut(auth);
        state.currentUser = null;
        state.currentUserData =
