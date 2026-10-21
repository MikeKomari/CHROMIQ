"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

export type ColorSwatch = { label: string; value: string };

type Hsv = { h: number; s: number; v: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function hsvToHex({ h, s, v }: Hsv) {
  const sat = s / 100;
  const val = v / 100;
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return val - val * sat * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return `#${[5, 3, 1]
    .map((n) =>
      Math.round(channel(n) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Hue is kept from `previous` when the color has no hue of its own (grey or black). */
function hexToHsv(hex: string, previous: Hsv): Hsv {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  let h = previous.h;
  if (delta > 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60 + 360) % 360;
  }
  return {
    h: Math.min(h, 359),
    s: max === 0 ? 0 : Math.round((delta / max) * 100),
    v: Math.round(max * 100),
  };
}

function parseHex(input: string): string | null {
  const text = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(text))
    return `#${text
      .split("")
      .map((char) => char + char)
      .join("")
      .toLowerCase()}`;
  if (/^[0-9a-f]{6}$/i.test(text)) return `#${text.toLowerCase()}`;
  return null;
}

export function ColorPicker({
  value,
  onChange,
  label,
  swatches,
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
  swatches?: ColorSwatch[];
}) {
  const initial = parseHex(value) ?? "#808080";
  const [hsv, setHsv] = useState<Hsv>(() =>
    hexToHsv(initial, { h: 0, s: 0, v: 0 }),
  );
  const [hexText, setHexText] = useState(initial);
  const [invalid, setInvalid] = useState(false);
  const lastEmitted = useRef(initial);

  // Re-sync only when the value was changed from outside (undo, lock, randomize), so hue survives s = 0.
  useEffect(() => {
    const next = parseHex(value);
    if (!next || next === lastEmitted.current) return;
    lastEmitted.current = next;
    setHsv((current) => hexToHsv(next, current));
    setHexText(next);
    setInvalid(false);
  }, [value]);

  const emit = (next: Hsv) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setHexText(hex);
    setInvalid(false);
    if (hex === lastEmitted.current) return;
    lastEmitted.current = hex;
    onChange(hex);
  };

  const commitHex = (hex: string) => {
    setHexText(hex);
    setInvalid(false);
    if (hex === lastEmitted.current) return;
    lastEmitted.current = hex;
    setHsv((current) => hexToHsv(hex, current));
    onChange(hex);
  };

  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    emit({
      h: hsv.h,
      s: Math.round(clamp((event.clientX - rect.left) / rect.width, 0, 1) * 100),
      v: Math.round(
        (1 - clamp((event.clientY - rect.top) / rect.height, 0, 1)) * 100,
      ),
    });
  };

  const onSquareKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 1;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = delta[event.key];
    if (!move) return;
    event.preventDefault();
    emit({
      h: hsv.h,
      s: clamp(hsv.s + move[0], 0, 100),
      v: clamp(hsv.v + move[1], 0, 100),
    });
  };

  const current = parseHex(value) ?? hsvToHex(hsv);
  return (
    <div className="color-picker" role="group" aria-label={`${label} color picker`}>
      <div
        className="color-picker-square"
        role="slider"
        tabIndex={0}
        aria-label={`${label} saturation and brightness`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hsv.s}
        aria-valuetext={`Saturation ${hsv.s}%, brightness ${hsv.v}%`}
        style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.focus();
          pick(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            pick(event);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onKeyDown={onSquareKeyDown}
      >
        <span
          className="color-picker-thumb"
          style={{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
            background: current,
          }}
        />
      </div>
      <input
        type="range"
        className="color-picker-hue"
        min={0}
        max={359}
        value={hsv.h}
        aria-label={`${label} hue`}
        onChange={(event) => emit({ ...hsv, h: Number(event.target.value) })}
      />
      <div className="color-picker-field">
        <span
          className="color-picker-preview"
          style={{ background: current }}
          aria-hidden="true"
        />
        <input
          type="text"
          className="color-picker-hex"
          value={hexText}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          aria-label={`${label} hex`}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            setHexText(event.target.value);
            setInvalid(false);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            const hex = parseHex(hexText);
            if (hex) commitHex(hex);
            else setInvalid(true);
          }}
          onBlur={() => {
            const hex = parseHex(hexText);
            if (hex) commitHex(hex);
            else {
              setHexText(lastEmitted.current);
              setInvalid(false);
            }
          }}
        />
      </div>
      {swatches && swatches.length > 0 && (
        <div className="color-picker-swatches">
          {swatches.map((swatch, index) => (
            <button
              key={`${swatch.label}-${index}`}
              type="button"
              className="color-picker-swatch"
              style={{ background: swatch.value }}
              title={`${swatch.label} ${swatch.value}`}
              aria-label={`${swatch.label} ${swatch.value}`}
              aria-pressed={swatch.value.toLowerCase() === current}
              onClick={() => {
                const hex = parseHex(swatch.value);
                if (hex) commitHex(hex);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
