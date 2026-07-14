# Decision Engine V2 — Migration Architecture

**Status: PROPOSAL — working doc (T4) · 2026-07-14 · not canonical; adopted only via DEVELOPMENT-PLAN §5.3**
**Sprint spec: [`docs/superpowers/specs/2026-07-14-decision-engine-v2-design.md`](../../superpowers/specs/2026-07-14-decision-engine-v2-design.md)**

---

This document is the first of the migration set (10/11/12). It **hardens the
DRAFT waves A–F blueprint** (audit 10, `docs/reviews/2026-07-11-engine-audit-10-migration-blueprint-draft.md`)
into the migration architecture of the V2 proposal set — it never reinvents
it; where this set and the draft differ, the difference is stated with its
reason. Its companions: [`11-MIGRATION-PHASES.md`](11-MIGRATION-PHASES.md)
(the phase sequence M0–M6) and
[`12-MODULE-DEPENDENCY-DIAGRAM.md`](12-MODULE-DEPENDENCY-DIAGRAM.md) (the
module graph and migration spine). `13-VALIDATION-STRATEGY.md` attaches its
per-module gates to the phase IDs defined in 11.

**The starting-point frame.** Claims about the shipped engine are facts **as
of the audit pin (`main @ 02f6184`, 2026-07-11)**. Phase 0 Wave A landed
after the pin (PRs #173/#174 — P0-1…P0-7 and follow-ups): wherever Wave A
altered a pinned finding, the fix reference is given alongside, and every
migration phase from here baselines against **post-Wave-A main**, not the
pin. Live status lives in HANDOFF.md only.

**Lineage.** `docs/architecture/MIGRATION-BLUEPRINT.md` (SUPPORTING,
2026-07-01) is the original D1–D16 build blueprint; its backlog is recorded
there as essentially executed, and audit 10 declares itself that document's
*operational-completion successor, not its replacement* (audit 10, header).
This document stands in the same line: it conflicts with nothing in the 2026-07-01
blueprint's target module map — it completes it with the D17 family, the
constraint artefact, and the phase sequence the audit evidence demands.

---

## §1 Verdict and stance — an operational completion, not a rebuild

The audit's central verdict is the stance of this migration: **"the decision
architecture is a coach; the operating data and the closing loops are still a
generator's"** — so the effort "should not be a rebuild at all in the
architectural sense … it should be an *operational completion*" (audit 03 §7;
audit 10 §1). The frame is **four verbs plus one retirement**:

| Verb | At the pin (`main @ 02f6184`) | V2 target | Owning phase(s) (11) | Owning design doc |
|---|---|---|---|---|
| **Measure** | 1/10 qualities measured; assessment fields collected and unread (G1; audit 08 · SR-02; audit 07) | Capability measured wherever the athlete gives data; honest confidence everywhere (C8) | M3 | `03-PERFORMANCE-MODEL.md` (planned scope: the per-quality estimators behind D1's interface) |
| **Progress** | Static e1RM re-percentaged; no overload for non-loggers (G9; audit 08 · SR-01; audit 07) | Individualised progression for every athlete, at all eight levels (C4) | M2 | `07-PROGRESSION.md` (planned scope: the eight-level architecture inside D7/D12/D15 — 02 §4 R3) |
| **Dispose** | 5/16 validators, report-only, report reaching no screen (G11; audit 08 · TR-02; audit 06) | Validation trims/vetoes; the report feeds explanation (C5, C1) | M4 (net seeded at M0) | `13-VALIDATION-STRATEGY.md` (planned scope: suite + ladder), with 02 §3 (the conflict-order pass) |
| **Learn** | Staged priors with no readers; no history substrate (G13; audit 08 · TR-03; audit 06) | Outcomes recorded append-only; priors promoted under policy and consumed next pass | M5 | `07-PROGRESSION.md` + the DAAS §3 *(designate, in review)* |
| *(Retire)* | Two selection engines; the legacy volume-first fill serving real cohorts (G6; audit 08 · B1; audit 04 · TR-08; audit 06 — cohorts rescued onto the D11 path by Wave A, PR #173) | **One selection engine**; the fill deleted, not bypassed (C7) | M2 | `05-SESSION-BUILDER.md` (planned scope: the single construction path) |

### 1.1 Migration invariants (non-negotiable, inherited from audit 10 §1 and re-affirmed)

1. **The pure core stays pure** (Constitution Art 18; TAS §5.0) — the triple
   enforcement verified at the pin (audit 01 §1) is protected by every phase.
2. **Every phase is golden-master-gated**, with re-baselines audited
   key-by-key and scoped to the archetypes the phase intentionally changes;
   every re-baseline carries an **expected-delta note** (the TR-01 class —
   a silent regression re-baselined into the goldens — must be structurally
   unable to recur unaudited).
3. **Validators land report-only and promote by flag**, up the
   report → flag → gate ladder with a false-positive budget measured over
   the report-only period (C5; 02 §2.14).
4. **Frozen documents are never edited inline**; a frozen-doc defect goes to
   the amendment queue. Nothing in this migration requires an amendment —
   the Amendment Register is empty (00 §4), and the audit itself found
   "no amendment is required by anything in this audit" (audit 10 §2).
5. **Merges are Simon's**; the 🔒 decision points (11 §8) pause where marked;
   the allocator re-seat is a standing HIGH-risk pause.
6. **Each phase ships athlete value on its own** (Constitution Art 20 — no
   cathedral): a phase that only rearranges code must prove byte-identity
   instead of value.
7. **Never re-seat and change behaviour at once** — behaviour changes (M2,
   M3) and structural re-seats (M6) are different phases by design
   (audit 10 §4).
8. **Data-pillar work executes against the DAAS's shapes** *(designate, in
   review)* — history, capture, and analysis phases build the DAAS §1.5/§3
   shapes, never today's ungoverned ones (governance audit 09 §5's ordering
   warning: fixes executed before the governance rulings "harden today's
   ungoverned shapes").

---

## §2 Module boundaries — the target V2 module set

### 2.1 The boundary rule

A V2 **module** is a unit that is **independently testable** (its contract
can be exercised with typed fixtures, no sibling required) and
**independently replaceable** (it can be rewritten behind its contract with
byte-identical siblings — which is also what makes rollback module-scoped,
§5). Module boundaries follow the ratified decision boundaries (EDS §20):
one module owns one stage or one coherent stage group, plus the cross-cutting
read-models (explanation) and substrates (knowledge, history). Contracts are
`{value, confidence, rationale}` typed artefacts enforced at every boundary
(TAS §5.3; 02 §2).

### 2.2 The module table

Every node of diagram 1 in `12-MODULE-DEPENDENCY-DIAGRAM.md` appears here,
under the same ID. "Files at the pin" is the hot-zone mapping **as of
`main @ 02f6184`** (paths relative to `packages/engine/src/`); it is the
migration's *from*, never a status claim.

| ID | V2 module | Stage(s) / owner doc | One-line responsibility | Files at the pin (current → V2) |
|---|---|---|---|---|
| M-ATH | Athlete model | D1 · `03` | Build the confidence-honest `AthleteModel`; per-quality measured estimators behind one interface (C8) | `lib/athlete/*`, `lib/performance/estimation.js`, `lib/adapters/*` |
| M-DEM | Demand | D2, D3 · `03`/`04` | Resolve and refine the demand profile from the SKB / goal-as-sport modules; emit `droppedDemands` (Wave A landed the ledger — PR #173) | `lib/performance/demandProfile.js`, `disciplineDemand.js`, `lib/sportKnowledge/*`, `data/sportQualityMap.js` |
| M-DIAG | Diagnosis | D4, D5 · `03` | Rank limiting factors; select priority qualities with typed adaptation targets (02 §4 R2) | `lib/performance/diagnose.js`, `prioritise.js`, `forProfile.js` |
| M-STRAT | Strategy | D6 · `02` §2.6 | The typed develop/maintain map at intervention-class granularity (02 §4 R1); fragments hard-coded downstream at the pin (G4; audit 08) | *(new module — no single home at the pin)* |
| M-PERIOD | Periodisation | D7, D8 · `07` | Block objectives with typed exit criteria/handover; fixture-aware microcycles | `lib/plan/periodization.js`, `blockObjective.js`, `seasonWindow.js`, `split.js`, `frequency.js` |
| M-CONSTR | Constraint engine | the resolved artefact (02 §4 R4) · `06` | Compose D1/D6/D8 constraint outputs into **one resolved, typed constraint artefact** consumed by D9–D13, re-checked by D14 (C2) | `lib/plan/constraints.js`, `lib/injury/*` (selection-side), `lib/plan/teamSchedule.js` |
| M-SESS | Session builder | D9, D10, D11 · `05` | Objective → movement requirements → value-ordered selection with a stopping rule; **the one selection engine for every cohort** (C7) | `lib/session/*`, `lib/plan/selectInterventions.js`, `lib/plan/allocator.js` (fill engines, `:641–:1041`) |
| M-DOSE | Dose | D12 · `07`/`04` | Minimum effective dose; progression's dose-advancement arm (02 §4 R3); every magnitude knowledge-homed (C3) | `lib/plan/allocator.js` (dose surgery), `data/doseSchemes.js`, `lib/strength/*`, `lib/liftProgression.js` |
| M-SCHED | Scheduler | D13 · `02` §2.13 | Interference-aware placement with penalty accounting — the audit's strongest layer, preserved (audit 03 §2) | `lib/plan/scheduler.js`, `despine.js`, `axial.js`, `primers.js` |
| M-VAL | Validation | D14 · `13` | The validator suite + the conflict-order resolution pass (02 §3); trims and vetoes; emits the `ValidationReport` (C1, C5) | `lib/validation/*` |
| M-EXPL | Explanation read-model | cross-cutting · `08` | Render the decision trace at prescription — why this exercise/dose/order/schedule (C6) | *(fragments at the pin: rationales discarded post-selection; reserved `explain` API — G16; audit 08)* |
| M-RT | Runtime projection | D15 · `02` §2.15 | Reflow pending work by re-running D9–D14; freeze-on-start absolute | `lib/plan/reflow.js`, `lib/sportKnowledge/reflowAdjust.js` (+ app-side `PlanService.js` orchestration) |
| M-ANLYS | Analysis | D17 family · `02` §2.17 | Pure interpretation: signal derivation, trends/anomalies, benchmarks, squad roll-up, reports — insights forward-only | `lib/indices/*`, `lib/load/load.js`, `lib/recovery/recovery.js`, `lib/team/rollUp.js` |
| M-LEARN | Learning | D16 · `07`/`02` §2.16 | Score block outcomes against typed exit criteria; write priors only, three tiers, under promotion policy | `lib/learning/blockOutcome.js`, `lib/priors.js`, `data/blockPriors.js` |
| M-KNOW | Knowledge registries | L2 · `04` | Versioned, evidence-tagged data the core reads; destination of the ~30 in-code magnitudes and sport-fact sets (C3; TR-12; audit 06) | `data/*`, `lib/knowledge/*` |
| M-HIST | History substrate | DAAS §3 *(designate)* | Append-only outcomes + readiness snapshots + bounded sync; the longitudinal record V2 consumes, never re-owns | *(absent at the pin — latest-only JSONB in `users.profile`; TR-03; audit 06)* |
| M-ORCH | Orchestration | L3 (TAS §3.2) | Thin impure adapter: fetch state, pin versions, invoke core, persist, emit traces | app-side `PlanService.js`, `AthleteModelService.js`, `SyncService.js` |

### 2.3 The three structural moves inside the table

1. **The allocator splits along D11/D12/D13** (TR-07; audit 06). At the pin
   `allocator.js` is a 1,253-line concentration holding both fill engines,
   dose surgery, post-passes, and structuring — "every construction defect in
   this audit lands there." The EDS's own stage boundaries are the natural
   split: selection logic into M-SESS, dose surgery into M-DOSE, structuring
   and post-passes into M-SCHED; constants to M-KNOW; cohort sets to SKB
   metadata (P2-1; audit 09). Each extraction is **byte-identity-gated**
   (§4 R1) and lands in M6 — after behaviour has settled (invariant 7).
2. **The D9/D10 session layer becomes THE path** (TR-08; audit 06). At the
   pin the diagnosis-steered D9→D10→D11 chain and the legacy greedy
   deficit fill coexist inside `allocateGym()` (audit 01 §3,
   `allocator.js:87–100` vs `:969–1041`). V2 has exactly one construction
   path — M-SESS — for every cohort; the fill, its scoring economy, and its
   dead scaffolding are deleted at M2 after the cohort-rescue proofs
   (Wave A, PR #173) and M2's progression work prove the D11 path serves
   everyone (C7; DEVELOPMENT-PLAN §6).
3. **The constraint artefact is composed, not decided** (02 §4 R4). M-CONSTR
   adds no stage and rewires no edge: it composes D1/D6/D8 outputs into the
   one typed artefact (EDS §36), making injuries pre-shape selection with
   D14 as backstop (C2) — the empty-rehab defect class (TR-04; audit 06;
   immediate defects addressed by Wave A, PRs #173/#174) becomes
   inexpressible rather than caught.

---

## §3 Disposition table

Audit 10 §2's Phase-10 disposition, updated where the anchor documents
(00/01/02) sharpened the shape and where Wave A landed. Categories:
**SURVIVES-UNCHANGED** (protect) · **SURVIVES-MODIFIED** · **REDESIGNED**
(bounded, known shape) · **REMOVED** (after rescue).

| Element | Disposition | What changes / why protected | Phase |
|---|---|---|---|
| Purity/determinism regime + triple enforcement | SURVIVES-UNCHANGED | The crown jewel (audit 10 §2; 00 §3 row 3) | all — invariant 1 |
| D1–D5 diagnosis chain structure + honesty gates | SURVIVES-UNCHANGED | Structure and order are the ratified design; inputs get measured (C8) without touching the order (00 §3) | M3 feeds it |
| D13 scheduling, despine/plyo/axial systems | SURVIVES-UNCHANGED | The audit's strongest layer (audit 03 §2); penalty weights move to knowledge (C3) without behaviour change | M6 (knowledge move) |
| D15 reflow discipline (freeze-on-start, baseline-identity, forgiveness, corroborated deloads) | SURVIVES-UNCHANGED | Pin-verified (audit 01 §6); preserved as-is (00 §3) | — |
| Privacy stack (SKB sweep, allowlisted roll-up, RLS pattern) | SURVIVES-UNCHANGED | Constitution Art 11 posture confirmed; extended by DAAS §5 lineage *(designate)* | — |
| Knowledge authority mechanism (capVerdict, ACWR demotion) | SURVIVES-UNCHANGED | Extended, never bypassed (Art 13; EDS §28.3) | M3/M4 extend |
| The SKB + governed KB with KSV versioning | SURVIVES-UNCHANGED | The moat; sole sport source | — |
| Frozen governing set (v1.1) | SURVIVES-UNCHANGED | Zero divergences queued (00 §4) | — |
| D1 capability estimation | SURVIVES-MODIFIED | Per-quality measured estimators behind the same interface; additive-first — no new data ⇒ byte-identical plan (C8; 02 §2.1) | M3 |
| D12 dose | SURVIVES-MODIFIED | Scheme tables kept; athlete terms added (progression state, learned tolerance); the style-band regression was the immediate fix (TR-01 — landed, Wave A PR #173) | M2, M5 |
| D14 | SURVIVES-MODIFIED | Same contract; full suite; report → flag → gate ladder; rehab sessions visible to it (visibility landed — Wave A PR #173); hosts the compiled conflict-order pass (02 §3) | M4 |
| Readiness pipeline | SURVIVES-MODIFIED | Same blend; recency gate, trend smoothing, operative confidence; exported-confidence computation fixed (TR-13; audit 06) | M3 |
| Volume-target machinery | SURVIVES-MODIFIED | Survives as the **ledger only** (Art 6); display and catch-up semantics made cohort-honest; never a driver (G7; audit 08) | M2, M3 (P1-9) |
| sportQualityMap projection | SURVIVES-MODIFIED | Mapping bug fixed + `droppedDemands` emitted (landed — Wave A PR #173); superseded by the AE-1 vocabulary expansion (00 §4.1) | M3 (AE-1) |
| Progression | REDESIGNED | A real model: block-position creep + double-progression + ramps + logged-athlete autoregulation as the fast path — inside D7/D12/D15, no new stage (02 §4 R3); design doc + 🔒 Simon sign-off | M2 |
| Data substrate | REDESIGNED | Append-only outcomes + readiness snapshots + bounded sync + promotion policy — one design serving D16, Team trends, coach overrides, AI (G13/G18/G21); built to DAAS §3 *(designate)*, not invented | M5 |
| allocator.js | REDESIGNED | Split along D11/D12/D13 (§2.3); constants to knowledge; cohort sets to SKB metadata | M6 |
| D6 strategy + D8 microcycle | REDESIGNED | From fragments to typed decisions (02 §2.6, §2.8) — prerequisite for Stage-7 endurance | M6 |
| Legacy deficit fill + scoring economy | REMOVED | Deleted after cohort rescue (rescue landed — Wave A PR #173); zero cohorts on volume-first selection is the acceptance line (§6) | M2 |
| Dead scaffolding (stretch-bias claim + stretchMult path, ISO_SETS.bodybuilding, style-bridge remnants, stale headers, the uncalled clock default) | REMOVED | Deleted with the fill or in M6 polish (TR-16/TR-18; audit 06; P3-1) | M2/M6 |

---

## §4 Risks and mitigations

Ranked by (likelihood × blast radius) against this migration specifically.
The general platform registers remain audits 06/07.

| # | Risk | Evidence | Mitigation |
|---|---|---|---|
| R1 | **Behaviour change smuggled into a re-seat.** A structural extraction (M6) quietly alters plans | TR-01 (audit 06) proved the failure mode: a silent regression re-baselined into the goldens unnoticed | **Byte-identity extractions**: every M6 extraction lands with a byte-identical golden run — a re-seat PR containing any golden delta is rejected by definition (invariant 7); expected-delta notes on all other re-baselines (M0) |
| R2 | **Golden-master blind spots certify defects.** The suite never exercises the paths production runs | TR-05 (audit 06): the D7 steer arms for every real onboarded sport user while golden archetypes exercise the template path; TR-01's regression passed the suite | **M0 first**: archetype-matrix extension covering armed-prod paths (dual-written athlete model, injured, measured, each rescued cohort), a reflow≡baseline property test, an engine-owned suite (TR-11) — the net precedes every behaviour-changing phase |
| R3 | **Cohort regressions during legacy retirement.** Deleting the fill degrades the cohorts it served | B1 (audit 04); G6 (audit 08): triathlon, zero-gap run/cycle, code-less GAA at the pin | **Cohort-rescue acceptance tests**: M2's exit gate includes named per-cohort archetypes proving improved-or-not-degraded plans (the Wave A P0-5 quality gate, made permanent); retirement follows proof, never precedes it |
| R4 | **Plan-shape churn for existing athletes.** M2's progression changes behaviour for everyone | Audit 10 §3 Wave B risk | Stage by discipline with archetype-scoped re-baselines; freeze-on-start protects committed work by construction (Art 10); progression-sanity + dose-coherence validators land **first** as the net (test the property, then change the behaviour) |
| R5 | **Bad measurement anchors are worse than priors.** M3's estimators mis-calibrate diagnosis | SR-02 risk note (audit 07; audit 10 §3 Wave C) | Per-quality staging, science-reviewed anchors (🔒), additive-first gate: a profile with no new data produces a byte-identical plan; only newly-measured cohorts re-baseline |
| R6 | **Validator promotion breaks athlete trust.** A gate with a high false-positive rate vetoes good plans | TR-02 (audit 06): one enforcing layer at the pin means no calibration history exists | Every promotion (report → flag → gate) is flag-staged with a false-positive budget measured over the report-only period (C5); render the report to humans before any gate trusts it |
| R7 | **The substrate hardens ungoverned shapes.** M5 builds history on today's blob semantics | TR-03 (audit 06); GA-803 via governance audit 09 §5 | M5 executes against the DAAS §1.5 ratify-or-supersede dispositions and §3 record design *(designate — its ratification is a 3→4 gate, DEVELOPMENT-PLAN §8)*; schema panel-reviewed with player_status rigor (🔒 privacy) |
| R8 | **Scope creep toward a cathedral.** Phases balloon past independent shippability | Art 20; invariant 6 | Each phase's exit gate is measurable (11); anything not required by the gate moves to a later phase or the backlog |

---

## §5 Rollback strategy

Per-phase, and structural. Rollback is a designed property, not an
aspiration:

1. **Flags default-off.** Every enforcement promotion and behaviour
   activation ships behind a flag whose default is OFF (the P0-3 pattern —
   Wave A landed the injury-veto gate behind `ENFORCE_INJURY_VETOES=false`,
   PR #173). Rollback of an enforcement = flip the flag; no code revert.
2. **Re-baseline reverts.** Golden re-baselines are commit-scoped and carry
   expected-delta notes (M0), so reverting a phase's behaviour is reverting
   its re-baseline commit(s) — the previous goldens are the previous
   behaviour, byte-for-byte.
3. **Module-level revertability.** Because modules are independently
   replaceable behind typed contracts (§2.1), a defective module version
   reverts alone; byte-identity extraction gates (R1) guarantee the pre-seat
   arrangement is always a valid fallback during M6.
4. **The knowledge lane rolls back by version.** Magnitude moves to M-KNOW
   (C3) are KSV-versioned; a bad entry reverts by pinning the prior
   knowledge-set version, never by code surgery (KA §5).
5. **Substrate rollback is additive-safe.** M5's history layer is
   append-only and read by the async band only (D16/D17); disabling its
   readers returns the platform to pre-M5 behaviour without data loss.
   Priors promotion is policy-gated and reversible by demoting the prior
   tier (D16's channel is the only write path — Art 18).
6. **Retirement is the exception, and it is gated.** M2's fill deletion is
   the one non-trivially-reversible step (dead code deleted). Its rollback
   window is the release in which cohort-rescue acceptance tests run against
   production-shaped archetypes; the deletion commit is isolated so a
   git-revert restores the fill wholesale if a cohort regression surfaces
   inside the window.

---

## §6 Acceptance criteria — the migration's definition of done

### 6.1 The audit's measurable targets (audit 10 §6, embedded verbatim)

- Zero cohorts served by volume-first selection (G6 closed).
- A non-logging intermediate's week 6 ≠ week 5 in load or reps (G9 closed).
- ≥12 of the EDS §35 validators exist; injury + lawfulness class enforce; the
  validation report renders (G11 closed).
- ≥4 of 10 qualities measurable from data the app can collect; k>1 priorities
  for measured athletes (G1/G3 closed).
- Block outcomes persist append-only; at least one prior promoted under
  policy and consumed by a subsequent plan (G13 closed).
- The silent list (deliverable 05/findings) is empty or rendered.
- Golden re-baselines each carry an expected-delta note; the TR-01 class
  cannot recur unaudited.

### 6.2 The sprint's success criteria (spec §7), as migration acceptance

- Implementation proceeds incrementally with no architectural uncertainty:
  every phase names the V2 documents it implements (11) and every module its
  owner (§2.2).
- The migration path is low-risk: phases independently shippable,
  golden-master-gated, rollback defined per phase (§5; 11).
- Every coaching decision has a clear owner (pipeline stage + knowledge
  domain — 02, `04`); knowledge and logic cleanly separated (C3 closure —
  nothing owned by "the code").
- The engine never optimises for bodybuilding unless bodybuilding is the
  selected goal — the volume frame survives only as the ledger (Art 6; G7).
- Zero edits to the frozen six; the Amendment Register stays empty or every
  entry is queued, never applied (00 §4).

### 6.3 Adoption

Per DEVELOPMENT-PLAN §5.3 and §8 (gate 2→3): this set becomes the
implementation blueprint — and 11's phase definitions become final,
superseding the audit's DRAFT waves as the build order — only when Simon
ratifies it. Until then every phase here is a proposal.
