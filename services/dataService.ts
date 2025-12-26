
import { SheetData, HolterType, HolterStatus, HolterDevice, Task, Consultation, Discharge, VitalsRecord, GlucoseRecord, CLSRecord, HandoverRecord, User } from '../types';

// ============================================================================
// CONFIGURATION
// ============================================================================
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbz0TYgO1INqFe7doW22-W9GXJHySUUPld8O16drEH8z3rwGrduP-O56wio-nrkXctHlMA/exec'; 

const STORAGE_KEY = 'KHOA_NOI_APP_DATA';
const AUTH_KEY = 'KHOA_NOI_AUTH_USER';
const API_URL_KEY = 'APP_API_URL';

const INITIAL_DATA: SheetData = {
  lastUpdated: new Date().toISOString(),
  holters: [],
  tasks: [],
  consultations: [],
  discharges: [],
  vitals: [],
  glucoseRecords: [],
  clsRecords: [],
  handovers: [],
  users: [],
  tracker: [
      { id: '1', key: 'maytrong', bp: '0', ecg: '0' },
      { id: '2', key: 'dangdeo', bp: '0', ecg: '0' },
      { id: '3', key: 'dangcho', bp: '0', ecg: '0' },
      { id: '4', key: 'khinaotrong', bp: '--:--', ecg: '--:--' }
  ]
};

// ============================================================================
// API HELPERS
// ============================================================================

export const getApiUrl = () => {
    return localStorage.getItem(API_URL_KEY) || DEFAULT_API_URL;
};

export const saveApiUrl = (url: string) => {
    localStorage.setItem(API_URL_KEY, url.trim());
};

export const isApiConfigured = () => {
    const url = getApiUrl();
    return url && url.length > 10 && url.startsWith('http') && url.includes('/exec');
};

const apiRequest = async (action: 'create' | 'update' | 'delete', type: string, dataOrId: any) => {
    if (!isApiConfigured()) return;
    
    const payload = {
        action,
        type,
        ...(action === 'delete' ? { id: dataOrId } : { data: dataOrId })
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); 

    try {
        const response = await fetch(getApiUrl(), {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            redirect: 'follow',
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Server Error: ${response.status}`);
        }
        const text = await response.text();
        return JSON.parse(text);
    } catch (error) {
        console.error("API Request Failed:", error);
        throw error;
    }
};

const normalizeData = (data: any): SheetData => {
    if (!data) return INITIAL_DATA;
    
    const formatDate = (d: any) => {
        if (!d) return '';
        const str = String(d);
        if (str === '1899-12-30') return new Date().toISOString().split('T')[0];
        if (str.includes('T')) return str.split('T')[0];
        return str;
    };

    const formatDateTime = (d: any) => {
        if (!d) return '';
        let str = String(d);
        if (str === '1899-12-30') return new Date().toISOString().substring(0, 16);
        if (str.includes('T')) return str.substring(0, 16);
        return str;
    };

    const formatTimeOnly = (t: any) => {
        if (!t) return '';
        let str = String(t);
        // Xử lý định dạng ISO "yyyy-MM-ddTHH:mm:ss"
        if (str.includes('T')) {
            const timePart = str.split('T')[1];
            return timePart.substring(0, 5);
        }
        // Xử lý định dạng "HH:mm:ss" hoặc "HH:mm"
        if (str.includes(':')) {
            return str.split(':').slice(0, 2).join(':');
        }
        return str;
    };

    return {
        ...INITIAL_DATA,
        ...data,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        tasks: Array.isArray(data.tasks) ? data.tasks.map((t: any) => ({ ...t, date: formatDate(t.date) })) : [],
        consultations: Array.isArray(data.consultations) ? data.consultations.map((c: any) => ({ ...c, date: formatDate(c.date) })) : [],
        discharges: Array.isArray(data.discharges) ? data.discharges.map((d: any) => ({ ...d, date: formatDate(d.date) })) : [],
        vitals: Array.isArray(data.vitals) ? data.vitals.map((v: any) => ({ 
            ...v, 
            date: formatDate(v.date),
            time: formatTimeOnly(v.time)
        })) : [],
        glucoseRecords: Array.isArray(data.glucoseRecords) ? data.glucoseRecords.map((g: any) => ({ ...g, date: formatDate(g.date) })) : [],
        clsRecords: Array.isArray(data.clsRecords) ? data.clsRecords.map((c: any) => ({ ...c, returnDate: formatDate(c.returnDate) })) : [],
        handovers: Array.isArray(data.handovers) ? data.handovers.map((h: any) => ({ ...h, date: formatDate(h.date) })) : [],
        users: Array.isArray(data.users) ? data.users : [],
        holters: Array.isArray(data.holters) ? data.holters.map((h: any) => ({ 
            ...h, 
            installDate: formatDateTime(h.installDate),
            endTime: h.endTime ? formatDateTime(h.endTime) : ''
        })) : [],
        tracker: Array.isArray(data.tracker) ? data.tracker.map((t: any) => ({
            ...t,
            bp: String(t.bp || '0'),
            ecg: String(t.ecg || '0')
        })) : INITIAL_DATA.tracker
    };
};

// ============================================================================
// DATA FUNCTIONS
// ============================================================================

export interface FetchResult {
    data: SheetData;
    isOffline: boolean;
}

export const fetchData = async (): Promise<FetchResult> => {
  let isOffline = false;

  if (isApiConfigured()) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); 

      try {
          const fetchUrl = `${getApiUrl()}?t=${new Date().getTime()}`;
          const response = await fetch(fetchUrl, {
              method: 'GET',
              mode: 'cors',
              credentials: 'omit',
              redirect: 'follow',
              signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

          const text = await response.text();
          if (!text || text.trim().startsWith('<')) {
              throw new Error("Dữ liệu trả về không đúng định dạng (có thể là HTML lỗi)");
          }

          const rawData = JSON.parse(text);
          const normalized = normalizeData(rawData);
          
          if (normalized.lastUpdated) {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          }
          
          return { data: normalized, isOffline: false };

      } catch (error) {
          console.warn("Fetch failed, falling back to local storage:", error);
          isOffline = true;
      }
  } else {
      isOffline = true;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
        const parsed = JSON.parse(stored);
        return { data: parsed, isOffline };
    } catch (e) {
        return { data: INITIAL_DATA, isOffline };
    }
  }
  
  return { data: INITIAL_DATA, isOffline };
};

const updateLocal = async (modifier: (current: SheetData) => SheetData): Promise<SheetData> => {
    const stored = localStorage.getItem(STORAGE_KEY);
    let current = stored ? JSON.parse(stored) : INITIAL_DATA;
    const newData = modifier(current);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    return newData;
};

export const saveData = async (data: SheetData): Promise<void> => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// AUTH FUNCTIONS
export const getCurrentUser = (): User | null => {
    const stored = localStorage.getItem(AUTH_KEY);
    return stored ? JSON.parse(stored) : null;
};

export const setCurrentUser = (user: User | null) => {
    if (user) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } else {
        localStorage.removeItem(AUTH_KEY);
    }
};

// SPECIFIC OPERATIONS
export const addTaskToSheet = async (task: Task): Promise<SheetData> => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const current = stored ? JSON.parse(stored) : INITIAL_DATA;
    const exists = current.tasks.some((t: any) => String(t.id) === String(task.id));

    const newData = await updateLocal(curr => {
        const updatedTasks = exists 
            ? curr.tasks.map(t => String(t.id) === String(task.id) ? task : t)
            : [...curr.tasks, task];
        return { ...curr, tasks: updatedTasks };
    });
    if (isApiConfigured()) apiRequest(exists ? 'update' : 'create', 'tasks', task).catch(console.error);
    return newData;
};

export const deleteTask = async (id: string): Promise<SheetData> => {
    const newData = await updateLocal(current => ({
        ...current,
        tasks: current.tasks.filter(t => t.id !== id)
    }));
    if (isApiConfigured()) apiRequest('delete', 'tasks', id).catch(console.error);
    return newData;
};

export const addConsultationToSheet = async (consultation: Consultation): Promise<SheetData> => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const current = stored ? JSON.parse(stored) : INITIAL_DATA;
    const exists = current.consultations.some((c: any) => String(c.id) === String(consultation.id));

    const newData = await updateLocal(curr => {
        const updated = exists 
            ? curr.consultations.map(c => String(c.id) === String(consultation.id) ? consultation : c)
            : [...curr.consultations, consultation];
        return { ...curr, consultations: updated };
    });
    if (isApiConfigured()) apiRequest(exists ? 'update' : 'create', 'consultations', consultation).catch(console.error);
    return newData;
};

export const deleteConsultation = async (id: string): Promise<SheetData> => {
    const newData = await updateLocal(current => ({
        ...current,
        consultations: current.consultations.filter(c => c.id !== id)
    }));
    if (isApiConfigured()) apiRequest('delete', 'consultations', id).catch(console.error);
    return newData;
};

export const addDischargeToSheet = async (discharge: Discharge): Promise<SheetData> => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const current = stored ? JSON.parse(stored) : INITIAL_DATA;
    const exists = current.discharges.some((d: any) => String(d.id) === String(discharge.id));

    const newData = await updateLocal(curr => {
        const updated = exists 
            ? curr.discharges.map(d => String(d.id) === String(discharge.id) ? discharge : d)
            : [...curr.discharges, discharge];
        return { ...curr, discharges: updated };
    });
    if (isApiConfigured()) apiRequest(exists ? 'update' : 'create', 'discharges', discharge).catch(console.error);
    return newData;
};

export const deleteDischarge = async (id: string): Promise<SheetData> => {
    const newData = await updateLocal(current => ({
        ...current,
        discharges: current.discharges.filter(d => d.id !== id)
    }));
    if (isApiConfigured()) apiRequest('delete', 'discharges', id).catch(console.error);
    return newData;
};

export const addVitalsToSheet = async (vital: VitalsRecord): Promise<SheetData> => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const current = stored ? JSON.parse(stored) : INITIAL_DATA;
    const exists = current.vitals.some((v: any) => String(v.id) === String(vital.id));

    const newData = await updateLocal(curr => {
        const updated = exists 
            ? curr.vitals.map(v => String(v.id) === String(vital.id) ? vital : v)
            : [...curr.vitals, vital];
        return { ...curr, vitals: updated };
    });
    if (isApiConfigured()) apiRequest(exists ? 'update' : 'create', 'vitals', vital).catch(console.error);
    return newData;
};

export const deleteVitals = async (id: string): Promise<SheetData> => {
    const newData = await updateLocal(current => ({
        ...current,
        vitals: current.vitals.filter(v => v.id !== id)
    }));
    if (isApiConfigured()) apiRequest('delete', 'vitals', id).catch(console.error);
    return newData;
};

export const addGlucoseToSheet = async (record: GlucoseRecord): Promise<SheetData> => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const current = stored ? JSON.parse(stored) : INITIAL_DATA;
    const exists = current.glucoseRecords.some((g: any) => String(g.id) === String(record.id));

    const newData = await updateLocal(curr => {
        const updated = exists 
            ? curr.glucoseRecords.map(g => String(g.id) === String(record.id) ? record : g)
            : [...curr.glucoseRecords, record];
        return { ...curr, glucoseRecords: updated };
    });
    if (isApiConfigured()) apiRequest(exists ? 'update' : 'create', 'glucoseRecords', record).catch(console.error);
    return newData;
};

export const deleteGlucose = async (id: string): Promise<SheetData> => {
    const newData = await updateLocal(current => ({
        ...current,
        glucoseRecords: current.glucoseRecords.filter(g => g.id !== id)
    }));
    if (isApiConfigured()) apiRequest('delete', 'glucoseRecords', id).catch(console.error);
    return newData;
};

export const addHolterToSheet = async (holter: HolterDevice): Promise<SheetData> => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const current = stored ? JSON.parse(stored) : INITIAL_DATA;
    const exists = current.holters.some((h: any) => String(h.id) === String(holter.id));

    const newData = await updateLocal(curr => {
        const updated = exists 
            ? curr.holters.map(h => String(h.id) === String(holter.id) ? holter : h)
            : [...curr.holters, holter];
        return { ...curr, holters: updated };
    });
    if (isApiConfigured()) apiRequest(exists ? 'update' : 'create', 'holters', holter).catch(console.error);
    return newData;
};

export const deleteHolter = async (id: string): Promise<SheetData> => {
    const newData = await updateLocal(current => ({
        ...current,
        holters: current.holters.filter(h => h.id !== id)
    }));
    if (isApiConfigured()) apiRequest('delete', 'holters', id).catch(console.error);
    return newData;
};

export const addCLSToSheet = async (record: CLSRecord): Promise<SheetData> => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const current = stored ? JSON.parse(stored) : INITIAL_DATA;
    const exists = current.clsRecords.some((c: any) => String(c.id) === String(record.id));

    const newData = await updateLocal(curr => {
        const updated = exists 
            ? curr.clsRecords.map(c => String(c.id) === String(record.id) ? record : c)
            : [...curr.clsRecords, record];
        return { ...curr, clsRecords: updated };
    });
    
    if (isApiConfigured()) {
        apiRequest(exists ? 'update' : 'create', 'clsRecords', record).catch(err => {
            console.error("Lỗi khi đồng bộ CLS lên Sheet:", err);
        });
    }
    return newData;
};

export const deleteCLS = async (id: string): Promise<SheetData> => {
    const newData = await updateLocal(current => ({
        ...current,
        clsRecords: current.clsRecords.filter(c => c.id !== id)
    }));
    if (isApiConfigured()) apiRequest('delete', 'clsRecords', id).catch(console.error);
    return newData;
};

export const addHandoverToSheet = async (record: HandoverRecord): Promise<SheetData> => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const current = stored ? JSON.parse(stored) : INITIAL_DATA;
    const exists = current.handovers.some((h: any) => String(h.id) === String(record.id));

    const newData = await updateLocal(curr => {
        const updated = exists 
            ? curr.handovers.map(h => String(h.id) === String(record.id) ? record : h)
            : [...curr.handovers, record];
        return { ...curr, handovers: updated };
    });
    
    if (isApiConfigured()) apiRequest(exists ? 'update' : 'create', 'handovers', record).catch(console.error);
    return newData;
};

export const deleteHandover = async (id: string): Promise<SheetData> => {
    const newData = await updateLocal(current => ({
        ...current,
        handovers: current.handovers.filter(h => h.id !== id)
    }));
    if (isApiConfigured()) apiRequest('delete', 'handovers', id).catch(console.error);
    return newData;
};
