const steps = [
  ["Paste a link", "Works with most public pages. PRISM loads a scripts-off copy in a sandboxed preview, so the site is never modified. Pages built entirely with JavaScript may render incompletely."],
  ["Tune type and color", "Change font size, fonts, weights, line height, spacing and colors live, or apply your PRISM tokens."],
  ["Export override CSS", "Copy the changes as an override stylesheet you can drop into the real project."],
] as const;

export function RestyleSteps() {
  return (
    <section id="restyle" className="ld-section ld-tint" aria-labelledby="restyle-title">
      <div className="ld-wrap ld-grid">
        <header className="ld-section-head">
          <p className="ld-kicker">
            <span>02</span> Restyle
          </p>
          <h2 id="restyle-title" className="ld-h2">
            Change a live page without touching its code.
          </h2>
        </header>
        <ol className="ld-steps">
          {steps.map(([title, text], i) => (
            <li key={title}>
              <span className="ld-num">Step {i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
