import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Card, Space, message, Modal, Form, Input, Select, InputNumber } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { WorkCenter } from '../../types/master-data.type';
import { getWorkCenters, createWorkCenter, reportMachineDown, resolveMachineIssue } from '../../services/master-data.service';

const WorkCenterList: React.FC = () => {
    const [data, setData] = useState<WorkCenter[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await getWorkCenters();
            setData(response as unknown as WorkCenter[]);
        } catch (error) {
            message.error('Không thể tải dữ liệu máy móc!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = () => {
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleFinish = async (values: any) => {
        setSubmitting(true);
        try {
            await createWorkCenter(values);
            message.success('Thêm máy móc thành công!');
            setIsModalVisible(false);
            fetchData();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra khi thêm mới!');
        } finally {
            setSubmitting(false);
        }
    };

    // --- HÀM BÁO HỎNG ---
    const handleReportDown = async (record: WorkCenter) => {
        const reason = window.prompt(`Vui lòng nhập lý do báo hỏng cho máy [${record.code}]:`, 'Sự cố cơ điện');
        if (reason) {
            setLoading(true);
            try {
                await reportMachineDown(record.id, reason);
                message.success(`Đã ghi nhận sự cố cho máy ${record.code}!`);
            } catch (error: any) {
                // Hiển thị lỗi từ Backend (Ví dụ: "Máy này đã được báo hỏng trước đó rồi!")
                message.error(error.response?.data?.message || 'Có lỗi xảy ra!');
            } finally {
                // LUÔN LUÔN tải lại dữ liệu để đồng bộ nút bấm với trạng thái DB
                await fetchData();
                setLoading(false);
            }
        }
    };

    // --- HÀM BÁO SỬA XONG ---
    const handleResolveIssue = async (record: WorkCenter) => {
        setLoading(true);
        try {
            await resolveMachineIssue(record.id);
            message.success(`Máy ${record.code} đã sẵn sàng hoạt động!`);
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra!');
        } finally {
            // Đảm bảo bảng được cập nhật dù thành công hay thất bại
            await fetchData();
            setLoading(false);
        }
    };

    const renderStatusTag = (status: string) => {
        switch (status) {
            case 'IDLE': return <Tag color="blue">Rảnh rỗi</Tag>;
            case 'RUNNING': return <Tag color="green">Đang chạy</Tag>;
            case 'DOWN': return <Tag color="red">Đang hỏng</Tag>;
            case 'OFFLINE': return <Tag color="default">Mất kết nối</Tag>;
            case 'MAINTENANCE': return <Tag color="orange">Bảo trì</Tag>;
            default: return <Tag>{status}</Tag>;
        }
    };

    // --- CẤU HÌNH CỘT ---
    const columns = [
        { title: 'Mã máy', dataIndex: 'code', key: 'code', className: 'font-semibold text-blue-600' },
        { title: 'Tên máy / Khu vực', dataIndex: 'name', key: 'name' },
        { title: 'Loại', dataIndex: 'centerType', key: 'centerType' },
        { title: 'Công suất (SP/giờ)', dataIndex: 'hourlyCapacity', key: 'hourlyCapacity' },
        {
            title: 'Trạng thái hiện tại',
            dataIndex: 'currentStatus',
            key: 'currentStatus',
            render: (status: string) => {
                // Nếu status bị null/undefined từ backend, mặc định coi là IDLE (Rảnh rỗi)
                const displayStatus = status || 'IDLE';
                return renderStatusTag(displayStatus);
            }
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_: any, record: any) => {
                // Logic phòng thủ: Nếu Backend chưa trả về currentStatus, 
                // ta tạm coi là IDLE để hiện nút "Báo hỏng"
                const status = (record.currentStatus || 'IDLE').toUpperCase();
                const isDown = status === 'DOWN';

                return (
                    <Space size="middle">
                        <Button type="link">Sửa</Button>
                        {isDown ? (
                            <Button
                                type="link"
                                className="text-green-600 font-bold"
                                onClick={() => handleResolveIssue(record)}
                            >
                                Báo sửa xong
                            </Button>
                        ) : (
                            <Button
                                type="link"
                                danger
                                onClick={() => handleReportDown(record)}
                            >
                                Báo hỏng
                            </Button>
                        )}
                    </Space>
                );
            },
        },
    ];

    return (
        <>
            <Card
                title={<span className="text-xl font-bold text-gray-800">Danh sách Máy móc & Trạm làm việc</span>}
                extra={
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Làm mới</Button>
                        <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600" onClick={handleOpenModal}>
                            Thêm mới
                        </Button>
                    </Space>
                }
            >
                <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ pageSize: 8 }} bordered />
            </Card>

            <Modal
                title={<span className="text-lg font-bold">Thêm mới Máy móc / Trạm làm việc</span>}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4">
                    <Form.Item label="Mã máy (Code)" name="code" rules={[{ required: true, message: 'Vui lòng nhập mã máy!' }]}>
                        <Input placeholder="VD: CNC-01, LINE-A..." />
                    </Form.Item>
                    <Form.Item label="Tên máy / Khu vực" name="name" rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}>
                        <Input placeholder="VD: Máy phay CNC số 1" />
                    </Form.Item>
                    <Form.Item label="Phân loại" name="centerType" rules={[{ required: true, message: 'Vui lòng chọn loại máy!' }]}>
                        <Select placeholder="-- Chọn loại --">
                            <Select.Option value="MACHINE">Máy móc đơn lẻ (Machine)</Select.Option>
                            <Select.Option value="ASSEMBLY_LINE">Dây chuyền lắp ráp (Line)</Select.Option>
                            <Select.Option value="WORKSTATION">Bàn thao tác tay (Workstation)</Select.Option>
                            <Select.Option value="PACKAGING">Khu vực đóng gói (Packaging)</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item label="Công suất tiêu chuẩn (Sản phẩm / giờ)" name="hourlyCapacity" rules={[{ required: true, message: 'Vui lòng nhập công suất!' }]}>
                        <InputNumber className="w-full" min={1} placeholder="VD: 150" />
                    </Form.Item>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button onClick={() => setIsModalVisible(false)}>Hủy bỏ</Button>
                        <Button type="primary" htmlType="submit" className="bg-blue-600" loading={submitting}>Lưu dữ liệu</Button>
                    </div>
                </Form>
            </Modal>
        </>
    );
};

export default WorkCenterList;