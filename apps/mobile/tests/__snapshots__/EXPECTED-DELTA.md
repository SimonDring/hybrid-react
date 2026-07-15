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
