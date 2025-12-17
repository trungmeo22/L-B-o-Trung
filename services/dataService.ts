import { SheetData, HolterType, HolterStatus, HolterDevice, Task, Consultation, Discharge, VitalsRecord, GlucoseRecord } from '../types';

// ============================================================================
// CONFIGURATION
// ============================================================================
// Dán URL Web App từ Google Apps Script vào đây.
// Nếu để trống, App sẽ chạy chế độ Offline (LocalStorage).
const API_URL: string = 'https://script.google.com/macros/s/AKfycbyAGbIiI0qwTwyA125RbstoJTFTUO_ZjsQPjANLK4Hpq10y_ebb_TpsFpzvIweDQvbaRA/exec'; 
// Ví dụ: const API_URL = 'https://script.google.com/macros/s/AKfycbx.../exec';

const STORAGE_KEY = 'KHOA_NOI_APP_DATA';

// Helper to get today's date
const getTodayString = () => new Date().toISOString().split('T')[0];
const getYesterdayString = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
};

// Mock Data for Initial Offline Use
const INITIAL_DATA: SheetData = {
  lastUpdated: new Date().toISOString(),
  holters: [
    { id: 'h1', name: 'ECG-01', type: HolterType.ECG, status: HolterStatus.COMPLETED, patientName: '', room: '', installDate: '' },
    { id: 'h2', name: 'ECG-02', type: HolterType.ECG, status: HolterStatus.ACTIVE, patientName: 'Nguyen Van A', room: 'P301', installDate: '2023-10-27', endTime: '14:00' },
    { id: 'h4', name: 'HA-01', type: HolterType.BP, status: HolterStatus.COMPLETED, patientName: '', room: '', installDate: '' },
    { id: 'h5', name: 'HA-02', type: HolterType.BP, status: HolterStatus.ACTIVE, patientName: 'Le Van C', room: 'Cấp cứu', installDate: '2023-10-27', endTime: '16:30' },
  ],
  tasks: [
    { id: 't1', title: 'Họp giao ban khoa', date: getTodayString(), completed: false, priority: 'medium' },
  ],
  consultations: [],
  discharges: [],
  vitals: [],
  glucoseRecords: [],
  tracker: [
      { id: '1', key: 'available', bp: '5', ecg: '3' },
      { id: '2', key: 'wearing', bp: '2', ecg: '1' },
      { id: '3', key: 'waiting', bp: '0', ecg: '0' },
      { id: '4', key: 'next_free', bp: '14:00', ecg: '10:00' }
  ]
};

// ============================================================================
// API HELPERS
// ============================================================================

const isApiConfigured = () => API_URL && API_URL.startsWith('http');

const apiRequest = async (action: 'create' | 'update' | 'delete', type: string, dataOrId: any) => {
    if (!isApiConfigured()) return;
    
    // Google Apps Script requires content-type text/plain to avoid CORS preflight issues in some cases.
    
    const payload = {
        action,
        type,
        ...(action === 'delete' ? { id: dataOrId } : { data: dataOrId })
    };

    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            // Important: Use text/plain to avoid OPTIONS preflight request which GAS doesn't support
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
        });
    } catch (error) {
        console.error("API Request Failed:", error);
        throw error;
    }
};

// Helper to normalize dates coming from Google Sheets (ISO format to YYYY-MM-DD)
const normalizeData = (data: any): SheetData => {
    const formatDate = (d: any) => {
        if (!d) return '';
        if (typeof d === 'string' && d.includes('T')) {
            return d.split('T')[0];
        }
        return String(d);
    };

    return {
        ...data,
        tasks: Array.isArray(data.tasks) ? data.tasks.map((t: any) => ({ ...t, date: formatDate(t.date) })) : [],
        consultations: Array.isArray(data.consultations) ? data.consultations.map((c: any) => ({ ...c, date: formatDate(c.date) })) : [],
        discharges: Array.isArray(data.discharges) ? data.discharges.map((d: any) => ({ ...d, date: formatDate(d.date) })) : [],
        vitals: Array.isArray(data.vitals) ? data.vitals.map((v: any) => ({ ...v, date: formatDate(v.date) })) : [],
        glucoseRecords: Array.isArray(data.glucoseRecords) ? data.glucoseRecords.map((g: any) => ({ ...g, date: formatDate(g.date) })) : [],
        holters: Array.isArray(data.holters) ? data.holters.map((h: any) => ({ 
            ...h, 
            installDate: formatDate(h.installDate),
            // endTime might be a time string (14:00) or date (2023-10-20), handle ISO if present
            endTime: h.endTime && String(h.endTime).includes('T') ? formatDate(h.endTime) : h.endTime 
        })) : [],
        tracker: Array.isArray(data.tracker) ? data.tracker.map((t: any) => ({
            ...t,
            bp: String(t.bp),
            ecg: String(t.ecg)
        })) : []
    };
};

// ============================================================================
// DATA FUNCTIONS
// ============================================================================

export const fetchData = async (): Promise<SheetData> => {
  if (isApiConfigured()) {
      try {
          // Important: credentials: 'omit' prevents multi-account login conflicts
          const response = await fetch(API_URL, {
              method: 'GET',
              credentials: 'omit'
          });

          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }

          const rawData = await response.json();
          const normalizedData = normalizeData(rawData);
          return { ...INITIAL_DATA, ...normalizedData };
      } catch (error) {
          console.error("Failed to fetch from Google Sheet, falling back to local.", error);
          // Fallback handled below
      }
  }

  // Local Storage Fallback
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
  return INITIAL_DATA;
};

// Helper for local storage updates
const updateLocal = async (modifier: (current: SheetData) => SheetData): Promise<SheetData> => {
    let current = await fetchData();
    // If we just fetched from API, we shouldn't save to LocalStorage as master, 
    // but for the sake of this hybrid service, we treat local as cache.
    const newData = modifier(current);
    if (!isApiConfigured()) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    }
    return newData;
};

export const saveData = async (data: SheetData): Promise<void> => {
    if (!isApiConfigured()) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
};

// ----------------------------------------------------------------------------
// TASKS
// ----------------------------------------------------------------------------

export const addTaskToSheet = async (task: Task): Promise<SheetData> => {
    // API Call
    if (isApiConfigured()) {
        // Check if exists (update) or new (create)
        const current = await fetchData();
        const exists = current.tasks.some(t => String(t.id) === String(task.id));
        await apiRequest(exists ? 'update' : 'create', 'tasks', task);
        return fetchData();
    }

    return updateLocal(current => {
        const exists = current.tasks.some(t => t.id === task.id);
        const updatedTasks = exists 
            ? current.tasks.map(t => t.id === task.id ? task : t)
            : [...current.tasks, task];
        return { ...current, tasks: updatedTasks };
    });
};

export const deleteTask = async (id: string): Promise<SheetData> => {
    if (isApiConfigured()) {
        await apiRequest('delete', 'tasks', id);
        return fetchData();
    }
    return updateLocal(current => ({
        ...current,
        tasks: current.tasks.filter(t => t.id !== id)
    }));
};

// ----------------------------------------------------------------------------
// CONSULTATIONS
// ----------------------------------------------------------------------------

export const addConsultationToSheet = async (consultation: Consultation): Promise<SheetData> => {
    if (isApiConfigured()) {
        const current = await fetchData();
        const exists = current.consultations.some(c => String(c.id) === String(consultation.id));
        await apiRequest(exists ? 'update' : 'create', 'consultations', consultation);
        return fetchData();
    }
    return updateLocal(current => {
        const exists = current.consultations.some(c => c.id === consultation.id);
        const updated = exists 
            ? current.consultations.map(c => c.id === consultation.id ? consultation : c)
            : [...current.consultations, consultation];
        return { ...current, consultations: updated };
    });
};

export const deleteConsultation = async (id: string): Promise<SheetData> => {
    if (isApiConfigured()) {
        await apiRequest('delete', 'consultations', id);
        return fetchData();
    }
    return updateLocal(current => ({
        ...current,
        consultations: current.consultations.filter(c => c.id !== id)
    }));
};

// ----------------------------------------------------------------------------
// DISCHARGES
// ----------------------------------------------------------------------------

export const addDischargeToSheet = async (discharge: Discharge): Promise<SheetData> => {
    if (isApiConfigured()) {
        const current = await fetchData();
        const exists = current.discharges.some(d => String(d.id) === String(discharge.id));
        await apiRequest(exists ? 'update' : 'create', 'discharges', discharge);
        return fetchData();
    }
    return updateLocal(current => {
        const exists = current.discharges.some(d => d.id === discharge.id);
        const updated = exists 
            ? current.discharges.map(d => d.id === discharge.id ? discharge : d)
            : [...current.discharges, discharge];
        return { ...current, discharges: updated };
    });
};

export const deleteDischarge = async (id: string): Promise<SheetData> => {
    if (isApiConfigured()) {
        await apiRequest('delete', 'discharges', id);
        return fetchData();
    }
    return updateLocal(current => ({
        ...current,
        discharges: current.discharges.filter(d => d.id !== id)
    }));
};

// ----------------------------------------------------------------------------
// VITALS
// ----------------------------------------------------------------------------

export const addVitalsToSheet = async (vital: VitalsRecord): Promise<SheetData> => {
    if (isApiConfigured()) {
        const current = await fetchData();
        const exists = current.vitals.some(v => String(v.id) === String(vital.id));
        await apiRequest(exists ? 'update' : 'create', 'vitals', vital);
        return fetchData();
    }
    return updateLocal(current => {
        const exists = current.vitals.some(v => v.id === vital.id);
        const updated = exists 
            ? current.vitals.map(v => v.id === vital.id ? vital : v)
            : [...current.vitals, vital];
        return { ...current, vitals: updated };
    });
};

export const deleteVitals = async (id: string): Promise<SheetData> => {
    if (isApiConfigured()) {
        await apiRequest('delete', 'vitals', id);
        return fetchData();
    }
    return updateLocal(current => ({
        ...current,
        vitals: current.vitals.filter(v => v.id !== id)
    }));
};

// ----------------------------------------------------------------------------
// GLUCOSE
// ----------------------------------------------------------------------------

export const addGlucoseToSheet = async (record: GlucoseRecord): Promise<SheetData> => {
    if (isApiConfigured()) {
        const current = await fetchData();
        const exists = current.glucoseRecords.some(g => String(g.id) === String(record.id));
        await apiRequest(exists ? 'update' : 'create', 'glucoseRecords', record);
        return fetchData();
    }
    return updateLocal(current => {
        const exists = current.glucoseRecords.some(g => g.id === record.id);
        const updated = exists 
            ? current.glucoseRecords.map(g => g.id === record.id ? record : g)
            : [...current.glucoseRecords, record];
        return { ...current, glucoseRecords: updated };
    });
};

export const deleteGlucose = async (id: string): Promise<SheetData> => {
    if (isApiConfigured()) {
        await apiRequest('delete', 'glucoseRecords', id);
        return fetchData();
    }
    return updateLocal(current => ({
        ...current,
        glucoseRecords: current.glucoseRecords.filter(g => g.id !== id)
    }));
};

// ----------------------------------------------------------------------------
// HOLTERS
// ----------------------------------------------------------------------------

export const addHolterToSheet = async (holter: HolterDevice): Promise<SheetData> => {
    if (isApiConfigured()) {
        const current = await fetchData();
        const exists = current.holters.some(h => String(h.id) === String(holter.id));
        await apiRequest(exists ? 'update' : 'create', 'holters', holter);
        return fetchData();
    }
    return updateLocal(current => {
        const exists = current.holters.some(h => h.id === holter.id);
        const updated = exists 
            ? current.holters.map(h => h.id === holter.id ? holter : h)
            : [...current.holters, holter];
        return { ...current, holters: updated };
    });
};

export const updateHolterStatus = async (holterId: string, status: HolterStatus, patientName?: string, endTime?: string): Promise<SheetData> => {
    if (isApiConfigured()) {
        // Send a partial update if API supports it, or generic update
        // Our simple generic update relies on ID matching.
        // We construct the update object.
        const updatePayload = {
            id: holterId,
            status,
            ...(patientName !== undefined && { patientName }),
            ...(endTime !== undefined && { endTime })
        };
        await apiRequest('update', 'holters', updatePayload);
        return fetchData();
    }

    return updateLocal(current => {
        const updatedHolters = current.holters.map(h => {
            if (h.id === holterId) {
                return { ...h, status, patientName: patientName || h.patientName, endTime: endTime || h.endTime };
            }
            return h;
        });
        return { ...current, holters: updatedHolters };
    });
};

export const deleteHolter = async (id: string): Promise<SheetData> => {
    if (isApiConfigured()) {
        await apiRequest('delete', 'holters', id);
        return fetchData();
    }
    return updateLocal(current => ({
        ...current,
        holters: current.holters.filter(h => h.id !== id)
    }));
};

export const addActivityLog = async (type: string, data: any): Promise<void> => {
    console.log(`[DataService] Added new ${type}:`, data);
};