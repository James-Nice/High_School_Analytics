import React, { useState, useEffect } from 'react';
import {
  Table, Card, Row, Col, Statistic, Tag, Select, Button, Alert, Spin,
  Form, Input, Space, Tabs, Progress, Typography, Timeline, Badge, Modal,
  Descriptions, Divider, message
} from 'antd';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  RiseOutlined, FallOutlined, MinusOutlined, WarningOutlined,
  CheckCircleOutlined, ClockCircleOutlined, UserOutlined, TeamOutlined,
  EyeOutlined, ExportOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

const StudentMonitor: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [studentType, setStudentType] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [searchForm] = Form.useForm();
  const [studentList, setStudentList] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentDetailModal, setStudentDetailModal] = useState(false);
  const [studentDetail, setStudentDetail] = useState<any>(null);

  const studentTypes = [
    { value: 'all', label: '全部学生', color: 'default' },
    { value: 'top', label: '尖子生', color: 'gold' },
    { value: 'excellent', label: '优秀生', color: 'silver' },
    { value: 'good', label: '良好生', color: 'bronze' },
    { value: 'pass', label: '及格生', color: 'green' },
    { value: 'low', label: '学困生', color: 'red' },
    { value: 'fluctuation', label: '波动生', color: 'orange' },
    { value: 'weak_subject', label: '偏科生', color: 'purple' },
    { value: 'critical', label: '临界生', color: 'blue' }
  ];

  useEffect(() => {
    fetchStudentList();
  }, [studentType, classFilter]);

  const fetchStudentList = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/dashboard/student-monitoring', {
        params: { class_name: classFilter }
      });

      let filteredStudents = response.data;

      // 根据学生类型筛选
      if (studentType !== 'all') {
        filteredStudents = response.data.filter((student: any) => {
          switch (studentType) {
            case 'top':
              return student.is_top_student;
            case 'excellent':
              return student.is_excellent_student;
            case 'good':
              return student.is_good_student;
            case 'pass':
              return student.is_pass_student;
            case 'low':
              return student.is_low_student;
            case 'fluctuation':
              return student.is_fluctuation_student;
            case 'weak_subject':
              return student.has_weak_subject;
            case 'critical':
              return student.is_critical_student;
            default:
              return true;
          }
        });
      }

      setStudentList(filteredStudents);
    } catch (error) {
      message.error('获取学生列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentDetail = async (studentNumber: string) => {
    try {
      const response = await axios.get(`/analysis/student-analysis/${studentNumber}`);
      setStudentDetail(response.data);
      setStudentDetailModal(true);
    } catch (error) {
      message.error('获取学生详情失败');
    }
  };

  const getStudentTypeTags = (student: any) => {
    const tags = [];

    if (student.is_top_student) {
      tags.push(<Tag key="top" color="gold">尖子生</Tag>);
    }
    if (student.is_excellent_student) {
      tags.push(<Tag key="excellent" color="silver">优秀生</Tag>);
    }
    if (student.is_good_student) {
      tags.push(<Tag key="good" color="bronze">良好生</Tag>);
    }
    if (student.is_pass_student) {
      tags.push(<Tag key="pass" color="green">及格生</Tag>);
    }
    if (student.is_low_student) {
      tags.push(<Tag key="low" color="red">学困生</Tag>);
    }
    if (student.is_fluctuation_student) {
      tags.push(<Tag key="fluctuation" color="orange">波动生</Tag>);
    }
    if (student.has_weak_subject) {
      tags.push(<Tag key="weak_subject" color="purple">偏科生</Tag>);
    }
    if (student.is_critical_student) {
      tags.push(<Tag key="critical" color="blue">临界生</Tag>);
    }

    return tags;
  };

  const getTrendIcon = (currentRank: number, previousRank: number) => {
    if (!previousRank) return <MinusOutlined />;
    const change = currentRank - previousRank;
    if (change <= -10) return <RiseOutlined style={{ color: '#52c41a' }} />;
    if (change >= 10) return <FallOutlined style={{ color: '#ff4d4f' }} />;
    return <MinusOutlined style={{ color: '#faad14' }} />;
  };

  const columns = [
    {
      title: '学号',
      dataIndex: 'student_number',
      key: 'student_number',
      fixed: 'left' as const,
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'student_name',
      key: 'student_name',
      fixed: 'left' as const,
      width: 100,
      render: (text: string, record: any) => (
        <Button
          type="link"
          size="small"
          onClick={() => fetchStudentDetail(record.student_number)}
        >
          {text}
        </Button>
      ),
    },
    {
      title: '班级',
      dataIndex: 'class_name',
      key: 'class_name',
      width: 100,
    },
    {
      title: '总分',
      dataIndex: 'total_score',
      key: 'total_score',
      width: 100,
      sorter: (a: any, b: any) => a.total_score - b.total_score,
      render: (value: number) => (
        <Progress
          percent={Math.round((value / 150) * 100)}
          size="small"
          status={value >= 120 ? 'success' : value >= 90 ? 'normal' : 'exception'}
          format={() => value.toFixed(0)}
        />
      ),
    },
    {
      title: '年级排名',
      dataIndex: 'grade_rank',
      key: 'grade_rank',
      width: 100,
      sorter: (a: any, b: any) => a.grade_rank - b.grade_rank,
      render: (value: number, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{value}</span>
          {getTrendIcon(value, record.previous_rank)}
        </div>
      ),
    },
    {
      title: '班内排名',
      dataIndex: 'class_rank',
      key: 'class_rank',
      width: 100,
      sorter: (a: any, b: any) => a.class_rank - b.class_rank,
    },
    {
      title: '学生类型',
      key: 'student_types',
      width: 200,
      render: (_: any, record: any) => getStudentTypeTags(record),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: any) => {
        const hasWarning = record.is_fluctuation_student || record.has_weak_subject;
        return (
          <Badge
            status={hasWarning ? 'warning' : 'default'}
            text={hasWarning ? '需关注' : '正常'}
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
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => fetchStudentDetail(record.student_number)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<ExportOutlined />}
            onClick={() => exportStudentReport(record)}
          >
            报告
          </Button>
        </Space>
      ),
    },
  ];

  const exportStudentReport = (student: any) => {
    message.info('学生报告导出功能开发中...');
  };

  const StudentDetailModal = () => {
    if (!studentDetail) return null;

    const trendData = studentDetail.exam_history.map((exam: any) => ({
      name: exam.exam_name,
      score: exam.total_score,
      rank: exam.grade_rank,
    }));

    return (
      <Modal
        title="学生学情档案"
        visible={studentDetailModal}
        onCancel={() => setStudentDetailModal(false)}
        footer={null}
        width={1000}
      >
        <Tabs defaultActiveKey="info">
          <TabPane tab="基本信息" key="info">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="姓名">{studentDetail.student_info.student_name}</Descriptions.Item>
              <Descriptions.Item label="学号">{studentDetail.student_info.student_number}</Descriptions.Item>
              <Descriptions.Item label="班级">{studentDetail.student_info.class_name}</Descriptions.Item>
              <Descriptions.Item label="总分">{studentDetail.student_info.total_score}</Descriptions.Item>
              <Descriptions.Item label="年级排名">{studentDetail.student_info.grade_rank}</Descriptions.Item>
              <Descriptions.Item label="班内排名">{studentDetail.student_info.class_rank}</Descriptions.Item>
            </Descriptions>

            <Divider />

            <Title level={5}>学生类型标记</Title>
            <div style={{ marginBottom: 16 }}>
              {getStudentTypeTags(studentDetail.student_info)}
            </div>

            {studentDetail.weak_subjects && studentDetail.weak_subjects.length > 0 && (
              <>
                <Title level={5}>偏科分析</Title>
                <Table
                  dataSource={studentDetail.weak_subjects}
                  columns={[
                    { title: '偏科科目', dataIndex: 'subject', key: 'subject' },
                    { title: '总分排名', dataIndex: 'total_rank', key: 'total_rank' },
                    { title: '科目排名', dataIndex: 'subject_rank', key: 'subject_rank' },
                    { title: '排名差距', dataIndex: 'rank_diff_percent', key: 'rank_diff_percent', render: (val) => `${val}%` },
                  ]}
                  pagination={false}
                  rowKey="subject"
                />
              </>
            )}
          </TabPane>

          <TabPane tab="成绩趋势" key="trend">
            <Card title="成绩变化趋势" style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="score"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="总分"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="rank"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="年级排名"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </TabPane>

          <TabPane tab="考试历史" key="history">
            <Table
              dataSource={studentDetail.exam_history}
              columns={[
                { title: '考试名称', dataIndex: 'exam_name', key: 'exam_name' },
                { title: '考试日期', dataIndex: 'exam_date', key: 'exam_date', render: (date) => moment(date).format('YYYY-MM-DD') },
                { title: '总分', dataIndex: 'total_score', key: 'total_score' },
                { title: '年级排名', dataIndex: 'grade_rank', key: 'grade_rank' },
                { title: '班内排名', dataIndex: 'class_rank', key: 'class_rank' },
                { title: '进退步', key: 'trend', render: (_: any, record: { grade_rank: number }, index: number) => {
                  if (index === studentDetail.exam_history.length - 1) return '-';
                  const next = studentDetail.exam_history[index + 1];
                  const change = next.grade_rank - record.grade_rank;
                  if (change < 0) return <RiseOutlined style={{ color: '#52c41a' }} />;
                  if (change > 0) return <FallOutlined style={{ color: '#ff4d4f' }} />;
                  return <MinusOutlined />;
                }},

              ]}
              pagination={false}
              rowKey="id"
            />
          </TabPane>
        </Tabs>
      </Modal>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" tip="正在加载学生数据..." />
      </div>
    );
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        <UserOutlined /> 学生动态监控
      </Title>

      <Card style={{ marginBottom: 24 }}>
        <Form layout="inline" form={searchForm}>
          <Form.Item name="student_type" label="学生类型">
            <Select
              style={{ width: 150 }}
              value={studentType}
              onChange={setStudentType}
            >
              {studentTypes.map(type => (
                <Option key={type.value} value={type.value}>
                  <Tag color={type.color}>{type.label}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="class_name" label="班级">
            <Input placeholder="输入班级筛选" onChange={(e) => setClassFilter(e.target.value)} />
          </Form.Item>
          <Form.Item name="student_number" label="学号">
            <Input placeholder="输入学号搜索" />
          </Form.Item>
          <Form.Item name="student_name" label="姓名">
            <Input placeholder="输入姓名搜索" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={fetchStudentList}>
              查询
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TeamOutlined />
                <span>学生列表</span>
                <Text style={{ marginLeft: 16, fontSize: 12, color: '#666' }}>
                  共找到 {studentList.length} 名学生
                </Text>
              </div>
            }
          >
            <Table
              columns={columns}
              dataSource={studentList}
              rowKey="student_number"
              pagination={{ pageSize: 15 }}
              scroll={{ x: 1300 }}
              bordered
            />
          </Card>
        </Col>
      </Row>

      <StudentDetailModal />
    </div>
  );
};

export default StudentMonitor;