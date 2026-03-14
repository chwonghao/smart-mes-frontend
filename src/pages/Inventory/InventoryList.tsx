import React, { useEffect, useState } from 'react';
import { Table, Button, Card, message, Modal, Form, InputNumber, Input } from 'antd';
import { SyncOutlined, EditOutlined } from '@ant-design/icons';
import { getInventory, adjustInventory } from '../../services/inventory.service';
// IMPORT THÊM getItems ĐỂ LÀM TỪ ĐIỂN DÒ TÊN
import { getItems } from '../../services/master-data.service'; 

const InventoryList: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]); // Thêm state lưu từ điển vật tư
  const [loading, setLoading] = useState(false);
  const [adjustModal, setAdjustModal] = useState<{ open: boolean, record?: any }>({ open: false });
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Gọi song song cả API kho và API vật tư
      const [invRes, itemsRes] = await Promise.all([
        getInventory(),
        getItems()
      ]);
      setData(invRes);
      setItems(itemsRes);
    } catch (error) {
      message.error("Lỗi tải dữ liệu kho!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdjust = async (values: any) => {
    try {
      // Tìm đúng ID vật tư bất kể backend đang trả kiểu flat hay lồng nhau
      const targetItemId = adjustModal.record?.itemId || adjustModal.record?.item?.id;
      
      if (!targetItemId) {
        message.error("Không tìm thấy ID Vật tư để điều chỉnh!");
        return;
      }

      await adjustInventory({
        itemId: targetItemId,
        quantity: values.adjustQty,
        reason: values.reason
      });
      message.success("Điều chỉnh kho thành công!");
      setAdjustModal({ open: false });
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error("Lỗi khi điều chỉnh kho!");
    }
  };

  // CẤU HÌNH LẠI CÁC CỘT - BẮT MỌI TRƯỜNG HỢP DỮ LIỆU
  const columns = [
    { 
      title: 'Mã Vật tư', 
      key: 'itemCode', 
      className: 'font-semibold text-blue-600',
      render: (_: any, record: any) => {
        if (record.itemCode) return record.itemCode;
        if (record.item?.itemCode) return record.item.itemCode;
        if (record.itemId) {
          const matched = items.find(i => i.id === record.itemId);
          return matched ? matched.itemCode : 'N/A';
        }
        return 'N/A';
      }
    },
    { 
      title: 'Tên Vật tư', 
      key: 'itemName',
      render: (_: any, record: any) => {
        if (record.itemName) return record.itemName;
        if (record.item?.itemName) return record.item.itemName;
        if (record.itemId) {
          const matched = items.find(i => i.id === record.itemId);
          return matched ? matched.itemName : 'Chưa xác định';
        }
        return 'Chưa xác định';
      }
    },
    { 
      title: 'Tồn kho hiện tại', 
      key: 'onHandQuantity',
      render: (_: any, record: any) => {
        // Lấy đúng Đơn vị tính (unit) thay vì (unitOfMeasure)
        let unit = record.unit || record.item?.unit;
        if (!unit && record.itemId) {
          const matched = items.find(i => i.id === record.itemId);
          if (matched) unit = matched.unit;
        }
        return (
          <span className="font-bold text-blue-600 text-lg">
            {record.onHandQuantity} <span className="text-gray-500 text-sm font-normal">{unit || ''}</span>
          </span>
        );
      }
    },
    { 
      title: 'Lần cập nhật cuối', 
      dataIndex: 'updatedAt', 
      key: 'updatedAt',
      render: (val: any) => val ? new Date(val).toLocaleString('vi-VN') : 'Chưa cập nhật'
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Button 
          type="link" 
          icon={<EditOutlined />} 
          onClick={() => setAdjustModal({ open: true, record })}
        >
          Điều chỉnh
        </Button>
      )
    }
  ];

  // Logic lấy tên hiển thị cho Modal Title
  const getModalItemName = () => {
    if (!adjustModal.record) return '';
    const rec = adjustModal.record;
    if (rec.itemName) return rec.itemName;
    if (rec.item?.itemName) return rec.item.itemName;
    const matched = items.find(i => i.id === rec.itemId);
    return matched ? matched.itemName : '';
  };

  return (
    <Card 
      title={<span className="text-xl font-bold">Quản lý Tồn Kho</span>}
      extra={<Button icon={<SyncOutlined />} onClick={fetchData} loading={loading}>Làm mới</Button>}
    >
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} />

      <Modal 
        title={`Điều chỉnh kho: ${getModalItemName()}`} 
        open={adjustModal.open} 
        onCancel={() => setAdjustModal({ open: false })}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleAdjust}>
          <div className="mb-4 text-gray-500">
            Tồn kho hiện tại: <strong className="text-black text-lg">{adjustModal.record?.onHandQuantity}</strong>
          </div>
          <Form.Item 
            name="adjustQty" 
            label="Số lượng điều chỉnh (+ để nhập kho, - để xuất kho)" 
            rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}
          >
            <InputNumber className="w-full" placeholder="VD: 50 hoặc -10" />
          </Form.Item>
          <Form.Item name="reason" label="Lý do điều chỉnh" rules={[{ required: true, message: 'Vui lòng nhập lý do!' }]}>
            <Input placeholder="VD: Nhập hàng mới, Xuất bù hao hụt..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default InventoryList;