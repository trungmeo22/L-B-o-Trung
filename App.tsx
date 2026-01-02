import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { SheetData, MenuItem, Task, HolterType, HolterStatus, HolterDevice, Consultation, Discharge, VitalsRecord, GlucoseRecord, GlucoseSlotData, CLSRecord, HandoverRecord, User } from './types';
import * as DataService from './services/dataService';
import HolterTracking from './components/HolterTracking';
import MenuGrid from './components/MenuGrid';
import WeeklyTasks from './components/WeeklyTasks';
import FloatingAddButton from './components/FloatingAddButton';
import Modal from './components/Modal';

// Dynamic import cho Login để giảm kích thước bundle ban đầu
const Login = React.lazy(() => import('./components/Login'));

// Icons using simplified SVG strings
const Icons = {
    Consultation: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    Discharge: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
    Vitals: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    ECG: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
    BP: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Glucose: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
    Task: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    Icons_CLS: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
    Handover: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
};

type ModalType = 'MENU' | 'TASK' | 'CONSULTATION' | 'DISCHARGE' | 'VITALS' | 'HOLTER_ECG' | 'HOLTER_BP' | 'GLUCOSE' | 'CLS' | 'HANDOVER' | 'LIST_HOLTER_ECG' | 'LIST_HOLTER_BP' | 'LIST_CONSULTATION' | 'DETAIL_CONSULTATION' | 'LIST_DISCHARGE' | 'LIST_VITALS' | 'LIST_GLUCOSE' | 'LIST_CLS' | 'LIST_HANDOVER' | null;

const GLUCOSE_DEFAULT_SLOTS = ["06:00", "11:00", "17:00", "21:00"];

function App() {
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(DataService.getCurrentUser());
  
  // Filtering state
  const [filterText, setFilterText] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');

  // Generic form state
  const [formData, setFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  // Helper to group by date
  const groupByDate = <T extends { date?: string; returnDate?: string }>(items: T[]) => {
      const groups: { [key: string]: T[] } = {};
      items.forEach(item => {
          const dateStr = item.date || item.returnDate || 'Unknown';
          if (!groups[dateStr]) groups[dateStr] = [];
          groups[dateStr].push(item);
      });
      return groups;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await DataService.fetchData();
      setData(result.data);
      setIsOnline(!result.isOffline);
    } catch (error) {
      console.error("Failed to load data", error);
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
        loadData();
    } else {
        setLoading(false);
    }
  }, [loadData, currentUser]);

  const handleRefresh = async () => {
    await loadData();
  };

  const handleTaskToggle = async (id: string) => {
    if (!data) return;
    const task = data.tasks.find(t => t.id === id);
    if (!task) return;

    const newCompleted = !task.completed;
    const updatedTask: Task = { 
        ...task, 
        completed: newCompleted,
        status: newCompleted ? 'xong' : 'chưa xong'
    };

    const updatedTasks = data.tasks.map(t => t.id === id ? updatedTask : t);
    setData({ ...data, tasks: updatedTasks });

    const newData = await DataService.addTaskToSheet(updatedTask);
    setData(newData);
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleModalClose = () => {
      setActiveModal(null);
      setFormData({});
      setSubmitting(false);
      setSelectedConsultation(null);
      setFilterText('');
      setDoctorFilter('');
  };

  const handleModalBack = () => {
      setFilterText(''); 
      setDoctorFilter('');
      if (activeModal === 'DETAIL_CONSULTATION' || activeModal === 'CONSULTATION') {
          setActiveModal('LIST_CONSULTATION');
          setFormData({});
          setSubmitting(false);
          return;
      }
      if (activeModal === 'DISCHARGE') {
          setActiveModal('LIST_DISCHARGE');
          setFormData({});
          setSubmitting(false);
          return;
      }
      if (activeModal === 'VITALS') {
          setActiveModal('LIST_VITALS');
          setFormData({});
          setSubmitting(false);
          return;
      }
      if (activeModal === 'GLUCOSE') {
          setActiveModal('LIST_GLUCOSE');
          setFormData({});
          setSubmitting(false);
          return;
      }
      if (activeModal === 'HOLTER_ECG') {
          setActiveModal('LIST_HOLTER_ECG');
          setFormData({});
          setSubmitting(false);
          return;
      }
      if (activeModal === 'HOLTER_BP') {
          setActiveModal('LIST_HOLTER_BP');
          setFormData({});
          setSubmitting(false);
          return;
      }
      if (activeModal === 'CLS') {
          setActiveModal('LIST_CLS');
          setFormData({});
          setSubmitting(false);
          return;
      }
      if (activeModal === 'HANDOVER') {
          setActiveModal('LIST_HANDOVER');
          setFormData({});
          setSubmitting(false);
          return;
      }
      setActiveModal('MENU');
      setFormData({});
      setSubmitting(false);
  }

  const handleLogout = async () => {
      if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
          await DataService.logoutFirebase();
          setCurrentUser(null);
          setData(null);
          handleModalClose();
      }
  };

  const handleDeleteHolter = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm('Bạn có chắc chắn muốn xóa dữ liệu này không?')) {
          const newData = await DataService.deleteHolter(id);
          setData(newData);
      }
  };

  const handleDeleteConsultation = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm('Bạn có chắc chắn muốn xóa hội chẩn này không?')) {
          const newData = await DataService.deleteConsultation(id);
          setData(newData);
      }
  };

  const handleDeleteDischarge = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm('Bạn có chắc chắn muốn xóa dữ liệu này không?')) {
          const newData = await DataService.deleteDischarge(id);
          setData(newData);
      }
  };

  const handleDeleteVitals = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm('Bạn có chắc chắn muốn xóa dữ liệu này không?')) {
          const newData = await DataService.deleteVitals(id);
          setData(newData);
      }
  };

  const handleDeleteGlucose = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm('Bạn có chắc chắn muốn xóa dữ liệu này không?')) {
          const newData = await DataService.deleteGlucose(id);
          setData(newData);
      }
  };

  const handleDeleteCLS = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa dữ liệu CLS này không?')) {
        const newData = await DataService.deleteCLS(id);
        setData(newData);
    }
  };

  const handleDeleteHandover = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa bản ghi bàn giao này không?')) {
        const newData = await DataService.deleteHandover(id);
        setData(newData);
    }
  };

  const handleDeleteTask = async (id: string) => {
      if (window.confirm('Bạn có chắc chắn muốn xóa công việc này không?')) {
          const newData = await DataService.deleteTask(id);
          setData(newData);
      }
  };

  const handleEditHolter = (item: HolterDevice, e: React.MouseEvent) => {
      e.stopPropagation();
      setFormData({
          id: item.id,
          name: item.name,
          patientName: item.patientName,
          room: item.room,
          status: item.status,
          installDate: item.installDate, 
          endTime: item.endTime
      });
      if (item.type === HolterType.ECG) {
          setActiveModal('HOLTER_ECG');
      } else {
          setActiveModal('HOLTER_BP');
      }
  };

  const handleEditConsultation = (item: Consultation, e: React.MouseEvent) => {
      e.stopPropagation();
      setFormData({
          id: item.id,
          patientName: item.patientName,
          age: item.age,
          department: item.department,
          consultantDoctor: item.consultantDoctor || '',
          diagnosis: item.diagnosis,
          treatment: item.treatment,
          date: item.date
      });
      setActiveModal('CONSULTATION');
  };

  const handleEditDischarge = (item: Discharge, e: React.MouseEvent) => {
      e.stopPropagation();
      setFormData({
          id: item.id,
          patientName: item.patientName,
          room: item.room,
          note: item.note
      });
      setActiveModal('DISCHARGE');
  };

  const handleEditVitals = (item: VitalsRecord, e: React.MouseEvent) => {
      e.stopPropagation();
      setFormData({
          id: item.id,
          date: item.date,
          time: item.time,
          room: item.room,
          patientName: item.patientName,
          bp: item.bp,
          pulse: item.pulse,
          temp: item.temp,
          spO2: item.spO2,
          note: item.note || ''
      });
      setActiveModal('VITALS');
  };

  const handleEditGlucose = (item: GlucoseRecord, e: React.MouseEvent) => {
      e.stopPropagation();
      let slots = [];
      try { slots = JSON.parse(item.slots || '[]'); } catch (e) { slots = []; }
      
      const slotMap: Record<string, GlucoseSlotData> = {};
      slots.forEach((s: GlucoseSlotData) => {
          slotMap[s.time] = s;
      });

      setFormData({
          id: item.id,
          date: item.date,
          room: item.room,
          patientName: item.patientName,
          note: item.note,
          selectedSlots: slotMap
      });
      setActiveModal('GLUCOSE');
  };

  const handleEditCLS = (item: CLSRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData({ ...item });
    setActiveModal('CLS');
  };

  const handleEditHandover = (item: HandoverRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData({ ...item });
    setActiveModal('HANDOVER');
  };

  const handleToggleCLSStatus = async (item: CLSRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedRecord: CLSRecord = {
      ...item,
      status: item.status === 'Chưa trả' ? 'Đã trả' : 'Chưa trả'
    };
    const newData = await DataService.addCLSToSheet(updatedRecord);
    setData(newData);
  };

  const handleEditTask = (item: Task) => {
      setFormData({
          id: item.id,
          title: item.title,
          priority: item.priority,
          date: item.date,
          completed: item.completed,
          status: item.status
      });
      setActiveModal('TASK');
  };

  const handleViewConsultation = (item: Consultation) => {
      setSelectedConsultation(item);
      setActiveModal('DETAIL_CONSULTATION');
  };

  const handleAddFromList = (type: string) => {
      setFormData({});
      
      const getCurrentTime24h = () => {
          const now = new Date();
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          return `${hours}:${minutes}`;
      };

      if (type === 'HOLTER_ECG') {
          const now = new Date();
          now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
          setFormData({ installDate: now.toISOString().slice(0, 16), status: HolterStatus.PENDING });
          setActiveModal('HOLTER_ECG');
      }
      if (type === 'HOLTER_BP') {
          const now = new Date();
          now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
          setFormData({ installDate: now.toISOString().slice(0, 16), status: HolterStatus.PENDING });
          setActiveModal('HOLTER_BP');
      }
      if (type === 'CONSULTATION') {
          setFormData({ date: new Date().toISOString().split('T')[0] });
          setActiveModal('CONSULTATION');
      }
      if (type === 'DISCHARGE') {
          setActiveModal('DISCHARGE');
      }
      if (type === 'VITALS') {
          setFormData({
              date: new Date().toISOString().split('T')[0],
              time: getCurrentTime24h(),
              note: ''
          });
          setActiveModal('VITALS');
      }
      if (type === 'GLUCOSE') {
          setFormData({
              date: new Date().toISOString().split('T')[0],
              selectedSlots: {}
          });
          setActiveModal('GLUCOSE');
      }
      if (type === 'CLS') {
          setFormData({
            returnDate: new Date().toISOString().split('T')[0],
            status: 'Chưa trả'
          });
          setActiveModal('CLS');
      }
      if (type === 'HANDOVER') {
          setFormData({
            date: new Date().toISOString().split('T')[0]
          });
          setActiveModal('HANDOVER');
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      
      try {
        let newData = null;
        switch (activeModal) {
            case 'TASK':
                if (formData.title) {
                    const isCompleted = formData.completed || false;
                    const newTask: Task = {
                        id: formData.id || Date.now().toString(),
                        title: formData.title,
                        date: formData.date || new Date().toLocaleDateString('vi-VN'),
                        completed: isCompleted,
                        priority: formData.priority || 'medium',
                        status: isCompleted ? 'xong' : 'chưa xong'
                    };
                    newData = await DataService.addTaskToSheet(newTask);
                }
                break;
            case 'HOLTER_ECG':
            case 'HOLTER_BP':
                if (formData.patientName && formData.room) {
                    const newHolter: HolterDevice = {
                        id: formData.id || Date.now().toString(),
                        name: formData.name || '',
                        type: activeModal === 'HOLTER_ECG' ? HolterType.ECG : HolterType.BP,
                        status: formData.status || HolterStatus.PENDING,
                        patientName: formData.patientName,
                        room: formData.room,
                        installDate: formData.installDate || '', 
                        endTime: formData.endTime || ''
                    };
                    newData = await DataService.addHolterToSheet(newHolter);
                }
                break;
            case 'CONSULTATION':
                if (formData.patientName && formData.department) {
                    const newConsultation: Consultation = {
                        id: formData.id || Date.now().toString(),
                        patientName: formData.patientName,
                        age: formData.age || '',
                        department: formData.department,
                        consultantDoctor: formData.consultantDoctor || '',
                        diagnosis: formData.diagnosis || '',
                        treatment: formData.treatment || '',
                        date: formData.date || new Date().toISOString().split('T')[0]
                    };
                    newData = await DataService.addConsultationToSheet(newConsultation);
                }
                break;
            case 'DISCHARGE':
                 if (formData.patientName && formData.room) {
                    const newDischarge: Discharge = {
                        id: formData.id || Date.now().toString(),
                        patientName: formData.patientName,
                        room: formData.room,
                        note: formData.note || '',
                        date: formData.date || new Date().toISOString().split('T')[0] 
                    };
                    newData = await DataService.addDischargeToSheet(newDischarge);
                 }
                break;
            case 'VITALS':
                if (formData.patientName && formData.bp) {
                    const newVitals: VitalsRecord = {
                        id: formData.id || Date.now().toString(),
                        date: formData.date || new Date().toISOString().split('T')[0],
                        time: formData.time || '',
                        room: formData.room || '',
                        patientName: formData.patientName,
                        bp: formData.bp,
                        pulse: formData.pulse || '',
                        temp: formData.temp || '',
                        spO2: formData.spO2 || '',
                        note: formData.note || ''
                    };
                    newData = await DataService.addVitalsToSheet(newVitals);
                }
                break;
            case 'GLUCOSE':
                if (formData.patientName && formData.date && formData.selectedSlots) {
                    const slotsArray = Object.values(formData.selectedSlots);
                    const newGlucose: GlucoseRecord = {
                        id: formData.id || Date.now().toString(),
                        date: formData.date,
                        room: formData.room || '',
                        patientName: formData.patientName,
                        slots: JSON.stringify(slotsArray),
                        note: formData.note || ''
                    };
                    newData = await DataService.addGlucoseToSheet(newGlucose);
                }
                break;
            case 'CLS':
              if (formData.patientName && formData.cls) {
                const newCLS: CLSRecord = {
                  id: formData.id || Date.now().toString(),
                  patientName: formData.patientName,
                  phone: formData.phone || '',
                  cls: formData.cls,
                  returnDate: formData.returnDate || new Date().toISOString().split('T')[0],
                  doctor: formData.doctor || '',
                  status: formData.status || 'Chưa trả'
                };
                newData = await DataService.addCLSToSheet(newCLS);
              }
              break;
            case 'HANDOVER':
                if (formData.patientName && formData.content) {
                    const newHandover: HandoverRecord = {
                        id: formData.id || Date.now().toString(),
                        patientName: formData.patientName,
                        room: formData.room || '',
                        doctor: formData.doctor || '',
                        content: formData.content,
                        date: formData.date || new Date().toISOString().split('T')[0]
                    };
                    newData = await DataService.addHandoverToSheet(newHandover);
                }
                break;
        }
        
        if (newData) {
            setData(newData);
        }

        if (activeModal === 'CONSULTATION') setActiveModal('LIST_CONSULTATION');
        else if (activeModal === 'DISCHARGE') setActiveModal('LIST_DISCHARGE');
        else if (activeModal === 'VITALS') setActiveModal('LIST_VITALS');
        else if (activeModal === 'GLUCOSE') setActiveModal('LIST_GLUCOSE');
        else if (activeModal === 'HOLTER_ECG') setActiveModal('LIST_HOLTER_ECG');
        else if (activeModal === 'HOLTER_BP') setActiveModal('LIST_HOLTER_BP');
        else if (activeModal === 'CLS') setActiveModal('LIST_CLS');
        else if (activeModal === 'HANDOVER') setActiveModal('LIST_HANDOVER');
        else handleModalClose();

      } catch (err) {
          console.error(err);
          alert("Lỗi khi lưu dữ liệu. Vui lòng kiểm tra lại kết nối.");
      } finally {
          setSubmitting(false);
          setFormData({}); 
          setFilterText(''); 
          setDoctorFilter('');
      }
  };

  const formatDateTimeDisplay = (isoString: string) => {
      if (!isoString) return '';
      try {
          const date = new Date(isoString);
          if (isNaN(date.getTime())) return isoString;
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          return `${hours}:${minutes} ${day}/${month}`;
      } catch (e) {
          return isoString;
      }
  };

  const renderSearchHeader = (placeholder: string, showDoctorFilter = false) => (
      <div className="sticky top-0 bg-white z-20 pb-4 space-y-2">
          <div className="relative">
              <input 
                type="text" 
                placeholder={placeholder}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
              />
              <svg className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              {filterText && (
                  <button onClick={() => setFilterText('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
              )}
          </div>
          {showDoctorFilter && (
            <div className="relative">
                <input 
                  type="text" 
                  placeholder="Lọc theo tên bác sĩ..."
                  className="w-full pl-10 pr-4 py-2 bg-blue-50/50 border border-blue-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  value={doctorFilter}
                  onChange={e => setDoctorFilter(e.target.value)}
                />
                <svg className="w-5 h-5 absolute left-3 top-2.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {doctorFilter && (
                    <button onClick={() => setDoctorFilter('')} className="absolute right-3 top-2.5 text-blue-400 hover:text-blue-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                )}
            </div>
          )}
      </div>
  );

  const renderHolterList = (type: HolterType) => {
      const items = (data?.holters || [])
          .filter(h => h.type === type)
          .filter(h => !filterText || String(h.patientName || '').toLowerCase().includes(filterText.toLowerCase().trim()) || String(h.room || '').toLowerCase().includes(filterText.toLowerCase().trim()));

      const groups = [
          { status: HolterStatus.PENDING, label: 'Chưa lắp', color: 'border-l-yellow-500 bg-yellow-50/50' },
          { status: HolterStatus.ACTIVE, label: 'Đang lắp', color: 'border-l-green-500 bg-green-50/50' },
          { status: HolterStatus.COMPLETED, label: 'Đã tháo', color: 'border-l-slate-400 bg-white' },
          { status: HolterStatus.OTHER, label: 'Khác', color: 'border-l-purple-500 bg-purple-50/50' },
      ];

      return (
          <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between mb-4">
                 <button onClick={handleModalClose} className="text-sm text-slate-500 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Đóng
                 </button>
                 <button onClick={() => handleAddFromList(type === HolterType.ECG ? 'HOLTER_ECG' : 'HOLTER_BP')} className="flex items-center px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-full shadow-sm active:scale-95 transition-transform">
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Thêm mới
                 </button>
              </div>
              
              {renderSearchHeader("Tìm tên BN hoặc phòng...")}

              {groups.map(group => {
                  const groupItems = items.filter(h => h.status === group.status);
                  if (groupItems.length === 0) return null;
                  return (
                      <div key={group.status}>
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 ml-1">{group.label} ({groupItems.length})</h4>
                          <div className="space-y-2">
                              {groupItems.map(item => (
                                  <div key={item.id} className={`p-3 rounded-lg border shadow-sm ${group.color} border-l-4 group`}>
                                      <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                              <p className="font-bold text-slate-800">{item.patientName || 'Chưa có tên BN'}</p>
                                              <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-4 gap-y-2">
                                                  <span className="flex items-center">
                                                      <svg className="w-3 h-3 mr-1 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2H5a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                      {item.room || '---'}
                                                  </span>
                                                  {item.installDate && (
                                                      <span className="flex items-center">
                                                        <svg className="w-3 h-3 mr-1 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        Lắp: {formatDateTimeDisplay(item.installDate)}
                                                      </span>
                                                  )}
                                                  {item.endTime && (
                                                      <span className="flex items-center text-green-700 font-bold">
                                                        <svg className="w-3 h-3 mr-1 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        Tháo thực tế: {formatDateTimeDisplay(item.endTime)}
                                                      </span>
                                                  )}
                                                  {item.name && <span className="text-slate-400">({item.name})</span>}
                                              </div>
                                          </div>
                                          <div className="flex space-x-2 pl-2">
                                              <button onClick={(e) => handleEditHolter(item, e)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                              </button>
                                              <button onClick={(e) => handleDeleteHolter(item.id, e)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  );
              })}
              {items.length === 0 && <div className="text-center text-slate-400 py-8">Chưa có dữ liệu</div>}
          </div>
      );
  };

  const renderCLSList = () => {
    const items = (data?.clsRecords || [])
      .filter(c => !filterText.trim() || String(c.patientName || '').toLowerCase().includes(filterText.toLowerCase().trim()) || String(c.cls || '').toLowerCase().includes(filterText.toLowerCase().trim()))
      .filter(c => !doctorFilter.trim() || String(c.doctor || '').toLowerCase().includes(doctorFilter.toLowerCase().trim()));

    const groups = [
      { status: 'Chưa trả', label: 'Chưa trả kết quả', color: 'border-l-red-500 bg-red-50/30' },
      { status: 'Đã trả', label: 'Đã trả kết quả', color: 'border-l-green-500 bg-green-50/30' }
    ];

    return (
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between mb-4">
          <button onClick={handleModalClose} className="text-sm text-slate-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Đóng
          </button>
          <button onClick={() => handleAddFromList('CLS')} className="flex items-center px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-full shadow-sm active:scale-95 transition-transform">
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Thêm mới
          </button>
        </div>

        {renderSearchHeader("Tìm tên BN hoặc CLS...", true)}

        {groups.map(group => {
          const groupItems = items.filter(c => c.status === group.status);
          if (groupItems.length === 0) return null;
          return (
            <div key={group.status} className="mb-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 ml-1">{group.label} ({groupItems.length})</h4>
              <div className="space-y-2">
                {groupItems.map(item => (
                  <div key={item.id} className={`p-3 rounded-lg border shadow-sm ${group.color} border-l-4`}>
                    <div className="flex items-start">
                      <button 
                        onClick={(e) => handleToggleCLSStatus(item, e)}
                        className={`w-5 h-5 rounded border-2 mt-0.5 mr-3 flex-shrink-0 flex items-center justify-center transition-colors ${
                          item.status === 'Đã trả' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {item.status === 'Đã trả' && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <div className="flex-1">
                        <p className={`font-bold text-slate-800 ${item.status === 'Đã trả' ? 'line-through text-slate-400' : ''}`}>{item.patientName}</p>
                        <p className="text-sm font-medium text-blue-600 mt-1">{item.cls}</p>
                        <div className="text-[10px] text-slate-500 mt-1 grid grid-cols-2 gap-y-1">
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            {item.phone || 'N/A'}
                          </span>
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {item.returnDate}
                          </span>
                          <span className="col-span-2 flex items-center font-bold text-slate-600">
                            <svg className="w-3 h-3 mr-1 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            BS: {item.doctor || 'Chưa rõ'}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-1 pl-2">
                        <button onClick={(e) => handleEditCLS(item, e)} className="p-1.5 text-slate-400 hover:text-blue-500 bg-white/50 rounded-lg">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={(e) => handleDeleteCLS(item.id, e)} className="p-1.5 text-slate-400 hover:text-red-500 bg-white/50 rounded-lg">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {items.length === 0 && <div className="text-center text-slate-400 py-8">Không tìm thấy dữ liệu</div>}
      </div>
    );
  };

  const renderHandoverList = () => {
    const items = [...(data?.handovers || [])]
        .filter(h => !filterText.trim() || String(h.patientName || '').toLowerCase().includes(filterText.toLowerCase().trim()) || String(h.room || '').toLowerCase().includes(filterText.toLowerCase().trim()))
        .sort((a, b) => b.date.localeCompare(a.date));
    const grouped = groupByDate(items);
    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return (
        <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between mb-4">
               <button onClick={handleModalClose} className="text-sm text-slate-500 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Đóng
               </button>
               <button onClick={() => handleAddFromList('HANDOVER')} className="flex items-center px-3 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-full shadow-sm active:scale-95 transition-transform">
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Thêm mới
               </button>
            </div>

            {renderSearchHeader("Lọc tên BN hoặc phòng...")}

            {dates.length === 0 ? (
                <div className="text-center text-slate-400 py-8 border border-dashed rounded-lg">Không có dữ liệu bàn giao trực</div>
            ) : (
                dates.map(date => (
                    <div key={date} className="mb-6">
                        <div className="sticky top-12 bg-white/95 backdrop-blur py-2 z-10 border-b border-slate-100 mb-3">
                            <h4 className="text-[10px] font-bold text-rose-500 uppercase tracking-widest bg-rose-50 inline-block px-2 py-0.5 rounded">Ngày {date.split('-').reverse().join('/')}</h4>
                        </div>
                        <div className="space-y-3">
                            {grouped[date].map(item => (
                                <div key={item.id} className="p-3 rounded-xl border shadow-sm bg-white border-l-4 border-l-rose-500 group animate-fade-in">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-800 uppercase">{item.patientName}</p>
                                            <p className="text-xs font-semibold text-primary">{item.room}</p>
                                        </div>
                                        <div className="flex space-x-1 pl-2">
                                            <button onClick={(e) => handleEditHandover(item, e)} className="p-1.5 text-slate-400 hover:text-blue-500 bg-slate-50 rounded-lg">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button onClick={(e) => handleDeleteHandover(item.id, e)} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-50 rounded-lg">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-sm text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 italic whitespace-pre-wrap">
                                        {item.content}
                                    </div>
                                    {item.doctor && (
                                        <div className="mt-2 text-[10px] text-slate-500 flex items-center font-medium">
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            BS bàn giao: {item.doctor}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
  };

  const renderConsultationList = () => {
    const items = [...(data?.consultations || [])]
        .filter(c => !filterText.trim() || String(c.patientName || '').toLowerCase().includes(filterText.toLowerCase().trim()) || String(c.department || '').toLowerCase().includes(filterText.toLowerCase().trim()) || String(c.consultantDoctor || '').toLowerCase().includes(filterText.toLowerCase().trim()))
        .sort((a, b) => b.date.localeCompare(a.date));
    const grouped = groupByDate(items);
    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return (
        <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between mb-4">
               <button onClick={handleModalClose} className="text-sm text-slate-500 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Đóng
               </button>
               <button onClick={() => handleAddFromList('CONSULTATION')} className="flex items-center px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-full shadow-sm active:scale-95 transition-transform">
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Thêm mới
               </button>
            </div>

            {renderSearchHeader("Lọc tên BN, khoa, BS hoặc ngày...")}

            {dates.length === 0 ? (
                <div className="text-center text-slate-400 py-8 border border-dashed rounded-lg">Không có dữ liệu hội chẩn</div>
            ) : (
                dates.map(date => (
                    <div key={date} className="mb-6">
                        <div className="sticky top-12 bg-white/95 backdrop-blur py-2 z-10 border-b border-slate-100 mb-3">
                            <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 inline-block px-2 py-0.5 rounded">Ngày {date.split('-').reverse().join('/')}</h4>
                        </div>
                        <div className="space-y-2">
                            {grouped[date].map(item => (
                                <div key={item.id} onClick={() => handleViewConsultation(item)} className="p-3 rounded-lg border shadow-sm bg-white border-l-4 border-l-blue-500 active:bg-blue-50 cursor-pointer group">
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-800">{item.patientName}</p>
                                            <p className="text-xs text-slate-500 mt-1">Khoa: <span className="text-blue-600 font-medium">{item.department}</span></p>
                                            {item.consultantDoctor && (
                                                <p className="text-[10px] text-slate-400 mt-0.5 flex items-center">
                                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                    BS: {item.consultantDoctor}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <button onClick={(e) => handleEditConsultation(item, e)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button onClick={(e) => handleDeleteConsultation(item.id, e)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                            <svg className="w-5 h-5 text-slate-300 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
  };

  const renderDischargeList = () => {
    const items = [...(data?.discharges || [])]
        .filter(d => !filterText.trim() || String(d.patientName || '').toLowerCase().includes(filterText.toLowerCase().trim()) || String(d.room || '').toLowerCase().includes(filterText.toLowerCase().trim()))
        .sort((a, b) => b.date.localeCompare(a.date));
    const grouped = groupByDate(items);
    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return (
        <div className="space-y-4 pt-2">
             <div className="flex items-center justify-between mb-4">
               <button onClick={handleModalClose} className="text-sm text-slate-500 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Đóng
               </button>
               <button onClick={() => handleAddFromList('DISCHARGE')} className="flex items-center px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-full shadow-sm active:scale-95 transition-transform">
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Thêm mới
               </button>
            </div>

            {renderSearchHeader("Lọc tên BN, phòng hoặc ngày...")}

            {dates.length === 0 ? (
                <div className="text-center text-slate-400 py-8 border border-dashed rounded-lg">Không có dữ liệu ra viện</div>
            ) : (
                dates.map(date => (
                    <div key={date} className="mb-6">
                        <div className="sticky top-12 bg-white/95 backdrop-blur py-2 z-10 border-b border-slate-100 mb-3">
                            <h4 className="text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-50 inline-block px-2 py-0.5 rounded">Ngày {date.split('-').reverse().join('/')}</h4>
                        </div>
                        <div className="space-y-2">
                            {grouped[date].map(item => (
                                <div key={item.id} className="p-3 rounded-lg border shadow-sm bg-white border-l-4 border-l-green-500">
                                     <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-800">{item.patientName}</p>
                                            <p className="text-xs text-slate-600 mt-1 font-semibold text-primary">{item.room}</p>
                                            {item.note && <p className="text-xs text-slate-500 mt-1 italic bg-slate-50 p-1.5 rounded">"{item.note}"</p>}
                                        </div>
                                        <div className="flex items-center space-x-1 pl-2">
                                             <button onClick={(e) => handleEditDischarge(item, e)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button onClick={(e) => handleDeleteDischarge(item.id, e)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                     </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
  };

  const renderVitalsList = () => {
      const items = [...(data?.vitals || [])]
          .filter(v => !filterText.trim() || String(v.patientName || '').toLowerCase().includes(filterText.toLowerCase().trim()) || String(v.room || '').toLowerCase().includes(filterText.toLowerCase().trim()))
          .sort((a, b) => {
              if (a.date !== b.date) return b.date.localeCompare(a.date);
              return b.time.localeCompare(a.time);
          });
      const grouped = groupByDate(items);
      const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

      return (
          <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between mb-4">
               <button onClick={handleModalClose} className="text-sm text-slate-500 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Đóng
               </button>
               <button onClick={() => handleAddFromList('VITALS')} className="flex items-center px-3 py-1.5 bg-purple-500 text-white text-xs font-bold rounded-full shadow-sm active:scale-95 transition-transform">
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Thêm mới
               </button>
            </div>

            {renderSearchHeader("Lọc tên BN, phòng hoặc ngày...")}

            {dates.length === 0 ? (
                <div className="text-center text-slate-400 py-8 border border-dashed rounded-lg">Không có dữ liệu dấu hiệu sinh tồn</div>
            ) : (
                dates.map(date => (
                    <div key={date} className="mb-6">
                        <div className="sticky top-12 bg-white/95 backdrop-blur py-2 z-10 border-b border-slate-100 mb-3">
                            <h4 className="text-[10px] font-bold text-purple-600 uppercase tracking-widest bg-purple-50 inline-block px-2 py-0.5 rounded">Ngày {date.split('-').reverse().join('/')}</h4>
                        </div>
                        <div className="space-y-3">
                            {grouped[date].map(item => (
                                <div key={item.id} className="p-3 rounded-lg border shadow-sm bg-white border-l-4 border-l-purple-500 animate-fade-in">
                                    <div className="flex justify-between border-b border-slate-100 pb-2 mb-2">
                                        <div className="flex items-center">
                                            <span className="text-lg font-bold text-slate-800">{item.time}</span>
                                            <span className="mx-2 text-slate-300">|</span>
                                            <span className="font-semibold text-primary">{item.room}</span>
                                        </div>
                                        <div className="flex space-x-1">
                                            <button onClick={(e) => handleEditVitals(item, e)} className="text-slate-400 hover:text-blue-500 p-1 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button onClick={(e) => handleDeleteVitals(item.id, e)} className="text-slate-400 hover:text-red-500 p-1 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-700 mb-2">{item.patientName}</p>
                                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                            <div className="bg-red-50 rounded p-1">
                                                <span className="block text-red-400 text-[10px] uppercase">HA</span>
                                                <span className="font-bold text-red-700">{item.bp}</span>
                                            </div>
                                            <div className="bg-blue-50 rounded p-1">
                                                <span className="block text-blue-400 text-[10px] uppercase">Mạch</span>
                                                <span className="font-bold text-blue-700">{item.pulse}</span>
                                            </div>
                                            <div className="bg-yellow-50 rounded p-1">
                                                <span className="block text-yellow-500 text-[10px] uppercase">T°</span>
                                                <span className="font-bold text-yellow-700">{item.temp}</span>
                                            </div>
                                            <div className="bg-green-50 rounded p-1">
                                                <span className="block text-green-400 text-[10px] uppercase">SpO2</span>
                                                <span className="font-bold text-green-700">{item.spO2}</span>
                                            </div>
                                        </div>
                                        {item.note && (
                                          <div className="mt-2 text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded border border-slate-100">
                                            Chú thích: {item.note}
                                          </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
      );
  }

  const renderGlucoseList = () => {
    const items = [...(data?.glucoseRecords || [])]
        .filter(g => !filterText.trim() || String(g.patientName || '').toLowerCase().includes(filterText.toLowerCase().trim()) || String(g.room || '').toLowerCase().includes(filterText.toLowerCase().trim()))
        .sort((a, b) => b.date.localeCompare(a.date));
    const grouped = groupByDate(items);
    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return (
        <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between mb-4">
               <button onClick={handleModalClose} className="text-sm text-slate-500 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Đóng
               </button>
               <button onClick={() => handleAddFromList('GLUCOSE')} className="flex items-center px-3 py-1.5 bg-yellow-500 text-white text-xs font-bold rounded-full shadow-sm active:scale-95 transition-transform">
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Thêm mới
               </button>
            </div>

            {renderSearchHeader("Lọc tên BN, phòng hoặc ngày...")}

            {dates.length === 0 ? (
                <div className="text-center text-slate-400 py-8 border border-dashed rounded-lg">Không có dữ liệu đường huyết</div>
            ) : (
                dates.map(date => (
                    <div key={date} className="mb-6 animate-fade-in">
                         <div className="sticky top-12 bg-white/95 backdrop-blur py-2 z-10 border-b border-slate-100 mb-3">
                            <h4 className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest bg-yellow-50 inline-block px-2 py-0.5 rounded">Ngày {date.split('-').reverse().join('/')}</h4>
                         </div>
                         <div className="space-y-4">
                            {grouped[date].map(item => {
                                let slots: GlucoseSlotData[] = [];
                                try { slots = JSON.parse(item.slots || '[]'); } catch(e) { slots = []; }

                                return (
                                    <div key={item.id} className="p-4 rounded-xl border shadow-sm bg-white border-l-4 border-l-yellow-500">
                                         <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center mb-1">
                                                    <span className="font-bold text-slate-800 text-lg uppercase">{item.patientName}</span>
                                                    <span className="mx-2 text-slate-300">|</span>
                                                    <span className="font-semibold text-primary">{item.room}</span>
                                                </div>
                                                {item.note && <p className="text-xs text-slate-500 italic">Ghi chú: {item.note}</p>}
                                            </div>
                                            <div className="flex space-x-1">
                                                <button onClick={(e) => handleEditGlucose(item, e)} className="text-slate-400 hover:text-blue-500 p-1.5 bg-slate-50 rounded-lg">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                                <button onClick={(e) => handleDeleteGlucose(item.id, e)} className="text-slate-400 hover:text-red-500 p-1.5 bg-slate-50 rounded-lg">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                         </div>
                                         
                                         <div className="grid grid-cols-1 gap-2">
                                            {slots.length === 0 ? (
                                                <p className="text-center text-xs text-slate-400 py-2">Chưa chọn mốc giờ nào</p>
                                            ) : (
                                                slots.map((slot, idx) => (
                                                    <div key={idx} className="flex flex-col bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-sm font-bold text-slate-700 bg-white px-2 py-0.5 rounded shadow-sm">{slot.time}</span>
                                                            <span className={`text-sm font-bold ${slot.testResult ? 'text-blue-600' : 'text-red-400 italic'}`}>
                                                                {slot.testResult ? `${slot.testResult} mmol/L` : 'CHƯA TEST'}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between text-xs mt-1">
                                                            <div className="flex items-center text-slate-500">
                                                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                                {slot.insulinType || '---'}
                                                            </div>
                                                            <div className="flex items-center text-red-600 font-medium">
                                                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                                                Liều: {slot.insulinDose || '---'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                         </div>
                                    </div>
                                );
                            })}
                         </div>
                    </div>
                ))
            )}
        </div>
    );
  };

  const renderConsultationDetail = () => {
      if (!selectedConsultation) return null;
      return (
          <div className="space-y-4 pt-2">
               <div className="flex items-center text-sm text-slate-500 mb-4 cursor-pointer" onClick={() => setActiveModal('LIST_CONSULTATION')}>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Quay lại danh sách
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-4">
                  <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bệnh nhân</h4>
                      <p className="text-lg font-bold text-slate-800">{selectedConsultation.patientName}</p>
                      <p className="text-sm text-slate-600">Tuổi: {selectedConsultation.age}</p>
                  </div>
                  <div className="w-full h-px bg-slate-100"></div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Khoa mời</h4>
                          <p className="text-base text-slate-800 font-medium text-blue-600">{selectedConsultation.department}</p>
                      </div>
                      <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">BS hội chẩn</h4>
                          <p className="text-base text-slate-800 font-bold text-slate-700">{selectedConsultation.consultantDoctor || 'Chưa rõ'}</p>
                      </div>
                  </div>
                  <div className="w-full h-px bg-slate-100"></div>
                  <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chẩn đoán sau hội chẩn</h4>
                      <p className="text-base text-slate-800">{selectedConsultation.diagnosis}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                      <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Hướng xử lý</h4>
                      <p className="text-base text-slate-800 font-medium">{selectedConsultation.treatment}</p>
                  </div>
              </div>
          </div>
      );
  }

  const renderModalContent = () => {
      if (activeModal === 'LIST_HOLTER_ECG') return renderHolterList(HolterType.ECG);
      if (activeModal === 'LIST_HOLTER_BP') return renderHolterList(HolterType.BP);
      if (activeModal === 'LIST_CONSULTATION') return renderConsultationList();
      if (activeModal === 'DETAIL_CONSULTATION') return renderConsultationDetail();
      if (activeModal === 'LIST_DISCHARGE') return renderDischargeList();
      if (activeModal === 'LIST_VITALS') return renderVitalsList();
      if (activeModal === 'LIST_GLUCOSE') return renderGlucoseList();
      if (activeModal === 'LIST_CLS') return renderCLSList();
      if (activeModal === 'LIST_HANDOVER') return renderHandoverList();
      
      if (activeModal === 'MENU') {
          const addOptions = [
              { id: 'add_task', label: 'Công việc tuần', icon: Icons.Task, color: 'bg-slate-100', action: () => setActiveModal('TASK') },
              { id: 'add_consult', label: 'Hội chẩn', icon: Icons.Consultation, color: 'bg-blue-100', action: () => handleAddFromList('CONSULTATION') },
              { id: 'add_discharge', label: 'Báo ra viện', icon: Icons.Discharge, color: 'bg-green-100', action: () => handleAddFromList('DISCHARGE') },
              { id: 'add_vitals', label: 'Báo DHST', icon: Icons.Vitals, color: 'bg-purple-100', action: () => handleAddFromList('VITALS') },
              { id: 'add_ecg', label: 'Thêm Holter ECG', icon: Icons.ECG, color: 'bg-red-100', action: () => handleAddFromList('HOLTER_ECG') },
              { id: 'add_bp', label: 'Thêm Holter HA', icon: Icons.BP, color: 'bg-indigo-100', action: () => handleAddFromList('HOLTER_BP') },
              { id: 'add_glucose', label: 'Báo đường huyết', icon: Icons.Glucose, color: 'bg-yellow-100', action: () => handleAddFromList('GLUCOSE') },
              { id: 'add_cls', label: 'Theo dõi CLS', icon: Icons.Icons_CLS, color: 'bg-orange-100', action: () => handleAddFromList('CLS') },
              { id: 'add_handover', label: 'Bàn giao trực', icon: Icons.Handover, color: 'bg-rose-100', action: () => handleAddFromList('HANDOVER') },
          ];
          return (
              <div className="py-2">
                  <p className="text-sm text-slate-500 mb-4 text-center">Chọn loại dữ liệu cần thêm</p>
                  <div className="grid grid-cols-2 gap-3">
                    {addOptions.map(opt => (
                        <button key={opt.id} onClick={opt.action} className="flex flex-col items-center p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${opt.color} bg-opacity-20`}>
                                <span className={opt.color.replace('bg-', 'text-').replace('100', '600')}>{opt.icon}</span>
                            </div>
                            <span className="text-xs font-medium text-slate-700">{opt.label}</span>
                        </button>
                    ))}
                  </div>
              </div>
          );
      }

      return (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 pb-6">
              <div className="flex items-center text-sm text-slate-500 mb-2 -mt-2 cursor-pointer" onClick={handleModalBack}>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Quay lại
              </div>
              {activeModal === 'TASK' && (
                  <>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung công việc</label>
                        <input required type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="Nhập tên công việc..." value={formData.title || ''} onChange={e => handleFormChange('title', e.target.value)} autoFocus />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mức độ ưu tiên</label>
                        <select className="w-full px-3 py-2 border rounded-lg outline-none bg-white" value={formData.priority || 'medium'} onChange={e => handleFormChange('priority', e.target.value)}>
                            <option value="low">Thấp</option>
                            <option value="medium">Bình thường</option>
                            <option value="high">Gấp</option>
                        </select>
                    </div>
                  </>
              )}
              {activeModal === 'CLS' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tên bệnh nhân</label>
                    <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20" placeholder="Họ tên BN..." value={formData.patientName || ''} onChange={e => handleFormChange('patientName', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                    <input type="tel" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20" placeholder="SĐT liên hệ..." value={formData.phone || ''} onChange={e => handleFormChange('phone', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cận lâm sàng (CLS)</label>
                    <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20" placeholder="Tên xét nghiệm/CĐHA..." value={formData.cls || ''} onChange={e => handleFormChange('cls', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Ngày hẹn trả</label>
                      <input required type="date" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20" value={formData.returnDate || ''} onChange={e => handleFormChange('returnDate', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Bác sĩ trả</label>
                      <input type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20" placeholder="Tên BS..." value={formData.doctor || ''} onChange={e => handleFormChange('doctor', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tình trạng</label>
                    <select className="w-full px-3 py-2 border rounded-lg outline-none bg-white" value={formData.status || 'Chưa trả'} onChange={e => handleFormChange('status', e.target.value)}>
                      <option value="Chưa trả">Chưa trả</option>
                      <option value="Đã trả">Đã trả</option>
                    </select>
                  </div>
                </>
              )}
              {activeModal === 'HANDOVER' && (
                  <>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tên bệnh nhân</label>
                        <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 uppercase" placeholder="Họ tên bệnh nhân..." value={formData.patientName || ''} onChange={e => handleFormChange('patientName', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phòng</label>
                            <input type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20" placeholder="P301" value={formData.room || ''} onChange={e => handleFormChange('room', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">BS bàn giao</label>
                            <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20" placeholder="Tên bác sĩ..." value={formData.doctor || ''} onChange={e => handleFormChange('doctor', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung bàn giao</label>
                        <textarea required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20" rows={4} placeholder="Nhập nội dung theo dõi, xử trí..." value={formData.content || ''} onChange={e => handleFormChange('content', e.target.value)}></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ngày bàn giao</label>
                        <input required type="date" className="w-full px-3 py-2 border rounded-lg outline-none bg-slate-50" value={formData.date || ''} onChange={e => handleFormChange('date', e.target.value)} />
                    </div>
                  </>
              )}
              {(activeModal === 'HOLTER_ECG' || activeModal === 'HOLTER_BP') && (
                  <>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tên bệnh nhân</label>
                        <input required type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="Nhập tên bệnh nhân..." value={formData.patientName || ''} onChange={e => handleFormChange('patientName', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Khoa / Phòng</label>
                        <input required type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="VD: Phòng 301" value={formData.room || ''} onChange={e => handleFormChange('room', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tình trạng</label>
                            <select className="w-full px-3 py-2 border rounded-lg outline-none bg-white" value={formData.status || HolterStatus.PENDING} onChange={e => handleFormChange('status', e.target.value)}>
                                <option value={HolterStatus.PENDING}>Chưa lắp</option>
                                <option value={HolterStatus.ACTIVE}>Đang lắp</option>
                                <option value={HolterStatus.COMPLETED}>Đã tháo</option>
                                <option value={HolterStatus.OTHER}>Khác</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ngày lắp dự kiến</label>
                            <input type="datetime-local" className="w-full px-3 py-2 border rounded-lg outline-none" value={formData.installDate || ''} onChange={e => handleFormChange('installDate', e.target.value)} />
                        </div>
                    </div>
                  </>
              )}
              {activeModal === 'CONSULTATION' && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                         <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tên bệnh nhân</label>
                            <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Tên BN" value={formData.patientName || ''} onChange={e => handleFormChange('patientName', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tuổi</label>
                            <input type="text" className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Tuổi" value={formData.age || ''} onChange={e => handleFormChange('age', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Khoa mời hội chẩn</label>
                            <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="VD: HSCC" value={formData.department || ''} onChange={e => handleFormChange('department', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Bác sĩ hội chẩn</label>
                            <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20" placeholder="Tên BS..." value={formData.consultantDoctor || ''} onChange={e => handleFormChange('consultantDoctor', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Chẩn đoán sau hội chẩn</label>
                        <textarea required className="w-full px-3 py-2 border rounded-lg outline-none" rows={2} value={formData.diagnosis || ''} onChange={e => handleFormChange('diagnosis', e.target.value)}></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Hướng xử lý</label>
                        <textarea required className="w-full px-3 py-2 border rounded-lg outline-none" rows={2} value={formData.treatment || ''} onChange={e => handleFormChange('treatment', e.target.value)}></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ngày mời hội chẩn</label>
                        <input type="date" required className="w-full px-3 py-2 border rounded-lg outline-none bg-slate-50" value={formData.date || ''} onChange={e => handleFormChange('date', e.target.value)} />
                    </div>
                  </>
              )}
              {activeModal === 'DISCHARGE' && (
                  <>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tên người bệnh</label>
                        <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Tên bệnh nhân" value={formData.patientName || ''} onChange={e => handleFormChange('patientName', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phòng</label>
                        <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="VD: P301" value={formData.room || ''} onChange={e => handleFormChange('room', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Chú thích</label>
                        <textarea className="w-full px-3 py-2 border rounded-lg outline-none" rows={3} placeholder="Ghi chú thêm..." value={formData.note || ''} onChange={e => handleFormChange('note', e.target.value)}></textarea>
                    </div>
                  </>
              )}
              {activeModal === 'VITALS' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ngày</label>
                            <input required type="date" className="w-full px-3 py-2 border rounded-lg outline-none bg-slate-50" value={formData.date || ''} onChange={e => handleFormChange('date', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Giờ</label>
                            <input required type="time" className="w-full px-3 py-2 border rounded-lg outline-none" value={formData.time || ''} onChange={e => handleFormChange('time', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Phòng</label>
                             <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="P301" value={formData.room || ''} onChange={e => handleFormChange('room', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tên người bệnh</label>
                            <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Tên BN" value={formData.patientName || ''} onChange={e => handleFormChange('patientName', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                            <label className="block text-sm font-medium text-red-600 mb-1">HA</label>
                            <input required type="text" className="w-full px-3 py-2 border border-red-200 rounded-lg outline-none" placeholder="120/80" value={formData.bp || ''} onChange={e => handleFormChange('bp', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-blue-600 mb-1">Mạch</label>
                            <input required type="number" className="w-full px-3 py-2 border border-blue-200 rounded-lg outline-none" placeholder="80" value={formData.pulse || ''} onChange={e => handleFormChange('pulse', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-yellow-600 mb-1">T°</label>
                            <input required type="number" step="0.1" className="w-full px-3 py-2 border border-yellow-200 rounded-lg outline-none" placeholder="37" value={formData.temp || ''} onChange={e => handleFormChange('temp', e.target.value)} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-green-600 mb-1">SpO2</label>
                            <input required type="number" className="w-full px-3 py-2 border border-green-200 rounded-lg outline-none" placeholder="98" value={formData.spO2 || ''} onChange={e => handleFormChange('spO2', e.target.value)} />
                        </div>
                    </div>
                    <div className="pt-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú / Chú thích</label>
                        <textarea className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20" rows={2} placeholder="Nhập chú thích..." value={formData.note || ''} onChange={e => handleFormChange('note', e.target.value)}></textarea>
                    </div>
                  </>
              )}
              {activeModal === 'GLUCOSE' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ngày tháng năm</label>
                            <input required type="date" className="w-full px-4 py-3 border rounded-xl outline-none bg-slate-50 focus:ring-2 focus:ring-primary/20" value={formData.date || ''} onChange={e => handleFormChange('date', e.target.value)} />
                        </div>
                    </div>
                     <div className="grid grid-cols-3 gap-3">
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Phòng</label>
                             <input required type="text" className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-primary/20" placeholder="P301" value={formData.room || ''} onChange={e => handleFormChange('room', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tên BN</label>
                            <input required type="text" className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 uppercase" placeholder="Tên BN" value={formData.patientName || ''} onChange={e => handleFormChange('patientName', e.target.value)} />
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="block text-sm font-bold text-slate-700 mb-3">Chọn các mốc giờ test</label>
                        <div className="flex flex-wrap gap-2">
                            {[...GLUCOSE_DEFAULT_SLOTS, "Khác"].map(time => {
                                const isSelected = !!formData.selectedSlots?.[time];
                                return (
                                    <button 
                                        type="button" 
                                        key={time} 
                                        onClick={() => {
                                            const newSlots = { ...(formData.selectedSlots || {}) };
                                            if (isSelected) {
                                                delete newSlots[time];
                                            } else {
                                                newSlots[time] = { time: time === "Khác" ? "" : time, testResult: "", insulinType: "", insulinDose: "" };
                                            }
                                            handleFormChange('selectedSlots', newSlots);
                                        }}
                                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                                            isSelected ? 'bg-primary border-primary text-white shadow-md' : 'bg-white border-slate-200 text-slate-600'
                                        }`}
                                    >
                                        {time}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {Object.keys(formData.selectedSlots || {}).map((timeKey) => {
                        const slot = formData.selectedSlots[timeKey];
                        return (
                            <div key={timeKey} className="border-2 border-primary/10 rounded-xl p-4 space-y-3 bg-white animate-slide-up">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                                    <h4 className="font-bold text-primary flex items-center uppercase">
                                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Mốc giờ: {timeKey}
                                    </h4>
                                    {timeKey === "Khác" && (
                                        <input 
                                            type="time" 
                                            className="px-2 py-1 border rounded text-xs font-bold" 
                                            value={slot.time} 
                                            onChange={e => {
                                                const newSlots = { ...formData.selectedSlots };
                                                newSlots[timeKey].time = e.target.value;
                                                handleFormChange('selectedSlots', newSlots);
                                            }}
                                        />
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                     <div className="col-span-2">
                                        <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Kết quả Test (mmol/L)</label>
                                        <input 
                                            type="text" 
                                            placeholder="VD: 7.5"
                                            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-bold text-blue-700" 
                                            value={slot.testResult} 
                                            onChange={e => {
                                                const newSlots = { ...formData.selectedSlots };
                                                newSlots[timeKey].testResult = e.target.value;
                                                handleFormChange('selectedSlots', newSlots);
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Loại Insulin</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-3 py-2 border rounded-lg outline-none" 
                                            value={slot.insulinType} 
                                            onChange={e => {
                                                const newSlots = { ...formData.selectedSlots };
                                                newSlots[timeKey].insulinType = e.target.value;
                                                handleFormChange('selectedSlots', newSlots);
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-red-600 uppercase mb-1">Liều lượng</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-3 py-2 border rounded-lg outline-none font-bold text-red-600" 
                                            value={slot.insulinDose} 
                                            onChange={e => {
                                                const newSlots = { ...formData.selectedSlots };
                                                newSlots[timeKey].insulinDose = e.target.value;
                                                handleFormChange('selectedSlots', newSlots);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú thêm</label>
                        <textarea className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-primary/20" rows={3} placeholder="Ví dụ: BN nhịn ăn, mệt mỏi..." value={formData.note || ''} onChange={e => handleFormChange('note', e.target.value)}></textarea>
                    </div>
                  </div>
              )}
              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={handleModalClose} className="px-6 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Hủy</button>
                <button type="submit" disabled={submitting} className="px-8 py-3 text-sm font-bold text-white bg-primary rounded-xl hover:bg-sky-600 shadow-lg disabled:opacity-50 transition-all active:scale-95">
                    {submitting ? 'Đang lưu...' : 'Lưu dữ liệu'}
                </button>
              </div>
          </form>
      );
  };

  const getModalTitle = () => {
      switch (activeModal) {
          case 'MENU': return 'Thêm mới';
          case 'TASK': return formData.id ? 'Cập nhật công việc' : 'Thêm công việc tuần';
          case 'HOLTER_ECG': return formData.id ? 'Cập nhật Holter ECG' : 'Thêm Holter ECG';
          case 'HOLTER_BP': return formData.id ? 'Cập nhật Holter HA' : 'Thêm Holter Huyết áp';
          case 'CONSULTATION': return formData.id ? 'Cập nhật hội chẩn' : 'Đăng ký hội chẩn';
          case 'DISCHARGE': return formData.id ? 'Cập nhật báo ra viện' : 'Báo ra viện';
          case 'VITALS': return formData.id ? 'Cập nhật DHST' : 'Báo DHST Mới';
          case 'GLUCOSE': return formData.id ? 'Cập nhật đường huyết' : 'Báo đường huyết';
          case 'CLS': return formData.id ? 'Cập nhật theo dõi CLS' : 'Thêm theo dõi CLS';
          case 'HANDOVER': return formData.id ? 'Cập nhật bàn giao' : 'Thêm bàn giao trực';
          case 'LIST_HOLTER_ECG': return 'Danh sách Holter ECG';
          case 'LIST_HOLTER_BP': return 'Danh sách Holter Huyết áp';
          case 'LIST_CONSULTATION': return 'Quản lý Hội chẩn';
          case 'DETAIL_CONSULTATION': return 'Chi tiết hội chẩn';
          case 'LIST_DISCHARGE': return 'Danh sách Ra viện';
          case 'LIST_VITALS': return 'Danh sách DHST';
          case 'LIST_GLUCOSE': return 'Danh sách Đường huyết';
          case 'LIST_CLS': return 'Theo dõi CLS trả sau';
          case 'LIST_HANDOVER': return 'Bàn giao BN trực';
          default: return '';
      }
  };

  const menuItems: MenuItem[] = [
    { id: '1', label: 'Quản lý hội chẩn', icon: Icons.Consultation, color: 'bg-blue-100', action: () => setActiveModal('LIST_CONSULTATION') },
    { id: '2', label: 'Báo ra viện', icon: Icons.Discharge, color: 'bg-green-100', action: () => setActiveModal('LIST_DISCHARGE') },
    { id: '3', label: 'Báo DHST mới', icon: Icons.Vitals, color: 'bg-purple-100', action: () => setActiveModal('LIST_VITALS') },
    { id: '4', label: 'Holter ECG', icon: Icons.ECG, color: 'bg-red-100', action: () => setActiveModal('LIST_HOLTER_ECG') },
    { id: '5', label: 'Holter HA', icon: Icons.BP, color: 'bg-indigo-100', action: () => setActiveModal('LIST_HOLTER_BP') },
    { id: '6', label: 'Báo đường huyết', icon: Icons.Glucose, color: 'bg-yellow-100', action: () => setActiveModal('LIST_GLUCOSE') },
    { id: '7', label: 'Theo dõi CLS', icon: Icons.Icons_CLS, color: 'bg-orange-100', action: () => setActiveModal('LIST_CLS') },
    { id: '8', label: 'Bàn giao trực', icon: Icons.Handover, color: 'bg-rose-100', action: () => setActiveModal('LIST_HANDOVER') },
  ];

  // Nếu người dùng chưa đăng nhập, trả về Login (được lazy load)
  if (!currentUser) {
      return (
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        }>
          <Login onLoginSuccess={(user) => setCurrentUser(user)} />
        </Suspense>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-safe">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 pt-safe flex justify-between items-center shadow-sm">
        <div className="mt-safe">
          <h1 className="text-xl font-bold text-slate-800">Khoa Nội</h1>
          <div className="flex items-center space-x-2">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{currentUser.displayName}</p>
              {isOnline ? (
                   <span className="flex items-center text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">
                       <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></span>
                       Online
                   </span>
              ) : (
                  <span className="flex items-center text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">
                       <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1"></span>
                       Offline
                   </span>
              )}
          </div>
        </div>
        <div className="flex space-x-2 mt-safe">
            <button onClick={handleRefresh} disabled={loading} className="flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors" title="Làm mới">
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button onClick={handleLogout} className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors" title="Đăng xuất">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
            </button>
        </div>
      </header>
      <main className="p-4 max-w-2xl mx-auto">
        {loading && !data ? (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        ) : data ? (
            <>
                <HolterTracking trackerData={data.tracker} />
                <h3 className="font-bold text-slate-800 text-lg mb-3 px-1">Menu chức năng</h3>
                <MenuGrid items={menuItems} />
                <WeeklyTasks tasks={data.tasks} onToggle={handleTaskToggle} onEdit={handleEditTask} onDelete={handleDeleteTask} />
            </>
        ) : (
            <div className="text-center py-10 text-slate-500">Không có dữ liệu.</div>
        )}
      </main>
      <FloatingAddButton onClick={() => setActiveModal('MENU')} />
      <Modal isOpen={activeModal !== null} onClose={handleModalClose} title={getModalTitle()}>
        {renderModalContent()}
      </Modal>
    </div>
  );
}

export default App;