const express = require('express');
const router = express.Router();
const db = require('../db');
const sqlite3 = require('sqlite3').verbose();

// 获取考试列表
router.get('/', (req, res) => {
    const { grade, type } = req.query;
    let query = 'SELECT * FROM exams WHERE is_deleted = 0';
    const params = [];

    if (grade) {
        query += ' AND grade = ?';
        params.push(grade);
    }
    if (type) {
        query += ' AND type = ?';
        params.push(type);
    }

    query += ' ORDER BY exam_date DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 创建考试
router.post('/', (req, res) => {
    const { name, type, grade, exam_date, subjects, full_scores, cutoff_scores } = req.body;

    if (!name || !type || !grade || !exam_date || !subjects || !full_scores) {
        return res.status(400).json({ error: '缺少必要参数' });
    }

    const stmt = db.prepare(`
        INSERT INTO exams (name, type, grade, exam_date, subjects, full_scores, cutoff_scores)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
        name,
        type,
        grade,
        exam_date,
        JSON.stringify(subjects),
        JSON.stringify(full_scores),
        JSON.stringify(cutoff_scores || {})
    ], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: '考试创建成功' });
    });

    stmt.finalize();
});

// 获取单个考试详情
router.get('/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM exams WHERE id = ? AND is_deleted = 0', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            return res.status(404).json({ error: '考试不存在' });
        }
        res.json(row);
    });
});

// 更新考试信息
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { name, type, grade, exam_date, subjects, full_scores, cutoff_scores } = req.body;

    const stmt = db.prepare(`
        UPDATE exams
        SET name = ?, type = ?, grade = ?, exam_date = ?, subjects = ?, full_scores = ?, cutoff_scores = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND is_deleted = 0
    `);

    stmt.run([
        name, type, grade, exam_date,
        JSON.stringify(subjects),
        JSON.stringify(full_scores),
        JSON.stringify(cutoff_scores || {}),
        id
    ], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: '考试不存在' });
        }
        res.json({ message: '考试更新成功' });
    });

    stmt.finalize();
});

// 删除考试（软删除）
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare('UPDATE exams SET is_deleted = 1 WHERE id = ?');
    stmt.run(id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: '考试删除成功' });
    });
    stmt.finalize();
});

// 获取选科组合
router.get('/combinations/:grade', (req, res) => {
    const { grade } = req.params;
    db.all('SELECT * FROM subject_combinations WHERE grade = ? ORDER BY is_default DESC, name ASC', [grade], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 添加选科组合
router.post('/combinations', (req, res) => {
    const { name, subjects, grade } = req.body;
    const stmt = db.prepare('INSERT INTO subject_combinations (name, subjects, grade) VALUES (?, ?, ?)');
    stmt.run(name, JSON.stringify(subjects), grade, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: '选科组合添加成功' });
    });
    stmt.finalize();
});

// 删除选科组合
router.delete('/combinations/:id', (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM subject_combinations WHERE id = ?');
    stmt.run(id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: '选科组合删除成功' });
    });
    stmt.finalize();
});

module.exports = router;