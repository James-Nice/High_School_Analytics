const express = require('express');
const router = express.Router();
const db = require('../db');
const exceljs = require('exceljs');
const path = require('path');
const fs = require('fs').promises;
const { IncomingForm } = require('formidable');

// 配置文件上传
const uploadDir = path.join(__dirname, '../uploads');

// 确保上传目录存在
const ensureUploadDir = async () => {
  try {
    await fs.access(uploadDir);
  } catch (error) {
    await fs.mkdir(uploadDir, { recursive: true });
  }
};

// 获取上传文件列表
router.get('/uploads', async (req, res) => {
    try {
        const uploadsDir = path.join(__dirname, '../uploads');
        // 使用UTF-8编码读取文件列表
        const files = await fs.readdir(uploadsDir, { encoding: 'utf8' });
        
        const fileList = [];
        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            const stats = await fs.stat(filePath);
            fileList.push({
                name: file,
                size: stats.size,
                mtime: stats.mtime,
                isFile: stats.isFile()
            });
        }
        
        res.json(fileList);
    } catch (error) {
        console.error('获取上传文件列表失败:', error);
        res.status(500).json({ error: '获取上传文件列表失败' });
    }
});

// 删除上传文件
router.delete('/uploads/:filename', async (req, res) => {
    try {
        // 解码文件名，处理中文编码问题
        const filename = decodeURIComponent(req.params.filename);
        const filePath = path.join(__dirname, '../uploads', filename);
        
        // 先删除文件
        await fs.unlink(filePath);
        
        // 从文件名中提取原始文件名（去掉时间戳部分）
        let originalFilename = filename;
        const timestampRegex = /_\d+\.[^.]+$/;
        if (timestampRegex.test(filename)) {
            // 提取文件名部分（去掉时间戳和扩展名）
            const nameWithoutExt = filename.split('.')[0];
            // 找到最后一个下划线的位置
            const lastUnderscoreIndex = nameWithoutExt.lastIndexOf('_');
            if (lastUnderscoreIndex > 0) {
                // 提取原始文件名（去掉时间戳）
                originalFilename = nameWithoutExt.substring(0, lastUnderscoreIndex) + '.' + filename.split('.').pop();
            }
        }
        
        console.log('删除文件:', filename);
        console.log('提取的原始文件名:', originalFilename);
        
        // 然后硬删除对应文件的成绩数据
        db.run('DELETE FROM student_scores WHERE file_name = ?', [originalFilename], function(err) {
            if (err) {
                console.error('删除对应成绩数据失败:', err);
                res.status(500).json({ error: '删除对应成绩数据失败' });
                return;
            }
            console.log('删除了', this.changes, '条成绩数据');
            res.json({ message: '文件删除成功', affectedRows: this.changes, originalFilename: originalFilename });
        });
    } catch (error) {
        console.error('删除文件失败:', error);
        res.status(500).json({ error: '删除文件失败' });
    }
});

// 下载成绩导入模板
router.get('/template', async (req, res) => {
    try {
        const { type = 'full' } = req.query;
        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('成绩导入模板');

        // 添加说明内容（1-6行）
        worksheet.addRow(['说明：']);
        if (type === 'middle') {
            // 中考模板的说明
            worksheet.addRow(['1. 班级命名规则：C2601（C代表高中，26代表26级，01代表第一个班级）']);
            worksheet.addRow(['2. 学号命名规则：2601XX（26代表26级，01代表第一个班级，XX为两位数字）']);
            worksheet.addRow(['3. 姓名请使用真实姓名，无特殊符号、无空格']);
            worksheet.addRow(['4. 各科目分数请在对应列填写，总分由系统自动计算']);
            worksheet.addRow(['5. 各学科分值范围：语文/数学/英语（0-120），物理（0-80），化学（0-70），政治/历史（0-75）']);
        } else {
            // 其他模板的说明
            worksheet.addRow(['1. 班级命名规则：G2601（G代表高中，26代表26级，01代表第一个班级）']);
            worksheet.addRow(['2. 学号命名规则：2601XX（26代表26级，01代表第一个班级，XX为两位数字）']);
            worksheet.addRow(['3. 姓名请使用真实姓名，无特殊符号、无空格']);
            worksheet.addRow(['4. 各科目分数请在对应列填写，总分由系统自动计算']);
            worksheet.addRow(['5. 各学科分值范围：语文/数学/英语（0-150），其他科目（0-100）']);
        }
        worksheet.addRow(['']);

        // 根据模板类型设置不同的表头
        let headerValues = ['班级', '学号', '姓名'];
        let columnWidths = [{ width: 15 }, { width: 15 }, { width: 10 }];
        
        switch (type) {
            case 'full':
                // 高一全科成绩导入模板
                headerValues = headerValues.concat(['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '系统自动计算，请勿填写']);
                columnWidths = columnWidths.concat([{ width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 10 }]);
                break;
            case 'science':
                // 高中理综成绩导入模板
                headerValues = headerValues.concat(['语文', '数学', '英语', '物理', '化学', '生物', '系统自动计算，请勿填写']);
                columnWidths = columnWidths.concat([{ width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 10 }]);
                break;
            case 'arts':
                // 高中文综成绩导入模板
                headerValues = headerValues.concat(['语文', '数学', '英语', '政治', '历史', '地理', '系统自动计算，请勿填写']);
                columnWidths = columnWidths.concat([{ width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 10 }]);
                break;
            case 'middle':
                // 中考成绩导入模板
                headerValues = headerValues.concat(['语文', '数学', '英语', '物理', '化学', '政治', '历史', '系统自动计算，请勿填写']);
                columnWidths = columnWidths.concat([{ width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 10 }]);
                break;
            default:
                // 默认模板（高一全科）
                headerValues = headerValues.concat(['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '系统自动计算，请勿填写']);
                columnWidths = columnWidths.concat([{ width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 10 }]);
        }

        // 设置表头（第7行）
        const headerRow = worksheet.getRow(7);
        headerRow.values = headerValues;
        
        // 设置列宽
        worksheet.columns = columnWidths;

        // 生成文件
        const templatePath = path.join(__dirname, '../uploads/template.xlsx');
        await workbook.xlsx.writeFile(templatePath);

        // 根据模板类型设置不同的文件名
        let fileName = '成绩导入模板.xlsx';
        switch (type) {
            case 'full':
                fileName = '高一全科成绩导入模板.xlsx';
                break;
            case 'science':
                fileName = '高中理综成绩导入模板.xlsx';
                break;
            case 'arts':
                fileName = '高中文综成绩导入模板.xlsx';
                break;
            case 'middle':
                fileName = '中考成绩导入模板.xlsx';
                break;
        }

        res.download(templatePath, fileName, async (err) => {
            if (err) {
                console.error('文件下载失败:', err);
                res.status(500).json({ error: '模板下载失败' });
            }
            // 删除临时文件
            try {
                await fs.unlink(templatePath);
            } catch (e) {
                console.error('删除临时文件失败:', e);
            }
        });
    } catch (error) {
        console.error('模板生成失败:', error);
        res.status(500).json({ error: '模板生成失败' });
    }
});

// 批量导入成绩
router.post('/import', async (req, res) => {
    try {
        // 确保上传目录存在
        await ensureUploadDir();

        // 使用formidable处理文件上传
        const form = new IncomingForm({
            uploadDir: uploadDir,
            keepExtensions: true,
            multiples: false,
            maxFileSize: 10 * 1024 * 1024, // 10MB
            filename: (name, ext, part) => {
                // 保留原始文件名，添加时间戳以避免文件覆盖
                const timestamp = Date.now();
                const originalName = part.originalFilename || 'unknown';
                const extName = path.extname(originalName);
                const baseName = path.basename(originalName, extName);
                return `${baseName}_${timestamp}${extName}`;
            }
        });

        // 解析表单数据
        const [fields, files] = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve([fields, files]);
            });
        });

        const { exam_id, template_type } = fields;
        const type = template_type && template_type[0] ? template_type[0] : 'full';
        const file = files.file ? (Array.isArray(files.file) ? files.file[0] : files.file) : null;

        if (!exam_id || !exam_id[0]) {
            return res.status(400).json({ error: '缺少考试ID' });
        }

        if (!file) {
            return res.status(400).json({ error: '缺少上传文件' });
        }

        // 读取Excel文件
        const workbook = new exceljs.Workbook();
        await workbook.xlsx.readFile(file.filepath);
        const worksheet = workbook.getWorksheet(1);

        // 获取考试信息
        const exam = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM exams WHERE id = ?', [exam_id[0]], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!exam) {
            return res.status(404).json({ error: '考试不存在' });
        }

        let subjects = [];
        let fullScores = {};
        
        try {
            // 处理可能的双重JSON编码问题
            let parsedSubjects = exam.subjects;
            let parseAttemptsSubjects = 0;
            while (typeof parsedSubjects === 'string' && parseAttemptsSubjects < 3) {
                try {
                    parsedSubjects = JSON.parse(parsedSubjects);
                    parseAttemptsSubjects++;
                } catch (e) {
                    break;
                }
            }
            subjects = Array.isArray(parsedSubjects) ? parsedSubjects : [];
            
            let parsedFullScores = exam.full_scores;
            let parseAttemptsFullScores = 0;
            while (typeof parsedFullScores === 'string' && parseAttemptsFullScores < 3) {
                try {
                    parsedFullScores = JSON.parse(parsedFullScores);
                    parseAttemptsFullScores++;
                } catch (e) {
                    break;
                }
            }
            fullScores = typeof parsedFullScores === 'object' && parsedFullScores !== null ? parsedFullScores : {};
        } catch (e) {
            console.error('解析考试数据失败:', e);
            return res.status(500).json({ error: '考试数据格式错误' });
        }
        
        // 确保 subjects 是一个数组
        if (!Array.isArray(subjects)) {
            subjects = [];
        }
        
        const errors = [];
        const successRecords = [];

        // 处理每一行数据
    worksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= 7) return; // 跳过说明行和表头（1-6行为说明，第7行为表头）

            const record = {
                class_name: row.getCell(1).value,
                student_number: row.getCell(2).value,
                student_name: row.getCell(3).value,
                subject_scores: {},
                total_score: 0
            };

            // 验证必填字段
            if (!record.class_name || !record.student_number || !record.student_name) {
                errors.push(`第${rowNumber}行：缺少必填字段`);
                return;
            }

            // 验证和转换科目分数
            let isValid = true;
            
            // 根据模板类型定义不同的科目映射
            const subjectMaps = {
                full: {
                    '语文': 4,
                    '数学': 5,
                    '英语': 6,
                    '物理': 7,
                    '化学': 8,
                    '生物': 9,
                    '政治': 10,
                    '历史': 11,
                    '地理': 12
                },
                science: {
                    '语文': 4,
                    '数学': 5,
                    '英语': 6,
                    '物理': 7,
                    '化学': 8,
                    '生物': 9
                },
                arts: {
                    '语文': 4,
                    '数学': 5,
                    '英语': 6,
                    '政治': 7,
                    '历史': 8,
                    '地理': 9
                },
                middle: {
                    '语文': 4,
                    '数学': 5,
                    '英语': 6,
                    '物理': 7,
                    '化学': 8,
                    '政治': 9,
                    '历史': 10
                }
            };
            
            // 定义不同模板的科目分数范围
            const scoreRanges = {
                full: {
                    '语文': 150,
                    '数学': 150,
                    '英语': 150,
                    '物理': 100,
                    '化学': 100,
                    '生物': 100,
                    '政治': 100,
                    '历史': 100,
                    '地理': 100
                },
                science: {
                    '语文': 150,
                    '数学': 150,
                    '英语': 150,
                    '物理': 100,
                    '化学': 100,
                    '生物': 100
                },
                arts: {
                    '语文': 150,
                    '数学': 150,
                    '英语': 150,
                    '政治': 100,
                    '历史': 100,
                    '地理': 100
                },
                middle: {
                    '语文': 120,
                    '数学': 120,
                    '英语': 120,
                    '物理': 80,
                    '化学': 70,
                    '政治': 75,
                    '历史': 75
                }
            };
            
            // 获取当前模板的科目映射
            const subjectMap = subjectMaps[type] || subjectMaps.full;
            
            // 读取当前模板科目的分数
            Object.entries(subjectMap).forEach(([subject, colIndex]) => {
                const score = row.getCell(colIndex)?.value;
                if (score !== null && score !== undefined && score !== '') {
                    const numScore = Number(score);
                    
                    // 根据模板类型获取科目分数范围
                    let maxScore = 100;
                    if (scoreRanges[type] && scoreRanges[type][subject]) {
                        maxScore = scoreRanges[type][subject];
                    } else if (fullScores[subject] && fullScores[subject].full) {
                        maxScore = fullScores[subject].full;
                    }

                    // 检查是否为有效数字
                    if (isNaN(numScore) || numScore < 0 || numScore > maxScore) {
                        errors.push(`第${rowNumber}行：${subject}分数无效（应在0-${maxScore}之间）`);
                        isValid = false;
                    } else {
                        // 检查小数位数（最多允许小数点后两位）
                        const scoreStr = String(score);
                        if (scoreStr.includes('.')) {
                            const decimalPlaces = scoreStr.split('.')[1].length;
                            if (decimalPlaces > 2) {
                                errors.push(`第${rowNumber}行：${subject}分数小数位数过多（最多允许小数点后两位）`);
                                isValid = false;
                            } else {
                                // 保留两位小数
                                const fixedScore = parseFloat(numScore.toFixed(2));
                                // 再次检查范围，确保小数分数也在范围内
                                if (fixedScore > maxScore) {
                                    errors.push(`第${rowNumber}行：${subject}分数无效（应在0-${maxScore}之间）`);
                                    isValid = false;
                                } else {
                                    record.subject_scores[subject] = fixedScore;
                                    record.total_score += fixedScore;
                                }
                            }
                        } else {
                            record.subject_scores[subject] = numScore;
                            record.total_score += numScore;
                        }
                    }
                }
            });

            if (isValid) {
                successRecords.push(record);
            }
        });

        // 批量插入成功记录
        if (successRecords.length > 0) {
            const stmt = db.prepare(`
                INSERT INTO student_scores (exam_id, class_name, student_number, student_name, subject_scores, total_score, file_name)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            successRecords.forEach(record => {
                stmt.run([
                    exam_id[0],
                    record.class_name,
                    record.student_number,
                    record.student_name,
                    JSON.stringify(record.subject_scores),
                    record.total_score,
                    file.originalFilename
                ]);
            });

            stmt.finalize();
        }

        // 如果有错误，生成错误报告
        if (errors.length > 0) {
            const errorWorkbook = new exceljs.Workbook();
            const errorSheet = errorWorkbook.addWorksheet('错误报告');
            errorSheet.addRow(['错误行号', '错误原因']);

            errors.forEach(error => {
                const match = error.match(/第(\d+)行：(.+)/);
                if (match) {
                    errorSheet.addRow([match[1], match[2]]);
                }
            });

            const errorFileName = 'error_report.xlsx';
            const errorPath = path.join(__dirname, '../uploads', errorFileName);
            await errorWorkbook.xlsx.writeFile(errorPath);

            res.json({
                success: true,
                message: `成功导入${successRecords.length}条记录，${errors.length}条错误`,
                error_file: errorFileName
            });
        } else {
            res.json({
                success: true,
                message: `成功导入${successRecords.length}条记录`
            });
        }
    } catch (error) {
        console.error('导入失败:', error);
        res.status(500).json({ error: '导入失败' });
    }
});

// 获取成绩列表（支持分页）
router.get('/', (req, res) => {
    const { exam_id, class_name, student_number, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    let query = 'SELECT id, class_name, student_number, student_name, subject_scores, total_score, class_rank, grade_rank FROM student_scores';
    const params = [];

    if (exam_id) {
        query += ' WHERE exam_id = ?';
        params.push(exam_id);
    } else {
        query += ' WHERE 1=1';
    }
    if (class_name) {
        query += ' AND class_name = ?';
        params.push(class_name);
    }
    if (student_number) {
        query += ' AND student_number = ?';
        params.push(student_number);
    }

    // 添加排序和分页
    query += ' ORDER BY total_score DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    db.all(query, params, (err, rows) => {
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
                    // 确保subject_scores字段被保留
                    processedRow.subject_scores = row.subject_scores;
                }
            } catch (e) {
                console.error('解析subject_scores失败:', e);
            }
            return processedRow;
        });
        
        console.log('处理后的第一行:', processedRows[0]);

        // 获取总记录数
        let countQuery = 'SELECT COUNT(*) as total FROM student_scores';
        const countParams = [];
        if (exam_id) {
            countQuery += ' WHERE exam_id = ?';
            countParams.push(exam_id);
        } else {
            countQuery += ' WHERE 1=1';
        }
        if (class_name) {
            countQuery += ' AND class_name = ?';
            countParams.push(class_name);
        }
        if (student_number) {
            countQuery += ' AND student_number = ?';
            countParams.push(student_number);
        }

        db.get(countQuery, countParams, (err, countRow) => {
            if (err) {
                res.status(500).json({ error: err.message });
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
});

// 更新成绩
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { subject_scores, total_score } = req.body;

    const stmt = db.prepare(`
        UPDATE student_scores
        SET subject_scores = ?, total_score = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND is_deleted = 0
    `);

    stmt.run(JSON.stringify(subject_scores), total_score, id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: '成绩记录不存在' });
        }
        res.json({ message: '成绩更新成功' });
    });

    stmt.finalize();
});

// 清空所有成绩数据（硬删除）
router.delete('/clear', (req, res) => {
    console.log('开始清空所有成绩数据');
    db.run('DELETE FROM student_scores', function(err) {
        if (err) {
            console.error('清空数据失败:', err);
            res.status(500).json({ error: '清空数据失败' });
            return;
        }
        console.log(`成功清空${this.changes}条成绩数据`);
        res.json({ message: '数据清空成功', affectedRows: this.changes });
    });
});

// 删除成绩（软删除）
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare('UPDATE student_scores SET is_deleted = 1 WHERE id = ?');
    stmt.run(id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: '成绩删除成功' });
    });
    stmt.finalize();
});

// 计算排名
router.post('/calculate-rank/:exam_id', (req, res) => {
    const { exam_id } = req.params;

    // 先检查是否有数据需要计算排名
    db.get('SELECT COUNT(*) as count FROM student_scores WHERE exam_id = ? AND is_deleted = 0', [exam_id], (err, row) => {
        if (err) {
            res.status(500).json({ error: '查询成绩数据失败' });
            return;
        }

        if (row.count === 0) {
            res.status(400).json({ error: '没有成绩数据需要计算排名' });
            return;
        }

        // 计算班内排名
        const classRankQuery = `
            UPDATE student_scores
            SET class_rank = ranked.class_rank
            FROM (
                SELECT id, RANK() OVER (PARTITION BY class_name ORDER BY total_score DESC) as class_rank
                FROM student_scores
                WHERE exam_id = ? AND is_deleted = 0
            ) ranked
            WHERE student_scores.id = ranked.id AND student_scores.exam_id = ?
        `;

        // 计算年级排名
        const gradeRankQuery = `
            UPDATE student_scores
            SET grade_rank = ranked.grade_rank
            FROM (
                SELECT id, RANK() OVER (ORDER BY total_score DESC) as grade_rank
                FROM student_scores
                WHERE exam_id = ? AND is_deleted = 0
            ) ranked
            WHERE student_scores.id = ranked.id AND student_scores.exam_id = ?
        `;

        db.serialize(() => {
            db.run(classRankQuery, [exam_id, exam_id], (err) => {
                if (err) {
                    res.status(500).json({ error: '班内排名计算失败' });
                    return;
                }

                db.run(gradeRankQuery, [exam_id, exam_id], (err) => {
                    if (err) {
                        res.status(500).json({ error: '年级排名计算失败' });
                        return;
                    }

                    res.json({ message: '排名计算成功' });
                });
            });
        });
    });
});

module.exports = router;