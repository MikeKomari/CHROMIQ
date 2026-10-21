import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { StageStatus } from "@/components/workspace/shell/stage-status";
import { CanvasHeader } from "@/components/workspace/shell/canvas-header";
import { PreviewSurface } from "@/components/workspace/preview-surface";
import { TokenPopover } from "@/components/workspace/token-popover";
import { VisionFilters } from "@/components/workspace/vision-filters";
import { visionFilter, type VisionMode } from "@/lib/vision";
import type {
  Mode,
  PreviewSurfaceKind,
  TokenUpdate,
  Tokens,
  View,
  Viewport,
} from "@/types/workspace";

type Selection = { el: HTMLElement; mode: Mode; variant: string };

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
  undo,
  redo,
  canUndo,
  canRedo,
  setShowExport,
  setShowImport,
  setShowSnapshots,
  updateTokens,
  readOnly,
  inspectorOpen,
  toggleInspector,
}: {
  mode: Mode;
  view: View;
  setView: (view: View) => void;
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
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  setShowExport: (show: boolean) => void;
  setShowImport: (show: boolean) => void;
  setShowSnapshots: (show: boolean) => void;
  updateTokens: TokenUpdate;
  readOnly: boolean;
  inspectorOpen: boolean;
  toggleInspector: () => void;
}) {
  const [vision, setVision] = useState<VisionMode>("none");
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
      <CanvasHeader
        view={view}
        setView={setView}
        viewport={viewport}
        setViewport={setViewport}
        zoom={zoom}
        setZoom={setZoom}
        customWidth={customWidth}
        setCustomWidth={setCustomWidth}
        selecting={selecting}
        toggleSelecting={() => setSelecting((current) => !current)}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        setShowExport={setShowExport}
        setShowImport={setShowImport}
        setShowSnapshots={setShowSnapshots}
        inspectorOpen={inspectorOpen}
        toggleInspector={toggleInspector}
      />
      <div className="canvas-workspace" ref={setWorkspace}>
        <VisionFilters />
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
        <StageStatus
          surface={surface}
          setSurface={setSurface}
          vision={vision}
          setVision={setVision}
          size={`${size}${zoomLabel}`}
        />
      </div>
    </motion.section>
  );
}
