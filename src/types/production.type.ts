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