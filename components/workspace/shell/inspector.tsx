"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Moon, PanelRightClose, RotateCcw, Sun, Wand2 } from "lucide-react";
import { failingPairs } from "@/lib/contrast";
import { InspectorSection } from "@/components/workspace/shell/inspector-section";
import { ContrastSection } from "@/components/workspace/shell/contrast-section";
import { readJson, writeJson } from "@/components/workspace/shell/safe-storage";
import {
  ColorPanel,
  ShapePanel,
  TypePanel,
} from "@/components/workspace/inspector-panels";
import type { HarmonyMode, Mode, TokenUpdate, Tokens } from "@/types/workspace";

const STORAGE_KEY = "prism-inspector-sections";
type SectionId = "type" | "color" | "shape" | "contrast";
const sectionIds: SectionId[] = ["type", "color", "shape", "contrast"];
const defaultOpen: Record<SectionId, boolean> = {
  type: true,
  color: true,
  shape: false,
  contrast: false,
};

/** Open state for each section, remembered per browser and read after mount so SSR output is stable. */
function useSectionState() {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    const stored = readJson(STORAGE_KEY);
    if (!stored || typeof stored !== "object") return;
    const raw = stored as Record<string, unknown>;
    setOpen((current) => {
      const next = { ...current };
      for (const id of sectionIds) if (typeof raw[id] === "boolean") next[id] = raw[id] as boolean;
      return next;
    });
  }, []);
  const toggle = (id: SectionId) => {
    const next = { ...open, [id]: !open[id] };
    setOpen(next);
    writeJson(STORAGE_KEY, next);
  };
  return { open, toggle };
}

export function Inspector({
  open: inspectorOpen,
  close,
  tokens,
  updateTokens,
  locked,
  setLocked,
  randomize,
  randomizeWarning,
  contrastMessage,
  fixContrast,
  fixAllContrast,
  resetShape,
  harmony,
  setHarmony,
  mode,
  setMode,
  deriveDark,
  wideOpen,
  drawerOpen,
  readOnly,
}: {
  open: boolean;
  close: () => void;
  tokens: Tokens;
  updateTokens: TokenUpdate;
  locked: string[];
  setLocked: Dispatch<SetStateAction<string[]>>;
  randomize: () => void;
  randomizeWarning: string | null;
  contrastMessage: string | null;
  fixContrast: (label: string, theme: Mode) => void;
  fixAllContrast: () => void;
  resetShape: () => void;
  harmony: HarmonyMode;
  setHarmony: (harmony: HarmonyMode) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  deriveDark: () => void;
  wideOpen: boolean;
  drawerOpen: boolean;
  readOnly: boolean;
}) {
  const { open, toggle } = useSectionState();
  const anyFailing = failingPairs(tokens).length > 0;
  return (
    <aside
      id="inspector"
      className={`shell-inspector ${wideOpen ? "is-wide-open" : ""} ${drawerOpen ? "is-drawer-open" : ""}`}
      aria-label="Inspector"
      aria-hidden={inspectorOpen ? undefined : true}
    >
      <div className="inspector-head">
        <div>
          <span className="eyebrow">Inspector</span>
          <h2 id="inspector-heading" tabIndex={-1}>
            System tokens
          </h2>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Collapse inspector"
          title="Collapse inspector"
          onClick={close}
        >
          <PanelRightClose size={16} />
        </button>
      </div>
      <div className="inspector-scroll">
        {readOnly && <p className="panel-note">Read-only shared system</p>}
        <InspectorSection id="type" title="Type" open={open.type} onToggle={() => toggle("type")} readOnly={readOnly}>
          <TypePanel tokens={tokens} updateTokens={updateTokens} />
        </InspectorSection>
        <InspectorSection
          id="color"
          title="Color"
          open={open.color}
          onToggle={() => toggle("color")}
          readOnly={readOnly}
          action={
            <button type="button" className="tiny-link" disabled={readOnly} onClick={randomize}>
              <RotateCcw size={12} /> Randomize
            </button>
          }
        >
          <ColorPanel
            tokens={tokens}
            updateTokens={updateTokens}
            locked={locked}
            setLocked={setLocked}
            randomizeWarning={randomizeWarning}
            harmony={harmony}
            setHarmony={setHarmony}
            mode={mode}
            setMode={setMode}
            deriveDark={deriveDark}
          />
        </InspectorSection>
        <InspectorSection
          id="shape"
          title="Shape"
          open={open.shape}
          onToggle={() => toggle("shape")}
          readOnly={readOnly}
          action={
            <button type="button" className="tiny-link" disabled={readOnly} onClick={resetShape}>
              Reset
            </button>
          }
        >
          <ShapePanel tokens={tokens} updateTokens={updateTokens} />
        </InspectorSection>
        <InspectorSection
          id="contrast"
          title="Contrast"
          open={open.contrast}
          onToggle={() => toggle("contrast")}
          readOnly={readOnly}
          action={
            anyFailing && (
              <button type="button" className="tiny-link" disabled={readOnly} onClick={fixAllContrast}>
                <Wand2 size={12} /> Fix all
              </button>
            )
          }
        >
          <ContrastSection tokens={tokens} contrastMessage={contrastMessage} fixContrast={fixContrast} />
        </InspectorSection>
      </div>
      <div className="inspector-foot theme-control">
        <div>
          <span className="eyebrow">Preview theme</span>
          <strong>{mode === "dark" ? "Dark canvas" : "Light canvas"}</strong>
        </div>
        <div className="theme-toggle">
          <button
            type="button"
            className={mode === "dark" ? "active" : ""}
            onClick={() => setMode("dark")}
            aria-label="Dark mode"
            aria-pressed={mode === "dark"}
          >
            <Moon size={15} />
          </button>
          <button
            type="button"
            className={mode === "light" ? "active" : ""}
            onClick={() => setMode("light")}
            aria-label="Light mode"
            aria-pressed={mode === "light"}
          >
            <Sun size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
