import "server-only";
import { bankrProvider } from "./providers/bankr";
import { clankerProvider } from "./providers/clanker";

export type LaunchProviderId = "bankr" | "clanker";
/** Bankr primary; Clanker only if Bankr idle and Clanker ready. Null = launch idle. */
export function defaultLaunchProvider(): LaunchProviderId | null {
  if (bankrProvider.status() === "ready") return "bankr";
  if (clankerProvider.status() === "ready") return "clanker";
  return null;
}
