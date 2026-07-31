// ============================================================
// FIREBASE CONFIG & INIT
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyB7TgP9zI6LEc6yqfUyZqWYBqJyqL8oGxs",
    authDomain: "exams-fab0f.firebaseapp.com",
    databaseURL: "https://exams-fab0f-default-rtdb.firebaseio.com",
    projectId: "exams-fab0f",
    storageBucket: "exams-fab0f.firebasestorage.app",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abc123def456"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();

// ============================================================
// NAVIGATION DATA
// ============================================================
const SIDEBAR_MENU = [
    { id: 'dashboard', icon: 'fa-chart-line', label: 'لوحة التحكم', page: 'admin-dashboard.html' },
    { id: 'addReceipt', icon: 'fa-plus-circle', label: 'إضافة استلام', page: 'add-receipt.html' },
    { id: 'receiptsList', icon: 'fa-list-ul', label: 'جميع الاستلامات', page: 'receipts-list.html' },
    { id: 'factories', icon: 'fa-industry', label: 'المصانع', page: 'factories.html' },
    { id: 'models', icon: 'fa-tshirt', label: 'الموديلات', page: 'models.html' },
    { id: 'sizes', icon: 'fa-ruler', label: 'المقاسات', page: 'sizes.html' },
    { id: 'employees', icon: 'fa-users', label: 'الموظفين', page: 'employees.html' },
    { id: 'branchOrders', icon: 'fa-store', label: 'أوردرات الفروع', page: 'branch-orders.html' } ,
    { id: 'allretrun', icon: 'fa-rotate-left', label: 'جميع المرتجعات', page: 'allretrun.html' } ,
    { id: 'reports', icon: 'fa-chart-bar', label: 'التقارير', page: 'reports.html' },
    { id: 'adminAccount', icon: 'fa-solid fa-gear', label: 'اداره حساب الادمن', page: 'admin-account.html' }
];

// ============================================================
// SIDEBAR GENERATION
// ============================================================
function generateSidebar() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const menuItems = SIDEBAR_MENU.map(item => {
        const isActive = item.page === currentPage;
        return `
            <li class="${isActive ? 'active' : ''}" onclick="navigateTo('${item.page}')">
                <i class="fas ${item.icon}"></i> ${item.label}
            </li>
        `;
    }).join('');

    return `
        <div class="sidebar-header">
            <div class="logo-icon"><i class="fas fa-clipboard-list"></i></div>
            <h2>نظام الاستلامات</h2>
            <p>لوحة تحكم الأدمن المتقدمة</p>
        </div>
        <ul class="sidebar-menu">
            ${menuItems}
        </ul>
        <button class="logout-btn" onclick="logout()">
            <i class="fas fa-sign-out-alt"></i> تسجيل الخروج
        </button>
    `;
}

function navigateTo(page) {
    window.location.href = page;
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// ============================================================
// AUTHENTICATION CHECK
// ============================================================
function checkAuth() {
    const user = localStorage.getItem('currentUser');
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    const userData = JSON.parse(user);
    if (userData.role !== 'admin') {
        window.location.href = 'user-dashboard.html';
        return null;
    }
    return {
        userId: userData.userId || 'admin',
        username: userData.username || 'admin',
        fullName: userData.fullName || 'مدير النظام'
    };
}

// ============================================================
// LOAD SIDEBAR AND HEADER
// ============================================================
function loadLayout() {
    const user = checkAuth();
    if (!user) return;

    // Load sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.innerHTML = generateSidebar();
    }

    // Update user info
    const userNameDisplay = document.getElementById('currentAdminName');
    if (userNameDisplay) {
        userNameDisplay.innerHTML = `مرحباً، ${user.fullName}`;
    }

    return user;
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, isError = false) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast${isError ? ' error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============================================================
// COMMON HELPERS
// ============================================================
function getSizeName(sizeId) {
    // Will be populated by each page
    return sizeId;
}

function getSizeId(sizeName) {
    return sizeName;
}

// ============================================================
// MODAL CLOSE ON OUTSIDE CLICK
// ============================================================
function closeModalOnOutsideClick(event, modalId) {
    const modal = document.getElementById(modalId);
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// ============================================================
// EXPOSE GLOBALS
// ============================================================
window.db = db;
window.storage = storage;
window.SIDEBAR_MENU = SIDEBAR_MENU;
window.navigateTo = navigateTo;
window.logout = logout;
window.checkAuth = checkAuth;
window.loadLayout = loadLayout;
window.showToast = showToast;
window.getSizeName = getSizeName;
window.getSizeId = getSizeId;
window.closeModalOnOutsideClick = closeModalOnOutsideClick;

// Auto-load layout when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // For pages with sidebar, load layout
    if (document.getElementById('sidebar')) {
        loadLayout();
    }
});
