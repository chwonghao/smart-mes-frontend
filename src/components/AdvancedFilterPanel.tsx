import React from 'react';
import { Card, Row, Col, Button, DatePicker, Select, Form, Input } from 'antd';
import { FilterOutlined, ClearOutlined } from '@ant-design/icons';
import { Dayjs } from 'dayjs';

interface FilterState {
  dateRange: [Dayjs, Dayjs] | null;
  workCenterId: string | null;
  status: string[] | null;
  searchText: string | null;
}

interface AdvancedFilterPanelProps {
  workCenters: any[];
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
}

const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  workCenters,
  onFilterChange,
  onReset,
}) => {
  const [form] = Form.useForm();
  const [filters, setFilters] = React.useState<FilterState>({
    dateRange: null,
    workCenterId: null,
    status: null,
    searchText: null,
  });

  const handleDateRangeChange = (dates: any) => {
    const newFilters = { ...filters, dateRange: dates };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleWorkCenterChange = (value: string | null) => {
    const newFilters = { ...filters, workCenterId: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleStatusChange = (value: string[]) => {
    const newFilters = { ...filters, status: value.length > 0 ? value : null };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFilters = { ...filters, searchText: e.target.value || null };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    form.resetFields();
    setFilters({
      dateRange: null,
      workCenterId: null,
      status: null,
      searchText: null,
    });
    onReset();
  };

  return (
    <Card 
      className="mb-6 shadow-sm dark:bg-slate-800 dark:border-slate-700"
      title={
        <div className="flex items-center gap-2">
          <FilterOutlined className="text-blue-600 dark:text-blue-400" />
          <span className="font-bold dark:text-gray-100">Bộ lọc Nâng cao</span>
        </div>
      }
      extra={
        <Button 
          type="text" 
          size="small" 
          icon={<ClearOutlined />}
          onClick={handleReset}
          className="dark:text-gray-300"
        >
          Xóa lọc
        </Button>
      }
    >
      <Form form={form} layout="vertical" className="dark:text-gray-100">
        <Row gutter={[16, 0]}>
          {/* Search by Order Number */}
          <Col xs={24} sm={12} lg={6}>
            <Form.Item label={<span className="dark:text-gray-300">Tìm kiếm Lệnh sản xuất</span>}>
              <Input
                placeholder="Nhập mã lệnh..."
                onChange={handleSearchChange}
                className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100"
              />
            </Form.Item>
          </Col>

          {/* Date Range Filter */}
          <Col xs={24} sm={12} lg={6}>
            <Form.Item label={<span className="dark:text-gray-300">Khoảng thời gian</span>}>
              <DatePicker.RangePicker
                format="DD/MM/YYYY"
                onChange={handleDateRangeChange}
                style={{ width: '100%' }}
                className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100"
              />
            </Form.Item>
          </Col>

          {/* Work Center Filter */}
          <Col xs={24} sm={12} lg={6}>
            <Form.Item label={<span className="dark:text-gray-300">Máy sản xuất</span>}>
              <Select
                placeholder="Chọn máy..."
                allowClear
                onChange={handleWorkCenterChange}
                options={workCenters.map((center) => ({
                  label: center.name,
                  value: String(center.id),
                }))}
                className="dark:bg-slate-700 dark:border-slate-600"
              />
            </Form.Item>
          </Col>

          {/* Status Filter */}
          <Col xs={24} sm={12} lg={6}>
            <Form.Item label={<span className="dark:text-gray-300">Trạng thái</span>}>
              <Select
                mode="multiple"
                placeholder="Chọn trạng thái..."
                onChange={handleStatusChange}
                options={[
                  { label: 'Dự kiến', value: 'DRAFT' },
                  { label: 'Đang chạy', value: 'IN_PROGRESS' },
                  { label: 'Hoàn thành', value: 'COMPLETED' },
                  { label: 'Hủy', value: 'CANCELLED' },
                ]}
                className="dark:bg-slate-700 dark:border-slate-600"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default AdvancedFilterPanel;
