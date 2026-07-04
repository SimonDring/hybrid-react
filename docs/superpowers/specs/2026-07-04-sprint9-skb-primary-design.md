# Sprint 9 — SKB-primary selection + the swim re-seat (DESIGN REVIEW)

**Date:** 2026-07-04 · **Status:** APPROVED by Simon 2026-07-04 — Option B · normalise ids + extend catalogue · run/cycle→swim flip order ·
**Traces to:** Blueprint W7 / audit §8 WP-19a-c + WP-20 · EDS §32/§34 · KA Domain 2 (Sport) ·
audit §9 H5 (the quality-vocabulary trap) · HANDOFF "Swim re-seat — what's required"

## 1. Objective

One sport model. The engine's sport knowledge currently exists twice: the SKB (21-section,
evidence-tagged JSON — the governed, reviewable form) and `lib/sports/*` (emphasis vectors,
priority lists, SPORT_BLOCKS — the code form that actually drives plans). Sprint 9 makes the
SKB primary for the D11 sports and retires the code form, and in doing so brings **swim** to
the standard run/cycle reached in Sprint 8.

## 2. Ground truth (verified 2026-07-04, not assumed)

| Fact | Evidence |
|---|---|
| SKB `exerciseLibrary` entries carry `transferToSportRating`, `injuryPreventionRating`, `fatigueCost`, category, season/level suitability | probed `running_long` entries |
| **The id join is broken for cycle/swim**: run 12/12 SKB ids match the engine catalogue; cycling 3/13; swimming 3/13 | probed against `strengthExercises.js` ids |
| Unmatched ids are ~70% naming drift (`romanian_deadlift`→`rdl`, `trap_bar_deadlift`→`trap_bar_dl`, `bulgarian_split_squat`→`split_squat`, `bent_row`, `pallof_press`) and ~30% genuinely missing movements (`cable_straight_arm_pulldown`, `scapular_ytw`, `mb_overhead_throw`, `box_jump_cmj`, `neck_isometrics`, `hip_thoracic_mobility`) | id diff above |
| Today's SKB boost (`skbIds.has(ex.id)` ×1.5) therefore works for run, is ~dead for cycle/swim | same |
| Swim's library categories = the session tiers a swim week must cover: *upper-body pull, start/turn power, posterior chain, shoulder prehab, scapular control, core anti-extension, core anti-rotation, rotational power, mobility, hip/breaststroke* | probed `swimming` categories |
| The PM quality vocabulary is a fixed 10; `SKB_TO_PM_QUALITY` maps 11 SKB qualities, drops 8 (sprintSpeed, acceleration, changeOfDirection, gripStrength…); swim's upper-pull need has **no quality home** → its diagnosis says "mobility", which is why the Sprint-8 swim flip failed | `sportQualityMap.js` + HANDOFF |
| `lib/sports/*` = 363 lines: per-muscle emphasis vectors, exercisePriority lists, SPORT_BLOCKS periodisation, systemic factors, run disciplines | wc + prior reads |
| The D9 constraint gate (PR #75) already proved the quality-tags × movement-map mismatch class is live — the same fault line H5 names | injury re-target work |

## 3. The central decision (H5): how do movement-specific sport needs enter selection?

A swimmer's #1 gym need is **upper-body pull strength + shoulder integrity**. "Upper-pull"
is not a physical quality — it's a *movement demand*. Three ways to let D11 see it:

### Option A — extend the quality vocabulary (add `upperPull`, `rotationalPower`, …)
Make the diagnosis express it. **Rejected.** The fixed-10 vocabulary is a deliberate
constitutional choice (bounded, assessable, population-prior-able). Every new sport would
mint nouns (GAA: `catchingPower`?); capability estimation has no measured path for them;
the diagnosis becomes a taxonomy war. This is the trap H5 warns about.

### Option B — the SKB library becomes a first-class REQUIREMENT SOURCE in D9/D11 ★ recommended
Two coordinated changes:

1. **D9 gains a second objective source.** Today a session's objective = a diagnosed
   quality (rotated). Under B, a sport whose SKB declares `gymPhilosophy`/library categories
   gets its week planned as **category coverage**: the SKB's categories (weighted by their
   exercises' `transferToSportRating` and the sport's `physicalProfile`) are distributed
   across the week's sessions alongside the quality-diagnosed objectives. For run/cycle the
   two views agree (their categories ≈ their diagnosed qualities — durability, power), so
   plans barely move. For swim, category coverage is what makes the week *right*: an
   upper-pull + scapular day is plannable without pretending "upper-pull" is a quality.
2. **D11 candidates gain SKB-library standing.** A catalogue exercise the sport's library
   lists is eligible at tier 2 (or its library category's tier) with value =
   `transferToSportRating / fatigue` — replacing the blunt ×1.5 boost. Quality tags keep
   valuing everything else. The §34 hierarchy is unchanged; the SKB simply becomes a
   *knowledge source of transfer*, which is exactly what KA Domain 2 says it is.

The diagnosis stays the pivot (D4/D5 unchanged, fixed-10 intact); the SKB supplies what the
vocabulary cannot express. Mechanically this mirrors precedents already shipped: the
D9 constraint gate (feasibility oracle) and `cardioGymSupport` (sport-aware translation).

### Option C — per-sport special-casing in code (swim gets a hand-written week template)
Fast, and exactly the `lib/sports/*` anti-pattern Sprint 9 exists to delete. **Rejected.**

## 4. Architecture under Option B

```
SKB (JSON, governed)                          engine
  physicalProfile.qualities ──────────────→ D2 demandProfile (exists today)
  exerciseLibrary.categories ─┐
  exerciseLibrary.exercises ──┼───────────→ D9 week objectives: diagnosed qualities
    (transferToSportRating,   │              ∪ category-coverage requirements (NEW)
     injuryPreventionRating)  └───────────→ D11 candidate standing + value (NEW)
  seasonalModel ────────────────────────────→ D7 periodisation (replaces SPORT_BLOCKS)   [19c]
  physicalProfile × quality→muscle map ────→ derived muscle emphasis (replaces vectors)  [19c]
```

**Retired at the end (19c):** emphasis vectors, exercisePriority lists (the library IS the
priority list, with ratings), SPORT_BLOCKS (SKB `seasonalModel` owns seasons), systemic
factors (fold into `sportLoad` knowledge or the SKB). `lib/sports/*` deleted for flipped
sports; run disciplines live on as SKB position/discipline archetypes (already modelled).

## 5. Precondition — WP-19.0: fix the id join (knowledge work, no behaviour change)

1. Normalise SKB exercise ids to catalogue ids where the movement exists (~9 renames across
   cycling/swimming JSON — knowledge edit, schema-validated).
2. Author the ~6 genuinely missing movements into `strengthExercises.js` **with full tags**
   (muscles, pattern, quality tags, fatigue cost, similarity profile): straight-arm pulldown,
   scapular YTW, MB overhead throw, box-jump CMJ, Pallof (if truly absent), neck isometrics
   (or drop it from the library — decision at authoring).
3. A schema-level test: **every SKB library id must resolve in the catalogue** (fail loudly —
   the V12 name-join lesson, applied to the SKB before it steers anything).

## 6. The swim re-seat (WP-20) under Option B

A 4-day intermediate swimmer's week becomes (illustrative):
*Mon* upper-pull strength (pull-up/pulldown + row @ maxStrength dose) + shoulder-ER/scap
prehab · *Tue* posterior chain + core anti-extension (HSR trap-bar + dead bug/Pallof) ·
*Thu* start/turn power (box jump CMJ + MB throw, contact-capped) + upper-pull volume ·
*Fri* scapular control + rotational core + mobility finishers. Differentiated days, real
dose, pressing preserved (swimmers keep pressing — already encoded), no all-hinge collapse.
Gates: the HANDOFF's `d11-swim-quality.js` spec (upper-pull present, shoulder health present,
NOT posterior-only, NOT under-dosed, days differentiated) + probe review before flip.

## 7. Flip sequence (each step its own PR, the established gates)

| Step | Change | Gate |
|---|---|---|
| 19.0 | id join + catalogue additions + schema test | no plan change (goldens untouched) |
| 19a | D11 SKB-library standing + rating-based value for **run/cycle** | `d11-runner-quality` + new rating assertions; audited re-baseline (run/cycle only) |
| 19b | D9 category-coverage objectives (parallel output first, then live for run/cycle) | nature-of-change gates |
| 20 | **swim flip**: add 'swim' to `D11_SPORTS` with category-led weeks | `d11-swim-quality.js`; swim archetypes re-baselined deliberately; build byte-identical |
| 19c | retire `lib/sports/*` for flipped sports; SPORT_BLOCKS → seasonalModel; derived emphasis | goldens for flipped sports hold; build/team-sports untouched (they keep legacy until WP-22/23) |

Rollback at every step = revert the PR. Build + gaa/rugby/soccer stay on the legacy model
throughout (their SKB stubs are 55 lines — flipping them waits for authored profiles, WP-23).

## 8. Risks

| Risk | Mitigation |
|---|---|
| Category-coverage planning is new D9 machinery (the largest new surface) | Ship as parallel output first (Sprint-7 pattern); flip per sport |
| Rating-based value re-orders run/cycle picks | The C4-style probe-then-gate discipline; d11 quality tests are the floor |
| Missing-movement authoring quality (new catalogue entries steer plans) | Author with the H9 review's standards; tag `needsReview` honestly; small count (~6) |
| Swim demand profile still says "mobility first" (diagnosis noise) | Category coverage doesn't need the diagnosis to say upper-pull; D4/D5 untouched; revisit `SKB_TO_PM_QUALITY` only if gates demand |
| Scope creep into the build flip | Explicitly out: build/team sports legacy until WP-22/23 |

## 9. Decisions for Simon

1. **The vocabulary route** — Option B (SKB library as requirement source; recommended) vs A (extend qualities) vs C (per-sport templates)?
2. **The join fix** — normalise ids + extend the catalogue (recommended — one id space, the V12 lesson) vs an explicit SKB→catalogue mapping table (no catalogue growth, but two id spaces forever)?
3. **Flip order** — 19a/b run/cycle first, swim last (recommended — proves the machinery on the sports with gates already in place) vs swim-first (it's the value target, but it lands on unproven machinery)?
