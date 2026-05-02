import React, { useState, useEffect } from 'react';
import {
  Card, Select, Button, Table, Tag, Row, Col, Form, DatePicker,
  message, Tabs, Progress, Alert, Typography, Space, Modal, Statistic
} from 'antd';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  DownloadOutlined, FileTextOutlined, FileExcelOutlined,
  FilePdfOutlined, EyeOutlined, BarChartOutlined, TeamOutlined,
  UserOutlined, SettingOutlined, WarningOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const ReportExport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [examList, setExamList] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [reportType, setReportType] = useState<string>('grade_summary');
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const reportTypes = [
    { value: 'grade_summary', label: '年级成绩总表', icon: <BarChartOutlined /> },
    { value: 'class_detail', label: '班级成绩明细表', icon: <TeamOutlined /> },
    { value: 'subject_analysis', label: '学科质量分析表', icon: <BarChartOutlined /> },
    { value: 'class_comparison', label: '班级对比表', icon: <TeamOutlined /> },
    { value: 'student_profile', label: '学生个人学情报告', icon: <UserOutlined /> },
    { value: 'warning_list', label: '预警学生清单', icon: <WarningOutlined /> },
    { value: 'monitoring_report', label: '教学质量监控台账', icon: <FileTextOutlined /> },
    { value: 'summary_report', label: '考试质量分析总结报告', icon: <SettingOutlined /> },
  ];

  useEffect(() => {
    fetchExamList();
  }, []);

  const fetchExamList = async () => {
    try {
      const response = await axios.get('/exams');
      setExamList(response.data);
    } catch (error) {
      message.error('获取考试列表失败');
    }
  };

  const generateReport = async () => {
    if (!selectedExam) {
      message.error('请先选择考试');
      return;
    }

    setLoading(true);
    try {
      // 获取报告数据
      let reportData;
      switch (reportType) {
        case 'grade_summary':
          reportData = await generateGradeSummary();
          break;
        case 'class_detail':
          reportData = await generateClassDetail();
          break;
        case 'subject_analysis':
          reportData = await generateSubjectAnalysis();
          break;
        case 'class_comparison':
          reportData = await generateClassComparison();
          break;
        case 'warning_list':
          reportData = await generateWarningList();
          break;
        default:
          reportData = await generateDefaultReport();
      }

      setPreviewData(reportData);
      setPreviewVisible(true);
      message.success('报告生成成功！');
    } catch (error) {
      message.error('报告生成失败');
    } finally {
      setLoading(false);
    }
  };

  const generateGradeSummary = async () => {
    const [statisticalRes, classRes, distributionRes] = await Promise.all([
      axios.get('/analysis/statistical', { params: { exam_id: selectedExam } }),
      axios.get('/analysis/class-comparison', { params: { exam_id: selectedExam } }),
      axios.get('/analysis/score-distribution', { params: { exam_id: selectedExam } })
    ]);

    return {
      examInfo: await getExamInfo(),
      statistical: statisticalRes.data,
      classData: classRes.data,
      distribution: distributionRes.data,
      generatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
    };
  };

  const generateClassDetail = async () => {
    const response = await axios.get('/scores', { params: { exam_id: selectedExam } });
    const classStats = await axios.get('/analysis/class-comparison', { params: { exam_id: selectedExam } });

    return {
      examInfo: await getExamInfo(),
      studentList: response.data,
      classStats: classStats.data,
      generatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
    };
  };

  const generateSubjectAnalysis = async () => {
    const [subjectRes, statisticalRes] = await Promise.all([
      axios.get('/analysis/subject-analysis', { params: { exam_id: selectedExam } }),
      axios.get('/analysis/statistical', { params: { exam_id: selectedExam } })
    ]);

    return {
      examInfo: await getExamInfo(),
      subjectAnalysis: subjectRes.data,
      statistical: statisticalRes.data,
      generatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
    };
  };

  const generateClassComparison = async () => {
    const [classRes, trendRes] = await Promise.all([
      axios.get('/analysis/class-comparison', { params: { exam_id: selectedExam } }),
      axios.get('/dashboard/trend-data')
    ]);

    return {
      examInfo: await getExamInfo(),
      classComparison: classRes.data,
      trendData: trendRes.data,
      generatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
    };
  };

  const generateWarningList = async () => {
    const [warningRes, studentRes] = await Promise.all([
      axios.get('/dashboard/warnings'),
      axios.get('/dashboard/student-monitoring')
    ]);

    return {
      examInfo: await getExamInfo(),
      warnings: warningRes.data,
      students: studentRes.data.filter((s: any) => s.is_fluctuation_student || s.has_weak_subject),
      generatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
    };
  };

  const generateDefaultReport = async () => {
    return {
      examInfo: await getExamInfo(),
      message: '报告模板正在开发中...',
      generatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
    };
  };

  const getExamInfo = async () => {
    if (!selectedExam) return null;
    const response = await axios.get(`/exams/${selectedExam}`);
    return response.data;
  };

  const exportToExcel = async () => {
    if (!previewData) {
      message.error('请先生成报告');
      return;
    }

    try {
      const examInfo = previewData.examInfo;
      const fileName = `${examInfo.grade}-${examInfo.name}-${getReportTypeName()}-${moment().format('YYYYMMDD')}.xlsx`;

      // 调用后端导出接口
      const response = await axios.post('/reports/export/excel', {
        report_type: reportType,
        exam_id: selectedExam,
        data: previewData
      }, {
        responseType: 'blob'
      });

      // 下载文件
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      message.success('Excel导出成功！');
    } catch (error) {
      message.error('Excel导出失败');
    }
  };

  const exportToPDF = async () => {
    if (!previewData) {
      message.error('请先生成报告');
      return;
    }

    try {
      const examInfo = previewData.examInfo;
      const fileName = `${examInfo.grade}-${examInfo.name}-${getReportTypeName()}-${moment().format('YYYYMMDD')}.pdf`;

      // 调用后端导出接口
      const response = await axios.post('/reports/export/pdf', {
        report_type: reportType,
        exam_id: selectedExam,
        data: previewData
      }, {
        responseType: 'blob'
      });

      // 下载文件
      const blob = new Blob([response.data], {
        type: 'application/pdf'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      message.success('PDF导出成功！');
    } catch (error) {
      message.error('PDF导出失败');
    }
  };

  const getReportTypeName = () => {
    const type = reportTypes.find(t => t.value === reportType);
    return type ? type.label : '未知报告';
  };

  const getScoreColor = (score: number, fullScore: number = 150) => {
    const percent = (score / fullScore) * 100;
    if (percent >= 90) return '#52c41a';
    if (percent >= 80) return '#1890ff';
    if (percent >= 60) return '#faad14';
    return '#ff4d4f';
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        <FileTextOutlined /> 报表导出
      </Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card title="报告设置">
            <Form layout="vertical">
              <Form.Item label="选择考试">
                <Select
                  placeholder="请选择考试"
                  onChange={setSelectedExam}
                  value={selectedExam}
                >
                  {examList.map(exam => (
                    <Option key={exam.id} value={exam.id}>
                      {exam.name} ({exam.grade} - {exam.type})
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="报告类型">
                <Select
                  placeholder="请选择报告类型"
                  onChange={setReportType}
                  value={reportType}
                >
                  {reportTypes.map(type => (
                    <Option key={type.value} value={type.value}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {type.icon}
                        <span>{type.label}</span>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    icon={<EyeOutlined />}
                    onClick={generateReport}
                    loading={loading}
                    disabled={!selectedExam}
                  >
                    预览报告
                  </Button>
                  <Button
                    icon={<FileExcelOutlined />}
                    onClick={exportToExcel}
                    disabled={!previewData}
                  >
                    导出Excel
                  </Button>
                  <Button
                    icon={<FilePdfOutlined />}
                    onClick={exportToPDF}
                    disabled={!previewData}
                  >
                    导出PDF
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={16}>
          <Card title="快速预览">
            <div style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!previewData ? (
                <Text type="secondary">请选择考试和报告类型，点击"预览报告"查看</Text>
              ) : (
                <div style={{ width: '100%' }}>
                  <Alert
                    message="报告预览"
                    description={
                      <div>
                        <Text strong>{previewData.examInfo.name}</Text>
                        <br />
                        <Text type="secondary">生成时间：{previewData.generatedAt}</Text>
                      </div>
                    }
                    type="info"
                    style={{ marginBottom: 16 }}
                  />
                  <Text>报告内容预览区域（实际报告将在导出时生成）</Text>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {previewVisible && previewData && (
        <Modal
          title="报告预览"
          visible={previewVisible}
          onCancel={() => setPreviewVisible(false)}
          footer={null}
          width={1200}
          bodyStyle={{ maxHeight: '70vh', overflow: 'auto' }}
        >
          <Tabs defaultActiveKey="overview">
            <TabPane tab="概览" key="overview">
              <Row gutter={16}>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="考试名称"
                      value={previewData.examInfo.name}
                      valueStyle={{ fontSize: 16 }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="考试日期"
                      value={moment(previewData.examInfo.exam_date).format('YYYY-MM-DD')}
                      valueStyle={{ fontSize: 16 }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="年级"
                      value={previewData.examInfo.grade}
                      valueStyle={{ fontSize: 16 }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="生成时间"
                      value={previewData.generatedAt}
                      valueStyle={{ fontSize: 16 }}
                    />
                  </Card>
                </Col>
              </Row>

              {previewData.statistical && (
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="平均分"
                        value={previewData.statistical.avg_score}
                        precision={2}
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="优秀率"
                        value={previewData.statistical.excellent_rate}
                        suffix="%"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="及格率"
                        value={previewData.statistical.passed_rate}
                        suffix="%"
                        valueStyle={{ color: '#73d13d' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="低分率"
                        value={previewData.statistical.low_rate}
                        suffix="%"
                        valueStyle={{ color: '#ff4d4f' }}
                      />
                    </Card>
                  </Col>
                </Row>
              )}
            </TabPane>

            {previewData.classData && (
              <TabPane tab="班级数据" key="class">
                <Table
                  dataSource={previewData.classData}
                  columns={[
                    { title: '班级', dataIndex: 'class_name', key: 'class_name' },
                    { title: '学生人数', dataIndex: 'student_count', key: 'student_count' },
                    { title: '平均分', dataIndex: 'avg_score', key: 'avg_score' },
                    { title: '最高分', dataIndex: 'max_score', key: 'max_score' },
                    { title: '最低分', dataIndex: 'min_score', key: 'min_score' },
                    { title: '优秀率', dataIndex: 'excellent_rate', key: 'excellent_rate', render: (rate) => `${rate}%` },
                    { title: '及格率', dataIndex: 'passed_rate', key: 'passed_rate', render: (rate) => `${rate}%` },
                  ]}
                  pagination={{ pageSize: 10 }}
                  rowKey="class_name"
                />
              </TabPane>
            )}

            {previewData.subjectAnalysis && (
              <TabPane tab="学科分析" key="subject">
                <Table
                  dataSource={Object.keys(previewData.subjectAnalysis).map(subject => ({
                    subject,
                    ...previewData.subjectAnalysis[subject]
                  }))}
                  columns={[
                    { title: '学科', dataIndex: 'subject', key: 'subject' },
                    { title: '平均分', dataIndex: 'avg_score', key: 'avg_score' },
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
              </TabPane>
            )}

            {previewData.warnings && (
              <TabPane tab="预警信息" key="warnings">
                <Table
                  dataSource={previewData.warnings}
                  columns={[
                    { title: '预警类型', dataIndex: 'type', key: 'type', render: (type) => <Tag color="red">{type}</Tag> },
                    { title: '预警级别', dataIndex: 'level', key: 'level', render: (level) => (
                      <Tag color={level === 'high' ? 'red' : level === 'medium' ? 'orange' : 'yellow'}>
                        {level === 'high' ? '高级' : level === 'medium' ? '中级' : '低级'}
                      </Tag>
                    )},
                    { title: '预警标题', dataIndex: 'title', key: 'title' },
                    { title: '预警内容', dataIndex: 'content', key: 'content' },
                    { title: '时间', dataIndex: 'created_at', key: 'created_at', render: (date) => moment(date).format('MM-DD HH:mm') },
                  ]}
                  pagination={{ pageSize: 10 }}
                  rowKey="id"
                />
              </TabPane>
            )}
          </Tabs>
        </Modal>
      )}
    </div>
  );
};

export default ReportExport;