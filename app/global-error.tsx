"use client";

import { RefreshCcw, TriangleAlert } from "lucide-react";

// global-error replaces the root layout, so globals.css is not loaded here.
// The tokens below mirror the Comfort values in DESIGN.md.
const styles = `
:root {
  --bg-deep: #0b0b0d;
  --panel: #17171a;
  --text: #dcdde4;
  --muted: #8d97a8;
  --line: #2a2b30;
  --accent: #8f72f5;
  --accent-ink: #0b0b0d;
  --coral: #e07a6b;
  --shadow: rgba(0, 0, 0, 0.35);
  color-scheme: dark;
}
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  box-sizing: border-box;
  background: var(--bg-deep);
  color: var(--text);
  font-family: Inter, system-ui, sans-serif;
}
.card {
  width: min(420px, 100%);
  padding: 28px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: 0 12px 32px var(--shadow);
}
.card svg { color: var(--coral); margin-bottom: 20px; }
.eyebrow {
  display: block;
  color: var(--muted);
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
}
h1 { margin: 8px 0 10px; font-weight: 500; font-size: 28px; letter-spacing: -0.04em; }
p { margin: 0 0 20px; color: var(--muted); font-size: 14px; line-height: 1.5; }
button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--accent);
  border-radius: 4px;
  background: var(--accent);
  color: var(--accent-ink);
  font: 600 14px Inter, system-ui, sans-serif;
  cursor: pointer;
}
button:hover { filter: brightness(1.1); }
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
`;

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <title>Something went wrong | CHROMIQ</title>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </head>
      <body>
        <main className="card">
          <TriangleAlert size={20} aria-hidden="true" />
          <span className="eyebrow">CHROMIQ recovery</span>
          <h1>CHROMIQ could not start.</h1>
          <p>
            An error stopped the app before the page could load. Projects saved
            in this browser are untouched. Try loading it again.
          </p>
          <button type="button" onClick={reset}>
            <RefreshCcw size={15} aria-hidden="true" /> Try again
          </button>
        </main>
      </body>
    </html>
  );
}
