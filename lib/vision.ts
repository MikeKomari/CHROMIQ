export type VisionMode =
  | "none"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "achromatopsia"
  | "blur";

export const visionModes: { value: VisionMode; label: string; note: string }[] = [
  { value: "none", label: "Normal vision", note: "" },
  { value: "protanopia", label: "Protanopia (no red cones)", note: "Protanopia" },
  { value: "deuteranopia", label: "Deuteranopia (no green cones)", note: "Deuteranopia" },
  { value: "tritanopia", label: "Tritanopia (no blue cones)", note: "Tritanopia" },
  { value: "achromatopsia", label: "Achromatopsia (no color)", note: "Achromatopsia" },
  { value: "blur", label: "Low acuity (blur)", note: "Low acuity" },
];

export type ColorMatrix = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
];

// Machado, Oliveira & Fernandes (2009), severity 1.0. These are the linear-RGB
// matrices, so the SVG filters below run with color-interpolation-filters="linearRGB".
export const visionMatrices: Record<
  "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia",
  ColorMatrix
> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
  achromatopsia: [
    [0.2126, 0.7152, 0.0722],
    [0.2126, 0.7152, 0.0722],
    [0.2126, 0.7152, 0.0722],
  ],
};

/** CSS `filter` value for a mode; "none" when no simulation is active. */
export function visionFilter(mode: VisionMode): string {
  if (mode === "none") return "none";
  if (mode === "blur") return "blur(1.5px)";
  return `url(#prism-vision-${mode})`;
}
