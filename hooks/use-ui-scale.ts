"use client";

import { useCallback, useEffect, useState } from "react";
import { UI_SCALE_STORAGE_KEY as STORAGE_KEY } from "@/lib/contrast-boot";
import type { UiScale } from "@/types/workspace";

const EVENT = "chromiq-ui-scale-change";
export const UI_SCALES: UiScale[] = ["default", "large", "xlarge"];

export function readUiScale(): UiScale {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "large" || value === "xlarge" ? value : "default";
  } catch {
    return "default";
  }
}

function applyUiScale(scale: UiScale) {
  document.documentElement.dataset.uiScale = scale;
}

/** App-wide interface text size, stored locally and applied via a data attribute. */
export function useUiScale() {
  const [scale, setScaleState] = useState<UiScale>("default");

  useEffect(() => {
    const sync = () => {
      const next = readUiScale();
      setScaleState(next);
      applyUiScale(next);
    };
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setScale = useCallback((next: UiScale) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    applyUiScale(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [scale, setScale] as const;
}
