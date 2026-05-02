import React, { useState, useEffect } from 'react';
import {
  Table, Card, Row, Col, Statistic, Tag, Select, Button, Alert, Spin,
  Progress, Space, Typography, Timeline, Divider, Badge
} from 'antd';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area, Cell
} from 'recharts';
import {
  RiseOutlined, FallOutlined, MinusOutlined, WarningOutlined,
  CheckCircleOutlined, ClockCircleOutlined, TeamOutlined, UserOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Option } = Select;
const { Title, Text } = Typography;

const ClassMonitor: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [classData, setClassData] = useState<any[]>([]);
  const [warningData, setWarningData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    fetchClassMonitorData();
    fetchWarningData();
  }, [gradeFilter]);

  const fetchClassMonitorData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/dashboard/class-monitoring', {
        params: { grade: gradeFilter }
      });
      setClassData(response.data);

      // 获取趋势数据
      const trendResponse = await axios.get('/dashboard/trend-data');
      setTrendData(trendResponse.data);
    } catch (error) {
      console.error('获取班级监控数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarningData = async () => {
    try {
      const response = await axios.get('/dashboard/warnings', {
        params: { resolved: false }
      });
      setWarningData(response.data);
    } catch (error) {
      console.error('获取预警数据失败:', error);
    }
  };

  const getTrendStatus = (current: number, previous: number) => {
    if (!previous) return { status: 'normal', icon: <MinusOutlined /> };
    const change = ((current - previous) / previous) * 100;
    if (change >= 10) return { status: 'up', icon: <RiseOutlined />, color: '#52c41a' };
    if (change <= -10) return { status: 'down', icon: <FallOutlined />, color: '#ff4d4f' };
    return { status: 'normal', icon: <MinusOutlined />, color: '#faad14' };
  };

  const columns = [
    {
      title: '班级',
      dataIndex: 'class_name',
      key: 'class_name',
      fixed: 'left' as const,
      width: 100,
    },
    {
      title: '学生数',
      dataIndex: 'student_count',
      key: 'student_count',
      width: 80,
    },
    {
      title: '平均分',
      dataIndex: 'avg_score',
      key: 'avg_score',
      width: 120,
      render: (value: number, record: any) => {
        const previous = record.last_avg;
        const trend = getTrendStatus(value, previous);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Progress
              percent={Math.round((value / 150) * 100)}
              size="small"
              status={value >= 120 ? 'success' : value >= 90 ? 'normal' : 'exception'}
              format={() => value.toFixed(1)}
            />
            {trend.icon && <span style={{ color: trend.color, fontSize: 16 }}>{trend.icon}</span>}
          </div>
        );
      },
    },
    {
      title: '尖生数',
      dataIndex: 'top_students',
      key: 'top_students',
      width: 90,
      render: (value: number) => <Tag color="gold">{value}</Tag>,
    },
    {
      title: '优秀率',
      dataIndex: 'excellent_rate',
      key: 'excellent_rate',
      width: 100,
      render: (rate: string) => (
        <Tag color={parseFloat(rate) >= 30 ? 'green' : parseFloat(rate) >= 20 ? 'blue' : 'orange'}>
          {rate}%
        </Tag>
      ),
    },
    {
      title: '及格率',
      dataIndex: 'passed_rate',
      key: 'passed_rate',
      width: 100,
      render: (rate: string) => (
        <Tag color={parseFloat(rate) >= 90 ? 'green' : parseFloat(rate) >= 70 ? 'blue' : 'red'}>
          {rate}%
        </Tag>
      ),
    },
    {
      title: '低分率',
      dataIndex: 'low_rate',
      key: 'low_rate',
      width: 100,
      render: (rate: string) => (
        <Tag color={parseFloat(rate) <= 5 ? 'green' : parseFloat(rate) <= 10 ? 'orange' : 'red'}>
          {rate}%
        </Tag>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: any) => {
        const isAbnormal = record.is_abnormal;
        const trend = getTrendStatus(record.avg_score, record.last_avg);

        return (
          <Badge
            status={isAbnormal ? 'error' : trend.status === 'up' ? 'success' : trend.status === 'down' ? 'warning' : 'default'}
            text={isAbnormal ? '异常' : trend.status === 'up' ? '进步' : trend.status === 'down' ? '退步' : '正常'}
          />
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => showClassDetail(record)}>
            详情
          </Button>
          <Button type="link" size="small" onClick={() => showStudentList(record)}>
            学生列表
          </Button>
        </Space>
      ),
    },
  ];

  const showClassDetail = (record: any) => {
    // 这里可以显示班级详情模态框
    console.log('班级详情:', record);
  };

  const showStudentList = (record: any) => {
    // 这里可以显示班级学生列表
    console.log('班级学生:', record);
  };

  const statusColors = {
    up: '#52c41a',
    down: '#ff4d4f',
    normal: '#faad14'
  };

  const statusTexts = {
    up: '进步班级',
    down: '退步班级',
    normal: '正常班级'
  };

  const warningColumns = [
    {
      title: '预警类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="red">{type}</Tag>,
    },
    {
      title: '预警级别',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => (
        <Tag color={level === 'high' ? 'red' : level === 'medium' ? 'orange' : 'yellow'}>
          {level === 'high' ? '高级' : level === 'medium' ? '中级' : '低级'}
        </Tag>
      ),
    },
    {
      title: '预警标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '预警内容',
      dataIndex: 'content',
      key: 'content',
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => moment(date).format('MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small">处理</Button>
          <Button type="link" size="small" danger>忽略</Button>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" tip="正在加载监控数据..." />
      </div>
    );
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        <TeamOutlined /> 班级动态监控
      </Title>

      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder="选择年级筛选"
          style={{ width: 150, marginRight: 16 }}
          onChange={setGradeFilter}
          allowClear
        >
          <Option value="高一">高一</Option>
          <Option value="高二">高二</Option>
          <Option value="高三">高三</Option>
        </Select>
        <Button type="primary" onClick={fetchClassMonitorData}>
          刷新数据
        </Button>
      </div>

      {warningData.length > 0 && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Alert
              message={
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <WarningOutlined style={{ color: '#faad14', fontSize: 24 }} />
                  <div>
                    <Title level={5} style={{ margin: 0, color: '#faad14' }}>
                      教学质量预警
                    </Title>
                    <Text style={{ color: '#666' }}>
                      共有 {warningData.length} 条未处理预警，请及时关注和处理
                    </Text>
                  </div>
                </div>
              }
              type="warning"
              showIcon={false}
              style={{ padding: 16 }}
            />
          </Col>
        </Row>
      )}

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChartOutlined />
                <span>班级成绩对比</span>
              </div>
            }
          >
            <Table
              columns={columns}
              dataSource={classData}
              rowKey="class_name"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1300 }}
              bordered
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="班级平均分趋势" style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avg_score"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="平均分"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="班级状态统计" style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  {
                    status: '进步班级',
                    count: classData.filter(c => getTrendStatus(c.avg_score, c.last_avg).status === 'up').length,
                    color: statusColors.up
                  },
                  {
                    status: '退步班级',
                    count: classData.filter(c => getTrendStatus(c.avg_score, c.last_avg).status === 'down').length,
                    color: statusColors.down
                  },
                  {
                    status: '正常班级',
                    count: classData.filter(c => getTrendStatus(c.avg_score, c.last_avg).status === 'normal').length,
                    color: statusColors.normal
                  }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count">
                  {[
                    { color: statusColors.up },
                    { color: statusColors.down },
                    { color: statusColors.normal }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {warningData.length > 0 && (
        <Row>
          <Col span={24}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <WarningOutlined style={{ color: '#faad14' }} />
                  <span>预警记录</span>
                </div>
              }
            >
              <Table
                columns={warningColumns}
                dataSource={warningData}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default ClassMonitor;