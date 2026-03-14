import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Space, message, Modal, Form, InputNumber, Input } from 'antd';
import { SyncOutlined, EditOutlined } from '@ant-design/icons';
import { getInventory, adjustInventory } from '../../services/inventory.service';

const InventoryList: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adjustModal, setAdjustModal] = useState<{ open: boolean, record?: any }>({ open: false });
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getInventory();
      setData(res);
    } catch (error) {
      message.error("Lỗi tải dữ liệu kho!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdjust = async (values: any) => {
    try {
      await adjustInventory({
        itemId: adjustModal.record.item.id,
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

  const columns = [
    { title: 'Mã Vật tư', dataIndex: ['item', 'itemCode'], key: 'itemCode', className: 'font-semibold' },
    { title: 'Tên Vật tư', dataIndex: ['item', 'itemName'], key: 'itemName' },
    { 
      title: 'Tồn kho hiện tại', 
      key: 'onHandQuantity',
      render: (_: any, record: any) => (
        <span className="font-bold text-blue-600 text-lg">
          {record.onHandQuantity} {record.item?.unitOfMeasure}
        </span>
      )
    },
    { title: 'Lần cập nhật cuối', dataIndex: 'updatedAt', key: 'updatedAt' },
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

  return (
    <Card 
      title={<span className="text-xl font-bold">Quản lý Tồn Kho</span>}
      extra={<Button icon={<SyncOutlined />} onClick={fetchData} loading={loading}>Làm mới</Button>}
    >
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} />

      <Modal 
        title={`Điều chỉnh kho: ${adjustModal.record?.item?.itemName}`} 
        open={adjustModal.open} 
        onCancel={() => setAdjustModal({ open: false })}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleAdjust}>
          <div className="mb-4 text-gray-500">
            Tồn kho hiện tại: <strong className="text-black">{adjustModal.record?.onHandQuantity}</strong>
          </div>
          <Form.Item 
            name="adjustQty" 
            label="Số lượng điều chỉnh (Nhập số Âm để trừ kho, số Dương để cộng thêm)" 
            rules={[{ required: true }]}
          >
            <InputNumber className="w-full" placeholder="VD: 50 hoặc -10" />
          </Form.Item>
          <Form.Item name="reason" label="Lý do điều chỉnh" rules={[{ required: true }]}>
            <Input placeholder="VD: Nhập hàng mới, Xuất bù hao hụt..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default InventoryList;