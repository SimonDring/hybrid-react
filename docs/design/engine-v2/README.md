# Decision Engine V2 — Design Proposal Set

**Status: PROPOSAL — working doc (T4) · 2026-07-14 · not canonical; adopted only via DEVELOPMENT-PLAN §5.3**
**Sprint spec: [`docs/superpowers/specs/2026-07-14-decision-engine-v2-design.md`](../../superpowers/specs/2026-07-14-decision-engine-v2-design.md)**

---

## What this set is

This directory is the output of Sprint 3 (DEVELOPMENT-PLAN Phase 2 §5.2): the
complete design of **Decision Engine V2** — a deterministic coaching engine that
behaves like an elite coach rather than a workout generator. Every document here
is a **proposal**, not canon: the set feeds the development plan and becomes the
implementation blueprint only when Simon ratifies it (DEVELOPMENT-PLAN §5.3).

The set is validated against the **frozen governing set as amended — v1.1,
ratified 2026-07-13** (Constitution · Decision Ontology · Knowledge Architecture
· EDS · TAS · AIGAS), with the DAAS cited as the data pillar's designate (in
review). Where a document agrees with a frozen owner it links and adds
operational depth; where it genuinely diverges, the divergence is **queued in
the Amendment Register inside [00-ARCHITECTURE.md](00-ARCHITECTURE.md) — never
applied**. Nothing in this directory edits a frozen document, and nothing in it
is production code.

## Reading order

The three anchor documents define the vocabulary everything else uses — read
them first, in order:

1. **00** — architecture, reconciliation, Amendment Register (the anchor)
2. **01** — the coaching decision hierarchy
3. **02** — the pipeline stage specification (the stage-naming authority)

Then: **03/04** (performance model, knowledge ownership) → **05/06/07**
(session builder, constraint engine, progression) → **08/09** (explainability,
AI boundaries) → **10/11/12** (migration architecture, phases, module diagram)
→ **13** (validation strategy).

## The documents

| Doc | Deliverable | Status in this set |
|---|---|---|
| [00-ARCHITECTURE.md](00-ARCHITECTURE.md) | V2 architecture, frozen-set reconciliation, Amendment Register | The anchor: the first-principles coaching narrative, the engine shape it implies, the nine load-bearing commitments (C1–C9), a 22-row reconciliation matrix against the v1.1 set (14 AGREES · 8 DEEPENS · 0 DIVERGES), and an empty Amendment Register with two additive-extension candidates (AE-1/AE-2) |
| [01-DECISION-HIERARCHY.md](01-DECISION-HIERARCHY.md) | Coaching decision hierarchy | The 13 levels of coaching judgement (Athlete → … → Iteration), each defined against its Ontology owner, justified by what breaks without it (nothing kept on gym convention), and reconciled one-home-each to the four ratified structures — Review housed on the Analysis Spine (§1.4); stage maps provisional until 02 |
| [02-COACHING-PIPELINE.md](02-COACHING-PIPELINE.md) | Pipeline stage specification (naming authority) | The stage-naming authority: the definitive table of all seventeen ratified stages (D1–D17, zero proposed §20.1 admissions) with hierarchy-level assignments, a full ten-field contract per stage (`{value, confidence, rationale}` per TAS §5.3), the conflict order compiled into an explicit resolution pass inside D14, and rulings R1–R4 settling 01's provisional mappings (D6 class commitment · D5 adaptation targets · progression cross-stage · constraint layer as artefact, not pass) |
| [03-PERFORMANCE-MODEL.md](03-PERFORMANCE-MODEL.md) | Performance & adaptation model | The objective the engine optimises (demand-weighted transfer-per-fatigue, not volume — operationalised at D4/D5/D11/D12), the open quality vocabulary with a `droppedDemands` honesty ledger and ten proposed Ontology §13 additive quality entries (AE-1), the five adaptation classes (Primary / Secondary / Supporting / Maintenance / Recovery) as a fatigue-budget partition of D6's develop/maintain map, the falsifiable transfer chain read against Match Performance, the D1 per-quality estimator classes with confidence tiers and the additive-first guarantee, and age/sex/developmental-stage physiology as governed knowledge under Art 21 |
| [04-KNOWLEDGE-OWNERSHIP-MAP.md](04-KNOWLEDGE-OWNERSHIP-MAP.md) | Knowledge ownership map | Pending |
| [05-SESSION-BUILDER.md](05-SESSION-BUILDER.md) | Session construction architecture | The objective-first construction flow S1–S7 over D9→D14: one named purpose with a fatigue budget, requirements before exercise names, value-ordered selection under the anti-filler admission rule and a concrete stopping rule (stop and bank spare time), smallest sufficient context-aware dose, and the volume ledger born at S5 and read only by D14's MRV/MEV checks — volume validates, never drives; the final-session artefact carries per-item `{intervention, dose, rationale, objective-link, confidence}` for 08's trace |
| [06-CONSTRAINT-ENGINE.md](06-CONSTRAINT-ENGINE.md) | Constraint engine | The pre-construction constraint layer under ruling R4: the constraint envelope as a resolved, typed artefact composed from D1/D6/D8 outputs (never a named pass); the 13-kind taxonomy classified HARD VETO / SHAPING / SOFT PENALTY with knowledge owners and constitutional tiers; injury handling redesigned constraints-first (rehab as a first-class session objective, the unservable outcome explicit); the single-observation discipline and the ACWR demotion generalised; equipment narrows means, never the goal |
| [07-PROGRESSION.md](07-PROGRESSION.md) | Progression architecture | Progression as a cross-stage architecture (ruling R3: D7 block arm · D12 dose arm · D15 runtime arm — no new stage, zero §20.1 admissions): eight levels from adaptation to LTAD, each with driver signal, decision owner, and a non-logging fallback (estimator-driven creep with honest confidence labelling — the SR-01/G9 closure); regression and holding bidirectional under freeze-on-start; the block review → D17 → D16 → next-block loop closing the audit's fourth verb; per-level progression currencies, never "add weight or sets" |
| [08-EXPLAINABILITY.md](08-EXPLAINABILITY.md) | Explainability layer | The decision trace, rendered: one reasoning source projected by the pure `explain()` read-model (TAS §4.1), never a parallel story; the six coaching questions each mapped to named trace nodes (02's stage artefacts); explanation at prescription (C6) closing the adjustment-only asymmetry; honesty rules H1–H4 (nothing renders that didn't steer; the silent list empty or rendered); the validation report a first-class renderable; provenance-stamped traces, reproducible by pinning |
| [09-AI-BOUNDARIES.md](09-AI-BOUNDARIES.md) | AI integration boundaries | The seven participation verbs each bound to an AIGAS capability category, seam position, gate, and V2 input; the four absolute prohibitions mapped to AIGAS §13; the two seams in the V2 pipeline (D4/D5/D11 + D17 family members behind Seam 1; knowledge/priors behind Seam 2, three routes for AI-origin analysis); self-graded confidence never trusted; the AI-touchpoint register (AI-T1–T11) that 13's coach-acceptance tests reference — V2 adds NO new AI authority |
| [10-MIGRATION-ARCHITECTURE.md](10-MIGRATION-ARCHITECTURE.md) | Migration architecture | Hardens audit 10's DRAFT waves into the migration architecture: the operational-completion stance (four verbs + one retirement), eight binding migration invariants, the 17-module V2 target map with the current-file → module mapping as of the audit pin (allocator split along D11/D12/D13; one selection engine), the four-category disposition table, ranked risks with mitigations, per-phase rollback strategy, and acceptance criteria (audit 10 §6 verbatim + spec §7) |
| [11-MIGRATION-PHASES.md](11-MIGRATION-PHASES.md) | Migration phases | The phase sequence M0–M6 with a 1:1 wave→phase map (M0 the test net, numbered; M1 = Wave A recorded as LANDED via PRs #173/#174; legacy fill DELETED at M2), each phase with objective, backlog P-IDs, entry/exit gates, shippable value, rollback, and 🔒 points — all ten audit 10 §5 decision points placed in a closing ledger; sequencing rules + the DEVELOPMENT-PLAN §5.3 ratification gate |
| [12-MODULE-DEPENDENCY-DIAGRAM.md](12-MODULE-DEPENDENCY-DIAGRAM.md) | Module dependency diagram | Two Mermaid diagrams + legend: the V2 module graph (every node = a module from 10 §2.2, typed dependency edges, knowledge as a separate rank, the constraint envelope feeding construction, trace feeding explain) and the migration dependency spine M0–M6 with its gate edges and the three sequencing rules |
| [13-VALIDATION-STRATEGY.md](13-VALIDATION-STRATEGY.md) | Validation strategy | The test net under the migration: per-module validation for every V2 module, the golden-athlete matrix + M0 extension set with the TR-01 re-baseline discipline, knowledge validation (validate-on-load, `validate:knowledge` gate, KSV ratchet, provenance), scientific validation (dose-response envelopes, Art 13 authority tests, the Wave-B progression-sanity/dose-coherence net), regression pins + property classes (reflow≡baseline, cross-runtime determinism, additive byte-identity), performance budgets, 13 coach-acceptance scenarios mapped to phases M0–M6, and the false-positive budget that governs every validator promotion |

## Atlas update

The sprint's fifteenth deliverable does not live in this directory: it is a
bounded "Decision Engine V2 (proposal)" subsection added to the architecture
section of the Repository Atlas
(`docs/architecture-atlas/01-ARCHITECTURE-ATLAS.md`), summarising the target
architecture and linking back to this README.
