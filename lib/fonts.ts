const DEFAULT_FONTS = ["Space Grotesk", "Inter", "IBM Plex Mono"];

const WEIGHTS: Record<string, string> = {
  "Space Grotesk": "400;500;600;700",
  "Playfair Display": "500;600;700",
  Fraunces: "500;600;700",
  Archivo: "500;600;700",
  Inter: "400;500;600",
  Lato: "400;700",
  "IBM Plex Sans": "400;500;600",
  "DM Sans": "400;500;700",
  "IBM Plex Mono": "400;500;600",
  "JetBrains Mono": "400;500;700",
  "Space Mono": "400;700",
  "Fira Code": "400;500;600",
};

export function loadFontFamily(family: string) {
  if (!family || DEFAULT_FONTS.includes(family)) return;
  const id = `font-${family.replace(/\s+/g, "-").toLowerCase()}`;
  if (document.getElementById(id)) return;
  const weights = WEIGHTS[family] ?? "400;600";
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, "+")}:wght@${weights}&display=swap`;
  document.head.appendChild(link);
}
