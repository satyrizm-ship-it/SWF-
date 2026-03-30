import React, { useState, useRef, useEffect } from 'react';
import { Company, Priority, ServiceType, ServiceStatus, ServiceRecord, IssueGrade, calculatePriority } from '../types';
import { ArrowLeft, MapPin, Phone, Mail, Building2, User, Wrench, Printer, Paperclip, X, Upload, CheckCircle2, FileSpreadsheet, Download, Filter, ListFilter, Plus, Lock, Edit2, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { saveServiceToSheet, updateServiceInSheet, deleteServiceFromSheet, updateCompanyInSheet, deleteMachineFromSheet } from '../services/googleSheets';
import EditCompanyModal from './EditCompanyModal';

interface ClientDetailProps {
  company: Company;
  onBack: () => void;
  onUpdateCompany: (company: Company) => void;
  isAdminMode: boolean;
  monthlySchedules: MonthlySchedule[];
}

export const ClientDetail: React.FC<ClientDetailProps> = ({ company, onBack, onUpdateCompany, isAdminMode, monthlySchedules }) => {
  // Modal States
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // Auth popup state
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false); // Edit Company Modal
  const [authPassword, setAuthPassword] = useState(''); // Auth password state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // For image carousel

  // Filter & Export States
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [exportSelectedMachineIds, setExportSelectedMachineIds] = useState<string[]>([]);
  
  // Edit & Delete State
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Track deletion per item
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null); // ID of service to confirm delete
  const [machineToDelete, setMachineToDelete] = useState<string | null>(null); // ID of machine to confirm delete

  // Validation State
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  // Form State
  const [serviceForm, setServiceForm] = useState({
    machineId: '',
    // KST 기준으로 오늘 날짜 초기화 (YYYY-MM-DD)
    date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }),
    type: ServiceType.AS,
    issue: '',
    resolution: '',
    technician: '',
    priority: IssueGrade.INQUIRY, 
  });
  
  // Changed to fixed size array for 3 slots: [url|null, url|null, url|null]
  const [attachedImages, setAttachedImages] = useState<(string | null)[]>([null, null, null]); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const historySectionRef = useRef<HTMLDivElement>(null);
  const authInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthModalOpen && authInputRef.current) {
        authInputRef.current.focus();
    }
  }, [isAuthModalOpen]);

  const getElapsedDays = (dateStr: string) => {
    const start = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diff = now - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.RESOLVED: return 'text-green-600 bg-green-50 border-green-100';
      case ServiceStatus.PENDING: return 'text-orange-600 bg-orange-50 border-orange-100';
      case ServiceStatus.SCHEDULED: return 'text-blue-600 bg-blue-50 border-blue-100';
      default: return 'text-gray-600';
    }
  };

  const getIssueGradeColor = (grade?: string) => {
     switch (grade) {
      case IssueGrade.CRITICAL: return 'text-red-700 bg-red-100 border-red-200';
      case IssueGrade.MAJOR: return 'text-orange-700 bg-orange-100 border-orange-200';
      case IssueGrade.MINOR: return 'text-blue-700 bg-blue-100 border-blue-200';
      case IssueGrade.INQUIRY: return 'text-gray-700 bg-gray-100 border-gray-200';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getServiceTypeBadge = (type: ServiceType) => {
    if (type === ServiceType.AS) {
      return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold border border-red-200 whitespace-nowrap">A/S</span>
    }
    // B/S 스타일 변경: 연한 녹색, 텍스트 B/S
    return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold border border-green-200 whitespace-nowrap">B/S</span>
  };

  // Helper to parse multiple images
  const getImages = (urlStr: string) => {
      if (!urlStr) return [];
      return urlStr.split('|||').filter(Boolean);
  };

  // Helper to resize image
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1024; // Resize to max 1024px

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6)); // Compress quality to 0.6
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setServiceForm(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error for this field if exists
    if (validationErrors[name]) {
        setValidationErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const handleFileChange = (index: number) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resized = await resizeImage(file);
        setAttachedImages(prev => {
          const newImages = [...prev];
          newImages[index] = resized;
          return newImages;
        });
      } catch (err) {
        console.error("Image processing error", err);
        alert("이미지 처리 중 오류가 발생했습니다.");
      }
    }
    // Reset input to allow selecting same file again
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => {
        const newImages = [...prev];
        newImages[index] = null;
        return newImages;
    });
  };

  const handleMachineFilter = (machineId: string) => {
    if (selectedMachineId === machineId) {
      setSelectedMachineId(null);
    } else {
      setSelectedMachineId(machineId);
      // Scroll to history section
      setTimeout(() => {
        historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const filteredHistory = selectedMachineId 
    ? company.serviceHistory.filter(h => h.machineId === selectedMachineId)
    : company.serviceHistory;

  // New: Handle + Service Click
  const handleAddServiceClick = () => {
    // Reset form for new entry
    setEditingServiceId(null);
    setValidationErrors({});
    setServiceForm({
        machineId: selectedMachineId || '',
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }),
        type: ServiceType.AS,
        issue: '',
        resolution: '',
        technician: '',
        priority: IssueGrade.INQUIRY,
    });
    setAttachedImages([null, null, null]); // Reset 3 slots

    if (isAdminMode) {
        setIsServiceModalOpen(true);
    } else {
        setAuthPassword('');
        setIsAuthModalOpen(true);
    }
  };

  const handleEditService = (record: ServiceRecord) => {
      setEditingServiceId(record.id);
      setValidationErrors({});
      setServiceForm({
          machineId: record.machineId,
          date: record.date,
          type: record.type,
          issue: record.issue,
          resolution: record.resolution || '',
          technician: record.technician,
          priority: (record.priority as IssueGrade) || IssueGrade.INQUIRY,
      });
      
      // Parse existing images and fill slots
      const images = getImages(record.attachmentUrl || '');
      const paddedImages = [null, null, null] as (string | null)[];
      images.forEach((img, i) => {
          if (i < 3) paddedImages[i] = img;
      });
      setAttachedImages(paddedImages);

      setIsServiceModalOpen(true);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authPassword === '202603') {
        setIsAuthModalOpen(false);
        setIsServiceModalOpen(true);
    } else {
        alert('비밀번호가 올바르지 않습니다.');
    }
  };

  const handleSubmitService = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const errors: Record<string, boolean> = {};
    if (!serviceForm.machineId) errors.machineId = true;
    if (!serviceForm.date) errors.date = true;
    if (!serviceForm.technician) errors.technician = true;
    if (!serviceForm.issue) errors.issue = true;

    if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        alert('필수 입력 항목을 확인해주세요. (붉은색 테두리)');
        return;
    }

    const selectedMachine = company.machines.find(m => m.id === serviceForm.machineId);
    if (!selectedMachine) {
        alert("선택된 기계 정보를 찾을 수 없습니다.");
        return;
    }

    setIsSubmitting(true);

    try {
      // Join multiple images with a separator, filtering out nulls
      const combinedPhotos = attachedImages.filter(Boolean).join('|||');
      
      const basePayload = {
        date: serviceForm.date,
        type: serviceForm.type,
        issue: serviceForm.issue,
        resolution: serviceForm.resolution,
        technician: serviceForm.technician,
        priority: serviceForm.priority,
        photo: combinedPhotos
      };

      let success = false;

      if (editingServiceId) {
          // Update Mode
          success = await updateServiceInSheet({
              id: editingServiceId,
              ...basePayload
          });
          
          if (success) {
            alert("서비스 기록이 수정되었습니다.");
            const newHistory = company.serviceHistory.map(rec => {
                if (rec.id === editingServiceId) {
                    return {
                        ...rec,
                        ...basePayload,
                        machineId: serviceForm.machineId,
                        machineModel: selectedMachine.modelName,
                        attachmentUrl: combinedPhotos || undefined
                    };
                }
                return rec;
            });
            const updatedCompany = { 
                ...company, 
                serviceHistory: newHistory,
                priority: calculatePriority(newHistory)
            };
            onUpdateCompany(updatedCompany);
          }
      } else {
          // Create Mode
          const newId = `svc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          
          success = await saveServiceToSheet({
            id: newId, 
            company: company.name,
            model: selectedMachine.modelName,
            serial: selectedMachine.serialNumber,
            ...basePayload
          });

          if (success) {
              const newRecord: ServiceRecord = {
                id: newId,
                ...basePayload,
                machineId: serviceForm.machineId,
                machineModel: selectedMachine.modelName,
                status: ServiceStatus.RESOLVED,
                attachmentUrl: combinedPhotos || undefined
            };
            const newHistory = [newRecord, ...company.serviceHistory];
            const updatedCompany = { 
                ...company, 
                serviceHistory: newHistory,
                priority: calculatePriority(newHistory)
            };
            onUpdateCompany(updatedCompany);
          }
      }

      if (success) {
         setEditingServiceId(null);
         setValidationErrors({});
         setServiceForm({
            machineId: '',
            date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }),
            type: ServiceType.AS,
            issue: '',
            resolution: '',
            technician: '',
            priority: IssueGrade.INQUIRY,
         });
         setAttachedImages([null, null, null]);
         setIsServiceModalOpen(false);
      } else {
        alert("처리에 실패했습니다. 스프레드시트 네트워크 상태를 확인하거나 ID가 유효한지 확인해주세요.");
      }
    } catch (error) {
       console.error(error);
       alert("오류가 발생했습니다.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (serviceId: string) => {
    setServiceToDelete(serviceId);
  };

  const confirmDelete = async () => {
    if (!serviceToDelete) return;
    
    setIsDeleting(serviceToDelete);
    try {
        const success = await deleteServiceFromSheet(serviceToDelete);
        
        if (success) {
            // UI Update
            const updatedHistory = company.serviceHistory.filter(s => s.id !== serviceToDelete);
            const updatedCompany = { 
                ...company, 
                serviceHistory: updatedHistory,
                priority: calculatePriority(updatedHistory)
            };
            onUpdateCompany(updatedCompany);
            alert('삭제되었습니다.');
            setIsServiceModalOpen(false); // Close modal if open
            setServiceToDelete(null);
        } else {
            alert("삭제에 실패했습니다. 해당 ID를 찾을 수 없거나 네트워크 오류입니다.");
        }
    } catch (error) {
        console.error("Delete failed", error);
        alert("삭제 처리 중 오류가 발생했습니다.");
    } finally {
        setIsDeleting(null);
    }
  };

  const confirmDeleteMachine = async () => {
    if (!machineToDelete) return;
    
    setIsDeleting(machineToDelete);
    try {
        const success = await deleteMachineFromSheet(machineToDelete);
        
        if (success) {
            // UI Update - Remove machine from company
            const updatedMachines = company.machines.filter(m => m.id !== machineToDelete);
            const updatedCompany = { ...company, machines: updatedMachines };
            
            // If the deleted machine was selected, clear selection
            if (selectedMachineId === machineToDelete) {
                setSelectedMachineId(null);
            }
            
            onUpdateCompany(updatedCompany);
            alert('기계가 삭제되었습니다.');
            setMachineToDelete(null);
        } else {
            alert("삭제에 실패했습니다. 해당 ID를 찾을 수 없거나 네트워크 오류입니다.");
        }
    } catch (error) {
        console.error("Delete machine failed", error);
        alert("기계 삭제 중 오류가 발생했습니다.");
    } finally {
        setIsDeleting(null);
    }
  };

  // Export Logic
  const openExportModal = () => {
    setExportSelectedMachineIds(company.machines.map(m => m.id)); // Default select all
    setIsExportModalOpen(true);
  };

  const toggleExportSelection = (id: string) => {
    setExportSelectedMachineIds(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const toggleExportAll = () => {
    if (exportSelectedMachineIds.length === company.machines.length) {
      setExportSelectedMachineIds([]);
    } else {
      setExportSelectedMachineIds(company.machines.map(m => m.id));
    }
  };

  const handleExportCSV = () => {
    const recordsToExport = company.serviceHistory.filter(r => 
      exportSelectedMachineIds.includes(r.machineId)
    );

    if (recordsToExport.length === 0) {
      alert('선택한 기계의 서비스 이력이 없습니다.');
      return;
    }

    // CSV Header
    let csvContent = '\uFEFF'; // BOM for Excel Korean support
    csvContent += "Date,Type,Machine Model,Serial Number,Technician,Grade,Issue,Resolution\n";

    recordsToExport.forEach(record => {
      const machine = company.machines.find(m => m.id === record.machineId);
      const row = [
        record.date,
        record.type,
        `"${record.machineModel.replace(/"/g, '""')}"`,
        `"${machine?.serialNumber || ''}"`,
        `"${record.technician}"`,
        record.priority || '',
        `"${record.issue.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${(record.resolution || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${company.name.replace(/ /g, '_')}_Service_History.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setIsExportModalOpen(false);
  };

  const handleUpdateCompany = async (updatedData: any) => {
    const success = await updateCompanyInSheet(updatedData);
    if (success) {
      // Update local state
      const updatedCompany = {
        ...company,
        name: updatedData.name,
        representative: updatedData.representative,
        contactPhone: updatedData.contactPhone,
        contactPhone2: updatedData.contactPhone2,
        address: updatedData.address,
        contactEmail: updatedData.contactEmail,
        note: updatedData.note
      };
      onUpdateCompany(updatedCompany);
      alert('업체 정보가 수정되었습니다.');
    } else {
      alert('업체 정보 수정에 실패했습니다.');
    }
  };

  return (
    <div className="flex flex-col h-full md:h-[calc(100vh-9rem)] gap-4 animate-fade-in-up relative">
      {/* 
        LAYOUT CHANGE:
        1. Fixed Top Section (Navigation, Compact Company Info, Compact Machines)
        2. Scrollable Bottom Section (History)
      */}

      {/* --- Fixed Top Section --- */}
      <div className="flex-shrink-0 space-y-3 z-10">
        {/* Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button 
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-blue-600 transition-colors font-medium text-sm"
          >
            <ArrowLeft size={18} className="mr-1.5" />
            목록으로 돌아가기
          </button>
          <div className="flex gap-2 w-full sm:w-auto">
             <button 
               onClick={openExportModal}
               className="flex-1 sm:flex-none flex items-center justify-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm whitespace-nowrap"
             >
               <Printer size={14} className="mr-1.5"/> <span>출력하기</span>
             </button>
             {isAdminMode && (
               <button 
                 onClick={handleAddServiceClick}
                 className="flex-1 sm:flex-none flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 whitespace-nowrap"
               >
                 <Plus size={14} className="mr-1.5"/> 서비스 <span className="hidden xs:inline">추가</span>
               </button>
             )}
          </div>
        </div>

        {/* Company Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
          <div className="flex items-start gap-4 md:gap-5">
            <div className="w-14 h-14 md:w-20 md:h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
              <Building2 size={24} className="md:w-8 md:h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                 <h2 className="text-lg md:text-2xl font-bold text-gray-900 leading-tight">{company.name}</h2>
                 <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold border whitespace-nowrap ${
                   company.priority === Priority.HIGH ? 'bg-red-100 text-red-700 border-red-200' : 
                   company.priority === Priority.MEDIUM ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                   company.priority === Priority.NORMAL ? 'bg-green-100 text-green-700 border-green-200' :
                   'bg-blue-100 text-blue-700 border-blue-200'
                 }`}>
                   {company.priority}
                 </span>
              </div>
              
              <div className="mt-2 md:mt-4 grid grid-cols-1 md:grid-cols-2 gap-y-1 md:gap-y-2 gap-x-8 text-sm text-gray-600">
                <div className="flex items-center gap-2 truncate">
                  <User size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-gray-900">대표:</span> {company.representative || '-'}
                </div>
                <div className="flex items-center gap-2 truncate">
                  <Phone size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-gray-900">연락처:</span> 
                  <span>{company.contactPhone}</span>
                  {company.contactPhone2 && <span className="text-gray-500 text-xs">/ {company.contactPhone2}</span>}
                </div>
                <div className="flex items-center gap-2 truncate col-span-1 md:col-span-2">
                  <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-gray-900">주소:</span> {company.address}
                </div>
                {company.note && (
                  <div className="flex items-start gap-2 col-span-1 md:col-span-2 mt-1 bg-gray-50 p-2 rounded text-xs text-gray-600">
                    <span className="font-bold text-gray-700 flex-shrink-0">비고:</span>
                    <p className="whitespace-pre-wrap">{company.note}</p>
                  </div>
                )}
              </div>
            </div>
            
            {isAdminMode && (
              <button 
                onClick={() => setIsEditCompanyModalOpen(true)}
                className="text-gray-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition-colors"
                title="업체 정보 수정"
              >
                <Edit2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Owned Machines Section - Compact Horizontal Scroll */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
             <h3 className="text-sm font-bold text-gray-900">보유 기계 <span className="text-gray-500 font-normal text-xs ml-1">{company.machines.length}대</span></h3>
          </div>
          <div className="flex overflow-x-auto gap-3 pb-2 -mx-1 px-1 scrollbar-hide">
            {company.machines.map(machine => {
              const dInstall = new Date(machine.installDate);
              let isWarrantyActive = false;
              if (!isNaN(dInstall.getTime())) {
                  const dNow = new Date();
                  dInstall.setHours(0,0,0,0);
                  dNow.setHours(0,0,0,0);
                  const elapsedDays = Math.floor((dNow.getTime() - dInstall.getTime()) / (1000 * 60 * 60 * 24));
                  isWarrantyActive = elapsedDays < 365;
              }

              return (
              <div key={machine.id} className={`flex-shrink-0 w-64 bg-white rounded-lg shadow-sm border transition-all ${selectedMachineId === machine.id ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10' : 'border-gray-100 hover:border-blue-200'}`}>
                 <div className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 truncate mr-2">
                      <h4 className="font-bold text-sm text-gray-900 truncate" title={machine.modelName}>{machine.modelName}</h4>
                      {isAdminMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMachineToDelete(machine.id);
                          }}
                          className="px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] font-bold hover:bg-red-100 transition-colors flex-shrink-0"
                          title="기계 삭제"
                        >
                          DEL
                        </button>
                      )}
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap flex-shrink-0 ${isWarrantyActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {isWarrantyActive ? 'Warranty' : 'Warranty Expired'}
                    </span>
                  </div>

                  <div className="space-y-0.5 text-xs text-gray-500 mb-3">
                    <div className="flex justify-between">
                      <span>S/N:</span> 
                      <span className="font-mono text-gray-700">{machine.serialNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>설치일:</span> 
                      <span>{machine.installDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      <div className="flex items-baseline">
                          <span className="text-lg font-bold text-blue-600">{getElapsedDays(machine.installDate)}</span>
                          <span className="ml-0.5 text-xs text-gray-500">일째</span>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={(e) => { 
                              e.stopPropagation(); 
                              // Check Monthly Schedule first
                              const schedule = monthlySchedules?.find(s => s.serial === machine.serialNumber && s.photo);
                              const photoUrl = schedule?.photo || (machine.imageUrl && !machine.imageUrl.includes('placeholder') ? machine.imageUrl : null);
                              
                              if (photoUrl) {
                                  setViewingImage(photoUrl); 
                                  setCurrentImageIndex(0); 
                              } else {
                                  alert("등록된 설치 사진이 없습니다.");
                              }
                          }}
                          className="flex items-center px-2 py-1 text-[10px] font-semibold rounded transition-colors bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600"
                          title="설치 사진 보기"
                        >
                          <ImageIcon size={12} className="mr-1"/>
                          사진
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleMachineFilter(machine.id); }}
                          className={`flex items-center px-2 py-1 text-[10px] font-semibold rounded transition-colors border ${selectedMachineId === machine.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}
                        >
                          <ListFilter size={12} className="mr-1"/>
                          이력
                        </button>
                      </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- Scrollable Bottom Section --- */}
      <div className="flex-1 md:overflow-y-auto min-h-0 md:pr-2 pb-4">
        {/* Service History Section */}
        <div ref={historySectionRef} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-gray-900 flex items-center">
                서비스 이력
                {selectedMachineId && (
                  <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center">
                    <Filter size={10} className="mr-1"/>
                    {company.machines.find(m => m.id === selectedMachineId)?.modelName}
                    <button onClick={() => setSelectedMachineId(null)} className="ml-2 hover:text-blue-800"><X size={12}/></button>
                  </span>
                )}
              </h3>
            </div>
            <div className="flex gap-3 text-xs">
               <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-gray-600 font-medium">A/S</span></div>
               <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span><span className="text-gray-600 font-medium">B/S</span></div>
            </div>
          </div>

          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="py-2 pr-4 font-medium w-24">Date</th>
                  <th className="py-2 px-4 font-medium w-16">Type</th>
                  <th className="py-2 px-4 font-medium w-1/5">Machine</th>
                  <th className="py-2 px-4 font-medium min-w-[200px]">Issue & Resolution</th>
                  <th className="py-2 px-4 font-medium w-24">Technician</th>
                  <th className="py-2 px-4 font-medium text-center w-20">Grade</th>
                  <th className="py-2 px-4 font-medium text-center w-12">Ref</th>
                  {isAdminMode && <th className="py-2 px-4 font-medium text-center w-20 bg-blue-50/50">관리</th>}
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map(record => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4 text-gray-900 font-semibold whitespace-nowrap align-top text-xs">{record.date}</td>
                      <td className="py-3 px-4 align-top">{getServiceTypeBadge(record.type)}</td>
                      <td className="py-3 px-4 text-gray-600 align-top">
                        <span className="block font-medium text-gray-800 truncate max-w-[150px] text-xs" title={record.machineModel}>{record.machineModel}</span>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <p className="font-medium text-gray-900 mb-1 leading-snug text-xs">{record.issue}</p>
                        {record.resolution && <p className="text-gray-500 text-[11px] bg-gray-50 p-1.5 rounded border border-gray-100 leading-snug">{record.resolution}</p>}
                      </td>
                      <td className="py-3 px-4 text-gray-700 align-top whitespace-nowrap text-xs">
                        {record.technician}
                      </td>
                      <td className="py-3 px-4 text-center align-top">
                        {record.priority && (
                           <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${getIssueGradeColor(record.priority as string)}`}>
                             {record.priority}
                           </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center align-top">
                        {record.attachmentUrl && (
                          <button 
                            onClick={() => { setViewingImage(record.attachmentUrl!); setCurrentImageIndex(0); }}
                            className="text-gray-400 hover:text-blue-600 transition-colors p-1 hover:bg-blue-50 rounded relative group"
                            title="View Attachment"
                          >
                            <Paperclip size={14} />
                            {getImages(record.attachmentUrl).length > 1 && (
                              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full border border-white"></span>
                            )}
                          </button>
                        )}
                      </td>
                      {isAdminMode && (
                          <td className="py-3 px-4 text-center align-top relative z-10">
                             <div className="flex items-center justify-center gap-1">
                                  <button 
                                      type="button"
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                                      onClick={(e) => { e.stopPropagation(); handleEditService(record); }}
                                      title="수정"
                                      disabled={isDeleting === record.id}
                                  >
                                      <Edit2 size={14} />
                                  </button>
                             </div>
                          </td>
                      )}
                    </tr>
                  ))
                ) : (
                   <tr>
                    <td colSpan={isAdminMode ? 8 : 7} className="py-8 text-center text-gray-500 text-xs">
                      {selectedMachineId ? '선택된 기계의 서비스 이력이 없습니다.' : '이력이 존재하지 않습니다.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Auth Modal & Other Modals remain same ... */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center"><Lock size={18} className="mr-2 text-blue-600"/>인증 필요</h3>
              <button onClick={() => setIsAuthModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAuthSubmit} className="p-6">
               <p className="text-sm text-gray-600 mb-4">서비스 기록을 추가하려면 관리자 권한이 필요합니다.</p>
               <div className="mb-4">
                 <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                 <input 
                    ref={authInputRef}
                    type="password" 
                    value={authPassword} 
                    onChange={(e) => setAuthPassword(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="관리자 비밀번호 입력"
                    autoFocus 
                  />
               </div>
               <button type="submit" className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">인증 확인</button>
            </form>
          </div>
        </div>
      )}

      {/* Service Record Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Wrench size={18} className="mr-2 text-blue-600"/>
                {editingServiceId ? '서비스 기록 수정' : '서비스 기록 추가'}
              </h3>
              <button 
                onClick={() => setIsServiceModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitService} className="flex-1 overflow-y-auto p-6 space-y-4">
               {/* Row 1: Machine & Date */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">대상 기종 선택 <span className="text-red-500">*</span></label>
                   <select 
                     name="machineId"
                     value={serviceForm.machineId}
                     onChange={handleInputChange}
                     className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${validationErrors.machineId ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 focus:ring-blue-500'}`}
                   >
                     <option value="">기종을 선택하세요</option>
                     {company.machines.map(m => (
                       <option key={m.id} value={m.id}>{m.modelName} ({m.serialNumber})</option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">서비스 일자 <span className="text-red-500">*</span></label>
                   <input 
                      type="date"
                      name="date"
                      value={serviceForm.date}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${validationErrors.date ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 focus:ring-blue-500'}`}
                   />
                 </div>
               </div>

               {/* Row 2: Type, Grade */}
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">서비스 구분</label>
                    <select 
                      name="type"
                      value={serviceForm.type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={ServiceType.AS}>A/S</option>
                      <option value={ServiceType.BS}>B/S</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">등급</label>
                    <select 
                      name="priority"
                      value={serviceForm.priority}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={IssueGrade.INQUIRY}>문의 (Inquiry)</option>
                      <option value={IssueGrade.MINOR}>경미 (Minor)</option>
                      <option value={IssueGrade.MAJOR}>중대 (Major)</option>
                      <option value={IssueGrade.CRITICAL}>치명 (Critical)</option>
                    </select>
                  </div>
               </div>

               {/* Row 3: Technician */}
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당자 (Technician) <span className="text-red-500">*</span></label>
                  <input 
                    type="text"
                    name="technician"
                    value={serviceForm.technician}
                    onChange={handleInputChange}
                    placeholder="담당자 이름"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${validationErrors.technician ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 focus:ring-blue-500'}`}
                  />
               </div>

               {/* Issue & Resolution */}
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">문제점 및 요청 사항 <span className="text-red-500">*</span></label>
                  <textarea 
                    name="issue"
                    value={serviceForm.issue}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 h-20 resize-none ${validationErrors.issue ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 focus:ring-blue-500'}`}
                    placeholder="발생한 문제 또는 요청 사항을 자세히 기록하세요."
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">조치 사항 (Resolution)</label>
                  <textarea 
                    name="resolution"
                    value={serviceForm.resolution}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                    placeholder="조치한 내용이나 향후 계획을 기록하세요."
                  />
               </div>

               {/* File Upload - Multi Image (Card Style) */}
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">사진 첨부 (최대 3장)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="relative aspect-square">
                        {attachedImages[index] ? (
                          <div className="w-full h-full relative rounded-lg overflow-hidden border border-gray-200 group bg-gray-50">
                            <img 
                              src={attachedImages[index]!} 
                              alt={`Service Upload ${index + 1}`} 
                              className="w-full h-full object-cover" 
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <label className={`w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                             <Upload size={20} className="text-gray-400 mb-1" />
                             <span className="text-xs text-gray-500 font-medium">추가</span>
                             <input 
                               type="file" 
                               className="hidden" 
                               accept="image/*"
                               onChange={handleFileChange(index)}
                               disabled={isSubmitting}
                             />
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
            </form>

            <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50">
              <button 
                type="button" 
                onClick={() => setIsServiceModalOpen(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors font-medium shadow-sm"
                disabled={isSubmitting}
              >
                취소
              </button>
              <button 
                onClick={handleSubmitService}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm flex items-center justify-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                    <>
                        <Loader2 size={18} className="animate-spin mr-2"/>
                        저장 중...
                    </>
                ) : (editingServiceId ? '수정 완료' : '저장하기')}
              </button>

              {editingServiceId && (
                <button 
                  type="button"
                  onClick={() => handleDeleteClick(editingServiceId)}
                  className="flex-1 px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium shadow-sm flex items-center justify-center whitespace-nowrap"
                  disabled={isSubmitting || (isDeleting === editingServiceId)}
                >
                  {isDeleting === editingServiceId ? <Loader2 size={18} className="animate-spin"/> : '이 기록 삭제'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                  <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">정말 삭제하시겠습니까?</h3>
              <p className="text-sm text-gray-500 mb-6">삭제된 데이터는 복구할 수 없습니다.</p>
              <div className="flex gap-3">
                  <button 
                      onClick={() => setServiceToDelete(null)}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                  >
                      취소
                  </button>
                  <button 
                      onClick={confirmDelete}
                      className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 font-medium"
                      disabled={!!isDeleting}
                  >
                      {isDeleting ? <Loader2 size={18} className="animate-spin mx-auto"/> : 'YES'} 
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* Machine Delete Confirmation Modal */}
      {machineToDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                  <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">기계를 삭제하시겠습니까?</h3>
              <p className="text-sm text-gray-500 mb-6">보유 기계 목록에서 삭제됩니다.</p>
              <div className="flex gap-3">
                  <button 
                      onClick={() => setMachineToDelete(null)}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                  >
                      취소
                  </button>
                  <button 
                      onClick={confirmDeleteMachine}
                      className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 font-medium"
                      disabled={!!isDeleting}
                  >
                      {isDeleting ? <Loader2 size={18} className="animate-spin mx-auto"/> : '삭제'} 
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <FileSpreadsheet size={18} className="mr-2 text-green-600"/>
                서비스 이력 출력
              </h3>
              <button onClick={() => setIsExportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">출력할 기계를 선택하세요. 선택된 기계의 모든 서비스 이력이 CSV 파일로 저장됩니다.</p>
              
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">기계 목록 ({company.machines.length})</span>
                <button 
                  onClick={toggleExportAll} 
                  className="text-xs text-blue-600 font-medium hover:underline"
                >
                  {exportSelectedMachineIds.length === company.machines.length ? '선택 해제' : '전체 선택'}
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto mb-6 border border-gray-100 rounded-lg p-2 bg-gray-50">
                {company.machines.map(machine => (
                  <label key={machine.id} className="flex items-center p-2 rounded hover:bg-white cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={exportSelectedMachineIds.includes(machine.id)}
                      onChange={() => toggleExportSelection(machine.id)}
                    />
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">{machine.modelName}</p>
                      <p className="text-xs text-gray-500">S/N: {machine.serialNumber}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsExportModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  취소
                </button>
                <button 
                  onClick={handleExportCSV}
                  className="flex-1 flex items-center justify-center px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
                  disabled={exportSelectedMachineIds.length === 0}
                >
                  <Download size={16} className="mr-2"/>
                  내보내기 (CSV)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal (Handles Multiple Images with Pagination) */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in p-4"
          onClick={() => { setViewingImage(null); setCurrentImageIndex(0); }}
        >
          <div className="relative max-w-5xl w-full h-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
             <button 
               onClick={() => { setViewingImage(null); setCurrentImageIndex(0); }}
               className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-50 p-2 bg-black/20 rounded-full hover:bg-black/40"
             >
               <X size={24} />
             </button>
             
             {(() => {
                 const images = getImages(viewingImage);
                 const total = images.length;
                 // Ensure index is valid
                 const safeIndex = currentImageIndex >= total ? 0 : currentImageIndex;
                 
                 return (
                     <div className="relative w-full h-full flex items-center justify-center">
                         {total > 1 && (
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentImageIndex(prev => (prev - 1 + total) % total);
                                }}
                                className="absolute left-2 md:left-4 z-40 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/50 rounded-full transition-all"
                             >
                                 <ChevronLeft size={32} />
                             </button>
                         )}
                         
                         <img 
                            src={images[safeIndex]} 
                            alt={`Attachment ${safeIndex + 1}`} 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                         />
                         
                         {total > 1 && (
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentImageIndex(prev => (prev + 1) % total);
                                }}
                                className="absolute right-2 md:right-4 z-40 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/50 rounded-full transition-all"
                             >
                                 <ChevronRight size={32} />
                             </button>
                         )}
                         
                         {total > 1 && (
                             <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-40">
                                 {images.map((_, idx) => (
                                     <button
                                        key={idx}
                                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                                        className={`w-2 h-2 rounded-full transition-all ${idx === safeIndex ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'}`}
                                     />
                                 ))}
                             </div>
                         )}
                     </div>
                 );
             })()}
          </div>
        </div>
      )}
      {/* Edit Company Modal */}
      <EditCompanyModal 
        isOpen={isEditCompanyModalOpen}
        onClose={() => setIsEditCompanyModalOpen(false)}
        company={company}
        onSave={handleUpdateCompany}
        isAdminMode={isAdminMode}
      />
    </div>
  );
};
