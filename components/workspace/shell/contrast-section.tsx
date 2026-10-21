"use client";

import { TriangleAlert, Wand2 } from "lucide-react";
import { contrastRatio, contrastStatus, semanticPairs } from "@/lib/contrast";
import type { Mode, Tokens } from "@/types/workspace";

export function ContrastSection({
  tokens,
  contrastMessage,
  fixContrast,
}: {
  tokens: Tokens;
  contrastMessage: string | null;
  fixContrast: (label: string, theme: Mode) => void;
}) {
  const pairs = semanticPairs(tokens);
  return (
    <div className="panel-content">
      <div
        className={contrastMessage ? "panel-warning contrast-message" : undefined}
        role="status"
      >
        {contrastMessage && (
          <>
            <TriangleAlert size={13} /> {contrastMessage}
          </>
        )}
      </div>
      {(["light", "dark"] as const).map((theme) => (
        <div key={theme}>
          <div className="contrast-group-label">
            {theme === "light" ? "Light theme" : "Dark theme"}
          </div>
          <div className="palette-stack">
            {pairs
              .filter((pair) => pair.theme === theme)
              .map((pair) => {
                const ratio = contrastRatio(pair.fg, pair.bg);
                const failing = ratio < pair.min;
                const status = failing ? "Fail" : contrastStatus(ratio);
                return (
                  <div className="contrast-row" key={`${theme}-${pair.label}`}>
                    <span
                      className="contrast-swatch"
                      style={{ background: pair.bg, color: pair.fg }}
                    >
                      Aa
                    </span>
                    <span>
                      <strong>{pair.label}</strong>
                      <small>
                        {ratio.toFixed(2)}:1
                        {failing ? ` · needs ${pair.min}:1` : ""}
                      </small>
                    </span>
                    <span className={`pass-badge ${failing ? "fail" : ""}`}>
                      {failing ? "FAIL" : status.toUpperCase()}
                    </span>
                    {failing && (
                      <button
                        type="button"
                        className="fix-button"
                        onClick={() => fixContrast(pair.label, theme)}
                        aria-label={`Fix ${pair.label}, ${theme} theme`}
                      >
                        <Wand2 size={12} /> Fix
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
