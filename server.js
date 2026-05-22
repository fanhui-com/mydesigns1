import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// 初始化表 + 初始化数据（只执行一次）
async function initTable() {
  // 1. 创建表
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

  // 2. 检查是否已有数据
  const check = await db.execute("SELECT COUNT(*) as count FROM designs");
  const count = check.rows[0].count;

  // 3. 如果是空表，自动插入你给的 5 条初始数据
  if (count == 0) {
    const initData = [
      {
        "id": 1,
        "name": "盘点分析pc看板",
        "version": "V1.0",
        "type": "PC",
        "url": "https://huilog.qzz.io/wmspc03",
        "remark": "禅道63744"
      },
      {
        "id": 2,
        "name": "库存看板",
        "version": "V1.0",
        "type": "PC",
        "url": "https://huilog.qzz.io/WMS1",
        "remark": "无"
      },
      {
        "id": 3,
        "name": "装卸工时确认pda",
        "version": "V1.0",
        "type": "PDA",
        "url": "https://huilog.qzz.io/wmspda3",
        "remark": "禅道63740"
      },
      {
        "id": 4,
        "name": "PDA运单绑定",
        "version": "V1.0",
        "type": "PDA",
        "url": "https://huilog.qzz.io/my-warehousehtml-page/PDAyundanbangdi.html",
        "remark": "禅道62810"
      },
      {
        "id": 5,
        "name": "运营参数配置日志",
        "version": "V1.0",
        "type": "PC",
        "url": "https://huilog.qzz.io/wmslog",
        "remark": "禅道63926"
      }
    ];

    for (let item of initData) {
      await db.execute({
        sql: `INSERT INTO designs (id, name, version, type, url, remark)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [item.id, item.name, item.version, item.type, item.url, item.remark]
      });
    }
    console.log("✅ 初始数据已自动插入 Turso 数据库");
  }
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
