# PRISM backlog

Product backlog for the PRISM visual design workbench. Tickets use a Jira-like format so each item has a clear reason, scope, and definition of done.

## Product principles

- PRISM is a browser-first visual system workbench, not a generic admin dashboard.
- The live preview must be honest: DOM preview, screenshot preview, and reconstructed preview are different product states.
- Every exported value must reflect the active system.
- Design tokens are the product model; UI components are views over that model.
- Dark mode is the default workbench environment. Light mode is a first-class preview target.
- No fabricated testimonials, logos, ratings, usage numbers, or customer claims.

## Status vocabulary

- `BACKLOG`: defined but not started
- `READY`: scoped and ready for implementation
- `IN PROGRESS`: actively being built
- `BLOCKED`: waiting on a dependency or product decision
- `DONE`: implemented and verified

## Priority vocabulary

- `P0`: required for the first useful release
- `P1`: high-value follow-up
- `P2`: product expansion
- `P3`: exploratory or long-term

## Epic map

| Epic      | Area            | Outcome                                                               |
| --------- | --------------- | --------------------------------------------------------------------- |
| PRISM-100 | Workbench shell | Users can navigate and understand the workspace                       |
| PRISM-200 | Token engine    | Changes are represented as a reliable design system                   |
| PRISM-300 | Live preview    | Users can see tokens applied to realistic interfaces                  |
| PRISM-400 | Exploration     | Users can generate, compare, and save directions                      |
| PRISM-500 | Import          | Existing CSS and Tailwind systems can enter PRISM                     |
| PRISM-600 | Export          | Systems leave PRISM in production-ready formats                       |
| PRISM-700 | Inspection      | PRISM can inspect public websites honestly                            |
| PRISM-800 | Persistence     | Projects can be saved, shared, and versioned                          |
| PRISM-900 | Quality         | Accessibility, performance, security, and reliability stay measurable |

---

## PRISM-100 — Workbench shell

### PRISM-101 — Product shell and responsive layout

- **Priority:** P0
- **Status:** DONE
- **User story:** As a frontend developer, I want one focused workbench so I can move between system setup, preview, and export without losing context.
- **Scope:** Top bar, starter rail, canvas area, inspector, responsive tablet/mobile fallback.
- **Acceptance criteria:**
  - Desktop layout has navigation, canvas, and inspector regions.
  - The workspace is a static full-viewport shell: the page never scrolls, only the inspector, restyle controls and preview area scroll internally, and the left sidebar scrolls without a visible scrollbar. The layout adapts to browser zoom and narrow viewports (the context panel overlays the canvas below 1100px and the inspector becomes a drawer below 900px) instead of scrolling horizontally.
  - All interactive elements have visible focus states.

### PRISM-102 — Workspace project switcher

- **Priority:** P1
- **Status:** DONE
- **User story:** As a user, I want to switch between design systems without leaving the workbench.
- **Scope:** Project list, create project action, rename, duplicate, archive.
- **Acceptance criteria:**
  - Project switcher lists saved local projects.
  - Create and rename actions validate non-empty names.
  - Current project is visually distinct.
  - Archived projects are removed from the active list but recoverable.

### PRISM-103 — Command palette

- **Priority:** P1
- **Status:** DONE
- **User story:** As a keyboard-heavy developer, I want to access common actions without hunting through panels.
- **Scope:** Search, open panel, randomize palette, toggle theme, compare, export, reset.
- **Acceptance criteria:**
  - Opens with `⌘K` or `Ctrl+K`.
  - Supports keyboard navigation and escape to close.
  - Each command has an accessible label and shortcut hint.

### PRISM-104 — Workspace settings

- **Priority:** P1
- **Status:** DONE
- **User story:** As a user, I want workspace-level preferences separate from design tokens.
- **Scope:** Default preview mode, reduced motion override, grid visibility, autosave behavior, export preferences.
- **Acceptance criteria:**
  - Settings do not mutate design tokens.
  - Settings persist per project.
  - Reset settings is separate from reset system.

### PRISM-105 — Builder layout redesign

- **Priority:** P1
- **Status:** DONE
- **User story:** As a user, I want a focused builder layout so the canvas has room and every tool has one obvious place.
- **Scope:** Top bar, icon rail with a collapsible context panel (Starters, Projects, Snapshots, Versions), one-row canvas header, sectioned inspector, violet/graphite palette from DESIGN.md, `components/workspace/shell/` split.
- **Acceptance criteria:**
  - The canvas header is one row at 1440x900 and 1280x800 with the panel and inspector open.
  - Inspector sections collapse independently and remember their state per browser.
  - Closing a panel or drawer returns focus to its opener; narrow overlays focus their heading.
  - Read-only shared links disable every control that would change tokens or projects.
  - No fabricated projects, avatars, or shortcuts.

## PRISM-200 — Token engine

### PRISM-201 — Structured token model

- **Priority:** P0
- **Status:** DONE
- **User story:** As a developer, I want token values represented consistently so every preview and export agrees.
- **Scope:** Semantic color, typography, radius, spacing, border, shadow, motion, and breakpoint tokens.
- **Acceptance criteria:**
  - Token model has stable IDs and semantic names.
  - UI edits update one canonical state object.
  - Tokens can be serialized and restored without losing values.
  - Invalid values are rejected before export.

### PRISM-202 — Theme pairs for light and dark mode

- **Priority:** P0
- **Status:** DONE
- **User story:** As a designer, I want to test one system in both light and dark contexts.
- **Scope:** Paired semantic values, theme selector, system preference option, split preview.
- **Acceptance criteria:**
  - Light and dark themes can be previewed without changing the other theme.
  - Exports include both theme scopes.
  - Contrast checks run for both themes.
  - System preference can be used as the default.
- **Notes:** Light colors live in `accent/accentSoft/ink/paper/muted/line`, dark colors in the `dark*` pairs (`lib/theme.ts` maps roles to keys). The preview reads every color from tokens, a "Themes" canvas view shows both side by side, and data saved before the split is migrated on load (`lib/tokens.ts`).

### PRISM-203 — Undo and redo history

- **Priority:** P0
- **Status:** DONE
- **User story:** As a user, I want to explore freely without fearing a bad change.
- **Acceptance criteria:**
  - Token edits can be undone and redone.
  - History does not grow without a cap.
  - Undo and redo are disabled when no action is available.
  - Randomize is one undoable action.

### PRISM-204 — Contrast and color-quality checks

- **Priority:** P0
- **Status:** DONE
- **User story:** As a developer, I want to know when a palette is unsafe before I export it.
- **Scope:** WCAG text contrast, large-text contrast, interactive-state contrast, warning and pass states.
- **Acceptance criteria:**
  - Checks run against all semantic foreground/background pairs.
  - Failing pairs identify the exact token names.
  - Randomize never silently applies a palette that fails required checks.
  - User can still intentionally keep a failing value with a visible warning.

### PRISM-205 — Token locks

- **Priority:** P1
- **Status:** DONE
- **User story:** As a user, I want to explore palette directions while keeping important values fixed.
- **Scope:** Lock state, lock indicators, randomize behavior, persistence.
- **Acceptance criteria:**
  - Locked tokens do not change during randomization.
  - Lock state is visible in the inspector.
  - Lock state persists per project.
  - Releasing restores the token to the randomization pool.

### PRISM-206 — Typography token system

- **Priority:** P0
- **Status:** DONE
- **User story:** As a frontend developer, I want to pair display, body, and mono faces from a real font library so my system has a complete type voice.
- **Scope:** Display/body/mono font tokens, a curated Google Fonts catalog (12 faces), a wired type-panel picker, a live specimen, and font-aware preview and exports.
- **Acceptance criteria:**
  - The token model carries displayFont, bodyFont, and monoFont.
  - The type panel pairs any catalog font into any role.
  - Changing a font updates the preview and exports without a reload.
  - Older stored tokens load with font defaults instead of breaking.

### PRISM-207 — Color, type, and spacing scales

- **Priority:** P1
- **Status:** DONE
- **User story:** As a frontend developer, I want full scales derived from my tokens so I do not hand-build shades and size steps.
- **Scope:** `lib/scales.ts`: 11-step accent ramp (50–950), modular type scale (xs–4xl, ratio from the display scale token), spacing scale (0.5–16 × base unit); accent scale strip in the Color panel.
- **Acceptance criteria:**
  - Ramps keep the accent hue and always produce `#rrggbb`.
  - Each ramp swatch is a labelled button that copies its hex.
  - CSS, Tailwind, and DTCG exports include the scales; Tailwind keys are namespaced (`--text-prism-*`, `--color-prism-accent-*`) so they do not override Tailwind defaults.

### PRISM-208 — Contrast auto-fix

- **Priority:** P1
- **Status:** DONE
- **User story:** As a developer, I want a failing contrast pair fixed for me without losing the color's character.
- **Scope:** `lib/contrast-fix.ts`, per-row "Fix" and section-level "Fix all" in the contrast check.
- **Acceptance criteria:**
  - A fix keeps hue and saturation and makes the smallest lightness change that passes.
  - Fixes prefer candidates that do not break other passing pairs; if one does, a status message names the pair that now fails.
  - Locked tokens are never changed; unresolved pairs are reported.
  - Each Fix / Fix all is one undoable change.

### PRISM-209 — Built-in color picker

- **Priority:** P1
- **Status:** DONE
- **Acceptance criteria:**
  - Saturation/brightness square, hue slider, hex field, and swatches, all keyboard operable.
  - A drag is one undo step (`updateTokens(changes, { coalesce: true })`).

## PRISM-300 — Live preview

### PRISM-301 — DOM-based sample surface

- **Priority:** P0
- **Status:** DONE
- **User story:** As a developer, I want to see tokens applied to realistic UI instead of abstract swatches only.
- **Scope:** Header, hero, buttons, cards, content, metadata, states.
- **Acceptance criteria:**
  - Preview is rendered from live DOM, not a screenshot.
  - Changing color, radius, spacing, or type visibly changes the surface.
  - Preview remains usable at narrow widths.

### PRISM-302 — Preview surface library

- **Priority:** P1
- **Status:** DONE
- **User story:** As a user, I want to test a system against more than one sample interface.
- **Scope:** Six surfaces: SaaS, dashboard, commerce, docs, editorial, and type specimen, with in-place editable text.
- **Acceptance criteria:**
  - Surfaces share the same token model.
  - User can switch surfaces without losing inspector state.
  - Every surface includes representative interactive states.

### PRISM-303 — Preview viewport controls

- **Priority:** P1
- **Status:** DONE
- **User story:** As a frontend developer, I want to test a system at common viewport sizes.
- **Scope:** Desktop, tablet, mobile presets, custom width, zoom.
- **Acceptance criteria:**
  - Viewport size is visible.
  - Canvas does not change token values when resized.
  - Mobile preview includes touch-sized controls.

### PRISM-304 — Honest preview labels

- **Priority:** P0
- **Status:** DONE
- **User story:** As a user, I want to know whether I am looking at live DOM, a screenshot, or a reconstruction.
- **Acceptance criteria:**
  - Every preview shows its source type.
  - Screenshot previews cannot be edited as if they were live DOM.
  - Reconstructed previews show confidence and unsupported regions.

### PRISM-305 — Color-vision simulation

- **Priority:** P1
- **Status:** DONE
- **User story:** As a designer, I want to check my system under common color-vision deficiencies.
- **Scope:** Canvas toolbar select: protanopia, deuteranopia, tritanopia, achromatopsia (Machado et al. 2009 matrices, linear RGB SVG filters), low-acuity blur.
- **Acceptance criteria:**
  - The simulation applies only to the preview, never to tokens or exports.
  - While active, the canvas note and footer say the preview is simulated and an approximation.
  - The canvas footer shows the real preview width (including custom width) and zoom.

### PRISM-306 — Click-to-edit tokens on the canvas

- **Priority:** P1
- **Status:** DONE
- **Acceptance criteria:**
  - The Select tool (V) selects preview elements instead of editing their text.
  - The popover lists the tokens matched from computed styles, labeled as an inference, and edits the correct theme's keys.
  - Variant B and shared links show the popover read-only.

### PRISM-307 — Device switcher

- **Priority:** P1
- **Status:** DONE
- **Acceptance criteria:**
  - Desktop, tablet, and mobile radios, an editable width readout that switches to custom, and a zoom stepper.

## PRISM-400 — Exploration

### PRISM-401 — Starter systems

- **Priority:** P0
- **Status:** DONE
- **User story:** As a user, I want a useful starting direction instead of an empty editor.
- **Acceptance criteria:**
  - Starter presets load valid token values.
  - Loading a starter is undoable.
  - Starter names describe their visual intent.

### PRISM-402 — Randomize coherent color direction

- **Priority:** P0
- **Status:** DONE
- **User story:** As a designer, I want to explore palette directions quickly without getting random unusable colors.
- **Scope:** Accent hue, accent soft value, lock-aware generation, undo.
- **Acceptance criteria:**
  - Randomize changes a coherent accent pair.
  - Locked colors remain unchanged.
  - Randomize is undoable.
  - The result has a visible contrast status.

### PRISM-403 — Palette harmony modes

- **Priority:** P1
- **Status:** DONE
- **User story:** As a user, I want more control over the type of palette generated.
- **Scope:** Complementary, analogous, triadic, monochrome, split-complementary.
- **Acceptance criteria:**
  - User can choose a harmony mode before randomizing.
  - Generated colors are labeled by semantic role.
  - Locked tokens continue to be respected.

### PRISM-404 — Side-by-side comparison

- **Priority:** P0
- **Status:** DONE
- **User story:** As a user, I want to compare a current system against an alternative direction.
- **Acceptance criteria:**
  - Compare mode renders two previews simultaneously.
  - Variant B is visually labeled.
  - The two previews share layout but can differ in token values.

### PRISM-405 — Named snapshots

- **Priority:** P1
- **Status:** DONE
- **User story:** As a user, I want to save promising directions without overwriting the current system.
- **Acceptance criteria:**
  - Snapshot stores the complete token state and preview mode.
  - Snapshot can be restored, renamed, duplicated, and deleted.
  - Restore is undoable.

## PRISM-500 — Import

### PRISM-501 — Import CSS custom properties

- **Priority:** P1
- **Status:** DONE
- **User story:** As a frontend developer, I want to bring an existing CSS token file into PRISM.
- **Acceptance criteria:**
  - User can paste or upload CSS.
  - Parser detects valid custom properties.
  - Unknown variables are preserved as custom tokens.
  - Parse errors identify line and property.

### PRISM-502 — Import Tailwind configuration

- **Priority:** P1
- **Status:** DONE
- **User story:** As a Tailwind user, I want to inspect and tune my existing theme.
- **Acceptance criteria:**
  - Supports common Tailwind color, spacing, radius, font, and shadow keys.
  - Unsupported configuration is reported instead of silently dropped.
  - Imported values can be edited and re-exported.

### PRISM-503 — Import token JSON

- **Priority:** P1
- **Status:** DONE
- **User story:** As a design-system maintainer, I want to import a structured token file.
- **Acceptance criteria:**
  - Supports a documented JSON schema.
  - Validation errors are actionable.
  - Unknown keys are retained in a custom namespace.

## PRISM-600 — Export

### PRISM-601 — CSS variables export

- **Priority:** P0
- **Status:** DONE
- **User story:** As a developer, I want to copy the current system into a CSS project.
- **Acceptance criteria:**
  - Export includes semantic variables and theme scopes.
  - Export reflects the current state exactly.
  - User can copy and download the result.

### PRISM-602 — Tailwind theme export

- **Priority:** P0
- **Status:** DONE
- **User story:** As a Tailwind developer, I want a theme I can use in my project.
- **Acceptance criteria:**
  - Export maps supported tokens to Tailwind theme variables.
  - Output is clearly labeled as Tailwind v4 or v3 format.
  - Unsupported tokens are listed separately.

### PRISM-603 — shadcn/ui theme export

- **Priority:** P0
- **Status:** DONE
- **User story:** As a shadcn/ui user, I want PRISM colors and radii in shadcn-compatible variables.
- **Acceptance criteria:**
  - Export includes light and dark CSS variable scopes.
  - Variable names match shadcn conventions.
  - User can copy or download the theme.

### PRISM-604 — DESIGN.md export

- **Priority:** P0
- **Status:** DONE
- **User story:** As a team, we want the decisions behind a visual system documented for future work.
- **Acceptance criteria:**
  - Export includes mood, typography, color roles, shape, spacing, and motion guidance.
  - Export includes the active token values.
  - Export does not invent product facts.

### PRISM-605 — Export preview and warnings

- **Priority:** P1
- **Status:** DONE
- **User story:** As a developer, I want to review generated code before downloading it.
- **Acceptance criteria:**
  - Preview uses syntax-aware formatting.
  - Warnings show unsupported or failing tokens.
  - Download is disabled only when output cannot be generated safely.

### PRISM-606 — W3C Design Tokens (DTCG) export

- **Priority:** P1
- **Status:** DONE
- **User story:** As a design-system maintainer, I want tokens in the DTCG format so Style Dictionary and Tokens Studio can consume them.
- **Acceptance criteria:**
  - Export is valid JSON using `$type`/`$value` with light, dark, state, accent ramp, font, dimension, font-size, duration, and number groups.
  - Token names contain no `.`, `{`, or `}`.
  - Available as a "Design Tokens" tab and as the default export format option in Workspace settings.

### PRISM-607 — Export modal usability

- **Priority:** P2
- **Status:** DONE
- **Acceptance criteria:**
  - Format tabs are an ARIA tablist with arrow, Home, and End keys, and wrap instead of clipping.
  - Copy and download stay visible however long the export is; only the code panel scrolls.
  - The modal opens on the export format chosen in Workspace settings.

## PRISM-700 — Public URL inspection

### PRISM-701 — Secure URL inspection API

- **Priority:** P2
- **Status:** DONE
- **User story:** As a user, I want to inspect a public URL without installing an extension or local agent.
- **Scope:** Next.js route handler or worker, URL validation, SSRF protections, timeout, response limits.
- **Acceptance criteria:**
  - Only valid public URLs are accepted.
  - Private IPs, localhost, file URLs, and unsupported protocols are blocked.
  - Timeouts and payload limits are enforced.
  - Errors are shown without exposing server internals.

### PRISM-702 — Headless browser capture

- **Priority:** P2
- **Status:** BACKLOG
- **User story:** As a user, I want PRISM to capture a consistent view of a public site.
- **Scope:** Browser worker, screenshot, DOM snapshot, computed styles, viewport presets.
- **Acceptance criteria:**
  - Capture includes timestamp, viewport, URL, and source type.
  - Failed captures have a retryable error state.
  - Captures are isolated from user credentials and private network access.

### PRISM-703 — Reconstructed preview with confidence labels

- **Priority:** P2
- **Status:** DONE
- **User story:** As a user, I want editable approximations while knowing what PRISM could and could not infer.
- **Acceptance criteria:**
  - Reconstructed regions are clearly labeled.
  - Unsupported sections are not represented as exact copies.
  - Confidence is shown by region and token family.

### PRISM-704 — Restyle any website (proxied preview)

- **Priority:** P2
- **Status:** DONE
- **User story:** As a frontend developer, I want to paste a public URL and restyle it live so I can export override CSS.
- **Scope:** `/api/proxy` route, sandboxed scripts-off iframe preview, restyle controls (type, weights, line height, spacing, palette swaps, accent, radius), override CSS export.
- **Acceptance criteria:**
  - Only public HTTP(S) URLs are fetched; private addresses are rejected.
  - Responses are size-limited, time-limited, and rate limited; a 429 shows the server message and the Retry-After wait.
  - Preview runs without scripts and links do not navigate the frame.
  - A failed load clears the palette and disables the controls and "Copy override CSS".
  - Pages built entirely with JavaScript may render incompletely; the UI says the preview is static.

### PRISM-705 — PRISM on any site bookmarklet

- **Priority:** P2
- **Status:** DONE
- **User story:** As a user, I want to restyle the site I am already on without pasting a link.
- **Scope:** Landing-page bookmarklet button, `public/prism-widget.js` floating panel, override CSS export.
- **Acceptance criteria:**
  - Dragging the button to the bookmarks bar installs it; clicking it on a site opens a draggable restyle panel.
  - Exported CSS carries a sanitized source-URL comment.
  - Sites with strict Content Security Policies may block bookmarklets or Google Fonts; the landing page says so and points to paste-a-link.

### PRISM-706 — Import a design system from a public URL

- **Priority:** P1
- **Status:** DONE
- **User story:** As a frontend developer, I want to pull a site's colors, radius and fonts into PRISM without running its scripts.
- **Scope:** `/api/inspect` follows up to 3 validated redirects, reads inline styles plus up to 6 linked stylesheets and one level of `@import` within a 2 MB budget; `lib/css-extract.ts` maps custom properties, role hints and light/dark scopes to PRISM tokens.
- **Acceptance criteria:**
  - Scripts are never executed; client-rendered pages are labeled as such, and their stylesheets are still read.
  - Every suggested value comes from evidence in the page; missing evidence leaves the token untouched.
  - Suggestions are grouped (light, dark, type, shape) with a confidence per family, and applying them is one undoable change.
  - Fonts outside the catalog and unreadable color functions are reported, not guessed.

## PRISM-800 — Persistence and collaboration

### PRISM-801 — Local project file

- **Priority:** P1
- **Status:** DONE
- **User story:** As a user, I want to save a portable project without creating an account.
- **Acceptance criteria:**
  - Project can be exported as a JSON file.
  - File includes schema version.
  - Import validates before replacing the current project.

### PRISM-802 — Cloud project storage

- **Priority:** P2
- **Status:** BACKLOG
- **User story:** As a user, I want to access my systems from multiple browsers.
- **Scope:** Auth, database, project API, autosave, conflict handling.
- **Acceptance criteria:**
  - Project ownership is enforced server-side.
  - Autosave failures are visible and retryable.
  - Concurrent edits do not silently overwrite work.

### PRISM-803 — Shareable read-only link

- **Priority:** P2
- **Status:** DONE
- **User story:** As a designer, I want to share a direction for review.
- **Acceptance criteria:**
  - Link opens a read-only preview.
  - Shared state is immutable unless duplicated.
  - Private projects cannot be accessed without authorization.

### PRISM-804 — Version history

- **Priority:** P2
- **Status:** DONE
- **User story:** As a team, we want to see how a system evolved.
- **Acceptance criteria:**
  - Versions have timestamps and human-readable names.
  - User can compare two versions.
  - Restoring a version creates an undoable change.

## PRISM-900 — Quality

### PRISM-901 — Automated accessibility checks

- **Priority:** P0
- **Status:** DONE
- **Acceptance criteria:**
  - Keyboard navigation covers the workbench.
  - Focus is never hidden behind the inspector or modal.
  - Contrast failures are surfaced in the token model.
  - Reduced motion is respected.

### PRISM-902 — Production build and runtime matrix

- **Priority:** P0
- **Status:** DONE
- **Resolution:** Next.js WASM SWC fallback is enabled because the native WSL binding exits with `Bus error` / code 135.
- **Acceptance criteria:**
  - `npm install` completes.
  - `npm run dev` starts without a native compiler crash.
  - `npm run build` completes.
  - Node and OS requirements are documented.

### PRISM-903 — Error boundary and recovery states

- **Priority:** P1
- **Status:** DONE
- **Acceptance criteria:**
  - Unexpected render errors show a recoverable state.
  - Project state is not silently discarded.
  - Export and import errors show actionable messages.

### PRISM-904 — Performance budget

- **Priority:** P1
- **Status:** DONE
- **Acceptance criteria:**
  - Initial workspace is measured in a production build.
  - Preview updates do not cause avoidable full-workspace re-renders.
  - Heavy inspection dependencies load only when needed.

### PRISM-905 — Reading comfort mode

- **Priority:** P1
- **Status:** DONE
- **User story:** As a user, I want a calm default look with an option for stronger contrast.
- **Acceptance criteria:**
  - Comfort (default) and High-contrast modes are available on the landing page and in the workspace.
  - The choice persists in the browser and is applied before first paint.

### PRISM-906 — Workbench UI legibility

- **Priority:** P1
- **Status:** DONE
- **User story:** As a user, I want the workspace chrome to be easy to read, with the option to enlarge it.
- **Acceptance criteria:**
  - Workspace UI text uses Inter at a 14px base; Space Grotesk is limited to headings and brand, and IBM Plex Mono to values, tokens, shortcuts, and code.
  - No workspace UI text (outside the preview surface) renders below 11px; uppercase labels use at most 0.06em letter-spacing.
  - An "Interface text size" setting (Default, Large, Extra large) is available in Workspace settings and the command palette, persists in the browser, and applies before first paint.
  - The static shell never scrolls the document at 1440x900 or 960x600 at any text size, and preview surface sizes are unchanged.

## Verified implementation notes

- **Implemented in the local MVP:** PRISM-101, 102, 103, 104, 201, 203, 204, 205, 206, 301, 302, 303, 304, 401, 402, 403, 404, 405, 501–503, 601–605, 701, 703, 801, 803, 804, 901, 902, 903, 904, 704, 705, 905, and 906.
- **Added:** PRISM-202 (light/dark theme pairs) and PRISM-706 (URL design import).
- **Added (scales, auto-fix, vision batch):** PRISM-207, 208, 305, 606, 607. Shape panel "Reset" now resets shape tokens (one undoable change, lock-aware). Re-importing a PRISM CSS export no longer warns about the derived scale variables.
- **Added (builder redesign):** PRISM-105, 209, 306, 307. The workbench light chrome now applies (its selector never matched before).
- **Still intentionally open:** cloud storage (802, needs a Supabase project + keys), and headless browser capture (702, needs a browser binary).
- **Verification run:** `npm run build` passes; `npm run start` serves `/` (landing) and `/workspace` with HTTP 200; private URL inspection is rejected with HTTP 400; restyle loads https://example.com and a `http://127.0.0.1` load shows an error with the controls disabled (browser check).
- **Build footprint:** First Load JS: `/` ≈ 152 kB, `/workspace` ≈ 176 kB (shared ≈ 103 kB); 12 Google Fonts reduced to 3 upfront (the rest load on demand), which cuts several hundred kB of font payload from first paint.

## Definition of ready

A ticket is `READY` when its user story, scope, acceptance criteria, dependencies, and affected token/API surfaces are understood.

## Definition of done

A ticket is `DONE` only when implementation, TypeScript validation, relevant tests, responsive behavior, accessibility behavior, and documentation are verified.
