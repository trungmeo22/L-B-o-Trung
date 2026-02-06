
import { SheetData, HolterDevice, Task, Consultation, Discharge, VitalsRecord, GlucoseRecord, CLSRecord, HandoverRecord, DutyReport, User, TrackerRecord, HolterType, HolterStatus } from '../types';
import { db, auth } from './firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc,
  query,
  orderBy,
  where,
  limit
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';

// ============================================================================
// CONFIGURATION
// ============================================================================
const AUTH_KEY = 'KHOA_NOI_AUTH_USER';

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
  dutyReports: [],
  users: [],
  tracker: [
      { id: '1', key: 'maytrong', bp: '1', ecg: '2' },
      { id: '2', key: 'dangdeo', bp: '0', ecg: '0' },
      { id: '3', key: 'dangcho', bp: '0', ecg: '0' },
      { id: '4', key: 'khinaotrong', bp: '--:--', ecg: '--:--' }
  ]
};

// ============================================================================
// HELPERS
// ============================================================================

// Helper to sanitize data before sending to Firestore (remove undefined)
const sanitize = (obj: any) => {
  const newObj: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};

// Calculate date 3 days ago in YYYY-MM-DD format for filtering
const getThreeDaysAgoISO = () => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    return d.toISOString().split('T')[0];
};

// Calculate date 7 days ago in YYYY-MM-DD format for filtering
const getSevenDaysAgoISO = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
};

// Calculate date 30 days ago in YYYY-MM-DD format for filtering
const getThirtyDaysAgoISO = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
};

// Helper to wait for auth to be ready
const waitForAuthReady = () => {
  return new Promise<FirebaseUser | null>((resolve) => {
     // If auth is already initialized (currentUser is not null or explicitly null after init), resolve immediately
     // Note: firebase/auth doesn't expose a simple "isInitialized" property easily, 
     // but onAuthStateChanged triggers immediately with current state.
     const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
     });
  });
};

// ============================================================================
// DATA FUNCTIONS
// ============================================================================

export interface FetchResult {
    data: SheetData;
    isOffline: boolean;
}

export const fetchData = async (): Promise<FetchResult> => {
  try {
      let user = auth.currentUser;
      if (!user) {
         user = await waitForAuthReady();
      }

      if (!user) throw new Error("User not authenticated");

      const cutoffDate = getThreeDaysAgoISO();
      const sevenDaysAgoDate = getSevenDaysAgoISO();
      const thirtyDaysAgoDate = getThirtyDaysAgoISO();

      // OPTIMIZED QUERY LOGIC - SAFE & CHEAP
      // 1. Get ALL Active/Pending items (Limited by physical devices, usually < 10 docs)
      // This ensures 'Tracker' is always accurate even if installed > 3 days ago.
      const holtersActiveQuery = query(collection(db, 'holters'), where('status', 'in', [HolterStatus.ACTIVE, HolterStatus.PENDING]));
      
      // 2. Get ALL Holters created/installed recently (Last 7 days)
      const holtersRecentQuery = query(collection(db, 'holters'), where('installDate', '>=', sevenDaysAgoDate));

      const tasksQuery = collection(db, 'tasks'); // Fetch all tasks
      const consultationsQuery = query(collection(db, 'consultations'), where('date', '>=', cutoffDate));
      const dischargesQuery = query(collection(db, 'discharges'), where('date', '>=', cutoffDate));
      const vitalsQuery = query(collection(db, 'vitals'), where('date', '>=', cutoffDate));
      
      // Glucose: Fetch last 7 days
      const glucoseQuery = query(collection(db, 'glucoseRecords'), where('date', '>=', sevenDaysAgoDate));
      
      // CLS: Fetch ALL records (removed date filter)
      const clsQuery = collection(db, 'clsRecords');
      
      const handoversQuery = query(collection(db, 'handovers'), where('date', '>=', cutoffDate));
      
      // Duty Reports: Fetch last 30 days to support searching
      const dutyReportsQuery = query(collection(db, 'dutyReports'), where('date', '>=', thirtyDaysAgoDate));
      
      const [
        holtersActiveSnap,
        holtersRecentSnap,
        tasksSnap,
        consultationsSnap,
        dischargesSnap,
        vitalsSnap,
        glucoseSnap,
        clsSnap,
        handoversSnap,
        dutyReportsSnap
      ] = await Promise.all([
        getDocs(holtersActiveQuery),
        getDocs(holtersRecentQuery),
        getDocs(tasksQuery),
        getDocs(consultationsQuery),
        getDocs(dischargesQuery),
        getDocs(vitalsQuery),
        getDocs(glucoseQuery),
        getDocs(clsQuery),
        getDocs(handoversQuery),
        getDocs(dutyReportsQuery)
      ]);

      const mapDocs = <T>(snap: any): T[] => snap.docs.map((d: any) => ({ ...d.data(), id: d.id }));

      // MERGE & DEDUPLICATE HOLTERS
      // We might fetch the same active record twice (once in Active query, once in Recent query).
      // Use a Map to ensure unique ID.
      const holterMap = new Map<string, HolterDevice>();
      
      mapDocs<HolterDevice>(holtersActiveSnap).forEach(h => holterMap.set(h.id, h));
      mapDocs<HolterDevice>(holtersRecentSnap).forEach(h => holterMap.set(h.id, h));

      const holters = Array.from(holterMap.values());

      // --- CALCULATE TRACKER DATA ---
      const now = Date.now();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;

      const safeTime = (dateStr: string) => {
        if (!dateStr) return 0;
        const t = new Date(dateStr).getTime();
        return isNaN(t) ? 0 : t;
      };

      // Helper function to find the next available 24h slot
      const findNextSlot = (items: HolterDevice[], totalDevices: number): string => {
        // 1. Create a list of busy intervals [start, end]
        const intervals = items
            .filter(i => i.status === HolterStatus.ACTIVE || i.status === HolterStatus.PENDING)
            .map(i => {
                const s = safeTime(i.installDate);
                return { start: s, end: s + ONE_DAY_MS };
            })
            .filter(i => i.start > 0)
            .sort((a, b) => a.start - b.start);

        // 2. Define a function to check if a specific time 't' is valid for a 24h duration
        const isSlotAvailable = (t: number): boolean => {
            const tStart = t;
            const tEnd = t + ONE_DAY_MS;
            
            // Find all intervals that overlap with [tStart, tEnd]
            // An interval [s, e] overlaps if s < tEnd AND e > tStart
            const overlapping = intervals.filter(i => i.start < tEnd && i.end > tStart);
            
            // If total overlaps are strictly less than devices, it MIGHT be okay, 
            // but for safety with multiple devices, we check max concurrency.
            // If overlapping count is 0, it's definitely free.
            if (overlapping.length === 0) return true;

            // If we have single device and any overlap exists, it's busy.
            if (totalDevices === 1 && overlapping.length > 0) return false;

            // For multiple devices, we use sweep-line to find max concurrency within the proposed window
            const points: {time: number, type: number}[] = [];
            for (const interval of overlapping) {
                 // Clamp the interval to the window we are checking
                 const s = Math.max(tStart, interval.start);
                 const e = Math.min(tEnd, interval.end);
                 
                 if (s < e) {
                     points.push({ time: s, type: 1 });  // +1 busy
                     points.push({ time: e, type: -1 }); // -1 busy
                 }
            }
            
            points.sort((a, b) => {
                if (a.time !== b.time) return a.time - b.time;
                return a.type - b.type;
            });
            
            let maxBusy = 0;
            let currentBusy = 0;
            
            // Initial busy state at tStart (count intervals that started before tStart and haven't ended)
            currentBusy = 0; 
            
            for (const p of points) {
                currentBusy += p.type;
                if (currentBusy > maxBusy) maxBusy = currentBusy;
            }

            return maxBusy < totalDevices;
        };

        // 3. Identify candidate start times
        // Candidates are NOW, and the END time of every existing task (as that's when a resource frees up)
        const candidates = [now];
        intervals.forEach(i => {
            if (i.end > now) candidates.push(i.end);
        });
        
        // Sort candidates chronologically
        candidates.sort((a, b) => a - b);

        // 4. Check each candidate
        for (const t of candidates) {
            if (isSlotAvailable(t)) {
                return new Date(t).toISOString();
            }
        }
        
        return '--:--';
      };

      // Helper function to calculate if a machine is effectively occupied
      // A machine is occupied if:
      // 1. Status is ACTIVE (Wearing)
      // 2. Status is PENDING (Waiting) AND it blocks the "Immediate Future" (Next 24h).
      //    We use strict Overlap logic: Does the task [Start, Start+24] overlap with [Now, Now+24]?
      const isOccupying = (h: HolterDevice) => {
        if (h.status === HolterStatus.ACTIVE) return true;
        
        if (h.status === HolterStatus.PENDING) {
            const installTime = safeTime(h.installDate);
            // If no date (0), assume immediate = Occupied
            if (installTime === 0) return true;

            const pendingStart = installTime;
            const pendingEnd = installTime + ONE_DAY_MS;
            const windowStart = now;
            const windowEnd = now + ONE_DAY_MS;

            // Overlap exists if (StartA < EndB) and (EndA > StartB)
            // If the Pending Task starts way in the future (>24h from now), pendingStart >= windowEnd, so returns False.
            // If the Pending Task was way in the past (missed appointment >24h ago), pendingEnd <= windowStart, so returns False.
            return (pendingStart < windowEnd) && (pendingEnd > windowStart);
        }
        return false;
      };

      // 1. Holter HA (BP) - Total 1 device
      const bpDevices = holters.filter(h => h.type === HolterType.BP);
      const bpActiveCount = bpDevices.filter(h => h.status === HolterStatus.ACTIVE).length;
      const bpPendingCount = bpDevices.filter(h => h.status === HolterStatus.PENDING).length;
      
      // Calculate free count based on occupation logic
      const bpOccupiedCount = bpDevices.filter(isOccupying).length;
      let bpFreeCount = 1 - bpOccupiedCount;
      if (bpFreeCount < 0) bpFreeCount = 0;
      
      const bpNextFree = findNextSlot(bpDevices, 1);

      // 2. Holter ECG - Total 2 devices
      const ecgDevices = holters.filter(h => h.type === HolterType.ECG);
      const ecgActiveCount = ecgDevices.filter(h => h.status === HolterStatus.ACTIVE).length;
      const ecgPendingCount = ecgDevices.filter(h => h.status === HolterStatus.PENDING).length;
      
      // Calculate free count based on occupation logic
      const ecgOccupiedCount = ecgDevices.filter(isOccupying).length;
      let ecgFreeCount = 2 - ecgOccupiedCount;
      if (ecgFreeCount < 0) ecgFreeCount = 0;

      const ecgNextFree = findNextSlot(ecgDevices, 2);

      const computedTracker: TrackerRecord[] = [
          { id: '1', key: 'maytrong', bp: String(bpFreeCount), ecg: String(ecgFreeCount) },
          { id: '2', key: 'dangdeo', bp: String(bpActiveCount), ecg: String(ecgActiveCount) },
          { id: '3', key: 'dangcho', bp: String(bpPendingCount), ecg: String(ecgPendingCount) },
          { id: '4', key: 'khinaotrong', bp: bpNextFree, ecg: ecgNextFree }
      ];

      const normalizedData: SheetData = {
          lastUpdated: new Date().toISOString(),
          holters: holters,
          tasks: mapDocs(tasksSnap),
          consultations: mapDocs(consultationsSnap),
          discharges: mapDocs(dischargesSnap),
          vitals: mapDocs(vitalsSnap),
          glucoseRecords: mapDocs(glucoseSnap),
          clsRecords: mapDocs(clsSnap),
          handovers: mapDocs(handoversSnap),
          dutyReports: mapDocs<DutyReport>(dutyReportsSnap).map(r => ({
              ...r,
              transfers: Array.isArray(r.transfers) ? r.transfers : [],
              progressions: Array.isArray(r.progressions) ? r.progressions : [],
              admissions: Array.isArray(r.admissions) ? r.admissions : [],
              stats: r.stats || { old: '', in: '', out: '', transferIn: '', transferOut: '', remaining: '' }
          })),
          users: [], // Users handled by Auth
          tracker: computedTracker
      };

      // Check if any snapshot was from cache (basic check, though `metadata.fromCache` is per snapshot)
      const isFromCache = holtersActiveSnap.metadata.fromCache; 

      return { data: normalizedData, isOffline: isFromCache };

  } catch (error) {
      console.error("Firebase fetch error:", error instanceof Error ? error.message : "Unknown error");
      return { data: INITIAL_DATA, isOffline: true };
  }
};

// AUTH FUNCTIONS
export const getCurrentUser = (): User | null => {
    const stored = localStorage.getItem(AUTH_KEY);
    return stored ? JSON.parse(stored) : null;
};

// Internal helper to update local storage for smooth UX
const updateStoredUser = (user: User | null) => {
    if (user) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } else {
        localStorage.removeItem(AUTH_KEY);
    }
};

export const loginFirebase = async (username: string): Promise<User> => {
    const email = `${username}@khoanoi.internal`;
    throw new Error("Use loginWithPassword instead");
};

export const loginWithPassword = async (username: string, password: string): Promise<User> => {
    // Sanitize input
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    
    const email = `${cleanUsername}@khoanoi.internal`;
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, cleanPassword);
        const fbUser = userCredential.user;
        
        let displayName = fbUser.displayName || cleanUsername;

        // Fetch custom name from 'nameid' collection
        // Assuming the Document ID is the username (e.g. 'abc')
        try {
            const docRef = doc(db, 'nameid', cleanUsername);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data && data.name) {
                    displayName = data.name;
                }
            }
        } catch (fetchError) {
            console.error("Warning: Could not fetch custom name from 'nameid'", fetchError instanceof Error ? fetchError.message : "Unknown error");
            // Non-blocking error, continue with default display name
        }
        
        const user: User = {
            id: fbUser.uid,
            username: cleanUsername,
            displayName: displayName, 
            role: 'staff' // Default role
        };
        updateStoredUser(user);
        return user;
    } catch (error: any) {
        console.error("Login failed", error instanceof Error ? error.message : "Unknown error");
        throw error;
    }
};

// Helper function to sync user profile if it's stale (e.g. showing "abc")
export const syncUserProfile = async (currentUser: User): Promise<User> => {
    if (!currentUser || !currentUser.username) return currentUser;

    // IMPORTANT: Wait for Firebase Auth to initialize.
    // Reading Firestore usually requires an authenticated user.
    // If we query too early (before auth restores session), we get permission denied.
    if (!auth.currentUser) {
        await waitForAuthReady();
    }
    
    // Double check auth after waiting
    if (!auth.currentUser) {
        // Still no auth user? Might be offline or session expired. 
        // Cannot sync, return current local data.
        return currentUser;
    }

    try {
        const docRef = doc(db, 'nameid', currentUser.username);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // If the name in DB is different from current display name, update it
            if (data && data.name && data.name !== currentUser.displayName) {
                const updatedUser = { ...currentUser, displayName: data.name };
                updateStoredUser(updatedUser);
                return updatedUser;
            }
        }
    } catch (e) {
        console.error("Error syncing user profile:", e instanceof Error ? e.message : "Unknown error");
    }
    return currentUser;
};

export const logoutFirebase = async () => {
    await signOut(auth);
    updateStoredUser(null);
};

export const setCurrentUser = (user: User | null) => {
   updateStoredUser(user);
};

// API URL Functions (No longer needed but kept for interface compatibility if any)
export const getApiUrl = () => '';
export const saveApiUrl = (url: string) => {};
export const isApiConfigured = () => true;

// GENERIC FIRESTORE HELPERS
const addData = async (collectionName: string, item: any): Promise<SheetData> => {
    const docRef = await addDoc(collection(db, collectionName), sanitize(item));
    const res = await fetchData();
    return res.data;
};

const updateData = async (collectionName: string, item: any): Promise<SheetData> => {
    const docRef = doc(db, collectionName, item.id);
    await updateDoc(docRef, sanitize(item));
    const res = await fetchData();
    return res.data;
};

const deleteData = async (collectionName: string, id: string): Promise<SheetData> => {
    await deleteDoc(doc(db, collectionName, id));
    const res = await fetchData();
    return res.data;
};

// SPECIFIC OPERATIONS

export const addTaskToSheet = async (task: Task): Promise<SheetData> => {
    const docRef = doc(db, 'tasks', task.id);
    await setDoc(docRef, sanitize(task));
    
    const res = await fetchData();
    return res.data;
};

export const deleteTask = async (id: string): Promise<SheetData> => deleteData('tasks', id);

export const addConsultationToSheet = async (item: Consultation): Promise<SheetData> => {
    const docRef = doc(db, 'consultations', item.id);
    await setDoc(docRef, sanitize(item));
    const res = await fetchData();
    return res.data;
};
export const deleteConsultation = async (id: string): Promise<SheetData> => deleteData('consultations', id);

export const addDischargeToSheet = async (item: Discharge): Promise<SheetData> => {
    const docRef = doc(db, 'discharges', item.id);
    await setDoc(docRef, sanitize(item));
    const res = await fetchData();
    return res.data;
};
export const deleteDischarge = async (id: string): Promise<SheetData> => deleteData('discharges', id);

export const addVitalsToSheet = async (item: VitalsRecord): Promise<SheetData> => {
    const docRef = doc(db, 'vitals', item.id);
    await setDoc(docRef, sanitize(item));
    const res = await fetchData();
    return res.data;
};
export const deleteVitals = async (id: string): Promise<SheetData> => deleteData('vitals', id);

export const addGlucoseToSheet = async (item: GlucoseRecord): Promise<SheetData> => {
    const docRef = doc(db, 'glucoseRecords', item.id);
    await setDoc(docRef, sanitize(item));
    const res = await fetchData();
    return res.data;
};
export const deleteGlucose = async (id: string): Promise<SheetData> => deleteData('glucoseRecords', id);

export const addHolterToSheet = async (item: HolterDevice): Promise<SheetData> => {
    const docRef = doc(db, 'holters', item.id);
    await setDoc(docRef, sanitize(item));
    const res = await fetchData();
    return res.data;
};
export const deleteHolter = async (id: string): Promise<SheetData> => deleteData('holters', id);

export const addCLSToSheet = async (item: CLSRecord): Promise<SheetData> => {
    const docRef = doc(db, 'clsRecords', item.id);
    await setDoc(docRef, sanitize(item));
    const res = await fetchData();
    return res.data;
};
export const deleteCLS = async (id: string): Promise<SheetData> => deleteData('clsRecords', id);

export const addHandoverToSheet = async (item: HandoverRecord): Promise<SheetData> => {
    const docRef = doc(db, 'handovers', item.id);
    await setDoc(docRef, sanitize(item));
    const res = await fetchData();
    return res.data;
};
export const deleteHandover = async (id: string): Promise<SheetData> => deleteData('handovers', id);

export const addDutyReportToSheet = async (item: DutyReport): Promise<SheetData> => {
    const docRef = doc(db, 'dutyReports', item.id);
    await setDoc(docRef, sanitize(item));
    const res = await fetchData();
    return res.data;
};
export const deleteDutyReport = async (id: string): Promise<SheetData> => deleteData('dutyReports', id);
