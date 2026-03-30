import React, { useState, useMemo, useEffect } from 'react';
import { Company, Priority, MonthlySchedule, calculatePriority } from '../types';
import { Search, Calendar, Filter, ChevronRight, AlertCircle, Wrench, Plus, ArrowRight } from 'lucide-react';
import { MonthlyScheduleModal } from './MonthlyScheduleModal';
import { IntensiveCareModal } from './IntensiveCareModal';

interface DashboardProps {
  companies: Company[];
  onSelectCompany: (companyId: string) => void;
  onAddCompany: () => void; 
  isAdminMode: boolean;
  onDeleteCompany: (companyId: string) => void;
  monthlySchedules: MonthlySchedule[];
}

const getElapsedDays = (dateStr: string) => {
  if (!dateStr) return 0;
  const start = new Date(dateStr).getTime();
  if (isNaN(start)) return 0; // 날짜가 유효하지 않으면 0 리턴
  const now = new Date().getTime();
  const diff = now - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  companies, 
  onSelectCompany, 
  onAddCompany, 
  isAdminMode, 
  onDeleteCompany,
  monthlySchedules
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isIntensiveCareModalOpen, setIsIntensiveCareModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  
  // 2026년도 설치 현황 계산 (Dashboard Card)
  const targetYear = '2026';
  const yearInstallations = useMemo(() => {
    return companies.reduce((acc, company) => {
      const count = company.machines ? company.machines.filter(m => m.installDate && m.installDate.startsWith(targetYear)).length : 0;
      return acc + count;
    }, 0);
  }, [companies]);

  // 3개월 이내 설치 현황 (기존 로직 유지)
  const recentInstallations = useMemo(() => {
    return companies.reduce((acc, company) => {
      const recentMachines = company.machines ? company.machines.filter(m => {
        const days = getElapsedDays(m.installDate);
        return days <= 90;
      }) : [];
      return acc + recentMachines.length;
    }, 0);
  }, [companies]);

  const statusCounts = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;
    let normal = 0;

    companies.forEach(company => {
      if (!company.machines) return;
      
      company.machines.forEach(m => {
        const days = getElapsedDays(m.installDate);
        if (days <= 90) {
          const machineHistory = company.serviceHistory ? company.serviceHistory.filter(r => r.machineId === m.id) : [];
          const priority = calculatePriority(machineHistory);
          
          if (priority === Priority.HIGH) high++;
          else if (priority === Priority.MEDIUM) medium++;
          else if (priority === Priority.LOW) low++;
          else normal++;
        }
      });
    });
    
    return {
      warning: high,
      caution: medium,
      interest: low,
      normal: normal
    };
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    const filtered = companies.filter(company => {
      // toLowerCase 에러 방지를 위한 안전한 변환 (null/undefined 처리)
      const safeLower = (val: any) => (val === undefined || val === null) ? '' : String(val).toLowerCase();

      const term = safeLower(searchTerm);
      const companyName = safeLower(company.name);

      const matchesSearch = 
        companyName.includes(term) ||
        (company.machines && company.machines.some(m => safeLower(m.serialNumber).includes(term)));
      
      const matchesPriority = filterPriority === 'All' || company.priority === filterPriority || (filterPriority === Priority.NORMAL && !company.priority);

      // 경과일 90일 이내 필터링 (설치된지 90일 이하인 기계가 하나라도 있으면 표시)
      // 미래 날짜(예정)도 포함하기 위해 days <= 90 조건 사용 (미래는 음수이므로 포함됨)
      const hasRecentMachine = company.machines && company.machines.some(m => {
          const days = getElapsedDays(m.installDate);
          return days <= 90;
      });

      return matchesSearch && matchesPriority && hasRecentMachine;
    });

    // 경과일이 적은 순서대로 정렬 (elapsed days ascending)
    return filtered.sort((a, b) => {
        const getDisplayElapsed = (c: Company) => {
            if (!c.machines || c.machines.length === 0) return Infinity;
            
            const sorted = [...c.machines].sort((m1, m2) => new Date(m2.installDate).getTime() - new Date(m1.installDate).getTime());
            const recent = sorted.filter(m => getElapsedDays(m.installDate) <= 90);
            const target = recent.length > 0 ? recent[0] : sorted[0];
            
            return getElapsedDays(target.installDate);
        };

        return getDisplayElapsed(a) - getDisplayElapsed(b);
    });
  }, [companies, searchTerm, filterPriority]);

  // Pagination Logic
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterPriority]);

  const totalPages = Math.ceil(filteredCompanies.length / ITEMS_PER_PAGE);
  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.HIGH: return 'bg-red-100 text-red-700 border-red-200';
      case Priority.MEDIUM: return 'bg-orange-100 text-orange-700 border-orange-200';
      case Priority.LOW: return 'bg-blue-100 text-blue-700 border-blue-200'; 
      case Priority.NORMAL: return 'bg-green-100 text-green-700 border-green-200'; 
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  return (
    <div className="flex flex-col h-full md:h-[calc(100vh-9rem)] gap-4 animate-fade-in relative">
      {/* Top Fixed Section */}
      <div className="flex-shrink-0 flex flex-col gap-3">
        {/* Page Title - Increased size slightly */}
        <div className="mb-2 px-1">
           <div className="flex justify-between items-start">
             <div>
               <h2 className="text-xl md:text-2xl font-bold text-gray-900">기계 관리 현황</h2>
               <p className="text-sm text-gray-500 mt-1">SWF 자수기 서비스 주기 및 설치 현황을 관리합니다.</p>
             </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 - Increased padding and font size */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between relative overflow-hidden group">
            <div className="z-10">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{targetYear}년도 설치현황</p>
              <div className="flex items-baseline mt-2">
                 <h3 className="text-4xl font-extrabold text-gray-900 mr-2">{yearInstallations}</h3>
                 <span className="text-lg font-medium text-gray-500">대</span>
              </div>
              <div className="mt-3 flex flex-col gap-1">
                  <span className="text-sm text-gray-700 font-semibold flex items-center">
                      이달 설치 현황 및 예정
                  </span>
                  <button 
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="text-xs text-blue-600 font-medium hover:underline flex items-center w-fit"
                  >
                      상세 보기 <ArrowRight size={12} className="ml-1"/>
                  </button>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600 h-fit">
               <Wrench size={22} />
            </div>
          </div>

          {/* Card 2 - Increased padding and font size */}
          <div 
            className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => setIsIntensiveCareModalOpen(true)}
          >
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">3개월 이내 설치 현황</p>
              <div className="flex items-baseline mt-2">
                  <h3 className="text-4xl font-extrabold text-gray-900 mr-2">{recentInstallations}</h3>
                  <span className="text-lg font-medium text-gray-500">대</span>
              </div>
              <span className="text-xs text-indigo-600 font-bold flex items-center mt-3 bg-indigo-50 px-2 py-1 rounded w-fit group-hover:bg-indigo-100 transition-colors">
                 집중 관리 대상
              </span>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600 h-fit group-hover:bg-indigo-100 transition-colors">
              <Calendar size={22} />
            </div>
          </div>

          {/* Card 3 - Increased padding */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
               <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">관리 현황</p>
               <div className="relative group flex items-center">
                 <AlertCircle size={20} className="text-gray-400 cursor-help" />
                 <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                   <ul className="space-y-1.5 text-left">
                     <li><span className="font-bold text-red-300">경고 (HIGH):</span> '치명' 1회 이상 또는 '중대' 2회 이상 발생 시</li>
                     <li><span className="font-bold text-orange-300">주의 (MEDIUM):</span> '중대' 1회 이상 또는 '경미' 3회 이상 발생 시</li>
                     <li><span className="font-bold text-blue-300">관심 (LOW):</span> '경미' 2회 발생 시</li>
                     <li><span className="font-bold text-green-300">안정 (NORMAL):</span> 그 외의 경우</li>
                   </ul>
                 </div>
               </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-center h-full items-center">
              <div 
                onClick={() => setFilterPriority(filterPriority === Priority.NORMAL ? 'All' : Priority.NORMAL)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg bg-green-50 h-full cursor-pointer transition-all hover:ring-2 hover:ring-green-200 hover:ring-offset-1 ${filterPriority === Priority.NORMAL ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}
              >
                <span className="text-xs text-green-700 font-semibold mb-1">안정</span>
                <span className="text-xl font-bold text-green-800">{statusCounts.normal}</span>
              </div>
              <div 
                onClick={() => setFilterPriority(filterPriority === Priority.LOW ? 'All' : Priority.LOW)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg bg-blue-50 h-full cursor-pointer transition-all hover:ring-2 hover:ring-blue-200 hover:ring-offset-1 ${filterPriority === Priority.LOW ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
              >
                <span className="text-xs text-blue-700 font-semibold mb-1">관심</span>
                <span className="text-xl font-bold text-blue-800">{statusCounts.interest}</span>
              </div>
               <div 
                onClick={() => setFilterPriority(filterPriority === Priority.MEDIUM ? 'All' : Priority.MEDIUM)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg bg-orange-50 h-full cursor-pointer transition-all hover:ring-2 hover:ring-orange-200 hover:ring-offset-1 ${filterPriority === Priority.MEDIUM ? 'ring-2 ring-orange-400 ring-offset-1' : ''}`}
              >
                <span className="text-xs text-orange-700 font-semibold mb-1">주의</span>
                <span className="text-xl font-bold text-orange-800">{statusCounts.caution}</span>
              </div>
              <div 
                onClick={() => setFilterPriority(filterPriority === Priority.HIGH ? 'All' : Priority.HIGH)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg bg-red-50 h-full cursor-pointer transition-all hover:ring-2 hover:ring-red-200 hover:ring-offset-1 ${filterPriority === Priority.HIGH ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}
              >
                <span className="text-xs text-red-700 font-semibold mb-1">경고</span>
                <span className="text-xl font-bold text-red-800">{statusCounts.warning}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar - Increased padding and height */}
        <div className="flex flex-col md:flex-row gap-4 md:items-end bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="업체명 또는 기계 시리얼 번호 검색..." 
              className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col gap-2 w-full md:w-48">
            {isAdminMode && (
              <button 
                onClick={onAddCompany}
                className="flex items-center justify-center h-10 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm w-full animate-fade-in"
              >
                 <Plus size={16} className="mr-2" />
                 신규 설치 등록
              </button>
            )}

            <div className="relative w-full">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
              <select 
                className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-gray-700 text-sm"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="All">중요도: 전체</option>
                <option value={Priority.HIGH}>경고 (Warning)</option>
                <option value={Priority.MEDIUM}>주의 (Caution)</option>
                <option value={Priority.LOW}>관심 (Interest)</option>
                <option value={Priority.NORMAL}>안정 (Stable)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden min-h-[400px] md:min-h-0">
        <div className="overflow-x-auto flex-1 overflow-y-auto w-full">
          <table className="w-full whitespace-nowrap min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
              <tr>
                {/* Reduced padding for table header from py-2.5 to py-2 */}
                <th className="px-4 md:px-6 py-2 text-left text-[11px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">업체명 (Client)</th>
                <th className="px-4 md:px-6 py-2 text-left text-[11px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">보유 모델</th>
                <th className="px-4 md:px-6 py-2 text-left text-[11px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">설치일 (Date)</th>
                <th className="px-4 md:px-6 py-2 text-center text-[11px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">경과일</th>
                <th className="px-4 md:px-6 py-2 text-center text-[11px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">중요도</th>
                <th className="px-4 md:px-6 py-2 text-center text-[11px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">상세보기</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedCompanies.length > 0 ? (
                paginatedCompanies.map((company) => {
                  const sortedMachines = [...(company.machines || [])].sort((a, b) => {
                      return new Date(b.installDate).getTime() - new Date(a.installDate).getTime();
                  });
                  
                  const recentMachines = sortedMachines.filter(m => getElapsedDays(m.installDate) <= 90);
                  const displayMachine = recentMachines.length > 0 ? recentMachines[0] : sortedMachines[0];

                  return (
                    <tr 
                      key={company.id} 
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                      onClick={() => onSelectCompany(company.id)}
                    >
                      {/* Reduced padding for table cells from py-2.5 to py-2 */}
                      <td className="px-4 md:px-6 py-2">
                        <div className="flex flex-col">
                          <span className="text-sm md:text-base font-semibold text-gray-900">{company.name}</span>
                          <span className="text-[11px] md:text-xs text-gray-500">{company.address ? `${company.address.split(' ')[0]} ${company.address.split(' ')[1] || ''}` : ''}</span>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-2">
                        <div className="flex flex-col">
                          <span className="text-sm md:text-base text-gray-800 font-medium">{displayMachine ? displayMachine.modelName : '-'}</span>
                           {company.machines && company.machines.length > 1 && (
                             <span className="text-[9px] md:text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 md:px-2 py-0.5 rounded border border-green-200 w-fit mt-1">
                               보유 기종 {company.machines.length}대
                             </span>
                           )}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-2 text-gray-600 text-xs md:text-sm">
                        {displayMachine ? displayMachine.installDate : '-'}
                      </td>
                      <td className="px-4 md:px-6 py-2 text-center">
                        <span className={`text-sm md:text-base font-bold ${getElapsedDays(displayMachine?.installDate || '') <= 90 ? 'text-blue-600' : 'text-gray-800'}`}>
                          {displayMachine ? getElapsedDays(displayMachine.installDate) : 0}
                        </span>
                        <span className="text-[11px] md:text-xs text-gray-400 ml-1">일</span>
                      </td>
                      <td className="px-4 md:px-6 py-2 text-center">
                        <span className={`inline-flex items-center px-2 md:px-2.5 py-0.5 rounded-full text-[11px] md:text-xs font-medium border ${getPriorityColor(company.priority || Priority.NORMAL)}`}>
                          {company.priority || Priority.NORMAL}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-2 text-center">
                          <button className="text-gray-400 hover:text-blue-600 transition-colors group-hover:translate-x-1 duration-200">
                              <ChevronRight size={16} className="md:w-[18px] md:h-[18px]" />
                          </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                        <AlertCircle size={40} className="text-gray-300 mb-2" />
                        <p className="font-medium text-gray-600">검색 결과가 없습니다.</p>
                        <p className="text-sm text-gray-400 mt-1">최근 90일 이내 설치된 기계가 없거나 검색 조건과 일치하지 않습니다.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-sm text-gray-500 flex justify-between items-center flex-shrink-0">
           <span>전체 {filteredCompanies.length}개 업체 중 {(filteredCompanies.length > 0) ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
           {Math.min(currentPage * ITEMS_PER_PAGE, filteredCompanies.length)} 표시</span>
           <div className="flex items-center gap-4">
             <span className="text-gray-600 font-medium">Page {currentPage} / {totalPages || 1}</span>
             <div className="flex gap-2">
               <button 
                 onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                 disabled={currentPage === 1}
                 className="px-3 py-1 border rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
               >
                 이전
               </button>
               <button 
                 onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                 disabled={currentPage === totalPages || totalPages === 0}
                 className="px-3 py-1 border rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
               >
                 다음
               </button>
             </div>
           </div>
        </div>
      </div>

      <MonthlyScheduleModal 
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        schedules={monthlySchedules}
        targetYear={targetYear}
        targetMonth={String(new Date().getMonth() + 1)} // Current month roughly
        isAdminMode={isAdminMode}
      />

      <IntensiveCareModal 
        isOpen={isIntensiveCareModalOpen}
        onClose={() => setIsIntensiveCareModalOpen(false)}
        companies={companies}
      />
    </div>
  );
};
