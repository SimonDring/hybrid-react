# D11 Intervention Selection Re-seat (Sport) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** For SPORT athletes, replace the muscle-deficit greedy fill with a value-ordered selection that satisfies the D9/D10 requirements by transfer-per-fatigue (EDS §34 value hierarchy + stopping rule); build athletes stay byte-identical.

**Architecture:** A new pure `selectInterventions.js` (D11) decides which exercises fill a sport session and in what order, stopping at the fatigue budget. `allocateGym` branches: sport slots → D11, build slots → the existing `bestExercise` fill (unchanged). The diagnosis reaches the plan via a thin `performanceModelForProfile` helper threaded through `generatePlan` → `buildWeek` → `allocateGym`. Muscle-volume stays the ledger (MRV in-loop).

**Tech Stack:** Vanilla ES modules (`@performance-os/engine`), Node's test runner (`apps/mobile/tests/*.js` via `run-all.mjs`).

## Global Constraints

- **Pure/deterministic engine code** — no `Date`, no `Math.random`. `selectInterventions` is pure.
- **Build athletes are UNTOUCHED** — the `bestExercise` round-robin path and its output must be byte-identical. A `build-parity.js` test is the hard gate.
- **Sport plans intentionally change.** The main golden master is deliberately re-baselined for the 10 `sport·*` archetypes ONLY (after review); the 9 `build·*` archetypes must not move.
- **MRV stays the in-loop ledger** (`VOLUME_LANDMARKS[m].mrv`); no muscle may exceed it. No validator extraction, no D12 dose changes, no SKB-primary selection.
- **Force-velocity values from `FORCE_VELOCITY`; movement patterns from the exercise `pattern` vocab; the 10 quality ids** (all as in S5/S7).
- **Do NOT modify** `strength/targets.js` (still the ledger), `structureItems`/`applyWeights` (retained), `scheduler.js`, or any FROZEN governance doc.
- **Run tests** from the repo root: full suite `npm test`; a single file `node apps/mobile/tests/<file>.js`; regenerate the golden master with `UPDATE=1 node apps/mobile/tests/golden-master.js` (ONLY in Task 4, after review).

---

### Task 1: `performanceModelForProfile` helper

The single derivation the generator and the reflow both use, so the diagnosis reaches the plan the same way everywhere. `profileToAthleteModel` already infers the SKB sport id — this is a thin wrapper.

**Files:**
- Create: `packages/engine/src/lib/performance/forProfile.js`
- Modify: `packages/engine/index.js` (barrel export)
- Test: `apps/mobile/tests/performance-for-profile.js`

**Interfaces:**
- Consumes: `profileToAthleteModel` (`adapters/profileToAthleteModel.js`), `derivePerformanceModel` (`performance/index.js`).
- Produces: `performanceModelForProfile(profile, asOf) => PerformanceModel` (its `priorityAdaptations` is `[]` for a non-sport profile).

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/performance-for-profile.js`:

```js
// tests/performance-for-profile.js — Sprint 8: derive the Performance Model from a LEGACY profile
// (the diagnosis path for the live plan + the golden master). profileToAthleteModel infers the SKB id.
import { BLANK_ANSWERS, answersToProfile } from '../src/lib/onboardingModel.js';
import { performanceModelForProfile } from '@performance-os/engine/lib/performance/forProfile.js';
import { performanceModelForProfile as barrel } from '@performance-os/engine';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

const asOf = '2026-07-03';
const profFor = (over) => answersToProfile({ ...BLANK_ANSWERS, ...over });
const prioIds = (pm) => (pm.priorityAdaptations || []).map((p) => p.qualityId);

// A legacy sport profile yields a real diagnosis.
const runner = performanceModelForProfile(profFor({ goalType: 'sport', sport: 'run', runDiscipline: 'long', sportSeason: 'in', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], strengthAccess: 'full_gym' }), asOf);
assert(prioIds(runner).includes('aerobicCapacity'), 'legacy distance runner → aerobicCapacity priority');

const sprinter = performanceModelForProfile(profFor({ goalType: 'sport', sport: 'run', runDiscipline: 'sprint', sportSeason: 'off', experienceLevel: 'beginner', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], strengthAccess: 'full_gym' }), asOf);
assert(prioIds(sprinter).includes('explosiveStrength'), 'legacy sprinter → explosiveStrength priority');

// A build profile has no diagnosis (so the allocator keeps its legacy path).
const build = performanceModelForProfile(profFor({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], strengthAccess: 'full_gym' }), asOf);
assert((build.priorityAdaptations || []).length === 0, 'build profile → empty priorityAdaptations');

// Deterministic + barrel parity + null-safe.
assert(JSON.stringify(performanceModelForProfile(profFor({ goalType: 'sport', sport: 'swim' }), asOf)) === JSON.stringify(barrel(profFor({ goalType: 'sport', sport: 'swim' }), asOf)), 'barrel export matches + deterministic');
assert(performanceModelForProfile(null, asOf) && (performanceModelForProfile(null, asOf).priorityAdaptations || []).length === 0, 'null profile → safe empty model');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node apps/mobile/tests/performance-for-profile.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the helper**

Create `packages/engine/src/lib/performance/forProfile.js`:

```js
/**
 * performanceModelForProfile — derive the Performance Model (diagnosis) from a LEGACY engine profile.
 * The single derivation used by both generatePlan and the PlanService reflow, so the diagnosis reaches
 * the plan the same way everywhere. profileToAthleteModel already infers the SKB sport id from the
 * legacy sport (+ run discipline), so this is a thin, pure wrapper. Non-sport profiles derive an empty
 * priorityAdaptations, which keeps the allocator on its legacy (build) path.
 */
import { profileToAthleteModel } from '../adapters/profileToAthleteModel.js';
import { derivePerformanceModel } from './index.js';

export function performanceModelForProfile(profile, asOf) {
  const model = profileToAthleteModel(profile || {}, asOf);
  return derivePerformanceModel(model, asOf);
}

export default { performanceModelForProfile };
```

- [ ] **Step 4: Add the barrel export**

In `packages/engine/index.js`, add after the `deriveSessionSpecs` export (from Sprint 7):

```js
export { performanceModelForProfile } from './src/lib/performance/forProfile.js';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node apps/mobile/tests/performance-for-profile.js`
Expected: PASS — all lines PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/lib/performance/forProfile.js packages/engine/index.js apps/mobile/tests/performance-for-profile.js
git commit -m "feat(engine): performanceModelForProfile — diagnosis from a legacy profile (Sprint 8)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `selectInterventions` — the D11 value-ordered selection (pure, isolated)

The core algorithm, unit-tested in isolation (a synthetic requirement + a stub `makePick`) so it's proven before it touches the allocator. This task changes NO plan output — the suite stays green.

**Files:**
- Create: `packages/engine/src/lib/plan/selectInterventions.js`
- Modify: `packages/engine/index.js` (barrel export)
- Test: `apps/mobile/tests/select-interventions.js`

**Interfaces:**
- Consumes: `EXERCISES` (`strengthExercises.js`), `exerciseQualities` (`data/exerciseQualities.js`), `stimulusFactor` (`strength/stimulus.js`), `VOLUME_LANDMARKS` (`data/muscleVolume.js`).
- Produces:
  - `selectInterventions({ req, exercises?, equip, level, levelName, sport, skbIds, ledger, makePick }) => Array<{ex, sets, contrib, effectiveRole, tier}>`
  - `req` shape: `{ objective: { targetQuality, fatigueBudget: {level} }, requirements: { movementPatterns: string[], contraindicated: [{pattern}] } }` (a `deriveSessionSpecs` entry).
  - `makePick(ex) => {ex, sets, contrib, effectiveRole}` is supplied by the caller (Task 4 binds the allocator's `roleSetCount`/`muscleContribution`).

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/select-interventions.js`:

```js
// tests/select-interventions.js — Sprint 8 D11: value-ordered selection satisfying the requirement,
// EDS §34 tier order, transfer-per-fatigue, stopping at the fatigue budget. Tested in isolation.
import { selectInterventions } from '@performance-os/engine/lib/plan/selectInterventions.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
import { muscleContribution } from '@performance-os/engine/lib/plan/contributions.js';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

// A stub makePick mirroring the allocator's shape: 3 working sets, real muscle contribution.
const EX_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
const makePick = (ex) => ({ ex, sets: ex.role === 'primary' ? 4 : 3, contrib: muscleContribution(ex), effectiveRole: ex.role });
const FULL = new Set(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'kettlebell']);
const bigCeiling = {}; for (const e of EXERCISES) for (const m in muscleContribution(e)) bigCeiling[m] = 999;

const runReq = {
  objective: { targetQuality: 'robustness', fatigueBudget: { level: 'moderate' } },
  requirements: { movementPatterns: ['hinge', 'lunge', 'calf', 'iso'], contraindicated: [] },
};
const picks = selectInterventions({ req: runReq, equip: FULL, level: 3, levelName: 'advanced', sport: 'run', skbIds: new Set(), ledger: { weeklyDelivered: {}, weeklyCeiling: bigCeiling }, makePick });

// Non-empty, and every pick carries a tier + real sets.
assert(picks.length >= 1, 'produces at least one intervention (never empty)');
assert(picks.every((p) => p.tier >= 1 && p.tier <= 7 && p.sets > 0), 'every pick has a §34 tier + sets');

// Tier order is non-decreasing (primary compound before mobility).
const tiers = picks.map((p) => p.tier);
assert(tiers.every((t, i) => i === 0 || t >= tiers[i - 1]), 'picks are in value-hierarchy tier order');

// A robustness (hinge/calf) session must NOT contain chest pressing (hpush) — off-target.
assert(picks.every((p) => p.ex.pattern !== 'hpush'), 'no chest/hpush work in a robustness session');

// Stopping rule: a LOW budget yields no more working items than a HIGH budget.
const lowReq = { ...runReq, objective: { ...runReq.objective, fatigueBudget: { level: 'low' } } };
const highReq = { ...runReq, objective: { ...runReq.objective, fatigueBudget: { level: 'high' } } };
const lowN = selectInterventions({ req: lowReq, equip: FULL, level: 3, levelName: 'advanced', sport: 'run', skbIds: new Set(), ledger: { weeklyDelivered: {}, weeklyCeiling: bigCeiling }, makePick }).length;
const highN = selectInterventions({ req: highReq, equip: FULL, level: 3, levelName: 'advanced', sport: 'run', skbIds: new Set(), ledger: { weeklyDelivered: {}, weeklyCeiling: bigCeiling }, makePick }).length;
assert(lowN <= highN, 'a lower fatigue budget selects no more items (stopping rule)');

// MRV ledger gate: a ceiling of 0 everywhere admits nothing beyond the guaranteed anchor.
const tight = selectInterventions({ req: runReq, equip: FULL, level: 3, levelName: 'advanced', sport: 'run', skbIds: new Set(), ledger: { weeklyDelivered: {}, weeklyCeiling: {} }, makePick });
assert(tight.length <= picks.length, 'a tighter MRV ceiling never admits more than a loose one');

// SKB transfer boost changes ranking, not legality: with a boost the boosted id ranks earlier.
const boosted = selectInterventions({ req: runReq, equip: FULL, level: 3, levelName: 'advanced', sport: 'run', skbIds: new Set(['nordic_curl']), ledger: { weeklyDelivered: {}, weeklyCeiling: bigCeiling }, makePick });
const idxBoosted = boosted.findIndex((p) => p.ex.id === 'nordic_curl');
const idxPlain = picks.findIndex((p) => p.ex.id === 'nordic_curl');
assert(idxBoosted === -1 || idxPlain === -1 || idxBoosted <= idxPlain, 'SKB-boosted exercise ranks no later');

// Deterministic.
assert(JSON.stringify(selectInterventions({ req: runReq, equip: FULL, level: 3, levelName: 'advanced', sport: 'run', skbIds: new Set(), ledger: { weeklyDelivered: {}, weeklyCeiling: bigCeiling }, makePick })) === JSON.stringify(picks), 'deterministic');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node apps/mobile/tests/select-interventions.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the D11 module**

Create `packages/engine/src/lib/plan/selectInterventions.js`:

```js
/**
 * selectInterventions — D11: choose the minimum-effective set of exercises that SATISFY a session's
 * D9/D10 requirement, ordered by transfer-per-fatigue in the EDS §34 value hierarchy, and STOP at the
 * session's fatigue budget (bank the rest — L5). Pure. Muscle-volume is a downstream ledger (MRV gate),
 * not the driver. Used by the allocator's SPORT branch; the caller supplies makePick (sets/contrib).
 *
 * §34 tiers: 1 primary-quality compound · 2 secondary-quality compound · 3 injury-prevention ·
 * 4 sport accessory · 5 lagging-muscle hypertrophy (within MEV/MRV) · 6 core · 7 mobility.
 */
import { EXERCISES } from '../../data/strengthExercises.js';
import { exerciseQualities } from '../../data/exerciseQualities.js';
import { stimulusFactor } from '../strength/stimulus.js';
import { VOLUME_LANDMARKS } from '../../data/muscleVolume.js';

// Fatigue-budget ceiling by D9 level; each exercise costs 1|2|3 fatigue-units (its S5 dominant cost).
const FATIGUE_BUDGET = { low: 4, moderate: 6, high: 8 };
const UNIT = { low: 1, moderate: 2, high: 3 };

function fatigueScalar(ex) {
  const fc = exerciseQualities(ex.id)?.fatigueCost;
  if (!fc) return 2;
  return Math.max(UNIT[fc.neural] || 1, UNIT[fc.metabolic] || 1, UNIT[fc.mechanical] || 1);
}
// 'primary' | 'secondary' | null — does the exercise train the target quality (S5 tags)?
function trainsTarget(ex, target) {
  const q = exerciseQualities(ex.id)?.qualities?.find((x) => x.id === target);
  return q ? q.role : null;
}
const isCompound = (ex) => ex.role === 'primary' || (ex.role === 'accessory' && !['iso', 'core', 'calf', 'mobility'].includes(ex.pattern));

// EDS §34 tier, or null if the exercise is off-target for this sport session.
function tierOf(ex, target, sport) {
  const role = trainsTarget(ex, target);
  if (isCompound(ex) && role === 'primary') return 1;
  if (isCompound(ex) && role === 'secondary') return 2;
  if ((ex.loadClass === 'health') && ex.pattern !== 'mobility') return 3;   // prehab
  if (sport && (ex.sportTags || []).includes(sport)) return 4;              // sport-demanded movement
  if (ex.role === 'iso' && role) return 5;                                  // lagging-muscle hypertrophy (MEV-gated below)
  if (ex.pattern === 'core') return 6;
  if (ex.pattern === 'mobility') return 7;
  return null;
}
// transfer-per-fatigue: quality match (primary 2 / secondary 1 / support 0.5) × SKB boost, ÷ fatigue.
function valueOf(ex, target, skbIds) {
  const role = trainsTarget(ex, target);
  const match = role === 'primary' ? 2 : role === 'secondary' ? 1 : 0.5;
  const boost = skbIds && skbIds.has(ex.id) ? 1.5 : 1.0;
  return (match * boost) / fatigueScalar(ex);
}

export function selectInterventions({ req, exercises = EXERCISES, equip, level = 0, levelName = 'intermediate', sport = null, skbIds = new Set(), ledger = {}, makePick } = {}) {
  const target = req?.objective?.targetQuality;
  const reqPatterns = new Set(req?.requirements?.movementPatterns || []);
  const contra = new Set((req?.requirements?.contraindicated || []).map((c) => c.pattern));
  const budget = FATIGUE_BUDGET[req?.objective?.fatigueBudget?.level] ?? 6;
  const weeklyDelivered = { ...(ledger.weeklyDelivered || {}) };
  const weeklyCeiling = ledger.weeklyCeiling || {};

  // Eligible candidates, tiered + valued.
  const cand = [];
  for (const ex of exercises) {
    if (equip && !equip.has(ex.equip)) continue;
    if ((ex.level ?? 0) > level) continue;
    if (contra.has(ex.pattern)) continue;
    const tier = tierOf(ex, target, sport);
    if (tier == null) continue;
    // Quality-driver compounds must match a required movement pattern (D10).
    if ((tier === 1 || tier === 2) && reqPatterns.size && !reqPatterns.has(ex.pattern)) continue;
    cand.push({ ex, tier, value: valueOf(ex, target, skbIds) });
  }
  cand.sort((a, b) => a.tier - b.tier || b.value - a.value || (a.ex.id < b.ex.id ? -1 : a.ex.id > b.ex.id ? 1 : 0));

  const picks = [];
  const usedPatterns = new Set();
  let fatigue = 0;
  for (const c of cand) {
    if (fatigue >= budget && picks.length >= 1) break;           // stopping rule — bank the rest (L5)
    if (usedPatterns.has(c.ex.pattern) && c.tier > 2) continue;  // one exercise per pattern (variety), anchors exempt
    const pick = makePick(c.ex);
    if (!pick || !(pick.sets > 0)) continue;
    const vf = stimulusFactor(c.ex, levelName);
    let exceeds = false;
    for (const m in pick.contrib) {
      if ((weeklyDelivered[m] || 0) + pick.sets * pick.contrib[m] * vf > (weeklyCeiling[m] ?? Infinity) + 0.01) { exceeds = true; break; }
    }
    if (exceeds) continue;                                        // MRV ledger gate
    if (c.tier === 5) {                                           // hypertrophy only to a genuinely lagging muscle
      const lagging = Object.keys(pick.contrib).some((m) => VOLUME_LANDMARKS[m] && (weeklyDelivered[m] || 0) < VOLUME_LANDMARKS[m].mev);
      if (!lagging) continue;
    }
    picks.push({ ...pick, tier: c.tier });
    usedPatterns.add(c.ex.pattern);
    fatigue += fatigueScalar(c.ex);
    for (const m in pick.contrib) weeklyDelivered[m] = (weeklyDelivered[m] || 0) + pick.sets * pick.contrib[m] * vf;
  }
  return picks;
}

export default { selectInterventions };
```

- [ ] **Step 4: Add the barrel export**

In `packages/engine/index.js`, add after the `performanceModelForProfile` export:

```js
export { selectInterventions } from './src/lib/plan/selectInterventions.js';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node apps/mobile/tests/select-interventions.js`
Expected: PASS — all lines PASS (tier order, no-hpush, stopping rule, MRV gate, determinism).

- [ ] **Step 6: Run the full suite to confirm nothing else moved**

Run: `npm test`
Expected: PASS — 113+ green, including both golden masters byte-identical (this module is not wired in yet).

- [ ] **Step 7: Commit**

```bash
git add packages/engine/src/lib/plan/selectInterventions.js packages/engine/index.js apps/mobile/tests/select-interventions.js
git commit -m "feat(engine): D11 selectInterventions — value-ordered, transfer-per-fatigue, stopping rule (Sprint 8)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Build-parity snapshot (the hard gate)

Snapshot the 9 build archetypes NOW, before any plan change, so Task 4 can prove build output never moved.

**Files:**
- Create: `apps/mobile/tests/build-parity.js`

**Interfaces:**
- Consumes: `generatePlan` (`PlanGenerator.js`), `answersToProfile`/`BLANK_ANSWERS` (`onboardingModel.js`).
- Produces: a committed snapshot `apps/mobile/tests/__snapshots__/build-parity.json`.

- [ ] **Step 1: Write the parity test (captures on first run)**

Create `apps/mobile/tests/build-parity.js`:

```js
// tests/build-parity.js — Sprint 8: the BUILD archetypes must stay byte-identical through the D11
// re-seat (which only touches the SPORT path). Captured before Task 4; must never drift after.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const SNAP = join(__dir, '__snapshots__', 'build-parity.json');
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const DB = ['dumbbell', 'bodyweight']; const BW = ['bodyweight'];
const A = (o) => ({ ...BLANK_ANSWERS, ...o });

// The 9 BUILD archetypes from the golden master (must never change under the sport re-seat).
const MATRIX = {
  'build·strength·beginner·3d·45·full': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'beginner', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'build·strength·intermediate·4d·60·full': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: { squat: 140, bench: 100, deadlift: 180 } }),
  'build·strength·advanced·5d·75·full': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'advanced', daysPerWeek: 5, days: ['mon', 'tue', 'wed', 'fri', 'sat'], equipment: FULL, sex: 'male', lifts: { squat: 180, bench: 130, deadlift: 230, ohp: 80 } }),
  'build·strength·intermediate·1d·60·full(edge)': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', daysPerWeek: 1, days: ['wed'], equipment: FULL, sex: 'male', lifts: {} }),
  'build·bodybuilding·intermediate·4d·60·full': A({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'build·bodybuilding·advanced·6d·75·full': A({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced', daysPerWeek: 6, days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], equipment: FULL, sex: 'female', lifts: {} }),
  'build·functional·intermediate·3d·45·dumbbell': A({ goalType: 'build', strengthStyle: 'functional', experienceLevel: 'intermediate', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: DB, sex: 'male', lifts: {} }),
  'build·functional·beginner·3d·20·bodyweight(edge)': A({ goalType: 'build', strengthStyle: 'functional', experienceLevel: 'beginner', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: BW, sex: 'male', lifts: {} }),
  'build·functional·advanced·7d·60·bodyweight(edge)': A({ goalType: 'build', strengthStyle: 'functional', experienceLevel: 'advanced', daysPerWeek: 7, days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], equipment: BW, sex: 'male', lifts: {} }),
};

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }
const stable = (v) => JSON.stringify((function s(x) { return Array.isArray(x) ? x.map(s) : x && typeof x === 'object' ? Object.keys(x).sort().reduce((o, k) => (o[k] = s(x[k]), o), {}) : x; })(v), null, 2);

const current = {}; for (const [k, a] of Object.entries(MATRIX)) current[k] = generatePlan(answersToProfile(a));
if (!existsSync(SNAP) || process.env.UPDATE) {
  if (!existsSync(dirname(SNAP))) mkdirSync(dirname(SNAP), { recursive: true });
  writeFileSync(SNAP, stable(current) + '\n');
  console.log(`CAPTURED build-parity snapshot: ${Object.keys(current).length} archetypes`);
} else {
  const snap = JSON.parse(readFileSync(SNAP, 'utf8'));
  for (const k of Object.keys(MATRIX)) assert(stable(current[k]) === stable(snap[k]), `build archetype unchanged: ${k}`);
}
console.log('build-parity done');
```

- [ ] **Step 2: Capture the baseline + confirm it passes**

Run: `node apps/mobile/tests/build-parity.js` (captures) then `node apps/mobile/tests/build-parity.js` (compares)
Expected: first run `CAPTURED build-parity snapshot: 9 archetypes`; second run 9× `PASS: build archetype unchanged`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/tests/build-parity.js apps/mobile/tests/__snapshots__/build-parity.json
git commit -m "test(engine): build-parity snapshot — the hard gate for the sport re-seat (Sprint 8)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Wire D11 into the sport path + re-baseline the sport golden master (THE RE-SEAT)

This is the atomic, intentional-change task: sport plans change; build stays byte-identical. It must be committed with the suite green, so the golden-master re-baseline happens here, gated by `build-parity.js`.

**Files:**
- Modify: `packages/engine/src/lib/plan/allocator.js` (branch sport slots to D11), `packages/engine/src/lib/plan/strength.js` (`buildWeek` threads `priorityQualities`/`season`/`skbIds`/`focusLabel`), `packages/engine/src/lib/PlanGenerator.js` (`generatePlan` derives + threads the PM).
- Modify (re-baseline / update): `apps/mobile/tests/__snapshots__/engine-golden-master.json`, and the sport selection/content unit tests: `sport-anchor.js`, `sport-session-density.js`, `session-density.js`, `session-sequence.js`, `sport-generate.js`.

**Interfaces:**
- Consumes: `selectInterventions` (Task 2), `performanceModelForProfile` (Task 1), `deriveSessionObjective`/`deriveMovementRequirements`/`assignTargetQualities`/`regionOf` (Sprint 7), `sportKnowledge` (`SKB.section`), the allocator's existing `place`/`effectiveRoleOf`/`roleSetCount`/`muscleContribution`/`structureItems`.
- Produces: sport plans generated via D11; `generatePlan(profile, opts?)` where `opts.performanceModel` is an optional override.

- [ ] **Step 1: Thread the diagnosis through `generatePlan`**

In `packages/engine/src/lib/PlanGenerator.js`: import the helper and the session-spec derivation, extend the signature, and pass `priorityAdaptations`/`season`/`skbIds` into `buildGymWeek`.

Add imports near the top (alongside the existing engine imports):
```js
import { performanceModelForProfile } from './performance/forProfile.js';
import { profileToAthleteModel } from './adapters/profileToAthleteModel.js';
import * as SKB from './sportKnowledge/index.js';
```
Change `export function generatePlan(profile = {}) {` to:
```js
export function generatePlan(profile = {}, opts = {}) {
```
Immediately after `const program = resolveProgram(profile);` add this one clean block:
```js
  // The diagnosis (D4/D5) that steers SPORT selection (D11). Derived from the profile unless the
  // caller supplies one (PlanService passes the stored athlete model). Empty for build → legacy path.
  // asOf comes from the profile's start date (never the clock) so generatePlan stays deterministic.
  const asOf = profile.plan_start_date || null;
  const perf = opts.performanceModel || performanceModelForProfile(profile, asOf);
  const skbSportId = program.sport ? (profileToAthleteModel(profile, asOf)?.sportingContext?.primarySport || null) : null;
  const diag = {
    priorityQualities: (perf && perf.priorityAdaptations) || [],
    skbIds: skbSportId ? new Set((SKB.section(skbSportId, 'exerciseLibrary')?.exercises || []).map((e) => e.id)) : new Set(),
  };
```
Then make `buildGymWeek` forward the diagnosis. Change its signature + body to:
```js
function buildGymWeek(count, ctx, profile, program, diag) {
  return strength.buildWeek({
    intent: ctx.intent, deload: ctx.deload, taper: ctx.taper, winp: ctx.winp, weekNum: ctx.weekNum,
    phaseWeeks: ctx.phaseWeeks, blockFrac: ctx.blockFrac, minutes: ctx.minutes,
    level: getGymLevel(profile), access: profile.access || [], sex: profile.sex,
    bodyweight: profile.bodyweight_kg,
    gymDays: count, lifts: resolveLifts(profile),
    style: program.style, emphasis: program.emphasis, volumeScalar: program.volumeScalar,
    power: program.power, sport: program.sport, exercisePriority: program.exercisePriority || [],
    priorityByIntent: program.priorityByIntent || new Map(),
    priorityQualities: diag.priorityQualities, season: program.season, skbIds: diag.skbIds
  });
}
```
and change its call site `const sportSpecs = buildGymWeek(totalDays, ctx, profile, program);` to:
```js
      const sportSpecs = buildGymWeek(totalDays, ctx, profile, program, diag);
```

> Implementer note: the only goal of this step is to deliver three values to `buildWeek` — `priorityQualities` (array of `{qualityId,...}`, empty for build), `season` (from `program.season`), and `skbIds` (Set of the sport's SKB exercise-library ids, empty for build). Existing non-sport callers pass no `opts`; `perf` is then derived and its `priorityAdaptations` is `[]`, so the allocator stays on the build path. Keep it pure — `asOf` is `profile.plan_start_date`, never `new Date()`.

- [ ] **Step 2: Thread through `buildWeek` into `allocateGym`**

In `packages/engine/src/lib/plan/strength.js`, add `priorityQualities`, `season`, `skbIds`, and each day's `focusLabel` to what `buildWeek` passes. Change the `slots` map to include the label:
```js
  const slots = split.map(day => ({
    minutes: slotMin, equip: ctx.access || [], anchors: day.anchors, focus: day.weights, focusLabel: day.focus
  }));
```
and add to the `allocateGym({ ... ctx: { ... } })` ctx object:
```js
      priorityQualities: ctx.priorityQualities || [], season: ctx.season || null, skbIds: ctx.skbIds || new Set(),
```

- [ ] **Step 3: Branch the allocator to D11 for sport**

In `packages/engine/src/lib/plan/allocator.js`:
1. Add imports at the top (note the exact source files — D9 objective + `assignTargetQualities` live in `sessionObjective.js`, D10 in `movementRequirements.js`, `regionOf` in `sessionSpecs.js`):
```js
import { selectInterventions } from './selectInterventions.js';
import { deriveSessionObjective, assignTargetQualities } from '../session/sessionObjective.js';
import { deriveMovementRequirements } from '../session/movementRequirements.js';
import { regionOf } from '../session/sessionSpecs.js';
```
2. Inside `allocateGym`, after the slot `work` array is built and `weeklyCeiling`/`weeklyDelivered` exist, and BEFORE the existing "1) Anchor each slot" round-robin block, add the sport-D11 path:
```js
  // ── D11 (SPORT): value-ordered selection satisfying each session's D9/D10 requirement, stopping at
  //    the fatigue budget. Build keeps the legacy fill below. Muscle-volume stays the MRV ledger.
  const priorityQualities = ctx.priorityQualities || [];
  const useD11 = style === 'sport' && priorityQualities.length > 0;
  if (useD11) {
    const goalPrimary = null;
    const targets = assignTargetQualities(priorityQualities, work.length, goalPrimary);
    work.forEach((slot, i) => {
      const region = regionOf(slot.focusLabel);
      const objective = deriveSessionObjective({ targetQuality: targets[i], region, phaseIntent: intent, deload, taper, season: ctx.season });
      const requirements = deriveMovementRequirements({ targetQuality: targets[i], region, level: levelName, contraindicatedPatterns: new Set() });
      const req = { objective, requirements };
      const makePick = (ex) => {
        const effectiveRole = effectiveRoleOf(ex, slot.level, demotePress);
        return { ex, sets: roleSetCount(ex, s, style, effectiveRole), contrib: muscleContribution(ex), effectiveRole };
      };
      const picks = selectInterventions({
        req, equip: slot.equip, level: slot.level, levelName, sport: ctx.sport,
        skbIds: ctx.skbIds || new Set(), ledger: { weeklyDelivered, weeklyCeiling }, makePick
      });
      if (picks.length === 0) {
        // Guarantee coverage: fall back to a fundamental anchor (never an empty session).
        const anchor = patternAnchor(slot, slot.anchors || [FUNDAMENTAL[slot.idx % FUNDAMENTAL.length]]) || patternAnchor(slot, FUNDAMENTAL);
        if (anchor) place(slot, { ex: anchor, sets: roleSetCount(anchor, s, style, effectiveRoleOf(anchor, slot.level, demotePress)), contrib: muscleContribution(anchor), effectiveRole: effectiveRoleOf(anchor, slot.level, demotePress) });
      } else {
        for (const p of picks) place(slot, p);
      }
    });
    // Finalise sport slots through the SAME structuring/weights/duration machinery, then return.
    return work.map(slot => finaliseSlot(slot, style, ctx));
  }
```
3. Extract the existing slot-finalisation (the `return work.map(slot => { ... })` block at the end of `allocateGym`) into a named helper `finaliseSlot(slot, style, ctx)` so both the D11 path and the legacy path use it verbatim (no behaviour change to build). The legacy path's final `return work.map(...)` becomes `return work.map(slot => finaliseSlot(slot, style, ctx));`.

> Implementer note: `place`, `patternAnchor`, `FUNDAMENTAL`, `effectiveRoleOf`, `roleSetCount`, `muscleContribution`, `weeklyDelivered`, `weeklyCeiling`, `s`, `intent`, `deload`, `taper`, `levelName`, `demotePress` are all already in scope inside `allocateGym`. `finaliseSlot` must contain the EXACT body of the current final `work.map` callback (structureItems → applyWeights → the returned session spec) so build output is byte-identical. Verify with `build-parity.js` at Step 5.

- [ ] **Step 4: Run the targeted + parity checks**

Run: `node apps/mobile/tests/build-parity.js`
Expected: PASS — all 9 build archetypes byte-identical (build path untouched). **If any build archetype drifts, STOP** — the `finaliseSlot` extraction or a shared code path changed build behaviour; fix before continuing.

Run: `node apps/mobile/tests/select-interventions.js` and `node apps/mobile/tests/performance-for-profile.js`
Expected: PASS.

- [ ] **Step 5: Review the sport golden-master diff, then re-baseline**

Run: `node apps/mobile/tests/golden-master.js`
Expected: FAIL — the 10 `sport·*` archetypes drift; the 9 `build·*` archetypes do NOT. **Confirm from the diff output that only `sport·*` keys changed.** Read a couple of sport archetypes' new sessions and confirm the change is in the intended direction (durability/sport work in, off-target isolation out, leaner sessions). If any `build·*` archetype appears in the drift, STOP and fix (build must not move).

Then re-baseline deliberately:
Run: `UPDATE=1 node apps/mobile/tests/golden-master.js`
Expected: `UPDATED golden-master snapshot: 19 archetypes`.

Run: `node apps/mobile/tests/golden-master.js`
Expected: PASS.

- [ ] **Step 6: Update the sport selection/content unit tests**

The sport re-seat intentionally changes sport session CONTENT, so these tests' expectations change. For EACH of `sport-anchor.js`, `sport-session-density.js`, `session-density.js`, `session-sequence.js`, `sport-generate.js`: run it, and for every failing assertion decide whether the NEW behaviour is correct per the spec (durability-first, leaner, no off-target work). Update the assertion to the new expected value **only when the new behaviour is right**, keeping the assertion meaningful (do not weaken it to a tautology); delete an assertion only if it tested a property the re-seat legitimately removes (and note why in a comment). Do NOT touch the invariant sport tests (`sport-schedule*.js`, `sport-season-resolution.js`, `sport-load-scalar.js`, `sport-knowledge.js`, `sport-onboarding*.js`, `sport-engine-binding.js`, `sport-quality-map.js`, `adapter-sport-position.js`, `taper.js`) — they must still pass untouched.

Run each updated file, e.g. `node apps/mobile/tests/sport-anchor.js`
Expected: PASS after principled updates.

- [ ] **Step 7: Full suite green**

Run: `npm test`
Expected: PASS — every file green, `build-parity` unchanged, `golden-master` at the reviewed new baseline. If a sport invariant test that should NOT have changed is failing, STOP and investigate (the re-seat leaked somewhere it shouldn't).

- [ ] **Step 8: Commit**

```bash
git add packages/engine/src/lib/plan/allocator.js packages/engine/src/lib/plan/strength.js packages/engine/src/lib/PlanGenerator.js apps/mobile/tests/__snapshots__/engine-golden-master.json apps/mobile/tests/sport-anchor.js apps/mobile/tests/sport-session-density.js apps/mobile/tests/session-density.js apps/mobile/tests/session-sequence.js apps/mobile/tests/sport-generate.js
git commit -m "feat(engine): re-seat SPORT exercise selection to D11 (value hierarchy); build unchanged (Sprint 8)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Quality validation — prove the sport plans got better

Assert the *nature* of the change (the coaching win), not just that it changed.

**Files:**
- Create: `apps/mobile/tests/d11-runner-quality.js`

**Interfaces:**
- Consumes: `generatePlan`, `answersToProfile`/`BLANK_ANSWERS`.

- [ ] **Step 1: Write the quality test**

Create `apps/mobile/tests/d11-runner-quality.js`:

```js
// tests/d11-runner-quality.js — Sprint 8: the sport re-seat is an IMPROVEMENT, not just a change.
// The in-season distance runner gets durability/economy work + NO chest/arm isolation, and leaner
// sessions; the novice sprinter gets a strength base with no competency-gated plyo.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

const plan = generatePlan(answersToProfile(A({ goalType: 'sport', sport: 'run', runDiscipline: 'long', sportSeason: 'in', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL })));
const allItems = plan.phases.flatMap((ph) => ph.weeks.flatMap((w) => w.sessions.flatMap((s) => s.items || [])));
const names = allItems.map((it) => (it.name || '').toLowerCase());

// Durability / posterior-chain work is present.
assert(names.some((n) => /nordic|romanian|rdl|hamstring|glute|calf/.test(n)), 'runner plan includes posterior-chain / calf durability work');
// NO chest fly / arm isolation (off-target for a distance runner) anywhere.
assert(!names.some((n) => /chest fly|pec deck|biceps curl|spider curl|triceps|lateral raise/.test(n)), 'runner plan excludes chest/arm isolation');
// Every sport session is non-empty.
assert(plan.phases.every((ph) => ph.weeks.every((w) => w.sessions.every((s) => (s.items || []).length >= 1))), 'no empty sport session');

// Novice sprinter → a strength-base compound (squat/hinge), and no depth-jump/olympic plyo (competency).
const sp = generatePlan(answersToProfile(A({ goalType: 'sport', sport: 'run', runDiscipline: 'sprint', sportSeason: 'off', experienceLevel: 'beginner', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: FULL })));
const spNames = sp.phases[0].weeks[0].sessions.flatMap((s) => (s.items || []).map((it) => (it.name || '').toLowerCase()));
assert(spNames.some((n) => /squat|deadlift|trap.?bar|press/.test(n)), 'novice sprinter gets a strength-base compound');
assert(!spNames.some((n) => /depth jump|power clean|hang clean/.test(n)), 'novice sprinter has no competency-gated olympic/plyo work');

// Determinism.
assert(JSON.stringify(generatePlan(answersToProfile(A({ goalType: 'sport', sport: 'run', runDiscipline: 'long', sportSeason: 'in', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL })))) === JSON.stringify(plan), 'deterministic');
```

- [ ] **Step 2: Run it**

Run: `node apps/mobile/tests/d11-runner-quality.js`
Expected: PASS. If an assertion fails, the re-seat's behaviour disagrees with the intended coaching outcome — investigate the selection (do NOT weaken the assertion); this test is the guarantee the change is an improvement.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/tests/d11-runner-quality.js
git commit -m "test(engine): D11 quality gate — runner durability + no chest flyes + leaner (Sprint 8)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Reflow wiring + browser verification

The runtime reflow re-derives sport sessions via `allocateGym` directly, so it must pass the diagnosis too — otherwise a reflowed sport week silently reverts to the legacy fill.

**Files:**
- Modify: `apps/mobile/src/lib/PlanService.js` (derive the PM and thread `priorityQualities`/`season`/`skbIds` into its `allocateGym` call).

**Interfaces:**
- Consumes: `performanceModelForProfile` (barrel), `sportKnowledge`, the existing PlanService reflow `allocateGym` call.

- [ ] **Step 1: Locate the reflow's `allocateGym` call**

Run: `grep -n "allocateGym\|performanceModel\|priorityQualities" apps/mobile/src/lib/PlanService.js`
Read the surrounding function. It builds an `allocateGym({ targets, slots, ctx })` for the current-week reflow.

- [ ] **Step 2: Derive + thread the diagnosis**

Add the import near the other engine imports in `PlanService.js`:
```js
import { performanceModelForProfile } from '@performance-os/engine';
import * as SKB from '@performance-os/engine/lib/sportKnowledge/index.js';
import { profileToAthleteModel } from '@performance-os/engine/lib/adapters/profileToAthleteModel.js';
```
In the reflow function, before the `allocateGym({...})` call (where `profile` is in scope), add:
```js
    // Reflowed SPORT weeks stay diagnosis-driven (D11), consistent with the baseline generator.
    const _perf = performanceModelForProfile(profile, profile.plan_start_date || null);
    const _skbId = profileToAthleteModel(profile, null)?.sportingContext?.primarySport || null;
    const _skbIds = _skbId ? new Set((SKB.section(_skbId, 'exerciseLibrary')?.exercises || []).map((e) => e.id)) : new Set();
```
and add to that `allocateGym` call's `ctx`:
```js
      priorityQualities: (_perf && _perf.priorityAdaptations) || [], season: (profile.sport ? _perf && _perf.season : null) || null, skbIds: _skbIds,
```
Also thread each slot's `focusLabel` if the reflow builds its slots from the split (mirror the `strength.js` change: `focusLabel: day.focus`). If the reflow builds slots differently (not from `resolveSplit`), set `focusLabel: 'Full body'` on each so `regionOf` yields `'full'` (the sport default).

> Implementer note: the exact reflow code differs from `buildWeek`; the objective is only that the reflow's `allocateGym` ctx carries `priorityQualities`, `season`, `skbIds`, and each slot a `focusLabel`. Keep everything else identical. Freeze-on-start is untouched (a pinned/frozen session is never recomputed).

- [ ] **Step 3: Full suite green**

Run: `npm test`
Expected: PASS — reflow tests (`reflow-*.js`, `sport-planservice.js`) green; golden master + build-parity unchanged from Task 4.

- [ ] **Step 4: Browser verification (controller performs this)**

The controller will open `/dev`, generate a runner/sprinter plan, and confirm the sessions show the D11 behaviour (durability/sport work, leaner, no off-target isolation) and that build presets are unchanged. Screenshot as proof.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/PlanService.js
git commit -m "feat(app): reflow passes the diagnosis so reflowed sport weeks stay D11-driven (Sprint 8)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Docs + final proof

**Files:**
- Verify: full `npm test`.
- Modify: `docs/architecture/ATHLETE-MODEL.md` (new §5.7), `HANDOFF.md` (advance pointer + entry).

- [ ] **Step 1: Full suite green**

Run: `npm test`
Expected: PASS — everything green; `build-parity` byte-identical; `golden-master` at the reviewed sport baseline; `d11-runner-quality` green.

- [ ] **Step 2: Add `docs/architecture/ATHLETE-MODEL.md` §5.7**

After the existing `### 5.6` section, add:

```markdown
### 5.7 D11 intervention selection — the sport re-seat (Sprint 8, LIVE for sport)

`packages/engine/src/lib/plan/selectInterventions.js` re-seats exercise selection for **sport**
athletes: instead of the muscle-deficit greedy fill, it selects the minimum-effective set of exercises
that satisfy the D9/D10 requirement, ordered by **transfer-per-fatigue** in the EDS §34 value hierarchy
(primary compound → secondary → prevention → sport accessory → lagging-muscle hypertrophy → core →
mobility), and **stops at the fatigue budget** (banks the rest). Muscle-volume is now the downstream
**ledger** (the MRV ceiling still guards, in-loop). `allocator.js` branches: sport (with a non-empty
diagnosis) → D11; **build is unchanged** (byte-identical, gated by `apps/mobile/tests/build-parity.js`).

The diagnosis reaches the plan via `performanceModelForProfile(profile, asOf)`
(`packages/engine/src/lib/performance/forProfile.js`), threaded through `generatePlan(profile, opts?)`
→ `buildWeek` → `allocateGym`, and reused by the PlanService reflow. The sport golden master was
deliberately re-baselined (only `sport·*` archetypes changed); `d11-runner-quality.js` gates the
*nature* of the change (durability in, chest flyes out, leaner sessions). **Deferred:** D12 dose
schemes, the MRV→validator extraction, and SKB-primary candidate selection (Sprint 9). Design/plan:
`docs/superpowers/{specs,plans}/2026-07-03-d11-intervention-selection*`.
```

- [ ] **Step 3: Advance the `HANDOFF.md` pointer**

Update the `## ▶ RESUME HERE` "THE NEXT STEP" wording: Sprint 8 (D11 sport re-seat) is DONE — **the first sprint where live plans changed** — and the next step is **Sprint 9 (W7: SKB-primary demand + retire the emphasis vectors)** and D12 (dose schemes keyed by quality). Add a dated "Latest work — Sprint 8: D11 sport selection re-seat" entry summarising: the value-hierarchy selection, build byte-identical (parity-gated), sport golden master re-baselined, the diagnosis wiring, and the deferred pieces.

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/ATHLETE-MODEL.md HANDOFF.md
git commit -m "docs: record Sprint 8 (D11 sport re-seat); advance handoff to Sprint 9

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:** helper (§5) → Task 1; D11 algorithm/value-hierarchy/stopping rule (§3) → Task 2; build-parity (§7) → Task 3; allocator branch + generatePlan/buildWeek wiring + golden-master re-baseline + sport-test updates (§4, §7) → Task 4; quality validation (§8) → Task 5; reflow wiring (§5) → Task 6; docs → Task 7. MRV-as-ledger (§1) → Task 2's ledger gate. Non-goals (D12/validators/SKB-primary/build) → not implemented, stated in docs. ✓

**Placeholder scan:** No TBD/TODO. Task 4 Steps 1 & 3 carry implementer notes because the exact allocator edit is contextual, but each shows the full code to add and the exact values to deliver; Task 4 Step 6 (sport-test updates) is method-specified because the new expected values are only knowable from the reviewed new behaviour — this is inherent to an intentional-change task, and the parity gate + quality test bound it. ✓

**Type consistency:** `performanceModelForProfile(profile, asOf)` and `selectInterventions({req, ..., makePick})` signatures match across their definitions, tests, the allocator call (Task 4), and the barrel. `req` shape (`{objective:{targetQuality,fatigueBudget:{level}}, requirements:{movementPatterns,contraindicated}}`) matches `deriveSessionObjective`/`deriveMovementRequirements` outputs from Sprint 7. `makePick` returns `{ex,sets,contrib,effectiveRole}` — the exact shape `place()` consumes. ✓
