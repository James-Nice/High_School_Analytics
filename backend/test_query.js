const db = require('./db');

// 查询一条记录，包含所有字段
db.get('SELECT * FROM student_scores WHERE is_deleted = 0 LIMIT 1', (err, row) => {
  if (err) {
    console.error('查询失败:', err);
  } else {
    console.log('完整数据库记录:');
    console.log(row);
    console.log('\nsubject_scores字段:', row?.subject_scores);
  }
  process.exit(0);
});
