# ADR-0001: Remove the MIT licence

- **Status:** Accepted
- **Date:** 2026-11-05
- **Decision owner:** MikeKomari

## Context

CHROMIQ shipped with an MIT licence in `LICENSE`, referenced from
`CONTRIBUTING.md` and from the Terms page. MIT grants anyone the right to use,
copy, modify, merge, publish, distribute, sublicense and sell the software,
with the single condition that the copyright notice is preserved.

The repository is public. Public visibility and a licence are different things:
visibility lets people read the code, a licence is what gives them permission to
do anything else with it. With MIT in place, a third party could run a
commercial copy of CHROMIQ and owe nothing but attribution.

The owner has decided that is not the intent for this project at this stage.

## Decision

Remove the MIT licence. The project becomes **all rights reserved**, which is
the default state of any copyrighted work that carries no licence.

Concretely:

- `LICENSE` is deleted.
- `CONTRIBUTING.md` no longer points at it, and states the inbound terms
  instead (see Consequences).
- The Terms page no longer tells visitors the source is MIT-licensed.

## Consequences

**What this changes**

- Nobody may copy, modify or redistribute the code. Reading it on GitHub stays
  legal; everything else needs written permission from the owner.
- Forking for private study is a grey area; forking and publishing is not
  permitted.

**What this does not change**

- The owner's rights are untouched. A licence never restricted the owner; it
  only ever granted rights to others.
- **It is not retroactive.** Anyone who obtained a copy while MIT was in force
  keeps that grant, for that version, permanently. Removing the file closes the
  door going forward; it does not pull back what has already gone out. The MIT
  text remains in git history and in any fork taken before this change.

**The cost, stated plainly**

- **Contributions become harder, not just rarer.** `CONTRIBUTING.md` previously
  relied on MIT as the inbound licence: a contributor agreed their patch was
  MIT, which gave the project the right to use it. With no licence, a
  contributor keeps copyright in their patch and the project has no automatic
  right to ship it. Any contribution now needs an explicit grant, which is why
  `CONTRIBUTING.md` says so directly.
- **It deters honest reuse, not dishonest reuse.** Someone willing to ignore a
  licence is equally willing to ignore its absence. The practical effect falls
  on people who check before they copy.
- Dependency scanners, package registries and some corporate policies treat an
  unlicensed repository as unusable. That is the intended outcome here, but it
  is worth knowing it is what will happen.

## Alternatives considered

**Keep MIT.** Maximum adoption, zero friction for contributors, and the
existing text already requires attribution. Rejected because it also permits a
commercial copy, which is the specific thing the owner wants to prevent.

**Switch to AGPL-3.0 rather than removing the licence.** This keeps the code
open and contributable while requiring anyone who runs a modified copy as a
network service to publish their changes — which is the usual answer when the
concern is "someone will host my work as their own". Rejected for now because
it is a heavier commitment than the owner wants to make at this stage, and it
still grants commercial use.

If the goal later turns out to be "people may use it but must share changes and
credit me", AGPL is the option to revisit; removing the licence is the blunter
instrument and this ADR should be superseded rather than quietly reversed.

## Notes

This ADR is developer-written and has not been reviewed by a lawyer, in keeping
with the standing note on the Privacy and Terms pages. Licensing is a legal
decision; if CHROMIQ ever takes payment or outside contributions at scale, this
is one of the items that warrants real review.
