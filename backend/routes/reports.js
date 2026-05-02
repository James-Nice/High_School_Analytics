const express = require('express');
const router = express.Router();
const db = require('../db');
const exceljs = require('exceljs');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs').promises;

// 导出Excel报表
router.post('/export/excel', async (req, res) => {
  try {
    const { report_type, exam_id, data } = req.body;

    if (!report_type || !exam_id) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 创建Excel工作簿
    const workbook = new exceljs.Workbook();
    workbook.creator = '高中教学质量数据运营分析平台';
    workbook.lastModifiedBy = '系统';
    workbook.created = new Date();
    workbook.modified = new Date();

    // 根据报告类型生成不同的工作表
    switch (report_type) {
      case 'grade_summary':
        await generateGradeSummaryExcel(workbook, data);
        break;
      case 'class_detail':
        await generateClassDetailExcel(workbook, data);
        break;
      case 'subject_analysis':
        await generateSubjectAnalysisExcel(workbook, data);
        break;
      case 'class_comparison':
        await generateClassComparisonExcel(workbook, data);
        break;
      case 'warning_list':
        await generateWarningListExcel(workbook, data);
        break;
      default:
        return res.status(400).json({ error: '不支持的报告类型' });
    }

    // 生成临时文件
    const tempPath = path.join(__dirname, '../uploads', `report_${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(tempPath);

    // 发送文件
    res.download(tempPath, async (err) => {
      if (err) {
        console.error('Excel下载失败:', err);
        res.status(500).json({ error: 'Excel下载失败' });
      }
      // 删除临时文件
      try {
        await fs.unlink(tempPath);
      } catch (e) {
        console.error('删除临时文件失败:', e);
      }
    });
  } catch (error) {
    console.error('Excel导出失败:', error);
    res.status(500).json({ error: 'Excel导出失败' });
  }
});

// 导出PDF报表
router.post('/export/pdf', async (req, res) => {
  try {
    const { report_type, exam_id, data } = req.body;

    if (!report_type || !exam_id) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 创建PDF文档
    const doc = new PDFDocument({ margin: 50 });

    // 生成临时文件
    const tempPath = path.join(__dirname, '../uploads', `report_${Date.now()}.pdf`);
    const stream = fs.createWriteStream(tempPath);
    doc.pipe(stream);

    // 根据报告类型生成不同的PDF内容
    switch (report_type) {
      case 'grade_summary':
        generateGradeSummaryPDF(doc, data);
        break;
      case 'class_detail':
        generateClassDetailPDF(doc, data);
        break;
      case 'subject_analysis':
        generateSubjectAnalysisPDF(doc, data);
        break;
      case 'class_comparison':
        generateClassComparisonPDF(doc, data);
        break;
      case 'warning_list':
        generateWarningListPDF(doc, data);
        break;
      default:
        return res.status(400).json({ error: '不支持的报告类型' });
    }

    // 结束PDF生成
    doc.end();

    // 等待PDF生成完成
    stream.on('finish', async () => {
      // 发送文件
      res.download(tempPath, async (err) => {
        if (err) {
          console.error('PDF下载失败:', err);
          res.status(500).json({ error: 'PDF下载失败' });
        }
        // 删除临时文件
        try {
          await fs.unlink(tempPath);
        } catch (e) {
          console.error('删除临时文件失败:', e);
        }
      });
    });
  } catch (error) {
    console.error('PDF导出失败:', error);
    res.status(500).json({ error: 'PDF导出失败' });
  }
});

// 生成年级成绩总表Excel
async function generateGradeSummaryExcel(workbook, data) {
  const worksheet = workbook.addWorksheet('年级成绩总表');

  // 设置表头
  worksheet.columns = [
    { header: '班级', key: 'class_name', width: 15 },
    { header: '学生人数', key: 'student_count', width: 10 },
    { header: '平均分', key: 'avg_score', width: 10 },
    { header: '最高分', key: 'max_score', width: 10 },
    { header: '最低分', key: 'min_score', width: 10 },
    { header: '优秀率', key: 'excellent_rate', width: 10 },
    { header: '及格率', key: 'passed_rate', width: 10 },
    { header: '低分率', key: 'low_rate', width: 10 }
  ];

  // 添加考试信息
  worksheet.addRow([]);
  worksheet.addRow(['考试名称', data.examInfo.name]);
  worksheet.addRow(['考试日期', new Date(data.examInfo.exam_date).toLocaleDateString()]);
  worksheet.addRow(['年级', data.examInfo.grade]);
  worksheet.addRow(['生成时间', data.generatedAt]);
  worksheet.addRow([]);

  // 添加统计数据
  worksheet.addRow(['统计数据']);
  worksheet.addRow(['平均分', data.statistical.avg_score]);
  worksheet.addRow(['优秀率', `${data.statistical.excellent_rate}%`]);
  worksheet.addRow(['及格率', `${data.statistical.passed_rate}%`]);
  worksheet.addRow(['低分率', `${data.statistical.low_rate}%`]);
  worksheet.addRow([]);

  // 添加班级数据
  worksheet.addRow(['班级数据']);
  data.classData.forEach(cls => {
    worksheet.addRow({
      class_name: cls.class_name,
      student_count: cls.student_count,
      avg_score: cls.avg_score,
      max_score: cls.max_score,
      min_score: cls.min_score,
      excellent_rate: `${cls.excellent_rate}%`,
      passed_rate: `${cls.passed_rate}%`,
      low_rate: `${cls.low_rate || 0}%`
    });
  });
}

// 生成班级成绩明细表Excel
async function generateClassDetailExcel(workbook, data) {
  const worksheet = workbook.addWorksheet('班级成绩明细表');

  // 设置表头
  worksheet.columns = [
    { header: '班级', key: 'class_name', width: 15 },
    { header: '学号', key: 'student_number', width: 15 },
    { header: '姓名', key: 'student_name', width: 10 },
    { header: '总分', key: 'total_score', width: 10 },
    { header: '班内排名', key: 'class_rank', width: 10 },
    { header: '年级排名', key: 'grade_rank', width: 10 }
  ];

  // 添加考试信息
  worksheet.addRow([]);
  worksheet.addRow(['考试名称', data.examInfo.name]);
  worksheet.addRow(['考试日期', new Date(data.examInfo.exam_date).toLocaleDateString()]);
  worksheet.addRow(['年级', data.examInfo.grade]);
  worksheet.addRow(['生成时间', data.generatedAt]);
  worksheet.addRow([]);

  // 添加学生数据
  data.studentList.forEach(student => {
    worksheet.addRow({
      class_name: student.class_name,
      student_number: student.student_number,
      student_name: student.student_name,
      total_score: student.total_score,
      class_rank: student.class_rank,
      grade_rank: student.grade_rank
    });
  });
}

// 生成学科质量分析表Excel
async function generateSubjectAnalysisExcel(workbook, data) {
  const worksheet = workbook.addWorksheet('学科质量分析表');

  // 设置表头
  worksheet.columns = [
    { header: '学科', key: 'subject', width: 15 },
    { header: '平均分', key: 'avg_score', width: 10 },
    { header: '参考人数', key: 'student_count', width: 10 }
  ];

  // 添加考试信息
  worksheet.addRow([]);
  worksheet.addRow(['考试名称', data.examInfo.name]);
  worksheet.addRow(['考试日期', new Date(data.examInfo.exam_date).toLocaleDateString()]);
  worksheet.addRow(['年级', data.examInfo.grade]);
  worksheet.addRow(['生成时间', data.generatedAt]);
  worksheet.addRow([]);

  // 添加学科数据
  Object.keys(data.subjectAnalysis).forEach(subject => {
    const analysis = data.subjectAnalysis[subject];
    worksheet.addRow({
      subject: subject,
      avg_score: analysis.avg_score,
      student_count: analysis.student_count
    });
  });
}

// 生成班级对比表Excel
async function generateClassComparisonExcel(workbook, data) {
  const worksheet = workbook.addWorksheet('班级对比表');

  // 设置表头
  worksheet.columns = [
    { header: '班级', key: 'class_name', width: 15 },
    { header: '学生人数', key: 'student_count', width: 10 },
    { header: '平均分', key: 'avg_score', width: 10 },
    { header: '最高分', key: 'max_score', width: 10 },
    { header: '最低分', key: 'min_score', width: 10 },
    { header: '优秀率', key: 'excellent_rate', width: 10 },
    { header: '及格率', key: 'passed_rate', width: 10 }
  ];

  // 添加考试信息
  worksheet.addRow([]);
  worksheet.addRow(['考试名称', data.examInfo.name]);
  worksheet.addRow(['考试日期', new Date(data.examInfo.exam_date).toLocaleDateString()]);
  worksheet.addRow(['年级', data.examInfo.grade]);
  worksheet.addRow(['生成时间', data.generatedAt]);
  worksheet.addRow([]);

  // 添加班级数据
  data.classComparison.forEach(cls => {
    worksheet.addRow({
      class_name: cls.class_name,
      student_count: cls.student_count,
      avg_score: cls.avg_score,
      max_score: cls.max_score,
      min_score: cls.min_score,
      excellent_rate: `${cls.excellent_rate}%`,
      passed_rate: `${cls.passed_rate}%`
    });
  });
}

// 生成预警学生清单Excel
async function generateWarningListExcel(workbook, data) {
  const worksheet = workbook.addWorksheet('预警学生清单');

  // 设置表头
  worksheet.columns = [
    { header: '预警类型', key: 'type', width: 15 },
    { header: '预警级别', key: 'level', width: 10 },
    { header: '预警标题', key: 'title', width: 30 },
    { header: '预警内容', key: 'content', width: 50 },
    { header: '时间', key: 'created_at', width: 20 }
  ];

  // 添加考试信息
  worksheet.addRow([]);
  worksheet.addRow(['考试名称', data.examInfo.name]);
  worksheet.addRow(['考试日期', new Date(data.examInfo.exam_date).toLocaleDateString()]);
  worksheet.addRow(['年级', data.examInfo.grade]);
  worksheet.addRow(['生成时间', data.generatedAt]);
  worksheet.addRow([]);

  // 添加预警数据
  data.warnings.forEach(warning => {
    worksheet.addRow({
      type: warning.type,
      level: warning.level === 'high' ? '高级' : warning.level === 'medium' ? '中级' : '低级',
      title: warning.title,
      content: warning.content,
      created_at: new Date(warning.created_at).toLocaleString()
    });
  });
}

// 生成年级成绩总表PDF
function generateGradeSummaryPDF(doc, data) {
  // 设置标题
  doc.fontSize(20).text('年级成绩总表', { align: 'center' });
  doc.moveDown(1);

  // 添加考试信息
  doc.fontSize(12);
  doc.text(`考试名称: ${data.examInfo.name}`);
  doc.text(`考试日期: ${new Date(data.examInfo.exam_date).toLocaleDateString()}`);
  doc.text(`年级: ${data.examInfo.grade}`);
  doc.text(`生成时间: ${data.generatedAt}`);
  doc.moveDown(1);

  // 添加统计数据
  doc.fontSize(14).text('统计数据');
  doc.fontSize(12);
  doc.text(`平均分: ${data.statistical.avg_score}`);
  doc.text(`优秀率: ${data.statistical.excellent_rate}%`);
  doc.text(`及格率: ${data.statistical.passed_rate}%`);
  doc.text(`低分率: ${data.statistical.low_rate}%`);
  doc.moveDown(1);

  // 添加班级数据
  doc.fontSize(14).text('班级数据');
  doc.fontSize(10);
  doc.moveDown(0.5);

  // 绘制表格
  const startX = 50;
  const startY = doc.y;
  const width = 500;
  const height = 20;

  // 表头
  doc.rect(startX, startY, width, height).stroke();
  doc.text('班级', startX + 10, startY + 5);
  doc.text('学生人数', startX + 100, startY + 5);
  doc.text('平均分', startX + 180, startY + 5);
  doc.text('优秀率', startX + 260, startY + 5);
  doc.text('及格率', startX + 340, startY + 5);
  doc.text('低分率', startX + 420, startY + 5);

  // 数据行
  let y = startY + height;
  data.classData.forEach((cls, index) => {
    doc.rect(startX, y, width, height).stroke();
    doc.text(cls.class_name, startX + 10, y + 5);
    doc.text(cls.student_count.toString(), startX + 100, y + 5);
    doc.text(cls.avg_score.toFixed(2), startX + 180, y + 5);
    doc.text(`${cls.excellent_rate}%`, startX + 260, y + 5);
    doc.text(`${cls.passed_rate}%`, startX + 340, y + 5);
    doc.text(`${cls.low_rate || 0}%`, startX + 420, y + 5);
    y += height;
  });
}

// 生成班级成绩明细表PDF
function generateClassDetailPDF(doc, data) {
  // 设置标题
  doc.fontSize(20).text('班级成绩明细表', { align: 'center' });
  doc.moveDown(1);

  // 添加考试信息
  doc.fontSize(12);
  doc.text(`考试名称: ${data.examInfo.name}`);
  doc.text(`考试日期: ${new Date(data.examInfo.exam_date).toLocaleDateString()}`);
  doc.text(`年级: ${data.examInfo.grade}`);
  doc.text(`生成时间: ${data.generatedAt}`);
  doc.moveDown(1);

  // 添加学生数据
  doc.fontSize(14).text('学生成绩');
  doc.fontSize(10);
  doc.moveDown(0.5);

  // 绘制表格
  const startX = 50;
  const startY = doc.y;
  const width = 500;
  const height = 20;

  // 表头
  doc.rect(startX, startY, width, height).stroke();
  doc.text('班级', startX + 10, startY + 5);
  doc.text('学号', startX + 100, startY + 5);
  doc.text('姓名', startX + 180, startY + 5);
  doc.text('总分', startX + 260, startY + 5);
  doc.text('班内排名', startX + 340, startY + 5);
  doc.text('年级排名', startX + 420, startY + 5);

  // 数据行
  let y = startY + height;
  data.studentList.forEach((student, index) => {
    doc.rect(startX, y, width, height).stroke();
    doc.text(student.class_name, startX + 10, y + 5);
    doc.text(student.student_number, startX + 100, y + 5);
    doc.text(student.student_name, startX + 180, y + 5);
    doc.text(student.total_score.toString(), startX + 260, y + 5);
    doc.text(student.class_rank.toString(), startX + 340, y + 5);
    doc.text(student.grade_rank.toString(), startX + 420, y + 5);
    y += height;
  });
}

// 生成学科质量分析表PDF
function generateSubjectAnalysisPDF(doc, data) {
  // 设置标题
  doc.fontSize(20).text('学科质量分析表', { align: 'center' });
  doc.moveDown(1);

  // 添加考试信息
  doc.fontSize(12);
  doc.text(`考试名称: ${data.examInfo.name}`);
  doc.text(`考试日期: ${new Date(data.examInfo.exam_date).toLocaleDateString()}`);
  doc.text(`年级: ${data.examInfo.grade}`);
  doc.text(`生成时间: ${data.generatedAt}`);
  doc.moveDown(1);

  // 添加学科数据
  doc.fontSize(14).text('学科分析');
  doc.fontSize(10);
  doc.moveDown(0.5);

  // 绘制表格
  const startX = 50;
  const startY = doc.y;
  const width = 500;
  const height = 20;

  // 表头
  doc.rect(startX, startY, width, height).stroke();
  doc.text('学科', startX + 10, startY + 5);
  doc.text('平均分', startX + 180, startY + 5);
  doc.text('参考人数', startX + 260, startY + 5);

  // 数据行
  let y = startY + height;
  Object.keys(data.subjectAnalysis).forEach(subject => {
    const analysis = data.subjectAnalysis[subject];
    doc.rect(startX, y, width, height).stroke();
    doc.text(subject, startX + 10, y + 5);
    doc.text(analysis.avg_score.toString(), startX + 180, y + 5);
    doc.text(analysis.student_count.toString(), startX + 260, y + 5);
    y += height;
  });
}

// 生成班级对比表PDF
function generateClassComparisonPDF(doc, data) {
  // 设置标题
  doc.fontSize(20).text('班级对比表', { align: 'center' });
  doc.moveDown(1);

  // 添加考试信息
  doc.fontSize(12);
  doc.text(`考试名称: ${data.examInfo.name}`);
  doc.text(`考试日期: ${new Date(data.examInfo.exam_date).toLocaleDateString()}`);
  doc.text(`年级: ${data.examInfo.grade}`);
  doc.text(`生成时间: ${data.generatedAt}`);
  doc.moveDown(1);

  // 添加班级数据
  doc.fontSize(14).text('班级对比');
  doc.fontSize(10);
  doc.moveDown(0.5);

  // 绘制表格
  const startX = 50;
  const startY = doc.y;
  const width = 500;
  const height = 20;

  // 表头
  doc.rect(startX, startY, width, height).stroke();
  doc.text('班级', startX + 10, startY + 5);
  doc.text('学生人数', startX + 100, startY + 5);
  doc.text('平均分', startX + 180, startY + 5);
  doc.text('优秀率', startX + 260, startY + 5);
  doc.text('及格率', startX + 340, startY + 5);

  // 数据行
  let y = startY + height;
  data.classComparison.forEach((cls, index) => {
    doc.rect(startX, y, width, height).stroke();
    doc.text(cls.class_name, startX + 10, y + 5);
    doc.text(cls.student_count.toString(), startX + 100, y + 5);
    doc.text(cls.avg_score.toFixed(2), startX + 180, y + 5);
    doc.text(`${cls.excellent_rate}%`, startX + 260, y + 5);
    doc.text(`${cls.passed_rate}%`, startX + 340, y + 5);
    y += height;
  });
}

// 生成预警学生清单PDF
function generateWarningListPDF(doc, data) {
  // 设置标题
  doc.fontSize(20).text('预警学生清单', { align: 'center' });
  doc.moveDown(1);

  // 添加考试信息
  doc.fontSize(12);
  doc.text(`考试名称: ${data.examInfo.name}`);
  doc.text(`考试日期: ${new Date(data.examInfo.exam_date).toLocaleDateString()}`);
  doc.text(`年级: ${data.examInfo.grade}`);
  doc.text(`生成时间: ${data.generatedAt}`);
  doc.moveDown(1);

  // 添加预警数据
  doc.fontSize(14).text('预警信息');
  doc.fontSize(10);
  doc.moveDown(0.5);

  // 绘制表格
  const startX = 50;
  const startY = doc.y;
  const width = 500;
  const height = 20;

  // 表头
  doc.rect(startX, startY, width, height).stroke();
  doc.text('预警类型', startX + 10, startY + 5);
  doc.text('预警级别', startX + 100, startY + 5);
  doc.text('预警标题', startX + 180, startY + 5);

  // 数据行
  let y = startY + height;
  data.warnings.forEach((warning, index) => {
    doc.rect(startX, y, width, height).stroke();
    doc.text(warning.type, startX + 10, y + 5);
    doc.text(warning.level === 'high' ? '高级' : warning.level === 'medium' ? '中级' : '低级', startX + 100, y + 5);
    doc.text(warning.title, startX + 180, y + 5);
    y += height;
  });
}

module.exports = router;