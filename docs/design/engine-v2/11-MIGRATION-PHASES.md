# Decision Engine V2 — Migration Phases

**Status: PROPOSAL — working doc (T4) · 2026-07-14 · not canonical; adopted only via DEVELOPMENT-PLAN §5.3**
**Sprint spec: [`docs/superpowers/specs/2026-07-14-decision-engine-v2-design.md`](../../superpowers/specs/2026-07-14-decision-engine-v2-design.md)**

---

## §0 How to read this document

This is the phased sequence of the V2 migration: seven phases, `M0`–`M6`,
each independently shippable with its own measurable exit gate. It **hardens
audit 10's DRAFT waves A–F** into numbered phases —
`13-VALIDATION-STRATEGY.md` attaches its gates to these phase IDs, and
`12-MODULE-DEPENDENCY-DIAGRAM.md` draws their dependency spine. Backlog IDs
(P0-n/P1-n/P2-n/P3-n) are audit 09's; module IDs (M-XXX) are
[`10-MIGRATION-ARCHITECTURE.md`](10-MIGRATION-ARCHITECTURE.md) §2.2's; the
migration invariants (10 §1.1) bind every phase and are not restated
per-phase. Facts about the shipped engine are as of the audit pin
(`main @ 02f6184`, 2026-07-11), with Wave A fix references (PRs #173/#174)
alongside where it landed after the pin.

### 0.1 Wave → phase map (keeping the audit cross-referenceable)

| Audit 10 wave | Phase ID | Name | Standing |
|---|---|---|---|
| *(implied by the spine, unnumbered)* | **M0** | The test net | This set numbers it explicitly |
| Wave A — stop the bleeding | **M1** | Defects & safety | **LANDED** — executed as DEVELOPMENT-PLAN Phase 0 Track A (PRs #173/#174); recorded here as history + residuals |
| Wave B — progression & one selection engine | **M2** | Progression & the one selection engine | Planned |
| Wave C — measured diagnosis & disciplined signals | **M3** | Measured diagnosis | Planned |
| Wave D — validation becomes real & the seams open | **M4** | Validation disposes | Planned |
| Wave E — the substrate & the learning loop | **M5** | Substrate & learning | Planned |
| Wave F — structure & breadth | **M6** | Structure & breadth | Planned |

**Where this differs from the draft, and why:**

1. **M0 is numbered.** Audit 10's spine makes the test net a dependency
   ("A → … test net → D") and a continuous rail but gives it no wave letter.
   A net that gates other phases needs its own entry/exit gates, so it gets
   a phase ID.
2. **Wave A is landed history, not a plan.** The audit drafted Wave A as
   work; DEVELOPMENT-PLAN Phase 0 executed it. M1 therefore *records* the
   landed state and carries only residuals — and **every later phase
   baselines against post-Wave-A main**, not the pin.
3. **The wave↔phase map is 1:1** (A→M1 … F→M6), so every audit citation
   remains mechanically translatable. DEVELOPMENT-PLAN §6's working
   assumption allocated the numbers differently (its M1 = progression, its
   M2 = fill deletion) because it treated Wave A as pre-M0 work; §6 states
   its list is "the working assumption" and that "final definitions land in
   V2 deliverable 11" — this document is that finalisation. Nothing moves in
   *content or order*: progression still precedes fill deletion (both inside
   M2, as M2a → M2b), and the fill still dies at a phase named M2 — the
   development plan's headline "legacy fill DELETED at M2" holds verbatim.
4. **Two backlog items the draft left unassigned are homed**: P2-4
   (id-level contraindication vocabulary) rides M4 — promoting injury
   enforcement up the ladder while the safety join is a name regex would
   promote a fragile gate (TR-10; audit 06); P2-8 (functional discipline
   identity 🔒) rides M6 with the other philosophy-gated P2s.
5. **Data-pillar phases bind to the DAAS** *(designate, in review)* — it
   post-dates the draft. M5 (history store) and M3's capture surfaces
   execute against DAAS §1.5's ratify-or-supersede dispositions and §3's
   record design, per governance audit 09 §5's ordering warning (build the
   second product once, under governance — not twice, the first time by
   accident).

---

## §1 M0 — The test net

- **Objective.** Extend the safety net so every later phase's defect class
  is caught before it ships. The audit's two proven failure modes — a
  regression re-baselined into the goldens unnoticed (TR-01) and production
  running paths the goldens never exercise (TR-05) — become structurally
  impossible to repeat unaudited.
- **Backlog.** P1-4 (archetype-matrix extension: armed-D7/dual-written
  athlete-model archetypes, injured athletes, measured athletes, each
  legacy-rescue cohort; reflow≡baseline property test; engine-owned suite
  entry point — TR-11; RLS harness into CI) · the **expected-delta note**
  protocol on every golden re-baseline (closing the TR-01 class) · seed the
  per-phase rule that every phase adds the validator that would have caught
  its defect class (audit 10 §3, continuous rails).
- **Entry gate.** DEVELOPMENT-PLAN §5.3 ratification of this set (the gate
  every M-phase shares); nothing else — M0 changes no behaviour.
- **Exit gate (measurable).** Golden archetypes exercise every armed
  production path found by the audit (TR-05 case included); the
  reflow≡baseline property test and engine-own suite run in CI; the
  re-baseline protocol is documented and enforced in review (a re-baseline
  without an expected-delta note fails review by rule).
- **Independently shippable value.** Confidence: the platform's safety net
  certifies behaviour instead of whatever landed last (the TR-01 lesson);
  the RLS harness in CI hardens the team spine continuously.
- **Rollback.** None needed — additive tests only; a flaky addition is
  reverted alone.
- **🔒 Simon decision points.** None.

## §2 M1 — Defects & safety (Wave A) — LANDED

- **Objective (as drafted).** Stop the bleeding: the P0 defects shipping to
  real athletes, each landing with the golden delta it intends and no other.
- **What landed** (DEVELOPMENT-PLAN Phase 0 Track A; PRs #173/#174 — status
  detail lives in HANDOFF.md, not here): P0-1 style-band fix (volume bands
  keyed on discipline — TR-01) · P0-2 injury fallback/visibility/honesty
  (rehab sessions visible to their own validators; no phantom volume —
  TR-04/SR-03) · P0-3 injury-veto enforcement landed **behind a
  default-OFF flag** · P0-5 legacy-cohort rescue (triathlon, zero-gap
  run/cycle, code-less GAA onto the diagnosis-first path — B1/G6) · P0-6
  mapping bug + `droppedDemands` ledger (SR-05/B3) · P0-7 plan-memo
  signature repair (TR-06).
- **Residuals carried forward** (M1's exit is complete when these clear;
  none blocks M0/M2 starting):
  - P1-10 — the staged F3 privacy migration apply
    (staging → RLS harness → prod, per the shipped runbook).
  - P1-6 🔒 — rehab content for the 5 bare regions + protect-phase entries
    (the science half of P0-2; runs in parallel with any phase).
  - The 🔒 injury-veto flag flip (see decision points).
- **Entry / exit gates.** Historical; the record above is the exit. The
  load-bearing consequence: **post-Wave-A main is the baseline every later
  phase measures its deltas against.**
- **Independently shippable value.** Shipped: honest demand projection,
  fresh memos, correct volume bands for build cohorts, visible rehab
  validation, three cohorts rescued off the inverted path.
- **Rollback.** As landed: flag default-OFF for enforcement (P0-3);
  commit-scoped re-baselines for the rest.
- **🔒 Simon decision points.**
  - **🔒 4 · Rehab content for 5 regions + protect-phase entries (science)**
    — open (P1-6); content authoring awaits science review.
  - **🔒 5 · Injury-veto promotion from flag to default (safety/product)** —
    PART-SETTLED: the mechanism is landed default-OFF (P0-3, PR #173); the
    flip itself (I5) remains Simon's and may be taken any time after P1-6
    closes the empty-rehab content holes; M4's ladder is its natural review
    point.

## §3 M2 — Progression & the one selection engine (Wave B)

- **Objective.** Close the migration's *progress* verb and execute its one
  retirement: individualised overload for every athlete, then the legacy
  volume-first fill **deleted** — one selection engine for every cohort
  (C7; the development plan's headline milestone).
- **Backlog.** Ordered internally — the net first, then behaviour, then the
  deletion:
  - *M2a — progression becomes real*: P0-4 minimum viable progression for
    non-loggers (block-position creep + accessory double-progression +
    programmed warm-up ramps; logged-athlete autoregulation stays the fast
    path), designed in `07-PROGRESSION.md`'s frame (progression typed into
    D7/D12/D15 — 02 §4 R3; modules M-PERIOD/M-DOSE/M-RT). P1-3's
    **progression-sanity and dose-coherence validators land first,
    report-only** — test the property, then change the behaviour.
  - *M2b — the retirement*: P1-8 legacy fill deletion (the fill, its scoring
    economy, its dead scaffolding — module M-SESS becomes the only
    construction path; TR-08 closed), plus P3-1's dead-scaffolding sweep
    where it touches the fill.
- **Entry gate.** M0 exit (the net exists); M1 landed (rescued cohorts are
  on the D11 path — PR #173); 🔒 1 signed.
- **Exit gate (measurable).** A non-logging intermediate's week 6 ≠ week 5
  in load or reps (G9 closed — audit 10 §6 verbatim); zero cohorts served by
  volume-first selection (G6 closed) with per-cohort acceptance archetypes
  proving improved-or-not-degraded plans; the volume machinery survives only
  as the downstream ledger (Art 6); per-discipline staged rollout complete
  with archetype-scoped, expected-delta-noted re-baselines.
- **Independently shippable value.** The most athlete-visible coaching
  failure at the pin (SR-01 — Art 7's "progressed" clause unmet for the
  majority cohort) is fixed; every athlete progresses; every athlete is
  served by the constitutional selection engine.
- **Rollback.** M2a: staged by discipline — a discipline's rollout reverts
  by its re-baseline commit; freeze-on-start protects committed sessions by
  construction. M2b: the deletion commit is isolated for wholesale
  git-revert inside the cohort-acceptance window (10 §5.6).
- **🔒 Simon decision points.**
  - **🔒 1 · Progression model design + rollout order (coaching
    philosophy)** — the M2a design doc pauses for sign-off before any
    behaviour lands.

## §4 M3 — Measured diagnosis (Wave C)

- **Objective.** Close the *measure* verb: capability measured where the
  athlete gives data, honest confidence everywhere, and the demand
  vocabulary widened so sport-defining qualities survive into diagnosis.
- **Backlog.** P1-1 assessments → capability (per-quality estimators behind
  D1's same interface, staged, confidence-tagged — C8; module M-ATH;
  designed in `03-PERFORMANCE-MODEL.md`) · P1-2 athlete-signal confidence
  made operative (fix the exported confidence at source — TR-13; recency
  gate; trend smoothing; cut magnitude gated by confidence + baseline
  maturity) · P1-7 quality-vocabulary expansion via **AE-1** (Ontology §13
  lane — 00 §4.1; paired rule: measure what you newly diagnose) · P1-9
  silent-list burn-down (Art 15) alongside.
- **Entry gate.** M0 exit; capture surfaces speak Family VIII vocabulary
  (Ontology §10) and follow DAAS §2.1.2 battery mechanics *(designate, in
  review)* — measurement capture is consumed from the data pillar, never
  re-owned (governance audit 09 §5 ordering); 🔒 2 anchors signed
  per quality before that quality's estimator arms.
- **Exit gate (measurable).** **Additive-first proven**: a profile with no
  new data produces a byte-identical plan (golden-enforced); only
  newly-measured cohorts re-baseline; ≥4 of 10 qualities measurable from
  data the app can collect and k>1 priorities for measured athletes
  (G1/G3 closed — audit 10 §6 verbatim); the silent list is empty or
  rendered.
- **Independently shippable value.** Measured athletes get measured
  coaching; unmeasured athletes get honest confidence labels — the
  intake-form-vs-measurement gap (audit 03) closes for everyone who gives
  data.
- **Rollback.** Estimators are per-quality and staged: an ill-calibrated
  estimator is disarmed alone, returning that quality to its prior — the
  additive-first gate guarantees the disarmed state is the pre-M3 baseline.
- **🔒 Simon decision points.**
  - **🔒 2 · Assessment estimator anchors per quality (science)** — per-
    quality sign-off; a quality without signed anchors stays prior-driven.
  - **🔒 3 · Quality-vocabulary expansion (ontology-adjacent)** —
    PART-SETTLED by ratification: the *lane* is settled (additive extension
    via Ontology §13, not an amendment — 00 §4.1 AE-1); the entry list and
    paired measurement knowledge remain Simon's call, proposed by
    `03`/`04`.

## §5 M4 — Validation disposes (Wave D)

- **Objective.** Close the *dispose* verb: Art 19's verb becomes real —
  the suite built out, the report rendered to humans, enforcement promoted
  validator-by-validator up the ladder, and the substitution seam proven by
  a human before any AI uses it.
- **Backlog.** P1-3 validator build-out wave 1 (sport-protection, MEV-floor,
  dose-coherence, progression-sanity, deload-presence — each report-only
  first) + **render the validation report** (zero UI consumers at the pin —
  TR-02) · the conflict-order resolution pass inside D14 as specified in
  02 §3 (C1; module M-VAL) · P2-4 id-level contraindication vocabulary
  (retire the name-regex safety join — TR-10; pulled into this phase, §0.1
  note 4) · P2-3 coach-override v1 through `validateProposal` on one
  decision (D11 session swap — the human proves the AI seam; TR-09) · P2-6
  explainability at prescription (persist selection rationale; render
  `meta.diagnosis`; ship the reserved `explain` call — C6; module M-EXPL,
  designed in `08-EXPLAINABILITY.md`).
- **Entry gate.** M0 exit (the net trusts the goldens) and M3's confidence
  discipline (validators cap verdicts by knowledge confidence — Art 13);
  P2-3's outcome recording needs at least M5's schema direction agreed
  (it writes overrides somewhere durable — sequence its landing with M5
  where needed).
- **Exit gate (measurable).** ≥12 of the EDS §35 validators exist; injury +
  lawfulness classes enforce; the validation report renders (G11 closed —
  audit 10 §6 verbatim); every promotion to gate carries a measured
  false-positive budget from its report-only period; one human override has
  round-tripped the seam (proposed → validated → recorded).
- **Independently shippable value.** Athletes see why their plan was
  trimmed (the report + prescription-time explanations); an independent
  floor exists under construction for the first time; the Team package's
  override seam is live with a human proposer.
- **Rollback.** The ladder is the rollback: any validator demotes
  gate → flag → report by flag flip (10 §5.1); the explain surface is a
  read-model over the trace — disabling it changes no decision.
- **🔒 Simon decision points.** None newly reserved — 🔒 5 (injury-veto
  default) naturally resolves here at the latest, inside the ladder's
  promotion review.

## §6 M5 — Substrate & learning (Wave E)

- **Objective.** Close the *learn* verb on the one substrate that unlocks
  three ambitions: the append-only outcomes/history layer serving D16
  learning, Team trends, coach evidence, and the AI track record at once
  (G13/G18/G21 as one design — audit 08 "reading the table").
- **Backlog.** P1-5 outcomes/history layer + readiness snapshots + bounded
  sync + storage back-pressure (TR-03; module M-HIST — built **against
  DAAS §3's longitudinal-record design and §1.5's dispositions**
  *(designate)*: the latest-only `users.profile` JSONB shape is a recorded
  divergence with a migration obligation, never a standard) · P2-7 D16
  staged→learned promotion policy + honest D7 gating (a schema-default
  prior must not arm a "learned" steer — TR-05's root) · team trend
  surfaces from derived signals only (P3-6 rides P1-5; Art 11) · AIGAS
  go-live order unchanged and outside this set: ratification (landed
  2026-07-13, AQ-8) → per-capability eval harness → deploy → Simon's
  `AI_ENABLED`.
- **Entry gate.** M0 exit; 🔒 6 privacy design signed; DAAS ratified into
  T2 or its §3 shapes explicitly re-confirmed by Simon for early build
  (DEVELOPMENT-PLAN §8 makes DAAS ratification the 3→4 gate; M5 is where
  the dependency bites first).
- **Exit gate (measurable).** Block outcomes persist append-only; at least
  one prior promoted under policy and consumed by a subsequent plan
  (G13 closed — audit 10 §6 verbatim); sync is bounded (no unbounded
  `select('*')` pulls); D7's steer arms only on genuinely learned priors;
  the schema has passed panel review with player_status rigor.
- **Independently shippable value.** The engine starts becoming *this
  athlete's* coach — priors that sharpen with blocks; coaches see evidence,
  not snapshots; the platform's first scaling wall (TR-03's sync half) is
  removed.
- **Rollback.** Append-only + async-readers-only means disabling readers
  restores pre-M5 behaviour without data loss; prior promotions demote by
  policy (10 §5.5).
- **🔒 Simon decision points.**
  - **🔒 6 · Outcomes-layer privacy/de-identification design (Art 11/22)** —
    PART-SETTLED in substrate: the DAAS *(designate)* now carries the record
    design, consent/ownership rights (§3.5), and the derived-only team
    lineage the design must honour; Simon's sign-off on the concrete schema
    + panel review remains open.
  - **🔒 7 · D16 staged→learned promotion policy; D7 gate semantics** —
    the falsifiability read and the twice-gated pattern are Simon's call
    before any prior steers a live plan.

## §7 M6 — Structure & breadth (Wave F)

- **Objective.** Re-seat the structure the earlier phases proved, and widen
  the platform: the allocator monolith split along its ratified boundaries,
  every remaining magnitude onto the governed knowledge surface, the
  strategy/microcycle decisions made real, and the doors to Stage 7 opened.
- **Backlog.** P2-1 allocator re-seat along D11/D12/D13 (10 §2.3; TR-07;
  **byte-identity per extraction**) + constants and sport-fact/cohort sets
  to knowledge/SKB metadata (C3; TR-12) · P2-2 D6 strategy object + D8
  microcycle decision (modules M-STRAT/M-PERIOD; 02 §2.6/§2.8 — the
  prerequisite for endurance programming) · P2-5 age/sex modifier family as
  governed knowledge 🔒 science · P2-8 functional discipline identity 🔒
  philosophy (homed here, §0.1 note 4) · P2-9 wearable adapter interface +
  honest naming (TR-15) · P2-10 knowledge governance completion
  (`validate:knowledge` over sibling tables; structured citations; staleness
  watchdog wired) · P3 polish (P3-1…P3-5 remainder).
- **Entry gate.** M2 exit — **never re-seat and change behaviour at once**
  (10 §1.1 invariant 7): the re-seat starts only after M2's behaviour
  changes have settled into audited baselines. M4's suite provides the
  independent floor under the re-seat.
- **Exit gate (measurable).** `allocator.js` no longer exists as a
  concentration: selection, dose, and structuring live behind M-SESS /
  M-DOSE / M-SCHED contracts with **byte-identical goldens across every
  extraction commit**; zero coaching magnitudes at full authority in code
  (the C3 closure list in `04-KNOWLEDGE-OWNERSHIP-MAP.md` reads empty);
  D6/D8 emit typed decisions consumed downstream.
- **Independently shippable value.** Velocity and safety: construction
  defects stop landing in one file (TR-07); sports scientists review every
  magnitude that steers plans without reading engine code (Art 17); the
  strategy/microcycle objects unlock fixture-congestion coaching for the
  Team package.
- **Rollback.** Byte-identity gating makes every extraction independently
  revertible (10 §5.3); knowledge moves revert by KSV pin (10 §5.4).
- **🔒 Simon decision points.**
  - **🔒 8 · Functional discipline identity; equipment-demotion honesty
    copy (philosophy/product)** — P2-8's call: a real GPP module or an
    honest label; no silent discipline demotion.
  - **🔒 9 · The allocator re-seat itself** — the standing HIGH-risk pause:
    the re-seat plan (extraction order, gate evidence) pauses for Simon
    before the first extraction lands.
  - **🔒 10 · Endurance programming scope trigger (Stage 7)** — Stage-7
    endurance builds on D6/D8 + the vocabulary, explicitly **after the
    learning loop proves the gym product** (audit 10 §3 Wave F); the
    trigger — when to open that scope — is Simon's, taken at M6 exit or
    later, and out of scope for this set beyond naming the seam (spec §8).

---

## §8 Sequencing rules and the decision ledger

### 8.1 The spine (why this order)

Drawn in `12-MODULE-DEPENDENCY-DIAGRAM.md` diagram 2; from audit 10 §4 with
M-numbering applied:

```
M1 (landed baseline)
├─► M0 test net ──────────────┐
├─► M2 progression + retirement ──► M6 re-seat & breadth
├─► M3 measurement ─┐         │
│                   ├─► M4 validation / explainability / overrides
│                   │              │
└───────────────────┘              ▼
                        M5 substrate & learning ──► Team analytics · AI go-live · Stage 7
```

Three rules govern it:

1. **Never re-seat and change behaviour at once** — M2/M3 (behaviour) are
   disjoint from M6 (structure); the byte-identity gate enforces the split
   mechanically (10 §4 R1).
2. **One substrate unlocks three ambitions** — G13 (learning), G18
   (overrides), G21 (data layer) are one design problem solved once at M5,
   under the DAAS's governance, feeding Team analytics, AI go-live, and
   Stage 7 in Phase 4 (audit 08 "reading the table"; DEVELOPMENT-PLAN §7).
3. **The net precedes the change** — M0 gates every behaviour-changing
   phase, and each phase adds the validator that would have caught its own
   defect class (audit 10 §3, continuous rails).

### 8.2 The gate

**No M-phase starts before Simon ratifies this set as the implementation
blueprint (DEVELOPMENT-PLAN §5.3 / §8 gate 2→3).** On ratification, these
phase definitions become final and supersede the audit's DRAFT waves as the
build order; execution status then lives in HANDOFF.md, and this document —
like the spec that produced it — stays an immutable record of the design.

### 8.3 The 🔒 ledger — all ten decision points, placed (audit 10 §5)

| 🔒 | Decision (audit 10 §5) | Phase | Standing |
|---|---|---|---|
| 1 | Progression model design + rollout order (coaching philosophy) | M2 entry | Open |
| 2 | Assessment estimator anchors per quality (science) | M3, per quality | Open |
| 3 | Quality-vocabulary expansion (ontology-adjacent) | M3 (AE-1) | PART-SETTLED — lane ratified 2026-07-13 (Ontology §13; 00 §4.1); entry list open |
| 4 | Rehab content for 5 regions + protect-phase entries (science) | M1 residual (P1-6), any time | Open |
| 5 | Injury-veto promotion from flag to default (safety/product) | M1 residual → M4 ladder at latest | PART-SETTLED — mechanism landed default-OFF (P0-3, PR #173); the flip is open |
| 6 | Outcomes-layer privacy/de-identification design (Art 11/22) | M5 entry | PART-SETTLED — DAAS *(designate)* carries the record/consent design; schema sign-off open |
| 7 | D16 staged→learned promotion policy; D7 gate semantics | M5 | Open |
| 8 | Functional discipline identity; equipment-demotion honesty copy | M6 | Open |
| 9 | The allocator re-seat (standing HIGH-risk pause) | M6 entry | Open |
| 10 | Endurance programming scope trigger (Stage 7) | M6 exit or later | Open |
