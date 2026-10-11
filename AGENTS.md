# PRISM agent guide

## Product

PRISM is a browser-first visual design workbench for frontend developers. Users tune a live token system, compare variants, and export implementation-ready CSS, Tailwind, shadcn/ui, and DESIGN.md output.

## Source of truth

- Read `DESIGN.md` before changing UI.
- Use the token variables in `app/globals.css`; do not scatter raw colors, radii, or shadows through components.
- Follow the existing shadcn/ui conventions and use Lucide icons only.

## Engineering rules

- Next.js App Router + TypeScript.
- Keep client state local and serializable where possible.
- Use backend routes only for features that need server authority, such as URL inspection or cloud persistence.
- Prefer small, composable components over speculative abstractions.
- Preserve accessible names, visible focus, keyboard interactions, and reduced-motion support.
- Never invent testimonials, usage statistics, customer logos, ratings, or product claims.
- Keep the workspace split by responsibility: shell, state hooks, data, token utilities, canvas, preview, inspector panels, and export flows should remain separate files.
- Prefer shadcn/ui primitives in `components/ui/` for new shared controls. Product-specific styling belongs in PRISM tokens and workspace components.

## Verification

Run `npm install`, then `npm run dev` and `npm run build` before handoff. If `next` crashes with a SIGBUS / "Bus error (core dumped)" while loading the native SWC binding, the `@next/swc-linux-x64-*` `.node` files were truncated by an interrupted install — run `npm ci` to reinstall them completely (the `gnu` binding must be ~143 MB). If a browser is available, manually check the workspace at desktop, tablet, and narrow widths. Verify that theme switching, randomization, undo, compare mode, persistence, and exports work.
