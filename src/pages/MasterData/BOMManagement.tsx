import React, { useEffect, useState } from 'react';
import { Table, Button, Card, message, Drawer, Form, InputNumber, Select, Grid } from 'antd';
import { PlusOutlined, ApartmentOutlined } from '@ant-design/icons';
import { getItems, getBomsByItem, createBom } from '../../services/master-data.service';

const { useBreakpoint } = Grid;

const BOMManagement: React.FC = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [items, setItems] = useState<any[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<number | undefined>();
  const [boms, setBoms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    getItems().then(setItems).catch(() => message.error("Lỗi tải danh sách sản phẩm"));
  }, []);

  // Lấy danh sách BOM khi người dùng chọn 1 sản phẩm
  useEffect(() => {
    if (selectedParentId) {
      setLoading(true);
      getBomsByItem(selectedParentId)
        .then(setBoms)
        .catch(() => message.error("Lỗi tải định mức vật tư"))
        .finally(() => setLoading(false));
    } else {
      setBoms([]);
    }
  }, [selectedParentId]);

  const handleAddBom = async (values: any) => {
    try {
      await createBom({ ...values, parentItemId: selectedParentId });
      message.success("Thêm thành phần thành công!");
      setIsModalOpen(false);
      form.resetFields();
      if (selectedParentId) {
        const newData = await getBomsByItem(selectedParentId);
        setBoms(newData);
      }
    } catch (error) {
      message.error("Lỗi khi thêm định mức!");
    }
  };

  const columns = [
    { 
      title: 'Thành phần (Vật tư con)', 
      key: 'childItemName',
      render: (_: any, record: any) => {
        if (record.childItemName) return record.childItemName;
        if (record.childItem?.itemName) return record.childItem.itemName;
        
        if (record.childItemId) {
          const matchedItem = items.find(i => i.id === record.childItemId);
          return matchedItem ? matchedItem.itemName : 'Chưa xác định';
        }
        return 'Chưa xác định';
      }
    },
    { 
      title: 'Mã Vật tư', 
      key: 'childItemCode',
      render: (_: any, record: any) => {
        if (record.childItemCode) return record.childItemCode;
        if (record.childItem?.itemCode) return record.childItem.itemCode;
        
        if (record.childItemId) {
          const matchedItem = items.find(i => i.id === record.childItemId);
          return matchedItem ? matchedItem.itemCode : 'N/A';
        }
        return 'N/A';
      }
    },
    { title: 'Số lượng cần dùng', dataIndex: 'quantity', key: 'quantity', render: (val: number) => <span className="font-bold text-blue-600">{val}</span> },
    { title: 'Tỷ lệ hao hụt (Scrap %)', dataIndex: 'scrapFactor', key: 'scrapFactor', render: (val: number) => `${val * 100}%` },
  ];

  return (
    <Card title={<span className="text-xl font-bold"><ApartmentOutlined className="mr-2"/> Cấu trúc Sản phẩm (BOM)</span>}>
      <div className="mb-6 flex items-center gap-4 bg-gray-50 p-4 rounded-md border border-gray-200">
        <span className="font-semibold text-gray-700">Chọn Thành Phẩm:</span>
        <Select 
          showSearch
          className="w-1/2"
          placeholder="Gõ tên hoặc mã sản phẩm để xem BOM..."
          value={selectedParentId}
          onChange={setSelectedParentId}
          optionFilterProp="children"
        >
          {items.map(item => (
            <Select.Option key={item.id} value={item.id}>[{item.itemCode}] {item.itemName}</Select.Option>
          ))}
        </Select>
      </div>

      {selectedParentId && (
        <>
          <div className="mb-4">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Thêm Vật tư vào Công thức</Button>
          </div>
          <Table
            columns={columns}
            dataSource={boms}
            rowKey="id"
            loading={loading}
            pagination={false}
            bordered
            sticky
            scroll={{ x: 'max-content', y: 520 }}
          />
        </>
      )}

      <Drawer
        title="Thêm Thành Phần Vật Tư"
        open={isModalOpen}
        width={isMobile ? '96vw' : 720}
        onClose={() => setIsModalOpen(false)}
        extra={<Button type="primary" onClick={() => form.submit()}>Lưu</Button>}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleAddBom}>
          <Form.Item name="childItemId" label="Chọn Vật tư con" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children">
              {items.filter(i => i.id !== selectedParentId).map(item => (
                <Select.Option key={item.id} value={item.id}>[{item.itemCode}] {item.itemName}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="quantity" label="Số lượng cần dùng (cho 1 đơn vị SP)" rules={[{ required: true }]}>
            <InputNumber min={0.01} step={0.01} className="w-full" />
          </Form.Item>
          <Form.Item name="scrapFactor" label="Tỷ lệ hao hụt (0.01 = 1%)" initialValue={0}>
            <InputNumber min={0} max={1} step={0.01} className="w-full" />
          </Form.Item>
        </Form>
      </Drawer>
    </Card>
  );
};

export default BOMManagement;