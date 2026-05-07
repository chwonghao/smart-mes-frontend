import axios, { type AxiosRequestConfig } from 'axios';

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const apiBaseUrl = rawApiBaseUrl?.startsWith('http')
  ? rawApiBaseUrl
  : import.meta.env.DEV
    ? 'http://localhost:8080/api/v1'
    : (rawApiBaseUrl || '/api/v1');

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Gửi HttpOnly Cookie tự động trong mỗi request
});

let refreshPromise: Promise<void> | null = null;

const clearClientAuthState = () => {
  localStorage.removeItem('token');
};

const isAuthEndpoint = (url?: string) => {
  if (!url) return false;
  return url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout');
};

const requestRefreshToken = async () => {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post('/auth/refresh')
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// Response interceptor: BÓC TÁCH DỮ LIỆU & XỬ LÝ LỖI
apiClient.interceptors.response.use(
  (response) => {
    // Luôn trả về payload để các service/page dùng trực tiếp data
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint(originalRequest.url)) {
      originalRequest._retry = true;

      try {
        await requestRefreshToken();
        return apiClient.request(originalRequest);
      } catch (refreshError) {
        clearClientAuthState();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401) {
      clearClientAuthState();
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