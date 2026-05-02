const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

// 用户登录
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    db.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!user) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 生成JWT token
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role,
                grade_access: user.grade_access,
                class_access: user.class_access,
                subject_access: user.subject_access
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // 更新最后登录时间
        db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                grade_access: user.grade_access,
                class_access: user.class_access,
                subject_access: user.subject_access
            }
        });
    });
});

// 创建用户（超级管理员使用）
router.post('/users', async (req, res) => {
    const { username, password, role, grade_access, class_access, subject_access } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: '用户名、密码和角色不能为空' });
    }

    // 检查用户名是否已存在
    db.get('SELECT id FROM users WHERE username = ?', [username], async (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (row) {
            return res.status(409).json({ error: '用户名已存在' });
        }

        // 加密密码
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // 插入用户
        const stmt = db.prepare(`
            INSERT INTO users (username, password_hash, role, grade_access, class_access, subject_access)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            username,
            passwordHash,
            role,
            grade_access || null,
            class_access || null,
            subject_access || null,
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                res.json({
                    id: this.lastID,
                    message: '用户创建成功',
                    user: {
                        username,
                        role,
                        grade_access,
                        class_access,
                        subject_access
                    }
                });
            }
        );

        stmt.finalize();
    });
});

// 获取用户列表
router.get('/users', (req, res) => {
    db.all('SELECT id, username, role, grade_access, class_access, subject_access, is_active, created_at FROM users ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// 更新用户状态
router.put('/users/:id/status', (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    const stmt = db.prepare('UPDATE users SET is_active = ? WHERE id = ?');
    stmt.run(is_active ? 1 : 0, id, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }

        res.json({ message: '用户状态更新成功' });
    });
    stmt.finalize();
});

// 重置密码
router.put('/users/:id/password', async (req, res) => {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
        return res.status(400).json({ error: '密码长度至少为6位' });
    }

    const passwordHash = await bcrypt.hash(new_password, 10);
    const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    stmt.run(passwordHash, id, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }

        res.json({ message: '密码重置成功' });
    });
    stmt.finalize();
});

// 验证token
router.post('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '未提供token' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ valid: true, user: decoded });
    } catch (error) {
        res.status(401).json({ valid: false, error: 'token无效或已过期' });
    }
});

// 权限验证中间件
function checkPermission(requiredRole, requiredAccess) {
    return (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: '未提供token' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);

            // 超级管理员拥有所有权限
            if (decoded.role === 'super_admin') {
                return next();
            }

            // 检查角色
            if (requiredRole && decoded.role !== requiredRole) {
                return res.status(403).json({ error: '权限不足' });
            }

            // 检查访问权限
            if (requiredAccess) {
                if (requiredAccess.grade && !decoded.grade_access?.includes(requiredAccess.grade)) {
                    return res.status(403).json({ error: '无权访问该年级' });
                }
                if (requiredAccess.class && !decoded.class_access?.includes(requiredAccess.class)) {
                    return res.status(403).json({ error: '无权访问该班级' });
                }
                if (requiredAccess.subject && !decoded.subject_access?.includes(requiredAccess.subject)) {
                    return res.status(403).json({ error: '无权访问该学科' });
                }
            }

            req.user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ error: 'token无效或已过期' });
        }
    };
}

// 创建默认管理员账户
router.post('/create-default-admin', async (req, res) => {
    const { username = 'admin', password = 'admin123' } = req.body || {};

    db.get('SELECT id FROM users WHERE username = ?', [username], async (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (row) {
            return res.json({ message: '管理员账户已存在' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const stmt = db.prepare(`
            INSERT INTO users (username, password_hash, role, is_active)
            VALUES (?, ?, 'super_admin', 1)
        `);

        stmt.run(username, passwordHash, function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                message: '管理员账户创建成功',
                credentials: { username, password }
            });
        });

        stmt.finalize();
    });
});

module.exports = router;