import React, { useEffect, useState } from 'react';
import { Card, Tabs, Form, Input, Button, Switch, InputNumber, message, Divider, Typography } from 'antd';
// Đã thay thế FactoryOutlined thành BankOutlined
import { SaveOutlined, SettingOutlined, BankOutlined, SafetyCertificateOutlined, BellOutlined } from '@ant-design/icons';
import { getSystemSettings, saveSystemSettings } from '../../services/setting.service';
import { useSettings } from '../../contexts/SettingContext';

const { Title, Text } = Typography;

const SettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { refreshSettings } = useSettings();

  // 1. Tải cấu hình khi mở trang
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await getSystemSettings();
        
        // Chuyển đổi chuỗi "true"/"false" từ DB thành boolean cho nút Switch
        const formattedData = {
          ...res,
          AUTO_CLOSE_WO: res.AUTO_CLOSE_WO === 'true',
          ENABLE_WS: res.ENABLE_WS === 'true',
          ENABLE_EMAIL: res.ENABLE_EMAIL === 'true',
        };
        
        form.setFieldsValue(formattedData);
      } catch (error) {
        message.error("Không thể tải cấu hình hệ thống");
      } finally {
        setFetching(false);
      }
    };
    fetchSettings();
  }, [form]);

  // 2. Lưu cấu hình
  const onSave = async (values: any) => {
    setLoading(true);
    try {
      // Ép kiểu các giá trị boolean/number thành string trước khi gửi xuống DB
      const payload: Record<string, string> = {};
      Object.keys(values).forEach(key => {
        payload[key] = String(values[key] ?? ""); 
      });

      await saveSystemSettings(payload);
      await refreshSettings();
      message.success("Hệ thống đã được cập nhật cấu hình mới!");
    } catch (error) {
      message.error("Lưu cài đặt thất bại! Hãy kiểm tra quyền truy cập.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Card 
        loading={fetching}
        title={
          <div className="flex items-center gap-2">
            <SettingOutlined className="text-blue-600 text-2xl" />
            <Title level={4} className="m-0">Cấu hình Hệ thống MES</Title>
          </div>
        }
        extra={
          <Button type="primary" icon={<SaveOutlined />} onClick={() => form.submit()} loading={loading}>
            Lưu thay đổi
          </Button>
        }
        className="shadow-sm rounded-xl"
      >
        <Form form={form} layout="vertical" onFinish={onSave} size="large">
          <Tabs tabPosition="left" items={[
            {
              key: 'factory',
              label: <span className="font-medium"><BankOutlined /> Nhà máy & Công ty</span>,
              children: (
                <div className="px-6 py-2 max-w-2xl">
                  {/* Đã ép kiểu orientation={"left" as any} để vượt qua kiểm tra TypeScript */}
                  <Divider orientation={"left" as any} className="text-gray-400">Định danh doanh nghiệp</Divider>
                  <Form.Item name="FACTORY_NAME" label="Tên nhà máy hiển thị">
                    <Input placeholder="VD: SmartMES Vietnam Factory" />
                  </Form.Item>
                  <Form.Item name="FACTORY_ADDRESS" label="Địa chỉ xưởng">
                    <Input.TextArea rows={3} placeholder="Số nhà, Đường, Quận/Huyện, Tỉnh/TP..." />
                  </Form.Item>
                  <Form.Item name="TENANT_ID" label="Mã định danh hệ thống (Tenant ID)" tooltip="Mã này dùng để phân biệt dữ liệu nếu chạy đa chi nhánh">
                    <Input disabled placeholder="Sẽ do IT thiết lập" />
                  </Form.Item>
                </div>
              )
            },
            {
              key: 'production',
              label: <span className="font-medium"><SafetyCertificateOutlined /> Quy tắc Sản xuất</span>,
              children: (
                <div className="px-6 py-2 max-w-2xl">
                  <Divider orientation={"left" as any} className="text-gray-400">Kiểm soát Chất lượng (QC)</Divider>
                  <Form.Item name="MAX_NG_RATE" label="Tỷ lệ hàng lỗi (NG) tối đa cho phép (%)" tooltip="Hệ thống báo động đỏ nếu Lệnh sản xuất vượt ngưỡng này">
                    <InputNumber min={0} max={100} className="w-full" placeholder="VD: 5" />
                  </Form.Item>
                  <Form.Item name="AUTO_CLOSE_WO" label="Tự động đóng Lệnh sản xuất khi hoàn thành" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  
                  <Divider orientation={"left" as any} className="text-gray-400">Quản lý Kho</Divider>
                  <Form.Item name="LOW_STOCK_ALERT" label="Ngưỡng cảnh báo tồn kho thấp (đơn vị)">
                    <InputNumber min={1} className="w-full" placeholder="VD: 100" />
                  </Form.Item>
                </div>
              )
            },
            {
              key: 'notifications',
              label: <span className="font-medium"><BellOutlined /> Thông báo & Giao tiếp</span>,
              children: (
                <div className="px-6 py-2 max-w-2xl">
                  <Divider orientation={"left" as any} className="text-gray-400">Kênh truyền tải</Divider>
                  <Form.Item name="ENABLE_WS" label="Bật thông báo Real-time (WebSocket) tại xưởng" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item name="ENABLE_EMAIL" label="Gửi báo cáo tổng hợp cuối ngày qua Email" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item name="ADMIN_EMAIL" label="Email nhận cảnh báo sự cố máy móc">
                    <Input placeholder="admin@smartmes.vn" />
                  </Form.Item>
                </div>
              )
            }
          ]} />
        </Form>
      </Card>
      
      <div className="mt-6 text-center">
        <Text type="secondary" className="text-xs">
          SmartMES Platform v1.0.0 | Server Time: {new Date().toLocaleString('vi-VN')}
        </Text>
      </div>
    </div>
  );
};

export default SettingsPage;