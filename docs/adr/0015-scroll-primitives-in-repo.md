# ADR-0015: Build the scroll primitives inside CHROMIQ first

- **Status:** Accepted
- **Date:** 2026-10-23
- **Source:** production-readiness session, 2026-10-23 (landing rebuild); `components/scroll/`

## Decision

Chose **building the landing page's scroll machinery in `components/scroll/`,
with no CHROMIQ imports, content passed as props and theme read only through CSS
custom properties** over **extracting it into a separate reusable template
project first**, because a template designed from a single consumer bakes that
consumer's assumptions in as if they were general. `AGENTS.md` says the same:
"Prefer small, composable components over speculative abstractions." A template
was also not a launch blocker.

## Context

The owner proposed making the scroll-driven landing a reusable template. The
recommendation was to defer it. The owner did not explicitly confirm, and the
work went ahead this way.

## Consequences

- Extracting later is a `git mv` plus a `package.json`, and by then a second real
  use will show what is actually generic.
- `components/scroll/` must keep its no-CHROMIQ-imports rule, or the cheap
  extraction stops being cheap.
- The rebuild took the landing page's first-load JS from 152 kB to 110 kB,
  because it replaced three separate interactive demos.
