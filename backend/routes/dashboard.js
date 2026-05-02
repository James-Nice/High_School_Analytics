const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取监控数据（班级动态监控）
router.get('/class-monitoring', (req, res) => {
    const { grade } = req.query;

    let query = `
        SELECT
            e.grade,
            ss.class_name,
            COUNT(*) as student_count,
            AVG(ss.total_score) as avg_score,
            MAX(ss.total_score) as max_score,
            MIN(ss.total_score) as min_score,
            SUM(CASE WHEN ss.total_score >= e.cutoff_scores->>'$.尖生分' THEN 1 ELSE 0 END) as top_students,
            SUM(CASE WHEN ss.total_score >= e.cutoff_scores->>'$.优秀分' THEN 1 ELSE 0 END) as excellent_students,
            SUM(CASE WHEN ss.total_score >= e.cutoff_scores->>'$.及格分' THEN 1 ELSE 0 END) as passed_students,
            SUM(CASE WHEN ss.total_score < e.cutoff_scores->>'$.低分分' THEN 1 ELSE 0 END) as low_students,
            e.name as latest_exam
        FROM student_scores ss
        JOIN (
            SELECT grade, MAX(exam_date) as latest_date
            FROM exams
            WHERE is_deleted = 0
            GROUP BY grade
        ) latest ON ss.exam_id = latest.id
        JOIN exams e ON ss.exam_id = e.id
        WHERE ss.is_deleted = 0
    `;

    const params = [];
    if (grade) {
        query += ' AND e.grade = ?';
        params.push(grade);
    }

    query += ' GROUP BY e.grade, ss.class_name';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // 获取上次考试数据进行对比
        rows.forEach(row => {
            db.get(`
                SELECT AVG(total_score) as last_avg
                FROM student_scores ss
                JOIN exams e ON ss.exam_id = e.id
                WHERE ss.class_name = ? AND e.grade = ? AND ss.is_deleted = 0
                ORDER BY e.exam_date DESC
                LIMIT 1 OFFSET 1
            `, [row.class_name, row.grade], (err, lastRow) => {
                if (!err && lastRow && lastRow.last_avg) {
                    row.last_avg = lastRow.last_avg;
                    row.avg_change = (row.avg_score - lastRow.last_avg).toFixed(2);
                    row.avg_change_percent = (((row.avg_score - lastRow.last_avg) / lastRow.last_avg) * 100).toFixed(2);
                } else {
                    row.avg_change = 0;
                    row.avg_change_percent = 0;
                }

                // 波动异常判定（平均分波动≥±10%或排名变化≥5位）
                row.is_abnormal = Math.abs(parseFloat(row.avg_change_percent)) >= 10;
            });
        });

        // 等待所有查询完成
        setTimeout(() => {
            res.json(rows);
        }, 100);
    });
});

// 获取学生监控数据
router.get('/student-monitoring', (req, res) => {
    const { class_name, grade } = req.query;

    // 获取最新考试
    db.get('SELECT id, cutoff_scores FROM exams WHERE is_deleted = 0 ORDER BY exam_date DESC LIMIT 1', (err, latestExam) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (!latestExam) {
            return res.json([]);
        }

        // 获取学生列表
        let query = `
            SELECT
                ss.student_number,
                ss.student_name,
                ss.class_name,
                ss.total_score,
                ss.grade_rank,
                ss.class_rank,
                ss.subject_scores,
                e.grade
            FROM student_scores ss
            JOIN exams e ON ss.exam_id = e.id
            WHERE ss.exam_id = ? AND ss.is_deleted = 0
        `;

        const params = [latestExam.id];
        if (class_name) {
            query += ' AND ss.class_name = ?';
            params.push(class_name);
        }
        if (grade) {
            query += ' AND e.grade = ?';
            params.push(grade);
        }

        db.all(query, params, (err, students) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            // 解析分数阈值
            const cutoffScores = JSON.parse(latestExam.cutoff_scores);
            const topScore = parseFloat(cutoffScores['尖生分'] || 135);
            const excellentScore = parseFloat(cutoffScores['优秀分'] || 120);
            const passScore = parseFloat(cutoffScores['及格分'] || 90);
            const lowScore = parseFloat(cutoffScores['低分分'] || 60);

            // 为每个学生添加类型标记
            const studentList = students.map(student => {
                const totalScore = student.total_score;
                
                // 计算学生类型
                const isTopStudent = totalScore >= topScore;
                const isExcellentStudent = totalScore >= excellentScore;
                const isGoodStudent = totalScore >= passScore;
                const isPassStudent = totalScore >= lowScore;
                const isLowStudent = totalScore < lowScore;
                
                // 简单的波动生判定（这里需要根据实际情况调整逻辑）
                const isFluctuationStudent = false;
                
                // 简单的偏科生判定（这里需要根据实际情况调整逻辑）
                const hasWeakSubject = false;
                
                // 简单的临界生判定（这里需要根据实际情况调整逻辑）
                const isCriticalStudent = totalScore >= passScore - 10 && totalScore < passScore;

                return {
                    ...student,
                    is_top_student: isTopStudent,
                    is_excellent_student: isExcellentStudent,
                    is_good_student: isGoodStudent,
                    is_pass_student: isPassStudent,
                    is_low_student: isLowStudent,
                    is_fluctuation_student: isFluctuationStudent,
                    has_weak_subject: hasWeakSubject,
                    is_critical_student: isCriticalStudent,
                    previous_rank: null // 这里可以根据实际情况添加上次排名
                };
            });

            res.json(studentList);
        });
    });
});

// 获取预警数据
router.get('/warnings', (req, res) => {
    const { resolved } = req.query;

    let query = 'SELECT * FROM warnings WHERE 1=1';
    const params = [];

    if (resolved !== undefined) {
        query += ' AND is_resolved = ?';
        params.push(resolved === 'true' ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 创建预警
router.post('/warnings', (req, res) => {
    const { type, level, title, content, target_id, target_name, exam_id } = req.body;

    const stmt = db.prepare(`
        INSERT INTO warnings (type, level, title, content, target_id, target_name, exam_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(type, level, title, content, target_id, target_name, exam_id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: '预警创建成功' });
    });

    stmt.finalize();
});

// 更新预警状态
router.put('/warnings/:id/resolve', (req, res) => {
    const { id } = req.params;
    const { is_resolved } = req.body;

    const stmt = db.prepare('UPDATE warnings SET is_resolved = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(is_resolved ? 1 : 0, id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: '预警状态更新成功' });
    });
    stmt.finalize();
});

// 大屏数据概览
router.get('/overview', (req, res) => {
    const { exam_id } = req.query;
    
    // 获取指定考试的所有数据
    const query = `
        WITH exam_stats AS (
            SELECT
                COUNT(*) as total_students,
                AVG(total_score) as avg_score,
                MAX(total_score) as max_score,
                MIN(total_score) as min_score,
                COUNT(DISTINCT class_name) as total_classes,
                SUM(CASE WHEN total_score >= 637.5 THEN 1 ELSE 0 END) as top_students,
                SUM(CASE WHEN total_score >= 600 THEN 1 ELSE 0 END) as excellent_students,
                SUM(CASE WHEN total_score >= 525 THEN 1 ELSE 0 END) as good_students,
                SUM(CASE WHEN total_score >= 300 THEN 1 ELSE 0 END) as passed_students,
                SUM(CASE WHEN total_score > 300 AND total_score < 450 THEN 1 ELSE 0 END) as potential_students,
                SUM(CASE WHEN total_score <= 300 THEN 1 ELSE 0 END) as low_students
            FROM student_scores
            WHERE is_deleted = 0
            ${exam_id ? 'AND exam_id = ?' : ''}
        ),
        latest_exam AS (
            SELECT * FROM exams 
            WHERE id ${exam_id ? '= ?' : 'IN (SELECT exam_id FROM student_scores WHERE is_deleted = 0 LIMIT 1)'}
        )
        SELECT
            le.name as exam_name,
            le.exam_date,
            le.grade,
            es.*
        FROM latest_exam le
        CROSS JOIN exam_stats es
    `;

    const params = [];
    if (exam_id) {
        params.push(exam_id);
        params.push(exam_id);
    }
    
    db.get(query, params, (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (!row) {
            return res.json({ message: '暂无考试数据' });
        }

        // 获取班级排名
        const classQuery = `
            SELECT
                class_name,
                AVG(total_score) as avg_score,
                COUNT(*) as student_count
            FROM student_scores
            WHERE is_deleted = 0
            ${exam_id ? 'AND exam_id = ?' : ''}
            GROUP BY class_name
            ORDER BY avg_score DESC
        `;

        const classParams = exam_id ? [exam_id] : [];
        
        db.all(classQuery, classParams, (err, classes) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            // 获取分数段分布
            const distributionQuery = `
                SELECT
                    CASE
                        WHEN total_score >= 135 THEN '135-150'
                        WHEN total_score >= 120 THEN '120-134'
                        WHEN total_score >= 90 THEN '90-119'
                        WHEN total_score >= 60 THEN '60-89'
                        ELSE '0-59'
                    END as range,
                    COUNT(*) as count
                FROM student_scores
                WHERE is_deleted = 0
                ${exam_id ? 'AND exam_id = ?' : ''}
                GROUP BY range
                ORDER BY range
            `;

            const distributionParams = exam_id ? [exam_id] : [];
            
            db.all(distributionQuery, distributionParams, (err, distribution) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }

                res.json({
                    exam_info: row,
                    class_ranking: classes,
                    score_distribution: distribution,
                    top_students: row.top_students,
                    excellent_students: row.excellent_students,
                    good_students: row.good_students,
                    passed_students: row.passed_students,
                    potential_students: row.potential_students,
                    low_students: row.low_students
                });
            });
        });
    });
});

// 获取趋势数据（用于大屏趋势图）
router.get('/trend-data', (req, res) => {
    const { days = 180 } = req.query;

    const query = `
        SELECT
            e.name,
            e.exam_date,
            AVG(ss.total_score) as avg_score,
            COUNT(*) as student_count,
            SUM(CASE WHEN ss.total_score >= e.cutoff_scores->>'$.优秀分' THEN 1 ELSE 0 END) as excellent_count
        FROM exams e
        LEFT JOIN student_scores ss ON e.id = ss.exam_id AND ss.is_deleted = 0
        WHERE e.is_deleted = 0 AND e.exam_date >= date('now', '-' || ? || ' days')
        GROUP BY e.id
        ORDER BY e.exam_date ASC
    `;

    db.all(query, [days], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 获取学科分数分布
router.get('/subject-distribution', (req, res) => {
    const { exam_id, subject } = req.query;
    
    if (!exam_id || !subject) {
        return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 学科映射：前端值 -> 数据库JSON键
    const subjectMap = {
        chinese_score: '语文',
        math_score: '数学',
        english_score: '英语',
        physics_score: '物理',
        chemistry_score: '化学',
        biology_score: '生物',
        politics_score: '政治',
        geography_score: '地理'
    };
    
    const subjectName = subjectMap[subject];
    if (!subjectName) {
        return res.status(400).json({ error: '无效的学科' });
    }
    
    // 根据学科类型确定分数段
    const is150Subject = ['chinese_score', 'math_score', 'english_score'].includes(subject);
    
    // 获取所有学生的分数数据
    const query = `
        SELECT subject_scores FROM student_scores
        WHERE is_deleted = 0 AND exam_id = ?
    `;
    
    db.all(query, [exam_id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // 初始化分数段计数
        let distribution = [];
        if (is150Subject) {
            distribution = [
                { range: '尖子生', threshold: '≥135', count: 0 },
                { range: '优秀生', threshold: '≥120', count: 0 },
                { range: '良好生', threshold: '≥105', count: 0 },
                { range: '及格生', threshold: '≥90', count: 0 },
                { range: '待进生', threshold: '>60且<90', count: 0 },
                { range: '低分生', threshold: '≤60', count: 0 }
            ];
        } else {
            distribution = [
                { range: '尖子生', threshold: '≥90', count: 0 },
                { range: '优秀生', threshold: '≥80', count: 0 },
                { range: '良好生', threshold: '≥70', count: 0 },
                { range: '及格生', threshold: '≥60', count: 0 },
                { range: '待进生', threshold: '>40且<60', count: 0 },
                { range: '低分生', threshold: '≤40', count: 0 }
            ];
        }
        
        // 遍历所有学生的分数
        rows.forEach(row => {
            try {
                const scores = JSON.parse(row.subject_scores);
                const score = scores[subjectName];
                
                if (score !== undefined) {
                    if (is150Subject) {
                        if (score >= 135) distribution[0].count++;
                        else if (score >= 120) distribution[1].count++;
                        else if (score >= 105) distribution[2].count++;
                        else if (score >= 90) distribution[3].count++;
                        else if (score > 60) distribution[4].count++;
                        else distribution[5].count++;
                    } else {
                        if (score >= 90) distribution[0].count++;
                        else if (score >= 80) distribution[1].count++;
                        else if (score >= 70) distribution[2].count++;
                        else if (score >= 60) distribution[3].count++;
                        else if (score > 40) distribution[4].count++;
                        else distribution[5].count++;
                    }
                }
            } catch (error) {
                console.error('解析分数数据失败:', error);
            }
        });
        
        // 保留所有等级，即使计数为0
        res.json(distribution);
    });
});

// 获取班级学科均值排名
router.get('/class-subject-ranking', (req, res) => {
    const { exam_id, subject } = req.query;
    
    if (!exam_id || !subject) {
        return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 学科映射：前端值 -> 数据库JSON键
    const subjectMap = {
        chinese_score: '语文',
        math_score: '数学',
        english_score: '英语',
        physics_score: '物理',
        chemistry_score: '化学',
        biology_score: '生物',
        politics_score: '政治',
        geography_score: '地理'
    };
    
    const subjectName = subjectMap[subject];
    if (!subjectName) {
        return res.status(400).json({ error: '无效的学科' });
    }
    
    // 获取所有学生的班级和分数数据
    const query = `
        SELECT class_name, subject_scores FROM student_scores
        WHERE is_deleted = 0 AND exam_id = ?
    `;
    
    db.all(query, [exam_id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // 按班级分组计算学科均值、最高分、最低分
        const classScores = {};
        
        rows.forEach(row => {
            try {
                const scores = JSON.parse(row.subject_scores);
                const score = scores[subjectName];
                
                if (score !== undefined) {
                    if (!classScores[row.class_name]) {
                        classScores[row.class_name] = {
                            total: 0,
                            count: 0,
                            max_score: score,
                            min_score: score
                        };
                    }
                    classScores[row.class_name].total += score;
                    classScores[row.class_name].count++;
                    if (score > classScores[row.class_name].max_score) {
                        classScores[row.class_name].max_score = score;
                    }
                    if (score < classScores[row.class_name].min_score) {
                        classScores[row.class_name].min_score = score;
                    }
                }
            } catch (error) {
                console.error('解析分数数据失败:', error);
            }
        });
        
        // 计算每个班级的均值、最高分、最低分并排序
        const ranking = Object.entries(classScores).map(([className, data]) => ({
            class_name: className,
            avg_score: (data.total / data.count).toFixed(2),
            max_score: data.max_score,
            min_score: data.min_score,
            student_count: data.count
        })).sort((a, b) => parseFloat(b.avg_score) - parseFloat(a.avg_score));
        
        res.json(ranking);
    });
});

// 获取校排名段数据
router.get('/school-ranking-segments', (req, res) => {
    const { exam_id, segments, mode } = req.query;
    
    if (!exam_id) {
        return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 判断是百分比模式还是名次模式
    const isPercentMode = mode !== 'rank';
    
    // 默认排名段
    let defaultSegments = [
        { name: '前10%', min: 0, max: 0.1 },
        { name: '前20%', min: 0.1, max: 0.2 },
        { name: '前30%', min: 0.2, max: 0.3 },
        { name: '前50%', min: 0.3, max: 0.5 },
        { name: '50%以后', min: 0.5, max: 1 }
    ];
    
    // 如果提供了自定义段次，使用自定义段次
    let rankingSegments = defaultSegments;
    if (segments) {
        try {
            rankingSegments = JSON.parse(segments);
        } catch (error) {
            console.error('解析自定义段次失败:', error);
        }
    }
    
    // 获取总学生数
    db.get(`
        SELECT COUNT(*) as total_students
        FROM student_scores
        WHERE is_deleted = 0 AND exam_id = ?
    `, [exam_id], (err, totalResult) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const totalStudents = totalResult.total_students;
        
        // 获取所有学生的班级和年级排名
        const query = `
            SELECT class_name, grade_rank
            FROM student_scores
            WHERE is_deleted = 0 AND exam_id = ?
        `;
        
        db.all(query, [exam_id], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // 按班级分组
            const classRanking = {};
            rows.forEach(row => {
                if (!classRanking[row.class_name]) {
                    classRanking[row.class_name] = [];
                }
                classRanking[row.class_name].push(row.grade_rank);
            });
            
            // 计算每个班级在每个段次的人数
            const result = rankingSegments.map(segment => {
                let minRank, maxRank;
                
                // 判断是百分比模式还是名次模式
                // 如果请求参数明确指定了mode，则使用指定的模式
                // 否则根据值的范围判断：如果 min 和 max 都 <= 1，则认为是百分比；否则是名次
                let isPercent = segment.min <= 1 && segment.max <= 1;
                if (req.query.mode === 'rank') {
                    isPercent = false;
                } else if (req.query.mode === 'percent') {
                    isPercent = true;
                }
                
                if (isPercent) {
                    // 百分比模式
                    minRank = Math.floor(segment.min * totalStudents) + 1; // 排名从1开始
                    maxRank = Math.floor(segment.max * totalStudents);
                } else {
                    // 名次模式
                    minRank = Math.floor(segment.min); // 直接使用用户输入的起始名次
                    maxRank = Math.floor(segment.max);
                }
                
                const classCounts = {};
                Object.entries(classRanking).forEach(([className, ranks]) => {
                    classCounts[className] = ranks.filter(rank => {
                        return rank >= minRank && rank <= maxRank;
                    }).length;
                });
                
                return {
                    segment: segment.name,
                    range: `${minRank}-${maxRank}`,
                    class_counts: classCounts
                };
            });
            
            // 返回结果和总学生数
            res.json({
                data: result,
                total_students: totalStudents
            });
        });
    });
});

// 获取总分分数段数据
router.get('/total-score-segments', (req, res) => {
    const { exam_id, segments } = req.query;
    
    if (!exam_id) {
        return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 默认分数段
    let defaultSegments = [
        { name: '600以上', min: 600, max: 750 },
        { name: '550-599', min: 550, max: 599 },
        { name: '500-549', min: 500, max: 549 },
        { name: '450-499', min: 450, max: 499 },
        { name: '400-449', min: 400, max: 449 },
        { name: '400以下', min: 0, max: 399 }
    ];
    
    // 如果提供了自定义段次，使用自定义段次
    let scoreSegments = defaultSegments;
    if (segments) {
        try {
            scoreSegments = JSON.parse(segments);
        } catch (error) {
            console.error('解析自定义段次失败:', error);
        }
    }
    
    // 获取所有学生的班级和总分
    const query = `
        SELECT class_name, total_score
        FROM student_scores
        WHERE is_deleted = 0 AND exam_id = ?
    `;
    
    db.all(query, [exam_id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // 按班级分组
        const classScores = {};
        rows.forEach(row => {
            if (!classScores[row.class_name]) {
                classScores[row.class_name] = [];
            }
            classScores[row.class_name].push(row.total_score);
        });
        
        // 计算每个班级在每个分数段的人数
        const result = scoreSegments.map(segment => {
            const classCounts = {};
            Object.entries(classScores).forEach(([className, scores]) => {
                classCounts[className] = scores.filter(score => {
                    return score >= segment.min && score <= segment.max;
                }).length;
            });
            
            return {
                segment: segment.name,
                range: `${segment.min}-${segment.max}`,
                class_counts: classCounts
            };
        });
        
        res.json(result);
    });
});

module.exports = router;