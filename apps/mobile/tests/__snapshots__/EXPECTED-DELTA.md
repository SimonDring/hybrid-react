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
