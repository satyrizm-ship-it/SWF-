import { Company } from '../types';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz_A2v15fR8Ra0sTYJAm28pgXn9gqJ6uiP7CyI0Zqt2KyqjqLVwYgFrQk6EBp_jSDrz/exec';

// 1. 데이터 불러오기 (GET) - 단순화 (App.tsx에서 매핑 수행)
export const fetchCompaniesFromSheet = async (): Promise<any> => {
  try {
    const url = `${SCRIPT_URL}?mode=data&t=${new Date().getTime()}`;
    const response = await fetch(url, { method: 'GET' });
    
    if (!response.ok) {
      console.warn('GET response not ok:', response.status);
      return { records: [], services: [], monthly: [], addressList: [] };
    }

    const json = await response.json();
    return json;

  } catch (error) {
    console.warn("Fetch Error (GET):", error);
    return { records: [], services: [], monthly: [], addressList: [] };
  }
};

// 2. 신규 설치 데이터 저장하기 (POST)
export const saveInstallationToSheet = async (formData: any): Promise<boolean> => {
  try {
    const payload = {
      action: 'installation', 
      company: formData.company,   
      model: formData.model,
      serial: formData.serial, 
      date: formData.date,   
      installer: formData.installer,
      photo: formData.photo
    };

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) return false;
    const result = await response.json();
    return result.result === 'success';

  } catch (error) {
    console.error("Fetch Error (POST Install):", error);
    return false;
  }
};

// 3. 서비스 기록 저장하기 (POST)
export const saveServiceToSheet = async (serviceData: any): Promise<boolean> => {
  try {
    const payload = {
      action: 'service', 
      id: serviceData.id, 
      date: serviceData.date,
      type: serviceData.type,
      company: serviceData.company,
      model: serviceData.model,
      serial: serviceData.serial,
      issue: serviceData.issue,
      resolution: serviceData.resolution,
      technician: serviceData.technician,
      priority: serviceData.priority,
      photo: serviceData.photo || ''
    };

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) return false;
    const result = await response.json();
    return result.result === 'success';

  } catch (error) {
    console.error("Fetch Error (POST Service):", error);
    return false;
  }
};

// 4. 서비스 기록 수정하기 (POST)
export const updateServiceInSheet = async (serviceData: any): Promise<boolean> => {
  try {
    const payload = {
      action: 'update_service',
      id: serviceData.id,
      date: serviceData.date,
      type: serviceData.type,
      issue: serviceData.issue,
      resolution: serviceData.resolution,
      technician: serviceData.technician,
      priority: serviceData.priority,
      photo: serviceData.photo || ''
    };

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) return false;
    const result = await response.json();
    return result.result === 'success';
  } catch (error) {
    console.error("Fetch Error (POST Update Service):", error);
    return false; 
  }
};

// 5. 서비스 기록 삭제하기 (POST)
export const deleteServiceFromSheet = async (serviceId: string): Promise<boolean> => {
  try {
    const payload = {
      action: 'delete_service',
      id: serviceId
    };

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) return false;
    const result = await response.json();
    return result.result === 'success';
  } catch (error) {
    console.error("Fetch Error (POST Delete Service):", error);
    return false;
  }
};

// 6. 기계 삭제하기 (POST)
export const deleteMachineFromSheet = async (machineId: string): Promise<boolean> => {
  try {
    const payload = {
      action: 'delete_machine',
      id: machineId
    };

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) return false;
    const result = await response.json();
    return result.result === 'success';
  } catch (error) {
    console.error("Fetch Error (POST Delete Machine):", error);
    return false;
  }
};

// 7. 월간 일정 수정하기 (POST)
export const updateMonthlyScheduleInSheet = async (scheduleData: any): Promise<boolean> => {
  try {
    const payload = {
      action: 'update_monthly_schedule',
      id: scheduleData.id,
      rowIndex: scheduleData.rowIndex, 
      model: scheduleData.model,
      serial: scheduleData.serial,
      company: scheduleData.company,
      region: scheduleData.region,
      installer: scheduleData.installer,
      date: scheduleData.date,
      status: scheduleData.status,
      note: scheduleData.note,
      photo: scheduleData.photo || ''
    };

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) return false;
    const result = await response.json();
    return result.result === 'success';
  } catch (error) {
    console.error("Fetch Error (POST Update Monthly Schedule):", error);
    return false;
  }
};

// 8. 업체 정보 수정하기 (POST)
export const updateCompanyInSheet = async (companyData: any): Promise<boolean> => {
  try {
    const payload = {
      action: 'update_company',
      originalName: companyData.originalName, 
      name: companyData.name,
      representative: companyData.representative,
      address: companyData.address,
      phone: companyData.contactPhone,
      email: companyData.contactEmail,
      phone2: companyData.contactPhone2, 
      note: companyData.note 
    };

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) return false;
    const result = await response.json();
    return result.result === 'success';
  } catch (error) {
    console.error("Fetch Error (POST Update Company):", error);
    return false;
  }
};