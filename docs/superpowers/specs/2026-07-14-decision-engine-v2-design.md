# Sprint 3 — Decision Engine V2: Architecture & Migration Design

**Status: DESIGN SPEC (immutable sprint record once merged) · 2026-07-14**
**Class: WORKING (T4) · Sprint output lands in `docs/design/engine-v2/` (PROPOSAL, T4)**
**REVISED 2026-07-14: re-scoped post-ratification per DEVELOPMENT-PLAN §5.1 — premises updated to the frozen set v1.1 (ratified 2026-07-13); supersedes the parked 2026-07-11 spec (branch `engine-v2-design-2026-07-11`).**

---

## 1. Context and mission

Sprint 1 (2026-07-09) established documentation governance and the frozen canonical
set. Sprint 2 (2026-07-11, PR #169) completed a forensic audit of the shipped engine:
ten deliverables in `docs/reviews/2026-07-11-engine-audit-*.md`, constitutional
alignment 5.4/10, gap analysis G1–G22, ranked backlog, and a DRAFT migration
blueprint (waves A–F). THE DEVELOPMENT PLAN (`docs/DEVELOPMENT-PLAN.md`) then
adopted the sequence this sprint runs inside: Phase 0 landed Wave A + the
amendment-pipeline repair; Phase 1 landed the 2026-07 amendment batch (AQ-1–AQ-9,
ratified 2026-07-13 — the frozen set is now **v1.1**, AIGAS is ratified/frozen) and
commissioned ND-1, whose deliverable — the Data & Analytics Architecture
Specification (`docs/architecture/DATA-ANALYTICS-ARCHITECTURE.md`, the DAAS) — is
authored and in review as the T2 **designate** for the data pillar. This spec is
DEVELOPMENT-PLAN §5.1's re-scope of the parked Sprint 3 design sprint against that
amended set; §5.2 executes it.

**Mission**: design Decision Engine V2 — a deterministic coaching engine that behaves
like an elite coach rather than a workout generator — with enough clarity that
implementation becomes largely mechanical. **No production code in this sprint.**
The deliverables are design documents only.

The audit's through-line frames the work: the current engine is *structurally
constitutional, operationally partial*. The decision architecture is a coach; the
operating data and the closing loops are still a generator's. Four verbs are missing
— **measure, progress, dispose, learn** — plus one retirement (the legacy
volume-first fill). V2 is the design that completes those verbs.

## 2. Decisions made during brainstorming (Simon, 2026-07-11; premises updated 2026-07-14 where the ratified batch settled them)

1. **V2 identity — first principles, then reconcile.** Phase 1 designs from a blank
   page ("how would an elite coach think?") with no reference to the current code.
   The result is then reconciled element-by-element against the frozen set **as
   amended — v1.1, ratified 2026-07-13** (Constitution 22 Articles, Decision
   Ontology v1.1, Knowledge Architecture v1.1, EDS v1.1, TAS v1.1, AIGAS):
   - Agreement → cite the frozen owner; V2 adds operational depth, never restates.
   - Genuine **new** divergence → an entry in the **Amendment Register**
     (part of 00-ARCHITECTURE), queued as formal amendment candidates per
     `docs/DOCUMENTATION-GOVERNANCE.md` §3. The 2026-07 batch (AQ-1–AQ-9) is landed
     history — it is reconciled against, never re-queued. Additive vocabulary and
     catalogue growth are no longer amendments at all: they route through the
     ratified extension lanes (Ontology §13; EDS §20.1). The frozen six are NEVER
     edited inline.
   - The current implementation appears in exactly one place: the migration
     documents, as the starting point.
2. **Deliverable home — `docs/design/engine-v2/`** (new directory, working-doc tier
   T4). One file per deliverable plus a `README.md` index listing every document.
   Every file carries a status banner:
   `PROPOSAL — working doc (T4) · not canonical · adopted only via DEVELOPMENT-PLAN §5.3`.
   The directory gets an entry in `docs/DOCUMENTATION-INDEX.md`.
3. **All 15 deliverables as separate documents**, exactly as the sprint brief
   enumerates (no consolidation).

## 3. The deliverable set

| # | File (in `docs/design/engine-v2/`) | Content (brief phase) |
|---|---|---|
| 1 | `00-ARCHITECTURE.md` | V2 architecture: the first-principles narrative ("how an elite coach thinks"), the resulting engine shape, the reconciliation matrix against the **amended v1.1 set**, and the Amendment Register (NEW divergences only — the 2026-07 batch is landed history; progression/LTAD content honours Art 21, athlete-data content Art 22) (Phase 1 + 3 synthesis) |
| 2 | `01-DECISION-HIERARCHY.md` | The complete coaching-decision hierarchy Athlete → Goals → Performance Outcomes → Adaptation Targets → Interventions → Block → Weekly → Session Objectives → Exercise Selection → Programming Variables → Progression → Review → Iteration; every level justified, nothing kept because "that's how gyms work" (Phase 2) |
| 3 | `02-COACHING-PIPELINE.md` | The master orchestration model over the ratified D1–**D17** catalogue (EDS §20, v1.1 — D17 Observation & Analysis is a decision family in the async band). For EVERY stage: Purpose, Inputs, Knowledge Required, Decision Rules, Outputs, Dependencies, Validation Rules, Failure Conditions, Coach Override Capability, Confidence Level (Phase 3) |
| 4 | `03-PERFORMANCE-MODEL.md` | Primary / secondary / supporting / maintenance / recovery adaptations and how they combine into improved sporting performance; performance optimised, never volume; measurement speaks Family VIII (Ontology §10 — Assessment, Test Result, External Load Observation) (Phase 5) |
| 5 | `04-KNOWLEDGE-OWNERSHIP-MAP.md` | Exact ownership of every decision input across Scientific / Sport / Exercise / Recovery / Constraint / Athlete knowledge, historical athlete data, coach configuration, and engine logic; data-side inputs (capture, longitudinal record, metric definitions, analysis knowledge) map to the DAAS's owned domains (designate — coordinate, don't re-own). The engine consumes knowledge; it does not contain it (Phase 4) |
| 6 | `05-SESSION-BUILDER.md` | Session construction: Today's Coaching Objective → Primary Adaptation → Primary Intervention → Supporting Interventions → Accessory Work → Recovery Constraints → Validation → Final Session. Volume validates decisions; volume never drives them (Phase 6) |
| 7 | `06-CONSTRAINT-ENGINE.md` | Dedicated constraint layer resolved BEFORE session construction: sport calendar, competitions, availability, equipment, mobility, injuries, pain, recovery, readiness, travel, lifestyle, coach constraints, environment; observation inputs named in Family VIII vocabulary, derived signals consumed from D17 (Phase 7) |
| 8 | `07-PROGRESSION.md` | Progression at every level: adaptation, exercise, weekly, mesocycle, block, season, annual, long-term athlete development — never reduced to "add weight or sets" (Phase 8) |
| 9 | `08-EXPLAINABILITY.md` | Explanation architecture answering Why? Why now? Why this exercise? Why this progression? Why this order? Why this adaptation? — using the engine's own reasoning trace, never a parallel story (Phase 9) |
| 10 | `09-AI-BOUNDARIES.md` | Where AI participates (explain, summarise, educate, report, converse, surface insights, interpret trends) and the absolute prohibitions (choose adaptations, override coaching logic, invent programming, replace deterministic decisions), anchored to the two AIGAS seams (Phase 10) |
| 11 | `10-MIGRATION-ARCHITECTURE.md` | Migration design from Sprint 2 findings: module boundaries, independently testable/replaceable modules, incremental over rewrite, dependencies, risks, rollback strategy, acceptance criteria. Hardens the DRAFT waves A–F blueprint (audit deliverable 10) rather than reinventing it (Phase 11) |
| 12 | `11-MIGRATION-PHASES.md` | The phased sequence, each phase independently shippable with its own acceptance gate |
| 13 | `12-MODULE-DEPENDENCY-DIAGRAM.md` | The V2 module graph (Mermaid) + migration dependency spine |
| 14 | `13-VALIDATION-STRATEGY.md` | Per module: expected behaviour, inputs/outputs, golden athlete tests, knowledge validation, scientific validation, regression tests, performance benchmarks, coach acceptance tests (Phase 12) |
| 15 | Repository Atlas update | Architecture section only, edited in place in `docs/architecture-atlas/01-ARCHITECTURE-ATLAS.md` |

## 4. Grounding rules (binding on every deliverable)

1. **Evidence-cited.** Claims about the current engine cite the Sprint 2 audit by
   finding ID (G-nn / TR-nn / SR-nn / B-nn) or code by `file:line`. Claims about
   principles cite the frozen set **as amended (v1.1)** by Article/§. Data-pillar
   claims cite the DAAS by § — always marked *(designate, in review)* until it
   ratifies. No unattributed assertions.
2. **One owner per concept.** Where a frozen doc owns a concept, V2 links and adds
   operational depth; it never restates or contradicts. A contradiction means the
   proposal is wrong or an Amendment Register entry is required.
3. **No status claims.** No "currently"/"not built yet" in the deliverables — the
   migration docs describe the starting point as of the audit pin
   (`main @ 02f6184`, dated); live status stays in HANDOFF.md.
4. **No production code.** Interface sketches and schemas are design artefacts;
   nothing lands in `packages/engine` or `apps/`.
5. **Respect the audit's verdict.** The migration is an *operational completion*,
   not a rebuild: the purity/determinism regime, D1–D5 diagnosis chain, D13
   scheduling, D15 reflow discipline, privacy stack, knowledge-authority mechanism,
   and the SKB survive. The four verbs + one retirement organise what changes.
6. **Determinism is inviolable** (Art 18): V2 contains no clock reads, no
   randomness, no I/O in the reasoning core; AI only at the two AIGAS seams.

## 5. Load-bearing design commitments

These are the calls the deliverables will develop in full (flagged here so the
sprint holds no surprises):

- **The conflict order becomes code.** The Constitution's tier order
  (Safety > Sport > Recoverability > Intent > Objective > Optimisation) is today
  implemented implicitly in scattered penalty weights (audit del. 02 §3). V2
  specifies it as an explicit, testable resolution pass inside D14.
- **Constraints resolve before construction.** Today injuries are runtime-first
  with a render backstop, producing the empty-rehab class of defects (TR-04,
  SR-03). V2 places a dedicated constraint engine ahead of the session builder.
- **The HOW-MUCH becomes knowledge.** The audit found the WHAT layer genuinely
  knowledge-driven but ~30 shape literals, sport-fact sets, and bare coefficients
  at full authority in code (TR-12, SR-07, del. 05 §4). V2's knowledge-ownership
  map closes this class.
- **Progression is a first-class architecture.** The most critical scientific
  finding: no progressive overload for non-logging athletes (SR-01, G9). V2
  designs progression at all eight levels, not as a dose add-on.
- **Validation disposes.** Art 19's verb does not happen today (TR-02, Art 19
  scored 3/10). V2 specifies the full validator suite and the
  report → flag → gate enforcement ladder.
- **Explainability at prescription.** The engine explains at the moment of
  adjustment, not prescription (del. 03 §5). V2's explanation architecture is the
  engine's own decision trace rendered, per Art 14.
- **One selection engine.** The legacy volume-first fill (serving triathlon,
  zero-gap run/cycle, code-less GAA — B1, G6) is designed out; retirement is a
  migration phase with cohort-rescue acceptance criteria.
- **Measurement enters diagnosis.** D1 gains per-quality measured estimators
  behind the same interface (SR-02, G1/G3), honouring "additive first — no new
  data ⇒ byte-identical plan". The vocabulary is now ratified: Assessments
  produce Test Results (Ontology §10, Family VIII); capture and battery
  mechanics are DAAS-owned (§2.1.2, designate) — V2 consumes, never re-owns.
- **Analysis is D17.** The audit's missing "measure/learn-adjacent" verbs land in
  the ratified D17 Observation & Analysis family (EDS §20, v1.1): pure
  interpretation in the async band, insights forward-only, D15/D16/D17 boundary
  honoured. Any genuinely new pass the design surfaces enters through EDS
  §20.1's four admission criteria (mirrored by Ontology §13) — never an ad-hoc
  stage name.

## 6. Execution model

1. This spec is committed, then `superpowers:writing-plans` produces the
   implementation plan (`docs/superpowers/plans/`).
2. Authoring runs subagent-driven on a dedicated branch. **Order**: 00 / 01 / 02
   (architecture, hierarchy, pipeline) are written and internally reviewed FIRST —
   every other document hangs off their vocabulary — then 03–13 + the atlas update
   fan out in parallel, then a whole-set consistency pass (cross-references,
   terminology, no contradictions, banner + index compliance).
3. Every deliverable gets an adversarial review pass against §4's grounding rules
   before the set is declared done.
4. One PR. **Merge is Simon's** (standing charter: this is a docs-only but
   direction-setting change — it pauses for Simon regardless of green checks).
5. Session end: HANDOFF.md updated (Phase 2 §5.2 delivered; next gate is §5.3 —
   Simon ratifies the V2 set as the implementation blueprint);
   `docs/DOCUMENTATION-INDEX.md` gains the `docs/design/engine-v2/` entries.

## 7. Success criteria (from the sprint brief + audit)

- Decision Engine V2 is completely designed; implementation can proceed
  incrementally without architectural uncertainty.
- Every coaching decision has a clear owner (pipeline stage + knowledge domain).
- Every decision has a scientific rationale and a stated confidence treatment.
- Knowledge and logic are cleanly separated (the ownership map covers every input
  the pipeline names — nothing owned by "the code").
- The migration path is low-risk: incremental phases, each independently
  shippable, golden-master-gated, with rollback defined; the audit's measurable
  V2 targets (del. 10 §6) are embedded as phase acceptance criteria.
- The engine design clearly behaves like an elite performance coach: reading any
  pipeline stage answers "what would the coach be thinking here?" — and the
  engine never optimises for bodybuilding unless bodybuilding is the selected
  goal.
- Zero edits to the frozen six; all NEW divergences queued in the Amendment
  Register (additive vocabulary/catalogue growth routed to the Ontology §13 /
  EDS §20.1 lanes instead); nothing from the landed 2026-07 batch re-queued.

## 8. Out of scope

- Any production code, schema migration, or behavioural change.
- Executing any engine-audit backlog item beyond what Phase 0 already landed —
  build work belongs to Phase 3 (DEVELOPMENT-PLAN §6), gated on §5.3 adoption.
- Ratifying amendments or additive extensions (the register only QUEUES
  candidates for Simon; §13/§20.1 entries are proposed, never applied here).
- Endurance-session programming design beyond naming its future seam (Stage 7).
- DAAS ratification (ND-1's own review path; V2 cites it as designate).
