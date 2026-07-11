# Decision Engine Migration Blueprint — DRAFT v0.1

**Status: REVIEW (dated) DRAFT · Sprint 2 forensic audit, deliverable 10 of 10 · main @ 02f6184.**
This is the first version of the engineering playbook for transforming the audited
engine into the constitutional target state. It is a *draft for adoption*: once Simon
adopts a sequencing decision, the active queue lives in HANDOFF.md and this document
graduates (or its successor does) alongside `docs/architecture/MIGRATION-BLUEPRINT.md`
(the original D1–D16 build blueprint, whose backlog is essentially executed — this
draft is its operational-completion successor, not its replacement).

---

## 1. The strategic reading (what kind of migration this is)

The audit's central verdict (deliverables 01–03): **the architecture is already the
Constitution's shape; the gaps are operational.** Therefore this is NOT a rebuild.
It is an **operational completion** in four verbs plus one retirement:

| Verb | Today | Target | Owning waves |
|---|---|---|---|
| **Measure** | 1/10 qualities; assessments unread | Capability measured where the athlete gives data; honest confidence everywhere | C |
| **Progress** | Static e1RM re-percentaged; no overload for non-loggers | Individualised overload for every athlete | B |
| **Dispose** | 5/16 validators, report-only, invisible | Validation trims/vetoes; report feeds explanation | A→D |
| **Learn** | Staged priors, no readers, no history | Outcomes recorded; priors promoted under policy | E |
| *(Retire)* | Legacy deficit fill (3 cohorts) | One selection engine | B/D |

**Migration invariants (non-negotiable, inherited and re-verified):** the pure core
stays pure (Art 18; triple enforcement in place); every wave is golden-master-gated
with re-baselines audited key-by-key and scoped to the archetypes the wave
intentionally changes; validators land report-only and promote by flag; frozen docs
are never edited inline; merges are Simon's; each wave ships athlete value on its own
(Art 20 — no cathedral).

## 2. What survives, what changes (Phase-10 disposition)

**Survives unchanged (protect):**
- The purity/determinism regime and its triple enforcement — the crown jewel.
- The D1–D5 diagnosis chain's *structure* and honesty gates (reasoning shown only
  when it steered).
- D13 scheduling (the audit's strongest layer) and the despine/plyo/axial systems.
- D15 reflow discipline: freeze-on-start, baseline-identity, forgiveness surfacing,
  corroborated deloads.
- The privacy stack (build-failing SKB sweep, allowlisted roll-up, RLS pattern).
- The knowledge authority mechanism (capVerdict, ACWR demotion) — to be *extended*,
  never bypassed.
- The SKB itself (the moat) and the governed KB with KSV versioning.
- Freeze-set documents: no amendment is required by anything in this audit.

**Survives with modification:**
- D1 capability estimation → per-quality measured estimators behind the same
  interface (additive; plans unchanged until data exists).
- D12 dose → keep scheme tables; add athlete terms (progression state, later learned
  tolerance); fix the style-band regression immediately.
- D14 → same contract; more validators; enforcement ladder (report → flag → gate);
  rehab sessions become visible to it.
- Readiness pipeline → same blend; add recency gate, trend smoothing, operative
  confidence (and fix the exported confidence computation).
- The volume-target machinery → survives as the *ledger only*; its display and
  catch-up semantics become cohort-honest; eventually diagnosis-aware or explicitly
  demoted on D11 paths.
- sportQualityMap → survives short-term with the bug fixed + droppedDemands emitted;
  superseded by the vocabulary expansion (Simon's ontology call).

**Requires redesign (bounded, known-shape):**
- Progression: a real model (block-position creep + double-progression + ramps +
  logged-athlete autoregulation as the fast path) — design doc + Simon sign-off.
- The data substrate: append-only outcomes + readiness snapshots + bounded sync +
  promotion policy (one design serving D16, Team trends, coach overrides, AI).
- allocator.js: split along the D11/D12/D13 boundaries; constants to knowledge;
  cohort sets to SKB metadata.
- D6 strategy + D8 microcycle: from fragments to decisions (prerequisite for
  endurance programming, Stage 7).

**Removed entirely (after their cohorts are rescued):**
- The legacy deficit fill and its scoring economy.
- Dead scaffolding: stretch-bias claim + stretchMult path, ISO_SETS.bodybuilding,
  style bridge remnants, stale headers, the uncalled clock default.

## 3. The waves

Waves are dependency-ordered; each is independently shippable and independently
valuable (Art 20). P-numbers reference deliverable 09.

### Wave A — Stop the bleeding (days; mostly autonomous-lane)
P0-1 style-band fix · P0-2 injury fallback/visibility/honesty · P0-3 injury-veto
enforcement (flagged) · P0-5 legacy-cohort rescue (fallback seed, triathlon routing,
GAA backfill) · P0-6 mapping bug + droppedDemands · P0-7 memo signature · P1-10 F3
migration apply.
*Gate:* each lands with the golden delta it intends and no other. *Risk:* re-baseline
discipline (TR-01 proved the failure mode — every Wave A re-baseline is audited
against an explicit expected-delta note).

### Wave B — Progression & one selection engine (weeks; 🔒 design sign-off)
P0-4 minimum viable progression (creep + double-progression + ramps) → P1-8 legacy
fill retirement. Behaviour-changing for everyone: spec → Simon → per-discipline
rollout with archetype-scoped re-baselines. P1-3's progression-sanity and
dose-coherence validators land *first* as the net (test the property, then change the
behaviour).
*Risk:* plan-shape churn for existing users — stage by discipline; freeze-on-start
protects committed work by construction.

### Wave C — Measured diagnosis & disciplined signals (weeks; 🔒 anchors)
P1-1 assessments → capability (per-quality estimators, staged, confidence-tagged) ·
P1-2 athlete-signal confidence operative · P1-7 vocabulary expansion (paired: measure
what you newly diagnose) · P1-9 silent-list burn-down alongside.
*Gate:* additive first — a profile with no new data produces a byte-identical plan;
only newly-measured cohorts re-baseline.
*Risk:* bad anchors worse than priors (SR-02) — per-quality staging, science-reviewed.

### Wave D — Validation becomes real & the seams open (weeks)
P1-3 validator build-out + report rendering → promotion ladder per validator ·
P2-3 coach-override v1 through validateProposal (human proves the AI seam) ·
P2-6 explainability at prescription (persist selection rationale; render
meta.diagnosis; ship `explain`).
*Gate:* every promotion (report → gate) is flag-staged with a false-positive budget
measured over the report-only period.

### Wave E — The substrate & the learning loop (1–3 months; 🔒 privacy + promotion)
P1-5 outcomes/history layer + bounded sync (the one design that unblocks D16, Team
trends, coach evidence, AI) → P2-7 D16 promotion policy + honest D7 gating → team
trend surfaces → AIGAS go-live order unchanged (ratification → eval harness → deploy
→ Simon's AI_ENABLED).
*Risk:* privacy — design against Art 11 with the player_status rigor; panel-review
the schema.

### Wave F — Structure & breadth (after B/D; 🔒 the HIGH-risk re-seat)
P2-1 allocator split + constants/cohorts to knowledge (byte-identity per extraction)
· P2-2 D6/D8 decisions · P2-5 age/sex modifiers · P2-9 wearable adapter · P2-10
knowledge governance completion · P3 polish. Stage-7 endurance programming builds on
D6/D8 + the vocabulary — explicitly after the learning loop proves the gym product.

### Continuous rails (every wave)
The test net grows with each wave (P1-4: steered-path archetypes, reflow-parity
property test, engine-owned suite, RLS in CI — Wave A starts it); every wave adds the
validator that would have caught its defect class; HANDOFF + reviews README updated
per governance; no wave edits a frozen doc.

## 4. Dependency spine (why this order)

```
A (defects/safety)
├─► B progression ──────────► F re-seat (don't re-seat and change behaviour at once)
├─► C measurement ─┐
│                  ├─► D validation/explainability/overrides
└─► P1-4 test net ─┘             │
                                 ▼
                     E substrate & learning ──► Team trends · AI go-live · Stage 7
```

The inherited 2026-07-09 roadmap remains compatible: Wave A ≈ its Immediate tier
residue + this audit's new defects; Waves B–E absorb S1–S5/M1–M4 with the ordering
sharpened by two audit facts — the style-band regression makes re-baseline discipline
the first deliverable, and D14's invisibility makes "render the report" a
prerequisite to trusting any promotion ladder.

## 5. Decision points reserved for Simon (🔒 ledger)

1. Progression model design + rollout order (Wave B) — coaching philosophy.
2. Assessment estimator anchors per quality (Wave C) — science.
3. Quality-vocabulary expansion (ontology-adjacent; candidate amendment record).
4. Rehab content for 5 regions + protect-phase entries (science).
5. Injury-veto promotion from flag to default (safety/product).
6. Outcomes-layer privacy/de-identification design (Art 11).
7. D16 staged→learned promotion policy; D7 gate semantics.
8. Functional discipline identity; equipment-demotion honesty copy.
9. The allocator re-seat itself (standing HIGH-risk pause).
10. Endurance programming scope trigger (Stage 7).

## 6. Success criteria for the migration (measurable)

- Zero cohorts served by volume-first selection (G6 closed).
- A non-logging intermediate's week 6 ≠ week 5 in load or reps (G9 closed).
- ≥12 of the EDS §35 validators exist; injury + lawfulness class enforce; the
  validation report renders (G11 closed).
- ≥4 of 10 qualities measurable from data the app can collect; k>1 priorities for
  measured athletes (G1/G3 closed).
- Block outcomes persist append-only; at least one prior promoted under policy and
  consumed by a subsequent plan (G13 closed).
- The silent list (deliverable 05/findings) is empty or rendered.
- Golden re-baselines each carry an expected-delta note; the TR-01 class cannot recur
  unaudited.
