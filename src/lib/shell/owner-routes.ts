/** Owner control-room paths (SHELLS §1A / ELEVATED_IMPL_SLICE §6). Agent chrome hidden here. */
export const OWNER_ROUTES = [
  "/vault",
  "/keyvault",
  "/fees",
  "/splits",
  "/revenue",
  "/rewards",
  "/pool",
  "/ledger",
  "/treasury",
  "/health",
  "/infra",
  "/dev",
  "/settings",
  "/dash",
  "/trade",
  "/scanner",
  "/shield",
  "/vanity",
  "/kit",
  "/lab",
  "/history",
  "/studio/mod",
  "/studio/owner",
] as const;

export function isOwnerRoute(path: string | null | undefined): boolean {
  if (!path) return false;
  return OWNER_ROUTES.some((r) => path === r || path.startsWith(`${r}/`));
}

export function isControlChrome(path: string | null | undefined): boolean {
  if (!path) return false;
  return path === "/login" || path.startsWith("/login?") || isOwnerRoute(path);
}
