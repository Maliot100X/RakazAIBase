import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Telegram sends this in `x-telegram-bot-api-secret-token`. Derived from the bot token, nothing extra to configure. */
export function webhookSecret(): string {
  return createHmac("sha256", "rakaza-telegram-webhook").update(process.env.TELEGRAM_BOT_TOKEN ?? "").digest("hex").slice(0, 48);
}

export function secretOk(got: string | null): boolean {
  const g = got ?? "", w = webhookSecret();
  return g.length === w.length && timingSafeEqual(Buffer.from(g), Buffer.from(w));
}
