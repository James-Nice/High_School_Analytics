const express = require('express');
const db = require('./db');

const app = express();
const PORT = 5001;

app.get('/api/test', (req, res) => {
  const query = 'SELECT id, class_name, student_number, student_name, subject_scores, total_score FROM student_scores WHERE is_deleted = 0 LIMIT 2';
  
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // 解析subject_scores并展开为独立属性
    const processedRows = rows.map(row => {
      const processedRow = { ...row };
      try {
        if (row.subject_scores) {
          const subjectScores = JSON.parse(row.subject_scores);
          Object.assign(processedRow, subjectScores);
        }
      } catch (e) {
        console.error('解析subject_scores失败:', e);
      }
      return processedRow;
    });
    
    console.log('处理后的第一行:', processedRows[0]);
    
    res.json({
      data: processedRows,
      pagination: {
        total: 220,
        page: 1,
        pageSize: 2,
        totalPages: 110
      }
    });
  });
});

app.listen(PORT, () => {
  console.log(`测试服务器运行在 http://localhost:${PORT}`);
});
