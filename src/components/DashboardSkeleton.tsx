import React from 'react';
import { Row, Col, Card, Skeleton } from 'antd';

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-6">
        <Skeleton paragraph={{ rows: 2, width: ['50%', '30%'] }} active />
        <Skeleton.Button active size="large" shape="default" block={false} />
      </div>

      {/* Statistics Cards Skeleton */}
      <Row gutter={[16, 16]}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <Col xs={24} sm={12} lg={6} key={idx}>
            <Card className="shadow-sm border-l-4 border-l-blue-500 h-full">
              <Skeleton paragraph={{ rows: 4 }} active />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Andon Card Skeleton */}
      <Card title={<Skeleton paragraph={{ rows: 0, width: '40%' }} active />} className="shadow-sm">
        <Row gutter={[12, 12]}>
          {Array.from({ length: 8 }).map((_, idx) => (
            <Col xs={24} sm={12} md={8} lg={6} key={idx}>
              <div className="rounded-xl border-2 border-slate-300 p-3 bg-slate-100">
                <Skeleton paragraph={{ rows: 2 }} active />
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Charts Skeleton */}
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={16} className="space-y-6">
          {/* Inventory Chart */}
          <Card 
            title={<Skeleton paragraph={{ rows: 0, width: '30%' }} active />} 
            className="shadow-sm"
          >
            <div className="h-75">
              <Skeleton paragraph={{ rows: 5 }} active />
            </div>
          </Card>

          {/* Quality Chart */}
          <Card 
            title={<Skeleton paragraph={{ rows: 0, width: '25%' }} active />} 
            className="shadow-sm"
          >
            <div style={{ height: 250 }}>
              <Skeleton paragraph={{ rows: 5 }} active />
            </div>
          </Card>

          {/* Production Trend Chart */}
          <Card
            title={<Skeleton paragraph={{ rows: 0, width: '35%' }} active />}
            className="shadow-sm"
          >
            <div style={{ height: 250 }}>
              <Skeleton paragraph={{ rows: 5 }} active />
            </div>
          </Card>
        </Col>

        {/* Alerts Skeleton */}
        <Col xs={24} lg={8}>
          <Card 
            title={<Skeleton paragraph={{ rows: 0, width: '35%' }} active />} 
            className="shadow-sm h-full"
            bodyStyle={{ padding: '0 16px', height: '620px', overflowY: 'auto' }}
          >
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors p-3 rounded-md mt-2">
                <Skeleton paragraph={{ rows: 2 }} active />
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardSkeleton;
