# Exercise-Quality Tagging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tag the 118-exercise catalogue by the physical quality/adaptation it develops (plus force-velocity profile and fatigue cost), and give every physical quality a dose-response — as pure, evidence-tagged, PARALLEL knowledge that nothing in the live plan reads yet.

**Architecture:** A new `exerciseQualities.js` data module (mirroring the existing `exerciseSimilarity.js` enrichment pattern: pattern-defaults + flag-derived class rules + per-exercise overrides) exposes a pure `exerciseQualities(id)` accessor. `qualities.js` gains a `doseResponse` field per quality. Both are consumed only by tests and a read-only `/dev` readout — never by `generatePlan` — so the engine golden master and athlete-adapter golden master stay byte-identical.

**Tech Stack:** Vanilla ES modules (the `@performance-os/engine` package), Node's built-in test running (`apps/mobile/tests/*.js` via `run-all.mjs`), React (the `/dev` DevPlayground screen).

## Global Constraints

- **Pure/deterministic engine code** — no `Date`, no `Math.random`. Same input → byte-identical output.
- **PARALLEL knowledge** — nothing in `generatePlan` may read the new data. Both golden masters MUST stay byte-identical green **without** `UPDATE=1`. Drift = a wiring bug this sprint, not an intended change.
- **Do NOT modify:** `packages/engine/src/data/strengthExercises.js`, `plan/allocator.js`, `strength/program.js`, `strength/targets.js`, `PlanGenerator.js`, or any FROZEN governance doc (Constitution, Decision Ontology, Knowledge Architecture, EDS, TAS).
- **Physical-quality vocabulary is the fixed 10** in `qualities.js`: `maxStrength, hypertrophy, explosiveStrength, reactiveStrength, strengthEndurance, aerobicCapacity, anaerobicCapacity, mobility, stability, robustness`.
- **Force-velocity values** must come only from the exported `FORCE_VELOCITY` vocab.
- **Every tag carries `evidence: { level, confidence, source, needsReview: true }`** — honest seed data.
- **Theme tokens in `/dev`:** use only real variables (`--txt-muted`, `--txt-strong`, `--bg-surface-2`, `--hairline`), never invented ones.
- **Run tests** from the repo root: full suite `npm test`; a single file `node apps/mobile/tests/<file>.js`.

---

### Task 1: Dose-response on every physical quality

Adds the missing "dose" half of the blueprint's "no quality label without a dose + assessment" rule, and locks it with an invariant on the existing registry test.

**Files:**
- Modify: `packages/engine/src/data/qualities.js` (add `doseResponse` to each of the 10 quality objects)
- Test: `apps/mobile/tests/athlete-qualities.js` (append the dose+assessment invariant)

**Interfaces:**
- Consumes: `QUALITIES`, `getQuality` (existing, `qualities.js`)
- Produces: each `QUALITY` object gains `doseResponse: { intensity: string, reps: string, rir: string, restType: string }`. `getQuality(id).doseResponse` is relied on by Task 4's docs and future D12.

- [ ] **Step 1: Write the failing invariant test**

Append to the end of `apps/mobile/tests/athlete-qualities.js` (after line 27, the `T8` assertion):

```js

// T9/T10 — Sprint 5: every quality is DOSABLE + measurable (no label without a dose + assessment).
const DOSE_KEYS = ['intensity', 'reps', 'rir', 'restType'];
for (const q of QUALITIES) {
  assert(q.doseResponse && DOSE_KEYS.every((k) => q.doseResponse[k]),
    `T9 ${q.id} has a dose-response (${DOSE_KEYS.join(', ')})`);
  assert(!!q.assessment, `T10 ${q.id} has an assessment`);
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node apps/mobile/tests/athlete-qualities.js`
Expected: FAIL — several `T9 <quality> has a dose-response` lines fail (no `doseResponse` field exists yet).

- [ ] **Step 3: Add `doseResponse` to every quality**

Replace the whole `QUALITIES` array in `packages/engine/src/data/qualities.js` with this (identical to the current array, with a `doseResponse` added to each entry):

```js
export const QUALITIES = [
  { id: 'maxStrength', family: 'strength', adaptations: ['motor_unit_recruitment', 'myofibrillar_hypertrophy'],
    assessment: '1rm', fatigueCost: { neural: 'high', metabolic: 'low', mechanical: 'moderate' },
    recoveryTimeH: 48, prerequisites: [], evidence: 'seed',
    doseResponse: { intensity: '≥85% 1RM', reps: '1–5', rir: '1–3', restType: 'full (3–5 min)' } },
  { id: 'hypertrophy', family: 'structural', adaptations: ['myofibrillar_hypertrophy', 'sarcoplasmic_hypertrophy'],
    assessment: 'girth_or_bodyweight', fatigueCost: { neural: 'low', metabolic: 'high', mechanical: 'high' },
    recoveryTimeH: 48, prerequisites: [], evidence: 'seed',
    doseResponse: { intensity: '60–80% 1RM', reps: '6–12', rir: '0–3', restType: 'moderate (60–120 s)' } },
  { id: 'explosiveStrength', family: 'power', adaptations: ['rate_coding', 'motor_unit_recruitment'],
    assessment: 'jump_or_imtp_rfd', fatigueCost: { neural: 'high', metabolic: 'low', mechanical: 'moderate' },
    recoveryTimeH: 48, prerequisites: ['maxStrength'], evidence: 'seed',
    doseResponse: { intensity: '30–60% 1RM, maximal intent', reps: '2–5', rir: 'stop when bar speed drops', restType: 'full (2–3 min)' } },
  { id: 'reactiveStrength', family: 'power', adaptations: ['tendon_stiffness', 'ssc_efficiency'],
    assessment: 'rsi_drop_jump', fatigueCost: { neural: 'high', metabolic: 'low', mechanical: 'high' },
    recoveryTimeH: 72, prerequisites: ['maxStrength'], evidence: 'seed',
    doseResponse: { intensity: 'bodyweight–light, high SSC', reps: '3–6 ground contacts', rir: 'quality only', restType: 'full (2–3 min)' } },
  { id: 'strengthEndurance', family: 'endurance', adaptations: ['capillary_density', 'fiber_type_shift'],
    assessment: 'amrap', fatigueCost: { neural: 'low', metabolic: 'high', mechanical: 'moderate' },
    recoveryTimeH: 24, prerequisites: [], evidence: 'seed',
    doseResponse: { intensity: '40–60% 1RM', reps: '15–30', rir: '1–2', restType: 'short (30–60 s)' } },
  { id: 'aerobicCapacity', family: 'aerobic', adaptations: ['mitochondrial_density', 'stroke_volume', 'capillary_density'],
    assessment: 'vo2max_or_pace', fatigueCost: { neural: 'low', metabolic: 'high', mechanical: 'low' },
    recoveryTimeH: 24, prerequisites: [], evidence: 'seed',
    doseResponse: { intensity: 'zone 2, 60–75% HRmax', reps: 'continuous 20–60 min', rir: 'n/a', restType: 'continuous' } },
  { id: 'anaerobicCapacity', family: 'anaerobic', adaptations: ['glycolytic_enzymes', 'buffering_capacity'],
    assessment: 'repeat_sprint', fatigueCost: { neural: 'moderate', metabolic: 'high', mechanical: 'moderate' },
    recoveryTimeH: 48, prerequisites: [], evidence: 'seed',
    doseResponse: { intensity: 'near-maximal', reps: '6–12 × 20–60 s', rir: 'n/a', restType: 'work:rest ~1:3' } },
  { id: 'mobility', family: 'tissue', adaptations: ['sarcomerogenesis', 'tissue_tolerance'],
    assessment: 'rom_screen', fatigueCost: { neural: 'low', metabolic: 'low', mechanical: 'low' },
    recoveryTimeH: 24, prerequisites: [], evidence: 'seed',
    doseResponse: { intensity: 'end-range, low load', reps: '2–4 × 30–60 s or 8–12 slow', rir: 'n/a', restType: 'short' } },
  { id: 'stability', family: 'control', adaptations: ['proprioception', 'co_contraction'],
    assessment: 'single_leg_balance', fatigueCost: { neural: 'moderate', metabolic: 'low', mechanical: 'low' },
    recoveryTimeH: 24, prerequisites: [], evidence: 'seed',
    doseResponse: { intensity: 'low load / anti-movement', reps: '3–5 × 20–40 s holds or 8–12', rir: '2–3', restType: 'short (45–60 s)' } },
  { id: 'robustness', family: 'durability', adaptations: ['tendon_remodelling', 'tissue_tolerance', 'bone_density'],
    assessment: 'load_tolerance', fatigueCost: { neural: 'low', metabolic: 'moderate', mechanical: 'high' },
    recoveryTimeH: 72, prerequisites: [], evidence: 'seed',
    doseResponse: { intensity: 'progressive, tissue-specific', reps: '6–15', rir: '1–3', restType: 'moderate' } },
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node apps/mobile/tests/athlete-qualities.js`
Expected: PASS — all `T9`/`T10` lines pass; no FAIL lines.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/data/qualities.js apps/mobile/tests/athlete-qualities.js
git commit -m "feat(engine): dose-response on every physical quality (Sprint 5)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: The `exerciseQualities` module, accessor, and coverage test

The core of the sprint: a parallel module tagging all 118 exercises, plus its public accessor on the barrel, gated by a coverage/validity/determinism test.

**Files:**
- Create: `packages/engine/src/data/exerciseQualities.js`
- Modify: `packages/engine/index.js` (barrel re-export)
- Test: `apps/mobile/tests/exercise-quality-tags.js`

**Interfaces:**
- Consumes: `EXERCISES` (`strengthExercises.js`), `getQuality`, `qualityIds` (`qualities.js`), `adaptationIds` (`adaptations.js`)
- Produces:
  - `FORCE_VELOCITY: string[]` — the controlled force-velocity vocabulary.
  - `exerciseQualities(id: string) => { qualities: {id,role}[], adaptations: string[], forceVelocity: string, fatigueCost: {neural,metabolic,mechanical}, evidence: {level,confidence,source,needsReview} } | null`
  - Same accessor re-exported from `@performance-os/engine`.

- [ ] **Step 1: Write the failing coverage/validity/determinism test**

Create `apps/mobile/tests/exercise-quality-tags.js`:

```js
// tests/exercise-quality-tags.js — Sprint 5: every exercise is tagged by physical
// quality/adaptation + force-velocity + fatigue cost. PARALLEL knowledge (nothing in
// generatePlan reads it) — see the golden masters for the "unchanged live plan" proof.
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
import { exerciseQualities, FORCE_VELOCITY } from '@performance-os/engine/data/exerciseQualities.js';
import { exerciseQualities as barrelAccessor } from '@performance-os/engine';
import { qualityIds } from '@performance-os/engine/data/qualities.js';
import { adaptationIds } from '@performance-os/engine/data/adaptations.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const QSET = new Set(qualityIds());
const ASET = new Set(adaptationIds());
const COST_LEVELS = new Set(['low', 'moderate', 'high']);

// Coverage: every exercise resolves, with at least one PRIMARY quality.
let covered = 0;
for (const ex of EXERCISES) {
  const t = exerciseQualities(ex.id);
  assert(t !== null, `${ex.id} is tagged`);
  if (!t) continue;
  covered++;
  assert(Array.isArray(t.qualities) && t.qualities.some((q) => q.role === 'primary'),
    `${ex.id} has ≥1 primary quality`);
  for (const q of t.qualities) assert(QSET.has(q.id), `${ex.id} quality "${q.id}" is a real quality`);
  for (const a of t.adaptations) assert(ASET.has(a), `${ex.id} adaptation "${a}" is a real adaptation`);
  assert(FORCE_VELOCITY.includes(t.forceVelocity), `${ex.id} forceVelocity "${t.forceVelocity}" is in the vocab`);
  assert(t.fatigueCost && COST_LEVELS.has(t.fatigueCost.neural) && COST_LEVELS.has(t.fatigueCost.metabolic) && COST_LEVELS.has(t.fatigueCost.mechanical),
    `${ex.id} fatigueCost is a valid {neural,metabolic,mechanical}`);
  assert(t.evidence && t.evidence.needsReview === true && t.evidence.level === 'seed',
    `${ex.id} carries honest seed evidence (needsReview)`);
}
assert(covered === EXERCISES.length, `all ${EXERCISES.length} exercises covered (got ${covered})`);

// Determinism: two calls are byte-identical (pure).
const sample = EXERCISES[0].id;
assert(JSON.stringify(exerciseQualities(sample)) === JSON.stringify(exerciseQualities(sample)),
  'accessor is deterministic');

// Null-safe on an unknown id.
assert(exerciseQualities('not_a_real_exercise') === null, 'unknown id → null');

// The barrel re-exports the same accessor.
assert(JSON.stringify(barrelAccessor(sample)) === JSON.stringify(exerciseQualities(sample)),
  'barrel export matches the module accessor');

// Spot-checks: the diagnosis must be able to find these.
assert(exerciseQualities('back_squat').qualities[0].id === 'maxStrength', 'back squat → maxStrength primary');
assert(exerciseQualities('depth_jump').qualities[0].id === 'reactiveStrength', 'depth jump → reactiveStrength primary');
assert(exerciseQualities('plank').qualities[0].id === 'stability', 'plank → stability primary');
assert(exerciseQualities('calf_raise').qualities[0].id === 'strengthEndurance', 'calf raise → strengthEndurance primary');
assert(exerciseQualities('biceps_curl').qualities[0].id === 'hypertrophy', 'biceps curl → hypertrophy primary');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node apps/mobile/tests/exercise-quality-tags.js`
Expected: FAIL — module not found (`Cannot find module .../exerciseQualities.js`).

- [ ] **Step 3: Create the `exerciseQualities.js` module**

Create `packages/engine/src/data/exerciseQualities.js`:

```js
/**
 * exerciseQualities — PARALLEL knowledge that tags each exercise by the physical
 * QUALITY/ADAPTATION it develops, its force-velocity profile, and its fatigue cost.
 * The enabler for the diagnosis→plan re-seating (Blueprint W5/S5, EDS §31): the
 * diagnosis speaks in qualities, but the allocator picks by muscle — this is the
 * missing bridge.
 *
 * READ BY NOTHING IN generatePlan. Kept separate from strengthExercises.js (which
 * drives the live plan + both golden masters) exactly like exerciseSimilarity.js, so
 * the generated plan is unaffected. Tags resolve via CLASS rules (reading the flags
 * an exercise already carries) → PATTERN defaults → per-exercise OVERRIDES.
 *
 * Honest seed data: every tag carries evidence.confidence + needsReview:true. It is
 * pattern-derived and awaits an S&C review pass.
 */
import { EXERCISES } from './strengthExercises.js';
import { getQuality } from './qualities.js';

// Controlled force-velocity vocabulary — where an exercise sits on the F–V curve.
export const FORCE_VELOCITY = [
  'maximal-force', 'strength-speed', 'speed-strength', 'ballistic',
  'controlled-hypertrophy', 'endurance', 'isometric', 'mobility',
];

// Fatigue-cost presets by training class (mirrors the qualities.js fatigueCost shape).
const COST = {
  maxForce:    { neural: 'high',     metabolic: 'moderate', mechanical: 'high' },
  specialist:  { neural: 'high',     metabolic: 'low',      mechanical: 'high' },
  olympic:     { neural: 'high',     metabolic: 'moderate', mechanical: 'moderate' },
  plyo:        { neural: 'high',     metabolic: 'low',      mechanical: 'high' },
  hypertrophy: { neural: 'low',      metabolic: 'high',     mechanical: 'moderate' },
  endurance:   { neural: 'low',      metabolic: 'moderate', mechanical: 'moderate' },
  isometric:   { neural: 'moderate', metabolic: 'low',      mechanical: 'low' },
  mobility:    { neural: 'low',      metabolic: 'low',      mechanical: 'low' },
};

// Default quality/force-velocity/cost per MOVEMENT PATTERN — the baseline an exercise
// inherits when no class rule or override applies.
const PATTERN_TAGS = {
  squat: { qualities: [{ id: 'maxStrength', role: 'primary' }, { id: 'hypertrophy', role: 'secondary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'maximal-force', fatigueCost: COST.maxForce, confidence: 'moderate' },
  hinge: { qualities: [{ id: 'maxStrength', role: 'primary' }, { id: 'hypertrophy', role: 'secondary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'maximal-force', fatigueCost: COST.maxForce, confidence: 'moderate' },
  lunge: { qualities: [{ id: 'maxStrength', role: 'primary' }, { id: 'hypertrophy', role: 'secondary' }, { id: 'stability', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.hypertrophy, confidence: 'low' },
  hpush: { qualities: [{ id: 'maxStrength', role: 'primary' }, { id: 'hypertrophy', role: 'secondary' }], forceVelocity: 'maximal-force', fatigueCost: COST.maxForce, confidence: 'moderate' },
  vpush: { qualities: [{ id: 'maxStrength', role: 'primary' }, { id: 'hypertrophy', role: 'secondary' }, { id: 'stability', role: 'secondary' }], forceVelocity: 'maximal-force', fatigueCost: COST.maxForce, confidence: 'moderate' },
  hpull: { qualities: [{ id: 'maxStrength', role: 'primary' }, { id: 'hypertrophy', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.hypertrophy, confidence: 'low' },
  vpull: { qualities: [{ id: 'maxStrength', role: 'primary' }, { id: 'hypertrophy', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.hypertrophy, confidence: 'low' },
  carry: { qualities: [{ id: 'strengthEndurance', role: 'primary' }, { id: 'stability', role: 'secondary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'endurance', fatigueCost: COST.endurance, confidence: 'low' },
  core:  { qualities: [{ id: 'stability', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'isometric', fatigueCost: COST.isometric, confidence: 'moderate' },
  calf:  { qualities: [{ id: 'strengthEndurance', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'endurance', fatigueCost: COST.endurance, confidence: 'low' },
  iso:   { qualities: [{ id: 'hypertrophy', role: 'primary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.hypertrophy, confidence: 'low' },
  mobility: { qualities: [{ id: 'mobility', role: 'primary' }, { id: 'stability', role: 'secondary' }], forceVelocity: 'mobility', fatigueCost: COST.mobility, confidence: 'moderate' },
};

// Cross-cutting CLASS rules — read the flags an exercise already carries rather than
// re-guess. Checked before the pattern default; the first match wins.
function classTag(ex) {
  if (ex.loadClass === 'health' || ex.pattern === 'mobility')  // prehab / activation / foam-roll
    return { qualities: [{ id: 'mobility', role: 'primary' }, { id: 'stability', role: 'secondary' }], forceVelocity: 'mobility', fatigueCost: COST.mobility, confidence: 'moderate' };
  if (ex.quality === 'power')  // plyometric / ballistic
    return { qualities: [{ id: 'explosiveStrength', role: 'primary' }, { id: 'reactiveStrength', role: 'secondary' }], forceVelocity: 'ballistic', fatigueCost: COST.plyo, confidence: 'moderate' };
  if (ex.quality === 'strength')  // heavy specialist variant
    return { qualities: [{ id: 'maxStrength', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'maximal-force', fatigueCost: COST.specialist, confidence: 'moderate' };
  if (ex.quality === 'hypertrophy')  // isolation accent
    return { qualities: [{ id: 'hypertrophy', role: 'primary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.hypertrophy, confidence: 'moderate' };
  if (ex.loadClass === 'isoCore')  // anti-movement trunk work
    return { qualities: [{ id: 'stability', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'isometric', fatigueCost: COST.isometric, confidence: 'moderate' };
  return null;  // → pattern default
}

// Per-exercise OVERRIDES — the true exceptions the class/pattern logic gets wrong.
// Each is a PARTIAL object merged over the derived base (only listed keys change).
const OVERRIDES = {
  // Olympic derivatives: strength-speed, and they carry a max-strength demand.
  hang_clean:  { qualities: [{ id: 'explosiveStrength', role: 'primary' }, { id: 'maxStrength', role: 'secondary' }], forceVelocity: 'strength-speed', fatigueCost: COST.olympic },
  power_clean: { qualities: [{ id: 'explosiveStrength', role: 'primary' }, { id: 'maxStrength', role: 'secondary' }], forceVelocity: 'strength-speed', fatigueCost: COST.olympic },
  // Depth / pogo / bounding: stretch-shortening-cycle dominant → reactiveStrength lead.
  depth_jump:      { qualities: [{ id: 'reactiveStrength', role: 'primary' }, { id: 'explosiveStrength', role: 'secondary' }] },
  double_leg_pogo: { qualities: [{ id: 'reactiveStrength', role: 'primary' }, { id: 'explosiveStrength', role: 'secondary' }] },
  sl_pogo_jump:    { qualities: [{ id: 'reactiveStrength', role: 'primary' }, { id: 'explosiveStrength', role: 'secondary' }] },
  bounding_a_skip: { qualities: [{ id: 'reactiveStrength', role: 'primary' }, { id: 'explosiveStrength', role: 'secondary' }] },
  // Sled push: horizontal acceleration → speed-strength.
  sled_push: { forceVelocity: 'speed-strength' },
  // KB swing: ballistic hip hinge — explosive, not a maximal-force grind.
  kb_swing: { qualities: [{ id: 'explosiveStrength', role: 'primary' }, { id: 'strengthEndurance', role: 'secondary' }], forceVelocity: 'ballistic', fatigueCost: COST.plyo, confidence: 'moderate' },
  // Prehab / cuff / hip-stability isolations mis-default to hypertrophy → stability/robustness.
  face_pull:             { qualities: [{ id: 'stability', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.mobility, confidence: 'moderate' },
  band_face_pull:        { qualities: [{ id: 'stability', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.mobility, confidence: 'moderate' },
  sl_ext_rotation:       { qualities: [{ id: 'stability', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.mobility, confidence: 'moderate' },
  cable_ext_rotation_90: { qualities: [{ id: 'stability', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.mobility, confidence: 'moderate' },
  lateral_band_walk:     { qualities: [{ id: 'stability', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.mobility, confidence: 'moderate' },
  sl_hip_abduction:      { qualities: [{ id: 'stability', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.mobility, confidence: 'moderate' },
  tibialis_raise:        { qualities: [{ id: 'strengthEndurance', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'endurance', fatigueCost: COST.endurance, confidence: 'moderate' },
  // Nordic / glute-ham raise: eccentric hamstring robustness is the headline.
  nordic_curl:     { qualities: [{ id: 'robustness', role: 'primary' }, { id: 'maxStrength', role: 'secondary' }], forceVelocity: 'maximal-force', fatigueCost: COST.specialist, confidence: 'moderate' },
  glute_ham_raise: { qualities: [{ id: 'robustness', role: 'primary' }, { id: 'maxStrength', role: 'secondary' }], forceVelocity: 'maximal-force', fatigueCost: COST.specialist, confidence: 'moderate' },
  // Machine vertical pull: rep-capped, not a maximal grind → hypertrophy lean.
  lat_pulldown: { qualities: [{ id: 'hypertrophy', role: 'primary' }, { id: 'maxStrength', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.hypertrophy },
  // Ab-wheel: loaded trunk flexion under tension — more than a stability hold.
  ab_wheel: { qualities: [{ id: 'stability', role: 'primary' }, { id: 'maxStrength', role: 'secondary' }, { id: 'robustness', role: 'secondary' }] },
};

const EX_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

// Union the adaptations that develop the tagged qualities (via the quality registry).
function adaptationsFor(qualities) {
  const set = new Set();
  for (const q of qualities) {
    const reg = getQuality(q.id);
    if (reg && Array.isArray(reg.adaptations)) for (const a of reg.adaptations) set.add(a);
  }
  return [...set];
}

/**
 * exerciseQualities — the physical-quality tag for an exercise id.
 * @returns { qualities:[{id,role}], adaptations:string[], forceVelocity:string,
 *            fatigueCost:{neural,metabolic,mechanical}, evidence:{level,confidence,source,needsReview} }
 *          or null for an unknown id.
 */
export function exerciseQualities(id) {
  const ex = EX_BY_ID.get(id);
  if (!ex) return null;
  const base = classTag(ex) || PATTERN_TAGS[ex.pattern] || PATTERN_TAGS.iso;
  const ov = OVERRIDES[id] || {};
  const qualities = (ov.qualities || base.qualities).map((q) => ({ ...q }));
  return {
    qualities,
    adaptations: adaptationsFor(qualities),
    forceVelocity: ov.forceVelocity || base.forceVelocity,
    fatigueCost: { ...(ov.fatigueCost || base.fatigueCost) },
    evidence: { level: 'seed', confidence: ov.confidence || base.confidence || 'low', source: 'pattern-derived seed (Sprint 5)', needsReview: true },
  };
}

export default { exerciseQualities, FORCE_VELOCITY };
```

- [ ] **Step 4: Add the barrel re-export**

In `packages/engine/index.js`, add this line after the existing `export { default as sportKnowledge } ...` line (near the end of the export block):

```js
export { exerciseQualities, FORCE_VELOCITY } from './src/data/exerciseQualities.js';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node apps/mobile/tests/exercise-quality-tags.js`
Expected: PASS — `all 118 exercises covered`, all spot-checks pass, `barrel export matches`, no FAIL lines.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/data/exerciseQualities.js packages/engine/index.js apps/mobile/tests/exercise-quality-tags.js
git commit -m "feat(engine): tag the exercise catalogue by physical quality (Sprint 5)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Read-only quality-tag readout in `/dev`

Surfaces the new tags beside each exercise in the DevPlayground plan preview, so the knowledge is visibly sane. Read-only — it changes nothing about the plan.

**Files:**
- Modify: `apps/mobile/src/screens/DevPlayground.jsx` (imports + the exercise row ~line 58–70)

**Interfaces:**
- Consumes: `exerciseQualities` (Task 2), `EXERCISES` (`strengthExercises.js`)
- Produces: no exported interface (a UI decoration only)

- [ ] **Step 1: Add the imports**

In `apps/mobile/src/screens/DevPlayground.jsx`, after the existing engine imports (after the `computeReadiness` import near line 31), add:

```js
import { exerciseQualities } from '@performance-os/engine/data/exerciseQualities.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';

// Session items carry a display `name`, not the exercise id — map name → id so we can
// look up the (read-only) physical-quality tags. Built once at module load.
const NAME_TO_ID = new Map(EXERCISES.map((e) => [e.name, e.id]));
```

- [ ] **Step 2: Render the tags under each exercise name**

In the `ExerciseRow` component, find the line that renders the exercise name (~line 63):

```jsx
            <span style={{ fontWeight: 600, color: 'var(--txt-strong)', flex: '1 1 120px' }}>{it.name || it.stroke}</span>
```

Immediately AFTER that `<span>`, insert this read-only tag line:

```jsx
            {(() => {
              const tag = exerciseQualities(NAME_TO_ID.get(it.name));
              if (!tag) return null;
              const qs = tag.qualities.map((q) => q.id).join(', ');
              return (
                <span style={{ flexBasis: '100%', fontSize: 11, color: 'var(--txt-muted)', marginTop: 2 }}>
                  {qs} · {tag.forceVelocity}
                </span>
              );
            })()}
```

- [ ] **Step 3: Verify in the browser (preview MCP)**

Start the dev server (`preview_start`), navigate to `/dev`, generate a plan (e.g. apply a preset), and confirm each strength exercise shows a muted second line like `maxStrength, hypertrophy, robustness · maximal-force`. Confirm the plan itself (sets/exercises) is unchanged. Take a screenshot as proof.

Expected: quality-tag lines render under exercises; no console errors; plan content unchanged.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/screens/DevPlayground.jsx
git commit -m "feat(dev): read-only quality-tag readout in /dev (Sprint 5)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Parallel-proof (full suite + golden masters) and docs

Proves nothing live changed, then records the sprint in the living docs and advances the handoff pointer.

**Files:**
- Verify: `apps/mobile/tests/golden-master.js`, `apps/mobile/tests/athlete-adapter-golden-master.js` (must stay green, NO `UPDATE=1`)
- Modify: `docs/architecture/ATHLETE-MODEL.md` (new section)
- Modify: `HANDOFF.md` (advance the RESUME-HERE pointer + add a Latest-work entry)

**Interfaces:**
- Consumes: the full `npm test` suite
- Produces: updated docs (no code interface)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — every `apps/mobile/tests/*.js` green, including `golden-master` and `athlete-adapter-golden-master` (byte-identical, no drift). If either golden master drifts, STOP — the new data leaked into `generatePlan`; find and remove the wiring. Do NOT run `UPDATE=1`.

- [ ] **Step 2: Add a section to `docs/architecture/ATHLETE-MODEL.md`**

After section `### 5.4 ...` (the diagnosis section), add:

```markdown
### 5.5 Exercise-quality knowledge layer (Sprint 5, PARALLEL)

`packages/engine/src/data/exerciseQualities.js` tags every one of the 118 exercises with the physical
**qualities** it develops (primary/secondary, from the fixed 10), the **adaptations** it drives
(derived through the quality registry), its **force-velocity** profile (a controlled vocabulary,
`FORCE_VELOCITY`), and a per-exercise **fatigue cost** (`{neural, metabolic, mechanical}`). Tags
resolve via CLASS rules (reading the flags an exercise already carries) → PATTERN defaults →
per-exercise OVERRIDES, mirroring `exerciseSimilarity.js`. Every tag carries honest seed evidence
(`{ level:'seed', confidence, source, needsReview:true }`).

Each of the 10 qualities also now carries a `doseResponse` (`{ intensity, reps, rir, restType }`), so
the blueprint's rule holds — no quality label without both a dose and an assessment.

**This is PARALLEL knowledge — nothing in `generatePlan` reads it.** It is the bridge the diagnosis
needs before it can steer exercise selection (the allocator picks by muscle; the diagnosis speaks in
qualities). Both golden masters stay byte-identical. Accessor: `exerciseQualities(id)` (also on the
engine barrel). Consumers arrive next: **D10** (movement/quality requirements) and **D11** (intervention
selection) in Sprints 7–8. Design + plan: `docs/superpowers/{specs,plans}/2026-07-02-exercise-quality-tagging-*`.
```

- [ ] **Step 3: Advance the `HANDOFF.md` pointer**

In `HANDOFF.md`, in the `## ▶ RESUME HERE` section, replace the "THE NEXT STEP" wording so it points past this sprint. Change the `**⇒ THE NEXT STEP** ...` paragraph's opening to note S5 (exercise-quality tagging) is DONE and the next step is **Blueprint Sprint 7 (D9/D10 — session objective + movement requirements)**, still feeding toward the D11 allocator re-seat (Sprint 8). Then add a new dated entry at the top of the "Latest work" entries:

```markdown
## Latest work — Sprint 5: exercise-quality tagging (the re-seat enabler) (2026-07-02)

On branch **`feat/exercise-quality-tags`**. The on-path enabler for the diagnosis→plan re-seating
(Blueprint **Sprint 5 / Wave W5**): the exercise catalogue is now tagged by the physical
quality/adaptation it develops, its force-velocity profile, and its fatigue cost — the bridge the
diagnosis (which speaks in qualities) needs before it can steer exercise selection (the allocator
picks by muscle). Design/plan: `docs/superpowers/{specs,plans}/2026-07-02-exercise-quality-tagging-*`.

- **New `packages/engine/src/data/exerciseQualities.js`** — `exerciseQualities(id)` (also on the
  barrel) tags all 118 exercises via CLASS rules → PATTERN defaults → per-exercise OVERRIDES
  (mirrors `exerciseSimilarity.js`). Honest seed evidence (`confidence` + `needsReview:true`).
- **`qualities.js`** — every quality gained a `doseResponse` (no label without a dose + assessment).
- **Read-only `/dev` readout** shows each exercise's quality tags; the plan itself is unchanged.
- **PARALLEL — nothing in `generatePlan` reads it.** Both golden masters stay byte-identical green
  (verified: full `npm test` green, no `UPDATE=1`). Frozen governance set untouched.
- **Next:** Blueprint **Sprint 7 (D9/D10)** — session objective + movement requirements — then
  **Sprint 8 (D11)** re-seats the allocator's `bestExercise` to select by these qualities.
```

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/ATHLETE-MODEL.md HANDOFF.md
git commit -m "docs: record Sprint 5 (exercise-quality tagging); advance handoff to S7

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Exercise→quality tags (qualities/adaptations/force-velocity/fatigue cost), pattern-defaults + overrides, evidence+needsReview → Task 2. ✓
- Dose-response on every quality (no label without dose+assessment) → Task 1. ✓
- Pure accessor on the engine barrel → Task 2 (Steps 3–4). ✓
- Coverage/validity/determinism tests → Task 2; dose+assessment invariant → Task 1. ✓
- Golden masters stay byte-identical (parallel proof) → Task 4 Step 1. ✓
- Read-only `/dev` readout → Task 3. ✓
- Docs (ATHLETE-MODEL.md new section; HANDOFF.md pointer + entry) → Task 4. ✓
- Frozen set + `strengthExercises.js`/allocator/program/targets untouched → Global Constraints + no task edits them. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every command has an expected result. ✓

**Type consistency:** `exerciseQualities(id)` return shape is identical across the module (Task 2 Step 3), its test (Task 2 Step 1), the barrel (Task 2 Step 4), and the `/dev` consumer (Task 3). `FORCE_VELOCITY` is one exported array. `doseResponse` keys (`intensity, reps, rir, restType`) match between Task 1's data and its invariant. `fatigueCost` keys (`neural, metabolic, mechanical`) match `qualities.js` and the module. ✓
