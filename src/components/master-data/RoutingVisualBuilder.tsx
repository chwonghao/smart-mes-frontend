import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Button, Empty, InputNumber, List, message, Typography } from 'antd';
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getRoutingsByItem, getWorkCenters, syncRoutingsByItem, type RoutingSyncDTO } from '../../services/master-data.service';
import type { WorkCenter } from '../../types/master-data.type';

const { Text } = Typography;

type RoutingNodeData = {
  workCenterId: number;
  code: string;
  name: string;
  operationName: string;
  standardTime: number;
};

interface RoutingVisualBuilderProps {
  itemId?: number;
  onSynced?: () => Promise<void> | void;
}

const sortIdsByPosition = (ids: string[], map: Map<string, Node<RoutingNodeData>>) => {
  return [...ids].sort((a, b) => {
    const na = map.get(a);
    const nb = map.get(b);
    if (!na || !nb) return 0;
    if (na.position.y !== nb.position.y) return na.position.y - nb.position.y;
    return na.position.x - nb.position.x;
  });
};

const RoutingVisualBuilder: React.FC<RoutingVisualBuilderProps> = ({ itemId, onSynced }) => {
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [nodes, setNodes] = useState<Node<RoutingNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [saving, setSaving] = useState(false);
  const [defaultStandardTime, setDefaultStandardTime] = useState<number>(10);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  useEffect(() => {
    getWorkCenters()
      .then(setWorkCenters)
      .catch(() => message.error('Không thể tải danh sách Work Center cho Visual Builder!'));
  }, []);

  useEffect(() => {
    if (!itemId) {
      setNodes([]);
      setEdges([]);
      return;
    }

    getRoutingsByItem(itemId)
      .then((data: any[]) => {
        const sorted = [...data].sort((a, b) => {
          const seqA = a.stepSequence ?? a.stepNumber ?? 0;
          const seqB = b.stepSequence ?? b.stepNumber ?? 0;
          return seqA - seqB;
        });

        const initialNodes: Node<RoutingNodeData>[] = sorted.map((routing, index) => {
          const wcId = routing.workCenterId ?? routing.workCenter?.id;
          const wc = workCenters.find((w) => w.id === wcId);
          const name = routing.workCenterName || routing.workCenter?.name || wc?.name || `Work Center #${wcId}`;
          const code = wc?.code || routing.workCenter?.code || 'WC';

          return {
            id: `wc-${wcId}-${index}`,
            position: { x: 140 + index * 240, y: 150 },
            data: {
              workCenterId: wcId,
              code,
              name,
              operationName: routing.operationName || `Công đoạn ${index + 1}`,
              standardTime: routing.standardTime || defaultStandardTime,
            },
            type: 'default',
          };
        });

        const initialEdges: Edge[] = initialNodes.slice(0, -1).map((node, idx) => ({
          id: `e-${node.id}-${initialNodes[idx + 1].id}`,
          source: node.id,
          target: initialNodes[idx + 1].id,
          animated: true,
        }));

        setNodes(initialNodes);
        setEdges(initialEdges);
      })
      .catch(() => {
        setNodes([]);
        setEdges([]);
      });
  }, [itemId, workCenters, defaultStandardTime]);

  const onNodesChange = useCallback((changes: NodeChange<Node<RoutingNodeData>>[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, animated: true }, eds));
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!rfInstance || !wrapperRef.current) return;

      const raw = event.dataTransfer.getData('application/smartmes-work-center');
      if (!raw) return;

      const wc = JSON.parse(raw) as WorkCenter;
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const nodeId = `wc-${wc.id}-${Date.now()}`;

      const newNode: Node<RoutingNodeData> = {
        id: nodeId,
        position,
        data: {
          workCenterId: wc.id,
          code: wc.code,
          name: wc.name,
          operationName: `Công đoạn ${nodes.length + 1}`,
          standardTime: defaultStandardTime,
        },
        type: 'default',
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [defaultStandardTime, nodes.length, rfInstance]
  );

  const computeSequence = () => {
    const indegree = new Map<string, number>();
    const outgoing = new Map<string, string[]>();
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    nodes.forEach((n) => {
      indegree.set(n.id, 0);
      outgoing.set(n.id, []);
    });

    edges.forEach((e) => {
      if (!nodeMap.has(e.source) || !nodeMap.has(e.target)) return;
      outgoing.get(e.source)?.push(e.target);
      indegree.set(e.target, (indegree.get(e.target) || 0) + 1);
    });

    const startNodes = sortIdsByPosition(
      [...indegree.entries()].filter(([, deg]) => deg === 0).map(([id]) => id),
      nodeMap
    );

    const queue: string[] = [...startNodes];
    const ordered: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift() as string;
      ordered.push(current);

      const nextList = sortIdsByPosition(outgoing.get(current) || [], nodeMap);
      nextList.forEach((nextId) => {
        const nextDeg = (indegree.get(nextId) || 0) - 1;
        indegree.set(nextId, nextDeg);
        if (nextDeg === 0) {
          queue.push(nextId);
        }
      });
    }

    if (ordered.length < nodes.length) {
      const remaining = sortIdsByPosition(
        nodes.map((n) => n.id).filter((id) => !ordered.includes(id)),
        nodeMap
      );
      ordered.push(...remaining);
    }

    return ordered;
  };

  const handleSave = async () => {
    if (!itemId) {
      message.warning('Vui lòng chọn sản phẩm trước khi lưu quy trình!');
      return;
    }

    if (nodes.length === 0) {
      message.warning('Sơ đồ đang trống. Hãy kéo Work Center vào Canvas trước khi lưu.');
      return;
    }

    try {
      setSaving(true);
      const orderedNodeIds = computeSequence();
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      const payload: RoutingSyncDTO[] = orderedNodeIds.map((id, idx) => {
        const node = nodeMap.get(id) as Node<RoutingNodeData>;
        return {
          workCenterId: node.data.workCenterId,
          stepSequence: idx + 1,
          operationName: node.data.operationName,
          standardTime: node.data.standardTime,
          description: `${node.data.code} - ${node.data.name}`,
        };
      });

      await syncRoutingsByItem(itemId, payload);
      message.success('Đồng bộ quy trình trực quan thành công!');
      if (onSynced) {
        await onSynced();
      }
    } catch (error) {
      message.error('Không thể lưu quy trình trực quan!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4" style={{ minHeight: 560 }}>
      <Card className="col-span-12 lg:col-span-3" title="Danh sách Work Center" styles={{ body: { padding: 12 } }}>
        <div className="mb-3">
          <Text className="text-xs text-gray-500">Thời gian chuẩn mặc định (phút)</Text>
          <InputNumber
            min={1}
            className="w-full mt-1"
            value={defaultStandardTime}
            onChange={(v) => setDefaultStandardTime(Number(v || 10))}
          />
        </div>

        <List
          size="small"
          dataSource={workCenters}
          locale={{ emptyText: <Empty description="Không có Work Center" /> }}
          renderItem={(wc) => (
            <List.Item>
              <div
                className="w-full rounded border border-gray-200 bg-gray-50 p-2 cursor-grab hover:border-blue-400 transition-colors"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/smartmes-work-center', JSON.stringify(wc));
                  event.dataTransfer.effectAllowed = 'move';
                }}
              >
                <div className="font-semibold text-blue-700">{wc.code}</div>
                <div className="text-sm text-gray-700">{wc.name}</div>
              </div>
            </List.Item>
          )}
        />
      </Card>

      <Card
        className="col-span-12 lg:col-span-9"
        title="Visual Workflow Canvas"
        extra={
          <Button type="primary" onClick={handleSave} loading={saving}>
            Lưu Quy Trình
          </Button>
        }
        styles={{ body: { padding: 0 } }}
      >
        <div ref={wrapperRef} style={{ width: '100%', height: 560 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onInit={setRfInstance}
            fitView
          >
            <Controls />
            <Background />
          </ReactFlow>
        </div>
      </Card>
    </div>
  );
};

export default RoutingVisualBuilder;
