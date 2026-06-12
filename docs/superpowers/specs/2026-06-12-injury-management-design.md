# Injury Management Design
**Date:** 2026-06-12
**Status:** Approved — ready for implementation planning

---

## Overview

Improve how injuries are logged and how they impact training plan generation, grounding everything in evidence-based physiotherapy and sports medicine. The system has two modes:

- **Active injury** — the plan engine modifies sessions to remove contraindicated exercises and insert structured rehab work, following clinical rehabilitation phases.
- **Recovered injury** — the engine weaves prevention exercises into normal sessions for body parts the athlete is prone to re-injuring, even when fully healthy.

The approach is **filter & substitute**: the plan generator runs normally, then a post-processing step applies injury rules to the output. The clinical knowledge lives in one place and is independent of the plan generator. This means zero regression risk to existing uninjured-user plan generation.

---

## 1. Data Model

### New fields on the `injuries` table (one versioned migration)

| Field | Type | Default | Purpose |
|---|---|---|---|
| `body_region` | text | null | `'lower_limb'` \| `'upper_limb'` \| `'core_spine'` \| `'other'` |
| `body_part_key` | text | null | Machine-readable key e.g. `'knee'`, `'shoulder'`, `'lumbar_spine'` — drives the rule engine |
| `side` | text | null | `'left'` \| `'right'` \| `'both'` \| null |
| `diagnosis_key` | text | null | Optional structured key e.g. `'patellar_tendinopathy'`, `'it_band_syndrome'` — set when physio-confirmed or symptom-matched |
| `physio_seen` | boolean | false | Did the user take the physio-confirmed logging path? |
| `rehab_phase` | text | `'protect'` | `'protect'` \| `'early_motion'` \| `'loading'` \| `'return_to_sport'` — manually advanced by the user |
| `symptom_flags` | jsonb | `{}` | Raw questionnaire answers — stored for Stage 5 AI context |
| `red_flag_triggered` | boolean | false | Did the symptom assessment hit a red-flag threshold? |
| `referred_to_professional` | boolean | false | Did the app redirect the user to seek professional help? |
| `prevention_exercises` | jsonb | `[]` | Structured list of prevention exercises auto-populated on recovery, user-editable |

### Existing fields retained unchanged
- `body_part` (free text) — stays as the human-readable label
- `severity` (1–5) — stays; severity + rehab_phase together govern what the engine allows
- `prevention_notes` (text) — stays for free-text physio notes on prevention
- All other existing fields

### Backwards compatibility
Existing injury records get all new fields as null/default. The filter treats `body_part_key: null` as "no rules available — do not modify sessions." No existing data is broken.

---

## 2. Module Structure

Six new files. Nothing in the existing plan engine (`PlanGenerator.js`, `allocator.js`, `strength.js`, etc.) is modified.

```
src/
├── data/
│   ├── injuryTaxonomy.js         # Body part hierarchy + diagnosis list
│   └── rehabExercises.js         # Rehab exercise library with clinical rationale
├── lib/
│   └── injury/
│       ├── symptomAssessment.js  # Questionnaire logic + red-flag detection
│       ├── injuryRules.js        # Contraindication lookups + phase/prevention mapping
│       └── injuryFilter.js       # Post-generation session filter (active + prevention)
└── screens/
    └── Injuries.jsx              # Extended — logging flow rewritten (existing file)
```

### `src/data/injuryTaxonomy.js`
Pure data file. Contains:
- Body part hierarchy: region → specific part → allowed sides
- Full diagnosis list per body part (for physio-confirmed path)
- `high_risk` flag per diagnosis (e.g. suspected fracture, disc herniation, nerve compression) — triggers immediate professional referral regardless of symptom severity

### `src/data/rehabExercises.js`
Pure data file. Each exercise entry:
```js
{
  id: 'terminal_knee_extension',
  name: 'Terminal knee extension',
  instructions: 'Anchor band behind knee. Stand tall, straighten the knee against resistance.',
  body_part_keys: ['knee'],
  phases: ['early_motion', 'loading'],
  rationale: 'Isolates VMO activation without compressing the patellofemoral joint.',
  duration: '3 × 15 reps',
  equipment: 'band_or_bodyweight'
}
```

### `src/lib/injury/symptomAssessment.js`
Pure functions. No UI, no side effects.
- `getQuestions(body_region)` — returns the 4–6 symptom questions for a region
- `assess(body_region, answers)` — returns one of:
  - `{ result: 'red_flag', reason: string, redirect_message: string }` — stop, refer to professional
  - `{ result: 'probable', body_part_key, diagnosis_key, confidence }` — continue with suggested match
  - `{ result: 'unclear', body_part_key }` — body part known, diagnosis unknown, continue

Red-flag thresholds are stricter for high-risk regions:
- **Lower back:** any neurological symptom (numbness, tingling, radiating leg pain, bowel/bladder changes) → red flag
- **Knee:** acute onset + cannot bear weight + significant swelling → red flag
- **Shoulder:** acute trauma + inability to lift arm + severe pain → red flag
- **Any region:** reported chest pain during exercise → red flag, direct to emergency services

### `src/lib/injury/injuryRules.js`
Pure functions. The clinical knowledge layer.

**`getContraindications(body_part_key, severity, rehab_phase)`**
Returns `{ blockedTags: string[], blockedMuscleGroups: string[] }`.

Severity gates strictness:
- 5 — full rest of the region; block all loading exercises for affected area
- 4 — gentle unloaded mobility only; block all resistance and impact
- 3 — partial loading allowed; block high-load, impact, and compound movements for the area
- 2 — modified training; block only the highest-stress movements
- 1 — train with caution; no blocks, add a caution flag to adjacent exercises

Rehab phase shapes the type of work allowed:
| Phase | What is permitted |
|---|---|
| Protect | Rest + gentle unloaded mobility only |
| Early Motion | Pain-free range of motion, isometrics, no joint loading |
| Loading | Progressive resistance — controlled, single-joint first |
| Return to Sport | Sport-specific loading, plyometrics reintroduced gradually |

**`getRehabExercises(body_part_key, severity, rehab_phase)`**
Returns an array of exercises from `rehabExercises.js` matched to the current body part and phase, filtered by severity (high severity → simpler, lower-load exercises only).

**`getPrevention(body_part_key, diagnosis_key, injuryCount)`**
Returns prevention exercises for recovered injuries. `injuryCount` governs volume:
- 1 prior injury → 2–3 maintenance exercises (added to warm-up)
- 2+ prior injuries → fuller prevention block in every session warm-up
- `recurrenceRisk: true` diagnoses (ACL, patellar tendinopathy, Achilles tendinopathy, IT band syndrome, stress fracture) → always return the fuller block regardless of count

**`recurrenceRisk(diagnosis_key)`**
Returns boolean. Clinically documented high-recurrence diagnoses return true.

### `src/lib/injury/injuryFilter.js`
Pure functions. Takes generated plan data and injury data, returns modified plan data. Called from `PlanService.js` — the existing wrapper that all screens use to read plan data — so every consumer gets injury-filtered sessions automatically. Never called from the plan generator itself.

**`applyInjuryRules(generatedWeek, activeInjuries)`**
For each session in the week:
1. Calls `getContraindications` for every active injury with a `body_part_key`
2. Removes blocked exercises, marks them `{ ...exercise, substituted: true, substituteReason: string }`
3. Inserts rehab exercises from `getRehabExercises`, marked `{ ...exercise, rehab: true, rationale: string }`
4. Calculates overlap ratio (blocked exercises ÷ total exercises)
5. If overlap > 70% → replaces the entire session with a structured rehab session:
   - `title: 'Rehab — [Body Part] · [Phase]'`
   - `discipline: 'rehab'`
   - `intensity: 'low'`
   - `duration: '20–30 min'`
   - `items`: full set of rehab exercises for the injury at current phase
6. Attaches `injuryBanner` to the session:
   ```js
   { injuries: ['Left knee'], message: 'Modified for your Left knee injury', phase: 'Early Motion' }
   ```

**`applyPrevention(generatedWeek, injuryHistory)`**
Runs on all weeks, including fully healthy ones. For each recovered injury with a `body_part_key`:
1. Calls `getPrevention` to get prevention exercises
2. Inserts them into the session warm-up/primer block
3. Marks them `{ ...exercise, prevention: true, preventionNote: 'Added to support your knee history' }`
4. No banner — prevention exercises are silent additions that look like normal programming

---

## 3. Injury Logging Flow

The "Log an injury" button opens a stepped card flow — one step at a time, back button at each step, progress dots. Stays within the existing `ScreenContainer` pattern.

### Step 1 — Triage gate
> "Have you seen a physiotherapist or doctor about this injury?"
Two buttons: **Yes** / **Not yet**

---

### Path A: Physio-confirmed

1. **Region picker** — Lower Limb / Upper Limb / Core & Spine / Other
2. **Body part picker** — specific part for that region (from `injuryTaxonomy.js`)
3. **Side** — Left / Right / Both / Not applicable
4. **Diagnosis picker** — searchable list of known diagnoses for that body part. "I don't have a specific diagnosis" always available, skips to free text
5. **Severity slider** — 1–5 with plain-language labels:
   - 1 = Mild discomfort, doesn't affect training
   - 2 = Noticeable, training is modified
   - 3 = Significantly affects training
   - 4 = Cannot train the affected area
   - 5 = Unable to train at all
6. **Rehab phase picker** — four options with plain-language descriptions:
   - Protect & Rest — "Complete or near-complete rest of the area"
   - Early Motion — "Gentle movement, no load on the joint"
   - Strengthening — "Progressive loading, building back up"
   - Return to Sport — "Sport-specific work, almost back to full training"
7. **Physio notes** — free text (saves to `rehab_plan`, `rehab_plan_source: 'physio'`, `physio_approved: true`)

---

### Path B: Self-reported

1. **Region picker** — same as Path A
2. **Symptom questionnaire** — 4–6 yes/no or scale questions from `symptomAssessment.getQuestions(region)`. Examples for Lower Limb:
   - "Did this come on suddenly (e.g. during activity) or gradually over time?"
   - "Is there numbness or tingling in your foot or leg?"
   - "Can you put your full weight through it normally?"
   - "Is there visible swelling or bruising?"
   - "Does it hurt at rest, or mainly during movement?"
3. **Red-flag check** — runs after each answer via `symptomAssessment.assess()`. If triggered:
   > "Based on what you've described, we'd recommend seeing a physiotherapist or GP before starting any rehab programme. We can still log this injury for your records, but we won't generate a rehab plan until you've been assessed."
   Saves with `red_flag_triggered: true`, `referred_to_professional: true`. No rehab exercises generated.
4. **If no red flags** — shows probable match: "This sounds like it could be Runner's knee — does that sound right?" User can accept, pick a different option, or choose "Not sure."
5. **Severity slider** — same as Path A
6. **Rehab phase** — auto-set to `'protect'` (safest default for self-reported). User can change it.
7. **Description** — free text for how it happened and how it feels

---

### On recovery

When the user taps "Mark recovered" on an injury card:
1. Prompt: "Any notes from your physio on preventing this coming back?" (free text, optional)
2. Prevention exercises auto-populated from `injuryRules.getPrevention()` for the `diagnosis_key` / `body_part_key`
3. User can edit, remove, or add to the list before saving
4. Saved to `prevention_exercises` — immediately active in future plan generation

---

## 4. Injury History & Prevention

Injuries with `status: 'recovered'` are never deleted — they form the athlete's permanent injury history. The system uses this history in two ways:

**Pattern detection** — `applyPrevention` scans all recovered injuries. Same `body_part_key` appearing 2+ times, or any injury with `recurrenceRisk: true`, flags that body part as "prone." Prevention exercise volume scales with proneness.

**Silent integration** — prevention exercises are inserted into normal sessions without banners or callouts. A long-press or info icon on the exercise reveals the note: "Added to support your knee history." The athlete doesn't need to think about it — it's just part of their programme.

**Stage 5 AI hook** — the AI layer (Edge Function) will read injury history, recurrence counts, and session log data (which prevention exercises were actually completed) and can intelligently adjust prevention volume and exercise selection over time. The data structures are already shaped for this.

---

## 5. UI Changes

### `Injuries.jsx` — changes
- "Log an injury" opens the new multi-step triage flow instead of the current single form
- Injury cards gain:
  - **Rehab phase stepper** — horizontal 4-step progress bar (Protect → Early Motion → Loading → Return to Sport). Tap current phase to advance. Plain-language explanation shown before confirming the change.
  - **Prevention exercises block** (recovered injuries only) — shows active prevention exercises with an edit button. Replaces the "Virtual physio" placeholder block (removed).
- The `status` dropdown gains no new options — the four existing statuses (active, rehabbing, monitoring, recovered) map cleanly to the clinical model

### `SessionDetail.jsx` — changes
**Injury banner** (when `session.injuryBanner` is present):
```
⚠ Modified for your Left knee injury
   2 exercises replaced with rehab work · Rehab phase: Early Motion
```
Styled with `--ochre` left border. Positioned above the exercise list, below the session title.

**Substituted exercises** — rendered with strikethrough text in `--txt-muted`, small "Replaced" tag in ochre. Tapping expands: "Removed — contraindicated for your knee injury at this rehab phase."

**Rehab exercises** — small "Rehab" tag in `--moss`. Tapping expands to show the clinical rationale (one sentence from `rehabExercises.js`).

**Fully-replaced sessions** — session card on the week view shows discipline tag "Rehab" in ochre instead of the normal discipline colour.

**Prevention exercises** — visually identical to normal exercises. A small ⓘ icon on the right; tapping reveals: "Added to support your knee history."

### `Progress.jsx` — changes
Add an "Injuries" `LinkRow` to the link list (after Trends):
```
Injuries    |  0 active — no current injuries    |  [chevron]
```
If active injuries exist, badge shows count and the subtitle lists injury titles.

### `Profile.jsx` — changes
Remove the injuries link row. Replace with a one-line plain-text summary in the Plan card:
```
Injuries: none active
```
or
```
Injuries: 1 active — Left knee
```
Tapping the line navigates to `/tracking/injuries` (no separate link row needed).

### `App.jsx` — routing changes
One line change in `routeMeta`:
```js
'/tracking/injuries': { title: 'Injury log', topLevel: false, tab: 'progress' },  // was tab: 'profile'
```
The canonical URL (`/tracking/injuries`) and the existing `/profile/injuries` route are unchanged. Only the active tab highlight moves from Profile to Progress.

---

## 6. What Is Not In This Design

- **No AI-generated rehab plans in this phase.** The "Virtual physio" feature (Stage 5) calls a Claude Edge Function and returns personalised rehab guidance. That is out of scope here. The data model and `injuryBanner` UI are shaped to receive AI output later, but nothing calls the AI in this implementation.
- **No automatic phase advancement.** The athlete moves through rehab phases manually (advised by their physio or own judgement). Automatic advancement based on recovery log entries or session completion is a Stage 5 AI feature.
- **No wearable-triggered injury detection.** Detecting injuries from HRV/RHR anomalies is a future AI feature.
- **No changes to the Supabase RLS policies.** The new fields are on the existing `injuries` table which already has correct RLS (auth.uid() = user_id).

---

## 7. Migration

One new Supabase migration file adds the new columns to the `injuries` table. All new columns have safe defaults (null or false) so existing rows are unaffected. The migration must be reviewed and applied before the feature is deployed.

```sql
-- Migration: add structured injury fields
alter table public.injuries
  add column if not exists body_region          text,
  add column if not exists body_part_key        text,
  add column if not exists side                 text,
  add column if not exists diagnosis_key        text,
  add column if not exists physio_seen          boolean not null default false,
  add column if not exists rehab_phase          text not null default 'protect',
  add column if not exists symptom_flags        jsonb not null default '{}'::jsonb,
  add column if not exists red_flag_triggered   boolean not null default false,
  add column if not exists referred_to_professional boolean not null default false,
  add column if not exists prevention_exercises jsonb not null default '[]'::jsonb;
```
