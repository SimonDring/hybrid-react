# Engine documentation — index

This folder holds the **foundational specification set** for the platform's decision engine:
the documents that define *what we are building and why*, and that every feature, refactor,
bug-fix, and engine improvement should be checked against.

The **[Engine Design Specification (EDS)](00-ENGINE-DESIGN-SPECIFICATION.md)** is the governing
document *for the engine*. The other documents in this folder sit *under* it: each owns one layer
of the problem (evidence, build plan, sport knowledge, physiological metrics, implementation specs)
and defers to the EDS for the decision architecture. **Where any document in this folder conflicts
with the EDS, the EDS wins.**

**Above this folder** sits the platform-level foundation in [`../foundation/`](../foundation/README.md):
the [Constitution](../foundation/CONSTITUTION.md) (immutable principles — the ultimate tie-breaker),
the [Decision Ontology](../foundation/DECISION-ONTOLOGY.md) (canonical vocabulary), and the
[Knowledge Architecture](../foundation/KNOWLEDGE-ARCHITECTURE.md). The EDS defers *up* to those;
where the EDS conflicts with the Constitution, the Constitution wins.

**Below this folder** sits the technical blueprint: the
[Technical Architecture Specification](../architecture/TAS.md) (`../architecture/`) is the
*software* realization of this engine design — the pure-library boundary, the engine's public
API, knowledge/data flow, and the future-AI seam.

## Foundational vs. running documents

There are two kinds of document in this repo, and they must not be confused:

- **Foundational (these docs).** The *target* — the vision, laws, knowledge, schema, and design
  we build toward. They are stable and change rarely and deliberately. They describe where we are
  *going*, not where we are.
- **Running (`HANDOFF.md`, `CLAUDE.md`).** The *current state* — what is built, what is in
  flight, what changed last session. They track where the codebase stands *against* the
  foundational target. Status, progress, and "what's shipped" live here, not in the specs.

When you want to know *what good looks like*, read a foundational doc. When you want to know
*where we are right now*, read a running doc.

## The set

| # | Document | Role (spec type) | Canonical home for | Status |
|---|----------|------------------|--------------------|--------|
| **00** | **[ENGINE-DESIGN-SPECIFICATION.md](00-ENGINE-DESIGN-SPECIFICATION.md)** | **Governing specification** — vision, first principles, engine laws, the coaching-decision architecture, the three loops, domain models, validation & confidence frameworks | Philosophy · laws · the decision graph · knowledge/data architecture · domain-model intent · migration & expansion strategy | Draft v1.0 (governing) *(frozen v1.0 2026-07-01 recorded out-of-band — see docs/DOCUMENTATION-GOVERNANCE.md)* |
| 01 | [PANEL-REVIEW.md](01-PANEL-REVIEW.md) | **Evidence & critique basis** — an 8-discipline review of the engine, evidence-graded (L1–L5) | The scientific grounding behind the EDS's laws and the recommended decision hierarchy; weakness ranking; regression hot-spots | Stable (2026-06-23) |
| 02 | [REFACTOR-ROADMAP.md](02-REFACTOR-ROADMAP.md) | **Software design & build plan** — orchestrator target, folder structure, data contracts, phased migration, quick wins | The *how/when to build it*: folder structure, typed contracts, phase sequencing, test strategy | Stable (2026-06-23) |
| 03 | [SPORT-KNOWLEDGE-BASE.md](03-SPORT-KNOWLEDGE-BASE.md) | **Sport knowledge schema** — the 21-section per-sport demand model + evidence & privacy policy | The *sport model*: the SportProfile schema, authoring rules, the privacy validator, sport status | Stable (2026-06-28) |
| 04 | [PHYSIOLOGICAL-FRAMEWORK.md](04-PHYSIOLOGICAL-FRAMEWORK.md) | **Physiological metrics model** — manufacturer-independent readiness/recovery/load data model | The *athlete-metrics model*: raw-metric schema, personal-baseline normalisation, the derived indices, decision bands, graceful degradation | Stable (2026-06-28) |
| 05 | [INDEX-LAYER-FOLLOWUPS.md](05-INDEX-LAYER-FOLLOWUPS.md) | **Index-layer implementation spec** — the deferred build specs (A/B/C) completing the index layer of doc 04 | The concrete, code-level specs for the remaining physiological indices and the readiness re-weighting | Stable (2026-06-29) |

## Reviews & evaluations (point-in-time — dated evidence, not current state)

These are dated audit/review records. They are **never updated** after they are
written — findings may since have been resolved. Current state lives in
`HANDOFF.md`, never here.

| Document | Date | What it is |
|---|---|---|
| [06-SEED-EVIDENCE-REVIEW.md](06-SEED-EVIDENCE-REVIEW.md) | 2026-07-04 | Seed-coefficient review (C1–C14) — mostly dispositioned |
| [07-SKB-PROFILE-REVIEW.md](07-SKB-PROFILE-REVIEW.md) | 2026-07-04 | SKB conformance audit against the doc-03 schema |
| [08-SKB-CONSUMPTION-AND-SEASON-AUDIT.md](08-SKB-CONSUMPTION-AND-SEASON-AUDIT.md) | 2026-07-08 | SKB consumption + season audit — the audit behind PRs #160/#161; headline findings resolved |
| [../decision-engine-evaluation.md](../decision-engine-evaluation.md) | 2026-06-21 | The founding F1–F10 engine evaluation |

## How the documents relate

```
                 00 · ENGINE DESIGN SPECIFICATION  (the constitution — why & what & the laws)
                 │   governs all below; canonical for philosophy, laws, the decision architecture
     ┌───────────┼───────────────────────────┬───────────────────────────┐
     ▼           ▼                           ▼                           ▼
  01 PANEL     02 REFACTOR                03 SPORT-KB                 04 PHYSIOLOGICAL
  (evidence    (build plan,              (sport demand               (athlete metrics
   & critique   contracts,                schema + evidence           model: readiness/
   grounding    phased                    & privacy policy)           recovery/load)
   the laws)    migration)                                                 │
                                                                           ▼
                                                                  05 INDEX-LAYER
                                                                  (impl. specs A/B/C
                                                                   completing doc 04)

   Running docs (separate, track status against the above): HANDOFF.md · CLAUDE.md
```

## Rules for keeping the set coherent

1. **One canonical home per topic.** Laws and the decision architecture live in `00`; evidence in
   `01`; build plan and contracts in `02`; the sport schema in `03`; physiological metrics in `04`;
   index-layer build specs in `05`. A document that needs a topic it does not own *points to the
   owner* rather than restating it.
2. **The EDS is the tie-breaker.** If two docs disagree, reconcile toward `00`.
3. **Status goes in running docs.** When a target here is met, record it in `HANDOFF.md` /
   `CLAUDE.md`. Do not turn a foundational spec into a changelog.
4. **Evidence is never fabricated.** Every authored recommendation carries provenance
   (`confidence`, `evidenceLevel`, `source`); thin evidence is labelled, not invented (the policy
   `00` and `03` both mandate).
