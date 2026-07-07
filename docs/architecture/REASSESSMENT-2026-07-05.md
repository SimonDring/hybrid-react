# Reassessment 2026-07-05 — the post-#126 audit & rebuild backlog

**Status:** LIVING planning document (NOT frozen) · **Authority:** subordinate to the frozen set
(Constitution, Decision Ontology, Knowledge Architecture, EDS, TAS) and validated against it.
Successor snapshot to `PHASE3-ARCHITECTURAL-AUDIT.md` (2026-07-03), which PRs #61–#126 have
largely executed. Method: six parallel code-verified deep audits (diagnosis chain D1–D5;
planning chain D6–D13; governance/validation/explainability; runtime/monitoring/recovery;
legacy-path/flip readiness; team/platform surfaces). Doc claims were not trusted — every
finding below carries file-level evidence in the audit transcripts (session 2026-07-05).

---

## 0. Executive summary

**What is genuinely done since the Phase-3 audit** (verified in code, not from HANDOFF):
determinism (zero clock/random leaks in decision paths, test-pinned); the pure engine reflow
(D15) with authority-gated ACWR — the best-engineered mechanism in the repo; the 5-call public
API with a shrink-only deep-import ratchet; portable frozen-wins session pins; the sync outbox;
the validator framework (registry, §37 conflict order, authority-capped verdicts); provenance
stamping; explainability for the D11 cohort; one diagnosis engine (Atlas re-based); the team
spine with four independent privacy layers on the raw-vitals boundary; the live coach board;
team schedule → plan constraints.

**The headline of THIS reassessment: the platform's assessment-to-diagnosis chain is broken at
its first link, and the diagnosis steers a minority of athletes.**

1. **The Athlete Model is captured but bypassed** (A-1). Onboarding collects position,
   resistance-training years, sport years, movement competency; `AthleteModelService` persists
   them; **no live decision reads them**. Every path re-derives from the legacy profile:
   D1's band rests on a self-rating, D3 position refinement is unreachable code,
   `getPerformanceModel()` has zero callers, and the PlanGenerator comment claiming PlanService
   passes the stored model is false.
2. **Capability priors are flat and gym-keyed** (A-2): a 15-year competitive distance runner is
   diagnosed *aerobically novice* (0.25) against a ~1.0 demand — the engine's worst possible
   misdiagnosis for its target user. Plus a real bug: a bench-only 1RM is scored against the
   **squat** bodyweight standard.
3. **The majority cohort has no diagnosis** (A-3): build goals get an empty D4 — a direct
   conflict with the EDS D4 contract ("*Never* produce no diagnosis") and Article 5. And a new
   **integrity gap**: GAA/hurling/field-hockey athletes get a diagnosis *emitted and displayed*
   (`meta.diagnosis`) **that steers nothing** — their week is legacy greedy fill.
4. **D6/D7/D8 do not exist as decisions for anyone.** Periodisation is a style/season template
   lookup (the exact "fixed style template" the EDS D7 forbids); no strategy, no weekly
   objective. Even the re-seated run/cycle/swim cohorts stand on three legacy legs: SPORT_BLOCKS
   block structure, emphasis-vector volume ledger + split regions, and the sportLoad scalar.
   "Diagnosis-driven" today = exercise choice + rep scheme, inside a legacy-shaped week.
5. **Validation covers 5 of the EDS's 16 validators, and only the baseline path.** The reflowed
   week — the one the athlete actually trains — never passes D14; substitutions are
   injury-blind; the report (`meta.validation`) is emitted and never rendered.
6. **Injured non-D11 athletes get inferior handling** (Art 8/15): blocked items are silently
   hidden with no redistribution, while an injured runner gets re-targeting with rationale.
   The only hard safety gate is keyed on **display-name regexes** — one rename silently defeats
   both the filter and its own fixed-point validator.
7. Governance drift at the edges: `KNOWLEDGE_SET_VERSION` bypassed by three science-table
   changes; authority capping consumed in only 3 sites while low-confidence entries act alone;
   staleness warns, never fails; readiness-v2 shipped default-ON against its own KB entry's
   "until validated" condition; two parallel capability models survive app-side
   (`goals.js`/`strengthStandards.js`, `fitnessAge.js`).
8. Team platform: privacy holds (verdict ALIGNS), but `player_status` SELECT is player-scoped
   not team-scoped (a shared player's *other* team's row is readable — a hard-rule breach on
   derived data), players can read `teams.join_code`, engine `rollUp()` is unbuilt (the web
   layer computes coaching), match days are invisible to the athlete whose plan they reshape,
   and `schema.sql` + the migrations ledger have drifted six migrations behind.

**Reusability verdict:** unchanged in kind from Phase 3 — this remains a re-seating, not a
rewrite. The spine is right; the work is (i) repairing the assessment chain, (ii) extending
the spine to everyone, (iii) making validation govern what ships, (iv) finishing knowledge
extraction, (v) team-era honesty (rollUp, visibility, scoping).

---

## 1. Alignment map (Phase 2) — per area verdict

| Area | Verdict | One-line evidence |
|---|---|---|
| Determinism (Art 18) | **ALIGNS** | zero clock/random in decision paths; latent-only default in `kb.staleEntries` |
| Public API boundary (TAS T21) | **ALIGNS** | barrel + test-enforced shrink-only ratchet; 2 allowlist entries |
| Freeze-on-commit (Art 10) | **ALIGNS** | portable, frozen-wins, two-device tested; 2 narrow edge cases noted |
| Raw-vitals privacy (Art 11) | **ALIGNS** | 4 independent layers; harness-proven; 2 derived-data scoping nicks (WP-50) |
| D15 runtime reflow | **ALIGNS** | pure `reflowPhases`, KB-thresholds, authority-gated ACWR |
| Deload force/defer (Art 13) | **ALIGNS** | corroboration is mechanism, not convention |
| D1 athlete assessment | **CONFLICTS** | stored model bypassed; flat priors; 1 of 10 qualities measured; squat-scale bug |
| D2/D3 demand | **PARTIAL** | SKB-driven for sports; 8 SKB qualities dropped unmapped; D3 unreachable; no build demand |
| D4/D5 diagnosis | **PARTIAL** | sound + explained where it runs; empty for build (EDS-contract conflict); silent deferrals |
| D6 strategy / D7 blocks / D8 weekly | **MISSING** | template lookups; no athlete-specific reasoning anywhere |
| D9–D11 selection | **PARTIAL** | genuinely good for run/cycle/swim (+triathlon by binding); everyone else legacy fill |
| D12 dose | **PARTIAL** | quality-keyed + governed on D11 path; style-bridge elsewhere; C8 rest floor deferred to flip |
| D13 scheduling | **PARTIAL** | sound science; weights ungoverned; ~40% of module dead (doubles/long-run machinery) |
| D14 validation | **PARTIAL** | framework exemplary; 5/16 validators; baseline path only |
| D15 explainability of changes | **PARTIAL** | deload/ease/forgiveness visible; SKB rule trims, defer, lightening, catch-up invisible |
| D16 learning | **MISSING (by design)** | typed priors read-path real, no writer; no outcome loop (EDS FR5 unimplemented) |
| Knowledge separation (Art 17) | **PARTIAL** | ~60–65% governed; allocator scoring economy, scheduler weights, periodisation, sportLoad, liftProgression/exerciseLoad still literals |
| Confidence→authority (Art 13) | **PARTIAL** | mechanism sound; 3 consumers; low-confidence recovery/selection entries act alone |
| Provenance | **PARTIAL** | stamped everywhere; KSV bump bypassed 3×; never persisted to rows |
| Explainability (Art 14) | **PARTIAL** | D11 cohort good; build path silent; no explain()/trace; meta.validation+diagnosis unrendered |
| One capability model (Art 4/5) | **PARTIAL** | Atlas clean; `goals.js`/`strengthStandards.js` + `fitnessAge.js` still parallel models |
| Exercise identity (V12) | **CONFLICTS** | no ids on items; 10 name-regex join points; 5 set-string mutators |
| Muscle model | **CONFLICTS** | volume ledger vs `exerciseSimilarity` disagree (hip thrust, rear delts) — ledger miscounts |
| Team platform (TAS L4/L6) | **PARTIAL** | isolation strong; rollUp() missing; web computes coaching; match days invisible; schema drift |
| Monitoring loop | **PARTIAL** | EWMA ACWR sound; collects more than it uses; readiness-v2 unvalidated-but-on; late-enrichment TRIMP underestimate |

Bodybuilding-architecture residue (the original engine's fingerprints): the greedy fill +
its scoring economy; STYLE_TOP/emphasis vectors; SPORT_BLOCKS; style-keyed split; the
`sportSupport` composite scheme; `sportGymSupport/` tables (live, duplicating the SKB);
per-muscle-set-allocation as the only representable intent for build athletes (Art 4's own
named failure mode).

---

## 2. Cohort truth table (who gets which brain)

| Cohort | Diagnosis computed | Diagnosis steers plan | Explainability |
|---|---|---|---|
| run / cycle (all disciplines) | yes | **yes** (rating-based D11) | `_objective` + meta.diagnosis |
| swim | yes | **yes** (category-led D11) | full |
| triathlon | yes (tri SKB) | **yes** (rides the run gate; running-middle residue emphasis) | full, quirk undocumented |
| gaa / hurling / field hockey | **yes** | **NO** — legacy fill | **diagnosis displayed but not followed** |
| get_stronger / build_muscle / functional | **no (empty)** | no | none (no _objective, no why) |
| rugby / soccer | n/a — correctly double-gated, unselectable | — | — |
| any sport with empty D5 | yes | no (deliberate fallback) | partial |

---

## 3. Prioritised backlog (Phase 4)

> **STATUS (2026-07-06) — 25 PRs merged, `main` KSV 1.8.0.** WP-38→WP-60 shipped (#127–#142),
> then a Simon-directed second wave: **WP-46** exId identity + engine id-joins (#144/#145);
> **WP-58** governed strength-standards table + `fitnessAge` constants (#146) and the **reconcile**
> — capability anchors derived from the governed `advanced` band, one source (#150); **WP-47** D7
> block objective ADVISORY (#147) then the **deload-rhythm steer** — gated to diagnosed sport
> cohorts w/ a recoverability prior, golden byte-identical (#151); **WP-55** reflow baseline-identity
> — the neutral-day churn that dropped power work is FIXED (#148); **WP-53** engine `rollUp` pure
> port (#149) then **stage 2** — the coach board consumes it, duplicate deleted, `next build`
> verified (#152). Then completions (#154/#155): **WP-47** block-STRUCTURE steer (blockPlanToSplit
> drives the phase split, same gate, golden byte-identical bar an additive `steered` field) and
> **WP-46 done** (matchLift → PROGRESSION_LIFTS, core regex → CORE_HOLDS; governed exId maps, plans
> byte-identical; the form-guide is deliberately left pattern/alias-based). **Now 29 PRs, KSV 1.9.0.**
> D7 steering (deloads + structure) is DORMANT until recoverability priors are promoted (D16, Simon's
> call). REMAINING: WP-49 build flip (PAUSE); AI go-live; D16 prior promotion. The per-item entries
> below are the original analysis — read them with this status.

Numbering continues the Phase-3 ledger (WP-38+). Ordering per the programme's criteria:
architectural correctness > coaching reasoning > scientific validity > knowledge separation >
explainability > modularity > testing > performance > UI. Conventions unchanged: every WP ends
`npm test` green; snapshot changes only via deliberate reviewed `UPDATE=1`; frozen docs never
edited; every WP is a small revertible PR. **Merges: leave green PRs for Simon** (charter
2026-07-05).

### Priority 1 — WP-38 · Repair the assessment chain (the model reaches the diagnosis)
- **Problem:** captured athlete data (position, resistanceTrainingYears, sportYears,
  movementCompetency) never reaches D1–D3; band = self-rating; `measuredAt` never stamped so
  recency confidence is dead; non-squat 1RMs scored against the squat standard.
- **Why:** the entire diagnosis-first thesis rests on D1; today it is a well-reasoned guess fed
  by one self-rating. Assessment data collected but unused is a broken coaching contract
  (Art 16, Art 12); the squat-scale mis-score is a plain correctness bug.
- **Stages:** 38a wire stored-model fields through `profileToAthleteModel` (the proven #94/#101
  injuryHistory pattern) — position → D3 boost live, years → band; stamp `measuredAt` at
  onboarding. 38b fix the 1RM standard bug (squat-only against the squat standard; other lifts
  via per-lift standards or low-confidence skip). 38c sport-aware capability priors keyed by
  sportYears × the SKB's dominant qualities (confidence stays 'low' — still a prior).
- **Files:** `adapters/profileToAthleteModel.js`, `performance/estimation.js`,
  `data/capabilityPriors.js`, `onboardingModel.js`, `AthleteModelService.js`.
- **Dependencies:** none. **Complexity:** 38a S · 38b S · 38c M.
- **Science:** training-age from years beats self-rating (systematic self-report bias);
  specificity of adaptation for sport-experience priors; per-lift strength standards.
- **Acceptance:** positioned athlete's demand boost changes D3 output; years-driven band; the
  elite-runner probe no longer reads aerobically-novice (38c); bench-only profile no longer
  mis-scored; adapter golden master + deliberate diagnosis re-baseline (run/cycle/swim plans may
  legitimately re-rank — quality gates must stay green; build byte-identical).
- **Risks:** diagnosis re-ranking shifts D11 plans → audited re-baseline; keep 38c confidence low.

### Priority 2 — WP-39 · Validate what ships (D14 on the runtime path)
- **Problem:** only baseline `generatePlan` passes validators, with equipment-only context; the
  reflowed/injury-filtered/override-applied week ships unvalidated; substitutions injury-blind.
- **Why:** Art 19's whole argument (and the AI seam's safety harness) requires validation to
  gate every construction path; today it gates the path that least needs it.
- **What:** reflow output through `validateWeek` with `{access, injuries}`; substitution results
  checked injury-legal; report-only first (surface findings), verdict-acting behind the golden
  master later.
- **Files:** `plan/reflow.js`, `PlanService.js`, `plan/substitutions.js` (+ tests).
- **Dependencies:** none. **Complexity:** M. **Risk:** low (report-only first).
- **Acceptance:** a runtime week with a synthetic violation produces findings; zero findings
  across the reflow corpus; substitution of an injury-blocked exercise is refused/flagged.

### Priority 3 — WP-40/41 · Injury equality + id-level contraindications
- **Problem:** legacy-path injured athletes get post-filter holes (hidden items, no
  redistribution, ledger counts baseline — silent debt); contraindications keyed on name
  regexes so a rename defeats the filter AND its validator.
- **Why:** Art 8 (safety/availability first) + Art 15 (no silent debt); rehab-phase athletes
  need maintained trainable dose precisely when adherence is most fragile; the safety gate must
  be robust to catalogue evolution.
- **What:** 40 — legacy allocator consumes `ctx.contraindicatedPatterns`/`blockedNameRegexes`
  (anchor + fill pools filtered, volume redistributed to legal muscles); post-filter stays as
  backstop. 41 — **re-scoped 2026-07-06:** first land the *classification golden*
  (`tests/injury-classification-pin.js` snapshots which catalogue exercises each region×phase
  blocks; any rename/new exercise/regex edit that shifts safety classification fails CI with a
  reviewable diff) — this closes the operative silent-break risk without re-authoring clinical
  rules solo. The full id/pattern-level vocabulary migration (regexes → attribute rules per
  region×phase, dual-run equivalence) is the follow-up and needs Simon's science review of the
  re-authored rules.
- **Files:** `plan/allocator.js`, `injury/profiles.js`, `injuryRules.js`, `injuryFilter.js`,
  `session/movementRequirements.js` (retire the majority-vote regex→pattern shim).
- **Dependencies:** none (40 before 41 optional). **Complexity:** M + M. **Risk:** medium —
  runtime-only ctx keeps the pure generator untouched; goldens guard baseline.
- **Acceptance:** injured build athlete's session keeps a legal compound + redistributed dose
  (mirror of PR #75's runner guarantee); rename-an-exercise test proves no silent safety break.

### Priority 4 — WP-42 · Goal demand profiles + flip groundwork (F0; supersedes old WP-22)
- **Problem:** build goals have no demand profile (EDS D2 specifies goal-as-sport); golden
  master has zero team-sport archetypes; no calibration gate defines "recognisably hypertrophy".
- **What (all parallel, verified-unused):** governed `data/goalDemand.js` vectors
  (get_stronger → maxStrength-led with measured-lift-driven gaps; build_muscle →
  hypertrophy-led; functional → broad) consumed by `derivePerformanceModel` when primarySport
  is null — D4 output non-empty + sane, `useD11` still false for build (asserted); add
  gaa/hurling/hockey + build archetypes to the golden master; author `d11-build-quality.js`
  against CURRENT output to pin the style identity (volume distribution MEV..MRV, 6–15 rep
  mains, isolation present, ≥2×/wk frequency, differentiated days).
- **Files:** new `data/goalDemand.js`, `performance/derivePerformanceModel.js`, tests.
- **Dependencies:** WP-38 (diagnosis inputs fixed first). **Complexity:** M. **Risk:** low
  (parallel). **Note:** the demand vectors are a coaching-philosophy call — author with cited
  defaults, flag for Simon's review; nothing steers until F2 (WP-49), which pauses anyway.
- **Acceptance:** build diagnosis non-empty with honest rationale; goldens byte-identical.

### Priority 5 — WP-43 · Explainability floor for everyone
- **Problem:** build sessions carry no `_objective`; `meta.validation` + reflow provenance have
  zero consumers; SKB rule trims (up to −45–60% volume), deload defers, sport-day lightening
  and catch-up sets are invisible; GAA cohort shown a diagnosis their plan ignores.
- **What:** emit an honest style/phase-derived `_objective` on the legacy path; stamp
  `_ruleTrim {ruleIds, mult}` / `_catchUp` / lightened reasons and render them; render
  validation trims; persist provenance to session rows; **suppress `meta.diagnosis` for
  cohorts whose plan does not follow it** (display honesty) until WP-48 flips them.
- **Files:** `allocator.js` finaliseSlot, `reflow.js`, `WeekDetail.jsx`, `SessionDetail.jsx`,
  `SyncService.js`, `PlanGenerator.js`. **Dependencies:** none. **Complexity:** M. **Risk:**
  low (additive annotations; snapshot re-baseline is annotation-only, audited).
- **Acceptance:** every athlete sees a why on every session; no invisible reshaping ≥1 set;
  preview-verified.

### Priority 6 — WP-44 · Governance ratchets
- **Problem:** KSV bypassed 3× (stamps stale); authority capping decorative outside 3 sites;
  staleness warns only; readiness-v2 default-ON contradicts its own KB entry.
- **What:** hash-manifest ratchet test over `data/**` + `entries.js` keyed by
  KNOWLEDGE_SET_VERSION (bump-or-fail); route recovery/selection consumers through
  `mayScaleAlone`/floors OR re-review their confidence ratings with justification (a deliberate
  knowledge review, documented); reconcile the readiness-v2 entry with reality (validation
  readout: correlate readiness band vs same-day session quality/recovery/e1RM over history —
  dev screen first, then update the entry honestly).
- **Files:** new `tests/knowledge-set-ratchet.js`, `recovery/recovery.js`,
  `selectInterventions.js`, `entries.js`, new `indices/validation.js` readout.
- **Complexity:** S+M. **Risk:** medium where behaviour legitimately changes (goldens + review).

### Priority 7 — WP-45 · One muscle model, governed
- **Problem:** volume ledger (`PATTERN_CONTRIB`) miscredits glute-dominant hinges and rear-delt
  work vs the more accurate `exerciseSimilarity` profiles; MRV gating + diagnosis read the
  wrong ledger. **Why:** volume-landmark science is only as good as the counting model.
- **What:** fold OVERRIDES into one canonical per-exercise contribution table with provenance;
  consumed by accounting AND substitution. **Complexity:** M. **Risk:** medium — a deliberate
  correction; expect small target shifts; versioned knowledge amendment + audited re-baseline.

### Priority 8 — WP-46 · Structured items (ids + dose objects)
- **Problem:** 10 name-regex join points, 5 set-string mutators; blocks D12 personalisation and
  D16 (can't scale a string). **What:** additive `exId` + `dose {sets,reps,rpe,restSec}` on
  every item; migrate joins (injury done in WP-41); render strings at the edge.
- **Complexity:** L (mechanical, wide, stageable). **Risk:** medium; additive-first.

### Priority 9 — WP-47 · D7 block objectives from the diagnosis (sport cohorts first)
- **Problem:** block structure is a 4-enum template lookup; D5 priorities never shape
  sequencing; the EDS's "sequence conflicting limiters across blocks" has nowhere to go.
- **What:** `plan/blockObjective.js` — each block gets one dominant objective from D5 +
  season + recoverability; block length/deload rhythm from governed priors; sport cohorts
  first (goldens constrain build). **Complexity:** L. **Risk:** medium-high — design vs the
  EDS D7 contract; spec + Simon review of the coaching model before build.
  - **SPEC WRITTEN (2026-07-06):** `docs/architecture/D7-BLOCK-OBJECTIVE-SPEC.md` — the
    BlockObjective object, the diagnosis-driven coaching model, cross-block sequencing of
    deferred limiters, the D11-style gated/parallel/golden-master rollout, and §9 OPEN
    QUESTIONS that require Simon's sign-off (D6-first vs provisional strategy; sequencing
    aggressiveness; block-length + deload seed science; taper trigger; cohort order).
    **BUILD PAUSED until Simon answers §9.**

### Priority 10 — WP-48 · F1: team-sport flip (gaa/hurling/field hockey → category-led D11)
- Proven swim pattern: library↔catalogue join audit per sport, `d11-gaa-quality.js`
  (hamstring/adductor prevention present, rotational/CoD support, not posterior-chain-only,
  differentiated), CATEGORY_LED += the three ids, deliberate re-baseline. Fixes the
  diagnosis-shown-but-not-followed gap properly. **Risk:** medium-high. **PAUSE for Simon
  before the flip commit** (live plan change for the Team-package cohort).

### Priority 11 — WP-49 · F2: the build flip (old WP-23) — **PAUSE FOR SIMON**
- Prereqs: WP-38/40/42/45 + soak. Product decisions on record (flip audit §8): demand vectors;
  e1RM-driven weak-lift targeting for get_stronger; C8 rest-floor volume-vs-density trade;
  field hockey's independence; F1/F2 ordering; diagnosis-display honesty interim.

### Platform band (small, parallel, any time)
- **WP-50** team-scope `player_status` SELECT (`is_coach_of_team`) + revoke member read of
  `teams.join_code` + harness cases (S; staging-proven; prod apply batched via
  SECURITY-DEPLOY.md).
- **WP-51** reconcile `schema.sql` + migrations ledger through 20260710 (S; the fresh-bootstrap
  contract is currently false).
- **WP-52** match-day marker in the player week view (S; the plan reshapes invisibly today —
  HANDOFF's named next step).
- **WP-53** engine `rollUp()` (port `liveDerive`/`statusLogic`/`deriveTeamDirection` verbatim,
  snapshot-locked) + web renders it; stage 2: edge-function server-side derivation (fixes
  soft-field spoofing + staleness masking). (M→L)
- **WP-54** min-client-version handshake in `syncFromCloud` (S/M; the PWA stale-client incident
  + team era make this non-optional).
- **WP-55** reflow baseline-identity (neutral day = no-op; only re-allocate slots whose inputs
  changed). (M-L; behavioural, deliberate re-baseline)
  - **EVIDENCE MEASURED (2026-07-06)** — a fully-neutral-day divergence probe (nothing done,
    full readiness, on-track load, no injury, no team schedule; scratchpad/wp55-divergence-probe.js,
    run from apps/mobile) found **6/6 horizon current-week gym sessions diverge from the pure
    baseline in their CORE WORK** (primers/warm-ups excluded). This is NOT cosmetic churn — two
    classes of divergence are material coaching changes:
      • **Programmed power/plyometric work is silently dropped.** Baseline "Tue · *Lower Power*"
        carries `A-Skip / Bounding 4×4` (intent bounding_a_skip); the neutral reflow removes it and
        retitles the session "Lower". Same for soccer "Thu · *Lower Power*" → `Broad Jump 4×4`
        dropped, retitled "Full body". The reflow does not preserve the baseline session's power
        anchors OR its session *intent*.
      • **Intensity scheme changes**: soccer Bench `3×8 @RPE6` → `3×5 @RPE7 rest180` (a different
        physical quality); Box squat → Front squat.
    ROOT (observed, not yet fully traced): the reflow re-derives each horizon slot through its OWN
    per-slot `allocateGym` path (targets from `distributeAcrossSlots`, intent from
    `intentOfTitle(phase.title)`, anchors from `resolveSplit`) — which does not reproduce the
    baseline PlanGenerator's session composition even when every runtime input is neutral. So the
    current week the athlete trains ≠ the plan the rest of the horizon shows, with nothing changed.
    **DESIGN QUESTION FOR SIMON (gates the build):** on a neutral day, should the reflow *clone the
    baseline session verbatim* and only apply the volume/RPE multipliers (guaranteeing identity when
    mult=1, rpeOffset=0, deficit=0), rather than re-allocate from scratch? That is the cleanest fix
    and preserves power/plyo anchors — but it's a core-path change with a deliberate golden
    re-baseline, and it changes live current-week output for every athlete. **PAUSE for Simon.**
- **WP-56** dead-code + stale-comment sweep: scheduler doubles/long-run machinery,
  `intensityModifier` shape-compat, always-null `recentRecovery`, `planned: 0` consistency
  input, stale headers (sessionSpecs/exerciseQualities/reflow/enrich-sessions), `Readiness.logs`
  param. (S)
- **WP-57** single-source ACWR display bands from the KB (trainingStore + teamStatus mirror the
  entry by hand today). (S)
- **WP-58** retire the parallel capability models: unify `strengthStandards.js`/`goals.js`
  banding with D1's standards table (one strength verdict); move `fitnessAge` model constants
  to governed knowledge. (M)
- **WP-59** smallest honest D16 loop: block-end observed-vs-expected check per D5 priority
  (e1RM slope / recovery trend) writing ONE low-confidence `volumeTolerance` prior through the
  existing typed seam; plus the EDS FR5 falsifiability readout. (M; additive)

### Explicitly NOT in scope (stop-lines, per Art 20)
Full D16 population learning; the AI layer; endurance-session programming; native app;
rugby/soccer SKB authoring (needs SME); extending the 10-quality vocabulary (the category-led
pattern handles it — revisit only if F1 proves otherwise).

---

## 4. Sequencing

WP-38 → WP-39 → WP-40/41 → WP-42 → WP-43 → WP-44 … with the platform band interleaved as
small PRs. Pauses: WP-48 flip commit, WP-49 entirely, WP-47 design. Everything else is
autonomous per the standing charter (green low/medium-risk PRs; Simon merges).
