import axios from 'axios';

// Tạo một "bản sao" của axios với các cấu hình mặc định
const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1', // Trỏ thẳng vào Backend Spring Boot của bạn
  timeout: 10000, // Quá 10 giây không phản hồi sẽ tự động báo lỗi mạng
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: "Người gác cổng" đón lõng mọi dữ liệu trả về từ Server
apiClient.interceptors.response.use(
  (response) => {
    // Chỉ lấy phần data lõi, giúp các file UI gọi API không cần gõ .data nhiều lần
    return response.data;
  },
  (error) => {
    // Nơi xử lý lỗi tập trung (Ví dụ: Backend sập, lỗi 400, 500...)
    const errorMessage = error.response?.data?.message || error.message || "Lỗi kết nối đến máy chủ!";
    console.error("API Error: ", errorMessage);
    
    // Ở các bài sau, chúng ta sẽ gắn thông báo lỗi UI (Toast/Message) vào đây
    return Promise.reject(error);
  }
);

export default apiClient;