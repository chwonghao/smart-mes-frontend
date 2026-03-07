import React, { useState } from 'react';
import { Layout, Menu, Button } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  BuildOutlined,
  BellOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); // Hook này giúp menu biết đang ở trang nào để bôi màu

  // Cấu hình Cây Menu
  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Tổng quan (Dashboard)',
    },
    {
      key: 'master-data',
      icon: <DatabaseOutlined />,
      label: 'Dữ liệu gốc',
      children: [
        { key: '/master-data/work-centers', label: 'Máy móc & Khu vực' },
        // Chỗ này sau này thêm Vật tư, BOM, Routing...
      ],
    },
    {
      key: 'production',
      icon: <BuildOutlined />,
      label: 'Quản lý Sản xuất',
      children: [
        { key: '/production/work-orders', label: 'Lệnh sản xuất' },
      ],
    },
  ];

  return (
    <Layout className="min-h-screen">
      {/* CỘT BÊN TRÁI: SIDEBAR MENU */}
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed} 
        theme="light" 
        className="shadow-md z-10"
      >
        <div className="h-16 flex items-center justify-center border-b border-gray-100">
          <span className={`font-black text-blue-600 transition-all ${collapsed ? 'text-xl' : 'text-2xl'}`}>
            {collapsed ? 'MES' : 'Smart MES'}
          </span>
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]} // Tự động highlight menu theo URL
          defaultOpenKeys={['master-data', 'production']} // Mở sẵn các menu cha
          items={menuItems}
          onClick={({ key }) => navigate(key)} // Click vào menu thì chuyển trang
        />
      </Sider>

      {/* CỘT BÊN PHẢI: HEADER & CONTENT */}
      <Layout>
        <Header className="bg-white p-0 flex justify-between items-center shadow-sm z-0 px-4 h-16 leading-[4rem]">
          {/* Nút thu phóng menu */}
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="text-lg w-16 h-16 hover:bg-gray-100"
          />
          
          {/* Khu vực Profile & Thông báo */}
          <div className="flex items-center gap-4 pr-4">
            <Button 
              type="text" 
              shape="circle"
              icon={<BellOutlined className="text-xl text-gray-600" />} 
            />
            <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-all">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                <UserOutlined />
              </div>
              <span className="font-medium text-gray-700 hidden sm:block">Admin</span>
            </div>
          </div>
        </Header>

        {/* KHU VỰC HIỂN THỊ NỘI DUNG CHÍNH */}
        <Content className="m-6 p-6 bg-white rounded-xl shadow-sm min-h-[280px] overflow-auto">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;