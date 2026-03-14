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

// Sau khi nhận kết quả về: BÓC TÁCH DỮ LIỆU & XỬ LÝ LỖI
apiClient.interceptors.response.use(
  (response) => {
    // 👉 ĐÃ SỬA CHỖ NÀY: Tự động bóc vỏ Axios, chỉ lấy data
    return response.data; 
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('fullName');
      localStorage.removeItem('role');
      window.location.href = '/login'; // Chuyển hướng cứng về Login
    }
    return Promise.reject(error);
  }
);

export default apiClient;