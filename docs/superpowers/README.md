# docs/superpowers — immutable sprint design records

Historical design + implementation records, one pair per shipped sprint/work
package: `specs/YYYY-MM-DD-<topic>-design.md` (the design) and
`plans/YYYY-MM-DD-<topic>.md` (the implementation plan; small WPs may have a
spec only).

**Policy (2026-07-09, see `docs/DOCUMENTATION-GOVERNANCE.md`):** these files are
point-in-time records, immutable once their work merges. In-document status
lines ("draft", "approved, not merged", "not pushed") reflect the moment of
authoring — every file here corresponds to work that HAS shipped to main
(verified 2026-07-09). Consult `git log` or `HANDOFF.md` for merge status,
never these headers.

The living reference for a subsystem is its maintained doc (e.g. the Athlete
Model's is `docs/architecture/ATHLETE-MODEL.md`; the spec
`specs/2026-07-01-athlete-model-design.md` is its historical design record,
cited by CLAUDE.md).

The ephemeral SDD working ledgers (`.superpowers/sdd/` at the repo root) are
gitignored session scratch — the durable record of each sprint is the committed
spec/plan pair here.
