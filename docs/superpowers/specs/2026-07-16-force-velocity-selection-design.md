# Force-velocity-aware selection — design spec

**Status: DESIGN SPEC — for Simon · 2026-07-16 · no code**
**Context: the genuine selection refinement identified in `docs/design/m6/D6-FLIP-DESIGN.md` §4.
Selection scores by quality-tag match but IGNORES force-velocity, though the data exists on both
sides. This teaches selection to prefer, within a quality's exercises, the ones whose force-velocity
profile best matches the target — a real plan improvement. It MOVES plans → flag-gated default-OFF,
science-caveated (the maps are seed), audited re-baseline, Simon's coaching sign-off. This is a
SELECTION (M-SESS) refinement, NOT a D6 flip.**

## 1. The gap (evidence)

- **Selection ignores force-velocity.** `selectInterventions.valueOf` scores an exercise by
  quality-tag match (`trainsTarget`) ÷ fatigue, OR the SKB transfer rating — nothing else. So within
  a quality, a grinding maximal-force lift and a speed-biased one score identically on the quality
  axis, even when the target quality wants one specifically.
- **The data to fix it already exists, unused:**
  - each exercise carries a `forceVelocity` (`exerciseQualities(exId).forceVelocity` — via its
    movement class: squat/hinge → `maximal-force`, a jump → `ballistic`, etc.);
  - each quality carries its ideal `forceVelocity` (`QUALITY_MOVEMENT[quality].forceVelocity` —
    maxStrength → `maximal-force`, explosiveStrength → speed-biased, reactiveStrength → `ballistic`);
  - both draw from the same `FORCE_VELOCITY` vocabulary (`maximal-force → strength-speed →
    speed-strength → ballistic`, plus off-continuum `controlled-hypertrophy`/`endurance`/`isometric`/
    `mobility`).
- Selection already imports `exerciseQualities` (for `trainsTarget` + `fatigueCost`) — it just never
  reads the `.forceVelocity` field.

## 2. The refinement

Add a **force-velocity-match term** to `valueOf`: within a quality's candidates, nudge the score
toward exercises whose `forceVelocity` matches the target quality's required `forceVelocity`.

- **Match function** — an ordinal distance on the force→velocity continuum
  (`maximal-force`=0, `strength-speed`=1, `speed-strength`=2, `ballistic`=3). `match = 1 −
  |posEx − posTarget| / span`, clamped ≥0; off-continuum classes (hypertrophy/endurance/iso/mobility)
  match only exactly (they are their own quality's home, already handled by the quality tag). Missing
  either side → neutral (no nudge), never a penalty (additive-first for un-tagged exercises).
- **Weight** — a new governed `selection.forceVelocityWeight` (KA Domain 6, `data/selectionScoring.js`),
  a SMALL soft nudge: `value *= (1 + forceVelocityWeight × (match − 0.5))` so a perfect match lifts
  and a poor match damps, bounded. Weight authored conservatively (≈0.15) — it re-orders *within* a
  quality, it never lets a wrong-quality exercise win (Art 13 — a low-confidence seed steers at soft
  input at most).
- **Confidence** — LOW. Both `QUALITY_MOVEMENT` and `exerciseQualities.forceVelocity` are `seed` /
  `needsReview`; this refinement's authority is capped accordingly (Art 13). It is a nudge, not a
  gate; it is surfaced in the pick rationale (Art 14 — the athlete can see *why* the speed-biased
  variant was chosen).

## 3. Flag-gating + byte-identity

- **`ctx.forceVelocityAware`, default OFF.** With the flag off — every existing athlete — the term is
  not applied → selection is **byte-identical** (goldens unchanged). The pure generator passes the
  flag off.
- Turning it ON is a **scoped, audited re-baseline**: only archetypes where a quality's force-velocity
  discriminates between otherwise-tied candidates move. Expected movers: **explosive / reactive /
  power-priority cohorts** (where speed-biased variants exist and should be preferred); most
  maxStrength/hypertrophy cohorts are unchanged (their candidates already sit at the target
  force-velocity). The audit run reports the exact per-archetype deltas for review before the flag
  default flips.
- **Rollback** — flip the flag off; byte-identical behaviour returns.

## 4. Build shape (two steps, each its own PR)

1. **The mechanism, flag-OFF (byte-identical):** the `forceVelocityWeight` governed value + the
   match term in `valueOf`, gated on `ctx.forceVelocityAware` (default false). Goldens byte-identical
   (bar the KSV stamp for the new weight). A fixture test proves the match function + that flag-off is
   a no-op. **This can land now** — it's byte-identical and adds the capability dormant.
2. **The flip (behaviour change, Simon-gated):** flip the flag default ON for a scoped cohort,
   with the audited per-archetype delta report + expected-delta re-baseline + **your coaching
   sign-off** that each move is a sharpening, not a regression. Only after the seed maps get a
   confidence-raising science pass would the weight climb from its conservative floor.

## 5. Rules

- Additive-first: no force-velocity tag on either side ⇒ no nudge ⇒ byte-identical.
- Soft input only (Art 13): never overrides the quality match; a wrong-quality exercise can never win.
- Explainable (Art 14): the force-velocity match is named in the pick rationale.
- Flag-gated default-OFF; the flip is a separate, audited, Simon-signed step.
- `npm test` + `test:engine` + `lint` green; step 1 byte-identical bar the KSV stamp.

## 6. Out of scope

The `contraction` axis (`grinding`/`fast-ssc`) — a second, similar nudge, deferred until force-velocity
proves out. Raising the movement-map confidence (the science pass that would let the weight grow).
Any D6 change — this is M-SESS selection, self-contained.
