import React, { useState, useRef } from 'react';
import { X, Upload, Lock, Loader2, Trash2, Plus } from 'lucide-react';

interface NewInstallationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  isAdminMode?: boolean;
}

const NewInstallationModal: React.FC<NewInstallationModalProps> = ({ isOpen, onClose, onSave, isAdminMode = false }) => {
  const [formData, setFormData] = useState({
    clientName: '',
    modelName: '',
    serialNumber: '',
    installDate: '',
    installer: '',
    password: '',
  });
  // Change to array for 3 slots: [url|null, url|null, url|null]
  const [selectedImages, setSelectedImages] = useState<(string | null)[]>([null, null, null]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (index: number) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resized = await resizeImage(file);
        setSelectedImages(prev => {
          const newImages = [...prev];
          newImages[index] = resized;
          return newImages;
        });
      } catch (err) {
        console.error("Image resize error", err);
        alert("이미지 처리 중 오류가 발생했습니다.");
      }
    }
    // Reset input value to allow re-uploading the same file if needed
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => {
        const newImages = [...prev];
        newImages[index] = null;
        return newImages;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    
    if (isSubmitting) return; 
    
    // 비밀번호 확인 (관리자 모드가 아닐 때만)
    if (!isAdminMode && formData.password !== '202603') {
      alert('비밀번호가 올바르지 않습니다.');
      return;
    }

    // 필수 입력 확인
    if (!formData.clientName || !formData.modelName || !formData.serialNumber || !formData.installDate) {
      alert('필수 정보(업체명, 모델명, 시리얼, 설치일)를 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    
    try {
        // Combine images
        const combinedImage = selectedImages.filter(Boolean).join('|||');

        await onSave({
          ...formData,
          imageUrl: combinedImage
        });

        // 성공 후 초기화
        setFormData({
          clientName: '',
          modelName: '',
          serialNumber: '',
          installDate: '',
          installer: '',
          password: '',
        });
        setSelectedImages([null, null, null]);
    } catch (error) {
        console.error("Save failed in modal:", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-fade-in-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">신규 설치 등록</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">업체명 (Client Name)</label>
              <input 
                type="text" 
                name="clientName"
                value={formData.clientName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 대한자수"
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">기계 모델 (Model)</label>
                <input 
                  type="text" 
                  name="modelName"
                  value={formData.modelName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="SWF/..."
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시리얼 번호 (S/N)</label>
                <input 
                  type="text" 
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="SN-123456"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설치 일자</label>
                <input 
                  type="date" 
                  name="installDate"
                  value={formData.installDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설치자 (Installer)</label>
                <input 
                  type="text" 
                  name="installer"
                  value={formData.installer}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="홍길동"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* 3 Card Image Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">사진 첨부 (최대 3장)</label>
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="relative aspect-square">
                    {selectedImages[index] ? (
                      <div className="w-full h-full relative rounded-lg overflow-hidden border border-gray-200 group bg-gray-50">
                        <img 
                          src={selectedImages[index]!} 
                          alt={`Upload ${index + 1}`} 
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

            {!isAdminMode && (
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">관리자 비밀번호</label>
                 <div className="relative">
                   <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                   <input 
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="비밀번호 입력 (저장 승인)"
                      required
                      disabled={isSubmitting}
                   />
                 </div>
                 <p className="text-xs text-gray-500 mt-1">* 저장을 위해 관리자 비밀번호를 입력해주세요. (202603)</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
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

export default NewInstallationModal;