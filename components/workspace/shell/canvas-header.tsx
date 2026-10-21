"use client";

import {
  ArrowDownToLine,
  Bookmark,
  Eye,
  FileInput,
  Globe2,
  Grid2X2,
  MousePointer2,
  PanelRight,
  Redo2,
  SunMoon,
  Undo2,
} from "lucide-react";
import { motion } from "motion/react";
import { DeviceSwitcher } from "@/components/workspace/shell/device-switcher";
import type { View, Viewport } from "@/types/workspace";

const views = [
  { value: "canvas", label: "Canvas", icon: Eye },
  { value: "compare", label: "Compare", icon: Grid2X2 },
  { value: "themes", label: "Themes", icon: SunMoon },
  { value: "restyle", label: "Restyle", icon: Globe2 },
] as const;

/** The single canvas bar: views left, device switcher center, tools and Export right. */
export function CanvasHeader({
  view,
  setView,
  viewport,
  setViewport,
  zoom,
  setZoom,
  customWidth,
  setCustomWidth,
  selecting,
  toggleSelecting,
  undo,
  redo,
  canUndo,
  canRedo,
  setShowExport,
  setShowImport,
  setShowSnapshots,
  inspectorOpen,
  toggleInspector,
}: {
  view: View;
  setView: (view: View) => void;
  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  customWidth: number;
  setCustomWidth: (width: number) => void;
  selecting: boolean;
  toggleSelecting: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  setShowExport: (show: boolean) => void;
  setShowImport: (show: boolean) => void;
  setShowSnapshots: (show: boolean) => void;
  inspectorOpen: boolean;
  toggleInspector: () => void;
}) {
  return (
    <div className="canvas-toolbar">
      <div className="canvas-header">
        <div className="view-switcher" role="group" aria-label="Views">
          {views.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              className={view === value ? "active" : ""}
              aria-pressed={view === value}
              aria-label={label}
              title={label}
              onClick={() => setView(value)}
            >
              <Icon size={14} /> <span className="view-label">{label}</span>
            </button>
          ))}
        </div>
        <div className="canvas-devices">
          <DeviceSwitcher
            viewport={viewport}
            setViewport={setViewport}
            customWidth={customWidth}
            setCustomWidth={setCustomWidth}
            zoom={zoom}
            setZoom={setZoom}
          />
        </div>
        <div className="toolbar-actions">
          <button
            type="button"
            className={`icon-button tool-toggle ${selecting ? "active" : ""}`}
            onClick={toggleSelecting}
            aria-pressed={selecting}
            aria-label="Select element"
            aria-keyshortcuts="V"
            title="Select element (V)"
          >
            <MousePointer2 size={16} />
          </button>
          <button className="icon-button" onClick={undo} aria-label="Undo" title="Undo" disabled={!canUndo}>
            <Undo2 size={16} />
          </button>
          <button className="icon-button" onClick={redo} aria-label="Redo" title="Redo" disabled={!canRedo}>
            <Redo2 size={16} />
          </button>
          <button className="icon-button" onClick={() => setShowSnapshots(true)} aria-label="Save snapshot" title="Save snapshot">
            <Bookmark size={16} />
          </button>
          <button className="icon-button" onClick={() => setShowImport(true)} aria-label="Import tokens" title="Import tokens">
            <FileInput size={16} />
          </button>
          <motion.button className="export-button" whileTap={{ scale: 0.97 }} onClick={() => setShowExport(true)}>
            <ArrowDownToLine size={15} /> Export
          </motion.button>
          <button
            id="inspector-toggle"
            type="button"
            className="icon-button inspector-toggle"
            aria-label={inspectorOpen ? "Hide inspector" : "Show inspector"}
            aria-expanded={inspectorOpen}
            aria-controls="inspector"
            title={inspectorOpen ? "Hide inspector" : "Show inspector"}
            onClick={toggleInspector}
          >
            <PanelRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
