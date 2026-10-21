import { onAccent, themeColors } from "@/lib/theme";
import type { Mode, PreviewSurfaceKind, Tokens } from "@/types/workspace";
import {
  CommerceSurface,
  DashboardSurface,
  DocsSurface,
  EditorialSurface,
  SaasSurface,
  SpecimenSurface,
} from "@/components/workspace/surfaces";

const surfaces = {
  editorial: EditorialSurface,
  saas: SaasSurface,
  dashboard: DashboardSurface,
  commerce: CommerceSurface,
  docs: DocsSurface,
  specimen: SpecimenSurface,
};

export function PreviewSurface({
  tokens,
  mode,
  variant,
  surface,
}: {
  tokens: Tokens;
  mode: Mode;
  variant: "a" | "b" | "single";
  surface: PreviewSurfaceKind;
}) {
  const light = mode === "light";
  const colors = themeColors(tokens, mode);
  const Surface = surfaces[surface] ?? EditorialSurface;
  const kind = surface in surfaces ? surface : "editorial";
  return (
    <div
      data-mode={mode}
      data-variant={variant}
      className={`design-preview ${light ? "light-preview" : "dark-preview"} surface-${kind}`}
      style={
        {
          "--preview-bg": colors.background,
          "--preview-ink": colors.foreground,
          "--preview-muted": colors.muted,
          "--preview-line": colors.line,
          "--preview-accent": colors.accent,
          "--preview-accent-soft": colors.accentSoft,
          "--preview-on-accent": onAccent(colors),
          "--preview-radius": `${tokens.radius}px`,
          "--preview-space": `${tokens.spacing}px`,
          "--preview-scale": tokens.typeScale,
          "--preview-font-display": `"${tokens.displayFont}"`,
          "--preview-font-body": `"${tokens.bodyFont}"`,
          "--preview-font-mono": `"${tokens.monoFont}"`,
          "--preview-line-height": tokens.lineHeight,
          "--preview-tracking": `${tokens.tracking}em`,
          "--preview-border": `${tokens.borderWidth}px`,
          "--preview-shadow": tokens.shadow,
          "--preview-motion": `${tokens.motion}ms`,
          "--preview-success": tokens.success,
          "--preview-warning": tokens.warning,
          "--preview-danger": tokens.danger,
          "--preview-paper": colors.background,
        } as React.CSSProperties
      }
    >
      <span className="sf-hint">Click text to edit</span>
      <Surface tokens={tokens} variant={variant} mode={mode} />
    </div>
  );
}
