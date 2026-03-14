import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, message, Spin, Button, Progress } from 'antd';
import { 
  AppstoreOutlined, 
  SyncOutlined, 
  SettingOutlined, 
  CheckCircleOutlined,
  BuildOutlined
} from '@ant-design/icons';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import apiClient from '../../services/apiClient';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

// Định nghĩa Interface khớp với DTO từ Backend
interface DashboardStats {
  totalWorkOrders: number;
  activeWorkOrders: number;
  completedWorkOrders: number;
  overallCompletionRate: number;
  inventorySummary: Record<string, number>;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Hàm gọi API lấy dữ liệu thống kê
  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/dashboard/stats');
      setStats(response as any); // Tùy thuộc cấu hình interceptor của bạn
    } catch (error) {
      message.error("Không thể tải dữ liệu Dashboard. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Gọi API lần đầu khi vừa vào trang
    fetchStats();

    // Thiết lập đường ống WebSockets Real-time
    const socket = new SockJS('http://localhost:8080/ws-mes'); // Nhớ chỉnh lại cổng nếu Backend của bạn chạy cổng khác
    const stompClient = Stomp.over(socket);
    
    // Tắt log của STOMP để console đỡ bị rác
    stompClient.debug = () => {}; 

    stompClient.connect({}, () => {
      // Đăng ký lắng nghe kênh dashboard
      stompClient.subscribe('/topic/dashboard', (wsMessage) => { // Đổi tên biến tránh trùng với message của antd
        console.log("🚀 [Dashboard] Nhận tín hiệu làm mới từ xưởng:", wsMessage.body);
        
        // 1. HIỂN THỊ THÔNG BÁO POPUP CHO NGƯỜI DÙNG
        if (wsMessage.body === 'NEW_ORDER') {
          message.info('🔥 Có Lệnh sản xuất mới vừa được tạo!');
        } else if (wsMessage.body === 'PROGRESS_UPDATED') {
          message.success('✅ Có báo cáo sản lượng mới từ xưởng!');
        } else {
          message.info('🔄 Dữ liệu hệ thống vừa thay đổi, đang làm mới...');
        }

        // 2. Tự động gọi lại API để vẽ lại biểu đồ
        fetchStats(); 
      });
    });

    // Cleanup: Ngắt kết nối khi người dùng rời khỏi trang Dashboard
    return () => {
      if (stompClient) stompClient.disconnect();
    };
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Spin size="large" tip="Đang tải dữ liệu tổng quan..." />
      </div>
    );
  }

  if (!stats) return null;

  // 1. CHUYỂN ĐỔI DỮ LIỆU CHO BIỂU ĐỒ CỘT (TỒN KHO)
  // Backend trả về Object: {"Gỗ": 100, "Sắt": 50} -> Recharts cần Array: [{name: "Gỗ", quantity: 100}]
  const inventoryChartData = Object.entries(stats.inventorySummary || {}).map(([key, value]) => ({
    name: key,
    quantity: value
  }));

  // 2. CHUYỂN ĐỔI DỮ LIỆU CHO BIỂU ĐỒ TRÒN (TRẠNG THÁI LỆNH)
  const pendingOrders = stats.totalWorkOrders - stats.activeWorkOrders - stats.completedWorkOrders;
  const woChartData = [
    { name: 'Đang sản xuất', value: stats.activeWorkOrders, color: '#3b82f6' }, // Blue
    { name: 'Đã hoàn thành', value: stats.completedWorkOrders, color: '#10b981' }, // Green
    { name: 'Chờ xử lý / Khác', value: pendingOrders > 0 ? pendingOrders : 0, color: '#cbd5e1' } // Slate
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER DASHBOARD */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tổng quan Quản trị Sản xuất</h2>
          <p className="text-gray-500">Số liệu được cập nhật theo thời gian thực từ xưởng.</p>
        </div>
        <Button 
          type="primary" 
          icon={<SyncOutlined spin={loading} />} 
          onClick={fetchStats}
          className="bg-blue-600 hover:bg-blue-500 shadow-md"
        >
          Làm mới
        </Button>
      </div>

      {/* ROW 1: KPI CARDS */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-gray-400">
            <Statistic 
              title={<span className="font-semibold text-gray-600">Tổng Lệnh Sản Xuất</span>} 
              value={stats.totalWorkOrders} 
              prefix={<AppstoreOutlined className="text-gray-400 mr-2" />} 
              valueStyle={{ fontSize: '1.8rem', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
            <Statistic 
              title={<span className="font-semibold text-gray-600">Lệnh Đang Chạy</span>} 
              value={stats.activeWorkOrders} 
              prefix={<SettingOutlined spin className="text-blue-500 mr-2" />} 
              valueStyle={{ color: '#3b82f6', fontSize: '1.8rem', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-green-500">
            <Statistic 
              title={<span className="font-semibold text-gray-600">Lệnh Hoàn Thành</span>} 
              value={stats.completedWorkOrders} 
              prefix={<CheckCircleOutlined className="text-green-500 mr-2" />} 
              valueStyle={{ color: '#10b981', fontSize: '1.8rem', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
            <div>
              <div className="text-gray-500 font-semibold mb-2">Tiến độ Tổng thể</div>
              <Progress 
                type="circle" 
                percent={stats.overallCompletionRate} 
                size={70} 
                strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* ROW 2: CHARTS */}
      <Row gutter={[16, 16]} className="mt-6">
        {/* Biểu đồ Cột: Top Tồn kho */}
        <Col xs={24} lg={16}>
          <Card 
            title={
              <div className="flex items-center gap-2">
                <BuildOutlined className="text-blue-600" />
                <span className="font-bold">Top 5 Vật tư Tồn kho lớn nhất</span>
              </div>
            } 
            className="shadow-sm h-full"
          >
            {inventoryChartData.length > 0 ? (
              <div style={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inventoryChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: '#f1f5f9' }} 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="quantity" name="Số lượng" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[350px] items-center justify-center text-gray-400">
                Chưa có dữ liệu tồn kho
              </div>
            )}
          </Card>
        </Col>

        {/* Biểu đồ Tròn: Phân bổ Trạng thái Lệnh */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <div className="flex items-center gap-2">
                <AppstoreOutlined className="text-purple-600" />
                <span className="font-bold">Tỷ trọng Trạng thái Lệnh</span>
              </div>
            } 
            className="shadow-sm h-full"
          >
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={woChartData.filter(d => d.value > 0)} // Chỉ hiển thị phần có data
                    cx="50%"
                    cy="50%"
                    innerRadius={80} // Donut style
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {woChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;