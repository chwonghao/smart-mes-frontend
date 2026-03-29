import apiClient from './apiClient';
import type { WorkCenter, ItemMaster } from '../types/master-data.type';

export interface Worker {
  id: number;
  workerCode: string;
  fullName: string;
  shift: string;
  role: string;
  status: string;
}

export interface RoutingSyncDTO {
  workCenterId: number;
  stepSequence: number;
  operationName: string;
  standardTime: number;
  description?: string;
}

export const getWorkCenters = async (): Promise<WorkCenter[]> => {
  // Gọi API GET lấy danh sách máy móc từ Backend
  return apiClient.get<WorkCenter[]>('/master-data/work-centers');
};

export const createWorkCenter = async (
  data: Omit<WorkCenter, 'id' | 'currentStatus' | 'lastPingAt' | 'isActive'>
) => {
  return apiClient.post('/master-data/work-centers', data);
};

// Chuẩn bị sẵn 2 hàm báo hỏng và sửa máy
export const reportMachineDown = async (id: number, reason: string) => {
  return apiClient.post(`/master-data/work-centers/${id}/down`, null, {
    params: { reason: reason }
  });
};

export const resolveMachineIssue = async (id: number) => {
  return apiClient.patch(`/master-data/work-centers/${id}/resolve`);
};

export const getItems = async (): Promise<any[]> => {
  return apiClient.get<ItemMaster[]>('/master-data/items');
};

// Tạo mới Item
export const createItem = async (data: any): Promise<any> => {
  return apiClient.post('/master-data/items', data);
};

// --- API CHO BOM (ĐỊNH MỨC VẬT TƯ) ---
export const getBomsByItem = async (parentItemId: number): Promise<any[]> => {
  return apiClient.get<any[]>(`/master-data/boms/${parentItemId}`);
};

export const createBom = async (data: any): Promise<any> => {
  return apiClient.post('/master-data/boms', data);
};

// --- API CHO ROUTING (QUY TRÌNH SẢN XUẤT) ---

// ĐÃ THÊM: Lấy toàn bộ danh sách quy trình để hiển thị lên bảng
export const getAllRoutings = async (): Promise<any[]> => {
  return apiClient.get<any[]>('/master-data/routings');
};

export const getRoutingsByItem = async (itemId: number): Promise<any[]> => {
  return apiClient.get<any[]>(`/master-data/routings/item/${itemId}`);
};

export const createRouting = async (data: any): Promise<any> => {
  return apiClient.post('/master-data/routings', data);
};

export const syncRoutingsByItem = async (itemId: number, routings: RoutingSyncDTO[]): Promise<any> => {
  return apiClient.post(`/master-data/routings/item/${itemId}/sync`, routings);
};

// ĐÃ THÊM: Xóa quy trình sản xuất
export const deleteRouting = async (id: string | number): Promise<any> => {
  return apiClient.delete(`/master-data/routings/${id}`);
};

// --- API QUẢN LÝ NHÂN SỰ / CÔNG NHÂN ---

export const getWorkers = async (): Promise<Worker[]> => {
  return apiClient.get<Worker[]>('/master-data/workers');
};

export const createWorker = async (data: any): Promise<any> => {
  return apiClient.post('/master-data/workers', data);
};