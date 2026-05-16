import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, message, notification, Button, Progress, List, Typography, Tag, Badge } from 'antd';
import DashboardSkeleton from '../../components/DashboardSkeleton';
import { 
  AppstoreOutlined, 
  SyncOutlined, 
  SettingOutlined, 
  CheckCircleOutlined,
  BuildOutlined,
  AlertOutlined,
  WarningOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import apiClient from '../../services/apiClient';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { getWorkCenters } from '../../services/master-data.service';
import { getWorkOrders } from '../../services/production.service';

import { useSettings } from '../../contexts/SettingContext';
const { Text } = Typography;

// Định nghĩa các Interface
interface DashboardStats {
  totalWorkOrders: number;
  activeWorkOrders: number;
  completedWorkOrders: number;
  overallCompletionRate: number;
  inventorySummary: Record<string, number>;
}

interface MachineStats {
  total: number;
  running: number;
  maintenance: number;
  down: number;
  idle: number;
  offline: number;
}

interface AlertFeed {
  id: number;
  message: string;
  alertType: string;
  createdAt: string;
}

const MACHINE_STATUS_PRIORITY: Record<string, number> = {
  RUNNING: 0,
  MAINTENANCE: 1,
  DOWN: 2,
  IDLE: 3,
  OFFLINE: 4,
  UNKNOWN: 5,
};

const MACHINE_STATUS_META: Record<string, { label: string; color: string; className: string }> = {
  RUNNING: { label: 'RUNNING', color: 'green', className: 'border-green-600 bg-green-50 dark:bg-green-900 dark:border-green-500' },
  MAINTENANCE: { label: 'MAINTENANCE', color: 'blue', className: 'border-blue-500 bg-blue-50 dark:bg-blue-900 dark:border-blue-400' },
  DOWN: { label: 'DOWN', color: 'red', className: 'border-red-600 bg-red-100 dark:bg-red-900 dark:border-red-500 animate-pulse' },
  IDLE: { label: 'IDLE', color: 'gold', className: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900 dark:border-yellow-400' },
  OFFLINE: { label: 'OFFLINE', color: 'default', className: 'border-slate-400 bg-slate-100 dark:bg-slate-700 dark:border-slate-500 opacity-80' },
  UNKNOWN: { label: 'UNKNOWN', color: 'blue', className: 'border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-600' },
};

const WORK_ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  RELEASED: 'Đã phát hành',
  IN_PROGRESS: 'Đang chạy',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const WORK_ORDER_STATUS_COLORS: Record<string, string> = {
  DRAFT: '#64748b',
  RELEASED: '#0ea5e9',
  IN_PROGRESS: '#3b82f6',
  COMPLETED: '#16a34a',
  CANCELLED: '#ef4444',
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  MACHINE_DOWN: 'Sự cố máy',
  QC_ALERT: 'Cảnh báo QC',
  INVENTORY_ALERT: 'Cảnh báo kho',
  SETTINGS_UPDATED: 'Cập nhật cấu hình',
  NEW_ORDER: 'Lệnh mới',
  PROGRESS_UPDATED: 'Tiến độ mới',
  INVENTORY_UPDATED: 'Tồn kho cập nhật',
};

const ALERT_TYPE_COLORS: Record<string, string> = {
  MACHINE_DOWN: '#ef4444',
  QC_ALERT: '#f59e0b',
  INVENTORY_ALERT: '#0ea5e9',
  SETTINGS_UPDATED: '#8b5cf6',
  NEW_ORDER: '#14b8a6',
  PROGRESS_UPDATED: '#3b82f6',
  INVENTORY_UPDATED: '#22c55e',
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [machineStats, setMachineStats] = useState<MachineStats>({ total: 0, running: 0, maintenance: 0, down: 0, idle: 0, offline: 0 });
  const [machines, setMachines] = useState<any[]>([]);
  const [productionTrend, setProductionTrend] = useState<Array<{ name: string; quantity: number }>>([]);
  const [workOrderStatusChartData, setWorkOrderStatusChartData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [machineStatusChartData, setMachineStatusChartData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [alertTypeChartData, setAlertTypeChartData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [alerts, setAlerts] = useState<AlertFeed[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { settings } = useSettings();
  const maxNgRate = parseFloat(settings['MAX_NG_RATE'] || '5');

  const defectRate = Number((stats as any)?.defectRate ?? 1.2);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const [statsRes, centersRes, workOrdersRes, alertsRes] = await Promise.all([
        apiClient.get('/dashboard/stats'),
        getWorkCenters(),
        getWorkOrders(),
        apiClient.get('/realtime/alerts/unread').catch(() => [])
      ]);

      setStats(statsRes as DashboardStats);
      
      const centers = centersRes as any[];
      setMachines(centers || []);
      setMachineStats({
        total: centers?.length || 0,
        running: centers?.filter((c: any) => c.currentStatus === 'RUNNING').length || 0,
        maintenance: centers?.filter((c: any) => c.currentStatus === 'MAINTENANCE').length || 0,
        down: centers?.filter((c: any) => c.currentStatus === 'DOWN').length || 0,
        idle: centers?.filter((c: any) => !c.currentStatus || c.currentStatus === 'IDLE').length || 0,
        offline: centers?.filter((c: any) => c.currentStatus === 'OFFLINE').length || 0,
      });

      const workOrders = (workOrdersRes as any[]) || [];
      const workOrderStatusOrder = ['DRAFT', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      setWorkOrderStatusChartData(
        workOrderStatusOrder
          .map((status) => ({
            name: WORK_ORDER_STATUS_LABELS[status] || status,
            value: workOrders.filter((order: any) => order.status === status).length,
            color: WORK_ORDER_STATUS_COLORS[status] || '#64748b',
          }))
          .filter((item) => item.value > 0)
      );

      setMachineStatusChartData([
        { name: 'Đang chạy', value: centers?.filter((c: any) => c.currentStatus === 'RUNNING').length || 0, color: '#16a34a' },
        { name: 'Bảo trì', value: centers?.filter((c: any) => c.currentStatus === 'MAINTENANCE').length || 0, color: '#0ea5e9' },
        { name: 'Hỏng', value: centers?.filter((c: any) => c.currentStatus === 'DOWN').length || 0, color: '#ef4444' },
        { name: 'Rảnh', value: centers?.filter((c: any) => !c.currentStatus || c.currentStatus === 'IDLE').length || 0, color: '#eab308' },
        { name: 'Offline', value: centers?.filter((c: any) => c.currentStatus === 'OFFLINE').length || 0, color: '#64748b' },
      ].filter((item) => item.value > 0));

      const trend = [
        { name: 'Đang sản xuất', quantity: workOrders.filter((o: any) => o.status === 'IN_PROGRESS').length },
        { name: 'Hoàn thành', quantity: workOrders.filter((o: any) => o.status === 'COMPLETED').length },
        { name: 'Khác', quantity: workOrders.filter((o: any) => o.status !== 'IN_PROGRESS' && o.status !== 'COMPLETED').length },
      ];
      setProductionTrend(trend);

      const alertList = (alertsRes as AlertFeed[]) || [];
      setAlerts(alertList);
      setAlertTypeChartData(
        Object.entries(
          alertList.reduce<Record<string, number>>((acc, alert) => {
            acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
            return acc;
          }, {})
        )
          .sort((left, right) => right[1] - left[1])
          .map(([alertType, value]) => ({
            name: ALERT_TYPE_LABELS[alertType] || alertType,
            value,
            color: ALERT_TYPE_COLORS[alertType] || '#64748b',
          }))
      );
    } catch (error) {
      message.error("Không thể tải dữ liệu Dashboard. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();

    // SỬA LỖI 1: Dùng hàm Factory để Stomp tự động reconnect
    const stompClient = Stomp.over(() => new SockJS('/ws-mes')); 
    stompClient.debug = () => {}; 

    stompClient.connect({}, () => {
      stompClient.subscribe('/topic/dashboard', (wsMessage) => { 
        let eventType = wsMessage.body;

        try {
          const parsed = JSON.parse(wsMessage.body);
          eventType = parsed?.type || eventType;
        } catch {
          // Body có thể là string event thuần như "NEW_ORDER"
        }

        if (eventType === 'NEW_ORDER') message.info('Có Lệnh sản xuất mới!');
        else if (eventType === 'PROGRESS_UPDATED') message.success('Có báo cáo sản lượng mới!');
        else if (eventType === 'INVENTORY_UPDATED') message.info('Biến động Kho: Dữ liệu tồn kho vừa được cập nhật!');
        else if (eventType === 'SETTINGS_UPDATED') {
          message.info('Cấu hình hệ thống vừa được cập nhật!');
          fetchDashboardStats();
          return;
        }

        fetchDashboardStats(); 
      });

      stompClient.subscribe('/topic/alerts', () => {
        notification.error({
          message: 'Cảnh báo hệ thống',
          description: 'Phát hiện cảnh báo mới từ dây chuyền sản xuất.',
          placement: 'bottomRight',
          duration: 0,
        });
        fetchDashboardStats(); 
      });
    });

    return () => {
      if (stompClient) stompClient.disconnect();
    };
  }, []);

  if (loading && !stats) {
    return (
      <DashboardSkeleton />
    );
  }

  // SỬA LỖI 3: Tránh màn hình trắng bằng một giao diện báo lỗi thân thiện
  if (!stats) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] text-gray-500">
        <WarningOutlined className="text-5xl text-red-400 mb-4" />
        <h2 className="text-xl font-bold">Không có dữ liệu</h2>
        <p>Hệ thống không thể kết nối đến máy chủ. Vui lòng kiểm tra lại Backend.</p>
        <Button type="primary" className="mt-4" onClick={fetchDashboardStats}>Thử lại ngay</Button>
      </div>
    );
  }

  // Khởi tạo các giá trị an toàn, tránh lỗi NaN làm crash biểu đồ
  const safeStats = {
    totalWorkOrders: stats.totalWorkOrders || 0,
    activeWorkOrders: stats.activeWorkOrders || 0,
    completedWorkOrders: stats.completedWorkOrders || 0,
    overallCompletionRate: stats.overallCompletionRate || 0,
    inventorySummary: stats.inventorySummary || {}
  };

  const inventoryChartData = Object.entries(safeStats.inventorySummary).map(([key, value]) => ({
    name: key, quantity: value
  }));

  const sortedMachines = [...machines].sort((left, right) => {
    const leftStatus = left.currentStatus || 'UNKNOWN';
    const rightStatus = right.currentStatus || 'UNKNOWN';
    const priorityDelta = (MACHINE_STATUS_PRIORITY[leftStatus] ?? 99) - (MACHINE_STATUS_PRIORITY[rightStatus] ?? 99);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return String(left.name || '').localeCompare(String(right.name || ''));
  });

  return (
    <div className="space-y-6 animate-fade-in dark:bg-slate-900 dark:text-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-50">Tổng quan Quản trị Sản xuất</h2>
          <p className="text-gray-500 dark:text-gray-400">Số liệu được đồng bộ hóa toàn diện theo thời gian thực (Real-time).</p>
        </div>
        <Button 
          type="primary" 
          icon={<SyncOutlined spin={loading} />} 
          onClick={fetchDashboardStats}
          className="bg-blue-600 hover:bg-blue-500 shadow-md"
        >
          Làm mới dữ liệu
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm border-l-4 border-l-blue-500 h-full dark:bg-slate-800 dark:border-l-blue-400">
            <Statistic 
              title={<span className="font-semibold text-gray-600">Tiến độ Sản xuất (Lệnh đang chạy)</span>} 
              value={safeStats.activeWorkOrders} 
              suffix={`/ ${safeStats.totalWorkOrders}`}
              prefix={<AppstoreOutlined className="text-blue-500 mr-2" />} 
              valueStyle={{ color: '#3b82f6', fontSize: '1.8rem', fontWeight: 'bold' }}
            />
            <Progress percent={safeStats.overallCompletionRate} size="small" status="active" />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm border-l-4 border-l-green-500 h-full">
            <Statistic 
              title={<span className="font-semibold text-gray-600">Máy móc Đang Hoạt động</span>} 
              value={machineStats.running} 
              suffix={`/ ${machineStats.total} Máy`}
              prefix={<SettingOutlined className="text-green-500 mr-2" spin={machineStats.running > 0} />} 
              valueStyle={{ color: '#10b981', fontSize: '1.8rem', fontWeight: 'bold' }}
            />
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge status="processing" text={`${machineStats.maintenance} Bảo trì`} />
              <Badge status="error" text={`${machineStats.down} Đang hỏng`} />
              <Badge status="default" text={`${machineStats.idle} Rảnh rỗi`} />
              <Badge status="default" text={`${machineStats.offline} Offline`} />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm border-l-4 border-l-orange-400 h-full dark:bg-slate-800 dark:border-l-orange-300">
            <Statistic 
              title={<span className="font-semibold text-gray-600">Tỷ lệ Hàng lỗi (Defect Rate)</span>} 
              value={defectRate} 
              precision={1}
              suffix="%"
              prefix={<WarningOutlined className="text-orange-400 mr-2" />} 
              valueStyle={{ color: '#fb923c', fontSize: '1.8rem', fontWeight: 'bold' }}
            />
            <div className="mt-2 text-xs text-gray-400">Ngưỡng an toàn: &lt; {maxNgRate.toFixed(1)}%</div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm border-l-4 border-l-gray-400 h-full flex flex-col justify-center items-center dark:bg-slate-800 dark:border-l-gray-500">
             <Statistic 
              title={<span className="font-semibold text-gray-600">Lệnh Hoàn Thành</span>} 
              value={safeStats.completedWorkOrders} 
              prefix={<CheckCircleOutlined className="text-gray-500 mr-2" />} 
              valueStyle={{ color: '#6b7280', fontSize: '2rem', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={<div className="flex items-center gap-2"><ToolOutlined className="text-slate-700 dark:text-slate-300" /><span className="font-bold dark:text-gray-100">Andon ảo: Trạng thái máy theo thời gian thực</span></div>}
        className="shadow-sm dark:bg-slate-800"
      >
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max flex-nowrap gap-3 snap-x snap-mandatory">
            {sortedMachines.map((machine) => {
              const statusKey = machine.currentStatus || 'UNKNOWN';
              const statusMeta = MACHINE_STATUS_META[statusKey] || MACHINE_STATUS_META.UNKNOWN;

              return (
                <div key={machine.id} className="w-55 shrink-0 snap-start">
                  <div className={`rounded-xl border-2 p-3 h-full ${statusMeta.className}`}>
                    <div className="font-bold text-base truncate">{machine.name}</div>
                    <div className="text-xs text-gray-500 mb-2">{machine.code}</div>
                    <div className="flex items-center justify-between gap-2">
                      <Tag color={statusMeta.color} className="m-0 border-0 font-bold">
                        {statusMeta.label}
                      </Tag>
                      <span className="text-[11px] text-gray-400 truncate">#{machine.id}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={16} className="space-y-6">
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card
                title={<div className="flex items-center gap-2"><BuildOutlined className="text-blue-600 dark:text-blue-400" /><span className="font-bold dark:text-gray-100">Top 5 Vật tư Tồn kho lớn nhất</span></div>}
                className="shadow-sm dark:bg-slate-800"
              >
                {inventoryChartData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={inventoryChartData} margin={{ top: 20, right: 24, left: 8, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                        <Bar dataKey="quantity" name="Số lượng" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={46} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-72 items-center justify-center text-gray-400">Chưa có dữ liệu tồn kho</div>
                )}
              </Card>
            </Col>

            <Col xs={24} xl={12}>
              <Card
                title={<div className="flex items-center gap-2"><AppstoreOutlined className="text-purple-600 dark:text-purple-400" /><span className="font-bold dark:text-gray-100">Phân bố trạng thái Lệnh sản xuất</span></div>}
                className="shadow-sm dark:bg-slate-800"
              >
                <div style={{ height: 288 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={workOrderStatusChartData}
                        cx="50%" cy="50%" innerRadius={68} outerRadius={102} paddingAngle={4} dataKey="value"
                      >
                        {workOrderStatusChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                      <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            <Col xs={24} xl={12}>
              <Card
                title={<div className="flex items-center gap-2"><SettingOutlined className="text-emerald-600 dark:text-emerald-400" /><span className="font-bold dark:text-gray-100">Phân bố trạng thái Máy móc</span></div>}
                className="shadow-sm dark:bg-slate-800"
              >
                <div style={{ height: 288 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={machineStatusChartData} layout="vertical" margin={{ top: 20, right: 16, left: 24, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" allowDecimals={false} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={86} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                      <Bar dataKey="value" name="Số máy" radius={[0, 8, 8, 0]} barSize={18}>
                        {machineStatusChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            <Col xs={24} xl={12}>
              <Card
                title={<div className="flex items-center gap-2"><WarningOutlined className="text-orange-500" /><span className="font-bold dark:text-gray-100">Bảng phân bố Cảnh báo theo loại</span></div>}
                className="shadow-sm dark:bg-slate-800"
              >
                <div style={{ height: 288 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={alertTypeChartData}
                        cx="50%" cy="50%" innerRadius={62} outerRadius={100} paddingAngle={4} dataKey="value"
                      >
                        {alertTypeChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                      <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            <Col xs={24}>
              <Card
                title={<div className="flex items-center gap-2"><SyncOutlined className="text-emerald-600 dark:text-emerald-400" /><span className="font-bold dark:text-gray-100">Sản lượng theo ca/nhịp (mô phỏng theo trạng thái lệnh)</span></div>}
                className="shadow-sm dark:bg-slate-800"
              >
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={productionTrend} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="quantity" stroke="#2563eb" strokeWidth={3} dot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>
        </Col>

        <Col xs={24} lg={8}>
          <Card 
            title={<div className="flex items-center gap-2"><AlertOutlined className="text-red-500" /><span className="font-bold dark:text-gray-100">Bảng tin Sự cố & Cảnh báo (Live)</span></div>} 
            className="shadow-sm h-full dark:bg-slate-800"
            bodyStyle={{ padding: '0 16px', height: '620px', overflowY: 'auto' }}
          >
            {alerts.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={alerts}
                renderItem={(item) => {
                  const isMachineDown = item.alertType === 'MACHINE_DOWN';
                  const isQC = item.alertType === 'QC_ALERT';
                  return (
                    <List.Item className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors p-3 rounded-md mt-2">
                      <List.Item.Meta
                        avatar={
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${isMachineDown ? 'bg-red-500' : isQC ? 'bg-orange-500' : 'bg-blue-500'}`}>
                            {isMachineDown ? <ToolOutlined /> : <WarningOutlined />}
                          </div>
                        }
                        title={
                          <div className="flex justify-between items-center mb-1 gap-3">
                            <Tag color={isMachineDown ? 'red' : isQC ? 'orange' : 'blue'} className="m-0 border-0 font-bold">
                              {isMachineDown ? 'SỰ CỐ MÁY' : isQC ? 'LỖI CHẤT LƯỢNG' : 'THÔNG BÁO'}
                            </Tag>
                            <span className="text-xs text-gray-400 dark:text-gray-400 shrink-0">
                              {new Date(item.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        }
                        description={<Text className="text-gray-700 dark:text-gray-100 text-sm leading-tight line-clamp-2">{item.message}</Text>}
                      />
                    </List.Item>
                  );
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 pb-10">
                <CheckCircleOutlined className="text-4xl text-green-400 mb-3" />
                <p>Hệ thống đang hoạt động ổn định.</p>
                <p className="text-xs">Không có cảnh báo nào chưa đọc.</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;