import React, { useEffect, useMemo, useState } from 'react';
import { Table, Card, Tag, Button, message, Typography, Empty } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getSystemLogs } from '../../services/system.service';
import type { SystemLog } from '../../types/system.type';

const { Text } = Typography;

const getModuleColor = (module?: string) => {
  const value = String(module || 'SYSTEM').toUpperCase();
  if (value.includes('PRODUCTION')) return 'blue';
  if (value.includes('INVENTORY')) return 'gold';
  if (value.includes('MASTER_DATA')) return 'purple';
  if (value.includes('SYSTEM')) return 'cyan';
  if (value.includes('AUTH')) return 'geekblue';
  return 'default';
};

const getActionColor = (actionType?: string) => {
  switch (String(actionType || '').toUpperCase()) {
    case 'CREATE':
      return 'green';
    case 'UPDATE':
      return 'gold';
    case 'DELETE':
      return 'red';
    default:
      return 'default';
  }
};

const parseJsonText = (value?: string | null) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const renderJsonBlock = (value?: string | null) => {
  const parsed = parseJsonText(value);

  if (!parsed) {
    return <Text type="secondary">Không có dữ liệu</Text>;
  }

  if (typeof parsed === 'string') {
    return (
      <pre className="m-0 max-h-72 overflow-auto rounded bg-gray-50 p-3 text-xs leading-5 text-gray-800">
        {parsed}
      </pre>
    );
  }

  return (
    <pre className="m-0 max-h-72 overflow-auto rounded bg-gray-50 p-3 text-xs leading-5 text-gray-800">
      {JSON.stringify(parsed, null, 2)}
    </pre>
  );
};

const SystemLogList: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50'],
  });

  const fetchLogs = async (nextPage = 1, nextSize = 10) => {
    setLoading(true);
    try {
      const page = await getSystemLogs({
        page: nextPage - 1,
        size: nextSize,
        sort: 'createdAt,desc',
      });

      setLogs(page.content || []);
      setPagination((prev) => ({
        ...prev,
        current: nextPage,
        pageSize: nextSize,
        total: page.totalElements || 0,
      }));
    } catch (error) {
      message.error('Lỗi tải nhật ký hệ thống!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1, Number(pagination.pageSize || 10));
  }, []);

  const columns: ColumnsType<SystemLog> = useMemo(
    () => [
      {
        title: 'Thời gian',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 190,
        render: (value: string) => (
          <span className="font-semibold text-gray-600">
            {value ? dayjs(value).format('DD/MM/YYYY HH:mm:ss') : 'N/A'}
          </span>
        ),
      },
      {
        title: 'Người thao tác',
        dataIndex: 'createdBy',
        key: 'createdBy',
        width: 170,
        render: (value: string) => value || 'SYSTEM',
      },
      {
        title: 'Phân hệ',
        dataIndex: 'module',
        key: 'module',
        width: 150,
        render: (value: string) => <Tag color={getModuleColor(value)}>{value || 'SYSTEM'}</Tag>,
      },
      {
        title: 'Hành động',
        dataIndex: 'actionType',
        key: 'actionType',
        width: 130,
        render: (value: string) => <Tag color={getActionColor(value)}>{value || 'UNKNOWN'}</Tag>,
      },
      {
        title: 'Nội dung',
        dataIndex: 'description',
        key: 'description',
        render: (value: string) => <Text className="text-gray-800">{value || 'Không có mô tả'}</Text>,
      },
    ],
    []
  );

  return (
    <Card
      title={<span className="text-xl font-bold">Nhật ký Hệ thống (Audit Log)</span>}
      extra={
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={() => fetchLogs(Number(pagination.current || 1), Number(pagination.pageSize || 10))}
          loading={loading}
        >
          Làm mới
        </Button>
      }
      className="shadow-sm"
    >
      <Table<SystemLog>
        columns={columns}
        dataSource={logs}
        rowKey={(record) => String(record.id)}
        loading={loading}
        bordered
        locale={{
          emptyText: <Empty description="Không có dữ liệu nhật ký" />,
        }}
        pagination={pagination}
        onChange={(nextPagination) => {
          const current = Number(nextPagination.current || 1);
          const pageSize = Number(nextPagination.pageSize || 10);
          fetchLogs(current, pageSize);
        }}
        expandable={{
          rowExpandable: (record) => Boolean(record.oldValue || record.newValue),
          expandedRowRender: (record) => (
            <div className="grid grid-cols-1 gap-4 p-1 lg:grid-cols-2">
              <div>
                <div className="mb-2 font-semibold text-red-500">Dữ liệu cũ</div>
                {renderJsonBlock(record.oldValue)}
              </div>
              <div>
                <div className="mb-2 font-semibold text-green-600">Dữ liệu mới</div>
                {renderJsonBlock(record.newValue)}
              </div>
            </div>
          ),
        }}
      />
    </Card>
  );
};

export default SystemLogList;