// api.js
// Responsible for all Google Sheets API communication

const API_URL = "https://script.google.com/macros/s/AKfycbyJtlie7vidMplqFDj1V_ruD5wK6MSGIiCenw_6bAO8yEO4B5-ry5K6kzcMG_Dhcbl9ng/exec";
const API_KEY = "MRFLOW2026";

/**
 * Core API caller
 * @param {Object} params - { action, sheet, range, row, col, value, values, data, name, oldName, newName }
 * @returns {Promise<Object>} { success, data, error }
 */
async function callGoogleSheetsAPI(params) {
    const payload = { ...params, apiKey: API_KEY };
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!json.success) {
            throw new Error(json.error || "Unknown API error");
        }
        return json;
    } catch (e) {
        // Silent fail
        throw e;
    }
}

// ============================================================
// EXPOSED API FUNCTIONS (as per the specification)
// ============================================================

async function getSheets() {
    const res = await callGoogleSheetsAPI({ action: "getSheets" });
    return res.data;
}

async function readSheet(sheetName) {
    const res = await callGoogleSheetsAPI({ action: "read", sheet: sheetName });
    return res.data;
}

async function readRange(sheetName, range) {
    const res = await callGoogleSheetsAPI({ action: "readRange", sheet: sheetName, range });
    return res.data;
}

async function writeCell(sheetName, row, col, value) {
    const res = await callGoogleSheetsAPI({ action: "write", sheet: sheetName, row, col, value });
    return res.data;
}

async function writeRange(sheetName, range, values) {
    const res = await callGoogleSheetsAPI({ action: "writeRange", sheet: sheetName, range, values });
    return res.data;
}

async function appendRow(sheetName, data) {
    const res = await callGoogleSheetsAPI({ action: "appendRow", sheet: sheetName, data });
    return res.data;
}

async function updateRow(sheetName, row, data) {
    const res = await callGoogleSheetsAPI({ action: "updateRow", sheet: sheetName, row, data });
    return res.data;
}

async function deleteRow(sheetName, row) {
    const res = await callGoogleSheetsAPI({ action: "deleteRow", sheet: sheetName, row });
    return res.data;
}

async function deleteRowsBatch(sheetName, rowsToDelete) {
    // Delete rows from bottom to top to preserve indices
    const sorted = [...rowsToDelete].sort((a, b) => b - a);
    for (const row of sorted) {
        await deleteRow(sheetName, row);
    }
}

async function createSheet(name) {
    const res = await callGoogleSheetsAPI({ action: "createSheet", name });
    return res.data;
}

async function deleteSheet(name) {
    const res = await callGoogleSheetsAPI({ action: "deleteSheet", name });
    return res.data;
}

async function renameSheet(oldName, newName) {
    const res = await callGoogleSheetsAPI({ action: "renameSheet", oldName, newName });
    return res.data;
}

async function findInSheet(sheetName, value) {
    const res = await callGoogleSheetsAPI({ action: "find", sheet: sheetName, value });
    return res.data;
}

// ============================================================
// HIGH-LEVEL HELPERS (specific to this application)
// ============================================================

// Sheet names (each tab is a separate sheet)
const SHEETS = {
    WINJAS: "Winjas",
    XPRESS: "Xpress",
    CODES: "Codes",
    REQUIRED: "RequiredOrders",
    ALL_WINJAS: "AllReturnsWinjas",
    ALL_XPRESS: "AllReturnsXpress",
    METADATA: "Metadata"
};

// Headers for each sheet (exactly as required)
const HEADERS = {
    [SHEETS.WINJAS]: ["id", "name", "phone", "governorate", "factory", "supplierCode", "sparkleCode", "description", "size", "quantity", "price", "shippingCode", "orderCode", "note", "customerDate", "arrivalDate", "isReturn", "createdAt"],
    [SHEETS.XPRESS]: ["id", "name", "phone", "governorate", "factory", "supplierCode", "sparkleCode", "description", "size", "quantity", "price", "shippingCode", "orderCode", "shippingDate", "note2", "customerDate", "arrivalDate", "isReturn", "createdAt"],
    [SHEETS.CODES]: ["id", "factory", "code", "productName"],
    [SHEETS.REQUIRED]: ["id", "orderCode", "personName", "delivered"],
    [SHEETS.ALL_WINJAS]: ["id", "name", "phone", "governorate", "factory", "supplierCode", "sparkleCode", "description", "size", "quantity", "price", "shippingCode", "orderCode", "note", "customerDate", "arrivalDate", "returnNumber", "createdAt"],
    [SHEETS.ALL_XPRESS]: ["id", "name", "phone", "governorate", "factory", "supplierCode", "sparkleCode", "description", "size", "quantity", "price", "shippingCode", "orderCode", "shippingDate", "note2", "customerDate", "arrivalDate", "returnNumber", "createdAt"],
    [SHEETS.METADATA]: ["key", "value"]
};

/**
 * Read a sheet and convert to array of objects (using first row as headers)
 */
async function readSheetObjects(sheetName) {
    const data = await readSheet(sheetName);
    if (!data || data.length === 0) return [];
    const headers = data[0];
    const rows = data.slice(1);
    return rows.map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ""; });
        if (sheetName === SHEETS.REQUIRED) {
            obj.delivered = obj.delivered === "TRUE" || obj.delivered === "true" || obj.delivered === true;
        }
        return obj;
    });
}

/**
 * Write an array of objects to a sheet (with headers), and remove any extra rows beyond the new data.
 */
async function writeSheetObjects(sheetName, objects) {
    const headers = HEADERS[sheetName];
    if (!headers) throw new Error(`Unknown sheet: ${sheetName}`);
    const rows = [headers];
    objects.forEach(obj => {
        const row = headers.map(h => obj[h] !== undefined ? obj[h] : "");
        rows.push(row);
    });
    // Write the new data starting at A1
    await writeRange(sheetName, "A1", rows);
    // Now ensure there are no extra rows beyond the new data
    const currentData = await readSheet(sheetName);
    const currentRowCount = currentData.length;
    const newRowCount = rows.length;
    if (currentRowCount > newRowCount) {
        // Delete extra rows from the bottom (1-indexed)
        const rowsToDelete = [];
        for (let i = currentRowCount; i > newRowCount; i--) {
            rowsToDelete.push(i);
        }
        await deleteRowsBatch(sheetName, rowsToDelete);
    }
}

/**
 * Ensure all required sheets exist and have headers
 */
async function ensureSheetsExist() {
    const existing = await getSheets();
    for (const sheet of Object.values(SHEETS)) {
        if (!existing.includes(sheet)) {
            await createSheet(sheet);
            const headers = HEADERS[sheet];
            if (headers) {
                await writeRange(sheet, "A1", [headers]);
            }
        }
    }
    const meta = await readSheetObjects(SHEETS.METADATA);
    if (meta.length === 0) {
        await writeSheetObjects(SHEETS.METADATA, [
            { key: "nextReturnNumber", value: "1" },
            { key: "lastCloseDate", value: "" }
        ]);
    }
}

// Convenience functions for each sheet
async function getWinjas() { return readSheetObjects(SHEETS.WINJAS); }
async function setWinjas(data) { await writeSheetObjects(SHEETS.WINJAS, data); }
async function getXpress() { return readSheetObjects(SHEETS.XPRESS); }
async function setXpress(data) { await writeSheetObjects(SHEETS.XPRESS, data); }
async function getCodes() { return readSheetObjects(SHEETS.CODES); }
async function setCodes(data) { await writeSheetObjects(SHEETS.CODES, data); }
async function getRequired() { return readSheetObjects(SHEETS.REQUIRED); }
async function setRequired(data) { await writeSheetObjects(SHEETS.REQUIRED, data); }
async function getAllWinjas() { return readSheetObjects(SHEETS.ALL_WINJAS); }
async function setAllWinjas(data) { await writeSheetObjects(SHEETS.ALL_WINJAS, data); }
async function getAllXpress() { return readSheetObjects(SHEETS.ALL_XPRESS); }
async function setAllXpress(data) { await writeSheetObjects(SHEETS.ALL_XPRESS, data); }
async function getMetadata() { return readSheetObjects(SHEETS.METADATA); }
async function setMetadata(data) { await writeSheetObjects(SHEETS.METADATA, data); }

// Metadata helpers
async function getNextReturnNumber() {
    const meta = await getMetadata();
    const entry = meta.find(m => m.key === "nextReturnNumber");
    return entry ? parseInt(entry.value) || 1 : 1;
}
async function setNextReturnNumber(num) {
    const meta = await getMetadata();
    const entry = meta.find(m => m.key === "nextReturnNumber");
    if (entry) entry.value = String(num);
    else meta.push({ key: "nextReturnNumber", value: String(num) });
    await setMetadata(meta);
}
async function getLastCloseDate() {
    const meta = await getMetadata();
    const entry = meta.find(m => m.key === "lastCloseDate");
    return entry ? entry.value : "";
}
async function setLastCloseDate(date) {
    const meta = await getMetadata();
    const entry = meta.find(m => m.key === "lastCloseDate");
    if (entry) entry.value = date;
    else meta.push({ key: "lastCloseDate", value: date });
    await setMetadata(meta);
}

// Export all functions for use in other scripts
window.api = {
    getSheets,
    readSheet,
    readRange,
    writeCell,
    writeRange,
    appendRow,
    updateRow,
    deleteRow,
    deleteRowsBatch,
    createSheet,
    deleteSheet,
    renameSheet,
    findInSheet,
    ensureSheetsExist,
    getWinjas,
    setWinjas,
    getXpress,
    setXpress,
    getCodes,
    setCodes,
    getRequired,
    setRequired,
    getAllWinjas,
    setAllWinjas,
    getAllXpress,
    setAllXpress,
    getMetadata,
    setMetadata,
    getNextReturnNumber,
    setNextReturnNumber,
    getLastCloseDate,
    setLastCloseDate,
    SHEETS,
    HEADERS
};
