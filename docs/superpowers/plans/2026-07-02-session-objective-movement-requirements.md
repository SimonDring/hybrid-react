# Session Objective (D9) + Movement Requirements (D10) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compute, per session, a named objective (D9: purpose + target quality + intensity zone + fatigue budget) and movement/quality requirements (D10: patterns + force-velocity + contraction, injury-contraindications subtracted) — as pure, PARALLEL model output that nothing in `generatePlan` reads.

**Architecture:** A new `packages/engine/src/lib/session/` decision layer (D9 `sessionObjective.js`, D10 `movementRequirements.js`, assembly `sessionSpecs.js`) driven by a new `qualityMovementMap.js` knowledge table, consuming the S6 diagnosis (`priorityAdaptations`), the S5 quality/dose data, and the injury contraindications. It is consumed only by tests and a read-only `/dev` panel — never `generatePlan` — so both golden masters stay byte-identical.

**Tech Stack:** Vanilla ES modules (`@performance-os/engine`), Node's built-in test running (`apps/mobile/tests/*.js` via `run-all.mjs`), React (`/dev` DevPlayground).

## Global Constraints

- **Pure/deterministic engine code** — no `Date`, no `Math.random`. Same input → byte-identical output.
- **PARALLEL model output** — nothing in `generatePlan`/allocator/`program.js`/`targets.js` may read the new modules. BOTH `apps/mobile/tests/golden-master.js` and `apps/mobile/tests/athlete-adapter-golden-master.js` must stay byte-identical (no `UPDATE=1`). Drift = a wiring bug this sprint.
- **Physical-quality vocabulary is the fixed 10** in `qualities.js`. **Force-velocity values must be members of the exported `FORCE_VELOCITY`** array from `exerciseQualities.js` (`['maximal-force','strength-speed','speed-strength','ballistic','controlled-hypertrophy','endurance','isometric','mobility']`). **Movement patterns** come from the exercise `pattern` vocab (`squat,hinge,lunge,hpush,vpush,hpull,vpull,carry,core,calf,iso,mobility`).
- **Cardio qualities** (`aerobicCapacity`, `anaerobicCapacity`) are NOT gym-trained directly — they translate to gym-support qualities via `CARDIO_GYM_SUPPORT`.
- **Every knowledge entry carries `evidence: { level:'seed', confidence, source, needsReview:true }`.**
- **Theme tokens in `/dev`:** only real variables (`--txt-muted`, `--txt-strong`, `--bg-surface`, `--bg-surface-2`, `--hairline`, `--moss`, `--ochre`), never invented ones.
- **Do NOT modify:** `strengthExercises.js`, `plan/allocator.js`, `strength/program.js`, `strength/targets.js`, `PlanGenerator.js`, or any FROZEN governance doc.
- **Run tests** from the repo root: full suite `npm test`; a single file `node apps/mobile/tests/<file>.js`.

---

### Task 1: Quality → movement knowledge table

The EDS's "adaptation→movement" knowledge, plus the cardio→gym-support translation. Pure data + accessors.

**Files:**
- Create: `packages/engine/src/data/qualityMovementMap.js`
- Test: `apps/mobile/tests/quality-movement-map.js`

**Interfaces:**
- Consumes: `qualityIds` (`qualities.js`), `FORCE_VELOCITY` (`exerciseQualities.js`), `EXERCISES` (`strengthExercises.js`) — for validation in the test only.
- Produces:
  - `QUALITY_MOVEMENT`: `{ [qualityId]: { movementPatterns: string[], forceVelocity: string, contraction: string, note?: string, evidence } }`
  - `CARDIO_GYM_SUPPORT`: `{ aerobicCapacity: string[], anaerobicCapacity: string[] }`
  - `GYM_TRAINABLE`: `Set<string>` (the 8 non-cardio qualities)
  - `movementRequirementsFor(qualityId) => entry | null`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/quality-movement-map.js`:

```js
// tests/quality-movement-map.js — Sprint 7: quality → movement-requirement knowledge (D10 input).
import { QUALITY_MOVEMENT, CARDIO_GYM_SUPPORT, GYM_TRAINABLE, movementRequirementsFor } from '@performance-os/engine/data/qualityMovementMap.js';
import { qualityIds } from '@performance-os/engine/data/qualities.js';
import { FORCE_VELOCITY } from '@performance-os/engine/data/exerciseQualities.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

const PATTERN_VOCAB = new Set(EXERCISES.map((e) => e.pattern));

// Every quality is mapped.
for (const q of qualityIds()) {
  const e = movementRequirementsFor(q);
  assert(e, `${q} has a movement-requirement entry`);
  if (!e) continue;
  assert(Array.isArray(e.movementPatterns) && e.movementPatterns.length > 0, `${q} has movement patterns`);
  for (const p of e.movementPatterns) assert(PATTERN_VOCAB.has(p), `${q} pattern "${p}" is a real exercise pattern`);
  assert(FORCE_VELOCITY.includes(e.forceVelocity), `${q} forceVelocity "${e.forceVelocity}" is in the vocab`);
  assert(typeof e.contraction === 'string' && e.contraction.length, `${q} has a contraction emphasis`);
  assert(e.evidence && e.evidence.needsReview === true, `${q} carries honest seed evidence`);
}

// Cardio qualities carry a gym-support note and a translation to gym-trainable qualities.
for (const c of ['aerobicCapacity', 'anaerobicCapacity']) {
  assert(Array.isArray(CARDIO_GYM_SUPPORT[c]) && CARDIO_GYM_SUPPORT[c].length, `${c} translates to gym-support qualities`);
  for (const s of CARDIO_GYM_SUPPORT[c]) assert(GYM_TRAINABLE.has(s), `${c} support "${s}" is gym-trainable`);
}

// GYM_TRAINABLE is exactly the 8 non-cardio qualities.
assert(GYM_TRAINABLE.size === 8 && !GYM_TRAINABLE.has('aerobicCapacity') && !GYM_TRAINABLE.has('anaerobicCapacity'),
  'GYM_TRAINABLE excludes the two cardio qualities');

// Spot-checks tying to the EDS runner/sprinter prescription.
assert(movementRequirementsFor('robustness').contraction === 'eccentric-emphasis', 'robustness → eccentric emphasis');
assert(movementRequirementsFor('explosiveStrength').forceVelocity === 'strength-speed', 'explosive → strength-speed');
assert(CARDIO_GYM_SUPPORT.aerobicCapacity.includes('robustness'), 'aerobic support includes robustness (durability/economy)');

assert(movementRequirementsFor('not_a_quality') === null, 'unknown quality → null');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node apps/mobile/tests/quality-movement-map.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the knowledge module**

Create `packages/engine/src/data/qualityMovementMap.js`:

```js
/**
 * qualityMovementMap — the "adaptation→movement" knowledge (EDS §32, D10 input): for each physical
 * quality, the ideal movement requirements (patterns + force-velocity + contraction) — as REQUIREMENTS,
 * not exercises. Reuses the S5 FORCE_VELOCITY vocab and the exercise `pattern` vocab so the layers speak
 * one language. Honest seed data (needsReview). PARALLEL — read only by the D9/D10 session layer + tests.
 *
 * Cardio qualities (aerobic/anaerobic) are NOT gym-trained directly; CARDIO_GYM_SUPPORT translates them
 * to the gym-trainable qualities that SUPPORT them (e.g. aerobicCapacity → robustness + reactiveStrength:
 * durability + running economy via tendon stiffness — the EDS in-season-runner's exact gym prescription).
 */
const ev = (confidence) => ({ level: 'seed', confidence, source: 'seed movement map (Sprint 7)', needsReview: true });

export const QUALITY_MOVEMENT = {
  maxStrength:       { movementPatterns: ['squat', 'hinge', 'hpush', 'vpush', 'hpull', 'vpull'], forceVelocity: 'maximal-force', contraction: 'grinding', evidence: ev('moderate') },
  hypertrophy:       { movementPatterns: ['squat', 'hinge', 'lunge', 'hpush', 'vpush', 'hpull', 'vpull', 'iso'], forceVelocity: 'controlled-hypertrophy', contraction: 'controlled', evidence: ev('moderate') },
  explosiveStrength: { movementPatterns: ['squat', 'hinge'], forceVelocity: 'strength-speed', contraction: 'explosive-concentric', evidence: ev('moderate') },
  reactiveStrength:  { movementPatterns: ['squat', 'calf'], forceVelocity: 'ballistic', contraction: 'fast-ssc', evidence: ev('moderate') },
  strengthEndurance: { movementPatterns: ['lunge', 'carry', 'calf', 'iso'], forceVelocity: 'endurance', contraction: 'sustained', evidence: ev('low') },
  aerobicCapacity:   { movementPatterns: ['carry', 'lunge'], forceVelocity: 'endurance', contraction: 'sustained', note: 'gym-support only — developed by cardio, not the gym', evidence: ev('low') },
  anaerobicCapacity: { movementPatterns: ['carry', 'lunge'], forceVelocity: 'endurance', contraction: 'sustained', note: 'gym-support only — developed by cardio, not the gym', evidence: ev('low') },
  mobility:          { movementPatterns: ['mobility'], forceVelocity: 'mobility', contraction: 'end-range', evidence: ev('moderate') },
  stability:         { movementPatterns: ['core', 'carry', 'iso'], forceVelocity: 'isometric', contraction: 'isometric', evidence: ev('moderate') },
  robustness:        { movementPatterns: ['hinge', 'lunge', 'calf', 'iso'], forceVelocity: 'maximal-force', contraction: 'eccentric-emphasis', evidence: ev('moderate') },
};

// A cardio priority means "support it in the gym" — translate to gym-trainable qualities.
export const CARDIO_GYM_SUPPORT = {
  aerobicCapacity: ['robustness', 'reactiveStrength'],
  anaerobicCapacity: ['strengthEndurance', 'maxStrength'],
};

// The gym-trainable qualities (everything except the two cardio qualities).
export const GYM_TRAINABLE = new Set([
  'maxStrength', 'hypertrophy', 'explosiveStrength', 'reactiveStrength',
  'strengthEndurance', 'mobility', 'stability', 'robustness',
]);

export function movementRequirementsFor(qualityId) {
  return QUALITY_MOVEMENT[qualityId] || null;
}

export default { QUALITY_MOVEMENT, CARDIO_GYM_SUPPORT, GYM_TRAINABLE, movementRequirementsFor };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node apps/mobile/tests/quality-movement-map.js`
Expected: PASS — all lines PASS, no FAIL.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/data/qualityMovementMap.js apps/mobile/tests/quality-movement-map.js
git commit -m "feat(engine): quality→movement knowledge + cardio gym-support map (Sprint 7)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: D9 — session objective

Pure functions that pick each session's gym target quality (translating cardio priorities) and derive its objective.

**Files:**
- Create: `packages/engine/src/lib/session/sessionObjective.js`
- Test: `apps/mobile/tests/session-objective.js`

**Interfaces:**
- Consumes: `getQuality` (`qualities.js`), `GYM_TRAINABLE`, `CARDIO_GYM_SUPPORT` (`qualityMovementMap.js`, Task 1).
- Produces:
  - `gymTrainableTargets(priorityQualities, goalPrimary) => string[]` (distinct, ordered)
  - `assignTargetQualities(priorityQualities, sessionCount, goalPrimary) => string[]` (length `sessionCount`)
  - `deriveSessionObjective({ targetQuality, region, phaseIntent, deload, taper, season }) => { purpose, targetQuality, intensityZone, fatigueBudget: {level, note}, rationale }`
  - `priorityQualities` accepts either `priorityAdaptations` entries (`{qualityId,...}`) or bare id strings.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/session-objective.js`:

```js
// tests/session-objective.js — Sprint 7 D9: per-session objective from the diagnosis.
import { gymTrainableTargets, assignTargetQualities, deriveSessionObjective } from '@performance-os/engine/lib/session/sessionObjective.js';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

// Cardio priority translates to gym-support qualities; gym-trainable passes through.
assert(JSON.stringify(gymTrainableTargets([{ qualityId: 'aerobicCapacity' }], null)) === JSON.stringify(['robustness', 'reactiveStrength']),
  'aerobicCapacity priority → [robustness, reactiveStrength]');
assert(JSON.stringify(gymTrainableTargets([{ qualityId: 'explosiveStrength' }], null)) === JSON.stringify(['explosiveStrength']),
  'explosiveStrength priority → [explosiveStrength]');
// Build athlete (empty diagnosis) → goalPrimary.
assert(JSON.stringify(gymTrainableTargets([], 'hypertrophy')) === JSON.stringify(['hypertrophy']), 'empty priorities → [goalPrimary]');
assert(JSON.stringify(gymTrainableTargets([], null)) === JSON.stringify(['maxStrength']), 'empty + no goal → [maxStrength] fallback');

// Round-robin assignment across sessions.
const a = assignTargetQualities([{ qualityId: 'aerobicCapacity' }], 4, null); // → [robustness,reactiveStrength]
assert(a.length === 4 && a[0] === 'robustness' && a[1] === 'reactiveStrength' && a[2] === 'robustness', 'round-robin across 4 sessions');

// deriveSessionObjective — all four fields present.
const o = deriveSessionObjective({ targetQuality: 'maxStrength', region: 'lower', phaseIntent: 'build', deload: false, taper: false, season: null });
assert(o.purpose && /max strength/i.test(o.purpose) && /lower/i.test(o.purpose), 'purpose names the quality + region');
assert(o.targetQuality === 'maxStrength', 'targetQuality echoed');
assert(typeof o.intensityZone === 'string' && o.intensityZone.length, 'intensityZone present');
assert(o.fatigueBudget && ['low', 'moderate', 'high'].includes(o.fatigueBudget.level), 'fatigueBudget has a level');
assert(typeof o.rationale === 'string' && o.rationale.length, 'rationale present');

// In-season sport → "maintain, minimal fatigue" + a reduced fatigue budget.
const hi = deriveSessionObjective({ targetQuality: 'maxStrength', region: 'lower', phaseIntent: 'base', deload: false, taper: false, season: null });
const inS = deriveSessionObjective({ targetQuality: 'maxStrength', region: 'lower', phaseIntent: 'base', deload: false, taper: false, season: 'in' });
assert(/maintain/i.test(inS.purpose) && /minimal fatigue/i.test(inS.purpose), 'in-season purpose = maintain, minimal fatigue');
const rank = { low: 0, moderate: 1, high: 2 };
assert(rank[inS.fatigueBudget.level] <= rank[hi.fatigueBudget.level], 'in-season fatigue budget is not higher');

// Deterministic.
assert(JSON.stringify(deriveSessionObjective({ targetQuality: 'robustness', region: 'lower', phaseIntent: 'base' }))
     === JSON.stringify(deriveSessionObjective({ targetQuality: 'robustness', region: 'lower', phaseIntent: 'base' })), 'deterministic');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node apps/mobile/tests/session-objective.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the D9 module**

Create `packages/engine/src/lib/session/sessionObjective.js`:

```js
/**
 * sessionObjective — D9: give each session ONE named purpose (target quality + intensity zone +
 * fatigue budget), driven by the diagnosis. PARALLEL — read only by the session layer + tests.
 *
 * Gym-target resolution: pass a diagnosis priority quality through if the gym can train it; translate
 * a cardio priority to the gym-trainable qualities that support it (CARDIO_GYM_SUPPORT). A build athlete
 * (empty diagnosis) uses the goal's primary quality.
 */
import { getQuality } from '../../data/qualities.js';
import { GYM_TRAINABLE, CARDIO_GYM_SUPPORT } from '../../data/qualityMovementMap.js';

const QUALITY_LABEL = {
  maxStrength: 'max strength', hypertrophy: 'hypertrophy', explosiveStrength: 'explosive strength',
  reactiveStrength: 'reactive strength', strengthEndurance: 'strength endurance',
  aerobicCapacity: 'aerobic capacity', anaerobicCapacity: 'anaerobic capacity',
  mobility: 'mobility', stability: 'stability', robustness: 'robustness',
};
const REGION_WORD = { lower: 'lower body', upper: 'upper body', core: 'trunk', full: '' };
const idOf = (p) => (p && typeof p === 'object' ? p.qualityId : p);

// The ordered, distinct gym-trainable target qualities for an athlete.
export function gymTrainableTargets(priorityQualities = [], goalPrimary = null) {
  const out = [];
  for (const p of Array.isArray(priorityQualities) ? priorityQualities : []) {
    const q = idOf(p);
    if (!q) continue;
    if (GYM_TRAINABLE.has(q)) out.push(q);
    else if (CARDIO_GYM_SUPPORT[q]) out.push(...CARDIO_GYM_SUPPORT[q]);
  }
  const distinct = [...new Set(out)];
  if (distinct.length) return distinct;
  if (goalPrimary && GYM_TRAINABLE.has(goalPrimary)) return [goalPrimary];
  return ['maxStrength'];
}

// One target quality per session (round-robin over the gym-trainable targets).
export function assignTargetQualities(priorityQualities, sessionCount, goalPrimary) {
  const targets = gymTrainableTargets(priorityQualities, goalPrimary);
  const n = Math.max(1, sessionCount || 1);
  return Array.from({ length: n }, (_, i) => targets[i % targets.length]);
}

// Coarse fatigue level (0..2) from a quality's dominant fatigue cost.
function fatigueLevel(quality) {
  const fc = (quality && quality.fatigueCost) || {};
  const order = { low: 0, moderate: 1, high: 2 };
  return Math.max(order[fc.neural] ?? 1, order[fc.metabolic] ?? 1, order[fc.mechanical] ?? 1);
}

export function deriveSessionObjective({ targetQuality, region = 'full', phaseIntent = 'base', deload = false, taper = false, season = null } = {}) {
  const q = getQuality(targetQuality);
  const label = QUALITY_LABEL[targetQuality] || targetQuality || 'strength';
  const rw = REGION_WORD[region] || '';

  // Intensity zone from the quality's dose-response (added in S5), adjusted for phase/deload/taper.
  const dr = (q && q.doseResponse) || {};
  let intensityZone;
  if (deload) intensityZone = 'reduced load (~65%, leave 3+ reps in reserve)';
  else if (taper) intensityZone = `${dr.intensity || 'near-peak'} — hold intensity, cut volume`;
  else if (phaseIntent === 'peak') intensityZone = `${dr.intensity || 'high'} (top of range)`;
  else intensityZone = [dr.intensity, dr.rir && dr.rir !== 'n/a' ? `RIR ${dr.rir}` : ''].filter(Boolean).join(', ') || 'quality-appropriate';

  // Fatigue budget: dominant cost, reduced for deload/taper and in-season sport.
  let lvl = fatigueLevel(q);
  if (deload || taper) lvl = Math.max(0, lvl - 1);
  if (season === 'in') lvl = Math.max(0, lvl - 1);
  const level = ['low', 'moderate', 'high'][lvl];
  const note = season === 'in' ? 'protect the sport — spend little fatigue' : deload || taper ? 'recover — bank fatigue' : 'train hard within budget';

  const purpose = season === 'in'
    ? `Maintain ${label}${rw ? ' — ' + rw : ''}, minimal fatigue`
    : `Develop ${label}${rw ? ' — ' + rw : ''}`;

  return {
    purpose,
    targetQuality: targetQuality || 'maxStrength',
    intensityZone,
    fatigueBudget: { level, note },
    rationale: `targeting ${label} from the diagnosis; ${intensityZone}; fatigue budget ${level}.`,
  };
}

export default { gymTrainableTargets, assignTargetQualities, deriveSessionObjective };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node apps/mobile/tests/session-objective.js`
Expected: PASS — all lines PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/session/sessionObjective.js apps/mobile/tests/session-objective.js
git commit -m "feat(engine): D9 session objective — target quality + intensity + fatigue (Sprint 7)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: D10 — movement requirements + contraindication mapping

Pure functions that turn the objective into movement/quality requirements, subtracting injury contraindications up front and downgrading force-velocity for novices.

**Files:**
- Create: `packages/engine/src/lib/session/movementRequirements.js`
- Test: `apps/mobile/tests/movement-requirements.js`

**Interfaces:**
- Consumes: `movementRequirementsFor` (`qualityMovementMap.js`, Task 1), `EXERCISES` (`strengthExercises.js`), `getContraindications` (`injury/injuryRules.js`).
- Produces:
  - `deriveMovementRequirements({ targetQuality, region, level, contraindicatedPatterns }) => { movementPatterns, forceVelocity, contraction, contraindicated: [{pattern,reason}], competencyNote, rationale } | null`
  - `contraindicatedPatternsFrom(blockedRegexes, exercises?) => Set<string>`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/movement-requirements.js`:

```js
// tests/movement-requirements.js — Sprint 7 D10: movement/quality requirements, contraindications up front.
import { deriveMovementRequirements, contraindicatedPatternsFrom } from '@performance-os/engine/lib/session/movementRequirements.js';
import { getContraindications } from '@performance-os/engine/lib/injury/injuryRules.js';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

// Base requirement for max strength on a lower day — region intersect keeps lower patterns.
const base = deriveMovementRequirements({ targetQuality: 'maxStrength', region: 'lower', level: 'intermediate', contraindicatedPatterns: new Set() });
assert(base.movementPatterns.every((p) => ['squat', 'hinge', 'lunge', 'calf'].includes(p)), 'lower region → only lower patterns');
assert(base.forceVelocity === 'maximal-force', 'max strength → maximal-force');
assert(base.contraindicated.length === 0 && base.competencyNote === null, 'no injury/competency → nothing removed');

// Injury contraindication removed up front, with a reason.
const kneeBlocked = getContraindications('knee', 4, 'protect').blockedPatterns;
const kneePatterns = contraindicatedPatternsFrom(kneeBlocked);
assert(kneePatterns.has('squat') && kneePatterns.has('lunge') && kneePatterns.has('hinge'), 'knee injury → squat/lunge/hinge contraindicated');
const injured = deriveMovementRequirements({ targetQuality: 'maxStrength', region: 'lower', level: 'intermediate', contraindicatedPatterns: kneePatterns });
assert(!injured.movementPatterns.includes('squat'), 'knee injury removes the squat requirement');
assert(injured.contraindicated.some((c) => c.pattern === 'squat' && c.reason === 'injury'), 'removal recorded with reason:injury');

// Novice + high-skill force-velocity → downgraded to maximal-force, with a competency note.
const novice = deriveMovementRequirements({ targetQuality: 'explosiveStrength', region: 'lower', level: 'beginner', contraindicatedPatterns: new Set() });
assert(novice.forceVelocity === 'maximal-force', 'novice explosive → force-velocity downgraded to maximal-force');
assert(novice.competencyNote && /base/i.test(novice.competencyNote), 'competency note explains base-first');
// An advanced athlete keeps the high-skill force-velocity.
const adv = deriveMovementRequirements({ targetQuality: 'explosiveStrength', region: 'lower', level: 'advanced', contraindicatedPatterns: new Set() });
assert(adv.forceVelocity === 'strength-speed' && adv.competencyNote === null, 'advanced explosive keeps strength-speed');

assert(deriveMovementRequirements({ targetQuality: 'not_a_quality', region: 'full', level: 'intermediate', contraindicatedPatterns: new Set() }) === null, 'unknown quality → null');

// Deterministic.
assert(JSON.stringify(deriveMovementRequirements({ targetQuality: 'robustness', region: 'lower', level: 'intermediate', contraindicatedPatterns: new Set() }))
     === JSON.stringify(deriveMovementRequirements({ targetQuality: 'robustness', region: 'lower', level: 'intermediate', contraindicatedPatterns: new Set() })), 'deterministic');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node apps/mobile/tests/movement-requirements.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the D10 module**

Create `packages/engine/src/lib/session/movementRequirements.js`:

```js
/**
 * movementRequirements — D10: translate a session objective into MOVEMENT/QUALITY REQUIREMENTS
 * (patterns + force-velocity + contraction) — requirements, not exercises (EDS P5). Constraints are
 * computed BEFORE content (EDS L8): injury-contraindicated patterns are subtracted up front, and a
 * novice's high-skill force-velocity is downgraded to a strength base (EDS L4). PARALLEL.
 */
import { movementRequirementsFor } from '../../data/qualityMovementMap.js';
import { EXERCISES } from '../../data/strengthExercises.js';

// Patterns that belong to each session region (a soft filter — see below).
const REGION_PATTERNS = {
  lower: ['squat', 'hinge', 'lunge', 'calf'],
  upper: ['hpush', 'vpush', 'hpull', 'vpull'],
  core: ['core', 'carry', 'iso'],
  full: null, // no filter
};
const ALL_PATTERNS = ['squat', 'hinge', 'lunge', 'hpush', 'vpush', 'hpull', 'vpull', 'carry', 'core', 'calf', 'iso', 'mobility'];
const HIGH_SKILL_FV = new Set(['ballistic', 'strength-speed']);

// Map the injury system's NAME-regex block list onto the MOVEMENT-PATTERN vocabulary: a pattern is
// contraindicated when a majority of its catalogue exercises' names match a blocked regex.
export function contraindicatedPatternsFrom(blockedRegexes = [], exercises = EXERCISES) {
  const out = new Set();
  const rx = Array.isArray(blockedRegexes) ? blockedRegexes : [];
  if (!rx.length) return out;
  for (const p of ALL_PATTERNS) {
    const exs = exercises.filter((e) => e.pattern === p);
    if (!exs.length) continue;
    const blocked = exs.filter((e) => rx.some((r) => r.test(e.name))).length;
    if (blocked > exs.length / 2) out.add(p);
  }
  return out;
}

export function deriveMovementRequirements({ targetQuality, region = 'full', level = 'intermediate', contraindicatedPatterns = new Set() } = {}) {
  const base = movementRequirementsFor(targetQuality);
  if (!base) return null;

  // Region intersect (soft: if the quality's patterns don't touch the region, keep the full set).
  const rp = REGION_PATTERNS[region];
  let patterns = base.movementPatterns.slice();
  if (rp) {
    const inRegion = patterns.filter((p) => rp.includes(p));
    if (inRegion.length) patterns = inRegion;
  }

  // Subtract injury-contraindicated patterns up front (L8).
  const blocked = contraindicatedPatterns instanceof Set ? contraindicatedPatterns : new Set(contraindicatedPatterns || []);
  const contraindicated = [];
  patterns = patterns.filter((p) => {
    if (blocked.has(p)) { contraindicated.push({ pattern: p, reason: 'injury' }); return false; }
    return true;
  });

  // Competency (L4): a novice can't express high-skill velocity — build the strength base first.
  let forceVelocity = base.forceVelocity;
  let competencyNote = null;
  if (level === 'beginner' && HIGH_SKILL_FV.has(forceVelocity)) {
    competencyNote = 'plyometric/Olympic velocity deferred — build the strength base first';
    forceVelocity = 'maximal-force';
  }

  const rationale = `${base.contraction} ${patterns.join('/') || '(all ideal patterns contraindicated)'} at ${forceVelocity}`
    + (contraindicated.length ? `; removed ${contraindicated.map((c) => c.pattern).join(', ')} — injury` : '')
    + (competencyNote ? `; ${competencyNote}` : '');

  return { movementPatterns: patterns, forceVelocity, contraction: base.contraction, contraindicated, competencyNote, rationale };
}

export default { deriveMovementRequirements, contraindicatedPatternsFrom };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node apps/mobile/tests/movement-requirements.js`
Expected: PASS — all lines PASS (knee → squat/lunge/hinge contraindicated; novice explosive downgraded).

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/session/movementRequirements.js apps/mobile/tests/movement-requirements.js
git commit -m "feat(engine): D10 movement requirements — contraindications + competency up front (Sprint 7)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Assembly + barrel + the headline archetype test

Compose D9+D10 per session, expose on the barrel, and prove the EDS runner-vs-sprinter come out categorically different.

**Files:**
- Create: `packages/engine/src/lib/session/sessionSpecs.js`
- Modify: `packages/engine/index.js`
- Test: `apps/mobile/tests/session-archetypes.js`

**Interfaces:**
- Consumes: `assignTargetQualities`, `deriveSessionObjective` (Task 2), `deriveMovementRequirements` (Task 3), and the Performance Model's `priorityAdaptations` + `answersToAthleteModelInputs` (app test helper).
- Produces:
  - `regionOf(focusLabel) => 'lower'|'upper'|'core'|'full'`
  - `deriveSessionSpecs({ priorityQualities, goalPrimary, sessions, level, phaseIntent, deload, taper, season, contraindicatedPatterns }) => Array<{ objective, requirements }>` (parallel to `sessions`)
  - Both re-exported from `@performance-os/engine`, plus `deriveSessionObjective`, `deriveMovementRequirements`.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/session-archetypes.js`:

```js
// tests/session-archetypes.js — Sprint 7 headline: the EDS §22 runner vs sprinter come out
// categorically different (same sport, different diagnosis → different session specs).
import { BLANK_ANSWERS, answersToAthleteModelInputs, localISODate } from '../src/lib/onboardingModel.js';
import { derivePerformanceModel } from '@performance-os/engine/lib/performance/index.js';
import { deriveSessionSpecs, regionOf } from '@performance-os/engine/lib/session/sessionSpecs.js';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

const asOf = '2026-07-02';
const specsFor = (over, sessions, extra = {}) => {
  const a = { ...BLANK_ANSWERS, goalType: 'sport', ...over };
  const pm = derivePerformanceModel(answersToAthleteModelInputs(a, asOf), asOf);
  return { pm, specs: deriveSessionSpecs({ priorityQualities: pm.priorityAdaptations, sessions, ...extra }) };
};

// regionOf maps focus labels to regions.
assert(regionOf('Lower') === 'lower' && regionOf('Upper') === 'upper' && regionOf('Push') === 'upper' && regionOf('Core') === 'core' && regionOf('Full body') === 'full',
  'regionOf maps focus labels to regions');

const twoDays = [{ focus: 'Lower' }, { focus: 'Upper' }];

// In-season distance runner: priority aerobicCapacity → gym-support robustness + reactiveStrength.
const runner = specsFor({ skbSport: 'running_long', experienceLevel: 'intermediate', sportSeason: 'in' }, twoDays, { level: 'intermediate', season: 'in' });
const runnerTargets = new Set(runner.specs.map((s) => s.objective.targetQuality));
assert(runnerTargets.has('robustness') || runnerTargets.has('reactiveStrength'), 'runner targets durability/economy (robustness/reactiveStrength)');
assert(!runnerTargets.has('explosiveStrength') && !runnerTargets.has('hypertrophy'), 'runner does NOT chase power or mass');
// No chest/arm work: the lower session's requirements exclude hpush.
const runnerLower = runner.specs[0].requirements;
assert(!runnerLower.movementPatterns.includes('hpush'), 'runner lower session requires no chest (hpush) pattern');

// Novice sprinter: priority explosiveStrength; on a novice the force-velocity is competency-downgraded.
const sprinter = specsFor({ skbSport: 'running_sprint', experienceLevel: 'beginner', sportSeason: 'off' }, twoDays, { level: 'beginner', season: 'off' });
const sprinterTargets = new Set(sprinter.specs.map((s) => s.objective.targetQuality));
assert(sprinterTargets.has('explosiveStrength'), 'sprinter targets explosive strength');
assert(sprinter.specs.some((s) => s.requirements && s.requirements.competencyNote), 'novice sprinter has a competency note (base first)');
assert(sprinter.specs.every((s) => s.requirements.forceVelocity !== 'ballistic'), 'novice sprinter force-velocity is not left ballistic');

// CATEGORICALLY DIFFERENT: the two share the sport of running but their target-quality sets are disjoint.
const intersection = [...runnerTargets].filter((q) => sprinterTargets.has(q));
assert(intersection.length === 0, 'runner and sprinter target-quality sets are disjoint (categorically different)');

// Build athlete (no diagnosis) falls back to the goal primary — still coherent.
const build = deriveSessionSpecs({ priorityQualities: [], goalPrimary: 'hypertrophy', sessions: twoDays, level: 'intermediate' });
assert(build.every((s) => s.objective.targetQuality === 'hypertrophy'), 'build athlete → goal-primary objective');

// Deterministic.
const again = specsFor({ skbSport: 'running_long', experienceLevel: 'intermediate', sportSeason: 'in' }, twoDays, { level: 'intermediate', season: 'in' });
assert(JSON.stringify(again.specs) === JSON.stringify(runner.specs), 'deterministic');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node apps/mobile/tests/session-archetypes.js`
Expected: FAIL — `deriveSessionSpecs` module not found.

- [ ] **Step 3: Create the assembly module**

Create `packages/engine/src/lib/session/sessionSpecs.js`:

```js
/**
 * sessionSpecs — assembles the per-session D9 objective + D10 requirements for a week's sessions.
 * PARALLEL — read only by tests + the /dev readout; nothing in generatePlan consumes it.
 */
import { assignTargetQualities, deriveSessionObjective } from './sessionObjective.js';
import { deriveMovementRequirements } from './movementRequirements.js';

// Map a session's focus label (from allocator.focusLabel: "Lower","Upper","Push","Pull","Core","Full body")
// to a movement region.
export function regionOf(focusLabel = '') {
  const f = String(focusLabel).toLowerCase();
  if (/lower/.test(f)) return 'lower';
  if (/upper|push|pull/.test(f)) return 'upper';
  if (/core/.test(f)) return 'core';
  return 'full';
}

export function deriveSessionSpecs({
  priorityQualities = [], goalPrimary = null, sessions = [], level = 'intermediate',
  phaseIntent = 'base', deload = false, taper = false, season = null, contraindicatedPatterns = new Set(),
} = {}) {
  const list = Array.isArray(sessions) ? sessions : [];
  const targets = assignTargetQualities(priorityQualities, list.length, goalPrimary);
  return list.map((s, i) => {
    const targetQuality = targets[i] || targets[0];
    const region = regionOf(s && s.focus);
    return {
      objective: deriveSessionObjective({ targetQuality, region, phaseIntent, deload, taper, season }),
      requirements: deriveMovementRequirements({ targetQuality, region, level, contraindicatedPatterns }),
    };
  });
}

export default { deriveSessionSpecs, regionOf };
```

- [ ] **Step 4: Add the barrel exports**

In `packages/engine/index.js`, add after the `exerciseQualities` export line (from Sprint 5):

```js
export { deriveSessionSpecs, regionOf } from './src/lib/session/sessionSpecs.js';
export { deriveSessionObjective, assignTargetQualities, gymTrainableTargets } from './src/lib/session/sessionObjective.js';
export { deriveMovementRequirements, contraindicatedPatternsFrom } from './src/lib/session/movementRequirements.js';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node apps/mobile/tests/session-archetypes.js`
Expected: PASS — runner and sprinter categorically different; disjoint target-quality sets; determinism.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/lib/session/sessionSpecs.js packages/engine/index.js apps/mobile/tests/session-archetypes.js
git commit -m "feat(engine): assemble D9/D10 session specs + barrel; archetype test (Sprint 7)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Read-only `/dev` session-decisions panel

Surface the D9/D10 output for the current `/dev` athlete, read-only.

**Files:**
- Modify: `apps/mobile/src/screens/DevPlayground.jsx`

**Interfaces:**
- Consumes: `answersToAthleteModelInputs`, `localISODate` (`onboardingModel.js`), `derivePerformanceModel` (`performance/index.js`), `resolveProgram` (already imported), `getGymLevel` (`Utils.js`), `deriveSessionObjective`, `deriveMovementRequirements`, `gymTrainableTargets` (barrel, Task 4).
- Produces: no exported interface (a `/dev` panel only).

- [ ] **Step 1: Add imports**

In `apps/mobile/src/screens/DevPlayground.jsx`, after the existing engine imports (near the `exerciseQualities` import added in Sprint 5), add:

```js
import { answersToAthleteModelInputs, localISODate } from '../lib/onboardingModel.js';
import { derivePerformanceModel } from '@performance-os/engine/lib/performance/index.js';
import { getGymLevel } from '@performance-os/engine/lib/Utils.js';
import { deriveSessionObjective, deriveMovementRequirements, gymTrainableTargets } from '@performance-os/engine';
```

- [ ] **Step 2: Add the panel component**

In `apps/mobile/src/screens/DevPlayground.jsx`, add this component just above the `function PlanReview(` definition:

```jsx
// Sprint 7: read-only D9/D10 preview for the current athlete. Computes the diagnosis from the /dev
// answers, translates it to gym target qualities, and shows each one's objective + requirements.
// Read-only — it does not affect the generated plan.
function SessionDecisionsPanel({ answers, profile }) {
  if (!answers || !profile) return null;
  let pm = null;
  try { pm = derivePerformanceModel(answersToAthleteModelInputs(answers, localISODate()), localISODate()); } catch { pm = null; }
  const program = (() => { try { return resolveProgram(profile); } catch { return null; } })();
  const goalPrimary = ({ strength: 'maxStrength', bodybuilding: 'hypertrophy', functional: 'stability' })[program?.style] || 'maxStrength';
  const level = getGymLevel(profile);
  const season = program?.season || null;
  const targets = gymTrainableTargets(pm?.priorityAdaptations || [], goalPrimary);
  const priorityLabel = (pm?.priorityAdaptations || []).map((p) => p.qualityId).join(', ') || '(none — goal-driven)';

  return (
    <div style={card}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', opacity: 0.5, marginBottom: 10 }}>
        SESSION DECISIONS · D9 / D10 (parallel — does not change the plan)
      </div>
      <div style={{ fontSize: 12, color: 'var(--txt-muted)', marginBottom: 10 }}>
        Diagnosis priority: <span style={{ color: 'var(--txt-strong)' }}>{priorityLabel}</span> → gym targets:{' '}
        <span style={{ color: 'var(--moss)' }}>{targets.join(', ')}</span>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {targets.map((tq) => {
          const obj = deriveSessionObjective({ targetQuality: tq, region: 'full', phaseIntent: 'base', season });
          const req = deriveMovementRequirements({ targetQuality: tq, region: 'full', level, contraindicatedPatterns: new Set() });
          return (
            <div key={tq} style={{ border: '1px solid var(--hairline)', borderRadius: 10, padding: '8px 10px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-strong)' }}>{obj.purpose}</div>
              <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 3 }}>
                intensity: {obj.intensityZone} · fatigue budget: {obj.fatigueBudget.level}
              </div>
              {req && (
                <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 3 }}>
                  needs: {req.movementPatterns.join('/')} · {req.forceVelocity} · {req.contraction}
                  {req.competencyNote ? ` — ${req.competencyNote}` : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Render the panel inside PlanReview**

In `apps/mobile/src/screens/DevPlayground.jsx`, the `PlanReview` function signature is
`function PlanReview({ plan, profile }) {`. Change it to also accept `answers`:

```jsx
function PlanReview({ plan, profile, answers }) {
```

Then, immediately after the opening `<div>` inside `PlanReview`'s `return (` (before the `{plan.totalWeeks} weeks` summary div), insert:

```jsx
      <SessionDecisionsPanel answers={answers} profile={profile} />
```

And where `PlanReview` is rendered (the line `{plan && <div style={card}><PlanReview plan={plan} profile={profilePreview || {}} /></div>}`), pass `answers`:

```jsx
      {plan && <div style={card}><PlanReview plan={plan} profile={profilePreview || {}} answers={answers} /></div>}
```

- [ ] **Step 4: Verify in the browser (controller performs this)**

The controller will start the dev server, open `/dev`, apply the "Runner support · off" and "Strength (4d)" presets, generate a plan, and confirm the SESSION DECISIONS panel shows a diagnosis → gym targets → per-target objective + requirements, and that the generated plan itself is unchanged. Take a screenshot as proof.

Expected: the panel renders with sane objectives/requirements; no console errors; plan content unchanged.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/DevPlayground.jsx
git commit -m "feat(dev): read-only D9/D10 session-decisions panel (Sprint 7)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Parallel-proof (full suite + golden masters) and docs

Prove nothing live changed, then record the sprint in the living docs.

**Files:**
- Verify: `apps/mobile/tests/golden-master.js`, `apps/mobile/tests/athlete-adapter-golden-master.js` (must stay green, NO `UPDATE=1`)
- Modify: `docs/architecture/ATHLETE-MODEL.md` (new section)
- Modify: `HANDOFF.md` (advance the RESUME-HERE pointer to Sprint 8 + add a Latest-work entry)

**Interfaces:**
- Consumes: the full `npm test` suite.
- Produces: updated docs (no code interface).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — every `apps/mobile/tests/*.js` green, including `golden-master` and `athlete-adapter-golden-master` byte-identical (no drift). If either golden master drifts, STOP — the new modules leaked into `generatePlan`; find and remove the wiring. Do NOT run `UPDATE=1`.

- [ ] **Step 2: Add a section to `docs/architecture/ATHLETE-MODEL.md`**

After the existing `### 5.5 Exercise-quality knowledge layer (Sprint 5, PARALLEL)` section, add:

```markdown
### 5.6 Session decisions — D9 objective + D10 movement requirements (Sprint 7, PARALLEL)

`packages/engine/src/lib/session/` computes, per session, the **objective** (D9) and **movement/quality
requirements** (D10), driven by the diagnosis — as parallel model output nothing in `generatePlan`
reads. `sessionObjective.js` picks each session's gym target quality (passing gym-trainable priorities
through, and translating a cardio priority via `CARDIO_GYM_SUPPORT` in `data/qualityMovementMap.js` —
e.g. `aerobicCapacity → [robustness, reactiveStrength]`), then derives `{ purpose, targetQuality,
intensityZone (from the S5 `doseResponse`), fatigueBudget (from `fatigueCost`) }`. `movementRequirements.js`
turns the target quality into `{ movementPatterns, forceVelocity, contraction }` (from
`data/qualityMovementMap.js`), intersected with the session region, with **injury-contraindicated
patterns subtracted up front** (`contraindicatedPatternsFrom` maps the injury system's name-regexes onto
movement patterns) and a **novice's high-skill force-velocity downgraded to a strength base** (L4).
`sessionSpecs.js` assembles both per session; the barrel exposes `deriveSessionSpecs`.

**Validated by the EDS §22 archetypes** (`apps/mobile/tests/session-archetypes.js`): an in-season distance
runner and a novice sprinter — the *same sport* — produce **categorically different** (disjoint) target
qualities and requirements (the runner gets durability/economy and no chest work; the sprinter a
competency-gated strength base). Both golden masters stay byte-identical. Consumed next by **D11**
(Sprint 8, the allocator re-seat). Design/plan: `docs/superpowers/{specs,plans}/2026-07-02-session-objective-movement-requirements*`.
```

- [ ] **Step 3: Advance the `HANDOFF.md` pointer**

In `HANDOFF.md`, update the `## ▶ RESUME HERE` section's "THE NEXT STEP" wording so it notes Sprint 7
(D9/D10) is DONE and the next step is **Blueprint Sprint 8 (D11 — intervention selection re-seated)**,
the allocator re-seat where live plans change for the first time. Then add this entry at the top of the
Latest-work entries:

```markdown
## Latest work — Sprint 7: session objective (D9) + movement requirements (D10) (2026-07-02)

On branch **`feat/session-decisions-d9-d10`**. The diagnosis→plan chain gains its next two decisions,
as PARALLEL model output (nothing in `generatePlan` reads it; both golden masters byte-identical).
Design/plan: `docs/superpowers/{specs,plans}/2026-07-02-session-objective-movement-requirements*`.

- **New `packages/engine/src/lib/session/`** — `deriveSessionSpecs` (barrel) computes per session a D9
  objective (purpose + target quality + intensity zone + fatigue budget) and D10 movement requirements
  (patterns + force-velocity + contraction), driven by the diagnosis.
- **New `packages/engine/src/data/qualityMovementMap.js`** — the quality→movement knowledge + the
  cardio→gym-support translation (`aerobicCapacity → robustness + reactiveStrength`).
- **Contraindications up front** (L8): `contraindicatedPatternsFrom` maps injury name-regexes onto
  movement patterns; a novice's high-skill force-velocity is downgraded to a strength base (L4).
- **Validated by the EDS §22 archetypes**: in-season runner vs novice sprinter come out categorically
  different (disjoint targets). Read-only `/dev` "SESSION DECISIONS" panel shows the output.
- **PARALLEL** — full `npm test` green; both golden masters byte-identical (no `UPDATE=1`). Frozen set untouched.
- **Next:** Blueprint **Sprint 8 (D11)** — re-seat the allocator to select exercises that satisfy these
  requirements (the first sprint where live plans change).
```

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/ATHLETE-MODEL.md HANDOFF.md
git commit -m "docs: record Sprint 7 (D9/D10 session decisions); advance handoff to S8

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Quality→movement knowledge + cardio→gym-support + accessor → Task 1. ✓
- D9 (gym-trainable target resolution, round-robin, objective with 4 fields, build fallback, in-season) → Task 2. ✓
- D10 (region intersect, injury subtraction, competency FV-downgrade, name-regex→pattern mapping) → Task 3. ✓
- Assembly + `regionOf` + barrel → Task 4. ✓
- Headline archetype test (runner vs sprinter categorically different) → Task 4. ✓
- Read-only `/dev` readout → Task 5. ✓
- Parallel proof (golden masters byte-identical) + docs (ATHLETE-MODEL §5.6, HANDOFF → S8) → Task 6. ✓
- Frozen set + `generatePlan`/allocator/program/targets untouched → Global Constraints + no task edits them. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every command has an expected result. ✓

**Type consistency:** `deriveSessionObjective` returns `{purpose, targetQuality, intensityZone, fatigueBudget:{level,note}, rationale}` — identical across Task 2 (impl+test), Task 4 (assembly/test), Task 5 (/dev). `deriveMovementRequirements` returns `{movementPatterns, forceVelocity, contraction, contraindicated, competencyNote, rationale}` — identical across Task 3, 4, 5. `gymTrainableTargets`/`assignTargetQualities`/`deriveSessionSpecs`/`regionOf`/`contraindicatedPatternsFrom` names match between definition, tests, barrel, and consumers. Force-velocity values used in the map (`maximal-force, strength-speed, ballistic, controlled-hypertrophy, endurance, isometric, mobility`) are all in `FORCE_VELOCITY`. ✓
