import React from 'react';
import { TrackerRecord } from '../types';

interface HolterTrackingProps {
  trackerData: TrackerRecord[];
}

const HolterTracking: React.FC<HolterTrackingProps> = ({ trackerData = [] }) => {
  
  // Helper to format tracker values, specially handling date strings for the 'khinaotrong' key
  const formatValue = (key: string, val: string) => {
    if (!val || val === '-' || val === '0' || val === '--:--') return val;

    // Only format as date if it's the "Khi nào trống" row
    if (key === 'khinaotrong') {
      try {
        const date = new Date(val);
        // Check if it's a valid date
        if (isNaN(date.getTime())) return val;

        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        const DD = String(date.getDate()).padStart(2, '0');
        const MM = String(date.getMonth() + 1).padStart(2, '0');

        return `${hh}:${mm}:${ss} ${DD}/${MM}`;
      } catch (e) {
        return val;
      }
    }
    return val;
  };

  const getValue = (key: string, type: 'bp' | 'ecg') => {
      const record = trackerData.find(r => r.key === key);
      const rawValue = record ? record[type] : '-';
      return formatValue(key, rawValue);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-6">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 flex items-center">
          <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Tracking Holter
        </h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 font-medium text-center text-blue-600">Holter Huyết Áp</th>
              <th className="px-4 py-3 font-medium text-center text-red-600">Holter ECG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr className="bg-green-50/50">
              <td className="px-4 py-3 font-medium text-slate-700">Máy trống</td>
              <td className="px-4 py-3 text-center font-bold text-slate-800">{getValue('maytrong', 'bp')}</td>
              <td className="px-4 py-3 text-center font-bold text-slate-800">{getValue('maytrong', 'ecg')}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-slate-700">Đang đeo</td>
              <td className="px-4 py-3 text-center text-slate-600">{getValue('dangdeo', 'bp')}</td>
              <td className="px-4 py-3 text-center text-slate-600">{getValue('dangdeo', 'ecg')}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-slate-700">Đang chờ</td>
              <td className="px-4 py-3 text-center text-slate-600">{getValue('dangcho', 'bp')}</td>
              <td className="px-4 py-3 text-center text-slate-600">{getValue('dangcho', 'ecg')}</td>
            </tr>
            <tr className="bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-700">Khi nào trống</td>
              <td className="px-4 py-3 text-center text-sm font-semibold text-primary">{getValue('khinaotrong', 'bp')}</td>
              <td className="px-4 py-3 text-center text-sm font-semibold text-primary">{getValue('khinaotrong', 'ecg')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HolterTracking;