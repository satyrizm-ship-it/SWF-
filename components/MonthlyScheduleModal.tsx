import React, { useState, useRef } from 'react';
import { X, Printer, MapPin, User, Calendar, Loader2 } from 'lucide-react';
import { MonthlySchedule } from '../types';

interface MonthlyScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: MonthlySchedule[];
  targetYear: string;
  targetMonth: string;
  isAdminMode: boolean;
}

export const MonthlyScheduleModal: React.FC<MonthlyScheduleModalProps> = ({ 
  isOpen, 
  onClose, 
  schedules,
  targetYear,
  targetMonth,
  isAdminMode
}) => {
  if (!isOpen) return null;

  const getStatusStyle = (status: string) => {
    const s = status ? status.trim() : '';
    if (s === 'Completed' || s === '완료') return 'bg-green-100 text-green-700 border-green-200';
    if (s === 'Scheduled' || s === '예정') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (s === 'Pending' || s === '보류') return 'bg-gray-100 text-gray-600 border-gray-200';
    return 'bg-gray-50 text-gray-500';
  };

  const getStatusText = (status: string) => {
    const s = status ? status.trim() : '';
    if (s === 'Completed' || s === '완료') return '완료';
    if (s === 'Scheduled' || s === '예정') return '예정';
    if (s === 'Pending' || s === '보류') return '보류';
    return s;
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name ? name.slice(0, 2).toUpperCase() : '?';
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (schedules.length === 0) {
      alert('출력할 데이터가 없습니다.');
      return;
    }

    // 1. BOM for Excel Korean support
    let csvContent = '\uFEFF';
    
    // 2. CSV Headers
    csvContent += "MODEL,SN,업체명,지역,설치예정자,설치예정일,완료여부,비고\n";

    // 3. Map Data
    schedules.forEach(item => {
      const row = [
        `"${item.model.replace(/"/g, '""')}"`, // Escape quotes
        `"${item.serial.replace(/"/g, '""')}"`,
        `"${item.company.replace(/"/g, '""')}"`,
        `"${item.region.replace(/"/g, '""')}"`,
        `"${item.installer.replace(/"/g, '""')}"`,
        `"${item.date}"`,
        `"${item.status}"`,
        `"${(item.note || '').replace(/"/g, '""').replace(/\n/g, ' ')}"` // Handle newlines
      ].join(",");
      csvContent += row + "\n";
    });

    // 4. Trigger Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Installation_Schedule_${targetYear}_${targetMonth}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">이달의 설치 예정 및 현황</h2>
            <p className="text-sm text-gray-500 mt-1">{targetYear}년 {targetMonth}월 내수 설치</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto flex-1 p-0">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">MODEL</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">업체명</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">지역</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">설치 예정자</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">설치 예정일</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">완료 여부</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">비고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {schedules.length > 0 ? (
                schedules.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-sm">{item.model}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-800">{item.company}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-gray-600 text-sm">
                        {item.region}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <span className="text-sm font-medium text-gray-700">{item.installer}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="text-sm text-gray-600 font-medium font-mono">
                         {item.date}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusStyle(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-500">{item.note}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Calendar size={40} className="text-gray-300 mb-2" />
                      <p>등록된 설치 일정이 없습니다.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between">
          <span className="text-sm text-gray-500 font-medium">총 {schedules.length}건의 설치 기록</span>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              닫기
            </button>
            <button 
              onClick={handleExportCSV}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center shadow-sm"
            >
              <Printer size={16} className="mr-2" />
              출력하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};