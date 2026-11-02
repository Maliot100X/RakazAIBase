"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

type Insets = { top: number; bottom: number; left: number; right: number };
const ZERO: Insets = { top: 0, bottom: 0, left: 0, right: 0 };
const SafeArea = createContext<Insets>(ZERO);
export const useSafeArea = () => useContext(SafeArea);

/**
 * Inside a Farcaster/Base Mini App host: reads safeAreaInsets, then calls
 * sdk.actions.ready() only after the shell + first skeleton have painted
 * (double rAF after mount = after first paint). Idle outside a host.
 */
export function MiniAppBootstrap({ children }: { children: ReactNode }) {
  const [insets, setInsets] = useState<Insets>(ZERO);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!(await sdk.isInMiniApp()) || cancelled) return;
        const ctx = await sdk.context;
        const s = ctx?.client?.safeAreaInsets;
        if (s && !cancelled) setInsets(s);
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        if (!cancelled) await sdk.actions.ready();
      } catch {
        /* not in a mini app host — idle */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return <SafeArea.Provider value={insets}>{children}</SafeArea.Provider>;
}
