// subscription.js - ملف للتحقق من الاشتراك وإدارة الصلاحيات

// رابط الـ Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbysZjQMWPbmY4N1wOUhzrvI_fx3LgQvORh-a3eEE2KSbIwH0TURgOnc45PHQ4LlLEh-/exec';

// مفتاح التخزين المحلي
const STORAGE_KEY = 'subscription_data';
const CODE_KEY = 'subscription_code';

/**
 * التحقق من الكود مع السيرفر
 * @param {string} code كود الاشتراك
 * @returns {Promise<Object>} نتيجة التحقق
 */
async function verifyCodeWithServer(code) {
    try {
        const response = await fetch(`${SCRIPT_URL}?code=${encodeURIComponent(code)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('خطأ في التحقق من الكود:', error);
        throw error;
    }
}

/**
 * التحقق من حالة الاشتراك المخزنة
 * @returns {Promise<Object>} حالة الاشتراك
 */
async function checkSubscription() {
    try {
        // محاولة جلب البيانات من التخزين المحلي أولاً
        const cachedData = localStorage.getItem(STORAGE_KEY);
        if (cachedData) {
            const parsed = JSON.parse(cachedData);
            // إذا كانت البيانات مخزنة ولم تنتهي صلاحيتها (نفس اليوم)
            if (parsed.timestamp && (Date.now() - parsed.timestamp < 3600000)) { // ساعة واحدة
                return parsed.data;
            }
        }

        // جلب البيانات من السيرفر
        const response = await fetch(SCRIPT_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // تخزين البيانات في التخزين المحلي
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));
        
        return data;
    } catch (error) {
        console.error('خطأ في التحقق من الاشتراك:', error);
        // في حالة الخطأ، محاولة استخدام البيانات المخزنة مؤقتاً
        const cachedData = localStorage.getItem(STORAGE_KEY);
        if (cachedData) {
            const parsed = JSON.parse(cachedData);
            return parsed.data;
        }
        throw error;
    }
}

/**
 * التحقق من صلاحية الاشتراك
 * @param {Object} subscriptionData بيانات الاشتراك
 * @returns {Object} { isValid: boolean, status: string, message: string }
 */
function validateSubscription(subscriptionData) {
    if (!subscriptionData || !subscriptionData.success) {
        return {
            isValid: false,
            status: 'Invalid',
            message: 'بيانات الاشتراك غير صالحة'
        };
    }

    const { status, remainingDays, code } = subscriptionData;

    // التحقق من الحالة
    if (status === 'Expired') {
        return {
            isValid: false,
            status: 'Expired',
            message: `❗ انتهت صلاحية الاشتراك (الكود: ${code})`,
            remainingDays: remainingDays || 0
        };
    }

    if (status === 'Active' && remainingDays !== undefined && remainingDays > 0) {
        return {
            isValid: true,
            status: 'Active',
            message: `✅ الاشتراك نشط - متبقي ${remainingDays} يوم`,
            remainingDays: remainingDays
        };
    }

    if (status === 'Active' && remainingDays === 0) {
        return {
            isValid: false,
            status: 'Expired',
            message: `❗ انتهت صلاحية الاشتراك اليوم (الكود: ${code})`,
            remainingDays: 0
        };
    }

    // حالات أخرى
    return {
        isValid: false,
        status: status || 'Unknown',
        message: `⚠️ حالة غير معروفة: ${status || 'غير محدد'}`,
        remainingDays: remainingDays || 0
    };
}

/**
 * حفظ الكود في التخزين المحلي
 * @param {string} code كود الاشتراك
 */
function saveCode(code) {
    localStorage.setItem(CODE_KEY, code);
}

/**
 * جلب الكود المخزن
 * @returns {string|null} الكود المخزن
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
}

/**
 * عرض رسالة خطأ
 */
function showCodeError(message) {
    const errorDiv = document.getElementById('codeError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 4000);
    }
}

/**
 * عرض رسالة نجاح
 */
function showCodeSuccess(message) {
    const successDiv = document.getElementById('codeSuccess');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 4000);
    }
}

/**
 * التحقق من الكود المدخل
 */
async function verifyCode() {
    const input = document.getElementById('activationCode');
    const errorDiv = document.getElementById('codeError');
    const successDiv = document.getElementById('codeSuccess');
    const code = input.value.trim().toUpperCase();

    // إخفاء الرسائل السابقة
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';

    if (!code) {
        showCodeError('⚠️ يرجى إدخال كود التفعيل');
        input.focus();
        return;
    }

    // إظهار حالة التحميل
    const btn = document.querySelector('#verifyBtn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ جاري التحقق...';
    btn.disabled = true;

    try {
        // التحقق من الكود مع السيرفر
        const result = await verifyCodeWithServer(code);
        console.log('نتيجة التحقق:', result);

        if (result.success && result.status === 'Active') {
            // الكود صالح
            saveCode(code);
            // تخزين بيانات الاشتراك
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                data: result,
                timestamp: Date.now()
            }));
            
            // عرض رسالة نجاح
            showCodeSuccess(`✅ تم التفعيل بنجاح! متبقي ${result.remainingDays} يوم`);
            
            // إعادة تعيين الزر
            btn.textContent = '✅ تم التفعيل';
            btn.style.background = '#4caf50';
            
            // إظهار نموذج تسجيل الدخول بعد 1.5 ثانية
            setTimeout(() => {
                // إخفاء قسم إدخال الكود
                document.getElementById('codeSection').style.display = 'none';
                // إظهار نموذج تسجيل الدخول
                document.getElementById('loginSection').style.display = 'block';
                // إظهار حالة الاشتراك
                showSubscriptionStatus(result);
            }, 1500);
        } else {
            // الكود غير صالح
            const errorMsg = result.message || '❌ كود التفعيل غير صالح أو منتهي الصلاحية';
            showCodeError(errorMsg);
            
            // إعادة تعيين الزر
            btn.textContent = originalText;
            btn.disabled = false;
            
            // تحديد النص
            input.select();
        }
    } catch (error) {
        console.error('خطأ في التحقق:', error);
        showCodeError('⚠️ حدث خطأ في التحقق، يرجى المحاولة مرة أخرى');
        
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

/**
 * عرض حالة الاشتراك
 */
function showSubscriptionStatus(subscriptionData) {
    const statusDiv = document.getElementById('subscriptionStatus');
    if (statusDiv && subscriptionData) {
        statusDiv.style.display = 'block';
        const days = subscriptionData.remainingDays || 0;
        statusDiv.textContent = `✅ الاشتراك نشط - متبقي ${days} يوم`;
        
        // إذا تبقى أقل من 3 أيام، تغيير اللون للتحذير
        if (days <= 3) {
            statusDiv.style.background = '#fff3e0';
            statusDiv.style.color = '#e65100';
            statusDiv.textContent = `⚠️ تنبيه: الاشتراك سينتهي خلال ${days} أيام`;
        }
    }
}

/**
 * التحقق من الاشتراك عند تحميل الصفحة
 */
async function checkSubscriptionOnLoad() {
    try {
        // التحقق من وجود كود مخزن
        const savedCode = getSavedCode();
        
        if (!savedCode) {
            // لا يوجد كود - عرض قسم إدخال الكود
            document.getElementById('codeSection').style.display = 'block';
            document.getElementById('loginSection').style.display = 'none';
            return false;
        }

        // جلب بيانات الاشتراك
        const subscriptionData = await checkSubscription();
        console.log('بيانات الاشتراك:', subscriptionData);

        // التحقق من الصلاحية
        const validationResult = validateSubscription(subscriptionData);
        console.log('نتيجة التحقق:', validationResult);

        if (validationResult.isValid) {
            // الاشتراك صالح - عرض نموذج تسجيل الدخول
            document.getElementById('codeSection').style.display = 'none';
            document.getElementById('loginSection').style.display = 'block';
            showSubscriptionStatus(subscriptionData);
            return true;
        } else {
            // الاشتراك منتهي - عرض قسم إدخال الكود مع رسالة
            document.getElementById('codeSection').style.display = 'block';
            document.getElementById('loginSection').style.display = 'none';
            showCodeError(`⚠️ ${validationResult.message}. يرجى إدخال كود جديد.`);
            // حذف الكود المنتهي
            clearSavedCode();
            return false;
        }
    } catch (error) {
        console.error('فشل التحقق من الاشتراك:', error);
        // في حالة الخطأ، عرض قسم إدخال الكود
        document.getElementById('codeSection').style.display = 'block';
        document.getElementById('loginSection').style.display = 'none';
        showCodeError('⚠️ تعذر التحقق من الاشتراك، يرجى إدخال الكود يدوياً');
        return false;
    }
}

// جعل الدوال متاحة عالمياً
window.verifyCode = verifyCode;
window.checkSubscriptionOnLoad = checkSubscriptionOnLoad;

// تصدير الدوال للاستخدام في الصفحات الأخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkSubscription,
        validateSubscription,
        checkSubscriptionOnLoad,
        verifyCodeWithServer,
        saveCode,
        getSavedCode,
        clearSavedCode,
        SCRIPT_URL,
        STORAGE_KEY,
        CODE_KEY
    };
}