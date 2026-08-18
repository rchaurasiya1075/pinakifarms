// dashboard-script.js - Complete Dashboard JavaScript
import { 
    db, auth,
    collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot, getDoc,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from './firebase-config.js';

console.log('✅ Dashboard Script loaded!');

// ============= STATE =============
let currentUser = null;
let userData = null;
let allOrders = [];
let allPayments = [];

// ============= AUTH CHECK =============
onAuthStateChanged(auth, async (user) => {
    console.log('🔄 Auth state changed:', user ? 'Logged in' : 'Logged out');
    
    if (!user) {
        // Redirect to login if not authenticated
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = user;
    await loadUserData();
    await loadAllData();
});

// ============= LOAD USER DATA =============
async function loadUserData() {
    try {
        const q = query(collection(db, 'users'), where('uid', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            userData = { id: doc.id, ...doc.data() };
        });
        
        // Update UI with user data
        document.getElementById('userName').textContent = userData?.name || 'User';
        document.getElementById('userEmail').textContent = userData?.email || '';
        document.getElementById('userWelcome').textContent = 'Welcome, ' + (userData?.name || 'User') + '!';
        
        console.log('✅ User data loaded:', userData);
    } catch (error) {
        console.error('❌ Error loading user data:', error);
    }
}

// ============= LOAD ALL DATA =============
async function loadAllData() {
    await loadOrders();
    await loadPayments();
    updateDashboardStats();
}

// ============= LOAD ORDERS =============
async function loadOrders() {
    try {
        const q = query(collection(db, 'orders'), where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        allOrders = [];
        querySnapshot.forEach((doc) => {
            allOrders.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by date (newest first)
        allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        console.log('✅ Orders loaded:', allOrders.length);
        renderOrders();
    } catch (error) {
        console.error('❌ Error loading orders:', error
