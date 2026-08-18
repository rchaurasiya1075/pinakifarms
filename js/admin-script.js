// js/admin-script.js - COMPLETE FIXED
import { 
    auth,
    db,
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    getDoc,
    signOut,
    onAuthStateChanged
} from '../firebase-config.js';

console.log('✅ Admin Script loaded');

// ============================================
// CONSTANTS
// ============================================
const ADMIN_EMAIL = 'admin@pinakifarms.com';
const COLLECTIONS = {
    ADMINS: 'admins',
    PRODUCTS: 'products',
    ORDERS: 'orders',
    USERS: 'users',
    REVIEWS: 'reviews'
};

// ============================================
// HELPERS
// ============================================
const $ = (id) => document.getElementById(id);
const log = {
    info: (m) => console.log('ℹ️', m),
    success: (m) => console.log('✅', m),
    error: (m) => console.error('❌', m),
    debug: (m) => console.log('🔍', m)
};

function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// AUTH
// ============================================
async function verifyAdmin(user) {
    if (!user) {
        window.location.href = 'login.html';
        return false;
    }
    
    if (user.email !== ADMIN_EMAIL) {
        log.error('Not admin email');
        await signOut(auth);
        window.location.href = 'login.html';
        return false;
    }
    
    try {
        const q = query(collection(db, COLLECTIONS.ADMINS), where('email', '==', user.email));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            log.info('Creating admin document...');
            await addDoc(collection(db, COLLECTIONS.ADMINS), {
                email: user.email,
                name: 'Admin',
                role: 'admin',
                createdAt: new Date().toISOString()
            });
            log.success('Admin document created');
        }
        
        return true;
    } catch (error) {
        log.error('Verify admin error:', error);
        return false;
    }
}

// ============================================
// AUTH LISTENER
// ============================================
onAuthStateChanged(auth, async (user) => {
    log.debug('Auth state:', user ? 'Logged in' : 'Logged out');
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    const isAdmin = await verifyAdmin(user);
    if (!isAdmin) return;
    
    const nameEl = $('adminName');
    if (nameEl) nameEl.textContent = 'Admin';
    
    const path = window.location.pathname;
    if (path.includes('dashboard.html')) loadDashboard();
    else if (path.includes('products.html')) loadProducts();
    else if (path.includes('orders.html')) loadOrders();
    else if (path.includes('customers.html')) loadCustomers();
    else if (path.includes('reviews.html')) loadReviews();
});

// ============================================
// LOGOUT
// ============================================
window.logoutAdmin = async function() {
    if (!confirm('Logout?')) return;
    try {
        await signOut(auth);
        window.location.href = 'login.html';
        showToast('Logged out');
    } catch (error) {
        showToast('Logout failed', 'error');
    }
};

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
    try {
        const products = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
        const orders = await getDocs(collection(db, COLLECTIONS.ORDERS));
        const users = await getDocs(collection(db, COLLECTIONS.USERS));
        
        let revenue = 0;
        orders.forEach(doc => {
            const data = doc.data();
            revenue += data.total || 0;
        });
        
        updateElement('totalProducts', products.size);
        updateElement('totalOrders', orders.size);
        updateElement('totalRevenue', '₹' + revenue);
        updateElement('totalCustomers', users.size);
        
        // Recent orders
        let recent = [];
        orders.forEach(doc => recent.push({ id: doc.id, ...doc.data() }));
        recent.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        recent = recent.slice(0, 5);
        
        const list = $('recentOrdersList');
        if (list) {
            if (recent.length === 0) {
                list.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No orders</p>';
            } else {
                list.innerHTML = `
                    <table class="admin-table">
                        <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
                        <tbody>
                            ${recent.map(o => `
                                <tr>
                                    <td>#${o.id.slice(0,8)}</td>
                                    <td>${o.userName || 'N/A'}</td>
                                    <td>₹${o.total || 0}</td>
                                    <td><span class="status-badge status-${o.status || 'pending'}">${o.status || 'Pending'}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }
        }
    } catch (error) {
        log.error('Dashboard error:', error);
    }
}

function updateElement(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
}

// ============================================
// PRODUCTS
// ============================================
async function loadProducts() {
    try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
        const products = [];
        snapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
        
        const tbody = $('productList');
        if (!tbody) return;
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#999;">No products</td></tr>';
            return;
        }
        
        tbody.innerHTML = products.map(p => `
            <tr>
                <td style="font-size:30px;">${p.emoji || '🌿'}</td>
                <td><strong>${p.name}</strong></td>
                <td>${p.category}</td>
                <td><strong>₹${p.price}</strong></td>
                <td>${p.originalPrice ? '₹' + p.originalPrice : '-'}</td>
                <td>${p.inStock ? '✅ In Stock' : '❌ Out of Stock'}</td>
                <td>
                    <button class="admin-edit-btn" onclick="editProduct('${p.id}')"><i class="fas fa-edit"></i></button>
                    <button class="admin-delete-btn" onclick="deleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        log.error('Load products error:', error);
    }
}

// ============================================
// PRODUCT CRUD
// ============================================
window.openAddProduct = function() {
    const modal = $('productModal');
    if (!modal) return;
    $('modalTitle').textContent = 'Add Product';
    $('productForm').reset();
    $('productId').value = '';
    modal.classList.add('active');
};

window.closeProductModal = function() {
    const modal = $('productModal');
    if (modal) modal.classList.remove('active');
};

// Product Form
const productForm = $('productForm');
if (productForm) {
    productForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const id = $('productId').value;
        const data = {
            name: $('pName').value.trim(),
            category: $('pCategory').value,
            price: parseFloat($('pPrice').value),
            originalPrice: parseFloat($('pOriginalPrice').value) || null,
            emoji: $('pEmoji').value.trim() || '🌿',
            purity: $('pPurity').value.trim() || 'Pure',
            unit: $('pUnit').value.trim() || 'kg',
            inStock: $('pInStock').value === 'true',
            description: $('pDescription').value.trim() || ''
        };
        
        try {
            if (id) {
                await updateDoc(doc(db, COLLECTIONS.PRODUCTS, id), data);
                showToast('✅ Product updated');
            } else {
                await addDoc(collection(db, COLLECTIONS.PRODUCTS), data);
                showToast('✅ Product added');
            }
            closeProductModal();
            loadProducts();
        } catch (error) {
            showToast('❌ Error: ' + error.message, 'error');
        }
    });
}

window.editProduct = async function(id) {
    try {
        const docSnap = await getDoc(doc(db, COLLECTIONS.PRODUCTS, id));
        if (docSnap.exists()) {
            const data = docSnap.data();
            $('modalTitle').textContent = 'Edit Product';
            $('productId').value = id;
            $('pName').value = data.name || '';
            $('pCategory').value = data.category || '';
            $('pPrice').value = data.price || '';
            $('pOriginalPrice').value = data.originalPrice || '';
            $('pEmoji').value = data.emoji || '';
            $('pPurity').value = data.purity || '';
            $('pUnit').value = data.unit || '';
            $('pInStock').value = data.inStock ? 'true' : 'false';
            $('pDescription').value = data.description || '';
            $('productModal').classList.add('active');
        }
    } catch (error) {
        showToast('❌ Error loading product', 'error');
    }
};

window.deleteProduct = async function(id) {
    if (!confirm('Delete this product?')) return;
    try {
        await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, id));
        showToast('✅ Product deleted');
        loadProducts();
    } catch (error) {
        showToast('❌ Error deleting', 'error');
    }
};

// ============================================
// ORDERS
// ============================================
async function loadOrders() {
    try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.ORDERS));
        const orders = [];
        snapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const tbody = $('orderList');
        if (!tbody) return;
        
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#999;">No orders</td></tr>';
            return;
        }
        
        tbody.innerHTML = orders.map(o => `
            <tr>
                <td>#${o.id.slice(0,8)}</td>
                <td>${o.userName || 'N/A'}</td>
                <td>${o.items?.length || 0}</td>
                <td><strong>₹${o.total || 0}</strong></td>
                <td>${o.paymentMethod || 'N/A'}</td>
                <td>
                    <select class="status-select" onchange="updateOrderStatus('${o.id}', this.value)">
                        <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td>
                    <button class="admin-delete-btn" onclick="deleteOrder('${o.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        log.error('Load orders error:', error);
    }
}

window.updateOrderStatus = async function(id, status) {
    try {
        await updateDoc(doc(db, COLLECTIONS.ORDERS, id), {
            status: status,
            updatedAt: new Date().toISOString()
        });
        showToast('✅ Status updated');
        loadOrders();
    } catch (error) {
        showToast('❌ Error updating', 'error');
    }
};

window.deleteOrder = async function(id) {
    if (!confirm('Delete this order?')) return;
    try {
        await deleteDoc(doc(db, COLLECTIONS.ORDERS, id));
        showToast('✅ Order deleted');
        loadOrders();
    } catch (error) {
        showToast('❌ Error deleting', 'error');
    }
};

window.filterOrders = function() { loadOrders(); };

// ============================================
// CUSTOMERS
// ============================================
async function loadCustomers() {
    try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
        const customers = [];
        snapshot.forEach(doc => customers.push({ id: doc.id, ...doc.data() }));
        
        const ordersSnap = await getDocs(collection(db, COLLECTIONS.ORDERS));
        const counts = {};
        ordersSnap.forEach(doc => {
            const data = doc.data();
            if (data.userId) counts[data.userId] = (counts[data.userId] || 0) + 1;
        });
        
        const tbody = $('customerList');
        if (!tbody) return;
        
        if (customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#999;">No customers</td></tr>';
            return;
        }
        
        tbody.innerHTML = customers.map(c => `
            <tr>
                <td><strong>${c.name || 'N/A'}</strong></td>
                <td>${c.email}</td>
                <td>${c.phone || 'N/A'}</td>
                <td>${counts[c.uid] || 0}</td>
                <td>${c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : 'N/A'}</td>
            </tr>
        `).join('');
    } catch (error) {
        log.error('Load customers error:', error);
    }
}

// ============================================
// REVIEWS
// ============================================
async function loadReviews() {
    try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.REVIEWS));
        const reviews = [];
        snapshot.forEach(doc => reviews.push({ id: doc.id, ...doc.data() }));
        reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const tbody = $('reviewList');
        if (!tbody) return;
        
        if (reviews.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#999;">No reviews</td></tr>';
            return;
        }
        
        tbody.innerHTML = reviews.map(r => `
            <tr>
                <td><strong>${r.name || 'Anonymous'}</strong></td>
                <td>${'⭐'.repeat(r.rating || 0)}</td>
                <td>${r.comment || ''}</td>
                <td>${r.date || 'N/A'}</td>
                <td>
                    <button class="admin-delete-btn" onclick="deleteReview('${r.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        log.error('Load reviews error:', error);
    }
}

window.deleteReview = async function(id) {
    if (!confirm('Delete this review?')) return;
    try {
        await deleteDoc(doc(db, COLLECTIONS.REVIEWS, id));
        showToast('✅ Review deleted');
        loadReviews();
    } catch (error) {
        showToast('❌ Error deleting', 'error');
    }
};

log.success('Admin script ready!');
