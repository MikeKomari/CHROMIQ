"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { readJson, writeJson } from "@/components/workspace/shell/safe-storage";

export type PanelId = "starters" | "projects" | "snapshots" | "versions";

const STORAGE_KEY = "prism-shell";
const panelIds: PanelId[] = ["starters", "projects", "snapshots", "versions"];
const PANEL_QUERY = "(max-width: 1099px)";
const INSPECTOR_QUERY = "(max-width: 899px)";

type Stored = { panel: PanelId; panelOpen: boolean; inspectorOpen: boolean };

function readStored(): Partial<Stored> {
  const value = readJson(STORAGE_KEY);
  if (!value || typeof value !== "object") return {};
  const raw = value as Record<string, unknown>;
  const stored: Partial<Stored> = {};
  if (typeof raw.panel === "string" && panelIds.includes(raw.panel as PanelId))
    stored.panel = raw.panel as PanelId;
  if (typeof raw.panelOpen === "boolean") stored.panelOpen = raw.panelOpen;
  if (typeof raw.inspectorOpen === "boolean") stored.inspectorOpen = raw.inspectorOpen;
  return stored;
}

// useLayoutEffect warns during SSR, so fall back to useEffect on the server.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Move focus once the next render has committed; skips elements that are not mounted. */
function focusAfterCommit(id: string) {
  window.requestAnimationFrame(() => document.getElementById(id)?.focus());
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useIsoLayoutEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/**
 * Which context panel is shown and whether the panel and inspector are open.
 * Wide layouts remember the open state per browser. Narrow layouts (panel
 * below 1100px, inspector below 900px) start closed and open over the canvas;
 * that overlay state is never persisted.
 */
export function useShellLayout() {
  const narrowPanel = useMediaQuery(PANEL_QUERY);
  const narrowInspector = useMediaQuery(INSPECTOR_QUERY);
  const [panel, setPanel] = useState<PanelId>("starters");
  const [panelWide, setPanelWide] = useState(true);
  const [panelOverlay, setPanelOverlay] = useState(false);
  const [inspectorWide, setInspectorWide] = useState(true);
  const [inspectorDrawer, setInspectorDrawer] = useState(false);

  useIsoLayoutEffect(() => {
    const stored = readStored();
    if (stored.panel) setPanel(stored.panel);
    if (stored.panelOpen !== undefined) setPanelWide(stored.panelOpen);
    if (stored.inspectorOpen !== undefined) setInspectorWide(stored.inspectorOpen);
  }, []);

  const save = (patch: Partial<Stored>) =>
    writeJson(STORAGE_KEY, { ...readStored(), ...patch });

  const panelOpen = narrowPanel ? panelOverlay : panelWide;
  const inspectorOpen = narrowInspector ? inspectorDrawer : inspectorWide;

  const setPanelOpen = (open: boolean) => {
    // Closed containers are visibility:hidden, so hand focus to a control that stays visible.
    if (!open && panelOpen) focusAfterCommit(`rail-${panel}`);
    if (open && narrowPanel && !panelOverlay) focusAfterCommit("context-panel-heading");
    if (narrowPanel) {
      setPanelOverlay(open);
      return;
    }
    setPanelWide(open);
    save({ panelOpen: open });
  };

  /** Rail click: switch to a panel, or collapse it when it is already the open one. */
  const togglePanel = (id: PanelId) => {
    if (id === panel && panelOpen) {
      setPanelOpen(false);
      return;
    }
    setPanel(id);
    save({ panel: id });
    setPanelOpen(true);
  };

  const showPanel = (id: PanelId) => {
    setPanel(id);
    save({ panel: id });
    setPanelOpen(true);
  };

  const toggleInspector = () => {
    const next = !inspectorOpen;
    if (!next) focusAfterCommit("inspector-toggle");
    else if (narrowInspector) focusAfterCommit("inspector-heading");
    if (narrowInspector) {
      setInspectorDrawer(next);
      return;
    }
    setInspectorWide(next);
    save({ inspectorOpen: next });
  };

  /** Close the overlay after an item is chosen so the canvas is visible again. */
  const dismissPanelOverlay = useCallback(() => {
    if (narrowPanel && panelOverlay) focusAfterCommit(`rail-${panel}`);
    setPanelOverlay(false);
  }, [narrowPanel, panelOverlay, panel]);

  const closeInspectorDrawer = useCallback(() => {
    if (narrowInspector && inspectorDrawer) focusAfterCommit("inspector-toggle");
    setInspectorDrawer(false);
  }, [narrowInspector, inspectorDrawer]);

  return {
    narrowPanel,
    narrowInspector,
    panel,
    panelOpen,
    panelWide,
    panelOverlay,
    inspectorOpen,
    inspectorWide,
    inspectorDrawer,
    setPanelOpen,
    togglePanel,
    showPanel,
    toggleInspector,
    dismissPanelOverlay,
    closeInspectorDrawer,
  };
}
