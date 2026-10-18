import { useCallback, useRef, useState } from "react";
import { initialRestyleState, type RestyleState } from "./restyle-engine";

type History = { past: RestyleState[]; present: RestyleState; future: RestyleState[] };

const COALESCE_MS = 700;

export function useRestyleState() {
  const [history, setHistory] = useState<History>({
    past: [],
    present: initialRestyleState,
    future: [],
  });
  const last = useRef({ key: "", time: 0 });

  /** Changes sharing a key within a short window (slider drags) become one undo step. */
  const commit = useCallback((patch: Partial<RestyleState>, key: string) => {
    const now = Date.now();
    const merge = last.current.key === key && now - last.current.time < COALESCE_MS;
    last.current = { key, time: now };
    setHistory((h) => ({
      past: merge ? h.past : [...h.past, h.present].slice(-60),
      present: { ...h.present, ...patch },
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    last.current = { key: "", time: 0 };
    setHistory((h) =>
      h.past.length
        ? {
            past: h.past.slice(0, -1),
            present: h.past[h.past.length - 1],
            future: [h.present, ...h.future],
          }
        : h,
    );
  }, []);

  const redo = useCallback(() => {
    last.current = { key: "", time: 0 };
    setHistory((h) =>
      h.future.length
        ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
        : h,
    );
  }, []);

  const clear = useCallback(() => {
    last.current = { key: "", time: 0 };
    setHistory({ past: [], present: initialRestyleState, future: [] });
  }, []);

  return {
    state: history.present,
    commit,
    undo,
    redo,
    clear,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
