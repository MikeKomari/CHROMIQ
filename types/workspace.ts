export type Mode = "dark" | "light";
export type View = "canvas" | "compare";
export type Panel = "type" | "color" | "shape";
export type PreviewSurfaceKind = "editorial" | "dashboard" | "commerce";
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
  defaultMode: Mode;
  reducedMotion: boolean;
  showGrid: boolean;
  autosave: boolean;
  exportFormat: "css" | "tailwind" | "shadcn" | "design" | "json";
};

export type Tokens = {
  accent: string;
  accentSoft: string;
  ink: string;
  paper: string;
  muted: string;
  line: string;
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

export type Starter = { name: string; meta: string; accent: string };
export type TokenUpdate = (changes: Partial<Tokens>) => void;

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
