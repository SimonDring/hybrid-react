# Science-based substitution ranking — design

**Date:** 2026-06-28
**Branch:** `feat/focused-session-runner`
**Status:** Approved in brainstorm (full enrichment); spec for review before/with build.

## Goal

Rank exercise substitutes by **scientific likeness to the original** — closest first —
using a transparent, multi-axis similarity score over enriched per-exercise data. Fixes
the class of bug where a coarse pattern-based muscle model mis-ranks options (a rear-delt
machine offered for a biceps curl; a glute-dominant hip thrust treated like a squat).

**Hard constraint:** `muscleContribution` is pattern-based and feeds the whole plan
allocator (selection + MEV/MAV/MRV volume). The likeness model is a **separate layer**
read only by `substituteOptions` — the allocator and generated plan are untouched.

## The likeness axes (priority order)

1. **Primary mover** — the muscle actually trained. The gate + the dominant weight.
2. **Movement pattern / joint action** — `pattern` (rows `hpull` ≠ pulldowns `vpull`).
3. **Force vector / modality** — derived from `equip` (free ≈ cable > machine > band/bw).
4. **Loadability** — the existing `exerciseLoad` StrengthLevel coefficient (1RM ratio).
5. **Laterality** (uni/bilateral) and **ROM/length** (`stretchBias`) — fine tiebreakers.

## Data model — enrichment (allocator-safe)

New file `packages/engine/src/data/exerciseSimilarity.js`, read ONLY by the substitution
scorer. Every exercise resolves to accurate muscles via **pattern defaults + per-exercise
overrides** (efficient + reviewable; not 118 hand-written rows):

- `DEFAULT_MUSCLES` by pattern, e.g. `squat → {primary:[quads], secondary:[glutes,hamstrings]}`,
  `hpush → {primary:[chest], secondary:[triceps,shoulders]}`, `hpull/vpull → {primary:[back],
  secondary:[biceps]}`, `hinge → {primary:[hamstrings,glutes], secondary:[back]}`,
  `lunge → {primary:[quads,glutes], secondary:[hamstrings]}`, `calf → {primary:[calves]}`,
  `core/carry → {primary:[core], …}`, `mobility → {}`.
- `MUSCLE_GROUP` for `pattern:'iso'` resolves from the exercise's own `muscle`
  (biceps/triceps/reardelt→shoulders/quad→quads/ham→hamstrings/…).
- `OVERRIDES` by id where the default is wrong (the curated exceptions):
  - **rear-delt/scap isos mis-tagged `hpull`:** `reverse_pec_deck`, `prone_y/t/w_raise`,
    `band_pull_apart` → `{primary:[shoulders], secondary:[back]}` (fixes the curl bug).
  - **glute-dominant hinges:** `hip_thrust`, `glute_bridge*`, `prone_hip_extension` →
    `{primary:[glutes], secondary:[hamstrings]}`.
  - **triceps-biased presses:** `close_grip_bench`, `jm_press` → `{primary:[triceps],
    secondary:[chest,shoulders]}`; `dip` → `{primary:[chest], secondary:[triceps]}`.
  - **lat-isolation pulls:** `db_pullover` → `{primary:[back], secondary:[chest]}`;
    `straight_arm_pd` → `{primary:[back], secondary:[]}`.
- `MODALITY` map (equip → free/cable/machine/band/bodyweight) + a `MODALITY_SIM` matrix
  (same=1; free↔cable .7; free↔machine .55; cable↔machine .7; band/bw lower).

Muscle vocabulary = the engine's `MUSCLE_GROUPS` (quads, hamstrings, glutes, calves,
chest, back, shoulders, biceps, triceps, core). Laterality is detected from the existing
`unilateral` field + a name regex (single/split/bulgarian/lunge/step-up/…).

## Scorer (`substituteOptions` rewrite)

For each candidate (after the existing gates: not self, not `quality:'power'`, same
movement **tier**, within level, equipment available):

- **Muscle gate:** keep only candidates that train the original's primary mover —
  `orig.primary ∩ (cand.primary ∪ cand.secondary) ≠ ∅`. (Leg press passes for squat;
  hip-thrust fails for squat; rear-delt machine fails for a biceps curl.)
- **Score** (transparent weights):
  - `+4 ·` Jaccard(orig.primary, cand.primary) — exact primary alignment
  - `+3 ·` coverage(orig.primary by cand.primary∪secondary) — trains the main mover
  - `+1 ·` Jaccard(orig.secondary, cand.secondary) — synergist similarity
  - `+3 ·` same `pattern`
  - `+1.5 ·` MODALITY_SIM(orig.equip, cand.equip)
  - `+1 ·` loadability closeness (from `exerciseLoad` coefficients, when both have one)
  - `+2` same tracked lift (`matchLift` key) — true variant
  - `+0.5` same laterality · `+0.3` same stretch bias
  - `−1.5` loaded original → bodyweight candidate
  - tiny id-hash tie-break
- Keep the **same-pattern cap** (diversify so a different-pattern same-muscle option —
  squat → split squat — still surfaces) and return top `max`.

Each option still carries `{ id, name, equip, pattern, weight, sameLift }` plus (new) an
optional short `why` (e.g. "same primary · free weight") for the sheet, and the numeric
rank already shown.

## Testing

`tests/substitutions.js` (extend):
- squat → leg press / hack rank top (same primary+pattern), split squat present, **no
  hip thrust** (glute primary), no upper-body, no plyo.
- bench → DB/incline/dip rank above close-grip bench (chest primary vs triceps primary);
  no OHP.
- biceps curl → only biceps isolations; **no Reverse Pec Deck / rear-delt** work.
- row → cable/chest-supported/DB rows + pulldown; **no Prone raise**.
- every option trains the original's primary mover; weights present for loadable subs.
- Full engine suite green except the pre-existing date-dependent reflow test (the
  allocator is untouched, so golden-master/volume are unaffected).

## Non-goals / notes

No change to `muscleContribution`, the allocator, volume targets, or the generated plan.
No new force-vector field (pattern + modality cover it). The enrichment is a curated
defaults+overrides map — adding a new exercise without an override falls back to its
pattern default (sane), and an override can refine it later.

## Commit plan
1. spec (this doc)
2. `exerciseSimilarity.js` (defaults + overrides + modality)
3. `substitutions.js` scorer rewrite + tests
