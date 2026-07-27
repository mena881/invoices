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
        console.error('❌ خطأ في التحقق من الكود:', error);
        throw error;
    }
}

/**
 * التحقق من حالة الاشتراك المخزنة
 * @returns {Promise<Object>} حالة الاشتراك
 */
async function checkSubscription() {
    try {
        console.log('🔄 جاري التحقق من الاشتراك...');
        
        // جلب البيانات من السيرفر مباشرة (بدون استخدام الكاش)
        const response = await fetch(`${SCRIPT_URL}?t=${Date.now()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 بيانات الاشتراك المستلمة:', data);
        
        // تخزين البيانات في التخزين المحلي مع الوقت
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
        // عرض رسالة حسب عدد الأيام المتبقية
        if (remainingDays > 0) {
            console.log(`✅ الاشتراك نشط - متبقي ${remainingDays} يوم`);
            
            // تحذير إذا كانت الأيام المتبقية قليلة
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

    // حالات أخرى
    console.log(`⚠️ حالة غير معروفة: ${status || 'غير محدد'}`);
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
    console.log(`💾 تم حفظ الكود: ${code}`);
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
    console.log('🗑 تم حذف الكود المخزن');
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
    console.log(`❌ ${message}`);
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
    console.log(`✅ ${message}`);
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

    console.log(`🔑 جاري التحقق من الكود: ${code}`);

    // إظهار حالة التحميل
    const btn = document.querySelector('#verifyBtn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ جاري التحقق...';
    btn.disabled = true;

    try {
        // التحقق من الكود مع السيرفر
        const result = await verifyCodeWithServer(code);
        console.log('📊 نتيجة التحقق من السيرفر:', result);

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
            
            // عرض معلومات إضافية في الكونسول
            console.log('🎉 تم تفعيل الاشتراك بنجاح!');
            console.log(`   📅 تاريخ البدء: ${result.startDate}`);
            console.log(`   ⏱ مدة التفعيل: ${result.activationDuration} شهر`);
            console.log(`   📆 الأيام المتبقية: ${result.remainingDays} يوم`);
            
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
            console.log(`❌ الكود غير صالح: ${errorMsg}`);
            
            // إعادة تعيين الزر
            btn.textContent = originalText;
            btn.disabled = false;
            
            // تحديد النص
            input.select();
        }
    } catch (error) {
        console.error('❌ خطأ في التحقق:', error);
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
        
        console.log(`📊 تم عرض حالة الاشتراك: ${statusDiv.textContent}`);
    }
}

/**
 * التحقق من الاشتراك عند تحميل الصفحة (الوظيفة الرئيسية)
 * يتم استدعاؤها تلقائياً عند تحميل أي صفحة
 */
async function checkSubscriptionOnLoad() {
    console.log('🚀 ===== بدء التحقق من الاشتراك =====');
    console.log(`📅 الوقت: ${new Date().toLocaleString('ar-EG')}`);
    
    try {
        // التحقق من وجود كود مخزن
        const savedCode = getSavedCode();
        
        if (!savedCode) {
            console.log('ℹ️ لا يوجد كود اشتراك مخزن');
            // لا يوجد كود - عرض قسم إدخال الكود
            const codeSection = document.getElementById('codeSection');
            const loginSection = document.getElementById('loginSection');
            if (codeSection) codeSection.style.display = 'block';
            if (loginSection) loginSection.style.display = 'none';
            console.log('📌 تم عرض صفحة إدخال الكود');
            console.log('🚀 ===== انتهى التحقق =====');
            return false;
        }

        console.log(`🔑 الكود المخزن: ${savedCode}`);

        // جلب بيانات الاشتراك من السيرفر (تحديث فوري)
        const subscriptionData = await checkSubscription();
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
            // الاشتراك صالح - عرض نموذج تسجيل الدخول
            console.log('✅ الاشتراك صالح، مرحباً بك!');
            
            const codeSection = document.getElementById('codeSection');
            const loginSection = document.getElementById('loginSection');
            if (codeSection) codeSection.style.display = 'none';
            if (loginSection) loginSection.style.display = 'block';
            
            showSubscriptionStatus(subscriptionData);
            console.log('📌 تم عرض نموذج تسجيل الدخول');
            console.log('🚀 ===== انتهى التحقق بنجاح =====');
            return true;
        } else {
            // الاشتراك منتهي - عرض قسم إدخال الكود مع رسالة
            console.log('❌ الاشتراك غير صالح:', validationResult.message);
            
            const codeSection = document.getElementById('codeSection');
            const loginSection = document.getElementById('loginSection');
            if (codeSection) codeSection.style.display = 'block';
            if (loginSection) loginSection.style.display = 'none';
            
            showCodeError(`⚠️ ${validationResult.message}. يرجى إدخال كود جديد.`);
            // حذف الكود المنتهي
            clearSavedCode();
            console.log('📌 تم عرض صفحة إدخال الكود (الاشتراك منتهي)');
            console.log('🚀 ===== انتهى التحقق (الاشتراك منتهي) =====');
            return false;
        }
    } catch (error) {
        console.error('❌ فشل التحقق من الاشتراك:', error);
        console.log('🚀 ===== انتهى التحقق بخطأ =====');
        
        // في حالة الخطأ، عرض قسم إدخال الكود
        const codeSection = document.getElementById('codeSection');
        const loginSection = document.getElementById('loginSection');
        if (codeSection) codeSection.style.display = 'block';
        if (loginSection) loginSection.style.display = 'none';
        
        showCodeError('⚠️ تعذر التحقق من الاشتراك، يرجى إدخال الكود يدوياً');
        return false;
    }
}

/**
 * وظيفة التهيئة - يتم استدعاؤها عند تحميل الصفحة
 * تقوم بالتحقق من الاشتراك وعرض النتائج في الكونسول
 */
function initSubscriptionCheck() {
    console.log('🌟 ===== تهيئة نظام الاشتراك =====');
    console.log(`🌐 الصفحة: ${window.location.pathname}`);
    console.log(`🕐 الوقت: ${new Date().toLocaleString('ar-EG')}`);
    
    // تنفيذ التحقق بعد تحميل الصفحة بالكامل
    if (document.readyState === 'complete') {
        // الصفحة محملة بالكامل
        setTimeout(() => {
            checkSubscriptionOnLoad();
        }, 100);
    } else {
        // انتظار تحميل الصفحة
        window.addEventListener('load', function() {
            setTimeout(() => {
                checkSubscriptionOnLoad();
            }, 100);
        });
    }
}

// ===== جعل الدوال متاحة عالمياً =====
window.verifyCode = verifyCode;
window.checkSubscriptionOnLoad = checkSubscriptionOnLoad;
window.initSubscriptionCheck = initSubscriptionCheck;
window.clearSavedCode = clearSavedCode;
window.resetSubscription = function() {
    if (confirm('هل أنت متأكد من رغبتك في تغيير كود الاشتراك؟')) {
        clearSavedCode();
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('codeSection').style.display = 'block';
        document.getElementById('activationCode').value = '';
        document.getElementById('activationCode').focus();
        document.getElementById('codeError').style.display = 'none';
        document.getElementById('codeSuccess').style.display = 'none';
        const btn = document.getElementById('verifyBtn');
        if (btn) {
            btn.textContent = '🔓 تحقق من الكود';
            btn.style.background = '';
            btn.disabled = false;
        }
        console.log('🔄 تم إعادة تعيين الاشتراك');
    }
};

// ===== بدء التهيئة التلقائية =====
// يتم تشغيلها عند تحميل الصفحة
initSubscriptionCheck();

// ===== تصدير الدوال للاستخدام في الصفحات الأخرى =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkSubscription,
        validateSubscription,
        checkSubscriptionOnLoad,
        verifyCodeWithServer,
        verifyCode,
        saveCode,
        getSavedCode,
        clearSavedCode,
        initSubscriptionCheck,
        SCRIPT_URL,
        STORAGE_KEY,
        CODE_KEY
    };
}

console.log('✅ تم تحميل ملف subscription.js بنجاح');
console.log('📌 سيتم التحقق من الاشتراك تلقائياً عند تحميل أي صفحة');
