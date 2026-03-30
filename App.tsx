import React, { useState, useEffect, useRef } from 'react';
import { Dashboard } from './components/Dashboard';
import { ClientDetail } from './components/ClientDetail';
import { Statistics } from './components/Statistics';
import NewInstallationModal from './components/NewInstallationModal'; 
import { Company, Priority, IssueGrade, ServiceRecord, ServiceStatus, ServiceType, MonthlySchedule, calculatePriority } from './types';
import { Menu, Lock, X, RefreshCw, Cloud, AlertTriangle, Bell, BarChart2, ChevronRight, AlertCircle } from 'lucide-react';
import { fetchCompaniesFromSheet, saveInstallationToSheet } from './services/googleSheets';

interface AlertItem {
  id: string;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  prefix: string;
  companyName: string;
  machineModel: string;
  companyId: string;
  timestamp: string;
}

const App: React.FC = () => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'statistics'>('dashboard');
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginIntent, setLoginIntent] = useState<'TOGGLE_ADMIN' | 'OPEN_INSTALL' | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [monthlySchedules, setMonthlySchedules] = useState<MonthlySchedule[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [error, setError] = useState<string | null>(null);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const toKSTDateString = (val: any) => {
    if (val === undefined || val === null || val === '') return '';
    let str = String(val).trim();
    if (str.includes('T')) {
      try {
        return new Date(str).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
      } catch (e) {
        return str.split('T')[0]; 
      }
    }
    return str.replace(/\./g, '-');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  const triggerBrowserNotification = (newAlerts: AlertItem[]) => {
    if ('Notification' in window && Notification.permission === 'granted' && newAlerts.length > 0) {
      const highestAlert = newAlerts[0]; 
      const title = `SWF 서비스 알림: ${newAlerts.length}건의 중요 이슈`;
      const body = `${highestAlert.prefix} ${highestAlert.companyName} - ${highestAlert.machineModel}`;
      
      new Notification(title, {
        body: body,
        icon: '/favicon.ico', 
        tag: 'swf-alert' 
      });
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchCompaniesFromSheet();
      
      if (data) {
        // --- 1. ADDRESS 시트 매핑 (A:업체명, B:대표자, C:연락처, E:주소) ---
        const addressMap = new Map<string, { rep: string, addr: string, phone: string }>();
        
        if (data.addressList && Array.isArray(data.addressList)) {
            data.addressList.forEach((row: any[]) => {
                const safeStr = (val: any) => (val === undefined || val === null) ? '' : String(val);
                const cName = safeStr(row[0]).trim(); 
                if(cName) {
                    addressMap.set(cName, {
                        rep: safeStr(row[1]).trim(),   
                        phone: safeStr(row[2]).trim(), 
                        addr: safeStr(row[4]).trim()   
                    });
                }
            });
        }

        // --- 2. LIST 시트 처리 및 ADDRESS 병합 ---
        if (data.records && Array.isArray(data.records)) {
            const rawServices = data.services || [];
            const companyMap = new Map<string, Company>();

            data.records.forEach((row: any[], index: number) => {
                const safeStr = (val: any) => (val === undefined || val === null) ? '' : String(val);

                const clientName = safeStr(row[0]).trim();
                const modelName = safeStr(row[1]).trim();
                const serialNumber = safeStr(row[2]).trim();
                let installDate = toKSTDateString(row[3]); 
                const installer = safeStr(row[4]).trim();
                const photoUrl = safeStr(row[5]).trim();
                
                const addrInfo = addressMap.get(clientName);
                const infoRep = addrInfo?.rep || '';   
                const infoPhone = addrInfo?.phone || ''; 
                const infoAddr = addrInfo?.addr || '주소 미입력';  

                if (clientName === '업체명' || clientName === 'Client' || installDate === '설치일') return;
                if (!clientName && !modelName) return; 

                const machineId = `mach-${index}-${serialNumber}`;
                const finalRepresentative = infoRep || '-';

                if (!companyMap.has(clientName)) {
                    companyMap.set(clientName, {
                        id: `comp-${index}-${clientName}`, 
                        name: clientName,
                        representative: finalRepresentative,
                        contactPhone: infoPhone,
                        address: infoAddr,
                        contactEmail: '',
                        contactPhone2: '', 
                        note: '', 
                        priority: Priority.NORMAL,
                        machines: [],
                        serviceHistory: []
                    });
                }

                const company = companyMap.get(clientName)!;

                company.machines.push({
                    id: machineId,
                    modelName: modelName || '-',
                    serialNumber: serialNumber || '-',
                    installDate: installDate || '-',
                    warrantyStatus: 'Active',
                    imageUrl: photoUrl || 'https://via.placeholder.com/400x300?text=No+Image'
                });

                const companyServices: ServiceRecord[] = rawServices
                  .filter((sRow: any[]) => {
                     const sCompany = safeStr(sRow[3]).trim();
                     const sSerial = safeStr(sRow[5]).trim();
                     return sCompany === clientName && sSerial === serialNumber;
                  })
                  .map((sRow: any[], sIdx: number) => {
                     const sheetId = safeStr(sRow[0]).trim();
                     return {
                        id: sheetId || `svc-${machineId}-${sIdx}`, 
                        date: toKSTDateString(sRow[1]), 
                        type: safeStr(sRow[2]) as ServiceType,
                        machineId: machineId,
                        machineModel: safeStr(sRow[4]),
                        issue: safeStr(sRow[6]),
                        resolution: safeStr(sRow[7]),
                        technician: safeStr(sRow[8]),
                        priority: safeStr(sRow[9]).trim() || IssueGrade.INQUIRY, 
                        status: ServiceStatus.RESOLVED,
                        attachmentUrl: safeStr(sRow[10]) || undefined
                     };
                  });
                
                company.serviceHistory.push(...companyServices);
            });
            
            const aggregatedCompanies = Array.from(companyMap.values()).map(comp => {
                comp.serviceHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                
                comp.priority = calculatePriority(comp.serviceHistory);
                return comp;
            });

            aggregatedCompanies.sort((a, b) => {
                 const getPriorityWeight = (p: Priority) => {
                   if (p === Priority.HIGH) return 4;
                   if (p === Priority.MEDIUM) return 3;
                   if (p === Priority.LOW) return 2;
                   return 1;
                 };
                 const weightDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
                 if (weightDiff !== 0) return weightDiff;
                 const getLatestDate = (c: Company) => {
                    if (!c.machines || c.machines.length === 0) return 0;
                    return Math.max(...c.machines.map(m => new Date(m.installDate).getTime()));
                 };
                return getLatestDate(b) - getLatestDate(a);
            });

            setCompanies(aggregatedCompanies);

            const generatedAlerts: AlertItem[] = [];
            aggregatedCompanies.forEach(comp => {
                if (comp.priority && comp.priority !== Priority.NORMAL) {
                    let level: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
                    let prefix = '[관심]';
                    if (comp.priority === Priority.HIGH) { level = 'HIGH'; prefix = '[경고]'; } 
                    else if (comp.priority === Priority.MEDIUM) { level = 'MEDIUM'; prefix = '[주의]'; }
                    
                    const targetMachine = comp.machines.find(m => ((new Date().getTime() - new Date(m.installDate).getTime()) / (1000 * 60 * 60 * 24)) <= 90)?.modelName || comp.machines[0]?.modelName || '모델 정보 없음';

                    generatedAlerts.push({
                        id: `alert-${comp.id}`, level, prefix, companyName: comp.name, machineModel: targetMachine, companyId: comp.id, timestamp: new Date().toISOString()
                    });
                }
            });

            const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
            generatedAlerts.sort((a, b) => priorityOrder[b.level] - priorityOrder[a.level]);
            setAlerts(generatedAlerts);
            if (generatedAlerts.length > 0) triggerBrowserNotification(generatedAlerts);
        } else {
            setCompanies([]); setAlerts([]);
        }

        // --- 3. [복구 완료] Monthly Schedule 시트 처리 ---
        if (data.monthly && Array.isArray(data.monthly)) {
            const formatNote = (val: any) => {
                if (val === undefined || val === null) return '';
                const str = String(val).trim();
                
                if (str.startsWith('1899-12-30T')) {
                    try {
                        const date = new Date(str);
                        return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }); 
                    } catch (e) { return str; }
                }
                if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
                    try { return new Date(str).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }); } 
                    catch (e) { return str; }
                }
                return str;
            };

            const parsedSchedules: MonthlySchedule[] = data.monthly.map((row: any[], index: number) => {
                const safeStr = (val: any) => (val === undefined || val === null) ? '' : String(val);
                
                // 스프레드시트의 한글 상태값을 앱이 이해하는 영어 코드로 매핑
                let rawStatus = safeStr(row[6]).trim();
                let mappedStatus = rawStatus || 'Pending';
                
                if (rawStatus === '예정') mappedStatus = 'Scheduled';
                else if (rawStatus === '진행중') mappedStatus = 'In Progress';
                else if (rawStatus === '완료') mappedStatus = 'Completed';
                else if (rawStatus === '취소') mappedStatus = 'Cancelled';
                else if (rawStatus === '미정') mappedStatus = 'Pending';

                return {
                    id: `sched-${index}`,
                    rowIndex: index + 2, 
                    model: safeStr(row[0]),
                    serial: safeStr(row[1]),
                    company: safeStr(row[2]),
                    region: safeStr(row[3]),
                    installer: safeStr(row[4]),
                    date: toKSTDateString(row[5]),
                    status: mappedStatus as any,
                    note: formatNote(row[7]), 
                    photo: safeStr(row[8]) 
                };
            });
            
            // 헤더 값이 섞여 들어오는 것을 방지
            const filteredSchedules = parsedSchedules.filter(s => 
                s.model !== 'MACHINE MODEL' && s.model !== 'Machine Model' && s.model !== ''
            );
            setMonthlySchedules(filteredSchedules);
        } else {
            setMonthlySchedules([]);
        }
      }
    } catch (err) {
      console.error(err);
      setCompanies([]); 
      setError('데이터 로드 오류');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSaveInstallation = async (formData: any) => {
    setIsSaving(true);
    try {
      const payload = {
        company: formData.clientName,   
        model: formData.modelName,
        serial: formData.serialNumber, 
        date: formData.installDate,   
        installer: formData.installer,
        photo: formData.imageUrl || ''
      };
      const success = await saveInstallationToSheet(payload);
      if (success) {
        alert("성공적으로 저장되었습니다.");
        setIsModalOpen(false); 
        setTimeout(() => loadData(), 1500);
      } else {
        alert("저장에 실패했습니다. 네트워크 상태를 확인해주세요.");
      }
    } catch (e) {
      alert("오류가 발생했습니다: " + e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdminToggle = () => {
    if (isAdminMode) { setIsAdminMode(false); } 
    else { setLoginIntent('TOGGLE_ADMIN'); setIsAdminLoginOpen(true); setAdminPasswordInput(''); }
  };

  const handleNewInstallationClick = () => {
    if (isAdminMode) { setIsModalOpen(true); } 
    else { setLoginIntent('OPEN_INSTALL'); setIsAdminLoginOpen(true); setAdminPasswordInput(''); }
  };

  const submitAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === '202603') {
      setIsAdminMode(true);
      setIsAdminLoginOpen(false);
      if (loginIntent === 'OPEN_INSTALL') setIsModalOpen(true);
      setLoginIntent(null);
    } else {
      alert('비밀번호가 올바르지 않습니다.');
    }
  };

  const handleAlertClick = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setIsNotificationOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <RefreshCw className="animate-spin text-blue-600 mb-4" size={40} />
        <h2 className="text-xl font-bold text-gray-700">데이터를 불러오는 중입니다...</h2>
        <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-10 relative">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1 md:gap-4 min-w-0">
             <div className="flex items-center gap-2 md:gap-3 cursor-pointer group flex-shrink-0" onClick={() => { setSelectedCompanyId(null); setCurrentView('dashboard'); }}>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full shadow-md border-2 border-pink-100 flex items-center justify-center p-1 group-hover:scale-105 transition-all overflow-hidden flex-shrink-0">
                    <svg viewBox="6 4 63 22" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.5 5C17.5 5 19.5 6.5 19.5 6.5L18 10C18 10 16.5 9 15 9C13 9 12 10 12 11C12 12 13 12.5 15 13C18.5 13.5 21 15 21 19C21 23 18 25 14 25C10 25 7 23 7 23L8.5 19.5C8.5 19.5 11 21 13.5 21C15.5 21 16.5 20 16.5 19C16.5 18 15.5 17.5 13.5 17C10 16.5 7.5 15 7.5 11C7.5 7 10.5 5 14.5 5Z" fill="#E91E63"/>
                      <path d="M23 5H29L32 18L35 5H40L43 18L46 5H52L47 25H40.5L37.5 12L34.5 25H28L23 5Z" fill="#E91E63"/>
                      <path d="M54 5H68V9H59V13H67V17H59V25H54V5Z" fill="#E91E63"/>
                    </svg>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-base md:text-lg font-bold text-gray-900 tracking-tight leading-none">SWF Service</h1>
                  <span className="text-[9px] md:text-[10px] text-gray-500 font-medium leading-none">Global Manager</span>
                </div>
             </div>
             <nav className="flex ml-1 md:ml-8 gap-0.5 md:gap-1 overflow-x-auto hide-scrollbar">
               <button onClick={() => { setSelectedCompanyId(null); setCurrentView('dashboard'); }} className={`px-1.5 md:px-3 py-1.5 md:py-2 rounded-md text-[11px] md:text-sm font-medium transition-colors whitespace-nowrap ${currentView === 'dashboard' && !selectedCompanyId ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                 Dashboard
               </button>
               <button onClick={() => { setSelectedCompanyId(null); setCurrentView('statistics'); }} className={`px-1.5 md:px-3 py-1.5 md:py-2 rounded-md text-[11px] md:text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${currentView === 'statistics' && !selectedCompanyId ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                 <BarChart2 size={14} className="md:w-4 md:h-4" /> 통계
               </button>
             </nav>
          </div>

          <div className="flex items-center gap-0 md:gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center mr-2 text-xs">
              {isSaving ? <span className="text-blue-600 flex items-center bg-blue-50 px-2 py-1 rounded-full"><RefreshCw size={12} className="animate-spin mr-1" /> 저장 중...</span>
              : error ? <span className="text-red-600 flex items-center bg-red-50 px-2 py-1 rounded-full" title={error}><AlertTriangle size={12} className="mr-1" /> {error}</span>
              : <span className="text-green-600 flex items-center bg-green-50 px-2 py-1 rounded-full"><Cloud size={12} className="mr-1" /> 동기화 완료</span>}
            </div>
            
            <div className="relative" ref={notificationRef}>
              <button onClick={() => setIsNotificationOpen(!isNotificationOpen)} className={`p-2 rounded-full transition-colors relative ${isNotificationOpen ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                 <Bell size={20} className={alerts.length > 0 ? 'animate-pulse text-gray-600' : ''} />
                 {alerts.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>}
              </button>
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in-up origin-top-right">
                  <div className="px-4 py-3 border-b border-gray-50 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-sm">중요 알림 ({alerts.length})</h3>
                    <button onClick={() => setIsNotificationOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {alerts.length > 0 ? (
                      <div className="divide-y divide-gray-50">
                        {alerts.map(alert => (
                          <div key={alert.id} onClick={() => handleAlertClick(alert.companyId)} className="p-4 hover:bg-blue-50/50 transition-colors cursor-pointer group flex items-start gap-3">
                             <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${alert.level === 'HIGH' ? 'bg-red-100 text-red-600' : alert.level === 'MEDIUM' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                <AlertCircle size={16} />
                             </div>
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${alert.level === 'HIGH' ? 'text-red-700 bg-red-50 border-red-100' : alert.level === 'MEDIUM' ? 'text-orange-700 bg-orange-50 border-orange-100' : 'text-blue-700 bg-blue-50 border-blue-100'}`}>
                                    {alert.prefix}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-gray-900 truncate">{alert.companyName}</h4>
                                <p className="text-xs text-gray-500 truncate">{alert.machineModel}</p>
                             </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-400">
                        <Bell size={24} className="mx-auto mb-2 opacity-20"/>
                        <p className="text-sm">현재 중요 알림이 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleAdminToggle} className={`hidden md:block px-3 py-1.5 text-xs font-semibold border rounded-md transition-all mr-1 ${isAdminMode ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50 hover:text-gray-900'}`}>
              {isAdminMode ? '관리자 모드 ON' : '관리자'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {selectedCompanyId && selectedCompany ? (
          <ClientDetail 
            company={selectedCompany} 
            onBack={() => setSelectedCompanyId(null)} 
            onUpdateCompany={(updated) => setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c))} 
            isAdminMode={isAdminMode}
            monthlySchedules={monthlySchedules}
          />
        ) : currentView === 'statistics' ? (
          <Statistics />
        ) : (
          <Dashboard 
            companies={companies} 
            onSelectCompany={setSelectedCompanyId}
            onAddCompany={handleNewInstallationClick} 
            isAdminMode={isAdminMode}
            onDeleteCompany={(id) => alert("삭제 기능은 구글 시트 연동 필요")}
            monthlySchedules={monthlySchedules} 
          />
        )}
      </main>

      {isAdminLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center"><Lock size={18} className="mr-2 text-blue-600"/>관리자 인증</h3>
              <button onClick={() => setIsAdminLoginOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={submitAdminLogin} className="p-6">
               <div className="mb-4">
                 <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                 <input type="password" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
               </div>
               <button type="submit" className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">인증 확인</button>
            </form>
          </div>
        </div>
      )}

      <NewInstallationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveInstallation}
        isAdminMode={isAdminMode}
      />
    </div>
  );
};

export default App;