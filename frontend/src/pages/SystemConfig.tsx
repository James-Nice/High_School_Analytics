import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Select, Switch,
  message, Tabs, Row, Col, Typography, Alert, Divider, Space, Tag
} from 'antd';
import {
  SaveOutlined, ReloadOutlined, SettingOutlined,
  WarningOutlined, DashboardOutlined, FileTextOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

const SystemConfig: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [configList, setConfigList] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchConfigList();
  }, []);

  const fetchConfigList = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/config');
      setConfigList(response.data);
    } catch (error) {
      message.error('获取配置列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getConfigByCategory = (category: string) => {
    return configList.filter(config => config.config_key.startsWith(category));
  };

  const handleEditConfig = (record: any) => {
    setEditingConfig(record);
    form.setFieldsValue({
      config_value: record.config_value,
      description: record.description,
    });
    setModalVisible(true);
  };

  const handleSaveConfig = async (values: any) => {
    try {
      await axios.put(`/config/${editingConfig.config_key}`, {
        config_value: values.config_value,
        description: values.description,
      });
      message.success('配置更新成功');
      setModalVisible(false);
      fetchConfigList();
    } catch (error) {
      message.error('配置更新失败');
    }
  };

  const handleBatchUpdate = async (category: string, newValues: any) => {
    try {
      const configs = getConfigByCategory(category);
      const updates = configs.map(config => ({
        key: config.config_key,
        value: newValues[config.config_key] || config.config_value,
      }));

      await axios.put('/config', { configs: updates });
      message.success('批量更新成功');
      fetchConfigList();
    } catch (error) {
      message.error('批量更新失败');
    }
  };

  const resetToDefaults = async () => {
    try {
      await axios.post('/config/reset-defaults');
      message.success('已重置为默认配置');
      fetchConfigList();
    } catch (error) {
      message.error('重置失败');
    }
  };

  const scoreColumns = [
    { title: '配置项', dataIndex: 'description', key: 'description', width: 200 },
    { title: '当前值', dataIndex: 'config_value', key: 'config_value', render: (value: string) => <Tag>{value}</Tag> },
    { title: '说明', dataIndex: 'description', key: 'description' },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: any) => (
        <Button type="link" size="small" onClick={() => handleEditConfig(record)}>
          编辑
        </Button>
      ),
    },
  ];

  const warningColumns = [
    { title: '预警规则', dataIndex: 'description', key: 'description', width: 250 },
    { title: '当前阈值', dataIndex: 'config_value', key: 'config_value', render: (value: string) => <Tag color="red">{value}</Tag> },
    { title: '说明', dataIndex: 'description', key: 'description' },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: any) => (
        <Button type="link" size="small" onClick={() => handleEditConfig(record)}>
          编辑
        </Button>
      ),
    },
  ];

  const dashboardColumns = [
    { title: '配置项', dataIndex: 'description', key: 'description', width: 200 },
    { title: '当前值', dataIndex: 'config_value', key: 'config_value', render: (value: string) => <Tag color="blue">{value}</Tag> },
    { title: '说明', dataIndex: 'description', key: 'description' },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: any) => (
        <Button type="link" size="small" onClick={() => handleEditConfig(record)}>
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          <SettingOutlined /> 系统配置
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={resetToDefaults}>
            重置为默认
          </Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={fetchConfigList}>
            刷新配置
          </Button>
        </Space>
      </div>

      <Alert
        message="配置说明"
        description="所有配置项的修改将立即生效，请谨慎调整。建议在修改前了解各配置项的具体含义。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Tabs defaultActiveKey="score" tabPosition="top">
        <TabPane
          tab={
            <span>
              <FileTextOutlined />
              分数阈值配置
            </span>
          }
          key="score"
        >
          <Card
            title="分数段判定标准"
            extra={
              <Button type="primary" size="small" onClick={() => handleBatchUpdate('top_score_percentage', {})}>
                批量保存
              </Button>
            }
          >
            <Table
              dataSource={getConfigByCategory('top_score_percentage').concat(
                getConfigByCategory('excellent_score_percentage'),
                getConfigByCategory('pass_score_percentage'),
                getConfigByCategory('low_score_percentage')
              )}
              columns={scoreColumns}
              rowKey="config_key"
              pagination={false}
            />
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <WarningOutlined />
              预警规则配置
            </span>
          }
          key="warning"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Card title="班级预警规则">
                <Table
                  dataSource={getConfigByCategory('warning_avg_score_threshold').concat(
                    getConfigByCategory('warning_pass_rate_threshold'),
                    getConfigByCategory('warning_rank_drop_threshold'),
                    getConfigByCategory('warning_continuous_decline_count')
                  )}
                  columns={warningColumns}
                  rowKey="config_key"
                  pagination={false}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="学生预警规则">
                <Table
                  dataSource={getConfigByCategory('fluctuation_class_score_threshold').concat(
                    getConfigByCategory('fluctuation_class_rank_threshold'),
                    getConfigByCategory('fluctuation_student_rank_threshold'),
                    getConfigByCategory('fluctuation_student_score_threshold')
                  )}
                  columns={warningColumns}
                  rowKey="config_key"
                  pagination={false}
                />
              </Card>
            </Col>
          </Row>

          <Divider />

          <Card title="偏科与临界生配置" style={{ marginTop: 16 }}>
            <Table
              dataSource={getConfigByCategory('weak_subject_rank_gap_percentage').concat(
                getConfigByCategory('critical_student_score_range')
              )}
              columns={warningColumns}
              rowKey="config_key"
              pagination={false}
            />
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <DashboardOutlined />
              大屏展示配置
            </span>
          }
          key="dashboard"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Card title="刷新与展示设置">
                <Table
                  dataSource={getConfigByCategory('dashboard_refresh_interval').concat(
                    getConfigByCategory('dashboard_default_resolution')
                  )}
                  columns={dashboardColumns}
                  rowKey="config_key"
                  pagination={false}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="水印与导出设置">
                <Table
                  dataSource={getConfigByCategory('chart_watermark_enabled').concat(
                    getConfigByCategory('chart_watermark_text'),
                    getConfigByCategory('export_filename_format')
                  )}
                  columns={dashboardColumns}
                  rowKey="config_key"
                  pagination={false}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane
          tab={
            <span>
              <SettingOutlined />
              全部配置
            </span>
          }
          key="all"
        >
          <Card title="系统配置总览">
            <Table
              dataSource={configList}
              columns={[
                { title: '配置键', dataIndex: 'config_key', key: 'config_key', width: 250 },
                { title: '配置值', dataIndex: 'config_value', key: 'config_value', render: (value) => <Tag>{value}</Tag> },
                { title: '说明', dataIndex: 'description', key: 'description' },
                {
                  title: '最后更新',
                  dataIndex: 'updated_at',
                  key: 'updated_at',
                  render: (date) => moment(date).format('MM-DD HH:mm'),
                },
                {
                  title: '操作',
                  key: 'action',
                  width: 120,
                  render: (_: any, record: any) => (
                    <Button type="link" size="small" onClick={() => handleEditConfig(record)}>
                      编辑
                    </Button>
                  ),
                },
              ]}
              rowKey="config_key"
              pagination={{ pageSize: 20 }}
              scroll={{ x: 1000 }}
            />
          </Card>
        </TabPane>
      </Tabs>

      <Modal
        title="编辑配置"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveConfig}
        >
          <Form.Item
            name="config_value"
            label="配置值"
            rules={[{ required: true, message: '请输入配置值' }]}
          >
            {editingConfig?.config_key.includes('enabled') ? (
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            ) : (
              <Input />
            )}
          </Form.Item>

          <Form.Item
            name="description"
            label="配置说明"
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemConfig;