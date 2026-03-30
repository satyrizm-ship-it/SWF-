import { Company, Priority, ServiceType, ServiceStatus } from './types';

export const MOCK_DATA: Company[] = [
  {
    id: 'c1',
    name: '글로벌 스티치 (Global Stitch Corp)',
    representative: '김철수',
    address: '서울특별시 금천구 가산동 123-45',
    contactEmail: 'contact@globalstitch.com',
    contactPhone: '02-1234-5678',
    priority: Priority.HIGH,
    machines: [
      {
        id: 'm1',
        modelName: 'SWF/K-UH1204-45',
        serialNumber: 'SN-998231',
        installDate: '2025-01-12', // Recent
        warrantyStatus: 'Active',
        imageUrl: 'https://picsum.photos/400/300?random=1'
      },
      {
        id: 'm2',
        modelName: 'SWF/MA-6',
        serialNumber: 'SN-445210',
        installDate: '2022-05-14',
        warrantyStatus: 'Expired',
        imageUrl: 'https://picsum.photos/400/300?random=2'
      }
    ],
    serviceHistory: [
      {
        id: 's1',
        date: '2025-02-12',
        type: ServiceType.AS,
        machineId: 'm1',
        machineModel: 'SWF/K-UH1204-45',
        issue: '바늘 센서 오작동',
        resolution: '센서 부품 #442 교체 및 타이밍 재조정',
        technician: '박지성',
        status: ServiceStatus.RESOLVED
      },
      {
        id: 's2',
        date: '2023-12-05',
        type: ServiceType.BS,
        machineId: 'm1',
        machineModel: 'SWF/K-UH1204-45',
        issue: '정기 점검 (3개월)',
        resolution: '오일링 및 텐션 조절',
        technician: '김민재',
        status: ServiceStatus.RESOLVED
      }
    ]
  },
  {
    id: 'c2',
    name: '텍스타일 솔루션 (Textile Solutions)',
    representative: '이영희',
    address: '경기도 부천시 원미구 55-2',
    contactEmail: 'info@textile.co.kr',
    contactPhone: '031-987-6543',
    priority: Priority.MEDIUM,
    machines: [
      {
        id: 'm3',
        modelName: 'SWF/ES-Series Single',
        serialNumber: 'SN-112098',
        installDate: '2025-02-28', // Recent
        warrantyStatus: 'Active',
        imageUrl: 'https://picsum.photos/400/300?random=3'
      }
    ],
    serviceHistory: [
      {
        id: 's3',
        date: '2025-03-01',
        type: ServiceType.BS,
        machineId: 'm3',
        machineModel: 'SWF/ES-Series Single',
        issue: '초기 설치 점검',
        technician: '손흥민',
        status: ServiceStatus.RESOLVED
      }
    ]
  },
  {
    id: 'c3',
    name: '프리미엄 어패럴 (Premium Apparel)',
    representative: '최동욱',
    address: '대구광역시 서구 비산동 88-1',
    contactEmail: 'ceo@premiumapparel.net',
    contactPhone: '053-555-7777',
    priority: Priority.LOW,
    machines: [
      {
        id: 'm4',
        modelName: 'SWF/TA-W902-180',
        serialNumber: 'SN-778899',
        installDate: '2024-03-22',
        warrantyStatus: 'Active',
        imageUrl: 'https://picsum.photos/400/300?random=4'
      }
    ],
    serviceHistory: []
  },
  {
    id: 'c4',
    name: '자수 명가 (Embroidery Masters)',
    representative: '정수정',
    address: '부산광역시 부산진구 부전동 33',
    contactEmail: 'master@embroidery.com',
    contactPhone: '051-808-9090',
    priority: Priority.HIGH,
    machines: [
      {
        id: 'm5',
        modelName: 'SWF/Dual-Function 6-Head',
        serialNumber: 'SN-332211',
        installDate: '2023-12-15',
        warrantyStatus: 'Active',
        imageUrl: 'https://picsum.photos/400/300?random=5'
      }
    ],
    serviceHistory: [
       {
        id: 's4',
        date: '2024-05-10',
        type: ServiceType.AS,
        machineId: 'm5',
        machineModel: 'SWF/Dual-Function 6-Head',
        issue: '헤드 3번 소음 발생',
        technician: '박지성',
        status: ServiceStatus.SCHEDULED
      }
    ]
  }
];