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
// 2. دوال جلب بيانات الاشتراك (للتوافق مع الإصدارات السابقة)
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
// 5. دوال التحكم في التنقل بين الصفحات
// ============================================================

function redirectToIndex() {
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage !== 'index.html' && currentPage !== '') {
        console.log('🔄 إعادة توجيه إلى صفحة index.html لإدخال الكود');
        window.location.href = 'index.html';
        return true;
    }
    return false;
}

function isIndexPage() {
    const currentPage = window.location.pathname.split('/').pop();
    return currentPage === 'index.html' || currentPage === '';
}

// ============================================================
// 6. الوظيفة الرئيسية للتحقق من الاشتراك - منطق جديد
// ============================================================

async function checkSubscriptionOnLoad() {
    console.log('🚀 ===== بدء التحقق من الاشتراك =====');
    console.log(`📅 الوقت: ${new Date().toLocaleString('ar-EG')}`);
    console.log(`🌐 الصفحة: ${window.location.pathname}`);
    
    // 1. التحقق من وجود كود مخزن
    const savedCode = getSavedCode();
    
    // 2. لو مفيش كود - تحقق من الصفحة الحالية
    if (!savedCode) {
        console.log('ℹ️ لا يوجد كود اشتراك مخزن');
        
        // لو مش في صفحة index - حول إلى index
        if (!isIndexPage()) {
            console.log('🔄 لا يوجد كود - إعادة توجيه إلى index.html');
            redirectToIndex();
            return false;
        }
        
        // لو في صفحة index - اعرض واجهة إدخال الكود (بدون Popup)
        console.log('📝 عرض واجهة إدخال الكود في index.html');
        
        // نتحقق إذا كان الـ Overlay ظاهر ونخفيه
        const overlay = document.getElementById('subscriptionOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        
        // نعرض رسالة في الـ UI المدمج
        const codeSection = document.getElementById('codeSection');
        const loginSection = document.getElementById('loginSection');
        if (codeSection && loginSection) {
            codeSection.style.display = 'block';
            codeSection.classList.add('active');
            loginSection.style.display = 'none';
            loginSection.classList.remove('active');
            
            // نركز على حقل الكود
            const input = document.getElementById('activationCode');
            if (input) {
                setTimeout(() => {
                    input.focus();
                    input.select();
                }, 300);
            }
        }
        
        console.log('🚀 ===== انتهى التحقق (لا يوجد كود - عرض واجهة الإدخال) =====');
        return false;
    }

    console.log(`🔑 الكود المخزن: ${savedCode}`);
    
    // 3. لو فيه كود - ابدأ التحقق من السيرفر
    try {
        const result = await verifyCodeWithServer(savedCode);
        console.log('📊 نتيجة التحقق من السيرفر:', result);

        // 4. لو الاشتراك Active - الصفحة تكمل طبيعي (لا نعرض أي شيء)
        if (result.success && result.status === 'Active') {
            console.log('✅ الاشتراك صالح، الصفحة تكمل تحميل طبيعي');
            console.log(`   📆 الأيام المتبقية: ${result.remainingDays} يوم`);
            
            // تخزين البيانات المحدثة في الكاش
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                data: result,
                timestamp: Date.now()
            }));
            
            // لو في صفحة index - نعرض شاشة تسجيل الدخول
            if (isIndexPage()) {
                console.log('📝 الاشتراك صالح - عرض شاشة تسجيل الدخول في index.html');
                // نعرض شاشة تسجيل الدخول في الـ UI المدمج
                const codeSection = document.getElementById('codeSection');
                const loginSection = document.getElementById('loginSection');
                const subscriptionStatus = document.getElementById('subscriptionStatus');
                
                if (codeSection && loginSection) {
                    codeSection.style.display = 'none';
                    codeSection.classList.remove('active');
                    loginSection.style.display = 'block';
                    loginSection.classList.add('active');
                    
                    // عرض حالة الاشتراك
                    if (subscriptionStatus) {
                        const days = result.remainingDays || 0;
                        let msg = `✅ اشتراك نشط - متبقي ${days} يوم`;
                        let type = 'success';
                        if (days <= 3) {
                            msg = `⚠️ تنبيه: الاشتراك سينتهي خلال ${days} أيام`;
                            type = 'warning';
                        }
                        subscriptionStatus.textContent = msg;
                        subscriptionStatus.style.display = 'block';
                        subscriptionStatus.className = 'subscription-status show';
                        if (type === 'success') {
                            subscriptionStatus.style.background = '#f0fdf4';
                            subscriptionStatus.style.color = '#16a34a';
                            subscriptionStatus.style.borderColor = '#bbf7d0';
                        } else {
                            subscriptionStatus.style.background = '#fffbeb';
                            subscriptionStatus.style.color = '#d97706';
                            subscriptionStatus.style.borderColor = '#fde68a';
                        }
                    }
                }
            }
            
            console.log('🚀 ===== انتهى التحقق (اشتراك نشط) =====');
            return true;
        } 
        // 5. لو الاشتراك Expired أو Invalid - امسح الكود وارجع إلى index
        else {
            console.log('❌ الاشتراك غير صالح:', result.message || 'انتهت الصلاحية');
            clearSavedCode();
            
            // إعادة توجيه إلى index لعرض واجهة إدخال الكود
            if (!isIndexPage()) {
                console.log('🔄 اشتراك منتهي - إعادة توجيه إلى index.html');
                redirectToIndex();
                return false;
            }
            
            // لو في index - اعرض رسالة خطأ في واجهة الكود
            console.log('📝 عرض رسالة خطأ في index.html');
            const codeError = document.getElementById('codeError');
            if (codeError) {
                codeError.textContent = result.message || '❌ انتهت صلاحية الاشتراك';
                codeError.style.display = 'block';
            }
            
            console.log('🚀 ===== انتهى التحقق (اشتراك منتهي - عرض رسالة خطأ) =====');
            return false;
        }
    } catch (error) {
        console.error('❌ فشل التحقق من الاشتراك:', error);
        
        // 6. في حالة Network Error - استخدم الـ Cache لو موجود وصالح
        const cachedData = localStorage.getItem(STORAGE_KEY);
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData);
                const validationResult = validateSubscription(parsed.data);
                
                // لو الـ Cache صالح - كمل بدون Popup
                if (validationResult.isValid) {
                    console.log('✅ استخدام البيانات المخزنة مؤقتاً - اشتراك صالح');
                    console.log(`   📆 الأيام المتبقية: ${validationResult.remainingDays} يوم`);
                    
                    // لو في index - اعرض شاشة تسجيل الدخول
                    if (isIndexPage()) {
                        const codeSection = document.getElementById('codeSection');
                        const loginSection = document.getElementById('loginSection');
                        const subscriptionStatus = document.getElementById('subscriptionStatus');
                        
                        if (codeSection && loginSection) {
                            codeSection.style.display = 'none';
                            codeSection.classList.remove('active');
                            loginSection.style.display = 'block';
                            loginSection.classList.add('active');
                            
                            if (subscriptionStatus) {
                                const days = validationResult.remainingDays || 0;
                                let msg = `✅ اشتراك نشط - متبقي ${days} يوم (من الكاش)`;
                                subscriptionStatus.textContent = msg;
                                subscriptionStatus.style.display = 'block';
                                subscriptionStatus.className = 'subscription-status show';
                                subscriptionStatus.style.background = '#f0fdf4';
                                subscriptionStatus.style.color = '#16a34a';
                                subscriptionStatus.style.borderColor = '#bbf7d0';
                            }
                        }
                    }
                    
                    console.log('🚀 ===== انتهى التحقق (Cache صالح) =====');
                    return true;
                } 
                // لو الـ Cache منتهي - امسح الكود وارجع إلى index
                else {
                    console.log('❌ Cache منتهي الصلاحية');
                    clearSavedCode();
                    
                    if (!isIndexPage()) {
                        redirectToIndex();
                    }
                    console.log('🚀 ===== انتهى التحقق (Cache منتهي - عرض واجهة الإدخال) =====');
                    return false;
                }
            } catch (e) {
                console.error('❌ خطأ في قراءة الـ Cache:', e);
                clearSavedCode();
                
                if (!isIndexPage()) {
                    redirectToIndex();
                }
                console.log('🚀 ===== انتهى التحقق (خطأ في Cache - عرض واجهة الإدخال) =====');
                return false;
            }
        } 
        // 7. لو مفيش Cache - ارجع إلى index
        else {
            console.log('❌ لا يوجد Cache متاح');
            clearSavedCode();
            
            if (!isIndexPage()) {
                redirectToIndex();
            }
            console.log('🚀 ===== انتهى التحقق (لا يوجد Cache - عرض واجهة الإدخال) =====');
            return false;
        }
    }
}

// ============================================================
// 7. إعادة تعيين الاشتراك (للاستخدام الخارجي)
// ============================================================

function resetSubscription() {
    if (confirm('هل أنت متأكد من رغبتك في تغيير كود الاشتراك؟')) {
        clearSavedCode();
        window.location.href = 'index.html';
    }
}

// ============================================================
// 8. تهيئة النظام وتشغيله تلقائياً
// ============================================================

function initSubscriptionSystem() {
    console.log('🌟 ===== تهيئة نظام الاشتراك =====');
    console.log(`🌐 الصفحة: ${window.location.pathname}`);
    console.log(`🕐 الوقت: ${new Date().toLocaleString('ar-EG')}`);
    
    // التحقق من وجود Overlay وإخفائه
    const overlay = document.getElementById('subscriptionOverlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.style.pointerEvents = 'none';
    }
    
    // تنفيذ التحقق بعد تحميل الصفحة
    if (document.readyState === 'complete') {
        setTimeout(() => {
            checkSubscriptionOnLoad();
        }, 300);
    } else {
        window.addEventListener('load', function() {
            setTimeout(() => {
                checkSubscriptionOnLoad();
            }, 300);
        });
    }
}

// ============================================================
// 9. جعل الدوال متاحة عالمياً
// ============================================================

window.verifyCode = verifyCodeWithServer;
window.checkSubscriptionOnLoad = checkSubscriptionOnLoad;
window.resetSubscription = resetSubscription;
window.clearSavedCode = clearSavedCode;
window.saveCode = saveCode;
window.getSavedCode = getSavedCode;
window.validateSubscription = validateSubscription;
window.fetchSubscriptionFromServer = fetchSubscriptionFromServer;
window.verifyCodeWithServer = verifyCodeWithServer;
window.redirectToIndex = redirectToIndex;
window.isIndexPage = isIndexPage;

// ============================================================
// 10. بدء التهيئة التلقائية - مع التأكد من وجود body
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
console.log('📌 إذا لم يوجد كود -> إعادة توجيه إلى index.html');

// ============================================================
// نهاية الملف
// ============================================================
