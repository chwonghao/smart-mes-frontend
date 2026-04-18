import React, { useState } from 'react';
import { Modal, Upload, Table, Button, message, Progress } from 'antd';
import { UploadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import type { RcFile } from 'antd/es/upload';

interface ExcelImportModalProps {
  open: boolean;
  title: string;
  columns: any[];
  onImport: (data: any[]) => Promise<void>;
  onCancel: () => void;
  requiredFields?: string[];
}

const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  open,
  title,
  columns,
  onImport,
  onCancel,
  requiredFields = []
}) => {
  const [fileData, setFileData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const handleFileUpload = async (info: any) => {
    const file = info.file as RcFile;
    
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      message.error('Vui lòng tải file Excel (.xlsx, .xls) hoặc CSV!');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        // Parse to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          message.error('File Excel không có dữ liệu!');
          return;
        }

        // Validate required fields
        if (requiredFields.length > 0) {
          const firstRow = jsonData[0] as Record<string, any>;
          const missingFields = requiredFields.filter(field => !firstRow.hasOwnProperty(field));
          
          if (missingFields.length > 0) {
            message.error(`Thiếu các cột: ${missingFields.join(', ')}`);
            return;
          }
        }

        setFileData(jsonData);
        message.success(`Đã tải ${jsonData.length} bản ghi từ file!`);
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      message.error('Lỗi khi đọc file Excel!');
    }
  };

  const handleImport = async () => {
    if (fileData.length === 0) {
      message.error('Vui lòng chọn file Excel để nhập!');
      return;
    }

    setIsLoading(true);
    // setImportProgress(0); // Removed as it is no longer needed

    try {
      // Simulate progress

      // Call the import function
      await onImport(fileData);

      setImportProgress(100);
      message.success(`Đã nhập thành công ${fileData.length} bản ghi!`);
      
      // Clear and close
      setTimeout(() => {
        setFileData([]);
        setImportProgress(0);
        onCancel();
      }, 1500);
    } catch (error: any) {
      message.error(error.message || 'Lỗi khi nhập dữ liệu!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFileData([]);
    setImportProgress(0);
    onCancel();
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleCancel}
      width={1000}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Hủy
        </Button>,
        <Button 
          key="import" 
          type="primary" 
          loading={isLoading}
          disabled={fileData.length === 0 || isLoading}
          onClick={handleImport}
          icon={<CheckCircleOutlined />}
        >
          Nhập dữ liệu ({fileData.length})
        </Button>
      ]}
      className="dark:bg-slate-800"
    >
      <div className="space-y-6">
        {/* Instructions */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
          <h3 className="font-bold text-blue-900 dark:text-blue-100">📋 Hướng dẫn nhập dữ liệu</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1">
            <li>✓ Tải file Excel (.xlsx) hoặc CSV</li>
            <li>✓ Đảm bảo tên cột trùng khớp với mẫu: {requiredFields.join(', ')}</li>
            <li>✓ Kiểm tra dữ liệu trước nhập bên dưới</li>
            <li>✓ Bấm "Nhập dữ liệu" để lưu vào hệ thống</li>
          </ul>
        </div>

        {/* Upload Area */}
        <Upload.Dragger
          name="file"
          multiple={false}
          accept=".xlsx,.xls,.csv"
          customRequest={() => {}} // Prevent auto-upload
          onChange={handleFileUpload}
          className="dark:bg-slate-700 dark:border-slate-600"
        >
          <p className="text-blue-600 dark:text-blue-400 font-bold">
            <UploadOutlined className="text-2xl" />
          </p>
          <p className="dark:text-gray-300">Kéo file Excel đến đây hoặc bấm để chọn</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Hỗ trợ: .xlsx, .xls, .csv</p>
        </Upload.Dragger>

        {/* Progress Bar */}
        {importProgress > 0 && <Progress percent={importProgress} status={importProgress === 100 ? 'success' : 'active'} />}

        {/* Preview Table */}
        {fileData.length > 0 && (
          <div>
            <h3 className="font-bold mb-4 dark:text-gray-100">📊 Xem trước dữ liệu ({fileData.length} bản ghi)</h3>
            <Table
              dataSource={fileData.slice(0, 10).map((row, idx) => ({ ...row, key: idx }))}
              columns={columns}
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
              className="dark:bg-slate-700"
              loading={isLoading}
            />
            {fileData.length > 10 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                ...và {fileData.length - 10} bản ghi khác
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ExcelImportModal;
