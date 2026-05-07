# 🏭 SmartMES - Hệ Thống Điều Hành Quản Lý Sản Xuất (Frontend)

Chào mừng đến với kho lưu trữ mã nguồn Frontend của **SmartMES**. 
Dự án này là một Single Page Application (SPA) kết hợp Progressive Web App (PWA) được thiết kế chuyên biệt cho hai nhóm đối tượng: **Ban Quản Đốc (Web Dashboard)** và **Công Nhân Xưởng (Mobile/Tablet Scanner)**.

## 🛠 Công Nghệ Sử Dụng (Tech Stack)

- **Core Framework:** React 18 + TypeScript
- **Build Tool:** Vite (Siêu tốc, tích hợp HMR)
- **UI Framework:** Ant Design (antd) + Tailwind CSS
- **Real-time:** SockJS + STOMP (WebSocket)
- **Quét mã QR:** `html5-qrcode`
- **Lưu trữ Offline (PWA):** Trình duyệt `IndexedDB`
- **Xuất báo cáo:** `xlsx`

---

## 💡 Tính Năng Nổi Bật

### 1. 📱 Cổng Trạm Máy Công Nhân (Worker Scanner)
- **Giao diện chạm (Touch-friendly):** Thiết kế tối ưu cho máy tính bảng tại xưởng với các nút numpad khổng lồ hỗ trợ găng tay công nhân.
- **Quét QR Code Tốc Độ Cao:** Sử dụng camera của thiết bị để đọc tem Lệnh sản xuất (Traveler Ticket), tự động phân tích và gán máy sản xuất.
- **Phản Hồi Đa Giác Quan (Haptic/Audio):** Tự động phát âm thanh (beep) và rung thiết bị khi quét thành công hoặc khi thao tác lỗi.
- **Kiểm Soát Luồng (Throughput Check):** Hệ thống khóa không cho phép khai báo vượt quá sản lượng của công đoạn trước (Poka-yoke).

### 2. ⚡ Cơ Chế Đồng Bộ Ngoại Tuyến (Offline Sync)
- Tự động phát hiện trạng thái mạng (`navigator.onLine`).
- Khi **mất mạng**, các gói tin báo cáo sản lượng tự động được gán mã `UUID` (Idempotency Key) và đẩy vào kho chứa `SmartMES_OfflineDB` (IndexedDB) của trình duyệt.
- Khi **có mạng trở lại**, `window.addEventListener('online')` sẽ tự động đánh thức cơ chế Sync, gửi tuần tự các báo cáo lên máy chủ một cách an toàn mà không làm thất thoát hoặc nhân đôi dữ liệu.

### 3. 🌐 Giám Sát Thời Gian Thực (Real-time Dashboard)
- Kết nối WebSockets (`/ws-mes`) xuyên suốt.
- Các thay đổi tại xưởng (Công nhân quét QR thành công) ngay lập tức kích hoạt sự kiện `PROGRESS_UPDATED`, khiến thanh tiến độ Lệnh sản xuất trên máy của quản lý tự động dịch chuyển mà **không cần F5 (Reload)**.
- Tự động nhận Alert (Cảnh báo đỏ) khi phát sinh nhiều hàng lỗi (NG) hoặc máy móc hư hỏng (`MACHINE_STATUS_CHANGED`).

### 4. 📊 Quản Lý Lệnh Sản Xuất Toàn Diện
- Bảng điều khiển tích hợp Filter nâng cao, xem tiến độ từng máy, xem lịch sử quét của công nhân.
- Tự động tạo và render QR Code ngay trên trình duyệt, có hỗ trợ gửi lệnh in (Print Traveler).
- Xuất dữ liệu nhanh chóng ra file `.xlsx`.

---

## 📂 Cấu Trúc Thư Mục Quan Trọng

```text
src/
├── components/          # Các UI components dùng chung (FilterPanel, Navbar...)
├── contexts/            # Quản lý Global State (Ví dụ: AuthContext xử lý Auth Cookies)
├── pages/
│   ├── Mobile/          # Chứa WorkerScanner.tsx (Màn hình quét QR riêng cho công nhân)
│   ├── Production/      # Chứa WorkOrderList.tsx (Màn hình Quản trị Lệnh)
│   └── MasterData/      # Quản lý danh mục (Vật tư, Trạm máy)
├── services/            # Axios API Clients & Interceptors (Bắt lỗi 401 token hết hạn)
├── types/               # Khai báo TypeScript Interfaces (Entity Types)
└── App.tsx              # Cấu hình Router (React Router DOM)
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### 1. Yêu Cầu Môi Trường
- Node.js (v18.x trở lên)
- Npm hoặc Yarn

### 2. Cài Đặt Các Gói Phụ Thuộc
Mở terminal tại thư mục gốc của frontend:
```bash
npm install
```

### 3. Cấu Hình Biến Môi Trường (`.env`)
Tạo file `.env` ở thư mục gốc (cùng cấp với `package.json`) và thiết lập URL trỏ về Backend:
```env
VITE_API_URL=http://localhost:8080/api/v1
VITE_WS_URL=http://localhost:8080/ws-mes
```

### 4. Khởi Động Chế Độ Phát Triển (Development)
```bash
npm run dev
```
Ứng dụng sẽ khả dụng tại: `http://localhost:5173`

> **Lưu ý quan trọng về Bảo Mật CORS & Cookie:** 
> Frontend đã được thiết lập `withCredentials: true` (hoặc cấu hình ở Axios) để đảm bảo token JWT nằm trong `HttpOnly Cookie` được gửi đi hợp lệ khi gọi API.

---

## 📱 Kích Hoạt Tính Năng PWA (Tùy chọn cho Production)

Khi build production, frontend có thể được đóng gói kèm Service Worker để cache sẵn giao diện tĩnh (App Shell), hỗ trợ công nhân cài đặt lên màn hình chính (Add to Home Screen) của iPad.

```bash
npm run build
npm run preview
```

---

## 📝 Ghi Chú Phát Triển
- File cấu hình Ant Design locale đã được việt hóa hoàn toàn tại `node_modules/antd/es/locale/vi_VN.js`.
- Âm báo hiệu sử dụng `AudioContext` của trình duyệt, có thể sẽ yêu cầu người dùng phải tương tác với màn hình ít nhất một lần trước khi phát tiếng (Chính sách tự động phát của trình duyệt).
