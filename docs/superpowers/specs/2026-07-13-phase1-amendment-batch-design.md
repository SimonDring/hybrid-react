# Phase 1 — The Amendment Batch: Design Spec

**Status: DESIGN SPEC (immutable sprint record once merged) · 2026-07-13**
**Authority: executes `docs/DEVELOPMENT-PLAN.md` §4 via the batch protocol in
`docs/DOCUMENTATION-GOVERNANCE.md` (landed #172). Simon is the steward of every
item; NOTHING in this sprint edits a frozen document.**

## 1. What this sprint produces

A complete, reconciled, ratification-ready **batch proposal** for AQ-1…AQ-9
(evidence: governance audit 09 §3), as working docs (T4) in
`docs/design/amendment-batch-2026-07/`:

| File | Items | Content |
|---|---|---|
| `README.md` | — | Batch cover: contents, reading order, ratification instructions per the GOV batch protocol, status |
| `01-constitution.md` | AQ-1, AQ-6, AQ-7 | Proposed Preamble second-product language; two new Title III duties (developmental-stage duty of care; athlete data ownership & consent) |
| `02-ontology.md` | AQ-2, AQ-4(part) | The Measurement & Analysis entity family + analysis structure; the ontology's additive-extension clause |
| `03-eds.md` | AQ-3, AQ-4(part) | The analysis decision family; the catalogue extension clause |
| `04-derived-data-doctrine.md` | AQ-5 | The coordinated KA+EDS+TAS clarification ("recomputable given the same inputs and knowledge version; point-in-time derived values may be materialised as dated historical evidence" — per audit 08 GA-802, refined as needed) |
| `05-tas-structural-repair.md` | AQ-9 | §-numbering fix + restored Security & Privacy section (content assembled from the TAS's own scattered privacy rules — restoration, not invention) |
| `06-aigas-ratification.md` | AQ-8 | The ratification proposal per GOV's T2-entry path, incl. the reconciliation list (Constitution Appendix A / TAS §15 forward-references) and the panel-review question (2026-07-06 review stands, or fresh panel — Simon's discretion, both paths prepared) |
| `07-consistency-review.md` | — | The protocol-mandated whole-frozen-set consistency review of the ENTIRE batch (cross-amendment interactions, precedence, no Title III weakening, version-bump plan per document) |

Each amendment entry: **target doc + exact § · current text (quoted) · proposed
text (drafted in the target document's own voice) · rationale (GA/benchmark
citations) · consistency notes · what it deliberately does NOT change**.

## 2. Rules

1. **No frozen file is touched.** Proposals quote and draft; application happens
   in a separate ratification PR only after Simon ratifies (his merge = the
   ratify step). AMENDMENT-QUEUE rows flip QUEUED→BATCHED in this sprint;
   RATIFIED only later, by Simon's PR.
2. **Title III may be strengthened, never weakened** (Constitution, Amendment &
   Stewardship) — AQ-6/AQ-7 add duties; 07's review must confirm no weakening
   anywhere in the batch.
3. Drafted text matches each target document's voice, structure, and numbering
   conventions; every proposal is minimal (Art 20) — direction fixed by the
   audit's queue entries, wording new.
4. Evidence discipline: every proposal cites its GA findings + benchmark lines;
   audit docs are evidence, never restated.
5. ND-1 (the Data & Analytics Architecture Specification) is **NOT authored in
   this sprint** — it starts as its own sprint once Simon approves the AQ-1/AQ-2
   direction (dev plan §4). `06`'s ratification path and `01/02`'s drafts are
   its prerequisites.
6. Suite + lint green (docs-only; sanity), one PR, **pauses for Simon: his
   review of the batch IS the point**.

## 3. Out of scope

Applying any amendment; authoring ND-1; Phase 2 V2 re-scope; the P1-10 DB
runbook (still Simon's); GA-704/705 doc-gov adjacents (SPEC-FILLABLE, later).
