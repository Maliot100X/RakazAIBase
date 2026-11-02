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
const sql = neon(process.env.DATABASE_URL!);
const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='agents' ORDER BY ordinal_position`;
console.log('COLS', JSON.stringify(cols));
const dups = await sql`SELECT lower(handle) h, count(*) c FROM agents GROUP BY 1 HAVING count(*)>1`;
console.log('DUPS', JSON.stringify(dups));
const sample = await sql`SELECT id, name, handle FROM agents LIMIT 20`;
console.log('SAMPLE', JSON.stringify(sample));
const cnt = await sql`SELECT count(*)::int AS n FROM agents`;
console.log('COUNT', cnt);
