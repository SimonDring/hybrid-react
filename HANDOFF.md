# Project Handoff — state of play

_Last updated: 2026-07-02. Keep this current at the end of each work session so the
next session (or a fresh agent) can resume without re-deriving context._

## Governance FROZEN — the five documents are locked at v1.0 (2026-07-01)

The platform's five governing/architecture documents are now **FROZEN** — the authoritative,
locked baseline. All future engineering, coaching, product, and AI work is **validated against**
them; it does **not** modify them. Changing one is a deliberate, versioned **amendment** (per the
Constitution's *Amendment & Stewardship* section), reviewed and reconciled across the whole set —
never an inline edit during feature work.

The frozen set:
1. **Constitution** — `docs/foundation/CONSTITUTION.md` (20 immutable Articles — the tie-breaker)
2. **Decision Ontology** — `docs/foundation/DECISION-ONTOLOGY.md`
3. **Knowledge Architecture** — `docs/foundation/KNOWLEDGE-ARCHITECTURE.md`
4. **Engine Design Specification (EDS)** — `docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md`
5. **Technical Architecture Specification (TAS)** — `docs/architecture/TAS.md`

`CLAUDE.md` carries this as a hard rule. The supporting docs (engine 01–05, foundation
`PANEL-REVIEW.md`, the READMEs) remain **living references** — only the five above are frozen.

## ▶ RESUME HERE — engine-rebuild status & the next step (2026-07-03)

_This section is the authoritative "where we are / what's next". Older "▶ START/NEXT" pointers in
the entries below are historical and superseded by this._

**Where we are (2026-07-03).** The **diagnosis-first engine rebuild has reached the plan.** The
diagnosis now **actually steers live gym plans for run + cycle athletes** — this is no longer a
parallel/additive model. Build and swim stay on the original volume-first planner (byte-identical).
Seven merged PRs on **`main`**:

| PR | Delivered | Live plan change? |
|---|---|---|
| #54 | **Athlete + Performance Model** (Plan 1) — capability per quality + confidence | no (parallel) |
| #55 | **Safety net** (Sprint 0) — fixed golden master + `npm test`; CI test gate | no |
| #56 | **SKB-driven onboarding + demand profile** (Plan 2) | no |
| #57 | **Diagnosis (D4/D5)** — limiting factors + priority qualities | no |
| #58 | **Exercise-quality tagging** (Sprint 5) — every exercise tagged by quality/force-velocity/fatigue-cost | no (the enabler) |
| #59 | **D9/D10** (Sprint 7) — session objective + movement requirements | no (parallel spec) |
| **#60** | **D11 re-seat** (Sprint 8) — **run/cycle selection is now diagnosis-driven** | **YES (run + cycle)** |

Plus **PRs #61–#66** (2026-07-03): **Phase A of the audit backlog** — deploy gated on tests, the
date-flaky test fixed, the engine's three clock leaks closed (Art 18), **Train Now on the D11
brain**, a reflow D11 regression test, and a worktree-resolution guard. Details in the Phase A
entry below; the audit (`docs/architecture/PHASE3-ARCHITECTURAL-AUDIT.md`) is the current backlog —
next band is **Phase B (confidence tiers → deload thresholds → recovery honesty → validator suite)**.

**The reasoning chain, now WIRED into the live plan for run/cycle:**

```
onboarding → Athlete Model (WHO) → Performance Model:
   capabilities × demandProfile → limitingFactors (D4) → priorityAdaptations (D5)   [diagnosis]
     ├─ RUN / CYCLE (LIVE):  D9 session objective → D10 movement requirements
     │     → D11 selectInterventions (value hierarchy §34, transfer-per-fatigue, stop at fatigue budget)
     │     → the generated plan.   Muscle-volume is now the downstream MRV LEDGER, not the driver.
     └─ BUILD / SWIM (legacy):  the original volume-first allocateGym fill — unchanged, byte-identical.
```

The wiring: `generatePlan(profile, opts?)` derives the diagnosis via `performanceModelForProfile(profile,
asOf)` and threads `priorityQualities`/`season`/`skbIds` through `buildWeek` → `allocateGym`; the
PlanService reflow (`gymCtx`) does the same so reflowed run/cycle weeks stay D11-driven. The D11 gate is
`style==='sport' && priorityQualities.length>0 && D11_SPORTS.has(ctx.sport)`, `D11_SPORTS = {run,cycle}`.

**Code map (the new engine layer):**
- **Diagnosis (D1–D5):** `packages/engine/src/lib/athlete/` (schema + justification gate + builder);
  `packages/engine/src/lib/performance/` — `estimation.js` (capabilities), `demandProfile.js`,
  `diagnose.js` (D4), `prioritise.js` (D5), `derivePerformanceModel.js`, **`forProfile.js`
  (`performanceModelForProfile` — derive the diagnosis from a legacy profile; the plan's entry point)**.
- **Session decisions (D9/D10) — Sprint 7:** `packages/engine/src/lib/session/` — `sessionObjective.js`
  (D9: `gymTrainableTargets`, `assignTargetQualities`, `competencyAdjustedTarget`, `deriveSessionObjective`),
  `movementRequirements.js` (D10 + `contraindicatedPatternsFrom`), `sessionSpecs.js` (`deriveSessionSpecs`, `regionOf`).
- **Selection (D11) — Sprint 8:** `packages/engine/src/lib/plan/selectInterventions.js` (value hierarchy,
  transfer-per-fatigue, stopping rule, cap 2/pattern); the `allocateGym` sport branch in
  `plan/allocator.js` (`finaliseSlot` extracted so build stays byte-identical).
- **Knowledge — Sprint 5/7:** `packages/engine/src/data/` — `exerciseQualities.js` (exercise→quality/
  force-velocity/fatigue-cost tags + `FORCE_VELOCITY`), `qualityMovementMap.js` (quality→movement reqs +
  `CARDIO_GYM_SUPPORT`), plus `qualities.js` (with `doseResponse`), `adaptations.js`, `sportEngineBinding.js`,
  `sportQualityMap.js`, `qualityCompatibility.js`, `trainingAgeBands.js`, `capabilityPriors.js`.
- **Adapters:** `packages/engine/src/lib/adapters/profileToAthleteModel.js` (infers the SKB sport id from
  the legacy `sport`+`run_discipline`) + `athleteModelToEngineInput.js`.
- **App side:** `AthleteModelService.js` (persist at `users.profile.athlete_model`), `PlanService.js`
  (`gymCtx` now derives the diagnosis for the reflow), `onboardingModel.js`, `OnboardingWizard.jsx`.
- **Safety net:** `apps/mobile/tests/build-parity.js` (9 build archetypes byte-identical — the gate that
  proves the sport re-seat never touches build); `golden-master.js` (19 archetypes; re-baselined per sprint
  with review via `UPDATE=1`); `d11-runner-quality.js` (proves run/cycle plans improved, not just changed).
- **Tech docs:** `docs/architecture/ATHLETE-MODEL.md` (§5.4 diagnosis, §5.5 exercise tags, §5.6 D9/D10,
  §5.7 D11 re-seat). Specs/plans: `docs/superpowers/{specs,plans}/`.

**⇒ THE NEXT STEP — pick one; each needs its own brainstorm** (start with `superpowers:brainstorming` →
spec → plan → subagent-driven-development, per "How work is run" below). In rough priority:

1. **Swim re-seat** — bring swim into D11 (currently deferred to legacy). This is the highest-value
   correctness gap — see the dedicated **"Swim re-seat — what's required"** section below. Best done
   *after* or *with* Sprint 9 (SKB-primary), because a swimmer's gym plan should be driven by the SKB's
   swim `exerciseLibrary`, not the raw diagnosis.
2. **Blueprint Sprint 9 (W7) — SKB-primary demand + retire the emphasis vectors.** `D2`/`D11` read the
   SKB demand profile + `exerciseLibrary` transfer ratings directly; derive muscle-emphasis from demand;
   retire `lib/sports/*`. One sport model, not two. This also unlocks the swim re-seat.
3. **D12 — dose schemes keyed by quality** (not style). Move the `allocator.js scheme()` rep/RPE/rest
   tables into `knowledge/programming` keyed by the target quality; readiness scales volume AND intensity.
4. **Small follow-ups (quick, low-risk):**
   - ~~Wire D11 into "Train Now"~~ **DONE** (PR #64, Phase A — see the 2026-07-03 Phase A entry below).
   - ~~Reflow-specific D11 regression test~~ **DONE** (PR #65 — `tests/reflow-d11-quality.js`).
   - **Enrich the D4 neutral seams** — `trainability`/`injuryRisk` are still `1.0` in `diagnose.js`
     (= audit WP-36).
   - **NEW FINDING (from PR #65): the reflow collapses D11 day differentiation** — the baseline
     generator alternates a runner's week (Lower vs Lower Explosive pogo/reactive days) but the reflow
     rebuilds each horizon slot independently and every pending day comes out identical (the durability
     list), losing the D9 quality rotation in what the athlete actually sees. Documented as a known gap
     in `tests/reflow-d11-quality.js`; belongs to the WP-24 reflow re-seat (add the ≥2-distinct-days
     assertion when fixed).

**The general lesson from Sprint 8 (carry into every sport re-seat):** the diagnosis→gym-target mapping
breaks when a sport's top limiting factor is **not a gym-trainable strength driver**. Three cases seen,
each with its handling: **cardio** (aerobic/anaerobic → gym-support qualities via `CARDIO_GYM_SUPPORT`);
**mobility/stability** (→ `robustness`, since a "mobility session" is no stimulus); **power for a
beginner** (→ the `maxStrength` prerequisite, since power exercises are competency-gated). Run/cycle work
cleanly because durability/power **is** their gym need. Swim does not (see below).

### Swim re-seat — what's required to bring it to standard

**Why it's deferred.** When swim was wired into D11 (Sprint 8), every swim session collapsed to
posterior-chain hinges (RDL/deadlift/glute), undifferentiated (all "Lower"), under-dosed (~63% of the old
volume), with **no pressing or pulling** — clearly worse than the swimmer's current legacy plan. So swim
is excluded from `D11_SPORTS` and keeps the legacy volume-first fill (which gives it a proper upper/lower
split with rows, pulls, and pressing).

**Root cause.** A swimmer is **not strength-limited** — they're relatively strong for their needs. So
the diagnosis (D4/D5) correctly names their biggest demand−capability gap as **`mobility`** (shoulder/
thoracic ROM), with tiny strength gaps (`explosiveStrength 0.14`, `maxStrength 0.06`). D9's stopgap
translates `mobility → robustness`, and D11 then fills the session with the highest-value **robustness**
compounds — which are hinges. Those hinges eat the fatigue budget before the **swim-specific upper-pull
work** (tier-4 sport accessories: rows, lat pulldown, face pulls, shoulder ER) gets a look-in. The
model assumes *gym target = the top trainable limiting factor*; for an athlete whose limiter isn't a gym
strength quality, that assumption fails.

**What "the required standard" is** — a good swimmer gym session (per the SKB `swimming.json`
`gymPhilosophy`/`exerciseLibrary`): **strength for economy without added mass** + **upper-body PULL
strength** (lats/mid-back — the propulsive musculature) + **shoulder stability & rotator-cuff / scapular
health** (swimmers' #1 injury site) + **core anti-rotation** + **posterior-chain durability**. Differentiated
across days, not all-hinge; a real dose, not 63%.

**The fixes required (do these, roughly in order):**
1. **Drive the swim gym target from the sport's PRESCRIBED gym focus, not the raw diagnosis gap.** The
   SKB `swimming.json` already encodes this: its `exerciseLibrary.categories` are the tiers a swimmer's
   session should cover (posterior chain, strength-for-economy, plyometric/reactive, single-leg, calf/
   Achilles/prehab, **shoulder/scapular prehab**, **upper-pull**, core anti-rotation/anti-extension), and
   `gymPhilosophy` says *what transfers*. **This is exactly what Blueprint Sprint 9 (SKB-primary) delivers:**
   D11 selects candidates from the sport's `exerciseLibrary` (via `SKB.section(id,'exerciseLibrary')`),
   tier-mapped from its `categories`, instead of from the raw quality target. Once D11 reads the swim
   library, a swimmer gets rows + pulldowns + shoulder ER + Pallof + a durability compound — the right
   session. **So the cleanest path is: do Sprint 9 first, then add `'swim'` to `D11_SPORTS`.**
2. **If done before Sprint 9 (interim):** add a swim-appropriate gym-target in `sessionObjective.js` — a
   sport→gym-driver map so swim's target resolves to **upper-pull strength + shoulder stability**, applied
   to UPPER patterns (`hpull`/`vpull`/`vpush` + `iso` shoulder), and **boost the tier-4 sport-accessory
   value** in `selectInterventions.js` so the swim-tagged rows/pulls/ER work isn't crowded out by lower-
   body compounds. Also ensure the week is **differentiated** (not every day the same target) and not
   under-dosed (raise the fatigue budget for a maintenance-style sport, or don't stop so early).
3. **Confirm the swimmer's diagnosis is sane first.** Re-run the probe (below) and check whether the swim
   `demandProfile`/`limitingFactors` reasonably reflect a swimmer (upper-pull + shoulder should rank as
   real needs). If the SKB→PM quality mapping (`sportQualityMap.js`) is dropping the swimmer's upper-pull
   signal, fix that mapping too — the PM's fixed-10 vocabulary has no "upper-pull" quality, so swim's
   pull need currently shows up only as generic `maxStrength`/`hypertrophy`, which the diagnosis scores as
   already-met. This vocabulary gap is the deep reason swim needs the SKB `exerciseLibrary` (movement-
   specific), not just the quality diagnosis.

**How to validate the swim re-seat:**
- Probe: `node --input-type=module -e "import { BLANK_ANSWERS, answersToProfile } from './apps/mobile/src/lib/onboardingModel.js'; import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js'; const p=generatePlan(answersToProfile({...BLANK_ANSWERS,goalType:'sport',sport:'swim',experienceLevel:'intermediate',daysPerWeek:4,days:['mon','tue','thu','fri'],strengthAccess:'full_gym'})); console.log(p.phases[0].weeks[0].sessions.map(s=>(s.items||[]).map(i=>i.name).join(', ')));"`
  — a good result shows **upper-pull + shoulder work across differentiated days**, not all-hinge.
- Add a `d11-swim-quality.js` test (mirror `d11-runner-quality.js`): assert the plan includes upper-pull
  (row/pulldown), shoulder health (external rotation / face pull / scapular), and core anti-rotation;
  assert it is NOT posterior-chain-only and NOT under-dosed; assert days are differentiated.
- The swim golden-master archetypes (`sport·swim·intermediate·off·3d`, `sport·swim·advanced·in·3d`) will
  change → re-baseline deliberately with review (only swim keys should move; `build-parity` must stay green).

**How work is run here (follow this):** `superpowers:brainstorming` → design spec in
`docs/superpowers/specs/YYYY-MM-DD-*.md` (commit) → `superpowers:writing-plans` (plan in
`docs/superpowers/plans/`) → `superpowers:subagent-driven-development` (fresh implementer + task
reviewer per task; SDD ledger at `.git/sdd/progress.md`, NOT committed) → opus whole-branch review →
PR → **confirm before merging** (merges deploy + are consequential). Tests: **`npm test` now works**
(runs every `apps/mobile/tests/*.js` via `apps/mobile/tests/run-all.mjs`; CI-gated by
`.github/workflows/test.yml`); the golden master is order-insensitive (`UPDATE=1` only for intended
changes). Browser-verify UI via the preview MCP (onboarding is behind auth — drive the wired service
via `preview_eval` importing `/hybrid-react/src/lib/AthleteModelService.js`, as prior sessions did).

**Invariants / decisions to carry forward:** the re-seat is now LIVE for run/cycle, so the invariant is
**"build + swim byte-identical, sport re-seated deliberately"** — `build-parity.js` gates build byte-for-
byte, and the golden master is **re-baselined per sprint with review** (`UPDATE=1`; confirm only the
intended sport archetypes moved, no build). `generatePlan` stays **pure/deterministic** — the diagnosis
`asOf` comes from `profile.plan_start_date`, never the clock. Muscle-volume is the downstream **MRV
ledger** (`VOLUME_LANDMARKS`), no longer the selection driver, for run/cycle. Backward-compat via
`meta.enginePassthrough`; the **SKB is the
source of truth** for selectable sports (GAA/hurling/triathlon are now selectable; authoring a flagship
profile + a `sportEngineBinding` entry auto-adds a sport); `trainability`/`injuryRisk` in D4 are
**neutral seams (=1.0)** ready to enrich (injury-risk from the injury system; trainability from the
quality registry); build-goal diagnosis is empty (goal-as-sport demand profiles are future); the
Performance-Model quality vocabulary is a fixed 10 (`maxStrength, hypertrophy, explosiveStrength,
reactiveStrength, strengthEndurance, aerobicCapacity, anaerobicCapacity, mobility, stability,
robustness`); **raw vitals never enter the model** (Constitution Art 11 — `daily_metrics` stays
owner-only). Deferred cosmetic minors (non-blocking): a `diagnose.js` comment overstatement; the
`prioritise.js` unknown-confidence→k=1 fallback is undocumented; `selectable.js` sport labels use
`humanize(id)` (e.g. "Running Sprint") since flagship `meta` has no display label.

## Latest work — Phase B (honesty band) begun: WP-08/09/10 + the reflow differentiation fix + WP-07 (2026-07-04)

Continuous-iteration mode (Simon's standing charter 2026-07-03): merges of green low/medium-risk
PRs are autonomous; HIGH-risk re-seats still pause for review. Suite now **123/123**.

- **PR #67 — reflow D11 day differentiation fix.** The reflow rebuilt one slot per allocateGym
  call, so the D9 quality rotation restarted at 0 and a runner's reflowed week collapsed to the
  durability day (explosive/pogo days vanished). Fixed by threading each slot's baseline identity
  (`ctx.weekGymCount` + `ctx.weekSlotIdx`) — same mechanism as the `resolveSplit[s.i]` share.
  `reflow-d11-quality.js` now ENFORCES differentiation + baseline objective parity. No re-baseline.
- **PR #68 — WP-07 migration discipline** (agent-built): migrations ledger
  (`supabase/migrations/README.md`, keep-names/document-forward convention), schema.sql reconciled
  with all 16 migrations (8 gaps fixed: wearable_connections, workouts, both RPCs, HR columns,
  CHECKs, avatar policies, injury triage fields, NOT NULLs), `apps/mobile/.env.local.example`.
  **Staging-project TODO for Simon** in the runbook (7 steps, needs his Supabase account).
- **PR #69 — WP-08 confidence authority tiers (Art 13 operative).** `knowledge/authority.js`:
  `authorityOf(entry) → gate|soft|reported` from KB confidence via the governed mapping entry
  `knowledge.authority.mapping`. ACWR demotion now derived (load.js floor;
  deloadRecommendation corroboration), not hardwired. Behaviour identical.
- **PR #70 — WP-09 deload/recovery cut-points → KB.** `recovery.bands` /
  `recovery.volume_modifiers` / `recovery.deload_thresholds` (honest L5-low tags); PlanService
  memo-key band reads the same entry. Boundary-exact pins in `kb-recovery-thresholds.js`.
- **PR #71 — WP-10 recovery honesty (FIRST deliberate behaviour change; spec:
  `docs/superpowers/specs/2026-07-04-recovery-honesty-design.md`).** Low readiness → target RPE −1
  (floor 5), suggested kg follow via the inverse-Epley coupling in applyWeights (allocator
  `shiftRpe` in finaliseSlot, ctx.rpeOffset — pure generator passes none ⇒ byte-identical);
  travel 'easy' = shorter (KB volumeCap 0.7) AND lighter (RPE −1), offsets take the min; Train
  Now inherits the offset; eased weeks carry `_intensityEased` (surfacing = WP-30). Knowledge:
  `recovery.intensity_policy` (L4 moderate → authority 'soft'), `recovery.travel_policy`.
  **Stale audit claim found:** subjective ≥ objective already held (0.6/0.4 Saw blend) — pinned.
- **⇒ NEXT: WP-11/12 validator suite** (Art 19 — the largest structural conflict): `validation/`
  scaffold + contract `{verdict: pass|trim|veto, reason, confidence, authority}` + runner +
  ValidationReport; MRV ceiling as the first named GATE validator (in-loop cap stays for
  efficiency, validator authoritative — assert zero residual violations); then duration/equipment/
  purpose/injury validators + the six-tier conflict order (WP-12); then WP-13 constraints-first
  injuries. After the band: H9 seed-evidence pass, then Sprint 9 (SKB-primary, HIGH-risk — pause
  for Simon's review before flipping).

## Latest work — Phase A of the audit backlog: hygiene & safety, WP-01…WP-06 (2026-07-03)

Six small, independent PRs (**#61–#66**, all merged to `main`) executing Phase A of the Phase 3
audit's backlog (`docs/architecture/PHASE3-ARCHITECTURAL-AUDIT.md` §8). Suite now **120/120**
(three new test files). WP-07 (migration discipline + staging) is the one Phase A item left —
repo-side work queued as a task chip; the staging Supabase project needs Simon's account.

- **#61 WP-01** — `deploy.yml` gains a `test` job that `build` needs: a red suite can no longer
  reach GitHub Pages (V15's cheapest fix).
- **#62 WP-02** — `reflow-start-consistency.js` de-flaked: fixed-clock Date shim (`FAKE_TODAY`
  override) + the candidate scan widened to the whole plan (a Sunday plan-start left week 1's gym
  days all in the past — the real weekday flake). Proven green on all 7 weekdays.
- **#63 WP-03 (V4)** — the three determinism clock leaks closed: race-taper anchor
  (`PlanGenerator.js`), `deriveSeason` (now measures the event window from `asOf` =
  `plan_start_date`), `continueBlock` (caller supplies `todayISO`; the engine THROWS rather than
  read the clock — BlockCheckin.jsx passes it). New `tests/determinism-clock.js` pins byte-identical
  plans across mocked clock days months apart, dated AND undated profiles. Golden master untouched.
  Undated profiles (synthetic/dev only — onboarding always sets a start date) now deterministically
  get no race taper / intent-derived season instead of clock-derived.
- **#64 WP-04 (A5)** — **Train Now is on the D11 brain**: `generateTrainNow`'s ctx carries
  `sport/power/priorityQualities/season/skbIds` like `gymCtx`. Runner's on-demand session = hinge/
  durability work, no chest flyes. Build byte-identical at the allocator (pinned by
  `tests/train-now-d11.js`); swim probed byte-identical.
- **#65 WP-05** — `tests/reflow-d11-quality.js`: run profile through the real read path
  (`getPhases()` → reflow) asserts D11 content idle + mid-week. Surfaced the reflow
  day-differentiation collapse (see the finding in the follow-ups list above).
- **#66 WP-06** — `packages/engine` gets `npm test`; `run-all.mjs` guards that
  `@performance-os/engine` resolves INSIDE the current checkout and fails with instructions
  otherwise (the recorded worktree trap, now automated).

## Latest work — Sprint 8: D11 intervention-selection re-seat (run + cycle) (2026-07-03)

On branch **`feat/d11-intervention-selection`**. The FIRST sprint where live plans change: for **run and
cycle**, exercise selection is now diagnosis-driven (D11 value-hierarchy, transfer-per-fatigue, stop at
the fatigue budget) instead of muscle-deficit fill. **Build and swim are byte-identical** (build-parity
gate; swim deferred to the legacy path). Design/plan: `docs/superpowers/{specs,plans}/2026-07-03-d11-intervention-selection*`.

- **New** `plan/selectInterventions.js` (D11, EDS §34, cap 2/pattern), `performance/forProfile.js`
  (`performanceModelForProfile` — diagnosis from a legacy profile), wired through `generatePlan` +
  the PlanService reflow. Muscle-volume is now the in-loop MRV ledger, not the driver.
- **Fixes surfaced by the re-seat:** mobility/stability → robustness (session-support, not drivers);
  beginners targeting power build the max-strength base first (`competencyAdjustedTarget`).
- **Safety:** `build-parity.js` proves build byte-identical; sport golden master re-baselined (only
  run/cycle changed); `d11-runner-quality.js` proves the change is an improvement. Full suite 117/117.
- **Deferred / near-term follow-ups:** (1) re-seat **swim** once the model surfaces its upper-pull/
  shoulder need (its diagnosis currently points to mobility→robustness, wrong for a swimmer); (2) wire
  D11 into on-demand **"Train Now"** (`generateTrainNow` still uses the legacy fill for run/cycle);
  (3) add a reflow-specific D11 regression test; (4) **D12** dose schemes keyed by quality; (5) the
  MRV→validator extraction; (6) SKB-primary selection (Sprint 9).

## Latest work — Sprint 7: session objective (D9) + movement requirements (D10) (2026-07-02)

On branch **`feat/session-decisions-d9-d10`**. The diagnosis→plan chain gains its next two decisions,
as PARALLEL model output (nothing in `generatePlan` reads it; both golden masters byte-identical).
Design/plan: `docs/superpowers/{specs,plans}/2026-07-02-session-objective-movement-requirements*`.

- **New `packages/engine/src/lib/session/`** — `deriveSessionSpecs` (barrel) computes per session a D9
  objective (purpose + target quality + intensity zone + fatigue budget) and D10 movement requirements
  (patterns + force-velocity + contraction), driven by the diagnosis.
- **New `packages/engine/src/data/qualityMovementMap.js`** — the quality→movement knowledge + the
  cardio→gym-support translation (`aerobicCapacity → robustness + reactiveStrength`).
- **Contraindications up front** (L8): `contraindicatedPatternsFrom` maps injury name-regexes onto
  movement patterns; a novice's high-skill force-velocity is downgraded to a strength base (L4).
- **Validated by the EDS §22 archetypes**: in-season runner vs novice sprinter come out categorically
  different (disjoint targets). Read-only `/dev` "SESSION DECISIONS" panel shows the output.
- **PARALLEL** — full `npm test` green; both golden masters byte-identical (no `UPDATE=1`). Frozen set untouched.
- **Next:** Blueprint **Sprint 8 (D11)** — re-seat the allocator to select exercises that satisfy these
  requirements (the first sprint where live plans change).

## Latest work — Sprint 5: exercise-quality tagging (the re-seat enabler) (2026-07-02)

On branch **`feat/exercise-quality-tags`**. The on-path enabler for the diagnosis→plan re-seating
(Blueprint **Sprint 5 / Wave W5**): the exercise catalogue is now tagged by the physical
quality/adaptation it develops, its force-velocity profile, and its fatigue cost — the bridge the
diagnosis (which speaks in qualities) needs before it can steer exercise selection (the allocator
picks by muscle). Design/plan: `docs/superpowers/{specs,plans}/2026-07-02-exercise-quality-tagging-*`.

- **New `packages/engine/src/data/exerciseQualities.js`** — `exerciseQualities(id)` (also on the
  barrel) tags all 118 exercises via CLASS rules → PATTERN defaults → per-exercise OVERRIDES
  (mirrors `exerciseSimilarity.js`). Honest seed evidence (`confidence` + `needsReview:true`).
- **`qualities.js`** — every quality gained a `doseResponse` (no label without a dose + assessment).
- **Read-only `/dev` readout** shows each exercise's quality tags; the plan itself is unchanged.
- **PARALLEL — nothing in `generatePlan` reads it.** Both golden masters stay byte-identical green
  (verified: full `npm test` green, no `UPDATE=1`). Frozen governance set untouched.
- **Next:** Blueprint **Sprint 7 (D9/D10)** — session objective + movement requirements — then
  **Sprint 8 (D11)** re-seats the allocator's `bestExercise` to select by these qualities.

## Latest work — Diagnosis layer: D4 limiting factors + D5 priority qualities (2026-07-02)

On branch **`feat/diagnosis-d4-d5`**. The Performance Model now *diagnoses* — it doesn't just hold
capability and demand, it compares them. Design spec:
`docs/superpowers/specs/2026-07-02-diagnosis-d4-d5-design.md`. Tech doc updated:
`docs/architecture/ATHLETE-MODEL.md` §5.4/§12.

- **D4 — `diagnoseLimitingFactors`** (`packages/engine/src/lib/performance/diagnose.js`): ranks the
  gap between sport/position demand and athlete capability per quality
  (`magnitude = max(0, demandImportance − capabilityLevel) × demandImportance`, `trainability`/
  `injuryRisk` neutral seams at `1.0`), confidence = the weakest input (the capability estimate),
  with a plain-English rationale. A sport athlete always gets a full diagnosis (every demanded
  quality ranked, including met demands at zero magnitude); a non-sport model gets `[]`.
- **D5 — `prioritiseQualities`** (`packages/engine/src/lib/performance/prioritise.js` +
  `packages/engine/src/data/qualityCompatibility.js`): selects a confidence-scaled set (`k`: low→1,
  moderate→2, high→3) of positive-magnitude priority qualities, each traced back to its limiter and
  mapped to the quality registry's developing `adaptations[]`, respecting a compatibility guard
  (defers a candidate that conflicts with an already-selected higher priority — seeded with
  `maxStrength` × `aerobicCapacity`).
- **`derivePerformanceModel` now populates both fields** purely from capability × demand — no clock,
  no plan change. **The live plan is unchanged**: nothing downstream reads the diagnosis yet, and
  the golden master stays green.
- **Next:** steer the plan from the diagnosis (the diagnosis→plan re-seating).

## Latest work — Sprint 3 Plan 2: SKB-driven onboarding + demand-profile wiring (2026-07-02)

On branch **`feat/plan2-onboarding-skb`**. Wires the (previously dormant) Sport Knowledge Base into
onboarding and into the Performance Model's `demandProfile`, and revises the onboarding question set
per the Plan 1 "NOT yet built" note. Design spec: `docs/superpowers/specs/2026-07-02-plan2-onboarding-skb-design.md`.
Tech doc updated: `docs/architecture/ATHLETE-MODEL.md` §5.2/§5.3/§12.

- **SKB-driven sport selection.** `selectableSports()` (`packages/engine/src/lib/sportKnowledge/selectable.js`)
  derives the onboarding sport list from the SKB itself — completeness-gated (`SKB.completeness(id).complete`)
  **and** has an engine binding (`bindingFor(id)`, `packages/engine/src/data/sportEngineBinding.js`,
  new `SKB_ENGINE_BINDING` table mapping SKB sport ids to the legacy engine sport module + discipline).
  `positionsFor(skbId)` feeds a new onboarding position step. Authoring a new flagship SKB profile +
  one binding entry is now enough to make a sport selectable — no wizard change needed.
- **`demandProfile` is live.** `derivePerformanceModel` now calls `buildDemandProfile(sportId,
  positionId)` (`packages/engine/src/lib/performance/demandProfile.js`): base importance per
  Performance-Model quality from the SKB's `physicalProfile.qualities` (mapped through
  `sportQualityMap.js`'s `SKB_TO_PM_QUALITY` table), boosted to a 0.9 floor for the chosen position's
  `primaryQualities`. SKB qualities with no PM home yet (`sprintSpeed`, `acceleration`,
  `changeOfDirection`, `gripStrength`, etc.) are documented and dropped, not approximated.
- **Legacy round-trip preserved.** `profileToAthleteModel`/`athleteModelToEngineInput` now carry the
  SKB sport id on `sportingContext.primarySport`, while the exact legacy `sport`/`run_discipline`
  travel in `meta.enginePassthrough` and win on read-back — **the live plan generator output is
  unchanged** (golden master + the athlete-adapter golden master both green).
- **Onboarding UI:** `OnboardingWizard.jsx` gained SKB-driven sport + position steps, plus new
  session-duration, training-age, and movement-competency steps feeding `onboardingModel.js`'s
  backward-compatible `answersToProfilePatch` bridge and `answersToAthleteModelInputs` overlay.
- **Tests (all new, all green):** `sport-engine-binding.js`, `skb-selectable.js`, `sport-quality-map.js`,
  `demand-profile.js`, `performance-demand.js`, `adapter-sport-position.js`, `answers-athlete-rich.js` —
  plus the unchanged `golden-master.js` and `athlete-adapter-golden-master.js`, both still green.
- **Frozen docs untouched** (verified: zero diff to `docs/foundation/`, the EDS, and the TAS).
- **Not done here (deliberately out of scope):** no diagnosis step — `demandProfile` is modelled but
  does not yet change what the plan generator produces (nothing compares demand against capability
  yet). **Next:** the diagnosis engine — couple demand × capability into limiting factors / priority
  adaptations, per the Migration Blueprint's re-seating path.

## Latest work — Sprint 0: engine test safety net + CI gate (2026-07-02)

Merged (**PR #55**, branch `chore/sprint0-safety-net`). The blueprint's "Sprint 0 — safety net & CI
gate", done between Plan 1 and Plan 2 because the test protection was broken.

- **`npm test` was pointing at a non-existent `apps/mobile/tests/data-layer.js`** → it failed instantly
  and the ~90-file node suite never ran in CI. Fixed: `apps/mobile/tests/run-all.mjs` runs every
  `tests/*.js` and fails (exit 1) on any non-zero exit; `apps/mobile/package.json`'s `test` script points
  at it (root `npm test` delegates).
- **The golden master had drifted far** (its snapshot was last regenerated at `49f9263`, before a large
  body of intentional merged engine work). Root cause: the broken `npm test` meant nobody re-ran it. Made
  the comparison **order-insensitive** (`stableStringify` — recursive key-sort) so refactors that only
  reorder keys no longer produce false drift, then re-baselined the snapshot to current shipped behaviour
  (validated by the other ~97 green tests). Future diffs are now minimal/reviewable.
- **CI gate:** `.github/workflows/test.yml` runs `npm ci` + `npm test` on push to `main` and every PR.
- Verified non-vacuous (perturbing a snapshot value fails the gate). No engine behaviour changed.

## Latest work — Sprint 3 Plan 1: Athlete & Performance Model foundation (2026-07-02)

On branch **`feat/athlete-model-sprint3`**. The first **code** of the engine re-seating: a pure
**Athlete Model** (who the athlete is) + a derived **Performance Model** (capability per physical
quality, with confidence) in `packages/engine`, an app-side service, and tested adapters. Built
subagent-driven (SDD ledger at `.git/sdd/progress.md`), TDD per task, every task reviewed. Full
tech doc: **`docs/architecture/ATHLETE-MODEL.md`**; design spec + plan under `docs/superpowers/`.

- **Two pure domains** (`packages/engine/src/lib/`): `athlete/` (schema + defaults, a
  **field-registry justification gate** where a test fails if any stored field lacks a documented
  "why + which D1–D16 decision it serves", validation, pure builder) and `performance/`
  (`estimateCapability` measured-vs-inferred + confidence, `derivePerformanceModel`). Seed
  **knowledge** in `packages/engine/src/data/`: 10 physical qualities + adaptations, training-age
  bands, population capability priors. All pure/deterministic (injected `asOf`; no clock/random).
- **Adapters + the safety net.** `profileToAthleteModel` (legacy `users.profile` → model) and
  `athleteModelToEngineInput` (model → the engine's read-set). `apps/mobile/tests/athlete-adapter-golden-master.js`
  proves **10 archetypes are byte-identical** — a plan generated by driving the engine through the
  model equals the legacy plan (verified non-vacuous: perturbing `strength_style`/`experience` makes
  them differ). This is how "existing functionality remains operational" is *demonstrated*.
- **App side.** `apps/mobile/src/lib/AthleteModelService.js` — build / persist (**versioned
  `users.profile.athlete_model`** via SyncService, offline-first) / load / `upgradeAthleteModel` /
  lazy-derive for existing users. `onboardingModel.js` gained `answersToAthleteModelInputs`;
  `Onboarding.jsx` **dual-writes** the model alongside the legacy profile (non-blocking). Browser-
  verified: onboarding persists `profile.athlete_model` (schemaVersion 1) and it reloads.
- **Parallel, not live.** The live plan generator is **untouched** — it still consumes the legacy
  profile; the adapter is proven by tests but not in the hot path (spec's "parallel, proven by
  tests"). No programme logic rewritten; the `athlete_model` is a JSONB sub-object (no new table, no
  DDL — `supabase/migrations/20260701_athlete_model.sql` is a documented no-op). Raw vitals are
  **never** copied into the model (Article 11) — it references `daily_metrics`, owner-only.
- **Tests:** `node apps/mobile/tests/athlete-*.js` + `performance-model.js` + `adapter-*.js` +
  `answers-to-athlete-model.js` (all green). **Frozen docs untouched** (verified: zero diff to the
  five governing docs). **Next — Plan 2:** revise the onboarding *question set* (outcome-based
  multi-goal, measurable training age, session duration, movement competency) feeding the model.
- **Pre-existing issue surfaced (NOT this sprint):** the engine golden-master
  (`apps/mobile/tests/golden-master.js`) drifts 19 archetypes (`restSec` 75→90) on `main` — snapshot
  stale since `49f9263`, allocator changed after, and the broken `npm test` never ran it. Exactly the
  blueprint's "Sprint 0 — safety net & CI gate" work; flagged as a follow-up, not touched here.

## Latest work — Sprints 1 & 2: Baseline Assessment + Migration Blueprint (2026-07-01)

Two new **planning documents** in `docs/architecture/` (NOT frozen — the *living rebuild plan*,
derived from and validated against the frozen governing set). They turn "the engine is mid-migration"
into a precise, executable programme.

- **Sprint 1 → `docs/architecture/BASELINE-ARCHITECTURE-ASSESSMENT.md`** — a 25-section
  **observational** baseline (no code changed): what exists today, how coaching decisions are
  actually made (a full decision catalogue), where knowledge lives, the data flow, alignment vs
  each frozen doc, technical debt, and what to preserve / replace / remove. Headline: the engine is
  an **excellent VOLUME-FIRST gym planner** whose central shape is exactly what the Constitution's
  Articles 4/5/6 name as their "Violated" examples — the gap is **orientation, not quality**.
- **Sprint 2 → `docs/architecture/MIGRATION-BLUEPRINT.md`** — the master **rebuild plan** (10 parts):
  the future decision chain (diagnosis as the pivot; adaptation chosen before exercise); the
  **D1–D16 decision catalogue** with contracts; decision-ownership (the anti-hard-coding rules); a
  current→future mapping (Retain/Refactor/Replace/Remove per component); the knowledge-migration plan
  (code → the 12 domains); the target module map (**one engine, not many**); the migration
  **waves W0–W11**; an executable **Sprint 0–12 backlog**; a traceability matrix; and a six-lens
  critical review.

**The rebuild is a RE-SEATING, not a rewrite** (EDS §18): keep the pure/deterministic engine +
golden-master (G1), the injury subsystem (G3), the SKB schema (G5), freeze-on-commit (G6), and
privacy-by-validation (G8); change the *primitive* (physical qualities/adaptations, not per-muscle
volume) and the *order* (diagnose → prioritise → dose → validate); wire the dormant SKB. **W0–W4
ship value and are independent of the risky re-seating (W5–W9)** — the platform improves continuously.

### ▶ START SPRINT 3 HERE — "Sprint 0: Safety net & CI gate" (Blueprint Part 8)

The very first execution step, because there is currently **no automated test protection**:
1. **Fix `npm test`** — it points at a non-existent `apps/mobile/tests/data-layer.js` and fails
   immediately. The real 84-file engine suite only runs via the manual `node tests/*.js` glob.
2. **Add a CI test gate** — neither `.github/workflows/deploy.yml` (build-only) nor `web-ci.yml`
   runs the engine suite or the golden-master. Add a job that runs both on PR + push to `main`.
3. **Lock the golden-master** (`apps/mobile/tests/golden-master.js`, 19-archetype byte-identical
   snapshot) as the safety net every later wave depends on; document the `UPDATE=1` workflow.

Then proceed to Blueprint **Sprint 1 (confidence operative)** → **Sprint 2 (recovery honest)** →
**Sprint 3 (validator suite)** → **Sprint 4 (constraints-first)** — all independent of the re-seating.
Read `MIGRATION-BLUEPRINT.md` **Part 8** for each sprint's full objective / scope / validation /
success, and **Part 7** for how the waves sequence. Validate every step against the frozen set.

- **Docs-only; no code changed; no frozen document was modified** (verified: zero diff to the frozen
  set). The two new docs are living planning artefacts, not part of the frozen v1.0 set.

## Latest work — foundation governing framework (`docs/foundation/`) (2026-06-30)

Merged to **`main`** (PR #49, merge commit `7166bd3`). Added a new **platform-level
governing framework** that sits *above* the engine-scoped EDS — the layer every future
engineering, coaching, product, and AI decision is validated against **before** building.
Full index + governance stack: `docs/foundation/README.md`.

- **`CONSTITUTION.md`** — 20 immutable Articles (5 Titles), the conflict-resolution order,
  an amendment process, and a mapping table that **subsumes the EDS's Core Philosophy (§2),
  First Principles (P1–P15), and Engine Laws (L1–L15)** (nothing orphaned — Appendix A).
- **`DECISION-ONTOLOGY.md`** — the canonical vocabulary: ~40 entities in 7 families; the
  **three orthogonal structures** (Reasoning Spine · Containment Hierarchy · Diagnostic
  Triangle); reinstates **Performance Outcome**, makes **Fatigue** + **Override** first-class,
  and adds the **Organisation/Team/Coach/Position** entities the EDS left implicit.
- **`KNOWLEDGE-ARCHITECTURE.md`** — the **8-kind data taxonomy** (Knowledge / Decision Logic /
  Inference / Calculation / Stored / Derived / Assumption / Prediction) + 12 governed knowledge
  domains, grounded in the real SKB / evidence-KB / index schemas.
- **`PANEL-REVIEW.md`** — six-lens expert critique with revisions folded back; **`README.md`** —
  index, reading order, governance stack.
- **Reconciliation:** the EDS no longer calls *itself* "the constitution"; its §2/P/L are now
  derivations of the Constitution's Articles (pointers + Appendix A mapping). `docs/engine/README.md`
  and `CLAUDE.md` updated so the new layer is discoverable.
- **Additive / docs-only** — no engine code changed; nothing consumes these yet. They are
  **foundational** (the target), not running status. **Next:** check in-flight engine work (SKB
  wiring; the orchestrator/evidence-architecture refactor) against the Constitution + Ontology
  before extending it.

## Latest work — SKB: triathlon authored to flagship depth (2026-06-30)

New profile `packages/engine/src/data/sport-knowledge/triathlon.json`, authored from
scratch to **flagship depth** (all 21 sections, scores 1.00 completeness), modelled on
`swimming.json` as a **single unified profile** with distance archetypes (Sprint /
Olympic / 70.3 / Ironman / draft-legal) in `positions`.

- **Sport-specific shape:** the **run is the binding constraint** (highest-injury
  discipline — `durability` weighted 9, lower-limb soreness is the top readiness factor,
  load rules cap **run** load specifically); the **run-off-the-bike "brick"** is the
  signature quality (own assessment + `brick_decoupling` KPI); strength is for
  **economy + durability without added mass**, sequenced away from key endurance sessions
  (concurrent-training interference — Rønnestad & Mujika 2014; Fyfe 2014); `singleLegEmphasis`
  HIGH (running is single-leg); **RED-S / energy availability** built in as the
  highest-severity risk (decision rule + readiness factor + assessment + status-only coach
  flag — Mountjoy 2018).
- **Engine wiring:** one import + one `PROFILES` entry in `sportKnowledge/index.js`.
- **Test:** `apps/mobile/tests/sport-knowledge.js` — triathlon added to the registry
  coverage list and into `FLAGSHIPS`.
- Still **additive** — nothing in the app consumes the SKB yet; not a selectable
  onboarding sport (would need `onboardingModel.js` + `activityTypes.js`).

## Latest work — SKB: cycling authored to flagship depth (2026-06-29)

Promoted `packages/engine/src/data/sport-knowledge/cycling.json` from a stub to a
**fully-authored** profile (all 21 sections), modelled on `swimming.json` (the closest
individual-endurance reference) with real evidence provenance.

- **Sport-specific shape:** discipline archetypes in `positions` (GC/climber, sprinter,
  TT, criterium/puncheur, **track sprinter**, endurance/domestique); readiness elevates
  **leg/quad soreness** (knee is the overuse target); a **power-to-weight (FTP W/kg)** KPI
  is the climbing/GC currency; the gym serves the evidence-based **strength→economy** gain
  (Rønnestad & Mujika 2014; Sunde 2010; Aagaard 2011) + **in-season maintenance**
  (Rønnestad 2010). Injuries are the two cycling faces: overuse (anterior knee, low back,
  neck, ITB, saddle/bar neuropathies) + acute **crash trauma** (clavicle).
- **Engine wiring:** already imported in `sportKnowledge/index.js` and in `PROFILES`, so
  no registry change was needed — authoring the JSON is the whole change (the SKB's "add a
  sport = JSON + one registry line" promise; the line already existed).
- **Test:** `apps/mobile/tests/sport-knowledge.js` — cycling moved from the stub list into
  `FLAGSHIPS`, plus cycling-specific distinctness assertions (aerobic endurance leads,
  rotational power low, carries the `ftp_wkg` KPI).
- **Docs:** `docs/engine/03-SPORT-KNOWLEDGE-BASE.md` updated (cycling now a reference
  profile; three stubs remain: rugby, soccer, running).
- Still **additive** — nothing in the app consumes the SKB yet.

## Latest work — Sport Knowledge Base v1 (GAA flagship) (2026-06-28)

On worktree branch **`claude/elated-benz-f95b79`** (local). New **Sport Knowledge Base
(SKB)** — a reusable, evidence-tagged per-sport knowledge module a deterministic engine can
consume (the "sport is the priority" layer). **Additive only — no plan-generation rewiring;
nothing in the app consumes it yet.** Full doc: `docs/engine/03-SPORT-KNOWLEDGE-BASE.md`.

- **Schema + accessor:** `packages/engine/src/lib/sportKnowledge/{schema.js,index.js}`.
  21-section `SportProfile` contract with per-recommendation provenance
  (`confidence`/`evidenceLevel`/`source`), mirroring the existing `knowledge/` pattern.
  `validate()` (structural) + `completeness()` (authoring depth, à la `kb.staleEntries`).
- **Privacy enforced in the validator:** `RAW_VITALS` + a rule that **fails** if any
  raw-vital KPI (HRV/sleep/RHR) is flagged coach/team-visible — the binding
  `TEAM-ARCHITECTURE.md` rule, now a test, not a comment.
- **Data (pure JSON):** `packages/engine/src/data/sport-knowledge/`. **Gaelic football**,
  **hurling** and **swimming** authored fully across all 21 sections. The two GAA codes are
  **separate sports** (hurling carries the striking / grip / rotational-power demands
  football lacks); swimming is an individual endurance sport (positions = event/stroke
  archetypes; readiness elevates shoulder soreness; taper is the headline load tool).
  Schema-conformant **stubs**: rugby, soccer, running (cycling was promoted to a full
  profile on 2026-06-29 — see the entry above).
- Exposed on the engine barrel: `import { sportKnowledge } from '@performance-os/engine'`.
- **Verified:** `node apps/mobile/tests/sport-knowledge.js` (51 assertions pass —
  validity, flagship completeness + distinctness, stub scaffolds, energy %s, privacy rule,
  KPI limits, score weights, decision rules); `sports.js` + `knowledge.js` no regressions;
  barrel loads JSON in Node 26; esbuild (Vite 5.4's bundler) bundles the `with { type:
  'json' }` imports cleanly. NB: this worktree has no `node_modules` — a local
  `node_modules/@performance-os/{engine,shared}` symlink was added so `node` resolves the
  worktree engine; `npm install` at the worktree root would supersede it.
- **Next:** author the stubs to depth; wire `decisionRules`/`readinessModel`/
  `loadManagement` into `PlanService` + the future coach dashboard; have the thin
  `src/lib/sports/*.js` modules derive from the SKB.

## Latest work — Session UI v2 + timer reliability + engine cleanups (2026-06-28)

Continues on branch **`feat/focused-session-runner`** (local only — NOT pushed, no PR).
Six brainstormed specs, all built + preview-verified. Specs under
`docs/superpowers/specs/2026-06-28-*-design.md` (session-ui-v2, rest-timer-reliability,
primaries-straight-sets, region-pure-days-and-ordering, exercise-video-placeholder,
on-the-fly-exercise-substitution).

- **Spec A — Session UI v2.** The session preview is now mobile-first: one compact row
  per exercise (name + a single sets×reps badge; weight/RPE/cues moved into the runner).
  Primer and Main are **bordered section cards** (colour surrounds the block, no left
  rail): **Primer = teal `--accent`**, **Main = neutral**; **rust removed** from the
  session views + runner (it's legacy; the Midnight primary accent is teal). In the
  runner the primer runs as a **circuit, round-by-round** ("Round 1 of 2 → Start main"),
  no per-move rest. (Supersedes the "primer colour --moss" open item below.)
- **Spec B — Rest-timer reliability (serverless).** `RestTimer` rewritten to
  **timestamp-based** timing (tracks the end time, derives the display) so a screen
  lock no longer freezes/drifts it; a `visibilitychange`/`pageshow` handler catches up
  and fires completion once on return. New `hooks/useWakeLock.js` keeps the screen awake
  for the whole runner (re-acquires on visibility; silent no-op on unsupported iOS).
  New `lib/sound.js` beep on completion (+ existing vibrate; AudioContext unlocked on
  taps). Also fixes the prior "setState while rendering" warning. The manual "Log your
  top set" form is **removed** — progression derives solely from logged sets.
  **Deferred (needs backend/native):** locked-screen Web Push banner + native iOS Live
  Activity — a PWA can't schedule local notifications (verified: iOS Web Push is
  server-only, installed-PWA only).
- **Spec C — Primary lifts always run as straight sets.** `structureItems` no longer
  crams a light filler into a primary's rest gap (it under-rested the heavy lift).
  Primaries run straight with full rest; accessories still antagonist-superset among
  themselves. Golden-master regenerated — **exercise selection + volume byte-identical**
  across all 19 archetypes (570 session blocks); only superset structure changed.
- **Spec D — Region-pure focused days + compounds-lead ordering.** A focused Upper/Lower
  day no longer absorbs cross-region weekly-deficit spillover: in `bestExercise`, a
  candidate whose muscles are ENTIRELY off-focus is now excluded (not just suppressed).
  Hybrid lifts that hit an in-focus muscle stay (a Rack Pull on Upper trains the back);
  factor-0 prehab finisher work (tag 'mobility') is region-agnostic; **sport is exempt**
  (sport threads its priority work through every session). `structureItems` ordering
  re-tiered to compounds → isolation → core → mobility, with the anchor pulled to front
  AFTER the sort so a sport-priority iso/accessory anchor still leads. Fixes the reported
  "why is Floor Press on the Tuesday lower day, last?" — Phase1/Wk1 Tuesday now reads
  **Lower** (Box squat · Deficit Deadlift · Calf/Tibialis · Nordic curl · Ab Wheel), no
  stray press. New `tests/region-pure.js`; `session-density` volume canary + sport tests
  pass; golden-master regenerated.

- **Spec E — Exercise video placeholder.** Deleted the stick-figure demos
  (`StickFigureDemo.jsx` + `data/exerciseDemos.js`); the ⓘ guide keeps its written
  content and the demo block is now a future-ready video area — plays `entry.video` when
  one exists, else a "form video coming soon" shell with a disabled upload affordance.
- **Spec F — On-the-fly exercise substitution (runner).** New `substituteOptions`
  engine module + an "Equipment taken? Substitute" control on each working set: ranked
  same-muscle alternatives (same pattern first; squat → leg press / split squat, never
  OHP), filtered to available equipment, each with a recomputed weight target. Picking
  one swaps the exercise for THIS session only (local `sessionOverrides`, keyed by name)
  — future weeks untouched. Only true variants (same `matchLift` key) move the tracked
  e1RM; others log history only. Runner steps rebuild from a content signature so a swap
  is seamless. Substitute shows only on an exercise's FIRST set (committing the swap to
  the whole exercise); the sheet numbers options 1..n with #1 badged "best match".
- **Spec G — Science-based substitution ranking.** New allocator-safe enrichment
  (`data/exerciseSimilarity.js`: accurate primary/secondary muscles via pattern defaults
  + per-exercise overrides, and an equip→modality matrix). `substituteOptions` now gates
  to the same movement TIER + training the original's PRIMARY mover, then ranks by a
  multi-axis likeness score (primary alignment, coverage, synergist overlap, pattern,
  modality/force-vector, loadability via the exerciseLoad coefficient, same tracked lift,
  laterality, ROM). Fixes the rear-delt-for-biceps-curl and hip-thrust-for-squat
  mis-rankings; chest subs rank above triceps-biased ones. muscleContribution/allocator
  untouched. `tests/substitutions.js` extended (15 assertions).

Verified live (375px): compact bordered cards, no rust on page/runner, primer circuit,
timestamp timer counting + catch-up, wake-lock requested, completion form has no
top-set inputs, full Save & complete runs clean. `npm run build` clean; `node tests/*.js`
green except the pre-existing date-dependent `reflow-start-consistency.js`.

## Latest work — focused session runner + primer/main sections (2026-06-28)

On branch **`feat/focused-session-runner`** (local only — NOT pushed, no PR). Built
overnight from a brainstorm; awaiting Simon's review. Spec + plan committed under
`docs/superpowers/{specs,plans}/2026-06-28-*`.

Two connected features:
1. **Primer / Main sections.** Every gym session now shows a colour-coded **Primer**
   block (green `--moss`) — 1–3 movement-specific activation moves matched to the
   day's main lifts (band pull-aparts before bench, etc.) — then the **Main** block
   (rust `--rust`). New engine module `buildPrimer` (`packages/engine/src/lib/plan/primers.js`
   + `data/primers.js`, unit-tested in `apps/mobile/tests/primers.js`); applied as a
   decoration in `PlanService.injuryFilteredPhases` (strips the legacy functional
   P1–P4 primer, prepends the curated one, tags every item `section`). Engine left
   untouched so all engine snapshot tests stay green.
2. **Focused set-by-set runner.** `Start session` now freezes the session and opens
   a full-screen runner (`screens/SessionRunner.jsx`, route `.../sessions/:idx/run`)
   that walks one set at a time: primers are quick prep/Done; strength items expand
   into per-set steps with reps/weight (±2.5 kg) / RPE steppers, carry-forward, and a
   rest countdown that auto-advances (RestTimer `onComplete`). Supersets interleave by
   round. Every set persists to a new **`set_logs`** table (migration 013 + schema;
   offline-first via Storage/Database/SyncService/store `logSet`; degrades gracefully
   if 013 isn't applied). On completion the top working set per lift is derived from
   the logged sets and feeds the existing RPE progression. The old tap-each-exercise
   checklist is removed; Resume re-enters the runner and skips logged sets.

Verified in the preview: primer/main overview, full runner flow (steppers,
carry-forward, superset interleave, rest auto-advance, resume), `set_logs`
persistence, and progression (`lift_log.bench` updated from a logged 87.5 kg set).
`node tests/*.js` green except the **pre-existing** date-dependent
`reflow-start-consistency.js` (fails on clean HEAD too). `npm run build` clean.

**Open for review:** primer colour `--moss` equals `--accent` (swap to `--ochre` for
more contrast?); runner renders within the app shell (TopBar/TabBar visible) rather
than a true viewport overlay; migration 013 not yet applied to the live DB.

## What this app is now

A **dynamic, personalised gym-plan generator** for busy people who want to trust
they're getting the best possible training for their goal and the time they have.
The **decision engine** is the core: a short onboarding questionnaire → a multi-week,
periodised strength programme tuned to the user's **own** goal (get stronger, build
muscle, functional fitness, or strength support for a sport they train).

**Scope (important):** the engine is **gym-only today**. Picking a sport (run / cycle /
swim) biases the gym programming (emphasis, priority lifts, periodisation season) to
**support** that sport — it does **not** yet generate endurance sessions (real
run/cycle/swim workouts); that's a planned future stage. No goals are hard-coded —
the user's onboarding goal drives everything. (CLAUDE.md reflects this; the old
personal half-marathon/2.5km-swim goals were removed.)

**Structure + direction (2026-06-22):** the repo is now a **monorepo** (npm workspaces) —
the app lives in `apps/mobile/`, with `apps/web/` (coach dashboard — **first version now
built**, on mock data) and `packages/{shared,engine}/` reserved; `supabase/` + `docs/` sit at the root. Run
`npm run dev` from the **repo root**. The product **North Star** is now set: open
**elite S&C** to teams and budget-constrained individuals, as two packages — **Individual**
(what's here today) and **Team** (player mobile + coach web; the near-term priority, not
built). Full vision: `docs/strategy/VISION.md`; team blueprint + data-isolation rules:
`docs/product/TEAM-ARCHITECTURE.md`.

## Latest work — decision-engine evidence-architecture refactor (2026-06-23)

On branch **`feat/decision-engine-evidence-architecture`** (PR open, not merged). A
multidisciplinary review of the decision engine (`docs/engine/01-PANEL-REVIEW.md` +
`02-REFACTOR-ROADMAP.md`) plus a staged, low-regression refactor toward an
**orchestrator architecture** where specialist knowledge is modular, pluggable, and
evidence-traceable. Six themed commits; `node tests/*.js` = **42 files green**; build
clean; runtime paths preview-verified.

- **Phase 0 — golden-master safety net** (`tests/golden-master.js`): snapshots
  `generatePlan` across 19 archetypes + an in-process determinism check, so the
  pure-engine refactors below are proven **byte-identical** (`UPDATE=1` regenerates).
- **Phase 1 — evidence knowledge base** (`src/lib/knowledge/`): every scientific
  constant becomes an auditable entry (`evidenceLevel`/`source`/`confidence`/
  `lastReviewed`). Volume landmarks (`muscleVolume`) + ACWR thresholds (`trainingLoad`)
  read from it; contested science tagged `confidence:low/moderate`.
- **Phase 2 — pluggable sport modules** (`src/lib/sports/`): sport emphasis/priority/
  periodisation extracted behind a `SportModule` registry; `resolveProgram` /
  `resolvePeriodization` are thin lookups. **rugby/soccer/gaa** scaffolds prove a new
  sport = one data file, zero core edits. Plans byte-identical for run/cycle/swim.
- **Phase 3 — recovery + load contracts** (`src/lib/recovery/`, `src/lib/load/`): clean
  `RecoveryOutput`/`LoadOutput` consumed by `PlanService` + the store. **ACWR demoted**
  to a soft, low-confidence input (Impellizzeri/Lolli) — no longer cuts volume below
  0.85 or forces a deload alone (now needs corroboration). **Subjective wellness**
  blended ≥ objective (Saw 2016) + illness/travel overrides, captured via a new **Home
  daily check-in card** → `daily_metrics`. *Intentionally changes runtime behaviour*
  (verified in-app: illness → forced deload). **New migration** below.
- **Phase 4 — data-driven injury profiles** (`src/lib/injury/`): per-region
  contraindications relocated from the inline regex table into structured,
  evidence-tagged `InjuryProfile` data behind a registry; `injuryRules` is a thin
  accessor with **identical output** (parity green). Each profile carries risk factors,
  return-to-performance, and a dosed prevention protocol (Copenhagen/Nordic/FIFA-11+)
  linked to KB entries. (Matching stays name-based — items carry only a name; the
  knowledge is what became data-driven.)

**Frozen throughout:** the PlanOutput shape screens consume + the full test suite.

- **Phase 5 — engine extracted to `packages/engine`** (`@performance-os/engine`): the
  self-contained pure tree (39 modules: `PlanGenerator`, `strength`/`plan`/`sports`/
  `knowledge`/`recovery`/`load`/`injury`, `liftProgression`, `Utils`, `Readiness` + 4
  data tables) moved via `git mv` (renames preserved) into `packages/engine/src`,
  mirroring structure so internal imports survive. Barrel `index.js` + `./lib/*` /
  `./data/*` subpath exports; `apps/mobile` consumes it as a workspace dep (113 import
  sites repointed). **PlanService stays** as the thin app adapter (Database/store/
  overrides). golden-master **byte-identical**, suite 42/42, build clean, app verified.

## Latest work — coach web dashboard, first version (2026-06-22)

On branch **`feat/coach-web-dashboard`** (not yet merged). Filled the reserved `apps/web/`
slot with the **first version of the coach-facing dashboard** — the Stage 5 Team package's
coach surface. **Next.js 14 (App Router) · TypeScript · Tailwind v4 · Recharts**, a new
workspace alongside `apps/mobile`. Runs on **realistic mock data** (24 players); no backend
or auth yet, but structured so both slot in without touching the UI.

- **Decision-led, not a data dump.** Every player becomes a RAG status (ready / monitor /
  adjust / no-data) with plain-English meaning + a recommended coach action + player action +
  reason + confidence (from data completeness) + next review. Reuses the mobile engine's
  verdict vocabulary (`verdicts.js`, `trainingLoad.js` ACWR bands, `Readiness.js` scoring).
- **Privacy boundary enforced in code.** `types/dashboard.ts` splits `PlayerPrivateSource`
  (raw vitals — mock-only) from `CoachVisiblePlayer` (derived, maps 1:1 to the planned
  `player_status` table). `lib/derive.ts` is the roll-up; raw vitals never reach a component
  (`grep -rE "sleepHours|hrv|soreness" components/` = nothing). Honours the CLAUDE.md hard rule.
- **The swap point for going live is one file:** `data/mockApi.ts` (async `getTeam` /
  `getPlayers` / `getLoadTrend`). Replace bodies with Supabase `player_status` queries; the
  roll-up moves server-side. See `apps/web/README.md` for the API-migration + auth + extend guide.
- Sections: header (team context + 2 CTAs), 6 overview cards, readiness split, match-week
  panel, prioritised attention list (with the spotlight recommendation card — the
  differentiator), coach actions, filter/sort/search squad table, Recharts load-trend chart,
  adherence heatmap, and a player-detail slide-over drawer.
- **Verified:** `tsc --noEmit` clean, `next build` green (`/dashboard` prerenders), and
  browser-checked on desktop + tablet (filter, sort, search, row→drawer, Escape-to-close all work).
- **Run:** `npm run dev -w @performance-os/web` → http://localhost:3000/dashboard.

**Update — tabbed restructure + Constraints (same branch).** The single long page became a
**collapsible left sidebar + four routed views**: **Home** (`/dashboard`), **Focus**
(`/dashboard/focus` — team training direction + the flagged players it affects), **Squad**
(`/dashboard/squad` — table + chart + heatmap), and **Constraints** (`/dashboard/constraints`).
A shared `DashboardProvider` (client context in `components/dashboard/`) holds cross-view state
(selected player + drawer, editable constraints, toast); `app/dashboard/layout.tsx` fetches data
once and the layout stays mounted across view switches. The new **Constraints** view is a working
form (sport, season, weekly training pattern, fixtures → `TeamConstraints`, shaped for the future
`teams.schedule` jsonb) plus a plain-English cascade explainer (team constraints → each player's
onboarding → personalised plan); editing the season updates the Focus direction live via context.
Old `DashboardShell`/`DashboardHeader` were removed. Verified: `next build` green (all 4 routes
prerender), `tsc` clean, browser-checked (each view renders; client soft-nav keeps provider state;
constraints edit→save→commit cycle works).

## Latest work — monorepo restructure (2026-06-22)

Merged to **`main`** (commit `1125f5d`), GitHub Pages deploy green. The app moved **as one
unit** into `apps/mobile/` and the repo became an **npm-workspaces monorepo**:

- `apps/mobile/` — the app (src, public, tests, index.html, vite.config.js, .env.local).
- `apps/web/` — reserved for the coach dashboard + marketing site (Next.js; not built).
- `packages/{shared,engine}/` — reserved (the engine stays in `apps/mobile/src/lib/` for now).
- `supabase/` + `docs/` at the repo root (shared backend; docs gained `strategy/`, `product/`,
  `prompts/`).
- Root `package.json` defines the workspaces + delegating scripts — **run `npm run dev` /
  `npm run build` from the repo root.** CI (`.github/workflows/deploy.yml`) now publishes
  `apps/mobile/dist`. Repo name + Vite base `/hybrid-react/` are unchanged, so the live URL is
  unaffected.

All 226 relative imports survived (the app moved as a unit); `npm install` (4 workspaces,
hoisted), build, engine tests, and the dev server were all verified, and the Pages deploy
succeeded. Docs (CLAUDE.md, the new vision/team docs) were refreshed in the same session.

## Latest work — five tracked lifts + a target weight on every exercise (2026-06-22)

On **`main`** (committed only when asked). Two linked changes so the athlete logs just
their **five** main lifts and every other exercise gets a realistic, auto-progressing
target weight. TDD throughout; `node tests/*.js` = **35 files green** (added
`tests/onboarding-lifts.js`, `tests/exercise-load.js`; extended `tests/validation.js`).

- **Onboarding now captures 5 lifts** (was squat/bench/deadlift): adds **OHP** + a
  **pull** movement entered as either pull-up max-reps **or** lat-pulldown 1RM (a toggle;
  reps → kg e1RM via Epley using bodyweight). New "Your main lifts" step
  (`OnboardingWizard.jsx`) shows whenever barbell **or** cable **or** bodyweight is
  available (not just barbell), with a **"Help me test"** mode — enter weight + reps-to-
  failure → live e1RM (blanks only). Per-lift provenance stored in `profile.lifts_source`
  (`entered`/`tested`/`estimated`). Model + normalisation in `onboardingModel.js`
  (`normalizePullToKg`); Epley helpers `epley1RM`/`pullupE1RM` exported from
  `liftProgression.js`. `strengthStandards.js` gained ohp/pull ÷BW bands. `validation`
  extended to the five lifts (+ `pullupReps` limit).
- **Atlas + Progress translate the new lifts per sport** (`atlas/signals.js`, `goals.js`):
  `LIFT_MUSCLES` now maps `ohp→[shoulders,triceps]` and `pull→[back,biceps]`, so a
  swimmer's `upper_pull` + `shoulder_health` pillars become **real** (driven by actual
  pull-up/OHP strength) instead of level estimates. The overall `strength` score is now
  **sport-weighted** via `resolveProgram().emphasis` (`SPORT_EMPHASIS`) — swimmers' pull/OHP
  count more, sprinters' squat/deadlift count more; `build` stays a neutral average. The
  Atlas stays a sport-relevant **pillar** radar (not a generic 5-lift chart). `goals.js`
  `LIFTS` adds Overhead press + Pull → 5 milestone cards on Progress / Atlas "Your lifts".
  Tests extended in `tests/atlas-and-coachnote.js` (T15–T19) + `tests/goals.js` (T13–T17).
- **Every loadable exercise gets a suggested weight** — new pure
  `src/lib/strength/exerciseLoad.js`: `anchorFor(exercise)` maps each exercise to one of
  the 5 e1RMs + a research-calibrated coefficient (StrengthLevel accessory↔main ratios,
  e.g. lateral raise ≈0.20×OHP, leg ext ≈0.74×squat, leg curl ≈0.42×deadlift; isolation
  coefficients scale with level, dumbbells are per-hand). `applyWeights` (in
  `liftProgression.js`) now weights **all** items via this, not just the matched main;
  `matchLift` is now only for the top-set **log** form (the 5 mains). Bodyweight/band/core
  keep their natural cues (no kg). Weights climb automatically as the mains' e1RMs climb.
  Audited: 120/120 loadable items in a full plan get a sane weight, 0 absurd isolations.
- Design + research notes: `docs/superpowers/specs/`-style plan lives at
  `~/.claude/plans/polished-sprouting-zephyr.md` (sources: StrengthLevel comparison pages).

## Latest work — sport-companion repositioning: home + Atlas (2026-06-21)

On branch **`feat/sport-companion-home-atlas`** (not yet merged). Repositions the app
from a generic gym-plan generator toward a **sport-specific training companion**.
Built in three phases, each verified at an iPhone viewport via the preview MCP; the
pure helpers are covered by `tests/atlas-and-coachnote.js` (40 assertions, all pass).

- **Home redesign** (`src/screens/Home.jsx`): identity header (avatar + name →
  `/profile`, day + date) → auto-generated **coach note** (`src/lib/coachNote.js` —
  what/why/how-it-helps-your-sport, read from `resolveProgram` + plan position) →
  **week schedule** as the hero (`src/components/WeekSchedule.jsx`) → catch-up →
  readiness + load tiles. **Train Now button removed.**
- **Nav**: 5 tabs → **4 — Home · Plan · Health · Atlas** (`TabBar.jsx`). Profile is no
  longer a tab (reached from the home avatar). The old **Progress** screen folds into
  Atlas; `/progress` now redirects to `/atlas` (`Progress.jsx` orphaned, safe to delete).
- **Avatar**: `src/components/ui/Avatar.jsx` (photo or initials). Upload =
  `src/lib/avatarUpload.js` (canvas square-crop/downscale → Supabase Storage when
  signed in, else a local data-URL fallback). **Needs migration applied:**
  `supabase/migrations/009_avatars_storage.sql` (public `avatars` bucket + own-folder
  RLS). URL saved to `profile.avatar.url` (existing JSONB — no schema change).
- **Profile** (`src/screens/Profile.jsx`) is now the account/setup hub: editable photo
  + name, YOU/TRAINING/PLAN cards, **Connections & Settings** rows → integrations +
  settings. Strength-goal card moved out (now in Atlas).
- **Atlas** (`src/screens/Atlas.jsx`) — the new feature. Radar (`RadarChart.jsx`, SVG,
  no chart lib) of sport-specific pillars vs **estimated** top-5%/elite, ranked
  worst-gap-first bars, a "biggest gap" note tied to `resolveProgram.emphasis`, and the
  folded strength-progress rings. Powered by an **extensible** stack: signal providers
  (`src/lib/atlas/signals.js`) → pillar library (`src/data/athletePillars.js`) →
  per-sport registry (`src/data/sports/` — run sprint/middle/long, cycle, swim, + build
  default; "how to add a sport" header). Adding a sport (hurling, GAA, soccer, rugby,
  field hockey…) is a config drop-in — `computePillars`, the radar and the screen don't change.

Follow-ups: real top-5%/elite benchmark data (current values are estimates);
per-pillar trend once history accrues; delete orphaned `Progress.jsx`; team-sport
onboarding + engine emphasis maps.

## Latest work — decision-engine evaluation + hardening (2026-06-21)

The engine was put through an **exhaustive evaluation** (~60k generated plans swept
via the `/dev` playground + a cited literature review) → **`docs/decision-engine-evaluation.md`**.
It found the engine robust and evidence-based, with a ranked list of fixes (F1–F10).
**All fixes + two follow-ups are implemented, tested, and merged to `main`** (PRs #10
and #11):

| Area | Change | Result |
|---|---|---|
| **Volume (F1)** | Hard **weekly MRV ceiling** on actual allocated volume | Build-grid plans over MRV **869 → 0** (back was hitting ~57 vs MRV 25) |
| **Volume tracking** | Overshoot penalty in the allocator | Base-week actual/target **110–123% → ~100%** |
| **Durations (F5)** | Estimate from realised work; filler pass respects the time budget | 1-day plans no longer cram 13 exercises into "~60 min" |
| **Primer (F2/F6)** | Equipment-filter the warm-up; trim it on ≤30-min sessions | No "Band Pull-Apart" for band-less users |
| **Taper (F4)** | Event taper now **keeps intensity, cuts volume** (was a deload) | Peaks instead of detraining (Bosquet/Travis-Mujika) |
| **Sport (F8)** | Sessions **lead with sport-specific work**; sprint chest trimmed | Swimmer opens on a pull, sprinter on Power Clean/plyos |
| **Adaptive deloads (F9)** | Fatigue/ACWR/readiness can **force** a deload or **defer** a planned one | Runtime layer only; pure generator untouched |
| **Titles (F3) / copy (F7)** | Honest session labels; vestigial "aerobic" copy removed | — |
| **Cleanup** | Deleted legacy `Plan.js` fallback (personal-goal plan) + ~930 LOC of dead code (orphaned screens/builders/utilities) | Plan is always per-user generated |

**Engine test suite:** `node tests/*.js` — 260+ assertions pass (new suites:
volume-ceiling, volume-tracking, duration, taper, sport-anchor, primer-equip,
session-titles, adaptive-deload). Determinism + full build/sport sweeps clean.

## Earlier shipped initiatives (still live on `main`)

- **Wearable + training-load (sub-projects A–D).** Connect Strava → workouts ingest →
  sessions auto-link and gain HR + Karvonen/HRR zones from the everyday band → an
  Edwards-TRIMP → EWMA acute/chronic → **ACWR** signal → the current gym week
  auto-adjusts (ease / deload / nudge-up) with a revertible "Plan adjusted" banner +
  a **Training Load** view. (This `loadDecision` signal is exactly what F9's adaptive
  deload now consumes.) Specs/plans under `docs/superpowers/`.
- **"Midnight" UI redesign** — dark-only design system (tokens/type/shell), rule-based
  `verdicts` layer, redesigned tabs (Home readiness+load rings, Program week stepper,
  Progress, Profile). **Merged.** `?preview=1` seeds a mock athlete so screens render
  without sign-in (`src/lib/previewSeed.js`).
- **Auth overhaul** (Welcome screen, Apple/Google OAuth, open signup, per-user cache
  isolation) and **Fitbit/Google Health** fixes.

## Manual setup — status

| Item | Status |
|---|---|
| Supabase migrations 004–007 (allowlist drop, device roles, `workouts`, `set_device_primary` RPC) | Applied. If "Make primary" misbehaves, re-verify **007** in the SQL Editor. |
| Migration **008** (`session_logs` HR columns) | ✅ applied |
| Edge Functions: `fitbit-auth-callback`, `fitbit-sync`, `strava-auth-callback`, `strava-sync`, `enrich-sessions` | ✅ deployed (`config.toml` pins `verify_jwt` per fn) |
| Secrets: `STRAVA_CLIENT_ID`/`SECRET`, `VITE_STRAVA_CLIENT_ID`, Google/Fitbit OAuth | ✅ set |

**Pending on the engine branch:** migration `20260623_daily_metrics_subjective.sql`
(adds `stress`/`illness`/`travel` to `daily_metrics` for the subjective check-in) —
apply when `feat/decision-engine-evidence-architecture` merges. No new functions/secrets.

## Known limitations / expectations (not bugs)

- **Engine is gym-only** — sport selection biases the gym plan; it does not program
  run/cycle/swim sessions (future stage).
- **Adaptive deloads / training-load need ~4 weeks of history** before ACWR is
  meaningful; until then the plan runs as designed.
- **HR enrichment is recent-sessions-only** (Google Health intraday API has no date
  filter); **cardio HR zones come from the everyday band**, not Strava streams.
- **Garmin direct API** stays a placeholder; Strava carries Garmin-recorded workouts.
- **Fitbit/Google OAuth in "Testing" mode** expires the refresh token ~weekly — the
  reconnect nudge handles it.

## Non-blocking follow-ups (your call)

- **Engine extraction — DONE (2026-06-23).** The engine now lives in
  `packages/engine` (`@performance-os/engine`); see its README. The one remaining
  refinement (optional): split `PlanService`'s current-week reflow into a pure engine
  function + a thin adapter, so a second runtime can reflow, not just generate. Not
  required — generation, periodisation, recovery/load, and injury all run from the package today.
- **Stale remote branches** safe to delete: `engine-fixes`, `chore/remove-dead-code`
  (both merged), plus older merged/dormant ones (`fix/pwa-oauth-redirect`,
  `strength-refocus`, `adaptive-gym-engine`, `ui-overhaul`, etc.).
- **Midnight secondary screens** (SessionDetail, PhaseDetail, Settings, Wearables,
  Trends, Injuries, TrainingLoad, Onboarding, auth) inherit Midnight tokens but
  weren't bespoke-redesigned — optional polish + dead-CSS sweep.
- **Training-load (D) tidy-ups from earlier review:** revert actions read `profile`
  via a redundant `buildView()`; `currentAdaptation` reverted branch drops `d.reason`.

## What's next

- **Stage 5 (current priority) — the TEAM PACKAGE.** Coach-facing web (`apps/web`) alongside
  the existing player mobile (`apps/mobile`). Full blueprint + the binding data-isolation
  rules: `docs/product/TEAM-ARCHITECTURE.md`. First sub-steps, in order:
  1. **Data + RLS spine** — `teams` + `team_members` + a derived `player_status` surface + an
     `is_coach_of()` helper, in a versioned migration, with RLS tests proving a coach sees
     their team's *derived* status only (never raw vitals) and players can't see each other.
  2. **`apps/web` scaffold** — coach dashboard shell (auth + team list).
  3. **Team schedule entry** → persisted on `teams.schedule`.
  4. **Constraints into the engine** — feed the schedule into `scheduler.js` / `PlanService.js`
     so player plans avoid sport-load clashes (the pure `generatePlan` stays untouched).
  5. **Coach loading overview** — aggregate `player_status` into a plain-English team view
     built on the existing `verdicts` + ACWR layer.
- **Following — Claude AI plan generation/adjustment** via a server-side Edge Function. The
  deterministic engine (`generatePlan`) + `loadDecision` / `deloadRecommendation` are clean
  inputs an AI layer can consume or override behind PlanService (never a key in the browser).
- **Later — real endurance session programming** (run/cycle/swim workouts), so sport goals
  get actual cardio sessions, not just gym support.

## How work is run here

**Validate against the frozen governance set first.** Before building any engine, coaching,
product, or AI feature, check it against the **five FROZEN documents** (v1.0) — the
**Constitution**, **Decision Ontology**, **Knowledge Architecture** (`docs/foundation/`), the
**EDS** (`docs/engine/00`), and the **TAS** (`docs/architecture/TAS.md`). New work is validated
*against* them and never edits them — changes are deliberate amendments (see the freeze entry
above). When the rules disagree, the higher document wins (the Constitution is the tie-breaker).

Engine changes this session: branch → small themed commits → node tests per change →
`/dev` sweep + preview verification → PR. The deterministic engine lives in
`src/lib/PlanGenerator.js` → `resolveProgram` (`strength/program.js`) +
`resolvePeriodization` (`plan/periodization.js`) + `weeklyMuscleTargets`
(`strength/targets.js`) + the greedy `allocateGym` (`plan/allocator.js`); the
runtime reflow + adaptive deload live in `PlanService.js`. Earlier initiatives used
brainstorm (spec) → writing-plans → subagent-driven implementation; the SDD ledger is
at `.git/sdd/progress.md` (not committed).
