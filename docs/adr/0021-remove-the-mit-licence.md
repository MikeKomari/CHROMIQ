# ADR-0021: Remove the MIT licence

- **Status:** Accepted
- **Date:** 2026-11-05
- **Source:** owner decision, session 2026-11-05; removes `LICENSE`

## Decision

Chose **no licence, all rights reserved** over **keeping MIT**, because MIT
lets anyone run a commercial copy of CHROMIQ owing nothing but attribution,
and the owner does not want that at this stage.

## Context

The repository is public, and public visibility is not permission: a licence
is what grants the right to copy, modify or redistribute. MIT granted all of
it. AGPL was considered as the middle option — it keeps the code open and
contributable while requiring anyone running a modified copy as a service to
publish their changes — but it still grants commercial use, which is the
specific thing being withdrawn.

## Consequences

- Nobody may copy, modify or redistribute the code. Reading it on GitHub stays
  legal; everything else needs written permission.
- **Not retroactive.** Anyone who took a copy while MIT was in force keeps that
  grant for that version, permanently. The MIT text stays in git history and in
  any fork made before this change.
- Contributions get harder, not just rarer. `CONTRIBUTING.md` used MIT as the
  *inbound* licence, so a patch arrived already licensed to the project. With
  no licence a contributor keeps copyright in their patch and the project has
  no automatic right to ship it, which is why that section now states the grant
  explicitly.
- It deters honest reuse, not dishonest reuse: anyone willing to ignore a
  licence will ignore its absence. The friction lands on people who check first.
- Dependency scanners and some corporate policies treat an unlicensed repo as
  unusable. That is the intent here, but worth knowing it is the effect.
- Revisit as AGPL if the goal turns out to be "use it, but share changes and
  credit me" rather than "no copying". Supersede this record rather than
  quietly restoring the file.
- Not reviewed by a lawyer, in keeping with the standing note on the Privacy
  and Terms pages.
