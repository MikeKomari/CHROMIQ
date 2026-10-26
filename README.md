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
- **CHROMIQ on any site bookmarklet** — a drag-to-bookmarks-bar button (`public/chromiq-widget.js`) opens a floating restyle panel over the live page you are on. Sites with strict Content Security Policies can block bookmarklets or Google Fonts; use paste-a-link on those.

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
lib/rate-limit.ts       in-memory rate limiter and concurrency slots
hooks/use-workspace.ts  token state, undo history, persistence, and exports
data/workspace.ts       default tokens, starter presets, and the font catalog
lib/                    color math, contrast, importers, font loader, validation
types/workspace.ts      token and workspace types
DESIGN.md               visual source of truth
BACKLOG.md              Jira-style product backlog (epics CHROMIQ-100–CHROMIQ-900)
```

## Design and product

`DESIGN.md` is the source of truth for look and feel; the UI reads from the CHROMIQ token variables rather than hardcoded values. `BACKLOG.md` tracks the product across nine epics, from the workbench shell through export and quality.

---

made by [MikeKomari](https://michaelkimeison.com)