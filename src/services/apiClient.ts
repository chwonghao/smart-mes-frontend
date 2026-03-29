import axios, { type AxiosRequestConfig } from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Gửi HttpOnly Cookie tự động trong mỗi request
});

// Response interceptor: BÓC TÁCH DỮ LIỆU & XỬ LÝ LỖI
apiClient.interceptors.response.use(
  (response) => {
    // Luôn trả về payload để các service/page dùng trực tiếp data
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear toàn bộ auth state tạm và hard redirect về login
      localStorage.removeItem('token');
      localStorage.removeItem('fullName');
      localStorage.removeItem('role');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const api = {
  get<T = unknown>(url: string, config?: AxiosRequestConfig) {
    return apiClient.get<T, T>(url, config);
  },
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return apiClient.post<T, T>(url, data, config);
  },
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return apiClient.put<T, T>(url, data, config);
  },
  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return apiClient.patch<T, T>(url, data, config);
  },
  delete<T = unknown>(url: string, config?: AxiosRequestConfig) {
    return apiClient.delete<T, T>(url, config);
  },
};

export default api;