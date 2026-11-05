# ADR-0012: Linear scanners with budgets for URL import

- **Status:** Accepted
- **Date:** 2026-10-20
- **Source:** URL-import session, 2026-10-20; commit `51d7dfe`; `lib/css-extract.ts`

## Decision

Chose **hand-written linear scanners for selectors, comments, `url(`,
`light-dark(` and page text, under a 1.5 s extraction budget, a 20,000-rule cap
and a 10,000-variable cap** over **the regex-based extractor first written**,
because a review reproduced a hostile page freezing the Node event loop. CSS
with tens of thousands of commas kept the server busy for more than 40 seconds,
and fetch timeouts did not help, because the time went on processing, not
downloading.

## Context

Import from a URL (`/api/inspect`) reads inline styles, linked stylesheets and
one level of `@import`, then suggests colours, fonts and radius. Everything it
parses is attacker-controlled.

## Consequences

- Very large stylesheets are read only partway. The response then says so
  ("Stopped reading styles early…"), so it does not over-claim.
- CSS variables resolve recursively, to a depth limit with a visited set,
  because shadcn and Tailwind sites alias two or more levels deep. A crafted
  file could once make resolution build a string of about 100 MB, and the
  output is now capped.
- Colour parsing clamps and normalises (`hsl` hue wrap, `oklch` overflow), so a
  suggested colour can no longer be `#NaNNaNNaN` and leave the workspace unable
  to export.
- The route has its own in-flight cap of 4 and a 12 s overall deadline.
