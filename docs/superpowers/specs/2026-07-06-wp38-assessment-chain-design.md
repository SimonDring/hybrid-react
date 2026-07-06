# WP-38 — Repair the assessment chain (design)

**Date:** 2026-07-06 · **Backlog:** REASSESSMENT-2026-07-05 Priority 1 · **Risk:** low/medium
**Frozen-set anchors:** Constitution Art 12 (evidence), Art 16 (become more personal), Art 17
(knowledge separate); EDS D1 (assess: "high if measured, low if inferred"), D3 (position
refinement), Ontology Athlete→Sport→Demands→Ability.

## Problem (from the 2026-07-05 reassessment, code-verified)

1. Onboarding captures `position`, `resistanceTrainingYears`, `sportYears` and persists them at
   `users.profile.athlete_model`, but every live diagnosis path re-derives the model via
   `profileToAthleteModel(profile)`, which reads only `selfRatedLevel` + `injuryHistory` from
   the stored model. D1's band rests on a self-rating; D3 (position boost) is unreachable.
2. Capability priors are flat per quality and keyed to GYM training age: a lifelong competitive
   runner is estimated `aerobicCapacity = 0.25 (novice)` against demand ~1.0 — the diagnosis
   names their strongest quality as their top limiter.
3. `measuredMaxStrength` scores ANY first 1RM metric against the **squat** standard
   (`estimation.js:27`) — a bench-only athlete is materially under-scored. `measuredAt` is
   never stamped, so recency-based confidence is dead code.

## Design

**38a — thread the stored model (the #94/#101 pattern: the dual-written model rides the
profile, the adapter maps it, every read path benefits).**
- `profileToAthleteModel` reads `p.athlete_model` for: `sportingContext.position`,
  `trainingHistory.resistanceTrainingYears`, `trainingHistory.sportYears`.
- `answersToAthleteModelInputs` stamps `measuredAt = asOf` on onboarding 1RM metrics (they are
  reported as *current* at onboarding). The adapter carries a stored metric's `measuredAt`
  **only when its value matches `p.lifts`** (changed value ⇒ re-measured at unknown date ⇒
  null — honest). Recency→confidence (30/180d) activates as designed; a stale self-report
  decays to low confidence.
- No adapter change for profiles without `athlete_model` ⇒ adapter golden master and both plan
  snapshots byte-identical by construction (synthetic test profiles carry no stored model).
- Fix the false `PlanGenerator.js` comment ("PlanService passes the stored athlete model").
- NOT wired (no consumer exists; recorded): `movementCompetency`, `sessionDurationMin`.

**38b — per-lift strength standards.**
- Replace the single squat multiple with a per-lift "strong" table (1RM/BW at level 1.0),
  provenance-annotated (strengthlevel.com population percentiles; consistent with the app's
  existing `strengthStandards.js` bands):
  squat 2.0/1.5/1.8 · deadlift 2.5/1.9/2.2 · bench 1.5/1.0/1.25 · ohp 1.0/0.7/0.85 (m/f/other).
- Level = mean of per-lift clamped levels across measured barbell lifts (a single maxStrength
  scalar should reflect overall demonstrated strength, not the best lift). `1rm_pull` (reps,
  not load) is excluded from maxStrength scoring.
- Confidence from the most recent `measuredAt` among used lifts; evidence names the lifts.

**38c — sport-experience priors (fixes the elite-runner misdiagnosis).**
- Specificity principle: years of sport participation is a strong prior on the sport's
  *dominant* qualities. In `capabilityPriors.js` (Domain-1 data, provenance header):
  `SPORT_EXPERIENCE = { dominantImportanceMin: 0.7, base: {novice: .35, intermediate: .55,
  advanced: .75, highlyAdvanced: .88} }`.
- `derivePerformanceModel` computes the demand profile FIRST and passes it to
  `estimateCapability(q, model, asOf, demandProfile)`. For an unmeasured quality whose demand
  importance ≥ min and `sportYears` band exists: prior level = max(gym-band prior, sport
  base); evidence = `sport-experience prior (<sport>, <band>)`; **confidence stays 'low'** —
  it is still a prior, never a gate (Art 13).
- Effect: the diagnosis stops naming the sport's own dominant engine as the limiter and
  re-ranks toward the gym-trainable gaps — consistent with the CARDIO_GYM_SUPPORT philosophy.
- `KNOWLEDGE_SET_VERSION` 1.1.0 → 1.2.0 (science-data change; the discipline WP-44 will
  ratchet). Deliberate provenance-only golden re-baseline expected; any content movement must
  be nil (no synthetic profile carries a stored model or sportYears).

## Acceptance

1. Profile + stored model {position, years} ⇒ model carries them; without ⇒ output unchanged.
2. Hurler with a position ⇒ demand profile shows the position boost (D3 live end-to-end).
3. selfRated 'intermediate' + stored 6 years ⇒ band `highlyAdvanced` drives priors AND D4
   trainability.
4. Bench-only male 100kg@82 ⇒ level ≈ 0.81 (bench standard), not 0.61 (squat standard);
   pull-only ⇒ inferred (no measured path); multi-lift ⇒ mean.
5. Onboarding-built model metrics carry `measuredAt = asOf`; adapter carries it on value
   match; drops it on mismatch.
6. Runner with `sportYears: 15` ⇒ aerobicCapacity prior ≥ 0.85, evidence names the sport
   prior, confidence 'low'; the D4 top limiter is no longer aerobicCapacity.
7. Full suite green; goldens/build-parity/adapter-GM byte-identical except the audited
   provenance version bump.

## Risks
- Diagnosis re-ranking for real (stored-model) users changes their next generated plan — this
  is the intended correction; quality gates constrain the direction.
- Mean-of-lifts changes maxStrength for multi-lift profiles vs squat-only. The one golden
  sport archetype with lifts clamps to 1.0 under both models (verified) — no movement.
- The sport-prior base values are seed science (confidence low, provenance-tagged) — flagged
  for Simon's review in the PR; refined later by D16 learning.
