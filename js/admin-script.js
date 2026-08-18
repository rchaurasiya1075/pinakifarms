// js/admin-script.js
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

console.log('✅ Admin Script loaded!');

const ADMIN_EMAIL = 'admin@pinakifarms.com';

// ============ AUTH CHECK ============
onAuthStateChanged(auth, async (user) => {
    console.log('👤 Auth state changed:', user ? 'Logged in' : 'Logged out');
    
    if (!user) {
        console.log('❌ No user, redirecting to login...');
        window.location.replace('login.html');
        return;
    }
    
    console.log('👤 User email:', user.email);
    
    // Check if user is admin
    if (user.email !== ADMIN_EMAIL) {
        console.log('❌ Not admin email, logging out...');
        await signOut(auth);
        window.location.replace('login.html');
        return;
    }
    
    try {
        console.log('🔍 Checking admins collection...');
        const q = query(collection(db, 'admins'), where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        console.log('📊 Admin docs found:', querySnapshot.size);
        
        if (querySnapshot.empty) {
            console.log('📝 Creating admin document...');
            await addDoc(collection(db, 'admins'), {
                email: user.email,
                name: 'Admin',
                role: 'admin',
                createdAt: new Date().toISOString()
            });
            console.log('✅ Admin document created!');
        }
        
        // Update admin name
        const nameEl = document.getElementById('adminName');
        if (nameEl) nameEl.textContent = 'Admin';
        
        // Load data based on page
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
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
});

// ============ LOGOUT ============
window.logoutAdmin = async function() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await signOut(auth);
            window.location.replace('login.html');
        } catch (error) {
            showToast('Logout failed');
        }
    }
};

// ============ TOAST ============
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

// ============ DASHBOARD ============
async function loadDashboard() {
    try {
        const productsSnap = await getDocs(collection(db, 'products'));
        const totalProducts = document.getElementById('totalProducts');
        if (totalProducts) totalProducts.textContent = productsSnap.size;
        
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const totalOrders = document.getElementById('totalOrders');
        if (totalOrders) totalOrders.textContent = ordersSnap.size;
        
        let revenue = 0;
        ordersSnap.forEach(doc => {
            const data = doc.data();
            revenue += data.total || 0;
        });
        const totalRevenue = document.getElementById('totalRevenue');
        if (totalRevenue) totalRevenue.textContent = '₹' + revenue;
        
        const customersSnap = await getDocs(collection(db, 'users'));
        const totalCustomers = document.getElementById('totalCustomers');
        if (totalCustomers) totalCustomers.textContent = customersSnap.size;
        
        // Recent orders
        let orders = [];
        ordersSnap.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        orders = orders.slice(0, 5);
        
        const list = document.getElementById('recentOrdersList');
        if (list) {
            if (orders.length === 0) {
                list.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No orders yet</p>';
            } else {
                list.innerHTML = `
                    <table class="admin-table">
                        <thead><tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Total</th>
                            <th>Status</th>
                        </tr></thead>
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
        }
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

// ============ PRODUCTS ============
async function loadProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const products = [];
        querySnapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        
        const tbody = document.getElementById('productList');
        if (!tbody) return;
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#999;">No products found</td></tr>';
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
        console.error('Error loading products:', error);
    }
}

// ============ OPEN ADD PRODUCT ============
window.openAddProduct = function() {
    const modal = document.getElementById('productModal');
    if (!modal) return;
    document.getElementById('modalTitle').textContent = 'Add New Product';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    modal.classList.add('active');
};

// ============ CLOSE MODAL ============
window.closeProductModal = function() {
    const modal = document.getElementById('productModal');
    if (modal) modal.classList.remove('active');
};

// ============ SAVE PRODUCT ============
const productForm = document.getElementById('productForm');
if (productForm) {
    productForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const id = document.getElementById('productId').value;
        const data = {
            name: document.getElementById('pName').value.trim(),
            category: document.getElementById('pCategory').value,
            price: parseFloat(document.getElementById('pPrice').value),
            originalPrice: parseFloat(document.getElementById('pOriginalPrice').value) || null,
            emoji: document.getElementById('pEmoji').value.trim() || '🌿',
            purity: document.getElementById('pPurity').value.trim() || 'Pure',
            unit: document.getElementById('pUnit').value.trim() || 'kg',
            inStock: document.getElementById('pInStock').value === 'true',
            description: document.getElementById('pDescription').value.trim() || ''
        };
        
        try {
            if (id) {
                await updateDoc(doc(db, 'products', id), data);
                showToast('✅ Product updated successfully!');
            } else {
                await addDoc(collection(db, 'products'), data);
                showToast('✅ Product added successfully!');
            }
            closeProductModal();
            loadProducts();
        } catch (error) {
            showToast('❌ Error: ' + error.message);
        }
    });
}

// ============ EDIT PRODUCT ============
window.editProduct = async function(productId) {
    try {
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('modalTitle').textContent = 'Edit Product';
            document.getElementById('productId').value = productId;
            document.getElementById('pName').value = data.name || '';
            document.getElementById('pCategory').value = data.category || '';
            document.getElementById('pPrice').value = data.price || '';
            document.getElementById('pOriginalPrice').value = data.originalPrice || '';
            document.getElementById('pEmoji').value = data.emoji || '';
            document.getElementById('pPurity').value = data.purity || '';
            document.getElementById('pUnit').value = data.unit || '';
            document.getElementById('pInStock').value = data.inStock ? 'true' : 'false';
            document.getElementById('pDescription').value = data.description || '';
            document.getElementById('productModal').classList.add('active');
        }
    } catch (error) {
        showToast('❌ Error loading product');
    }
};

// ============ DELETE PRODUCT ============
window.deleteProduct = async function(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        await deleteDoc(doc(db, 'products', productId));
        showToast('✅ Product deleted!');
        loadProducts();
    } catch (error) {
        showToast('❌ Error deleting product');
    }
};

// ============ ORDERS ============
async function loadOrders() {
    try {
        const querySnapshot = await getDocs(collection(db, 'orders'));
        const orders = [];
        querySnapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const tbody = document.getElementById('orderList');
        if (!tbody) return;
        
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#999;">No orders found</td></tr>';
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
        console.error('Error loading orders:', error);
    }
}

// ============ UPDATE ORDER STATUS ============
window.updateOrderStatus = async function(orderId, status) {
    try {
        await updateDoc(doc(db, 'orders', orderId), {
            status: status,
            updatedAt: new Date().toISOString()
        });
        showToast('✅ Order status updated!');
        loadOrders();
    } catch (error) {
        showToast('❌ Error updating order');
    }
};

// ============ DELETE ORDER ============
window.deleteOrder = async function(orderId) {
    if (!confirm('Are you sure you want to delete this order?')) return;
    
    try {
        await deleteDoc(doc(db, 'orders', orderId));
        showToast('✅ Order deleted!');
        loadOrders();
    } catch (error) {
        showToast('❌ Error deleting order');
    }
};

// ============ CUSTOMERS ============
async function loadCustomers() {
    try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const customers = [];
        querySnapshot.forEach(doc => {
            customers.push({ id: doc.id, ...doc.data() });
        });
        
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const orderCounts = {};
        ordersSnap.forEach(doc => {
            const data = doc.data();
            if (data.userId) {
                orderCounts[data.userId] = (orderCounts[data.userId] || 0) + 1;
            }
        });
        
        const tbody = document.getElementById('customerList');
        if (!tbody) return;
        
        if (customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#999;">No customers found</td></tr>';
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
        console.error('Error loading customers:', error);
    }
}

// ============ REVIEWS ============
async function loadReviews() {
    try {
        const querySnapshot = await getDocs(collection(db, 'reviews'));
        const reviews = [];
        querySnapshot.forEach(doc => {
            reviews.push({ id: doc.id, ...doc.data() });
        });
        reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const tbody = document.getElementById('reviewList');
        if (!tbody) return;
        
        if (reviews.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#999;">No reviews found</td></tr>';
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
        console.error('Error loading reviews:', error);
    }
}

// ============ DELETE REVIEW ============
window.deleteReview = async function(reviewId) {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    try {
        await deleteDoc(doc(db, 'reviews', reviewId));
        showToast('✅ Review deleted!');
        loadReviews();
    } catch (error) {
        showToast('❌ Error deleting review');
    }
};

// ============ FILTER ORDERS ============
window.filterOrders = function() {
    loadOrders();
};

console.log('✅ Admin script ready!');
