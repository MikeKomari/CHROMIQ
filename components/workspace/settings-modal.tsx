"use client";

import { Check, RotateCcw, X } from "lucide-react";
import { useContrast } from "@/hooks/use-contrast";
import { useUiScale } from "@/hooks/use-ui-scale";
import type { ContrastLevel, UiScale, WorkspaceSettings } from "@/types/workspace";

export function SettingsModal({
  settings,
  setSettings,
  close,
}: {
  settings: WorkspaceSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
  close: () => void;
}) {
  const [contrast, setContrast] = useContrast();
  const [uiScale, setUiScale] = useUiScale();
  const update = (changes: Partial<WorkspaceSettings>) =>
    setSettings((current) => ({ ...current, ...changes }));
  const reset = () =>
    setSettings({
      defaultMode: "dark",
      reducedMotion: false,
      showGrid: false,
      autosave: true,
      exportFormat: "css",
    });

  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="settings-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Workspace settings</span>
            <h2>Make the room yours.</h2>
          </div>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close settings"
          >
            <X size={17} />
          </button>
        </div>
        <div className="settings-section">
          <label className="settings-row">
            <span>
              <strong>Default preview mode</strong>
              <small>Choose the first canvas theme for a new session.</small>
            </span>
            <select
              value={settings.defaultMode}
              onChange={(event) =>
                update({ defaultMode: event.target.value as "dark" | "light" })
              }
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
          <div className="settings-row">
            <span>
              <strong>Reading comfort</strong>
              <small>Comfort softens glare; high contrast keeps crisp edges.</small>
            </span>
            <div className="theme-toggle" role="group" aria-label="Reading comfort">
              {(
                [
                  ["comfort", "Comfort"],
                  ["high", "High contrast"],
                ] as [ContrastLevel, string][]
              ).map(([level, label]) => (
                <button
                  key={level}
                  className={contrast === level ? "active" : ""}
                  aria-pressed={contrast === level}
                  onClick={() => setContrast(level)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-row">
            <span>
              <strong>Interface text size</strong>
              <small>Enlarge labels, controls, and panels across the workbench.</small>
            </span>
            <div className="theme-toggle" role="group" aria-label="Interface text size">
              {(
                [
                  ["default", "Default"],
                  ["large", "Large"],
                  ["xlarge", "Extra large"],
                ] as [UiScale, string][]
              ).map(([level, label]) => (
                <button
                  key={level}
                  className={uiScale === level ? "active" : ""}
                  aria-pressed={uiScale === level}
                  onClick={() => setUiScale(level)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <SettingToggle
            checked={settings.autosave}
            label="Autosave locally"
            description="Keep the active token state in this browser."
            onChange={(checked) => update({ autosave: checked })}
          />
          <SettingToggle
            checked={settings.showGrid}
            label="Show canvas grid"
            description="Add a quiet alignment grid behind the preview."
            onChange={(checked) => update({ showGrid: checked })}
          />
          <SettingToggle
            checked={settings.reducedMotion}
            label="Reduce motion"
            description="Tone down transitions and micro-animations."
            onChange={(checked) => update({ reducedMotion: checked })}
          />
          <label className="settings-row">
            <span>
              <strong>Preferred export</strong>
              <small>Open the export drawer on your most-used format.</small>
            </span>
            <select
              value={settings.exportFormat}
              onChange={(event) =>
                update({
                  exportFormat: event.target
                    .value as WorkspaceSettings["exportFormat"],
                })
              }
            >
              <option value="css">CSS</option>
              <option value="tailwind">Tailwind</option>
              <option value="shadcn">shadcn/ui</option>
              <option value="design">DESIGN.md</option>
              <option value="json">JSON</option>
            </select>
          </label>
        </div>
        <div className="modal-actions">
          <button className="secondary-button" onClick={reset}>
            <RotateCcw size={15} /> Reset preferences
          </button>
          <button className="primary-button" onClick={close}>
            <Check size={15} /> Done
          </button>
        </div>
      </section>
    </div>
  );
}

function SettingToggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        className="settings-checkbox"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
      />
    </label>
  );
}
