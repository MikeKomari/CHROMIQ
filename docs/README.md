# CHROMIQ engineering docs

How CHROMIQ is built, why, how it breaks, and what to do when it does. For the
product and its features, see the [main README](../README.md); for the visual
system, [DESIGN.md](../DESIGN.md); for manual feature testing,
[TESTING.md](../TESTING.md).

| Document | Read it when |
|---|---|
| [architecture.md](architecture.md) | You need the shape of the system. L0 context and L1 container diagrams, the schema, and environments. |
| [adr/](adr/README.md) | You are about to change something and want to know why it is the way it is. Twenty short "chose X over Y because Z" records. |
| [failure-modes.md](failure-modes.md) | You are asking "what happens if…". Each row lists symptoms, impact, the existing mitigation and the gap. |
| [runbook.md](runbook.md) | Something is broken right now, or you are about to run a migration or deploy. |
| [postmortems/](postmortems/) | You want evidence, not reasoning. [2026-11-05: database made unreachable on purpose](postmortems/2026-11-05-gameday-database-unreachable.md). |

These were written on 2026-11-05 from the build sessions of 2026-10-18 to
2026-10-30, the commit history, and a game day run the same morning. Database
host details and credentials are deliberately absent, because this repository
is public. They live in the maintainer's private database runbook.

Keep them honest: when behaviour changes, update the failure-mode row and add or
supersede an ADR in the same pull request.
