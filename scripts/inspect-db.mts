import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
function loadEnv(p: string) {
  try {
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const i = t.indexOf("=");
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv(resolve(process.cwd(), ".env.local"));
loadEnv(resolve(process.cwd(), "../.env"));
const u = process.env.DATABASE_URL!;
console.log('url_db', u.split('/').pop()?.split('?')[0], 'host', u.split('@')[1]?.split('/')[0]);
const sql = neon(u);
const db = await sql`SELECT current_database() AS db, current_schema() AS schema`;
console.log(db);
const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1`;
console.log('tables', tables);
const cnt = await sql`SELECT count(*)::int n FROM agents`.catch(e=>({err:String(e)}));
console.log('agents', cnt);
const dups = await sql`SELECT lower(handle) h, count(*)::int c FROM agents GROUP BY 1 HAVING count(*)>1`.catch(e=>({err:String(e)}));
console.log('dups', dups);
