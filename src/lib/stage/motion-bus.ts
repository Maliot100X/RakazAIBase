"use client";
/**
 * Stage bus: the one place the UI talks to the 3D stage.
 *  - songs: she performs ONE thing, the song that is playing (lip-sync, beat-synced dance, stage lights)
 *  - 18+ club: an age-gated flag that changes the stage scene and swaps in the slow sultry choreography
 * The stage reads it once per frame; React UI subscribes through useStage(). Nothing here records audio or touches the network.
 */
import { useSyncExternalStore } from "react";
// Songs are Phase 3+ (HOLD): song-player / song-prep are not ported. Song entry points are no-op stubs.

type State = { bold: boolean; /** age gate confirmed for this browser session */ confirmed: boolean };

let state: State = { bold: false, confirmed: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function getStage(): State {
  return state;
}

/** Phase 3+ HOLD: no songbook in this slice. */
export function requestSong(_topic: string | null): null {
  return null;
}

/** Stop whatever she is performing (nothing to stop until songs land). */
export function stopPerformance() {}

const KEY = "rk-18-ok";
/** Has this browser session already passed the 18+ gate? */
export function isAdultConfirmed(): boolean {
  if (state.confirmed) return true;
  try {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(KEY) === "1") {
      state = { ...state, confirmed: true };
      return true;
    }
  } catch {
    /* storage blocked: the in-memory flag still works */
  }
  return false;
}

/** True only while the 18+ club mode is on and the age gate was confirmed in this browser session. The chat sends this as `adult`. */
export function isAdultMode(): boolean {
  return state.bold && isAdultConfirmed();
}

/** The user ticked "I am 18 or older" and pressed Enter in the gate dialog. */
export function confirmAdult() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
  state = { ...state, confirmed: true };
  emit();
}

/** 18+ club on or off. Only turned on after the age gate (see AdultToggle). */
export function setBold(bold: boolean) {
  if (bold && !isAdultConfirmed()) return;
  if (state.bold === bold) return;
  state = { ...state, bold };
  emit();
}

export function useStage(): State {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}
