import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Card, Space, message, Modal, Form, Input, Select } from 'antd';
import { PlusOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons';
// IMPORT THÊM 2 HÀM GỌI API THẬT
import { getWorkers, createWorker } from '../../services/master-data.service';

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

  // HÀM LẤY DỮ LIỆU TỪ DATABASE (Đã xóa Mock Data)
  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const data = await getWorkers();
      setWorkers(data);
    } catch (error) {
      message.error("Lỗi tải danh sách nhân sự từ máy chủ!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkers(); }, []);

  // HÀM THÊM MỚI NHÂN SỰ VÀO DATABASE
  const handleCreate = async (values: any) => {
    try {
      await createWorker(values);
      message.success("Thêm nhân sự thành công!");
      setIsModalOpen(false);
      form.resetFields();
      fetchWorkers(); // Tải lại bảng ngay sau khi thêm xong
    } catch (error: any) {
      // Bắt lỗi trùng Mã nhân viên từ Backend đẩy lên
      const errorMsg = error.response?.data || "Lỗi khi thêm mới nhân sự!";
      message.error(errorMsg);
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

      <Modal title="Thêm Nhân sự mới" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="workerCode" label="Mã nhân viên" rules={[{ required: true, message: 'Vui lòng nhập mã!' }]}>
            <Input placeholder="VD: EMP-001" />
          </Form.Item>
          <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}>
            <Input placeholder="VD: Nguyễn Văn A" />
          </Form.Item>
          <Form.Item name="role" label="Vai trò / Vị trí" rules={[{ required: true, message: 'Vui lòng chọn vị trí!' }]}>
            <Select placeholder="Chọn vị trí công việc">
              <Select.Option value="WORKER">Công nhân sản xuất</Select.Option>
              <Select.Option value="QC">Nhân viên Kiểm tra chất lượng (QC)</Select.Option>
              <Select.Option value="LEADER">Trưởng ca</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="shift" label="Ca làm việc mặc định" rules={[{ required: true, message: 'Vui lòng chọn ca!' }]}>
            <Select placeholder="Chọn ca">
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