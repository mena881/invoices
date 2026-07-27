// ============================================================
// subscription.js - نظام التحقق من الاشتراك المتكامل v2.0
// ============================================================

// رابط الـ Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbysZjQMWPbmY4N1wOUhzrvI_fx3LgQvORh-a3eEE2KSbIwH0TURgOnc45PHQ4LlLEh-/exec';

// مفاتيح التخزين المحلي
const STORAGE_KEY = 'subscription_data';
const CODE_KEY = 'subscription_code';
const USER_KEY = 'currentUser';

// ============================================================
// 1. دوال التحقق من الكود مع السيرفر
// ============================================================

/**
 * التحقق من الكود مع السيرفر
 * @param {string} code كود الاشتراك
 * @returns {Promise<Object>} نتيجة التحقق
 */
async function verifyCodeWithServer(code) {
    try {
        const response = await fetch(`${SCRIPT_URL}?code=${encodeURIComponent(code)}&t=${Date.now()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ خطأ في التحقق من الكود:', error);
        throw error;
    }
}

// ============================================================
// 2. دوال جلب بيانات الاشتراك
// ============================================================

/**
 * جلب بيانات الاشتراك من السيرفر (تحديث فوري)
 * @returns {Promise<Object>} بيانات الاشتراك
 */
async function fetchSubscriptionFromServer() {
    try {
        console.log('🔄 جاري جلب بيانات الاشتراك من السيرفر...');
        const response = await fetch(`${SCRIPT_URL}?t=${Date.now()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('📊 بيانات الاشتراك المستلمة:', data);
        
        // تخزين البيانات في التخزين المحلي
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));
        
        return data;
    } catch (error) {
        console.error('❌ فشل في جلب بيانات الاشتراك:', error);
        // في حالة الخطأ، محاولة استخدام البيانات المخزنة مؤقتاً
        const cachedData = localStorage.getItem(STORAGE_KEY);
        if (cachedData) {
            const parsed = JSON.parse(cachedData);
            console.log('📦 استخدام البيانات المخزنة مؤقتاً:', parsed.data);
            return parsed.data;
        }
        throw error;
    }
}

/**
 * التحقق من حالة الاشتراك المخزنة
 * @returns {Promise<Object>} حالة الاشتراك
 */
async function checkSubscription() {
    return await fetchSubscriptionFromServer();
}

// ============================================================
// 3. دوال التحقق من الصلاحية
// ============================================================

/**
 * التحقق من صلاحية الاشتراك وعرض النتائج في الكونسول
 * @param {Object} subscriptionData بيانات الاشتراك
 * @returns {Object} { isValid: boolean, status: string, message: string, remainingDays: number }
 */
function validateSubscription(subscriptionData) {
    console.log('🔍 بدء التحقق من صلاحية الاشتراك...');
    
    if (!subscriptionData || !subscriptionData.success) {
        console.log('❌ بيانات الاشتراك غير صالحة');
        return {
            isValid: false,
            status: 'Invalid',
            message: 'بيانات الاشتراك غير صالحة',
            remainingDays: 0
        };
    }

    const { status, remainingDays, code, startDate, activationDuration } = subscriptionData;

    // عرض معلومات الاشتراك في الكونسول
    console.log('📋 معلومات الاشتراك:');
    console.log(`   🆔 كود الاشتراك: ${code}`);
    console.log(`   📅 تاريخ البدء: ${startDate}`);
    console.log(`   ⏱ مدة التفعيل: ${activationDuration} شهر`);
    console.log(`   📊 الحالة: ${status}`);
    console.log(`   📆 الأيام المتبقية: ${remainingDays} يوم`);

    // التحقق من الحالة
    if (status === 'Expired') {
        console.log('❌ الاشتراك منتهي الصلاحية');
        return {
            isValid: false,
            status: 'Expired',
            message: `❗ انتهت صلاحية الاشتراك (الكود: ${code})`,
            remainingDays: remainingDays || 0
        };
    }

    if (status === 'Active' && remainingDays !== undefined) {
        if (remainingDays > 0) {
            console.log(`✅ الاشتراك نشط - متبقي ${remainingDays} يوم`);
            if (remainingDays <= 3) {
                console.log(`⚠️ تنبيه: الاشتراك سينتهي خلال ${remainingDays} أيام فقط!`);
            }
        } else {
            console.log('⚠️ الاشتراك نشط ولكن لم يتبق أيام (سينتهي اليوم)');
            return {
                isValid: false,
                status: 'Expired',
                message: `❗ انتهت صلاحية الاشتراك اليوم (الكود: ${code})`,
                remainingDays: 0
            };
        }
        
        return {
            isValid: true,
            status: 'Active',
            message: `✅ الاشتراك نشط - متبقي ${remainingDays} يوم`,
            remainingDays: remainingDays
        };
    }

    console.log(`⚠️ حالة غير معروفة: ${status || 'غير محدد'}`);
    return {
        isValid: false,
        status: status || 'Unknown',
        message: `⚠️ حالة غير معروفة: ${status || 'غير محدد'}`,
        remainingDays: remainingDays || 0
    };
}

// ============================================================
// 4. دوال إدارة الكود المخزن
// ============================================================

/**
 * حفظ الكود في التخزين المحلي
 */
function saveCode(code) {
    localStorage.setItem(CODE_KEY, code);
    console.log(`💾 تم حفظ الكود: ${code}`);
}

/**
 * جلب الكود المخزن
 */
function getSavedCode() {
    return localStorage.getItem(CODE_KEY);
}

/**
 * حذف الكود المخزن
 */
function clearSavedCode() {
    localStorage.removeItem(CODE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑 تم حذف الكود المخزن');
}

// ============================================================
// 5. دوال عرض الحالة في الواجهة
// ============================================================

/**
 * عرض رسالة في الكونسول وفي الواجهة
 */
function showMessage(elementId, message, type = 'error') {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        element.className = `message-box message-${type}`;
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
    console.log(`${type === 'error' ? '❌' : type === 'success' ? '✅' : '⚠️'} ${message}`);
}

/**
 * عرض حالة الاشتراك في الواجهة
 */
function showSubscriptionStatus(subscriptionData) {
    const statusDiv = document.getElementById('subscriptionStatus');
    if (statusDiv && subscriptionData) {
        statusDiv.style.display = 'block';
        const days = subscriptionData.remainingDays || 0;
        statusDiv.textContent = `✅ الاشتراك نشط - متبقي ${days} يوم`;
        
        if (days <= 3) {
            statusDiv.className = 'subscription-status warning';
            statusDiv.textContent = `⚠️ تنبيه: الاشتراك سينتهي خلال ${days} أيام`;
        } else {
            statusDiv.className = 'subscription-status active';
        }
    }
}

// ============================================================
// 6. دوال التحقق من الكود المدخل
// ============================================================

/**
 * التحقق من الكود المدخل
 */
async function verifyCode() {
    const input = document.getElementById('activationCode');
    const code = input?.value?.trim()?.toUpperCase();

    if (!code) {
        showMessage('codeError', '⚠️ يرجى إدخال كود التفعيل');
        input?.focus();
        return;
    }

    console.log(`🔑 جاري التحقق من الكود: ${code}`);

    const btn = document.querySelector('#verifyBtn');
    const originalText = btn?.textContent || 'تحقق';
    if (btn) {
        btn.textContent = '⏳ جاري التحقق...';
        btn.disabled = true;
    }

    try {
        const result = await verifyCodeWithServer(code);
        console.log('📊 نتيجة التحقق من السيرفر:', result);

        if (result.success && result.status === 'Active') {
            saveCode(code);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                data: result,
                timestamp: Date.now()
            }));
            
            showMessage('codeSuccess', `✅ تم التفعيل بنجاح! متبقي ${result.remainingDays} يوم`, 'success');
            
            console.log('🎉 تم تفعيل الاشتراك بنجاح!');
            console.log(`   📅 تاريخ البدء: ${result.startDate}`);
            console.log(`   ⏱ مدة التفعيل: ${result.activationDuration} شهر`);
            console.log(`   📆 الأيام المتبقية: ${result.remainingDays} يوم`);
            
            if (btn) {
                btn.textContent = '✅ تم التفعيل';
                btn.style.background = '#4caf50';
            }
            
            setTimeout(() => {
                // إعادة تحميل الصفحة لعرض البيانات المحدثة
                window.location.reload();
            }, 1500);
        } else {
            const errorMsg = result.message || '❌ كود التفعيل غير صالح أو منتهي الصلاحية';
            showMessage('codeError', errorMsg);
            console.log(`❌ الكود غير صالح: ${errorMsg}`);
            
            if (btn) {
                btn.textContent = originalText;
                btn.disabled = false;
            }
            input?.select();
        }
    } catch (error) {
        console.error('❌ خطأ في التحقق:', error);
        showMessage('codeError', '⚠️ حدث خطأ في التحقق، يرجى المحاولة مرة أخرى');
        
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}

// ============================================================
// 7. الوظيفة الرئيسية للتحقق من الاشتراك
// ============================================================

/**
 * التحقق من الاشتراك عند تحميل الصفحة (الوظيفة الرئيسية)
 * يتم استدعاؤها تلقائياً عند تحميل أي صفحة
 */
async function checkSubscriptionOnLoad() {
    console.log('🚀 ===== بدء التحقق من الاشتراك =====');
    console.log(`📅 الوقت: ${new Date().toLocaleString('ar-EG')}`);
    console.log(`🌐 الصفحة: ${window.location.pathname}`);
    
    try {
        const savedCode = getSavedCode();
        
        if (!savedCode) {
            console.log('ℹ️ لا يوجد كود اشتراك مخزن');
            showCodeSection();
            console.log('🚀 ===== انتهى التحقق (لا يوجد كود) =====');
            return false;
        }

        console.log(`🔑 الكود المخزن: ${savedCode}`);

        // جلب بيانات الاشتراك من السيرفر (تحديث فوري)
        const subscriptionData = await fetchSubscriptionFromServer();
        console.log('📊 بيانات الاشتراك المستلمة:', subscriptionData);

        // التحقق من الصلاحية
        const validationResult = validateSubscription(subscriptionData);
        console.log('📊 نتيجة التحقق النهائية:', validationResult);

        // عرض المدة الجديدة في الكونسول بشكل مميز
        console.log('💡 ===== معلومات الاشتراك المحدثة =====');
        console.log(`   ✅ الحالة: ${validationResult.status}`);
        console.log(`   📆 الأيام المتبقية: ${validationResult.remainingDays} يوم`);
        console.log(`   📝 الرسالة: ${validationResult.message}`);
        console.log('💡 =====================================');

        if (validationResult.isValid) {
            console.log('✅ الاشتراك صالح، مرحباً بك!');
            showLoginSection();
            showSubscriptionStatus(subscriptionData);
            console.log('🚀 ===== انتهى التحقق بنجاح =====');
            return true;
        } else {
            console.log('❌ الاشتراك غير صالح:', validationResult.message);
            showCodeSection();
            showMessage('codeError', `⚠️ ${validationResult.message}. يرجى إدخال كود جديد.`);
            clearSavedCode();
            console.log('🚀 ===== انتهى التحقق (الاشتراك منتهي) =====');
            return false;
        }
    } catch (error) {
        console.error('❌ فشل التحقق من الاشتراك:', error);
        console.log('🚀 ===== انتهى التحقق بخطأ =====');
        showCodeSection();
        showMessage('codeError', '⚠️ تعذر التحقق من الاشتراك، يرجى إدخال الكود يدوياً');
        return false;
    }
}

// ============================================================
// 8. دوال التحكم في عرض الأقسام
// ============================================================

/**
 * إظهار قسم إدخال الكود وإخفاء قسم تسجيل الدخول
 */
function showCodeSection() {
    const codeSection = document.getElementById('codeSection');
    const loginSection = document.getElementById('loginSection');
    if (codeSection) codeSection.style.display = 'block';
    if (loginSection) loginSection.style.display = 'none';
    console.log('📌 تم عرض صفحة إدخال الكود');
}

/**
 * إظهار قسم تسجيل الدخول وإخفاء قسم إدخال الكود
 */
function showLoginSection() {
    const codeSection = document.getElementById('codeSection');
    const loginSection = document.getElementById('loginSection');
    if (codeSection) codeSection.style.display = 'none';
    if (loginSection) loginSection.style.display = 'block';
    console.log('📌 تم عرض نموذج تسجيل الدخول');
}

// ============================================================
// 9. دوال إعادة تعيين الاشتراك
// ============================================================

/**
 * إعادة تعيين الاشتراك (تغيير الكود)
 */
function resetSubscription() {
    if (confirm('هل أنت متأكد من رغبتك في تغيير كود الاشتراك؟')) {
        clearSavedCode();
        showCodeSection();
        const input = document.getElementById('activationCode');
        if (input) {
            input.value = '';
            input.focus();
        }
        const errorDiv = document.getElementById('codeError');
        const successDiv = document.getElementById('codeSuccess');
        if (errorDiv) errorDiv.style.display = 'none';
        if (successDiv) successDiv.style.display = 'none';
        
        const btn = document.getElementById('verifyBtn');
        if (btn) {
            btn.textContent = '🔓 تحقق من الكود';
            btn.style.background = '';
            btn.disabled = false;
        }
        console.log('🔄 تم إعادة تعيين الاشتراك');
    }
}

// ============================================================
// 10. دوال تسجيل الدخول (للتكامل مع Firebase)
// ============================================================

/**
 * تسجيل الدخول (يتم استدعاؤها من الصفحة)
 */
async function login() {
    const username = document.getElementById('username')?.value?.trim();
    const password = document.getElementById('password')?.value;
    const errorDiv = document.getElementById('loginError');

    if (!username || !password) {
        if (errorDiv) {
            errorDiv.textContent = 'يرجى إدخال اسم المستخدم وكلمة المرور';
            errorDiv.style.display = 'block';
            setTimeout(() => { errorDiv.style.display = 'none'; }, 3000);
        }
        return;
    }

    try {
        // التحقق من المستخدم (admin أولاً)
        if (username === 'admin') {
            const adminSnapshot = await firebase.database().ref('users/admin').once('value');
            if (adminSnapshot.exists() && adminSnapshot.val().password === password) {
                localStorage.setItem(USER_KEY, JSON.stringify({
                    username: 'admin',
                    role: 'admin',
                    fullName: 'مدير النظام'
                }));
                window.location.href = 'admin-dashboard.html';
                return;
            }
        }

        // التحقق من الموظفين
        const usersSnapshot = await firebase.database().ref('users').once('value');
        let found = false;
        usersSnapshot.forEach((childSnapshot) => {
            const user = childSnapshot.val();
            if (user.username === username && user.password === password && user.role === 'employee') {
                found = true;
                localStorage.setItem(USER_KEY, JSON.stringify({
                    id: childSnapshot.key,
                    username: user.username,
                    role: user.role,
                    fullName: user.fullName
                }));
                window.location.href = 'user-dashboard.html';
            }
        });

        if (!found && errorDiv) {
            errorDiv.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
            errorDiv.style.display = 'block';
            setTimeout(() => { errorDiv.style.display = 'none'; }, 3000);
        }
    } catch (error) {
        console.error('Login error:', error);
        if (errorDiv) {
            errorDiv.textContent = 'حدث خطأ في تسجيل الدخول';
            errorDiv.style.display = 'block';
            setTimeout(() => { errorDiv.style.display = 'none'; }, 3000);
        }
    }
}

// ============================================================
// 11. دوال التحقق من حالة المستخدم
// ============================================================

/**
 * التحقق من حالة تسجيل الدخول
 */
function getCurrentUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
}

/**
 * تسجيل الخروج
 */
function logout() {
    localStorage.removeItem(USER_KEY);
    window.location.href = 'index.html';
}

// ============================================================
// 12. تهيئة النظام
// ============================================================

/**
 * تهيئة نظام الاشتراك
 */
function initSubscriptionSystem() {
    console.log('🌟 ===== تهيئة نظام الاشتراك =====');
    console.log(`🌐 الصفحة: ${window.location.pathname}`);
    console.log(`🕐 الوقت: ${new Date().toLocaleString('ar-EG')}`);
    
    // تنفيذ التحقق بعد تحميل الصفحة بالكامل
    if (document.readyState === 'complete') {
        setTimeout(() => {
            checkSubscriptionOnLoad();
        }, 200);
    } else {
        window.addEventListener('load', function() {
            setTimeout(() => {
                checkSubscriptionOnLoad();
            }, 200);
        });
    }
}

// ============================================================
// 13. جعل الدوال متاحة عالمياً
// ============================================================

window.verifyCode = verifyCode;
window.checkSubscriptionOnLoad = checkSubscriptionOnLoad;
window.initSubscriptionSystem = initSubscriptionSystem;
window.resetSubscription = resetSubscription;
window.clearSavedCode = clearSavedCode;
window.login = login;
window.logout = logout;
window.getCurrentUser = getCurrentUser;
window.saveCode = saveCode;
window.getSavedCode = getSavedCode;
window.showMessage = showMessage;
window.showSubscriptionStatus = showSubscriptionStatus;
window.showCodeSection = showCodeSection;
window.showLoginSection = showLoginSection;
window.validateSubscription = validateSubscription;
window.fetchSubscriptionFromServer = fetchSubscriptionFromServer;
window.verifyCodeWithServer = verifyCodeWithServer;

// ============================================================
// 14. دعم مفتاح Enter
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    const codeInput = document.getElementById('activationCode');
    if (codeInput) {
        codeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                verifyCode();
            }
        });
    }
    
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                login();
            }
        });
    }
    
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const password = document.getElementById('password');
                if (password) password.focus();
            }
        });
    }
});

// ============================================================
// 15. بدء التهيئة التلقائية
// ============================================================

// بدء التهيئة عند تحميل الصفحة
initSubscriptionSystem();

// إعادة التحقق عند العودة إلى الصفحة (من back/forward)
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        console.log('🔄 إعادة التحقق من الاشتراك (من الكاش)');
        setTimeout(() => {
            checkSubscriptionOnLoad();
        }, 300);
    }
});

console.log('✅ تم تحميل ملف subscription.js بنجاح');
console.log('📌 سيتم التحقق من الاشتراك تلقائياً عند تحميل أي صفحة');

// ============================================================
// نهاية الملف
// ============================================================
