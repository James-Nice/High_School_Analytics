import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Select, message, DatePicker, Tag, Modal, Descriptions, Alert } from 'antd';
import { WarningOutlined, ExclamationCircleOutlined, CheckCircleOutlined, DownloadOutlined, ReloadOutlined, TeamOutlined, BookOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Option } = Select;
const { RangePicker } = DatePicker;

const Warnings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [examList, setExamList] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [selectedWarning, setSelectedWarning] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchExamList();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchWarnings();
    }
  }, [selectedExam]);

  const fetchExamList = async () => {
    try {
      const response = await axios.get('/exams');
      setExamList(response.data);
    } catch (error) {
      message.error('获取考试列表失败');
    }
  };

  const fetchWarnings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/warnings?exam_id=${selectedExam}`);
      setWarnings(response.data);
    } catch (error) {
      message.error('获取预警列表失败');
    } finally {
      setLoading(false);
    }
  };

  const generateWarnings = async () => {
    if (!selectedExam) {
      message.error('请选择考试');
      return;
    }

    try {
      setGenerating(true);
      const response = await axios.post('/warnings/generate', { exam_id: selectedExam });
      message.success(response.data.message);
      setWarnings(response.data.warnings);
    } catch (error: any) {
      message.error(error.response?.data?.error || '生成预警失败');
    } finally {
      setGenerating(false);
    }
  };

  const resolveWarning = async (id: number) => {
    try {
      await axios.put(`/warnings/${id}/resolve`);
      message.success('预警已标记为已处理');
      fetchWarnings();
    } catch (error: any) {
      message.error(error.response?.data?.error || '标记预警失败');
    }
  };

  const exportWarnings = async () => {
    if (!selectedExam) {
      message.error('请选择考试');
      return;
    }

    try {
      const response = await axios.get(`/warnings/export?exam_id=${selectedExam}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `预警清单_${selectedExam}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success('预警清单导出成功');
    } catch (error) {
      message.error('导出预警清单失败');
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case '严重':
        return 'red';
      case '警告':
        return 'orange';
      case '提示':
        return 'blue';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case '班级':
        return <TeamOutlined />;
      case '学科':
        return <BookOutlined />;
      case '学生':
        return <UserOutlined />;
      default:
        return <WarningOutlined />;
    }
  };

  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color="blue">{type}</Tag>
      ),
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => (
        <Tag color={getLevelColor(level)}>{level}</Tag>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: '对象',
      dataIndex: 'target_name',
      key: 'target_name',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => moment(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '状态',
      dataIndex: 'is_resolved',
      key: 'is_resolved',
      render: (resolved: number) => (
        resolved ? (
          <Tag color="green">已处理</Tag>
        ) : (
          <Tag color="red">未处理</Tag>
        )
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <div>
          <Button
            type="link"
            onClick={() => {
              setSelectedWarning(record);
              setModalVisible(true);
            }}
          >
            查看详情
          </Button>
          {!record.is_resolved && (
            <Button
              type="link"
              onClick={() => resolveWarning(record.id)}
              style={{ color: '#52c41a' }}
            >
              标记已处理
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="教学质量预警系统"
        extra={
          <div style={{ display: 'flex', gap: 8 }}>
            <Select
              placeholder="选择考试"
              style={{ width: 200 }}
              value={selectedExam}
              onChange={(value) => setSelectedExam(value)}
            >
              {examList.map(exam => (
                <Option key={exam.id} value={exam.id}>
                  {exam.name} ({exam.grade} - {exam.type})
                </Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={generateWarnings}
              disabled={!selectedExam}
              loading={generating}
            >
              生成预警
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={exportWarnings}
              disabled={!selectedExam || warnings.length === 0}
            >
              导出预警清单
            </Button>
          </div>
        }
      >
        {warnings.length === 0 ? (
          <Alert
            message="暂无预警信息"
            description={selectedExam ? '点击"生成预警"按钮生成预警信息' : '请选择考试后生成预警'}
            type="info"
            showIcon
          />
        ) : (
          <Table
            columns={columns}
            dataSource={warnings}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: true }}
          />
        )}
      </Card>

      <Modal
        title="预警详情"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>,
          !selectedWarning?.is_resolved && (
            <Button
              key="resolve"
              type="primary"
              onClick={() => {
                resolveWarning(selectedWarning.id);
                setModalVisible(false);
              }}
            >
              标记已处理
            </Button>
          ),
        ]}
      >
        {selectedWarning && (
          <Descriptions column={1}>
            <Descriptions.Item label="类型">
              <Tag color="blue">{selectedWarning.type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="级别">
              <Tag color={getLevelColor(selectedWarning.level)}>{selectedWarning.level}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="标题">{selectedWarning.title}</Descriptions.Item>
            <Descriptions.Item label="内容">{selectedWarning.content}</Descriptions.Item>
            <Descriptions.Item label="对象">{selectedWarning.target_name}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {moment(selectedWarning.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {selectedWarning.is_resolved ? (
                <Tag color="green">已处理</Tag>
              ) : (
                <Tag color="red">未处理</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Warnings;