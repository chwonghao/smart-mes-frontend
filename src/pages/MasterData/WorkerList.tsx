import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Card, Space, message, Modal, Form, Input, Select } from 'antd';
import { PlusOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons';
import apiClient from '../../services/apiClient';

interface Worker {
  id: number;
  workerCode: string;
  fullName: string;
  shift: string;
  role: string;
  status: string;
}

const WorkerList: React.FC = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      // Gọi API lấy danh sách công nhân (Bạn cần tạo API này ở Backend tương tự như API Item)
      const res = await apiClient.get('/master-data/workers');
      const data = (res as any).data || res;
      setWorkers(data);
    } catch (error) {
      // Tạm thời dùng Mock Data nếu Backend chưa có API này để bạn xem trước giao diện
      setWorkers([
        { id: 1, workerCode: 'EMP-001', fullName: 'Nguyễn Văn A', shift: 'MORNING', role: 'WORKER', status: 'ACTIVE' },
        { id: 2, workerCode: 'EMP-002', fullName: 'Trần Thị B', shift: 'NIGHT', role: 'QC', status: 'ACTIVE' },
        { id: 3, workerCode: 'EMP-003', fullName: 'Lê Văn C', shift: 'MORNING', role: 'LEADER', status: 'ACTIVE' },
      ]);
      message.warning('Đang hiển thị dữ liệu mẫu (Mock Data) do Backend chưa có API /workers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkers(); }, []);

  const handleCreate = async (values: any) => {
    try {
      await apiClient.post('/master-data/workers', values);
      message.success("Thêm nhân sự thành công!");
      setIsModalOpen(false);
      form.resetFields();
      fetchWorkers();
    } catch (error) {
      message.error("Lỗi khi thêm mới!");
    }
  };

  const columns = [
    { 
      title: 'Mã NV', 
      dataIndex: 'workerCode', 
      key: 'workerCode', 
      className: 'font-semibold text-blue-600' 
    },
    { 
      title: 'Họ và Tên', 
      dataIndex: 'fullName', 
      key: 'fullName',
      render: (name: string) => <><UserOutlined className="mr-2 text-gray-400" />{name}</>
    },
    { 
      title: 'Vai trò', 
      dataIndex: 'role', 
      key: 'role', 
      render: (role: string) => {
        if (role === 'WORKER') return <Tag color="blue">Công nhân</Tag>;
        if (role === 'QC') return <Tag color="orange">Nhân viên QC</Tag>;
        if (role === 'LEADER') return <Tag color="purple">Trưởng ca</Tag>;
        return <Tag>{role}</Tag>;
      }
    },
    { 
      title: 'Ca làm việc', 
      dataIndex: 'shift', 
      key: 'shift',
      render: (shift: string) => shift === 'MORNING' ? <Tag color="cyan">Ca Sáng</Tag> : <Tag color="volcano">Ca Đêm</Tag>
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => status === 'ACTIVE' ? <Tag color="green">Đang làm việc</Tag> : <Tag color="red">Đã nghỉ</Tag>
    }
  ];

  return (
    <Card 
      title={<span className="text-xl font-bold">Danh sách Nhân sự / Công nhân</span>}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchWorkers} loading={loading}>Làm mới</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Thêm mới</Button>
        </Space>
      }
    >
      <Table columns={columns} dataSource={workers} rowKey="id" loading={loading} />

      <Modal title="Thêm Nhân sự mới" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="workerCode" label="Mã nhân viên" rules={[{ required: true }]}>
            <Input placeholder="VD: EMP-001" />
          </Form.Item>
          <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true }]}>
            <Input placeholder="VD: Nguyễn Văn A" />
          </Form.Item>
          <Form.Item name="role" label="Vai trò / Vị trí" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="WORKER">Công nhân sản xuất</Select.Option>
              <Select.Option value="QC">Nhân viên Kiểm tra chất lượng (QC)</Select.Option>
              <Select.Option value="LEADER">Trưởng ca</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="shift" label="Ca làm việc mặc định" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="MORNING">Ca Sáng (06:00 - 14:00)</Select.Option>
              <Select.Option value="NIGHT">Ca Đêm (14:00 - 22:00)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" initialValue="ACTIVE">
            <Select>
              <Select.Option value="ACTIVE">Đang làm việc</Select.Option>
              <Select.Option value="INACTIVE">Đã nghỉ việc</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default WorkerList;