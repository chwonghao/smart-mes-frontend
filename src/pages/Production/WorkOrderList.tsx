import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Card, Progress, Space, message, Modal, Form, Input, Select, InputNumber } from 'antd';
import { PlusOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { WorkOrder } from '../../types/production.type';
import type { WorkCenter } from '../../types/master-data.type';
import { getWorkOrders, createWorkOrder, reportProgress } from '../../services/production.service';
import { getWorkCenters } from '../../services/master-data.service';

const WorkOrderList: React.FC = () => {
  // 1. CÁC STATE QUẢN LÝ DỮ LIỆU
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 2. CÁC STATE QUẢN LÝ POPUP (MODAL) VÀ FORM
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm(); // Form tạo mới lệnh
  
  // ĐÂY CHÍNH LÀ ĐOẠN BỊ THIẾU GÂY RA LỖI CỦA BẠN:
  // Khai báo state cho Popup báo cáo, lưu trữ luôn cả ID lệnh và ID máy móc
  const [reportModal, setReportModal] = useState<{open: boolean, orderId?: number, workCenterId?: number}>({open: false});
  const [reportForm] = Form.useForm(); // Form báo cáo

  // Hàm tải dữ liệu
  const fetchData = async () => {
    setLoading(true);
    try {
      const [orderRes, centerRes] = await Promise.all([getWorkOrders(), getWorkCenters()]);
      setOrders(orderRes);
      setWorkCenters(centerRes);
    } catch (error) {
      message.error("Lỗi tải dữ liệu lệnh sản xuất!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  // Hàm Tạo lệnh mới
  const handleCreate = async (values: any) => {
    try {
      await createWorkOrder(values);
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
      
      // Đóng modal, xóa form và tải lại bảng
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
        // Tránh lỗi chia cho 0
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
            disabled={record.status === 'COMPLETED'}
            // Khi bấm, lưu trữ id lệnh VÀ id máy móc vào state để mở Form
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
      {/* BẢNG DỮ LIỆU */}
      <Table dataSource={orders} columns={columns} rowKey="id" loading={loading} />

      {/* POPUP 1: TẠO LỆNH MỚI */}
      <Modal title="Tạo Lệnh Sản Xuất Mới" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="plannedQuantity" label="Số lượng mục tiêu" rules={[{required: true}]}><InputNumber min={1} className="w-full" /></Form.Item>
          <Form.Item name="itemId" label="ID Sản phẩm (Tạm thời nhập ID)" rules={[{required: true}]}><InputNumber min={1} className="w-full" /></Form.Item>
          <Form.Item name="plannedStartDate" label="Ngày bắt đầu (YYYY-MM-DDTHH:mm:ss)" rules={[{required: true}]}><Input placeholder="2026-03-08T08:00:00" /></Form.Item>
          <Form.Item name="workCenterId" label="Máy sản xuất" rules={[{required: true}]}>
            <Select placeholder="Chọn máy">
              {workCenters.map(wc => (
                <Select.Option key={wc.id} value={wc.id} disabled={wc.currentStatus === 'DOWN'}>
                  {wc.name} {wc.currentStatus === 'DOWN' ? '(Đang hỏng)' : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="priority" label="Độ ưu tiên (1-3)" rules={[{required: true}]}><InputNumber min={1} max={3} className="w-full" /></Form.Item>
        </Form>
      </Modal>

      {/* POPUP 2: BÁO CÁO SẢN LƯỢNG (VỪA THÊM) */}
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