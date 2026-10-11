import type { Mode, PreviewSurfaceKind, Tokens } from "@/types/workspace";
import { MoreHorizontal } from "lucide-react";

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
  const content = {
    editorial: {
      kicker: variant === "b" ? "Direction 02" : "A quieter way forward",
      title: (
        <>
          Make room
          <br />
          <em>for the good stuff.</em>
        </>
      ),
      lede: "A thoughtful toolkit for teams shaping products with clarity, character, and a little more breathing room.",
    },
    dashboard: {
      kicker: "System pulse / 08:42",
      title: (
        <>
          See the signal
          <br />
          <em>through the noise.</em>
        </>
      ),
      lede: "A calm command center for teams making decisions with the right context in view.",
    },
    commerce: {
      kicker: "Objects with intent",
      title: (
        <>
          Make it
          <br />
          <em>worth keeping.</em>
        </>
      ),
      lede: "A warmer storefront language for products that deserve attention beyond the first scroll.",
    },
  }[surface];
  return (
    <div
      className={`design-preview ${light ? "light-preview" : "dark-preview"} surface-${surface}`}
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
        } as React.CSSProperties
      }
    >
      <div className="preview-header">
        <div className="preview-logo">
          <span className="preview-logo-mark" /> NORTHSTAR <small>studio</small>
        </div>
        <nav>
          <span>Work</span>
          <span>About</span>
          <span>Notes</span>
        </nav>
        <button className="preview-menu" aria-label="Menu">
          <MoreHorizontal size={15} />
        </button>
      </div>
      <div className="preview-body">
        <div className="preview-kicker">
          <span className="kicker-line" /> {content.kicker}
        </div>
        <h2>{content.title}</h2>
        <p className="preview-lede">{content.lede}</p>
        <div className="preview-cta-row">
          <button className="preview-cta">
            Explore the system <span>↗</span>
          </button>
          <span className="preview-caption">
            SCROLL TO BEGIN
            <br />
            <b>02 / 08</b>
          </span>
        </div>
        <div className="preview-cards">
          <div className="preview-card card-main">
            <span className="card-index">01</span>
            <strong>
              Clarity
              <br />
              over noise.
            </strong>
            <span className="card-arrow">↗</span>
          </div>
          <div className="preview-card card-small">
            <span className="card-index">02</span>
            <strong>
              Make it
              <br />
              memorable.
            </strong>
          </div>
          <div className="preview-card card-note">
            <span className="card-index">03</span>
            <span>
              Notes on
              <br />
              building better
              <br />
              interfaces.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
