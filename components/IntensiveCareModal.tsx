import React, { useState, useMemo } from 'react';
import { X, Calendar, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { Company } from '../types';

interface IntensiveCareModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
}

type ViewMode = 'list' | 'calendar';

export const IntensiveCareModal: React.FC<IntensiveCareModalProps> = ({ isOpen, onClose, companies }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentDate, setCurrentDate] = useState(new Date()); // For calendar navigation
  const [selectedDateDetails, setSelectedDateDetails] = useState<{ date: string; items: { company: string; model: string }[] } | null>(null);

  // 1. Filter data: Machines installed within the last 3 months
  const recentInstallations = useMemo(() => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    threeMonthsAgo.setHours(0, 0, 0, 0);

    const list: { companyName: string; modelName: string; installDate: string; machineId: string }[] = [];

    companies.forEach(company => {
      company.machines.forEach(machine => {
        const d = new Date(machine.installDate);
        if (!isNaN(d.getTime()) && d >= threeMonthsAgo) {
          list.push({
            companyName: company.name,
            modelName: machine.modelName,
            installDate: machine.installDate,
            machineId: machine.id
          });
        }
      });
    });

    // Sort by date descending
    return list.sort((a, b) => new Date(b.installDate).getTime() - new Date(a.installDate).getTime());
  }, [companies]);

  // 2. Calendar Logic
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-14 bg-gray-50/30 border border-gray-100/50"></div>);
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Find installations on this date
      const installationsOnDate = recentInstallations.filter(item => item.installDate === dateStr);
      const hasInstallation = installationsOnDate.length > 0;

      days.push(
        <div 
          key={day} 
          className={`h-14 border border-gray-100 relative flex flex-col items-center justify-start pt-1 transition-colors ${hasInstallation ? 'cursor-pointer hover:bg-green-50' : ''}`}
          onClick={() => {
            if (hasInstallation) {
              setSelectedDateDetails({
                date: dateStr,
                items: installationsOnDate.map(i => ({ company: i.companyName, model: i.modelName }))
              });
            }
          }}
        >
          <span className={`text-sm font-medium ${hasInstallation ? 'z-10 text-green-800' : 'text-gray-700'}`}>
            {day}
          </span>
          {hasInstallation && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-green-200/60 rounded-full flex items-center justify-center">
               {/* Green Circle Shade */}
            </div>
          )}
          {hasInstallation && (
             <div className="absolute bottom-1 text-[10px] font-bold text-green-700 z-10">
               {installationsOnDate.length}건
             </div>
          )}
        </div>
      );
    }

    return days;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-lg font-bold text-gray-900">3개월 이내 설치 현황</h2>
            <p className="text-xs text-gray-500 mt-1">집중 관리 대상 기계 목록 및 일정</p>
          </div>
          <div className="flex items-center gap-2">
             <div className="flex bg-gray-100 rounded-lg p-1">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  title="리스트 보기"
                >
                  <List size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('calendar')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  title="달력 보기"
                >
                  <Calendar size={18} />
                </button>
             </div>
             <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50 transition-colors ml-2"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-0 bg-gray-50/50">
          {viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">설치일</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">업체명</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">모델명</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {recentInstallations.length > 0 ? (
                    recentInstallations.map((item) => (
                      <tr key={item.machineId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 text-sm text-gray-600 font-mono">{item.installDate}</td>
                        <td className="px-6 py-3 text-sm font-semibold text-gray-900">{item.companyName}</td>
                        <td className="px-6 py-3 text-sm text-gray-700">{item.modelName}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                        데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4">
              {/* Calendar Navigation */}
              <div className="flex items-center justify-between mb-4 px-2">
                 <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-full">
                   <ChevronLeft size={20} className="text-gray-600" />
                 </button>
                 <span className="text-lg font-bold text-gray-800">
                   {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                 </span>
                 <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-full">
                   <ChevronRight size={20} className="text-gray-600" />
                 </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                  <div key={day} className="bg-gray-50 py-2 text-center text-xs font-semibold text-gray-500">
                    {day}
                  </div>
                ))}
                <div className="contents bg-white">
                  {renderCalendar()}
                </div>
              </div>
              
              <div className="mt-3 flex items-center justify-end gap-2 text-xs text-gray-500">
                 <div className="w-3 h-3 bg-green-200 rounded-full"></div>
                 <span>설치일 (클릭하여 상세 보기)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Date Details Popover (Simple Overlay) */}
      {selectedDateDetails && (
        <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/20 backdrop-blur-[1px]" onClick={() => setSelectedDateDetails(null)}>
           <div className="bg-white rounded-lg shadow-xl p-4 w-64 animate-fade-in-up border border-gray-100" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                <h4 className="font-bold text-gray-900">{selectedDateDetails.date}</h4>
                <button onClick={() => setSelectedDateDetails(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
              <ul className="space-y-3">
                {selectedDateDetails.items.map((item, idx) => (
                  <li key={idx} className="text-sm">
                    <div className="font-semibold text-gray-800">{item.company}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.model}</div>
                  </li>
                ))}
              </ul>
           </div>
        </div>
      )}
    </div>
  );
};
