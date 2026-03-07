import { Routes, Route } from 'react-router-dom';
import WorkCenterList from '../pages/MasterData/WorkCenterList';
import WorkOrderList from '../pages/Production/WorkOrderList';

const Dashboard = () => <div className="p-8 text-2xl font-bold text-blue-600">📊 Màn hình Tổng quan (Dashboard)</div>;
// const WorkOrderList = () => <div className="p-8 text-2xl font-bold text-green-600">📝 Lệnh Sản Xuất (Work Orders)</div>;
const NotFound = () => <div className="p-8 text-2xl font-bold text-red-600">❌ 404 - Không tìm thấy trang!</div>;

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/master-data/work-centers" element={<WorkCenterList />} />
      <Route path="/production/work-orders" element={<WorkOrderList />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;