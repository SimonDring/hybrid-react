# Knowledge Architecture Review — 2026-07-09

**Status: REVIEW (dated) · governance sprint Phase 3 · assessed against the
platform's own frozen standards (KNOWLEDGE-ARCHITECTURE.md's 8 kinds / 12
domains / universal entry shape; DECISION-ONTOLOGY.md's vocabulary).**
Full per-file evidence gathered by a dedicated survey; cross-corroborated by
the [Decision Engine Review](2026-07-09-decision-engine-review.md) (Phase 2
found the same top defects from the consumption side).

## Verdict and grades

**The knowledge base is genuinely strong and unusually self-aware** — the SKB
(11/11 flagship profiles, 21 sections, ~70+ confidence tags each) and the
governed KB (37 entries, universal shape, KSV changelog as audit trail) both
validate on load, and "add knowledge, not code" is mostly true. The weaknesses
concentrate in three places, and they are the *same three* the engine review
found from the other side.

| Dimension | Grade | One-liner |
|---|---|---|
| Coverage | B | SKB + recovery/load deep; Quality & Adaptation (the KA's own "most important domain") still thinnest; rehab 9/14 regions |
| Ontology conformance | B− | Vocabulary faithful except the lossy fixed-10 quality projection |
| Schema quality | A− | Validators thorough incl. the privacy sweep; no standalone validate gate; catalogue unvalidated |
| Normalisation & identity | B+ | WP-46 id-joins landed; the one surviving name-regex join is on the **safety path** (injury filter) |
| Extensibility | B+ | Add-a-sport = 3 data/registry touches, zero core edits; add-an-exercise pure in-engine, not across the app boundary |
| Coach usability | B− | Readable, machine-validated; but authoring = hand-editing 100KB JSON, engineer required |
| AI readiness | B | Validators are callable pure functions (the AIGAS C6 scaffold); `source` is unvalidated free text — fabrication passes |
| Missing concepts | C+ | No id-level contraindication vocabulary, progression ladders, VBT/RIR tables, sex/masters priors, nutrition |

## The three structural findings

**K1 — The fixed-10 quality vocabulary silently discards the SKB's richest
signal.** `sportQualityMap.js` maps 8 authored SKB qualities (sprintSpeed,
acceleration, deceleration, changeOfDirection, coordination, rotationalPower,
gripStrength, neckStrength) to `null`. Hurling's grip/rotational demand,
sprinting's acceleration, and rugby's neck demand are authored, tested
(the SKB test suite asserts hurling weights grip above football!) — and then
dropped before the diagnosis sees them. The platform's stated moat (deep sport
knowledge) is being truncated at its own vocabulary boundary. *Engine review
W3 is this same finding downstream.*

**K2 — The one surviving name-match join is the safety-critical one.** WP-46
id-keyed progression and core-holds, and the app form guide's name matching is
deliberate display-layer behaviour (verified, fine). But injury
contraindication still blocks by regex on `item.name` (`injuryFilter.js:19`).
A novel exercise name that a regex misses ships to an injured athlete. *Engine
review S6/W6 corroborates: the render backstop is load-bearing with no defence
in depth.*

**K3 — The universal entry shape governs 2 of ~20 knowledge modules.** The
validated shape (id/rule/value/appliesTo/evidence/confidence/source/
lastReviewed) covers `entries.js` and the SKB; dose schemes, qualities,
capability priors, the 130-exercise catalogue, and ~14 sibling modules carry
provenance as free-form comments. Every exercise resolves a quality tag, but
the tail is inherited seed data (`needsReview: true` on all tags) with no
tracked review workflow.

## Secondary findings

- Rehab content 9/14 regions (blocks-without-rehab for shin/quad/elbow/wrist/
  cervical) — the safety consequence is documented in the engine review (empty
  sessions).
- Sport-count and "one registry line" claims in the KA slightly overstate:
  adding a sport = JSON + 2 registry lines + an engine-binding entry (still
  zero core edits — the spirit holds).
- Duplication actively retired (legacy sport layer deleted; strength standards
  single-sourced; priority lists derived) — residual: the fixed-10 names
  restated across three modules.
- Provenance discipline exemplary at the set level (KSV changelog) but
  `source` strings are unparseable free text — the KA's "never fabricated"
  rule is policy, not check.
- Positive worth stating: the privacy sweep (raw vitals can never be
  coach-visible in an SKB KPI) fails the build — Constitution Art 11 is
  machine-enforced at the knowledge layer.

## Prioritised improvements

1. **Absorb the 8 dropped qualities into the vocabulary** (first-class or a
   "sport-skill" family) so the demand projection stops returning null — the
   single highest-leverage knowledge change; unlocks authored SKB richness
   into diagnosis. Data + one map edit; re-baseline sport archetypes
   deliberately. *(Owner decision: vocabulary expansion is an ontology-adjacent
   call — the Ontology deliberately fixed 10; extending is a deliberate,
   documented decision, arguably an amendment-adjacent change.)*
2. **Id-join the injury filter** — `contraindicatedFor: [{region, stage}]` on
   the catalogue (or pattern-id joins), retire the name regex. Closes K2.
3. **Author the 5 missing rehab regions** + a completeness report flagging any
   region with contraindications but no rehab. *(Science review: Simon.)*
4. **One `validate:knowledge` gate** covering the sibling modules + the
   exercise catalogue under the universal shape (a thin KnowledgeTable
   wrapper), runnable standalone.
5. **Machine-checkable provenance + review queue** — structured citations,
   `needsReview` as queryable state with reviewedBy/On. This is the concrete
   unblock for AIGAS C6 (AI drafts → human reviews → machine validates).

## Missing-concept backlog (for the roadmap, not immediate)

Id-level contraindication vocabulary (item 2 seeds it) · technique
progression/regression ladders · VBT/RIR autoregulation tables · sex and
masters modifiers on capability priors (standards have them; priors don't) ·
return-to-play protocols · nutrition/hydration (deliberately out of scope
today — record the decision).
