import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, message, Spin, Button, Progress, List, Typography, Tag, Badge } from 'antd';
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
  PieChart, Pie, Cell
} from 'recharts';
import apiClient from '../../services/apiClient';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { getWorkCenters } from '../../services/master-data.service';

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
  down: number;
  idle: number;
}

interface AlertFeed {
  id: number;
  message: string;
  alertType: string;
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [machineStats, setMachineStats] = useState<MachineStats>({ total: 0, running: 0, down: 0, idle: 0 });
  const [alerts, setAlerts] = useState<AlertFeed[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Tạm lập một tỷ lệ lỗi giả định (Bạn có thể map API từ Backend sau)
  const [defectRate] = useState<number>(1.2); 

  const fetchData = async () => {
    setLoading(true);
    try {
      // Gọi song song 3 luồng dữ liệu để tiết kiệm thời gian
      const [statsRes, centersRes, alertsRes] = await Promise.all([
        apiClient.get('/dashboard/stats'),
        getWorkCenters(),
        apiClient.get('/realtime/alerts/unread').catch(() => []) // Nếu lỗi báo cáo chưa sẵn sàng thì trả về mảng rỗng
      ]);

      const statsData = (statsRes as any).data || statsRes;
      setStats(statsData as DashboardStats);
      
      // Tổng hợp dữ liệu máy móc ngay trên Frontend
      const centers = centersRes as any[];
      setMachineStats({
        total: centers.length,
        running: centers.filter(c => c.currentStatus === 'RUNNING').length,
        down: centers.filter(c => c.currentStatus === 'DOWN').length,
        idle: centers.filter(c => !c.currentStatus || c.currentStatus === 'IDLE').length,
      });

      setAlerts(alertsRes as AlertFeed[]);
    } catch (error) {
      message.error("Không thể tải dữ liệu Dashboard. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Thiết lập đường ống WebSockets Real-time
    const socket = new SockJS('http://localhost:8080/ws-mes'); 
    const stompClient = Stomp.over(socket);
    stompClient.debug = () => {}; 

    stompClient.connect({}, () => {
      // 1. Lắng nghe kênh Dashboard (Lệnh & Kho)
      stompClient.subscribe('/topic/dashboard', (wsMessage) => { 
        if (wsMessage.body === 'NEW_ORDER') message.info('🔥 Có Lệnh sản xuất mới!');
        else if (wsMessage.body === 'PROGRESS_UPDATED') message.success('Có báo cáo sản lượng mới!');
        fetchData(); 
      });

      // 2. Lắng nghe kênh Cảnh báo (Alerts)
      stompClient.subscribe('/topic/alerts', () => {
        message.warning('Cảnh báo hệ thống mới!');
        fetchData(); // Tải lại để lấy Alert mới vào danh sách
      });
    });

    return () => {
      if (stompClient) stompClient.disconnect();
    };
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Spin size="large" tip="Đang tải dữ liệu tổng quan nhà máy..." />
      </div>
    );
  }

  if (!stats) return null;

  // Xử lý dữ liệu biểu đồ
  const inventoryChartData = Object.entries(stats.inventorySummary || {}).map(([key, value]) => ({
    name: key, quantity: value
  }));

  const pendingOrders = stats.totalWorkOrders - stats.activeWorkOrders - stats.completedWorkOrders;
  const woChartData = [
    { name: 'Đang sản xuất', value: stats.activeWorkOrders, color: '#3b82f6' },
    { name: 'Đã hoàn thành', value: stats.completedWorkOrders, color: '#10b981' },
    { name: 'Chờ xử lý / Khác', value: pendingOrders > 0 ? pendingOrders : 0, color: '#cbd5e1' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER DASHBOARD */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tổng quan Quản trị Sản xuất</h2>
          <p className="text-gray-500">Số liệu được đồng bộ hóa toàn diện theo thời gian thực (Real-time).</p>
        </div>
        <Button 
          type="primary" 
          icon={<SyncOutlined spin={loading} />} 
          onClick={fetchData}
          className="bg-blue-600 hover:bg-blue-500 shadow-md"
        >
          Làm mới dữ liệu
        </Button>
      </div>

      {/* ROW 1: 4 TRỤ CỘT KPI CỐT LÕI */}
      <Row gutter={[16, 16]}>
        {/* KPI 1: Tiến độ sản xuất */}
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm border-l-4 border-l-blue-500 h-full">
            <Statistic 
              title={<span className="font-semibold text-gray-600">Tiến độ Sản xuất (Lệnh đang chạy)</span>} 
              value={stats.activeWorkOrders} 
              suffix={`/ ${stats.totalWorkOrders}`}
              prefix={<AppstoreOutlined className="text-blue-500 mr-2" />} 
              valueStyle={{ color: '#3b82f6', fontSize: '1.8rem', fontWeight: 'bold' }}
            />
            <Progress percent={stats.overallCompletionRate} size="small" status="active" />
          </Card>
        </Col>
        
        {/* KPI 2: Trạng thái Máy móc */}
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm border-l-4 border-l-green-500 h-full">
            <Statistic 
              title={<span className="font-semibold text-gray-600">Máy móc Đang Hoạt động</span>} 
              value={machineStats.running} 
              suffix={`/ ${machineStats.total} Máy`}
              prefix={<SettingOutlined className="text-green-500 mr-2" spin={machineStats.running > 0} />} 
              valueStyle={{ color: '#10b981', fontSize: '1.8rem', fontWeight: 'bold' }}
            />
            <div className="mt-2 flex gap-2 text-xs">
              <Badge status="error" text={`${machineStats.down} Đang hỏng`} />
              <Badge status="default" text={`${machineStats.idle} Rảnh rỗi`} />
            </div>
          </Card>
        </Col>

        {/* KPI 3: Tỷ lệ Lỗi (QC) */}
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm border-l-4 border-l-orange-400 h-full">
            <Statistic 
              title={<span className="font-semibold text-gray-600">Tỷ lệ Hàng lỗi (Defect Rate)</span>} 
              value={defectRate} 
              precision={1}
              suffix="%"
              prefix={<WarningOutlined className="text-orange-400 mr-2" />} 
              valueStyle={{ color: '#fb923c', fontSize: '1.8rem', fontWeight: 'bold' }}
            />
            <div className="mt-2 text-xs text-gray-400">Ngưỡng an toàn: &lt; 2.0%</div>
          </Card>
        </Col>

        {/* KPI 4: Lệnh hoàn thành */}
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm border-l-4 border-l-gray-400 h-full flex flex-col justify-center items-center">
             <Statistic 
              title={<span className="font-semibold text-gray-600">Lệnh Hoàn Thành</span>} 
              value={stats.completedWorkOrders} 
              prefix={<CheckCircleOutlined className="text-gray-500 mr-2" />} 
              valueStyle={{ color: '#6b7280', fontSize: '2rem', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* ROW 2: BIỂU ĐỒ & BẢNG TIN */}
      <Row gutter={[16, 16]} className="mt-4">
        
        {/* CỘT TRÁI: Các Biểu đồ (Chiếm 16 cột) */}
        <Col xs={24} lg={16} className="space-y-6">
          <Card 
            title={<div className="flex items-center gap-2"><BuildOutlined className="text-blue-600" /><span className="font-bold">Top 5 Vật tư Tồn kho lớn nhất</span></div>} 
            className="shadow-sm"
          >
            {inventoryChartData.length > 0 ? (
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inventoryChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                    <Bar dataKey="quantity" name="Số lượng" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-75 items-center justify-center text-gray-400">Chưa có dữ liệu tồn kho</div>
            )}
          </Card>

          <Card 
            title={<div className="flex items-center gap-2"><AppstoreOutlined className="text-purple-600" /><span className="font-bold">Tỷ trọng Trạng thái Lệnh Sản xuất</span></div>} 
            className="shadow-sm"
          >
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={woChartData.filter(d => d.value > 0)}
                    cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value"
                  >
                    {woChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                  <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* CỘT PHẢI: Bảng tin Cảnh báo (Chiếm 8 cột) */}
        <Col xs={24} lg={8}>
          <Card 
            title={<div className="flex items-center gap-2"><AlertOutlined className="text-red-500" /><span className="font-bold">Bảng tin Sự cố & Cảnh báo (Live)</span></div>} 
            className="shadow-sm h-full"
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
                    <List.Item className="border-b border-gray-100 hover:bg-gray-50 transition-colors p-3 rounded-md mt-2">
                      <List.Item.Meta
                        avatar={
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${isMachineDown ? 'bg-red-500' : isQC ? 'bg-orange-500' : 'bg-blue-500'}`}>
                            {isMachineDown ? <ToolOutlined /> : <WarningOutlined />}
                          </div>
                        }
                        title={
                          <div className="flex justify-between items-center mb-1">
                            <Tag color={isMachineDown ? 'red' : isQC ? 'orange' : 'blue'} className="m-0 border-0 font-bold">
                              {isMachineDown ? 'SỰ CỐ MÁY' : isQC ? 'LỖI CHẤT LƯỢNG' : 'THÔNG BÁO'}
                            </Tag>
                            <span className="text-xs text-gray-400">
                              {new Date(item.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        }
                        description={<Text className="text-gray-700 text-sm leading-tight line-clamp-2">{item.message}</Text>}
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