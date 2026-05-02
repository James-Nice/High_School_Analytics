import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Progress, Tag, Spin, Alert, Select, Button, Modal, Form, InputNumber, Popconfirm, Input } from 'antd';
import { DownloadOutlined, SettingOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import axios from 'axios';
import moment from 'moment';

const { Option } = Select;

const COLORS = ['#FFD700', '#1890ff', '#fa8c16', '#52c41a', '#9370DB', '#ff4d4f'];

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

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [classRanking, setClassRanking] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [warningData, setWarningData] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [examList, setExamList] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('chinese_score');
  const [subjectScoreDistribution, setSubjectScoreDistribution] = useState<any[]>([]);
  const [schoolRankingSegments, setSchoolRankingSegments] = useState<any[]>([]);
  const [totalScoreSegments, setTotalScoreSegments] = useState<any[]>([]);
  const [customRankingModalVisible, setCustomRankingModalVisible] = useState(false);
  const [customRankingMode, setCustomRankingMode] = useState<'percent' | 'rank'>('percent');
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [customRankingSegments, setCustomRankingSegments] = useState<any[]>([
    { name: '前10%', min: 0, max: 0.1 },
    { name: '前20%', min: 0.1, max: 0.2 },
    { name: '前30%', min: 0.2, max: 0.3 },
    { name: '前50%', min: 0.3, max: 0.5 },
    { name: '50%以后', min: 0.5, max: 1 }
  ]);
  const [customScoreModalVisible, setCustomScoreModalVisible] = useState(false);
  const [customScoreSegments, setCustomScoreSegments] = useState<any[]>([
    { name: '600以上', min: 600, max: 750 },
    { name: '550-599', min: 550, max: 599 },
    { name: '500-549', min: 500, max: 549 },
    { name: '450-499', min: 450, max: 499 },
    { name: '400-449', min: 400, max: 449 },
    { name: '400以下', min: 0, max: 399 }
  ]);

  // 从 localStorage 加载保存的设置
  useEffect(() => {
    // 加载排名段设置
    const savedMode = localStorage.getItem('customRankingMode');
    if (savedMode === 'percent' || savedMode === 'rank') {
      setCustomRankingMode(savedMode);
    }
    
    const savedSegments = localStorage.getItem('customRankingSegments');
    if (savedSegments) {
      try {
        const parsed = JSON.parse(savedSegments);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomRankingSegments(parsed);
        }
      } catch (error) {
        console.error('解析保存的排名段设置失败:', error);
      }
    }
    
    // 加载总分分数段设置
    const savedScoreSegments = localStorage.getItem('customScoreSegments');
    if (savedScoreSegments) {
      try {
        const parsed = JSON.parse(savedScoreSegments);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomScoreSegments(parsed);
        }
      } catch (error) {
        console.error('解析保存的总分分数段设置失败:', error);
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/exams');
        setExamList(response.data);
        if (response.data.length > 0) {
          const examId = response.data[0].id;
          setSelectedExam(examId);

          // 立即获取对应考试的数据
          const overviewResponse = await axios.get(`http://localhost:5000/api/dashboard/overview?exam_id=${examId}`);
          setOverviewData(overviewResponse.data);
          if (overviewResponse.data.class_ranking) {
            setClassRanking(overviewResponse.data.class_ranking);
          }

          const trendResponse = await axios.get('http://localhost:5000/api/dashboard/trend-data');
          setTrendData(trendResponse.data);

          const warningResponse = await axios.get('http://localhost:5000/api/dashboard/warnings?resolved=false');
          setWarningData(warningResponse.data);
          
          // 获取学科分数分布（初始加载，不显示loading）
          await fetchSubjectScoreDistribution(examId, selectedSubject, true);
          
          // 获取校排名段数据（使用自定义段次）
          const segmentsParam = encodeURIComponent(JSON.stringify(customRankingSegments));
          const rankingSegmentsResponse = await axios.get(`http://localhost:5000/api/dashboard/school-ranking-segments?exam_id=${examId}&segments=${segmentsParam}&mode=${customRankingMode}`);
          const rankingData = rankingSegmentsResponse.data.data || rankingSegmentsResponse.data;
          setSchoolRankingSegments(rankingData);
          const students = rankingSegmentsResponse.data.total_students || totalStudents;
          setTotalStudents(students);
          
          // 获取总分分数段数据
          const scoreSegmentsParam = encodeURIComponent(JSON.stringify(customScoreSegments));
          const scoreSegmentsResponse = await axios.get(`http://localhost:5000/api/dashboard/total-score-segments?exam_id=${examId}&segments=${scoreSegmentsParam}`);
          setTotalScoreSegments(scoreSegmentsResponse.data);
        }
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 获取学科分数分布数据
  const fetchSubjectScoreDistribution = async (examId: number, subject: string, isInitial = false) => {
    try {
      if (!isInitial) {
        setLoading(true);
      }
      const response = await axios.get(`http://localhost:5000/api/dashboard/subject-distribution`, {
        params: {
          exam_id: examId,
          subject: subject
        }
      });
      setSubjectScoreDistribution(response.data);
    } catch (error) {
      console.error('获取学科分数分布失败:', error);
    } finally {
      if (!isInitial) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (selectedExam) {
        try {
          setLoading(true);
          const overviewResponse = await axios.get(`http://localhost:5000/api/dashboard/overview?exam_id=${selectedExam}`);
          setOverviewData(overviewResponse.data);
          if (overviewResponse.data.class_ranking) {
            setClassRanking(overviewResponse.data.class_ranking);
          }

          const trendResponse = await axios.get('http://localhost:5000/api/dashboard/trend-data');
          setTrendData(trendResponse.data);

          const warningResponse = await axios.get('http://localhost:5000/api/dashboard/warnings?resolved=false');
          setWarningData(warningResponse.data);

          // 获取学科分数分布
          await fetchSubjectScoreDistribution(selectedExam, selectedSubject, true);
          
          // 获取校排名段数据
          const segmentsParam = encodeURIComponent(JSON.stringify(customRankingSegments));
          const rankingSegmentsResponse = await axios.get(`http://localhost:5000/api/dashboard/school-ranking-segments?exam_id=${selectedExam}&segments=${segmentsParam}&mode=${customRankingMode}`);
          setSchoolRankingSegments(rankingSegmentsResponse.data.data || []);
          
          // 获取总分分数段数据
          const scoreSegmentsParam = encodeURIComponent(JSON.stringify(customScoreSegments));
          const scoreSegmentsResponse = await axios.get(`http://localhost:5000/api/dashboard/total-score-segments?exam_id=${selectedExam}&segments=${scoreSegmentsParam}`);
          setTotalScoreSegments(scoreSegmentsResponse.data);
        } catch (error) {
          console.error('获取数据失败:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    // 只有当selectedExam不为null时才调用，避免首次渲染时的时序问题
    if (selectedExam) {
      fetchDashboardData();
    }
  }, [selectedExam]);

  // 当学科变化时，重新获取分数分布
  useEffect(() => {
    if (selectedExam) {
      fetchSubjectScoreDistribution(selectedExam, selectedSubject, false);
    }
  }, [selectedSubject, selectedExam]);

  const scoreRanges = [
    { range: '135-150', label: '尖子生', color: '#FFD700' },
    { range: '120-134', label: '优秀', color: '#C0C0C0' },
    { range: '90-119', label: '良好', color: '#CD7F32' },
    { range: '60-89', label: '及格', color: '#228B22' },
    { range: '0-59', label: '不及格', color: '#FF4500' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" tip="正在加载数据..." />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>数据运营分析大屏</h1>

      {/* 考试选择 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Select
            placeholder="请选择考试"
            onChange={(value) => setSelectedExam(value)}
            value={selectedExam}
            style={{ width: '100%' }}
          >
            {examList.map(exam => (
              <Option key={exam.id} value={exam.id}>
                {exam.name} ({exam.grade} - {exam.type})
              </Option>
            ))}
          </Select>
        </Col>
        <Col span={4}>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={async () => {
              if (selectedExam) {
                setLoading(true);
                try {
                  const overviewResponse = await axios.get(`http://localhost:5000/api/dashboard/overview?exam_id=${selectedExam}`);
                  setOverviewData(overviewResponse.data);
                  if (overviewResponse.data.class_ranking) {
                    setClassRanking(overviewResponse.data.class_ranking);
                  }
                  const trendResponse = await axios.get('http://localhost:5000/api/dashboard/trend-data');
                  setTrendData(trendResponse.data);
                  const warningResponse = await axios.get('http://localhost:5000/api/dashboard/warnings?resolved=false');
                  setWarningData(warningResponse.data);
                } catch (error) {
                  console.error('刷新数据失败:', error);
                } finally {
                  setLoading(false);
                }
              }
            }}
            loading={loading}
          >
            刷新数据
          </Button>
        </Col>
      </Row>

      {/* 概览数据 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="考试名称"
              value={overviewData?.exam_info?.exam_name || '-'}
              valueStyle={{ fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="考试日期"
              value={moment(overviewData?.exam_info?.exam_date).format('YYYY-MM-DD')}
              valueStyle={{ fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="参与学生"
              value={overviewData?.exam_info?.total_students || 0}
              precision={0}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="班级数量"
              value={overviewData?.exam_info?.total_classes || 0}
              precision={0}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 统计图表 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="总体成绩分布" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', height: '100%' }}>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: '尖子生',
                      value: (overviewData?.top_students || 0),
                      color: '#FFD700'
                    },
                    {
                      name: '优秀生',
                      value: (overviewData?.excellent_students || 0) - (overviewData?.top_students || 0),
                      color: '#4A90D9'
                    },
                    {
                      name: '良好生',
                      value: (overviewData?.good_students || 0) - (overviewData?.excellent_students || 0),
                      color: '#CD7F32'
                    },
                    {
                      name: '及格生',
                      value: (overviewData?.passed_students || 0) - (overviewData?.good_students || 0),
                      color: '#228B22'
                    },
                    {
                      name: '待进生',
                      value: (overviewData?.potential_students || 0),
                      color: '#9370DB'
                    },
                    {
                      name: '低分生',
                      value: (overviewData?.low_students || 0),
                      color: '#C0C0C0'
                    }
                  ]}
                  cx="50%"
                  cy="50%"
                  label={({ name, value, percent }: any) => `${name}: ${value}人 (${((percent || 0) * 100).toFixed(1)}%)`}
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
                <Tooltip formatter={(value: any, name: any) => [`${value}人`, name]} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card 
            title="学科成绩分布" 
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
            <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={subjectScoreDistribution || []}
                    cx="50%"
                    cy="50%"
                    labelLine={{ stroke: '#999', strokeWidth: 1, strokeDasharray: '2 2' }}
                    label={({ name, value, percent }: any) => `${name}: ${value}人 (${((percent || 0) * 100).toFixed(1)}%)`}
                    outerRadius={110}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="range"
                    paddingAngle={2}
                    animationDuration={1500}
                  >
                    {(subjectScoreDistribution || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [`${value}人`, name]} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                </PieChart>
              </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="班级均值排名" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={classRanking} margin={{ top: 40, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class_name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={40} />
                <YAxis ticks={[150, 300, 450, 600, 750]} />
                <Tooltip formatter={(value: any) => [`${Number(value).toFixed(2)}分`, '均值']} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                <Bar dataKey="avg_score" fill="#8884d8" name="均值">
                  <LabelList dataKey="avg_score" position="top" style={{ fontSize: 12 }} formatter={(value: any) => Number(value).toFixed(2)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 校排名 分段统计 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card 
            title="校排名 分段统计" 
            extra={<Button type="primary" icon={<SettingOutlined />} onClick={() => setCustomRankingModalVisible(true)}>设置</Button>}
            style={{ marginBottom: 24, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
          >
            <div style={{ overflowX: 'auto' }}>
              <Table
                dataSource={[
                  ...(Array.isArray(schoolRankingSegments) ? schoolRankingSegments : []),
                  {
                    segment: '总人数',
                    range: '',
                    class_counts: Object.keys((Array.isArray(schoolRankingSegments) && schoolRankingSegments[0]?.class_counts) || {}).reduce((acc: { [key: string]: number }, className) => {
                      acc[className] = (Array.isArray(schoolRankingSegments) ? schoolRankingSegments : []).reduce((sum, segment) => {
                        return sum + (segment.class_counts[className] || 0);
                      }, 0);
                      return acc;
                    }, {})
                  }
                ]}
                columns={[
                  { title: '排名百分比', dataIndex: 'segment', key: 'segment' },
                  { 
                    title: '排名段', 
                    dataIndex: 'range', 
                    key: 'range',
                    render: (range: string) => {
                      if (range && range.includes('-')) {
                        const [min, max] = range.split('-').map(Number);
                        if (min > max) {
                          return `${max}-${min}`;
                        }
                      }
                      return range;
                    }
                  },
                  ...Object.keys((Array.isArray(schoolRankingSegments) && schoolRankingSegments[0]?.class_counts) || {}).map(className => ({
                    title: className,
                    key: className,
                    render: (_: any, record: any) => record.class_counts[className] || 0
                  }))
                ]}
                pagination={false}
                rowKey="segment"
              />
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card 
            title="总分 分数段统计" 
            extra={<Button type="primary" icon={<SettingOutlined />} onClick={() => setCustomScoreModalVisible(true)}>设置</Button>}
            style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
          >
            <div style={{ overflowX: 'auto' }}>
              <Table
                dataSource={[
                  ...totalScoreSegments,
                  {
                    segment: '总人数',
                    class_counts: Object.keys(totalScoreSegments[0]?.class_counts || {}).reduce((acc: { [key: string]: number }, className) => {
                      acc[className] = totalScoreSegments.reduce((sum, segment) => {
                        return sum + (segment.class_counts[className] || 0);
                      }, 0);
                      return acc;
                    }, {})
                  }
                ]}
                columns={[
                  { title: '分数段', dataIndex: 'segment', key: 'segment' },
                  ...Object.keys(totalScoreSegments[0]?.class_counts || {}).map(className => ({
                    title: className,
                    key: className,
                    render: (_: any, record: any) => record.class_counts[className] || 0
                  }))
                ]}
                pagination={false}
                rowKey="segment"
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 趋势图 */}
      <Row style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="成绩趋势" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', height: 400 }}>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                <Line
                  type="monotone"
                  dataKey="avg_score"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="平均分"
                />
                <Line
                  type="monotone"
                  dataKey="excellent_count"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  name="优秀人数"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 班级详细数据 */}
      <Row style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="班级成绩详情" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', height: '100%' }}>
            <Table
              dataSource={classRanking}
              columns={[
                { title: '班级', dataIndex: 'class_name', key: 'class_name' },
                { title: '学生人数', dataIndex: 'student_count', key: 'student_count' },
                {
                  title: '平均分',
                  dataIndex: 'avg_score',
                  key: 'avg_score',
                  render: (value) => (
                    <Progress
                      percent={Math.round((value / 150) * 100)}
                      size="small"
                      status={value >= 120 ? 'success' : value >= 90 ? 'normal' : 'exception'}
                    />
                  ),
                },
                { title: '最高分', dataIndex: 'max_score', key: 'max_score' },
                { title: '最低分', dataIndex: 'min_score', key: 'min_score' },
                {
                  title: '优秀率',
                  dataIndex: 'excellent_rate',
                  key: 'excellent_rate',
                  render: (value) => <Tag color="blue">{value}%</Tag>,
                },
              ]}
              pagination={{ pageSize: 10 }}
              rowKey="class_name"
            />
          </Card>
        </Col>
      </Row>

      {/* 预警信息 */}
      {warningData.length > 0 && (
        <Row>
          <Col span={24}>
            <Alert
              message="教学质量预警"
              description={`共有${warningData.length}条未处理预警，请及时关注和处理`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          </Col>
        </Row>
      )}

      {/* 自定义校排名 分段统计设置模态框 */}
      <Modal
        title="自定义校排名 分段统计设置"
        open={customRankingModalVisible}
        onCancel={() => setCustomRankingModalVisible(false)}
        footer={null}
        width={700}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <Button 
              type={customRankingMode === 'percent' ? 'primary' : 'default'}
              onClick={() => {
                if (customRankingMode !== 'percent') {
                  // 切换到百分比模式
                  setCustomRankingMode('percent');
                  // 转换为百分比格式，保留两位小数
                  setCustomRankingSegments(customRankingSegments.map(seg => {
                    const minPercent = parseFloat((seg.min / totalStudents).toFixed(2));
                    const maxPercent = parseFloat((seg.max / totalStudents).toFixed(2));
                    return {
                      name: `${Math.round(minPercent * 100)}%-${Math.round(maxPercent * 100)}%`,
                      min: minPercent,
                      max: maxPercent
                    };
                  }));
                }
              }}
            >
              百分比模式
            </Button>
            <Button 
              type={customRankingMode === 'rank' ? 'primary' : 'default'}
              onClick={() => {
                if (customRankingMode !== 'rank') {
                  // 切换到名次模式
                  setCustomRankingMode('rank');
                  // 转换为名次格式，确保起始名次至少为1
                  const rankSegments = customRankingSegments.map(seg => {
                    const minRank = Math.max(1, Math.floor(seg.min * totalStudents));
                    const maxRank = Math.floor(seg.max * totalStudents);
                    return {
                      name: `${Math.round(seg.min * 100)}%-${Math.round(seg.max * 100)}%`,
                      min: minRank,
                      max: maxRank
                    };
                  });
                  // 确保相邻段次之间连续（上一个结束名次+1 = 下一个起始名次）
                  for (let i = 1; i < rankSegments.length; i++) {
                    if (rankSegments[i].min <= rankSegments[i-1].max) {
                      rankSegments[i].min = rankSegments[i-1].max + 1;
                      // 更新下一个段次的名称
                      const minPercent = Math.round((rankSegments[i].min / totalStudents) * 100);
                      const maxPercent = Math.round((rankSegments[i].max / totalStudents) * 100);
                      rankSegments[i].name = `${minPercent}%-${maxPercent}%`;
                    }
                  }
                  setCustomRankingSegments(rankSegments);
                }
              }}
            >
              名次模式
            </Button>
            <span style={{ color: '#666', lineHeight: '32px' }}>
              {customRankingMode === 'percent' 
                ? `提示：百分比为0-1之间的小数，如10%输入0.1，20%输入0.2。当前总人数：${totalStudents}人`
                : `提示：直接输入名次数字，如1-50名、51-100名等`
              }
            </span>
          </div>
        </div>
        <Form layout="vertical">
          {customRankingSegments.map((segment, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
              <Form.Item label="名称" style={{ marginBottom: 0, flex: 1 }}>
                <Input
                  value={segment.name}
                  onChange={(e) => {
                    const newSegments = [...customRankingSegments];
                    newSegments[index].name = e.target.value;
                    setCustomRankingSegments(newSegments);
                  }}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              {customRankingMode === 'percent' ? (
                <>
                  <Form.Item label="起始百分比" style={{ marginBottom: 0, width: 100 }}>
                    <InputNumber
                      value={segment.min}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(value) => {
                        const newSegments = [...customRankingSegments];
                        newSegments[index].min = value;
                        // 自动更新名称为百分比范围
                        const minPercent = Math.round(value * 100);
                        const maxPercent = Math.round(newSegments[index].max * 100);
                        newSegments[index].name = `${minPercent}%-${maxPercent}%`;
                        setCustomRankingSegments(newSegments);
                      }}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  <Form.Item label="结束百分比" style={{ marginBottom: 0, width: 100 }}>
                    <InputNumber
                      value={segment.max}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(value) => {
                        const newSegments = [...customRankingSegments];
                        newSegments[index].max = value;
                        // 自动更新下一个段次的起始值
                        if (index < newSegments.length - 1) {
                          newSegments[index + 1].min = value;
                          // 自动更新下一个段次的名称
                          const nextMinPercent = Math.round(value * 100);
                          const nextMaxPercent = Math.round(newSegments[index + 1].max * 100);
                          newSegments[index + 1].name = `${nextMinPercent}%-${nextMaxPercent}%`;
                        }
                        // 自动更新当前段次的名称为百分比范围
                        const minPercent = Math.round(newSegments[index].min * 100);
                        const maxPercent = Math.round(value * 100);
                        newSegments[index].name = `${minPercent}%-${maxPercent}%`;
                        setCustomRankingSegments(newSegments);
                      }}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </>
              ) : (
                <>
                  <Form.Item label="起始名次" style={{ marginBottom: 0, width: 100 }}>
                    <InputNumber
                      value={segment.min}
                      min={1}
                      max={totalStudents}
                      onChange={(value) => {
                        const newSegments = [...customRankingSegments];
                        newSegments[index].min = value;
                        // 自动更新名称为百分比范围
                        if (totalStudents > 0) {
                          const minPercent = Math.round((value / totalStudents) * 100);
                          const maxPercent = Math.round((newSegments[index].max / totalStudents) * 100);
                          newSegments[index].name = `${minPercent}%-${maxPercent}%`;
                        }
                        setCustomRankingSegments(newSegments);
                      }}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  <Form.Item label="结束名次" style={{ marginBottom: 0, width: 100 }}>
                    <InputNumber
                      value={segment.max}
                      min={1}
                      max={totalStudents}
                      onChange={(value) => {
                        const newSegments = [...customRankingSegments];
                        newSegments[index].max = value;
                        // 自动更新下一个段次的起始值为当前结束名次+1，确保名次段连续不重叠
                        if (index < newSegments.length - 1) {
                          newSegments[index + 1].min = value + 1;
                          // 自动更新下一个段次的名称为百分比范围
                          if (totalStudents > 0) {
                            const nextMinPercent = Math.round(((value + 1) / totalStudents) * 100);
                            const nextMaxPercent = Math.round((newSegments[index + 1].max / totalStudents) * 100);
                            newSegments[index + 1].name = `${nextMinPercent}%-${nextMaxPercent}%`;
                          }
                        }
                        // 自动更新当前段次的名称为百分比范围
                        if (totalStudents > 0) {
                          const minPercent = Math.round((newSegments[index].min / totalStudents) * 100);
                          const maxPercent = Math.round((value / totalStudents) * 100);
                          newSegments[index].name = `${minPercent}%-${maxPercent}%`;
                        }
                        setCustomRankingSegments(newSegments);
                      }}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </>
              )}
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  const newSegments = customRankingSegments.filter((_, i) => i !== index);
                  setCustomRankingSegments(newSegments);
                }}
                disabled={customRankingSegments.length <= 1}
              />
            </div>
          ))}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => {
              const lastSegment = customRankingSegments[customRankingSegments.length - 1];
              let newMin, newMax;
              if (customRankingMode === 'percent') {
                newMin = lastSegment ? lastSegment.max : 0;
                newMax = lastSegment ? Math.min(1, lastSegment.max + 0.1) : 0.1;
              } else {
                newMin = lastSegment ? lastSegment.max + 1 : 1;
                newMax = lastSegment ? Math.min(totalStudents, lastSegment.max + 50) : 50;
              }
              setCustomRankingSegments([
                ...customRankingSegments,
                { name: `段次${customRankingSegments.length + 1}`, min: newMin, max: newMax }
              ]);
            }}
            style={{ marginTop: 8, marginBottom: 16 }}
          >
            添加段次
          </Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="primary"
              onClick={async () => {
                // 保存模式和段次到 localStorage
                localStorage.setItem('customRankingMode', customRankingMode);
                localStorage.setItem('customRankingSegments', JSON.stringify(customRankingSegments));
                setCustomRankingModalVisible(false);
                
                // 重新获取校排名段数据
                if (selectedExam) {
                  const segmentsParam = encodeURIComponent(JSON.stringify(customRankingSegments));
                  const rankingSegmentsResponse = await axios.get(`http://localhost:5000/api/dashboard/school-ranking-segments?exam_id=${selectedExam}&segments=${segmentsParam}&mode=${customRankingMode}`);
                  const rankingData = rankingSegmentsResponse.data.data || rankingSegmentsResponse.data;
                  setSchoolRankingSegments(rankingData);
                  const students = rankingSegmentsResponse.data.total_students || totalStudents;
                  setTotalStudents(students);
                }
              }}
            >
              保存并应用
            </Button>
            <Button onClick={() => setCustomRankingModalVisible(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                // 重置为默认设置（仅当前会话，不修改保存的设置）
                const defaultPercentSegments = [
                  { name: '0%-10%', min: 0, max: 0.1 },
                  { name: '10%-20%', min: 0.1, max: 0.2 },
                  { name: '20%-30%', min: 0.2, max: 0.3 },
                  { name: '30%-50%', min: 0.3, max: 0.5 },
                  { name: '50%-100%', min: 0.5, max: 1 }
                ];
                
                // 根据当前模式设置对应的默认段次
                if (customRankingMode === 'rank') {
                  // 将百分比段次转换为名次段次
                  const defaultRankSegments = defaultPercentSegments.map(seg => ({
                    name: seg.name,
                    min: Math.max(1, Math.floor(seg.min * totalStudents)),
                    max: Math.floor(seg.max * totalStudents)
                  }));
                  // 确保相邻段次之间连续（上一个结束名次+1 = 下一个起始名次）
                  for (let i = 1; i < defaultRankSegments.length; i++) {
                    if (defaultRankSegments[i].min <= defaultRankSegments[i-1].max) {
                      defaultRankSegments[i].min = defaultRankSegments[i-1].max + 1;
                    }
                  }
                  setCustomRankingSegments(defaultRankSegments);
                } else {
                  setCustomRankingSegments(defaultPercentSegments);
                }
              }}
            >
              重置为默认
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 自定义总分 分数段统计设置模态框 */}
      <Modal
        title="自定义总分 分数段统计设置"
        open={customScoreModalVisible}
        onCancel={() => setCustomScoreModalVisible(false)}
        footer={null}
        width={700}
      >
        <div style={{ marginBottom: 16 }}>
          <span style={{ color: '#666', lineHeight: '32px' }}>
            提示：分数段从高到低排列，例如：600-750表示600分及以上，550-599表示550到599分。
          </span>
        </div>
        <Form layout="vertical">
          {customScoreSegments.map((segment, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
              <Form.Item label="名称" style={{ marginBottom: 0, flex: 1 }}>
                <Input
                  value={segment.name}
                  onChange={(e) => {
                    const newSegments = [...customScoreSegments];
                    newSegments[index].name = e.target.value;
                    setCustomScoreSegments(newSegments);
                  }}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item label="结束分数" style={{ marginBottom: 0, width: 100 }}>
                <InputNumber
                  value={segment.max}
                  min={0}
                  max={750}
                  onChange={(value) => {
                    const newSegments = [...customScoreSegments];
                    newSegments[index].max = value;
                    // 自动更新名称为起始分数-结束分数
                    newSegments[index].name = `${newSegments[index].min}-${value}`;
                    // 自动更新上一个段次的结束值
                    if (index > 0) {
                      newSegments[index - 1].min = value + 1;
                      // 自动更新上一个段次的名称
                      newSegments[index - 1].name = `${newSegments[index - 1].min}-${newSegments[index - 1].max}`;
                    }
                    setCustomScoreSegments(newSegments);
                  }}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item label="起始分数" style={{ marginBottom: 0, width: 100 }}>
                <InputNumber
                  value={segment.min}
                  min={0}
                  max={750}
                  onChange={(value) => {
                    const newSegments = [...customScoreSegments];
                    newSegments[index].min = value;
                    // 自动更新名称为起始分数-结束分数
                    newSegments[index].name = `${value}-${newSegments[index].max}`;
                    // 自动更新下一个段次的起始值
                    if (index < newSegments.length - 1) {
                      newSegments[index + 1].max = value - 1;
                      // 自动更新下一个段次的名称
                      newSegments[index + 1].name = `${newSegments[index + 1].min}-${newSegments[index + 1].max}`;
                    }
                    setCustomScoreSegments(newSegments);
                  }}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  const newSegments = customScoreSegments.filter((_, i) => i !== index);
                  setCustomScoreSegments(newSegments);
                }}
                disabled={customScoreSegments.length <= 1}
              />
            </div>
          ))}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => {
              const lastSegment = customScoreSegments[customScoreSegments.length - 1];
              let newMin, newMax;
              if (lastSegment) {
                newMax = lastSegment.min - 1;
                newMin = Math.max(0, lastSegment.min - 51);
              } else {
                newMin = 0;
                newMax = 100;
              }
              setCustomScoreSegments([
                ...customScoreSegments,
                { name: `${newMin}-${newMax}`, min: newMin, max: newMax }
              ]);
            }}
            style={{ marginTop: 8, marginBottom: 16 }}
          >
            添加分数段
          </Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="primary"
              onClick={async () => {
                // 保存分数段到 localStorage
                localStorage.setItem('customScoreSegments', JSON.stringify(customScoreSegments));
                setCustomScoreModalVisible(false);
                
                // 重新获取总分分数段数据
                if (selectedExam) {
                  const segmentsParam = encodeURIComponent(JSON.stringify(customScoreSegments));
                  const scoreSegmentsResponse = await axios.get(`http://localhost:5000/api/dashboard/total-score-segments?exam_id=${selectedExam}&segments=${segmentsParam}`);
                  setTotalScoreSegments(scoreSegmentsResponse.data);
                }
              }}
            >
              保存并应用
            </Button>
            <Button onClick={() => setCustomScoreModalVisible(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                // 重置为默认设置（仅当前会话，不修改保存的设置）
                const defaultScoreSegments = [
                  { name: '600以上', min: 600, max: 750 },
                  { name: '550-599', min: 550, max: 599 },
                  { name: '500-549', min: 500, max: 549 },
                  { name: '450-499', min: 450, max: 499 },
                  { name: '400-449', min: 400, max: 449 },
                  { name: '400以下', min: 0, max: 399 }
                ];
                setCustomScoreSegments(defaultScoreSegments);
              }}
            >
              重置为默认
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Dashboard;