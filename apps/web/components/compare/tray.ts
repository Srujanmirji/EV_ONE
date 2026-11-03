"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { MAX_COMPARE } from "@/lib/compare";

const KEY = "evone.compare";
const EVENT = "evone-compare";

/**
 * Convenience list of variant ids the visitor is collecting for a
 * comparison. The URL (/compare?ids=…) is what renders and gets shared;
 * this only helps build it. Storage may be unavailable (private mode),
 * so every access is guarded and the UI still works without it.
 */
function readRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function parse(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value
          .filter((v): v is string => typeof v === "string")
          .slice(0, MAX_COMPARE)
      : [];
  } catch {
    return [];
  }
}

export function writeTray(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX_COMPARE)));
  } catch {
    // Storage blocked: the tray simply does not persist.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useCompareTray() {
  // The snapshot is the raw string, so it is stable between reads; on the
  // server it is null, which renders the controls disabled until hydrated.
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const ids = useMemo(() => (raw === null ? [] : parse(raw)), [raw]);

  const add = useCallback((id: string) => {
    const current = parse(readRaw());
    if (!current.includes(id) && current.length < MAX_COMPARE)
      writeTray([...current, id]);
  }, []);
  const remove = useCallback(
    (id: string) => writeTray(parse(readRaw()).filter((x) => x !== id)),
    [],
  );

  return { ids, ready: raw !== null, add, remove };
}
