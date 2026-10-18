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
  const Surface = surfaces[surface] ?? EditorialSurface;
  const kind = surface in surfaces ? surface : "editorial";
  return (
    <div
      className={`design-preview ${light ? "light-preview" : "dark-preview"} surface-${kind}`}
      style={
        {
          "--preview-accent": tokens.accent,
          "--preview-accent-soft": tokens.accentSoft,
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
          "--preview-paper": tokens.paper,
          "--preview-line": tokens.line,
        } as React.CSSProperties
      }
    >
      <span className="sf-hint">Click text to edit</span>
      <Surface tokens={tokens} variant={variant} />
    </div>
  );
}
