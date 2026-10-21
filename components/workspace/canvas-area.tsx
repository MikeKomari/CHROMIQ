import { useState } from "react";
import {
  ArrowDownToLine,
  Bookmark,
  Eye,
  FileInput,
  Globe2,
  Grid2X2,
  Redo2,
  SunMoon,
  Undo2,
} from "lucide-react";
import { motion } from "motion/react";
import { PreviewSurface } from "@/components/workspace/preview-surface";
import { VisionFilters } from "@/components/workspace/vision-filters";
import { visionFilter, visionModes, type VisionMode } from "@/lib/vision";
import type {
  Mode,
  PreviewSurfaceKind,
  Tokens,
  View,
  Viewport,
} from "@/types/workspace";

export function CanvasArea({
  mode,
  view,
  setView,
  projectName,
  surface,
  setSurface,
  viewport,
  setViewport,
  zoom,
  setZoom,
  customWidth,
  setCustomWidth,
  compareTokens,
  tokens,
  activeStarter,
  undo,
  redo,
  canUndo,
  canRedo,
  setShowExport,
  setShowImport,
  setShowSnapshots,
}: {
  mode: Mode;
  view: View;
  setView: (view: View) => void;
  projectName: string;
  surface: PreviewSurfaceKind;
  setSurface: (surface: PreviewSurfaceKind) => void;
  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  customWidth: number;
  setCustomWidth: (width: number) => void;
  compareTokens: Tokens | null;
  tokens: Tokens;
  activeStarter: string;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  setShowExport: (show: boolean) => void;
  setShowImport: (show: boolean) => void;
  setShowSnapshots: (show: boolean) => void;
}) {
  const [vision, setVision] = useState<VisionMode>("none");
  const visionNote = visionModes.find((item) => item.value === vision)?.note ?? "";
  const simulated = vision !== "none";
  const size =
    viewport === "custom"
      ? `${customWidth} px wide`
      : viewport === "mobile"
        ? "390 × 844"
        : viewport === "tablet"
          ? "768 × 1024"
          : "1440 × 900";
  const zoomLabel = zoom !== 1 ? ` · ${Math.round(zoom * 100)}%` : "";
  return (
    <motion.section className="canvas-area" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}>
      <div className="canvas-toolbar">
        <div className="toolbar-context">
          <span className="eyebrow">{projectName}</span>
          <span className="slash">/</span>
          <strong>{activeStarter}</strong>
        </div>
        <div className="view-switcher">
          <button
            className={view === "canvas" ? "active" : ""}
            onClick={() => setView("canvas")}
          >
            <Eye size={14} /> Canvas
          </button>
          <button
            className={view === "compare" ? "active" : ""}
            onClick={() => setView("compare")}
          >
            <Grid2X2 size={14} /> Compare
          </button>
          <button
            className={view === "themes" ? "active" : ""}
            onClick={() => setView("themes")}
          >
            <SunMoon size={14} /> Themes
          </button>
          <button
            className={view === "restyle" ? "active" : ""}
            onClick={() => setView("restyle")}
          >
            <Globe2 size={14} /> Restyle
          </button>
        </div>
        <div className="toolbar-actions">
          <label className="toolbar-select">
            <span className="sr-only">Preview surface</span>
            <select
              value={surface}
              onChange={(event) =>
                setSurface(event.target.value as PreviewSurfaceKind)
              }
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
          <label className="toolbar-select compact-select">
            <span className="sr-only">Preview viewport</span>
            <select
              value={viewport}
              onChange={(event) => setViewport(event.target.value as Viewport)}
              aria-label="Preview viewport"
            >
              <option value="desktop">Desktop</option>
              <option value="tablet">Tablet</option>
              <option value="mobile">Mobile</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label className="toolbar-select compact-select">
            <span className="sr-only">Preview zoom</span>
            <select
              value={String(zoom)}
              onChange={(event) => setZoom(Number(event.target.value))}
              aria-label="Preview zoom"
            >
              <option value="0.5">50%</option>
              <option value="0.75">75%</option>
              <option value="1">100%</option>
              <option value="1.25">125%</option>
              <option value="1.5">150%</option>
            </select>
          </label>
          <label className="toolbar-select vision-select">
            <span className="sr-only">Color vision simulation</span>
            <select
              value={vision}
              onChange={(event) => setVision(event.target.value as VisionMode)}
              aria-label="Color vision simulation"
            >
              {visionModes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {viewport === "custom" && (
            <label className="width-input">
              <span className="sr-only">Custom preview width</span>
              <input
                type="number"
                min={320}
                max={2560}
                step={10}
                value={customWidth}
                onChange={(event) => setCustomWidth(Number(event.target.value))}
                aria-label="Custom preview width"
              />
              <span>px</span>
            </label>
          )}
          <button
            className="icon-button"
            onClick={undo}
            aria-label="Undo"
            disabled={!canUndo}
          >
            <Undo2 size={16} />
          </button>
          <button
            className="icon-button"
            onClick={redo}
            aria-label="Redo"
            disabled={!canRedo}
          >
            <Redo2 size={16} />
          </button>
          <button
            className="icon-button"
            onClick={() => setShowSnapshots(true)}
            aria-label="Save snapshot"
          >
            <Bookmark size={16} />
          </button>
          <button
            className="icon-button"
            onClick={() => setShowImport(true)}
            aria-label="Import tokens"
          >
            <FileInput size={16} />
          </button>
          <motion.button className="export-button" whileTap={{ scale: 0.97 }} onClick={() => setShowExport(true)}>
            <ArrowDownToLine size={15} /> Export
          </motion.button>
        </div>
      </div>
      <div className="canvas-workspace">
        <VisionFilters />
        <div className={`canvas-note ${simulated ? "is-simulated" : ""}`}>
          <span className="mono-label">{simulated ? "SIMULATED" : "LIVE PREVIEW"}</span>
          <span>
            {simulated
              ? `${visionNote} · approximation, not a diagnosis`
              : "Changes apply instantly"}
          </span>
        </div>
        <div
          className={`preview-frame ${view === "compare" || view === "themes" ? "compare-frame" : ""} viewport-${viewport} zoom-${Math.round(zoom * 100)}`}
          style={
            {
              "--preview-custom-width": `${customWidth}px`,
              "--vision-filter": visionFilter(vision),
            } as React.CSSProperties
          }
        >
          {view === "themes" && (
            <div className="compare-labels">
              <span>Light theme</span>
              <span>Dark theme</span>
            </div>
          )}
          {view === "compare" && (
            <div className="compare-labels">
              <span>
                Variant A <b>current</b>
              </span>
              <span>
                Variant B <b>alternative</b>
              </span>
            </div>
          )}
          <PreviewSurface
            tokens={tokens}
            mode={view === "themes" ? "light" : mode}
            variant={view === "compare" ? "a" : "single"}
            surface={surface}
          />
          {view === "themes" && (
            <PreviewSurface
              tokens={tokens}
              mode="dark"
              variant="single"
              surface={surface}
            />
          )}
          {view === "compare" && (
            <PreviewSurface
              tokens={
                compareTokens ?? { ...tokens, accent: "#ff6b4a", accentSoft: "#ffe1d9" }
              }
              mode={mode}
              variant="b"
              surface={surface}
            />
          )}
        </div>
        <div className="canvas-footer">
          <span>
            <span className="green-dot" /> Live DOM preview
            {simulated && ` · simulated ${visionNote.toLowerCase()}`}
          </span>
          <span className="mono-label">
            {size}
            {zoomLabel}
          </span>
        </div>
      </div>
    </motion.section>
  );
}
