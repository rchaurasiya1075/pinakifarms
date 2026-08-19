// dashboard-script.js - Complete Dashboard JavaScript
import { 
    db, auth,
    collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot, getDoc,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    sendPasswordResetEmail,
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
        console.error('❌ Error loading orders:', error);
    }
}

// ============= LOAD PAYMENTS =============
async function loadPayments() {
    try {
        const q = query(collection(db, 'payments'), where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        allPayments = [];
        querySnapshot.forEach((doc) => {
            allPayments.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by date (newest first)
        allPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        console.log('✅ Payments loaded:', allPayments.length);
        renderPayments();
    } catch (error) {
        console.error('❌ Error loading payments:', error);
    }
}

// ============= RENDER ORDERS =============
function renderOrders() {
    // Recent Orders (Dashboard)
    const recentBody = document.getElementById('recentOrdersBody');
    if (recentBody) {
        const recent = allOrders.slice(0, 5);
        if (recent.length === 0) {
            recentBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;padding:30px;color:#999;">
                        <i class="fas fa-shopping-bag"></i> No orders yet. Start shopping!
                    </td>
                </tr>
            `;
        } else {
            recentBody.innerHTML = recent.map(order => `
                <tr>
                    <td>#${order.id.slice(0, 8)}</td>
                    <td>${formatDate(order.createdAt)}</td>
                    <td>${order.items?.length || 0} items</td>
                    <td>₹${order.total || 0}</td>
                    <td><span class="status-badge status-${order.status || 'pending'}">${order.status || 'Pending'}</span></td>
                </tr>
            `).join('');
        }
    }

    // All Orders (Order History Page)
    const allBody = document.getElementById('allOrdersBody');
    if (allBody) {
        const filter = document.getElementById('orderFilter')?.value || 'all';
        let filtered = allOrders;
        if (filter !== 'all') {
            filtered = allOrders.filter(o => o.status === filter);
        }
        
        if (filtered.length === 0) {
            allBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center;padding:40px;color:#999;">
                        <i class="fas fa-inbox"></i> No orders found
                    </td>
                </tr>
            `;
        } else {
            allBody.innerHTML = filtered.map(order => `
                <tr>
                    <td>#${order.id.slice(0, 8)}</td>
                    <td>${formatDate(order.createdAt)}</td>
                    <td>${order.items?.map(i => i.name).join(', ') || 'N/A'}</td>
                    <td>${order.items?.reduce((sum, i) => sum + i.quantity, 0) || 0}</td>
                    <td>₹${order.total || 0}</td>
                    <td>${order.paymentMethod || 'N/A'}</td>
                    <td><span class="status-badge status-${order.status || 'pending'}">${order.status || 'Pending'}</span></td>
                    <td>
                        <a href="order-tracking.html?order=${encodeURIComponent(order.id)}" class="view-btn" title="Track order">
                            <i class="fas fa-location-dot"></i> Track
                        </a>
                        <button onclick="viewOrderDetail('${order.id}')" class="view-btn" title="Order details">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    }
}

// ============= RENDER PAYMENTS =============
function renderPayments() {
    // Update payment summary
    const totalPaid = document.getElementById('totalPaid');
    const totalOrders = document.getElementById('totalPaymentOrders');
    
    if (totalPaid) {
        const total = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        totalPaid.textContent = '₹' + total;
    }
    if (totalOrders) {
        totalOrders.textContent = allPayments.length;
    }

    // All Payments
    const allBody = document.getElementById('allPaymentsBody');
    if (allBody) {
        if (allPayments.length === 0) {
            allBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:40px;color:#999;">
                        <i class="fas fa-credit-card"></i> No payment history
                    </td>
                </tr>
            `;
        } else {
            allBody.innerHTML = allPayments.map(payment => `
                <tr>
                    <td>#${payment.id.slice(0, 8)}</td>
                    <td>#${payment.orderId?.slice(0, 8) || 'N/A'}</td>
                    <td>${formatDate(payment.createdAt)}</td>
                    <td>₹${payment.amount || 0}</td>
                    <td>${payment.method || 'N/A'}</td>
                    <td><span class="status-badge status-${payment.status || 'completed'}">${payment.status || 'Completed'}</span></td>
                </tr>
            `).join('');
        }
    }
}

// ============= UPDATE DASHBOARD STATS =============
function updateDashboardStats() {
    const totalOrders = document.getElementById('totalOrders');
    const totalSpent = document.getElementById('totalSpent');
    const pendingOrders = document.getElementById('pendingOrders');
    const completedOrders = document.getElementById('completedOrders');
    
    if (totalOrders) totalOrders.textContent = allOrders.length;
    if (totalSpent) {
        const spent = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        totalSpent.textContent = '₹' + spent;
    }
    if (pendingOrders) {
        const pending = allOrders.filter(o => o.status === 'pending' || o.status === 'processing').length;
        pendingOrders.textContent = pending;
    }
    if (completedOrders) {
        const completed = allOrders.filter(o => o.status === 'delivered' || o.status === 'completed').length;
        completedOrders.textContent = completed;
    }
}

// ============= VIEW ORDER DETAIL =============
window.viewOrderDetail = function(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const modal = document.getElementById('orderDetailModal');
    const content = document.getElementById('orderDetailContent');
    
    content.innerHTML = `
        <div class="order-detail">
            <p><strong>Order ID:</strong> #${order.id}</p>
            <p><strong>Date:</strong> ${formatDate(order.createdAt)}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${order.status || 'pending'}">${order.status || 'Pending'}</span></p>
            <p><strong>Payment Method:</strong> ${order.paymentMethod || 'N/A'}</p>
            <p><strong>Total:</strong> ₹${order.total || 0}</p>
            <p><strong>Tracking:</strong> <a href="order-tracking.html?order=${encodeURIComponent(order.id)}">Track this order</a></p>
            <hr>
            <h4>Items:</h4>
            <ul>
                ${order.items?.map(item => `
                    <li>${item.emoji || '🌿'} ${item.name} × ${item.quantity} = ₹${item.price * item.quantity}</li>
                `).join('') || '<li>No items</li>'}
            </ul>
            ${order.deliveryAddress ? `
                <hr>
                <h4>Delivery Address:</h4>
                <p>${order.deliveryAddress}</p>
            ` : ''}
        </div>
    `;
    
    modal.classList.add('active');
}

// ============= CLOSE ORDER DETAIL =============
window.closeOrderDetail = function() {
    document.getElementById('orderDetailModal').classList.remove('active');
}

// ============= FILTER ORDERS =============
window.filterOrders = function() {
    renderOrders();
}

// ============= UPDATE PROFILE =============
window.updateProfile = async function(event) {
    event.preventDefault();
    
    const name = document.getElementById('profileName').value.trim();
    const phone = document.getElementById('profilePhone').value.trim();
    const address = document.getElementById('profileAddress').value.trim();
    const pincode = document.getElementById('profilePincode').value.trim();
    
    if (!name) {
        showToast('⚠️ Name is required');
        return;
    }
    
    try {
        const userRef = doc(db, 'users', userData.id);
        await updateDoc(userRef, {
            name: name,
            phone: phone || '',
            address: address || '',
            pincode: pincode || '',
            updatedAt: new Date().toISOString()
        });
        
        userData.name = name;
        userData.phone = phone;
        userData.address = address;
        userData.pincode = pincode;
        
        showToast('✅ Profile updated successfully!');
        document.getElementById('userName').textContent = name;
        document.getElementById('userWelcome').textContent = 'Welcome, ' + name + '!';
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        showToast('❌ Failed to update profile');
    }
}

// ============= LOAD PROFILE =============
window.loadProfile = function() {
    if (!userData) return;
    
    document.getElementById('profileName').value = userData.name || '';
    document.getElementById('profileEmail').value = userData.email || '';
    document.getElementById('profilePhone').value = userData.phone || '';
    document.getElementById('profileAddress').value = userData.address || '';
    document.getElementById('profilePincode').value = userData.pincode || '';
}

// ============= SEND PASSWORD RESET LINK =============
window.sendProfileResetLink = async function() {
    if (!currentUser?.email) { showToast('Please sign in again and try.'); return; }
    try {
        await sendPasswordResetEmail(auth, currentUser.email);
        showToast('Password-reset link sent to your registered email.');
    } catch (error) {
        console.error('Password reset error:', error);
        showToast('Unable to send reset link. Please try again.');
    }
}

// ============= CHANGE PASSWORD =============
window.changePassword = async function(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        showToast('⚠️ Passwords do not match');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('⚠️ Password must be at least 6 characters');
        return;
    }
    
    try {
        // Re-authenticate user
        const credential = EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
        );
        await reauthenticateWithCredential(currentUser, credential);
        
        // Update password
        await updatePassword(currentUser, newPassword);
        
        showToast('✅ Password changed successfully!');
        document.getElementById('passwordForm').reset();
    } catch (error) {
        console.error('❌ Error changing password:', error);
        let errorMsg = '❌ Failed to change password. ';
        if (error.code === 'auth/wrong-password') {
            errorMsg += 'Current password is incorrect.';
        } else {
            errorMsg += error.message;
        }
        showToast(errorMsg);
    }
}

// ============= LOGOUT =============
window.logoutUser = async function() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('❌ Logout error:', error);
            showToast('❌ Logout failed');
        }
    }
}

// ============= HELPER FUNCTIONS =============
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: #2d5a27;
        color: #fff;
        padding: 15px 30px;
        border-radius: 10px;
        z-index: 999999;
        opacity: 0;
        transition: opacity 0.3s;
        max-width: 90%;
        text-align: center;
        font-weight: 500;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.style.opacity = '1', 10);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============= INIT =============
// Load profile when on profile page
if (document.getElementById('profileForm')) {
    setTimeout(loadProfile, 500);
}

console.log('✅ Dashboard ready!');
