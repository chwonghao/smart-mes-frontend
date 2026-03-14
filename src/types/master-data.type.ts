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

export interface ItemMaster {
  id: number;
  itemCode: string;
  itemName: string;
  itemType: 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'FINISHED_GOOD';
  unitOfMeasure: string;
  description?: string;
}