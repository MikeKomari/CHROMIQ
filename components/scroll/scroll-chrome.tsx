"use client";

import type { ReactNode } from "react";
import { useScrollProgress } from "./use-in-view";

/**
 * Chrome that stays put while the page scrolls behind it: a mark in one
 * corner, an action in another, and a scroll hint that fades out once the
 * viewer has started scrolling and no longer needs telling.
 *
 * Rendered outside <main> so it is not announced as page content; each slot
 * carries its own semantics from the caller.
 */
export function ScrollChrome({
  mark,
  action,
  hint,
  note,
}: {
  mark?: ReactNode;
  action?: ReactNode;
  hint?: ReactNode;
  note?: ReactNode;
}) {
  const progress = useScrollProgress();
  const started = progress > 0.02;

  return (
    <div className="sc-chrome" data-scrolled={started ? "true" : "false"}>
      {mark && <div className="sc-chrome-mark">{mark}</div>}
      {action && <div className="sc-chrome-action">{action}</div>}
      {hint && (
        <div className="sc-chrome-hint" aria-hidden="true">
          {hint}
        </div>
      )}
      {note && <div className="sc-chrome-note">{note}</div>}
      <div
        className="sc-chrome-progress"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden="true"
      />
    </div>
  );
}
