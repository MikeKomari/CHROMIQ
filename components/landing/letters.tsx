const letters = [
  ["P", "Preview", "See the system on real surfaces, not just swatches: six preview layouts."],
  ["R", "Refine", "Randomize coherent palettes, lock what you like, and adjust type, radius, spacing and shadow."],
  ["I", "Inspect", "Compare A and B side by side, and read the exact tokens behind every choice."],
  ["S", "Style", "Restyle a live website's fonts, weights, line height, spacing and colors in a sandbox."],
  ["M", "Manage", "Keep tokens in one place and export them as code your project can use."],
] as const;

export function Letters() {
  return (
    <section className="ld-section" aria-labelledby="letters-title">
      <div className="ld-wrap ld-grid">
        <header className="ld-section-head">
          <p className="ld-kicker">
            <span>01</span> The name
          </p>
          <h2 id="letters-title" className="ld-h2">
            What each letter does
          </h2>
        </header>
        <ol className="ld-letters">
          {letters.map(([l, name, text], i) => (
            <li key={l}>
              <span className="ld-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="ld-letter" aria-hidden="true">
                {l}
              </span>
              <h3>{name}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
