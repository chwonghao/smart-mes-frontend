import apiClient from './apiClient';

export const getAllUsers = async (): Promise<any[]> => {
  return apiClient.get('/users');
};

export const createUser = async (data: any): Promise<any> => {
  return apiClient.post('/users', data);
};

export const resetPassword = async (id: number, newPassword: string): Promise<any> => {
  return apiClient.patch(`/users/${id}/reset-password`, newPassword);
};

export const deleteUser = async (id: number): Promise<any> => {
  return apiClient.delete(`/users/${id}`);
};