const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('.'));

// ======================== 数据库驱动选择 ========================
let db;
let dbType = 'sqlite'; // 默认本地 sqlite

// 检查环境变量：如果设置了 TURSO_DATABASE_URL 且没有强制使用本地，则使用 Turso
if (process.env.TURSO_DATABASE_URL && process.env.USE_LOCAL_DB !== 'true') {
    dbType = 'turso';
    const { createClient } = require('@tursodatabase/serverless');
    db = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
    console.log('✅ 使用 Turso 云数据库');
} else {
    dbType = 'sqlite';
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, 'designs.db');
    db = new sqlite3.Database(dbPath);
    console.log(`✅ 使用本地 SQLite 数据库: ${dbPath}`);
}

// ======================== 建表与初始化默认数据 ========================
const createTableSQL = `
  CREATE TABLE IF NOT EXISTS designs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    version TEXT,
    type TEXT,
    url TEXT,
    remark TEXT
  )
`;

// 通用的执行SQL方法（兼容两种数据库）
async function runSQL(sql, params = []) {
    if (dbType === 'sqlite') {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    } else {
        const result = await db.execute({ sql, args: params });
        return result;
    }
}

async function getCount() {
    if (dbType === 'sqlite') {
        return new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as cnt FROM designs", (err, row) => {
                if (err) reject(err);
                else resolve(row.cnt);
            });
        });
    } else {
        const result = await db.execute("SELECT COUNT(*) as cnt FROM designs");
        return result.rows[0].cnt;
    }
}

async function insertDefaultData() {
    const defaultData = [
        ['盘点分析pc看板', 'V1.0', 'PC', 'https://huilog.qzz.io/wmspc03', '禅道63744'],
        ['库存看板', 'V1.0', 'PC', 'https://huilog.qzz.io/WMS1', '无'],
        ['装卸工时确认pda', 'V1.0', 'PDA', 'https://huilog.qzz.io/wmspda3', '禅道63740'],
        ['PDA运单绑定', 'V1.0', 'PDA', 'https://huilog.qzz.io/my-warehousehtml-page/PDAyundanbangdi.html', '禅道62810'],
        ['运营参数配置日志', 'V1.0', 'PC', 'https://huilog.qzz.io/wmslog', '禅道63926']
    ];
    const insertSQL = "INSERT INTO designs (name, version, type, url, remark) VALUES (?, ?, ?, ?, ?)";
    for (const item of defaultData) {
        await runSQL(insertSQL, item);
    }
    console.log('✅ 已插入默认数据');
}

// 初始化表和数据
(async () => {
    try {
        await runSQL(createTableSQL);
        const count = await getCount();
        if (count === 0) {
            await insertDefaultData();
        } else {
            console.log(`✅ 数据库已有 ${count} 条记录，跳过初始化`);
        }
    } catch (err) {
        console.error('初始化失败:', err);
    }
})();

// ======================== 通用查询/插入/删除封装 ========================
async function queryAll(sql, params = []) {
    if (dbType === 'sqlite') {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    } else {
        const result = await db.execute({ sql, args: params });
        return result.rows;
    }
}

async function insertOne(sql, params = []) {
    if (dbType === 'sqlite') {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    } else {
        const result = await db.execute({ sql, args: params });
        return result.lastInsertRowid;
    }
}

async function deleteOne(sql, params = []) {
    if (dbType === 'sqlite') {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    } else {
        const result = await db.execute({ sql, args: params });
        return result.rowsAffected;
    }
}

// ======================== API 接口 ========================

// 获取所有设计稿（支持模糊搜索）
app.get('/api/designs', async (req, res) => {
    const keyword = req.query.keyword || '';
    let sql = "SELECT * FROM designs";
    let params = [];
    if (keyword.trim() !== '') {
        sql += " WHERE name LIKE ?";
        params.push(`%${keyword}%`);
    }
    sql += " ORDER BY id";
    console.log("执行的SQL:", sql, "参数:", params);
    try {
        const rows = await queryAll(sql, params);
        res.json(rows);
    } catch (err) {
        console.error("数据库查询错误:", err);
        res.status(500).json({ error: "数据库查询失败" });
    }
});

// 新增一条设计稿
app.post('/api/designs', async (req, res) => {
    const { name, version, type, url, remark } = req.body;
    if (!name || !version || !type || !url) {
        return res.status(400).json({ error: '缺少必要字段' });
    }
    const sql = "INSERT INTO designs (name, version, type, url, remark) VALUES (?, ?, ?, ?, ?)";
    try {
        const newId = await insertOne(sql, [name, version, type, url, remark || '']);
        res.json({ id: newId, name, version, type, url, remark: remark || '' });
    } catch (err) {
        console.error("新增失败:", err);
        res.status(500).json({ error: "新增失败" });
    }
});

// 删除一条设计稿
app.delete('/api/designs/:id', async (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM designs WHERE id = ?";
    try {
        const changes = await deleteOne(sql, [id]);
        if (changes === 0) {
            res.status(404).json({ error: "记录不存在" });
        } else {
            res.json({ success: true });
        }
    } catch (err) {
        console.error("删除失败:", err);
        res.status(500).json({ error: "删除失败" });
    }
});

// 启动服务
app.listen(port, () => {
    console.log(`🚀 服务器运行在 http://localhost:${port}`);
    console.log(`📦 数据库模式: ${dbType === 'sqlite' ? '本地 SQLite' : 'Turso 云数据库'}`);
});