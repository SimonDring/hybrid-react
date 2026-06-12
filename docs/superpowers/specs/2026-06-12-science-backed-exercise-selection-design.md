# Science-Backed Exercise Selection & Progressive Loading

**Date:** 2026-06-12
**Status:** Approved for implementation
**Scope:** Exercise database expansion, goal-based exercise prioritisation, progressive loading model, functional session primer

---

## 1. Problem Statement

The current gym engine selects exercises using a volume-target model (MEV/MAV/MRV per muscle group) and movement-pattern coverage. This works well structurally but has two gaps:

1. **The exercise library is incomplete.** ~60 exercises miss key science-backed movements — serratus anterior, lower trapezius, soleus isolation, posterior rotator cuff, plyometrics, and desk-worker antidotes are largely absent. The engine cannot prescribe the right exercises for a given goal because the exercises don't exist in the database.

2. **Exercise selection within a goal is undifferentiated.** A runner and a bodybuilder both training the posterior chain might get the same Romanian deadlift. The engine has no way to prefer a Nordic curl for the runner or a seated leg curl for the bodybuilder — even though the evidence strongly supports those choices.

3. **Beginners receive complex movements at full intensity.** The level gate (`ex.level <= athlete.level`) is binary — an exercise either appears or doesn't. There is no mechanism to introduce barbell movement patterns as low-stakes accessory work while the real primary loading happens on safer, more forgiving exercises.

---

## 2. Approach

**Hybrid: tags for selection gating + sport/goal priority lists for scoring + progressive loading via `minLevelForPrimary`**

- `sportTags` and `goalTags` arrays on exercises gate which pool each exercise belongs to
- `exercisePriority` list emitted by `program.js` for each goal gives the allocator a science-backed ordered preference
- `minLevelForPrimary` on exercises separates "when can this exercise appear" from "when should it be the heavy primary lift"
- `activationPrimer: true` marks exercises for the functional session warm-up block

---

## 3. Architecture

### Files changed

| File | Change |
|---|---|
| `src/data/strengthExercises.js` | Add ~70 new exercises; add `sportTags`, `goalTags`, `activationPrimer`, `minLevelForPrimary` fields to all exercises |
| `src/lib/strength/program.js` | `resolveProgram()` emits `exercisePriority: string[]` and `patternLearningRpe: number` for the goal |
| `src/lib/plan/allocator.js` | Scoring function reads `exercisePriority` (×1.35 multiplier); role assignment logic reads `minLevelForPrimary` |
| `src/lib/plan/strength.js` | `buildWeek()` passes `exercisePriority` into `allocateGym()`; functional sessions prepend primer block |

### No changes to

- `SyncService.js`, `Database.js`, `Storage.js` — data layer is unaffected
- `trainingStore.js` — store API is unchanged
- All screen components — session rendering is unaffected
- Supabase schema — no new tables or columns

---

## 4. New Exercise Fields

### On every exercise object

```js
{
  id: 'nordic_curl',
  name: 'Nordic Curl',
  pattern: 'hinge',
  equip: 'bodyweight',
  level: 3,                          // existing: minimum level to appear at all
  role: 'iso',
  minLevelForPrimary: 'advanced',    // NEW: below this level, force role=accessory + RPE cap
  sportTags: ['run', 'cycle'],       // NEW: sports this exercise specifically benefits
  goalTags: ['strength'],            // NEW: build-me goals this is prioritised for
  activationPrimer: false,           // NEW: true = eligible for functional session primer block
  unilateral: false,
  cues: [                            // NEW: seeds the future animated exercise library
    'Partner anchors feet firmly — no slipping',
    'Brace entire posterior chain before lowering',
    'Use hands to control descent — progress over 8–12 weeks minimum'
  ],
  injuryRisk: 'Proximal hamstring avulsion during eccentric phase if athlete cannot control bodyweight descent'
}
```

`minLevelForPrimary` values: `'beginner'` | `'returning'` | `'intermediate'` | `'advanced'`

When omitted, defaults to the exercise's own `level` (existing behaviour preserved).

### `activationPrimer` exercises (functional primer block)

These 4 exercises are tagged `activationPrimer: true` and form the desk-worker session primer:

| ID | Name | Duration / Sets | Purpose |
|---|---|---|---|
| `hip_flexor_90_90` | 90/90 Hip Flexor Stretch | 45s per side | Releases hip flexors that inhibit glutes |
| `glute_bridge_activation` | Glute Bridge (2s hold) | 3×12, 2s hold | Activates glutes against newly released hip flexors |
| `band_pull_apart` | Band Pull-Apart | 3×20 slow | Activates lower traps + rear delts inhibited by desk posture |
| `cat_camel_thoracic` | Cat-Camel + Thoracic Rotation | 10 + 8/side | Restores thoracic mobility lost from sustained sitting |

The primer block is prepended to every `functional`-goal session. Items are tagged `tag: 'mobility'` and `restSec: 30`. They do not count toward volume targets.

---

## 5. Exercise Science: What Gets Added (~70 exercises)

### 5a. Hypertrophy priority exercises

Science basis: stretch-under-load produces greater hypertrophy than shortened-position training (Schoenfeld, Maeo, Kassiano, Pereira). The missing exercises below specifically load muscles at their lengthened position.

| ID | Name | Pattern | Equipment | Level | `minLevelForPrimary` | Key science |
|---|---|---|---|---|---|---|
| `incline_db_curl` | Incline DB Curl | iso | dumbbell | 1 | returning | Long head biceps at full stretch — 3× more hypertrophy vs standard curl (Maeo 2021) |
| `spider_curl` | Spider Curl | iso | dumbbell | 1 | returning | Full extension at bottom; complements incline curl |
| `overhead_cable_ext` | Overhead Cable Tricep Extension | iso | cable | 1 | returning | Long head triceps at maximal stretch — highest hypertrophic signal for triceps |
| `low_high_cable_fly` | Low-to-High Cable Fly | hpush | cable | 1 | returning | Pec loaded at full stretch, tension maintained at peak contraction |
| `seated_leg_curl` | Seated Leg Curl | iso | machine | 0 | beginner | Hip flexed = hamstring pre-stretched = superior growth (Maeo 2023) |
| `heel_elevated_goblet` | Heel-Elevated Goblet Squat | squat | dumbbell | 1 | returning | Deeper knee flexion → greater VMO stretch |
| `reverse_pec_deck` | Reverse Pec Deck | hpull | machine | 0 | beginner | Rear delt through full ROM — most undertrained upper body muscle |
| `serratus_punch_cable` | Serratus Punch (cable) | core | cable | 1 | returning | Serratus anterior — scapular upward rotation, almost never trained |
| `prone_y_raise` | Prone Y Raise | hpull | dumbbell | 0 | beginner | Lower trapezius direct work — universally underprogrammed |
| `prone_t_raise` | Prone T Raise | hpull | dumbbell | 0 | beginner | Posterior deltoid at 90° abduction + mid-trap |
| `prone_w_raise` | Prone W Raise | hpull | dumbbell | 0 | beginner | Supraspinatus in safe arc — shoulder health foundation |
| `db_pullover` | DB Pullover | hpull | dumbbell | 2 | intermediate | Lat + serratus + long head triceps simultaneously at stretch |
| `low_to_high_cable_fly` | Low-to-High Cable Fly | hpush | cable | 1 | returning | (See above) |
| `jm_press` | JM Press | hpush | barbell | 3 | advanced | Best tricep exercise for pressing lockout strength |
| `close_grip_bench` | Close-Grip Bench Press | hpush | barbell | 2 | intermediate | Tricep emphasis for lockout; shoulder-friendly grip |
| `ab_wheel` | Ab Wheel Rollout | core | bodyweight | 2 | n/a (core) | Best evidence-backed anti-extension (Escamilla) |
| `pause_squat` | Pause Squat (2–3s) | squat | barbell | 2 | intermediate | Eliminates SSC at sticking point; addresses hole weakness |
| `rack_pull` | Rack Pull | hinge | barbell | 2 | intermediate | Overloads deadlift lockout; upper-back and glute |
| `deficit_deadlift` | Deficit Deadlift | hinge | barbell | 3 | advanced | Trains initial pull from floor; requires perfect conventional DL first |
| `floor_press` | Floor Press | hpush | barbell | 2 | intermediate | Limits ROM to mid-range; trains lockout; shoulder-friendly |
| `seated_box_jump` | Seated Box Jump | squat | bodyweight | 2 | intermediate | Rate of force development; removes SSC for pure explosive power |

### 5b. Functional (desk-worker) exercises

Science basis: Janda's upper/lower crossed syndrome; McGill spinal loading research; Cressey shoulder prerequisites.

| ID | Name | Pattern | Equipment | Level | `activationPrimer` | Key purpose |
|---|---|---|---|---|---|---|
| `hip_flexor_90_90` | 90/90 Hip Flexor Stretch | mobility | bodyweight | 0 | true | Hip flexor release; primer exercise 1 |
| `glute_bridge_activation` | Glute Bridge with Hold | hinge | bodyweight | 0 | true | Glute activation; primer exercise 2 |
| `cat_camel_thoracic` | Cat-Camel + Thoracic Rotation | mobility | bodyweight | 0 | true | Thoracic mobility; primer exercise 4 |
| `band_pull_apart` | Band Pull-Apart | hpull | band | 0 | true | Lower trap + posterior delt; primer exercise 3 (also main work) |
| `half_kneeling_pallof` | Half-Kneeling Pallof Press | core | cable | 1 | false | Anti-rotation in hip-flexor-lengthened position |
| `serratus_wall_slide` | Serratus Wall Slide | core | bodyweight | 0 | false | Scapular upward rotation; resets scapular position |
| `bird_dog` | Bird Dog (5s hold) | core | bodyweight | 0 | false | McGill Big 3 — anti-extension + coordination |
| `tall_kneeling_landmine` | Tall-Kneeling Landmine Press | vpush | barbell | 1 | false | OHP without lumbar compensation; glutes + core + shoulder |
| `prone_hip_extension` | Prone Hip Extension | hinge | bodyweight | 0 | false | Glute activation drill with hip flexors lengthened |
| `dead_bug` | Dead Bug | core | bodyweight | 0 | false | McGill-aligned; anti-extension with deep neck flexor |

### 5c. Running support exercises

Science basis: Berryman et al. 2018 (heavy RT + running economy); Blagrove et al. 2018 (plyometrics); Petersen 2011 (Nordic curl — 70% hamstring injury reduction); Lauersen 2014 (strength training reduces injury 66%).

| ID | Name | Pattern | Equipment | Level | `minLevelForPrimary` | Key science |
|---|---|---|---|---|---|---|
| `nordic_curl` | Nordic Curl | hinge | bodyweight | 3 | advanced | 70% reduction in hamstring injuries (Petersen 2011 RCT) |
| `seated_calf` | Seated Calf Raise | calf | machine | 0 | beginner | Soleus isolation (knee bent); dominant running muscle — 8× BW per step |
| `double_leg_pogo` | Double-Leg Pogo Jump | squat | bodyweight | 1 | returning | Achilles stiffness; spring-mass efficiency (Blagrove 2018) |
| `sl_pogo_jump` | Single-Leg Pogo Jump | squat | bodyweight | 2 | intermediate | Running-specific plyometric; 20→40 contacts per set |
| `bounding_a_skip` | A-Skip / Bounding | lunge | bodyweight | 2 | intermediate | Stride power; running-specific ground contact pattern |
| `lateral_band_walk` | Lateral Band Walk | iso | band | 0 | beginner | Glute medius; reduces IT band tension and Trendelenburg gait |
| `sl_hip_abduction` | Side-Lying Hip Abduction | iso | dumbbell | 1 | returning | Direct glute medius loading; progressive resistance |
| `sl_squat_to_box` | Single-Leg Squat to Box | squat | bodyweight | 2 | intermediate | Eccentric quad control; trains deceleration phase of landing |
| `tibialis_raise` | Tibialis Raise | iso | bodyweight | 0 | beginner | Tibialis anterior — shin splint prevention; almost never programmed |
| `copenhagen_plank` | Copenhagen Plank | core | bodyweight | 3 | n/a (core) | Hip adductor; second most common running injury site |
| `glute_bridge_single_leg` | Single-Leg Glute Bridge | hinge | bodyweight | 1 | returning | Glute max unilateral; corrects gluteal inhibition |

### 5d. Cycling support exercises

Science basis: Rønnestad et al. 2010, 2015 (heavy RT + cycling power output); hip flexor shortening mechanism; IT band = glute medius weakness, not "tight IT band."

| ID | Name | Pattern | Equipment | Level | `minLevelForPrimary` | Key science |
|---|---|---|---|---|---|---|
| `sl_leg_press` | Single-Leg Leg Press | squat | machine | 1 | returning | Best cycling-specific strength; removes imbalance compensation |
| `thoracic_foam_roller` | Thoracic Foam Roller Extension | mobility | bodyweight | 0 | n/a | Thoracic kyphosis reversal; non-optional for cyclists |
| `hip_flexor_90_90` | 90/90 Hip Flexor Stretch | mobility | bodyweight | 0 | n/a | Hip flexor release (shared with functional primer) |
| `prone_hip_extension` | Prone Hip Extension | hinge | bodyweight | 0 | n/a | Glute activation after hip flexor release (shared) |

_(Cyclists also benefit from `nordic_curl`, `sl_rdl`/`sl_hinge`, `lateral_band_walk`, `hip_thrust`, and `good_morning` — these already exist or are added under other categories with `sportTags: ['cycle']`)_

### 5e. Swimming support exercises

Science basis: Batalha et al. 2012, 2015 (ER:IR ratio 0.55 in swimmers; ER work corrects deficit); Wanivenhaus et al. (swimmer's shoulder prevalence 37–91%); Vezina / Girold 2012 (dry-land pulling transfer).

| ID | Name | Pattern | Equipment | Level | `minLevelForPrimary` | Key science |
|---|---|---|---|---|---|---|
| `sl_ext_rotation` | Side-Lying External Rotation | iso | dumbbell | 1 | returning | Infraspinatus + teres minor; most important shoulder exercise for swimmers |
| `cable_ext_rotation_90` | Cable ER at 90° Abduction | iso | cable | 1 | returning | ER in swimming recovery position; directly corrects Batalha deficit |
| `cable_woodchop` | Cable Woodchop (high-to-low) | core | cable | 2 | intermediate | Diagonal trunk rotation; mimics freestyle stroke mechanics |
| `ankle_plantarflex_band` | Banded Ankle Plantarflexion | iso | band | 0 | beginner | Toe-pointed flutter kick; active-loaded ROM for plantarflexion |
| `glute_ham_raise` | Glute-Ham Raise | hinge | machine | 3 | advanced | Eccentric hamstring + glute; dolphin kick mechanics |

_(Swimmers also benefit from `prone_y_raise`, `prone_w_raise`, `prone_t_raise`, `serratus_punch_cable`, `face_pull`, `straight_arm_pd`, `hip_thrust`, `sl_hinge` — tagged `sportTags: ['swim']`)_

---

## 6. Exercise Level Corrections (Existing Database)

Exercises currently set lower than the injury risk warrants:

| ID | Current level | Corrected level | `minLevelForPrimary` | Reason |
|---|---|---|---|---|
| `back_squat` | 0 | 0 | **intermediate** | Can appear from beginner as pattern work; primary only at intermediate |
| `bench` | 0 | 0 | **intermediate** | Same — DB bench is the beginner primary |
| `rdl` (barbell) | 0 | 0 | **intermediate** | `db_rdl` is the beginner hinge; barbell RDL as accessory then primary |
| `pallof` | 0 | 0 | **returning** | Band pallof stays at beginner; cable pallof needs core stability prerequisite |
| `walking_lunge` | 0 | 0 | **returning** | Dynamic balance + load; reverse lunge is the beginner primary |
| `barbell_row` | 1 | 1 | **intermediate** | Requires hip hinge pattern before programming as primary |
| `deadlift` | 1 | 1 | **intermediate** | Trap bar DL is the returning primary; conventional as accessory then primary |
| `kb_swing` | 1 | **2** | intermediate | Ballistic hip hinge — intermediate-only |
| `hanging_knee` | 1 | **2** | intermediate | Passive hang + momentum control — intermediate |
| `hip_thrust` | 0 | 0 | **returning** | Glute bridge (level 0) is prerequisite; loaded barbell hip thrust at returning |
| `good_morning` | 2 | **3** | advanced | Catastrophic failure mode under axial load at worst lever arm |
| `front_squat` | 2 | **3** | advanced | Thoracic collapse = catastrophic lumbar transfer |
| `nordic_curl` | 2 | **3** | advanced | Proximal hamstring avulsion risk documented; months of loading required |
| `copenhagen_plank` | 2 | **3** | n/a (core) | Adductor insertion stress at full lever — elite tissue tolerance |

**Note:** Raising `level` removes an exercise from beginner sessions entirely. Setting `minLevelForPrimary` without raising `level` keeps the exercise visible as accessory work. These are separate controls — use them intentionally.

---

## 7. Goal Priority Lists

Emitted by `resolveProgram()` as `exercisePriority: string[]`. The allocator scores listed exercises ×1.35 to ensure they win selection against equivalent alternatives.

```js
// program.js — exercisePriority per goal
const GOAL_PRIORITY = {
  hypertrophy: [
    'incline_db_curl', 'overhead_cable_ext', 'seated_leg_curl',
    'low_high_cable_fly', 'prone_y_raise', 'face_pull', 'reverse_pec_deck'
  ],
  strength: [
    'pause_squat', 'good_morning', 'close_grip_bench',
    'ab_wheel', 'rack_pull', 'hip_thrust', 'barbell_row'
  ],
  functional: [
    'band_pull_apart', 'face_pull', 'prone_y_raise',
    'half_kneeling_pallof', 'suitcase_carry', 'dead_bug', 'serratus_wall_slide'
  ]
};

const SPORT_PRIORITY = {
  run:   ['nordic_curl', 'seated_calf', 'sl_pogo_jump', 'tibialis_raise', 'sl_hip_abduction', 'double_leg_pogo'],
  cycle: ['sl_leg_press', 'hip_thrust', 'nordic_curl', 'lateral_band_walk', 'sl_hinge'],
  swim:  ['sl_ext_rotation', 'face_pull', 'prone_y_raise', 'serratus_punch_cable', 'straight_arm_pd', 'cable_ext_rotation_90']
};
```

---

## 8. Allocator Changes

### Role assignment with `minLevelForPrimary`

In `bestExercise()`, after the existing equipment and level gates, add:

```js
// Demote to accessory if below minLevelForPrimary threshold
const levelNum = { beginner: 0, returning: 1, intermediate: 2, advanced: 3 };
const athleteLevelNum = levelNum[ctx.level] ?? 1;
const minPrimary = levelNum[ex.minLevelForPrimary] ?? ex.level;
const effectiveRole = (ex.role === 'primary' && athleteLevelNum < minPrimary)
  ? 'accessory'
  : ex.role;
```

When `effectiveRole` is forced to `'accessory'`:
- Use `s.acc` set/rep scheme (not `s.main`)
- Cap RPE at 5
- Add `patternLearning: true` flag to the item
- The item's note becomes: `'Pattern learning — focus on form, not load'`

### Priority scoring

In the tie-breaking score calculation, add after existing bonuses:

```js
if (ctx.exercisePriority?.includes(ex.id)) score *= 1.35;
```

---

## 9. Functional Session Primer Block

In `buildWeek()` for `style === 'functional'`, prepend a primer block before handing off to `allocateGym()`:

```js
const FUNCTIONAL_PRIMER = [
  { num: 'W1', name: '90/90 Hip Flexor Stretch', sets: '2 × 45s/side', rpe: 'RPE 3',
    tag: 'mobility', note: 'Release hip flexors before loading', restSec: 30 },
  { num: 'W2', name: 'Glute Bridge (2s hold)', sets: '3 × 12', rpe: 'RPE 4',
    tag: 'mobility', note: 'Activate glutes — squeeze hard at top', restSec: 30 },
  { num: 'W3', name: 'Band Pull-Apart', sets: '3 × 20', rpe: 'RPE 3',
    tag: 'mobility', note: 'Slow and deliberate — feel the rear delts', restSec: 30 },
  { num: 'W4', name: 'Cat-Camel + Thoracic Rotation', sets: '10 + 8/side', rpe: 'RPE 2',
    tag: 'mobility', note: 'Restore thoracic mobility before pressing or pulling', restSec: 30 }
];
```

The primer items are prepended to `session.items` and are clearly visually separated in the UI (already handled by the `tag: 'mobility'` rendering, no UI changes needed).

---

## 10. Cycling Support Template

Add a cycle family to `buildSupport()` in `strength.js`, matching the existing run/swim structure:

```js
const cycle = [
  [ // A — posterior chain + hip flexor antidote
    { num: 'A1', name: 'Hip thrust', sets: `${sets} × 10`, rpe: 'RPE 7', note: 'full hip extension — squeeze glutes hard' },
    { num: 'B1', name: 'Single-leg leg press', sets: `${sets} × 10 ea.`, rpe: 'RPE 7', note: 'cycling-specific unilateral load' },
    { num: 'B2', name: 'Lateral band walk', sets: '3 × 15 ea.', rpe: 'RPE 6', note: 'IT band prevention — glute medius', tag: 'mobility' },
    { num: 'C1', name: 'Single-leg RDL', sets: `${sets} × 8 ea.`, rpe: 'RPE 7', note: 'hamstring hip extension — missing on the bike' },
    { num: 'C2', name: 'Pallof press', sets: '3 × 10 ea.', rpe: 'RPE 6', note: 'anti-rotation core', tag: 'mobility' }
  ],
  [ // B — thoracic + knee health
    { num: 'A1', name: 'Bulgarian split squat', sets: `${sets} × 8 ea.`, rpe: 'RPE 7', note: 'hip flexor stretch in rear leg' },
    { num: 'B1', name: 'Single-leg RDL', sets: `${sets} × 8 ea.`, rpe: 'RPE 7', note: 'hamstring hip extension — addresses cycling deficit' },
    { num: 'B2', name: 'Copenhagen plank', sets: '3 × 20s ea.', rpe: 'RPE 7', note: 'adductor health', tag: 'mobility' },
    { num: 'C1', name: 'Seated calf raise', sets: '3 × 15', rpe: 'RPE 6', note: 'soleus loading', tag: 'mobility' },
    { num: 'C2', name: 'Thoracic foam roller extension', sets: '2 × 60s', rpe: 'RPE 2', note: 'reverse the cycling kyphosis', tag: 'mobility' }
  ]
];
```

---

## 11. Future Exercise Library Foundation

Every new exercise includes `cues` (2–3 form points) and `injuryRisk` (specific failure mode, not generic). This data is inert in the current implementation but seeds the animated exercise library when it is built, without requiring a schema change.

Example:
```js
{
  id: 'back_squat',
  cues: [
    'Full 360° brace before descent — breathe into your belly, not your chest',
    'Knees track over second toe — push them out actively throughout',
    'Chest stays tall — thoracic extension fights forward lean'
  ],
  injuryRisk: 'Lumbar flexion at depth under axial load ("butt wink") — disc compression and shear; bar rolling onto neck from insufficient upper-back tightness'
}
```

---

## 12. Out of Scope

- **Automatic level promotion** (detecting when a beginner is ready to advance to returning): this requires tracking exercise-level completion quality over multiple sessions. Deferred to Stage 5 (AI coaching).
- **Animated exercise demonstrations**: the data fields (`cues`, `injuryRisk`) are added now to support this, but no UI is built.
- **Injury-based exercise exclusions**: the current injury system flags body parts; linking injuries to exercise contraindications is a separate design.
- **Rep-max testing / 1RM calculation**: `lifts` data from onboarding is already used for target weights; adding in-app testing is separate.

---

## 13. Implementation Notes

- The exercise database additions should be batched by category and reviewed against the level/`minLevelForPrimary` table before merging.
- `minLevelForPrimary` defaults to `undefined`, which the allocator treats as "same as level" (existing behaviour). No allocator changes are needed for exercises that don't set this field.
- The `exercisePriority` multiplier (×1.35) is intentionally modest — enough to consistently win ties, not enough to override equipment or level gating.
- The functional primer adds ~7 minutes to a functional session. In `buildWeek()`, reduce the `minutes` passed to `allocateGym()` by 7 when `style === 'functional'` so total session length is preserved (e.g. a 60-min session → 53 min of working sets + 7 min primer = 60 min total).
- Good morning (corrected to level 3) appears in the cycling support B template with `sets: '3 × 8', rpe: 'RPE 6'` — only shown to intermediate/advanced athletes. The cycling support builder already respects the `level` gate.
