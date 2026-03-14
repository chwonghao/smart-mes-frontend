import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Trước khi gửi request đi: Nhét Token vào giỏ xách (Header)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Sau khi nhận kết quả về: Nếu Backend báo 401 (Hết hạn / Lỗi Token) -> Đuổi ra màn Login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('fullName');
      window.location.href = '/login'; // Chuyển hướng cứng về Login
    }
    return Promise.reject(error);
  }
);

export default apiClient;