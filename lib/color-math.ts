export function hexToHsl(hex: string) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

const clamp = (n: number, min: number, max: number) =>
  Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;

/** Always returns `#rrggbb`: hue wraps around, saturation and lightness clamp to 0-100, non-finite input counts as 0. */
export function hslToHex(h: number, s: number, l: number) {
  const hue = Number.isFinite(h) ? ((h % 360) + 360) % 360 : 0;
  const sat = clamp(s, 0, 100);
  const light = clamp(l, 0, 100);
  const a = (sat * Math.min(light / 100, 1 - light / 100)) / 100;
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const color =
      light / 100 - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return clamp(Math.round(255 * color), 0, 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
