import React, { useState, useEffect } from 'react';
import {
  Card, Select, Button, Table, Tag, Row, Col, Alert, Typography,
  Timeline, Divider, List, Statistic, Space, Tabs, Progress, Modal,
  Descriptions, Badge, message, Spin
} from 'antd';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  SolutionOutlined, BulbOutlined, WarningOutlined, TeamOutlined,
  BookOutlined, UserOutlined, RiseOutlined, FallOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;

const DecisionSupport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [examList, setExamList] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [decisionData, setDecisionData] = useState<any>(null);
  const [weakSubjects, setWeakSubjects] = useState<any[]>([]);
  const [focusStudents, setFocusStudents] = useState<any[]>([]);

  useEffect(() => {
    fetchExamList();
  }, []);

  const fetchExamList = async () => {
    try {
      const response = await axios.get('/exams');
      setExamList(response.data);
    } catch (error) {
      console.error('获取考试列表失败:', error);
    }
  };

  const generateDecisionSupport = async () => {
    if (!selectedExam) {
      message.error('请先选择考试');
      return;
    }

    setLoading(true);
    try {
      // 获取所有必要的数据
      const [examRes, statisticalRes, classRes, subjectRes, warningRes, studentRes] = await Promise.all([
        axios.get(`/exams/${selectedExam}`),
        axios.get('/analysis/statistical', { params: { exam_id: selectedExam } }),
        axios.get('/analysis/class-comparison', { params: { exam_id: selectedExam } }),
        axios.get('/analysis/subject-analysis', { params: { exam_id: selectedExam } }),
        axios.get('/dashboard/warnings', { params: { resolved: false } }),
        axios.get('/dashboard/student-monitoring')
      ]);

      // 分析薄弱学科
      const weakSubjectsAnalysis = analyzeWeakSubjects(subjectRes.data, statisticalRes.data);
      setWeakSubjects(weakSubjectsAnalysis);

      // 识别重点关注学生
      const focusStudentsList = identifyFocusStudents(studentRes.data, warningRes.data);
      setFocusStudents(focusStudentsList);

      // 生成决策建议
      const suggestions = generateSuggestions(statisticalRes.data, classRes.data, weakSubjectsAnalysis, warningRes.data);

      setDecisionData({
        examInfo: examRes.data,
        statistical: statisticalRes.data,
        classData: classRes.data,
        subjectData: subjectRes.data,
        warnings: warningRes.data,
        students: studentRes.data,
        suggestions,
        generatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
      });

      message.success('决策支持报告生成成功！');
    } catch (error) {
      message.error('生成决策支持报告失败');
    } finally {
      setLoading(false);
    }
  };

  const analyzeWeakSubjects = (subjectData: any, statisticalData: any) => {
    const weakSubjects: { subject: string; avg_score: number; full_score: number; score_rate: string; level: string; color: string }[] = [];
    const avgScore = statisticalData.avg_score;

    Object.keys(subjectData).forEach(subject => {
      const subjectAvg = parseFloat(subjectData[subject].avg_score);
      const fullScore = subject.match(/(语文|数学|英语)/) ? 150 : 100;
      const scoreRate = (subjectAvg / fullScore) * 100;

      if (scoreRate < 60) { // 得分率低于60%为薄弱学科
        weakSubjects.push({
          subject,
          avg_score: subjectAvg,
          full_score: fullScore,
          score_rate: scoreRate.toFixed(2),
          level: '严重薄弱',
          color: '#ff4d4f'
        });
      } else if (scoreRate < 70) { // 得分率60-70%为一般薄弱
        weakSubjects.push({
          subject,
          avg_score: subjectAvg,
          full_score: fullScore,
          score_rate: scoreRate.toFixed(2),
          level: '一般薄弱',
          color: '#faad14'
        });
      }
    });

    return weakSubjects;
  };

  const identifyFocusStudents = (students: any[], warnings: any[]) => {
    const focusStudents = students.filter(student => {
      // 识别需要重点关注的学生：波动生、偏科生、学困生
      return student.is_fluctuation_student || student.has_weak_subject || student.is_low_student;
    });

    // 根据预警信息进一步筛选
    const warningStudentMap = new Map();
    warnings.forEach(warning => {
      if (warning.target_id) {
        warningStudentMap.set(warning.target_id, warning);
      }
    });

    return focusStudents.map(student => ({
      ...student,
      warning: warningStudentMap.get(student.student_number)
    }));
  };

  const generateSuggestions = (statistical: any, classData: any[], weakSubjects: any[], warnings: any[]) => {
    const suggestions = [];

    // 基于平均分的建议
    if (statistical.avg_score < 90) {
      suggestions.push({
        type: 'critical',
        title: '整体成绩偏低',
        content: `本次考试平均分仅为${statistical.avg_score}分，低于及格线。建议立即组织教学质量分析会，查找原因并制定改进措施。`,
        icon: <WarningOutlined />
      });
    } else if (statistical.avg_score < 100) {
      suggestions.push({
        type: 'warning',
        title: '平均分有待提升',
        content: `本次考试平均分为${statistical.avg_score}分，虽然及格但仍有提升空间。建议加强基础知识教学和课堂管理。`,
        icon: <RiseOutlined />
      });
    } else {
      suggestions.push({
        type: 'success',
        title: '整体表现良好',
        content: `本次考试平均分达到${statistical.avg_score}分，表现优秀。建议继续保持并争取更大突破。`,
        icon: <CheckCircleOutlined />
      });
    }

    // 基于及格率的建议
    if (statistical.passed_rate < 80) {
      suggestions.push({
        type: 'critical',
        title: '及格率偏低',
        content: `及格率仅为${statistical.passed_rate}%，有较多学生需要帮助。建议启动培优补差计划，重点关注后进生。`,
        icon: <FallOutlined />
      });
    } else if (statistical.passed_rate < 90) {
      suggestions.push({
        type: 'warning',
        title: '及格率需关注',
        content: `及格率为${statistical.passed_rate}%，接近标准线。建议加强课后辅导和作业检查。`,
        icon: <WarningOutlined />
      });
    }

    // 基于薄弱学科的建议
    if (weakSubjects.length > 0) {
      const weakSubjectNames = weakSubjects.map(s => s.subject).join('、');
      suggestions.push({
        type: 'subject',
        title: '薄弱学科需加强',
        content: `检测发现${weakSubjectNames}等学科较为薄弱，建议组织学科组进行专项教研，制定学科提升计划。`,
        icon: <BookOutlined />
      });
    }

    // 基于班级对比的建议
    const sortedClasses = [...classData].sort((a, b) => parseFloat(b.avg_score) - parseFloat(a.avg_score));
    if (sortedClasses.length > 1) {
      const gap = parseFloat(sortedClasses[0].avg_score) - parseFloat(sortedClasses[sortedClasses.length - 1].avg_score);
      if (gap > 20) {
        suggestions.push({
          type: 'class',
          title: '班级差距较大',
          content: `班级间平均分差距达${gap.toFixed(1)}分，建议加强班级间教学经验交流，促进均衡发展。`,
          icon: <TeamOutlined />
        });
      }
    }

    // 基于预警的建议
    if (warnings.length > 0) {
      suggestions.push({
        type: 'warning',
        title: '预警信息需处理',
        content: `系统检测到${warnings.length}条预警信息，建议及时分析原因并采取相应措施。`,
        icon: <WarningOutlined />
      });
    }

    return suggestions;
  };

  const getStudentSuggestion = (student: any) => {
    const suggestions = [];

    if (student.is_top_student) {
      suggestions.push('继续保持优势，争取更大突破');
    }

    if (student.is_low_student) {
      suggestions.push('加强基础知识学习，建议参加课后辅导');
    }

    if (student.is_fluctuation_student) {
      suggestions.push('成绩波动较大，建议稳定学习状态');
    }

    if (student.has_weak_subject) {
      suggestions.push('存在偏科现象，建议加强薄弱学科学习');
    }

    if (student.is_critical_student) {
      suggestions.push('处于分数线边缘，需要重点关注');
    }

    return suggestions;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" tip="正在生成决策支持报告..." />
      </div>
    );
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        <SolutionOutlined /> 决策支持输出
      </Title>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Select
              placeholder="请选择考试"
              style={{ width: '100%' }}
              onChange={setSelectedExam}
              value={selectedExam}
            >
              {examList.map(exam => (
                <Option key={exam.id} value={exam.id}>
                  {exam.name} ({exam.grade} - {exam.type})
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={12}>
            <Button
              type="primary"
              icon={<BulbOutlined />}
              onClick={generateDecisionSupport}
              disabled={!selectedExam}
              block
              size="large"
            >
              生成决策支持报告
            </Button>
          </Col>
        </Row>
      </Card>

      {decisionData && (
        <Tabs defaultActiveKey="overview" style={{ marginBottom: 24 }}>
          <TabPane
            tab={
              <span>
                <BulbOutlined /> 总体分析
              </span>
            }
            key="overview"
          >
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="考试名称"
                    value={decisionData.examInfo.name}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="平均分"
                    value={decisionData.statistical.avg_score}
                    precision={2}
                    valueStyle={{ color: decisionData.statistical.avg_score >= 100 ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="及格率"
                    value={decisionData.statistical.passed_rate}
                    suffix="%"
                    valueStyle={{ color: decisionData.statistical.passed_rate >= 90 ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="优秀率"
                    value={decisionData.statistical.excellent_rate}
                    suffix="%"
                    valueStyle={{ color: decisionData.statistical.excellent_rate >= 30 ? '#3f8600' : '#faad14' }}
                  />
                </Card>
              </Col>
            </Row>

            <Card title="决策建议" style={{ marginBottom: 24 }}>
              <Timeline>
                {decisionData.suggestions.map((suggestion: any, index: number) => (
                  <Timeline.Item
                    key={index}
                    color={suggestion.type === 'critical' ? 'red' : suggestion.type === 'warning' ? 'orange' : suggestion.type === 'subject' ? 'blue' : suggestion.type === 'class' ? 'purple' : 'green'}
                    dot={suggestion.icon}
                  >
                    <Alert
                      message={suggestion.title}
                      description={suggestion.content}
                      type={suggestion.type === 'critical' ? 'error' : suggestion.type === 'warning' ? 'warning' : 'success'}
                      showIcon={false}
                    />
                  </Timeline.Item>
                ))}
              </Timeline>
            </Card>

            <Card title="薄弱学科分析">
              <Table
                dataSource={weakSubjects}
                columns={[
                  { title: '学科', dataIndex: 'subject', key: 'subject' },
                  { title: '平均分', dataIndex: 'avg_score', key: 'avg_score' },
                  { title: '满分', dataIndex: 'full_score', key: 'full_score' },
                  { title: '得分率', dataIndex: 'score_rate', key: 'score_rate', render: (rate, record) => (
                    <Progress percent={parseFloat(rate)} size="small" status={record.level === '严重薄弱' ? 'exception' : 'normal'} />
                  )},
                  { title: '薄弱程度', dataIndex: 'level', key: 'level', render: (level, record) => (
                    <Tag color={record.color}>{level}</Tag>
                  )}
                ]}
                pagination={false}
                rowKey="subject"
              />
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <TeamOutlined /> 班级建议
              </span>
            }
            key="class"
          >
            <Card title="班级教学建议">
              <Table
                dataSource={decisionData.classData}
                columns={[
                  { title: '班级', dataIndex: 'class_name', key: 'class_name' },
                  { title: '平均分', dataIndex: 'avg_score', key: 'avg_score' },
                  { title: '优秀率', dataIndex: 'excellent_rate', key: 'excellent_rate', render: (rate) => `${rate}%` },
                  { title: '及格率', dataIndex: 'passed_rate', key: 'passed_rate', render: (rate) => `${rate}%` },
                  { title: '建议措施', key: 'suggestion', render: (_: any, record: { avg_score: string | number }) => {
                    if (parseFloat(String(record.avg_score)) >= 110) {
                      return <Tag color="green">保持优势</Tag>;
                    } else if (parseFloat(String(record.avg_score)) >= 90) {
                      return <Tag color="blue">稳步提升</Tag>;
                    } else {
                      return <Tag color="red">重点帮扶</Tag>;
                    }
                  }}
                ]}
                pagination={{ pageSize: 10 }}
                rowKey="class_name"
              />
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <UserOutlined /> 重点关注学生
              </span>
            }
            key="students"
          >
            <Card title="重点关注学生名单">
              <Alert
                message="重点关注学生"
                description={`共识别出${focusStudents.length}名需要重点关注的学生，包括：波动生、偏科生、学困生等`}
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Table
                dataSource={focusStudents}
                columns={[
                  { title: '学号', dataIndex: 'student_number', key: 'student_number' },
                  { title: '姓名', dataIndex: 'student_name', key: 'student_name' },
                  { title: '班级', dataIndex: 'class_name', key: 'class_name' },
                  { title: '总分', dataIndex: 'total_score', key: 'total_score' },
                  { title: '类型', key: 'types', render: (record) => (
                    <Space>
                      {record.is_fluctuation_student && <Tag color="orange">波动生</Tag>}
                      {record.has_weak_subject && <Tag color="purple">偏科生</Tag>}
                      {record.is_low_student && <Tag color="red">学困生</Tag>}
                      {record.is_critical_student && <Tag color="blue">临界生</Tag>}
                      {record.warning && <Tag color="volcano">有预警</Tag>}
                    </Space>
                  )},
                  { title: '教育建议', key: 'suggestions', render: (record) => {
                    const suggestions = getStudentSuggestion(record);
                    return suggestions.map((suggestion, index) => (
                      <Tag key={index} color="blue">{suggestion}</Tag>
                    ));
                  }}
                ]}
                pagination={{ pageSize: 10 }}
                rowKey="student_number"
              />
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <WarningOutlined /> 预警处理
              </span>
            }
            key="warnings"
          >
            <Card title="预警信息处理">
              <Table
                dataSource={decisionData.warnings}
                columns={[
                  { title: '预警类型', dataIndex: 'type', key: 'type', render: (type) => <Tag color="red">{type}</Tag> },
                  { title: '预警级别', dataIndex: 'level', key: 'level', render: (level) => (
                    <Tag color={level === 'high' ? 'red' : level === 'medium' ? 'orange' : 'yellow'}>
                      {level === 'high' ? '高级' : level === 'medium' ? '中级' : '低级'}
                    </Tag>
                  )},
                  { title: '预警标题', dataIndex: 'title', key: 'title' },
                  { title: '建议处理', key: 'suggestion', render: (record) => {
                    if (record.type.includes('成绩')) {
                      return '加强学习辅导，查找原因';
                    } else if (record.type.includes('排名')) {
                      return '分析退步原因，制定改进计划';
                    } else {
                      return '关注学生状态，及时干预';
                    }
                  }}
                ]}
                pagination={{ pageSize: 10 }}
                rowKey="id"
              />
            </Card>
          </TabPane>
        </Tabs>
      )}
    </div>
  );
};

export default DecisionSupport;