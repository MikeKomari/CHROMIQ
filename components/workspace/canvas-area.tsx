import {
  ArrowDownToLine,
  Bookmark,
  Eye,
  FileInput,
  Grid2X2,
  Redo2,
  Undo2,
} from "lucide-react";
import { motion } from "motion/react";
import { PreviewSurface } from "@/components/workspace/preview-surface";
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
              <option value="dashboard">Dashboard</option>
              <option value="commerce">Commerce</option>
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
        <div className="canvas-note">
          <span className="mono-label">LIVE PREVIEW</span>
          <span>Changes apply instantly</span>
        </div>
        <div
          className={`preview-frame ${view === "compare" ? "compare-frame" : ""} viewport-${viewport} zoom-${Math.round(zoom * 100)}`}
          style={
            {
              "--preview-custom-width": `${customWidth}px`,
            } as React.CSSProperties
          }
        >
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
            mode={mode}
            variant={view === "compare" ? "a" : "single"}
            surface={surface}
          />
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
          </span>
          <span className="mono-label">
            {viewport === "mobile"
              ? "390 × 844"
              : viewport === "tablet"
                ? "768 × 1024"
                : "1440 × 900"}
          </span>
        </div>
      </div>
    </motion.section>
  );
}
