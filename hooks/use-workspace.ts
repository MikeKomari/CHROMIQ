"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { defaultTokens } from "@/data/workspace";
import { importCss, importJson, importTailwind } from "@/lib/importers";
import { randomPalette } from "@/lib/colors";
import { contrastRatio, failingPairs, semanticPairs } from "@/lib/contrast";
import { fixAllPairs, fixPair } from "@/lib/contrast-fix";
import { buildExports } from "@/lib/exporters";
import { deriveDarkTheme, resolveMode } from "@/lib/theme";
import { loadFontFamily } from "@/lib/fonts";
import { normalizeTokens } from "@/lib/tokens";
import { validateTokens } from "@/lib/validate";
import { createShare, resolveShare } from "@/lib/sync";

/**
 * A share payload is carried in a URL, so its `mode` is whatever the sender
 * typed. `themeColors` looks the mode up in a table keyed by "dark" and
 * "light"; anything else yields undefined, and the first read of
 * `colors.background` throws while the preview renders, which drops the whole
 * workspace into the recovery screen. The decoder's try/catch does not help,
 * because the value only fails later, during render.
 */
function sharedMode(value: unknown): Mode | null {
  return value === "dark" || value === "light" ? value : null;
}
import type {
  HarmonyMode,
  ImportResult,
  Mode,
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

const shapeKeys: (keyof Tokens)[] = [
  "radius",
  "spacing",
  "borderWidth",
  "shadow",
  "motion",
  "breakpointSm",
  "breakpointMd",
  "breakpointLg",
];

const accentKeys: (keyof Tokens)[] = [
  "accent",
  "accentSoft",
  "darkAccent",
  "darkAccentSoft",
];

export function useWorkspace() {
  const [tokens, setTokens] = useState<Tokens>(defaultTokens);
  const [history, setHistory] = useState<Tokens[]>([]);
  const [future, setFuture] = useState<Tokens[]>([]);
  const [mode, setMode] = useState<Mode>("dark");
  const [modeManual, setModeManual] = useState(false);
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
  const [compareTokens, setCompareTokensState] = useState<Tokens | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [readOnly, setReadOnly] = useState(false);
  const [randomizeWarning, setRandomizeWarning] = useState<string | null>(null);
  const keepRandomizeWarning = useRef(false);
  const [contrastMessage, setContrastMessage] = useState<string | null>(null);
  const keepContrastMessage = useRef(false);
  const lastCoalesce = useRef<{ at: number; keys: string } | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("chromiq-tokens");
    if (stored)
      try {
        setTokens(normalizeTokens(JSON.parse(stored) as Partial<Tokens>));
      } catch {
        /* keep defaults */
      }
    const storedProjects = window.localStorage.getItem("chromiq-projects");
    if (storedProjects)
      try {
        setProjects(JSON.parse(storedProjects) as Project[]);
      } catch {
        /* keep an empty project list */
      }
    let defaultMode: WorkspaceSettings["defaultMode"] = "dark";
    const storedSettings = window.localStorage.getItem("chromiq-settings");
    if (storedSettings)
      try {
        const parsedSettings = JSON.parse(
          storedSettings,
        ) as Partial<WorkspaceSettings>;
        if (parsedSettings.defaultMode)
          defaultMode = parsedSettings.defaultMode;
        setSettings((current) => ({ ...current, ...parsedSettings }));
      } catch {
        /* keep default preferences */
      }
    let sharedModeApplied = false;
    const storedLocks = window.localStorage.getItem("chromiq-locks");
    if (storedLocks)
      try {
        setLocked(JSON.parse(storedLocks) as string[]);
      } catch {
        /* keep an empty lock set */
      }
    const storedVersions = window.localStorage.getItem("chromiq-versions");
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
        setTokens(normalizeTokens(decoded.tokens));
        const mode = sharedMode(decoded.mode);
        if (mode) {
          setMode(mode);
          sharedModeApplied = true;
        }
        if (decoded.starter) setActiveStarter(decoded.starter);
        setReadOnly(true);
      }
    } catch {
      /* ignore a malformed share link */
    }
    if (sharedModeApplied) setModeManual(true);
    else setMode(resolveMode(defaultMode));
  }, []);

  // Short share links (`?s=<slug>`) resolve over the network, so they are read
  // after the synchronous boot above rather than inside it.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("s");
    if (!slug) return;
    let cancelled = false;

    resolveShare(slug).then((result) => {
      if (cancelled || !result.ok) return;
      const shared = result.data.data as {
        tokens?: Partial<Tokens>;
        mode?: Mode;
        starter?: string;
      };
      if (!shared || typeof shared !== "object" || !shared.tokens) return;
      setTokens(normalizeTokens(shared.tokens));
      const mode = sharedMode(shared.mode);
      if (mode) {
        setMode(mode);
        setModeManual(true);
      }
      if (shared.starter) setActiveStarter(shared.starter);
      setReadOnly(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (settings.defaultMode !== "system" || modeManual) return;
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const follow = () => setMode(resolveMode("system"));
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, [settings.defaultMode, modeManual]);

  const chooseMode = (next: Mode) => {
    setModeManual(true);
    setMode(next);
  };

  const setCompareTokens = (next: Tokens | null) =>
    setCompareTokensState(next && normalizeTokens(next));

  useEffect(() => {
    if (keepRandomizeWarning.current) keepRandomizeWarning.current = false;
    else setRandomizeWarning(null);
    if (keepContrastMessage.current) keepContrastMessage.current = false;
    else setContrastMessage(null);
  }, [tokens]);

  useEffect(() => {
    setContrastMessage(null);
  }, [locked]);

  useEffect(() => {
    window.localStorage.setItem("chromiq-tokens", JSON.stringify(tokens));
    setSaved(true);
  }, [tokens]);

  useEffect(() => {
    loadFontFamily(tokens.displayFont);
    loadFontFamily(tokens.bodyFont);
    loadFontFamily(tokens.monoFont);
  }, [tokens.displayFont, tokens.bodyFont, tokens.monoFont]);

  useEffect(() => {
    if (projects.length)
      window.localStorage.setItem("chromiq-projects", JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    window.localStorage.setItem("chromiq-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    window.localStorage.setItem("chromiq-locks", JSON.stringify(locked));
  }, [locked]);

  useEffect(() => {
    if (versions.length)
      window.localStorage.setItem("chromiq-versions", JSON.stringify(versions));
  }, [versions]);

  const updateTokens: TokenUpdate = (changes, options) => {
    if (readOnly) return;
    const keys = Object.keys(changes).sort().join(",");
    const now = Date.now();
    const gesture = lastCoalesce.current;
    const continuing =
      options?.coalesce === true &&
      gesture !== null &&
      gesture.keys === keys &&
      now - gesture.at < 800;
    lastCoalesce.current = options?.coalesce ? { at: now, keys } : null;
    if (!continuing) setHistory((previous) => [...previous.slice(-19), tokens]);
    setFuture([]);
    setTokens((current) => ({ ...current, ...changes }));
    setSaved(false);
  };

  const resetTokens = () => {
    lastCoalesce.current = null;
    setHistory((previous) => [...previous.slice(-19), tokens]);
    setFuture([]);
    setTokens(defaultTokens);
    setSaved(false);
  };

  const undo = () => {
    lastCoalesce.current = null;
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((current) => [...current, tokens]);
    setTokens(previous);
    setHistory((current) => current.slice(0, -1));
  };

  const redo = () => {
    lastCoalesce.current = null;
    const next = future.at(-1);
    if (!next) return;
    setHistory((current) => [...current, tokens]);
    setTokens(next);
    setFuture((current) => current.slice(0, -1));
  };

  const randomize = () => {
    if (readOnly) return;
    const next = randomPalette(tokens, harmony);
    const changes: Partial<Tokens> = {};
    for (const key of accentKeys)
      if (!locked.includes(key))
        (changes[key] as string) = next.changes[key] as string;
    const passed = locked.some((key) =>
      accentKeys.includes(key as keyof Tokens),
    )
      ? !failingPairs({ ...tokens, ...changes }).some((pair) =>
          accentKeys.includes(pair.token),
        )
      : next.passed;
    if (!Object.keys(changes).length) return;
    keepRandomizeWarning.current = true;
    updateTokens(changes);
    setRandomizeWarning(
      passed
        ? null
        : "No passing palette found in 30 tries; check contrast before export.",
    );
  };

  const deriveDark = () => {
    const derived = deriveDarkTheme(tokens);
    const changes: Partial<Tokens> = {};
    for (const key of Object.keys(derived) as (keyof Tokens)[])
      if (!locked.includes(key))
        (changes[key] as string) = derived[key] as string;
    if (!Object.keys(changes).length) return;
    updateTokens(changes);
  };

  const plural = (count: number) => (count === 1 ? "pair" : "pairs");

  const fixContrast = (label: string, theme: Mode) => {
    if (readOnly) return;
    const pair = semanticPairs(tokens).find(
      (item) => item.label === label && item.theme === theme,
    );
    if (!pair || contrastRatio(pair.fg, pair.bg) >= pair.min) return;
    if (locked.includes(pair.token)) {
      setContrastMessage(
        `${pair.label} could not be fixed because ${pair.token} is locked`,
      );
      return;
    }
    const changes = fixPair(tokens, pair, locked);
    if (!changes) {
      setContrastMessage(
        `No lightness of ${pair.token} reaches ${pair.min}:1 for ${pair.label}`,
      );
      return;
    }
    const before = failingPairs(tokens);
    const broken = failingPairs({ ...tokens, ...changes }).find(
      (after) =>
        !before.some(
          (item) => item.label === after.label && item.theme === after.theme,
        ),
    );
    keepContrastMessage.current = true;
    updateTokens(changes);
    setContrastMessage(
      broken
        ? `Fixed "${pair.label}", but "${broken.label}" (${broken.theme} theme) now fails. Try Fix all.`
        : null,
    );
  };

  const fixAllContrast = () => {
    if (readOnly) return;
    const { changes, unresolved } = fixAllPairs(tokens, locked);
    const lockedCount = unresolved.filter((pair) =>
      locked.includes(pair.token),
    ).length;
    const stuckCount = unresolved.length - lockedCount;
    const parts: string[] = [];
    if (lockedCount)
      parts.push(
        `${lockedCount} ${plural(lockedCount)} could not be fixed because their tokens are locked`,
      );
    if (stuckCount)
      parts.push(
        `${stuckCount} ${plural(stuckCount)} could not be fixed by changing lightness`,
      );
    const message = parts.length ? parts.join("; ") : null;
    if (Object.keys(changes).length) {
      keepContrastMessage.current = true;
      updateTokens(changes);
    }
    setContrastMessage(message);
  };

  const resetShape = () => {
    if (readOnly) return;
    const changes: Partial<Tokens> = {};
    for (const key of shapeKeys)
      if (!locked.includes(key) && tokens[key] !== defaultTokens[key])
        (changes[key] as unknown) = defaultTokens[key];
    if (!Object.keys(changes).length) return;
    updateTokens(changes);
  };

  const exportFiles = useMemo(
    () =>
      buildExports({
        tokens,
        starter: activeStarter,
        mode,
        projectId,
        projectName,
        snapshots,
      }),
    [activeStarter, mode, projectId, projectName, snapshots, tokens],
  );

  const exportWarnings = useMemo(() => {
    const warnings = failingPairs(tokens).map(
      (pair) =>
        `${pair.theme === "light" ? "Light" : "Dark"} theme: ${pair.label} (${pair.token}) is ${contrastRatio(pair.fg, pair.bg)}:1, needs ${pair.min}:1`,
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
    filename = "chromiq-tokens.css",
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
    if (readOnly) return;
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
    setFuture([]);
    setTokens(normalizeTokens(snapshot.tokens));
    chooseMode(snapshot.mode);
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
    if (readOnly) return;
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
    setTokens(normalizeTokens(version.tokens));
    chooseMode(version.mode);
    setActiveStarter(version.starter);
    setSaved(false);
  };

  const deleteVersion = (id: string) =>
    setVersions((current) => current.filter((version) => version.id !== id));

  const createShareLink = async () => {
    const payload = { tokens, mode, starter: activeStarter };
    const base = `${window.location.origin}${window.location.pathname}`;

    // Prefer a short slug. Encoding the whole system into the query string
    // produces links that outgrow browser and CDN URL limits on large systems,
    // so that path is only the fallback when short links are unavailable.
    const short = await createShare(payload);
    const url = short.ok
      ? `${base}?s=${short.data.share.slug}`
      : `${base}?share=${btoa(JSON.stringify(payload))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "")}`;

    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  };

  const saveProject = (name = projectName) => {
    const project: Project = {
      id: projectId,
      name,
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
    if (readOnly) return;
    const id = crypto.randomUUID();
    setProjectId(id);
    setProjectName(name.trim() || "Untitled system");
    setTokens(defaultTokens);
    setSnapshots([]);
    setActiveStarter("Editorial");
    setMode(resolveMode(settings.defaultMode));
    setHistory([]);
    setFuture([]);
    setSaved(true);
  };

  const loadProject = (project: Project) => {
    if (readOnly) return;
    setProjectId(project.id);
    setProjectName(project.name);
    setTokens(normalizeTokens(project.tokens));
    chooseMode(project.mode);
    setActiveStarter(project.starter);
    setSnapshots(project.snapshots);
    setHistory([]);
    setFuture([]);
    setSaved(true);
  };

  const renameProject = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setProjectName(trimmed);
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
        if (parsed.type === "chromiq-project" && parsed.project) {
          if (readOnly) {
            const result = {
              tokens: {},
              warnings: ["This shared system is read-only."],
            };
            setImportWarnings(result.warnings);
            return result;
          }
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
          setTokens(normalizeTokens(importedTokens));
          chooseMode(project.mode);
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
    setMode: chooseMode,
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
    randomizeWarning,
    contrastMessage,
    fixContrast,
    fixAllContrast,
    resetShape,
    deriveDark,
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
