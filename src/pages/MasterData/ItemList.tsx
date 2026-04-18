import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Card, Space, message, Modal, Form, Input, Select } from 'antd';
import { PlusOutlined, ReloadOutlined, ImportOutlined } from '@ant-design/icons';
import { getItems, createItem } from '../../services/master-data.service';
import type { ItemMaster } from '../../types/master-data.type';
import ExcelImportModal from '../../components/ExcelImportModal';

const ItemList: React.FC = () => {
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res: any = await getItems();
      // 🛡️ LỚP PHÒNG THỦ: Lọc lấy mảng ruột để Ant Design Table không bị Crash
      const dataArray = Array.isArray(res) ? res : (res?.content || []);
      setItems(dataArray);
    } catch (error) {
      message.error("Lỗi tải danh sách sản phẩm/vật tư!");
    } finally {
      setLoading(false);
    };
  };

  useEffect(() => {
    fetchData();
  }, []);
    const handleImportItems = async (data: any[]) => {
      try {
        // Map Excel columns to API format
        const itemsToImport = data.map((row: any) => ({
          itemCode: row['Mã SP'] || row['itemCode'] || '',
          itemName: row['Tên SP'] || row['itemName'] || '',
          itemType: row['Phân loại'] || row['itemType'] || 'RAW_MATERIAL',
          unit: row['Đơn vị tính'] || row['unit'] || '',
          description: row['Ghi chú'] || row['description'] || ''
        }));

        // Validate data
        const validItems = itemsToImport.filter(item => item.itemCode && item.itemName);
        if (validItems.length === 0) {
          throw new Error('Không có dữ liệu hợp lệ để nhập!');
        }

        // Call API to import
        await Promise.all(validItems.map(item => createItem(item)));
      
        // Refresh data
        await fetchData();
      } catch (error: any) {
        throw new Error(error.message || 'Lỗi nhập dữ liệu từ Excel!');
      }
    };

  const handleCreate = async (values: any) => {
    try {
      await createItem(values);
      message.success("Thêm mới thành công!");
      setIsModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error("Lỗi khi thêm mới!");
    }
  };

  const renderItemType = (type: string) => {
    switch (type) {
      case 'RAW_MATERIAL': return <Tag color="orange">Nguyên vật liệu</Tag>;
      case 'SEMI_FINISHED': return <Tag color="blue">Bán thành phẩm</Tag>;
      case 'FINISHED_GOOD': return <Tag color="green">Thành phẩm</Tag>;
      default: return <Tag>{type}</Tag>;
    }
  };

  const columns = [
    { title: 'Mã (Code)', dataIndex: 'itemCode', key: 'itemCode', className: 'font-semibold text-blue-600' },
    { title: 'Tên Vật tư / Sản phẩm', dataIndex: 'itemName', key: 'itemName' },
    { title: 'Phân loại', dataIndex: 'itemType', key: 'itemType', render: renderItemType },
    { title: 'Đơn vị tính', dataIndex: 'unit', key: 'unit' },
    { title: 'Mô tả', dataIndex: 'description', key: 'description' },
  ];

  return (
    <Card 
      className="dark:bg-slate-800"
      title={<span className="text-xl font-bold dark:text-gray-100">Danh mục Sản phẩm & Vật tư</span>}
      extra={
        <Space>
          <Button icon={<ImportOutlined />} onClick={() => setIsImportModalOpen(true)}>Nhập Excel</Button>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Làm mới</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Thêm mới</Button>
        </Space>
      }
    >
      <Table 
        columns={columns} 
        dataSource={items} 
        rowKey="id" 
        loading={loading}
        className="dark:bg-slate-700"
      />

      <Modal 
        title="Thêm Mới Sản Phẩm / Vật Tư" 
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)} 
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="itemCode" label="Mã SP/Vật tư" rules={[{ required: true, message: 'Vui lòng nhập mã!' }]}>
            <Input placeholder="VD: RM-001, FG-100..." />
          </Form.Item>
          
          <Form.Item name="itemName" label="Tên SP/Vật tư" rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}>
            <Input placeholder="VD: Gỗ Sồi, Bàn làm việc..." />
          </Form.Item>

          <Form.Item name="itemType" label="Phân loại" rules={[{ required: true, message: 'Vui lòng chọn phân loại!' }]}>
            <Select placeholder="-- Chọn phân loại --">
              <Select.Option value="RAW_MATERIAL">Nguyên vật liệu (Mua ngoài)</Select.Option>
              <Select.Option value="SEMI_FINISHED">Bán thành phẩm (Sản xuất dở dang)</Select.Option>
              <Select.Option value="FINISHED_GOOD">Thành phẩm (Bán cho khách)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="unit" label="Đơn vị tính (UOM)" rules={[{ required: true, message: 'Vui lòng nhập ĐVT!' }]}>
            <Input placeholder="VD: Cái, Kg, Lít, Mét..." />
          </Form.Item>

          <Form.Item name="description" label="Ghi chú thêm">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

        <ExcelImportModal
          open={isImportModalOpen}
          title="Nhập Sản phẩm & Vật tư từ Excel"
          columns={[
            { title: 'Mã SP', dataIndex: 'Mã SP', key: 'itemCode' },
            { title: 'Tên SP', dataIndex: 'Tên SP', key: 'itemName' },
            { title: 'Phân loại', dataIndex: 'Phân loại', key: 'itemType' },
            { title: 'Đơn vị tính', dataIndex: 'Đơn vị tính', key: 'unit' },
            { title: 'Ghi chú', dataIndex: 'Ghi chú', key: 'description' },
          ]}
          requiredFields={['Mã SP', 'Tên SP']}
          onImport={handleImportItems}
          onCancel={() => setIsImportModalOpen(false)}
        />
    </Card>
  );
};

export default ItemList;