import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

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

export default async function handler(req, res) {
  await initTable();
  const { method, query, body } = req;

  if (method === 'GET') {
    let sql = "SELECT * FROM designs ORDER BY id DESC";
    let args = [];
    if (query.keyword) {
      sql += " WHERE name LIKE ?";
      args.push(`%${query.keyword}%`);
    }
    const result = await db.execute({ sql, args });
    return res.json(result.rows);
  }

  if (method === 'POST') {
    const { name, version, type, url, remark } = body;
    await db.execute({
      sql: "INSERT INTO designs(name,version,type,url,remark) VALUES(?,?,?,?,?)",
      args: [name, version, type||"PC", url, remark||""]
    });
    return res.json({ success: true });
  }

  if (method === 'DELETE') {
    const id = req.url.split("/").pop();
    await db.execute({
      sql: "DELETE FROM designs WHERE id=?",
      args: [id]
    });
    return res.json({ success: true });
  }

  res.status(405).json({ error: "请求方式非法" });
}
