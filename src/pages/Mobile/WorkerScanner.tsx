import React, { useEffect, useState } from 'react';
import { Card, Button, Form, Input, message, Typography, Divider, Tag, Progress, Space } from 'antd';
import { QrcodeOutlined, LeftOutlined, CheckOutlined } from '@ant-design/icons';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { reportProgress, getWorkOrderWithSchedules } from '../../services/production.service';
import { getWorkCenters } from '../../services/master-data.service';
import { useAuth } from '../../contexts/AuthContext';

// --- BẮT ĐẦU: IndexedDB Helper cho Offline Sync ---
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SmartMES_OfflineDB', 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('offline_reports')) {
        db.createObjectStore('offline_reports', { keyPath: 'requestId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveReportOffline = async (report: any) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_reports', 'readwrite');
    tx.objectStore('offline_reports').put(report);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

const getOfflineReports = async (): Promise<any[]> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction('offline_reports', 'readonly');
    const req = tx.objectStore('offline_reports').getAll();
    req.onsuccess = () => resolve(req.result);
  });
};

const deleteOfflineReport = async (requestId: string) => {
  const db = await initDB();
  const tx = db.transaction('offline_reports', 'readwrite');
  tx.objectStore('offline_reports').delete(requestId);
};
// --- KẾT THÚC: IndexedDB Helper ---

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
  // Helpers for throughput / step logic
  const getCurrentScheduleIndex = () => {
    if (!schedules || schedules.length === 0) return -1;
    const wcId = user?.workCenterId ?? form.getFieldValue('workCenterId');
    return schedules.findIndex(s => s.workCenterId === wcId || s.workCenterId === Number(wcId));
  };

  const isPrevReady = () => {
    const idx = getCurrentScheduleIndex();
    if (idx <= 0) return true;
    const prev = schedules[idx - 1];
    const prevTotal = prev?.actualQuantity ?? prev?.processedQuantity ?? prev?.outputQuantity ?? prev?.passedQuantity ?? 0;
    if (!prev || prevTotal === 0) return false;
    if (prev.status && prev.status !== 'COMPLETED') return false;
    return true;
  };

  const getAllowedThroughput = () => {
    if (!schedules || schedules.length === 0) return workOrderDetail?.plannedQuantity ?? Infinity;
    const idx = getCurrentScheduleIndex();
    if (idx === -1) return workOrderDetail?.plannedQuantity ?? Infinity;
    if (idx === 0) return workOrderDetail?.plannedQuantity ?? Infinity;
    const prev = schedules[idx - 1];
    const prevTotal = prev?.actualQuantity ?? prev?.processedQuantity ?? prev?.outputQuantity ?? prev?.passedQuantity ?? 0;
    const prevNg = prev?.ngQuantity ?? 0;
    return Math.max(0, prevTotal - prevNg);
  };

  const adjustQty = (field: 'okQty' | 'ngQty', delta: number) => {
    const currentValue = field === 'okQty' ? okQty : ngQty;
    const otherValue = field === 'okQty' ? ngQty : okQty;

    // compute allowed throughput based on previous step (or planned for first step)
    const allowed = getAllowedThroughput();

    let nextValue = Math.max(0, currentValue + delta);

    if (typeof allowed === 'number' && isFinite(allowed)) {
      const maxForField = Math.max(0, allowed - otherValue);
      if (nextValue > maxForField) nextValue = maxForField;
    }

    if (field === 'okQty') setOkQty(nextValue);
    else setNgQty(nextValue);

    form.setFieldsValue({ [field]: nextValue });
  };

  const renderQtyPad = (field: 'okQty' | 'ngQty', tone: 'pass' | 'fail') => {
    const isPass = tone === 'pass';
    const value = getQtyValue(field);
    const allowed = getAllowedThroughput();
    const prevReady = isPrevReady();
    const otherValue = field === 'okQty' ? ngQty : okQty;
    const remaining = typeof allowed === 'number' && isFinite(allowed) ? Math.max(0, allowed - otherValue) : Infinity;

    return (
      <div className={`rounded-xl border-2 p-4 ${isPass ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'}`}>
        <div className={`mb-3 text-base font-bold ${isPass ? 'text-green-700' : 'text-red-700'}`}>
          {isPass ? 'SẢN LƯỢNG ĐẠT (PASS)' : 'HÀNG LỖI (FAIL/NG)'}
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Button
            onClick={() => adjustQty(field, -1)}
            disabled={!prevReady || value <= 0}
            style={{ height: 80, width: 96, fontSize: 32, padding: 0 }}
            className="rounded-xl"
          >
            -
          </Button>

          <div className={`flex-1 h-20 rounded-lg border text-center text-4xl font-black flex items-center justify-center ${isPass ? 'border-green-700 text-green-700 bg-white' : 'border-red-700 text-red-700 bg-white'}`}>
            {value}
          </div>

          <Button
            onClick={() => adjustQty(field, 1)}
            disabled={!prevReady || (typeof remaining === 'number' && remaining <= 0)}
            style={{ height: 80, width: 96, fontSize: 32, padding: 0 }}
            className="rounded-xl"
          >
            +
          </Button>
        </div>

        <div className="grid grid-cols-5 gap-2">
          <Button
            onClick={() => { if (prevReady) { if (field === 'okQty') { setOkQty(0); form.setFieldsValue({ okQty: 0 }); } else { setNgQty(0); form.setFieldsValue({ ngQty: 0 }); } } }}
            disabled={!prevReady}
            style={{ height: 56, fontSize: 16, padding: '0 12px' }}
            className="rounded-md font-bold"
          >
            0
          </Button>

          <Button style={{ height: 56, fontSize: 16, padding: '0 4px' }} className="rounded-md font-bold" onClick={() => adjustQty(field, 5)} disabled={!prevReady || (typeof remaining === 'number' && remaining <= 0)}>+5</Button>
          <Button style={{ height: 56, fontSize: 16, padding: '0 4px' }} className="rounded-md font-bold" onClick={() => adjustQty(field, 10)} disabled={!prevReady || (typeof remaining === 'number' && remaining <= 0)}>+10</Button>
          <Button style={{ height: 56, fontSize: 16, padding: '0 4px' }} className="rounded-md font-bold" onClick={() => adjustQty(field, 20)} disabled={!prevReady || (typeof remaining === 'number' && remaining <= 0)}>+20</Button>
          <Button style={{ height: 56, fontSize: 16, padding: '0 4px' }} className="rounded-md font-bold" onClick={() => adjustQty(field, 50)} disabled={!prevReady || (typeof remaining === 'number' && remaining <= 0)}>+50</Button>
        </div>

        {typeof remaining === 'number' && isFinite(remaining) && (
          <div className="text-xs text-gray-600 mt-2">Tối đa còn được nhập: {remaining}</div>
        )}

        {!prevReady && (
          <div className="text-xs text-red-600 mt-2">Bước trước chưa hoàn thành hoặc không có sản phẩm. Không thể nhập.</div>
        )}
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

    // Chỉ gán khi form chưa có máy nào, tránh ghi đè nếu đã chọn máy thủ công
    if (!form.getFieldValue('workCenterId')) {
      form.setFieldsValue({
        workCenterId: user.workCenterId,
        workCenterName: user.workCenterName || workCenters.find(wc => wc.id === user.workCenterId)?.name || `Máy #${user.workCenterId}`
      });
    }
  }, [user, workCenters, form]);

  useEffect(() => {
    const currentWcId = form.getFieldValue('workCenterId');
    const workCenterId = currentWcId ?? scanData?.workCenterId ?? workOrderDetail?.workCenterId ?? user?.workCenterId;

    const currentWcName = form.getFieldValue('workCenterName');
    const workCenterName = currentWcName ?? scanData?.workCenterName ?? workOrderDetail?.workCenterName ?? user?.workCenterName;

    if (workCenterId) {
      form.setFieldsValue({ workCenterId });
    }

    if (workCenterName || workCenterId) {
      form.setFieldsValue({ workCenterName: workCenterName || workCenters.find(wc => Number(wc.id) === Number(workCenterId))?.name || `Máy #${workCenterId}` });
    }
  }, [scanData, workOrderDetail, workCenters, user, form]);

  // Hàm fetch chi tiết work order và danh sách máy sản xuất
  const fetchWorkOrderDetail = async (orderId: number) => {
    try {
      const { workOrder, schedules } = await getWorkOrderWithSchedules(orderId);
      setWorkOrderDetail(workOrder);
      setSchedules(schedules);

      const currentWorkCenterId = form.getFieldValue('workCenterId');

      // Nếu chỉ có 1 máy, tự động chọn máy đó
      if (schedules && schedules.length === 1) {
        const firstSchedule = schedules[0];
        const workCenterId = firstSchedule.workCenterId;
        const workCenterName = firstSchedule.workCenterName || workCenters.find(wc => Number(wc.id) === Number(workCenterId))?.name || `Máy #${workCenterId}`;

        setSelectedScheduleId(firstSchedule.id);
        form.setFieldsValue({ workCenterId, workCenterName });
      } else if (schedules && schedules.length > 1) {
        // Ưu tiên: Máy đang chọn trong form -> Máy được gán cho user -> Máy đầu tiên của lệnh
        const currentSchedule = currentWorkCenterId ? schedules.find(s => Number(s.workCenterId) === Number(currentWorkCenterId)) : undefined;
        const assignedSchedule = user?.workCenterId ? schedules.find(schedule => Number(schedule.workCenterId) === Number(user.workCenterId)) : undefined;
        const firstSchedule = currentSchedule || assignedSchedule || schedules[0];
        const workCenterId = firstSchedule.workCenterId;
        const workCenterName = firstSchedule.workCenterName || workCenters.find(wc => Number(wc.id) === Number(workCenterId))?.name || `Máy #${workCenterId}`;

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

  // --- ĐỒNG BỘ DỮ LIỆU KHI CÓ MẠNG TRỞ LẠI ---
  useEffect(() => {
    const syncOfflineData = async () => {
      if (!navigator.onLine) return;
      try {
        const offlineReports = await getOfflineReports();
        if (offlineReports.length > 0) {
          message.info(`Đang đồng bộ ngầm ${offlineReports.length} báo cáo offline...`);
          for (const report of offlineReports) {
            try {
              await reportProgress(
                report.orderId,
                report.okQty,
                report.ngQty,
                report.workCenterId,
                report.defectReason,
                report.operatorName,
                report.requestId // <-- Truyền UUID xuống API
              );
              await deleteOfflineReport(report.requestId);
            } catch (err) {
              console.error("Lỗi đồng bộ gói tin:", err);
            }
          }
          message.success("Đã đồng bộ dữ liệu Offline thành công!");
          if (scanData?.id) fetchWorkOrderDetail(scanData.id);
        }
      } catch (err) {
        console.error("Lỗi truy xuất IndexedDB:", err);
      }
    };

    window.addEventListener('online', syncOfflineData);
    return () => window.removeEventListener('online', syncOfflineData);
  }, [scanData]);

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
      // Validate previous-step readiness and throughput
      const allowed = getAllowedThroughput();
      if (!isPrevReady()) {
        message.error('Bước trước chưa hoàn thành hoặc không có sản phẩm. Không thể gửi báo cáo.');
        setLoading(false);
        return;
      }

      const submitOk = values.okQty ?? okQty ?? 0;
      const submitNg = values.ngQty ?? ngQty ?? 0;
      const totalSubmitting = submitOk + submitNg;

      if (totalSubmitting <= 0) {
        message.error('Vui lòng nhập số lượng trước khi gửi báo cáo.');
        setLoading(false);
        return;
      }

      if (typeof allowed === 'number' && isFinite(allowed) && totalSubmitting > allowed) {
        message.error(`Tổng số lượng (${totalSubmitting}) vượt quá lượng cho phép từ bước trước (${allowed}).`);
        setLoading(false);
        return;
      }

      // 🔑 TẠO UUID CHO REQUEST (Idempotency Key)
      const requestId = crypto.randomUUID();

      // 🔑 TÁCH ONLINE/OFFLINE HANDLING
      if (navigator.onLine) {
        // Mode Online: Gửi ngay lên server
        try {
          await reportProgress(
            scanData.id,
            submitOk,
            submitNg,
            workCenterId,
            values.defectReason,
            operatorName,
            requestId  // <-- Truyền UUID xuống API
          );
          playFeedback('success');
          message.success("ĐÃ GỬI BÁO CÁO THÀNH CÔNG!");
        } catch (err) {
          // Nếu gửi thất bại khi online, vẫn lưu vào IndexedDB để retry sau
          console.warn("Gửi báo cáo thất bại mặc dù online, lưu vào offline queue:", err);
          await saveReportOffline({
            requestId,
            orderId: scanData.id,
            okQty: submitOk,
            ngQty: submitNg,
            workCenterId,
            defectReason: values.defectReason,
            operatorName
          });
          message.warning("Báo cáo đã lưu. Sẽ tự động gửi khi kết nối ổn định.");
          playFeedback('error');
        }
      } else {
        // Mode Offline: Lưu vào IndexedDB
        await saveReportOffline({
          requestId,
          orderId: scanData.id,
          okQty: submitOk,
          ngQty: submitNg,
          workCenterId,
          defectReason: values.defectReason,
          operatorName
        });
        playFeedback('success');
        message.success("Báo cáo lưu offline thành công! Sẽ tự động đồng bộ khi có mạng.");
      }

      // 🔑 QUAN TRỌNG: Refetch chi tiết work order để cập nhật progress trên UI
      await fetchWorkOrderDetail(scanData.id);

      setOkQty(0);
      setNgQty(0);

      // Thay vì form.resetFields() làm mất các trường ẩn (workCenterId, operatorName), chỉ xóa các trường vừa nhập
      form.setFieldsValue({
        okQty: 0,
        ngQty: 0,
        defectReason: undefined
      });
      // Không reset scanData ngay - để hiển thị progress mới được cập nhật
    } catch (error: any) {
      playFeedback('error');
      message.error(error?.message || "Gửi báo cáo thất bại!");
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

    const currentOperator = form.getFieldValue('operatorName');
    const currentWorkCenterId = form.getFieldValue('workCenterId');
    const currentWorkCenterName = form.getFieldValue('workCenterName');
    form.resetFields();
    form.setFieldsValue({
      okQty: 0,
      ngQty: 0,
      operatorName: currentOperator || user?.fullName || user?.username,
      workCenterId: currentWorkCenterId || user?.workCenterId,
      workCenterName: currentWorkCenterName || user?.workCenterName || workCenters.find(wc => Number(wc.id) === Number(user?.workCenterId))?.name || (user?.workCenterId ? `Máy #${user.workCenterId}` : undefined)
    });
  };

  // Tính toán progress (%) từ work order detail
  const calculateProgress = () => {
    if (!workOrderDetail) return 0;
    const planned = workOrderDetail.plannedQuantity || 0;
    const actual = workOrderDetail.actualQuantity || 0;
    return planned > 0 ? Math.round((actual / planned) * 100) : 0;
  };

  const canSubmitReport = isPrevReady() && (okQty + ngQty > 0);

  // Compute displayed work center name, prioritizing form selection, scan data, work order, then user assignment
  const getDisplayedWorkCenterName = () => {
    const selectedName = form.getFieldValue('workCenterName');
    if (selectedName) return selectedName;

    const scannedName = scanData?.workCenterName || workOrderDetail?.workCenterName;
    if (scannedName) return scannedName;

    const selectedId = form.getFieldValue('workCenterId') || user?.workCenterId;
    if (selectedId) {
      const found = workCenters.find(wc => Number(wc.id) === Number(selectedId));
      return found?.name || user?.workCenterName || `Máy #${selectedId}`;
    }

    return 'Chưa được gán (Vui lòng tải lại hoặc chọn máy)';
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
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-left">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-600">Trạm máy hiện tại</span>
                <span className="font-bold text-slate-900">{getDisplayedWorkCenterName()}</span>
              </div>
            </div>

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
                <span className="w-30 text-sm font-semibold text-gray-700">Tiến độ</span>
                <Progress
                  percent={calculateProgress()}
                  size="small"
                  status={workOrderDetail.status === 'COMPLETED' ? 'success' : 'active'}
                  showInfo={false}
                  className='w-50'
                />
                <span className="pl-4 w-10 text-lg font-bold text-blue-600">{calculateProgress()}%</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Đã làm: {workOrderDetail.actualQuantity || 0} / Mục tiêu: {workOrderDetail.plannedQuantity || 0}
              </div>
            </div>
          )}

          {/* <Divider className="my-3" /> */}

          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
              <span className="font-semibold text-slate-600">Người thao tác</span>
              <span className="font-bold text-slate-900">{user?.fullName || user?.username || 'Đang đăng nhập'}</span>
            </div>
            <div className="flex items-center justify-between gap-3 pt-2">
              <span className="font-semibold text-slate-600">Máy sản xuất</span>
              <span className="font-bold text-slate-900">{getDisplayedWorkCenterName()}</span>
            </div>
          </div>

          {schedules && schedules.length > 1 && (() => {
            const userIdx = getCurrentScheduleIndex();
            if (userIdx === -1) {
              return (
                <div className="mb-4 p-3 rounded-lg border border-blue-300 bg-blue-50">
                  <div className="text-sm font-semibold text-blue-700 mb-2">Danh sách máy sản xuất cho lệnh này</div>
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
              );
            }

            // If worker is assigned to a machine in this order, show step-progress for that machine.
            const totalSteps = schedules.length;
            const stepIndex = userIdx; // 0-based
            const percent = Math.round(((stepIndex + 1) / totalSteps) * 100);
            const currentSchedule = schedules[stepIndex];
            return (
              <div className="mb p-3 rounded-lg border border-blue-300 bg-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-blue-700">Bước {stepIndex + 1} / {totalSteps}</div>
                  {/* <div className="text-sm font-semibold text-blue-700">Tiến độ bước: {percent}%</div> */}
                  <Progress
                    style={{ width: '60%' }}
                    percent={percent} size="small" status={currentSchedule?.status === 'COMPLETED' ? 'success' : 'active'}
                    showInfo={false}
                  />
                </div>

                {/* <div className="text-xs text-gray-500 mt-2">Bước: {stepActual || 0} / Mục tiêu bước: {stepPlanned || 0}</div> */}
              </div>
            );
          })()}

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

            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.ngQty !== curr.ngQty}>
              {({ getFieldValue }) => getFieldValue('ngQty') > 0 ? (
                <Form.Item name="defectReason" label={<span className="font-bold text-red-500">Lý do lỗi (Bắt buộc)</span>} rules={[{ required: true, message: 'Vui lòng nhập lý do lỗi!' }]}>
                  <Input.TextArea rows={2} placeholder="Nhập tình trạng lỗi..." className="rounded-lg" />
                </Form.Item>
              ) : null}
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              icon={<CheckOutlined />}
              loading={loading}
              disabled={!canSubmitReport}
              className="w-full text-2xl font-black rounded-2xl mt-3 bg-blue-700 hover:bg-blue-800"
              style={{ height: 80, fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}
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
