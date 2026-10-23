"use client";

import { Check, ChevronDown, CircleHelp, Link2, Search, Settings2 } from "lucide-react";
import { motion } from "motion/react";

export function TopBar({
  projectName,
  saved,
  shared,
  share,
  save,
  openProjects,
  openSearch,
  openHelp,
  openSettings,
}: {
  projectName: string;
  saved: boolean;
  shared: boolean;
  share: () => void | Promise<void>;
  save: () => void;
  openProjects: () => void;
  openSearch: () => void;
  openHelp: () => void;
  openSettings: () => void;
}) {
  return (
    <motion.header
      className="topbar"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">
          <span />
        </div>
        <strong>CHROMIQ</strong>
      </div>
      <button
        type="button"
        className="project-name"
        aria-label={`Project ${projectName}. Open projects`}
        onClick={openProjects}
      >
        <span className="status-dot" /> <span className="project-name-text">{projectName}</span>
        <ChevronDown size={14} />
      </button>
      <div className="top-actions">
        <button className="icon-button" aria-label="Search actions" title="Search actions (Ctrl K)" onClick={openSearch}>
          <Search size={17} />
        </button>
        <button className="icon-button hide-narrow" aria-label="Help" title="Help" onClick={openHelp}>
          <CircleHelp size={17} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Workspace settings"
          aria-haspopup="dialog"
          title="Workspace settings"
          onClick={openSettings}
        >
          <Settings2 size={17} />
        </button>
        <button className="icon-button" aria-label="Share read-only link" title="Copy read-only link" onClick={share}>
          {shared ? <Check size={17} /> : <Link2 size={17} />}
        </button>
        <div className="divider" />
        <button
          type="button"
          className="save-state"
          aria-label={saved ? "Saved locally. Save again" : "Unsaved changes. Save project"}
          onClick={save}
        >
          <span className={saved ? "saved-dot" : "saving-dot"} />
          <span className="save-label">{saved ? "Saved locally" : "Unsaved changes"}</span>
        </button>
      </div>
    </motion.header>
  );
}
