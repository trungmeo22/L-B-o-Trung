
// ID của Google Sheet - Để trống hoặc dùng ID thực tế của bạn
// Nếu chạy Script từ chính file Sheet đó, script sẽ tự động lấy Spreadsheet hiện tại.
const SPREADSHEET_ID = '1ti6EGfBqo5yI4x2BspABgKtvAs5lL_zeKcdwxNbpUjo';

const SHEET_NAMES = {
  holters: 'Holters',
  tasks: 'Tasks',
  consultations: 'Consultations',
  discharges: 'Discharges',
  vitals: 'Vitals',
  glucoseRecords: 'GlucoseRecords',
  clsRecords: 'clstrasau',
  handovers: 'Handovers',
  tracker: 'tracker1',
  users: 'Users'
};

function getSS() {
  try {
    if (SPREADSHEET_ID && SPREADSHEET_ID !== 'YOUR_SPREADSHEET_ID') {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    }
  } catch (e) {
    console.warn("Could not open by ID, using active spreadsheet");
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(1000);

  try {
    const ss = getSS();
    const tz = ss.getSpreadsheetTimeZone();
    setupSheets(ss);
    SpreadsheetApp.flush();

    const data = {};
    
    Object.keys(SHEET_NAMES).forEach(key => {
      const sheetName = SHEET_NAMES[key];
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet || sheet.getLastRow() <= 1) {
        data[key] = [];
        return;
      }
      
      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      
      data[key] = rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          let value = row[index];
          
          if (header === 'completed') {
            value = (value === true || String(value).toLowerCase() === 'true');
          } else if (value instanceof Date) {
            var year = value.getFullYear();
            if (year === 1899) {
               // Đây thường là giá trị THỜI GIAN trong Google Sheets
               obj[header] = Utilities.formatDate(value, tz, "HH:mm");
            } else if (header === 'installDate' || header === 'endTime') {
              obj[header] = Utilities.formatDate(value, tz, "yyyy-MM-dd'T'HH:mm:ss");
            } else if (header === 'date' || header === 'returnDate') {
              obj[header] = Utilities.formatDate(value, tz, "yyyy-MM-dd");
            } else {
              obj[header] = Utilities.formatDate(value, tz, "yyyy-MM-dd'T'HH:mm:ss");
            }
          } else {
            obj[header] = value;
          }
        });
        return obj;
      });
    });

    data.lastUpdated = new Date().toISOString();

    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Server busy'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const ss = getSS();
    setupSheets(ss);
    SpreadsheetApp.flush();
    
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const key = body.type;
    const item = body.data;
    const sheetName = SHEET_NAMES[key];
    
    if (!sheetName) throw new Error("Invalid type: " + key);

    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Sheet not found: " + sheetName);

    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0];
    const idIndex = headers.indexOf('id');
    
    if (idIndex === -1) {
      throw new Error("Không tìm thấy cột 'id' trong sheet: " + sheetName);
    }

    if (action === 'create') {
      const row = headers.map(header => {
         const val = item[header];
         return (val === undefined || val === null) ? '' : val;
      });
      sheet.appendRow(row);
    } 
    else if (action === 'update') {
      const data = sheet.getDataRange().getValues();
      let found = false;
      const itemIdStr = String(item.id);

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIndex]) === itemIdStr) {
          headers.forEach((header, colIndex) => {
            if (item[header] !== undefined) {
              sheet.getRange(i + 1, colIndex + 1).setValue(item[header]);
            }
          });
          found = true;
          break;
        }
      }
      if (!found) {
        const row = headers.map(header => (item[header] !== undefined && item[header] !== null) ? item[header] : '');
        sheet.appendRow(row);
      }
    } 
    else if (action === 'delete') {
      const data = sheet.getDataRange().getValues();
      const idToDelete = String(body.id);
      for (let i = data.length - 1; i >= 1; i--) {
        if (String(data[i][idIndex]) === idToDelete) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
    }

    SpreadsheetApp.flush();
    return ContentService.createTextOutput(JSON.stringify({status: 'success'}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function setupSheets(ss) {
  const schemas = {
    holters: ['id', 'name', 'type', 'status', 'patientName', 'room', 'installDate', 'endTime'],
    tasks: ['id', 'title', 'date', 'completed', 'priority', 'status'],
    consultations: ['id', 'patientName', 'age', 'department', 'consultantDoctor', 'diagnosis', 'treatment', 'date'],
    discharges: ['id', 'patientName', 'room', 'note', 'date'],
    vitals: ['id', 'date', 'time', 'room', 'patientName', 'bp', 'pulse', 'temp', 'spO2', 'note'],
    glucoseRecords: ['id', 'date', 'room', 'patientName', 'slots', 'note'],
    clsRecords: ['id', 'patientName', 'phone', 'cls', 'returnDate', 'doctor', 'status'],
    handovers: ['id', 'patientName', 'room', 'doctor', 'content', 'date'],
    tracker: ['id', 'key', 'bp', 'ecg'],
    users: ['id', 'username', 'password', 'displayName', 'role']
  };

  Object.keys(SHEET_NAMES).forEach(key => {
    const sheetName = SHEET_NAMES[key];
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(schemas[key]);
      
      if (key === 'users') {
        sheet.appendRow(['1', 'admin', '123456', 'Quản trị viên', 'admin']);
      }
    } else {
      const lastRow = sheet.getLastRow();
      if (lastRow === 0) {
        sheet.appendRow(schemas[key]);
      } else {
        const existingHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
        const targetHeaders = schemas[key];
        targetHeaders.forEach(th => {
          if (existingHeaders.indexOf(th) === -1) {
            sheet.getRange(1, sheet.getLastColumn() + 1).setValue(th);
          }
        });
      }
    }
  });
}
