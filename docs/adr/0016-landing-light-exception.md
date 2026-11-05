# ADR-0016: Atmospheric light on the landing page only

- **Status:** Accepted
- **Date:** 2026-10-23
- **Source:** production-readiness session, 2026-10-23; `DESIGN.md` "Landing surface"

## Decision

Chose **a recorded exception in `DESIGN.md` that allows one soft violet light
and a gradient wordmark on the landing page, while the workbench stays
glow-free** over **either quietly breaking the "no gradients, no glow" rule or
refusing the owner's chosen look**, because the two surfaces have different
jobs. The workbench stays quiet so the user's own system is the brightest thing
on screen; the landing page has about eight seconds to explain itself. Leaving
the source of truth contradicting shipped UI would have been the worst outcome.

## Context

The owner chose "dark cinematic with violet light" for the landing page.
`DESIGN.md` described only the workbench and banned glow and gradients outright.

## Consequences

- Violet is still the only accent, and contrast minimums still apply on the
  landing page.
- Content must never depend on an animation running. This rule was broken on
  the first build (chapters started at `opacity: 0` and appeared only when an
  IntersectionObserver fired, so with JavaScript off the page was blank) and
  fixed the same day: content is visible by default and hidden only after
  hydration.
