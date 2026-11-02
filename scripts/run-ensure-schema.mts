import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(p: string, overwrite = false) {
  try {
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const i = t.indexOf("=");
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      if (overwrite || !process.env[k]) process.env[k] = v;
    }
  } catch {}
}
// Clear then load .env.local with overwrite
delete process.env.DATABASE_URL;
loadEnv(resolve(process.cwd(), ".env.local"), true);
loadEnv(resolve(process.cwd(), "../.env"), false);

async function main() {
  const u = process.env.DATABASE_URL || "";
  console.log("connecting", u.split("@")[1]?.split("?")[0]);
  if (!u.includes("/rakazabase")) {
    console.error("REFUSING: DATABASE_URL is not rakazabase");
    process.exit(2);
  }
  const { ensureSchema } = await import("../src/lib/db.ts");
  await ensureSchema();
  console.log("ENSURE_SCHEMA_OK");
}
main().catch((e) => {
  console.error("ENSURE_SCHEMA_FAIL", String(e?.message || e));
  process.exit(1);
});
