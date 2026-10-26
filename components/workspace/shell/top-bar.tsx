"use client";

import { Check, ChevronDown, CircleHelp, Link2, Search, Settings2, UserRound, UserRoundCheck } from "lucide-react";
import { motion } from "motion/react";
import { ChromiqMark, ChromiqWordmark } from "@/components/brand/chromiq-logo";
import type { AccountStatus } from "@/hooks/use-account";

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
  openAccount,
  accountStatus,
  accountEmail,
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
  openAccount: () => void;
  accountStatus: AccountStatus;
  accountEmail?: string;
}) {
  // Accounts are optional. Hide the control until the server confirms they exist,
  // so a deployment without a database never shows a button that cannot work.
  const showAccount = accountStatus === "anonymous" || accountStatus === "signed-in";
  const signedIn = accountStatus === "signed-in";
  return (
    <motion.header
      className="topbar"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="brand-lockup">
        <ChromiqMark height={22} />
        <ChromiqWordmark height={26} className="brand-wordmark" />
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
        {showAccount && (
          <button
            type="button"
            className={`icon-button account-button${signedIn ? " is-signed-in" : ""}`}
            aria-label={signedIn ? `Account, signed in${accountEmail ? ` as ${accountEmail}` : ""}` : "Account, signed out"}
            aria-haspopup="dialog"
            title={signedIn ? "Account (signed in)" : "Account (optional, for sync)"}
            onClick={openAccount}
          >
            {signedIn ? <UserRoundCheck size={17} /> : <UserRound size={17} />}
          </button>
        )}
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
