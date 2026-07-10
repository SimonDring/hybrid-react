# Olympic classic-lift dosing fix — design

**Date:** 2026-07-10 · **Status:** approved for build (autonomous, continues the
2026-07-09 governance sprint's roadmap item I1; finding W2 in
`docs/reviews/2026-07-09-decision-engine-review.md`)

## The defect

`makeItem` (packages/engine/src/lib/plan/allocator.js) returns the flat
`POWER_DOSE` (4 × 4 @ RPE 7, "move fast, stop if speed drops", 150 s) for ANY
exercise with `quality: 'power'`, **before** the role branches that would apply
the slot's discipline scheme. The ten `discipline: 'olympic'` catalogue lifts
(snatch, clean & jerk, power/hang snatch, split jerk, overhead squat, push
press, snatch/clean pulls, muscle snatch) all carry `quality: 'power'` — so an
Olympic weightlifter's competition lifts ship as 4 × 4, and the discipline's
own `doseCharacter` (mains 1–3 reps @ RPE 7–8, 180 s; accessories 3–6 @ 120 s)
plus the `explosiveStrength` scheme (4×3 base → 5×3 build → 4×2 peak) never
reach them. Nobody programs a snatch for fours.

The same `quality === 'power'` conflation makes three sibling code paths treat
classic lifts as plyometrics: `roleSetCount` budgets them as POWER_SETS, the
session **foot-contact ceiling** counts a snatch as 16 jump contacts (and can
*skip* olympic lifts once the "contact budget" is spent), and the scheme-rest
lookup excludes them from the discipline's 180 s rest.

## Why the fix is safe to scope to the olympic cohort

Every selection path filters discipline-tagged exercises to the active
discipline (`selectInterventions.js:97`, allocator `bestExercise:439`, item
filter `:554`, anchor candidate filters `:773/:789`) — a `discipline:
'olympic'` lift can only ever appear in an olympic-discipline plan. Gating on
`ex.discipline === 'olympic'` therefore cannot move any other cohort;
`power_clean` (sprinter-tagged, **no** discipline field) deliberately keeps
POWER_DOSE — re-dosing it for sprinters is a separate coaching decision,
recorded as a follow-up.

## The change (allocator.js only)

One predicate + four condition edits:

- `olympicClassicLift(ex)` = `ex.quality === 'power' && ex.discipline === 'olympic'`.
- `makeItem`: the power early-return skips classic lifts → they fall through to
  the normal primary/accessory branches (main = scheme `4×3 → 4×2`, RPE from
  the scheme; accessories = `s.acc` 3×6). The scheme-rest condition admits them
  → mains rest 180 s, accessories 120 s (from `doseCharacter`).
- `roleSetCount`: same skip, so the session time budget prices them by their
  real set count.
- Foot-contact ceiling loop: classic lifts no longer consume (or get skipped
  by) the jump-contact budget — it exists for ground-contact plyometrics
  (de Villarreal 2009), which a barbell lift is not.

Session ORDER is untouched: `quality:'power'` still leads the session
(correct for weightlifting). Ballistic jumps/throws everywhere keep POWER_DOSE
byte-identically.

## Acceptance

- New `tests/olympic-dose.js`: an olympic plan's classic-lift mains are ≤3 reps
  with 180 s rest across base/build/peak (and never carry the ballistic
  "move fast" note); pulls dose as 3×6 @ 120 s; a runner's jump work still
  doses POWER_DOSE (4 × 4 @ 150 s) — proving the gate.
- Golden master: exactly the `olympic·advanced·4d` archetype re-baselines
  (audited); `build-parity` and every sport archetype byte-identical.
- Follow-ups recorded (not in scope): whether `power_clean` for sprint cohorts
  should also dose from `explosiveStrength`; a `ballistic: true` catalogue flag
  as the fuller data-driven form of the predicate; a dose-coherence validator
  (testing-strategy layer 3) so this class of defect is caught structurally.
