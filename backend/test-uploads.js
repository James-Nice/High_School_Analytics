const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// 测试上传文件列表路由
router.get('/uploads', async (req, res) => {
    try {
        const uploadsDir = path.join(__dirname, 'uploads');
        const files = await fs.readdir(uploadsDir);
        
        const fileList = [];
        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            const stats = await fs.stat(filePath);
            fileList.push({
                name: file,
                size: stats.size,
                mtime: stats.mtime,
                isFile: stats.isFile()
            });
        }
        
        res.json(fileList);
    } catch (error) {
        console.error('获取上传文件列表失败:', error);
        res.status(500).json({ error: '获取上传文件列表失败' });
    }
});

module.exports = router;