"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Minus, Monitor, Plus, Smartphone, Tablet } from "lucide-react";
import type { Viewport } from "@/types/workspace";

const devices = [
  { value: "desktop", label: "Desktop", width: 1440, icon: Monitor },
  { value: "tablet", label: "Tablet", width: 768, icon: Tablet },
  { value: "mobile", label: "Mobile", width: 390, icon: Smartphone },
] as const;
const zoomSteps = [0.5, 0.75, 1, 1.25, 1.5];
const MIN_WIDTH = 320;
const MAX_WIDTH = 2560;

export function DeviceSwitcher({
  viewport,
  setViewport,
  customWidth,
  setCustomWidth,
  zoom,
  setZoom,
}: {
  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;
  customWidth: number;
  setCustomWidth: (width: number) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
}) {
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  const [draft, setDraft] = useState<string | null>(null);
  const activeIndex = devices.findIndex((device) => device.value === viewport);
  const activeWidth =
    viewport === "custom" ? customWidth : (devices[activeIndex]?.width ?? customWidth);
  const zoomIndex = zoomSteps.reduce(
    (best, step, index) =>
      Math.abs(step - zoom) < Math.abs(zoomSteps[best] - zoom) ? index : best,
    0,
  );

  const commitWidth = () => {
    const next = Number(draft);
    setDraft(null);
    if (draft === null || draft.trim() === "" || Number.isNaN(next)) return;
    const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(next)));
    if (width === activeWidth) return;
    setCustomWidth(width);
    setViewport("custom");
  };

  const onRadioKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (Math.max(activeIndex, 0) + step + devices.length) % devices.length;
    setViewport(devices[next].value);
    radios.current[next]?.focus();
  };

  return (
    <div className="device-switcher">
      <div
        className="device-radios"
        role="radiogroup"
        aria-label="Preview device"
        onKeyDown={onRadioKey}
      >
        {devices.map((device, index) => {
          const Icon = device.icon;
          const checked = device.value === viewport;
          return (
            <button
              key={device.value}
              ref={(node) => {
                radios.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={`${device.label} ${device.width} px`}
              title={`${device.label} ${device.width} px`}
              tabIndex={checked || (activeIndex < 0 && index === 0) ? 0 : -1}
              className={checked ? "active" : ""}
              onClick={() => setViewport(device.value)}
            >
              <Icon size={15} />
            </button>
          );
        })}
      </div>
      <label className="device-width">
        <span className="sr-only">Preview width in pixels</span>
        <input
          type="number"
          min={MIN_WIDTH}
          max={MAX_WIDTH}
          step={10}
          value={draft ?? String(activeWidth)}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitWidth}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitWidth();
            } else if (event.key === "Escape") {
              setDraft(null);
            }
          }}
          aria-label="Preview width in pixels"
        />
        <span aria-hidden="true">px</span>
      </label>
      <div className="zoom-stepper" role="group" aria-label="Preview zoom">
        <button
          type="button"
          aria-label="Zoom out"
          title="Zoom out"
          disabled={zoomIndex === 0}
          onClick={() => setZoom(zoomSteps[zoomIndex - 1])}
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          className="zoom-readout"
          aria-label={`Zoom ${Math.round(zoom * 100)}%, reset to 100%`}
          title="Reset zoom to 100%"
          onClick={() => setZoom(1)}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          title="Zoom in"
          disabled={zoomIndex === zoomSteps.length - 1}
          onClick={() => setZoom(zoomSteps[zoomIndex + 1])}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
