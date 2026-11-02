import type { ReactNode } from "react";

/** CSS-only stagger (TIMING.pageEnterDuration/Stagger, see globals .rk-enter). Runs once per mount; reduced-motion → none. */
export function PageEnter({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" }) {
  return <Tag className={`rk-enter ${className}`}>{children}</Tag>;
}
