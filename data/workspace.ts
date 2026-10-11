import type { FontEntry, Starter, Tokens } from "@/types/workspace";

export const starters: Starter[] = [
  { name: "Editorial", meta: "quiet / considered", accent: "#d5ff42" },
  { name: "Launch day", meta: "high energy / clear", accent: "#ff6b4a" },
  { name: "Archive", meta: "warm / collected", accent: "#73e0d1" },
  { name: "Signal", meta: "sharp / technical", accent: "#8f8cff" },
];

export const fontCatalog: FontEntry[] = [
  { name: "Space Grotesk", category: "display" },
  { name: "Playfair Display", category: "display" },
  { name: "Fraunces", category: "display" },
  { name: "Archivo", category: "display" },
  { name: "Inter", category: "body" },
  { name: "Lato", category: "body" },
  { name: "IBM Plex Sans", category: "body" },
  { name: "DM Sans", category: "body" },
  { name: "IBM Plex Mono", category: "mono" },
  { name: "JetBrains Mono", category: "mono" },
  { name: "Space Mono", category: "mono" },
  { name: "Fira Code", category: "mono" },
];

export const defaultTokens: Tokens = {
  accent: "#d5ff42",
  accentSoft: "#eef9b4",
  ink: "#10110f",
  paper: "#f4f2ea",
  muted: "#92958d",
  line: "#2c3028",
  success: "#73e0d1",
  warning: "#ffc24a",
  danger: "#ff6b4a",
  displayFont: "Space Grotesk",
  bodyFont: "Inter",
  monoFont: "IBM Plex Mono",
  lineHeight: 1.55,
  tracking: -0.09,
  radius: 12,
  spacing: 8,
  typeScale: 1,
  borderWidth: 1,
  shadow: 2,
  motion: 200,
  breakpointSm: 640,
  breakpointMd: 768,
  breakpointLg: 1024,
};
