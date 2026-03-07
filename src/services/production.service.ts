import apiClient from './apiClient';
import type { WorkOrder } from '../types/production.type';

export const getWorkOrders = async (): Promise<WorkOrder[]> => {
  return apiClient.get('/production/work-orders');
};

export const createWorkOrder = async (data: Partial<WorkOrder>) => {
  return apiClient.post('/production/work-orders', data);
};

// Hàm quan trọng: Báo cáo sản lượng (Cập nhật số lượng OK/NG)
export const reportProgress = async (id: number, okQty: number, ngQty: number, workCenterId: number) => {
  return apiClient.patch(`/production/work-orders/${id}/progress`, {
    completedQuantity: okQty + ngQty, // Backend của bạn cần tổng số lượng
    passedQuantity: okQty,
    failedQuantity: ngQty,
    workCenterId: workCenterId // Đừng quên ID máy móc vì Backend bắt buộc
  });
};