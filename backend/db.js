const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库连接
const dbPath = path.join(__dirname, '../db/highschool_platform.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
    } else {
        console.log('成功连接SQLite数据库');
        initializeDatabase();
    }
});

// 初始化数据库表
function initializeDatabase() {
    db.serialize(() => {
        // 考试信息表
        db.run(`
            CREATE TABLE IF NOT EXISTS exams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                grade TEXT NOT NULL,
                exam_date DATE NOT NULL,
                subjects TEXT NOT NULL,
                full_scores TEXT NOT NULL,
                cutoff_scores TEXT NOT NULL,
                is_deleted INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // 为现有表添加is_deleted列（如果不存在）
        db.run(`
            ALTER TABLE exams ADD COLUMN is_deleted INTEGER DEFAULT 0
        `, (err) => {
            // 忽略列已存在的错误
            if (err && !err.message.includes('duplicate column name')) {
                console.error('添加exams表is_deleted列失败:', err.message);
            }
        });
        db.run(`
            ALTER TABLE exams ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        `, (err) => {
            // 忽略列已存在的错误
            if (err && !err.message.includes('duplicate column name')) {
                console.error('添加exams表created_at列失败:', err.message);
            }
        });

        // 选科组合表
        db.run(`
            CREATE TABLE IF NOT EXISTS subject_combinations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                subjects TEXT NOT NULL,
                grade TEXT NOT NULL,
                is_default INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 学生成绩表
        db.run(`
            CREATE TABLE IF NOT EXISTS student_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                exam_id INTEGER NOT NULL,
                class_name TEXT NOT NULL,
                student_number TEXT NOT NULL,
                student_name TEXT NOT NULL,
                subject_scores TEXT NOT NULL,
                total_score REAL NOT NULL,
                class_rank INTEGER,
                grade_rank INTEGER,
                is_deleted INTEGER DEFAULT 0,
                file_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (exam_id) REFERENCES exams (id)
            )
        `);
        
        // 为现有表添加is_deleted列（如果不存在）
        db.run(`
            ALTER TABLE student_scores ADD COLUMN is_deleted INTEGER DEFAULT 0
        `, (err) => {
            // 忽略列已存在的错误
            if (err && !err.message.includes('duplicate column name')) {
                console.error('添加student_scores表is_deleted列失败:', err.message);
            }
        });
        db.run(`
            ALTER TABLE student_scores ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        `, (err) => {
            // 忽略列已存在的错误
            if (err && !err.message.includes('duplicate column name')) {
                console.error('添加student_scores表created_at列失败:', err.message);
            }
        });
        db.run(`
            ALTER TABLE student_scores ADD COLUMN file_name TEXT
        `, (err) => {
            // 忽略列已存在的错误
            if (err && !err.message.includes('duplicate column name')) {
                console.error('添加student_scores表file_name列失败:', err.message);
            }
        });

        // 学生信息表
        db.run(`
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_number TEXT NOT NULL UNIQUE,
                student_name TEXT NOT NULL,
                class_name TEXT NOT NULL,
                grade TEXT NOT NULL,
                subject_combination TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 知识点分析表
        db.run(`
            CREATE TABLE IF NOT EXISTS knowledge_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                exam_id INTEGER NOT NULL,
                knowledge_point TEXT NOT NULL,
                avg_score REAL NOT NULL,
                loss_rate REAL NOT NULL,
                grade TEXT NOT NULL,
                class_name TEXT,
                subject TEXT NOT NULL,
                FOREIGN KEY (exam_id) REFERENCES exams (id)
            )
        `);

        // 预警记录表
        db.run(`
            CREATE TABLE IF NOT EXISTS warnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                level TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                target_id TEXT,
                target_name TEXT,
                exam_id INTEGER,
                is_resolved INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (exam_id) REFERENCES exams (id)
            )
        `);

        // 系统配置表
        db.run(`
            CREATE TABLE IF NOT EXISTS system_configs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                config_key TEXT NOT NULL UNIQUE,
                config_value TEXT NOT NULL,
                description TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 用户表（权限管理）
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                grade_access TEXT,
                class_access TEXT,
                subject_access TEXT,
                is_active INTEGER DEFAULT 1,
                last_login DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // 为现有表添加last_login列（如果不存在）
        db.run(`
            ALTER TABLE users ADD COLUMN last_login DATETIME
        `, (err) => {
            // 忽略列已存在的错误
            if (err && !err.message.includes('duplicate column name')) {
                console.error('添加users表last_login列失败:', err.message);
            }
        });

        // 插入默认选科组合
        const defaultCombinations = [
            { name: '物理+化学+生物', subjects: JSON.stringify(['物理', '化学', '生物']), grade: '高一', is_default: 1 },
            { name: '物理+化学+地理', subjects: JSON.stringify(['物理', '化学', '地理']), grade: '高一', is_default: 1 },
            { name: '历史+政治+地理', subjects: JSON.stringify(['历史', '政治', '地理']), grade: '高一', is_default: 1 },
            { name: '历史+政治+生物', subjects: JSON.stringify(['历史', '政治', '生物']), grade: '高一', is_default: 1 },
        ];

        const stmt = db.prepare(`
            INSERT OR IGNORE INTO subject_combinations (name, subjects, grade, is_default)
            VALUES (?, ?, ?, ?)
        `);

        defaultCombinations.forEach(combo => {
            stmt.run(combo.name, combo.subjects, combo.grade, combo.is_default);
        });

        stmt.finalize();

        // 创建索引以优化查询性能
        // student_scores表索引
        db.run(`CREATE INDEX IF NOT EXISTS idx_student_scores_exam_id ON student_scores (exam_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_student_scores_class_name ON student_scores (class_name)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_student_scores_student_number ON student_scores (student_number)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_student_scores_total_score ON student_scores (total_score)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_student_scores_is_deleted ON student_scores (is_deleted)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_student_scores_exam_id_is_deleted ON student_scores (exam_id, is_deleted)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_student_scores_class_name_is_deleted ON student_scores (class_name, is_deleted)`);
        
        // exams表索引
        db.run(`CREATE INDEX IF NOT EXISTS idx_exams_exam_date ON exams (exam_date)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_exams_is_deleted ON exams (is_deleted)`);
        
        // students表索引
        db.run(`CREATE INDEX IF NOT EXISTS idx_students_student_number ON students (student_number)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_students_class_name ON students (class_name)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_students_grade ON students (grade)`);
        
        // warnings表索引
        db.run(`CREATE INDEX IF NOT EXISTS idx_warnings_is_resolved ON warnings (is_resolved)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_warnings_exam_id ON warnings (exam_id)`);
        
        // knowledge_analysis表索引
        db.run(`CREATE INDEX IF NOT EXISTS idx_knowledge_analysis_exam_id ON knowledge_analysis (exam_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_knowledge_analysis_subject ON knowledge_analysis (subject)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_knowledge_analysis_grade ON knowledge_analysis (grade)`);
        
        // system_configs表索引
        db.run(`CREATE INDEX IF NOT EXISTS idx_system_configs_config_key ON system_configs (config_key)`);
        
        // users表索引
        db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active)`);
    });
}

module.exports = db;