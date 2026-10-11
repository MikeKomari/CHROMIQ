# PRISM

**P**review · **R**efine · **I**nspect · **S**tyle & **M**anage

A browser-first visual design workbench for frontend developers. Tune a live token system, compare directions, and export implementation-ready output in the formats your stack already uses.

## What each letter does

- **Preview** — a live DOM preview that reacts to every token change. Light and dark surfaces, desktop/tablet/mobile/custom widths, zoom, and a side-by-side compare view.
- **Refine** — a color, type, and shape inspector: accent direction with harmony modes, WCAG contrast checks with per-pair grades, type pairing, radius, spacing, border, shadow, motion, and breakpoints.
- **Inspect** — a server-validated URL inspector (SSRF-safe, 8s timeout, 1.5 MB cap) that reconstructs a public page's title, headings, and hex colors with an honest confidence label.
- **Style** — a 12-font Google Fonts catalog (display/body/mono pairing), semantic color tokens including state colors, and a full token model that serializes and exports cleanly.
- **Manage** — projects, named snapshots (rename/duplicate), local version history (commit/restore/compare), undo/redo, and shareable read-only links. Everything persists in the browser.

## Stack

| Technology | Version | Purpose |
| --- | --- | --- |
| Next.js | ^15 | App Router shell and routes |
| React | ^19 | UI |
| TypeScript | ^5 | Types |
| Tailwind CSS | ^4 | Styling, driven by PRISM tokens |
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

PRISM exports the active token system to CSS custom properties, Tailwind v4, shadcn/ui variables, a JSON token file, a portable project file, and a generated DESIGN.md summary. Every format is copyable and downloadable, and failing tokens are flagged before download.

## Project structure

```
app/                    routes, global styles, and the /api/inspect route
components/workspace/   shell (topbar, sidebar, canvas, inspector) and modals
hooks/use-workspace.ts  token state, undo history, persistence, and exports
data/workspace.ts       default tokens, starter presets, and the font catalog
lib/                    color math, contrast, importers, font loader, validation
types/workspace.ts      token and workspace types
DESIGN.md               visual source of truth
BACKLOG.md              Jira-style product backlog (epics PRISM-100–PRISM-900)
```

## Design and product

`DESIGN.md` is the source of truth for look and feel; the UI reads from the PRISM token variables rather than hardcoded values. `BACKLOG.md` tracks the product across nine epics, from the workbench shell through export and quality.

---

made by [MikeKomari](https://michaelkimeison.com)