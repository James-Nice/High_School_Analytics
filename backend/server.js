const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 设置响应编码
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// 数据库连接
const db = require('./db.js');

// 确保 uploads 目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('创建 uploads 目录:', uploadsDir);
}

// 路由
// 先创建数据库连接，再加载路由
// 测试路由
app.get('/api/test', (req, res) => {
    res.json({ message: '测试路由工作正常' });
});
app.get('/api/test/uploads', async (req, res) => {
    try {
        const uploadsDir = path.join(__dirname, 'uploads');
        const files = await fsPromises.readdir(uploadsDir);
        res.json(files);
    } catch (error) {
        console.error('获取上传文件列表失败:', error);
        res.status(500).json({ error: '获取上传文件列表失败' });
    }
});

app.use('/api/exams', require('./routes/exams'));
console.log('加载scores路由');
app.use('/api/scores', require('./routes/scores'));
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/config', require('./routes/config'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/decision-support', require('./routes/decisionSupport'));
app.use('/api/warnings', require('./routes/warnings'));
app.use('/api/reports', require('./routes/reports'));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});

module.exports = { app, db };
