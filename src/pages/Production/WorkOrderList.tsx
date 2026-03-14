import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Card, Progress, Space, message, Modal, Form, Input, Select, InputNumber, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { PlusOutlined, CheckCircleOutlined } from '@ant-design/icons';
// IMPORT THÊM THƯ VIỆN WEBSOCKET
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

import type { WorkOrder } from '../../types/production.type';
import type { WorkCenter } from '../../types/master-data.type';
import { getWorkOrders, createWorkOrder, reportProgress } from '../../services/production.service';
import { getWorkCenters, getItems } from '../../services/master-data.service';

const WorkOrderList: React.FC = () => {
  // 1. CÁC STATE QUẢN LÝ DỮ LIỆU
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 2. CÁC STATE QUẢN LÝ POPUP (MODAL) VÀ FORM
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm(); // Form tạo mới lệnh
  
  const [reportModal, setReportModal] = useState<{open: boolean, orderId?: number, workCenterId?: number}>({open: false});
  const [reportForm] = Form.useForm(); // Form báo cáo

  const [items, setItems] = useState<any[]>([]);

  // Hàm tải dữ liệu
  const fetchData = async () => {
    setLoading(true);
    try {
      const [orderRes, centerRes, itemsRes] = await Promise.all([getWorkOrders(), getWorkCenters(), getItems()]);
      setOrders(orderRes);
      setWorkCenters(centerRes);
      setItems(itemsRes);
    } catch (error) {
      message.error("Lỗi tải dữ liệu lệnh sản xuất!");
    } finally {
      setLoading(false);
    }
  };

  // NÂNG CẤP LÊN REAL-TIME VỚI WEBSOCKETS
  useEffect(() => { 
    // 1. Tải dữ liệu lần đầu khi vào trang
    fetchData(); 

    // 2. Thiết lập đường ống WebSockets
    const socket = new SockJS('http://localhost:8080/ws-mes'); // Khớp với port Backend của bạn
    const stompClient = Stomp.over(socket);
    
    // Tắt log của STOMP để console đỡ bị rác
    stompClient.debug = () => {}; 

    stompClient.connect({}, () => {
      // Lắng nghe chung kênh dashboard (kênh này sẽ nhận tín hiệu khi có lệnh mới hoặc cập nhật tiến độ)
      stompClient.subscribe('/topic/dashboard', (message) => {
        console.log("🚀 [WorkOrderList] Nhận tín hiệu thay đổi dữ liệu:", message.body);
        // Tự động tải lại bảng khi có người khác thay đổi dữ liệu
        fetchData(); 
      });
    });

    // Cleanup: Ngắt kết nối khi rời khỏi trang
    return () => {
      if (stompClient) stompClient.disconnect();
    };
  }, []);

  // Hàm Tạo lệnh mới
  const handleCreate = async (values: any) => {
    try {
      const payload = {
        ...values,
        plannedStartDate: values.plannedStartDate ? values.plannedStartDate.format('YYYY-MM-DDTHH:mm:ss') : null
      };
      await createWorkOrder(payload);
      message.success("Tạo lệnh sản xuất thành công!");
      setIsModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (error) { 
      message.error("Không thể tạo lệnh!"); 
    }
  };

  // Hàm Gửi Báo cáo sản lượng
  const handleReport = async (values: any) => {
    if (!reportModal.orderId || !reportModal.workCenterId) {
      message.error("Thiếu thông tin lệnh hoặc máy sản xuất!");
      return;
    }
    
    try {
      // Gọi API báo cáo, truyền đủ okQty, ngQty và workCenterId
      await reportProgress(reportModal.orderId, values.okQty, values.ngQty, reportModal.workCenterId);
      message.success("Đã cập nhật sản lượng thành công!");
      
      // Đóng modal và xóa form
      setReportModal({open: false});
      reportForm.resetFields();
      fetchData();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Lỗi báo cáo sản lượng!";
      message.error(errorMsg);
    }
  };

  // Cấu hình các cột của Bảng
  const columns = [
    { title: 'Mã lệnh', dataIndex: 'orderNumber', key: 'orderNumber', className: 'font-bold' },
    { title: 'Sản phẩm', dataIndex: 'itemName', key: 'itemName' },
    { title: 'Máy sản xuất', dataIndex: 'workCenterName', key: 'workCenterName' },
    { 
      title: 'Tiến độ', 
      key: 'progress',
      render: (_: any, record: any) => {
        const percent = record.plannedQuantity > 0 
          ? Math.round((record.actualQuantity / record.plannedQuantity) * 100) 
          : 0;
          
        return (
          <div style={{ width: 150 }}>
            <Progress 
              percent={percent > 100 ? 100 : percent} 
              size="small" 
              status={record.status === 'COMPLETED' ? 'success' : 'active'} 
            />
            <small className="text-gray-500">{record.actualQuantity || 0} / {record.plannedQuantity}</small>
          </div>
        );
      }
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'status', 
      render: (status: string) => (
        <Tag color={status === 'IN_PROGRESS' ? 'blue' : status === 'COMPLETED' ? 'green' : 'default'}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button 
            type="link" 
            icon={<CheckCircleOutlined />} 
            className="text-green-600 font-semibold"
            disabled={record.status === 'COMPLETED' || !record.workCenterId}
            title={!record.workCenterId ? "Lệnh này chưa gán máy, không thể báo cáo" : ""}
            onClick={() => setReportModal({ open: true, orderId: record.id, workCenterId: record.workCenterId })}
          >
            Báo cáo
          </Button>
        </Space>
      )
    }
  ];

  return (
    <Card 
      title={<span className="text-xl font-bold">Quản lý Lệnh sản xuất</span>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Tạo lệnh mới</Button>}
    >
      <Table dataSource={orders} columns={columns} rowKey="id" loading={loading} />

      {/* POPUP 1: TẠO LỆNH MỚI */}
      <Modal 
        title="Tạo Lệnh Sản Xuất Mới" 
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)} 
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="plannedQuantity" label="Số lượng mục tiêu" rules={[{ required: true, message: 'Vui lòng nhập số lượng mục tiêu!' }]}>
            <InputNumber min={1} className="w-full" placeholder="Ví dụ: 1000" />
          </Form.Item>

          <Form.Item name="itemId" label="Sản phẩm cần sản xuất" rules={[{ required: true, message: 'Vui lòng chọn sản phẩm!' }]}>
            <Select 
              placeholder="Gõ tên hoặc mã để tìm kiếm..." 
              showSearch 
              optionFilterProp="children" 
              filterOption={(input, option) => (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())}
            >
              {items.map(item => (
                <Select.Option key={item.id} value={item.id}>
                  <span className="font-semibold text-blue-600">[{item.itemCode}]</span> {item.itemName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Ngày giờ bắt đầu" required>
            <div className="flex gap-2">
              <Form.Item name="plannedStartDate" noStyle rules={[{ required: true, message: 'Vui lòng chọn ngày giờ!' }]}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" className="flex-1" placeholder="Chọn ngày và giờ" />
              </Form.Item>
              <Button onClick={() => form.setFieldsValue({ plannedStartDate: dayjs() })} title="Tự động lấy giờ hiện tại">
                Bây giờ
              </Button>
            </div>
          </Form.Item>

          <Form.Item name="workCenterId" label="Máy sản xuất" rules={[{ required: true, message: 'Vui lòng chọn máy sản xuất!' }]}>
            <Select placeholder="Chọn máy">
              {workCenters.map(wc => (
                <Select.Option key={wc.id} value={wc.id} disabled={wc.currentStatus === 'DOWN'}>
                  {wc.name} {wc.currentStatus === 'DOWN' ? '(Đang hỏng)' : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="priority" label="Độ ưu tiên (Mức độ gấp gáp)" rules={[{ required: true, message: 'Vui lòng chọn độ ưu tiên!' }]} initialValue={2}>
            <Select placeholder="Chọn mức ưu tiên">
              <Select.Option value={1}><Tag color="default">1 - Thấp (Sản xuất lưu kho)</Tag></Select.Option>
              <Select.Option value={2}><Tag color="blue">2 - Bình thường (Theo kế hoạch)</Tag></Select.Option>
              <Select.Option value={3}><Tag color="red">3 - Cao (Đơn hàng gấp / VIP)</Tag></Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* POPUP 2: BÁO CÁO SẢN LƯỢNG */}
      <Modal 
        title="Báo cáo Sản lượng Thực tế" 
        open={reportModal.open} 
        onCancel={() => setReportModal({open: false})}
        onOk={() => reportForm.submit()}
        destroyOnClose
      >
        <Form form={reportForm} layout="vertical" onFinish={handleReport}>
          <Form.Item name="okQty" label="Số lượng Đạt (OK)" rules={[{required: true}]} initialValue={0}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="ngQty" label="Số lượng Lỗi (NG)" rules={[{required: true}]} initialValue={0}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default WorkOrderList;