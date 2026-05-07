import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import type { ApiResponse } from '../../types/api.type';

const { Title, Text } = Typography;

interface LoginResponse {
  username: string;
  fullName: string;
  role: string;
  tenantId: string;
  workCenterId?: number | null;
  workCenterName?: string | null;
}

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { setSession } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', values);
      const loginResponse = response.data;

      setSession({
        username: loginResponse.username,
        fullName: loginResponse.fullName,
        role: loginResponse.role,
        tenantId: loginResponse.tenantId,
        workCenterId: loginResponse.workCenterId ?? null,
        workCenterName: loginResponse.workCenterName ?? null,
      });

      message.success(`Chào mừng ${loginResponse.fullName} trở lại!`);
      if (loginResponse.role === 'ROLE_WORKER') {
        navigate('/mobile/scan', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (error) {
      message.error('Sai tài khoản hoặc mật khẩu!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-100 p-4 sm:p-6">
      <Card className="w-full max-w-md shadow-xl rounded-2xl p-4 sm:p-6 border-0">
        <div className="text-center mb-6 sm:mb-8">
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