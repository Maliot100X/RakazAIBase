import "server-only";
/** Bearer CRON_SECRET (Vercel cron) or QStash-forwarded with the same bearer. Fails closed if secret unset. */
export function cronAuthorized(req: Request): boolean {
  const s = process.env.CRON_SECRET ?? "";
  return s.length > 0 && req.headers.get("authorization") === `Bearer ${s}`;
}
