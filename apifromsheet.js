// apifromsheet.js

// دالة لجلب البيانات من Web App
async function fetchInventoryData(sheetName) {
    const url = `https://script.google.com/macros/s/AKfycbw302fPZAN0hVwn4QGaIR18LDtoj0bI97zsLT8LhDqwO52OP_APfheG49n2ECxYD3xcVg/exec?action=read&sheet=${encodeURIComponent(sheetName)}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();

if (!json.success) {
    throw new Error(json.error || "فشل في جلب البيانات");
}

return json.data.data;
    } catch (error) {
        console.error('Error fetching inventory data:', error);
        showToast('حدث خطأ في جلب البيانات من الخادم.', 'error');
        return null;
    }
}
