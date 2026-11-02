export const TIMING = {
  pageEnterDuration: 0.18,
  pageEnterStagger: 0.04, // ×4 children
  tabCrossfade: 0.14,
  ctaPressY: 2, // px
  heroBob: 3.0, // s loop, hero only
  controlRuleDraw: 0.22,
} as const;
export const EASE = [0.2, 0.8, 0.2, 1] as const;
export const timing = (reduced: boolean) =>
  reduced ? (Object.fromEntries(Object.keys(TIMING).map(k => [k, 0])) as Record<keyof typeof TIMING, number>) : TIMING;
