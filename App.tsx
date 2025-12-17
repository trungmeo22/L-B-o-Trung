import React, { useEffect, useState, useCallback } from 'react';
import { SheetData, MenuItem, Task, HolterType, HolterStatus, HolterDevice, Consultation, Discharge, VitalsRecord, GlucoseRecord } from './types';
import * as DataService from './services/dataService';
import HolterTracking from './components/HolterTracking';
import MenuGrid from './components/MenuGrid';
import WeeklyTasks from './components/WeeklyTasks';
import FloatingAddButton from './components/FloatingAddButton';
import Modal from './components/Modal';

// Icons using simplified SVG strings
const Icons = {
    Consultation: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    Discharge: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
    Vitals: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    ECG: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
    BP: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Glucose: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
    Task: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
};

type ModalType = 'MENU' | 'TASK' | 'CONSULTATION' | 'DISCHARGE' | 'VITALS' | 'HOLTER_ECG' | 'HOLTER_BP' | 'GLUCOSE' | 'LIST_HOLTER_ECG' | 'LIST_HOLTER_BP' | 'LIST_CONSULTATION' | 'DETAIL_CONSULTATION' | 'LIST_DISCHARGE' | 'LIST_VITALS' | 'LIST_GLUCOSE' | null;

function App() {
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  
  // Generic form state
  const [formData, setFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  // Simulating Google Sheets Data Load
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await DataService.fetchData();
      setData(result);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    await loadData();
  };

  const handleTaskToggle = async (id: string) => {
    if (!data) return;
    const updatedTasks = data.tasks.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setData({ ...data, tasks: updatedTasks });
    await DataService.saveData({ ...data, tasks: updatedTasks });
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleModalClose = () => {
      setActiveModal(null);
      setFormData({});
      setSubmitting(false);
      setSelectedConsultation(null);
  };

  const handleModalBack = () => {
      // Logic for back button navigation
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
      setActiveModal('MENU');
      setFormData({});
      setSubmitting(false);
  }

  const handleDeleteHolter = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm('Bạn có chắc chắn muốn xóa dữ liệu này không?')) {
          setLoading(true);
          await DataService.deleteHolter(id);
          await loadData();
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
      // Switch to form view
      if (item.type === HolterType.ECG) {
          setActiveModal('HOLTER_ECG');
      } else {
          setActiveModal('HOLTER_BP');
      }
  };

  const handleDeleteConsultation = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm('Bạn có chắc chắn muốn xóa hội chẩn này không?')) {
          setLoading(true);
          await DataService.deleteConsultation(id);
          await loadData();
      }
  };

  const handleEditConsultation = (item: Consultation, e: React.MouseEvent) => {
      e.stopPropagation();
      setFormData({
          id: item.id,
          patientName: item.patientName,
          age: item.age,
          department: item.department,
          diagnosis: item.diagnosis,
          treatment: item.treatment,
          date: item.date
      });
      setActiveModal('CONSULTATION');
  };

  const handleDeleteDischarge = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm('Bạn có chắc chắn muốn xóa dữ liệu này không?')) {
          setLoading(true);
          await DataService.deleteDischarge(id);
          await loadData();
      }
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

  const handleDeleteVitals = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm('Bạn có chắc chắn muốn xóa dữ liệu này không?')) {
          setLoading(true);
          await DataService.deleteVitals(id);
          await loadData();
      }
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
          spO2: item.spO2
      });
      setActiveModal('VITALS');
  };

  const handleDeleteGlucose = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm('Bạn có chắc chắn muốn xóa dữ liệu này không?')) {
          setLoading(true);
          await DataService.deleteGlucose(id);
          await loadData();
      }
  };

  const handleEditGlucose = (item: GlucoseRecord, e: React.MouseEvent) => {
      e.stopPropagation();
      setFormData({
          id: item.id,
          date: item.date,
          time: item.time,
          room: item.room,
          patientName: item.patientName,
          insulinType: item.insulinType,
          insulinDose: item.insulinDose,
          testResult: item.testResult
      });
      setActiveModal('GLUCOSE');
  };

  const handleDeleteTask = async (id: string) => {
      if (window.confirm('Bạn có chắc chắn muốn xóa công việc này không?')) {
          setLoading(true);
          await DataService.deleteTask(id);
          await loadData();
      }
  };

  const handleEditTask = (item: Task) => {
      setFormData({
          id: item.id,
          title: item.title,
          priority: item.priority,
          date: item.date,
          completed: item.completed
      });
      setActiveModal('TASK');
  };

  const handleViewConsultation = (item: Consultation) => {
      setSelectedConsultation(item);
      setActiveModal('DETAIL_CONSULTATION');
  };

  const handleAddFromList = (type: string) => {
      setFormData({});
      if (type === 'HOLTER_ECG') setActiveModal('HOLTER_ECG');
      if (type === 'HOLTER_BP') setActiveModal('HOLTER_BP');
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
              time: new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})
          });
          setActiveModal('VITALS');
      }
      if (type === 'GLUCOSE') {
          setFormData({
              date: new Date().toISOString().split('T')[0],
              time: new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})
          });
          setActiveModal('GLUCOSE');
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      
      try {
        switch (activeModal) {
            case 'TASK':
                if (formData.title) {
                    const newTask: Task = {
                        id: formData.id || Date.now().toString(),
                        title: formData.title,
                        date: formData.date || new Date().toLocaleDateString('vi-VN'),
                        completed: formData.completed || false,
                        priority: formData.priority || 'medium'
                    };
                    await DataService.addTaskToSheet(newTask);
                }
                break;
            case 'HOLTER_ECG':
            case 'HOLTER_BP':
                if (formData.patientName && formData.room) {
                    const newHolter: HolterDevice = {
                        id: formData.id || Date.now().toString(),
                        name: '',
                        type: activeModal === 'HOLTER_ECG' ? HolterType.ECG : HolterType.BP,
                        status: formData.status || HolterStatus.PENDING,
                        patientName: formData.patientName,
                        room: formData.room,
                        installDate: formData.installDate,
                        endTime: ''
                    };
                    await DataService.addHolterToSheet(newHolter);
                }
                break;
            case 'CONSULTATION':
                if (formData.patientName && formData.department) {
                    const newConsultation: Consultation = {
                        id: formData.id || Date.now().toString(),
                        patientName: formData.patientName,
                        age: formData.age || '',
                        department: formData.department,
                        diagnosis: formData.diagnosis || '',
                        treatment: formData.treatment || '',
                        date: formData.date || new Date().toISOString().split('T')[0]
                    };
                    await DataService.addConsultationToSheet(newConsultation);
                }
                break;
            case 'DISCHARGE':
                 if (formData.patientName && formData.room) {
                    const newDischarge: Discharge = {
                        id: formData.id || Date.now().toString(),
                        patientName: formData.patientName,
                        room: formData.room,
                        note: formData.note || '',
                        date: new Date().toISOString().split('T')[0] // Always Today
                    };
                    await DataService.addDischargeToSheet(newDischarge);
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
                        spO2: formData.spO2 || ''
                    };
                    await DataService.addVitalsToSheet(newVitals);
                }
                break;
            case 'GLUCOSE':
                if (formData.patientName && formData.time) {
                    const newGlucose: GlucoseRecord = {
                        id: formData.id || Date.now().toString(),
                        date: formData.date || new Date().toISOString().split('T')[0],
                        time: formData.time || '',
                        room: formData.room || '',
                        patientName: formData.patientName,
                        insulinType: formData.insulinType || '',
                        insulinDose: formData.insulinDose || '',
                        testResult: formData.testResult || ''
                    };
                    await DataService.addGlucoseToSheet(newGlucose);
                }
                break;
        }
        await loadData();
        // Return to specific lists if applicable
        if (activeModal === 'CONSULTATION') {
            setActiveModal('LIST_CONSULTATION');
        } else if (activeModal === 'DISCHARGE') {
            setActiveModal('LIST_DISCHARGE');
        } else if (activeModal === 'VITALS') {
            setActiveModal('LIST_VITALS');
        } else if (activeModal === 'GLUCOSE') {
            setActiveModal('LIST_GLUCOSE');
        } else {
            handleModalClose();
        }
      } catch (err) {
          console.error(err);
      } finally {
          setSubmitting(false);
      }
  };

  // Helper to render Holter List
  const renderHolterList = (type: HolterType) => {
      const items = data?.holters.filter(h => h.type === type) || [];
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
                 <button 
                    onClick={() => handleAddFromList(type === HolterType.ECG ? 'HOLTER_ECG' : 'HOLTER_BP')}
                    className="flex items-center px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-full shadow-sm active:scale-95 transition-transform"
                 >
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Thêm mới
                 </button>
              </div>
              
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
                                              <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-2">
                                                  <span className="flex items-center">
                                                      <svg className="w-3 h-3 mr-1 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                      {item.room || '---'}
                                                  </span>
                                                  {item.endTime && (
                                                      <span className="flex items-center">
                                                        <svg className="w-3 h-3 mr-1 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        Tháo: {item.endTime}
                                                      </span>
                                                  )}
                                                  {item.name && <span className="text-slate-400">({item.name})</span>}
                                              </div>
                                          </div>
                                          <div className="flex space-x-2 pl-2">
                                              <button 
                                                onClick={(e) => handleEditHolter(item, e)}
                                                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                              >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                              </button>
                                              <button 
                                                onClick={(e) => handleDeleteHolter(item.id, e)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                              >
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

  const renderConsultationList = () => {
    const today = new Date().toISOString().split('T')[0];
    const items = data?.consultations?.filter(c => c.date === today) || [];

    return (
        <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between mb-4">
               <button onClick={handleModalClose} className="text-sm text-slate-500 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Đóng
               </button>
               <button 
                  onClick={() => handleAddFromList('CONSULTATION')}
                  className="flex items-center px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-full shadow-sm active:scale-95 transition-transform"
               >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Thêm mới
               </button>
            </div>
            
            <p className="text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Hôm nay ({today})</p>
            
            <div className="space-y-2">
                {items.length === 0 ? (
                    <div className="text-center text-slate-400 py-8 border border-dashed rounded-lg">Không có hội chẩn hôm nay</div>
                ) : (
                    items.map(item => (
                        <div 
                            key={item.id} 
                            onClick={() => handleViewConsultation(item)}
                            className="p-3 rounded-lg border shadow-sm bg-white border-l-4 border-l-blue-500 active:bg-blue-50 cursor-pointer group"
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800">{item.patientName}</p>
                                    <p className="text-xs text-slate-500 mt-1">Khoa: {item.department}</p>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <button 
                                        onClick={(e) => handleEditConsultation(item, e)}
                                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button 
                                        onClick={(e) => handleDeleteConsultation(item.id, e)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                    <svg className="w-5 h-5 text-slate-300 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
  };

  const renderDischargeList = () => {
    const today = new Date().toISOString().split('T')[0];
    const items = data?.discharges?.filter(d => d.date === today) || [];

    return (
        <div className="space-y-4 pt-2">
             <div className="flex items-center justify-between mb-4">
               <button onClick={handleModalClose} className="text-sm text-slate-500 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Đóng
               </button>
               <button 
                  onClick={() => handleAddFromList('DISCHARGE')}
                  className="flex items-center px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-full shadow-sm active:scale-95 transition-transform"
               >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Thêm mới
               </button>
            </div>
            
            <p className="text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Danh sách ra viện hôm nay ({today})</p>

             <div className="space-y-2">
                {items.length === 0 ? (
                    <div className="text-center text-slate-400 py-8 border border-dashed rounded-lg">Chưa có dữ liệu ra viện hôm nay</div>
                ) : (
                    items.map(item => (
                        <div key={item.id} className="p-3 rounded-lg border shadow-sm bg-white border-l-4 border-l-green-500">
                             <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800">{item.patientName}</p>
                                    <p className="text-xs text-slate-600 mt-1 font-semibold text-primary">{item.room}</p>
                                    {item.note && <p className="text-xs text-slate-500 mt-1 italic">"{item.note}"</p>}
                                </div>
                                <div className="flex items-center space-x-1 pl-2">
                                     <button 
                                        onClick={(e) => handleEditDischarge(item, e)}
                                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button 
                                        onClick={(e) => handleDeleteDischarge(item.id, e)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                             </div>
                        </div>
                    ))
                )}
             </div>
        </div>
    );
  };

  const renderVitalsList = () => {
      const today = new Date().toISOString().split('T')[0];
      const items = data?.vitals?.filter(v => v.date === today) || [];

      return (
          <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between mb-4">
               <button onClick={handleModalClose} className="text-sm text-slate-500 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Đóng
               </button>
               <button 
                  onClick={() => handleAddFromList('VITALS')}
                  className="flex items-center px-3 py-1.5 bg-purple-500 text-white text-xs font-bold rounded-full shadow-sm active:scale-95 transition-transform"
               >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Thêm mới
               </button>
            </div>

            <p className="text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Danh sách DHST hôm nay ({today})</p>

            <div className="space-y-3">
                {items.length === 0 ? (
                    <div className="text-center text-slate-400 py-8 border border-dashed rounded-lg">Chưa có dữ liệu DHST</div>
                ) : (
                    items.map(item => (
                        <div key={item.id} className="p-3 rounded-lg border shadow-sm bg-white border-l-4 border-l-purple-500">
                             <div className="flex justify-between border-b border-slate-100 pb-2 mb-2">
                                <div className="flex items-center">
                                    <span className="text-lg font-bold text-slate-800">{item.time}</span>
                                    <span className="mx-2 text-slate-300">|</span>
                                    <span className="font-semibold text-primary">{item.room}</span>
                                </div>
                                <div className="flex space-x-1">
                                    <button onClick={(e) => handleEditVitals(item, e)} className="text-slate-400 hover:text-blue-500 p-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button onClick={(e) => handleDeleteVitals(item.id, e)} className="text-slate-400 hover:text-red-500 p-1">
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
                             </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
  }

  const renderGlucoseList = () => {
    // Sort all records by Date (desc) then Time (desc)
    const sortedItems = [...(data?.glucoseRecords || [])].sort((a, b) => {
        if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
        }
        return b.time.localeCompare(a.time);
    });

    // Group by Date
    const groupedItems: { [key: string]: GlucoseRecord[] } = {};
    sortedItems.forEach(item => {
        if (!groupedItems[item.date]) {
            groupedItems[item.date] = [];
        }
        groupedItems[item.date].push(item);
    });

    const dates = Object.keys(groupedItems);

    return (
        <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between mb-4">
               <button onClick={handleModalClose} className="text-sm text-slate-500 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Đóng
               </button>
               <button 
                  onClick={() => handleAddFromList('GLUCOSE')}
                  className="flex items-center px-3 py-1.5 bg-yellow-500 text-white text-xs font-bold rounded-full shadow-sm active:scale-95 transition-transform"
               >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Thêm mới
               </button>
            </div>

            {dates.length === 0 ? (
                <div className="text-center text-slate-400 py-8 border border-dashed rounded-lg">Chưa có dữ liệu</div>
            ) : (
                dates.map(date => (
                    <div key={date} className="mb-6 animate-fade-in">
                         <div className="sticky top-0 bg-slate-50/95 backdrop-blur py-2 z-10 border-b border-slate-200 mb-3">
                            <h4 className="text-sm font-bold text-slate-700 flex items-center uppercase">
                                <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                {date.split('-').reverse().join('/')}
                            </h4>
                         </div>

                         <div className="space-y-3">
                            {groupedItems[date].map(item => (
                                <div key={item.id} className="p-3 rounded-lg border shadow-sm bg-white border-l-4 border-l-yellow-500">
                                     <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center mb-1">
                                                <span className="text-lg font-bold text-slate-800">{item.time}</span>
                                                <span className="mx-2 text-slate-300">|</span>
                                                <span className="font-semibold text-primary">{item.room}</span>
                                            </div>
                                            <p className="font-bold text-slate-700">{item.patientName}</p>
                                        </div>
                                        <div className="flex space-x-1">
                                            <button onClick={(e) => handleEditGlucose(item, e)} className="text-slate-400 hover:text-blue-500 p-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button onClick={(e) => handleDeleteGlucose(item.id, e)} className="text-slate-400 hover:text-red-500 p-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                     </div>
                                     
                                     <div className="flex items-center justify-between mb-2">
                                         <span className={`font-bold ${item.testResult ? 'text-blue-600' : 'text-slate-400 italic'}`}>
                                             Kết quả: {item.testResult || 'CHƯA TEST'} {item.testResult ? 'mmol/L' : ''}
                                         </span>
                                     </div>

                                     <div className="flex items-center justify-between bg-yellow-50 p-2 rounded-lg">
                                         <div>
                                             <span className="text-[10px] text-slate-500 uppercase block">Loại Insulin</span>
                                             <span className="font-bold text-slate-800 text-sm">{item.insulinType || '---'}</span>
                                         </div>
                                         <div className="text-right">
                                             <span className="text-[10px] text-slate-500 uppercase block">Liều lượng</span>
                                             <span className="font-bold text-red-600 text-sm">{item.insulinDose || '---'}</span>
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
                  <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Khoa mời</h4>
                      <p className="text-base text-slate-800">{selectedConsultation.department}</p>
                  </div>
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

  // Render Modal Content based on activeModal
  const renderModalContent = () => {
      if (activeModal === 'LIST_HOLTER_ECG') return renderHolterList(HolterType.ECG);
      if (activeModal === 'LIST_HOLTER_BP') return renderHolterList(HolterType.BP);
      if (activeModal === 'LIST_CONSULTATION') return renderConsultationList();
      if (activeModal === 'DETAIL_CONSULTATION') return renderConsultationDetail();
      if (activeModal === 'LIST_DISCHARGE') return renderDischargeList();
      if (activeModal === 'LIST_VITALS') return renderVitalsList();
      if (activeModal === 'LIST_GLUCOSE') return renderGlucoseList();

      if (activeModal === 'MENU') {
          const addOptions = [
              { id: 'add_task', label: 'Công việc tuần', icon: Icons.Task, color: 'bg-slate-100', action: () => setActiveModal('TASK') },
              { id: 'add_consult', label: 'Hội chẩn', icon: Icons.Consultation, color: 'bg-blue-100', action: () => handleAddFromList('CONSULTATION') },
              { id: 'add_discharge', label: 'Báo ra viện', icon: Icons.Discharge, color: 'bg-green-100', action: () => handleAddFromList('DISCHARGE') },
              { id: 'add_vitals', label: 'Báo DHST', icon: Icons.Vitals, color: 'bg-purple-100', action: () => setActiveModal('LIST_VITALS') },
              { id: 'add_ecg', label: 'Thêm Holter ECG', icon: Icons.ECG, color: 'bg-red-100', action: () => setActiveModal('HOLTER_ECG') },
              { id: 'add_bp', label: 'Thêm Holter HA', icon: Icons.BP, color: 'bg-indigo-100', action: () => setActiveModal('HOLTER_BP') },
              { id: 'add_glucose', label: 'Báo đường huyết', icon: Icons.Glucose, color: 'bg-yellow-100', action: () => setActiveModal('LIST_GLUCOSE') },
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

      // Render Forms
      return (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              {/* Common Back Button */}
              <div className="flex items-center text-sm text-slate-500 mb-2 -mt-2 cursor-pointer" onClick={handleModalBack}>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Quay lại
              </div>

              {activeModal === 'TASK' && (
                  <>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung công việc</label>
                        <input required type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                            placeholder="Nhập tên công việc..."
                            value={formData.title || ''} onChange={e => handleFormChange('title', e.target.value)} autoFocus />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mức độ ưu tiên</label>
                        <select className="w-full px-3 py-2 border rounded-lg outline-none bg-white"
                             value={formData.priority || 'medium'} onChange={e => handleFormChange('priority', e.target.value)}>
                            <option value="low">Thấp</option>
                            <option value="medium">Bình thường</option>
                            <option value="high">Gấp</option>
                        </select>
                    </div>
                  </>
              )}

              {(activeModal === 'HOLTER_ECG' || activeModal === 'HOLTER_BP') && (
                  <>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tên bệnh nhân</label>
                        <input required type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                            placeholder="Nhập tên bệnh nhân..."
                            value={formData.patientName || ''} onChange={e => handleFormChange('patientName', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Khoa / Phòng</label>
                        <input required type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                            placeholder="VD: Phòng 301"
                            value={formData.room || ''} onChange={e => handleFormChange('room', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tình trạng</label>
                            <select className="w-full px-3 py-2 border rounded-lg outline-none bg-white"
                                value={formData.status || HolterStatus.PENDING} onChange={e => handleFormChange('status', e.target.value)}>
                                <option value={HolterStatus.PENDING}>Chưa lắp</option>
                                <option value={HolterStatus.ACTIVE}>Đang lắp</option>
                                <option value={HolterStatus.COMPLETED}>Đã tháo</option>
                                <option value={HolterStatus.OTHER}>Khác</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ngày lắp dự kiến</label>
                            <input type="date" className="w-full px-3 py-2 border rounded-lg outline-none"
                                value={formData.installDate || ''} onChange={e => handleFormChange('installDate', e.target.value)} />
                        </div>
                    </div>
                  </>
              )}

              {activeModal === 'CONSULTATION' && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                         <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tên bệnh nhân</label>
                            <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Tên BN"
                                value={formData.patientName || ''} onChange={e => handleFormChange('patientName', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tuổi</label>
                            <input type="text" className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Tuổi"
                                value={formData.age || ''} onChange={e => handleFormChange('age', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Khoa mời hội chẩn</label>
                        <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="VD: Hồi sức cấp cứu"
                            value={formData.department || ''} onChange={e => handleFormChange('department', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Chẩn đoán sau hội chẩn</label>
                        <textarea required className="w-full px-3 py-2 border rounded-lg outline-none" rows={2}
                            value={formData.diagnosis || ''} onChange={e => handleFormChange('diagnosis', e.target.value)}></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Hướng xử lý</label>
                        <textarea required className="w-full px-3 py-2 border rounded-lg outline-none" rows={2}
                            value={formData.treatment || ''} onChange={e => handleFormChange('treatment', e.target.value)}></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ngày mời hội chẩn</label>
                        <input type="date" required className="w-full px-3 py-2 border rounded-lg outline-none bg-slate-50"
                            value={formData.date || ''} onChange={e => handleFormChange('date', e.target.value)} />
                    </div>
                  </>
              )}

              {activeModal === 'DISCHARGE' && (
                  <>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tên người bệnh</label>
                        <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Tên bệnh nhân"
                            value={formData.patientName || ''} onChange={e => handleFormChange('patientName', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phòng</label>
                        <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="VD: P301"
                            value={formData.room || ''} onChange={e => handleFormChange('room', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Chú thích</label>
                        <textarea className="w-full px-3 py-2 border rounded-lg outline-none" rows={3} placeholder="Ghi chú thêm..."
                            value={formData.note || ''} onChange={e => handleFormChange('note', e.target.value)}></textarea>
                    </div>
                  </>
              )}

              {activeModal === 'VITALS' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ngày</label>
                            <input required type="date" className="w-full px-3 py-2 border rounded-lg outline-none bg-slate-50"
                                value={formData.date || ''} onChange={e => handleFormChange('date', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Giờ</label>
                            <input required type="time" className="w-full px-3 py-2 border rounded-lg outline-none"
                                value={formData.time || ''} onChange={e => handleFormChange('time', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Phòng</label>
                             <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="P301"
                                value={formData.room || ''} onChange={e => handleFormChange('room', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tên người bệnh</label>
                            <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Tên BN"
                                value={formData.patientName || ''} onChange={e => handleFormChange('patientName', e.target.value)} />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                            <label className="block text-sm font-medium text-red-600 mb-1">Huyết áp (mmHg)</label>
                            <input required type="text" className="w-full px-3 py-2 border border-red-200 rounded-lg outline-none focus:ring-1 focus:ring-red-500" placeholder="120/80"
                                value={formData.bp || ''} onChange={e => handleFormChange('bp', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-blue-600 mb-1">Mạch (lần/phút)</label>
                            <input required type="number" className="w-full px-3 py-2 border border-blue-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500" placeholder="80"
                                value={formData.pulse || ''} onChange={e => handleFormChange('pulse', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-yellow-600 mb-1">Nhiệt độ (°C)</label>
                            <input required type="number" step="0.1" className="w-full px-3 py-2 border border-yellow-200 rounded-lg outline-none focus:ring-1 focus:ring-yellow-500" placeholder="37"
                                value={formData.temp || ''} onChange={e => handleFormChange('temp', e.target.value)} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-green-600 mb-1">SpO2 (%)</label>
                            <input required type="number" className="w-full px-3 py-2 border border-green-200 rounded-lg outline-none focus:ring-1 focus:ring-green-500" placeholder="98"
                                value={formData.spO2 || ''} onChange={e => handleFormChange('spO2', e.target.value)} />
                        </div>
                    </div>
                  </>
              )}

              {activeModal === 'GLUCOSE' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ngày</label>
                            <input required type="date" className="w-full px-3 py-2 border rounded-lg outline-none bg-slate-50"
                                value={formData.date || ''} onChange={e => handleFormChange('date', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Thời điểm test</label>
                            <input required type="time" className="w-full px-3 py-2 border rounded-lg outline-none"
                                value={formData.time || ''} onChange={e => handleFormChange('time', e.target.value)} />
                        </div>
                    </div>
                     <div className="grid grid-cols-3 gap-3">
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Phòng</label>
                             <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="P301"
                                value={formData.room || ''} onChange={e => handleFormChange('room', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tên người bệnh</label>
                            <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Tên BN"
                                value={formData.patientName || ''} onChange={e => handleFormChange('patientName', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                         <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Loại Insulin</label>
                             <input type="text" className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="VD: Mixtard"
                                value={formData.insulinType || ''} onChange={e => handleFormChange('insulinType', e.target.value)} />
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-red-600 mb-1">Liều Insulin</label>
                             <input type="text" className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="VD: 10 UI"
                                value={formData.insulinDose || ''} onChange={e => handleFormChange('insulinDose', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-blue-600 mb-1">Kết quả test (mmol/L)</label>
                        <input type="text" className="w-full px-3 py-2 border border-blue-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500" placeholder="VD: 10.5"
                            value={formData.testResult || ''} onChange={e => handleFormChange('testResult', e.target.value)} />
                    </div>
                  </>
              )}

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={handleModalClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
                    Hủy
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-sky-600 disabled:opacity-50">
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
          case 'LIST_HOLTER_ECG': return 'Danh sách Holter ECG';
          case 'LIST_HOLTER_BP': return 'Danh sách Holter Huyết áp';
          case 'LIST_CONSULTATION': return 'DS Hội chẩn hôm nay';
          case 'DETAIL_CONSULTATION': return 'Chi tiết hội chẩn';
          case 'LIST_DISCHARGE': return 'DS Ra viện hôm nay';
          case 'LIST_VITALS': return 'DS DHST hôm nay';
          case 'LIST_GLUCOSE': return 'DS Đường huyết hôm nay';
          default: return '';
      }
  };

  // Menu items configuration (Main Dashboard Menu)
  const menuItems: MenuItem[] = [
    { id: '1', label: 'Quản lý hội chẩn', icon: Icons.Consultation, color: 'bg-blue-100', action: () => setActiveModal('LIST_CONSULTATION') },
    { id: '2', label: 'Báo ra viện', icon: Icons.Discharge, color: 'bg-green-100', action: () => setActiveModal('LIST_DISCHARGE') },
    { id: '3', label: 'Báo DHST mới', icon: Icons.Vitals, color: 'bg-purple-100', action: () => setActiveModal('LIST_VITALS') },
    { id: '4', label: 'Holter ECG', icon: Icons.ECG, color: 'bg-red-100', action: () => setActiveModal('LIST_HOLTER_ECG') },
    { id: '5', label: 'Holter HA', icon: Icons.BP, color: 'bg-indigo-100', action: () => setActiveModal('LIST_HOLTER_BP') },
    { id: '6', label: 'Báo đường huyết', icon: Icons.Glucose, color: 'bg-yellow-100', action: () => setActiveModal('LIST_GLUCOSE') },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Khoa Nội</h1>
          <p className="text-xs text-slate-500">Quản lý công việc</p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors"
        >
          <svg className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-2xl mx-auto">
        
        {loading && !data ? (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        ) : data ? (
            <>
                {/* Holter Dashboard */}
                <HolterTracking trackerData={data.tracker} />

                {/* Function Menu */}
                <h3 className="font-bold text-slate-800 text-lg mb-3 px-1">Menu chức năng</h3>
                <MenuGrid items={menuItems} />

                {/* Weekly Tasks */}
                <WeeklyTasks 
                    tasks={data.tasks} 
                    onToggle={handleTaskToggle} 
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                />
            </>
        ) : (
            <div className="text-center py-10 text-slate-500">Không có dữ liệu.</div>
        )}

      </main>

      {/* Floating Action Button */}
      <FloatingAddButton onClick={() => setActiveModal('MENU')} />

      {/* Dynamic Modal */}
      <Modal 
        isOpen={activeModal !== null} 
        onClose={handleModalClose}
        title={getModalTitle()}
      >
        {renderModalContent()}
      </Modal>

    </div>
  );
}

export default App;