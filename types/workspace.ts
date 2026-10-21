export type Mode = "dark" | "light";
export type View = "canvas" | "compare" | "themes" | "restyle";
export type ModePreference = Mode | "system";
export type PreviewSurfaceKind =
  | "editorial"
  | "saas"
  | "dashboard"
  | "commerce"
  | "docs"
  | "specimen";
export type ContrastLevel = "comfort" | "high";
export type UiScale = "default" | "large" | "xlarge";
export type Viewport = "desktop" | "tablet" | "mobile" | "custom";
export type HarmonyMode =
  | "analogous"
  | "complementary"
  | "triadic"
  | "monochrome"
  | "split-complementary";

export type FontRole = "display" | "body" | "mono";
export type FontEntry = { name: string; category: FontRole };

export type WorkspaceSettings = {
  defaultMode: ModePreference;
  reducedMotion: boolean;
  showGrid: boolean;
  autosave: boolean;
  exportFormat: "css" | "tailwind" | "shadcn" | "design" | "json" | "dtcg";
};

/** Light theme colors live in accent/accentSoft/ink/paper/muted/line; dark theme colors in the dark* pairs. */
export type Tokens = {
  accent: string;
  accentSoft: string;
  ink: string;
  paper: string;
  muted: string;
  line: string;
  darkAccent: string;
  darkAccentSoft: string;
  darkInk: string;
  darkPaper: string;
  darkMuted: string;
  darkLine: string;
  success: string;
  warning: string;
  danger: string;
  displayFont: string;
  bodyFont: string;
  monoFont: string;
  lineHeight: number;
  tracking: number;
  radius: number;
  spacing: number;
  typeScale: number;
  borderWidth: number;
  shadow: number;
  motion: number;
  breakpointSm: number;
  breakpointMd: number;
  breakpointLg: number;
};

/** Resolved semantic colors for one theme. */
export type ThemeColors = {
  background: string;
  foreground: string;
  muted: string;
  line: string;
  accent: string;
  accentSoft: string;
};
export type ThemeRole = keyof ThemeColors;

export type Starter = { name: string; meta: string; accent: string };
export type TokenUpdateOptions = { coalesce?: boolean };
export type TokenUpdate = (
  changes: Partial<Tokens>,
  options?: TokenUpdateOptions,
) => void;

export type Snapshot = {
  id: string;
  name: string;
  createdAt: string;
  tokens: Tokens;
  mode: Mode;
  starter: string;
};

export type Version = {
  id: string;
  name: string;
  createdAt: string;
  tokens: Tokens;
  mode: Mode;
  starter: string;
};

export type Project = {
  id: string;
  name: string;
  updatedAt: string;
  tokens: Tokens;
  mode: Mode;
  starter: string;
  snapshots: Snapshot[];
};

export type ImportResult = {
  tokens: Partial<Tokens>;
  warnings: string[];
};
