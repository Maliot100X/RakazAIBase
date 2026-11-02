import "server-only";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const e = (k: string) => process.env[k] ?? "";

/** REST URL must be https. A pasted `redis-cli ... redis://user:pw@host:port` string is reduced to https://host; anything else idles. */
export function upstashUrl(): string {
  const raw = e("UPSTASH_REDIS_REST_URL").trim();
  if (/^https:\/\//.test(raw)) return raw;
  const host = raw.match(/rediss?:\/\/[^@\s]*@([^:/\s]+)/)?.[1];
  return host ? `https://${host}` : "";
}

/** Read/write client. Null when Upstash is not configured. */
let rw: Redis | null | undefined;
export function redis(): Redis | null {
  if (rw !== undefined) return rw;
  const url = upstashUrl(), token = e("UPSTASH_REDIS_REST_TOKEN");
  return (rw = url && token ? new Redis({ url, token }) : null);
}

/** Read-only client for public GET routes. */
let ro: Redis | null | undefined;
export function redisReadOnly(): Redis | null {
  if (ro !== undefined) return ro;
  const url = upstashUrl(), token = e("UPSTASH_REDIS_READONLY_TOKEN");
  return (ro = url && token ? new Redis({ url, token }) : null);
}

export function limiter(prefix: string, requests: number, window: `${number} ${"s" | "m" | "h"}`): Ratelimit | null {
  const r = redis();
  return r ? new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(requests, window), prefix: `rl:${prefix}` }) : null;
}
