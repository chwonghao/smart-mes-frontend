import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { DeleteOutlined } from '@ant-design/icons';
import { InputNumber } from 'antd';

interface RoutingNodeData {
  workCenterId: number;
  code: string;
  name: string;
  operationName: string;
  standardTime: number;
  setupTime?: number;
  runTime?: number;
}

interface RoutingNodeProps {
  data: RoutingNodeData;
  id: string;
}

const RoutingNode: React.FC<RoutingNodeProps> = ({ data, id }) => {
  const { deleteElements } = useReactFlow();
  const [setupTime, setSetupTime] = useState<number>(data.setupTime || 0);
  const [runTime, setRunTime] = useState<number>(data.runTime || 0);

  // Sync local state with node data prop changes
  useEffect(() => {
    setSetupTime(data.setupTime || 0);
    setRunTime(data.runTime || 0);
  }, [data.setupTime, data.runTime]);

  const handleDelete = () => {
    deleteElements({ nodes: [{ id }] });
  };

  const handleSetupTimeChange = (value: number | null) => {
    const newValue = value ?? 0;
    setSetupTime(newValue);
    data.setupTime = newValue;
  };

  const handleRunTimeChange = (value: number | null) => {
    const newValue = value ?? 0;
    setRunTime(newValue);
    data.runTime = newValue;
  };

  return (
    <div className="w-64 rounded-lg border border-gray-300 bg-white shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between bg-linear-to-r from-blue-50 to-blue-100 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-2 h-6 bg-blue-500 rounded-full" />
          <span className="font-bold text-blue-700 text-sm">{data.code}</span>
        </div>
        <button
          onClick={handleDelete}
          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
          title="Xóa node"
        >
          <DeleteOutlined className="text-base" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Work Center Name */}
        <div>
          <div className="text-xs text-gray-500 font-medium">Tên Công nghệ:</div>
          <div className="text-sm text-gray-700 font-medium mt-1">{data.name}</div>
        </div>

        {/* Operation Name */}
        <div>
          <div className="text-xs text-gray-500 font-medium">Công đoạn:</div>
          <div className="text-sm text-gray-700 font-medium mt-1">{data.operationName}</div>
        </div>

        {/* Setup Time */}
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Thời gian chuẩn bị (phút):</label>
          <InputNumber<number>
            min={0}
            value={setupTime}
            onChange={handleSetupTimeChange}
            className="w-full"
            size="small"
            step={1}
          />
        </div>

        {/* Run Time */}
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Thời gian chạy (phút):</label>
          <InputNumber<number>
            min={0}
            value={runTime}
            onChange={handleRunTimeChange}
            className="w-full"
            size="small"
            step={1}
          />
        </div>

        {/* Standard Time Display */}
        <div className="bg-gray-50 rounded p-2 border border-gray-200">
          <div className="text-xs text-gray-500 font-medium">Tổng thời gian:</div>
          <div className="text-lg font-semibold text-blue-600">
            {(setupTime + runTime + (data.standardTime || 0)).toFixed(1)} phút
          </div>
        </div>
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Left} className="bg-blue-500 w-2 h-2" />
      <Handle type="source" position={Position.Right} className="bg-green-500 w-2 h-2" />
    </div>
  );
};

export default RoutingNode;
