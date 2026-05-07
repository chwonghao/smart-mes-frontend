import React, { useEffect, useState } from 'react';
import { Card, Button, Form, Input, message, Typography, Divider, Tag, Progress, Space } from 'antd';
import { QrcodeOutlined, LeftOutlined, CheckOutlined } from '@ant-design/icons';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { reportProgress, getWorkOrderWithSchedules } from '../../services/production.service';
import { getWorkCenters } from '../../services/master-data.service';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

const WorkerScanner: React.FC = () => {
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [scanData, setScanData] = useState<{ id: number; orderNumber: string; workCenterId?: number; workCenterName?: string } | null>(null);
  const [workOrderDetail, setWorkOrderDetail] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [workCenters, setWorkCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [okQty, setOkQty] = useState(0);
  const [ngQty, setNgQty] = useState(0);
  const [form] = Form.useForm();

  const playFeedback = (status: 'success' | 'error') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(status === 'success' ? [80, 40, 80] : [200]);
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = status === 'success' ? 880 : 220;
      gainNode.gain.value = 0.08;

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      // Bỏ qua nếu thiết bị không hỗ trợ audio context.
    }
  };

  const getQtyValue = (field: 'okQty' | 'ngQty') => field === 'okQty' ? okQty : ngQty;

  const adjustQty = (field: 'okQty' | 'ngQty', delta: number) => {
    const currentValue = field === 'okQty' ? okQty : ngQty;
    const nextValue = Math.max(0, currentValue + delta);
    
    if (field === 'okQty') {
      setOkQty(nextValue);
    } else {
      setNgQty(nextValue);
    }
    
    form.setFieldsValue({ [field]: nextValue });
  };

  const renderQtyPad = (field: 'okQty' | 'ngQty', tone: 'pass' | 'fail') => {
    const isPass = tone === 'pass';
    const value = getQtyValue(field);

    return (
      <div className={`rounded-xl border-2 p-3 ${isPass ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'}`}>
        <div className={`mb-2 text-sm font-bold ${isPass ? 'text-green-700' : 'text-red-700'}`}>
          {isPass ? 'SẢN LƯỢNG ĐẠT (PASS)' : 'HÀNG LỖI (FAIL/NG)'}
        </div>

        <div className={`mb-3 h-16 rounded-lg border text-center text-3xl font-black leading-[3.8rem] ${isPass ? 'border-green-700 text-green-700 bg-white' : 'border-red-700 text-red-700 bg-white'}`}>
          {value}
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Button className="h-12 text-lg font-bold" onClick={() => adjustQty(field, -1)}>-</Button>
          <Button className="h-12 text-lg font-bold" onClick={() => adjustQty(field, 1)}>+</Button>
          <Button className="h-12 text-base font-bold" onClick={() => adjustQty(field, 10)}>+10</Button>
          <Button className="h-12 text-base font-bold" onClick={() => adjustQty(field, 50)}>+50</Button>
        </div>
      </div>
    );
  };

  // Lấy danh sách máy móc để công nhân chọn họ đang đứng ở máy nào
  useEffect(() => {
    getWorkCenters().then(setWorkCenters).catch(() => message.error("Lỗi tải danh sách máy!"));
  }, []);

  useEffect(() => {
    if (!user) return;
    form.setFieldsValue({ operatorName: user.fullName || user.username });
  }, [user, form]);

  useEffect(() => {
    if (!user?.workCenterId) return;

    form.setFieldsValue({
      workCenterId: user.workCenterId,
      workCenterName: user.workCenterName || workCenters.find(wc => wc.id === user.workCenterId)?.name || `Máy #${user.workCenterId}`
    });
  }, [user, workCenters, form]);

  useEffect(() => {
    const workCenterId = scanData?.workCenterId ?? workOrderDetail?.workCenterId ?? user?.workCenterId;
    const workCenterName = scanData?.workCenterName ?? workOrderDetail?.workCenterName ?? user?.workCenterName;

    if (workCenterId) {
      form.setFieldsValue({ workCenterId });
    }

    if (workCenterName || workCenterId) {
      form.setFieldsValue({ workCenterName: workCenterName || workCenters.find(wc => wc.id === workCenterId)?.name || `Máy #${workCenterId}` });
    }
  }, [scanData, workOrderDetail, workCenters, user, form]);

  // Hàm fetch chi tiết work order và danh sách máy sản xuất
  const fetchWorkOrderDetail = async (orderId: number) => {
    try {
      const { workOrder, schedules } = await getWorkOrderWithSchedules(orderId);
      setWorkOrderDetail(workOrder);
      setSchedules(schedules);
      
      // Nếu chỉ có 1 máy, tự động chọn máy đó
      if (schedules && schedules.length === 1) {
        const firstSchedule = schedules[0];
        const workCenterId = firstSchedule.workCenterId;
        const workCenterName = firstSchedule.workCenterName || workCenters.find(wc => wc.id === workCenterId)?.name || `Máy #${workCenterId}`;
        
        setSelectedScheduleId(firstSchedule.id);
        form.setFieldsValue({ workCenterId, workCenterName });
      } else if (schedules && schedules.length > 1) {
        const assignedSchedule = user?.workCenterId ? schedules.find(schedule => schedule.workCenterId === user.workCenterId) : undefined;
        const firstSchedule = assignedSchedule || schedules[0];
        const workCenterId = firstSchedule.workCenterId;
        const workCenterName = firstSchedule.workCenterName || workCenters.find(wc => wc.id === workCenterId)?.name || `Máy #${workCenterId}`;
        
        setSelectedScheduleId(firstSchedule.id);
        form.setFieldsValue({ workCenterId, workCenterName });
      }
    } catch (error) {
      console.error("Lỗi tải chi tiết Lệnh sản xuất:", error);
      message.error("Không thể tải chi tiết lệnh sản xuất!");
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
              playFeedback('success');
              message.success(`Đã nhận diện Lệnh: ${data.orderNumber}`);
              // Fetch chi tiết work order ngay khi quét thành công
              fetchWorkOrderDetail(data.id);
            } else {
              playFeedback('error');
              message.error("Mã QR không hợp lệ!");
            }
          } catch (e) {
            playFeedback('error');
            message.error("Lỗi đọc dữ liệu QR!");
          }
        },
        () => {
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
    const operatorName = user?.fullName || user?.username;
    const workCenterId = scanData.workCenterId ?? workOrderDetail?.workCenterId ?? user?.workCenterId;

    if (!operatorName) {
      message.error('Không lấy được thông tin người dùng đăng nhập!');
      return;
    }

    if (!workCenterId) {
      message.error('Không lấy được thông tin máy sản xuất cho lệnh này!');
      return;
    }

    setLoading(true);
    try {
      await reportProgress(
        scanData.id, 
        values.okQty, 
        values.ngQty, 
        workCenterId, 
        values.defectReason, 
        operatorName
      );
      playFeedback('success');
      message.success("✅ ĐÃ GỬI BÁO CÁO THÀNH CÔNG!");
      
      // 🔑 QUAN TRỌNG: Refetch chi tiết work order để cập nhật progress trên UI
      await fetchWorkOrderDetail(scanData.id);
      
      setOkQty(0);
      setNgQty(0);
      form.resetFields();
      // Không reset scanData ngay - để hiển thị progress mới được cập nhật
    } catch (error: any) {
      playFeedback('error');
      message.error(error.response?.data?.message || "Gửi báo cáo thất bại!");
    } finally {
      setLoading(false);
    }
  };

  // Hàm quét lại (reset)
  const handleRescan = () => {
    setScanData(null);
    setWorkOrderDetail(null);
    setSchedules([]);
    setSelectedScheduleId(null);
    setOkQty(0);
    setNgQty(0);
    form.resetFields();
    form.setFieldsValue({ okQty: 0, ngQty: 0 });
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

          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
              <span className="font-semibold text-slate-600">Người thao tác</span>
              <span className="font-bold text-slate-900">{user?.fullName || user?.username || 'Đang đăng nhập'}</span>
            </div>
            <div className="flex items-center justify-between gap-3 pt-2">
              <span className="font-semibold text-slate-600">Máy sản xuất</span>
              <span className="font-bold text-slate-900">
                {scanData.workCenterName || workOrderDetail?.workCenterName || user?.workCenterName || workCenters.find(wc => wc.id === (scanData.workCenterId ?? workOrderDetail?.workCenterId ?? user?.workCenterId))?.name || (workOrderDetail?.workCenterId || user?.workCenterId ? `Máy #${workOrderDetail?.workCenterId ?? user?.workCenterId}` : 'Đang tải...')}
              </span>
            </div>
          </div>

          {schedules && schedules.length > 1 && (
            <div className="mb-4 p-3 rounded-lg border border-blue-300 bg-blue-50">
              <div className="text-sm font-semibold text-blue-700 mb-2">📋 Danh sách máy sản xuất cho lệnh này</div>
              <div className="space-y-2">
                {schedules.map((schedule: any, idx: number) => (
                  <Button
                    key={schedule.id}
                    type={selectedScheduleId === schedule.id ? "primary" : "default"}
                    className="w-full text-left h-auto py-2"
                    onClick={() => {
                      setSelectedScheduleId(schedule.id);
                      form.setFieldsValue({
                        workCenterId: schedule.workCenterId,
                        workCenterName: schedule.workCenterName || workCenters.find(wc => wc.id === schedule.workCenterId)?.name || `Máy #${schedule.workCenterId}`
                      });
                    }}
                  >
                    <div className="flex justify-between w-full items-center">
                      <span className="font-semibold">Bước {idx + 1}: {schedule.workCenterName || workCenters.find(wc => wc.id === schedule.workCenterId)?.name}</span>
                      <Tag color={schedule.status === 'COMPLETED' ? 'green' : schedule.status === 'IN_PROGRESS' ? 'blue' : 'default'}>
                        {schedule.status}
                      </Tag>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Form form={form} layout="vertical" onFinish={handleReport} size="large">
            <Form.Item name="operatorName" hidden>
              <Input />
            </Form.Item>
            <Form.Item name="workCenterId" hidden>
              <Input />
            </Form.Item>
            <Form.Item name="workCenterName" hidden>
              <Input />
            </Form.Item>

            <Space direction="vertical" size={12} className="w-full">
              <Form.Item name="okQty" initialValue={0} hidden>
                <Input />
              </Form.Item>
              <Form.Item name="ngQty" initialValue={0} hidden>
                <Input />
              </Form.Item>

              {renderQtyPad('okQty', 'pass')}
              {renderQtyPad('ngQty', 'fail')}
            </Space>

            <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-700 text-sm font-semibold">
              Chế độ tap nhanh: dùng các nút +/-/+10/+50, không cần gõ bàn phím khi nhập sản lượng.
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
              className="w-full h-16 text-xl font-black rounded-xl mt-3 bg-blue-700 hover:bg-blue-800"
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
