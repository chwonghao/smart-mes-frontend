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
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max flex-nowrap gap-3">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="w-55 shrink-0">
              <div className="rounded-xl border-2 border-slate-300 p-3 bg-slate-100">
                <Skeleton paragraph={{ rows: 2 }} active />
              </div>
            </div>
          ))}
          </div>
        </div>
      </Card>

      {/* Charts Skeleton */}
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={16} className="space-y-6">
          <Row gutter={[16, 16]}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <Col xs={24} xl={12} key={idx}>
                <Card
                  title={<Skeleton paragraph={{ rows: 0, width: idx % 2 === 0 ? '30%' : '40%' }} active />}
                  className="shadow-sm"
                >
                  <div style={{ height: idx === 0 ? 288 : 260 }}>
                    <Skeleton paragraph={{ rows: 5 }} active />
                  </div>
                </Card>
              </Col>
            ))}
            <Col xs={24}>
              <Card
                title={<Skeleton paragraph={{ rows: 0, width: '35%' }} active />}
                className="shadow-sm"
              >
                <div style={{ height: 260 }}>
                  <Skeleton paragraph={{ rows: 5 }} active />
                </div>
              </Card>
            </Col>
          </Row>
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
