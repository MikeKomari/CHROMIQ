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
- Cloud project sync in the workbench: opt in per project, autosave after that, a visible and retryable failure state, and a conflict dialog that never picks a winner for you.
- Diagnostics kept in CHROMIQ's own database rather than sent to an analytics vendor: errors from both boundaries, proxy and inspector failure reasons, Core Web Vitals from real sessions, and feature use. Off unless `NEXT_PUBLIC_CHROMIQ_TELEMETRY` is set.
- In-product feedback at `/feedback`, prefilled with the address that failed when it is reached from a failed load.
- A public changelog at `/changelog`, generated from this file.
- A dedicated 1200x630 social card, generated from `brand/web/social-card.html`.
- `scripts/verify-browsers.mjs`, a browser and device matrix smoke test that runs the same checks across every installed Playwright engine and two emulated phone profiles.
- Optional headless capture (`CHROMIQ_CAPTURE=on`): renders a public page in a real browser and reports colours and fonts measured from the render, with every request it makes checked against the same private-address rules as the inspector. Off by default, and hidden rather than broken where no browser is installed.

### Changed

- The proxy and inspector now share one rate-limit quota across server instances instead of one per warm instance.
- A tag deploy waits for the same lint, type-check, test and build run that pull requests get; it used to deploy straight from the checkout.
- The installed app's window and splash screen follow the dark theme instead of flashing white.

### Fixed

- A truncated password hash no longer verifies. scrypt output is prefix-stable, so a shortened stored hash matched the prefix of a real derivation.
- `rate_limits` rows are pruned; closed windows were kept for ever.
- Links inside the text of the privacy, terms, changelog and feedback pages are underlined. They had neither underline nor a distinct colour, so they were indistinguishable from the text around them.
- The header navigation on those pages no longer pushes the page sideways on a narrow phone.
- Controls behind the inspector drawer are inert on narrow layouts. The canvas toolbar stayed tabbable and present to a screen reader while invisible and untappable behind the open drawer.

### Removed

- The MIT licence. CHROMIQ is now all rights reserved: the source stays public to read, but carries no grant to copy, modify or redistribute. Not retroactive — anyone who took a copy under MIT keeps that grant for that version. See `docs/adr/0001-remove-the-mit-licence.md`.
