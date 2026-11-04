# CHROMIQ

**C**ontrast · **H**armony · **R**adius · **O**utput · **M**otion · **I**nspect · **Q**uality

A browser-first visual design workbench for frontend developers. Tune a live token system, compare directions, and export implementation-ready output in the formats your stack already uses.

## What each letter does

- **Contrast** — WCAG contrast checks with per-pair grades, an auto-fix for failing pairs, and a color-vision preview.
- **Harmony** — accent-driven palettes in analogous, complementary, triadic, monochrome, and split-complementary modes, with light/dark theme pairs and semantic state colors.
- **Radius** — the shape layer: radius, spacing, border width, shadow depth, and breakpoints.
- **Output** — CSS custom properties, Tailwind v4, shadcn/ui variables, a JSON token file, DTCG, a portable project file, and a generated DESIGN.md.
- **Motion** — a motion-duration token that drives the preview, plus a reduced-motion setting honored across the UI.
- **Inspect** — a server-validated URL inspector (SSRF-safe, 8s timeout, 1.5 MB cap) that reconstructs a public page's title, headings, and hex colors with an honest confidence label.
- **Quality** — failing tokens are flagged before download, and named snapshots, local version history (commit/restore/compare), and undo/redo keep every direction recoverable.

## Also in CHROMIQ

- **Live preview** — a DOM preview that reacts to every token change: light and dark surfaces, desktop/tablet/mobile/custom widths, zoom, and a side-by-side compare view.
- **Type system** — a 12-font Google Fonts catalog with display/body/mono pairing, plus type scale, line height, and tracking.
- **Landing page and workspace** — `/` is a landing page with a live restyle demo; the workbench itself lives at `/workspace`.
- **Reading comfort** — a calm Comfort mode (default) and a High-contrast mode, switchable on the landing page and in the workspace. The choice is remembered in the browser.
- **Six preview surfaces** — SaaS, dashboard, commerce, docs, editorial, and type specimen, all driven by the same tokens. Text in each surface is editable in place.
- **Restyle any website** — paste a link and CHROMIQ loads a scripts-off copy through a server proxy (`/api/proxy`: SSRF-checked, size and time limited, rate limited). Change type, colors, accent, and radius live, then copy the override CSS. It is a static preview, not the live site, so pages built entirely with JavaScript may render incompletely and some sites cannot be fetched.
- **CHROMIQ on any site bookmarklet** — a drag-to-bookmarks-bar button (`public/chromiq-widget.js`) opens a floating restyle panel over the live page you are on. A strict Content Security Policy stops it; see [The bookmarklet and Content Security Policy](#the-bookmarklet-and-content-security-policy) for exactly what each policy does, and use paste-a-link on those sites.

## Stack

| Technology | Version | Purpose |
| --- | --- | --- |
| Next.js | ^15 | App Router shell and routes |
| React | ^19 | UI |
| TypeScript | ^5 | Types |
| Tailwind CSS | ^4 | Styling, driven by CHROMIQ tokens |
| Lucide React | ^0.468 | Icons |
| Motion | ^14 | Transitions and micro-animations |

## Prerequisites

Node.js 18.18 or newer, and npm.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Production build and serve:

```bash
npm run build
npm run start
```

Type-check and lint:

```bash
npm run lint
```

## Export formats

CHROMIQ exports the active token system to CSS custom properties, Tailwind v4, shadcn/ui variables, a JSON token file, a portable project file, and a generated DESIGN.md summary. Every format is copyable and downloadable, and failing tokens are flagged before download.

## Headless capture (optional)

The inspector fetches a page's HTML with scripts off, which is honest but
leaves a client-rendered site looking empty. With `CHROMIQ_CAPTURE=on` and a
browser installed on the server, CHROMIQ can render the page instead and
report colours and fonts measured from what was actually painted.

```bash
npm install --no-save playwright && npx playwright install chromium
CHROMIQ_CAPTURE=on npm run start
```

It is off by default and not a dependency: it needs a browser binary that most
serverless hosts do not have. Where it is unavailable the control is hidden
rather than shown and broken, and `GET /api/capture` answers `501`.

A browser does its own DNS and follows its own redirects, so the SSRF
protection that guards the other outbound routes does not apply to it. Every
request it makes — the first navigation, each redirect hop, and every image,
stylesheet and font — is checked against the same private-address rules first,
and the guard walks redirect chains itself rather than letting the browser do
it. `tests/integration/capture-ssrf.test.ts` holds that to account against a
real Chromium; two redirect bugs in this code passed review and were caught
there.

## Supported browsers

CHROMIQ targets the current and previous versions of Chrome, Edge, Firefox and
Safari on desktop, and current Chrome and Safari on phones and tablets. It
needs `localStorage` to remember anything between sessions; everything else is
standard.

What has actually been verified, as opposed to targeted:

| Browser | Verified | How |
| --- | --- | --- |
| Chrome / Edge (Chromium 141) | Yes | `scripts/verify-browsers.mjs`, 28 checks across four viewports |
| Firefox | **No** | The engine could not be installed in the environment the checks were run in |
| Safari (WebKit) | **No** | As above |
| Real phone | **No** | Only emulated iPhone 14 and Pixel 7 profiles, which set viewport, scale, touch and user agent but not a real renderer, GPU or font stack |

To fill in the rest, run the matrix yourself against a production build:

```bash
npm run build
npm run start &
npx playwright@1.49.1 install chromium firefox webkit   # once
node scripts/verify-browsers.mjs
```

Engines that are not installed are reported as "not installed" rather than
quietly skipped, so a partial matrix reads as a partial matrix. Playwright is
deliberately not a dependency: this is a release check, not something every
`npm install` should download three browsers for.

## The bookmarklet and Content Security Policy

"CHROMIQ on any site" injects `public/chromiq-widget.js` into the page you are
on. A site's Content Security Policy can stop that, and the behaviour below was
measured against real CSP headers in Chromium rather than reasoned about:

| The site sends | What happens |
| --- | --- |
| No CSP | Works. |
| `script-src 'self'` or `default-src 'self'` | **The widget never loads.** The browser refuses the script before any CHROMIQ code runs, so there is no panel and no error in the page. Nothing can be done from CHROMIQ's side; this is the policy working as intended. |
| A CSP that allows CHROMIQ's origin in `script-src` | Works. |
| …but `style-src 'self'` with no `'unsafe-inline'` | The panel loads and **restyling still works**, because the widget sets styles through the CSSOM (`element.style.…`), which CSP does not govern. The panel's own stylesheet is refused, so the controls appear unstyled and full-width rather than as a 300px panel. |
| …but `fonts.googleapis.com` is not in `style-src` | Font choices appear to apply but do not: the widget sets the family while the browser refuses the Google Fonts stylesheet, so the page falls back to a generic serif or sans. The panel does not currently warn about this. |
| `sandbox allow-scripts` | Works. |

In short: a strict `script-src` is a hard stop, and a strict `style-src` leaves
the widget working but looking broken. A site cannot be restyled from the
bookmarklet unless it is willing to allow CHROMIQ's origin as a script source.
The scripts-off preview at `/workspace` (restyle view) is the way round this,
because the page is fetched server-side rather than injected into.

## Project structure

```
app/                    routes (/ landing, /workspace), global styles, /api/inspect and /api/proxy
components/landing/     landing page sections, live demo, and bookmarklet block
components/workspace/   shell (topbar, sidebar, canvas, inspector) and modals
components/workspace/surfaces/  the six token-driven preview surfaces
components/workspace/restyle/   restyle view, engine, controls, and state
public/chromiq-widget.js  the "CHROMIQ on any site" bookmarklet panel
lib/safe-fetch.ts       SSRF-safe fetch used by the inspector and proxy
lib/url-safety.ts       public-URL and private-address validation
lib/rate-limit.ts       in-process limiter; the shared one is lib/server/rate-limit-db.ts
lib/telemetry.ts        client diagnostics; lib/server/telemetry.ts writes them
lib/server/capture.ts   headless capture and its per-request SSRF guard
tests/integration/      tests that need a real browser; they skip without one
scripts/verify-browsers.mjs  the browser and device matrix smoke test
hooks/use-workspace.ts  token state, undo history, persistence, and exports
data/workspace.ts       default tokens, starter presets, and the font catalog
lib/                    color math, contrast, importers, font loader, validation
types/workspace.ts      token and workspace types
DESIGN.md               visual source of truth
BACKLOG.md              Jira-style product backlog (epics CHROMIQ-100–CHROMIQ-1000)
```

## Design and product

`DESIGN.md` is the source of truth for look and feel; the UI reads from the CHROMIQ token variables rather than hardcoded values. `BACKLOG.md` tracks the product across nine epics, from the workbench shell through export and quality.

---

made by [MikeKomari](https://michaelkimeison.com)