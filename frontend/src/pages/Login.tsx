import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios';
import './Login.css';

const { Title } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await axios.post('/auth/login', values);
      const { token, user } = response.data;

      // 保存token到localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      message.success('登录成功！');
      window.location.href = '/dashboard';
    } catch (error: any) {
      message.error(error.response?.data?.error || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultAdmin = async () => {
    try {
      await axios.post('/auth/create-default-admin');
      // 不显示成功提示，避免重复提醒
    } catch (error) {
      // 不显示错误提示，避免干扰用户
    }
  };

  // 如果是首次访问，创建默认管理员
  React.useEffect(() => {
    createDefaultAdmin();
  }, []);

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <Title level={3} style={{ marginBottom: 0, color: '#1890ff' }}>
            高中教学质量数据运营分析平台
          </Title>
          <p style={{ color: '#666', marginTop: 8 }}>请使用您的账号登录</p>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: 40, fontSize: 16 }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <p style={{ fontSize: 12, color: '#999' }}>
            首次使用？系统已自动创建默认管理员账户
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Login;