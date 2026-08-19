// js/admin-script.js - With Firebase Storage Upload
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

// ============ IMPORT STORAGE ============
import { 
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

import { getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

console.log('✅ Admin Script loaded!');

const ADMIN_EMAIL = 'admin@pinakifarms.com';

// Initialize Storage
const app = getApp();
const storage = getStorage(app);

// ============ STATE ============
let uploadedImageUrls = [];
let uploadedVideoUrl = '';
let isUploading = false;

// ============ AUTH CHECK ============
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    if (user.email !== ADMIN_EMAIL) {
        await signOut(auth);
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const q = query(collection(db, 'admins'), where('email', '==', user.email));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            await addDoc(collection(db, 'admins'), {
                email: user.email,
                name: 'Admin',
                role: 'admin',
                createdAt: new Date().toISOString()
            });
        }
        
        const nameEl = document.getElementById('adminName');
        if (nameEl) nameEl.textContent = 'Admin';
        
        const path = window.location.pathname;
        if (path.includes('dashboard.html')) {
            loadDashboard();
        } else if (path.includes('products.html')) {
            loadProducts();
        } else if (path.includes('orders.html')) {
            loadOrders();
        } else if (path.includes('customers.html')) {
            loadCustomers();
        } else if (path.includes('coupons.html')) {
            loadCoupons();
        } else if (path.includes('reviews.html')) {
            loadReviews();
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
});

// ============ LOGOUT ============
window.logoutAdmin = async function() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await signOut(auth);
            window.location.href = 'login.html';
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
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#999;">No products found</td></tr>';
            return;
        }
        
        tbody.innerHTML = products.map(p => `
            <tr>
                <td>
                    ${p.images && p.images.length > 0 
                        ? `<img src="${p.images[0]}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;" />`
                        : `<span style="font-size:30px;">🛒</span>`
                    }
                </td>
                <td><strong>${p.name}</strong></td>
                <td>${p.category}</td>
                <td><strong>₹${p.price}</strong></td>
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

// ============ UPLOAD IMAGES ============
window.uploadImages = function() {
    const files = document.getElementById('imageUpload').files;
    if (!files || files.length === 0) {
        showToast('Please select images');
        return;
    }
    
    // Clear previous images if adding new product
    if (!document.getElementById('productId').value) {
        uploadedImageUrls = [];
    }
    
    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    progressDiv.style.display = 'block';
    
    let uploaded = 0;
    const total = files.length;
    
    Array.from(files).forEach((file, index) => {
        const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                const totalProgress = ((uploaded + (progress / 100)) / total) * 100;
                progressBar.style.width = totalProgress + '%';
                progressText.textContent = Math.round(totalProgress) + '%';
            },
            (error) => {
                console.error('Upload error:', error);
                showToast('❌ Error uploading: ' + file.name);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                uploadedImageUrls.push(downloadURL);
                uploaded++;
                
                // Show preview
                const previewContainer = document.getElementById('imagePreviewContainer');
                const img = document.createElement('img');
                img.src = downloadURL;
                img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid #c49b2c;';
                previewContainer.appendChild(img);
                
                if (uploaded === total) {
                    progressDiv.style.display = 'none';
                    progressBar.style.width = '0%';
                    showToast(`✅ ${total} images uploaded successfully!`);
                    document.getElementById('imageUpload').value = '';
                }
            }
        );
    });
};

// ============ UPLOAD VIDEO ============
window.uploadVideo = function() {
    const file = document.getElementById('videoUpload').files[0];
    if (!file) {
        showToast('Please select a video');
        return;
    }
    
    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    progressDiv.style.display = 'block';
    
    const storageRef = ref(storage, `videos/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressBar.style.width = progress + '%';
            progressText.textContent = Math.round(progress) + '%';
        },
        (error) => {
            console.error('Upload error:', error);
            showToast('❌ Error uploading video');
            progressDiv.style.display = 'none';
        },
        async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            uploadedVideoUrl = downloadURL;
            progressDiv.style.display = 'none';
            progressBar.style.width = '0%';
            
            // Show video preview
            const previewContainer = document.getElementById('videoPreviewContainer');
            previewContainer.innerHTML = `
                <video src="${downloadURL}" controls style="max-width:200px;max-height:150px;border-radius:8px;border:2px solid #c49b2c;"></video>
                <p style="font-size:12px;color:#2d7d46;margin-top:5px;">✅ Video uploaded successfully!</p>
            `;
            showToast('✅ Video uploaded successfully!');
            document.getElementById('videoUpload').value = '';
        }
    );
};

// ============ OPEN ADD PRODUCT ============
window.openAddProduct = function() {
    const modal = document.getElementById('productModal');
    if (!modal) return;
    document.getElementById('modalTitle').textContent = 'Add New Product';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    uploadedImageUrls = [];
    uploadedVideoUrl = '';
    document.getElementById('imagePreviewContainer').innerHTML = '';
    document.getElementById('videoPreviewContainer').innerHTML = '';
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
        
        // Check if images are uploaded
        if (uploadedImageUrls.length === 0) {
            showToast('⚠️ Please upload at least one image');
            return;
        }
        
        const data = {
            name: document.getElementById('pName').value.trim(),
            category: document.getElementById('pCategory').value,
            price: parseFloat(document.getElementById('pPrice').value),
            originalPrice: parseFloat(document.getElementById('pOriginalPrice').value) || null,
            emoji: '🛒',
            purity: document.getElementById('pPurity').value.trim() || 'Pure',
            unit: document.getElementById('pUnit').value.trim() || 'kg',
            inStock: document.getElementById('pInStock').value === 'true',
            badge: document.getElementById('pBadge').value || '',
            images: uploadedImageUrls,
            video: uploadedVideoUrl || '',
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
            document.getElementById('pUnit').value = data.unit || '';
            document.getElementById('pPurity').value = data.purity || '';
            document.getElementById('pInStock').value = data.inStock ? 'true' : 'false';
            document.getElementById('pBadge').value = data.badge || '';
            document.getElementById('pDescription').value = data.description || '';
            
            // Load existing images
            uploadedImageUrls = data.images || [];
            uploadedVideoUrl = data.video || '';
            
            // Show image previews
            const previewContainer = document.getElementById('imagePreviewContainer');
            previewContainer.innerHTML = '';
            uploadedImageUrls.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid #c49b2c;';
                previewContainer.appendChild(img);
            });
            
            // Show video preview
            const videoContainer = document.getElementById('videoPreviewContainer');
            if (uploadedVideoUrl) {
                videoContainer.innerHTML = `
                    <video src="${uploadedVideoUrl}" controls style="max-width:200px;max-height:150px;border-radius:8px;border:2px solid #c49b2c;"></video>
                `;
            } else {
                videoContainer.innerHTML = '';
            }
            
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
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#999;">No customers found</td></tr>';
            return;
        }
        
        tbody.innerHTML = customers.map(c => `
            <tr>
                <td><strong>${c.name || 'N/A'}</strong></td>
                <td>${c.email || 'N/A'}</td>
                <td>${c.phone || 'N/A'}</td>
                <td>${[c.address, c.pincode].filter(Boolean).join(', ') || 'Not added'}</td>
                <td>${orderCounts[c.uid] || 0}</td>
                <td>${c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('en-IN') : '—'}</td>
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

// ============ COUPONS ============
async function loadCoupons() {
    try {
        const snapshot = await getDocs(collection(db, 'coupons'));
        const coupons = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        const tbody = document.getElementById('couponList');
        if (!tbody) return;
        if (!coupons.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#999;">No coupons created yet</td></tr>';
            return;
        }
        tbody.innerHTML = coupons.map(coupon => {
            const expired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
            const available = coupon.active && !expired;
            return `<tr>
                <td><strong>${coupon.code}</strong></td>
                <td>${coupon.percent}% off</td>
                <td>${coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('en-IN') : 'No expiry'}</td>
                <td><span class="status-badge ${available ? 'status-shipped' : 'status-cancelled'}">${available ? 'Active' : (expired ? 'Expired' : 'Inactive')}</span></td>
                <td>${coupon.createdAt ? new Date(coupon.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                <td><button class="admin-edit-btn" onclick="toggleCoupon('${coupon.id}', ${!coupon.active})">${coupon.active ? 'Disable' : 'Enable'}</button><button class="admin-delete-btn" onclick="deleteCoupon('${coupon.id}')"><i class="fas fa-trash"></i></button></td>
            </tr>`;
        }).join('');
    } catch (error) {
        console.error('Coupon loading error:', error);
        showToast('Unable to load coupons');
    }
}

window.openCouponModal = function() {
    document.getElementById('couponForm').reset();
    document.getElementById('couponActive').checked = true;
    document.getElementById('couponModal').classList.add('active');
};
window.closeCouponModal = function() {
    document.getElementById('couponModal').classList.remove('active');
};
window.toggleCoupon = async function(id, active) {
    try {
        await updateDoc(doc(db, 'coupons', id), { active, updatedAt: new Date().toISOString() });
        showToast(active ? 'Coupon enabled' : 'Coupon disabled');
        loadCoupons();
    } catch (error) { showToast('Unable to update coupon'); }
};
window.deleteCoupon = async function(id) {
    if (!confirm('Delete this coupon permanently?')) return;
    try {
        await deleteDoc(doc(db, 'coupons', id));
        showToast('Coupon deleted');
        loadCoupons();
    } catch (error) { showToast('Unable to delete coupon'); }
};

const couponForm = document.getElementById('couponForm');
if (couponForm) {
    couponForm.addEventListener('submit', async event => {
        event.preventDefault();
        const code = document.getElementById('couponCodeAdmin').value.trim().toUpperCase();
        const percent = Number(document.getElementById('couponPercent').value);
        const expiresAt = document.getElementById('couponExpiry').value;
        const active = document.getElementById('couponActive').checked;
        if (!/^[A-Z0-9_-]{3,24}$/.test(code) || percent < 1 || percent > 100) {
            showToast('Use a valid code and a discount from 1% to 100%.');
            return;
        }
        try {
            const existing = await getDocs(query(collection(db, 'coupons'), where('code', '==', code)));
            if (!existing.empty) { showToast('That coupon code already exists.'); return; }
            await addDoc(collection(db, 'coupons'), {
                code, percent, expiresAt: expiresAt || '', active,
                createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            });
            closeCouponModal();
            showToast('Coupon created successfully');
            loadCoupons();
        } catch (error) {
            console.error('Coupon create error:', error);
            showToast('Unable to create coupon');
        }
    });
}


console.log('✅ Admin script ready!');
