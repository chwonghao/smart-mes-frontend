import { Routes, Route, Navigate } from 'react-router-dom';
import type { JSX } from 'react';

// CÁC COMPONENT CỦA BẠN
import MainLayout from '../components/layout/MainLayout';
import Dashboard from '../pages/Dashboard/Dashboard';
import WorkCenterList from '../pages/MasterData/WorkCenterList';
import WorkOrderList from '../pages/Production/WorkOrderList';
import ItemList from '../pages/MasterData/ItemList';
import BOMManagement from '../pages/MasterData/BOMManagement';
import InventoryList from '../pages/Inventory/InventoryList';
import RoutingManagement from '../pages/MasterData/RoutingManagement';
import SystemLogList from '../pages/System/SystemLogList';
import WorkerList from '../pages/MasterData/WorkerList';
import LoginPage from '../pages/Auth/LoginPage';
import UserManagement from '../pages/System/UserManagement';
import ProtectedRoute from '../components/ProtectedRoute';
import SettingsPage from '../pages/System/SettingsPage';
import WorkerScanner from '../pages/Mobile/WorkerScanner';

const NotFound = () => <div className="p-8 text-2xl font-bold text-red-600">❌ 404 - Không tìm thấy trang!</div>;

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* ROUTE CÔNG KHAI */}
      <Route path="/login" element={<LoginPage />} />

      {/* 👉 2. ROUTE MOBILE ĐỘC LẬP (Nằm ngoài MainLayout để giao diện full màn hình điện thoại) */}
      <Route 
        path="/mobile/scan" 
        element={
          <PrivateRoute>
            <WorkerScanner />
          </PrivateRoute>
        } 
      />

      {/* ROUTE BẢO MẬT (Phải có Token mới vào được MainLayout) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Khi vào trang chủ "/" sẽ mặc định load Dashboard */}
        <Route index element={<Dashboard />} />

        {/* CÁC TRANG CON BÊN TRONG */}
        <Route path="master-data/work-centers" element={<WorkCenterList />} />
        <Route path="master-data/items" element={<ItemList />} />
        <Route path="master-data/boms" element={<BOMManagement />} />
        <Route path="master-data/routings" element={<RoutingManagement />} />
        <Route path="master-data/workers" element={<WorkerList />} />

        <Route path="production/work-orders" element={<WorkOrderList />} />
        <Route path="inventory" element={<InventoryList />} />
        <Route path="system/logs" element={<SystemLogList />} />
        
        {/* Sửa lại path của users bỏ dấu / ở đầu để đồng bộ chuẩn Nested Route */}
        <Route
          path="system/users"
          element={
            <ProtectedRoute requiredRole="ROLE_ADMIN">
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route path="system/settings" element={
          <ProtectedRoute requiredRole="ROLE_ADMIN">
            <SettingsPage />
          </ProtectedRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;