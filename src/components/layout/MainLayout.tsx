import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Badge, Popover, List, Typography } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  BuildOutlined,
  BellOutlined,
  UserOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWebSocket } from '../../hooks/useWebSocket'; // Đảm bảo đường dẫn này đúng với file hook bạn tạo

const { Header, Sider, Content } = Layout;

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Sử dụng Hook WebSocket để nhận thông báo real-time
  const { notifications, unreadCount, clearCount } = useWebSocket('/topic/alerts');

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

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
        { key: 'master-data/workers', label: 'Danh sách Nhân sự '},
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

  // Giao diện danh sách thông báo trong Popover
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
            {/* Popover bao quanh Badge để hiển thị danh sách khi click */}
            <Popover 
              content={notificationContent} 
              trigger="click" 
              placement="bottomRight"
              onOpenChange={(visible) => visible && clearCount()} // Xóa số unread khi mở
            >
              <Badge count={unreadCount} overflowCount={99} size="small">
                <Button 
                  type="text" 
                  shape="circle" 
                  icon={<BellOutlined className="text-xl text-gray-600" />} 
                />
              </Badge>
            </Popover>

            <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-all">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                <UserOutlined />
              </div>
              <span className="font-medium text-gray-700 hidden sm:block">Admin</span>
            </div>
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
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;