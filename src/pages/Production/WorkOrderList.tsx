import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Card, Progress, Space, message, Modal, Form, Select, InputNumber, DatePicker, Input, QRCode, Grid } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { PlusOutlined, CheckCircleOutlined, HistoryOutlined, QrcodeOutlined, PrinterOutlined, DownloadOutlined } from '@ant-design/icons';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import * as XLSX from 'xlsx';

import type { WorkOrder } from '../../types/production.type';
import type { WorkCenter } from '../../types/master-data.type';
import { getWorkOrders, createWorkOrder, reportProgress } from '../../services/production.service';
import { getWorkCenters, getItems } from '../../services/master-data.service';
import apiClient from '../../services/apiClient';
import AdvancedFilterPanel from '../../components/AdvancedFilterPanel';

const { useBreakpoint } = Grid;

const WorkOrderList: React.FC = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  
  const [reportModal, setReportModal] = useState<{open: boolean, orderId?: number, workCenterId?: number}>({open: false});
  const [reportForm] = Form.useForm();

  const [historyModal, setHistoryModal] = useState<{open: boolean, orderNumber?: string}>({open: false});
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [qrModal, setQrModal] = useState<{open: boolean, orderNumber?: string, orderId?: number}>({open: false});

  const [items, setItems] = useState<any[]>([]);

  // Filter state
  const [filteredOrders, setFilteredOrders] = useState<WorkOrder[]>([]);
  const [filters, setFilters] = useState({
    dateRange: null as [Dayjs, Dayjs] | null,
    workCenterId: null as string | null,
    status: null as string[] | null,
    searchText: null as string | null,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orderRes, centerRes, itemsRes] = await Promise.all([getWorkOrders(), getWorkCenters(), getItems()]);
      setOrders(orderRes);
        setFilteredOrders(orderRes);
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

    const socket = new SockJS('/ws-mes'); 
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

  // Apply filters to orders
  const applyFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);
    
    let result = orders;

    // Filter by search text
    if (newFilters.searchText) {
      result = result.filter(order =>
        order.orderNumber?.toLowerCase().includes(newFilters.searchText!.toLowerCase())
      );
    }

    // Filter by date range
    if (newFilters.dateRange && newFilters.dateRange[0] && newFilters.dateRange[1]) {
      const [startDate, endDate] = newFilters.dateRange;
      result = result.filter(order => {
        const orderDate = dayjs(order.plannedStartDate);
        return orderDate.isAfter(startDate.startOf('day')) && orderDate.isBefore(endDate.endOf('day'));
      });
    }

    // Filter by work center
    if (newFilters.workCenterId) {
      result = result.filter(order =>
        String(order.workCenterId) === newFilters.workCenterId
      );
    }

    // Filter by status
    if (newFilters.status && newFilters.status.length > 0) {
      result = result.filter(order =>
        newFilters.status!.includes(order.status)
      );
    }

    setFilteredOrders(result);
  };

  const handleFilterChange = (newFilters: any) => {
    applyFilters(newFilters);
  };

  const handleResetFilters = () => {
    const emptyFilters = {
      dateRange: null,
      workCenterId: null,
      status: null,
      searchText: null,
    };
    setFilters(emptyFilters);
    setFilteredOrders(orders);
  };

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

  const handleExportExcel = () => {
    if (!orders || orders.length === 0) {
      message.warning("Không có dữ liệu để xuất Excel!");
      return;
    }

    // 1. Chuẩn bị dữ liệu (Format lại tên cột và giá trị cho đẹp)
    const exportData = orders.map((order: any) => ({
      'Mã Lệnh': order.orderNumber,
      'Sản Phẩm': order.itemName,
      'Máy Sản Xuất': order.workCenterName || 'Chưa phân máy',
      'Mục Tiêu': order.plannedQuantity,
      'Thực Tế': order.actualQuantity || 0,
      'Tỷ lệ (%)': order.plannedQuantity > 0 ? Math.round(((order.actualQuantity || 0) / order.plannedQuantity) * 100) + '%' : '0%',
      'Trạng Thái': order.status,
      'Ngày Tạo': order.createdAt ? dayjs(order.createdAt).format('DD/MM/YYYY HH:mm') : '',
      'Bắt đầu Dự kiến': order.plannedStartDate ? dayjs(order.plannedStartDate).format('DD/MM/YYYY HH:mm') : ''
    }));

    // 2. Tạo Worksheet và Workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DS_LenhSanXuat");

    // 3. Tải file xuống
    XLSX.writeFile(workbook, `BaoCao_LenhSanXuat_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`);
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
        <Tag
          color={
            status === 'DRAFT' ? 'default' :
            status === 'IN_PROGRESS' ? 'processing' :
            status === 'COMPLETED' ? 'success' :
            status === 'CANCELLED' ? 'error' :
            'default'
          }
        >
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
          <Button 
            type="text" 
            icon={<QrcodeOutlined />} 
            className="text-blue-600 hover:bg-blue-50"
            onClick={() => setQrModal({ open: true, orderId: record.id, orderNumber: record.orderNumber })}
          >
            Mã QR
          </Button>
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
          {record.failedQuantity > 0 && <span className="font-bold text-red-500">NG: +{record.failedQuantity}</span>}
        </div>
      )
    }
  ];

  return (
    <Card 
      className="dark:bg-slate-800"
      title={<span className="text-xl font-bold dark:text-gray-100">Quản lý Lệnh sản xuất</span>}
      extra={
        <Space wrap>
          <Button icon={<DownloadOutlined />} onClick={handleExportExcel} size={isMobile ? 'small' : 'middle'} className="text-green-600 border-green-600 hover:bg-green-50">
            Xuất Excel
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)} size={isMobile ? 'small' : 'middle'}>
            Tạo lệnh mới
          </Button>
        </Space>
      }
    >
      <AdvancedFilterPanel
        workCenters={workCenters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />
      <Table
        dataSource={filteredOrders}
        columns={columns}
        rowKey="id"
        loading={loading}
        sticky
        scroll={{ x: 'max-content', y: 600 }}
        className="dark:bg-slate-800"
      />

      {/* POPUP 1: TẠO LỆNH MỚI */}
      <Modal title="Tạo Lệnh Sản Xuất Mới" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => form.submit()} width={isMobile ? '94vw' : 620}>
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
            <div className="flex gap-2 flex-col sm:flex-row">
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
      <Modal title="Báo cáo Sản lượng Thực tế" open={reportModal.open} onCancel={() => setReportModal({open: false})} onOk={() => reportForm.submit()} destroyOnHidden width={isMobile ? '94vw' : 560}>
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
        width={isMobile ? '96vw' : 700}
      >
        <Table 
          dataSource={logs} 
          columns={logColumns} 
          rowKey="id" 
          loading={loadingLogs} 
          pagination={{ pageSize: 5 }} 
          bordered
          scroll={{ x: 680 }}
          locale={{ emptyText: 'Chưa có báo cáo nào cho lệnh này.' }}
        />
      </Modal>

      {/* 👉 POPUP 4: HIỂN THỊ VÀ IN MÃ QR */}
      <Modal 
        title={<span className="text-lg font-bold">Tem Lệnh Sản Xuất</span>} 
        open={qrModal.open} 
        onCancel={() => setQrModal({open: false})} 
        footer={null}
        width={isMobile ? '92vw' : 350}
        centered
      >
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 mt-4">
          <h2 className="text-2xl font-black text-gray-800 mb-4">{qrModal.orderNumber}</h2>
          
          <div className="bg-white p-2 rounded-xl shadow-sm">
            <QRCode 
              value={JSON.stringify({ 
                type: 'WORK_ORDER', 
                id: qrModal.orderId, 
                orderNumber: qrModal.orderNumber 
              })} 
              size={200}
              color="#0f172a" 
              bordered={false}
            />
          </div>
          
          <p className="mt-6 text-center text-sm text-gray-500">
            Công nhân sử dụng máy quét hoặc App Mobile quét mã này để báo cáo sản lượng nhanh.
          </p>

          <Button 
            type="primary" 
            icon={<PrinterOutlined />} 
            size="large" 
            className="mt-4 w-full"
            onClick={() => {
              message.success("Đang gửi lệnh in tới máy in nhiệt...");
            }}
          >
            In tem dán (Traveler)
          </Button>
        </div>
      </Modal>

    </Card>
  );
};

export default WorkOrderList;