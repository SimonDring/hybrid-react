# Decision Engine — Current State Assessment

**Status: REVIEW (dated) · Sprint 2 forensic audit, deliverable 1 of 10 · main @ 02f6184, KSV 1.30.0, ENGINE_VERSION 1.4.0 (post PRs #162–#167).**
Method: six independent read-only deep-reads (decision flow, session/dose, volume bias,
knowledge usage, safety/explainability, scalability), every claim re-verified at source
with file:line — the 2026-07-09 phase reviews were used as leads only, since PRs
#163–#167 changed the code after they were written. Companion deliverables:
02 constitutional alignment · 03 coaching quality · 04 bodybuilding bias · 05 knowledge
usage · 06 technical risks · 07 scientific risks · 08 gap analysis · 09 backlog ·
10 migration blueprint draft.

---

## 1. The one-paragraph answer

The engine today is **two engines sharing one chassis, wrapped in an honest runtime**.
The diagnosis-first D11 path — all three build disciplines plus eight of eleven sports —
genuinely reasons Goal → Demand → Diagnosis → Priority → Session Objective → Movement
Requirements → tiered Selection under a fatigue budget → quality-keyed Dose →
interference-aware Scheduling. The legacy volume-first fill still serves every
triathlete, any run/cycle athlete whose diagnosis comes back empty, and legacy GAA
profiles without a sport code — for those cohorts, per-muscle volume targets are
computed first and exercises are picked to pay them down. Cross-cutting, and more
important than the two-path split: the diagnosis runs on almost no measurement (only
maxStrength is ever measured; 9 of 10 qualities are training-age priors), progression
for a non-logging athlete is a periodised costume over flat loads, the validation layer
observes but never disposes, and the learning loop writes priors nothing reads.

## 2. The real pipeline (as-built, verified)

```
ONBOARDING (apps/mobile)
  OnboardingWizard → answersToProfilePatch → users.profile   (legacy shape)
                   → AthleteModelService     → profile.athlete_model (dual-write)

PURE GENERATOR  packages/engine/src/lib/PlanGenerator.js:162  — generatePlan(profile)
  resolveProgram()                 strength/program.js:62   style · emphasis · scalar · priority lifts
  performanceModelForProfile()     performance/forProfile.js:11
    D1  profileToAthleteModel      adapters/profileToAthleteModel.js:8
    D2  demand profile             demandProfile.js:9   (SKB | discipline | goal)
    D3  position boost             demandProfile.js:23  (0.9 floor on primaryQualities)
    D1' estimateCapability ×10     estimation.js:78     (measured: maxStrength ONLY)
    D4  diagnoseLimitingFactors    diagnose.js:18       gap × importance × trainability × risk
    D5  prioritiseQualities        prioritise.js:9      k = 1–3 by confidence (collapses to 1)
  D7  resolvePeriodization         periodization.js:104 (template; SKB season blocks)
  D7' blockObjective + steer       blockObjective.js:41,110 (gated on a recoveryRate prior)
  FOR EACH WEEK:
    D12(vol) weeklyMuscleTargets   targets.js:55        MEV→MAV ramp × style × emphasis
    D8'  resolveSplit              split.js:184         (region/day template)
    allocateGym()                  allocator.js:641
      diagnosisSteers? (allocator.js:87-100)
        YES → D9 sessionObjective → D10 movementRequirements → D11 selectInterventions
              (§34 tiers, fatigue-budget stop) → D12 doseForQuality / discipline pin
        NO  → LEGACY FILL: anchor → greedy per-muscle deficit pay-down (:969-1041)
      post-passes: round-out · hypertrophy iso · finishers (factor-0) · secondary goals
      finaliseSlot: ordering/supersets → RPE shift → e1RM %-loads
    D13 scheduleWeek               scheduler.js:148     permutation penalty search
    D13' despineWeek               despine.js:63        axial-load backstop
  D14 validateWeek (REPORT-ONLY)   PlanGenerator.js:263-275 → plan.meta.validation
  meta.diagnosis (honesty-gated)   PlanGenerator.js:283-292

APP RUNTIME  apps/mobile/src/lib/PlanService.js
  D15 reflow (engine plan/reflow.js:181): 10-day horizon, readiness/load/travel/illness
      trims, SKB rule trims, MRV-capped catch-up with surfaced forgiveness,
      corroboration-gated adaptive deload, freeze-on-start, baseline-identity keep
  → injury render filter (backstop) → shipped validation report (report-only) → screens

D16 LEARNING: blockOutcome.js → athlete_model.stagedPriors — WRITTEN, READ BY NOTHING.
```

## 3. Who gets which engine (the cohort map)

| Cohort | Path | Basis |
|---|---|---|
| Get stronger / build muscle / functional / olympic | D11 (discipline always steers) | allocator.js:87-100 |
| Run, cycle (non-empty diagnosis) | D11 (quality rotation) | D11_SPORTS, allocator.js:87 |
| Swimming, hurling, gaelic football, field hockey, soccer, rugby | D11 (category-led weeks) | categoryCoverage.js:107 |
| **Triathlon — every triathlete** | **Legacy volume fill** | 'triathlon' ∉ D11_SPORTS ∉ CATEGORY_LED |
| Run/cycle with zero-gap diagnosis | **Legacy volume fill** | prioritise.js:10-11 returns []; build got a fallback seed (allocator.js:88-94), sports did not |
| Legacy GAA rows without `sport_code` | **Legacy volume fill**, neutral emphasis | sportKnowledge/index.js:67-71 → empty demand |
| Un-modelled sports (tennis, basketball…) | Not reachable — onboarding offers only the 11 SKB sports | OnboardingWizard.jsx:205 |

## 4. Decision-by-decision status (D1–D16)

| D | EDS role | As-built status | Anchor |
|---|---|---|---|
| D1 Assess | athlete model + capability w/ confidence | **Partial** — model real; capability = priors for 9/10 qualities; assessment fields collected and never read (`assessments[]`, `movementCompetency`, `sessionDurationMin`, `age`; `1rm_pull` loads-only) | estimation.js:105; profileToAthleteModel.js:8 |
| D2 Demand | goal/sport → demand profile | Implemented (SKB / discipline / goal) — but the SKB projection silently drops 11 authored quality names (see 05-knowledge) | demandProfile.js:9,17 |
| D3 Position | refine demand | Thin — 0.9 floor boost on position primaryQualities only | demandProfile.js:23-33 |
| D4 Diagnose ★ | ranked limiting factors | Implemented; demand term effectively squared in the gap math; active pain never enters; age absent | diagnose.js:27,32 |
| D5 Prioritise | top-k priorities | Implemented; k collapses to 1 for nearly everyone via the confidence plumbing | prioritise.js:7 |
| D6 Strategy | concurrency/sequencing model | **Absent** — fragments hard-coded downstream | — |
| D7 Block | one objective per block | Template + gated steer. **The steer is LIVE in production** (schema-default recoveryRate {value:1} is non-null for every dual-written model) while golden archetypes exercise only the template path — untested divergence | blockObjective.js:110; PlanGenerator.js:206; athlete/schema.js:41-44 |
| D8 Week | microcycle objective | Thin pass-through — phase flags + blockFrac + split template; no fixture-density patterns | PlanGenerator.js:226-233 |
| D9 Session objective | one purpose per session | Implemented on D11 paths (shipped as `_objective` with rationale); honest `source:'style'` label on legacy | sessionObjective.js:100; allocator.js:1188 |
| D10 Movement reqs | requirements before exercises | Implemented, D11 paths only; injury patterns subtracted up front | movementRequirements.js:65 |
| D11 Selection | value-ordered minimum set | **Two engines coexist** — §34 tiered selection vs greedy deficit fill | selectInterventions.js:80; allocator.js:969 |
| D12 Dose | minimum effective dose | Quality-keyed scheme tables, evidence-tagged; olympic classic fix verified (#163); entirely categorical — no athlete-measured input beyond e1RM kg | doseSchemes.js; allocator.js:181 |
| D13 Schedule | interference-aware placement | Implemented — the strongest layer (muscle/axial/plyo/sport-proximity penalties, governed weights) | scheduler.js:148 |
| D14 Validate ★ | trim or veto | **Report-only end-to-end; 5 of 16 validators; the report reaches no screen.** The only consumer that disposes is the dormant AI seam | contract.js:68; PlanGenerator.js:263; ai/contracts.js:60 |
| D15 Adapt | project over immutable plan | Implemented and disciplined: horizon reflow, freeze-on-start, forgiveness surfaced, corroboration-gated deloads | reflow.js:181 |
| D16 Learn | update priors | **Dormant** — stagedPriors written at block check-in, zero readers | blockOutcome.js; AthleteModelService.js:117 |

## 5. What the athlete experiences, plainly

- **Day one**: a structurally sound, periodised, sport-aware plan whose diagnosis is
  a well-organised guess (priors dressed in decimals), delivered with one real
  measured anchor (their lifts → maxStrength → %1RM loads).
- **Week to week**: volume ramps (MEV→MAV), sessions repeat near-identically within a
  phase (D11 selection has no week input; legacy rotates by hash), loads move only at
  phase boundaries via re-percentaging a static e1RM — unless they log lifts, in which
  case five lifts autoregulate ~2%/RPE-delta.
- **Daily**: readiness/travel/illness genuinely reshape pending work, with visible
  annotations and honest forgiveness; a started session is truly frozen.
- **If injured**: red-flag triage is real; selection and render filters block
  contraindicated work at runtime; but in 5 of 14 body regions (9 of 14 at severity ≥4)
  the "rehab replacement" session ships empty or hollow, invisible even to the
  report-only validator.
- **At block end**: a 4-question check-in decides progress/repeat/bridge; the learning
  verdicts it computes are staged and never consumed.

## 6. Strengths that must not regress (verified)

1. **Determinism/purity is real and machine-enforced twice** — no clock/RNG/I-O on the
   plan path (the one `new Date()` default in `kb.staleEntries` has no caller);
   ESLint purity ruleset (#165) + golden master.
2. **Freeze-on-start / athlete intent** — started sessions excluded from reflow by
   epoch guard + snapshot; overrides and pins respected (Art 10 honoured in code).
3. **Confidence-governs-authority for knowledge** — ACWR floored to soft input and
   corroboration-gated by its entry's confidence; validator verdicts capped by evidence
   tier (contract.js:55-60). The ACWR lesson is genuinely generalised — for knowledge.
4. **Privacy** — raw vitals never coach-readable: SKB privacy sweep fails the build,
   team roll-up whitelists derived signals (teamStatus.js:39), RLS proofs.
5. **Scheduling craft** — sport-proximity, axial, plyo-contact spacing with governed
   weights; taper ≠ deload end-to-end.
6. **Runtime honesty** — `_ruleTrim`/`_catchUp`/`_intensityEased`/forgiveness ledger
   all rendered; diagnosis meta emitted only when it actually steered.

## 7. The five load-bearing weaknesses (detailed in deliverables 02–07)

1. **The diagnosis is unmeasured** — one measured quality, k=1 priorities, silent SKB
   demand drops: elite scaffolding on an intake form.
2. **Progression is not individualised** — flat intra-phase loads for non-loggers, no
   double-progression, no ramps, selection static within a phase.
3. **Validation observes, nothing disposes** — 5/16 validators, report-only, report
   invisible; enforcement is single-layer in-loop for everything except injuries.
4. **The legacy volume engine still runs** for triathlon / zero-gap endurance /
   code-less GAA — Art 6 inverted for real, reachable cohorts.
5. **Learning is dormant** — priors staged, never promoted; no outcomes/history
   substrate; the engine cannot yet find out whether its plans worked (Art 12/16).

Plus a set of **newly found defects** this audit adds to the record: the post-flip
style-id fallthrough (all three build disciplines silently take the *functional*
volume band — targets.js:56, allocator.js:642), the D7 steer arming silently in
production, plan-memo staleness (`profileSignature` omits sport_code/game dates/
athlete_model), equipment silently demoting the athlete's chosen discipline
(disciplines/index.js:26), the readiness confidence export hard-coding
baselineMaturity 1, no recency gate on the driving daily-metrics row, phantom volume
from hidden substituted items, and the empty-rehab session being invisible to its own
validator (discipline:'rehab' filtered at validators.js:24).
