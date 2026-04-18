import apiClient from './apiClient';
import type { ApiResponse } from '../types/api.type';

export const getAllUsers = async (): Promise<any[]> => {
  const response = await apiClient.get<ApiResponse<any[]>>('/users');
  return response.data;
};

export const createUser = async (data: any): Promise<any> => {
  const response = await apiClient.post<ApiResponse<any>>('/users', data);
  return response.data;
};

export const resetPassword = async (id: number, newPassword: string): Promise<any> => {
  return apiClient.patch<ApiResponse<null>>(`/users/${id}/reset-password`, { newPassword });
};

export const deleteUser = async (id: number): Promise<any> => {
  return apiClient.delete<ApiResponse<null>>(`/users/${id}`);
};