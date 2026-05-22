import { createClient } from '@libsql/client';

// 连接 Turso 数据库
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// 初始化表（自动创建）
async function initTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS designs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      version TEXT,
      type TEXT,
      url TEXT,
      remark TEXT
    )
  `);
}

// Vercel 入口
export default async function handler(req, res) {
  await initTable();

  // 查询列表
  if (req.method === 'GET') {
    const keyword = req.query.keyword || '';
    let sql = 'SELECT * FROM designs ORDER BY id DESC';
    let params = [];

    if (keyword) {
      sql += ' WHERE name LIKE ?';
      params.push(`%${keyword}%`);
    }

    const result = await db.execute({ sql, args: params });
    return res.status(200).json(result.rows);
  }

  // 新增
  if (req.method === 'POST') {
    const { name, version, type, url, remark } = req.body;
    await db.execute({
      sql: 'INSERT INTO designs (name, version, type, url, remark) VALUES (?,?,?,?,?)',
      args: [name, version, type || 'PC', url, remark || '']
    });
    return res.status(200).json({ ok: true });
  }

  // 删除
  if (req.method === 'DELETE') {
    const id = req.url.split('/').pop();
    await db.execute({
      sql: 'DELETE FROM designs WHERE id = ?',
      args: [id]
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end('Method Not Allowed');
}
