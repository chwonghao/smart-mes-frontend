import apiClient from './apiClient';

export const getInventory = async (): Promise<any[]> => {
  return apiClient.get('/inventory');
};

export const adjustInventory = async (data: { itemId: number; quantity: number; reason: string }): Promise<any> => {
  return apiClient.post('/inventory/adjust', data);
};