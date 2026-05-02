const db = require('./db');

// 查询一条记录查看subject_scores
db.get('SELECT * FROM student_scores WHERE is_deleted = 0 LIMIT 1', (err, row) => {
  if (err) {
    console.error('查询失败:', err);
  } else {
    console.log('数据库记录:', row);
    console.log('subject_scores:', row?.subject_scores);
    if (row?.subject_scores) {
      try {
        const parsed = JSON.parse(row.subject_scores);
        console.log('解析后的subject_scores:', parsed);
      } catch (e) {
        console.error('解析失败:', e);
      }
    }
  }
  process.exit(0);
});
