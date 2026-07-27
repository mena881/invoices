// ============================================================
// subscription.js - نظام التحقق من الاشتراك (ذاتي التشغيل)
// ============================================================

// رابط الـ Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbysZjQMWPbmY4N1wOUhzrvI_fx3LgQvORh-a3eEE2KSbIwH0TURgOnc45PHQ4LlLEh-/exec';

// مفاتيح التخزين المحلي
const STORAGE_KEY = 'subscription_data';
const CODE_KEY = 'subscription_code';

// ============================================================
// 1. دوال التحقق من الكود مع السيرفر
// ============================================================

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

async function checkSubscription() {
    return await fetchSubscriptionFromServer();
}

// ============================================================
// 3. دوال التحقق من الصلاحية
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
// 4. دوال إدارة الكود المخزن
// ============================================================

function saveCode(code) {
    localStorage.setItem(CODE_KEY, code);
    console.log(`💾 تم حفظ الكود: ${code}`);
}

function getSavedCode() {
    return localStorage.getItem(CODE_KEY);
}

function clearSavedCode() {
    localStorage.removeItem(CODE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑 تم حذف الكود المخزن');
}

// ============================================================
// 5. دوال إنشاء وعرض واجهة الاشتراك (تلقائياً)
// ============================================================

function createSubscriptionUI() {
    // التحقق من وجود body
    if (!document.body) {
        console.log('⏳ body غير موجود، سيتم إعادة المحاولة...');
        return false;
    }

    // التحقق من وجود العناصر بالفعل
    if (document.getElementById('subscriptionOverlay')) {
        return true;
    }

    try {
        // إنشاء الـ Overlay
        const overlay = document.createElement('div');
        overlay.id = 'subscriptionOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            padding: 20px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;

        // إنشاء البطاقة
        const card = document.createElement('div');
        card.id = 'subscriptionCard';
        card.style.cssText = `
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 450px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            animation: subscriptionFadeIn 0.5s ease;
            text-align: center;
            position: relative;
            max-height: 90vh;
            overflow-y: auto;
        `;

        // إضافة الأنيميشن
        let style = document.getElementById('subscriptionStyles');
        if (!style) {
            style = document.createElement('style');
            style.id = 'subscriptionStyles';
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
                #subActivationCode:focus {
                    outline: none;
                    border-color: #667eea !important;
                    box-shadow: 0 0 0 3px rgba(102,126,234,0.1) !important;
                }
                #subVerifyBtn:hover:not(:disabled) {
                    transform: translateY(-2px) !important;
                }
                #subVerifyBtn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none !important;
                }
            `;
            document.head.appendChild(style);
        }

        // محتوى البطاقة
        card.innerHTML = `
            <div id="subCodeContent">
                <div style="font-size: 60px; margin-bottom: 15px;">🔑</div>
                <h2 style="color: #333; font-size: 24px; margin-bottom: 10px;">تفعيل الاشتراك</h2>
                <p style="color: #666; font-size: 14px; margin-bottom: 25px;">أدخل كود التفعيل الخاص بك للوصول إلى النظام</p>
                
                <div id="subError" style="
                    background: #fee;
                    color: #c33;
                    padding: 12px;
                    border-radius: 10px;
                    margin-bottom: 15px;
                    text-align: center;
                    display: none;
                "></div>
                <div id="subSuccess" style="
                    background: #e8f5e9;
                    color: #2e7d32;
                    padding: 12px;
                    border-radius: 10px;
                    margin-bottom: 15px;
                    text-align: center;
                    display: none;
                "></div>
                
                <input type="text" id="subActivationCode" placeholder="أدخل كود التفعيل" autocomplete="off" maxlength="20" style="
                    width: 100%;
                    padding: 15px;
                    border: 2px solid #e0e0e0;
                    border-radius: 12px;
                    font-size: 18px;
                    text-align: center;
                    letter-spacing: 3px;
                    font-weight: bold;
                    transition: all 0.3s;
                    margin-bottom: 15px;
                    font-family: inherit;
                    box-sizing: border-box;
                ">
                <button id="subVerifyBtn" style="
                    width: 100%;
                    padding: 15px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-family: inherit;
                    box-sizing: border-box;
                ">
                    🔓 تحقق من الكود
                </button>
                <p style="margin-top: 15px; font-size: 12px; color: #999;">
                    إذا كنت تواجه مشكلة، يرجى <a href="mailto:support@example.com" style="color: #667eea; text-decoration: none;">التواصل مع الدعم</a>
                </p>
            </div>
            
            <div id="subLoadingContent" style="display: none;">
                <div style="font-size: 40px; margin-bottom: 15px;">⏳</div>
                <h2 style="color: #333; font-size: 20px; margin-bottom: 10px;">جاري التحقق...</h2>
                <div class="sub-spinner"></div>
                <p id="subLoadingText" style="color: #666; font-size: 14px; margin-top: 15px;">يرجى الانتظار</p>
            </div>
            
            <div id="subExpiredContent" style="display: none;">
                <div style="font-size: 60px; margin-bottom: 15px;">⛔</div>
                <h2 style="color: #d32f2f; font-size: 24px; margin-bottom: 10px;">انتهت صلاحية الاشتراك</h2>
                <p id="subExpiredMessage" style="color: #666; font-size: 16px; line-height: 1.8; margin-bottom: 15px;"></p>
                <button id="subRetryBtn" style="
                    width: 100%;
                    padding: 15px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-family: inherit;
                    box-sizing: border-box;
                ">
                    🔄 إدخال كود جديد
                </button>
            </div>
        `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        // إضافة event listeners
        const verifyBtn = document.getElementById('subVerifyBtn');
        const codeInput = document.getElementById('subActivationCode');
        const retryBtn = document.getElementById('subRetryBtn');

        if (verifyBtn) {
            verifyBtn.addEventListener('click', handleCodeVerification);
        }
        if (codeInput) {
            codeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleCodeVerification();
                }
            });
            setTimeout(() => codeInput.focus(), 300);
        }
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                showCodeInput();
                const input = document.getElementById('subActivationCode');
                if (input) {
                    input.value = '';
                    input.focus();
                }
                document.getElementById('subError').style.display = 'none';
                document.getElementById('subSuccess').style.display = 'none';
            });
        }

        // جعل الدوال متاحة عالمياً
        window.showSubscriptionOverlay = showSubscriptionOverlay;
        window.hideSubscriptionOverlay = hideSubscriptionOverlay;
        window.showCodeInput = showCodeInput;
        window.showLoading = showLoading;
        window.showExpired = showExpired;

        console.log('✅ تم إنشاء واجهة الاشتراك');
        return true;
    } catch (error) {
        console.error('❌ خطأ في إنشاء واجهة الاشتراك:', error);
        return false;
    }
}

// دوال التحكم في الـ UI
function showSubscriptionOverlay() {
    const overlay = document.getElementById('subscriptionOverlay');
    if (overlay) overlay.style.display = 'flex';
}

function hideSubscriptionOverlay() {
    const overlay = document.getElementById('subscriptionOverlay');
    if (overlay) overlay.style.display = 'none';
}

function showCodeInput() {
    const codeContent = document.getElementById('subCodeContent');
    const loadingContent = document.getElementById('subLoadingContent');
    const expiredContent = document.getElementById('subExpiredContent');
    if (codeContent) codeContent.style.display = 'block';
    if (loadingContent) loadingContent.style.display = 'none';
    if (expiredContent) expiredContent.style.display = 'none';
}

function showLoading(message = 'جاري التحقق من الاشتراك...') {
    const codeContent = document.getElementById('subCodeContent');
    const loadingContent = document.getElementById('subLoadingContent');
    const expiredContent = document.getElementById('subExpiredContent');
    if (codeContent) codeContent.style.display = 'none';
    if (loadingContent) loadingContent.style.display = 'block';
    if (expiredContent) expiredContent.style.display = 'none';
    const text = document.getElementById('subLoadingText');
    if (text) text.textContent = message;
}

function showExpired(message) {
    const codeContent = document.getElementById('subCodeContent');
    const loadingContent = document.getElementById('subLoadingContent');
    const expiredContent = document.getElementById('subExpiredContent');
    if (codeContent) codeContent.style.display = 'none';
    if (loadingContent) loadingContent.style.display = 'none';
    if (expiredContent) expiredContent.style.display = 'block';
    const msg = document.getElementById('subExpiredMessage');
    if (msg) msg.textContent = message;
}

function showSubError(message) {
    const errorDiv = document.getElementById('subError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 4000);
    }
}

function showSubSuccess(message) {
    const successDiv = document.getElementById('subSuccess');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }
}

// ============================================================
// 6. دوال التحقق من الكود المدخل
// ============================================================

async function handleCodeVerification() {
    const input = document.getElementById('subActivationCode');
    const code = input?.value?.trim()?.toUpperCase();

    if (!code) {
        showSubError('⚠️ يرجى إدخال كود التفعيل');
        input?.focus();
        return;
    }

    console.log(`🔑 جاري التحقق من الكود: ${code}`);

    const btn = document.getElementById('subVerifyBtn');
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
            
            showSubSuccess(`✅ تم التفعيل بنجاح! متبقي ${result.remainingDays} يوم`);
            
            console.log('🎉 تم تفعيل الاشتراك بنجاح!');
            console.log(`   📅 تاريخ البدء: ${result.startDate}`);
            console.log(`   ⏱ مدة التفعيل: ${result.activationDuration} يوم`);
            console.log(`   📆 الأيام المتبقية: ${result.remainingDays} يوم`);
            
            if (btn) {
                btn.textContent = '✅ تم التفعيل';
                btn.style.background = '#4caf50';
            }
            
            // إعادة تحميل الصفحة بعد 1.5 ثانية
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            const errorMsg = result.message || '❌ كود التفعيل غير صالح أو منتهي الصلاحية';
            showSubError(errorMsg);
            console.log(`❌ الكود غير صالح: ${errorMsg}`);
            
            if (btn) {
                btn.textContent = originalText;
                btn.disabled = false;
            }
            input?.select();
        }
    } catch (error) {
        console.error('❌ خطأ في التحقق:', error);
        showSubError('⚠️ حدث خطأ في التحقق، يرجى المحاولة مرة أخرى');
        
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}

// ============================================================
// 7. الوظيفة الرئيسية للتحقق من الاشتراك
// ============================================================

async function checkSubscriptionOnLoad() {
    console.log('🚀 ===== بدء التحقق من الاشتراك =====');
    console.log(`📅 الوقت: ${new Date().toLocaleString('ar-EG')}`);
    console.log(`🌐 الصفحة: ${window.location.pathname}`);
    
    try {
        const savedCode = getSavedCode();
        
        if (!savedCode) {
            console.log('ℹ️ لا يوجد كود اشتراك مخزن');
            // تأكد من وجود الـ UI قبل عرضه
            if (!document.getElementById('subscriptionOverlay')) {
                createSubscriptionUI();
            }
            showSubscriptionOverlay();
            showCodeInput();
            console.log('🚀 ===== انتهى التحقق (لا يوجد كود) =====');
            return false;
        }

        console.log(`🔑 الكود المخزن: ${savedCode}`);
        
        // تأكد من وجود الـ UI قبل عرضه
        if (!document.getElementById('subscriptionOverlay')) {
            createSubscriptionUI();
        }
        showSubscriptionOverlay();
        showLoading('جاري التحقق من صلاحية الاشتراك...');

        const subscriptionData = await fetchSubscriptionFromServer();
        console.log('📊 بيانات الاشتراك المستلمة:', subscriptionData);

        const validationResult = validateSubscription(subscriptionData);
        console.log('📊 نتيجة التحقق النهائية:', validationResult);

        console.log('💡 ===== معلومات الاشتراك المحدثة =====');
        console.log(`   ✅ الحالة: ${validationResult.status}`);
        console.log(`   📆 الأيام المتبقية: ${validationResult.remainingDays} يوم`);
        console.log(`   📝 الرسالة: ${validationResult.message}`);
        console.log('💡 =====================================');

        if (validationResult.isValid) {
            console.log('✅ الاشتراك صالح، مرحباً بك!');
            hideSubscriptionOverlay();
            console.log('🚀 ===== انتهى التحقق بنجاح =====');
            return true;
        } else {
            console.log('❌ الاشتراك غير صالح:', validationResult.message);
            showExpired(validationResult.message);
            clearSavedCode();
            console.log('🚀 ===== انتهى التحقق (الاشتراك منتهي) =====');
            return false;
        }
    } catch (error) {
        console.error('❌ فشل التحقق من الاشتراك:', error);
        console.log('🚀 ===== انتهى التحقق بخطأ =====');
        
        // في حالة الخطأ، محاولة استخدام البيانات المخزنة مؤقتاً
        const cachedData = localStorage.getItem(STORAGE_KEY);
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData);
                const validationResult = validateSubscription(parsed.data);
                if (validationResult.isValid) {
                    console.log('✅ استخدام البيانات المخزنة مؤقتاً - اشتراك صالح');
                    hideSubscriptionOverlay();
                    return true;
                } else {
                    if (!document.getElementById('subscriptionOverlay')) {
                        createSubscriptionUI();
                    }
                    showExpired(validationResult.message);
                    clearSavedCode();
                    return false;
                }
            } catch (e) {
                // تجاهل
            }
        }

        if (!document.getElementById('subscriptionOverlay')) {
            createSubscriptionUI();
        }
        showSubscriptionOverlay();
        showCodeInput();
        showSubError('⚠️ تعذر التحقق من الاشتراك، يرجى إدخال الكود يدوياً');
        return false;
    }
}

// ============================================================
// 8. إعادة تعيين الاشتراك (للاستخدام الخارجي)
// ============================================================

function resetSubscription() {
    if (confirm('هل أنت متأكد من رغبتك في تغيير كود الاشتراك؟')) {
        clearSavedCode();
        window.location.reload();
    }
}

// ============================================================
// 9. تهيئة النظام وتشغيله تلقائياً
// ============================================================

function initSubscriptionSystem() {
    console.log('🌟 ===== تهيئة نظام الاشتراك =====');
    console.log(`🌐 الصفحة: ${window.location.pathname}`);
    console.log(`🕐 الوقت: ${new Date().toLocaleString('ar-EG')}`);
    
    // إنشاء الـ UI (مع إعادة المحاولة إذا فشل)
    let uiCreated = createSubscriptionUI();
    if (!uiCreated) {
        console.log('⏳ إعادة محاولة إنشاء الـ UI بعد 500ms...');
        setTimeout(() => {
            createSubscriptionUI();
        }, 500);
    }
    
    // تنفيذ التحقق بعد تحميل الصفحة
    if (document.readyState === 'complete') {
        setTimeout(() => {
            checkSubscriptionOnLoad();
        }, 500);
    } else {
        window.addEventListener('load', function() {
            setTimeout(() => {
                checkSubscriptionOnLoad();
            }, 500);
        });
    }
}

// ============================================================
// 10. جعل الدوال متاحة عالمياً
// ============================================================

window.verifyCode = handleCodeVerification;
window.checkSubscriptionOnLoad = checkSubscriptionOnLoad;
window.resetSubscription = resetSubscription;
window.clearSavedCode = clearSavedCode;
window.saveCode = saveCode;
window.getSavedCode = getSavedCode;
window.validateSubscription = validateSubscription;
window.fetchSubscriptionFromServer = fetchSubscriptionFromServer;
window.verifyCodeWithServer = verifyCodeWithServer;

// ============================================================
// 11. بدء التهيئة التلقائية - مع التأكد من وجود body
// ============================================================

function startSubscriptionSystem() {
    if (document.body) {
        // body موجود - ابدأ التهيئة
        initSubscriptionSystem();
    } else {
        // body مش موجود - انتظر
        console.log('⏳ انتظار تحميل body...');
        document.addEventListener('DOMContentLoaded', function() {
            initSubscriptionSystem();
        });
    }
}

// بدء التهيئة
startSubscriptionSystem();

// إعادة التحقق عند العودة إلى الصفحة (من back/forward)
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        console.log('🔄 إعادة التحقق من الاشتراك (من الكاش)');
        setTimeout(() => {
            checkSubscriptionOnLoad();
        }, 500);
    }
});

console.log('✅ تم تحميل ملف subscription.js بنجاح');
console.log('📌 سيتم التحقق من الاشتراك تلقائياً عند تحميل أي صفحة');

// ============================================================
// نهاية الملف
// ============================================================
