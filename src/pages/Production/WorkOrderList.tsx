import React, { useEffect, useState } from 'react';
// ĐÃ IMPORT THÊM Input ĐỂ DÙNG CHO KHUNG NHẬP LÝ DO LỖI
import { Table, Tag, Button, Card, Progress, Space, message, Modal, Form, Select, InputNumber, DatePicker, Input } from 'antd';
import dayjs from 'dayjs';
import { PlusOutlined, CheckCircleOutlined, HistoryOutlined } from '@ant-design/icons';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

import type { WorkOrder } from '../../types/production.type';
import type { WorkCenter } from '../../types/master-data.type';
import { getWorkOrders, createWorkOrder, reportProgress } from '../../services/production.service';
import { getWorkCenters, getItems } from '../../services/master-data.service';
import apiClient from '../../services/apiClient';

const WorkOrderList: React.FC = () => {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  
  const [reportModal, setReportModal] = useState<{open: boolean, orderId?: number, workCenterId?: number}>({open: false});
  const [reportForm] = Form.useForm();

  // STATE MỚI: Dành cho Popup Lịch sử
  const [historyModal, setHistoryModal] = useState<{open: boolean, orderNumber?: string}>({open: false});
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [items, setItems] = useState<any[]>([]);

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

  useEffect(() => { 
    fetchData(); 

    const socket = new SockJS('http://localhost:8080/ws-mes'); 
    const stompClient = Stomp.over(socket);
    stompClient.debug = () => {}; 

    stompClient.connect({}, () => {
      stompClient.subscribe('/topic/dashboard', (wsMessage) => { 
        if (wsMessage.body === 'NEW_ORDER') message.info('Có Lệnh sản xuất mới!');
        else if (wsMessage.body === 'PROGRESS_UPDATED') message.success('Có báo cáo sản lượng mới!');
        else if (wsMessage.body === 'INVENTORY_UPDATED') message.info('Biến động Kho: Dữ liệu tồn kho vừa được cập nhật!');
        
        fetchData(); 
      });

      stompClient.subscribe('/topic/alerts', () => {
        message.warning('Cảnh báo hệ thống mới!');
        fetchData(); 
      });
    });

    return () => {
      if (stompClient) stompClient.disconnect();
    };
  }, []);

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

  const handleReport = async (values: any) => {
    if (!reportModal.orderId || !reportModal.workCenterId) {
      message.error("Thiếu thông tin lệnh hoặc máy sản xuất!");
      return;
    }
    try {
      await reportProgress(reportModal.orderId, values.okQty, values.ngQty, reportModal.workCenterId, values.defectReason, values.operatorName);
      message.success("Đã cập nhật sản lượng thành công!");
      setReportModal({open: false});
      reportForm.resetFields();
      fetchData();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Lỗi báo cáo sản lượng!";
      message.error(errorMsg);
    }
  };

  const fetchLogs = async (orderId: number, orderNumber: string) => {
    setHistoryModal({ open: true, orderNumber });
    setLoadingLogs(true);
    try {
      const res = await apiClient.get(`/production/work-orders/${orderId}/logs`);
      setLogs(res as unknown as any[]);
    } catch (error) {
      message.error("Không thể tải lịch sử báo cáo!");
    } finally {
      setLoadingLogs(false);
    }
  };

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
            <Progress percent={percent > 100 ? 100 : percent} size="small" status={record.status === 'COMPLETED' ? 'success' : 'active'} />
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
            onClick={() => setReportModal({ open: true, orderId: record.id, workCenterId: record.workCenterId })}
          >
            Báo cáo
          </Button>
          {/* NÚT XEM LỊCH SỬ */}
          <Button 
            type="link" 
            icon={<HistoryOutlined />} 
            className="text-gray-600"
            onClick={() => fetchLogs(record.id, record.orderNumber)}
          >
            Lịch sử
          </Button>
        </Space>
      )
    }
  ];

  // Cấu hình cột cho bảng Lịch sử
  const logColumns = [
    { 
      title: 'Thời gian', 
      dataIndex: 'createdAt', 
      key: 'createdAt',
      render: (val: any) => val ? new Date(val).toLocaleString('vi-VN') : 'N/A'
    },
    { 
      title: 'Người báo cáo', 
      key: 'operatorName',
      render: (_: any, record: any) => record.operatorName || record.createdBy || 'Hệ thống'
    },
    { 
      title: 'Sản lượng', 
      key: 'quantities',
      render: (_: any, record: any) => (
        <div>
          <span className="font-bold text-green-600 mr-2">OK: +{record.quantityDone || 0}</span>
          {/* Giả sử Backend có trả về số lượng lỗi trong logs, nếu không thì bỏ dòng dưới */}
          {record.failedQuantity > 0 && <span className="font-bold text-red-500">NG: +{record.failedQuantity}</span>}
        </div>
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
      <Modal title="Tạo Lệnh Sản Xuất Mới" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="plannedQuantity" label="Số lượng mục tiêu" rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}>
            <InputNumber min={1} className="w-full" placeholder="Ví dụ: 1000" />
          </Form.Item>
          <Form.Item name="itemId" label="Sản phẩm cần sản xuất" rules={[{ required: true, message: 'Vui lòng chọn sản phẩm!' }]}>
            <Select showSearch optionFilterProp="children" filterOption={(input, option) => (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())}>
              {items.map(item => (
                <Select.Option key={item.id} value={item.id}><span className="font-semibold text-blue-600">[{item.itemCode}]</span> {item.itemName}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Ngày giờ bắt đầu" required>
            <div className="flex gap-2">
              <Form.Item name="plannedStartDate" noStyle rules={[{ required: true, message: 'Vui lòng chọn ngày giờ!' }]}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" className="flex-1" />
              </Form.Item>
              <Button onClick={() => form.setFieldsValue({ plannedStartDate: dayjs() })}>Bây giờ</Button>
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
          <Form.Item name="priority" label="Độ ưu tiên" initialValue={2}>
            <Select>
              <Select.Option value={1}><Tag color="default">1 - Thấp</Tag></Select.Option>
              <Select.Option value={2}><Tag color="blue">2 - Bình thường</Tag></Select.Option>
              <Select.Option value={3}><Tag color="red">3 - Cao</Tag></Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* POPUP 2: BÁO CÁO SẢN LƯỢNG */}
      <Modal title="Báo cáo Sản lượng Thực tế" open={reportModal.open} onCancel={() => setReportModal({open: false})} onOk={() => reportForm.submit()} destroyOnClose>
        <Form form={reportForm} layout="vertical" onFinish={handleReport}>
          <Form.Item name="operatorName" label="Người thực hiện / Người báo cáo" rules={[{required: true, message: 'Vui lòng nhập tên người thực hiện!'}]}>
             <Input placeholder="VD: Nguyễn Văn A, Trần Thị B..." />
          </Form.Item>
          <Form.Item name="okQty" label="Số lượng Đạt (OK)" rules={[{required: true}]} initialValue={0}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="ngQty" label="Số lượng Lỗi (NG)" rules={[{required: true}]} initialValue={0}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>

          {/* 🛠️ ĐÃ BỔ SUNG: Khung nhập lý do chỉ hiện lên khi ngQty > 0 */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.ngQty !== currentValues.ngQty}
          >
            {({ getFieldValue }) =>
              getFieldValue('ngQty') > 0 ? (
                <Form.Item
                  name="defectReason"
                  label="Lý do lỗi (Bắt buộc nhập khi có hàng hỏng)"
                  rules={[{ required: true, message: 'Vui lòng nhập lý do lỗi để gửi báo cáo!' }]}
                >
                  <Input.TextArea rows={2} placeholder="VD: Bị xước sơn, nứt mẻ, sai kích thước..." />
                </Form.Item>
              ) : null
            }
          </Form.Item>

        </Form>
      </Modal>

      {/* POPUP 3: LỊCH SỬ BÁO CÁO */}
      <Modal 
        title={<span className="text-lg font-bold"><HistoryOutlined className="mr-2"/> Lịch sử báo cáo - Lệnh [{historyModal.orderNumber}]</span>} 
        open={historyModal.open} 
        onCancel={() => setHistoryModal({open: false})} 
        footer={[
          <Button key="close" type="primary" onClick={() => setHistoryModal({open: false})}>Đóng</Button>
        ]}
        width={700}
      >
        <Table 
          dataSource={logs} 
          columns={logColumns} 
          rowKey="id" 
          loading={loadingLogs} 
          pagination={{ pageSize: 5 }} 
          bordered
          locale={{ emptyText: 'Chưa có báo cáo nào cho lệnh này.' }}
        />
      </Modal>
    </Card>
  );
};

export default WorkOrderList;