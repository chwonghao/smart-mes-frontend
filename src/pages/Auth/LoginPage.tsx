import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import apiClient from '../../services/apiClient';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const data = await apiClient.post('/auth/login', values);
      
      // Lưu user info vào localStorage (không lưu token - sử dụng HttpOnly Cookie thay thế)
      // Backend sẽ tự động gửi cookie trong các request tiếp theo
      localStorage.setItem('fullName', data.fullName);
      localStorage.setItem('role', data.role);
      
      message.success(`Chào mừng ${data.fullName} trở lại!`);
      if (data.role === 'ROLE_WORKER') {
        window.location.href = '/mobile/scan';
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      message.error('Sai tài khoản hoặc mật khẩu!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-slate-100">
      <Card className="w-full max-w-md shadow-xl rounded-2xl p-6 border-0">
        <div className="text-center mb-8">
          <Title level={2} className="m-0 text-blue-600 font-bold">SmartMES</Title>
          <Text type="secondary" className="text-sm">Hệ thống Điều hành Sản xuất Toàn diện</Text>
        </div>

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item 
            name="username" 
            rules={[{ required: true, message: 'Vui lòng nhập tài khoản!' }]}
          >
            <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="Tài khoản (VD: admin)" />
          </Form.Item>

          <Form.Item 
            name="password" 
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="Mật khẩu (VD: 123456)" />
          </Form.Item>

          <Form.Item className="mt-6">
            <Button type="primary" htmlType="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-semibold" loading={loading}>
              Đăng nhập hệ thống
            </Button>
          </Form.Item>
        </Form>
        
        <div className="text-center text-gray-400 text-xs mt-4">
          © 2026 SmartMES Platform
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;