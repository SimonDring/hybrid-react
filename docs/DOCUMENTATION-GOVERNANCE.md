# Documentation Governance

**Status: governing (living) · v1.0 · 2026-07-09**
This is the documentation constitution: how documents are classified, where they
live, how they change, and which one wins when they disagree. It governs all
documentation; it does not govern the platform itself — that is the (frozen)
Constitution's job. If this document conflicts with the Constitution, the
Constitution wins.

---

## 1. Precedence — which document wins

When two documents disagree, the higher tier wins. Within a tier, the frozen set
wins over everything non-frozen; between non-frozen documents, the more recently
dated statement of *current state* wins, and the disagreement itself must be
fixed in the lower/staler document.

```
T0  CONSTITUTION                      docs/foundation/CONSTITUTION.md   (frozen)
T1  DECISION-ONTOLOGY  +  KNOWLEDGE-ARCHITECTURE                        (frozen)
T2  EDS (engine)  ·  TAS (technical)  ·  AIGAS (AI, pending ratification)
T3  Supporting specs & references     (SKB schema, physiological framework,
                                       migration blueprint, athlete model,
                                       team architecture, atlas suite, READMEs)
T4  Working docs                      (HANDOFF.md, TEAM-NEXT-STEPS,
                                       SECURITY-DEPLOY, live design specs)
T5  Reviews                           (dated audits — evidence, never current)
T6  Archive                           (superseded — history, never truth)
```

Two practical corollaries:

- **Implementation never outranks specification.** If code and a frozen document
  disagree, the code is wrong (or the divergence is a deliberate, recorded
  deferral). Fix the code or record the deferral — never quietly bend the doc.
- **Status lives in working docs, never in specs.** A specification says what
  should be true by design; `HANDOFF.md` says what is true today. The recurring
  failure mode of this repo's documentation (found 2026-07-09 in ~20 documents)
  is present-tense status claims inside specs going stale. Specs must not carry
  "currently"/"not built yet"/"X% dormant" claims; point to HANDOFF instead.

## 2. Status classes

Every document has exactly one class, recorded in `docs/DOCUMENTATION-INDEX.md`:

| Class | Meaning | May be edited? |
|---|---|---|
| **CANONICAL** | The single source of truth for a concept; actively governs. | Frozen members: only by formal amendment. Non-frozen canonical (e.g. VISION, migration ledger, CLAUDE.md): yes, deliberately. |
| **SUPPORTING** | Accurate reference material serving a canonical doc. | Yes — keep it true. |
| **WORKING** | Living tracker of in-flight work. | Continuously; prune to archive when stale. |
| **REVIEW** | Dated, point-in-time audit kept as evidence. | **No** (banner additions only). A review is true *as of its date*, forever. |
| **ARCHIVE** | Fully superseded; history. | No. |

## 3. The frozen set and amendments

The frozen set is: **Constitution, Decision Ontology, Knowledge Architecture, EDS,
TAS** (v1.0, 2026-07-01). AIGAS is governing-designate pending its ratification
panel. Frozen documents are never edited as part of feature or documentation
work — including "harmless" fixes (typos, counts, status stamps). A change is a
formal amendment per the Constitution's *Amendment & Stewardship* section:
proposed in writing with rationale, reviewed for consistency, version-bumped,
and reconciled across the whole set in the same change.

Known amendment candidates are queued in
`docs/reviews/2026-07-09-documentation-audit.md` §2 (C1–C5): stamping freeze
status into the docs themselves, the TAS "seven kinds" vs KA "eight kinds"
reconciliation, hard-coded sport counts, the EDS rank ambiguity, and one
mojibake glyph. Add newly-found frozen-doc defects to that queue; do not fix
them inline.

## 4. Placement — where a document lives

```
/                      CLAUDE.md (operational handbook) · HANDOFF.md (living tracker)
docs/
├── DOCUMENTATION-GOVERNANCE.md   this document
├── DOCUMENTATION-INDEX.md        the master index + dependency map
├── foundation/                   T0/T1 frozen set + panel review + index
├── engine/                       EDS (frozen) + engine doc set 01–08
├── architecture/                 TAS (frozen), AIGAS, living technical refs
├── architecture-atlas/           founder-facing atlas suite (supporting)
├── product/  strategy/  setup/   product blueprints, vision, ops guides
├── superpowers/                  immutable per-sprint design records (specs/plans)
├── reviews/                      dated audits (new reviews go HERE)
└── archive/                      superseded documents
apps/*/README.md · packages/*/README.md   package-local references
supabase/                         DB ledger + deploy runbooks (operational)
```

Placement rules:

1. **Reference stability beats tidiness.** A document referenced by a frozen
   document or by code **never moves** (fixing the link would mean editing the
   frozen doc / code). Its status lives in the index instead. This is why
   `decision-engine-evaluation.md` and engine docs 01–05 stay where they are.
2. **Numbered sets stay whole.** `docs/engine/00–08` and `docs/foundation/` are
   coherent sets with internal cross-references; members are not relocated.
3. **New reviews** are authored into `docs/reviews/` as `YYYY-MM-DD-<topic>.md`.
4. **Superseded docs move to `docs/archive/`** (git mv — history preserved) when
   nothing frozen or executable references their path; otherwise they get a
   status banner in place. **Never delete.**
5. **Sprint design records** (`docs/superpowers/`) are immutable after their
   work merges; they are archived-in-place by policy (see
   `docs/superpowers/README.md`).

## 5. Lifecycle

```
authored (spec/plan/review) ──ships──► SUPPORTING reference   (kept true)
                                    └► superpowers record     (immutable)
WORKING tracker ──section goes stale──► move section to archive file
SUPPORTING doc ──superseded──► banner, then docs/archive/ when unreferenced
REVIEW ──always──► stays as written; never "refreshed" (write a NEW review)
```

- **One owner per concept.** Every architectural concept has exactly one
  canonical home (see the index). Other documents link to it; they do not
  restate it. If you find the same concept owned twice, that is a defect —
  reconcile toward the canonical owner.
- **Banners, not rewrites, for reviews.** When a review's headline is overtaken,
  add a short dated banner at the top pointing to what superseded it. The body
  stays as written.
- **HANDOFF.md discipline.** HANDOFF carries current state + the open queue
  only. When an entry stops being current, move it verbatim to
  `docs/archive/HANDOFF-HISTORY-*.md`. Target size: readable in one sitting
  (≈150 lines). It is the *only* living status tracker — no other document may
  claim that role.

## 6. Ownership

There is one maintainer (Simon) and AI sessions acting under CLAUDE.md. "Owner"
in the index therefore means *which document owns the concept*, not a person.
Session responsibilities:

- End of session: update HANDOFF.md; update the index if documents were
  added/moved/reclassified.
- Any new doc gets: a status line (class + date) at the top, a home per §4, and
  an index entry.
- Documents making time-sensitive claims must carry their date.

## 7. Naming conventions

- Reviews and sprint records: `YYYY-MM-DD-<kebab-topic>.md`.
- Specs: `YYYY-MM-DD-<topic>-design.md`; plans: `YYYY-MM-DD-<topic>.md`.
- Governing/reference docs: `SCREAMING-KEBAB.md` (existing convention).
- One `README.md` per directory as its index — indexes must list *every*
  document in their directory (the 2026-07-09 audit found three indexes that
  silently omitted documents; that is how docs become ungoverned).

## 8. Review process for documentation changes

- Doc-only changes ride normal branches/PRs; they are low-risk but still
  reviewed (CLAUDE.md: review every diff).
- Reclassification (e.g. SUPPORTING → ARCHIVE) is a normal change: update the
  index + move/banner in one commit with the reasoning in the message.
- A periodic **staleness sweep** (recommended cadence: after each major
  milestone, e.g. an engine flip or package launch) checks SUPPORTING docs'
  present-tense claims against HANDOFF. The 2026-07-09 audit is the template:
  `docs/reviews/2026-07-09-documentation-audit.md`.
