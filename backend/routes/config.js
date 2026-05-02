const express = require('express');
const router = express.Router();
const db = require('../db');

// 初始化默认配置
function initializeDefaultConfigs() {
    const defaultConfigs = [
        // 分数阈值配置
        { key: 'top_score_percentage', value: '10', description: '尖子生百分比（前%）' },
        { key: 'excellent_score_percentage', value: '25', description: '优秀生百分比（前%）' },
        { key: 'pass_score_percentage', value: '60', description: '及格百分比（前%）' },
        { key: 'low_score_percentage', value: '20', description: '低分百分比（后%）' },

        // 预警阈值配置
        { key: 'warning_avg_score_threshold', value: '60', description: '平均分预警阈值' },
        { key: 'warning_pass_rate_threshold', value: '70', description: '及格率预警阈值（%）' },
        { key: 'warning_rank_drop_threshold', value: '5', description: '排名下滑预警阈值（位）' },
        { key: 'warning_continuous_decline_count', value: '2', description: '连续退步预警次数' },

        // 波动分析配置
        { key: 'fluctuation_class_score_threshold', value: '10', description: '班级平均分波动阈值（%）' },
        { key: 'fluctuation_class_rank_threshold', value: '5', description: '班级排名波动阈值（位）' },
        { key: 'fluctuation_student_rank_threshold', value: '50', description: '学生排名波动阈值（位）' },
        { key: 'fluctuation_student_score_threshold', value: '20', description: '学生单科分数波动阈值（%）' },

        // 偏科分析配置
        { key: 'weak_subject_rank_gap_percentage', value: '20', description: '偏科判定排名差距百分比（%）' },

        // 临界生配置
        { key: 'critical_student_score_range', value: '10', description: '临界生分数范围（±分）' },

        // 大屏配置
        { key: 'dashboard_refresh_interval', value: '5', description: '大屏自动刷新时间（分钟）' },
        { key: 'dashboard_default_resolution', value: '1920x1080', description: '大屏默认分辨率' },

        // 水印配置
        { key: 'chart_watermark_enabled', value: 'true', description: '图表水印是否开启' },
        { key: 'chart_watermark_text', value: '高中教学质量数据运营分析平台', description: '图表水印文字' },

        // 文件命名配置
        { key: 'export_filename_format', value: '{grade}-{exam}-{report}-{date}', description: '导出文件命名格式' }
    ];

    const stmt = db.prepare(`
        INSERT OR IGNORE INTO system_configs (config_key, config_value, description)
        VALUES (?, ?, ?)
    `);

    defaultConfigs.forEach(config => {
        stmt.run(config.key, config.value, config.description);
    });

    stmt.finalize();
}

// 获取所有配置
router.get('/', (req, res) => {
    db.all('SELECT * FROM system_configs ORDER BY config_key', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 获取单个配置
router.get('/:key', (req, res) => {
    const { key } = req.params;
    db.get('SELECT * FROM system_configs WHERE config_key = ?', [key], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            return res.status(404).json({ error: '配置不存在' });
        }
        res.json(row);
    });
});

// 更新配置
router.put('/:key', (req, res) => {
    const { key } = req.params;
    const { config_value, description } = req.body;

    const stmt = db.prepare(`
        UPDATE system_configs
        SET config_value = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE config_key = ?
    `);

    stmt.run(config_value, description, key, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: '配置不存在' });
        }
        res.json({ message: '配置更新成功' });
    });

    stmt.finalize();
});

// 批量更新配置
router.put('/', (req, res) => {
    const { configs } = req.body;

    if (!Array.isArray(configs)) {
        return res.status(400).json({ error: '配置数据格式错误' });
    }

    db.serialize(() => {
        const stmt = db.prepare(`
            UPDATE system_configs
            SET config_value = ?, updated_at = CURRENT_TIMESTAMP
            WHERE config_key = ?
        `);

        let successCount = 0;
        configs.forEach(config => {
            stmt.run(config.value, config.key, function(err) {
                if (!err) {
                    successCount += this.changes;
                }
            });
        });

        stmt.finalize();

        res.json({
            message: `成功更新${successCount}个配置项`,
            updated_count: successCount
        });
    });
});

// 重置为默认配置
router.post('/reset-defaults', (req, res) => {
    initializeDefaultConfigs();
    res.json({ message: '配置已重置为默认值' });
});

// 获取分数段配置（专门用于分数段分析）
router.get('/score-ranges/default', (req, res) => {
    const ranges = [
        { min: 135, max: 150, label: '尖子生', color: '#FFD700' },
        { min: 120, max: 134, label: '优秀', color: '#C0C0C0' },
        { min: 90, max: 119, label: '良好', color: '#CD7F32' },
        { min: 60, max: 89, label: '及格', color: '#228B22' },
        { min: 0, max: 59, label: '不及格', color: '#FF4500' }
    ];
    res.json(ranges);
});

// 获取预警规则配置
router.get('/warning-rules', (req, res) => {
    db.all(`
        SELECT * FROM system_configs
        WHERE config_key LIKE 'warning_%'
        ORDER BY config_key
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const rules = {};
        rows.forEach(row => {
            rules[row.config_key] = row.config_value;
        });

        res.json(rules);
    });
});

// 更新预警规则
router.put('/warning-rules', (req, res) => {
    const { rules } = req.body;

    if (!rules || typeof rules !== 'object') {
        return res.status(400).json({ error: '预警规则格式错误' });
    }

    const stmt = db.prepare(`
        UPDATE system_configs
        SET config_value = ?, updated_at = CURRENT_TIMESTAMP
        WHERE config_key = ?
    `);

    let successCount = 0;
    Object.keys(rules).forEach(key => {
        stmt.run(rules[key], key, function(err) {
            if (!err) {
                successCount += this.changes;
            }
        });
    });

    stmt.finalize();

    res.json({
        message: `成功更新${successCount}个预警规则`,
        updated_count: successCount
    });
});

// 获取大屏配置
router.get('/dashboard', (req, res) => {
    db.all(`
        SELECT * FROM system_configs
        WHERE config_key LIKE 'dashboard_%'
        ORDER BY config_key
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const config = {};
        rows.forEach(row => {
            config[row.config_key] = row.config_value;
        });

        res.json(config);
    });
});

module.exports = router;