import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Card, Space, message, Modal, Form, Input, Select, Popconfirm, Grid } from 'antd';
import { UserAddOutlined, ReloadOutlined, KeyOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAllUsers, createUser, resetPassword, deleteUser } from '../../services/user.service';

const { useBreakpoint } = Grid;

const UserManagement: React.FC = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      message.error("Lỗi tải danh sách tài khoản!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (values: any) => {
    try {
      await createUser(values);
      message.success("Tạo tài khoản thành công!");
      setIsModalOpen(false);
      form.resetFields();
      fetchUsers();
    } catch (error: any) {
      message.error(error.response?.data?.message || "Lỗi khi tạo tài khoản!");
    }
  };

  const handleResetPass = (id: number) => {
    Modal.confirm({
      title: 'Đặt lại mật khẩu',
      content: 'Mật khẩu sẽ được đặt lại thành "123456". Bạn có chắc chắn không?',
      onOk: async () => {
        try {
          await resetPassword(id, "123456");
          message.success("Đã reset mật khẩu về 123456");
        } catch (error) {
          message.error("Lỗi khi đặt lại mật khẩu!");
        }
      }
    });
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteUser(id);
      message.success("Đã xóa tài khoản");
      fetchUsers();
    } catch (error) {
      message.error("Lỗi khi xóa tài khoản!");
    }
  };

  const columns = [
    { title: 'Tên đăng nhập', dataIndex: 'username', key: 'username', className: 'font-bold' },
    { title: 'Họ và Tên', dataIndex: 'fullName', key: 'fullName' },
    { 
      title: 'Vai trò', 
      dataIndex: 'role', 
      key: 'role',
      render: (role: string) => {
        let color = 'blue';
        let text = role;
        if (role === 'ROLE_ADMIN') { color = 'volcano'; text = 'Quản trị viên'; }
        if (role === 'ROLE_QC') { color = 'green'; text = 'Nhân viên QC'; }
        if (role === 'ROLE_WORKER') { color = 'cyan'; text = 'Công nhân'; }
        return <Tag color={color}>{text}</Tag>;
      }
    },
    { title: 'Mã Tenant', dataIndex: 'tenantId', key: 'tenantId' },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button icon={<KeyOutlined />} onClick={() => handleResetPass(record.id)}>Reset Pass</Button>
          <Popconfirm title="Xóa tài khoản này?" onConfirm={() => handleDelete(record.id)}>
            <Button danger icon={<DeleteOutlined />} disabled={record.username === 'admin'}>Xóa</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Card 
      title={<span className="text-xl font-bold">Quản lý Tài khoản Hệ thống</span>}
      extra={
        <Space size={isMobile ? 8 : 12} wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchUsers}>Làm mới</Button>
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setIsModalOpen(true)}>Thêm tài khoản</Button>
        </Space>
      }
    >
      <Table columns={columns} dataSource={users} rowKey="id" loading={loading} scroll={{ x: 900 }} />

      <Modal
        title="Tạo tài khoản nhân viên"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnHidden
        width={isMobile ? '92vw' : 520}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true }]}>
            <Input placeholder="VD: nguyenvana" />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true }]} initialValue="123456">
            <Input.Password />
          </Form.Item>
          <Form.Item name="fullName" label="Họ và tên nhân viên" rules={[{ required: true }]}>
            <Input placeholder="VD: Nguyễn Văn A" />
          </Form.Item>
          <Form.Item name="role" label="Vai trò hệ thống" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="ROLE_ADMIN">Quản trị viên (Admin)</Select.Option>
              <Select.Option value="ROLE_QC">Nhân viên QC</Select.Option>
              <Select.Option value="ROLE_WORKER">Công nhân sản xuất</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="tenantId" label="Mã Tenant" initialValue="TENANT_01">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default UserManagement;