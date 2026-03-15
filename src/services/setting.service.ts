import apiClient from './apiClient';

export const getSystemSettings = async (): Promise<any> => {
  return apiClient.get('/settings');
};

export const saveSystemSettings = async (data: Record<string, any>): Promise<any> => {
  return apiClient.post('/settings', data);
};