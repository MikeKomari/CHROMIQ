import { themeColors } from "@/lib/theme";
import { Ed, type SurfaceProps } from "./editable";

const roles = [
  { key: "displayFont", role: "Display", cls: "is-display", sample: "Quiet confidence" },
  { key: "bodyFont", role: "Body", cls: "is-body", sample: "Readable at any length" },
  { key: "monoFont", role: "Mono", cls: "is-mono", sample: "const tokens = {}" },
] as const;

const ladder = [
  { name: "Display", px: 56, cls: "is-display" },
  { name: "Heading 1", px: 40, cls: "is-display" },
  { name: "Heading 2", px: 28, cls: "is-display" },
  { name: "Heading 3", px: 20, cls: "is-display" },
  { name: "Body", px: 15, cls: "is-body" },
  { name: "Caption", px: 12, cls: "is-body" },
];

const weights = [300, 400, 500, 600, 700];

export function SpecimenSurface({ tokens, variant, mode = "light" }: SurfaceProps) {
  const colors = themeColors(tokens, mode);
  const swatches = [
    { name: "Accent", value: colors.accent },
    { name: "Accent soft", value: colors.accentSoft },
    { name: "Ink", value: colors.foreground },
    { name: "Paper", value: colors.background },
    { name: "Muted", value: colors.muted },
    { name: "Line", value: colors.line },
    { name: "Success", value: tokens.success },
    { name: "Warning", value: tokens.warning },
    { name: "Danger", value: tokens.danger },
  ];
  return (
    <div className="sf-spec">
      <header className="sf-spec-hero">
        <span className="sf-spec-glyph" aria-hidden="true">Aa</span>
        <div>
          <Ed as="span" className="sf-chip">
            {variant === "b" ? "Direction 02" : "Type specimen"}
          </Ed>
          <Ed as="h1" className="sf-spec-title">{tokens.displayFont}</Ed>
          <Ed as="p" className="sf-spec-sub">
            Paired with {tokens.bodyFont} and {tokens.monoFont}.
          </Ed>
        </div>
      </header>

      <section className="sf-spec-roles" aria-label="Font roles">
        {roles.map((r) => (
          <div key={r.key} className="sf-spec-role">
            <small>{r.role}</small>
            <strong>{tokens[r.key]}</strong>
            <span className={`sf-spec-sample ${r.cls}`}>
              <Ed>{r.sample}</Ed>
            </span>
            <span className={`sf-spec-alpha ${r.cls}`}>Aa Bb Cc 0123</span>
          </div>
        ))}
      </section>

      <section aria-label="Type scale">
        <h2 className="sf-spec-h">Type scale ({tokens.typeScale}x)</h2>
        <div className="sf-spec-ladder">
          {ladder.map((l) => (
            <div key={l.name} className="sf-spec-step">
              <small>
                {l.name}
                <b>{Math.round(l.px * tokens.typeScale * 10) / 10}px</b>
              </small>
              <span
                className={l.cls}
                style={{ fontSize: `calc(${l.px}px * var(--preview-scale))` }}
              >
                <Ed>The quick brown fox</Ed>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="sf-spec-para" aria-label="Paragraph sample">
        <h2 className="sf-spec-h">Paragraph</h2>
        <Ed as="p">
          Typography is the voice of an interface. A steady rhythm of size,
          weight and spacing lets people find what they need without noticing
          how they were guided. Set line height to {tokens.lineHeight} and
          tracking to {tokens.tracking}em, then read it aloud.
        </Ed>
      </section>

      <section aria-label="Weights">
        <h2 className="sf-spec-h">Weights</h2>
        <div className="sf-spec-weights">
          {weights.map((w) => (
            <span key={w} style={{ fontWeight: w }}>
              Aa <small>{w}</small>
            </span>
          ))}
        </div>
      </section>

      <section aria-label="Color tokens">
        <h2 className="sf-spec-h">Color tokens</h2>
        <div className="sf-spec-swatches">
          {swatches.map((s) => (
            <div key={s.name} className="sf-spec-swatch">
              <span style={{ background: s.value }} aria-hidden="true" />
              <small>{s.name}</small>
              <code>{s.value}</code>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Interactive states">
        <h2 className="sf-spec-h">States</h2>
        <div className="sf-row">
          <button className="sf-btn sf-btn-primary">Default</button>
          <button className="sf-btn sf-btn-primary is-hover">Hover</button>
          <button className="sf-btn sf-btn-primary is-focus">Focus</button>
          <button className="sf-btn sf-btn-primary" disabled>Disabled</button>
        </div>
      </section>
    </div>
  );
}
