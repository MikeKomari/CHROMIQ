"use client";

import { Lock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import { starters } from "@/data/workspace";
import { starterAccents } from "@/lib/colors";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAccount } from "@/hooks/use-account";
import { CanvasArea } from "@/components/workspace/canvas-area";
import { ExportModal } from "@/components/workspace/export-modal";
import { TopBar } from "@/components/workspace/shell/top-bar";
import { IconRail } from "@/components/workspace/shell/icon-rail";
import { ContextPanel } from "@/components/workspace/shell/context-panel";
import { StartersPanel } from "@/components/workspace/shell/panels/starters-panel";
import { ProjectsPanel } from "@/components/workspace/shell/panels/projects-panel";
import { SnapshotsPanel } from "@/components/workspace/shell/panels/snapshots-panel";
import { VersionsPanel } from "@/components/workspace/shell/panels/versions-panel";
import { Inspector } from "@/components/workspace/shell/inspector";
import { HelpModal } from "@/components/workspace/shell/help-modal";
import { useShellLayout } from "@/components/workspace/shell/use-shell-layout";
import type { Version } from "@/types/workspace";
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
import { AccountModal } from "@/components/workspace/account-modal";

export function Workspace() {
  const workspace = useWorkspace();
  const layout = useShellLayout();
  const account = useAccount();
  const [showProjects, setShowProjects] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCommand, setShowCommand] = useState(false);
  const [showInspect, setShowInspect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [shared, setShared] = useState(false);
  const [restyleRequest, setRestyleRequest] = useState<RestyleRequest | null>(null);
  const consumeRestyleRequest = useCallback(() => setRestyleRequest(null), []);
  const share = async () => {
    if (!(await workspace.createShareLink())) return;
    setShared(true);
    window.setTimeout(() => setShared(false), 1600);
  };
  const {
    mode,
    setMode,
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
    randomizeWarning,
    contrastMessage,
    fixContrast,
    fixAllContrast,
    resetShape,
    deriveDark,
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
        else if (showAccount) setShowAccount(false);
        else if (showHelp) setShowHelp(false);
        else if (event.defaultPrevented) return;
        else if (layout.narrowPanel && layout.panelOverlay) layout.dismissPanelOverlay();
        else if (layout.narrowInspector && layout.inspectorDrawer) layout.closeInspectorDrawer();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showCommand, showExport, showProjects, showSnapshots, showVersions, showImport, showInspect, showSettings, showAccount, showHelp, layout.narrowPanel, layout.panelOverlay, layout.dismissPanelOverlay, layout.narrowInspector, layout.inspectorDrawer, layout.closeInspectorDrawer]);
  const selectStarter = (starter: (typeof starters)[number]) => {
    if (readOnly) return;
    updateTokens(starterAccents(starter));
    setActiveStarter(starter.name);
    layout.dismissPanelOverlay();
  };
  const compareVersion = (version: Version) => {
    setCompareTokens(version.tokens);
    setView("compare");
    setShowVersions(false);
    layout.dismissPanelOverlay();
  };
  const newProject = () => {
    const name = window.prompt("Name this project", "New system")?.trim();
    if (name) workspace.createProject(name);
  };
  const panelConfig = {
    starters: {},
    projects: { actionLabel: "New project", onAction: newProject },
    snapshots: {
      actionLabel: "Save snapshot",
      onAction: () => {
        workspace.createSnapshot();
      },
    },
    versions: {
      actionLabel: "Commit version",
      onAction: () => {
        workspace.commitVersion();
      },
    },
  }[layout.panel] as { actionLabel?: string; onAction?: () => void };

  return (
    <MotionConfig reducedMotion="user">
      <main
        className={`chromiq-app ${mode === "light" ? "is-light" : ""} ${workspace.settings.reducedMotion ? "reduce-motion" : ""} ${workspace.settings.showGrid ? "grid-visible" : ""}`}
      >
        <TopBar
          projectName={workspace.projectName}
          saved={saved}
          shared={shared}
          share={share}
          save={() => {
            workspace.saveProject();
            setSaved(true);
          }}
          openProjects={() => layout.showPanel("projects")}
          openSearch={() => setShowCommand(true)}
          openHelp={() => setShowHelp(true)}
          openSettings={() => setShowSettings(true)}
          openAccount={() => setShowAccount(true)}
          accountStatus={account.status}
          accountEmail={account.user?.email}
        />
        {readOnly && (
          <div className="readonly-banner">
            <Lock size={14} /> Read-only shared system — duplicate to make it
            yours.
          </div>
        )}
        <div
          className={`workspace-grid shell-grid ${layout.panelWide ? "panel-wide-open" : ""} ${layout.inspectorWide ? "inspector-wide-open" : ""}`}
        >
          <IconRail
            panel={layout.panel}
            panelOpen={layout.panelOpen}
            togglePanel={layout.togglePanel}
            openSettings={() => setShowSettings(true)}
            openHelp={() => setShowHelp(true)}
          />
          <ContextPanel
            panel={layout.panel}
            wideOpen={layout.panelWide}
            overlayOpen={layout.panelOverlay}
            readOnly={readOnly}
            close={() => layout.setPanelOpen(false)}
            {...panelConfig}
          >
            {layout.panel === "starters" && (
              <StartersPanel activeStarter={activeStarter} selectStarter={selectStarter} readOnly={readOnly} />
            )}
            {layout.panel === "projects" && (
              <ProjectsPanel
                projects={workspace.projects}
                projectId={workspace.projectId}
                projectName={workspace.projectName}
                loadProject={(project) => {
                  workspace.loadProject(project);
                  layout.dismissPanelOverlay();
                }}
                manage={() => setShowProjects(true)}
                readOnly={readOnly}
              />
            )}
            {layout.panel === "snapshots" && (
              <SnapshotsPanel
                snapshots={workspace.snapshots}
                restoreSnapshot={(snapshot) => {
                  workspace.restoreSnapshot(snapshot);
                  layout.dismissPanelOverlay();
                }}
                manage={() => setShowSnapshots(true)}
                readOnly={readOnly}
              />
            )}
            {layout.panel === "versions" && (
              <VersionsPanel
                versions={workspace.versions}
                restoreVersion={(version) => {
                  workspace.restoreVersion(version);
                  layout.dismissPanelOverlay();
                }}
                compareVersion={compareVersion}
                manage={() => setShowVersions(true)}
                readOnly={readOnly}
              />
            )}
          </ContextPanel>
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
              undo={undo}
              redo={redo}
              canUndo={history.length > 0}
              canRedo={future.length > 0}
              setShowExport={setShowExport}
              setShowImport={setShowImport}
              setShowSnapshots={setShowSnapshots}
              updateTokens={updateTokens}
              readOnly={readOnly}
              inspectorOpen={layout.inspectorOpen}
              toggleInspector={layout.toggleInspector}
            />
          )}
          <Inspector
            open={layout.inspectorOpen}
            wideOpen={layout.inspectorWide}
            drawerOpen={layout.inspectorDrawer}
            close={layout.toggleInspector}
            tokens={tokens}
            updateTokens={updateTokens}
            locked={locked}
            setLocked={setLocked}
            randomize={randomize}
            randomizeWarning={randomizeWarning}
            contrastMessage={contrastMessage}
            fixContrast={fixContrast}
            fixAllContrast={fixAllContrast}
            resetShape={resetShape}
            harmony={harmony}
            setHarmony={setHarmony}
            mode={mode}
            setMode={setMode}
            deriveDark={deriveDark}
            readOnly={readOnly}
          />
        </div>
      {showExport && (
        <ExportModal
          exportFiles={workspace.exportFiles}
          exportWarnings={workspace.exportWarnings}
          exportErrors={workspace.exportErrors}
          initialFormat={workspace.settings.exportFormat}
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
          apply={(t) => updateTokens(t)}
          readOnly={readOnly}
          locked={locked}
          restyle={(url) => {
            setRestyleRequest({ url, id: Date.now() });
            setView("restyle");
            setShowInspect(false);
          }}
        />
      )}
      {showHelp && <HelpModal close={() => setShowHelp(false)} />}
      {showSettings && (
        <SettingsModal
          settings={workspace.settings}
          setSettings={workspace.setSettings}
          close={() => setShowSettings(false)}
        />
      )}
      {showAccount && account.status !== "unavailable" && (
        <AccountModal account={account} close={() => setShowAccount(false)} />
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
          toggleThemes={() =>
            workspace.setView(
              workspace.view === "themes" ? "canvas" : "themes",
            )
          }
          openImport={() => setShowImport(true)}
          openInspect={() => setShowInspect(true)}
          openExport={() => workspace.setShowExport(true)}
          openRestyle={() => setView("restyle")}
          close={() => setShowCommand(false)}
        />
      )}
      </main>
    </MotionConfig>
  );
}
