// admin-script.js
import { 
    db, auth,
    collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot,
    signOut, onAuthStateChanged
} from './firebase-config.js';

console.log('✅ Admin Script loaded!');

// ============= AUTH CHECK =============
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Check if user is admin
    try {
        const q = query(collection(db, 'admins'), where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            await signOut(auth);
            window.location.href = 'admin-login.html';
            return;
        }
        
        // Load admin data
        document.getElementById('adminName').textContent = user.email;
        loadDashboardData();
        loadProducts();
        loadOrders();
        loadCustomers();
        loadReviews();
        
    } catch (error) {
        console.error('Error checking admin:', error);
    }
});

// ============= DASHBOARD =============
async function loadDashboardData() {
    try {
        // Get products count
        const productsSnapshot = await getDocs(collection(db, 'products'));
        document.getElementById('totalProducts').textContent = productsSnapshot.size;
        
        // Get orders
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        document.getElementById('totalOrders').textContent = ordersSnapshot.size;
        
        // Calculate revenue
        let revenue = 0;
        ordersSnapshot.forEach(doc => {
            const data = doc.data();
            revenue += data.total || 0;
        });
        document.getElementById('totalRevenue').textContent = '₹' + revenue;
        
        // Get customers
        const customersSnapshot = await getDocs(collection(db, 'users'));
        document.getElementById('totalCustomers').textContent = customersSnapshot.size;
        
        // Recent orders
        let recentOrders = [];
        ordersSnapshot.forEach(doc => {
            recentOrders.push({ id: doc.id, ...doc.data() });
        });
        recentOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        recentOrders = recentOrders.slice(0, 5);
        
        const recentDiv = document.getElementById('adminRecentOrders');
        if (recentOrders.length === 0) {
            recentDiv.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">No orders yet</p>';
        } else {
            recentDiv.innerHTML = `
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
                        ${recentOrders.map(order => `
                            <tr>
                                <td>#${order.id.slice(0, 8)}</td>
                                <td>${order.userName || 'N/A'}</td>
                                <td>₹${order.total || 0}</td>
                                <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ============= PRODUCTS =============
async function loadProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const products = [];
        querySnapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        
        const tbody = document.getElementById('adminProductList');
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#999;">No products found</td></tr>';
            return;
        }
        
        tbody.innerHTML = products.map(p => `
            <tr>
                <td>${p.emoji || '🌿'}</td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td>₹${p.price}</td>
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

// ============= ORDERS =============
async function loadOrders() {
    try {
        const querySnapshot = await getDocs(collection(db, 'orders'));
        const orders = [];
        querySnapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const tbody = document.getElementById('adminOrderList');
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#999;">No orders found</td></tr>';
            return;
        }
        
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>#${order.id.slice(0, 8)}</td>
                <td>${order.userName || 'N/A'}</td>
                <td>${order.items?.length || 0} items</td>
                <td>₹${order.total || 0}</td>
                <td>
                    <select onchange="updateOrderStatus('${order.id}', this.value)" class="status-select">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td>
                    <button class="admin-delete-btn" onclick="deleteOrder('${order.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// ============= CUSTOMERS =============
async function loadCustomers() {
    try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const customers = [];
        querySnapshot.forEach(doc => {
            customers.push({ id: doc.id, ...doc.data() });
        });
        
        const tbody = document.getElementById('adminCustomerList');
        if (customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#999;">No customers found</td></tr>';
            return;
        }
        
        // Get order count for each customer
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        const orderCounts = {};
        ordersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.userId) {
                orderCounts[data.userId] = (orderCounts[data.userId] || 0) + 1;
            }
        });
        
        tbody.innerHTML = customers.map(c => `
            <tr>
                <td>${c.name || 'N/A'}</td>
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

// ============= REVIEWS =============
async function loadReviews() {
    try {
        const querySnapshot = await getDocs(collection(db, 'reviews'));
        const reviews = [];
        querySnapshot.forEach(doc => {
            reviews.push({ id: doc.id, ...doc.data() });
        });
        reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const tbody = document.getElementById('adminReviewList');
        if (reviews.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#999;">No reviews found</td></tr>';
            return;
        }
        
        tbody.innerHTML = reviews.map(review => `
            <tr>
                <td>${review.name || 'Anonymous'}</td>
                <td>${'⭐'.repeat(review.rating || 0)}</td>
                <td>${review.comment || ''}</td>
                <td>${review.date || 'N/A'}</td>
                <td>
                    <button class="admin-delete-btn" onclick="deleteReview('${review.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

// ============= PRODUCT CRUD =============
window.openAddProduct = function() {
    document.getElementById('productModalTitle').textContent = 'Add Product';
    document.getElementById('productForm').reset();
    document.getElementById('editProductId').value = '';
    document.getElementById('productModal').classList.add('active');
}

window.closeProductModal = function() {
    document.getElementById('productModal').classList.remove('active');
}

window.saveProduct = async function(event) {
    event.preventDefault();
    
    const id = document.getElementById('editProductId').value;
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
            showToast('Product updated successfully!');
        } else {
            await addDoc(collection(db, 'products'), data);
            showToast('Product added successfully!');
        }
        closeProductModal();
        loadProducts();
        loadDashboardData();
    } catch (error) {
        console.error('Error saving product:', error);
        showToast('Error saving product: ' + error.message);
    }
}

window.editProduct = async function(productId) {
    try {
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('productModalTitle').textContent = 'Edit Product';
            document.getElementById('editProductId').value = productId;
            document.getElementById('pName').value = data.name || '';
            document.getElementById('pCategory').value = data.category || 'ghee';
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
        console.error('Error loading product:', error);
        showToast('Error loading product');
    }
}

window.deleteProduct = async function(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        await deleteDoc(doc(db, 'products', productId));
        showToast('Product deleted successfully!');
        loadProducts();
        loadDashboardData();
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Error deleting product');
    }
}

// ============= ORDER FUNCTIONS =============
window.updateOrderStatus = async function(orderId, status) {
    try {
        await updateDoc(doc(db, 'orders', orderId), {
            status: status,
            updatedAt: new Date().toISOString()
        });
        showToast('Order status updated!');
        loadOrders();
        loadDashboardData();
    } catch (error) {
        console.error('Error updating order:', error);
        showToast('Error updating order');
    }
}

window.deleteOrder = async function(orderId) {
    if (!confirm('Are you sure you want to delete this order?')) return;
    
    try {
        await deleteDoc(doc(db, 'orders', orderId));
        showToast('Order deleted!');
        loadOrders();
        loadDashboardData();
    } catch (error) {
        console.error('Error deleting order:', error);
        showToast('Error deleting order');
    }
}

// ============= REVIEW FUNCTIONS =============
window.deleteReview = async function(reviewId) {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    try {
        await deleteDoc(doc(db, 'reviews', reviewId));
        showToast('Review deleted!');
        loadReviews();
    } catch (error) {
        console.error('Error deleting review:', error);
        showToast('Error deleting review');
    }
}

// ============= SECTION NAVIGATION =============
window.showAdminSection = function(section) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
    
    const sectionMap = {
        'dashboard': 'adminDashboard',
        'products': 'adminProducts',
        'orders': 'adminOrders',
        'customers': 'adminCustomers',
        'reviews': 'adminReviews'
    };
    
    document.getElementById(sectionMap[section]).classList.add('active');
    document.querySelector(`.admin-nav a[onclick="showAdminSection('${section}')"]`).classList.add('active');
}

// ============= LOGOUT =============
window.adminLogout = async function() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await signOut(auth);
            window.location.href = 'admin-login.html';
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Logout failed');
        }
    }
}

// ============= TOAST =============
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
