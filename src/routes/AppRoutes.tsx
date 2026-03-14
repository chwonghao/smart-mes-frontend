import { Routes, Route } from 'react-router-dom';
import WorkCenterList from '../pages/MasterData/WorkCenterList';
import WorkOrderList from '../pages/Production/WorkOrderList';
import Dashboard from '../pages/Dashboard/Dashboard';
import ItemList from '../pages/MasterData/ItemList';
import BOMManagement from '../pages/MasterData/BOMManagement';
import InventoryList from '../pages/Inventory/InventoryList';
import RoutingManagement from '../pages/MasterData/RoutingManagement';
import SystemLogList from '../pages/System/SystemLogList';
import WorkerList from '../pages/MasterData/WorkerList';

const NotFound = () => <div className="p-8 text-2xl font-bold text-red-600">❌ 404 - Không tìm thấy trang!</div>;

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/master-data/work-centers" element={<WorkCenterList />} />
      <Route path="/master-data/items" element={<ItemList />} />
      <Route path="/master-data/boms" element={<BOMManagement />} />
      <Route path="/master-data/routings" element={<RoutingManagement />} />
      <Route path="/master-data/workers" element={<WorkerList />} />
      
      <Route path="/production/work-orders" element={<WorkOrderList />} />

      <Route path="/inventory" element={<InventoryList />} /> 

      <Route path="/system/logs" element={<SystemLogList />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;