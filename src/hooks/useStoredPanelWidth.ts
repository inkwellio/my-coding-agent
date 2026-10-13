import { useCallback, useEffect, useState } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function useStoredPanelWidth(storageKey: string, defaultWidth: number, min: number, max: number) {
  const [width, setWidthState] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw == null) return defaultWidth;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? clamp(parsed, min, max) : defaultWidth;
    } catch {
      return defaultWidth;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(width));
    } catch {
      /* ignore quota / private mode */
    }
  }, [storageKey, width]);

  const setWidth = useCallback(
    (next: number | ((current: number) => number)) => {
      setWidthState((current) => {
        const resolved = typeof next === "function" ? next(current) : next;
        return clamp(resolved, min, max);
      });
    },
    [min, max],
  );

  const reset = useCallback(() => setWidth(defaultWidth), [defaultWidth, setWidth]);

  return { width, setWidth, reset, min, max, defaultWidth };
}
