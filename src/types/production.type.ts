export interface WorkOrder {
  id: number;
  orderNumber: string; // Mã lệnh SX (ví dụ: WO-2026-001)
  productName: string;
  targetQuantity: number;
  completedQuantity: number;
  failedQuantity: number;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  workCenterId: number;
  workCenterName?: string; // Tên máy để hiển thị lên bảng
  plannedStartDate: string;
}

export interface ProductionSchedule {
  id: number;
  workOrderId: number;
  workCenterId: number;
  workCenterName: string;
  sequenceNumber: number; // Thứ tự công đoạn
  quantityTarget: number; // Số lượng cần làm trên máy này
  quantityCompleted: number; // Số lượng đã làm
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  estimatedStartTime?: string;
  estimatedEndTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
}