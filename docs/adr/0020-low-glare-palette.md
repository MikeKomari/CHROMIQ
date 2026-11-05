# ADR-0020: A low-glare palette with a High contrast switch

- **Status:** Accepted. The palette was later replaced by the violet/graphite palette (2026-10-21); the comfort-first approach and the contrast switch remain.
- **Date:** 2026-10-18
- **Source:** redesign session, 2026-10-18; commit `b6d3bc9`

## Decision

Chose **a softer default, with body text around 12:1 against the background
instead of about 17:1, plus a Comfort / High contrast switch** over **maximum
contrast by default**, because the owner found the original near-black and neon
palette uncomfortable to look at ("The colors are too bright or too contrast
that my eyes are not comfortable"). 12:1 is still far above the WCAG AA minimum
of 4.5:1.

## Context

Reference sites the owner shared were treated as inspiration for ideas, not as a
style to copy. The later violet palette was an explicit exception: the owner
chose those colours from a reference image.

## Consequences

- The contrast mode is applied before first paint by a boot script, so there is
  no flash of the wrong theme.
- Anyone who needs more contrast gets it from the switch: on the landing nav, in
  Workspace settings, or from the Ctrl+K command menu.
