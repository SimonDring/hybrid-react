# Injury Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a clinically-grounded injury management system that logs injuries via a triage flow, applies evidence-based exercise substitutions to generated sessions, and silently weaves prevention work into recovered athletes' plans.

**Architecture:** Filter & substitute — `PlanService.js` calls `injuryFilter.js` after plan generation to post-process sessions. Clinical knowledge (contraindications, rehab exercises, prevention) lives in `src/lib/injury/` and `src/data/` only. The plan generator is untouched.

**Tech Stack:** React 18, Zustand, Supabase (Postgres), plain Node test files (existing pattern: `node tests/file.js`).

---

## File Map

**New files:**
- `supabase/migrations/20260612_injury_structured_fields.sql`
- `src/data/injuryTaxonomy.js`
- `src/data/rehabExercises.js`
- `src/lib/injury/symptomAssessment.js`
- `src/lib/injury/injuryRules.js`
- `src/lib/injury/injuryFilter.js`
- `tests/injury-engine.js`

**Modified files:**
- `src/lib/PlanService.js` — add `injuryFilteredPhases()`, update `getPhases()`
- `src/screens/Injuries.jsx` — triage flow, rehab phase stepper, prevention block
- `src/screens/SessionDetail.jsx` — injury banner + tagged exercises
- `src/screens/Progress.jsx` — add Injuries link row
- `src/screens/Profile.jsx` — replace link row with inline summary
- `src/App.jsx` — routeMeta tab change

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260612_injury_structured_fields.sql`

- [ ] **Write the migration file**

```sql
-- supabase/migrations/20260612_injury_structured_fields.sql
alter table public.injuries
  add column if not exists body_region              text,
  add column if not exists body_part_key            text,
  add column if not exists side                     text,
  add column if not exists diagnosis_key            text,
  add column if not exists physio_seen              boolean not null default false,
  add column if not exists rehab_phase              text not null default 'protect',
  add column if not exists symptom_flags            jsonb not null default '{}'::jsonb,
  add column if not exists red_flag_triggered       boolean not null default false,
  add column if not exists referred_to_professional boolean not null default false,
  add column if not exists prevention_exercises     jsonb not null default '[]'::jsonb;
```

- [ ] **Apply via Supabase CLI**

```bash
npx supabase db push
```

Expected: migration applied without errors. Existing injury rows unaffected (all new columns have safe defaults).

- [ ] **Commit**

```bash
git add supabase/migrations/20260612_injury_structured_fields.sql
git commit -m "feat: add structured injury fields migration"
```

---

## Task 2: Injury taxonomy data

**Files:**
- Create: `src/data/injuryTaxonomy.js`

- [ ] **Write the taxonomy file**

```js
// src/data/injuryTaxonomy.js
// Body part hierarchy: region → part → metadata
// body_part_key drives injuryRules.js — keep keys stable.

export const REGIONS = {
  lower_limb: {
    label: 'Lower Limb',
    parts: {
      knee:       { label: 'Knee',             sides: ['left','right','both'] },
      ankle:      { label: 'Ankle / Foot',     sides: ['left','right','both'] },
      hamstring:  { label: 'Hamstring',        sides: ['left','right','both'] },
      hip:        { label: 'Hip / Groin',      sides: ['left','right','both'] },
      calf:       { label: 'Calf / Achilles',  sides: ['left','right','both'] },
      shin:       { label: 'Shin / Tibia',     sides: ['left','right','both'] },
      quad:       { label: 'Quadriceps',       sides: ['left','right','both'] },
    }
  },
  upper_limb: {
    label: 'Upper Limb',
    parts: {
      shoulder:   { label: 'Shoulder',         sides: ['left','right','both'] },
      elbow:      { label: 'Elbow',            sides: ['left','right','both'] },
      wrist:      { label: 'Wrist / Hand',     sides: ['left','right','both'] },
    }
  },
  core_spine: {
    label: 'Core & Spine',
    parts: {
      lumbar:     { label: 'Lower Back',       sides: ['n/a'] },
      thoracic:   { label: 'Upper / Mid Back', sides: ['n/a'] },
      cervical:   { label: 'Neck',             sides: ['n/a'] },
      core:       { label: 'Core / Abdomen',   sides: ['n/a'] },
    }
  },
  other: {
    label: 'Other',
    parts: {
      other: { label: 'Other / Unsure', sides: ['left','right','both','n/a'] }
    }
  }
};

// Diagnoses per body_part_key.
// high_risk: true → immediate professional referral regardless of symptom severity.
export const DIAGNOSES = {
  knee: [
    { key: 'patellar_tendinopathy',    label: "Patellar tendinopathy (jumper's knee)", high_risk: false, recurrence_risk: true },
    { key: 'it_band_syndrome',         label: 'IT band syndrome',                      high_risk: false, recurrence_risk: true },
    { key: 'runners_knee',             label: "Runner's knee (PFPS)",                  high_risk: false, recurrence_risk: true },
    { key: 'meniscus',                 label: 'Meniscus injury',                       high_risk: true,  recurrence_risk: false },
    { key: 'acl',                      label: 'ACL injury',                            high_risk: true,  recurrence_risk: true },
    { key: 'mcl',                      label: 'MCL sprain',                            high_risk: false, recurrence_risk: false },
    { key: 'knee_oa',                  label: 'Knee osteoarthritis',                   high_risk: false, recurrence_risk: false },
    { key: 'knee_bursitis',            label: 'Knee bursitis',                         high_risk: false, recurrence_risk: false },
  ],
  ankle: [
    { key: 'ankle_sprain',             label: 'Ankle sprain (lateral)',                high_risk: false, recurrence_risk: true },
    { key: 'achilles_tendinopathy',    label: 'Achilles tendinopathy',                 high_risk: false, recurrence_risk: true },
    { key: 'plantar_fasciitis',        label: 'Plantar fasciitis',                     high_risk: false, recurrence_risk: true },
    { key: 'stress_fracture_foot',     label: 'Stress fracture (foot)',                high_risk: true,  recurrence_risk: true },
    { key: 'ankle_fracture',           label: 'Ankle fracture',                        high_risk: true,  recurrence_risk: false },
    { key: 'peroneal_tendinopathy',    label: 'Peroneal tendinopathy',                 high_risk: false, recurrence_risk: false },
  ],
  hamstring: [
    { key: 'hamstring_strain',         label: 'Hamstring strain',                      high_risk: false, recurrence_risk: true },
    { key: 'proximal_hamstring_ten',   label: 'Proximal hamstring tendinopathy',       high_risk: false, recurrence_risk: true },
    { key: 'hamstring_avulsion',       label: 'Hamstring avulsion (tendon tear)',      high_risk: true,  recurrence_risk: false },
  ],
  hip: [
    { key: 'hip_flexor_strain',        label: 'Hip flexor strain',                     high_risk: false, recurrence_risk: false },
    { key: 'hip_impingement',          label: 'Hip impingement (FAI)',                 high_risk: false, recurrence_risk: false },
    { key: 'labral_tear_hip',          label: 'Hip labral tear',                       high_risk: true,  recurrence_risk: false },
    { key: 'piriformis_syndrome',      label: 'Piriformis syndrome',                   high_risk: false, recurrence_risk: false },
    { key: 'groin_strain',             label: 'Groin / adductor strain',               high_risk: false, recurrence_risk: true },
    { key: 'stress_fracture_hip',      label: 'Stress fracture (hip)',                 high_risk: true,  recurrence_risk: false },
  ],
  calf: [
    { key: 'calf_strain',              label: 'Calf strain (gastrocnemius)',            high_risk: false, recurrence_risk: true },
    { key: 'achilles_tendinopathy',    label: 'Achilles tendinopathy',                 high_risk: false, recurrence_risk: true },
    { key: 'achilles_rupture',         label: 'Achilles rupture',                      high_risk: true,  recurrence_risk: false },
    { key: 'dvt',                      label: 'DVT / unusual calf swelling',            high_risk: true,  recurrence_risk: false },
  ],
  shin: [
    { key: 'shin_splints',             label: 'Shin splints (MTSS)',                   high_risk: false, recurrence_risk: true },
    { key: 'stress_fracture_tibia',    label: 'Tibial stress fracture',                high_risk: true,  recurrence_risk: true },
    { key: 'compartment_syndrome',     label: 'Compartment syndrome',                  high_risk: true,  recurrence_risk: false },
  ],
  quad: [
    { key: 'quad_strain',              label: 'Quadriceps strain',                     high_risk: false, recurrence_risk: false },
    { key: 'quad_contusion',           label: 'Quadriceps contusion (cork)',           high_risk: false, recurrence_risk: false },
  ],
  shoulder: [
    { key: 'rotator_cuff',             label: 'Rotator cuff strain / tendinopathy',    high_risk: false, recurrence_risk: true },
    { key: 'shoulder_impingement',     label: 'Shoulder impingement',                  high_risk: false, recurrence_risk: true },
    { key: 'labral_tear_shoulder',     label: 'SLAP / labral tear (shoulder)',         high_risk: true,  recurrence_risk: false },
    { key: 'ac_joint',                 label: 'AC joint sprain',                       high_risk: false, recurrence_risk: false },
    { key: 'shoulder_dislocation',     label: 'Shoulder dislocation',                  high_risk: true,  recurrence_risk: true },
    { key: 'frozen_shoulder',          label: 'Frozen shoulder (adhesive capsulitis)', high_risk: false, recurrence_risk: false },
    { key: 'bicep_tendinopathy',       label: 'Biceps tendinopathy',                   high_risk: false, recurrence_risk: false },
  ],
  elbow: [
    { key: 'lateral_epicondylitis',    label: "Tennis elbow (lateral epicondylitis)",  high_risk: false, recurrence_risk: true },
    { key: 'medial_epicondylitis',     label: "Golfer's elbow (medial epicondylitis)", high_risk: false, recurrence_risk: true },
    { key: 'elbow_bursitis',           label: 'Olecranon bursitis',                    high_risk: false, recurrence_risk: false },
  ],
  wrist: [
    { key: 'wrist_sprain',             label: 'Wrist sprain',                          high_risk: false, recurrence_risk: false },
    { key: 'de_quervain',              label: "De Quervain's tenosynovitis",           high_risk: false, recurrence_risk: false },
    { key: 'scaphoid_fracture',        label: 'Scaphoid fracture',                     high_risk: true,  recurrence_risk: false },
  ],
  lumbar: [
    { key: 'lower_back_strain',        label: 'Lower back strain / sprain',            high_risk: false, recurrence_risk: true },
    { key: 'disc_herniation',          label: 'Disc herniation / bulge',               high_risk: true,  recurrence_risk: true },
    { key: 'facet_joint',              label: 'Facet joint irritation',                high_risk: false, recurrence_risk: true },
    { key: 'sciatica',                 label: 'Sciatica / nerve root irritation',      high_risk: true,  recurrence_risk: true },
    { key: 'spondylolysis',            label: 'Spondylolysis / stress fracture',       high_risk: true,  recurrence_risk: false },
  ],
  thoracic: [
    { key: 'thoracic_strain',          label: 'Thoracic strain',                       high_risk: false, recurrence_risk: false },
    { key: 'rib_stress',               label: 'Rib stress reaction',                   high_risk: true,  recurrence_risk: false },
  ],
  cervical: [
    { key: 'neck_strain',              label: 'Neck strain / whiplash',                high_risk: false, recurrence_risk: false },
    { key: 'cervical_disc',            label: 'Cervical disc injury',                  high_risk: true,  recurrence_risk: false },
  ],
  core: [
    { key: 'abdominal_strain',         label: 'Abdominal muscle strain',               high_risk: false, recurrence_risk: false },
    { key: 'sports_hernia',            label: 'Sports hernia / inguinal disruption',   high_risk: true,  recurrence_risk: false },
  ],
  other: [
    { key: 'unknown',                  label: 'Unknown / not sure',                    high_risk: false, recurrence_risk: false },
  ]
};

// Quick lookup: is a diagnosis flagged as high-risk (auto-refer)?
export function isHighRisk(diagnosis_key) {
  return Object.values(DIAGNOSES).flat().some(d => d.key === diagnosis_key && d.high_risk);
}

// Does a diagnosis have documented high recurrence risk?
export function hasRecurrenceRisk(diagnosis_key) {
  return Object.values(DIAGNOSES).flat().some(d => d.key === diagnosis_key && d.recurrence_risk);
}

export default { REGIONS, DIAGNOSES, isHighRisk, hasRecurrenceRisk };
```

- [ ] **Commit**

```bash
git add src/data/injuryTaxonomy.js
git commit -m "feat: add injury taxonomy (body parts + diagnoses)"
```

---

## Task 3: Rehab exercise library

**Files:**
- Create: `src/data/rehabExercises.js`

- [ ] **Write the rehab exercise library**

```js
// src/data/rehabExercises.js
// Evidence-based rehab exercises per body_part_key + rehab phase.
// Each entry: id, name, instructions, body_part_keys[], phases[], rationale, duration, equipment.

export const REHAB_EXERCISES = [

  // ── KNEE ─────────────────────────────────────────────────────────────────
  { id: 'quad_set', name: 'Quad set (isometric)',
    instructions: 'Lie flat, roll a towel under the knee. Press the back of the knee into the floor and hold.',
    body_part_keys: ['knee'], phases: ['protect'],
    rationale: 'Activates the quadriceps without any joint compression or movement.',
    duration: '3 × 10 × 5s hold', equipment: 'none' },

  { id: 'slr_knee', name: 'Straight leg raise',
    instructions: 'Lie flat, bend the good leg. Tighten the quad of the injured leg and raise it to 45°, hold 2s, lower slowly.',
    body_part_keys: ['knee'], phases: ['protect', 'early_motion'],
    rationale: 'Builds quad and hip flexor strength with zero knee joint stress.',
    duration: '3 × 15', equipment: 'none' },

  { id: 'tke', name: 'Terminal knee extension (band)',
    instructions: 'Loop a band around a post at knee height. Step back, bend the knee slightly into the band. Straighten fully, squeezing the quad at end range.',
    body_part_keys: ['knee'], phases: ['early_motion', 'loading'],
    rationale: 'Isolates VMO activation in the last 30° of extension — the range lost earliest in knee injuries.',
    duration: '3 × 15 each side', equipment: 'band' },

  { id: 'heel_slide', name: 'Heel slide',
    instructions: 'Lie on your back. Slowly slide the heel toward the buttock as far as comfortable, hold 2s, slide back.',
    body_part_keys: ['knee'], phases: ['early_motion'],
    rationale: 'Gently restores knee flexion range of motion without load.',
    duration: '3 × 10', equipment: 'none' },

  { id: 'mini_squat', name: 'Mini squat (0–60°)',
    instructions: 'Stand with feet shoulder-width apart. Squat to roughly where your thighs are at 30–45° — no deeper. Drive up through the heels.',
    body_part_keys: ['knee'], phases: ['loading'],
    rationale: 'Progressive knee loading in the pain-free range; avoids peak patellofemoral forces at deeper angles.',
    duration: '3 × 12', equipment: 'none' },

  { id: 'low_step_up', name: 'Low step-up',
    instructions: 'Use a 10–15 cm step. Step up leading with the injured leg, control the descent. Keep the knee tracking over the second toe.',
    body_part_keys: ['knee'], phases: ['loading'],
    rationale: 'Single-leg loading in a functional pattern; height controls intensity.',
    duration: '3 × 10 each leg', equipment: 'step' },

  { id: 'leg_press_partial', name: 'Leg press (partial range)',
    instructions: 'Set the seat so the knee starts at 60°. Press to full extension, control the return to 60° only.',
    body_part_keys: ['knee'], phases: ['loading'],
    rationale: 'Controlled bilateral loading for the quad; partial range avoids the painful deep flexion arc.',
    duration: '3 × 12', equipment: 'machine' },

  { id: 'nordic_curl_iso', name: 'Nordic hamstring curl (isometric)',
    instructions: 'Kneel with feet anchored. Lean forward slowly, controlling with the hamstrings. Hold for 5s at 45° from vertical.',
    body_part_keys: ['knee', 'hamstring'], phases: ['loading'],
    rationale: 'Builds hamstring strength that protects the posterior knee capsule and ACL.',
    duration: '3 × 6 × 5s holds', equipment: 'anchor' },

  // ── HAMSTRING ─────────────────────────────────────────────────────────────
  { id: 'prone_knee_bend', name: 'Prone knee bend (pain-free range)',
    instructions: 'Lie face down. Gently bend the knee as far as comfortable without pain, hold 2s, lower.',
    body_part_keys: ['hamstring'], phases: ['protect', 'early_motion'],
    rationale: 'Maintains hamstring flexibility and joint mobility without loading the healing tissue.',
    duration: '3 × 10', equipment: 'none' },

  { id: 'standing_hip_ext', name: 'Standing hip extension',
    instructions: 'Hold a surface for balance. Straighten and lift the injured leg backward 15–20 cm. Keep a neutral spine.',
    body_part_keys: ['hamstring', 'hip'], phases: ['early_motion'],
    rationale: 'Low-load glute and proximal hamstring activation in a position safe for healing muscle fibres.',
    duration: '3 × 10 each side', equipment: 'none' },

  { id: 'nordic_curl_full', name: 'Nordic hamstring curl',
    instructions: 'Kneel with feet anchored. Lean forward as slowly as possible, controlling with your hamstrings. Use hands to push back up.',
    body_part_keys: ['hamstring'], phases: ['loading', 'return_to_sport'],
    rationale: 'The highest-evidence exercise for hamstring injury prevention and rehabilitation.',
    duration: '3 × 5–8 (build reps over weeks)', equipment: 'anchor' },

  { id: 'rdl_light', name: 'Romanian deadlift (light)',
    instructions: 'Hold light dumbbells. Hinge at the hips, keeping the back straight and knees soft. Feel a stretch in the hamstring, then drive the hips forward to stand.',
    body_part_keys: ['hamstring'], phases: ['loading'],
    rationale: 'Progressive eccentric loading of the hamstring — the mechanism that reduces re-injury risk.',
    duration: '3 × 8', equipment: 'dumbbells' },

  { id: 'sprint_prog', name: 'Running progression (graded)',
    instructions: 'Week 1: walk/jog alternating. Week 2: continuous easy jog. Week 3: stride-outs at 75%. Week 4: full effort only when pain-free for 2 weeks.',
    body_part_keys: ['hamstring'], phases: ['return_to_sport'],
    rationale: 'Gradual return-to-running protocol — evidence shows re-injury risk drops sharply with structured progression vs. self-guided return.',
    duration: 'As per weekly phase', equipment: 'none' },

  // ── ANKLE / FOOT ──────────────────────────────────────────────────────────
  { id: 'ankle_alphabet', name: 'Ankle alphabet',
    instructions: 'Seated, ankle off the floor. Trace each letter of the alphabet with your toes, moving only the foot and ankle.',
    body_part_keys: ['ankle'], phases: ['protect', 'early_motion'],
    rationale: 'Restores ankle range of motion in all planes with zero load on healing ligaments.',
    duration: '2 × full alphabet', equipment: 'none' },

  { id: 'seated_calf_raise', name: 'Seated calf raise',
    instructions: 'Seated, knees bent to 90°. Rise up onto the ball of the foot, hold 2s, lower slowly.',
    body_part_keys: ['ankle', 'calf'], phases: ['early_motion'],
    rationale: 'Loads the soleus in a low-demand position — critical for Achilles and ankle recovery.',
    duration: '3 × 15', equipment: 'none' },

  { id: 'single_leg_balance', name: 'Single-leg balance',
    instructions: 'Stand on the injured foot. Hold for 30s. Progress by closing eyes, then standing on a folded mat.',
    body_part_keys: ['ankle'], phases: ['loading', 'return_to_sport'],
    rationale: 'Proprioception training — re-injury risk after ankle sprain is primarily from proprioceptive deficit, not structural weakness.',
    duration: '3 × 30s each side', equipment: 'none' },

  { id: 'banded_eversion', name: 'Banded ankle eversion',
    instructions: 'Seated, band around the outside of the foot. Slowly turn the foot outward against the band resistance, return.',
    body_part_keys: ['ankle'], phases: ['loading'],
    rationale: 'Strengthens the peroneal muscles — the primary stabilisers against the lateral ankle sprain mechanism.',
    duration: '3 × 15 each side', equipment: 'band' },

  { id: 'standing_calf_raise', name: 'Standing calf raise',
    instructions: 'Stand on the edge of a step. Lower the heel below the step level, then rise to full tip-toe. Lower slowly (3s down).',
    body_part_keys: ['ankle', 'calf'], phases: ['loading', 'return_to_sport'],
    rationale: 'Eccentric loading is the most effective protocol for Achilles tendinopathy and ankle stability.',
    duration: '3 × 12 (each leg, build to single-leg)', equipment: 'step' },

  // ── LOWER BACK / LUMBAR ───────────────────────────────────────────────────
  { id: 'knee_to_chest', name: 'Knee to chest stretch',
    instructions: 'Lie on your back. Gently pull one knee toward the chest, hold 20s. Alternate legs.',
    body_part_keys: ['lumbar'], phases: ['protect', 'early_motion'],
    rationale: 'Reduces lumbar compressive load and gently mobilises the facet joints.',
    duration: '3 × 20s each side', equipment: 'none' },

  { id: 'pelvic_tilt', name: 'Pelvic tilt',
    instructions: 'Lie on your back, knees bent. Gently flatten the lower back into the floor by tightening the abdomen, hold 5s.',
    body_part_keys: ['lumbar'], phases: ['protect', 'early_motion'],
    rationale: 'Activates deep abdominal stabilisers without loading the lumbar spine.',
    duration: '3 × 10 × 5s hold', equipment: 'none' },

  { id: 'cat_camel', name: 'Cat-camel',
    instructions: 'On hands and knees. Arch the back up (cat), then let it sag (camel). Move slowly and continuously through the full range.',
    body_part_keys: ['lumbar', 'thoracic'], phases: ['early_motion'],
    rationale: 'Mobilises the lumbar and thoracic spine through its natural flexion-extension range.',
    duration: '2 × 10 slow cycles', equipment: 'none' },

  { id: 'bird_dog', name: 'Bird dog',
    instructions: 'On hands and knees, back flat. Extend one arm and the opposite leg simultaneously. Hold 5s. Keep the hips level — no rotation.',
    body_part_keys: ['lumbar', 'core'], phases: ['early_motion', 'loading'],
    rationale: 'Trains the multifidus and erector spinae without spinal compression — part of the McGill Big 3.',
    duration: '3 × 8 each side × 5s hold', equipment: 'none' },

  { id: 'dead_bug', name: 'Dead bug',
    instructions: 'Lie on your back, arms pointing to ceiling, knees bent to 90° off the floor. Extend opposite arm and leg toward the floor simultaneously. Keep the lower back flat.',
    body_part_keys: ['lumbar', 'core'], phases: ['early_motion', 'loading'],
    rationale: 'Anti-extension core stability in a safe supine position — protects the lumbar spine while building deep core control.',
    duration: '3 × 8 each side', equipment: 'none' },

  { id: 'mcgill_side_plank', name: 'McGill side plank',
    instructions: 'Lie on your side, feet stacked, prop up on the forearm. Raise the hips to form a straight line. Hold.',
    body_part_keys: ['lumbar', 'core'], phases: ['loading'],
    rationale: 'The most effective anti-lateral flexion exercise — part of the McGill Big 3 for low back rehabilitation.',
    duration: '3 × 20–30s each side', equipment: 'none' },

  { id: 'glute_bridge_lumbar', name: 'Glute bridge',
    instructions: 'Lie on your back, knees bent. Drive through the heels, squeeze the glutes, and raise the hips until the body forms a straight line. Hold 2s.',
    body_part_keys: ['lumbar', 'hip'], phases: ['loading'],
    rationale: 'Loads the glutes and hamstrings to share lumbar workload — glute weakness is a common driver of recurrent low back pain.',
    duration: '3 × 12', equipment: 'none' },

  // ── SHOULDER ──────────────────────────────────────────────────────────────
  { id: 'pendulum', name: 'Pendulum (Codman) exercise',
    instructions: 'Lean forward, support the good arm on a table. Let the injured arm hang. Swing it gently in small circles using body weight only.',
    body_part_keys: ['shoulder'], phases: ['protect'],
    rationale: 'Gentle traction distraction of the glenohumeral joint — reduces pain and early stiffness without active muscle contraction.',
    duration: '2 × 30s circles each direction', equipment: 'none' },

  { id: 'scapular_setting', name: 'Scapular setting',
    instructions: 'Sit or stand tall. Gently draw the shoulder blades down and back — as if putting them into your back pockets. Hold 5s.',
    body_part_keys: ['shoulder'], phases: ['protect', 'early_motion'],
    rationale: 'Activates the lower trapezius and serratus anterior to establish correct scapular position before loading.',
    duration: '3 × 10 × 5s hold', equipment: 'none' },

  { id: 'side_lying_er', name: 'Side-lying external rotation',
    instructions: 'Lie on the good side, elbow bent to 90°. Rotate the forearm upward (external rotation), hold 2s, lower slowly. Use a very light dumbbell or no weight.',
    body_part_keys: ['shoulder'], phases: ['early_motion', 'loading'],
    rationale: 'The primary rotator cuff strengthening exercise — targets infraspinatus and teres minor in a gravity-resisted position.',
    duration: '3 × 15', equipment: 'light_dumbbell' },

  { id: 'prone_y', name: 'Prone Y raise',
    instructions: 'Lie face down, arms reaching overhead in a Y shape with thumbs up. Lift the arms a few inches, hold 2s, lower.',
    body_part_keys: ['shoulder'], phases: ['early_motion', 'loading'],
    rationale: 'Lower trapezius activation — critical for scapular upward rotation and rotator cuff health.',
    duration: '3 × 12', equipment: 'none' },

  { id: 'band_row', name: 'Band / cable row (scapular focus)',
    instructions: 'Anchor a band at elbow height. Pull back leading with the elbow, squeeze the scapula. Hold 1s, return slowly.',
    body_part_keys: ['shoulder'], phases: ['loading', 'return_to_sport'],
    rationale: 'Strengthens the mid-trapezius and rhomboids — restores the scapular control needed for overhead activities.',
    duration: '3 × 12', equipment: 'band' },

  { id: 'serratus_wall', name: 'Serratus wall press',
    instructions: 'Stand facing a wall, hands flat. Push the wall as if trying to push it away — protract the shoulder blades maximally. Hold 2s.',
    body_part_keys: ['shoulder'], phases: ['loading'],
    rationale: 'Serratus anterior is the primary scapular protractor — weakness here is the most common cause of shoulder impingement.',
    duration: '3 × 10', equipment: 'none' },
];

// Return rehab exercises for a body part and phase.
// Higher severity (4-5) restricts to the simpler, lower-load exercises.
export function getRehabExercisesFor(body_part_key, rehab_phase, severity = 3) {
  const allPhases = severity >= 4
    ? ['protect']
    : severity <= 2
      ? [rehab_phase, 'return_to_sport']
      : [rehab_phase];

  return REHAB_EXERCISES.filter(ex =>
    ex.body_part_keys.includes(body_part_key) &&
    ex.phases.some(p => allPhases.includes(p))
  );
}

// Return prevention exercises for a recovered body part.
// More exercises when injuryCount >= 2 or recurrence_risk is flagged.
export function getPreventionExercisesFor(body_part_key, full = false) {
  const allPhases = ['loading', 'return_to_sport'];
  const candidates = REHAB_EXERCISES.filter(ex =>
    ex.body_part_keys.includes(body_part_key) &&
    ex.phases.some(p => allPhases.includes(p))
  );
  return full ? candidates : candidates.slice(0, 3);
}

export default { REHAB_EXERCISES, getRehabExercisesFor, getPreventionExercisesFor };
```

- [ ] **Commit**

```bash
git add src/data/rehabExercises.js
git commit -m "feat: add rehab exercise library with clinical rationale"
```

---

## Task 4: Symptom assessment module (TDD)

**Files:**
- Create: `src/lib/injury/symptomAssessment.js`
- Create: `tests/injury-engine.js`

- [ ] **Write the failing tests first**

```js
// tests/injury-engine.js
import { getQuestions, assess } from '../src/lib/injury/symptomAssessment.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// T1: getQuestions returns questions for each region
const lowerQ = getQuestions('lower_limb');
assert(Array.isArray(lowerQ) && lowerQ.length >= 4, 'T1a lower_limb has >= 4 questions');
const upperQ = getQuestions('upper_limb');
assert(Array.isArray(upperQ) && upperQ.length >= 3, 'T1b upper_limb has >= 3 questions');
const spineQ = getQuestions('core_spine');
assert(Array.isArray(spineQ) && spineQ.length >= 4, 'T1c core_spine has >= 4 questions');

// T2: neurological symptom → red flag for lower limb
const result2 = assess('lower_limb', { location: 'knee', onset: 'sudden', weight_bearing: 'yes', neurological: 'yes', swelling: 'no', pain_at_rest: 'no' });
assert(result2.result === 'red_flag', 'T2 neurological → red_flag');

// T3: bowel/bladder change → red flag for spine
const result3 = assess('core_spine', { location: 'lumbar', neurological: 'no', bowel_bladder: 'yes', radiating: 'no', onset: 'gradual' });
assert(result3.result === 'red_flag', 'T3 bowel/bladder change → red_flag');

// T4: cannot bear weight + sudden + swelling → red flag
const result4 = assess('lower_limb', { location: 'ankle', onset: 'sudden', weight_bearing: 'no', neurological: 'no', swelling: 'yes', pain_at_rest: 'no' });
assert(result4.result === 'red_flag', 'T4 cannot weight-bear + sudden + swelling → red_flag');

// T5: gradual knee pain, bearing weight, no neuro → probable result
const result5 = assess('lower_limb', { location: 'knee', onset: 'gradual', weight_bearing: 'yes', neurological: 'no', swelling: 'no', pain_at_rest: 'no' });
assert(result5.result === 'probable', 'T5 gradual knee → probable');
assert(result5.body_part_key === 'knee', 'T5 body_part_key is knee');

// T6: radiating arm pain from neck → red flag for spine
const result6 = assess('core_spine', { location: 'cervical', neurological: 'no', bowel_bladder: 'no', radiating: 'yes', onset: 'sudden' });
assert(result6.result === 'red_flag', 'T6 radiating pain → red_flag');

// T7: gradual lower back, no red flags → probable
const result7 = assess('core_spine', { location: 'lumbar', neurological: 'no', bowel_bladder: 'no', radiating: 'no', onset: 'gradual' });
assert(result7.result === 'probable', 'T7 gradual lower back → probable');
assert(result7.body_part_key === 'lumbar', 'T7 body_part_key is lumbar');
```

- [ ] **Run tests — verify they fail**

```bash
node tests/injury-engine.js
```

Expected: `ReferenceError` or module not found — `symptomAssessment.js` doesn't exist yet.

- [ ] **Write the implementation**

```js
// src/lib/injury/symptomAssessment.js
// Pure functions — no side effects, no imports from UI or store.

// Questions per body region.
// Each question: { key, text, options: [{value, label}] }
const QUESTIONS = {
  lower_limb: [
    { key: 'location', text: 'Where is the discomfort mainly located?',
      options: [
        { value: 'knee',      label: 'Knee' },
        { value: 'ankle',     label: 'Ankle / foot' },
        { value: 'hip',       label: 'Hip / groin' },
        { value: 'hamstring', label: 'Hamstring / back of thigh' },
        { value: 'calf',      label: 'Calf / Achilles' },
        { value: 'shin',      label: 'Shin / front of lower leg' },
        { value: 'quad',      label: 'Front of thigh / quadriceps' },
      ]
    },
    { key: 'onset', text: 'Did this start suddenly during activity, or come on gradually over days?',
      options: [{ value: 'sudden', label: 'Sudden (during activity)' }, { value: 'gradual', label: 'Gradually over days / weeks' }]
    },
    { key: 'weight_bearing', text: 'Can you put full weight through it comfortably?',
      options: [{ value: 'yes', label: 'Yes, fully' }, { value: 'partial', label: 'With difficulty or pain' }, { value: 'no', label: 'No — cannot bear weight' }]
    },
    { key: 'neurological', text: 'Is there any numbness, tingling, or pins and needles in the foot or leg?',
      options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]
    },
    { key: 'swelling', text: 'Is there significant swelling or bruising?',
      options: [{ value: 'yes', label: 'Yes, significant' }, { value: 'mild', label: 'Mild swelling' }, { value: 'no', label: 'No' }]
    },
    { key: 'pain_at_rest', text: 'Does the pain occur at rest, or mainly during activity?',
      options: [{ value: 'yes', label: 'Also at rest or at night' }, { value: 'no', label: 'Mainly during / after activity' }]
    },
  ],

  upper_limb: [
    { key: 'location', text: 'Where is the discomfort mainly located?',
      options: [
        { value: 'shoulder', label: 'Shoulder' },
        { value: 'elbow',    label: 'Elbow' },
        { value: 'wrist',    label: 'Wrist / hand' },
      ]
    },
    { key: 'onset', text: 'Did this start suddenly or come on gradually?',
      options: [{ value: 'sudden', label: 'Sudden' }, { value: 'gradual', label: 'Gradually' }]
    },
    { key: 'overhead', text: 'Can you raise your arm to shoulder height without significant pain?',
      options: [{ value: 'yes', label: 'Yes' }, { value: 'partial', label: 'With difficulty' }, { value: 'no', label: 'No' }]
    },
    { key: 'neurological', text: 'Is there numbness or tingling in your arm or hand?',
      options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]
    },
    { key: 'impact', text: 'Was there a direct impact, fall, or collision?',
      options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]
    },
  ],

  core_spine: [
    { key: 'location', text: 'Where is the pain located?',
      options: [
        { value: 'lumbar',   label: 'Lower back' },
        { value: 'thoracic', label: 'Upper / mid back' },
        { value: 'cervical', label: 'Neck' },
        { value: 'core',     label: 'Core / abdomen' },
      ]
    },
    { key: 'neurological', text: 'Is there any numbness, tingling, or weakness in your legs or arms?',
      options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]
    },
    { key: 'bowel_bladder', text: 'Any changes to bladder or bowel control?',
      options: [{ value: 'yes', label: 'Yes (any change)' }, { value: 'no', label: 'No' }]
    },
    { key: 'radiating', text: 'Does the pain travel down your leg or arm?',
      options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]
    },
    { key: 'onset', text: 'Did this come on suddenly or gradually?',
      options: [{ value: 'sudden', label: 'Sudden' }, { value: 'gradual', label: 'Gradually' }]
    },
  ],

  other: [
    { key: 'onset', text: 'Did this start suddenly or come on gradually?',
      options: [{ value: 'sudden', label: 'Suddenly' }, { value: 'gradual', label: 'Gradually' }]
    },
  ]
};

export function getQuestions(body_region) {
  return QUESTIONS[body_region] || QUESTIONS.other;
}

// Maps location answer → body_part_key
const LOCATION_TO_KEY = {
  knee: 'knee', ankle: 'ankle', hip: 'hip', hamstring: 'hamstring',
  calf: 'calf', shin: 'shin', quad: 'quad',
  shoulder: 'shoulder', elbow: 'elbow', wrist: 'wrist',
  lumbar: 'lumbar', thoracic: 'thoracic', cervical: 'cervical', core: 'core',
};

// Maps body_part_key → probable diagnosis_key when onset is gradual + activity-related
const GRADUAL_DIAGNOSIS = {
  knee:      'runners_knee',
  ankle:     'ankle_sprain',
  hamstring: 'hamstring_strain',
  hip:       'hip_flexor_strain',
  calf:      'achilles_tendinopathy',
  shin:      'shin_splints',
  quad:      'quad_strain',
  shoulder:  'shoulder_impingement',
  elbow:     'lateral_epicondylitis',
  wrist:     'wrist_sprain',
  lumbar:    'lower_back_strain',
  thoracic:  'thoracic_strain',
  cervical:  'neck_strain',
  core:      'abdominal_strain',
};

// Red-flag messages per trigger
const RED_FLAG_MESSAGES = {
  neurological:   'Numbness or tingling suggests nerve involvement. Please see a physiotherapist or GP before starting any rehab.',
  bowel_bladder:  'Changes to bladder or bowel control with back pain require urgent medical assessment. Please see a GP or go to A&E.',
  radiating:      'Pain radiating into the arm or leg suggests nerve root involvement. Please see a physiotherapist or GP.',
  cannot_wt_bear: 'Unable to bear weight with sudden onset and swelling may indicate a fracture or significant ligament injury. Please see a GP or physiotherapist.',
  cannot_raise:   'Inability to raise the arm with sudden onset and impact suggests a serious shoulder injury. Please see a GP or physiotherapist.',
};

/**
 * Assess symptom answers and return a result.
 * @param {string} body_region  'lower_limb' | 'upper_limb' | 'core_spine' | 'other'
 * @param {object} answers      { [question.key]: answer.value }
 * @returns {{ result: 'red_flag'|'probable'|'unclear', reason?, redirect_message?, body_part_key?, diagnosis_key?, confidence? }}
 */
export function assess(body_region, answers = {}) {
  const a = answers;

  // ── Core/spine red flags (strictest) ─────────────────────────────────────
  if (body_region === 'core_spine') {
    if (a.bowel_bladder === 'yes') return { result: 'red_flag', reason: 'bowel_bladder', redirect_message: RED_FLAG_MESSAGES.bowel_bladder };
    if (a.neurological === 'yes')  return { result: 'red_flag', reason: 'neurological',   redirect_message: RED_FLAG_MESSAGES.neurological };
    if (a.radiating === 'yes')     return { result: 'red_flag', reason: 'radiating',       redirect_message: RED_FLAG_MESSAGES.radiating };
    const key = LOCATION_TO_KEY[a.location] || 'lumbar';
    return { result: 'probable', body_part_key: key, diagnosis_key: GRADUAL_DIAGNOSIS[key] || null, confidence: 'low' };
  }

  // ── Lower limb red flags ──────────────────────────────────────────────────
  if (body_region === 'lower_limb') {
    if (a.neurological === 'yes') return { result: 'red_flag', reason: 'neurological', redirect_message: RED_FLAG_MESSAGES.neurological };
    if (a.onset === 'sudden' && a.weight_bearing === 'no' && (a.swelling === 'yes' || a.swelling === 'mild'))
      return { result: 'red_flag', reason: 'cannot_wt_bear', redirect_message: RED_FLAG_MESSAGES.cannot_wt_bear };
    const key = LOCATION_TO_KEY[a.location] || 'knee';
    const diagnosis = a.onset === 'sudden' ? null : GRADUAL_DIAGNOSIS[key] || null;
    return { result: 'probable', body_part_key: key, diagnosis_key: diagnosis, confidence: diagnosis ? 'medium' : 'low' };
  }

  // ── Upper limb red flags ──────────────────────────────────────────────────
  if (body_region === 'upper_limb') {
    if (a.neurological === 'yes') return { result: 'red_flag', reason: 'neurological', redirect_message: RED_FLAG_MESSAGES.neurological };
    if (a.onset === 'sudden' && a.overhead === 'no' && a.impact === 'yes')
      return { result: 'red_flag', reason: 'cannot_raise', redirect_message: RED_FLAG_MESSAGES.cannot_raise };
    const key = LOCATION_TO_KEY[a.location] || 'shoulder';
    const diagnosis = a.onset === 'sudden' ? null : GRADUAL_DIAGNOSIS[key] || null;
    return { result: 'probable', body_part_key: key, diagnosis_key: diagnosis, confidence: diagnosis ? 'medium' : 'low' };
  }

  return { result: 'unclear', body_part_key: 'other' };
}

export default { getQuestions, assess };
```

- [ ] **Run tests — verify they pass**

```bash
node tests/injury-engine.js
```

Expected: all T1–T7 lines print `PASS:`.

- [ ] **Commit**

```bash
git add src/lib/injury/symptomAssessment.js tests/injury-engine.js
git commit -m "feat: symptom assessment module with red-flag detection (TDD)"
```

---

## Task 5: Injury rules module (TDD)

**Files:**
- Create: `src/lib/injury/injuryRules.js`
- Modify: `tests/injury-engine.js`

- [ ] **Append tests to `tests/injury-engine.js`**

```js
// Append to tests/injury-engine.js
import { getContraindications, recurrenceRisk } from '../src/lib/injury/injuryRules.js';

// T8: knee protect phase blocks squats and runs
const c8 = getContraindications('knee', 3, 'protect');
assert(c8.blockedPatterns.some(p => p.test('Squat')), 'T8 knee protect blocks squat');
assert(c8.blockedPatterns.some(p => p.test('Running interval')), 'T8 knee protect blocks run');

// T9: knee return_to_sport has fewer blocks than protect
const c9_protect = getContraindications('knee', 3, 'protect');
const c9_rts = getContraindications('knee', 3, 'return_to_sport');
assert(c9_rts.blockedPatterns.length < c9_protect.blockedPatterns.length, 'T9 return_to_sport blocks fewer than protect');

// T10: severity 4+ forces protect-level blocks regardless of phase
const c10 = getContraindications('knee', 4, 'return_to_sport');
assert(c10.blockedPatterns.some(p => p.test('Squat')), 'T10 severity 4 overrides phase to protect-level');

// T11: severity 1 returns empty blocks
const c11 = getContraindications('knee', 1, 'loading');
assert(c11.blockedPatterns.length === 0, 'T11 severity 1 → no blocks');

// T12: lumbar protect blocks deadlifts and squats
const c12 = getContraindications('lumbar', 3, 'protect');
assert(c12.blockedPatterns.some(p => p.test('Deadlift')), 'T12 lumbar protect blocks deadlift');

// T13: recurrenceRisk returns true for known diagnoses
assert(recurrenceRisk('patellar_tendinopathy') === true, 'T13 patellar_tendinopathy has recurrence risk');
assert(recurrenceRisk('wrist_sprain') === false, 'T13 wrist_sprain has no recurrence risk');
assert(recurrenceRisk('acl') === true, 'T13 ACL has recurrence risk');
```

- [ ] **Run tests — verify T8–T13 fail**

```bash
node tests/injury-engine.js
```

Expected: T1–T7 still pass; T8–T13 fail with module not found.

- [ ] **Write the implementation**

```js
// src/lib/injury/injuryRules.js
// Pure functions — no side effects.
// Contraindication rules per body_part_key + severity + rehab_phase.

import { hasRecurrenceRisk } from '../../data/injuryTaxonomy.js';

// ── Blocked exercise name patterns per body part and phase ────────────────
// Each phase entry is an array of RegExp patterns matched against item.name.
// Severity >= 4: always use 'protect' patterns regardless of declared phase.
// Severity === 1: return empty (just add a caution note).

const PHASE_PATTERNS = {
  knee: {
    protect: [
      /squat/i, /lunge/i, /leg.?press/i, /step.?up/i, /deadlift/i, /RDL/i,
      /hip.?hinge/i, /nordic/i, /leg.?curl/i, /leg.?extension/i,
      /hip.?thrust/i, /glute.?bridge/i, /split.?squat/i, /bulgarian/i,
      /jump/i, /box.?jump/i, /depth.?jump/i, /plyometric/i,
      /run/i, /sprint/i, /jog/i,
    ],
    early_motion: [
      /squat/i, /lunge/i, /leg.?press/i, /step.?up/i, /deadlift/i,
      /nordic/i, /split.?squat/i, /bulgarian/i,
      /jump/i, /box.?jump/i, /plyometric/i, /run/i, /sprint/i,
    ],
    loading: [
      /jump/i, /box.?jump/i, /depth.?jump/i, /plyometric/i,
      /sprint/i, /run/i,
    ],
    return_to_sport: [],
  },

  ankle: {
    protect: [
      /run/i, /sprint/i, /jog/i, /jump/i, /plyometric/i, /squat/i,
      /lunge/i, /step.?up/i, /calf.?raise/i, /deadlift/i,
    ],
    early_motion: [
      /run/i, /sprint/i, /jump/i, /plyometric/i,
      /heavy.?squat/i, /heavy.?lunge/i,
    ],
    loading: [/sprint/i, /jump.*depth/i, /plyometric/i],
    return_to_sport: [],
  },

  hamstring: {
    protect: [
      /deadlift/i, /RDL/i, /nordic/i, /hamstring.?curl/i, /leg.?curl/i,
      /sprint/i, /run/i, /jump/i, /hip.?hinge/i, /kettlebell.?swing/i,
      /good.?morning/i,
    ],
    early_motion: [
      /deadlift/i, /RDL/i, /nordic/i, /hamstring.?curl/i,
      /sprint/i, /run/i, /jump/i,
    ],
    loading: [/sprint/i, /depth.?jump/i, /plyometric/i],
    return_to_sport: [],
  },

  hip: {
    protect: [
      /squat/i, /lunge/i, /deadlift/i, /hip.?thrust/i, /glute.?bridge/i,
      /run/i, /sprint/i, /jump/i, /step.?up/i, /split.?squat/i,
    ],
    early_motion: [
      /squat/i, /lunge/i, /deadlift/i, /run/i, /sprint/i, /jump/i,
    ],
    loading: [/sprint/i, /jump/i, /plyometric/i],
    return_to_sport: [],
  },

  calf: {
    protect: [
      /run/i, /sprint/i, /jump/i, /plyometric/i, /calf.?raise/i,
      /standing.?calf/i, /squat/i, /lunge/i,
    ],
    early_motion: [/run/i, /sprint/i, /jump/i, /plyometric/i],
    loading: [/sprint/i, /depth.?jump/i, /plyometric/i],
    return_to_sport: [],
  },

  shin: {
    protect: [
      /run/i, /sprint/i, /jump/i, /plyometric/i, /squat/i, /lunge/i,
      /step.?up/i,
    ],
    early_motion: [/run/i, /sprint/i, /jump/i, /plyometric/i],
    loading: [/sprint/i, /jump/i, /plyometric/i],
    return_to_sport: [],
  },

  quad: {
    protect: [
      /squat/i, /lunge/i, /leg.?press/i, /leg.?extension/i, /step.?up/i,
      /jump/i, /sprint/i, /run/i, /split.?squat/i,
    ],
    early_motion: [/squat/i, /lunge/i, /jump/i, /sprint/i, /run/i],
    loading: [/jump/i, /sprint/i],
    return_to_sport: [],
  },

  shoulder: {
    protect: [
      /bench.?press/i, /overhead.?press/i, /shoulder.?press/i, /dumbbell.?press/i,
      /push.?up/i, /dip/i, /pull.?up/i, /lat.?pull/i, /row/i, /fly/i,
      /lateral.?raise/i, /front.?raise/i, /upright.?row/i,
    ],
    early_motion: [
      /bench.?press/i, /overhead.?press/i, /shoulder.?press/i,
      /pull.?up/i, /lat.?pull/i, /heavy.?row/i, /dip/i,
    ],
    loading: [
      /overhead.?press/i, /shoulder.?press/i, /pull.?up/i,
    ],
    return_to_sport: [],
  },

  elbow: {
    protect: [
      /bench.?press/i, /push.?up/i, /dip/i, /skull.?crusher/i,
      /tricep/i, /bicep.?curl/i, /hammer.?curl/i, /row/i, /pull.?up/i,
    ],
    early_motion: [
      /bench.?press/i, /push.?up/i, /dip/i, /skull.?crusher/i,
      /tricep/i, /pull.?up/i,
    ],
    loading: [/heavy.?press/i, /heavy.?pull/i],
    return_to_sport: [],
  },

  wrist: {
    protect: [
      /bench.?press/i, /push.?up/i, /overhead.?press/i, /pull.?up/i,
      /deadlift/i, /barbell/i, /row/i, /dip/i,
    ],
    early_motion: [
      /bench.?press/i, /overhead.?press/i, /pull.?up/i, /deadlift/i,
    ],
    loading: [/overhead.?press/i, /heavy.?deadlift/i],
    return_to_sport: [],
  },

  lumbar: {
    protect: [
      /deadlift/i, /squat/i, /good.?morning/i, /barbell.?row/i,
      /overhead.?press/i, /bent.?over/i, /Romanian/i, /RDL/i,
      /kettlebell.?swing/i, /hip.?hinge/i,
    ],
    early_motion: [
      /deadlift/i, /squat/i, /barbell.?row/i, /good.?morning/i,
      /bent.?over/i, /Romanian/i, /RDL/i,
    ],
    loading: [/heavy.?deadlift/i, /heavy.?squat/i],
    return_to_sport: [],
  },

  thoracic: {
    protect: [
      /overhead.?press/i, /pull.?up/i, /row/i, /bench.?press/i,
      /deadlift/i,
    ],
    early_motion: [/overhead.?press/i, /heavy.?row/i],
    loading: [],
    return_to_sport: [],
  },

  cervical: {
    protect: [
      /overhead.?press/i, /upright.?row/i, /pull.?up/i,
      /shrug/i, /deadlift/i, /barbell/i,
    ],
    early_motion: [/overhead.?press/i, /heavy.?deadlift/i, /shrug/i],
    loading: [],
    return_to_sport: [],
  },

  core: {
    protect: [
      /deadlift/i, /squat/i, /overhead.?press/i, /sit.?up/i,
      /crunch/i, /leg.?raise/i,
    ],
    early_motion: [/deadlift/i, /heavy.?squat/i, /overhead.?press/i],
    loading: [],
    return_to_sport: [],
  },
};

/**
 * Get blocked exercise name patterns for a body part, severity, and phase.
 * @returns {{ blockedPatterns: RegExp[], forcedPhase: string }}
 */
export function getContraindications(body_part_key, severity = 3, rehab_phase = 'protect') {
  const rule = PHASE_PATTERNS[body_part_key];
  if (!rule) return { blockedPatterns: [], forcedPhase: rehab_phase };

  // Severity 1: train with caution, no blocks
  if (severity <= 1) return { blockedPatterns: [], forcedPhase: rehab_phase };

  // Severity 4+: force protect-level blocks regardless of phase
  const effectivePhase = severity >= 4 ? 'protect' : rehab_phase;
  const patterns = rule[effectivePhase] || rule['protect'] || [];

  return { blockedPatterns: patterns, forcedPhase: effectivePhase };
}

/**
 * Whether a diagnosis key has documented high recurrence risk.
 * Uses the taxonomy's recurrence_risk flag.
 */
export function recurrenceRisk(diagnosis_key) {
  return hasRecurrenceRisk(diagnosis_key);
}

export default { getContraindications, recurrenceRisk };
```

- [ ] **Run all tests — verify T1–T13 pass**

```bash
node tests/injury-engine.js
```

Expected: all 13 tests print `PASS:`.

- [ ] **Commit**

```bash
git add src/lib/injury/injuryRules.js tests/injury-engine.js
git commit -m "feat: injury rules module with contraindications (TDD)"
```

---

## Task 6: Injury filter module (TDD)

**Files:**
- Create: `src/lib/injury/injuryFilter.js`
- Modify: `tests/injury-engine.js`

- [ ] **Append tests to `tests/injury-engine.js`**

```js
// Append to tests/injury-engine.js
import { applyInjuryRules, applyPrevention } from '../src/lib/injury/injuryFilter.js';

const mockSession = {
  title: 'Monday · Gym — Lower body',
  discipline: 'gym',
  focus: 'Lower body strength',
  duration: '60 min',
  intensity: 'hard',
  lowerBody: true,
  items: [
    { num: 'P1', name: 'Hip Flexor Stretch', sets: '2 × 30s', tag: 'mobility', restSec: 20 },
    { num: 'A1', name: 'Squat', sets: '4 × 5', rpe: 'RPE 8', restSec: 180 },
    { num: 'B1', name: 'Romanian Deadlift', sets: '3 × 8', rpe: 'RPE 7', restSec: 120 },
    { num: 'B2', name: 'Leg press', sets: '3 × 10', rpe: 'RPE 7', restSec: 90 },
    { num: 'C1', name: 'Calf raise', sets: '3 × 15', rpe: 'RPE 6', restSec: 60 },
  ]
};

const mockWeek = { num: 1, sessions: [mockSession] };

// T14: no active injuries → session unchanged
const w14 = applyInjuryRules(mockWeek, []);
assert(!w14.sessions[0].injuryBanner, 'T14 no injuries → no banner');
assert(w14.sessions[0].items.length === mockSession.items.length, 'T14 no injuries → items unchanged');

// T15: knee injury at protect phase blocks squat, RDL, leg press
const kneeInjury = { id: '1', body_part_key: 'knee', severity: 3, rehab_phase: 'protect', status: 'active', body_part: 'Left knee', side: 'left' };
const w15 = applyInjuryRules(mockWeek, [kneeInjury]);
const subbed = w15.sessions[0].items.filter(i => i.substituted);
assert(subbed.length >= 3, 'T15 knee protect → at least 3 items substituted (squat, RDL, leg press)');
assert(!!w15.sessions[0].injuryBanner, 'T15 injury banner present');

// T16: mobility primer items are NOT blocked
const primerKept = w15.sessions[0].items.find(i => i.name === 'Hip Flexor Stretch');
assert(!primerKept.substituted, 'T16 mobility primer not substituted');

// T17: >70% blocked → session replaced with rehab session
const severeInjury = { id: '2', body_part_key: 'knee', severity: 5, rehab_phase: 'protect', status: 'active', body_part: 'Left knee', side: 'left' };
const w17 = applyInjuryRules(mockWeek, [severeInjury]);
assert(w17.sessions[0].discipline === 'rehab', 'T17 severe injury → session replaced with rehab discipline');

// T18: applyPrevention with no recovered injuries → session unchanged
const w18 = applyPrevention(mockWeek, []);
assert(!w18.sessions[0].items.some(i => i.prevention), 'T18 no recovered injuries → no prevention items');

// T19: recovered knee injury → prevention items added
const recoveredKnee = { id: '3', body_part_key: 'knee', status: 'recovered', diagnosis_key: 'patellar_tendinopathy' };
const w19 = applyPrevention(mockWeek, [recoveredKnee]);
assert(w19.sessions[0].items.some(i => i.prevention), 'T19 recovered knee → prevention items added');
```

- [ ] **Run tests — verify T14–T19 fail**

```bash
node tests/injury-engine.js
```

Expected: T1–T13 pass, T14–T19 fail.

- [ ] **Write the implementation**

```js
// src/lib/injury/injuryFilter.js
// Post-generation session filter. Pure functions — no side effects.
// Called from PlanService.js after plan generation.

import { getContraindications } from './injuryRules.js';
import { getRehabExercisesFor, getPreventionExercisesFor } from '../../data/rehabExercises.js';
import { hasRecurrenceRisk } from '../../data/injuryTaxonomy.js';

const REHAB_REPLACEMENT_THRESHOLD = 0.70; // >70% blocked → replace whole session

function isBlocked(item, patterns) {
  // Never block mobility primer items
  if (item.tag === 'mobility') return false;
  // Never block already-flagged rehab/prevention items
  if (item.rehab || item.prevention) return false;
  return patterns.some(p => p.test(item.name));
}

function buildInjuryLabel(inj) {
  return [inj.side && inj.side !== 'n/a' ? inj.side.charAt(0).toUpperCase() + inj.side.slice(1) : null, inj.body_part || inj.body_part_key]
    .filter(Boolean).join(' ');
}

function buildRehabSession(injuries) {
  const primary = injuries[0];
  const phaseLabels = { protect: 'Protect & Rest', early_motion: 'Early Motion', loading: 'Loading', return_to_sport: 'Return to Sport' };
  const phase = primary.rehab_phase || 'protect';
  const label = buildInjuryLabel(primary);
  const rehabItems = getRehabExercisesFor(primary.body_part_key, phase, primary.severity || 3)
    .map((ex, i) => ({
      num: `R${i + 1}`,
      name: ex.name,
      sets: ex.duration,
      rpe: 'Easy–Moderate',
      note: ex.instructions,
      restSec: 30,
      rehab: true,
      rationale: ex.rationale,
      tag: 'rehab'
    }));

  return {
    title: `Rehab — ${label} · ${phaseLabels[phase] || phase}`,
    discipline: 'rehab',
    focus: `Rehab: ${label}`,
    duration: '20–30 min',
    intensity: 'low',
    lowerBody: false,
    items: rehabItems,
    injuryBanner: {
      injuries: injuries.map(buildInjuryLabel),
      message: `Rehab session for your ${injuries.map(buildInjuryLabel).join(' and ')} injury`,
      phase: phaseLabels[phase] || phase,
      blockedCount: 0,
      fullReplacement: true
    }
  };
}

function applyToSession(session, injuries) {
  // Collect all blocked patterns across all active injuries
  const allPatterns = [];
  injuries.forEach(inj => {
    const { blockedPatterns } = getContraindications(inj.body_part_key, inj.severity || 3, inj.rehab_phase || 'protect');
    allPatterns.push(...blockedPatterns);
  });

  if (allPatterns.length === 0) return session;

  // Count non-mobility items for threshold calculation
  const countable = session.items.filter(it => it.tag !== 'mobility');

  const modifiedItems = session.items.map(item => {
    if (isBlocked(item, allPatterns)) {
      return { ...item, substituted: true, substituteReason: `Contraindicated for ${injuries.map(buildInjuryLabel).join(', ')} at current rehab phase` };
    }
    return item;
  });

  const blockedCount = modifiedItems.filter(i => i.substituted).length;
  const overlapRatio = countable.length > 0 ? blockedCount / countable.length : 0;

  if (overlapRatio > REHAB_REPLACEMENT_THRESHOLD) {
    return buildRehabSession(injuries);
  }

  // Collect rehab exercises, deduplicated by id
  const seen = new Set();
  const rehabItems = [];
  injuries.forEach(inj => {
    getRehabExercisesFor(inj.body_part_key, inj.rehab_phase || 'protect', inj.severity || 3)
      .forEach((ex, i) => {
        if (!seen.has(ex.id)) {
          seen.add(ex.id);
          rehabItems.push({
            num: `R${rehabItems.length + 1}`,
            name: ex.name,
            sets: ex.duration,
            rpe: 'Easy–Moderate',
            note: ex.instructions,
            restSec: 30,
            rehab: true,
            rationale: ex.rationale,
            tag: 'rehab'
          });
        }
      });
  });

  const injuryLabels = injuries.map(buildInjuryLabel);
  const phaseLabels = { protect: 'Protect & Rest', early_motion: 'Early Motion', loading: 'Loading', return_to_sport: 'Return to Sport' };

  return {
    ...session,
    items: [...modifiedItems, ...rehabItems],
    injuryBanner: {
      injuries: injuryLabels,
      message: `Modified for your ${injuryLabels.join(' and ')} injury`,
      phase: phaseLabels[injuries[0].rehab_phase || 'protect'] || injuries[0].rehab_phase,
      blockedCount,
      fullReplacement: false
    }
  };
}

/**
 * Apply active injury rules to a generated week.
 * @param {{ sessions: object[] }} week
 * @param {object[]} activeInjuries  injuries with status active|rehabbing and a body_part_key
 * @returns modified week
 */
export function applyInjuryRules(week, activeInjuries = []) {
  const injuries = (activeInjuries || []).filter(i => i.body_part_key);
  if (!injuries.length) return week;

  return {
    ...week,
    sessions: week.sessions.map(session => applyToSession(session, injuries))
  };
}

/**
 * Inject prevention exercises into sessions based on recovered injury history.
 * Silently added — no banner.
 * @param {{ sessions: object[] }} week
 * @param {object[]} injuryHistory  ALL injuries (any status) with a body_part_key
 * @returns modified week
 */
export function applyPrevention(week, injuryHistory = []) {
  const recovered = (injuryHistory || []).filter(i =>
    i.status === 'recovered' && i.body_part_key
  );
  if (!recovered.length) return week;

  // Count per body_part_key
  const countByPart = {};
  recovered.forEach(i => { countByPart[i.body_part_key] = (countByPart[i.body_part_key] || 0) + 1; });

  // Build prevention items, deduplicated
  const seen = new Set();
  const preventionItems = [];
  Object.entries(countByPart).forEach(([key, count]) => {
    const full = count >= 2 || recovered.some(i => i.body_part_key === key && hasRecurrenceRisk(i.diagnosis_key));
    getPreventionExercisesFor(key, full).forEach(ex => {
      if (!seen.has(ex.id)) {
        seen.add(ex.id);
        preventionItems.push({
          num: `Prev`,
          name: ex.name,
          sets: ex.duration,
          rpe: 'Easy',
          note: ex.instructions,
          restSec: 20,
          prevention: true,
          preventionNote: `Added to support your ${key.replace('_', ' ')} history`,
          tag: 'mobility'
        });
      }
    });
  });

  if (!preventionItems.length) return week;

  // Insert prevention items at the start of the primer block in each session
  return {
    ...week,
    sessions: week.sessions.map(session => ({
      ...session,
      items: [...preventionItems, ...session.items]
    }))
  };
}

export default { applyInjuryRules, applyPrevention };
```

- [ ] **Run all tests — verify T1–T19 all pass**

```bash
node tests/injury-engine.js
```

Expected: all 19 tests print `PASS:`.

- [ ] **Commit**

```bash
git add src/lib/injury/injuryFilter.js tests/injury-engine.js
git commit -m "feat: injury filter — session substitution and prevention injection (TDD)"
```

---

## Task 7: Integrate filter into PlanService

**Files:**
- Modify: `src/lib/PlanService.js`

- [ ] **Add imports at the top of PlanService.js** (after existing imports, around line 29)

```js
import { applyInjuryRules, applyPrevention } from './injury/injuryFilter.js';
import Database from './Database.js';
```

`Database` is already imported — skip that line if it exists.

- [ ] **Add `injuryFilteredPhases()` function** (insert after `adaptedPhases()`, before `profileSignature()`)

```js
// Apply injury rules and prevention to the adapted phases.
// Called instead of adaptedPhases() so all consumers get filtered sessions.
function injuryFilteredPhases() {
  const phases = adaptedPhases();
  if (!phases) return null;

  const allInjuries = Database.services.listInjuries();
  const active = allInjuries.filter(i =>
    (i.status === 'active' || i.status === 'rehabbing') && i.body_part_key
  );
  const history = allInjuries.filter(i => i.body_part_key);

  if (!active.length && !history.length) return phases;

  return phases.map(phase => ({
    ...phase,
    weeks: (phase.weeks || []).map(week => {
      let w = active.length ? applyInjuryRules(week, active) : week;
      w = history.length ? applyPrevention(w, history) : w;
      return w;
    })
  }));
}
```

- [ ] **Update `getPhases()` to call `injuryFilteredPhases()`**

Find (around line 211):
```js
export function getPhases() {
  const ap = adaptedPhases();
  return ap ? ap : Legacy.getPhases();
}
```

Replace with:
```js
export function getPhases() {
  const fp = injuryFilteredPhases();
  return fp ? fp : Legacy.getPhases();
}
```

- [ ] **Smoke test: run dev server and check plan renders correctly**

```bash
npm run dev
```

Open the app, go to Plan → Week — sessions should render as before for an uninjured user. No console errors.

- [ ] **Commit**

```bash
git add src/lib/PlanService.js
git commit -m "feat: apply injury filter in PlanService — sessions now injury-aware"
```

---

## Task 8: Navigation changes

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/screens/Progress.jsx`
- Modify: `src/screens/Profile.jsx`

- [ ] **Update routeMeta in App.jsx**

Find:
```js
'/tracking/injuries': { title: 'Injury log', topLevel: false, tab: 'profile' },
```

Replace with:
```js
'/tracking/injuries': { title: 'Injury log', topLevel: false, tab: 'progress' },
```

- [ ] **Add Injuries LinkRow to Progress.jsx**

In `Progress.jsx`, import the store to read injuries:
```js
const injuries = useTrainingStore(s => s.injuries);
```

Add this import at the top (already imports `useTrainingStore`).

Then add a computed value near the other `const` declarations:
```js
const activeInjuries = injuries.filter(i => ['active','rehabbing','monitoring'].includes(i.status));
```

Find the link list section (the `<div className="link-list">` near the bottom) and add one more `LinkRow` after Trends:

```jsx
<LinkRow
  title="Injuries"
  sub={activeInjuries.length === 0
    ? 'No current injuries'
    : activeInjuries.map(i => i.title || i.body_part || 'Injury').join(' · ')}
  badge={activeInjuries.length > 0 ? `${activeInjuries.length} active` : null}
  onClick={() => navigate('/tracking/injuries')}
/>
```

- [ ] **Update Profile.jsx — replace link row with summary line**

In `Profile.jsx`, find the existing link row button that navigates to `/tracking/injuries` (around line 123):

```jsx
<div className="link-list" style={{ marginTop: 12 }}>
  <button className="link-row" onClick={() => navigate('/tracking/injuries')}>
    ...
  </button>
</div>
```

Replace the entire `link-list` div with an inline summary line inside the PLAN card.

First, find the PLAN card's closing `</Card>` tag (after the "UP NEXT" block). Insert this before it:

```jsx
<div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 10, marginTop: 10 }}>
  <button
    onClick={() => navigate('/tracking/injuries')}
    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%' }}
  >
    <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 2 }}>INJURIES</div>
    <div style={{ fontSize: 13, color: activeInjuries.length > 0 ? 'var(--rust)' : 'var(--txt-muted)' }}>
      {activeInjuries.length === 0
        ? 'None active'
        : `${activeInjuries.length} active — ${activeInjuries.map(i => i.title || i.body_part).filter(Boolean).join(', ')}`}
    </div>
  </button>
</div>
```

Then remove the old `<div className="link-list">` block entirely.

- [ ] **Verify in browser**

```bash
npm run dev
```

Navigate to Progress tab — Injuries link row should appear. Navigate to Profile — injury summary line should appear inside the Plan card. Tapping either navigates to `/tracking/injuries` with the Progress tab highlighted.

- [ ] **Commit**

```bash
git add src/App.jsx src/screens/Progress.jsx src/screens/Profile.jsx
git commit -m "feat: move injury log to Progress tab, update Profile summary"
```

---

## Task 9: Injuries screen — triage flow

**Files:**
- Modify: `src/screens/Injuries.jsx`

This is a full rewrite of the top-of-screen "Log an injury" flow. The injury cards, recovery log, and actions at the bottom of each card are retained — only the form/flow and card header are changed.

- [ ] **Add new imports at the top of Injuries.jsx**

```js
import { REGIONS, DIAGNOSES } from '../data/injuryTaxonomy.js';
import { getQuestions, assess } from '../lib/injury/symptomAssessment.js';
```

- [ ] **Replace the `EMPTY_FORM` constant and the logging flow**

Remove the existing `EMPTY_FORM` and `showForm`/`form` state. Replace with a stepped flow:

```js
const REHAB_PHASES = [
  { key: 'protect',        label: 'Protect & Rest',    desc: 'Complete or near-complete rest of the area' },
  { key: 'early_motion',   label: 'Early Motion',      desc: 'Gentle movement, no load on the joint' },
  { key: 'loading',        label: 'Strengthening',     desc: 'Progressive loading, building back up' },
  { key: 'return_to_sport',label: 'Return to Sport',   desc: 'Sport-specific work, almost back to full training' },
];

const SEVERITY_LABELS = {
  1: 'Mild discomfort — training unaffected',
  2: 'Noticeable — training is modified',
  3: 'Significantly affects training',
  4: 'Cannot train the affected area',
  5: 'Unable to train at all',
};

const EMPTY_TRIAGE = {
  step: 0,            // 0 = hidden, 1 = physio gate, 2+ = steps
  physio_seen: null,
  body_region: null,
  body_part_key: null,
  side: null,
  diagnosis_key: null,
  severity: 3,
  rehab_phase: 'protect',
  title: '',
  description: '',
  rehab_plan: '',
  date_occurred: new Date().toISOString().split('T')[0],
  // symptom path
  symptom_answers: {},
  symptom_step: 0,
  assessment_result: null,
  red_flag_message: null,
};

// In the component:
const [triage, setTriage] = useState(EMPTY_TRIAGE);
const setT = (patch) => setTriage(prev => ({ ...prev, ...patch }));
```

- [ ] **Write the triage flow render function**

Add this function inside the `Injuries` component, before the return statement:

```jsx
function renderTriageFlow() {
  const { step, physio_seen, body_region, body_part_key } = triage;

  // Step 0: hidden
  if (step === 0) return null;

  // Step 1: Physio gate
  if (step === 1) {
    return (
      <div className="form-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div className="h3" style={{ margin: 0, flex: 1 }}>Log an injury</div>
          <div style={{ fontSize: 11, color: 'var(--txt-muted)' }}>Step 1 of 6</div>
        </div>
        <p style={{ fontSize: 14, color: 'var(--txt-body)', marginBottom: 20 }}>
          Have you seen a physiotherapist or doctor about this injury?
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setT({ step: 2, physio_seen: true })} style={btnStyle('var(--moss)')}>Yes, I have</button>
          <button onClick={() => setT({ step: 2, physio_seen: false })} style={btnStyle('var(--rust)')}>Not yet</button>
        </div>
        <button onClick={() => setT(EMPTY_TRIAGE)} style={cancelStyle}>Cancel</button>
      </div>
    );
  }

  // Step 2: Region picker (same for both paths)
  if (step === 2) {
    return (
      <div className="form-card" style={{ marginBottom: 20 }}>
        <StepHeader step={2} total={physio_seen ? 7 : 6} title="Which area?" onCancel={() => setT(EMPTY_TRIAGE)} onBack={() => setT({ step: 1 })} />
        <div style={{ display: 'grid', gap: 8 }}>
          {Object.entries(REGIONS).map(([key, reg]) => (
            <button key={key} onClick={() => setT({ step: physio_seen ? 3 : 'symptom', body_region: key })} style={optionStyle}>
              {reg.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Physio path — Step 3: Body part picker
  if (step === 3 && physio_seen) {
    const region = REGIONS[body_region];
    if (!region) return null;
    return (
      <div className="form-card" style={{ marginBottom: 20 }}>
        <StepHeader step={3} total={7} title="Which part?" onCancel={() => setT(EMPTY_TRIAGE)} onBack={() => setT({ step: 2 })} />
        <div style={{ display: 'grid', gap: 8 }}>
          {Object.entries(region.parts).map(([key, part]) => (
            <button key={key} onClick={() => setT({ step: 4, body_part_key: key })} style={optionStyle}>
              {part.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Physio path — Step 4: Side
  if (step === 4 && physio_seen) {
    const region = REGIONS[body_region];
    const part = region && region.parts[body_part_key];
    const sides = part ? part.sides : ['left','right','both','n/a'];
    return (
      <div className="form-card" style={{ marginBottom: 20 }}>
        <StepHeader step={4} total={7} title="Which side?" onCancel={() => setT(EMPTY_TRIAGE)} onBack={() => setT({ step: 3 })} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {sides.map(s => (
            <button key={s} onClick={() => setT({ step: 5, side: s })} style={{ ...btnStyle('var(--moss)'), flex: 1 }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Physio path — Step 5: Diagnosis picker
  if (step === 5 && physio_seen) {
    const diags = DIAGNOSES[body_part_key] || [];
    return (
      <div className="form-card" style={{ marginBottom: 20 }}>
        <StepHeader step={5} total={7} title="Any specific diagnosis?" onCancel={() => setT(EMPTY_TRIAGE)} onBack={() => setT({ step: 4 })} />
        <div style={{ display: 'grid', gap: 8 }}>
          {diags.map(d => (
            <button key={d.key} onClick={() => setT({ step: 6, diagnosis_key: d.key })} style={optionStyle}>
              {d.label}
            </button>
          ))}
          <button onClick={() => setT({ step: 6, diagnosis_key: null })} style={{ ...optionStyle, color: 'var(--txt-muted)' }}>
            No specific diagnosis / not sure
          </button>
        </div>
      </div>
    );
  }

  // Physio path — Step 6: Severity + phase
  if (step === 6 && physio_seen) {
    return (
      <div className="form-card" style={{ marginBottom: 20 }}>
        <StepHeader step={6} total={7} title="Severity & phase" onCancel={() => setT(EMPTY_TRIAGE)} onBack={() => setT({ step: 5 })} />
        <SeverityPicker value={triage.severity} onChange={v => setT({ severity: v })} />
        <PhasePicker value={triage.rehab_phase} onChange={v => setT({ rehab_phase: v })} />
        <button onClick={() => setT({ step: 7 })} style={btnStyle('var(--rust)')}>Next</button>
      </div>
    );
  }

  // Physio path — Step 7: Notes + save
  if (step === 7 && physio_seen) {
    return (
      <div className="form-card" style={{ marginBottom: 20 }}>
        <StepHeader step={7} total={7} title="Physio notes" onCancel={() => setT(EMPTY_TRIAGE)} onBack={() => setT({ step: 6 })} />
        <FormField label="Title / diagnosis name" value={triage.title} onChange={v => setT({ title: v })} placeholder="e.g. Patellar tendinopathy" />
        <FormField label="Date occurred" type="date" value={triage.date_occurred} onChange={v => setT({ date_occurred: v })} />
        <FormTextarea label="Physio's notes or protocol" value={triage.rehab_plan} onChange={v => setT({ rehab_plan: v })} placeholder="Exercises, frequency, restrictions…" />
        <button onClick={submitInjury} style={btnStyle('var(--rust)')}>Save injury</button>
      </div>
    );
  }

  // Self-reported path — symptom questionnaire
  if (step === 'symptom') {
    const questions = getQuestions(body_region || 'other');
    const qIdx = triage.symptom_step || 0;

    // Check for red flag after each answer
    if (triage.red_flag_message) {
      return (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <div className="h3" style={{ marginTop: 0, color: 'var(--rust)' }}>Please see a professional</div>
          <p style={{ fontSize: 14, color: 'var(--txt-body)', lineHeight: 1.5, marginBottom: 16 }}>
            {triage.red_flag_message}
          </p>
          <p style={{ fontSize: 13, color: 'var(--txt-muted)', marginBottom: 16 }}>
            We can still log this injury for your records, but we won't generate a rehab plan until you've been assessed.
          </p>
          <button onClick={submitRedFlagInjury} style={btnStyle('var(--moss)')}>Log injury (no rehab plan)</button>
          <button onClick={() => setT(EMPTY_TRIAGE)} style={cancelStyle}>Cancel</button>
        </div>
      );
    }

    // All questions answered → show assessment result
    if (qIdx >= questions.length && triage.assessment_result) {
      const r = triage.assessment_result;
      const suggestedDiag = r.diagnosis_key
        ? (DIAGNOSES[r.body_part_key] || []).find(d => d.key === r.diagnosis_key)
        : null;
      return (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <StepHeader step={questions.length + 1} total={questions.length + 2} title="Does this sound right?" onCancel={() => setT(EMPTY_TRIAGE)} onBack={() => setT({ symptom_step: qIdx - 1 })} />
          {suggestedDiag && (
            <div style={{ background: 'var(--bg-surface-2)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--txt-muted)', marginBottom: 4 }}>This sounds like it could be</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt-strong)' }}>{suggestedDiag.label}</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <button onClick={() => setT({ step: 'self_severity' })} style={btnStyle('var(--moss)')}>Yes, sounds right</button>
            <button onClick={() => setT({ step: 'self_severity', diagnosis_key: null })} style={btnStyle('var(--rust)')}>Not sure / different</button>
          </div>
        </div>
      );
    }

    // Show current question
    const q = questions[qIdx];
    if (!q) return null;
    return (
      <div className="form-card" style={{ marginBottom: 20 }}>
        <StepHeader step={qIdx + 1} total={questions.length + 2} title="Tell us about it" onCancel={() => setT(EMPTY_TRIAGE)} onBack={qIdx > 0 ? () => setT({ symptom_step: qIdx - 1 }) : null} />
        <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--txt-strong)', marginBottom: 16 }}>{q.text}</p>
        <div style={{ display: 'grid', gap: 8 }}>
          {q.options.map(opt => (
            <button key={opt.value} onClick={() => handleSymptomAnswer(q.key, opt.value, qIdx, questions)} style={optionStyle}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Self-reported path — Step 'self_severity': severity + save
  if (step === 'self_severity') {
    return (
      <div className="form-card" style={{ marginBottom: 20 }}>
        <StepHeader step="last" total="last" title="How severe?" onCancel={() => setT(EMPTY_TRIAGE)} onBack={() => setT({ step: 'symptom', symptom_step: (getQuestions(body_region || 'other').length - 1) })} />
        <SeverityPicker value={triage.severity} onChange={v => setT({ severity: v })} />
        <FormField label="Brief description (optional)" value={triage.description} onChange={v => setT({ description: v })} placeholder="How it happened, how it feels…" />
        <FormField label="Date occurred" type="date" value={triage.date_occurred} onChange={v => setT({ date_occurred: v })} />
        <button onClick={submitInjury} style={btnStyle('var(--rust)')}>Save injury</button>
      </div>
    );
  }

  return null;
}
```

- [ ] **Add handler functions** inside the component before `renderTriageFlow`:

```js
function handleSymptomAnswer(questionKey, value, qIdx, questions) {
  const newAnswers = { ...triage.symptom_answers, [questionKey]: value };
  const nextIdx = qIdx + 1;
  // Run assessment after each answer
  const result = assess(triage.body_region || 'other', newAnswers);
  if (result.result === 'red_flag') {
    setT({ symptom_answers: newAnswers, red_flag_message: result.redirect_message });
    return;
  }
  if (nextIdx >= questions.length) {
    setT({ symptom_answers: newAnswers, symptom_step: nextIdx, assessment_result: result, body_part_key: result.body_part_key, diagnosis_key: result.diagnosis_key });
  } else {
    setT({ symptom_answers: newAnswers, symptom_step: nextIdx });
  }
}

function submitInjury() {
  const fields = {
    body_region:    triage.body_region,
    body_part_key:  triage.body_part_key,
    body_part:      triage.title || (REGIONS[triage.body_region]?.parts[triage.body_part_key]?.label) || '',
    side:           triage.side,
    diagnosis_key:  triage.diagnosis_key,
    title:          triage.title || (triage.body_part_key ? (REGIONS[triage.body_region]?.parts[triage.body_part_key]?.label) : ''),
    description:    triage.description,
    severity:       Number(triage.severity),
    status:         'active',
    rehab_phase:    triage.rehab_phase || 'protect',
    date_occurred:  triage.date_occurred,
    rehab_plan:     triage.rehab_plan || '',
    rehab_plan_source: triage.physio_seen ? 'physio' : 'self',
    physio_seen:    !!triage.physio_seen,
    physio_approved: !!triage.physio_seen,
    symptom_flags:  triage.symptom_answers || {},
    red_flag_triggered: false,
    referred_to_professional: false,
    prevention_exercises: [],
    affected_activities: [],
  };
  addInjury(fields);
  setT(EMPTY_TRIAGE);
}

function submitRedFlagInjury() {
  const fields = {
    body_region:    triage.body_region,
    body_part_key:  triage.body_part_key,
    body_part:      REGIONS[triage.body_region]?.parts[triage.body_part_key]?.label || '',
    title:          'Injury (see professional)',
    description:    triage.description || '',
    severity:       triage.severity || 3,
    status:         'active',
    rehab_phase:    'protect',
    date_occurred:  triage.date_occurred,
    physio_seen:    false,
    symptom_flags:  triage.symptom_answers || {},
    red_flag_triggered: true,
    referred_to_professional: true,
    prevention_exercises: [],
    affected_activities: [],
  };
  addInjury(fields);
  setT(EMPTY_TRIAGE);
}
```

- [ ] **Add small helper components** inside the file (above the `Injuries` function):

```jsx
function StepHeader({ step, total, title, onCancel, onBack }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {onBack && <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-muted)', fontSize: 20, padding: 0, lineHeight: 1 }}>←</button>}
        <div className="h3" style={{ margin: 0, flex: 1 }}>{title}</div>
        {typeof step === 'number' && typeof total === 'number' && (
          <div style={{ fontSize: 11, color: 'var(--txt-muted)' }}>Step {step} of {total}</div>
        )}
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-muted)', fontSize: 18, padding: 0 }}>✕</button>
      </div>
    </div>
  );
}

function SeverityPicker({ value, onChange }) {
  const labels = { 1: '1 — Mild', 2: '2 — Noticeable', 3: '3 — Significant', 4: '4 — Can\'t train area', 5: '5 — Can\'t train' };
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>Severity</label>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => onChange(n)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: `1.5px solid ${value === n ? 'var(--rust)' : 'var(--hairline)'}`,
            background: value === n ? 'var(--rust)' : 'transparent', color: value === n ? '#fff' : 'var(--txt-muted)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
          }}>{n}</button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--txt-muted)', marginTop: 5 }}>{labels[value]}</div>
    </div>
  );
}

function PhasePicker({ value, onChange }) {
  const phases = [
    { key: 'protect', label: 'Protect & Rest', desc: 'Complete or near-complete rest' },
    { key: 'early_motion', label: 'Early Motion', desc: 'Gentle movement, no load' },
    { key: 'loading', label: 'Strengthening', desc: 'Progressive loading' },
    { key: 'return_to_sport', label: 'Return to Sport', desc: 'Sport-specific, almost full' },
  ];
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>Rehab phase</label>
      <div style={{ display: 'grid', gap: 6 }}>
        {phases.map(p => (
          <button key={p.key} onClick={() => onChange(p.key)} style={{
            textAlign: 'left', padding: '10px 12px', borderRadius: 9,
            border: `1.5px solid ${value === p.key ? 'var(--moss)' : 'var(--hairline)'}`,
            background: value === p.key ? 'rgba(74,93,58,0.08)' : 'transparent',
            cursor: 'pointer', fontFamily: 'inherit'
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt-strong)' }}>{p.label}</div>
            <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 2 }}>{p.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || ''}
        style={{ width: '100%', fontSize: 15, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--hairline)', background: 'transparent', fontFamily: 'inherit', color: 'var(--txt-strong)', boxSizing: 'border-box' }} />
    </div>
  );
}

function FormTextarea({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || ''}
        style={{ width: '100%', fontSize: 14, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--hairline)', background: 'transparent', fontFamily: 'inherit', color: 'var(--txt-strong)', boxSizing: 'border-box' }} />
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 5 };
const btnStyle = (bg) => ({ width: '100%', padding: 13, borderRadius: 11, border: 'none', background: bg, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8 });
const cancelStyle = { width: '100%', padding: 11, marginTop: 4, borderRadius: 11, border: '1px solid var(--hairline)', background: 'transparent', color: 'var(--txt-muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const optionStyle = { textAlign: 'left', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--hairline)', background: 'var(--bg-surface)', color: 'var(--txt-strong)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' };
```

- [ ] **Replace the "Log an injury" button and form render** in the `return` statement

Find:
```jsx
{!showForm && (
  <button onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }} ...>
    + Log an injury
  </button>
)}

{showForm && (
  <div className="form-card" ...>
    ...
  </div>
)}
```

Replace with:
```jsx
{triage.step === 0 && (
  <button onClick={() => setT({ step: 1 })} style={{
    width: '100%', padding: 12, borderRadius: 12, border: '1.5px dashed var(--hairline)',
    background: 'transparent', fontSize: 14, fontWeight: 600, color: 'var(--rust)',
    cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20
  }}>+ Log an injury</button>
)}

{renderTriageFlow()}
```

- [ ] **Add rehab phase stepper to InjuryCard**

Inside the `InjuryCard` component, after the `{inj.rehab_plan && ...}` block, add:

```jsx
{/* Rehab phase stepper */}
{inj.status !== 'recovered' && (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 6 }}>Rehab phase</div>
    <div style={{ display: 'flex', gap: 4 }}>
      {[
        { key: 'protect', label: 'Protect' },
        { key: 'early_motion', label: 'Early Motion' },
        { key: 'loading', label: 'Strengthen' },
        { key: 'return_to_sport', label: 'Return' },
      ].map((p, idx, arr) => {
        const phases = arr.map(x => x.key);
        const current = phases.indexOf(inj.rehab_phase || 'protect');
        const thisIdx = idx;
        const isActive = thisIdx === current;
        const isDone = thisIdx < current;
        return (
          <button
            key={p.key}
            onClick={() => {
              if (thisIdx === current + 1 && confirm(`Advance to "${p.label}" phase?`)) {
                updateInjury(inj.id, { rehab_phase: p.key });
              }
            }}
            style={{
              flex: 1, padding: '5px 2px', borderRadius: 6, border: 'none', cursor: thisIdx === current + 1 ? 'pointer' : 'default',
              background: isDone ? 'var(--moss)' : isActive ? 'var(--ochre)' : 'var(--bg-surface-2)',
              fontSize: 10, fontWeight: 600,
              color: (isDone || isActive) ? '#fff' : 'var(--txt-muted)',
              fontFamily: 'inherit'
            }}
          >{p.label}</button>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Replace the "Virtual physio" placeholder block** with a prevention exercises block

Find the virtual physio placeholder div (the one that says "Virtual physio — AI rehab suggestions will appear here") and replace it with:

```jsx
{/* Prevention exercises — shown on recovered injuries */}
{inj.status === 'recovered' && (inj.prevention_exercises || []).length > 0 && (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 6 }}>Prevention exercises</div>
    {(inj.prevention_exercises || []).map((ex, i) => (
      <div key={i} style={{ fontSize: 12.5, marginBottom: 6, paddingLeft: 10, borderLeft: '2px solid var(--moss)' }}>
        <div style={{ fontWeight: 600, color: 'var(--txt-strong)' }}>{ex.name || ex}</div>
        {ex.duration && <div style={{ color: 'var(--txt-muted)', fontSize: 11 }}>{ex.duration}</div>}
      </div>
    ))}
  </div>
)}
```

- [ ] **Verify in browser**

```bash
npm run dev
```

Navigate to Progress → Injuries. Tap "+ Log an injury". Walk through: Yes (physio path) and Not yet (symptom path). Confirm red-flag message appears for neurological answers. Confirm an injury saves and shows in the card list with the rehab phase stepper visible.

- [ ] **Commit**

```bash
git add src/screens/Injuries.jsx
git commit -m "feat: injury triage flow, rehab phase stepper, prevention block"
```

---

## Task 10: SessionDetail — injury display

**Files:**
- Modify: `src/screens/SessionDetail.jsx`

- [ ] **Add injury banner rendering** — insert just before the exercise table block (after the `session._trainNow` badge line, before the supersets callout):

```jsx
{/* Injury modification banner */}
{session.injuryBanner && (
  <div style={{
    borderLeft: '3px solid var(--ochre)', background: 'rgba(200,154,58,0.08)',
    borderRadius: '0 10px 10px 0', padding: '10px 14px', marginBottom: 16
  }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ochre)', marginBottom: 3 }}>
      {session.injuryBanner.fullReplacement ? 'Rehab session' : 'Modified for injury'}
    </div>
    <div style={{ fontSize: 12, color: 'var(--txt-body)', lineHeight: 1.4 }}>
      {session.injuryBanner.message}
      {!session.injuryBanner.fullReplacement && session.injuryBanner.blockedCount > 0 && (
        <> · {session.injuryBanner.blockedCount} exercise{session.injuryBanner.blockedCount !== 1 ? 's' : ''} replaced</>
      )}
      {session.injuryBanner.phase && <> · Phase: {session.injuryBanner.phase}</>}
    </div>
  </div>
)}
```

- [ ] **Add visual states for substituted, rehab, and prevention exercises**

In the exercise row render (inside the `items.map(({ item, idx }, i) => {` block), find the `<div className="gt-ex">` block and add exercise tags after the name span:

```jsx
{/* Injury modification tags */}
{item.substituted && (
  <span style={{
    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
    color: 'var(--ochre)', background: 'rgba(200,154,58,0.15)', borderRadius: 100, padding: '2px 7px', marginLeft: 6
  }}>Replaced</span>
)}
{item.rehab && (
  <span style={{
    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
    color: 'var(--moss)', background: 'rgba(74,93,58,0.12)', borderRadius: 100, padding: '2px 7px', marginLeft: 6
  }}>Rehab</span>
)}
{item.prevention && (
  <span title={item.preventionNote || 'Prevention exercise'} style={{
    fontSize: 11, color: 'var(--txt-muted)', marginLeft: 6, cursor: 'help'
  }}>ⓘ</span>
)}
```

- [ ] **Style substituted exercises** — add strikethrough to their name

In the same block, find the `<span className="gt-name">{item.name}</span>` and replace with:

```jsx
<span className="gt-name" style={item.substituted ? { textDecoration: 'line-through', opacity: 0.5 } : undefined}>
  {item.name}
</span>
```

- [ ] **Add expand-on-tap for substituted and rehab items** — find the `{cue && <div className="gt-note">` block and extend it:

```jsx
{item.substituted && (
  <div className="gt-note" style={{ color: 'var(--ochre)', fontStyle: 'italic' }}>
    {item.substituteReason}
  </div>
)}
{item.rehab && item.rationale && (
  <div className="gt-note" style={{ color: 'var(--moss)', fontStyle: 'italic' }}>
    {item.rationale}
  </div>
)}
```

- [ ] **Verify in browser with a test injury**

```bash
npm run dev
```

1. Go to Injuries → log an injury (e.g. Left knee, severity 3, protect phase)
2. Go to Plan → navigate to any lower-body session
3. Confirm the ochre banner appears, squat/deadlift rows show strikethrough + "Replaced" tag, rehab exercises appear with green "Rehab" tag and rationale note

- [ ] **Commit**

```bash
git add src/screens/SessionDetail.jsx
git commit -m "feat: session injury banner, substituted/rehab/prevention exercise display"
```

---

## Self-Review

**Spec coverage check:**
- Data model (10 new fields): ✓ Task 1 migration
- injuryTaxonomy.js (body parts + diagnoses): ✓ Task 2
- rehabExercises.js (clinical library): ✓ Task 3
- symptomAssessment.js (questionnaire + red flags): ✓ Task 4
- injuryRules.js (contraindications): ✓ Task 5
- injuryFilter.js (applyInjuryRules + applyPrevention): ✓ Task 6
- PlanService.js integration: ✓ Task 7
- Navigation to Progress tab: ✓ Task 8
- Injury logging triage flow (physio gate, symptom path, red-flag redirect): ✓ Task 9
- Rehab phase stepper on cards: ✓ Task 9
- Prevention exercises block on recovered cards: ✓ Task 9
- Session injury banner: ✓ Task 10
- Substituted exercise rendering: ✓ Task 10
- Rehab exercise rendering: ✓ Task 10
- Prevention exercise ⓘ icon: ✓ Task 10

**Type consistency check:**
- `body_part_key` used consistently across taxonomy, rules, filter, and form submission ✓
- `rehab_phase` values (`'protect'`, `'early_motion'`, `'loading'`, `'return_to_sport'`) consistent across all files ✓
- `injuryBanner` shape (`{ injuries, message, phase, blockedCount, fullReplacement }`) matches between filter and SessionDetail ✓
- `getRehabExercisesFor(body_part_key, rehab_phase, severity)` signature matches usage in injuryFilter ✓
- `assess()` return shape `{ result, body_part_key, diagnosis_key, redirect_message }` matches usage in Injuries.jsx ✓

**Placeholder scan:** No TBDs or TODOs. All code is complete. ✓
