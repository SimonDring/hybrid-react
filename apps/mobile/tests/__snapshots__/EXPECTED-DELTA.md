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
