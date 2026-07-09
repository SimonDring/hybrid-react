# Decision Engine Review — 2026-07-09

**Status: REVIEW (dated) · governance sprint Phase 2 · main @ KSV 1.30.0.**
Standard applied: would the Head of Performance at an Olympic institute sign the
plans this engine writes? Three independent deep-reads (diagnosis D1–D5;
construction D6–D13; runtime/safety D14–D15) with file:line evidence; the
headline defect (W2) was re-verified at source by the orchestrating reviewer.

---

## 1. Current assessment

**Grade: a genuinely well-architected coaching engine whose *reasoning
scaffolding* is elite-grade, but whose *inputs are thinner than the scaffolding
implies* and whose *safety layer observes more than it enforces.* It reasons
today like a disciplined, evidence-literate junior S&C coach working from an
intake form and a squat number — not yet like an elite coach who has measured
the athlete.**

What the institute would respect immediately:

- **Determinism is real** — zero clock/RNG/I/O across the engine (verified);
  `asOf` threaded, outputs byte-stable, golden-master pinned. This makes every
  other claim auditable.
- **Diagnosis-first is real** — demand (SKB/discipline/goal) × capability →
  gap-ranked limiting factors → priorities → session objectives → selection
  under a fatigue budget → dose by quality. Since 2026-07-07/09 this chain
  steers every cohort; muscle-volume is the downstream MRV guardrail on the
  steered paths.
- **Evidence governs authority by mechanism** — ACWR is floored to a soft input
  *because* its knowledge entry is low-confidence; validator verdicts are
  capped by evidence tier (contested science structurally cannot veto);
  deloads require corroboration (readiness AND recovery), never ACWR alone.
- **Session craft** — order (power→primary→accessory→iso→health), CNS-aware
  superset rules, 3-point spine management (session axial cap, scheduler
  spacing, de-spine pass), plyo foot-contact ceilings + 48–72h spacing,
  taper-vs-deload distinction, endurance press demotion, one honest %1RM load
  model.

## 2. Strengths (consolidated)

| Area | Evidence |
|---|---|
| Purity/determinism enforced, not aspired | boundary + clock tests; zero impurity greps |
| Honest epistemics at the diagnosis seam | factor confidence = capability confidence (the weak link), `diagnose.js` |
| Measured-strength anchoring single-sourced, recency-decayed | `estimation.js` (advanced-band derivation; 30/180-day decay) |
| Subjective ≥ objective is literal code | `recoveryIndex.js` 0.6/0.4 Saw-anchored blend |
| ACWR demotion by mechanism | `load.js` / `trainingLoad.js` authority gating |
| Art-13 verdict capping wired | `validation/contract.js` CEILING map |
| Reflow correctness fixes hold | baseline-identity keep (WP-55), `weekSlotIdx` threading; freeze-on-start epoch guards |
| Red-flag medical triage first | `symptomAssessment.js` neuro/referral short-circuits |
| Learning honestly staged + falsifiable | `blockOutcome.js` corroboration-gated, downward-only, dormant |
| Session construction craft | superset/CNS pairing, spine 3-point system, plyo limits, discipline anchor elevation |

## 3. Weaknesses (ranked by coaching impact)

**W1 — Assessment is largely fictional beyond strength.** Only `maxStrength` is
ever measured; the other 9 qualities are training-age priors. The assessment
fields that exist in the schema (ROM screen, jump, VO2, `1rm_pull`) are
collected and never read. A strong-but-immobile swimmer's mobility flag is
luck, not measurement; the one upper-pull datum is discarded.

**W2 — Olympic classic lifts are mis-dosed (verified defect).** `makeItem`
returns the flat power dose (4×4 @ RPE 7) for any `quality:'power'` exercise
*before* the discipline scheme applies; snatch/C&J days ship as 4×4 and the
olympic `doseCharacter` (1–3 reps, 180s) never reaches the competition lifts.
No elite coach signs a snatch for fours. *(Spun off as a fix task; smallest
highest-impact change in this review.)*

**W3 — The SKB→engine projection silently drops sport-defining qualities.** A
rugby prop loses `neckStrength` and collision robustness in the mapping — the
diagnosis is silent on the two things that keep a prop safe in a scrum. A
swimmer loses `coordination` (tied-highest importance). Defensible as
"gym-addressable subset" — but the drop is silent, not declared.

**W4 — Progression is mostly re-derivation.** Real overload = block volume ramp
+ phase scheme change + e1RM autoregulation *only if the athlete logs, only on
5 tracked lifts*. A non-logging athlete's week-8 loads equal week 1's;
accessories have no double-progression anywhere; week-to-week exercise
rotation is hash jitter, not coached variation; hypertrophy isolation is the
same fixed triple every session with the claimed lengthened-position bias
never applied on that path.

**W5 — The volume-first fill still drives un-modelled sports.** Any sport
outside the 11 modelled (tennis, basketball, combat…) falls to the legacy
deficit-pay-down fill: volume drives selection — Art 6 inverted for exactly
the cohort with least coverage.

**W6 — Safety layer: observes > enforces.**
(a) 5 of 14 injury regions have blocking rules but zero rehab content — a
severity-4 elbow can ship an **empty session** (the validator flags it;
report-only, ships anyway).
(b) D14 is report-only end-to-end — even gate-tier vetoes don't block;
enforcement lives only in-loop + render backstop, and the selection-level
contraindication vote is coarse (majority-of-pattern), so the render backstop
is load-bearing with no defence in depth.
(c) Self-assessed injuries default to severity 3 / `protect` and can never
progress — an athlete is stranded in the most restrictive phase indefinitely.

**W7 — Athlete-signal confidence is decorative.** Readiness confidence is
computed and ignored at the point of use: a new user's single un-baselined bad
morning cuts volume 22% and RPE −1 at full authority. The engine applies
Art-13 discipline to *knowledge* but not to *athlete data*. (Adjacent: the
ACWR cold-start is actually protected — chronic<1 returns null — the known
concern lives in the *readiness* path, not the load path.)

**W8 — No warm-up ramps.** Peak-week near-maximal triples ship with zero
programmed ascent; primers are activation moves, not a load ramp.

**W9 — Structural constants ungoverned.** Session ceiling 75min, 2-primary cap,
per-set minutes, finisher caps, fatigue budgets (self-described "no literature
anchor") live as code literals — exactly what a reviewing coach would want on
the governed knowledge surface.

**W10 — Thin prioritisation + masters/pain blindness.** Priority count
collapses to k=1 via the confidence plumbing (only measured maxStrength can
exceed 'low'); ties break alphabetically; chronological age modulates nothing
(a 55-year-old and 25-year-old with equal training age are identical); active
`currentPain` never reaches the diagnosis (only resolved history does).

## 4. Scientific risks

1. **Seed coefficients steer real plans**: goal/discipline supporting demand
   weights, transfer ratings, fatigue units are coaching judgement wearing
   decimals (flagged `needsReview`, consumed at full authority). The demand
   term is effectively squared in the gap math — undocumented weighting choice.
2. **Single-observation autoregulation** contradicts its own citation (Saw 2016
   supports monitoring vs baseline/trend, not one-day gating) — W7.
3. **Progressive-overload integrity gap**: plans *look* progressive (scheme
   changes) while loads are flat for non-logging athletes — W4.
4. **Coarse muscle model** (lats+traps+rhomboids = "back"; front delts absent)
   means MRV "coverage" can hide specific under-stimulation.
5. **Provenance mis-tags**: nordic-hamstring evidence cited for calf/tibialis
   prevention entries; a stale strengthStandards NOTE describes a divergence
   the code no longer has.
6. **Deload cut-points honest-but-unvalidated** (confidence:low, correctly
   corroboration-gated — the right *shape*, unproven *numbers*).

## 5. Architectural risks

- **allocator.js concentration** (1,243 lines; grew +200 in 3 days) — every
  construction weakness above lands in one file (AR2 in the architecture
  review).
- **Two fill engines coexist** (D11/discipline vs legacy deficit fill) — the
  legacy one is now reachable mainly by un-modelled sports, i.e. the least
  tested path serves the least modelled athletes.
- **Report-only validation** means the EDS's "construction proposes, validation
  disposes" (Art 19) is aspirational in the shipped path.
- **Dormant seams** (D7 steering, staged priors, movementPolicy) are built,
  gated, unexercised — correct today, rot-prone tomorrow (AR5).

## 6. Prioritised improvements

1. **Fix the Olympic dose override (W2).** Smallest change, clearest defect;
   task already spun off. Golden-master: olympic archetypes only.
2. **Close the injury safety edges (W6).** Author the 5 missing rehab regions
   (science-reviewed — Simon); fallback protocol instead of empty sessions;
   promote gate-tier vetoes + "shipped empty" to enforcing; add a rehab-phase
   progression affordance (app-side reassessment nudge).
3. **Make athlete-signal confidence operative (W7).** Gate volume/RPE cuts on
   readiness confidence + baseline maturity; add rolling smoothing to the
   subjective score. (This also resolves the ACWR-adjacent cold-start concern
   already in HANDOFF's open queue.)
4. **Wire existing assessments into capability (W1, W3).** Per-quality measured
   estimators keyed on the assessment fields the schema already declares; score
   `1rm_pull`; emit a `droppedDemands` declaration so out-of-scope qualities
   are honest, not silent.
5. **Real progression (W4).** Accessory double-progression; block-position load
   creep for non-logging athletes; mesocycle-scoped accessory rotation;
   warm-up ramps for RPE≥8 / ≤5-rep work (W8).
6. **Generic athletic-strength path for un-modelled sports (W5)** so adaptation
   precedes dose for every athlete; retire the legacy fill.
7. **Govern the allocator constants (W9)** and split allocator along the
   D11/D12/D13 boundaries the EDS already names (the TD-01 re-seat).

## 7. Migration strategy

Sequence to preserve the engine's own invariants (pure core, golden-master
gated, byte-identical where unintended):

- **Wave A (defect + safety, small diffs):** W2 fix → empty-rehab fallback →
  gate-tier enforcement flag (default on for injury veto only) → confidence
  gating on readiness cuts. Each independently golden-master-audited; W6
  content authoring runs parallel as knowledge changes.
- **Wave B (assessment honesty):** measured estimators per quality (behind the
  existing capability interface — additive, plans unchanged until data exists);
  `droppedDemands` surfacing; currentPain + age modifiers into D4. Re-baseline
  only cohorts with new measurements.
- **Wave C (progression):** dose-layer changes (double-progression, load creep,
  rotation, warm-up ramps) — behaviour-changing for everyone; spec + Simon
  sign-off; per-discipline rollout with archetype-scoped re-baselines.
- **Wave D (structural):** allocator split along D-boundaries + legacy-fill
  retirement + constants → knowledge. Pure refactor gated on byte-identity,
  then the un-modelled-sport path as a deliberate behaviour change.
- Validator catalogue build-out (toward EDS §35's 16) rides alongside every
  wave: each wave adds the validator that would have caught its class of
  defect (sport-protection, MEV floor, progression-sanity, deload-presence).

Every wave: spec → plan → SDD → whole-branch review → Simon merges. Waves B–D
pause points are coaching-philosophy calls per the standing charter.
