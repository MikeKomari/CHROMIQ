import { Check, Copy, Redo2, RotateCcw, Sparkles, Undo2 } from "lucide-react";
import { useState } from "react";
import type { Tokens } from "@/types/workspace";
import {
  initialRestyleState,
  restyleFontNames,
  type PaletteEntry,
  type RestyleState,
} from "./restyle-engine";

const WEIGHTS = [300, 400, 500, 600, 700];

type Commit = (patch: Partial<RestyleState>, key: string) => void;

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="restyle-field">
      <span className="restyle-field-head">
        <span>{label}</span>
        <output>{display}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="restyle-field">
      <span className="restyle-field-head">
        <span>{label}</span>
      </span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Original</option>
        {restyleFontNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

function WeightSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="restyle-field">
      <span className="restyle-field-head">
        <span>{label}</span>
      </span>
      <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
        <option value={0}>Original</option>
        {WEIGHTS.map((weight) => (
          <option key={weight} value={weight}>
            {weight}
          </option>
        ))}
      </select>
    </label>
  );
}

export function RestyleControls({
  state,
  commit,
  palette,
  tokens,
  disabled,
  canUndo,
  canRedo,
  undo,
  redo,
  getCss,
}: {
  state: RestyleState;
  commit: Commit;
  palette: PaletteEntry[];
  tokens: Tokens;
  disabled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  getCss: () => string;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const copy = async () => {
    const text = getCss();
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      area.remove();
    }
    setCopyFailed(!ok);
    setCopied(ok);
    window.setTimeout(() => {
      setCopied(false);
      setCopyFailed(false);
    }, 1800);
  };

  const applyTokens = () =>
    commit(
      {
        headingFont: tokens.displayFont,
        bodyFont: tokens.bodyFont,
        lineHeight: tokens.lineHeight,
        letterSpacing: 0,
        accent: tokens.accent,
        radius: tokens.radius,
      },
      "tokens",
    );

  return (
    <aside className="restyle-controls" aria-label="Restyle controls">
      <div className="restyle-controls-bar">
        <span className="eyebrow">Restyle</span>
        <div className="restyle-icon-row">
          <button className="icon-button" onClick={undo} disabled={!canUndo} aria-label="Undo restyle change">
            <Undo2 size={15} />
          </button>
          <button className="icon-button" onClick={redo} disabled={!canRedo} aria-label="Redo restyle change">
            <Redo2 size={15} />
          </button>
        </div>
      </div>
      <fieldset className="restyle-fieldset" disabled={disabled}>
        <legend>Size</legend>
        <Slider
          label="Text size"
          value={state.textScale}
          min={50}
          max={200}
          step={5}
          display={`${state.textScale}%`}
          onChange={(textScale) => commit({ textScale }, "textScale")}
        />
        <Slider
          label="Heading size"
          value={state.headingScale}
          min={50}
          max={200}
          step={5}
          display={`${state.headingScale}%`}
          onChange={(headingScale) => commit({ headingScale }, "headingScale")}
        />
      </fieldset>
      <fieldset className="restyle-fieldset" disabled={disabled}>
        <legend>Type</legend>
        <FontSelect label="Heading font" value={state.headingFont} onChange={(headingFont) => commit({ headingFont }, "headingFont")} />
        <WeightSelect label="Heading weight" value={state.headingWeight} onChange={(headingWeight) => commit({ headingWeight }, "headingWeight")} />
        <FontSelect label="Body font" value={state.bodyFont} onChange={(bodyFont) => commit({ bodyFont }, "bodyFont")} />
        <WeightSelect label="Body weight" value={state.bodyWeight} onChange={(bodyWeight) => commit({ bodyWeight }, "bodyWeight")} />
        <div className="restyle-field">
          <span className="restyle-field-head">
            <span>Line height</span>
            <output>{state.lineHeight ? state.lineHeight.toFixed(2) : "Original"}</output>
          </span>
          <div className="restyle-inline">
            <input
              type="range"
              aria-label="Line height"
              min={1}
              max={2.2}
              step={0.05}
              value={state.lineHeight || 1.5}
              onChange={(event) => commit({ lineHeight: Number(event.target.value) }, "lineHeight")}
            />
            <button
              className="restyle-chip-button"
              onClick={() => commit({ lineHeight: 0 }, "lineHeight-reset")}
              disabled={!state.lineHeight}
            >
              Original
            </button>
          </div>
        </div>
        <Slider
          label="Letter spacing"
          value={state.letterSpacing}
          min={-0.05}
          max={0.15}
          step={0.005}
          display={`${state.letterSpacing.toFixed(3)}em`}
          onChange={(letterSpacing) => commit({ letterSpacing }, "letterSpacing")}
        />
      </fieldset>
      <fieldset className="restyle-fieldset" disabled={disabled}>
        <legend>Colors</legend>
        {palette.length === 0 ? (
          <p className="restyle-hint">Load a page to extract its palette.</p>
        ) : (
          <ul className="restyle-palette">
            {palette.map((entry) => {
              const current = state.colors[entry.hex] ?? entry.hex;
              return (
                <li key={entry.hex}>
                  <input
                    type="color"
                    value={current}
                    aria-label={`Replace ${entry.hex}`}
                    onChange={(event) =>
                      commit({ colors: { ...state.colors, [entry.hex]: event.target.value } }, `color:${entry.hex}`)
                    }
                  />
                  <span className="restyle-palette-text">
                    <code>{entry.hex}</code>
                    <small>{entry.uses.join(", ")}</small>
                  </span>
                  {state.colors[entry.hex] && (
                    <button
                      className="restyle-chip-button"
                      onClick={() => {
                        const next = { ...state.colors };
                        delete next[entry.hex];
                        commit({ colors: next }, `color-reset:${entry.hex}`);
                      }}
                    >
                      Reset
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="restyle-hint">
          Replaces matching text, background and border colors. Gradients and images are left as they are.
        </p>
      </fieldset>
      <div className="restyle-actions">
        <button className="restyle-action" onClick={applyTokens} disabled={disabled}>
          <Sparkles size={14} /> Apply my PRISM tokens
        </button>
        <button
          className="restyle-action"
          onClick={() => commit(initialRestyleState, "reset")}
          disabled={disabled}
        >
          <RotateCcw size={14} /> Reset all
        </button>
        <button className="restyle-action primary" onClick={copy} disabled={disabled} aria-live="polite">
          {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
          {copied ? "Copied" : copyFailed ? "Copy failed" : "Copy override CSS"}
        </button>
      </div>
    </aside>
  );
}
