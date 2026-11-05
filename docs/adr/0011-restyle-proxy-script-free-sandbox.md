# ADR-0011: Restyle through an SSRF-guarded proxy into a script-free sandbox

- **Status:** Accepted
- **Date:** 2026-10-18 (built), 2026-10-24 (re-audited)
- **Source:** restyle session, 2026-10-18; commit `b6d3bc9`; landing and security session, 2026-10-24

## Decision

Chose **fetching the target page server-side through `safeFetch`, sanitising it,
and rendering it in an iframe with `sandbox="allow-same-origin"` and no
`allow-scripts`** over **running the site's own JavaScript (or a headless
browser)**, because the server fetches any address a visitor types, so it has to
be SSRF-safe, and a third-party page must never run script in CHROMIQ's origin.

"Paste a link and restyle it" is the headline feature, so it shipped with the
honest limitation rather than waiting for a headless renderer.

## Context

`safeFetch` checks the IP of every hop at connect time (it validates the
*resolved* address, which closes the DNS-rebinding gap), re-validates each
redirect manually, and enforces one deadline across connect and body. The size
cap is applied to the *decompressed* stream. The proxy allows 10 s, 2 MB, 4
redirects, 20 requests per minute per IP and 8 in flight.

## Consequences

- Pages that render entirely in JavaScript show up empty or partial. The UI
  labels the preview "scripts disabled" and points to the bookmarklet, which
  itself fails on sites with a strict `script-src` CSP, GitHub for example.
- **Never add `allow-scripts` to that iframe.** Next to `allow-same-origin` it
  lets the sandboxed page script its way out to CHROMIQ's origin. On 2026-10-24,
  24 XSS payloads were fired through the real sanitiser and iframe, and none
  ran. That result depends on both layers. If JS-rendered sites are ever
  needed, the safe shape is a separate sandbox origin talking over
  `postMessage`, which is a real refactor (backlog `CHROMIQ-702`).
- Remote images, fonts and styles in the preview load from third-party servers,
  which can see the visitor's IP. The proxy notes say so.
