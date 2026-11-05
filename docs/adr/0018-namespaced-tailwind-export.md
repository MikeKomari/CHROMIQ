# ADR-0018: Namespace the Tailwind export's type scale

- **Status:** Accepted
- **Date:** 2026-10-21
- **Source:** feature session, 2026-10-21; `lib/exporters.ts`

## Decision

Chose **a product-prefixed type scale, `--text-chromiq-xs` … `--text-chromiq-4xl`
(with `--color-chromiq-accent-*` and `--spacing-chromiq`)**, over **Tailwind's own
`--text-xs` names**, because the first version reused Tailwind's names, and
pasting it into an existing project would have silently resized every `text-*`
class in that project.

## Context

Exports are CHROMIQ's product promise: every exported value must reflect the
active system and be safe to drop into a real codebase. The prefix was `prism`
when this was decided and became `chromiq` in the rename
([ADR-0019](0019-rename-to-chromiq.md)).

## Consequences

- An export adds new utilities. It never redefines existing ones.
- Anyone who pasted an export before 2026-10-23 has `prism`-prefixed names. A
  fresh export will not match them.
- Importing CHROMIQ's own Tailwind export back in warns about the prefixed
  colour names until the importer maps them.
