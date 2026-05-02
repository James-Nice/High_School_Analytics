import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, InputNumber, message, Tag, Popconfirm, Space, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Option } = Select;

const ExamManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [examList, setExamList] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [form] = Form.useForm();
  const examType = Form.useWatch('type', form);

  // 默认分值设置
  const defaultScores = {
    '语文': { full: 150, top: 135, excellent: 120, pass: 90, low: 60 },
    '数学': { full: 150, top: 135, excellent: 120, pass: 90, low: 60 },
    '英语': { full: 150, top: 135, excellent: 120, pass: 90, low: 60 },
    '物理': { full: 100, top: 90, excellent: 80, pass: 60, low: 40 },
    '化学': { full: 100, top: 90, excellent: 80, pass: 60, low: 40 },
    '生物': { full: 100, top: 90, excellent: 80, pass: 60, low: 40 },
    '政治': { full: 100, top: 90, excellent: 80, pass: 60, low: 40 },
    '历史': { full: 100, top: 90, excellent: 80, pass: 60, low: 40 },
    '地理': { full: 100, top: 90, excellent: 80, pass: 60, low: 40 },
  };

  // 中考默认分值设置
  const defaultScoresMiddleSchool = {
    '语文': { full: 120, top: 108, excellent: 96, pass: 72, low: 48 },
    '数学': { full: 120, top: 108, excellent: 96, pass: 72, low: 48 },
    '英语': { full: 120, top: 108, excellent: 96, pass: 72, low: 48 },
    '物理': { full: 80, top: 72, excellent: 64, pass: 48, low: 32 },
    '化学': { full: 70, top: 63, excellent: 56, pass: 42, low: 28 },
    '政治': { full: 75, top: 67.5, excellent: 60, pass: 45, low: 30 },
    '历史': { full: 75, top: 67.5, excellent: 60, pass: 45, low: 30 },
  };

  const grades = ['初中', '高一', '高二', '高三'];
  const examTypes = ['月考', '期中', '期末', '模考', '中考', '高考'];

  useEffect(() => {
    fetchExamList();
  }, []);

  const fetchExamList = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/exams');
      setExamList(response.data);
      console.log('考试列表:', response.data);
    } catch (error: any) {
      console.error('获取考试列表失败:', error);
      message.error(error.response?.data?.error || '获取考试列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = () => {
    setEditingExam(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 监听科目变化，自动更新Form.List
  const handleSubjectsChange = (values: string[]) => {
    // 清空现有的subject_scores
    form.setFieldsValue({ subject_scores: [] });
    
    // 为每个选中的科目创建对应的分值设置
    if (values && values.length > 0) {
      const isMiddleSchoolExam = examType === '中考';
      const subjectScores = values.map(subject => {
        const scoreSettings = isMiddleSchoolExam 
          ? defaultScoresMiddleSchool[subject as keyof typeof defaultScoresMiddleSchool]
          : defaultScores[subject as keyof typeof defaultScores];
        // 添加默认值，防止scoreSettings为undefined
        return {
          full: scoreSettings?.full || 100,
          top: scoreSettings?.top || 90,
          excellent: scoreSettings?.excellent || 80,
          pass: scoreSettings?.pass || 60,
          low: scoreSettings?.low || 40
        };
      });
      form.setFieldsValue({ subject_scores: subjectScores });
    }
  };

  const handleEditExam = (record: any) => {
    setEditingExam(record);
    form.setFieldsValue({
      ...record,
      exam_date: moment(record.exam_date),
      subjects: JSON.parse(record.subjects),
      full_scores: JSON.parse(record.full_scores),
      cutoff_scores: JSON.parse(record.cutoff_scores || '{}'),
    });
    setModalVisible(true);
  };

  const handleDeleteExam = async (id: number) => {
    try {
      await axios.delete(`/exams/${id}`);
      message.success('删除成功');
      fetchExamList();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      // 整理科目分值数据
      const fullScores: any = {};
      if (values.subject_scores) {
        values.subject_scores.forEach((score: any, index: number) => {
          const subject = values.subjects[index];
          if (subject) {
            fullScores[subject] = score;
          }
        });
      }

      const examData = {
        name: values.name,
        type: values.type,
        grade: values.grade,
        exam_date: values.exam_date.format('YYYY-MM-DD'),
        subjects: JSON.stringify(values.subjects),
        full_scores: JSON.stringify(fullScores),
        cutoff_scores: JSON.stringify(values.cutoff_scores || {}),
      };

      if (editingExam) {
        await axios.put(`/exams/${editingExam.id}`, examData);
        message.success('更新成功');
      } else {
        await axios.post('/exams', examData);
        message.success('创建成功');
      }

      setModalVisible(false);
      fetchExamList();
    } catch (error: any) {
      console.error('提交失败:', error);
      message.error(editingExam ? '更新失败' : '创建失败');
    }
  };

  const columns = [
    { title: '考试名称', dataIndex: 'name', key: 'name' },
    { title: '考试类型', dataIndex: 'type', key: 'type', render: (type: string) => <Tag>{type}</Tag> },
    { title: '年级', dataIndex: 'grade', key: 'grade', render: (grade: string) => <Tag color="blue">{grade}</Tag> },
    { title: '考试日期', dataIndex: 'exam_date', key: 'exam_date' },
    {
      title: '操作',
      key: 'action',
      render: (record: any) => (
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEditExam(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该考试吗？"
            onConfirm={() => handleDeleteExam(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1>考试管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateExam}>
          创建考试
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={examList}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingExam ? '编辑考试' : '创建考试'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            subjects: [],
            subject_scores: [],
            full_scores: {},
            cutoff_scores: {},
          }}
        >
          <Form.Item
            name="name"
            label="考试名称"
            rules={[{ required: true, message: '请输入考试名称' }]}
          >
            <Input placeholder="例如：2024年上学期高一期中考试" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="type"
                label="考试类型"
                rules={[{ required: true, message: '请选择考试类型' }]}
              >
                <Select
                  onChange={(value) => {
                    if (value === '中考') {
                      // 自动设置中考科目、分值和年级
                      const middleSchoolSubjects = ['语文', '数学', '英语', '物理', '化学', '政治', '历史'];
                      const subjectScores = middleSchoolSubjects.map(subject => ({
                        full: defaultScoresMiddleSchool[subject as keyof typeof defaultScoresMiddleSchool].full,
                        top: defaultScoresMiddleSchool[subject as keyof typeof defaultScoresMiddleSchool].top,
                        excellent: defaultScoresMiddleSchool[subject as keyof typeof defaultScoresMiddleSchool].excellent,
                        pass: defaultScoresMiddleSchool[subject as keyof typeof defaultScoresMiddleSchool].pass,
                        low: defaultScoresMiddleSchool[subject as keyof typeof defaultScoresMiddleSchool].low
                      }));
                      form.setFieldsValue({ subjects: middleSchoolSubjects, subject_scores: subjectScores, grade: '初中' });
                    } else {
                      // 其他考试类型，清空科目、分值和年级，让用户手动选择
                      form.setFieldsValue({ subjects: [], subject_scores: [], grade: undefined });
                    }
                  }}
                >
                  {examTypes.map(type => (
                    <Option key={type} value={type}>{type}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="grade"
                label="年级"
                rules={[{ required: true, message: '请选择年级' }]}
              >
                <Select disabled={examType === '中考'}>
                  {grades.filter(grade => examType === '中考' || ['高一', '高二', '高三'].includes(grade)).map(grade => (
                    <Option key={grade} value={grade}>{grade}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="exam_date"
                label="考试日期"
                rules={[{ required: true, message: '请选择考试日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="subjects"
            label="考试科目"
            rules={[{ required: true, message: '请选择考试科目' }]}
          >
            <Select 
              mode="multiple" 
              onChange={handleSubjectsChange}
              disabled={examType === '中考'}
            >
              {Object.keys(defaultScores).map(subject => (
                <Option key={subject} value={subject}>{subject}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.List name="subject_scores">
            {(fields) => (
              <>
                {fields.map(({ key, name, ...restField }) => {
                  const subject = form.getFieldValue('subjects')?.[key];
                  if (!subject) return null;

                  // 根据考试类型选择不同的默认分值设置
                  const isMiddleSchoolExam = examType === '中考';
                  const scoreSettings = isMiddleSchoolExam 
                    ? (defaultScoresMiddleSchool[subject as keyof typeof defaultScoresMiddleSchool] || { full: 120, top: 108, excellent: 96, pass: 72, low: 48 })
                    : (defaultScores[subject as keyof typeof defaultScores] || { full: 100, top: 90, excellent: 80, pass: 60, low: 40 });

                  return (
                    <Row key={key} gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={6}>
                        <strong>{subject}分值设置：</strong>
                      </Col>
                      <Col span={4}>
                        <Form.Item
                          name={[name, 'full']}
                          label="满分"
                          initialValue={scoreSettings.full}
                        >
                          <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item
                          name={[name, 'top']}
                          label="尖生分"
                          initialValue={scoreSettings.top}
                        >
                          <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item
                          name={[name, 'excellent']}
                          label="优秀分"
                          initialValue={scoreSettings.excellent}
                        >
                          <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item
                          name={[name, 'pass']}
                          label="及格分"
                          initialValue={scoreSettings.pass}
                        >
                          <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item
                          name={[name, 'low']}
                          label="低分分"
                          initialValue={scoreSettings.low}
                        >
                          <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  );
                })}
              </>
            )}
          </Form.List>

          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ marginRight: 16 }}>
              提交
            </Button>
            <Button onClick={() => setModalVisible(false)}>取消</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExamManagement;