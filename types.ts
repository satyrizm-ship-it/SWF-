
export enum Priority {
  HIGH = '경고',
  MEDIUM = '주의',
  LOW = '관심',
  NORMAL = '안정',
}

export enum IssueGrade {
  INQUIRY = '문의',
  MINOR = '경미',
  MAJOR = '중대',
  CRITICAL = '치명'
}

export enum ServiceType {
  AS = 'A/S', // After Service (Repair)
  BS = 'B/S', // Before Service (Maintenance)
}

export enum ServiceStatus {
  RESOLVED = 'Resolved',
  PENDING = 'Pending',
  SCHEDULED = 'Scheduled'
}

export interface Machine {
  id: string;
  modelName: string; // e.g., SWF/K-UH1204-45
  serialNumber: string;
  installDate: string; // ISO String YYYY-MM-DD
  warrantyStatus: 'Active' | 'Expired';
  imageUrl: string;
}

export interface ServiceRecord {
  id: string;
  date: string;
  type: ServiceType;
  machineId: string;
  machineModel: string;
  issue: string;
  resolution?: string;
  technician: string;
  status: ServiceStatus;
  priority?: IssueGrade | string; // Changed to support IssueGrade (Grade)
  attachmentUrl?: string; // Photo of the issue
}

export interface Company {
  id: string;
  name: string;
  representative: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  contactPhone2?: string; // Added second phone number
  note?: string; // Added note field (비고)
  priority: Priority;
  machines: Machine[];
  serviceHistory: ServiceRecord[];
}

export interface MonthlySchedule {
  id: string;
  rowIndex?: number; // Added to identify row in Google Sheet
  model: string;
  serial: string;
  company: string;
  region: string;
  installer: string;
  date: string;
  status: string; // Changed to string to support Korean (e.g., '완료', '예정')
  note?: string; // Added note field (비고)
  photo?: string; // Added photo field
}

export function calculatePriority(serviceHistory: ServiceRecord[]): Priority {
  const machineHistories: Record<string, ServiceRecord[]> = {};

  serviceHistory.forEach(record => {
    const key = record.machineId || 'unknown';
    if (!machineHistories[key]) {
      machineHistories[key] = [];
    }
    machineHistories[key].push(record);
  });

  let highestPriority = Priority.NORMAL;

  const getPriorityWeight = (p: Priority) => {
    if (p === Priority.HIGH) return 4;
    if (p === Priority.MEDIUM) return 3;
    if (p === Priority.LOW) return 2;
    return 1;
  };

  Object.values(machineHistories).forEach(history => {
    let totalCritical = 0;
    let totalMajor = 0;
    let totalMinor = 0;

    history.forEach(record => {
      if (record.priority === IssueGrade.CRITICAL) totalCritical++;
      if (record.priority === IssueGrade.MAJOR) totalMajor++;
      if (record.priority === IssueGrade.MINOR) totalMinor++;
    });

    let currentPriority = Priority.NORMAL;
    if (totalMajor >= 2 || totalCritical >= 1) {
      currentPriority = Priority.HIGH;
    } else if (totalMinor >= 3 || totalMajor >= 1) {
      currentPriority = Priority.MEDIUM;
    } else if (totalMinor >= 2) {
      currentPriority = Priority.LOW;
    }

    if (getPriorityWeight(currentPriority) > getPriorityWeight(highestPriority)) {
      highestPriority = currentPriority;
    }
  });

  return highestPriority;
}
