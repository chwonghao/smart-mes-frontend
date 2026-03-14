import React, { useEffect, useState } from 'react';
import { Table, Card, Tag, DatePicker, Select, Button, Space, message, Typography } from 'antd';
import { ReloadOutlined, BugOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
import apiClient from '../../services/apiClient';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const SystemLogList: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Gọi API lấy danh sách toàn bộ log/cảnh báo (Giả định endpoint là /realtime/alerts hoặc /system/logs)
  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Tùy thuộc vào Backend của bạn đã có API lấy toàn bộ lịch sử cảnh báo chưa.
      // Nếu chưa, bạn có thể tạm dùng endpoint lấy thông báo hiện tại.
      const res = await apiClient.get('/realtime/alerts'); 
      const data = (res as any).data || res;
      setLogs(data);
    } catch (error) {
      message.error("Lỗi tải nhật ký hệ thống!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getLogIconAndColor = (type: string) => {
    switch (type) {
      case 'MACHINE_DOWN': return { color: 'red', icon: <BugOutlined />, label: 'SỰ CỐ MÁY' };
      case 'QC_ALERT': return { color: 'orange', icon: <WarningOutlined />, label: 'LỖI CHẤT LƯỢNG' };
      case 'INFO': return { color: 'blue', icon: <InfoCircleOutlined />, label: 'THÔNG TIN' };
      default: return { color: 'default', icon: <InfoCircleOutlined />, label: type || 'SYSTEM' };
    }
  };

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (val: any) => <span className="font-semibold text-gray-600">{val ? new Date(val).toLocaleString('vi-VN') : 'N/A'}</span>
    },
    {
      title: 'Phân loại',
      dataIndex: 'alertType',
      key: 'alertType',
      width: 180,
      render: (type: string) => {
        const { color, icon, label } = getLogIconAndColor(type);
        return <Tag color={color} icon={icon} className="font-bold">{label}</Tag>;
      }
    },
    {
      title: 'Nội dung chi tiết',
      dataIndex: 'message',
      key: 'message',
      render: (msg: string) => <Text className="text-gray-800">{msg}</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isRead',
      key: 'isRead',
      width: 120,
      render: (isRead: boolean) => (
        <Tag color={isRead ? 'green' : 'red'}>{isRead ? 'Đã xem' : 'Chưa xem'}</Tag>
      )
    }
  ];

  return (
    <Card 
      title={<span className="text-xl font-bold">Nhật ký Hệ thống (System Logs)</span>}
      extra={
        <Button type="primary" icon={<ReloadOutlined />} onClick={fetchLogs} loading={loading}>
          Làm mới
        </Button>
      }
      className="shadow-sm"
    >
      <div className="mb-4 flex gap-4 bg-gray-50 p-4 rounded-md">
        <Space>
          <span className="font-medium">Lọc theo ngày:</span>
          <RangePicker format="DD/MM/YYYY" />
          <span className="font-medium ml-4">Loại sự kiện:</span>
          <Select defaultValue="ALL" style={{ width: 150 }}>
            <Select.Option value="ALL">Tất cả</Select.Option>
            <Select.Option value="MACHINE_DOWN">Sự cố Máy</Select.Option>
            <Select.Option value="QC_ALERT">Lỗi QC</Select.Option>
          </Select>
          <Button>Lọc</Button>
        </Space>
      </div>

      <Table 
        columns={columns} 
        dataSource={logs} 
        rowKey="id" 
        loading={loading}
        pagination={{ pageSize: 15 }}
        bordered
      />
    </Card>
  );
};

export default SystemLogList;