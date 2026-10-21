import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowDownToLine,
  Bookmark,
  Eye,
  FileInput,
  Globe2,
  Grid2X2,
  Minus,
  Monitor,
  MousePointer2,
  Plus,
  Redo2,
  Smartphone,
  SunMoon,
  Tablet,
  Undo2,
} from "lucide-react";
import { motion } from "motion/react";
import { PreviewSurface } from "@/components/workspace/preview-surface";
import { TokenPopover } from "@/components/workspace/token-popover";
import { VisionFilters } from "@/components/workspace/vision-filters";
import { visionFilter, visionModes, type VisionMode } from "@/lib/vision";
import type {
  Mode,
  PreviewSurfaceKind,
  TokenUpdate,
  Tokens,
  View,
  Viewport,
} from "@/types/workspace";

const devices = [
  { value: "desktop", label: "Desktop", width: 1440, icon: Monitor },
  { value: "tablet", label: "Tablet", width: 768, icon: Tablet },
  { value: "mobile", label: "Mobile", width: 390, icon: Smartphone },
] as const;
const zoomSteps = [0.5, 0.75, 1, 1.25, 1.5];
const MIN_WIDTH = 320;
const MAX_WIDTH = 2560;

type Selection = { el: HTMLElement; mode: Mode; variant: string };

function DeviceSwitcher({
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

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** The HTML element a preview event came from, climbing out of SVG nodes. */
function previewElement(target: EventTarget | null) {
  let node = target instanceof Element ? target : null;
  while (node && !(node instanceof HTMLElement)) node = node.parentElement;
  if (!node || !node.closest(".design-preview") || node.closest(".sf-hint")) return null;
  return node;
}

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
  updateTokens,
  readOnly,
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
  updateTokens: TokenUpdate;
  readOnly: boolean;
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
  const variantBTokens = compareTokens ?? {
    ...tokens,
    accent: "#ff6b4a",
    accentSoft: "#ffe1d9",
  };

  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [workspace, setWorkspace] = useState<HTMLDivElement | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);

  const closeSelection = () => {
    const popover = document.querySelector(".token-popover");
    if (selection && popover?.contains(document.activeElement)) {
      selection.el.focus({ preventScroll: true });
    }
    setSelection(null);
  };

  // The selected element is replaced when the surface or view changes.
  useEffect(() => setSelection(null), [surface, view]);

  useEffect(() => {
    if (!selecting) setSelection(null);
  }, [selecting]);

  useEffect(() => {
    if (!selection) return;
    selection.el.setAttribute("data-select-active", "");
    return () => selection.el.removeAttribute("data-select-active");
  }, [selection]);

  // V toggles the tool; Escape closes the popover first, then leaves select mode.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (document.querySelector(".modal-backdrop")) return;
      if (event.key === "Escape") {
        if (selection) setSelection(null);
        else if (selecting) setSelecting(false);
        else return;
        event.preventDefault();
        return;
      }
      if (event.key.toLowerCase() === "v" && !event.shiftKey && !isTypingTarget(event.target)) {
        event.preventDefault();
        setSelecting((current) => !current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, selecting]);

  // While selecting, the preview is inspected, not used: capture events before the page sees them.
  useEffect(() => {
    if (!selecting || !frame) return;
    let hovered: HTMLElement | null = null;
    const setHover = (el: HTMLElement | null) => {
      if (el === hovered) return;
      hovered?.removeAttribute("data-select-hover");
      el?.setAttribute("data-select-hover", "");
      hovered = el;
    };
    const select = (el: HTMLElement) => {
      const preview = el.closest<HTMLElement>(".design-preview");
      setSelection({
        el,
        mode: preview?.dataset.mode === "dark" ? "dark" : "light",
        variant: preview?.dataset.variant ?? "single",
      });
    };
    const block = (event: Event) => {
      if (!previewElement(event.target)) return null;
      event.preventDefault();
      event.stopPropagation();
      return previewElement(event.target);
    };
    const onClick = (event: MouseEvent) => {
      const el = block(event);
      if (el) select(el);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const el = block(event);
      if (el) select(el);
    };
    const onKeyUp = (event: globalThis.KeyboardEvent) => {
      if (event.key === " ") block(event);
    };
    const onOver = (event: MouseEvent) => setHover(previewElement(event.target));
    const onLeave = () => setHover(null);
    frame.addEventListener("mousedown", block, true);
    frame.addEventListener("click", onClick, true);
    frame.addEventListener("keydown", onKeyDown, true);
    frame.addEventListener("keyup", onKeyUp, true);
    frame.addEventListener("mouseover", onOver);
    frame.addEventListener("mouseleave", onLeave);
    return () => {
      frame.removeEventListener("mousedown", block, true);
      frame.removeEventListener("click", onClick, true);
      frame.removeEventListener("keydown", onKeyDown, true);
      frame.removeEventListener("keyup", onKeyUp, true);
      frame.removeEventListener("mouseover", onOver);
      frame.removeEventListener("mouseleave", onLeave);
      setHover(null);
    };
  }, [selecting, frame]);

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
          <button
            type="button"
            className={`icon-button tool-toggle ${selecting ? "active" : ""}`}
            onClick={() => setSelecting((current) => !current)}
            aria-pressed={selecting}
            aria-label="Select element"
            aria-keyshortcuts="V"
            title="Select element (V)"
          >
            <MousePointer2 size={16} />
          </button>
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
      <div className="canvas-workspace" ref={setWorkspace}>
        <VisionFilters />
        <div className={`canvas-note ${simulated ? "is-simulated" : ""}`}>
          <span className="mono-label">{simulated ? "SIMULATED" : "LIVE PREVIEW"}</span>
          <DeviceSwitcher
            viewport={viewport}
            setViewport={setViewport}
            customWidth={customWidth}
            setCustomWidth={setCustomWidth}
            zoom={zoom}
            setZoom={setZoom}
          />
          <span className="canvas-note-text">
            {simulated
              ? `${visionNote} · approximation, not a diagnosis`
              : "Changes apply instantly"}
          </span>
        </div>
        <div
          ref={setFrame}
          className={`preview-frame ${selecting ? "is-selecting" : ""} ${view === "compare" || view === "themes" ? "compare-frame" : ""} viewport-${viewport} zoom-${Math.round(zoom * 100)}`}
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
              tokens={variantBTokens}
              mode={mode}
              variant="b"
              surface={surface}
            />
          )}
        </div>
        {selection && frame && workspace && (
          <TokenPopover
            element={selection.el}
            tokens={selection.variant === "b" ? variantBTokens : tokens}
            mode={selection.mode}
            notice={selection.variant === "b" ? "variant-b" : readOnly ? "shared" : null}
            container={workspace}
            frame={frame}
            updateTokens={updateTokens}
            onClose={closeSelection}
          />
        )}
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
