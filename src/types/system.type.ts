export type SystemActionType = 'CREATE' | 'UPDATE' | 'DELETE' | string;

export interface SystemLog {
  id: number | string;
  createdAt: string;
  createdBy: string;
  module: string;
  actionType: SystemActionType;
  description: string;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  number: number;
  size: number;
}
