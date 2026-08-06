// apifromsheet.js

// دالة لجلب البيانات من Web App
async function fetchInventoryData() {
    const url = 'https://script.google.com/macros/s/AKfycbw302fPZAN0hVwn4QGaIR18LDtoj0bI97zsLT8LhDqwO52OP_APfheG49n2ECxYD3xcVg/exec?action=read&sheet=%D8%A7%D8%B3%D8%AA%D9%88%D9%83';
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching inventory data:', error);
        showToast('حدث خطأ في جلب البيانات من الخادم.', 'error');
        return null;
    }
}
