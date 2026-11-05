# ADR-0019: Rename PRISM to CHROMIQ

- **Status:** Accepted
- **Date:** 2026-10-23
- **Source:** naming session, 2026-10-23; commit `4e20252`; GitHub repo renamed to `MikeKomari/CHROMIQ`

## Decision

Chose **the coined name CHROMIQ** over **keeping PRISM**, because "prism" is a
common word, and a search for it would never put this product first. The search
benefit comes from the name being a unique string, not from any backronym.

## Context

The owner raised it on their own: "if i use the app name prism, when I search
the web, it most likely wont show up first". Ten candidates were offered, and
the owner picked CHROMIQ.

## Consequences

- The rename covered the brand kit, metadata, copy, CSS custom properties
  (`--prism-*` to `--chromiq-*`), the bookmarklet widget, backlog keys and the
  GitHub repository. GitHub redirects the old repo URL.
- localStorage keys were already `chromiq-*` from an earlier name, so no user
  lost saved work.
- Some old names remain on purpose or by inertia: the Vercel project is still
  called `prism` (its public URL is `prism-gamma-three.vercel.app`), the
  database schema is `prism`. The Tailwind export's prefix did change, so
  exports made before the rename no longer match fresh ones
  ([ADR-0018](0018-namespaced-tailwind-export.md)).
- An expansion of the letters was drafted but is not recorded in the repo. Do
  not present one as official without adding it to `brand/GUIDELINES.md` first.
