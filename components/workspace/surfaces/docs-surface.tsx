"use client";
import { useState } from "react";
import { AlertTriangle, ChevronRight, Info, Search } from "lucide-react";
import { Ed, type SurfaceProps } from "./editable";

const tree = [
  { group: "Getting started", items: ["Introduction", "Installation", "Quick start"] },
  { group: "Concepts", items: ["Tokens", "Theming", "Components"] },
  { group: "Reference", items: ["Configuration", "CLI"] },
];
const toc = ["Overview", "Usage", "Options", "Form controls"];

export function DocsSurface({ variant }: SurfaceProps) {
  const [active, setActive] = useState("Installation");
  const [agree, setAgree] = useState(true);
  const [notify, setNotify] = useState(false);

  return (
    <div className="sf-docs">
      <header className="sf-docs-bar">
        <span className="sf-docs-logo"><i aria-hidden="true" /> Northstar Docs</span>
        <label className="sf-dash-search">
          <Search size={14} />
          <input type="search" placeholder="Search docs" aria-label="Search docs" />
        </label>
      </header>

      <div className="sf-docs-grid">
        <nav className="sf-docs-nav" aria-label="Documentation">
          {tree.map((g) => (
            <div key={g.group}>
              <small>{g.group}</small>
              {g.items.map((i) => (
                <a
                  key={i}
                  href="#dc"
                  className={active === i ? "is-active" : ""}
                  aria-current={active === i ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    setActive(i);
                  }}
                >
                  {i}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <article className="sf-docs-content">
          <small className="sf-docs-crumb">
            Getting started <ChevronRight size={11} /> {active}
            {variant === "b" ? " (Direction 02)" : ""}
          </small>
          <Ed as="h1">{active}</Ed>
          <Ed as="p" className="sf-docs-lede">
            Add the package to your project and wire the tokens into your
            global stylesheet. The steps below take a few minutes.
          </Ed>

          <Ed as="h2">Usage</Ed>
          <Ed as="p">
            Import the stylesheet once, then reference variables such as{" "}
            <code>--color-accent</code> or <code>--radius</code> anywhere.
          </Ed>
          <pre className="sf-code" tabIndex={0}>
            <code>{`import "./tokens.css";

.button {
  background: var(--color-accent);
  border-radius: var(--radius);
}`}</code>
          </pre>

          <div className="sf-callout is-info" role="note">
            <Info size={15} />
            <Ed as="p">Tokens are plain CSS variables, so they work in any framework.</Ed>
          </div>
          <div className="sf-callout is-warning" role="note">
            <AlertTriangle size={15} />
            <Ed as="p">Changing the base font size also rescales spacing.</Ed>
          </div>

          <Ed as="h2">Options</Ed>
          <div className="sf-table-wrap">
            <table className="sf-table">
              <thead><tr><th>Name</th><th>Type</th><th>Default</th></tr></thead>
              <tbody>
                <tr><td><code>radius</code></td><td><code>number</code></td><td><code>6</code></td></tr>
                <tr><td><code>accent</code></td><td><code>string</code></td><td><code>#000</code></td></tr>
              </tbody>
            </table>
          </div>

          <Ed as="h2">Form controls</Ed>
          <div className="sf-docs-form">
            <label>
              <span>Project name</span>
              <input className="sf-input" defaultValue="my-project" />
            </label>
            <label>
              <span>Framework</span>
              <select className="sf-input" defaultValue="next">
                <option value="next">Next.js</option>
                <option value="vite">Vite</option>
                <option value="astro">Astro</option>
              </select>
            </label>
            <label>
              <span>Disabled</span>
              <input className="sf-input" disabled defaultValue="Not editable" />
            </label>
            <label className="sf-check">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              Use TypeScript
            </label>
            <label className="sf-switch-row">
              <button
                type="button"
                role="switch"
                aria-checked={notify}
                aria-label="Email updates"
                className={`sf-switch${notify ? " is-on" : ""}`}
                onClick={() => setNotify((n) => !n)}
              />
              Email updates
            </label>
          </div>
        </article>

        <aside className="sf-docs-toc" aria-label="On this page">
          <small>On this page</small>
          {toc.map((t, i) => (
            <a key={t} href="#dc" className={i === 1 ? "is-active" : ""} onClick={(e) => e.preventDefault()}>
              {t}
            </a>
          ))}
        </aside>
      </div>
    </div>
  );
}
