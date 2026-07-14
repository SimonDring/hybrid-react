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
| [03-PERFORMANCE-MODEL.md](03-PERFORMANCE-MODEL.md) | Performance & adaptation model | Pending |
| [04-KNOWLEDGE-OWNERSHIP-MAP.md](04-KNOWLEDGE-OWNERSHIP-MAP.md) | Knowledge ownership map | Pending |
| [05-SESSION-BUILDER.md](05-SESSION-BUILDER.md) | Session construction architecture | Pending |
| [06-CONSTRAINT-ENGINE.md](06-CONSTRAINT-ENGINE.md) | Constraint engine | Pending |
| [07-PROGRESSION.md](07-PROGRESSION.md) | Progression architecture | Pending |
| [08-EXPLAINABILITY.md](08-EXPLAINABILITY.md) | Explainability layer | Pending |
| [09-AI-BOUNDARIES.md](09-AI-BOUNDARIES.md) | AI integration boundaries | Pending |
| [10-MIGRATION-ARCHITECTURE.md](10-MIGRATION-ARCHITECTURE.md) | Migration architecture | Pending |
| [11-MIGRATION-PHASES.md](11-MIGRATION-PHASES.md) | Migration phases | Pending |
| [12-MODULE-DEPENDENCY-DIAGRAM.md](12-MODULE-DEPENDENCY-DIAGRAM.md) | Module dependency diagram | Pending |
| [13-VALIDATION-STRATEGY.md](13-VALIDATION-STRATEGY.md) | Validation strategy | Pending |

## Atlas update

The sprint's fifteenth deliverable does not live in this directory: it is a
bounded "Decision Engine V2 (proposal)" subsection added to the architecture
section of the Repository Atlas
(`docs/architecture-atlas/01-ARCHITECTURE-ATLAS.md`), summarising the target
architecture and linking back to this README.
