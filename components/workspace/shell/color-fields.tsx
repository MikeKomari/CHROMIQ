"use client";

import { useEffect, useRef, useState } from "react";
import { RAMP_STEPS, colorRamp, type RampStep } from "@/lib/scales";
import { ColorPicker, type ColorSwatch } from "@/components/ui/color-picker";
import type { TokenUpdate, Tokens } from "@/types/workspace";

export function AccentScale({ accent }: { accent: string }) {
  const [copied, setCopied] = useState<RampStep | null>(null);
  useEffect(() => {
    if (copied === null) return;
    const timer = window.setTimeout(() => setCopied(null), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const ramp = colorRamp(accent);
  const copy = async (step: RampStep, hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(step);
    } catch {
      /* clipboard unavailable; leave the swatch unchanged */
    }
  };
  return (
    <div className="accent-scale">
      <div className="contrast-group-label">Accent scale</div>
      <div className="accent-scale-strip">
        {RAMP_STEPS.map((step) => (
          <button
            key={step}
            type="button"
            className={`accent-scale-step ${copied === step ? "copied" : ""}`}
            onClick={() => copy(step, ramp[step])}
            aria-label={`Copy accent ${step} ${ramp[step]}`}
            title={ramp[step]}
          >
            <span className="accent-scale-swatch" style={{ background: ramp[step] }} />
            <span className="accent-scale-label">{step}</span>
          </button>
        ))}
      </div>
      <span className="accent-scale-status" role="status">
        {copied === null ? "" : `Copied ${ramp[copied]}`}
      </span>
    </div>
  );
}

export function ColorRow({
  label,
  value,
  token,
  updateTokens,
  locked = false,
  toggleLock,
  lockable = true,
  open,
  setOpen,
  swatches,
}: {
  label: string;
  value: string;
  token: string;
  updateTokens: TokenUpdate;
  locked?: boolean;
  toggleLock?: (key: string) => void;
  lockable?: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  swatches: ColorSwatch[];
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <div
      className="color-entry"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        event.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }}
    >
      <div className="color-row">
        <button
          ref={trigger}
          type="button"
          className="color-row-swatch"
          style={{ background: value }}
          aria-label={`Edit ${label}`}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        />
        <span>
          <strong>{label}</strong>
          <small>--chromiq-{token.replace(/([A-Z])/g, "-$1").toLowerCase()}</small>
        </span>
        <code>{value}</code>
        {lockable && toggleLock && (
          <button
            className={`lock-button ${locked ? "locked" : ""}`}
            onClick={() => toggleLock(token)}
            aria-label={`${locked ? "Release" : "Lock"} ${label}`}
          >
            {locked ? "●" : "○"}
          </button>
        )}
      </div>
      {open && (
        <ColorPicker
          value={value}
          label={label}
          swatches={swatches}
          onChange={(hex) =>
            updateTokens({ [token]: hex } as Partial<Tokens>, { coalesce: true })
          }
        />
      )}
    </div>
  );
}
