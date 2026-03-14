import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Modal, Form, Input, Space, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

// Định nghĩa kiểu dữ liệu cơ bản
interface RoutingStep {
  stepId: number;
  sequence: number; // Số thứ tự bước (10, 20, 30...)
  operationName: string; // Tên công đoạn (Cắt, Hàn...)
  workCenterId: string; // ID của máy móc/khu vực
}

interface Routing {
  id: string;
  routingName: string;
  description: string;
  steps: RoutingStep[];
}

const RoutingList: React.FC = () => {
  const [routings, setRoutings] = useState<Routing[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Giả lập gọi API lấy dữ liệu (Bạn sẽ thay bằng axios call tới Backend sau)
  useEffect(() => {
    fetchRoutings();
  }, []);

  const fetchRoutings = () => {
    // Dữ liệu mẫu (Mock data)
    const mockData: Routing[] = [
      {
        id: 'R001',
        routingName: 'Quy trình sản xuất Bàn Gỗ',
        description: 'Cắt gỗ -> Chà nhám -> Sơn',
        steps: [
          { stepId: 1, sequence: 10, operationName: 'Cắt mặt bàn', workCenterId: 'WC-01' },
          { stepId: 2, sequence: 20, operationName: 'Sơn phủ', workCenterId: 'WC-02' }
        ]
      }
    ];
    setRoutings(mockData);
  };

  // Hàm mở Modal thêm mới
  const showAddModal = () => {
    form.resetFields();
    setIsModalVisible(true);
  };

  // Hàm xử lý lưu Quy trình
  const handleSave = () => {
    form.validateFields().then(values => {
      console.log('Dữ liệu gửi lên Backend:', values);
      message.success('Đã lưu quy trình thành công!');
      setIsModalVisible(false);
      // TODO: Thêm hàm axios.post('/api/v1/master-data/routings', values) vào đây
    }).catch(info => {
      console.log('Lỗi validate form:', info);
    });
  };

  // Cấu hình cột cho bảng chính (Quy trình)
  const columns = [
    { title: 'Mã Quy trình', dataIndex: 'id', key: 'id' },
    { title: 'Tên Quy trình', dataIndex: 'routingName', key: 'routingName' },
    { title: 'Mô tả', dataIndex: 'description', key: 'description' },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} type="link">Sửa</Button>
          <Button icon={<DeleteOutlined />} type="link" danger>Xóa</Button>
        </Space>
      ),
    },
  ];

  // Cấu hình cột cho bảng phụ (Chi tiết các bước) hiển thị khi mở rộng (expand)
  const expandedRowRender = (record: Routing) => {
    const stepColumns = [
      { title: 'Thứ tự (Sequence)', dataIndex: 'sequence', key: 'sequence' },
      { title: 'Tên Công đoạn', dataIndex: 'operationName', key: 'operationName' },
      { title: 'Máy/Khu vực (Work Center)', dataIndex: 'workCenterId', key: 'workCenterId' },
    ];
    return <Table columns={stepColumns} dataSource={record.steps} pagination={false} rowKey="stepId" />;
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="Quản lý Quy trình sản xuất (Routing)" extra={<Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>Thêm Quy trình mới</Button>}>
        <Table 
          columns={columns} 
          expandable={{ expandedRowRender }} 
          dataSource={routings} 
          rowKey="id" 
        />
      </Card>

      <Modal title="Thêm/Sửa Quy trình" open={isModalVisible} onOk={handleSave} onCancel={() => setIsModalVisible(false)} width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="routingName" label="Tên Quy trình" rules={[{ required: true, message: 'Vui lòng nhập tên quy trình!' }]}>
            <Input placeholder="Ví dụ: Quy trình đóng gói..." />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
          {/* Lưu ý: Phần nhập chi tiết các công đoạn (Dynamic Form List) sẽ được bổ sung sau để tránh form quá phức tạp trong bước đầu */}
        </Form>
      </Modal>
    </div>
  );
};

export default RoutingList;