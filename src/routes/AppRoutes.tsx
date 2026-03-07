import { Routes, Route } from 'react-router-dom';

// TODO: Tạm thời tạo các component ảo. Sau này chúng ta sẽ import từ thư mục pages/
const Dashboard = () => <div className="p-8 text-2xl font-bold text-blue-600">📊 Màn hình Tổng quan (Dashboard)</div>;
const WorkCenterList = () => <div className="p-8 text-2xl font-bold text-orange-600">⚙️ Quản lý Máy móc (Work Centers)</div>;
const WorkOrderList = () => <div className="p-8 text-2xl font-bold text-green-600">📝 Lệnh Sản Xuất (Work Orders)</div>;
const NotFound = () => <div className="p-8 text-2xl font-bold text-red-600">❌ 404 - Không tìm thấy trang!</div>;

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/master-data/work-centers" element={<WorkCenterList />} />
      <Route path="/production/work-orders" element={<WorkOrderList />} />
      <Route path="*" element={<NotFound />} /> {/* Bắt các link gõ sai */}
    </Routes>
  );
};

export default AppRoutes;