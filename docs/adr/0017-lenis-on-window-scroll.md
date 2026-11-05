# ADR-0017: Lenis drives the real window scroll

- **Status:** Accepted
- **Date:** 2026-10-24
- **Source:** landing session, 2026-10-24; `components/scroll/smooth-scroll.tsx`

## Decision

Chose **Lenis smoothing the native window scroll** over **a smooth-scroll
library that transforms a wrapper container**, because transforming a container
breaks `position: fixed` chrome, the progress bar, anchor links and
IntersectionObserver, all of which the landing page relies on.

## Context

The owner asked for smooth scrolling, parallax, and a statement whose words
change colour left to right as the reader scrolls.

## Consequences

- Fixed chrome, anchors and in-view detection kept working untouched.
- Under `prefers-reduced-motion`, Lenis is destroyed, parallax drops to none,
  the light holds still, and the statement renders fully coloured instead of
  sweeping.
- One more client dependency (`lenis`) on the landing route.
