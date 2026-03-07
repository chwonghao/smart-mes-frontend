import apiClient from './apiClient';
import type { WorkCenter } from '../types/master-data.type';

export const getWorkCenters = async (): Promise<WorkCenter[]> => {
  // Gọi API GET lấy danh sách máy móc từ Backend
  return apiClient.get('/master-data/work-centers');
};

export const createWorkCenter = async (
  data: Omit<WorkCenter, 'id' | 'currentStatus' | 'lastPingAt' | 'isActive'>
) => {
  return apiClient.post('/master-data/work-centers', data);
};

// Chuẩn bị sẵn 2 hàm báo hỏng và sửa máy (chúng ta sẽ dùng ở chức năng sau)
export const reportMachineDown = async (id: number, reason: string) => {
  return apiClient.post(`/master-data/work-centers/${id}/down`, null, {
    params: { reason: reason }
  });
};
export const resolveMachineIssue = async (id: number) => {
  return apiClient.patch(`/master-data/work-centers/${id}/resolve`);
};