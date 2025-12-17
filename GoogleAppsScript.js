// ID của Google Sheet (Lấy từ URL của bạn)
const SPREADSHEET_ID = '1ti6EGfBqo5yI4x2BspABgKtvAs5lL_zeKcdwxNbpUjo';

// Tên các Sheet tương ứng với các trường dữ liệu
const SHEET_NAMES = {
  holters: 'Holters',
  tasks: 'Tasks',
  consultations: 'Consultations',
  discharges: 'Discharges',
  vitals: 'Vitals',
  glucoseRecords: 'GlucoseRecords',
  tracker: 'tracker'
};

function doGet(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const data = {};

  // Khởi tạo các sheet nếu chưa có
  setupSheets(ss);

  // Đọc dữ liệu từ từng sheet
  Object.keys(SHEET_NAMES).forEach(key => {
    const sheetName = SHEET_NAMES[key];
    const sheet = ss.getSheetByName(sheetName);
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    
    // Chuyển đổi rows thành array of objects
    data[key] = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        // Xử lý dữ liệu boolean cho tasks
        let value = row[index];
        if (header === 'completed') value = value === true || value === 'TRUE';
        obj[header] = value;
      });
      return obj;
    });
  });

  data.lastUpdated = new Date().toISOString();

  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const body = JSON.parse(e.postData.contents);
  const action = body.action; // 'create', 'update', 'delete'
  const key = body.type; // 'tasks', 'holters', ...
  const item = body.data;
  const sheetName = SHEET_NAMES[key];
  const sheet = ss.getSheetByName(sheetName);
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    if (action === 'create') {
      const row = headers.map(header => item[header] || '');
      sheet.appendRow(row);
    } 
    else if (action === 'update') {
      const data = sheet.getDataRange().getValues();
      // Tìm dòng dựa trên ID (giả sử cột đầu tiên hoặc cột 'id' là khóa)
      const idIndex = headers.indexOf('id');
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIndex]) === String(item.id)) {
          // Cập nhật từng cell
          headers.forEach((header, colIndex) => {
            if (item[header] !== undefined) {
              sheet.getRange(i + 1, colIndex + 1).setValue(item[header]);
            }
          });
          break;
        }
      }
    } 
    else if (action === 'delete') {
      const data = sheet.getDataRange().getValues();
      const idIndex = headers.indexOf('id');
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIndex]) === String(body.id)) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.toString()}))
    .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }

  return ContentService.createTextOutput(JSON.stringify({status: 'success'}))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupSheets(ss) {
  // Định nghĩa header cho từng loại dữ liệu
  const schemas = {
    holters: ['id', 'name', 'type', 'status', 'patientName', 'room', 'installDate', 'endTime'],
    tasks: ['id', 'title', 'date', 'completed', 'priority'],
    consultations: ['id', 'patientName', 'age', 'department', 'diagnosis', 'treatment', 'date'],
    discharges: ['id', 'patientName', 'room', 'note', 'date'],
    vitals: ['id', 'date', 'time', 'room', 'patientName', 'bp', 'pulse', 'temp', 'spO2'],
    glucoseRecords: ['id', 'date', 'time', 'room', 'patientName', 'insulinType', 'insulinDose', 'testResult'],
    tracker: ['id', 'key', 'bp', 'ecg']
  };

  Object.keys(SHEET_NAMES).forEach(key => {
    const sheetName = SHEET_NAMES[key];
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(schemas[key]);
    }
  });
}