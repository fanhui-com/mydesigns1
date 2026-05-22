import { createClient } from '@libsql/client';

// 声明使用 Edge Runtime
export const config = {
  runtime: 'edge',
};

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// 初始化表和数据
async function initDatabase() {
  // 创建表
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

  // 检查是否已有数据，没有则插入初始数据
  const { rows } = await db.execute("SELECT COUNT(*) as count FROM designs");
  if (rows[0].count === 0) {
    const initData = [
      { id: 1, name: "盘点分析pc看板", version: "V1.0", type: "PC", url: "https://huilog.qzz.io/wmspc03", remark: "禅道63744" },
      { id: 2, name: "库存看板", version: "V1.0", type: "PC", url: "https://huilog.qzz.io/WMS1", remark: "无" },
      { id: 3, name: "装卸工时确认pda", version: "V1.0", type: "PDA", url: "https://huilog.qzz.io/wmspda3", remark: "禅道63740" },
      { id: 4, name: "PDA运单绑定", version: "V1.0", type: "PDA", url: "https://huilog.qzz.io/my-warehousehtml-page/PDAyundanbangdi.html", remark: "禅道62810" },
      { id: 5, name: "运营参数配置日志", version: "V1.0", type: "PC", url: "https://huilog.qzz.io/wmslog", remark: "禅道63926" }
    ];

    for (const item of initData) {
      await db.execute({
        sql: "INSERT INTO designs (id, name, version, type, url, remark) VALUES (?, ?, ?, ?, ?, ?)",
        args: [item.id, item.name, item.version, item.type, item.url, item.remark]
      });
    }
    console.log("✅ 初始数据已插入");
  }
}

export default async function handler(req) {
  await initDatabase();
  const { method } = req;
  const url = new URL(req.url);

  // 处理 GET 请求（查询/搜索）
  if (method === 'GET') {
    const keyword = url.searchParams.get('keyword');
    let sql = "SELECT * FROM designs ORDER BY id DESC";
    let args = [];
    if (keyword) {
      sql += " WHERE name LIKE ?";
      args.push(`%${keyword}%`);
    }
    const result = await db.execute({ sql, args });
    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 处理 POST 请求（新增）
  if (method === 'POST') {
    const { name, version, type, url, remark } = await req.json();
    await db.execute({
      sql: "INSERT INTO designs (name, version, type, url, remark) VALUES (?, ?, ?, ?, ?)",
      args: [name, version, type || "PC", url, remark || ""]
    });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  // 处理 DELETE 请求（删除）
  if (method === 'DELETE') {
    const id = url.pathname.split('/').pop();
    await db.execute({
      sql: "DELETE FROM designs WHERE id = ?",
      args: [id]
    });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405 });
}
