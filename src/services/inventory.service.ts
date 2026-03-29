import apiClient from './apiClient';

export const getInventory = async (): Promise<any[]> => {
  return apiClient.get<any[]>('/inventory');
};

export const adjustInventory = async (data: { itemId: number; quantity: number; reason: string }): Promise<any> => {
  return apiClient.post('/inventory/adjust', null, { 
    params: {
      itemId: data.itemId,
      amount: data.quantity,
      reason: data.reason
    }
  });
};