# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it has tagged releases.

## [Unreleased]

There are no tagged releases yet. This section summarizes what exists today.

### Added

- Landing page at `/` and the workbench at `/workspace`.
- Builder-style workspace: icon rail, context panel, canvas, and inspector, with a Comfort and a High contrast reading mode.
- Live token editing for type, color, shape, spacing, and motion, with click-to-edit tokens on the canvas, a color picker, and a device switcher.
- Color scales, WCAG contrast checks with auto-fix, and color-vision preview.
- Six token-driven preview surfaces, compare mode, undo/redo, randomize with locked tokens, snapshots, and local version history.
- Projects and settings persisted in the browser, and read-only share links.
- URL inspector (`/api/inspect`) and scripts-off website preview (`/api/proxy`), with SSRF protection, size and time limits, and rate limiting.
- Restyle view for changing a fetched site's type, colors, accent, and radius, and a "CHROMIQ on any site" bookmarklet.
- Exports to CSS custom properties, Tailwind v4, shadcn/ui variables, DTCG JSON tokens, a portable project file, and DESIGN.md.
- CHROMIQ brand assets, favicon and app icons, web manifest, `robots.txt`, and `sitemap.xml`.
- Privacy and Terms pages, 404 and global error screens, and a workspace loading state.
- MIT license, contributing guide, and issue and pull request templates.
- Optional accounts, cloud sync, short share links, and account deletion, all off unless a database is configured.
- `CHROMIQ_ACCOUNTS` flag to force accounts and cloud sync on or off independently of `DATABASE_URL`, so the rest of the app can be worked on without a reachable database.
