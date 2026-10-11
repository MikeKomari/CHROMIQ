"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultTokens } from "@/data/workspace";
import { importCss, importJson, importTailwind } from "@/lib/importers";
import { randomPalette, tokenCss } from "@/lib/colors";
import { contrastRatio, semanticPairs } from "@/lib/contrast";
import { loadFontFamily } from "@/lib/fonts";
import { validateTokens } from "@/lib/validate";
import type {
  HarmonyMode,
  ImportResult,
  Mode,
  Panel,
  Project,
  PreviewSurfaceKind,
  Snapshot,
  TokenUpdate,
  Tokens,
  View,
  Version,
  Viewport,
  WorkspaceSettings,
} from "@/types/workspace";

export function useWorkspace() {
  const [tokens, setTokens] = useState<Tokens>(defaultTokens);
  const [history, setHistory] = useState<Tokens[]>([]);
  const [future, setFuture] = useState<Tokens[]>([]);
  const [mode, setMode] = useState<Mode>("dark");
  const [view, setView] = useState<View>("canvas");
  const [surface, setSurface] = useState<PreviewSurfaceKind>("editorial");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [zoom, setZoom] = useState(1);
  const [customWidth, setCustomWidth] = useState(1024);
  const [harmony, setHarmony] = useState<HarmonyMode>("analogous");
  const [settings, setSettings] = useState<WorkspaceSettings>({
    defaultMode: "dark",
    reducedMotion: false,
    showGrid: false,
    autosave: true,
    exportFormat: "css",
  });
  const [panel, setPanel] = useState<Panel>("type");
  const [activeStarter, setActiveStarter] = useState("Editorial");
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(true);
  const [locked, setLocked] = useState<string[]>([]);
  const [projectName, setProjectName] = useState("Untitled system");
  const [projectId, setProjectId] = useState("local-untitled");
  const [projects, setProjects] = useState<Project[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [compareTokens, setCompareTokens] = useState<Tokens | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("prism-tokens");
    if (stored)
      try {
        setTokens({ ...defaultTokens, ...(JSON.parse(stored) as Partial<Tokens>) });
      } catch {
        /* keep defaults */
      }
    const storedProjects = window.localStorage.getItem("prism-projects");
    if (storedProjects)
      try {
        setProjects(JSON.parse(storedProjects) as Project[]);
      } catch {
        /* keep an empty project list */
      }
    const storedSettings = window.localStorage.getItem("prism-settings");
    if (storedSettings)
      try {
        setSettings((current) => ({
          ...current,
          ...(JSON.parse(storedSettings) as Partial<WorkspaceSettings>),
        }));
      } catch {
        /* keep default preferences */
      }
    const storedLocks = window.localStorage.getItem("prism-locks");
    if (storedLocks)
      try {
        setLocked(JSON.parse(storedLocks) as string[]);
      } catch {
        /* keep an empty lock set */
      }
    const storedVersions = window.localStorage.getItem("prism-versions");
    if (storedVersions)
      try {
        setVersions(JSON.parse(storedVersions) as Version[]);
      } catch {
        /* keep an empty version list */
      }
    try {
      const share = new URLSearchParams(window.location.search).get("share");
      if (share) {
        const decoded = JSON.parse(
          atob(share.replace(/-/g, "+").replace(/_/g, "/")),
        ) as { tokens: Partial<Tokens>; mode?: Mode; starter?: string };
        setTokens({ ...defaultTokens, ...decoded.tokens });
        if (decoded.mode) setMode(decoded.mode);
        if (decoded.starter) setActiveStarter(decoded.starter);
        setReadOnly(true);
      }
    } catch {
      /* ignore a malformed share link */
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("prism-tokens", JSON.stringify(tokens));
    setSaved(true);
  }, [tokens]);

  useEffect(() => {
    loadFontFamily(tokens.displayFont);
    loadFontFamily(tokens.bodyFont);
    loadFontFamily(tokens.monoFont);
  }, [tokens.displayFont, tokens.bodyFont, tokens.monoFont]);

  useEffect(() => {
    if (projects.length)
      window.localStorage.setItem("prism-projects", JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    window.localStorage.setItem("prism-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    window.localStorage.setItem("prism-locks", JSON.stringify(locked));
  }, [locked]);

  useEffect(() => {
    if (versions.length)
      window.localStorage.setItem("prism-versions", JSON.stringify(versions));
  }, [versions]);

  const updateTokens: TokenUpdate = (changes) => {
    if (readOnly) return;
    setHistory((previous) => [...previous.slice(-19), tokens]);
    setFuture([]);
    setTokens((current) => ({ ...current, ...changes }));
    setSaved(false);
  };

  const resetTokens = () => {
    setHistory((previous) => [...previous.slice(-19), tokens]);
    setFuture([]);
    setTokens(defaultTokens);
    setSaved(false);
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((current) => [...current, tokens]);
    setTokens(previous);
    setHistory((current) => current.slice(0, -1));
  };

  const redo = () => {
    const next = future.at(-1);
    if (!next) return;
    setHistory((current) => [...current, tokens]);
    setTokens(next);
    setFuture((current) => current.slice(0, -1));
  };

  const randomize = () => {
    const next = randomPalette(tokens, harmony);
    const changes: Partial<Tokens> = {};
    if (!locked.includes("accent")) changes.accent = next.accent;
    if (!locked.includes("accentSoft")) changes.accentSoft = next.accentSoft;
    updateTokens(changes);
  };

  const exportFiles = useMemo(() => {
    const css = `/* PRISM export: ${activeStarter} */\n${tokenCss(tokens, mode)}\n\n:root {\n  --prism-font-display: "${tokens.displayFont}";\n  --prism-font-body: "${tokens.bodyFont}";\n  --prism-font-mono: "${tokens.monoFont}";\n  --prism-success: ${tokens.success};\n  --prism-warning: ${tokens.warning};\n  --prism-danger: ${tokens.danger};\n  --prism-line-height: ${tokens.lineHeight};\n  --prism-tracking: ${tokens.tracking}em;\n  --prism-border: ${tokens.borderWidth}px;\n  --prism-shadow: ${tokens.shadow};\n  --prism-motion: ${tokens.motion}ms;\n  --prism-breakpoint-sm: ${tokens.breakpointSm}px;\n  --prism-breakpoint-md: ${tokens.breakpointMd}px;\n  --prism-breakpoint-lg: ${tokens.breakpointLg}px;\n}\n\n@media (prefers-color-scheme: light) {\n  :root { --prism-accent: ${tokens.accent}; }\n}`;
    const tailwind = `@theme inline {\n  --color-prism-accent: ${tokens.accent};\n  --color-prism-accent-soft: ${tokens.accentSoft};\n  --color-prism-ink: ${tokens.ink};\n  --color-prism-paper: ${tokens.paper};\n  --color-prism-success: ${tokens.success};\n  --color-prism-warning: ${tokens.warning};\n  --color-prism-danger: ${tokens.danger};\n  --radius-prism: ${tokens.radius}px;\n  --tracking-prism: ${tokens.tracking}em;\n  --leading-prism: ${tokens.lineHeight};\n  --border-prism: ${tokens.borderWidth}px;\n  --shadow-prism: ${tokens.shadow};\n  --breakpoint-sm: ${tokens.breakpointSm}px;\n  --breakpoint-md: ${tokens.breakpointMd}px;\n  --breakpoint-lg: ${tokens.breakpointLg}px;\n}`;
    const shadcn = `:root {\n  --primary: ${tokens.accent};\n  --primary-foreground: ${tokens.ink};\n  --background: ${tokens.paper};\n  --foreground: ${tokens.ink};\n  --border: ${tokens.line};\n  --success: ${tokens.success};\n  --warning: ${tokens.warning};\n  --destructive: ${tokens.danger};\n  --radius: ${tokens.radius}px;\n}\n\n.dark {\n  --primary: ${tokens.accent};\n  --primary-foreground: ${tokens.ink};\n  --background: ${tokens.ink};\n  --foreground: ${tokens.paper};\n  --border: ${tokens.line};\n}`;
    const design = `# ${activeStarter}\n\n## Visual direction\n\nA PRISM design system with a ${mode} preview as the current working theme.\n\n## Tokens\n\n- Accent: ${tokens.accent}\n- Accent soft: ${tokens.accentSoft}\n- Ink: ${tokens.ink}\n- Paper: ${tokens.paper}\n- Display font: ${tokens.displayFont}\n- Body font: ${tokens.bodyFont}\n- Mono font: ${tokens.monoFont}\n- Success: ${tokens.success}\n- Warning: ${tokens.warning}\n- Danger: ${tokens.danger}\n- Line height: ${tokens.lineHeight}\n- Tracking: ${tokens.tracking}em\n- Border: ${tokens.borderWidth}px\n- Shadow: ${tokens.shadow}\n- Motion: ${tokens.motion}ms\n- Breakpoints: ${tokens.breakpointSm}/${tokens.breakpointMd}/${tokens.breakpointLg}px\n- Radius: ${tokens.radius}px\n- Spacing unit: ${tokens.spacing}px\n- Display scale: ${tokens.typeScale}x\n\n## Usage\n\nUse semantic tokens instead of hardcoded values. Preserve the system's contrast and shape language across light and dark surfaces.`;
    const json = JSON.stringify(
      { version: 1, name: activeStarter, tokens },
      null,
      2,
    );
    const project = JSON.stringify(
      {
        version: 1,
        type: "prism-project",
        project: {
          id: projectId,
          name: projectName,
          mode,
          starter: activeStarter,
          tokens,
          snapshots,
        },
      },
      null,
      2,
    );
    return { css, tailwind, shadcn, design, json, project };
  }, [activeStarter, mode, projectId, projectName, snapshots, tokens]);

  const exportWarnings = useMemo(() => {
    const warnings: string[] = [];
    const failing = semanticPairs(tokens).filter(
      (pair) => contrastRatio(pair.fg, pair.bg) < 3,
    );
    if (failing.length)
      warnings.push(
        `Below large-text contrast: ${[...new Set(failing.map((pair) => pair.token))].join(", ")}.`,
      );
    if (tokens.radius > 24)
      warnings.push(
        "The radius is unusually large and may change component density.",
      );
    return warnings;
  }, [tokens]);

  const exportErrors = useMemo(() => validateTokens(tokens), [tokens]);

  const copyExport = async (content = exportFiles.css) => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const downloadExport = (
    content = exportFiles.css,
    filename = "prism-tokens.css",
    type = "text/css",
  ) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const createSnapshot = (name = `Direction ${snapshots.length + 1}`) => {
    const snapshot: Snapshot = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      tokens: { ...tokens },
      mode,
      starter: activeStarter,
    };
    setSnapshots((current) => [snapshot, ...current]);
    return snapshot;
  };

  const restoreSnapshot = (snapshot: Snapshot) => {
    if (readOnly) return;
    setHistory((current) => [...current.slice(-19), tokens]);
    setTokens({ ...defaultTokens, ...snapshot.tokens });
    setMode(snapshot.mode);
    setActiveStarter(snapshot.starter);
    setSaved(false);
  };

  const deleteSnapshot = (id: string) =>
    setSnapshots((current) => current.filter((snapshot) => snapshot.id !== id));

  const renameSnapshot = (id: string, name: string) =>
    setSnapshots((current) =>
      current.map((snapshot) =>
        snapshot.id === id
          ? { ...snapshot, name: name.trim() || snapshot.name }
          : snapshot,
      ),
    );

  const duplicateSnapshot = (id: string) => {
    const source = snapshots.find((snapshot) => snapshot.id === id);
    if (!source) return;
    const copy: Snapshot = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} copy`,
      createdAt: new Date().toISOString(),
      tokens: { ...source.tokens },
    };
    setSnapshots((current) => [copy, ...current]);
  };

  const commitVersion = (name?: string) => {
    const version: Version = {
      id: crypto.randomUUID(),
      name: name?.trim() || `Version ${versions.length + 1}`,
      createdAt: new Date().toISOString(),
      tokens: { ...tokens },
      mode,
      starter: activeStarter,
    };
    setVersions((current) => [version, ...current]);
    return version;
  };

  const restoreVersion = (version: Version) => {
    if (readOnly) return;
    setHistory((current) => [...current.slice(-19), tokens]);
    setFuture([]);
    setTokens({ ...defaultTokens, ...version.tokens });
    setMode(version.mode);
    setActiveStarter(version.starter);
    setSaved(false);
  };

  const deleteVersion = (id: string) =>
    setVersions((current) => current.filter((version) => version.id !== id));

  const createShareLink = () => {
    const payload = JSON.stringify({ tokens, mode, starter: activeStarter });
    const encoded = btoa(payload)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const url = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
    navigator.clipboard.writeText(url);
    return url;
  };

  const saveProject = () => {
    const project: Project = {
      id: projectId,
      name: projectName,
      updatedAt: new Date().toISOString(),
      tokens: { ...tokens },
      mode,
      starter: activeStarter,
      snapshots,
    };
    setProjects((current) => [
      ...current.filter((item) => item.id !== projectId),
      project,
    ]);
    setSaved(true);
  };

  const createProject = (name: string) => {
    const id = crypto.randomUUID();
    setProjectId(id);
    setProjectName(name.trim() || "Untitled system");
    setTokens(defaultTokens);
    setSnapshots([]);
    setActiveStarter("Editorial");
    setMode("dark");
    setHistory([]);
    setFuture([]);
    setSaved(true);
  };

  const loadProject = (project: Project) => {
    setProjectId(project.id);
    setProjectName(project.name);
    setTokens({ ...defaultTokens, ...project.tokens });
    setMode(project.mode);
    setActiveStarter(project.starter);
    setSnapshots(project.snapshots);
    setHistory([]);
    setFuture([]);
    setSaved(true);
  };

  const renameProject = (name: string) => {
    setProjectName(name.trim() || "Untitled system");
    setSaved(false);
  };
  const deleteProject = (id: string) =>
    setProjects((current) => current.filter((project) => project.id !== id));

  const importTokens = (
    kind: "css" | "tailwind" | "json",
    source: string,
  ): ImportResult => {
    if (kind === "json") {
      try {
        const parsed = JSON.parse(source) as {
          type?: string;
          project?: Partial<Project>;
        };
        if (parsed.type === "prism-project" && parsed.project) {
          const project = parsed.project;
          const importedTokens = project.tokens;
          if (
            !project.name ||
            !project.mode ||
            !project.starter ||
            !importedTokens
          ) {
            const result = {
              tokens: {},
              warnings: ["The project file is missing required metadata."],
            };
            setImportWarnings(result.warnings);
            return result;
          }
          setProjectId(project.id || crypto.randomUUID());
          setProjectName(project.name);
          setTokens({ ...defaultTokens, ...importedTokens });
          setMode(project.mode);
          setActiveStarter(project.starter);
          setSnapshots(project.snapshots || []);
          setHistory([]);
          setFuture([]);
          setSaved(false);
          setImportWarnings([]);
          return { tokens: importedTokens, warnings: [] };
        }
      } catch {
        /* importJson below returns the actionable parse warning */
      }
    }
    const result =
      kind === "css"
        ? importCss(source)
        : kind === "tailwind"
          ? importTailwind(source)
          : importJson(source);
    if (Object.keys(result.tokens).length) updateTokens(result.tokens);
    setImportWarnings(result.warnings);
    return result;
  };

  return {
    tokens,
    mode,
    setMode,
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
    harmony,
    setHarmony,
    settings,
    setSettings,
    panel,
    setPanel,
    activeStarter,
    setActiveStarter,
    showExport,
    setShowExport,
    copied,
    saved,
    setSaved,
    locked,
    setLocked,
    history,
    future,
    updateTokens,
    resetTokens,
    undo,
    redo,
    randomize,
    exportFiles,
    exportWarnings,
    exportErrors,
    copyExport,
    downloadExport,
    projectName,
    projectId,
    projects,
    snapshots,
    versions,
    compareTokens,
    setCompareTokens,
    readOnly,
    setReadOnly,
    importWarnings,
    setImportWarnings,
    createSnapshot,
    restoreSnapshot,
    renameSnapshot,
    duplicateSnapshot,
    deleteSnapshot,
    commitVersion,
    restoreVersion,
    deleteVersion,
    createShareLink,
    saveProject,
    createProject,
    loadProject,
    renameProject,
    deleteProject,
    importTokens,
  };
}
