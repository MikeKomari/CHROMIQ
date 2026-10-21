"use client";

import { visionModes, type VisionMode } from "@/lib/vision";
import type { PreviewSurfaceKind } from "@/types/workspace";

/** Status line under the preview: source, surface and vision pickers, and the size readout. */
export function StageStatus({
  surface,
  setSurface,
  vision,
  setVision,
  size,
}: {
  surface: PreviewSurfaceKind;
  setSurface: (surface: PreviewSurfaceKind) => void;
  vision: VisionMode;
  setVision: (vision: VisionMode) => void;
  size: string;
}) {
  const simulated = vision !== "none";
  const visionNote = visionModes.find((item) => item.value === vision)?.note ?? "";
  return (
    <div className="canvas-footer">
      <div className="status-left">
        <span className="status-live">
          <span className="green-dot" /> Live DOM preview
        </span>
        <label className="toolbar-select status-select">
          <span className="sr-only">Preview surface</span>
          <select
            value={surface}
            onChange={(event) => setSurface(event.target.value as PreviewSurfaceKind)}
            aria-label="Preview surface"
          >
            <option value="editorial">Editorial</option>
            <option value="saas">SaaS landing</option>
            <option value="dashboard">Dashboard</option>
            <option value="commerce">Commerce</option>
            <option value="docs">Docs</option>
            <option value="specimen">Type specimen</option>
          </select>
        </label>
        <label className="toolbar-select vision-select status-select">
          <span className="sr-only">Color vision simulation</span>
          <select
            value={vision}
            onChange={(event) => setVision(event.target.value as VisionMode)}
            aria-label="Color vision simulation"
            title={simulated ? `${visionNote} (approximation, not a diagnosis)` : "Color vision simulation"}
          >
            {visionModes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        {simulated && (
          <span className="is-simulated" role="status">
            Simulated: {visionNote.toLowerCase()}. An approximation, not a diagnosis.
          </span>
        )}
      </div>
      <span className="mono-label status-size">{size}</span>
    </div>
  );
}
