"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Compass, Users, Rocket, Gamepad2, User, Menu, X, MessageCircle, MessagesSquare, SunMoon } from "lucide-react";
import { Logo } from "./logo";
import { BOTTOM_NAV, DRAWER_GROUPS } from "./nav-data";
import { ConnectButton } from "@/components/connect-button";
import { useSafeArea } from "@/components/miniapp-bootstrap";
import { isControlChrome } from "@/lib/shell/owner-routes";

const OPERATE_RAIL: [string, string][] = [["Vault", "/vault"], ["Keys", "/keyvault"], ["Health", "/health"]];
const ICONS = { compass: Compass, users: Users, rocket: Rocket, gamepad: Gamepad2, user: User, talk: MessagesSquare };

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const inset = useSafeArea();
  useEffect(() => setOpen(false), [path]);
  const toggleTheme = () => document.documentElement.classList.toggle("light");
  const controlRoom = isControlChrome(path);
  const playing = path.startsWith("/games/");

  return (
    <div className="flex min-h-dvh flex-col" style={{ paddingLeft: inset.left, paddingRight: inset.right }}>
      <header
        className={`rk-header sticky top-0 z-40 ${controlRoom ? "bg-rk-ink text-white" : "border-b border-border bg-[var(--rk-header-bg)]"}`}
        style={{ paddingTop: `max(${inset.top}px, env(safe-area-inset-top))` }}
      >
        <div className="mx-auto flex h-[var(--rk-header-h)] max-w-[76rem] items-center gap-2 px-3">
          {!controlRoom && (
            <button aria-label="Open menu" onClick={() => setOpen(true)} className="grid size-11 place-items-center rounded-full border-[1.5px] border-[var(--rk-line)]">
              <Menu className="size-5" strokeWidth={2.25} />
            </button>
          )}
          {controlRoom ? (
            <Logo variant="control" />
          ) : (
            <Logo />
          )}
          <div className="ml-auto flex items-center gap-2">
            {controlRoom && (
              <Link href="/" className="inline-flex min-h-11 items-center rounded-full border border-rk-honey/60 px-3 text-sm font-semibold text-rk-honey">
                Exit to site
              </Link>
            )}
            {!controlRoom && (
              <button aria-label="Toggle theme" onClick={toggleTheme} className="grid size-11 place-items-center rounded-full border-[1.5px] border-[var(--rk-line)]">
                <SunMoon className="size-5" strokeWidth={2.25} />
              </button>
            )}
            {!controlRoom && <ConnectButton compact />}
          </div>
        </div>
        {controlRoom && <div className="rk-rule" aria-hidden />}
        {controlRoom && (
          <nav aria-label="Dashboard" className="mx-auto flex max-w-[424px] gap-2 overflow-x-auto px-3 py-2">
            {OPERATE_RAIL.map(([label, href]) => (
              <Link key={href} href={href} aria-current={path === href ? "page" : undefined}
                className="shrink-0 rounded-full border border-rk-lav/50 px-3 py-1 font-mono text-xs aria-[current=page]:border-rk-mint aria-[current=page]:text-rk-mint">{label}</Link>
            ))}
          </nav>
        )}
      </header>

      {!controlRoom && open && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu">
          <nav className="h-full w-[min(20rem,86vw)] overflow-y-auto border-r-2 border-rk-pink bg-card p-4" style={{ paddingTop: `calc(${inset.top}px + 1rem)` }}>
            <div className="mb-4 flex items-center justify-between">
              <p className="rk-h2 !text-lg">Every page, one list.</p>
              <button aria-label="Close menu" onClick={() => setOpen(false)} className="grid size-11 place-items-center"><X className="size-5" strokeWidth={2.25} /></button>
            </div>
            <div className="rk-card-hard mb-5 p-4 !shadow-[3px_3px_0_var(--rk-pink)]">
              <p className="rk-kicker">Guest</p>
              <p className="mt-1 text-sm text-muted-foreground">Sign in your agent to see your account here.</p>
              <Link href="/agents" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-rk-honey underline-offset-4 hover:underline">Agents · Connect</Link>
            </div>
            {DRAWER_GROUPS.map((g) => (
              <div key={g.title} className="mb-4">
                <p className="rk-kicker mb-1 text-muted-foreground">{g.title}</p>
                <ul>
                  {g.links.map(([label, href]) => (
                    <li key={href}>
                      <Link href={href} aria-current={path === href ? "page" : undefined}
                        className="flex min-h-11 items-center rounded-lg px-2 font-medium aria-[current=page]:bg-secondary aria-[current=page]:text-rk-honey">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <button aria-label="Close menu" className="flex-1 bg-black/60" onClick={() => setOpen(false)} />
        </div>
      )}

      <main className={`mx-auto w-full max-w-[76rem] flex-1 px-3 pt-5 md:px-6 ${controlRoom ? "max-w-[424px] !px-3 pb-8" : "pb-[calc(var(--rk-nav-h)+5rem+env(safe-area-inset-bottom))]"}`}>
        {children}
      </main>

      {!controlRoom && !playing && path !== "/chat" && path !== "/talk" && (
        <Link href="/chat" aria-label="Ask Rakaza"
          className="fixed right-4 z-30 flex min-h-12 items-center gap-2 rounded-full border-2 border-rk-ink bg-rk-violet px-4 font-semibold text-white shadow-[3px_3px_0_var(--rk-pink)]"
          style={{ bottom: `calc(var(--rk-nav-h) + ${inset.bottom}px + env(safe-area-inset-bottom) + 14px)` }}>
          <MessageCircle className="size-5" strokeWidth={2.25} /> Ask Rakaza
        </Link>
      )}

      {!controlRoom && <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-rk-ink bg-[var(--rk-bar)]"
        style={{ paddingBottom: `max(${inset.bottom}px, env(safe-area-inset-bottom))` }}>
        <ul className="mx-auto grid h-[var(--rk-nav-h)] max-w-[32rem] grid-cols-5 items-center gap-1 px-2">
          {BOTTOM_NAV.map((item) => {
            const Icon = ICONS[item.icon];
            const active = item.href === "/explore" ? path === "/" || path.startsWith("/explore") : path.startsWith(item.href);
            if ("fab" in item && item.fab)
              return (
                <li key={item.href} className="flex justify-center">
                  <Link href={item.href} aria-current={active ? "page" : undefined}
                    className="rk-launch flex flex-col items-center justify-center">
                    <Icon className="size-5" strokeWidth={2.25} /><span className="font-mono text-[0.6rem] font-bold uppercase">{item.label}</span>
                  </Link>
                </li>
              );
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined}
                  className="rk-pill justify-center">
                  <Icon className="size-5" strokeWidth={2.25} /><span className="text-[0.68rem] font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>}
    </div>
  );
}
