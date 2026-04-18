import { Routes, Route, Navigate } from 'react-router-dom';

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
import { useAuth } from '../contexts/AuthContext';

const NotFound = () => <div className="p-8 text-2xl font-bold text-red-600">❌ 404 - Không tìm thấy trang!</div>;

const LoginRoute = () => {
  const { user, isLoading } = useAuth();
  const role = user?.role;

  if (isLoading) {
    return null;
  }

  if (!role) {
    return <LoginPage />;
  }

  if (role === 'ROLE_WORKER') {
    return <Navigate replace to="/mobile/scan" />;
  }

  return <Navigate replace to="/" />;
};

const RootFallback = () => {
  const { user, isLoading } = useAuth();
  const role = user?.role;

  if (isLoading) {
    return null;
  }

  if (!role) {
    return <Navigate replace to="/login" />;
  }

  if (role === 'ROLE_WORKER') {
    return <Navigate replace to="/mobile/scan" />;
  }

  return <Navigate replace to="/" />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      <Route 
        path="/mobile/scan" 
        element={
          <ProtectedRoute allowWorkerOnly>
            <WorkerScanner />
          </ProtectedRoute>
        } 
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />

        <Route path="master-data/work-centers" element={<WorkCenterList />} />
        <Route path="master-data/items" element={<ItemList />} />
        <Route path="master-data/boms" element={<BOMManagement />} />
        <Route path="master-data/routings" element={<RoutingManagement />} />
        <Route path="master-data/workers" element={<WorkerList />} />

        <Route path="production/work-orders" element={<WorkOrderList />} />
        <Route path="inventory" element={<InventoryList />} />
        <Route path="system/logs" element={<SystemLogList />} />

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

      <Route path="*" element={<RootFallback />} />
    </Routes>
  );
};

export default AppRoutes;