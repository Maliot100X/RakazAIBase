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
const tables = await sql`
  SELECT table_schema, table_name
  FROM information_schema.tables
  WHERE table_name = 'agents' AND table_type='BASE TABLE'
  ORDER BY 1,2`;
console.log('AGENT_TABLES', JSON.stringify(tables));
const cols = await sql`
  SELECT table_schema, column_name, data_type
  FROM information_schema.columns
  WHERE table_name='agents'
  ORDER BY table_schema, ordinal_position`;
console.log('COLS_BY_SCHEMA', JSON.stringify(cols));
