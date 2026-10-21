"use client";

import { useId, useState } from "react";
import { loadFontFamily } from "@/lib/fonts";
import type { FontEntry, TokenUpdateOptions } from "@/types/workspace";

/** A slider with an exact-value number field beside it. */
export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  decimals = 0,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  unit?: string;
  onChange: (value: number, options?: TokenUpdateOptions) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value.toFixed(decimals);
  const onType = (raw: string) => {
    setDraft(raw);
    const next = Number(raw);
    if (raw.trim() !== "" && !Number.isNaN(next) && next >= min && next <= max) onChange(next, { coalesce: true });
  };
  return (
    <div className="slider-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value), { coalesce: true })}
      />
      <span className="slider-number">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={shown}
          aria-label={`${label} value`}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => onType(event.target.value)}
          onBlur={() => setDraft(null)}
        />
        {unit && <span aria-hidden="true">{unit}</span>}
      </span>
    </div>
  );
}

export function FontSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FontEntry[];
}) {
  return (
    <label className="font-select">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          loadFontFamily(next);
          onChange(next);
        }}
      >
        {options.map((font) => (
          <option key={font.name} value={font.name} style={{ fontFamily: `"${font.name}"` }}>
            {font.name}
          </option>
        ))}
      </select>
    </label>
  );
}
