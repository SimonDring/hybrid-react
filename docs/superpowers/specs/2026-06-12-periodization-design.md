# Science-Backed Periodization & Plan Continuity

**Date:** 2026-06-12
**Status:** Approved for implementation
**Scope:** Goal-specific block lengths, phase structures, deload protocols, plan continuation with block-end check-in, onboarding simplification

---

## 1. Problem Statement

The current plan generator has three gaps:

1. **Block length is user-chosen or a flat 16-week default.** The science says different goals need different block lengths — hypertrophy peaks at 5–6 weeks, strength needs 10–12, sport support splits by season. A flat 16-week default is wrong for everyone.

2. **Phase structure is the same for all goals** (Base 40% → Build 40% → Peak 20%). Hypertrophy doesn't need a peak phase. Strength's phase structure maps to specific intensity zones. A recreational swimmer doesn't have seasons.

3. **Plans don't continue.** When a block ends, the user has to manually rebuild. There's no check-in, no continuation, no progression into the next block. This creates drop-off and breaks the long-term coaching relationship.

---

## 2. Onboarding Changes

### Replace `sportSeason` with `sportIntent`

**Current onboarding question (too jargon-heavy):**
> "Are you in season or off season?"
> `sportSeason: 'in' | 'off'`

**New onboarding question (Option B — intent-first):**
> *"How do you train for [swimming/running/cycling]?"*
> - **I compete or race** *(I have events I prepare for)*
> - **I train for fitness and enjoyment** *(no specific competition in mind)*
> - **I'm building up to my first event** *(new to competitive side)*

Maps to: `sportIntent: 'compete' | 'recreational' | 'building'`

**If `compete` is selected:** a follow-up asks for the approximate event date (optional, skippable):
> *"When is your next main event? (Optional — helps us time your training peaks)"*
> Date picker → `eventDate: ISO date string | null`

The `sportSeason` field becomes **derived and dynamic**, not user-declared:
- If `eventDate` is set: season is computed from today vs. event date
- If `sportIntent === 'recreational'`: no season concept — rolling blocks only
- If `sportIntent === 'building'`: treated as off-season until an event date is set

### `onboardingModel.js` changes

```js
// Replace:
sportSeason: 'off',           // 'in' | 'off'

// With:
sportIntent: 'recreational',  // 'compete' | 'recreational' | 'building'
eventDate: '',                // ISO date string, optional
```

`answersToProfilePatch()` maps these to the profile:
```js
sport_intent: a.sportIntent || 'recreational',
event_date: a.eventDate || null,
// sport_season is now computed, not stored from onboarding
```

### Season derivation function

New utility in `program.js`:

```js
function deriveSeason(profile) {
  if (profile.sport_intent !== 'compete') return null; // recreational = no season
  const today = new Date();
  const eventDate = profile.event_date ? new Date(profile.event_date) : null;
  if (!eventDate) return 'off'; // competing but no date set = off-season default
  const weeksToEvent = Math.ceil((eventDate - today) / (7 * 86400000));
  if (weeksToEvent <= 0) return 'transition';    // event passed
  if (weeksToEvent <= 6) return 'in';            // race season underway
  if (weeksToEvent <= 16) return 'pre';          // pre-season bridge
  return 'off';                                   // off-season strength building
}
```

Seasons: `'off' | 'pre' | 'in' | 'transition' | null`

---

## 3. Periodization Profiles

A new `PERIODIZATION_PROFILES` object in `PlanGenerator.js` (or a new `src/lib/plan/periodization.js` file) defines the block structure for each goal. `planLength()` and `phaseSplit()` are replaced by `resolvePeriodization(profile)`.

### 3a. Hypertrophy

**Scientific basis:** RP Hypertrophy model (Israetel). Volume ramps MEV→MRV over 5–6 weeks, then deloads. Peaks are unnecessary — the "peak" is the highest-volume week of the block. Rolling mesocycles indefinitely.

```js
hypertrophy: {
  blockLength: 6,              // weeks per mesocycle (4 for advanced, 8 for beginner)
  phases: [
    { name: 'accumulation', label: 'Accumulation', intent: 'base',  weeks: 2, volumeIndex: 0.75, repRange: [10, 15] },
    { name: 'intensification', label: 'Intensification', intent: 'build', weeks: 3, volumeIndex: 1.0,  repRange: [8, 12] },
    { name: 'mrvWeek', label: 'Peak Volume', intent: 'peak', weeks: 1, volumeIndex: 1.15, repRange: [8, 10] },
  ],
  deload: {
    frequencyWeeks: 6,         // after each full block
    volumePct: 0.50,           // cut volume to 50% of peak
    intensityPct: 0.90,        // keep intensity (this is the evidence-based number)
    durationDays: 7
  },
  annualStructure: 'rolling',  // no fixed macrocycle
  gymVolumeScalar: 1.0
}
```

### 3b. Strength

**Scientific basis:** Block periodization (Issurin). Three sub-phases of ~4 weeks each inside a 10–12 week block: high volume/moderate intensity → moderate volume/high intensity → low volume/max intensity. Repeats 3–4 times per year.

```js
strength: {
  blockLength: 12,
  phases: [
    { name: 'accumulation', label: 'Volume Base', intent: 'base',  weeks: 4, volumeIndex: 1.0,  intensityIndex: 0.75, repRange: [6, 10] },
    { name: 'intensification', label: 'Intensity Build', intent: 'build', weeks: 4, volumeIndex: 0.75, intensityIndex: 0.85, repRange: [3, 6] },
    { name: 'realization', label: 'Peak Strength', intent: 'peak', weeks: 4, volumeIndex: 0.50, intensityIndex: 0.95, repRange: [1, 4] },
  ],
  deload: {
    frequencyWeeks: 4,         // at each phase boundary (3×/block)
    volumePct: 0.50,
    intensityPct: 0.90,
    durationDays: 7
  },
  annualStructure: 'rolling',  // 3–4 full cycles/year
  gymVolumeScalar: 1.0
}
```

### 3c. Functional

**Scientific basis:** ACSM guidelines + Janda/McGill motor learning model. Neuromotor adaptations take 8–12 weeks. Longer blocks than athletic goals because movement quality is the adaptation being sought, not peak performance. Max intensity is moderate throughout — no peaking.

```js
functional: {
  blockLength: 10,
  phases: [
    { name: 'foundation', label: 'Foundation', intent: 'base',  weeks: 4, volumeIndex: 0.75, repRange: [12, 15] },
    { name: 'development', label: 'Development', intent: 'build', weeks: 4, volumeIndex: 1.0,  repRange: [10, 12] },
    { name: 'consolidation', label: 'Consolidation', intent: 'build', weeks: 2, volumeIndex: 0.85, repRange: [10, 12] },
  ],
  deload: {
    frequencyWeeks: 6,
    volumePct: 0.40,
    intensityPct: 0.85,        // modest intensity reduction too — matches health-focus
    durationDays: 7
  },
  annualStructure: 'rolling',
  gymVolumeScalar: 1.0
}
```

### 3d. Sport Goals — Recreational (no events)

**Scientific basis:** No periodization research exists specifically for recreational sport participants. The right model is functional fitness with sport-specific exercise selection. Rolling blocks, continuous improvement, no peaking. Deload every 6 weeks.

```js
sportRecreational: {
  blockLength: 8,
  phases: [
    { name: 'base',    label: 'Base Strength',   intent: 'base',  weeks: 4, volumeIndex: 0.85, repRange: [10, 15] },
    { name: 'build',   label: 'Build Strength',  intent: 'build', weeks: 4, volumeIndex: 1.0,  repRange: [8, 12] },
  ],
  deload: {
    frequencyWeeks: 6,
    volumePct: 0.45,
    intensityPct: 0.90,
    durationDays: 7
  },
  annualStructure: 'rolling',
  gymVolumeScalar: 0.95,       // slight reduction from pure build program
  // exercise selection: sport emphasis multipliers active, full exercise library
}
```

### 3e. Sport Goals — Compete, Off-Season

**Scientific basis:** Rønnestad et al. (run + cycle), Girold et al. (swim). Heaviest gym work of the year. Genuine strength building — not "sport support lite." The sport biases *which* exercises win selection, not how much or how heavy. Three phases: anatomical adaptation → maximal strength → power transfer.

```js
sportOffSeason: {
  blockLength: 12,
  phases: [
    { name: 'anatomical', label: 'Anatomical Adaptation', intent: 'base',  weeks: 4, volumeIndex: 0.80, repRange: [12, 15] },
    { name: 'maxStrength', label: 'Max Strength',         intent: 'build', weeks: 6, volumeIndex: 1.0,  repRange: [4, 6]  },
    { name: 'power',       label: 'Power Transfer',       intent: 'peak',  weeks: 2, volumeIndex: 0.70, repRange: [3, 5], includePlyometrics: true },
  ],
  deload: {
    frequencyWeeks: 4,
    volumePct: 0.50,
    intensityPct: 0.90,
    durationDays: 7
  },
  gymVolumeScalar: 1.0,        // full volume — this is the strength building window
  sessionsPerWeek: 3            // higher gym frequency off-season
}
```

**Key distinction from current behaviour:** `volumeScalar` was 0.85 for sport off-season. This is raised to 1.0 because off-season is now explicitly the strength-building window, not just sport support.

### 3f. Sport Goals — Compete, Pre-Season (Bridge)

A 4–6 week transition. Gym volume drops by ~40%, sport training volume starts ramping. Goal: don't arrive at the race season with gym-tired legs.

```js
sportPreSeason: {
  blockLength: 6,
  phases: [
    { name: 'bridge', label: 'Pre-Season Bridge', intent: 'build', weeks: 6, volumeIndex: 0.65, repRange: [6, 10] },
  ],
  deload: {
    frequencyWeeks: 6,         // one deload at block end
    volumePct: 0.45,
    intensityPct: 0.90,
    durationDays: 5            // slightly shorter — race prep takes priority
  },
  gymVolumeScalar: 0.65,
  sessionsPerWeek: 2
}
```

### 3g. Sport Goals — Compete, In-Season

**Scientific basis:** Maintenance dose (Rønnestad/Mujika detraining literature). Purpose: preserve strength adaptations from off-season, prevent injury. Not developmental. 2 sessions/week maximum, exercises focused on sport-specific injury prevention.

```js
sportInSeason: {
  blockLength: 4,              // rolling 4-week blocks; swim: 3
  phases: [
    { name: 'maintenance', label: 'In-Season Maintenance', intent: 'base', weeks: 4, volumeIndex: 0.45, repRange: [6, 10] },
  ],
  deload: {
    frequencyWeeks: null,      // race-driven, not fixed schedule; generator treats null as "never auto-deload — deload only via check-in or manual race-week taper"
    volumePct: 0.60,
    intensityPct: 0.90,
    durationDays: 5
  },
  gymVolumeScalar: 0.45,       // 45% of off-season; swim: 0.30
  sessionsPerWeek: 2,          // hard cap
  exerciseFocus: 'injury_prevention'   // allocator prioritises prehab/sport-specific
}
```

### 3h. Sport Goals — Transition

One to two weeks after a main event. Active recovery only. No structured gym work generated.

---

## 4. `resolvePeriodization(profile)` — New Function

Replaces `planLength()` + `phaseSplit()` in `PlanGenerator.js`.

```js
export function resolvePeriodization(profile) {
  const { goal_type, strength_style, sport_intent, event_date } = profile;
  const season = deriveSeason(profile);

  // Build-me goals
  if (goal_type === 'build' || !goal_type) {
    const style = strength_style || 'functional';
    if (style === 'bodybuilding') return PERIODIZATION_PROFILES.hypertrophy;
    if (style === 'strength')     return PERIODIZATION_PROFILES.strength;
    return PERIODIZATION_PROFILES.functional;
  }

  // Sport goals
  if (goal_type === 'sport') {
    if (sport_intent === 'recreational' || sport_intent === 'building') {
      return PERIODIZATION_PROFILES.sportRecreational;
    }
    // compete
    if (season === 'off' || season === null) return PERIODIZATION_PROFILES.sportOffSeason;
    if (season === 'pre')                    return PERIODIZATION_PROFILES.sportPreSeason;
    if (season === 'in')                     return PERIODIZATION_PROFILES.sportInSeason;
    if (season === 'transition')             return PERIODIZATION_PROFILES.sportRecreational; // recovery mode
  }

  return PERIODIZATION_PROFILES.functional; // safe default
}
```

`PlanGenerator.generatePlan()` calls `resolvePeriodization(profile)` and uses the returned profile's `blockLength` and `phases` array instead of `planLength()` + `phaseSplit()`.

---

## 5. Deload Logic Updates

The deload logic in `PlanGenerator.js` currently hard-codes `winp % 4 === 0`. This is replaced by reading from the periodization profile:

```js
const deload = (winp % periProfile.deload.frequencyWeeks === 0);
```

The `volumeScalar` passed to `allocateGym()` and the run/swim builders is multiplied by the deload factor when a deload week fires:

```js
const effectiveVolumeScalar = deload
  ? periProfile.gymVolumeScalar * periProfile.deload.volumePct
  : periProfile.gymVolumeScalar;
```

**The intensity (RPE) is kept the same during deloads** — the scheme function in `allocator.js` does not lower RPE targets on deload weeks. Only set count is reduced (via `volumeScalar`). This is the evidence-based approach: volume cut, intensity maintained.

---

## 6. Plan Continuation & Block-End Check-In

### Data model

A new lightweight record on `users.profile` (no new Supabase table):

```js
profile.block_history: [
  {
    blockNum: 1,
    goal: 'run',
    season: 'off',
    startDate: '2026-01-01',
    endDate: '2026-04-01',
    completedSessions: 28,
    totalSessions: 36,
    checkinAnswers: { goalChanged: false, injuryArea: null, performance: 'good', sessionsMissed: 2 }
  }
]
```

Stored as JSONB on the existing `users.profile` row — no migration needed.

### When the check-in triggers

The app detects block completion when `weekNum >= plan.totalWeeks`. A check-in screen is shown **instead of the next session** — the user can't skip past it without acknowledging.

A soft reminder also appears 3 days before block end: *"Your current training block ends this week. We'll check in with you on [date]."*

### Check-in screen — branching flow

The check-in is a short wizard (max 4 questions for standard case, 7 for edge cases). Target completion: under 90 seconds.

```
Q1: "Is your goal still the same?"
    [Yes, keep going] → Q2
    [No, I want to change it] → full recalibration (re-runs onboarding goal section)

Q2 [sport goals only]: "Has your season changed?"
    [No, same as before] → Q3
    [Yes, I'm now in/off season] → generate 4-week bridge block → done
    [I have an upcoming event] → ask for event date → recalculate season → bridge block if needed

Q3: "Any injuries or pain during this block?"
    [All good] → Q4
    [Yes] → "Which area?" → flag for corrective volume reduction → Q4

Q4: "How did your training feel this block overall?"
    [Strong — hitting most sessions well] → progress normally → summary
    [Mixed — completed most but some struggle] → standard progression → summary
    [Hard — struggled to complete sessions consistently] → Q5

Q5 [only if Q4 = Hard]: "Roughly how many sessions did you miss?"
    [0–1] → standard progression
    [2–3] → reduce block starting volume by 15%
    [4+] → repeat current block at 80% starting volume

[summary screen]: "Here's your next block: [X weeks], starting [date]. Ready?"
    [Let's go] → generate next block → update plan
```

### Continuation logic

```js
function continueBlock(profile, checkInAnswers, currentPeriProfile) {
  const { goalChanged, seasonChanged, injuryArea, performance, sessionsMissed } = checkInAnswers;

  if (goalChanged) {
    return { action: 'recalibrate' }; // re-run goal selection, rebuild from scratch
  }

  if (seasonChanged) {
    const newSeason = deriveSeason({ ...profile, sport_season: checkInAnswers.newSeason });
    const newPeriProfile = resolvePeriodization({ ...profile, derived_season: newSeason });
    return { action: 'bridge', bridgeWeeks: 4, nextProfile: newPeriProfile };
  }

  let volumeMultiplier = 1.0;
  if (sessionsMissed >= 4)  volumeMultiplier = 0.80; // restart at lower volume
  if (sessionsMissed >= 2)  volumeMultiplier = 0.85;
  if (performance === 'hard' && sessionsMissed < 2) {
    return { action: 'repeatBlock', volumeMultiplier: 0.90 };
  }

  return {
    action: 'nextBlock',
    volumeMultiplier,
    injuryExclusions: injuryArea ? [injuryArea] : [],
    blockNum: (profile.current_block_num || 1) + 1
  };
}
```

### Plan generation for the next block

`generatePlan()` is called again with updated profile fields. The key difference from the first plan generation: `current_block_num` increments, which causes `weeklyMuscleTargets()` to use a higher base volume (the ramp has effectively reset at a higher MEV, reflecting accumulated fitness from the previous block).

Concretely: after block 1, the MEV for each muscle group increases by ~5–10% (consistent training age increase). After block 2, another 5–10%. This is the long-term progressive overload at the macro level.

---

## 7. Phase Label & UI Updates

The existing phase labels (Base / Build / Peak & Sharpen) are reused where they fit. New labels are introduced for goal-specific phases:

| Goal | Phase labels shown in UI |
|---|---|
| Hypertrophy | Accumulation · Intensification · Peak Volume |
| Strength | Volume Base · Intensity Build · Peak Strength |
| Functional | Foundation · Development · Consolidation |
| Sport recreational | Base Strength · Build Strength |
| Sport off-season | Anatomical Adaptation · Max Strength · Power Transfer |
| Sport pre-season | Pre-Season Bridge |
| Sport in-season | In-Season Maintenance |

Phase descriptions (the `tagline` and `summary` text shown in the Phases screen) are updated to match:

```js
const PHASE_META = {
  accumulation:       { title: 'Accumulation',          tagline: 'Build the volume base. More sets, moderate weight.',          summary: 'Start near your minimum effective volume and progressively add sets across the block.' },
  intensification:    { title: 'Intensification',        tagline: 'Add weight, keep quality.',                                    summary: 'Volume stays steady while loads climb. This is where strength is earned.' },
  mrvWeek:            { title: 'Peak Volume',            tagline: 'Maximum productive work. Then we rest.',                       summary: 'The highest volume week of the block. Give it everything — deload follows.' },
  realization:        { title: 'Peak Strength',          tagline: 'Heavy, sharp, and powerful.',                                  summary: 'Low volume, high intensity. Express the strength you built.' },
  foundation:         { title: 'Foundation',             tagline: 'Learn the movements. Build the base.',                         summary: 'Light loads, good patterns. The work here pays off for months.' },
  development:        { title: 'Development',            tagline: 'Add load, keep quality.',                                      summary: 'Progressive loading on established movement patterns.' },
  consolidation:      { title: 'Consolidation',          tagline: 'Reinforce what you\'ve built.',                                summary: 'Moderate load and volume. Solidify the gains before resetting.' },
  anatomical:         { title: 'Anatomical Adaptation',  tagline: 'Prepare the body for heavy work ahead.',                       summary: 'Higher reps, full range. Building tendons and joint resilience before the heavy blocks.' },
  maxStrength:        { title: 'Max Strength',           tagline: 'This is the heavy work.',                                      summary: 'Low reps, heavy loads. The most direct path to sport performance improvement.' },
  power:              { title: 'Power Transfer',         tagline: 'Convert strength to speed and power.',                         summary: 'Explosive work translates gym strength into sport performance. Season is close.' },
  bridge:             { title: 'Pre-Season Bridge',      tagline: 'Transition to race season.',                                   summary: 'Gym volume eases back as sport training ramps up. Arrive at race season fresh.' },
  maintenance:        { title: 'In-Season Maintenance',  tagline: 'Protect the gains. Support the season.',                       summary: 'Short, purposeful gym sessions. Injury prevention and maintenance — nothing that adds fatigue to race day.' },
};
```

---

## 8. Architecture Changes Summary

| File | Change |
|---|---|
| `src/lib/onboardingModel.js` | Replace `sportSeason` with `sportIntent` + `eventDate` |
| `src/components/OnboardingWizard.jsx` | Updated sport intent question (Option B wording) + optional event date picker |
| `src/lib/strength/program.js` | Add `deriveSeason()` + update `resolveProgram()` to use derived season |
| `src/lib/PlanGenerator.js` | Add `PERIODIZATION_PROFILES` + `resolvePeriodization()`, replace `planLength()` + `phaseSplit()`, update deload logic |
| `src/lib/PlanService.js` or new `src/lib/plan/continuation.js` | `continueBlock()` function + `blockHistory` management |
| New screen: `src/screens/BlockCheckin.jsx` | Check-in wizard (branching, max 7 questions) |
| `src/stores/trainingStore.js` | Action to handle check-in answers + trigger next block generation |
| `src/App.jsx` (routing) | Route for `/checkin` screen |

---

## 9. What Doesn't Change

- The `generatePlan()` function signature is unchanged — it still takes a profile and returns `{ phases, totalWeeks }`. The internal logic changes, not the interface.
- Session rendering, completion tracking, and sync are unaffected.
- The Supabase schema gains one JSONB field (`block_history`) on the existing `users.profile` row. No new tables.
- Existing accounts without `sport_intent` set default to `'recreational'` (backwards-compatible).
- The `SPORT_EMPHASIS` multipliers in `program.js` remain unchanged — sport exercise selection still works as designed.

---

## 10. Out of Scope

- **HRV/wearable-triggered deloads:** The architecture (`deloadTrigger: 'fixed' | 'performance' | 'hrv'`) is prepared for this, but the wearable integration (existing but separate work) is a prerequisite.
- **RPE-based auto-regulation:** Detecting performance drops from logged RPE data requires minimum training history. Deferred until sufficient data exists (≥3 blocks).
- **Multiple concurrent events:** E.g., a runner with both a spring 10K and an autumn marathon. Single `eventDate` is sufficient for now.
- **Periodization for endurance sessions:** This spec covers gym periodization only. Run/swim/cycle session volume within `planTemplates.js` has its own progression logic (the `winp` ramp) which is unaffected.
