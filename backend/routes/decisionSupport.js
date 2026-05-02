const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取决策支持数据
router.get('/', (req, res) => {
  try {
    const { exam_id, grade, class_name } = req.query;

    if (!exam_id) {
      return res.status(400).json({ error: '考试ID不能为空' });
    }

    // 构建查询条件
    let whereClause = 'exam_id = ?';
    let params = [exam_id];

    if (grade) {
      whereClause += ' AND grade = ?';
      params.push(grade);
    }

    if (class_name) {
      whereClause += ' AND class_name = ?';
      params.push(class_name);
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

      // 获取学科数据
      db.all(`
        SELECT subject, AVG(score) as avg_score, MAX(score) as max_score, MIN(score) as min_score
        FROM (
          SELECT json_extract(subject_scores, '$.' || json_each.value) as score,
                 json_each.value as subject
          FROM student_scores,
               json_each(json_object_keys(subject_scores))
          WHERE ${whereClause}
        )
        GROUP BY subject
      `, params, (err, subjectData) => {
        if (err) {
          console.error('获取学科数据失败:', err);
          return res.status(500).json({ error: '获取学科数据失败' });
        }

        // 获取统计数据
        db.get(`
          SELECT AVG(total_score) as avg_score,
                 COUNT(*) as total_students,
                 SUM(CASE WHEN total_score >= 540 THEN 1 ELSE 0 END) as special_recruit_count,
                 SUM(CASE WHEN total_score >= 450 THEN 1 ELSE 0 END) as undergraduate_count,
                 SUM(CASE WHEN total_score >= 300 THEN 1 ELSE 0 END) as junior_college_count
          FROM student_scores
          WHERE ${whereClause}
        `, params, (err, statisticalData) => {
          if (err) {
            console.error('获取统计数据失败:', err);
            return res.status(500).json({ error: '获取统计数据失败' });
          }

          // 获取班级数据
          db.all(`
            SELECT class_name,
                   AVG(total_score) as avg_score,
                   SUM(CASE WHEN total_score >= 450 THEN 1 ELSE 0 END) as excellent_count,
                   SUM(CASE WHEN total_score >= 300 THEN 1 ELSE 0 END) as passed_count,
                   COUNT(*) as total_students
            FROM student_scores
            WHERE ${whereClause}
            GROUP BY class_name
            ORDER BY avg_score DESC
          `, params, (err, classData) => {
            if (err) {
              console.error('获取班级数据失败:', err);
              return res.status(500).json({ error: '获取班级数据失败' });
            }

            // 计算班级优秀率和及格率
            classData = classData.map(cls => ({
              ...cls,
              excellent_rate: ((cls.excellent_count / cls.total_students) * 100).toFixed(2),
              passed_rate: ((cls.passed_count / cls.total_students) * 100).toFixed(2)
            }));

            // 获取学生数据
            db.all(`
              SELECT student_number, student_name, class_name, total_score, grade_rank,
                     json_extract(subject_scores, '$.语文') as chinese,
                     json_extract(subject_scores, '$.数学') as math,
                     json_extract(subject_scores, '$.英语') as english,
                     json_extract(subject_scores, '$.物理') as physics,
                     json_extract(subject_scores, '$.化学') as chemistry,
                     json_extract(subject_scores, '$.生物') as biology,
                     json_extract(subject_scores, '$.政治') as politics,
                     json_extract(subject_scores, '$.历史') as history,
                     json_extract(subject_scores, '$.地理') as geography
              FROM student_scores
              WHERE ${whereClause}
              ORDER BY grade_rank
            `, params, (err, students) => {
              if (err) {
                console.error('获取学生数据失败:', err);
                return res.status(500).json({ error: '获取学生数据失败' });
              }

              // 获取知识点分析数据
              db.all(`
                SELECT knowledge_point, subject, AVG(avg_score) as avg_score, AVG(loss_rate) as loss_rate
                FROM knowledge_analysis
                WHERE exam_id = ?
                ${grade ? ' AND grade = ?' : ''}
                ${class_name ? ' AND class_name = ?' : ''}
                GROUP BY knowledge_point, subject
                ORDER BY loss_rate DESC
              `, params, (err, knowledgeData) => {
                if (err) {
                  console.error('获取知识点分析数据失败:', err);
                  return res.status(500).json({ error: '获取知识点分析数据失败' });
                }

                // 获取预警数据
                db.all(`
                  SELECT type, level, title, content, target_name
                  FROM warnings
                  WHERE exam_id = ?
                  ${grade ? ' AND target_id LIKE ?' : ''}
                  ORDER BY level DESC, created_at DESC
                `, grade ? [...params, `${grade}%`] : params, (err, warnings) => {
                  if (err) {
                    console.error('获取预警数据失败:', err);
                    return res.status(500).json({ error: '获取预警数据失败' });
                  }

                  // 构建决策支持数据
                  const decisionData = {
                    exam_info: exam,
                    statistical_data: statisticalData,
                    subject_data: subjectData,
                    class_data: classData,
                    student_data: students,
                    knowledge_data: knowledgeData,
                    warnings: warnings
                  };

                  res.json(decisionData);
                });
              });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('获取决策支持数据失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取薄弱学科
router.get('/weak-subjects', (req, res) => {
  try {
    const { exam_id, grade } = req.query;

    if (!exam_id) {
      return res.status(400).json({ error: '考试ID不能为空' });
    }

    db.all(`
      SELECT subject, AVG(score) as avg_score
      FROM (
        SELECT json_extract(subject_scores, '$.' || json_each.value) as score,
               json_each.value as subject
        FROM student_scores,
             json_each(json_object_keys(subject_scores))
        WHERE exam_id = ? ${grade ? 'AND grade = ?' : ''}
      )
      GROUP BY subject
      ORDER BY avg_score ASC
      LIMIT 3
    `, grade ? [exam_id, grade] : [exam_id], (err, weakSubjects) => {
      if (err) {
        console.error('获取薄弱学科失败:', err);
        return res.status(500).json({ error: '获取薄弱学科失败' });
      }

      res.json(weakSubjects);
    });
  } catch (error) {
    console.error('获取薄弱学科失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取薄弱知识点
router.get('/weak-knowledge', (req, res) => {
  try {
    const { exam_id, grade, subject } = req.query;

    if (!exam_id) {
      return res.status(400).json({ error: '考试ID不能为空' });
    }

    let query = `
      SELECT knowledge_point, subject, AVG(loss_rate) as loss_rate
      FROM knowledge_analysis
      WHERE exam_id = ?
    `;
    let params = [exam_id];

    if (grade) {
      query += ' AND grade = ?';
      params.push(grade);
    }

    if (subject) {
      query += ' AND subject = ?';
      params.push(subject);
    }

    query += ' GROUP BY knowledge_point, subject ORDER BY loss_rate DESC LIMIT 5';

    db.all(query, params, (err, weakKnowledge) => {
      if (err) {
        console.error('获取薄弱知识点失败:', err);
        return res.status(500).json({ error: '获取薄弱知识点失败' });
      }

      res.json(weakKnowledge);
    });
  } catch (error) {
    console.error('获取薄弱知识点失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取重点关注学生
router.get('/focus-students', (req, res) => {
  try {
    const { exam_id, grade, class_name } = req.query;

    if (!exam_id) {
      return res.status(400).json({ error: '考试ID不能为空' });
    }

    let query = `
      SELECT student_number, student_name, class_name, total_score, grade_rank,
             json_extract(subject_scores, '$.语文') as chinese,
             json_extract(subject_scores, '$.数学') as math,
             json_extract(subject_scores, '$.英语') as english
      FROM student_scores
      WHERE exam_id = ?
    `;
    let params = [exam_id];

    if (grade) {
      query += ' AND grade = ?';
      params.push(grade);
    }

    if (class_name) {
      query += ' AND class_name = ?';
      params.push(class_name);
    }

    // 筛选临界生和学困生
    query += ' AND (total_score BETWEEN 300 AND 450 OR total_score < 300) ORDER BY total_score ASC';

    db.all(query, params, (err, focusStudents) => {
      if (err) {
        console.error('获取重点关注学生失败:', err);
        return res.status(500).json({ error: '获取重点关注学生失败' });
      }

      res.json(focusStudents);
    });
  } catch (error) {
    console.error('获取重点关注学生失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;