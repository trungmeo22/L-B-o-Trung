
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

export interface User {
  id: string;
  username: string;
  password?: string;
  displayName: string;
  role: string;
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
  status: 'xong' | 'chưa xong'; // Trường mới theo yêu cầu
}

export interface Consultation {
  id: string;
  patientName: string;
  age: string;
  department: string; // Khoa mời
  consultantDoctor: string; // Bác sĩ hội chẩn (New field)
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
  note: string; // Chú thích (Added field)
}

export interface GlucoseSlotData {
  time: string;
  testResult: string;
  insulinType: string;
  insulinDose: string;
}

export interface GlucoseRecord {
  id: string;
  date: string; // YYYY-MM-DD
  room: string;
  patientName: string;
  slots: string; // JSON string of GlucoseSlotData[]
  note: string;
}

export interface CLSRecord {
  id: string;
  patientName: string;
  phone: string;
  cls: string;
  returnDate: string; // YYYY-MM-DD
  doctor: string;
  status: 'Chưa trả' | 'Đã trả';
}

export interface HandoverRecord {
  id: string;
  patientName: string;
  room: string;
  doctor: string; // BS bàn giao
  content: string; // Nội dung
  date: string; // YYYY-MM-DD
}

export interface TrackerRecord {
    id: string;
    key: string; // available, wearing, waiting, next_free
    bp: string;
    ecg: string;
}

// --- Duty Report Interfaces (Báo cáo trực) ---

export interface PatientTransfer { // II. Bệnh nhân chuyển
  id: string;
  stt: string;
  name: string;
  age: string;
  room: string;
  destination: string; // Nơi chuyển
}

export interface PatientProgression { // III. Bệnh nhân diễn biến
  id: string;
  stt: string;
  name: string;
  age: string;
  room: string;
  progression: string; // Diễn biến
}

export interface PatientAdmission { // IV. Bệnh nhân vào
  id: string;
  stt: string;
  name: string;
  age: string;
  room: string;
  diagnosis: string; // Chẩn đoán
}

export interface DutyReportStats { // I. Tình hình khoa
  old: string;
  in: string;
  out: string;
  transferIn: string; // Chuyển khoa
  transferOut: string; // Chuyển viện
  remaining: string;
}

export interface DutyReport {
  id: string;
  date: string; // YYYY-MM-DD (Ngày báo cáo)
  doctor: string; // Bác sĩ trực
  nurse: string; // Điều dưỡng trực
  stats: DutyReportStats;
  transfers: PatientTransfer[];
  progressions: PatientProgression[];
  admissions: PatientAdmission[];
  notes: string; // V. Khác
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
  clsRecords: CLSRecord[];
  handovers: HandoverRecord[];
  dutyReports: DutyReport[]; // Added duty reports
  tracker: TrackerRecord[];
  users: User[];
  lastUpdated: string;
};