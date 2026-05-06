import apiClient from './apiClient';
import type { WorkOrder, ProductionSchedule } from '../types/production.type';

export const getWorkOrders = async (): Promise<WorkOrder[]> => {
  return apiClient.get<WorkOrder[]>('/production/work-orders');
};

export const createWorkOrder = async (data: Partial<WorkOrder>) => {
  return apiClient.post('/production/work-orders', data);
};

export const getProductionSchedules = async (workOrderId: number): Promise<ProductionSchedule[]> => {
  return apiClient.get<ProductionSchedule[]>(`/production/work-orders/${workOrderId}/schedules`);
};

export const reportProgress = async (
  orderId: number, 
  okQty: number, 
  ngQty: number, 
  workCenterId: number, 
  defectReason?: string,
  operatorName?: string,
) => {
  const payload = {
    completedQuantity: okQty + ngQty, // Tổng sản lượng làm ra
    passedQuantity: okQty,            // Hàng đạt
    failedQuantity: ngQty,            // Hàng NG
    workCenterId: workCenterId,
    defectReason: defectReason,
    operatorName: operatorName,
  };
  
  return apiClient.patch(`/production/work-orders/${orderId}/progress`, payload);
};