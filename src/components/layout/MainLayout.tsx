import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Badge, Popover, List, Typography, Dropdown } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  BuildOutlined,
  BellOutlined,
  SettingOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useWebSocket } from '../../hooks/useWebSocket'; 

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { notifications, unreadCount, clearCount } = useWebSocket('/topic/alerts');

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // LẤY THÔNG TIN TỪ LOCAL STORAGE (Người dùng vừa đăng nhập)
  const fullName = localStorage.getItem('fullName') || 'Khách';
  const role = localStorage.getItem('role') || 'UNKNOWN';

  // Dịch Role code ra tiếng Việt
  const getRoleName = (roleCode: string) => {
    switch (roleCode) {
      case 'ROLE_ADMIN': return 'Giám đốc hệ thống';
      case 'ROLE_QC': return 'Nhân viên QC';
      case 'ROLE_WORKER': return 'Công nhân';
      default: return 'Nhân sự';
    }
  };

  // HÀM ĐĂNG XUẤT
  const handleLogout = () => {
    localStorage.clear(); // Xóa sạch Token và Thông tin
    navigate('/login');   // Đá về trang đăng nhập
  };

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Tổng quan',
    },
    {
      key: 'master-data',
      icon: <DatabaseOutlined />,
      label: 'Dữ liệu gốc',
      children: [
        { key: '/master-data/work-centers', label: 'Máy móc & Khu vực' },
        { key: '/master-data/items', label: 'Sản phẩm & Vật tư'},
        { key: '/master-data/boms', label: 'Cấu trúc Sản phẩm'},
        { key: '/master-data/routings', label: 'Quy trình sản xuất'},
        { key: '/master-data/workers', label: 'Danh sách Nhân sự '},
      ],
    },
    {
      key: 'production',
      icon: <BuildOutlined />,
      label: 'Quản lý Sản xuất',
      children: [
        { key: '/production/work-orders', label: 'Lệnh sản xuất' },
      ]
    },
    {
      key: 'inventory',
      icon: <BuildOutlined />,
      label: 'Kho nguyên liệu',
      children: [
        { key: '/inventory', label: 'Kho' },
      ]
    },
    {
      key: 'system',
      icon: <SettingOutlined />,
      label: 'Hệ thống',
      children: [
        { key: '/system/logs', label: 'Nhật ký hệ thống' },
      ]
    },
  ];

  const notificationContent = (
    <div style={{ width: 320 }}>
      <List
        size="small"
        header={<div className="font-bold border-b pb-2">Thông báo mới nhất</div>}
        dataSource={notifications}
        style={{ maxHeight: 400, overflowY: 'auto' }}
        renderItem={(item) => (
          <List.Item className="hover:bg-gray-50 cursor-pointer transition-colors">
            <List.Item.Meta
              title={
                <Typography.Text type={item.type === 'MACHINE_DOWN' ? 'danger' : 'warning'} strong>
                  {item.type === 'MACHINE_DOWN' ? '⚠️ Sự cố máy' : '📌 Thông báo'}
                </Typography.Text>
              }
              description={item.message}
            />
          </List.Item>
        )}
        locale={{ emptyText: 'Không có thông báo nào' }}
      />
    </div>
  );

  // MENU XỔ XUỐNG CỦA AVATAR
  const userMenu = [
    {
      key: 'profile',
      label: (
        <div className="py-1 px-2">
          <p className="m-0 text-xs text-gray-400">Đăng nhập với tên</p>
          <p className="m-0 font-bold text-gray-800">{fullName}</p>
        </div>
      ),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      danger: true,
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light" className="shadow-md">
        <div className="h-16 flex items-center justify-center border-b border-gray-100">
          <h1 className={`text-blue-600 font-bold transition-all ${collapsed ? 'text-xl' : 'text-2xl'}`}>
            {collapsed ? 'MES' : 'SMART MES'}
          </h1>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['master-data', 'production']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout>
        <Header 
          style={{ 
            padding: '0 16px', 
            background: colorBgContainer, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          
          <div className="flex items-center gap-6">
            <Popover 
              content={notificationContent} 
              trigger="click" 
              placement="bottomRight"
              onOpenChange={(visible) => visible && clearCount()}
            >
              <Badge count={unreadCount} overflowCount={99} size="small">
                <Button 
                  type="text" 
                  shape="circle" 
                  icon={<BellOutlined className="text-xl text-gray-600" />} 
                />
              </Badge>
            </Popover>

            {/* BOX THÔNG TIN NGƯỜI DÙNG & MENU ĐĂNG XUẤT */}
            <Dropdown menu={{ items: userMenu }} placement="bottomRight" trigger={['click']}>
              <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-all">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  {/* Lấy chữ cái đầu của Tên làm Avatar */}
                  {fullName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col leading-tight">
                  <span className="font-medium text-gray-700">{fullName}</span>
                  <span className="text-xs text-blue-500 font-semibold">{getRoleName(role)}</span>
                </div>
              </div>
            </Dropdown>

          </div>
        </Header>

        <Content 
          style={{ 
            margin: '24px 16px', 
            padding: 24, 
            minHeight: 280, 
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'initial'
          }}
        >
          {/* ĐÂY LÀ LỖ THOÁT ĐỂ REACT ROUTER BƠM CÁC TRANG CON VÀO */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;