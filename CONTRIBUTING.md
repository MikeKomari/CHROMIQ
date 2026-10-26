# Contributing to CHROMIQ

Thanks for helping. CHROMIQ is a browser-first visual design workbench for frontend developers: tune a live token system, compare variants, and export CSS, Tailwind, shadcn/ui, and DESIGN.md.

## Set up

You need Node.js 18.18 or newer and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000. The workbench lives at `/workspace`.

The app runs without any environment variables. Accounts and cloud sync need a Postgres database; copy `.env.example` to `.env.local` and fill it in only if you are working on those. Never commit `.env.local`.

If you have a `DATABASE_URL` configured but want to work on the rest of the app without it — or the host is unreachable — set `CHROMIQ_ACCOUNTS=off`. The account, share and project routes then answer 503 immediately instead of waiting out a connection timeout, and the account controls are hidden rather than shown and broken. `npm run migrate` still reads the connection string, so you do not have to delete it.

If `next` crashes with `Bus error (core dumped)` while loading the native SWC binding, an interrupted install left truncated binaries. Run `npm ci` to reinstall them.

## Before you open a pull request

Run all four and make sure they pass:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

If you changed UI, also open `/workspace` at desktop, tablet, and narrow widths and check theme switching, randomize, undo, compare mode, persistence, and exports.

## Project structure

See the Project structure section of the [README](README.md).

## Conventions

- Next.js App Router and TypeScript.
- `DESIGN.md` governs every UI change. Read it first. If a change alters the look or layout, update `DESIGN.md` in the same pull request.
- Use the token variables in `app/globals.css`. Do not scatter raw colors, radii, or shadows through components.
- Follow the existing shadcn/ui conventions, and use Lucide icons only. Put new shared controls in `components/ui/`.
- Keep client state local and serializable where possible. Add backend routes only for features that need server authority, such as URL inspection or cloud persistence.
- Prefer small, composable components over speculative abstractions. Keep the workspace split by responsibility: shell, state hooks, data, token utilities, canvas, preview, inspector panels, and export flows.
- Preserve accessible names, visible focus, keyboard interactions, and reduced-motion support.
- Do not invent testimonials, usage statistics, customer logos, ratings, or product claims.

## Proposing changes

1. For anything bigger than a small fix, open an issue first so we can agree on the approach.
2. Fork the repo and branch from `main`.
3. Keep the pull request focused on one change, and fill in the pull request template.
4. Add or update tests for behavior you change.

## Reporting abuse or security problems

The URL inspector and website preview fetch third-party pages server-side. If you find a way around their URL safety checks, do not open a public issue. Contact the maintainer privately through the author link in the [README](README.md) instead.

## License

By contributing, you agree your contributions are licensed under the [MIT License](LICENSE).
