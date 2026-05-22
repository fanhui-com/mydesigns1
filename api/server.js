import { createClient } from '@libsql/client';

export const config = { runtime: 'edge' };

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function init() {
  try {
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

    const { rows } = await db.execute("SELECT COUNT(*) as count FROM designs");
    if (rows[0].count === 0) {
      const data = [
        { id: 1, name: "盘点分析pc看板", version: "V1.0", type: "PC", url: "https://huilog.qzz.io/wmspc03", remark: "禅道63744" },
        { id: 2, name: "库存看板", version: "V1.0", type: "PC", url: "https://huilog.qzz.io/WMS1", remark: "无" },
        { id: 3, name: "装卸工时确认pda", version: "V1.0", type: "PDA", url: "https://huilog.qzz.io/wmspda3", remark: "禅道63740" },
        { id: 4, name: "PDA运单绑定", version: "V1.0", type: "PDA", url: "https://huilog.qzz.io/my-warehousehtml-page/PDAyundanbangdi.html", remark: "禅道62810" },
        { id: 5, name: "运营参数配置日志", version: "V1.0", type: "PC", url: "https://huilog.qzz.io/wmslog", remark: "禅道63926" },
      ];
      for (const item of data) {
        await db.execute({
          sql: "INSERT INTO designs (id,name,version,type,url,remark) VALUES (?,?,?,?,?,?)",
          args: [item.id, item.name, item.version, item.type, item.url, item.remark]
        });
      }
    }
  } catch (e) {}
}

export default async function handler(req) {
  await init();
  const u = new URL(req.url);

  if (req.method === "GET") {
    const kw = u.searchParams.get("keyword");
    let sql = "SELECT * FROM designs ORDER BY id DESC";
    let arr = [];
    if (kw) { sql += " WHERE name LIKE ?"; arr = [`%${kw}%`]; }
    const r = await db.execute({ sql, args: arr });
    return new Response(JSON.stringify(r.rows), { headers: { "Content-Type": "application/json" } });
  }

  if (req.method === "POST") {
    const b = await req.json();
    await db.execute({
      sql: "INSERT INTO designs (name,version,type,url,remark) VALUES (?,?,?,?,?)",
      args: [b.name, b.version, b.type || "PC", b.url, b.remark || ""]
    });
    return new Response(JSON.stringify({ ok: 1 }));
  }

  if (req.method === "DELETE") {
    const id = u.pathname.split("/").pop();
    await db.execute({ sql: "DELETE FROM designs WHERE id=?", args: [id] });
    return new Response(JSON.stringify({ ok: 1 }));
  }

  return new Response(JSON.stringify({ error: "no" }), { status: 405 });
}
