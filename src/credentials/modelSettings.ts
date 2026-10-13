import { useCallback, useEffect, useState } from "react";
import type { ModelSettings, ThinkingLevel } from "./types";

export const thinkingLevelLabel: Record<ThinkingLevel, string> = {
  off: "关 Off",
  minimal: "极简 Minimal",
  low: "低 Low",
  medium: "中 Medium",
  high: "高 High",
  xhigh: "超高 XHigh",
  max: "最大 Max",
};

const CHANGED_EVENT = "model-settings:changed";

export function notifyModelSettingsChanged() {
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

export function useModelSettings(refreshKey: string) {
  const available = typeof window !== "undefined" && Boolean(window.piDesktop?.getModelSettings);
  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(CHANGED_EVENT, bump);
    return () => window.removeEventListener(CHANGED_EVENT, bump);
  }, []);

  useEffect(() => {
    const desktop = window.piDesktop;
    if (!desktop?.getModelSettings) return;
    let cancelled = false;
    desktop.getModelSettings().then(
      (next) => {
        if (cancelled) return;
        setSettings(next);
        setError(null);
      },
      (reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "读取模型参数失败");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [refreshKey, revision]);

  const chooseThinkingLevel = useCallback(async (level: ThinkingLevel) => {
    const desktop = window.piDesktop;
    if (!desktop?.setThinkingLevel) return;
    let previous: ModelSettings | null = null;
    setSettings((current) => {
      previous = current;
      return current ? { ...current, thinkingLevel: level } : current;
    });
    setSaving(true);
    try {
      const result = await desktop.setThinkingLevel(level);
      if (result.ok) {
        setSettings(result.settings);
        setError(null);
      } else {
        setSettings(previous);
        setError(result.message ?? "保存思考档位失败");
      }
    } catch (reason) {
      setSettings(previous);
      setError(reason instanceof Error ? reason.message : "保存思考档位失败");
    } finally {
      setSaving(false);
    }
  }, []);

  return { available, settings, error, saving, chooseThinkingLevel };
}
