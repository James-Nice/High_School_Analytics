import React, { useState } from 'react';
import {
  Card, Select, Row, Col, Statistic, Table, Tag, Tabs, Spin, Alert,
  Form, Input, InputNumber, Button, Progress
} from 'antd';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import {
  BarChartOutlined, PieChartOutlined, LineChartOutlined,
  TeamOutlined
} from '@ant-design/icons';
import axios from 'axios';

const Option = Select.Option;
const { TabPane } = Tabs;

const Analysis: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [examList, setExamList] = useState<any[]>([
    { value: 1, label: '2026年下学期高二第一次月考 (高二 - 月考)' },
    { value: 3, label: '2026年下学期高一第一次月考 (高一 - 月考)' },
    { value: 6, label: '中考成绩 (初中 - 中考)' }
  ]);
  const [selectedExam, setSelectedExam] = useState<number | null>(1);
  const [statisticalData, setStatisticalData] = useState<any>(null);
  const [classComparison, setClassComparison] = useState<any[]>([]);
  const [subjectAnalysis, setSubjectAnalysis] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('chinese_score');
  const [subjectScoreDistribution, setSubjectScoreDistribution] = useState<any[]>([]);
  const [classSubjectRanking, setClassSubjectRanking] = useState<any[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string>('overview');

  // 学科列表
  const SUBJECTS = [
    { value: 'chinese_score', label: '语文' },
    { value: 'math_score', label: '数学' },
    { value: 'english_score', label: '英语' },
    { value: 'physics_score', label: '物理' },
    { value: 'chemistry_score', label: '化学' },
    { value: 'biology_score', label: '生物' },
    { value: 'politics_score', label: '政治' },
    { value: 'geography_score', label: '地理' }
  ];

  // 颜色数组
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // 直接调用fetchStatisticalData函数获取统计数据
  const fetchStatisticalData = React.useCallback(async () => {
    console.log('开始获取统计数据...');
    console.log('selectedExam:', selectedExam);
    if (!selectedExam) return;

    try {
      setLoading(true);
      console.log('发送API请求获取统计数据...');
      const response = await axios.get('http://localhost:5000/api/analysis/statistical', {
        params: { exam_id: selectedExam }
      });
      console.log('获取统计数据成功:', response.data);
      setStatisticalData(response.data);

      // 获取班级对比数据
      console.log('发送API请求获取班级对比数据...');
      const classResponse = await axios.get('http://localhost:5000/api/analysis/class-comparison', {
        params: { exam_id: selectedExam }
      });
      console.log('获取班级对比数据成功:', classResponse.data);
      setClassComparison(classResponse.data);

      // 获取学科分析数据
      console.log('发送API请求获取学科分析数据...');
      const subjectResponse = await axios.get('http://localhost:5000/api/analysis/subject-analysis', {
        params: { exam_id: selectedExam }
      });
      console.log('获取学科分析数据成功:', subjectResponse.data);
      setSubjectAnalysis(subjectResponse.data);

      // 获取对比分析数据
      console.log('发送API请求获取对比分析数据...');
      await axios.get('http://localhost:5000/api/analysis/comparison', {
        params: { exam_id: selectedExam }
      });
      console.log('获取对比分析数据成功');
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedExam]);

  // 组件初始化时获取统计数据
  React.useEffect(() => {
    if (selectedExam) {
      fetchStatisticalData();
      // 初始化时获取学科分数分布和班级排名
      fetchSubjectScoreDistribution(selectedExam, selectedSubject);
      fetchClassSubjectRanking(selectedExam, selectedSubject);
    }
  }, [selectedExam, fetchStatisticalData, selectedSubject]);

  // 获取学科分数分布数据
  const fetchSubjectScoreDistribution = async (examId: number, subject: string) => {
    try {
      const response = await axios.get('http://localhost:5000/api/dashboard/subject-distribution', {
        params: {
          exam_id: examId,
          subject: subject
        }
      });
      setSubjectScoreDistribution(response.data);
    } catch (error) {
      console.error('获取学科分数分布失败:', error);
    }
  };

  // 获取班级学科均值排名
  const fetchClassSubjectRanking = async (examId: number, subject: string) => {
    try {
      const response = await axios.get('http://localhost:5000/api/dashboard/class-subject-ranking', {
        params: {
          exam_id: examId,
          subject: subject
        }
      });
      setClassSubjectRanking(response.data);
    } catch (error) {
      console.error('获取班级学科均值排名失败:', error);
    }
  };

  // 当学科变化时，重新获取分数分布和班级排名
  React.useEffect(() => {
    if (selectedExam) {
      fetchSubjectScoreDistribution(selectedExam, selectedSubject);
      fetchClassSubjectRanking(selectedExam, selectedSubject);
    }
  }, [selectedSubject, selectedExam]);

  const [trendData, setTrendData] = useState<any[]>([]);
  const [studentAnalysis, setStudentAnalysis] = useState<any>(null);
  const [form] = Form.useForm();

  // 暂时注释掉API调用，直接使用硬编码数据
  // useEffect(() => {
  //   fetchExamList();
  // }, []);

  const fetchExamList = async () => {
    try {
      console.log('开始获取考试列表...');
      const response = await axios.get('/api/exams');
      console.log('获取考试列表成功:', response.data);
      const formattedExams = response.data.map((exam: any) => ({
        value: exam.id,
        label: `${exam.name} (${exam.grade} - ${exam.type})`
      }));
      console.log('格式化后的考试列表:', formattedExams);
      setExamList(formattedExams);
    } catch (error) {
      console.error('获取考试列表失败:', error);
    }
  };

  const fetchStudentAnalysis = async (studentNumber: string) => {
    try {
      const response = await axios.get(`/api/analysis/student-analysis/${studentNumber}`);
      setStudentAnalysis(response.data);
    } catch (error) {
      console.error('获取学生分析失败:', error);
    }
  };

  const handleSearchStudent = async (values: any) => {
    fetchStudentAnalysis(values.student_number);
  };

  const fetchTrendData = async (values: any) => {
    try {
      const response = await axios.get('/api/analysis/trend-analysis', {
        params: {
          student_number: values.student_number,
          class_name: values.class_name,
          grade: values.grade,
          days: values.days || 180
        }
      });
      setTrendData(response.data);
    } catch (error) {
      console.error('获取趋势数据失败:', error);
    }
  };

  const scoreRanges = [
    { min: 135, max: 150, label: '尖子生', color: '#FFD700' },
    { min: 120, max: 134, label: '优秀', color: '#C0C0C0' },
    { min: 90, max: 119, label: '良好', color: '#CD7F32' },
    { min: 60, max: 89, label: '及格', color: '#228B22' },
    { min: 0, max: 59, label: '不及格', color: '#FF4500' }
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>统计分析</h1>
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label style={{ marginRight: 12 }}>选择考试：</label>
          <Select
            style={{ width: 250 }}
            placeholder="请选择考试"
            value={selectedExam}
            onChange={(value) => {
              console.log('选择考试变化:', value);
              setSelectedExam(value);
              if (value) {
                console.log('调用fetchStatisticalData函数...');
                fetchStatisticalData();
              }
            }}
          >
            {examList.map(item => (
              <Option key={item.value} value={item.value}>
                {item.label}
              </Option>
            ))}
          </Select>
          <Button type="primary" style={{ marginLeft: 12 }} onClick={() => form.submit()}>
            分 析
          </Button>
        </div>
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', padding: 50 }}>
          <Spin size="large" tip="正在加载分析数据..." />
        </div>
      )}

      {!loading && statisticalData && (
        <Tabs activeKey={activeTabKey} onChange={setActiveTabKey} style={{ marginBottom: 24 }}>
          <TabPane
            tab={
              <span>
                <BarChartOutlined />
                总体概览
              </span>
            }
            key="overview"
          >
            <Row gutter={16}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="均值"
                    value={statisticalData.avg_score || 0}
                    precision={2}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="最高分"
                    value={statisticalData.max_score || 0}
                    precision={2}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="最低分"
                    value={statisticalData.min_score || 0}
                    precision={2}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总人数"
                    value={statisticalData.total_students || 0}
                    precision={0}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginTop: 24 }}>
              <Col span={12}>
                <Card title="成绩分布" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', height: '100%' }}>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: '尖子生',
                            value: statisticalData.top_students || 0,
                            color: '#FFD700'
                          },
                          {
                            name: '优秀生',
                            value: (statisticalData.excellent_students || 0) - (statisticalData.top_students || 0),
                            color: '#4A90D9'
                          },
                          {
                            name: '良好生',
                            value: (statisticalData.good_students || 0) - (statisticalData.excellent_students || 0),
                            color: '#CD7F32'
                          },
                          {
                            name: '及格生',
                            value: (statisticalData.passed_students || 0) - (statisticalData.good_students || 0),
                            color: '#228B22'
                          },
                          {
                            name: '待进生',
                            value: statisticalData.potential_students || 0,
                            color: '#9370DB'
                          },
                          {
                            name: '低分生',
                            value: statisticalData.low_students || 0,
                            color: '#C0C0C0'
                          }
                        ]}
                        cx="50%"
                        cy="50%"
                        label={({ name, value, percent }) => `${name}: ${value}人 (${((percent || 0) * 100).toFixed(1)}%)`}
                        labelLine={{ stroke: '#999', strokeWidth: 1, strokeDasharray: '2 2' }}
                        outerRadius={110}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                        animationDuration={1500}
                      >
                        {
                        [
                          { color: '#FFD700' },
                          { color: '#1890ff' },
                          { color: '#fa8c16' },
                          { color: '#52c41a' },
                          { color: '#9370DB' },
                          { color: '#ff4d4f' }
                        ].map((item, index) => (
                          <Cell key={`cell-${index}`} fill={item.color} stroke="#fff" strokeWidth={1} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value}人`, name]} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="等级分布" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', height: '100%' }}>
                  <Table
                    dataSource={[
                      {
                        level: '尖子生',
                        threshold: '≥ 637.5',
                        count: statisticalData.top_students || 0,
                        rate: statisticalData.top_rate || 0,
                        color: '#FFD700'
                      },
                      {
                        level: '优秀生',
                        threshold: '≥ 600',
                        count: statisticalData.excellent_students || 0,
                        rate: statisticalData.excellent_rate || 0,
                        color: '#1890ff'
                      },
                      {
                        level: '良好生',
                        threshold: '≥ 525',
                        count: statisticalData.good_students || 0,
                        rate: statisticalData.good_rate || 0,
                        color: '#fa8c16'
                      },
                      {
                        level: '及格生',
                        threshold: '≥ 450',
                        count: statisticalData.passed_students || 0,
                        rate: statisticalData.passed_rate || 0,
                        color: '#52c41a'
                      },
                      {
                        level: '待进生',
                        threshold: '> 300 且 < 450',
                        count: statisticalData.potential_students || 0,
                        rate: statisticalData.potential_rate || 0,
                        color: '#9370DB'
                      },
                      {
                        level: '低分生',
                        threshold: '≤ 300',
                        count: statisticalData.low_students || 0,
                        rate: statisticalData.low_rate || 0,
                        color: '#ff4d4f'
                      }
                    ]}
                    columns={[
                      { title: '等级', dataIndex: 'level', key: 'level', render: (text, record) => <Tag color={record.color}>{text}</Tag> },
                      { title: '分数阈值', dataIndex: 'threshold', key: 'threshold' },
                      { title: '人数', dataIndex: 'count', key: 'count' },
                      { title: '比例', dataIndex: 'rate', key: 'rate', render: (rate) => `${rate}%` }
                    ]}
                    pagination={false}
                    rowKey="level"
                    size="middle"
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane
            tab={
              <span>
                <TeamOutlined />
                班级对比
              </span>
            }
            key="class"
          >
            <Card title="班级成绩对比" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', height: '100%' }}>
              <Table
                dataSource={classComparison}
                columns={[
                  { title: '班级', dataIndex: 'class_name', key: 'class_name' },
                  { title: '学生人数', dataIndex: 'student_count', key: 'student_count' },
                  {
                    title: '均值',
                    dataIndex: 'avg_score',
                    key: 'avg_score',
                    render: (value) => (
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {value || 0}
                      </div>
                    )
                  },
                  { title: '最高分', dataIndex: 'max_score', key: 'max_score' },
                  { title: '最低分', dataIndex: 'min_score', key: 'min_score' },
                  {
                    title: '尖生率',
                    dataIndex: 'top_rate',
                    key: 'top_rate',
                    render: (rate) => <Tag color="gold">{rate}%</Tag>
                  },
                  {
                    title: '优秀率',
                    dataIndex: 'excellent_rate',
                    key: 'excellent_rate',
                    render: (rate) => <Tag color="blue">{rate}%</Tag>
                  },
                  {
                    title: '良好率',
                    dataIndex: 'good_rate',
                    key: 'good_rate',
                    render: (rate) => <Tag color="orange">{rate}%</Tag>
                  },
                  {
                    title: '及格率',
                    dataIndex: 'passed_rate',
                    key: 'passed_rate',
                    render: (rate) => <Tag color="green">{rate}%</Tag>
                  },
                  {
                    title: '待进率',
                    dataIndex: 'potential_rate',
                    key: 'potential_rate',
                    render: (rate) => <Tag color="purple">{rate}%</Tag>
                  },
                  {
                    title: '低分率',
                    dataIndex: 'low_rate',
                    key: 'low_rate',
                    render: (rate) => <Tag color="red">{rate}%</Tag>
                  }
                ]}
                pagination={{ pageSize: 10 }}
                rowKey="class_name"
              />
            </Card>

            <Card title="班级均值 高低分对比图" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', marginTop: 24, height: 400 }}>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={classComparison} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="class_name" />
                  <YAxis domain={[0, 750]} ticks={[150, 300, 450, 600, 750]} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div style={{ backgroundColor: 'white', border: '1px solid #ccc', padding: '10px', borderRadius: '4px' }}>
                          <p style={{ margin: '0 0 8px 0' }}>{label}</p>
                          {payload.map((entry, index) => {
                            if (entry.dataKey === 'avg_score') {
                              return (
                                <p key={`item-${index}`} style={{ margin: '4px 0', color: entry.color }}>
                                  均值: {Number(entry.value).toFixed(2)}
                                </p>
                              );
                            }
                            if (entry.dataKey === 'max_score') {
                              return (
                                <p key={`item-${index}`} style={{ margin: '4px 0', color: entry.color }}>
                                  最高分: {entry.value}
                                </p>
                              );
                            }
                            if (entry.dataKey === 'min_score') {
                              return (
                                <p key={`item-${index}`} style={{ margin: '4px 0', color: entry.color }}>
                                  最低分: {entry.value}
                                </p>
                              );
                            }
                            return null;
                          })}
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                  <Bar dataKey="avg_score" fill="#8884d8" name="均值" animationDuration={1500} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="avg_score" position="top" formatter={(value) => `${value}`} fill="#666" fontSize={12} />
                  </Bar>
                  <Bar dataKey="max_score" fill="#82ca9d" name="最高分" animationDuration={1500} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="max_score" position="top" formatter={(value) => `${value}`} fill="#666" fontSize={12} />
                  </Bar>
                  <Bar dataKey="min_score" fill="#ffc658" name="最低分" animationDuration={1500} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="min_score" position="top" formatter={(value) => `${value}`} fill="#666" fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <PieChartOutlined />
                学科分析
              </span>
            }
            key="subject"
          >
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={12}>
                <Card 
                  title="成绩分布" 
                  style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', height: '100%' }}
                  extra={
                    <Select
                      value={selectedSubject}
                      style={{ width: 120 }}
                      onChange={(value) => setSelectedSubject(value)}
                    >
                      {SUBJECTS.map((subject) => (
                        <Option key={subject.value} value={subject.value}>
                          {subject.label}
                        </Option>
                      ))}
                    </Select>
                  }
                >
                  <div style={{ marginBottom: 16 }}></div>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={subjectScoreDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        innerRadius={40}
                        dataKey="count"
                        nameKey="range"
                        label={({ name, value, percent }) => `${name}: ${value}人 (${((percent || 0) * 100).toFixed(1)}%)`}
                        labelLine={{ stroke: '#999', strokeWidth: 1, strokeDasharray: '2 2' }}
                        paddingAngle={2}
                        animationDuration={1500}
                      >
                        {subjectScoreDistribution.map((entry, index) => {
                        const colors = ['#FFD700', '#1890ff', '#fa8c16', '#52c41a', '#9370DB', '#ff4d4f'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="#fff" strokeWidth={1} />;
                      })}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any) => [`${value}人`, name]} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              <Col span={12}>
                <Card title={`${SUBJECTS.find(s => s.value === selectedSubject)?.label || ''}等级分布`} style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', height: '100%' }}>
                  <Table
                    dataSource={subjectScoreDistribution.map((item) => ({
                      level: item.range,
                      threshold: item.threshold,
                      count: item.count,
                      rate: ((item.count / (subjectScoreDistribution.reduce((sum, item) => sum + item.count, 0))) * 100).toFixed(2)
                    }))}
                    columns={[
                      { title: '等级', dataIndex: 'level', key: 'level', render: (text) => {
                        const colorMap: { [key: string]: string } = {
                          '尖子生': '#FFD700',
                          '优秀生': '#1890ff',
                          '良好生': '#fa8c16',
                          '及格生': '#52c41a',
                          '待进生': '#9370DB',
                          '低分生': '#ff4d4f'
                        };
                        return <Tag color={colorMap[text] || 'default'}>{text}</Tag>;
                      } },
                      { title: '分数阈值', dataIndex: 'threshold', key: 'threshold' },
                      { title: '人数', dataIndex: 'count', key: 'count' },
                      { title: '比例', dataIndex: 'rate', key: 'rate', render: (rate) => `${rate}%` }
                    ]}
                    pagination={false}
                    rowKey="level"
                    size="middle"
                  />
                </Card>
              </Col>
            </Row>
            <Card title={`班级${SUBJECTS.find(s => s.value === selectedSubject)?.label || ''}学科均值 高低分对比图`} style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', marginBottom: 24, height: 400 }}>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={classSubjectRanking} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="class_name" />
                  <YAxis 
                    domain={selectedSubject.includes('_score') ? (['chinese_score', 'math_score', 'english_score'].includes(selectedSubject) ? [0, 150] : [0, 100]) : [0, 100]} 
                    ticks={selectedSubject.includes('_score') ? (['chinese_score', 'math_score', 'english_score'].includes(selectedSubject) ? [30, 60, 90, 120, 150] : [20, 40, 60, 80, 100]) : [20, 40, 60, 80, 100]} 
                    tickFormatter={(value) => `${value}`} 
                  />
                  <Tooltip content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div style={{ backgroundColor: 'white', border: '1px solid #ccc', padding: '10px', borderRadius: '4px' }}>
                          <p style={{ margin: '0 0 8px 0' }}>{label}</p>
                          {payload.map((entry, index) => {
                            if (entry.dataKey === 'avg_score') {
                              return (
                                <p key={`item-${index}`} style={{ margin: '4px 0', color: entry.color }}>
                                  {SUBJECTS.find(s => s.value === selectedSubject)?.label || ''}均值: {Number(entry.value).toFixed(2)}
                                </p>
                              );
                            }
                            if (entry.dataKey === 'max_score') {
                              return (
                                <p key={`item-${index}`} style={{ margin: '4px 0', color: entry.color }}>
                                  最高分: {entry.value}
                                </p>
                              );
                            }
                            if (entry.dataKey === 'min_score') {
                              return (
                                <p key={`item-${index}`} style={{ margin: '4px 0', color: entry.color }}>
                                  最低分: {entry.value}
                                </p>
                              );
                            }
                            return null;
                          })}
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center" 
                  />
                  <Bar dataKey="avg_score" fill="#8884d8" name="均值" animationDuration={1500} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="avg_score" position="top" formatter={(value) => `${value}`} fill="#666" fontSize={12} />
                  </Bar>
                  <Bar dataKey="max_score" fill="#82ca9d" name="最高分" animationDuration={1500} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="max_score" position="top" formatter={(value) => `${value}`} fill="#666" fontSize={12} />
                  </Bar>
                  <Bar dataKey="min_score" fill="#ffc658" name="最低分" animationDuration={1500} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="min_score" position="top" formatter={(value) => `${value}`} fill="#666" fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="学科成绩分析" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', height: '100%' }}>
              <Table
                dataSource={subjectAnalysis ? Object.keys(subjectAnalysis).map(subject => {
                  const subjectMap: { [key: string]: string } = {
                    chinese_score: '语文',
                    math_score: '数学',
                    english_score: '英语',
                    physics_score: '物理',
                    chemistry_score: '化学',
                    biology_score: '生物',
                    politics_score: '政治',
                    geography_score: '地理'
                  };
                  return {
                    subject: subjectMap[subject] || subject,
                    ...subjectAnalysis[subject]
                  };
                }) : []}
                columns={[
                  { title: '学科', dataIndex: 'subject', key: 'subject' },
                  { title: '均值', dataIndex: 'avg_score', key: 'avg_score' },
                  { title: '参考人数', dataIndex: 'student_count', key: 'student_count' },
                  {
                    title: '得分率',
                    key: 'score_rate',
                    render: (_, record) => {
                      const fullScore = record.subject.match(/(语文|数学|英语)/) ? 150 : 100;
                      const rate = ((record.avg_score / fullScore) * 100).toFixed(2);
                      return <Progress percent={parseFloat(rate)} size="small" />;
                    }
                  }
                ]}
                pagination={false}
                rowKey="subject"
              />
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <LineChartOutlined />
                趋势分析
              </span>
            }
            key="trend"
          >
            <Card title="学生成绩趋势分析" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', height: '100%' }}>
              <Form layout="inline" onFinish={fetchTrendData}>
                <Form.Item name="student_number" label="学号">
                  <Input placeholder="输入学号" />
                </Form.Item>
                <Form.Item name="class_name" label="班级">
                  <Input placeholder="输入班级" />
                </Form.Item>
                <Form.Item name="grade" label="年级">
                  <Select style={{ width: 100 }}>
                    <Option value="高一">高一</Option>
                    <Option value="高二">高二</Option>
                    <Option value="高三">高三</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="days" label="天数">
                  <InputNumber defaultValue={180} min={30} max={365} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit">
                    查询趋势
                  </Button>
                </Form.Item>
              </Form>

              {trendData.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="exam_name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="total_score"
                        stroke="#8884d8"
                        strokeWidth={2}
                        name="总分"
                      />
                      <Line
                        type="monotone"
                        dataKey="grade_rank"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        name="年级排名"
                        yAxisId="right"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card title="学生个人分析" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', marginTop: 24, height: '100%' }}>
              <Form layout="inline" onFinish={handleSearchStudent}>
                <Form.Item name="student_number" label="学号" required>
                  <Input placeholder="输入学号查询" style={{ width: 200 }} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit">
                    查询学生分析
                  </Button>
                </Form.Item>
              </Form>

              {studentAnalysis && (
                <div style={{ marginTop: 24 }}>
                  <Alert
                    message="学生学情分析"
                    description={
                      <div>
                        <p>姓名：{studentAnalysis.student_info.student_name}</p>
                        <p>学号：{studentAnalysis.student_info.student_number}</p>
                        <p>班级：{studentAnalysis.student_info.class_name}</p>
                        <p>总分：{studentAnalysis.student_info.total_score}</p>
                        <p>年级排名：{studentAnalysis.student_info.grade_rank}</p>
                        {studentAnalysis.weak_subjects.length > 0 && (
                          <p>
                            偏科科目：{studentAnalysis.weak_subjects.map((ws: any) => (
                              <Tag key={ws.subject} color="red" style={{ marginLeft: 8 }}>
                                {ws.subject} (排名差距：{ws.rank_diff_percent}%)
                              </Tag>
                            ))}
                          </p>
                        )}
                      </div>
                    }
                    type="info"
                    showIcon
                  />
                </div>
              )}
            </Card>
          </TabPane>
        </Tabs>
      )}
    </div>
  );
};

export default Analysis;