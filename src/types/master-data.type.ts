export interface WorkCenter {
  id: number;
  code: string;
  name: string;
  centerType: 'MACHINE' | 'ASSEMBLY_LINE' | 'WORKSTATION' | 'PACKAGING';
  hourlyCapacity: number;
  isActive: boolean;
  currentStatus: 'IDLE' | 'RUNNING' | 'DOWN' | 'MAINTENANCE' | 'OFFLINE';
  lastPingAt: string; // ISO 8601 string
}