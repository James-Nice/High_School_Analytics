const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取预警列表
router.get('/', (req, res) => {
  try {
    const { exam_id, type, level, is_resolved } = req.query;

    let query = 'SELECT * FROM warnings WHERE 1=1';
    const params = [];

    if (exam_id) {
      query += ' AND exam_id = ?';
      params.push(exam_id);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (level) {
      query += ' AND level = ?';
      params.push(level);
    }

    if (is_resolved !== undefined) {
      query += ' AND is_resolved = ?';
      params.push(is_resolved);
    }

    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('获取预警列表失败:', err);
        return res.status(500).json({ error: '获取预警列表失败' });
      }

      res.json(rows);
    });
  } catch (error) {
    console.error('获取预警列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 生成预警
router.post('/generate', (req, res) => {
  try {
    const { exam_id } = req.body;

    if (!exam_id) {
      return res.status(400).json({ error: '考试ID不能为空' });
    }

    // 清除该考试的旧预警
    db.run('DELETE FROM warnings WHERE exam_id = ?', [exam_id], (err) => {
      if (err) {
        console.error('清除旧预警失败:', err);
        return res.status(500).json({ error: '清除旧预警失败' });
      }

      // 获取考试信息
      db.get('SELECT * FROM exams WHERE id = ?', [exam_id], (err, exam) => {
        if (err) {
          console.error('获取考试信息失败:', err);
          return res.status(500).json({ error: '获取考试信息失败' });
        }

        if (!exam) {
          return res.status(404).json({ error: '考试不存在' });
        }

        // 1. 班级预警
        db.all(`
          SELECT class_name, AVG(total_score) as avg_score, COUNT(*) as student_count
          FROM student_scores
          WHERE exam_id = ? AND is_deleted = 0
          GROUP BY class_name
        `, [exam_id], (err, classes) => {
          if (err) {
            console.error('获取班级数据失败:', err);
            return res.status(500).json({ error: '获取班级数据失败' });
          }

          // 计算年级平均分
          const gradeAvg = classes.reduce((sum, cls) => sum + cls.avg_score * cls.student_count, 0) / 
                          classes.reduce((sum, cls) => sum + cls.student_count, 0);

          // 检查班级预警
          classes.forEach(cls => {
            // 平均分低于年级平均分20%以上
            if (cls.avg_score < gradeAvg * 0.8) {
              db.run(`
                INSERT INTO warnings (type, level, title, content, target_id, target_name, exam_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `, [
                '班级',
                '严重',
                `${cls.class_name} 平均分异常`,
                `${cls.class_name} 平均分 ${cls.avg_score.toFixed(2)}，低于年级平均分 ${gradeAvg.toFixed(2)} 的 20% 以上`,
                cls.class_name,
                cls.class_name,
                exam_id
              ]);
            }
          });

          // 2. 学科预警
          db.all(`
            SELECT subject, AVG(score) as avg_score
            FROM (
              SELECT json_extract(subject_scores, '$.' || json_each.value) as score,
                     json_each.value as subject
              FROM student_scores,
                   json_each(json_object_keys(subject_scores))
              WHERE exam_id = ? AND is_deleted = 0
            )
            GROUP BY subject
          `, [exam_id], (err, subjects) => {
            if (err) {
              console.error('获取学科数据失败:', err);
              return res.status(500).json({ error: '获取学科数据失败' });
            }

            // 检查学科预警
            subjects.forEach(subject => {
              // 平均分低于60分
              if (subject.avg_score < 60) {
                db.run(`
                  INSERT INTO warnings (type, level, title, content, target_id, target_name, exam_id)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                  '学科',
                  '严重',
                  `${subject.subject} 平均分异常`,
                  `${subject.subject} 平均分 ${subject.avg_score.toFixed(2)}，低于 60 分`,
                  subject.subject,
                  subject.subject,
                  exam_id
                ]);
              }
            });

            // 3. 学生预警
            db.all(`
              SELECT student_number, student_name, class_name, total_score, grade_rank
              FROM student_scores
              WHERE exam_id = ? AND is_deleted = 0
            `, [exam_id], (err, students) => {
              if (err) {
                console.error('获取学生数据失败:', err);
                return res.status(500).json({ error: '获取学生数据失败' });
              }

              // 检查学生预警
              students.forEach(student => {
                // 总分低于300分
                if (student.total_score < 300) {
                  db.run(`
                    INSERT INTO warnings (type, level, title, content, target_id, target_name, exam_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                  `, [
                    '学生',
                    '严重',
                    `${student.student_name} 总分异常`,
                    `${student.student_name}（${student.class_name}）总分 ${student.total_score}，低于 300 分`,
                    student.student_number,
                    student.student_name,
                    exam_id
                  ]);
                }

                // 年级排名倒数10%
                const totalStudents = students.length;
                const bottom10Percent = Math.ceil(totalStudents * 0.1);
                if (student.grade_rank > totalStudents - bottom10Percent) {
                  db.run(`
                    INSERT INTO warnings (type, level, title, content, target_id, target_name, exam_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                  `, [
                    '学生',
                    '警告',
                    `${student.student_name} 排名异常`,
                    `${student.student_name}（${student.class_name}）年级排名 ${student.grade_rank}，位于倒数 10%`,
                    student.student_number,
                    student.student_name,
                    exam_id
                  ]);
                }
              });

              // 获取生成的预警列表
              db.all('SELECT * FROM warnings WHERE exam_id = ? ORDER BY level DESC, created_at DESC', [exam_id], (err, warnings) => {
                if (err) {
                  console.error('获取预警列表失败:', err);
                  return res.status(500).json({ error: '获取预警列表失败' });
                }

                res.json({
                  success: true,
                  message: `成功生成 ${warnings.length} 条预警`,
                  warnings: warnings
                });
              });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('生成预警失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 标记预警为已处理
router.put('/:id/resolve', (req, res) => {
  try {
    const { id } = req.params;

    db.run('UPDATE warnings SET is_resolved = 1 WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('标记预警失败:', err);
        return res.status(500).json({ error: '标记预警失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '预警不存在' });
      }

      res.json({ success: true, message: '预警已标记为已处理' });
    });
  } catch (error) {
    console.error('标记预警失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 导出预警清单
router.get('/export', (req, res) => {
  try {
    const { exam_id } = req.query;

    if (!exam_id) {
      return res.status(400).json({ error: '考试ID不能为空' });
    }

    db.all(`
      SELECT type, level, title, content, target_name, created_at
      FROM warnings
      WHERE exam_id = ?
      ORDER BY level DESC, created_at DESC
    `, [exam_id], (err, warnings) => {
      if (err) {
        console.error('获取预警数据失败:', err);
        return res.status(500).json({ error: '获取预警数据失败' });
      }

      // 生成CSV内容
      const headers = ['类型', '级别', '标题', '内容', '对象', '创建时间'];
      const rows = warnings.map(warning => [
        warning.type,
        warning.level,
        warning.title,
        warning.content,
        warning.target_name,
        new Date(warning.created_at).toISOString().slice(0, 19).replace('T', ' ')
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=预警清单_${exam_id}.csv`);
      res.send(csvContent);
    });
  } catch (error) {
    console.error('导出预警清单失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;