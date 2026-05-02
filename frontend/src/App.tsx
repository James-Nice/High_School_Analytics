import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ConfigProvider, Layout, Menu } from 'antd';
import { UserOutlined, DashboardOutlined, BarChartOutlined, TeamOutlined, FileTextOutlined, SettingOutlined, BulbOutlined, WarningOutlined } from '@ant-design/icons';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ExamManagement from './pages/ExamManagement';
import ScoreImport from './pages/ScoreImport';
import Analysis from './pages/Analysis';
import StudentMonitor from './pages/StudentMonitor';
import ClassMonitor from './pages/ClassMonitor';
import ReportExport from './pages/ReportExport';
import SystemConfig from './pages/SystemConfig';
import DecisionSupport from './pages/DecisionSupport';
import Warnings from './pages/Warnings';
import { ScoreImportProvider } from './contexts/ScoreImportContext';
import axios from 'axios';
import zhCN from 'antd/es/locale/zh_CN';
import './App.css';

const { Header, Sider, Content } = Layout;

// 设置axios默认配置
axios.defaults.baseURL = 'http://localhost:5000/api';
axios.defaults.timeout = 10000;

// 请求拦截器
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('响应错误:', error);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const AppContent: React.FC = () => {
  const [collapsed] = useState(false);
  const [userInfo] = useState<any>(null);
  const [selectedKey, setSelectedKey] = useState<string>(() => {
    const path = window.location.pathname;
    return path === '/' ? '/dashboard' : path;
  });
  const navigate = useNavigate();

  useEffect(() => {
    // 检查登录状态
    const token = localStorage.getItem('token');
    if (token && window.location.pathname === '/login') {
      navigate('/dashboard');
    }
  }, [navigate]);

  // 监听路径变化，更新选中的菜单项
  useEffect(() => {
    const handlePathChange = () => {
      const path = window.location.pathname;
      setSelectedKey(path === '/' ? '/dashboard' : path);
    };

    // 初始调用
    handlePathChange();

    // 监听popstate事件
    window.addEventListener('popstate', handlePathChange);

    return () => {
      window.removeEventListener('popstate', handlePathChange);
    };
  }, []);

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '数据大屏',
    },
    {
      key: '/exams',
      icon: <UserOutlined />,
      label: '考试管理',
    },
    {
      key: '/scores',
      icon: <TeamOutlined />,
      label: '成绩导入',
    },
    {
      key: '/analysis',
      icon: <BarChartOutlined />,
      label: '统计分析',
    },
    {
      key: '/class-monitor',
      icon: <TeamOutlined />,
      label: '班级监控',
    },
    {
      key: '/student-monitor',
      icon: <UserOutlined />,
      label: '学生监控',
    },
    {
      key: '/warnings',
      icon: <WarningOutlined />,
      label: '预警系统',
    },
    {
      key: '/decision-support',
      icon: <BulbOutlined />,
      label: '决策支持',
    },
    {
      key: '/reports',
      icon: <FileTextOutlined />,
      label: '报表导出',
    },
    {
      key: '/config',
      icon: <SettingOutlined />,
      label: '系统配置',
    },
  ];

  const handleMenuClick = (e: any) => {
    setSelectedKey(e.key);
    navigate(e.key);
  };

  const token = localStorage.getItem('token');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div className="logo" style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '16px', fontWeight: 'bold' }}>
          {!collapsed && '教学质量分析平台'}
          {collapsed && '平台'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout className="site-layout">
        <Header className="site-layout-background" style={{ padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>高中教学质量数据运营分析平台</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>欢迎，{userInfo?.username || '管理员'}</span>
            <span
              style={{ cursor: 'pointer' }}
              onClick={() => {
                localStorage.removeItem('token');
                navigate('/login');
              }}
            >
              退出登录
            </span>
          </div>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', overflow: 'auto' }}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/exams" element={<ExamManagement />} />
            <Route path="/scores" element={<ScoreImport />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/class-monitor" element={<ClassMonitor />} />
            <Route path="/student-monitor" element={<StudentMonitor />} />
            <Route path="/warnings" element={<Warnings />} />
            <Route path="/decision-support" element={<DecisionSupport />} />
            <Route path="/reports" element={<ReportExport />} />
            <Route path="/config" element={<SystemConfig />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ScoreImportProvider>
      <ConfigProvider locale={zhCN}>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                localStorage.getItem('token') ? (
                  <AppContent />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </Routes>
        </Router>
      </ConfigProvider>
    </ScoreImportProvider>
  );
};

export default App;
