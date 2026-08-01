// ============================================================
// NAVIGATION DATA (الصفحات المطلوبة فقط)
// ============================================================
const SIDEBAR_MENU = [
    { id: 'createOrder', icon: 'fa-clipboard-list', label: 'إنشاء أوردر', page: 'createorder.html' },
    { id: 'preparePermission', icon: 'fa-check-circle', label: 'السماح بالتحضير', page: 'prepare-permission.html' },
    { id: 'prepare', icon: 'fa-utensils', label: 'تحضير الأوردرات', page: 'prepare.html' },
    { id: 'receive', icon: 'fa-boxes', label: 'استلام الأوردرات', page: 'recive.html' },
    { id: 'employees', icon: 'fa-users', label: 'الموظفين', page: 'employees.html' }
];

// ============================================================
// SIDEBAR GENERATION (نفس الشكل تماماً)
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
// AUTHENTICATION CHECK (نفس الوظيفة)
// ============================================================
function checkAuth() {
    const user = localStorage.getItem("currentUser");

    if (!user) {
        window.location.href = "index.html";
        return null;
    }

    const userData = JSON.parse(user);

    return {
        userId: userData.userId,
        username: userData.username,
        fullName: userData.fullName || userData.username,
        role: userData.role,
        permissions: userData.permissions || {}
    };
}

// ============================================================
// LOAD SIDEBAR AND HEADER (نفس الوظيفة)
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
// TOAST NOTIFICATIONS (نفس الوظيفة)
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
// COMMON HELPERS (نفس الوظيفة)
// ============================================================
function getSizeName(sizeId) {
    return sizeId;
}

function getSizeId(sizeName) {
    return sizeName;
}

// ============================================================
// MODAL CLOSE ON OUTSIDE CLICK (نفس الوظيفة)
// ============================================================
function closeModalOnOutsideClick(event, modalId) {
    const modal = document.getElementById(modalId);
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// ============================================================
// EXPOSE GLOBALS (نفس الشيء)
// ============================================================
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
    if (document.getElementById('sidebar')) {
        loadLayout();
    }
});
