import React, { useEffect, useState } from 'react';
import { Table, Button, Card, message, Drawer, Form, InputNumber, Select, Input, Tag, Segmented, Grid } from 'antd';
import { PlusOutlined, NodeIndexOutlined } from '@ant-design/icons';
import { createRouting, getItems, getRoutingsByItem, getWorkCenters } from '../../services/master-data.service';
import RoutingVisualBuilder from '../../components/master-data/RoutingVisualBuilder';

type ViewMode = 'TABLE' | 'VISUAL';
const { useBreakpoint } = Grid;

const RoutingManagement: React.FC = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [items, setItems] = useState<any[]>([]);
  const [workCenters, setWorkCenters] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>('TABLE');
  
  const [routings, setRoutings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Tải danh sách Sản phẩm và Máy móc khi mới vào trang
  useEffect(() => {
    Promise.all([getItems(), getWorkCenters()]).then(([itemsData, centersData]) => {
      setItems(itemsData);
      setWorkCenters(centersData as any[]);
    }).catch(() => message.error("Lỗi tải dữ liệu danh mục"));
  }, []);

  const fetchRoutings = async () => {
    if (selectedItemId) {
      setLoading(true);
      getRoutingsByItem(selectedItemId)
        .then((res: any) => setRoutings(res))
        .catch(() => message.error("Lỗi tải quy trình sản xuất"))
        .finally(() => setLoading(false));
    } else {
      setRoutings([]);
    }
  };

  // Tải danh sách Công đoạn (Routing) khi chọn 1 Sản phẩm
  useEffect(() => {
    fetchRoutings();
  }, [selectedItemId]);

  const handleAddRouting = async (values: any) => {
    try {
      const payload = { ...values, itemId: selectedItemId };
      await createRouting(payload);
      message.success("Thêm công đoạn thành công!");
      setIsModalOpen(false);
      form.resetFields();
      
      await fetchRoutings();
    } catch (error) {
      message.error("Lỗi khi thêm công đoạn!");
    }
  };

  const columns = [
    { 
      title: 'Thứ tự (Step)', 
      dataIndex: 'stepNumber', 
      key: 'stepSequence',
      render: (val: number) => <Tag color="blue">Bước {val}</Tag>
    },
    { title: 'Tên Công đoạn', dataIndex: 'operationName', key: 'operationName', className: 'font-bold' },
    { 
      title: 'Thực hiện tại Máy / Trạm', 
      dataIndex: ['workCenter', 'name'], 
      key: 'workCenterName',
      render: (_: any, record: any) => {
        // Trường hợp 1: Backend có trả về sẵn chuỗi workCenterName (Dạng Flat DTO)
        if (record.workCenterName) return record.workCenterName;
        
        // Trường hợp 2: Backend trả về Object lồng nhau (Nested Object)
        if (record.workCenter?.name) return record.workCenter.name;
        
        // Trường hợp 3: Backend CỨNG ĐẦU chỉ trả về workCenterId 
        // -> Ta lấy ID đó đem đi dò trong danh sách Máy móc (workCenters) mà Frontend đã tải sẵn!
        if (record.workCenterId) {
          const matchedWc = workCenters.find(wc => wc.id === record.workCenterId);
          return matchedWc ? matchedWc.name : 'Chưa xác định';
        }

        return 'Chưa xác định';
      }
    },
    { 
      title: 'Thời gian chuẩn (Phút)', 
      dataIndex: 'standardTime', 
      key: 'standardTimeMinutes',
      render: (val: number) => <span className="font-semibold text-green-600">{val} phút</span>
    },
  ];

  return (
    <Card 
      title={<span className="text-xl font-bold"><NodeIndexOutlined className="mr-2"/> Thiết lập Quy trình (Routing)</span>}
      extra={
        <Segmented
          value={viewMode}
          onChange={(val) => setViewMode(val as ViewMode)}
          options={[
            { label: 'Chế độ Bảng', value: 'TABLE' },
            { label: 'Chế độ Kéo thả', value: 'VISUAL' },
          ]}
        />
      }
    >
      
      {/* KHU VỰC CHỌN SẢN PHẨM */}
      <div className="mb-6 flex items-center gap-4 bg-gray-50 p-4 rounded-md border border-gray-200">
        <span className="font-semibold text-gray-700">Chọn Sản Phẩm Cần Thiết Lập:</span>
        <Select 
          showSearch
          className="w-1/2"
          placeholder="Gõ tên hoặc mã sản phẩm..."
          value={selectedItemId}
          onChange={setSelectedItemId}
          optionFilterProp="children"
        >
          {items.map(item => (
            <Select.Option key={item.id} value={item.id}>[{item.itemCode}] {item.itemName}</Select.Option>
          ))}
        </Select>
      </div>

      {selectedItemId && viewMode === 'TABLE' && (
        <>
          <div className="mb-4">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
              Thêm Công đoạn mới
            </Button>
          </div>
          <Table
            columns={columns}
            dataSource={routings}
            rowKey="id"
            loading={loading}
            pagination={false}
            bordered
            sticky
            scroll={{ x: 'max-content', y: 520 }}
          />
        </>
      )}

      {selectedItemId && viewMode === 'VISUAL' && (
        <RoutingVisualBuilder itemId={selectedItemId} onSynced={fetchRoutings} />
      )}

      {/* POPUP THÊM CÔNG ĐOẠN */}
      <Drawer
        title="Thêm Công Đoạn Sản Xuất"
        open={isModalOpen}
        width={isMobile ? '96vw' : 720}
        onClose={() => setIsModalOpen(false)}
        extra={<Button type="primary" onClick={() => form.submit()}>Lưu</Button>}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleAddRouting}>
          
          <Form.Item name="stepNumber" label="Thứ tự bước (1, 2, 3...)" rules={[{ required: true }]}>
            <InputNumber min={1} className="w-full" placeholder="VD: 1" />
          </Form.Item>

          <Form.Item name="operationName" label="Tên công đoạn" rules={[{ required: true }]}>
            <Input placeholder="VD: Cắt gỗ, Phay CNC, Phun sơn..." />
          </Form.Item>

          <Form.Item name="workCenterId" label="Giao cho Máy / Trạm làm việc" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children" placeholder="Chọn máy móc xử lý">
              {workCenters.map(wc => (
                <Select.Option key={wc.id} value={wc.id}>{wc.name} ({wc.code})</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="standardTime" label="Thời gian làm chuẩn (Phút / 1 SP)" rules={[{ required: true }]}>
            <InputNumber min={0.1} step={0.1} className="w-full" placeholder="VD: 15.5" />
          </Form.Item>

        </Form>
      </Drawer>
    </Card>
  );
};

export default RoutingManagement;