// subscription.js - ملف منفصل للتحقق من الاشتراك

// رابط الـ Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbysZjQMWPbmY4N1wOUhzrvI_fx3LgQvORh-a3eEE2KSbIwH0TURgOnc45PHQ4LlLEh-/exec';

// مفتاح تخزين الاشتراك في localStorage
const SUBSCRIPTION_KEY = 'subscription_data';

/**
 * التحقق من الاشتراك عن طريق الـ API
 * يعيد Promise يحتوي على (true/false)
 */
async function checkSubscription() {
    try {
        // 1. التحقق من localStorage أولاً
        const stored = localStorage.getItem(SUBSCRIPTION_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            // التحقق من صلاحية الكاش (ساعة واحدة)
            const now = Date.now();
            if (data.timestamp && (now - data.timestamp) < 3600000) { // أقل من ساعة
                return data.isActive === true;
            }
        }

        // 2. جلب البيانات من الـ API باستخدام POST
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                action: 'check'
            }),
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('📦 Subscription check result:', result);

        // التحقق من صحة البيانات
        const isActive = result.success === true && result.status === 'Active';

        // 3. تخزين النتيجة في localStorage مع طابع زمني
        localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify({
            isActive: isActive,
            timestamp: Date.now(),
            data: result
        }));

        return isActive;
    } catch (error) {
        console.error('Error fetching subscription status:', error);
        // في حالة الخطأ، نستخدم القيمة المخزنة مسبقاً إن وجدت
        const stored = localStorage.getItem(SUBSCRIPTION_KEY);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                // نسمح باستخدام الكاش حتى لو كان قديماً في حالة تعذر الاتصال
                return data.isActive === true;
            } catch (e) {
                return false;
            }
        }
        // إذا لم يكن هناك كاش، نفترض عدم النشاط
        return false;
    }
}

/**
 * دالة لتحديث حالة الاشتراك بشكل دوري (كل ساعة)
 */
function scheduleSubscriptionRefresh() {
    // تحديث كل ساعة (3600000 مللي ثانية)
    setInterval(async () => {
        try {
            await checkSubscription();
            console.log('🔄 Subscription status refreshed at', new Date().toLocaleString());
            // تحديث الواجهة إذا كانت مفتوحة
            if (typeof window !== 'undefined' && window.location.pathname.includes('index.html')) {
                const statusEl = document.getElementById('subscriptionStatus');
                if (statusEl) {
                    const stored = localStorage.getItem(SUBSCRIPTION_KEY);
                    if (stored) {
                        try {
                            const data = JSON.parse(stored);
                            const isActive = data.isActive === true;
                            if (isActive && data.data) {
                                statusEl.innerHTML = `✅ الاشتراك نشط - متبقي ${data.data.remainingDays || 0} يوم`;
                                statusEl.className = 'subscription-status active';
                            } else if (isActive) {
                                statusEl.innerHTML = `✅ الاشتراك نشط`;
                                statusEl.className = 'subscription-status active';
                            } else {
                                const statusText = data.data?.status || 'منتهي';
                                statusEl.innerHTML = `❌ الاشتراك غير نشط (${statusText})`;
                                statusEl.className = 'subscription-status inactive';
                            }
                        } catch (e) {
                            console.error('Error updating status:', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error refreshing subscription:', error);
        }
    }, 3600000); // كل ساعة
}

// بدء الجدولة التلقائية عند تحميل الصفحة
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(scheduleSubscriptionRefresh, 5000);
    });
}

// تصدير الدوال للاستخدام في الملفات الأخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        checkSubscription, 
        scheduleSubscriptionRefresh, 
        SCRIPT_URL, 
        SUBSCRIPTION_KEY 
    };
}