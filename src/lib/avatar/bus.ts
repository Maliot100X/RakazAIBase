/** Avatar event boundary. UI emits; renderers (sticker / 3D) subscribe. UI never touches three.
 *  Level / visemes are NOT events: renderers read them per frame from @/lib/stage/audio-bus. */
export const EMOTES = ["happy", "sad", "angry", "relaxed", "surprised"] as const;
export type Emote = (typeof EMOTES)[number];
export type AvatarEvent = "idle" | "listen" | "think" | "speak:start" | "speak:end" | `emote:${Emote}`;
export type TalkState = "idle" | "listen" | "think" | "speak";
type Fn = (e: AvatarEvent) => void;
const subs = new Set<Fn>();
let last: AvatarEvent = "idle";
let lastState: TalkState = "idle";
let emote: { tag: Emote; at: number } | null = null;

export const avatar = {
  emit(e: AvatarEvent) {
    last = e;
    if (isEmote(e)) emote = { tag: e.slice(6) as Emote, at: now() };
    else lastState = toState(e);
    subs.forEach((f) => f(e));
  },
  on(f: Fn) { subs.add(f); return () => { subs.delete(f); }; },
  get last() { return last; },
  /** current talk state (emote events don't change it) */
  get state() { return lastState; },
};

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
export const EMOTE_DECAY_MS = 4000;
export function isEmote(e: AvatarEvent): e is `emote:${Emote}` { return e.startsWith("emote:"); }

/** Per-frame read: the active emote and its weight (1 → 0 over ~4 s, smooth). */
export function readEmote(): { tag: Emote; w: number } | null {
  if (!emote) return null;
  const k = (now() - emote.at) / EMOTE_DECAY_MS;
  if (k >= 1) { emote = null; return null; }
  const rise = Math.min(1, k * 8); // ~0.5 s fade in
  return { tag: emote.tag, w: rise * (1 - k * k * (3 - 2 * k)) };
}

export function toState(e: AvatarEvent): TalkState {
  if (isEmote(e)) return lastState;
  return e === "speak:start" ? "speak" : e === "speak:end" ? "idle" : e;
}

const KW: [Emote, RegExp][] = [
  ["happy", /(\b(haha|yay|love|glad|great|awesome|nice)\b|[😄😊😁🥰❤️💖✨])/iu],
  ["sad", /(\b(sorry|sad|miss|unfortunately)\b|[😢😭💔])/iu],
  ["angry", /(\b(angry|annoyed|ugh)\b|[😠😡])/iu],
  ["surprised", /(\b(wow|whoa|omg|really\?)\b|[😮😲🤯])/iu],
  ["relaxed", /(\b(chill|relax|calm|cozy)\b|[😌])/iu],
];
/** Own heuristic (no ML, no third-party code): a leading [emo:x] tag wins, else first keyword match. Returns clean text. */
export function pickEmote(text: string): { emote: Emote | null; text: string } {
  const m = /^\s*\[emo:([a-z]+)\]\s*/i.exec(text);
  if (m) {
    const tag = m[1].toLowerCase() as Emote;
    return { emote: (EMOTES as readonly string[]).includes(tag) ? tag : null, text: text.slice(m[0].length) };
  }
  for (const [tag, re] of KW) if (re.test(text)) return { emote: tag, text };
  return { emote: null, text };
}

/** Fallback: no WebGL only. Box/SwiftShader often reports deviceMemory < 4 — never block 3D on that. Reduced-motion still prefers sticker unless FORCE_3D. */
export function canRun3D(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("rakaza-force-3d") === "1") {
      /* user/dev override */
    } else if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return false;
    }
  } catch { /* ignore */ }
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
