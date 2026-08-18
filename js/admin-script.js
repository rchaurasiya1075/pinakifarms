// js/admin-script.js - Refactored for Clarity

// ============================================
// IMPORTS
// ============================================
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
// LOGGING
// ============================================
const log = {
    info: (msg) => console.log('ℹ️', msg),
    success: (msg) => console.log('✅', msg),
    error: (msg) => console.error('❌', msg),
    warn: (msg) => console.warn('⚠️', msg),
    debug: (msg) => console.log('🔍', msg)
};

log.info('Admin Script loaded');

// ============================================
// DOM HELPERS
// ============================================
const $ = (id) => document.getElementById(id);
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => document.querySelectorAll(sel);

// ============================================
// TOAST NOTIFICATION
// ============================================
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
// AUTH CHECK
// ============================================
async function checkAdminStatus(user) {
    if (!user) {
        log.warn('No user, redirecting to login...');
        window.location.replace('login.html');
        return false;
    }
    
    log.debug('User email:', user.email);
    
    if (user.email !== ADMIN_EMAIL) {
        log.warn('Not admin email, logging out...');
        await signOut(auth);
        window.location.replace('login.html');
        return false;
    }
    
    try {
        log.debug('Checking admins collection...');
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
            log.success('Admin document created!');
        }
        
        return true;
    } catch (error) {
        log.error('Error checking admin:', error);
        return false;
    }
}

// ============================================
// AUTH LISTENER
// ============================================
onAuthStateChanged(auth, async (user) => {
    log.debug('Auth state changed:', user ? 'Logged in' : 'Logged out');
    
    if (!user) {
        window.location.replace('login.html');
        return;
    }
    
    const isAdmin = await checkAdminStatus(user);
    if (!isAdmin) return;
    
    // Update admin name
    const nameEl = $('adminName');
    if (nameEl) nameEl.textContent = 'Admin';
    
    // Load page data
    const path = window.location.pathname;
    if (path.includes('dashboard.html')) {
        loadDashboard();
    } else if (path.includes('products.html')) {
        loadProducts();
    } else if (path.includes('orders.html')) {
        loadOrders();
    } else if (path.includes('customers.html')) {
        loadCustomers();
    } else if (path.includes('reviews.html')) {
        loadReviews();
    }
});

// ============================================
// LOGOUT
// ============================================
window.logoutAdmin = async function() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    try {
        await signOut(auth);
        window.location.replace('login.html');
        showToast('Logged out successfully');
    } catch (error) {
        log.error('Logout failed:', error);
        showToast('Logout failed', 'error');
    }
};

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
    try {
        // Products count
        const productsSnap = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
        updateElement('totalProducts', productsSnap.size);
        
        // Orders count
        const ordersSnap = await getDocs(collection(db, COLLECTIONS.ORDERS));
        updateElement('totalOrders', ordersSnap.size);
        
        // Revenue
        let revenue = 0;
        ordersSnap.forEach(doc => {
            const data = doc.data();
            revenue += data.total || 0;
        });
        updateElement('totalRevenue', '₹' + revenue);
        
        // Customers count
        const customersSnap = await getDocs(collection(db, COLLECTIONS.USERS));
        updateElement('totalCustomers', customersSnap.size);
        
        // Recent orders
        renderRecentOrders(ordersSnap);
        
    } catch (error) {
        log.error('Dashboard error:', error);
    }
}

function updateElement(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
}

function renderRecentOrders(ordersSnap) {
    const list = $('recentOrdersList');
    if (!list) return;
    
    let orders = [];
    ordersSnap.forEach(doc => {
        orders.push({ id: doc.id, ...doc.data() });
    });
    
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    orders = orders.slice(0, 5);
    
    if (orders.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No orders yet</p>';
        return;
    }
    
    list.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(o => `
                    <tr>
                        <td>#${o.id.slice(0, 8)}</td>
                        <td>${o.userName || 'N/A'}</td>
                        <td>₹${o.total || 0}</td>
                        <td><span class="status-badge status-${o.status || 'pending'}">${o.status || 'Pending'}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ============================================
// PRODUCTS
// ============================================
async function loadProducts() {
    try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
        const products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        
        const tbody = $('productList');
        if (!tbody) return;
        
        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center;padding:40px;color:#999;">
                        No products found. Click "Add New Product" to get started.
                    </td>
                </tr>
            `;
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
                    <button class="admin-edit-btn" onclick="editProduct('${p.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="admin-delete-btn" onclick="deleteProduct('${p.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        log.error('Error loading products:', error);
    }
}

// ============================================
// PRODUCT CRUD
// ============================================
window.openAddProduct = function() {
    const modal = $('productModal');
    if (!modal) return;
    
    $('modalTitle').textContent = 'Add New Product';
    $('productForm').reset();
    $('productId').value = '';
    modal.classList.add('active');
};

window.closeProductModal = function() {
    const modal = $('productModal');
    if (modal) modal.classList.remove('active');
};

// Product Form Submit
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
                showToast('✅ Product updated successfully!');
            } else {
                await addDoc(collection(db, COLLECTIONS.PRODUCTS), data);
                showToast('✅ Product added successfully!');
            }
            closeProductModal();
            loadProducts();
        } catch (error) {
            log.error('Error saving product:', error);
            showToast('❌ Error: ' + error.message, 'error');
        }
    });
}

window.editProduct = async function(productId) {
    try {
        const docRef = doc(db, COLLECTIONS.PRODUCTS, productId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            $('modalTitle').textContent = 'Edit Product';
            $('productId').value = productId;
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
        log.error('Error loading product:', error);
        showToast('❌ Error loading product', 'error');
    }
};

window.deleteProduct = async function(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, productId));
        showToast('✅ Product deleted!');
        loadProducts();
    } catch (error) {
        log.error('Error deleting product:', error);
        showToast('❌ Error deleting product', 'error');
    }
};

// ============================================
// ORDERS
// ============================================
async function loadOrders() {
    try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.ORDERS));
        const orders = [];
        snapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const tbody = $('orderList');
        if (!tbody) return;
        
        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center;padding:40px;color:#999;">
                        No orders found
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = orders.map(o => `
            <tr>
                <td>#${o.id.slice(0, 8)}</td>
                <td>${o.userName || 'N/A'}</td>
                <td>${o.items?.length || 0} items</td>
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
                    <button class="admin-delete-btn" onclick="deleteOrder('${o.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        log.error('Error loading orders:', error);
    }
}

window.updateOrderStatus = async function(orderId, status) {
    try {
        await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
            status: status,
            updatedAt: new Date().toISOString()
        });
        showToast('✅ Order status updated!');
        loadOrders();
    } catch (error) {
        log.error('Error updating order:', error);
        showToast('❌ Error updating order', 'error');
    }
};

window.deleteOrder = async function(orderId) {
    if (!confirm('Are you sure you want to delete this order?')) return;
    
    try {
        await deleteDoc(doc(db, COLLECTIONS.ORDERS, orderId));
        showToast('✅ Order deleted!');
        loadOrders();
    } catch (error) {
        log.error('Error deleting order:', error);
        showToast('❌ Error deleting order', 'error');
    }
};

window.filterOrders = function() {
    loadOrders();
};

// ============================================
// CUSTOMERS
// ============================================
async function loadCustomers() {
    try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
        const customers = [];
        snapshot.forEach(doc => {
            customers.push({ id: doc.id, ...doc.data() });
        });
        
        // Get order counts
        const ordersSnap = await getDocs(collection(db, COLLECTIONS.ORDERS));
        const orderCounts = {};
        ordersSnap.forEach(doc => {
            const data = doc.data();
            if (data.userId) {
                orderCounts[data.userId] = (orderCounts[data.userId] || 0) + 1;
            }
        });
        
        const tbody = $('customerList');
        if (!tbody) return;
        
        if (customers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;padding:40px;color:#999;">
                        No customers found
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = customers.map(c => `
            <tr>
                <td><strong>${c.name || 'N/A'}</strong></td>
                <td>${c.email}</td>
                <td>${c.phone || 'N/A'}</td>
                <td>${orderCounts[c.uid] || 0}</td>
                <td>${c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : 'N/A'}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        log.error('Error loading customers:', error);
    }
}

// ============================================
// REVIEWS
// ============================================
async function loadReviews() {
    try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.REVIEWS));
        const reviews = [];
        snapshot.forEach(doc => {
            reviews.push({ id: doc.id, ...doc.data() });
        });
        reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const tbody = $('reviewList');
        if (!tbody) return;
        
        if (reviews.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;padding:40px;color:#999;">
                        No reviews found
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = reviews.map(r => `
            <tr>
                <td><strong>${r.name || 'Anonymous'}</strong></td>
                <td>${'⭐'.repeat(r.rating || 0)}</td>
                <td>${r.comment || ''}</td>
                <td>${r.date || 'N/A'}</td>
                <td>
                    <button class="admin-delete-btn" onclick="deleteReview('${r.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        log.error('Error loading reviews:', error);
    }
}

window.deleteReview = async function(reviewId) {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    try {
        await deleteDoc(doc(db, COLLECTIONS.REVIEWS, reviewId));
        showToast('✅ Review deleted!');
        loadReviews();
    } catch (error) {
        log.error('Error deleting review:', error);
        showToast('❌ Error deleting review', 'error');
    }
};

// ============================================
// INIT LOG
// ============================================
log.success('Admin script ready!');
