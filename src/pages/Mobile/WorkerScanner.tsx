import React, { useEffect, useState } from 'react';
import { Card, Button, Form, InputNumber, Input, Select, message, Typography, Space, Divider, Tag, Progress } from 'antd';
import { QrcodeOutlined, CheckCircleOutlined, LeftOutlined, CheckOutlined } from '@ant-design/icons';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { reportProgress, getWorkOrders } from '../../services/production.service';
import { getWorkCenters } from '../../services/master-data.service';
import apiClient from '../../services/apiClient';

const { Title, Text } = Typography;

const WorkerScanner: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [scanData, setScanData] = useState<{ id: number; orderNumber: string } | null>(null);
  const [workOrderDetail, setWorkOrderDetail] = useState<any>(null);
  const [workCenters, setWorkCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // Lấy danh sách máy móc để công nhân chọn họ đang đứng ở máy nào
  useEffect(() => {
    getWorkCenters().then(setWorkCenters).catch(() => message.error("Lỗi tải danh sách máy!"));
  }, []);

  // Hàm fetch chi tiết work order để hiển thị tiến độ
  const fetchWorkOrderDetail = async (orderId: number) => {
    try {
      const res = await apiClient.get(`/production/work-orders/${orderId}`);
      const detail = (res as any).data || res;
      setWorkOrderDetail(detail);
    } catch (error) {
      console.error("Lỗi tải chi tiết Lệnh sản xuất:", error);
    }
  };

  // Khởi tạo Camera Scanner
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (scanning) {
      scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        false
      );

      scanner.render(
        (decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            if (data.type === 'WORK_ORDER' && data.id) {
              setScanData(data);
              setScanning(false);
              scanner?.clear(); // Tắt camera khi quét thành công
              message.success(`Đã nhận diện Lệnh: ${data.orderNumber}`);
              // Fetch chi tiết work order ngay khi quét thành công
              fetchWorkOrderDetail(data.id);
            } else {
              message.error("Mã QR không hợp lệ!");
            }
          } catch (e) {
            message.error("Lỗi đọc dữ liệu QR!");
          }
        },
        (error) => {
          // Bỏ qua các cảnh báo không tìm thấy mã liên tục của camera
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error("Lỗi tắt camera", e));
      }
    };
  }, [scanning]);

  const handleReport = async (values: any) => {
    if (!scanData) return;
    setLoading(true);
    try {
      await reportProgress(
        scanData.id, 
        values.okQty, 
        values.ngQty, 
        values.workCenterId, 
        values.defectReason, 
        values.operatorName
      );
      message.success("✅ ĐÃ GỬI BÁO CÁO THÀNH CÔNG!");
      
      // 🔑 QUAN TRỌNG: Refetch chi tiết work order để cập nhật progress trên UI
      await fetchWorkOrderDetail(scanData.id);
      
      form.resetFields();
      // Không reset scanData ngay - để hiển thị progress mới được cập nhật
    } catch (error: any) {
      message.error(error.response?.data?.message || "Gửi báo cáo thất bại!");
    } finally {
      setLoading(false);
    }
  };

  // Hàm quét lại (reset)
  const handleRescan = () => {
    setScanData(null);
    setWorkOrderDetail(null);
    form.resetFields();
  };

  // Tính toán progress (%) từ work order detail
  const calculateProgress = () => {
    if (!workOrderDetail) return 0;
    const planned = workOrderDetail.plannedQuantity || 0;
    const actual = workOrderDetail.actualQuantity || 0;
    return planned > 0 ? Math.round((actual / planned) * 100) : 0;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-20">
      <div className="text-center mb-6 mt-4">
        <Title level={3} className="text-blue-700 m-0">SmartMES Mobile</Title>
        <Text type="secondary">Cổng báo cáo sản xuất tại xưởng</Text>
      </div>

      {!scanData ? (
        <Card className="shadow-md rounded-2xl overflow-hidden border-0">
          <div className="text-center">
            {scanning ? (
              <div id="qr-reader" className="w-full overflow-hidden rounded-lg border-2 border-blue-400"></div>
            ) : (
              <div className="py-10">
                <QrcodeOutlined className="text-6xl text-gray-300 mb-4" />
                <Title level={4} className="text-gray-600">Sẵn sàng quét mã</Title>
                <Text type="secondary" className="block mb-6 px-4">
                  Hướng camera vào mã QR trên tem dán Lệnh sản xuất để bắt đầu báo cáo.
                </Text>
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<QrcodeOutlined />} 
                  className="w-full h-14 text-lg rounded-xl shadow-blue-300 shadow-lg"
                  onClick={() => setScanning(true)}
                >
                  Mở Camera Quét QR
                </Button>
              </div>
            )}
            
            {scanning && (
              <Button danger size="large" className="mt-4 w-full rounded-xl" onClick={() => setScanning(false)}>
                Hủy quét
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card className="shadow-md rounded-2xl border-t-4 border-t-blue-500">
          <div className="flex items-center justify-between mb-4">
            <Button type="text" icon={<LeftOutlined />} onClick={handleRescan} className="text-gray-500 p-0">Quét lại</Button>
            <Tag color="blue" className="text-sm m-0 px-3 py-1 font-bold">{scanData.orderNumber}</Tag>
          </div>
          
          {/* Hiển thị tiến độ hiện tại nếu có dữ liệu */}
          {workOrderDetail && (
            <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">Tiến độ Lệnh sản xuất hiện tại</span>
                <span className="text-lg font-bold text-blue-600">{calculateProgress()}%</span>
              </div>
              <Progress 
                percent={calculateProgress()} 
                size="small" 
                status={workOrderDetail.status === 'COMPLETED' ? 'success' : 'active'}
              />
              <div className="text-xs text-gray-500 mt-2">
                Đã làm: {workOrderDetail.actualQuantity || 0} / Mục tiêu: {workOrderDetail.plannedQuantity || 0}
              </div>
            </div>
          )}
          
          <Divider className="my-3" />
          
          <Form form={form} layout="vertical" onFinish={handleReport} size="large">
            <Form.Item name="operatorName" label={<span className="font-bold">Người thao tác</span>} rules={[{required: true, message: 'Bắt buộc!'}]}>
              <Input placeholder="Nhập tên của bạn" className="rounded-lg" />
            </Form.Item>
            
            <Form.Item name="workCenterId" label={<span className="font-bold">Đang sản xuất tại máy</span>} rules={[{required: true, message: 'Bắt buộc!'}]}>
              <Select placeholder="Chọn máy..." className="rounded-lg">
                {workCenters.map(wc => (
                  <Select.Option key={wc.id} value={wc.id} disabled={wc.currentStatus === 'DOWN'}>
                    {wc.name} {wc.currentStatus === 'DOWN' ? '(Hỏng)' : ''}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <div className="flex gap-4">
              <Form.Item name="okQty" label={<span className="font-bold text-green-600">Sản lượng ĐẠT</span>} className="flex-1" rules={[{required: true}]} initialValue={0}>
                <InputNumber min={0} className="w-full text-center text-lg rounded-lg border-green-300" />
              </Form.Item>
              <Form.Item name="ngQty" label={<span className="font-bold text-red-500">Hàng LỖI (NG)</span>} className="flex-1" rules={[{required: true}]} initialValue={0}>
                <InputNumber min={0} className="w-full text-center text-lg rounded-lg border-red-300" />
              </Form.Item>
            </div>

            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.ngQty !== curr.ngQty}>
              {({ getFieldValue }) => getFieldValue('ngQty') > 0 ? (
                <Form.Item name="defectReason" label={<span className="font-bold text-red-500">Lý do lỗi (Bắt buộc)</span>} rules={[{required: true, message: 'Vui lòng nhập lý do lỗi!'}]}>
                  <Input.TextArea rows={2} placeholder="Nhập tình trạng lỗi..." className="rounded-lg" />
                </Form.Item>
              ) : null}
            </Form.Item>

            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<CheckOutlined />} 
              loading={loading}
              className="w-full h-14 text-lg font-bold rounded-xl mt-2 bg-blue-600 hover:bg-blue-700"
            >
              GỬI BÁO CÁO
            </Button>
          </Form>
        </Card>
      )}
    </div>
  );
};

export default WorkerScanner;