const db = require('./db');

// 模拟请求对象
const req = {
  query: {
    exam_id: '1',
    page: 1,
    pageSize: 2
  }
};

// 模拟响应对象
const res = {
  json: (data) => {
    console.log('API返回结果:');
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  },
  status: (code) => {
    console.log('状态码:', code);
    return res;
  }
};

// 复制scores.js中的get路由逻辑
const { exam_id, class_name, student_number, page = 1, pageSize = 20 } = req.query;
const offset = (parseInt(page) - 1) * parseInt(pageSize);
let query = 'SELECT id, class_name, student_number, student_name, subject_scores, total_score, class_rank, grade_rank FROM student_scores WHERE is_deleted = 0';
const params = [];

if (exam_id) {
  query += ' AND exam_id = ?';
  params.push(exam_id);
}
if (class_name) {
  query += ' AND class_name = ?';
  params.push(class_name);
}
if (student_number) {
  query += ' AND student_number = ?';
  params.push(student_number);
}

query += ' ORDER BY total_score DESC LIMIT ? OFFSET ?';
params.push(parseInt(pageSize), offset);

console.log('查询语句:', query);
console.log('查询参数:', params);

db.all(query, params, (err, rows) => {
  if (err) {
    console.error('查询错误:', err);
    return;
  }

  console.log('\n原始查询结果:', rows);

  const processedRows = rows.map(row => {
    const processedRow = { ...row };
    try {
      console.log('\n处理行:', row.id, 'subject_scores:', row.subject_scores);
      if (row.subject_scores) {
        const subjectScores = JSON.parse(row.subject_scores);
        console.log('解析后的subject_scores:', subjectScores);
        Object.assign(processedRow, subjectScores);
      }
    } catch (e) {
      console.error('解析subject_scores失败:', e);
    }
    return processedRow;
  });

  console.log('\n处理后的行:', processedRows);

  let countQuery = 'SELECT COUNT(*) as total FROM student_scores WHERE is_deleted = 0';
  const countParams = [];
  if (exam_id) {
    countQuery += ' AND exam_id = ?';
    countParams.push(exam_id);
  }

  db.get(countQuery, countParams, (err, countRow) => {
    if (err) {
      console.error('计数查询错误:', err);
      return;
    }

    res.json({
      data: processedRows,
      pagination: {
        total: countRow.total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(countRow.total / parseInt(pageSize))
      }
    });
  });
});
