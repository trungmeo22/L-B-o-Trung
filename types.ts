import React from 'react';

export enum HolterType {
  ECG = 'ECG',
  BP = 'HA' // Huyết áp
}

export enum HolterStatus {
  PENDING = 'Chưa lắp',
  ACTIVE = 'Đang lắp',
  COMPLETED = 'Đã tháo',
  OTHER = 'Khác'
}

export interface HolterDevice {
  id: string;
  name: string; // Tên máy
  type: HolterType;
  status: HolterStatus;
  patientName: string; // Tên BN
  room: string; // Khoa/phòng
  installDate: string; // Ngày lắp dự kiến
  endTime?: string; // Ngày tháo (Estimated or Actual)
}

export interface Task {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface Consultation {
  id: string;
  patientName: string;
  age: string;
  department: string; // Khoa mời
  diagnosis: string; // Chẩn đoán sau hội chẩn
  treatment: string; // Hướng xử lý
  date: string; // Ngày mời hội chẩn (YYYY-MM-DD)
}

export interface Discharge {
  id: string;
  patientName: string;
  room: string;
  note: string; // Chú thích
  date: string; // YYYY-MM-DD
}

export interface VitalsRecord {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  room: string;
  patientName: string;
  bp: string; // Huyết áp (e.g., 120/80)
  pulse: string; // Mạch
  temp: string; // Nhiệt độ
  spO2: string;
}

export interface GlucoseRecord {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  room: string;
  patientName: string;
  insulinType: string; // Loại insulin
  insulinDose: string; // Liều insulin
  testResult: string; // Kết quả test
}

export interface TrackerRecord {
    id: string;
    key: string; // available, wearing, waiting, next_free
    bp: string;
    ecg: string;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
}

export type SheetData = {
  holters: HolterDevice[];
  tasks: Task[];
  consultations: Consultation[];
  discharges: Discharge[];
  vitals: VitalsRecord[];
  glucoseRecords: GlucoseRecord[];
  tracker: TrackerRecord[];
  lastUpdated: string;
};