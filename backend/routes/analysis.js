const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取统计分析数据
router.get('/statistical', (req, res) => {
    const { exam_id, class_name, grade, subject } = req.query;

    let baseQuery = `
        SELECT
            COUNT(*) as total_students,
            ROUND(AVG(total_score), 2) as avg_score,
            MAX(total_score) as max_score,
            MIN(total_score) as min_score,
            SUM(CASE WHEN total_score >= 637.5 THEN 1 ELSE 0 END) as top_students, -- 尖子生：总分637.5以上（按高考6科750分计算）
            SUM(CASE WHEN total_score >= 600 THEN 1 ELSE 0 END) as excellent_students, -- 优秀生：总分600以上
            SUM(CASE WHEN total_score >= 525 THEN 1 ELSE 0 END) as good_students, -- 良好生：总分525以上
            SUM(CASE WHEN total_score >= 450 THEN 1 ELSE 0 END) as passed_students, -- 及格生：总分450以上
            SUM(CASE WHEN total_score > 300 AND total_score < 450 THEN 1 ELSE 0 END) as potential_students, -- 待进生：总分300以上450以下
            SUM(CASE WHEN total_score <= 300 THEN 1 ELSE 0 END) as low_students -- 低分生：总分300以下
        FROM student_scores ss
        JOIN exams e ON ss.exam_id = e.id
        WHERE ss.is_deleted = 0
    `;

    const params = [];
    if (exam_id) {
        baseQuery += ' AND ss.exam_id = ?';
        params.push(exam_id);
    }
    if (class_name) {
        baseQuery += ' AND ss.class_name = ?';
        params.push(class_name);
    }
    if (grade) {
        baseQuery += ' AND e.grade = ?';
        params.push(grade);
    }

    db.get(baseQuery, params, (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // 计算百分比
        if (row.total_students > 0) {
            row.top_rate = (row.top_students / row.total_students * 100).toFixed(2);
            row.excellent_rate = (row.excellent_students / row.total_students * 100).toFixed(2);
            row.good_rate = (row.good_students / row.total_students * 100).toFixed(2);
            row.passed_rate = (row.passed_students / row.total_students * 100).toFixed(2);
            row.potential_rate = (row.potential_students / row.total_students * 100).toFixed(2);
            row.low_rate = (row.low_students / row.total_students * 100).toFixed(2);
        }

        res.json(row);
    });
});

// 分数段统计
router.get('/score-distribution', (req, res) => {
    const { exam_id, class_name, grade, subject } = req.query;

    let query = `
        SELECT
            CASE
                WHEN total_score >= 135 THEN '150-135'
                WHEN total_score >= 120 THEN '134-120'
                WHEN total_score >= 90 THEN '119-90'
                WHEN total_score >= 60 THEN '89-60'
                ELSE '60以下'
            END as score_range,
            COUNT(*) as count
        FROM student_scores ss
        JOIN exams e ON ss.exam_id = e.id
        WHERE ss.is_deleted = 0
    `;

    const params = [];
    if (exam_id) {
        query += ' AND ss.exam_id = ?';
        params.push(exam_id);
    }
    if (class_name) {
        query += ' AND ss.class_name = ?';
        params.push(class_name);
    }
    if (grade) {
        query += ' AND e.grade = ?';
        params.push(grade);
    }

    query += ' GROUP BY score_range ORDER BY score_range';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 班级对比分析
router.get('/class-comparison', (req, res) => {
    const { exam_id, grade } = req.query;

    let query = `
        SELECT
            class_name,
            COUNT(*) as student_count,
            ROUND(AVG(total_score), 2) as avg_score,
            MAX(total_score) as max_score,
            MIN(total_score) as min_score,
            SUM(CASE WHEN total_score >= 637.5 THEN 1 ELSE 0 END) as top_students, -- 尖子生：总分637.5以上（按高考6科750分计算）
            SUM(CASE WHEN total_score >= 600 THEN 1 ELSE 0 END) as excellent_students, -- 优秀生：总分600以上
            SUM(CASE WHEN total_score >= 525 THEN 1 ELSE 0 END) as good_students, -- 良好生：总分525以上
            SUM(CASE WHEN total_score >= 450 THEN 1 ELSE 0 END) as passed_students, -- 及格生：总分450以上
            SUM(CASE WHEN total_score > 300 AND total_score < 450 THEN 1 ELSE 0 END) as potential_students, -- 待进生：总分300以上450以下
            SUM(CASE WHEN total_score <= 300 THEN 1 ELSE 0 END) as low_students -- 低分生：总分300以下
        FROM student_scores ss
        JOIN exams e ON ss.exam_id = e.id
        WHERE ss.is_deleted = 0
    `;

    const params = [];
    if (exam_id) {
        query += ' AND ss.exam_id = ?';
        params.push(exam_id);
    }
    if (grade) {
        query += ' AND e.grade = ?';
        params.push(grade);
    }

    query += ' GROUP BY class_name ORDER BY avg_score DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // 计算百分比
        rows.forEach(row => {
            row.top_rate = (row.top_students / row.student_count * 100).toFixed(2);
            row.excellent_rate = (row.excellent_students / row.student_count * 100).toFixed(2);
            row.good_rate = (row.good_students / row.student_count * 100).toFixed(2);
            row.passed_rate = (row.passed_students / row.student_count * 100).toFixed(2);
            row.potential_rate = (row.potential_students / row.student_count * 100).toFixed(2);
            row.low_rate = (row.low_students / row.student_count * 100).toFixed(2);
        });

        res.json(rows);
    });
});

// 学科分析
router.get('/subject-analysis', (req, res) => {
    const { exam_id, class_name } = req.query;

    let query = `
        SELECT
            class_name,
            subject_scores->>'$.语文' as chinese_score,
            subject_scores->>'$.数学' as math_score,
            subject_scores->>'$.英语' as english_score,
            subject_scores->>'$.物理' as physics_score,
            subject_scores->>'$.化学' as chemistry_score,
            subject_scores->>'$.生物' as biology_score,
            subject_scores->>'$.政治' as politics_score,
            subject_scores->>'$.地理' as geography_score
        FROM student_scores ss
        WHERE ss.is_deleted = 0
    `;

    const params = [];
    if (exam_id) {
        query += ' AND ss.exam_id = ?';
        params.push(exam_id);
    }
    if (class_name) {
        query += ' AND ss.class_name = ?';
        params.push(class_name);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // 计算各学科平均分
        const subjects = ['chinese_score', 'math_score', 'english_score', 'physics_score', 'chemistry_score', 'biology_score', 'politics_score', 'geography_score'];
        const analysis = {};

        subjects.forEach(subject => {
            const validScores = rows.map(row => parseFloat(row[subject])).filter(score => !isNaN(score));
            analysis[subject] = {
                avg_score: validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2) : 0,
                student_count: validScores.length
            };
        });

        res.json(analysis);
    });
});

// 学生个人分析
router.get('/student-analysis/:student_number', (req, res) => {
    const { student_number } = req.params;
    const { exam_id } = req.query;

    let query = `
        SELECT
            ss.*,
            e.name as exam_name,
            e.exam_date
        FROM student_scores ss
        JOIN exams e ON ss.exam_id = e.id
        WHERE ss.student_number = ? AND ss.is_deleted = 0
    `;

    const params = [student_number];
    if (exam_id) {
        query += ' AND ss.exam_id = ?';
        params.push(exam_id);
    }

    query += ' ORDER BY e.exam_date DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (rows.length === 0) {
            return res.status(404).json({ error: '学生不存在或没有成绩记录' });
        }

        // 分析偏科情况
        const latest = rows[0];
        const subjectScores = JSON.parse(latest.subject_scores);
        const totalRank = latest.grade_rank;

        const subjects = Object.keys(subjectScores);
        const subjectRanks = {};
        let completedQueries = 0;

        // 计算各科排名
        if (subjects.length === 0) {
            // 没有学科时直接返回
            res.json({
                student_info: latest,
                exam_history: rows,
                weak_subjects: []
            });
        } else {
            subjects.forEach(subject => {
                const subjectQuery = `
                    SELECT COUNT(*) + 1 as subject_rank
                    FROM student_scores ss2
                    WHERE ss2.exam_id = ? AND ss2.is_deleted = 0
                    AND (ss2.subject_scores->>? >= ?)
                `;

                db.get(subjectQuery, [latest.exam_id, subject, subjectScores[subject]], (err, row) => {
                    if (!err && row) {
                        subjectRanks[subject] = row.subject_rank;
                    }
                    
                    completedQueries++;
                    
                    // 所有查询完成后计算偏科并返回
                    if (completedQueries === subjects.length) {
                        // 偏科判定（某一学科排名比总分排名低20%以上）
                        const weakSubjects = [];
                        Object.keys(subjectRanks).forEach(subject => {
                            const rankDiff = subjectRanks[subject] - totalRank;
                            const rankDiffPercent = rankDiff / (latest.grade_rank_count || 1);

                            if (rankDiffPercent >= 0.2) {
                                weakSubjects.push({
                                    subject,
                                    total_rank: totalRank,
                                    subject_rank: subjectRanks[subject],
                                    rank_diff_percent: (rankDiffPercent * 100).toFixed(2)
                                });
                            }
                        });

                        latest.weak_subjects = weakSubjects;
                        res.json({
                            student_info: latest,
                            exam_history: rows,
                            weak_subjects: weakSubjects
                        });
                    }
                });
            });
        }
    });
});

// 趋势分析数据
router.get('/trend-analysis', (req, res) => {
    const { student_number, class_name, grade, subject } = req.query;

    let query = `
        SELECT
            e.name as exam_name,
            e.exam_date,
            ss.total_score,
            ss.grade_rank,
            ss.class_rank
        FROM student_scores ss
        JOIN exams e ON ss.exam_id = e.id
        WHERE 1=1
    `;

    const params = [];
    if (student_number) {
        query += ' AND ss.student_number = ?';
        params.push(student_number);
    }
    if (class_name) {
        query += ' AND ss.class_name = ?';
        params.push(class_name);
    }
    if (grade) {
        query += ' AND e.grade = ?';
        params.push(grade);
    }

    query += ' ORDER BY e.exam_date ASC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 对比分析（与上次考试）
router.get('/comparison', (req, res) => {
    const { exam_id, class_name, student_number } = req.query;

    db.get('SELECT * FROM exams WHERE id = ?', [exam_id], (err, currentExam) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (!currentExam) {
            return res.status(404).json({ error: '考试不存在' });
        }

        // 查找上次相同类型的考试
        db.get(`
            SELECT * FROM exams
            WHERE grade = ? AND type = ? AND id != ? AND is_deleted = 0
            ORDER BY exam_date DESC
            LIMIT 1
        `, [currentExam.grade, currentExam.type, exam_id], (err, lastExam) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            if (!lastExam) {
                return res.json({ message: '没有找到上次考试数据' });
            }

            // 对比分析
            const query = `
                SELECT
                    AVG(CASE WHEN ss.exam_id = ? THEN ss.total_score END) as current_avg,
                    AVG(CASE WHEN ss.exam_id = ? THEN ss.total_score END) as last_avg,
                    COUNT(CASE WHEN ss.exam_id = ? THEN 1 END) as current_count,
                    COUNT(CASE WHEN ss.exam_id = ? THEN 1 END) as last_count
                FROM student_scores ss
                WHERE ss.exam_id IN (?, ?) AND ss.is_deleted = 0
            `;

            db.get(query, [exam_id, lastExam.id, exam_id, lastExam.id, exam_id, lastExam.id], (err, row) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }

                const analysis = {
                    current_exam: currentExam.name,
                    last_exam: lastExam.name,
                    current_avg: row.current_avg || 0,
                    last_avg: row.last_avg || 0,
                    avg_change: row.current_avg && row.last_avg ? (row.current_avg - row.last_avg).toFixed(2) : 0,
                    current_count: row.current_count,
                    last_count: row.last_count
                };

                res.json(analysis);
            });
        });
    });
});
module.exports = router;