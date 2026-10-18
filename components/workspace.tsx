"use client";

import {
  Check,
  ChevronDown,
  CircleHelp,
  MoreHorizontal,
  PanelRight,
  Search,
  Settings2,
  Moon,
  Sun,
  Plus,
  Type,
  Palette,
  Shapes,
  Sparkles,
  FolderOpen,
  Bookmark,
  History,
  Link2,
  Lock,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { motion, MotionConfig } from "motion/react";
import { starters } from "@/data/workspace";
import { hexToHsl, hslToHex } from "@/lib/colors";
import { useWorkspace } from "@/hooks/use-workspace";
import { CanvasArea } from "@/components/workspace/canvas-area";
import { ExportModal } from "@/components/workspace/export-modal";
import {
  ColorPanel,
  ShapePanel,
  TypePanel,
} from "@/components/workspace/inspector-panels";
import type { Panel, Tokens, Version } from "@/types/workspace";
import { ProjectModal } from "@/components/workspace/project-modal";
import { SnapshotModal } from "@/components/workspace/snapshot-modal";
import { VersionModal } from "@/components/workspace/version-modal";
import { ImportModal } from "@/components/workspace/import-modal";
import { CommandPalette } from "@/components/workspace/command-palette";
import { InspectModal } from "@/components/workspace/inspect-modal";
import {
  RestyleView,
  type RestyleRequest,
} from "@/components/workspace/restyle/restyle-view";
import { SettingsModal } from "@/components/workspace/settings-modal";

export function Workspace() {
  const workspace = useWorkspace();
  const [showProjects, setShowProjects] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCommand, setShowCommand] = useState(false);
  const [showInspect, setShowInspect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [shared, setShared] = useState(false);
  const [restyleRequest, setRestyleRequest] = useState<RestyleRequest | null>(null);
  const consumeRestyleRequest = useCallback(() => setRestyleRequest(null), []);
  const share = () => {
    workspace.createShareLink();
    setShared(true);
    window.setTimeout(() => setShared(false), 1600);
  };
  const {
    mode,
    setMode,
    panel,
    setPanel,
    tokens,
    view,
    setView,
    activeStarter,
    surface,
    setSurface,
    viewport,
    setViewport,
    zoom,
    setZoom,
    customWidth,
    setCustomWidth,
    compareTokens,
    setCompareTokens,
    setActiveStarter,
    setShowExport,
    showExport,
    saved,
    setSaved,
    history,
    future,
    undo,
    redo,
    updateTokens,
    locked,
    setLocked,
    harmony,
    setHarmony,
    randomize,
    readOnly,
  } = workspace;
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("restyle");
    if (!target) return;
    setView("restyle");
    setRestyleRequest({ url: target, id: Date.now() });
    params.delete("restyle");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (query ? `?${query}` : "") + window.location.hash,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setShowCommand(true);
        return;
      }
      if (event.key === "Escape") {
        if (showCommand) setShowCommand(false);
        else if (showExport) setShowExport(false);
        else if (showProjects) setShowProjects(false);
        else if (showSnapshots) setShowSnapshots(false);
        else if (showVersions) setShowVersions(false);
        else if (showImport) setShowImport(false);
        else if (showInspect) setShowInspect(false);
        else if (showSettings) setShowSettings(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showCommand, showExport, showProjects, showSnapshots, showVersions, showImport, showInspect, showSettings]);
  const selectStarter = (starter: (typeof starters)[number]) => {
    updateTokens({
      accent: starter.accent,
      accentSoft: hslToHex(hexToHsl(starter.accent).h, 45, 86),
    });
    setActiveStarter(starter.name);
  };
  const compareVersion = (version: Version) => {
    setCompareTokens(version.tokens);
    setView("compare");
    setShowVersions(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <main
        className={`prism-app ${mode === "light" ? "is-light" : ""} ${workspace.settings.reducedMotion ? "reduce-motion" : ""} ${workspace.settings.showGrid ? "grid-visible" : ""}`}
    >
      <motion.header className="topbar" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
        <div className="brand-lockup">
          <div className="brand-mark">
            <span />
          </div>
          <div>
            <strong>PRISM</strong>
            <small>visual workbench</small>
          </div>
        </div>
        <button className="project-name" onClick={() => setShowProjects(true)}>
          <span className="status-dot" /> {workspace.projectName}{" "}
          <ChevronDown size={14} />
        </button>
        <div className="top-actions">
          <button
            className="icon-button"
            aria-label="Search actions"
            onClick={() => setShowCommand(true)}
          >
            <Search size={17} />
          </button>
          <button className="icon-button" aria-label="Help">
            <CircleHelp size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Share read-only link"
            onClick={share}
          >
            {shared ? <Check size={17} /> : <Link2 size={17} />}
          </button>
          <div className="divider" />
          <button
            className="save-state"
            onClick={() => {
              workspace.saveProject();
              setSaved(true);
            }}
          >
            <span className={saved ? "saved-dot" : "saving-dot"} />{" "}
            {saved ? "Saved locally" : "Unsaved changes"}
          </button>
          <button
            className="avatar"
            aria-label="Open project library"
            onClick={() => setShowProjects(true)}
          >
            AK
          </button>
        </div>
      </motion.header>
      {readOnly && (
        <div className="readonly-banner">
          <Lock size={14} /> Read-only shared system — duplicate to make it
          yours.
        </div>
      )}
      <div className="workspace-grid">
        <WorkspaceSidebar
          activeStarter={activeStarter}
          projectName={workspace.projectName}
          selectStarter={selectStarter}
          tokens={tokens}
          openProjects={() => setShowProjects(true)}
          openSnapshots={() => setShowSnapshots(true)}
          openSettings={() => setShowSettings(true)}
          openVersions={() => setShowVersions(true)}
        />
        {view === "restyle" ? (
          <RestyleView
            tokens={tokens}
            viewport={viewport}
            setViewport={setViewport}
            customWidth={customWidth}
            setView={setView}
            request={restyleRequest}
            consumeRequest={consumeRestyleRequest}
          />
        ) : (
        <CanvasArea
          mode={mode}
          view={view}
          setView={setView}
          projectName={workspace.projectName}
          surface={surface}
          setSurface={setSurface}
          viewport={viewport}
          setViewport={setViewport}
          zoom={zoom}
          setZoom={setZoom}
          customWidth={customWidth}
          setCustomWidth={setCustomWidth}
          compareTokens={compareTokens}
          tokens={tokens}
          activeStarter={activeStarter}
          undo={undo}
          redo={redo}
          canUndo={history.length > 0}
          canRedo={future.length > 0}
          setShowExport={setShowExport}
          setShowImport={setShowImport}
          setShowSnapshots={setShowSnapshots}
        />
        )}
        <motion.aside className="sidebar inspector" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}>
          <div className="inspector-top">
            <div>
              <span className="eyebrow">Inspector</span>
              <h1>System tokens</h1>
            </div>
            <button className="icon-button" aria-label="Collapse inspector">
              <PanelRight size={16} />
            </button>
          </div>
          <div className="inspector-tabs">
            <InspectorTab
              active={panel === "type"}
              onClick={() => setPanel("type")}
              label="Type"
              icon={<Type size={15} />}
            />
            <InspectorTab
              active={panel === "color"}
              onClick={() => setPanel("color")}
              label="Color"
              icon={<Palette size={15} />}
            />
            <InspectorTab
              active={panel === "shape"}
              onClick={() => setPanel("shape")}
              label="Shape"
              icon={<Shapes size={15} />}
            />
          </div>
          {panel === "type" && (
            <TypePanel tokens={tokens} updateTokens={updateTokens} />
          )}
          {panel === "color" && (
            <ColorPanel
              tokens={tokens}
              updateTokens={updateTokens}
              locked={locked}
              setLocked={setLocked}
              randomize={randomize}
              harmony={harmony}
              setHarmony={setHarmony}
            />
          )}
          {panel === "shape" && (
            <ShapePanel tokens={tokens} updateTokens={updateTokens} />
          )}
          <div className="inspector-divider" />
          <div className="theme-control">
            <div>
              <span className="eyebrow">Preview theme</span>
              <strong>
                {mode === "dark" ? "Dark canvas" : "Light canvas"}
              </strong>
            </div>
            <div className="theme-toggle">
              <button
                className={mode === "dark" ? "active" : ""}
                onClick={() => setMode("dark")}
                aria-label="Dark mode"
              >
                <Moon size={15} />
              </button>
              <button
                className={mode === "light" ? "active" : ""}
                onClick={() => setMode("light")}
                aria-label="Light mode"
              >
                <Sun size={15} />
              </button>
            </div>
          </div>
          <div className="inspector-tip">
            <Sparkles size={16} />
            <span>
              <strong>Try randomize</strong>
              <br />
              Find a color direction, then lock what feels right.
            </span>
          </div>
        </motion.aside>
      </div>
      {showExport && (
        <ExportModal
          exportFiles={workspace.exportFiles}
          exportWarnings={workspace.exportWarnings}
          exportErrors={workspace.exportErrors}
          copied={workspace.copied}
          copyExport={workspace.copyExport}
          downloadExport={workspace.downloadExport}
          close={() => setShowExport(false)}
        />
      )}
      {showProjects && (
        <ProjectModal
          projectName={workspace.projectName}
          projects={workspace.projects}
          renameProject={workspace.renameProject}
          createProject={workspace.createProject}
          loadProject={workspace.loadProject}
          deleteProject={workspace.deleteProject}
          saveProject={workspace.saveProject}
          close={() => setShowProjects(false)}
        />
      )}
      {showSnapshots && (
        <SnapshotModal
          snapshots={workspace.snapshots}
          createSnapshot={workspace.createSnapshot}
          restoreSnapshot={workspace.restoreSnapshot}
          renameSnapshot={workspace.renameSnapshot}
          duplicateSnapshot={workspace.duplicateSnapshot}
          deleteSnapshot={workspace.deleteSnapshot}
          close={() => setShowSnapshots(false)}
        />
      )}
      {showVersions && (
        <VersionModal
          versions={workspace.versions}
          commitVersion={workspace.commitVersion}
          restoreVersion={workspace.restoreVersion}
          deleteVersion={workspace.deleteVersion}
          compareVersion={compareVersion}
          close={() => setShowVersions(false)}
        />
      )}
      {showImport && (
        <ImportModal
          importTokens={workspace.importTokens}
          warnings={workspace.importWarnings}
          close={() => setShowImport(false)}
        />
      )}
      {showInspect && (
        <InspectModal
          close={() => setShowInspect(false)}
          restyle={(url) => {
            setRestyleRequest({ url, id: Date.now() });
            setView("restyle");
            setShowInspect(false);
          }}
        />
      )}
      {showSettings && (
        <SettingsModal
          settings={workspace.settings}
          setSettings={workspace.setSettings}
          close={() => setShowSettings(false)}
        />
      )}
      {showCommand && (
        <CommandPalette
          randomize={workspace.randomize}
          toggleTheme={() =>
            workspace.setMode(workspace.mode === "dark" ? "light" : "dark")
          }
          toggleCompare={() =>
            workspace.setView(
              workspace.view === "compare" ? "canvas" : "compare",
            )
          }
          openImport={() => setShowImport(true)}
          openInspect={() => setShowInspect(true)}
          openExport={() => workspace.setShowExport(true)}
          close={() => setShowCommand(false)}
        />
      )}
      </main>
    </MotionConfig>
  );
}

function InspectorTab({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      {icon} {label}
    </button>
  );
}

function WorkspaceSidebar({
  activeStarter,
  projectName,
  selectStarter,
  tokens,
  openProjects,
  openSnapshots,
  openSettings,
  openVersions,
}: {
  activeStarter: string;
  projectName: string;
  selectStarter: (starter: (typeof starters)[number]) => void;
  tokens: Tokens;
  openProjects: () => void;
  openSnapshots: () => void;
  openSettings: () => void;
  openVersions: () => void;
}) {
  return (
    <motion.aside className="sidebar left-sidebar" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.05, ease: "easeOut" }}>
      <div className="side-heading">
        <span>Systems</span>
        <button
          className="mini-button"
          aria-label="Open project library"
          onClick={openProjects}
        >
          <Plus size={15} />
        </button>
      </div>
      <button className="system-row active">
        <span className="system-swatch" style={{ background: tokens.accent }} />{" "}
        <span>{projectName}</span>
        <MoreHorizontal size={15} />
      </button>
      <button className="system-row">
        <span className="system-swatch cyan" /> <span>Field notes</span>
      </button>
      <button className="system-row">
        <span className="system-swatch coral" /> <span>April launch</span>
      </button>
      <div className="side-rule" />
      <div className="side-heading">
        <span>Start from</span>
        <span className="mono-count">04</span>
      </div>
      <div className="starter-list">
        {starters.map((starter) => (
          <button
            key={starter.name}
            className={`starter-card ${activeStarter === starter.name ? "selected" : ""}`}
            onClick={() => selectStarter(starter)}
          >
            <span
              className="starter-preview"
              style={{ background: starter.accent }}
            >
              <span />
            </span>
            <span>
              <strong>{starter.name}</strong>
              <small>{starter.meta}</small>
            </span>
            {activeStarter === starter.name && (
              <span className="selected-mark">
                <Check size={14} />
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="sidebar-footer">
        <button className="footer-link" onClick={openProjects}>
          <FolderOpen size={15} /> Project library
        </button>
        <button className="footer-link" onClick={openSnapshots}>
          <Bookmark size={15} /> Snapshots
        </button>
        <button className="footer-link" onClick={openVersions}>
          <History size={15} /> Version history
        </button>
        <button className="footer-link" onClick={openSettings}>
          <Settings2 size={15} /> Workspace settings
        </button>
        <button className="footer-link">
          <CircleHelp size={15} /> Keyboard shortcuts
        </button>
      </div>
      <a
        className="made-by"
        href="https://michaelkimeison.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        made by <strong>MikeKomari</strong>
      </a>
    </motion.aside>
  );
}
