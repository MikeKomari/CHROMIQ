"use client";

import { useCallback, useEffect, useState } from "react";
import { CONTRAST_STORAGE_KEY as STORAGE_KEY } from "@/lib/contrast-boot";
import type { ContrastLevel } from "@/types/workspace";

const EVENT = "chromiq-contrast-change";

export function readContrast(): ContrastLevel {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "high"
      ? "high"
      : "comfort";
  } catch {
    return "comfort";
  }
}

function applyContrast(level: ContrastLevel) {
  document.documentElement.dataset.contrast = level;
}

/** App-wide reading-comfort preference, shared by the landing page and workspace. */
export function useContrast() {
  const [contrast, setContrastState] = useState<ContrastLevel>("comfort");

  useEffect(() => {
    const sync = () => {
      const level = readContrast();
      setContrastState(level);
      applyContrast(level);
    };
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setContrast = useCallback((level: ContrastLevel) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, level);
    } catch {}
    applyContrast(level);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [contrast, setContrast] as const;
}

