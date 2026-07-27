// ============================================================
// subscription.js - نظام التحقق من الاشتراك (خفيف الوزن)
// ============================================================

// رابط الـ Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbysZjQMWPbmY4N1wOUhzrvI_fx3LgQvORh-a3eEE2KSbIwH0TURgOnc45PHQ4LlLEh-/exec';

// مفاتيح التخزين المحلي
const STORAGE_KEY = 'subscription_data';
const CODE_KEY = 'subscription_code';

// ============================================================
// 1. دوال جلب بيانات الاشتراك
// ============================================================

async function fetchSubscriptionFromServer() {
    try {
        console.log('🔄 جاري جلب بيانات الاشتراك من السيرفر...');
        const response = await fetch(`${SCRIPT_URL}?t=${Date.now()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('📊 بيانات الاشتراك المستلمة:', data);
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));
        
        return data;
    } catch (error) {
        console.error('❌ فشل في جلب بيانات الاشتراك:', error);
        const cachedData = localStorage.getItem(STORAGE_KEY);
        if (cachedData) {
            const parsed = JSON.parse(cachedData);
            console.log('📦 استخدام البيانات المخزنة مؤقتاً:', parsed.data);
            return parsed.data;
        }
        throw error;
    }
}

// ============================================================
// 2. دوال التحقق من الصلاحية
// ============================================================

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

    console.log('📋 معلومات الاشتراك:');
    console.log(`   🆔 كود الاشتراك: ${code}`);
    console.log(`   📅 تاريخ البدء: ${startDate}`);
    console.log(`   ⏱ مدة التفعيل: ${activationDuration} يوم`);
    console.log(`   📊 الحالة: ${status}`);
    console.log(`   📆 الأيام المتبقية: ${remainingDays} يوم`);

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
// 3. دوال إدارة الكود المخزن
// ============================================================

function getSavedCode() {
    return localStorage.getItem(CODE_KEY);
}

function clearSavedCode() {
    localStorage.removeItem(CODE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑 تم حذف الكود المخزن');
}

// ============================================================
// 4. دوال إنشاء البوب اب (يظهر فقط عند انتهاء الصلاحية)
// ============================================================

function createExpiredPopup(message) {
    // التحقق من وجود body
    if (!document.body) {
        console.log('⏳ body غير موجود، سيتم إعادة المحاولة...');
        setTimeout(() => createExpiredPopup(message), 200);
        return;
    }

    // التحقق من وجود البوب اب بالفعل
    if (document.getElementById('subscriptionExpiredPopup')) {
        return;
    }

    try {
        // إنشاء الـ Overlay
        const overlay = document.createElement('div');
        overlay.id = 'subscriptionExpiredPopup';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(8px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            padding: 20px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            animation: subscriptionFadeIn 0.4s ease;
        `;

        // إنشاء البطاقة
        const card = document.createElement('div');
        card.style.cssText = `
            background: white;
            border-radius: 24px;
            padding: 40px;
            max-width: 420px;
            width: 100%;
            box-shadow: 0 24px 64px rgba(0,0,0,0.3);
            text-align: center;
            position: relative;
        `;

        // إضافة الأنيميشن
        let style = document.getElementById('subscriptionPopupStyles');
        if (!style) {
            style = document.createElement('style');
            style.id = 'subscriptionPopupStyles';
            style.textContent = `
                @keyframes subscriptionFadeIn {
                    from { opacity: 0; transform: translateY(-30px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes subscriptionSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .sub-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #e0e0e0;
                    border-top: 4px solid #667eea;
                    border-radius: 50%;
                    animation: subscriptionSpin 1s linear infinite;
                    margin: 10px auto;
                }
                .sub-input:focus {
                    outline: none;
                    border-color: #667eea !important;
                    box-shadow: 0 0 0 3px rgba(102,126,234,0.1) !important;
                }
                .sub-btn:hover:not(:disabled) {
                    transform: translateY(-2px) !important;
                }
                .sub-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none !important;
                }
            `;
            document.head.appendChild(style);
        }

        // محتوى البطاقة
        card.innerHTML = `
            <div style="font-size: 64px; margin-bottom: 15px;">⛔</div>
            <h2 style="color: #d32f2f; font-size: 24px; margin-bottom: 12px;">انتهت صلاحية الاشتراك</h2>
            <p style="color: #555; font-size: 15px; line-height: 1.8; margin-bottom: 20px;">
                ${message || 'الرجاء إدخال كود اشتراك جديد للاستمرار في استخدام النظام'}
            </p>
            
            <div id="subPopupError" style="
                background: #fee;
                color: #c33;
                padding: 10px;
                border-radius: 10px;
                margin-bottom: 15px;
                text-align: center;
                display: none;
                font-size: 14px;
            "></div>
            <div id="subPopupSuccess" style="
                background: #e8f5e9;
                color: #2e7d32;
                padding: 10px;
                border-radius: 10px;
                margin-bottom: 15px;
                text-align: center;
                display: none;
                font-size: 14px;
            "></div>
            
            <input type="text" id="subPopupCode" placeholder="أدخل كود التفعيل" autocomplete="off" maxlength="20" class="sub-input" style="
                width: 100%;
                padding: 14px;
                border: 2px solid #e0e0e0;
                border-radius: 12px;
                font-size: 18px;
                text-align: center;
                letter-spacing: 4px;
                font-weight: bold;
                transition: all 0.3s;
                margin-bottom: 15px;
                font-family: inherit;
                box-sizing: border-box;
            ">
            <button id="subPopupBtn" class="sub-btn" style="
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 17px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
                font-family: inherit;
                box-sizing: border-box;
            ">
                🔓 تفعيل الاشتراك
            </button>
            <p style="margin-top: 15px; font-size: 12px; color: #999;">
                إذا كنت تواجه مشكلة، يرجى <a href="mailto:support@example.com" style="color: #667eea; text-decoration: none;">التواصل مع الدعم</a>
            </p>
            <div id="subPopupLoading" style="display: none; margin-top: 10px;">
                <div class="sub-spinner"></div>
                <p style="color: #666; font-size: 13px; margin-top: 8px;">جاري التحقق...</p>
            </div>
        `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        // إضافة event listeners
        const btn = document.getElementById('subPopupBtn');
        const input = document.getElementById('subPopupCode');
        const loading = document.getElementById('subPopupLoading');

        if (input) {
            setTimeout(() => input.focus(), 300);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handlePopupVerification();
                }
            });
        }

        if (btn) {
            btn.addEventListener('click', handlePopupVerification);
        }

        // جعل الدوال متاحة عالمياً
        window.handlePopupVerification = handlePopupVerification;
        window.closeExpiredPopup = closeExpiredPopup;

        console.log('✅ تم عرض بوب اب انتهاء الصلاحية');
    } catch (error) {
        console.error('❌ خطأ في إنشاء البوب اب:', error);
    }
}

function closeExpiredPopup() {
    const popup = document.getElementById('subscriptionExpiredPopup');
    if (popup) {
        popup.remove();
        console.log('🗑 تم إغلاق البوب اب');
    }
}

// ============================================================
// 5. دوال التحقق من الكود المدخل في البوب اب
// ============================================================

async function handlePopupVerification() {
    const input = document.getElementById('subPopupCode');
    const btn = document.getElementById('subPopupBtn');
    const errorDiv = document.getElementById('subPopupError');
    const successDiv = document.getElementById('subPopupSuccess');
    const loadingDiv = document.getElementById('subPopupLoading');

    const code = input?.value?.trim()?.toUpperCase();

    if (!code) {
        if (errorDiv) {
            errorDiv.textContent = '⚠️ يرجى إدخال كود التفعيل';
            errorDiv.style.display = 'block';
            setTimeout(() => { errorDiv.style.display = 'none'; }, 3000);
        }
        input?.focus();
        return;
    }

    // إخفاء الرسائل السابقة
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';

    // إظهار حالة التحميل
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    }
    if (loadingDiv) loadingDiv.style.display = 'block';

    console.log(`🔑 جاري التحقق من الكود: ${code}`);

    try {
        // التحقق من الكود مع السيرفر
        const response = await fetch(`${SCRIPT_URL}?code=${encodeURIComponent(code)}&t=${Date.now()}`);
        const result = await response.json();
        console.log('📊 نتيجة التحقق:', result);

        if (result.success && result.status === 'Active') {
            // الكود صالح
            localStorage.setItem(CODE_KEY, code);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                data: result,
                timestamp: Date.now()
            }));
            
            if (successDiv) {
                successDiv.textContent = `✅ تم التفعيل بنجاح! متبقي ${result.remainingDays} يوم`;
                successDiv.style.display = 'block';
            }
            
            console.log('🎉 تم تفعيل الاشتراك بنجاح!');
            
            // إغلاق البوب اب وإعادة تحميل الصفحة بعد 1.5 ثانية
            setTimeout(() => {
                closeExpiredPopup();
                window.location.reload();
            }, 1500);
        } else {
            const errorMsg = result.message || '❌ كود التفعيل غير صالح أو منتهي الصلاحية';
            if (errorDiv) {
                errorDiv.textContent = errorMsg;
                errorDiv.style.display = 'block';
                setTimeout(() => { errorDiv.style.display = 'none'; }, 4000);
            }
            console.log(`❌ الكود غير صالح: ${errorMsg}`);
            
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
            }
            if (loadingDiv) loadingDiv.style.display = 'none';
            input?.select();
        }
    } catch (error) {
        console.error('❌ خطأ في التحقق:', error);
        if (errorDiv) {
            errorDiv.textContent = '⚠️ حدث خطأ في التحقق، يرجى المحاولة مرة أخرى';
            errorDiv.style.display = 'block';
            setTimeout(() => { errorDiv.style.display = 'none'; }, 4000);
        }
        
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
        }
        if (loadingDiv) loadingDiv.style.display = 'none';
    }
}

// ============================================================
// 6. الوظيفة الرئيسية للتحقق من الاشتراك (في الخلفية)
// ============================================================

async function checkSubscriptionOnLoad() {
    console.log('🚀 ===== بدء التحقق من الاشتراك =====');
    console.log(`📅 الوقت: ${new Date().toLocaleString('ar-EG')}`);
    console.log(`🌐 الصفحة: ${window.location.pathname}`);
    
    try {
        // 1. التحقق من وجود كود مخزن
        const savedCode = getSavedCode();
        
        if (!savedCode) {
            console.log('ℹ️ لا يوجد كود اشتراك مخزن - عرض البوب اب');
            // عرض البوب اب فوراً
            setTimeout(() => {
                createExpiredPopup('لا يوجد كود اشتراك. يرجى إدخال كود التفعيل للوصول إلى النظام.');
            }, 300);
            return false;
        }

        console.log(`🔑 الكود المخزن: ${savedCode}`);

        // 2. جلب بيانات الاشتراك من السيرفر (تحديث)
        let subscriptionData;
        try {
            subscriptionData = await fetchSubscriptionFromServer();
        } catch (error) {
            // إذا فشل الجلب، استخدم البيانات المخزنة مؤقتاً
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
                subscriptionData = JSON.parse(cached).data;
                console.log('📦 استخدام البيانات المخزنة مؤقتاً');
            } else {
                throw error;
            }
        }

        // 3. التحقق من الصلاحية
        const validationResult = validateSubscription(subscriptionData);
        console.log('📊 نتيجة التحقق النهائية:', validationResult);

        // 4. عرض النتيجة
        if (validationResult.isValid) {
            console.log('✅ الاشتراك صالح - الصفحة تعمل بشكل طبيعي');
            console.log(`📆 متبقي ${validationResult.remainingDays} يوم`);
            
            // إذا كان الاشتراك على وشك الانتهاء (أقل من 3 أيام)، نعرض تحذير خفيف
            if (validationResult.remainingDays <= 3) {
                console.log('⚠️ تنبيه: الاشتراك سينتهي خلال أيام قليلة!');
                // يمكن عرض رسالة تحذيرية خفيفة هنا إذا أردت
            }
            
            console.log('🚀 ===== انتهى التحقق (نشط) =====');
            return true;
        } else {
            console.log('❌ الاشتراك غير صالح:', validationResult.message);
            // حذف الكود المنتهي
            clearSavedCode();
            // عرض البوب اب
            setTimeout(() => {
                createExpiredPopup(validationResult.message);
            }, 300);
            console.log('🚀 ===== انتهى التحقق (منتهي) =====');
            return false;
        }
    } catch (error) {
        console.error('❌ فشل التحقق من الاشتراك:', error);
        console.log('🚀 ===== انتهى التحقق بخطأ =====');
        
        // في حالة الخطأ، نحاول استخدام البيانات المخزنة مؤقتاً
        const cachedData = localStorage.getItem(STORAGE_KEY);
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData);
                const validationResult = validateSubscription(parsed.data);
                if (validationResult.isValid) {
                    console.log('✅ استخدام البيانات المخزنة مؤقتاً - اشتراك صالح');
                    return true;
                } else {
                    setTimeout(() => {
                        createExpiredPopup(validationResult.message);
                    }, 300);
                    return false;
                }
            } catch (e) {
                // تجاهل
            }
        }

        // عرض البوب اب مع رسالة خطأ
        setTimeout(() => {
            createExpiredPopup('تعذر التحقق من الاشتراك. يرجى إدخال الكود يدوياً.');
        }, 300);
        return false;
    }
}

// ============================================================
// 7. دوال مساعدة للاستخدام الخارجي
// ============================================================

function resetSubscription() {
    if (confirm('هل أنت متأكد من رغبتك في تغيير كود الاشتراك؟')) {
        clearSavedCode();
        window.location.reload();
    }
}

function getSubscriptionStatus() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        try {
            const parsed = JSON.parse(data);
            return parsed.data;
        } catch (e) {
            return null;
        }
    }
    return null;
}

// ============================================================
// 8. جعل الدوال متاحة عالمياً
// ============================================================

window.checkSubscriptionOnLoad = checkSubscriptionOnLoad;
window.resetSubscription = resetSubscription;
window.getSubscriptionStatus = getSubscriptionStatus;
window.clearSavedCode = clearSavedCode;
window.getSavedCode = getSavedCode;
window.validateSubscription = validateSubscription;
window.fetchSubscriptionFromServer = fetchSubscriptionFromServer;

// ============================================================
// 9. بدء التهيئة التلقائية
// ============================================================

function startSubscriptionSystem() {
    console.log('🌟 ===== تهيئة نظام الاشتراك =====');
    console.log(`🌐 الصفحة: ${window.location.pathname}`);
    console.log(`🕐 الوقت: ${new Date().toLocaleString('ar-EG')}`);
    
    // تنفيذ التحقق بعد تحميل الصفحة
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

// بدء التهيئة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startSubscriptionSystem);
} else {
    startSubscriptionSystem();
}

console.log('✅ تم تحميل ملف subscription.js بنجاح');
console.log('📌 سيتم التحقق من الاشتراك في الخلفية');

// ============================================================
// نهاية الملف
// ============================================================
