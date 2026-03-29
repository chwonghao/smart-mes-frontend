import axios from 'axios';

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
    // Tự động bóc vỏ Axios, chỉ lấy data
    return response.data; 
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token hết hạn: Clear tất cả auth state và hard redirect
      localStorage.removeItem('token');
      localStorage.removeItem('fullName');
      localStorage.removeItem('role');
      // Hard redirect để clear React state + component hierarchy
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;