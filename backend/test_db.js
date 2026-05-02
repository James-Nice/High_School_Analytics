const db = require('./db');

// 直接查询数据库，看看是否能获取到subject_scores字段
const query = 'SELECT id, class_name, student_number, student_name, subject_scores, total_score FROM student_scores WHERE is_deleted = 0 LIMIT 2';

db.all(query, (err, rows) => {
  if (err) {
    console.error('查询错误:', err);
  } else {
    console.log('数据库查询结果:');
    console.log(JSON.stringify(rows, null, 2));
  }
  process.exit(0);
});
