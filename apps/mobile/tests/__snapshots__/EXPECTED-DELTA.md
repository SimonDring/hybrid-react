# Expected-delta log

The TR-01 recurrence guard (13-VALIDATION-STRATEGY.md §2.3; enforced by
`apps/mobile/tests/snapshot-note-guard.mjs`, wired into CI). TR-01 was a real
behaviour regression re-baselined into the goldens unnoticed — a re-baseline
without a reviewed note is exactly the failure mode this file exists to catch.

**Rule:** any commit/PR that changes a file under `apps/mobile/tests/__snapshots__/`
(the golden master, the injury-classification pin, or the knowledge-set
manifest) must EITHER append an entry below in the SAME diff, OR carry a line
starting `EXPECTED-DELTA:` in its commit message. The guard fails the build if
neither is present.

**Entry shape** (one per re-baseline, newest first):

```
## YYYY-MM-DD — <short description / PR or commit ref>
- Changed archetypes: <list, or "none — new keys only">
- Added archetypes: <list, or "none">
- Keys that moved, per archetype: <e.g. "meta.provenance.engineVersion; phases[0].weeks[0].sessions[1].items">
- Why: <the behaviour change's design source — a WP/PR/spec citation>
- Claim: no other archetype moved (audited key-by-key against this note)
```

---

## 2026-07-16 — Phase 3 M6(a) governance sweep, closure §3 ROW 7b (engineSport cohort facts; KSV 1.38.0 → 1.39.0)
- Changed archetypes (content): **none.** No plan changed.
- Added archetypes: none.
- Keys that moved, per archetype: `meta.provenance.knowledgeSetVersion` ONLY (1.38.0 → 1.39.0),
  every archetype. Non-stamp diff empty (verified). Manifest re-baselined to 1.39.0 (43 files).
- Why: the two remaining sport-fact code Sets are now derived from authored binding flags —
  `D11_SPORTS` (run, cycle) from `sportEngineBinding.js` `d11Steered`, `SSC_SPORTS` (run) from
  `sscScreened` (closure §3 row 7b; C3 / Art 17). Membership UNCHANGED — asserted directly
  (D11 == {run, cycle}, SSC == {run}). Row 7 now complete.
- Claim: no archetype content moved — stamp-only, audited key-by-key.

## 2026-07-16 — Phase 3 M6(a) governance sweep, closure §3 ROW 7 (category-led cohort fact; KSV 1.37.0 → 1.38.0)
- Changed archetypes (content): **none.** No plan changed.
- Added archetypes: none.
- Keys that moved, per archetype: `meta.provenance.knowledgeSetVersion` ONLY (1.37.0 → 1.38.0),
  every archetype. Non-stamp diff empty (verified). Manifest re-baselined to 1.38.0 over 43 files
  (7 SKB JSON profiles gained `meta.cohorts.categoryLed`).
- Why: the category-led sport membership (swimming, hurling, gaelic_football, field_hockey, soccer,
  rugby, triathlon) became an authored SKB fact; `categoryCoverage.js` now derives `CATEGORY_LED`
  from the SKB instead of a hardcoded Set (closure §3 row 7; C3 / Art 17). Membership is UNCHANGED —
  verified the derived set equals the original 7 exactly (the 4 rating-based sports carry no flag).
- Claim: no archetype content moved — stamp-only, audited key-by-key.

## 2026-07-16 — Phase 3 M6(a) governance sweep, closure §3 ROWS 11 + 6 (KSV 1.36.0 → 1.37.0)
- Changed archetypes (content): **none.** No plan changed.
- Added archetypes: none.
- Keys that moved, per archetype: `meta.provenance.knowledgeSetVersion` ONLY (1.36.0 → 1.37.0),
  every archetype. Full per-archetype diff confirms the only changed line is the stamp.
  `knowledge-set-manifest.json` re-baselined to 1.37.0 over 43 files (+1: new `data/reflowEffects.js`).
- Why: ROW 11 — the runtime reflow's load-response effect magnitudes relocated VERBATIM from
  `lib/sportKnowledge/reflowAdjust.js` → governed `data/reflowEffects.js`. ROW 6 — the v2 readiness
  weights + capacityModulation now read from the governed KB entry `index.readiness.weights` (single
  operative source; retires the decorative code copy). Both feed the RUNTIME readiness/reflow band,
  not the baseline plan, so no golden content moves; row 11 bumps KSV (new governed data file), row 6
  is lib-only. All values unchanged.
- Claim: no archetype content moved — stamp-only, audited key-by-key.

## 2026-07-16 — Phase 3 M6(a) governance sweep, closure §3 ROW 10: season-phase cut-points → governed knowledge (KSV 1.35.0 → 1.36.0)
- Changed archetypes (content): **none.** No plan changed.
- Added archetypes: none.
- Keys that moved, per archetype: `meta.provenance.knowledgeSetVersion` ONLY (1.35.0 → 1.36.0),
  on every archetype. Verified by a full per-archetype diff: the ONLY changed lines in
  `engine-golden-master.json` are `knowledgeSetVersion` (empty non-stamp diff confirmed).
  `knowledge-set-manifest.json` re-baselined to 1.36.0 over 42 files.
- Why: the season-phase detection cut-points (`{in:56, pre:120}` days-to-event) were relocated
  VERBATIM from `lib/plan/periodization.js` into the governed `data/periodizationDefaults.js`
  (`SEASON_PHASE_CUTOFF_DAYS`) — commitment C3 / Art 17, closure §3 row 10 (M6 §3(a) governance
  sweep). The numeric values are unchanged, so the plan is byte-identical; only the knowledge-set
  version bumps because a governed data table gained an entry (ratchet).
- Claim: no other archetype content moved — audited key-by-key against this note (stamp-only).

## 2026-07-15 — Phase 3 M2 T5: progression extended to SPORTS gym-support (season-shaped; off-season builds, in-season maintains)
- Changed archetypes (content): the 17 OFF-SEASON sport archetypes only —
  `sport·run-sprint·intermediate·off·4d`, `sport·run-middle·intermediate·off·4d`,
  `sport·run-long·intermediate·off·4d`, `sport·cycle·intermediate·off·3d`,
  `sport·swim·intermediate·off·3d`, `sport·triathlon·intermediate·off·3d`,
  `sport·hurling·intermediate·off·3d`, `sport·field_hockey·advanced·off·4d`,
  `sport·soccer·intermediate·off·3d`, `sport·rugby·advanced·off·4d`,
  `sport·gaa-codeless·intermediate·off·3d(legacy)`,
  `sport·rugby·advanced·off·4d·{armed-d7-low,armed-d7-high,position-outside-backs}`,
  `sport·soccer·intermediate·off·3d·position-goalkeeper`, and the two zero-gap
  recreational-off cohorts `sport·run-middle·advanced·zero-gap`,
  `sport·cycle·advanced·zero-gap`. Every other archetype (28 total) is BYTE-IDENTICAL
  bar the version stamp — verified by a full recursive per-archetype key diff excluding
  `knowledgeSetVersion` (run ad hoc against the committed snapshot BEFORE re-baselining):
  17 real content diffs, 28 stamp-only. 17 + 28 = 45 (the full matrix).
- **Deliberately NOT moved — the maintenance ceiling (season conservatism, 07-PROGRESSION
  §2.6; Constitution Art 2):** every PRE-SEASON, IN-SEASON, and TRANSITION sport archetype
  is stamp-only — `sport·run-sprint·advanced·in·4d(taper)`, `sport·run-long·intermediate·pre·3d`,
  `sport·cycle·intermediate·in·2d`, `sport·cycle·intermediate·transition·3d`,
  `sport·swim·advanced·in·3d`, `sport·gaelic_football·intermediate·in·3d`. These hold
  capability rather than chase gym PRs (holding under rising sport load IS the progression),
  so creep is suppressed and their plans are unchanged — confirmed content-identical in the
  same audit. All 15 build archetypes (strength/powerlifting/hypertrophy/functional/olympic),
  the measured pair, the PL non-logging progressor, and all 7 `injured·*` (no stamp at all)
  are likewise stamp-only.
- Added archetypes: none.
- Keys that moved (off-season sports only): `meta.provenance.knowledgeSetVersion`
  (1.34.0 → 1.35.0 — moves on every provenance-bearing archetype); AND, on the 17
  off-season sport archetypes only, `phases[].weeks[].sessions[].items[]` — loadable
  gym-support compounds (squats/hinges/presses) gain a progressive `.weight` (LOAD creep
  within a block at the sport gym-support rate, 0.75%/completed working week — HALF
  powerlifting's 1.5%), a `.warmupRamp` (the generic 3-step ramp — maxStrength adaptation,
  no per-adaptation override), and `.estimated`/`.progression` fields; accessories double-
  progress reps (unchanged in shape from T2's mechanism). All movement is PROGRESSIVE within
  a block (deload weeks correctly do not creep).
- Why: Phase 3 M2 T5 (docs/superpowers/plans/2026-07-15-phase3-m2-progression.md; spec §2/§7;
  07-PROGRESSION §2.5/§2.6) — extends T2's estimator-driven creep to sport gym-support cohorts.
  A sport's gym work SUPPORTS the sport, so progression is SEASON-shaped: the SKB seasonalModel
  already shapes the baseline plan; creep advances the gym strength work only WITHIN the phase
  the baseline chose, and only in the off-season (governed `progression.sport_support.creepSeasons`).
  Critically, the season is read off `program.season` (profile-derived, deterministic — NOT live
  state) identically in the baseline and the reflow's re-derivation, so NO season/calendar effect
  leaks into a neutral reflow — the M0 reflow≡baseline hard invariant stays intact
  (`packages/engine/tests/prop-reflow-baseline.test.mjs` still hard-passes, incl. the off-season
  recreational-cycle profile that now creeps in baseline yet reproduces byte-identically under a
  neutral reflow). No new mechanism: the allocator maps `style==='sport'` → the synthetic
  `'sportSupport'` creep discipline. Governed by 1 new knowledge entry
  (`progression.sport_support`). KNOWLEDGE_SET_VERSION 1.34.0 → 1.35.0.
- Claim: no other archetype moved (audited key-by-key against this note — the 28 non-off-season
  archetypes differ ONLY on the knowledgeSetVersion stamp line or not at all; verified by a full
  recursive per-archetype key diff excluding that field, not eyeballing).

## 2026-07-15 — Phase 3 M2 T4: progression extended to OLYMPIC (intensity-led load-creep + finer ramp)
- Changed archetypes (content): the 1 OLYMPIC-discipline archetype only —
  `build·olympic·advanced·4d`. Every other archetype (44 total: all `build·strength·*` +
  `build·powerlifting·advanced·4d`, the 6 hypertrophy-discipline archetypes, the measured
  pair, the PL non-logging progressor, and all 23 `sport·*` archetypes; the 7 `injured·*`
  archetypes carry no provenance stamp at all) is BYTE-IDENTICAL bar the version stamp —
  verified by a full recursive key diff excluding `knowledgeSetVersion` (script run
  ad hoc against the committed snapshot before re-baselining): 44 stamp-only, 1 real
  content diff. 1 + 44 = 45 (the full matrix).
- Added archetypes: none.
- Keys that moved (olympic only): `meta.provenance.knowledgeSetVersion` (1.33.0 → 1.34.0
  — moves on every archetype with a provenance stamp); AND, on `build·olympic·advanced·4d`
  only, `phases[].weeks[].sessions[].items[]` — the classic lifts and their loadable
  derivatives (Snatch, Power Snatch, Clean and Jerk, Split Jerk, Overhead Squat, Hang
  Clean, Power Clean) gain a `.weight` (progressive LOAD creep within a block, at
  explosiveStrength's own governed 1.0%/wk rate — deliberately slower than powerlifting's
  1.5%), a `.warmupRamp` (4 steps — the new PER-ADAPTATION explosiveStrength override,
  finer than the generic 3-step ramp), and `.estimated`/`.progression` fields; accessories
  (Broad Jump, Kettlebell swing, pulling accessories) double-progress reps, unchanged in
  shape from T2/T3's mechanism.
- **Prerequisite fix discovered + closed in the same task** (in scope: additive, and
  provably scoped to olympic only): `packages/engine/src/lib/strength/exerciseLoad.js`'s
  weight-anchor table had NO entry for `pattern:'olympic'` exercises (snatch,
  clean_and_jerk, power_snatch, hang_snatch, split_jerk) — they shipped with `weight:
  undefined`, so there was nothing for the new creep/ramp model to advance or ramp from.
  Added conservative %-of-back-squat anchor coefficients (OVERRIDE entries, same
  convention as the pre-existing `hang_clean`/`power_clean` rows). These exercises are
  `discipline:'olympic'`-gated (`selectInterventions.js`/`allocator.js`: `if (ex.discipline
  && ex.discipline !== discipline) continue;`), so ONLY the olympic archetype can be
  affected — confirmed by the same full audit above (0 other archetypes moved).
- Why: Phase 3 M2 T4 (docs/superpowers/plans/2026-07-15-phase3-m2-progression.md; spec
  §2/§7; 07-PROGRESSION §2.1/§2.2) — extends T2/T3's estimator-driven creep mechanism to
  olympic: intensity-led like powerlifting (load-creep, not T3's reps-first model — the
  classic lifts have a real near-maximal single/double to advance and ramp toward), with a
  FINER warm-up ramp because this is precisely where SR-10 (no cold near-maximal single off
  an activation-only primer) matters most. Governed by 2 edited knowledge entries
  (`progression.estimator_creep` gains an `explosiveStrength` rate;
  `progression.warmup_ramp` gains a `byAdaptation.explosiveStrength` override) — no new
  entries, no new mechanism. `CREEP_DISCIPLINES` gains `'olympic'`.
  KNOWLEDGE_SET_VERSION 1.33.0 → 1.34.0.
- Claim: no other archetype moved (audited key-by-key against this note — the 44 other
  provenance-bearing/no-stamp archetypes differ ONLY on the knowledgeSetVersion stamp line
  or not at all; verified by a full recursive per-archetype key diff, not eyeballing).

## 2026-07-15 — Phase 3 M2 T3: progression extended to HYPERTROPHY (reps-first double progression)
- Changed archetypes (content): the 6 HYPERTROPHY-discipline archetypes only —
  `build·bodybuilding·intermediate·4d·60·full`, `build·bodybuilding·advanced·6d·75·full`,
  `build·functional·intermediate·3d·45·dumbbell`, `build·functional·beginner·3d·20·bodyweight(edge)`,
  `build·functional·advanced·7d·60·bodyweight(edge)`, `build·hypertrophy·intermediate·5d`
  (bodybuilding AND functional strengthStyle both resolve to the hypertrophy discipline —
  `data/disciplines/index.js#STYLE_TO_DISCIPLINE`, unchanged from WP-49 T6). Every other
  provenance-bearing archetype (32 total: the 5 powerlifting-discipline `build·strength·*` +
  `build·powerlifting·advanced·4d`, `build·olympic·advanced·4d`, the measured pair, the PL
  non-logging progressor, and all 23 `sport·*` archetypes) is BYTE-IDENTICAL bar the version
  stamp. The 7 `injured·*` archetypes are untouched (their output is a bare week object with
  no provenance stamp at all — unaffected either way). 6 + 32 + 7 = 45 (the full matrix).
- Added archetypes: none.
- Keys that moved, per archetype (hypertrophy only): `meta.provenance.knowledgeSetVersion`
  (1.32.0 → 1.33.0 — moves on every archetype that carries a provenance stamp); AND, on the
  6 hypertrophy archetypes only, `phases[].weeks[].sessions[].items[].sets` (reps climb on
  BOTH primary and accessory working items — reps-first double progression), plus the new
  `.estimated` / `.progression` fields on crept items. Verified empirically (0 diff lines):
  NO `.weight` field ever moves and NO `.warmupRamp` field is ever added on these 6
  archetypes — hypertrophy's model is reps-only this task (🔒 1 conservative; no near-
  maximal single to ramp toward, unlike powerlifting).
- Why: Phase 3 M2 T3 (docs/superpowers/plans/2026-07-15-phase3-m2-progression.md; spec §2/§7;
  07-PROGRESSION §2.2) — extends T2's estimator-driven creep mechanism to hypertrophy: no new
  machinery, hypertrophy's PRIMARY role is routed through the SAME double-progression path T2
  built for accessories (governed by the new `progression.reps_first_model` entry), because
  hypertrophy's rep-range emphasis has no near-maximal single to load-creep/ramp toward the
  way powerlifting's compounds do. KNOWLEDGE_SET_VERSION 1.32.0 → 1.33.0 (one new entry).
- Claim: no other archetype moved (audited key-by-key against this note — a full walk of every
  changed leaf path, per archetype, confirms zero `.weight`/`.warmupRamp` changes on the 6 that
  moved, and the remaining 36 provenance-bearing archetypes differ ONLY on the
  knowledgeSetVersion stamp line).

## 2026-07-15 — Phase 3 M2 T2: progression core — estimator-driven creep, POWERLIFTING only
- Changed archetypes (content): the 15 POWERLIFTING-discipline archetypes only —
  `build·strength·{beginner·3d,intermediate·4d,intermediate·1d,advanced·5d}`,
  `build·powerlifting·advanced·4d`, `measured·strength·{prior,measured}`,
  `progression·strength·intermediate·5d·full·nonlogging`, and the 7 `injured·*`
  archetypes (all strength-style build → powerlifting discipline). Every genuinely
  non-PL archetype (all `build·bodybuilding·*`, `build·functional·*`,
  `build·hypertrophy·*`, `build·olympic·*`, and ALL `sport·*` — 30 in total) is
  BYTE-IDENTICAL bar the version stamp.
- Added archetypes: none.
- Keys that moved, per archetype (PL only): `meta.provenance.knowledgeSetVersion`
  (1.31.0 → 1.32.0 — moves on ALL 45); AND, on the PL 15 only,
  `phases[].weeks[].sessions[].items[]` — primary compound `.weight` (progressive
  LOAD creep within each block), accessory `.sets` (double-progression rep climb),
  and the new `.estimated` / `.progression` / `.warmupRamp` fields on crept items.
  All movement is PROGRESSIVE (load up within a block; no within-block regression —
  the deload week correctly drops and does not creep).
- Why: Phase 3 M2 T2 (docs/superpowers/plans/2026-07-15-phase3-m2-progression.md;
  spec §2/§7; 07-PROGRESSION §1–§2) — estimator-driven creep closes SR-01/G9 (the
  non-logging athlete finally overloads) + SR-10 (programmed warm-up ramps). Gated to
  the powerlifting discipline (hypertrophy/olympic/sports are T3–T5). Governed by three
  new knowledge entries (progression.estimator_creep / .double_progression /
  .warmup_ramp), KNOWLEDGE_SET_VERSION 1.31.0 → 1.32.0.
- Claim: no other archetype moved (audited key-by-key against this note — the 30 non-PL
  archetypes differ ONLY on the knowledgeSetVersion stamp line; verified by a per-line
  diff excluding that line).

## 2026-07-15 — M2a review fixes
EXPECTED-DELTA: 39 crept archetypes — driver/progression LABEL string only (honesty reword: "completion-gated" -> "forward-projected; completion-gated when logged history is present"). ZERO numeric/structural change (verified: 0 archetypes differ once the label is scrubbed). No KSV change (logic string, not a science table).

## 2026-07-15 — M3a T1 measured strength estimator
EXPECTED-DELTA: 4 lift-bearing archetypes (build·strength·intermediate, measured·strength measured-twin, build·olympic·advanced, sport·run-sprint·advanced) each gain a "Measured — displaces <prior>" D4 rationale line when logged lifts yield a measured maxStrength estimate. NO magnitude/priority/plan change for these 4 (measured estimate landed within the prior priority set). ALL no-lift archetypes byte-identical (additive-first). No KSV change (reuses existing STRENGTH_STANDARDS).

## 2026-07-15 — M3a T2 silent-list burn-down
EXPECTED-DELTA: additive field only — plan.meta.diagnosis.droppedDemands (with plain-language reasons) now surfaced for sport archetypes (was computed but never reached the plan). [] for build/no-sport. Verified: stripping droppedDemands from both snapshots = zero other diffs across all 45 archetypes. No plan/magnitude/priority change.

## 2026-07-16 — M5-L1 TR-05 source-gate (schema-default prior must not arm D7)
EXPECTED-DELTA: ADDED archetypes: 1 — `sport·rugby·advanced·off·4d·schema-default-prior`
(45 → 46). It carries the createAthleteModel schema DEFAULT
(learnedPriors.recoveryRate {value:1, source:'population'}) and is BYTE-IDENTICAL to the
no-model rugby·advanced·off·4d plan (population deload rhythm, D7 steer OFF) — proven directly
in packages/engine/tests/tr05-source-gate.test.mjs.
- Changed archetypes (content): NONE. The source-gate at PlanGenerator.js:213 now arms the D7
  deload steer ONLY when learnedPriors.recoveryRate.source === 'learned'. No EXISTING fixture
  carries a source:'population' recoveryRate in profile.athlete_model, so nothing moved:
  the two `armed-d7-{low,high}` fixtures were already source:'learned' → still arm, byte-identical;
  the `position-*` fixtures carry no learnedPriors → unarmed both ways; every no-model archetype
  → null both ways. Verified: golden compare flagged ONLY the one new key (no mismatch on any of
  the 45 existing).
- Why: TR-05 (audit 06) hard rule — a schema-default/unlearned prior must never arm a learned
  steer. createAthleteModel seeds source:'population' on every real onboarded user; gating on
  `value != null` alone armed that default off ZERO learning (a live additive-first defect for
  real users, hidden because goldens carry no athlete_model). M5-L1 deliverable (spec §2).
- No KSV/engine-version change (arming-condition fix; no science table, no plan-shape change for
  any snapshotted archetype). Regression guard: tr05-source-gate.test.mjs.
