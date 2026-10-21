"use client";

import { PanelLeftClose, Plus } from "lucide-react";
import { panelMeta } from "@/components/workspace/shell/icon-rail";
import type { PanelId } from "@/components/workspace/shell/use-shell-layout";

/** Title row with an optional "+" action; the active panel's list is the child. */
export function ContextPanel({
  panel,
  wideOpen,
  overlayOpen,
  actionLabel,
  onAction,
  readOnly,
  close,
  children,
}: {
  panel: PanelId;
  wideOpen: boolean;
  overlayOpen: boolean;
  actionLabel?: string;
  onAction?: () => void;
  readOnly: boolean;
  close: () => void;
  children: React.ReactNode;
}) {
  const { label } = panelMeta[panel];
  return (
    <aside
      id="context-panel"
      className={`context-panel ${wideOpen ? "is-wide-open" : ""} ${overlayOpen ? "is-overlay-open" : ""}`}
      aria-label={`${label} panel`}
    >
      <div className="panel-title-row">
        <h2 id="context-panel-heading" tabIndex={-1}>
          {label}
        </h2>
        {onAction && actionLabel && (
          <button
            type="button"
            className="mini-button"
            aria-label={actionLabel}
            title={readOnly ? "Read-only shared system" : actionLabel}
            disabled={readOnly}
            onClick={onAction}
          >
            <Plus size={15} />
          </button>
        )}
        <button type="button" className="mini-button" aria-label="Collapse panel" title="Collapse panel" onClick={close}>
          <PanelLeftClose size={15} />
        </button>
      </div>
      <div className="panel-body">
        {readOnly && <p className="panel-note">Read-only shared system</p>}
        {children}
      </div>
      <a
        className="made-by"
        href="https://michaelkimeison.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        made by <strong>MikeKomari</strong>
      </a>
    </aside>
  );
}
