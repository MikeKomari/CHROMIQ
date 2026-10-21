"use client";

import type { KeyboardEvent } from "react";
import {
  Bookmark,
  CircleHelp,
  FolderOpen,
  History,
  Keyboard,
  LayoutTemplate,
  Settings2,
} from "lucide-react";
import type { PanelId } from "@/components/workspace/shell/use-shell-layout";

export const panelMeta: Record<PanelId, { label: string; icon: typeof Bookmark }> = {
  starters: { label: "Starters", icon: LayoutTemplate },
  projects: { label: "Projects", icon: FolderOpen },
  snapshots: { label: "Snapshots", icon: Bookmark },
  versions: { label: "Versions", icon: History },
};

const panelOrder: PanelId[] = ["starters", "projects", "snapshots", "versions"];

export function IconRail({
  panel,
  panelOpen,
  togglePanel,
  openSettings,
  openHelp,
}: {
  panel: PanelId;
  panelOpen: boolean;
  togglePanel: (id: PanelId) => void;
  openSettings: () => void;
  openHelp: () => void;
}) {
  // Arrow keys move focus along the rail; Tab still leaves it.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const keys = ["ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
    );
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };

  return (
    <nav className="shell-rail" aria-label="Workspace panels" onKeyDown={onKeyDown}>
      <div className="rail-group">
        {panelOrder.map((id) => {
          const { label, icon: Icon } = panelMeta[id];
          const active = panelOpen && panel === id;
          return (
            <button
              key={id}
              id={`rail-${id}`}
              type="button"
              className={`rail-button ${active ? "active" : ""}`}
              aria-label={label}
              aria-pressed={active}
              aria-controls="context-panel"
              title={label}
              onClick={() => togglePanel(id)}
            >
              <Icon size={18} />
            </button>
          );
        })}
        <button
          type="button"
          className="rail-button"
          aria-label="Settings"
          aria-haspopup="dialog"
          title="Settings"
          onClick={openSettings}
        >
          <Settings2 size={18} />
        </button>
      </div>
      <div className="rail-group">
        <button
          type="button"
          className="rail-button"
          aria-label="Help"
          aria-haspopup="dialog"
          title="Help"
          onClick={openHelp}
        >
          <CircleHelp size={18} />
        </button>
        <button
          type="button"
          className="rail-button"
          aria-label="Keyboard shortcuts"
          aria-haspopup="dialog"
          title="Keyboard shortcuts"
          onClick={openHelp}
        >
          <Keyboard size={18} />
        </button>
      </div>
    </nav>
  );
}
