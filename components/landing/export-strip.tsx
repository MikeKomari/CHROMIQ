const formats = ["CSS variables", "Tailwind v4", "shadcn/ui", "JSON tokens", "DESIGN.md"];

export function ExportStrip() {
  return (
    <section id="export" className="ld-section" aria-labelledby="ex-title">
      <div className="ld-wrap ld-grid">
        <header className="ld-section-head">
          <p className="ld-kicker">
            <span>05</span> Export
          </p>
          <h2 id="ex-title" className="ld-h2">
            Leave with code, not screenshots.
          </h2>
        </header>
        <div className="ld-export">
          <ul className="ld-chips" aria-label="Export formats">
            {formats.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <pre className="ld-code" tabIndex={0}>
            <code>{`:root {
  --accent: #8f72f5;
  --font-display: "Space Grotesk", sans-serif;
  --radius: 12px;
}`}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
