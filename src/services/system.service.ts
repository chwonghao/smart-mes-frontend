import apiClient from './apiClient';
import type { PageResponse, SystemLog } from '../types/system.type';

export interface GetSystemLogsParams {
  page?: number;
  size?: number;
  sort?: string;
}

const normalizePage = (data: unknown): PageResponse<SystemLog> => {
  if (Array.isArray(data)) {
    return {
      content: data as SystemLog[],
      totalElements: data.length,
      number: 0,
      size: data.length,
    };
  }

  const pageData = (data || {}) as Partial<PageResponse<SystemLog>>;

  return {
    content: Array.isArray(pageData.content) ? pageData.content : [],
    totalElements: Number(pageData.totalElements ?? 0),
    number: Number(pageData.number ?? 0),
    size: Number(pageData.size ?? 10),
  };
};

export const getSystemLogs = async (params: GetSystemLogsParams = {}): Promise<PageResponse<SystemLog>> => {
  const data = await apiClient.get<PageResponse<SystemLog> | SystemLog[]>('/system/logs', {
    params: {
      page: params.page ?? 0,
      size: params.size ?? 10,
      sort: params.sort ?? 'createdAt,desc',
    },
  });

  return normalizePage(data);
};
