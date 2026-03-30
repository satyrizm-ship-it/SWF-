import React, { useState, useEffect } from 'react';
import { X, Loader2, Building2, User, Phone, MapPin, Mail } from 'lucide-react';
import { Company } from '../types';

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  onSave: (updatedData: any) => Promise<void>;
  isAdminMode: boolean;
}

const EditCompanyModal: React.FC<EditCompanyModalProps> = ({ isOpen, onClose, company, onSave, isAdminMode }) => {
  const [formData, setFormData] = useState({
    name: '',
    representative: '',
    contactPhone: '',
    contactPhone2: '',
    address: '',
    contactEmail: '',
    note: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && company) {
      setFormData({
        name: company.name,
        representative: company.representative,
        contactPhone: company.contactPhone || '',
        contactPhone2: company.contactPhone2 || '',
        address: company.address || '',
        contactEmail: company.contactEmail || '',
        note: company.note || ''
      });
    }
  }, [isOpen, company]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        originalName: company.name // Send original name to identify the record
      });
      onClose();
    } catch (error) {
      console.error("Failed to update company:", error);
      alert("업체 정보 수정 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Building2 size={20} className="text-blue-600" />
            업체 정보 수정
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">업체명</label>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              disabled={!isAdminMode}
              className={`w-full px-3 py-2 border border-gray-200 rounded-lg ${!isAdminMode ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'focus:outline-none focus:ring-2 focus:ring-blue-500'}`}
            />
            {!isAdminMode && <p className="text-xs text-gray-400 mt-1">* 업체명은 관리자 모드에서만 수정할 수 있습니다.</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <User size={14} /> 대표자
            </label>
            <input 
              type="text" 
              name="representative"
              value={formData.representative}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="홍길동"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Phone size={14} /> 연락처 1
            </label>
            <input 
              type="text" 
              name="contactPhone"
              value={formData.contactPhone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="010-1234-5678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Phone size={14} /> 연락처 2
            </label>
            <input 
              type="text" 
              name="contactPhone2"
              value={formData.contactPhone2}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="010-9876-5432 (선택)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <MapPin size={14} /> 주소
            </label>
            <input 
              type="text" 
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="서울시 강남구..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Mail size={14} /> 이메일
            </label>
            <input 
              type="email" 
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              비고
            </label>
            <textarea 
              name="note"
              value={formData.note}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              placeholder="특이사항이나 메모를 입력하세요."
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button 
              type="submit"
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  저장 중...
                </>
              ) : (
                '저장하기'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCompanyModal;
