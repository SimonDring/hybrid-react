# Design: Working-volume classification (stimulus factor by exercise + level)

**Date:** 2026-06-26
**Status:** Draft for review
**Scope:** packages/engine — exercise data + volume accounting (allocator + volume counter) + supportive-work sequencing & finisher

## Problem

The volume ledger mis-measures what an exercise actually stimulates, in both
directions:

- **Core is undercounted.** `makeItem` tags *every* `pattern: 'core'` exercise
  `tag: 'mobility'` (allocator.js, the core branch), and `countWeeklyVolume`
  skips mobility-tagged items. So a loaded ab-wheel rollout at RPE 6 counts the
  same as a RPE-4 warm-up — zero. Core reads ~0 in every plan.
- **Scapular-health work is overcounted.** Prone Y/T/W raises are tagged
  `pattern: 'hpull'`, so `muscleContribution` credits each as a **full 1.0 back
  set** — wrong muscle *and* wrong magnitude. A tiny scapular raise counts like a
  barbell row, and the allocator's deficit accounting believes back is handled.
- **Stimulus isn't relative to the athlete.** A bird dog genuinely loads a
  novice's core; for an advanced athlete it's a warm-up. A bodyweight squat builds
  a beginner and does nothing for an advanced lifter. The ledger currently credits
  both the same full set regardless of level.

Underlying all three: `goalTags`, `sportTags`, and `activationPrimer` exist on
exercises but are **dead metadata** — never read by any selection or counting
logic (confirmed by grep). The only volume gate is the blunt
`pattern === 'core' → mobility` rule.

## Decisions (from brainstorming, 2026-06-26)

1. **Stimulus is relative to ability.** The volume an exercise counts decays as
   the athlete outgrows it. Encoded as a per-exercise **load class** + a central
   level-decay table — not per-exercise-per-level data.
2. **Three working tiers, level-aware.** Loaded work counts full at every level;
   isometric core counts a fraction that decays with level; bodyweight-strength
   work decays with level; health/activation work never counts.
3. **Counting is level-driven only, never goal-driven.** A set's stimulus *to the
   muscle* is the same regardless of why you train. Goal-appropriateness — whether
   a bodybuilder should do bird dogs at all, or a functional athlete gets more core
   — stays in targets (emphasis) and selection (Piece B).
4. **Coherent accounting.** The factor applies in the allocator's deficit/MRV
   accounting *and* the displayed count, so "planned vs target" stays consistent.
   It is computed once (the allocator knows the level) and stamped onto each
   rendered item, so the measurement layer needs no `level` threading.
5. **Health work stays programmable.** Factor-0 exercises pay no deficit and count
   nothing, but are still placed for sport athletes via the existing
   priority-anchor path (a swimmer keeps prone Y/T/W as uncounted shoulder-health
   work; real back work still fills the back target).
6. **Supportive work is sequenced last.** Working sets first, then accessories /
   isolation, then core (`isoCore`), then health / prehab / mobility finishers at
   the very end — never pre-fatigue the core before the heavy lifts; finish on
   prehab.
7. **A supportive finisher rounds out short sessions (factor-0, not junk volume).**
   `factor: 0` means "doesn't count toward the weekly ledger," NOT "never
   programmed." Sport/goal-appropriate supportive work (tibialis/calf prehab for a
   runner, cuff/scapular for a swimmer, core/mobility for a build goal) is selected
   via the `sportTags`/`goalTags` metadata (today dead) and appended to round out a
   session. The amount **scales inversely to the counted working dose** — a short
   session (a beginner's) gets a fuller finisher toward a sensible session length;
   an advanced athlete's already-long session gets little or none, capped so a
   session is never mostly prehab. This is the honest resolution of the
   short-session UX deferred in the session-length work: round out with real
   supportive work, never fake the training dose.

## The model

A new optional exercise field `loadClass` (default `loaded`). A central table maps
class × level → stimulus factor:

```js
// stimulus factor by load class and athlete level (0=beginner … 3=advanced)
const CLASS_FACTOR = {
  loaded:             { beginner: 1.0, returning: 1.0,  intermediate: 1.0, advanced: 1.0  },
  bodyweightStrength: { beginner: 1.0, returning: 0.75, intermediate: 0.4, advanced: 0.2  },
  isoCore:            { beginner: 0.5, returning: 0.5,  intermediate: 0.3, advanced: 0.15 },
  health:             { beginner: 0,   returning: 0,    intermediate: 0,   advanced: 0    }
};
```

`stimulusFactor(ex, level) → number` reads `CLASS_FACTOR[ex.loadClass ?? 'loaded'][level]`.
Pure. Lives in a new `packages/engine/src/lib/strength/stimulus.js` alongside the
table.

## Architecture

`muscleContribution(ex)` (contributions.js) stays a pure **structural** muscle map
(unchanged). The stimulus factor is applied at the two places volume is tallied:

### 1. Allocator (allocator.js)

- `bestExercise` scores on the **factored** contribution
  (`contrib[m] × stimulusFactor(ex, ctx.level)`), so low-stimulus work for the
  athlete's level scores low and is naturally deprioritised (an advanced athlete
  stops being offered bird dogs; bodyweight squats lose to barbell squats).
- `place` pays down the deficit, `delivered`, `weeklyDelivered`, and `muscleVol`
  using the **factored** contribution — so the MRV ceiling and "muscle handled"
  decisions track real stimulus.
- `place` stamps `item.volumeFactor = stimulusFactor(ex, ctx.level)` onto the
  rendered item.
- The item `tag` is **derived** from the factor: `factor === 0 → 'mobility'`,
  otherwise no mobility tag. This replaces the `pattern === 'core'` rule in
  `makeItem` (the rep-scheme logic — holds vs `3 × 12` — stays).

### 2. Volume counter (volume.js)

`countWeeklyVolume` multiplies each item's contribution by `item.volumeFactor ?? 1`
(instead of skipping `tag === 'mobility'`). The factor is already baked into the
item, so the counter needs no `level`. Warm-up primer rows still contribute zero
(their names aren't in the exercise DB, so `exerciseMuscles` returns null).

### 3. Session sequencing (allocator.js `structureItems`)

Order blocks by class so supportive work lands last: working sets (loaded /
bodyweightStrength) → `isoCore` → `health`/prehab/mobility. The existing
anchor-first rule still applies within the working block; core and health blocks
are pushed to the tail. This keeps heavy lifts unfatigued and finishes on prehab.

### 4. Supportive finisher (allocator.js, new pass)

After the working volume is allocated (and the existing counted filler pass runs),
a finisher pass appends **factor-0** supportive work selected by sport/goal:

- **Selection** — activate the dead `sportTags`/`goalTags`: pick health/prehab/
  mobility/core-activation exercises whose tags match the athlete's sport
  (`profile.sport`, incl. the `run_<discipline>` tags) or build style. Reuse the
  sport priority list where present (a runner's tibialis/calf/hip prehab is already
  enumerated there).
- **Amount (inverse to working dose)** — fill the gap between the session's
  realised working duration and an internal "complete session" floor
  (`FINISHER_TARGET_MIN`, e.g. ~30 min), with a hard cap on finisher volume
  (`FINISHER_CAP_MIN`, e.g. ~15 min) so a session is never mostly prehab. A long
  working dose leaves no gap → no finisher. Because the working dose already
  encodes level + goal, the inverse-scaling falls out without extra level logic.
- **Accounting** — finisher items carry `volumeFactor: 0`: they count nothing, pay
  no deficit, and never affect the MRV ceiling. They render tagged `mobility` and
  sequence last (per §3).

This is distinct from the existing in-rest "filler pass," which adds *counted*
working volume toward the weekly target; the finisher adds *uncounted* supportive
work only to round out an otherwise-short session.

### Data corrections (strengthExercises.js)

- Tag `loadClass` on the bodyweight / isometric-core / health exercises (most
  exercises stay the default `loaded` and need no tag).
- Prone Y/T/W → `loadClass: 'health'` (factor 0). Their `pattern: 'hpull'`
  mis-attribution becomes moot for counting (0 × anything = 0); optionally
  re-attribute to `pattern: 'iso', muscle: 'reardelt'` as data hygiene.
- Retire the dead `activationPrimer` flag (folded into `loadClass: 'health'`).

### loadClass audit (the rule + the decided cases)

- **`loaded`** (default): all barbell/dumbbell/machine/cable compounds & isolation;
  pull-ups (weightable, stay hard); dynamic loaded core (ab wheel, cable woodchop,
  weighted/hanging core); carries; face pulls (a real loaded rear-delt movement).
- **`bodyweightStrength`**: bodyweight strength work that fades as you get strong —
  bodyweight squat, tempo squat, bodyweight split squat / reverse lunge / step-up,
  push-up variants (feet-elevated, pike), inverted row, bodyweight glute bridge,
  bodyweight single-leg hinge.
- **`isoCore`**: plank, side plank, Pallof (cable/band/half-kneeling), dead bug,
  bird dog, copenhagen, hollow hold.
- **`health`**: prone Y/T/W raise, band pull-apart, serratus wall slide, scapular
  activation, prone hip extension.

## Components & boundaries

| Unit | Responsibility | Depends on |
|------|----------------|-----------|
| `CLASS_FACTOR` + `stimulusFactor` (`strength/stimulus.js`, new, pure) | class × level → factor | LEVELS |
| `strengthExercises.js` | `loadClass` per exercise | — |
| `muscleContribution` (`contributions.js`) | structural muscle map (unchanged) | — |
| `allocateGym` (`allocator.js`) | apply factor in scoring + accounting; stamp `item.volumeFactor`; sequence supportive work last; run the finisher pass | stimulus, contributions |
| `countWeeklyVolume` (`volume.js`) | tally `sets × contribution × item.volumeFactor` | — |
| supportive-work selector (`allocator.js`, consumes `sportTags`/`goalTags`) | pick sport/goal-appropriate factor-0 work for the finisher | exercise data |

`stimulusFactor` is pure and unit-checkable. `muscleContribution` stays pure and
structural.

## Testing

- `stimulus.js`: `stimulusFactor` returns the table values — loaded full at every
  level; isoCore 0.5→0.15 across levels; bodyweightStrength 1.0→0.2; health 0.
- Counting: a loaded ab-wheel counts full core; a beginner plank counts 0.5 core
  and an advanced plank ~0.15; a prone Y raise counts **zero back** (was a full
  set).
- Selection: an advanced athlete's plan no longer contains bird dogs / bodyweight
  squats when loaded options exist; a swimmer still gets prone Y/T/W (priority
  path) but they don't count toward back, so real back work still fills the target.
- Sequencing: in a built session, core blocks precede health blocks and both
  follow the working sets.
- Finisher: a short (beginner) session gains sport/goal-appropriate factor-0
  supportive work (a runner gets tibialis/calf prehab) and reaches the session
  floor; the finisher items count **zero** toward weekly volume; an advanced
  athlete's long session gains little or none; the finisher never exceeds its cap.
- `profile-review`: core reads accurately (not ~0); no phantom back volume; short
  sessions are rounded out without their counted volume changing.
- Golden master regenerated (selection + item tags + finisher shift deliberately).
  Update `volume-tracking`, `session-density`, `sport-anchor`, `split-engine`,
  `primer-equip` where their expectations shift.
- Confirm **no** change to `suggestOptimalFrequency` (reads targets, not counts).

## Settled in review (2026-06-26)

- **Decay-curve numbers** in `CLASS_FACTOR` — approved as listed.
- **Bird dog / dead bug** — stay `isoCore` (0.5-decaying), sequenced late as core.
- **Banded ankle plantarflexion** — `health` (factor 0, doesn't count) but selected
  for runners via the finisher. Loaded calf work stays `loaded` (counts), preserving
  the recent calf-counting fix.

## Open items (implementation calibration)

- **Finisher constants** — `FINISHER_TARGET_MIN` (~30) and `FINISHER_CAP_MIN`
  (~15); tune against the profile archetypes so a beginner session feels complete
  without becoming mostly prehab.
- **`loadClass` audit completeness** — the rule + decided classes are fixed; the
  per-exercise pass over the full library (~118 exercises) happens during
  implementation, defaulting anything unclassified to `loaded`.

## Out of scope (YAGNI)

- **Piece B** — goal-appropriate selection *of working exercises* (no Olympic
  lifts / hang cleans in a hypertrophy plan) and CNS sequencing *of the heavy
  working sets* (compound count, heavy-first ordering). Separate spec. NOTE the
  boundary: this spec sequences *supportive* work last and selects *supportive
  (factor-0)* work by sport/goal; Piece B governs the *working* exercises. (Prone-Y
  dropping from hypertrophy plans is a side effect here, not the goal.)
- **Core MEV** stays 0 — core is already programmed via emphasis + the ramp; this
  fix only makes its *count* accurate. Changing the landmark is separate tuning.
- **Relative-load counting** (factor from actual % of the athlete's 1RM) — the
  gold standard, but needs per-exercise load data we don't have for accessory /
  bodyweight work. The load-class proxy is the tractable version.
