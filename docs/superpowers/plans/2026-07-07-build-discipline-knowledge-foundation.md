# Build Discipline Engine — Plan 1: Knowledge Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author the discipline knowledge (hypertrophy, powerlifting, Olympic), the missing Olympic exercises, and the secondary-goals menu — all present, validated, and byte-identical (no live plan changes yet). This is the foundation the build flip (Plan 2) will switch onto.

**Architecture:** New governed data modules under `packages/engine/src/data/disciplines/` and `secondaryGoals.js`, parallel to the existing `sportGymSupport/` modules. New Olympic exercises are added to the catalogue but carry a `discipline: 'olympic'` tag that the current allocator excludes, so nothing they add is selectable until Plan 2 wires the disciplines — keeping every current plan byte-identical.

**Tech Stack:** Plain ES-module JS data files (the codebase does not use `.json`); Node test files under `apps/mobile/tests/*.js` run via `node tests/<file>.js`; the golden-master + knowledge-set-ratchet harness.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-07-build-discipline-engine-design.md`. Everything here validates against it and the frozen governing docs.
- **Byte-identical gate:** after every task that touches `packages/engine/src/data/*`, regenerate the goldens and assert **0 non-`knowledgeSetVersion` lines changed** — Plan 1 must not move any plan.
- **KSV discipline:** any change under `packages/engine/src/data/**` or `knowledge/entries.js` requires a `KNOWLEDGE_SET_VERSION` bump (`packages/engine/src/lib/knowledge/entries.js`) + `UPDATE=1 node tests/knowledge-set-ratchet.js` re-baseline. Current KSV: **1.10.0** → bump to **1.11.0** for this plan.
- **Theme/security/data rules:** unchanged from CLAUDE.md — no `.env` commits, no service_role in browser, real theme vars only (N/A here — no UI in Plan 1).
- **Determinism (Art 18):** all new data is static; no clock/random.
- Run the full suite (`cd apps/mobile && npm test`) at the end of each task; it must stay green.
- Branch: `feat/wp49-build-discipline-engine` (already created; the spec is committed there).

---

### Task 1: Discipline module schema + empty registry

**Files:**
- Create: `packages/engine/src/data/disciplines/_schema.js`
- Create: `packages/engine/src/data/disciplines/index.js`
- Test: `apps/mobile/tests/discipline-schema.js`

**Interfaces:**
- Produces: `validateDisciplineModule(m) → string[]` (errors, empty = valid); `validateRegistry(modules) → {ok, errors}`; `DISCIPLINE_QUALITIES` (the allowed quality ids, imported from `../qualities.js` via `qualityIds()`); registry `DISCIPLINES = []` (filled in later tasks) + `getDiscipline(id)`.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/discipline-schema.js
import { validateDisciplineModule, validateRegistry } from '@performance-os/engine/data/disciplines/_schema.js';
let pass = 0; function assert(c, m){ if(!c){ console.error('FAIL:', m); process.exitCode=1 } else pass++ }

// a minimal valid module
const ok = { id:'x', label:'X', demand:{ maxStrength:1.0 }, priorityLifts:['back_squat'],
  periodization:{ off:{ totalWeeks:12, split:[{intent:'base',weeks:12}], deloads:[] } },
  doseCharacter:{ main:{ reps:'1-5', rpe:'RPE 8', restSec:180 }, accessory:{ reps:'8-12', rpe:'RPE 8', restSec:90 } },
  accessoryPatterns:[], provenance:{ source:'test', evidenceLevel:'L5' } };
assert(validateDisciplineModule(ok).length === 0, 'a well-formed module validates');
assert(validateDisciplineModule({ id:'y' }).length > 0, 'a module missing demand/lifts fails');
assert(validateDisciplineModule({ ...ok, demand:{ notAQuality:1 } }).length > 0, 'an unknown quality id fails');
assert(validateRegistry([ok, ok]).ok === false, 'duplicate ids fail the registry');
console.log(process.exitCode ? 'discipline-schema FAILURES' : `PASS: discipline-schema — ${pass} assertions`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/simondring/Code/hybrid-react && node apps/mobile/tests/discipline-schema.js`
Expected: FAIL — `ERR_MODULE_NOT_FOUND` (the schema file does not exist).

- [ ] **Step 3: Write the schema**

```js
// packages/engine/src/data/disciplines/_schema.js
import { qualityIds } from './_qualities-shim.js'; // see note
```
Note: import the real quality ids the same way `performance/prioritise.js` does — from `../qualities.js` (`getQuality`/`qualityIds`). Verify the exact export first (`grep -n "export" packages/engine/src/data/qualities.js`). Use that import; do NOT create a shim. Then:

```js
import { qualityIds } from '../qualities.js';       // adjust to the verified export
const QUALITIES = new Set(qualityIds());
const SEASONS = ['off', 'pre', 'in', 'transition'];
const isBlock = (b) => !!b && typeof b.totalWeeks === 'number' && Array.isArray(b.split) && Array.isArray(b.deloads);
const isDose = (d) => !!d && d.main && d.accessory && typeof d.main.reps === 'string' && typeof d.accessory.reps === 'string';

export function validateDisciplineModule(m) {
  if (!m || typeof m !== 'object') return ['discipline module is not an object'];
  const e = []; const id = m.id || '(no id)';
  if (typeof m.id !== 'string' || !m.id) e.push(`${id}: id required`);
  if (typeof m.label !== 'string' || !m.label) e.push(`${id}: label required`);
  if (!m.demand || typeof m.demand !== 'object') e.push(`${id}: demand must be an object`);
  else for (const q of Object.keys(m.demand)) { if (!QUALITIES.has(q)) e.push(`${id}: unknown quality '${q}' in demand`); if (typeof m.demand[q] !== 'number' || m.demand[q] < 0 || m.demand[q] > 1) e.push(`${id}: demand.${q} must be 0..1`); }
  if (!Array.isArray(m.priorityLifts) || !m.priorityLifts.length) e.push(`${id}: priorityLifts must be a non-empty array`);
  if (!m.periodization || !isBlock(m.periodization.off)) e.push(`${id}: periodization.off must be a block template`);
  if (!isDose(m.doseCharacter)) e.push(`${id}: doseCharacter.main/accessory required`);
  if (!Array.isArray(m.accessoryPatterns)) e.push(`${id}: accessoryPatterns must be an array`);
  return e;
}
export function validateRegistry(modules) {
  const errors = []; const seen = new Set();
  for (const m of modules) { errors.push(...validateDisciplineModule(m)); if (m && m.id) { if (seen.has(m.id)) errors.push(`duplicate discipline id: ${m.id}`); seen.add(m.id); } }
  return { ok: errors.length === 0, errors };
}
export { SEASONS };
export default { validateDisciplineModule, validateRegistry, SEASONS };
```

```js
// packages/engine/src/data/disciplines/index.js
import { validateRegistry } from './_schema.js';
export const DISCIPLINES = [];   // filled by Tasks 4–6
const BY_ID = new Map(DISCIPLINES.map((d) => [d.id, d]));
export function getDiscipline(id) { return BY_ID.get(id) || null; }
export function disciplineErrors() { return validateRegistry(DISCIPLINES).errors; }
export default { DISCIPLINES, getDiscipline, disciplineErrors };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node apps/mobile/tests/discipline-schema.js`
Expected: PASS — 4 assertions. (First verify the real `qualityIds` export exists and the demand quality ids in the test — `maxStrength` — are valid; adjust the test's sample quality if the real id differs.)

- [ ] **Step 5: Bump KSV + re-baseline ratchet, verify goldens byte-identical**

```bash
# bump 1.10.0 -> 1.11.0 in packages/engine/src/lib/knowledge/entries.js (add a changelog note: "WP-49 Plan 1: discipline knowledge foundation")
cd apps/mobile && UPDATE=1 node tests/knowledge-set-ratchet.js
UPDATE=1 node tests/golden-master.js >/dev/null && UPDATE=1 node tests/build-parity.js >/dev/null
cd /Users/simondring/Code/hybrid-react
git --no-pager diff apps/mobile/tests/__snapshots__/engine-golden-master.json | grep -E '^[-+]' | grep -v '^[-+][-+]' | grep -vc knowledgeSetVersion
# Expected output: 0  (byte-identical; only the KSV stamp moved)
```

- [ ] **Step 6: Run full suite + commit**

```bash
cd apps/mobile && npm test   # expect all green + the new discipline-schema.js
cd /Users/simondring/Code/hybrid-react
git add packages/engine/src/data/disciplines/ apps/mobile/tests/discipline-schema.js packages/engine/src/lib/knowledge/entries.js apps/mobile/tests/__snapshots__/
git commit -m "WP-49 (Plan 1): discipline module schema + empty registry (byte-identical)"
```

---

### Task 2: Add the missing Olympic exercises to the catalogue (discipline-gated → byte-identical)

**Files:**
- Modify: `packages/engine/src/data/strengthExercises.js` (append new EXERCISES entries + a `discipline` field convention)
- Modify: `packages/engine/src/lib/plan/allocator.js` (exclude `discipline`-tagged exercises from selection unless `ctx.discipline` matches — the gate that keeps current plans byte-identical)
- Modify: `apps/mobile/src/data/exerciseLibrary.js` (form-guide entries for the new lifts, pattern-level)
- Test: `apps/mobile/tests/olympic-catalogue.js`

**Interfaces:**
- Consumes: the `EXERCISES` schema (inspect an existing entry: `grep -n "id: 'power_clean'" -A2 packages/engine/src/data/strengthExercises.js` and read its full field set — `id, name, pattern, equip, level, role, axialLoad`, plus optional `quality`, `goalTags`, `sportTags`, `liftKey`, `muscle`/muscle-map, `unilateral`, `repCap/repFloor`).
- Produces: new exercise ids `snatch, clean_and_jerk, power_snatch, hang_snatch, split_jerk, overhead_squat, push_press, snatch_pull, clean_pull, muscle_snatch` (+ powerlifting `board_press, pin_squat`), each carrying `discipline: 'olympic'` (or `'powerlifting'`) so the allocator's new gate excludes them from non-matching contexts.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/olympic-catalogue.js
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
import { generatePlan } from '@performance-os/engine';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
let pass = 0; function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1} else pass++ }
const byId = new Map(EXERCISES.map(e=>[e.id,e]));

// (a) the new lifts exist with a full, valid schema
const REQUIRED = ['snatch','clean_and_jerk','power_snatch','hang_snatch','split_jerk','overhead_squat','push_press','snatch_pull','clean_pull','muscle_snatch'];
for (const id of REQUIRED) {
  const e = byId.get(id);
  assert(e, `exercise '${id}' exists`);
  if (e) assert(typeof e.name==='string' && typeof e.pattern==='string' && typeof e.axialLoad==='number' && e.discipline==='olympic',
    `'${id}' has name/pattern/axialLoad + discipline:'olympic'`);
}
// (b) BYTE-IDENTICAL GUARD: a normal build/sport plan never selects a discipline-gated lift
const FULL=['barbell','dumbbell','machine','cable','band','kettlebell','bodyweight'];
const A=o=>({...BLANK_ANSWERS,...o});
const plan = generatePlan(answersToProfile(A({goalType:'build',strengthStyle:'strength',experienceLevel:'advanced',daysPerWeek:5,days:['mon','tue','wed','fri','sat'],equipment:FULL,sex:'male',lifts:{squat:180,bench:130,deadlift:230}})));
const picked = new Set(plan.phases.flatMap(p=>p.weeks||[]).flatMap(w=>w.sessions||[]).flatMap(s=>s.items||[]).map(it=>it.exId));
assert(![...REQUIRED].some(id=>picked.has(id)), 'no discipline-gated Olympic lift leaks into a current build plan');
console.log(process.exitCode ? 'olympic-catalogue FAILURES' : `PASS: olympic-catalogue — ${pass} assertions`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/olympic-catalogue.js`
Expected: FAIL — the exercises don't exist yet.

- [ ] **Step 3: Add the allocator gate first (so new lifts can't leak)**

In `packages/engine/src/lib/plan/allocator.js`, find the candidate-filtering point (`grep -n "availableEquip\|filter\|candidates" packages/engine/src/lib/plan/allocator.js` — the place where the exercise pool is built). Add, at the start of the candidate predicate:
```js
// WP-49 Plan 1: discipline-tagged lifts are only selectable when their discipline is active.
if (ex.discipline && ex.discipline !== ctx.discipline) return false;
```
`ctx.discipline` is undefined for all current callers → every discipline-tagged lift is excluded → byte-identical.

- [ ] **Step 4: Append the Olympic + powerlifting exercises**

Add to `EXERCISES` in `strengthExercises.js`. Author each with the FULL schema, correct `axialLoad` (Olympic pulls/OHS are high-axial), `quality:'power'` for the explosive lifts, a muscle map consistent with `muscleVolume.js` groups, `equip:'barbell'`, appropriate `level` (see Task-3 competency note), and `discipline:'olympic'` / `'powerlifting'`. Example (author the rest to match):
```js
{ id:'overhead_squat', name:'Overhead squat', pattern:'squat', equip:'barbell', level:'advanced', role:'primary', axialLoad:3, quality:'power', discipline:'olympic', muscle:{ quads:1, glutes:0.5, shoulders:0.5, core:0.5 } },
{ id:'snatch', name:'Snatch', pattern:'olympic', equip:'barbell', level:'advanced', role:'primary', axialLoad:3, quality:'power', discipline:'olympic', muscle:{ quads:0.5, glutes:0.5, back:0.5, shoulders:0.5 } },
// … clean_and_jerk, power_snatch, hang_snatch, split_jerk, push_press, snatch_pull, clean_pull, muscle_snatch, board_press, pin_squat
```
(Author the full set; keep muscle maps modest — these are technical lifts, not volume drivers. Verify each `pattern` value is one the scheduler/allocator already understand, or add `'olympic'` as a recognised pattern where patterns are enumerated.)

- [ ] **Step 5: Add pattern-level form-guide entries**

In `apps/mobile/src/data/exerciseLibrary.js`, add guide entries keyed by the movement concept the new lifts alias to (e.g. an `snatch` and `clean_and_jerk` and `overhead_squat` guide), following the existing entry shape (`name, type, summary, how[], lookFor[], avoid[]`). Unmatched lifts fall back to the placeholder — so this is additive, not blocking.

- [ ] **Step 6: Run the test — verify PASS + byte-identical goldens**

```bash
node apps/mobile/tests/olympic-catalogue.js   # expect PASS
cd apps/mobile && UPDATE=1 node tests/knowledge-set-ratchet.js
UPDATE=1 node tests/golden-master.js >/dev/null && UPDATE=1 node tests/build-parity.js >/dev/null
cd /Users/simondring/Code/hybrid-react
git --no-pager diff apps/mobile/tests/__snapshots__/engine-golden-master.json | grep -E '^[-+]' | grep -v '^[-+][-+]' | grep -vc knowledgeSetVersion
# Expected: 0. If NON-ZERO, a new lift leaked into selection → the Task-3 gate isn't covering that path; fix the gate before continuing.
```

- [ ] **Step 7: Full suite + commit**

```bash
cd apps/mobile && npm test   # all green
cd /Users/simondring/Code/hybrid-react
git add packages/engine/src/data/strengthExercises.js packages/engine/src/lib/plan/allocator.js apps/mobile/src/data/exerciseLibrary.js apps/mobile/tests/olympic-catalogue.js packages/engine/src/lib/knowledge/entries.js apps/mobile/tests/__snapshots__/
git commit -m "WP-49 (Plan 1): Olympic + powerlifting lifts added, discipline-gated (byte-identical)"
```

---

### Task 3: The three discipline modules (hypertrophy, powerlifting, olympic)

**Files:**
- Create: `packages/engine/src/data/disciplines/hypertrophy.js`, `powerlifting.js`, `olympic.js`
- Modify: `packages/engine/src/data/disciplines/index.js` (register the three)
- Test: `apps/mobile/tests/disciplines.js`

**Interfaces:**
- Consumes: `validateDisciplineModule` (Task 1); the exercise ids from Task 2 + existing ids; `SPORT_BLOCKS`-style block templates.
- Produces: `DISCIPLINES` registry with three valid modules; each `priorityLifts` references only real exercise ids; competency note — Olympic module lists the full lifts but flags `minLevel:'intermediate'` semantics for the technical ones (the flip in Plan 2 enforces the gate; Plan 1 only records it).

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/disciplines.js
import { DISCIPLINES, getDiscipline, disciplineErrors } from '@performance-os/engine/data/disciplines/index.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
let pass=0; function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1} else pass++ }
const ids = new Set(EXERCISES.map(e=>e.id));
assert(disciplineErrors().length === 0, `all discipline modules validate (${disciplineErrors().join('; ')})`);
for (const d of ['hypertrophy','powerlifting','olympic']) assert(getDiscipline(d), `discipline '${d}' registered`);
// priorityLifts reference real exercises
for (const d of DISCIPLINES) for (const lift of d.priorityLifts) assert(ids.has(lift), `${d.id}: priorityLift '${lift}' is a real exercise id`);
// definitional lead quality present
assert(getDiscipline('powerlifting').demand.maxStrength === 1.0, 'powerlifting leads with maxStrength 1.0');
assert(getDiscipline('hypertrophy').demand.hypertrophy === 1.0, 'hypertrophy leads with hypertrophy 1.0');
assert((getDiscipline('olympic').demand.explosiveStrength || getDiscipline('olympic').demand.power) === 1.0, 'olympic leads with power/explosive 1.0');
console.log(process.exitCode ? 'disciplines FAILURES' : `PASS: disciplines — ${pass} assertions`);
```

- [ ] **Step 2: Run to verify FAIL**

Run: `node apps/mobile/tests/disciplines.js` — Expected: FAIL (modules not created; registry empty).

- [ ] **Step 3: Author the three modules**

Write each per the spec §2.2 seed content. Verify the real quality ids first (`node -e "import('@performance-os/engine/data/qualities.js').then(m=>console.log(m.qualityIds?.()))"` or read the file) and use the exact ids (e.g. `explosiveStrength` vs `power`). Use real exercise ids for `priorityLifts`. Example (`powerlifting.js`):
```js
export default {
  id:'powerlifting', label:'Powerlifting',
  demand:{ maxStrength:1.0, hypertrophy:0.6, robustness:0.5, stability:0.4, mobility:0.35 },
  priorityLifts:['back_squat','bench','deadlift','front_squat','pause_squat','deficit_deadlift','close_grip_bench'],
  periodization:{
    off:{ totalWeeks:12, split:[{intent:'base',weeks:4},{intent:'build',weeks:6},{intent:'peak',weeks:2}], deloads:[4,9] },
    pre:{ totalWeeks:6, split:[{intent:'build',weeks:4},{intent:'peak',weeks:2}], deloads:[4] },
    in:{ totalWeeks:4, split:[{intent:'peak',weeks:4}], deloads:[] },
    transition:{ totalWeeks:4, split:[{intent:'base',weeks:4}], deloads:[] } },
  doseCharacter:{ main:{ reps:'3-5', rpe:'RPE 8', restSec:180 }, accessory:{ reps:'6-10', rpe:'RPE 8', restSec:120 } },
  accessoryPatterns:['weak_lift_variant','posterior_chain','pressing_support'],
  provenance:{ source:'standard powerlifting practice (Rippetoe/RTS/Sheiko lineage)', evidenceLevel:'L5', needsReview:false }
};
```
Author `hypertrophy.js` (hypertrophy 1.0 lead; priorityLifts a balanced compound set; higher-volume dose; accessoryPatterns per-muscle-balance) and `olympic.js` (explosiveStrength 1.0, mobility 0.7; priorityLifts the classic lifts + front/overhead squat + pulls; low-rep explosive dose; accessoryPatterns positions/pulling/overhead). Register all three in `index.js` (`DISCIPLINES = [hypertrophy, powerlifting, olympic]` and rebuild `BY_ID`).

- [ ] **Step 4: Run to verify PASS**

Run: `node apps/mobile/tests/disciplines.js` — Expected: PASS. (If a `priorityLift` id is missing, either it's a typo or the exercise wasn't added in Task 2 — fix.)

- [ ] **Step 5: Byte-identical goldens + KSV re-baseline**

```bash
cd apps/mobile && UPDATE=1 node tests/knowledge-set-ratchet.js
UPDATE=1 node tests/golden-master.js >/dev/null && UPDATE=1 node tests/build-parity.js >/dev/null
cd /Users/simondring/Code/hybrid-react
git --no-pager diff apps/mobile/tests/__snapshots__/engine-golden-master.json | grep -E '^[-+]' | grep -v '^[-+][-+]' | grep -vc knowledgeSetVersion   # Expected: 0
```

- [ ] **Step 6: Full suite + commit**

```bash
cd apps/mobile && npm test
cd /Users/simondring/Code/hybrid-react
git add packages/engine/src/data/disciplines/ apps/mobile/tests/disciplines.js packages/engine/src/lib/knowledge/entries.js apps/mobile/tests/__snapshots__/
git commit -m "WP-49 (Plan 1): hypertrophy/powerlifting/olympic discipline modules (byte-identical)"
```

---

### Task 4: The secondary-goals menu module

**Files:**
- Create: `packages/engine/src/data/secondaryGoals.js`
- Test: `apps/mobile/tests/secondary-goals.js`

**Interfaces:**
- Produces: `SECONDARY_GOALS` (array), `getSecondaryGoal(id)`, `SECONDARY_GOAL_IDS`. Each entry: `{ id, label, correctivePatterns:string[], emphasisModifier:{muscle:number}, accessoryPreferences:string[] (exIds), targetAreas:string[] }`.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/secondary-goals.js
import { SECONDARY_GOALS, getSecondaryGoal, SECONDARY_GOAL_IDS } from '@performance-os/engine/data/secondaryGoals.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
let pass=0; function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1} else pass++ }
const ids = new Set(EXERCISES.map(e=>e.id));
for (const g of ['posture','prehab','mobility','conditioning']) assert(getSecondaryGoal(g), `secondary goal '${g}' exists`);
for (const g of SECONDARY_GOALS) {
  assert(Array.isArray(g.correctivePatterns) && Array.isArray(g.accessoryPreferences), `${g.id}: has patterns + preferences`);
  for (const ex of g.accessoryPreferences) assert(ids.has(ex), `${g.id}: accessoryPreference '${ex}' is a real exercise`);
  // emphasisModifier is GENTLE — never a hard override
  for (const m in (g.emphasisModifier||{})) assert(g.emphasisModifier[m] > 0 && g.emphasisModifier[m] <= 1.3, `${g.id}: emphasis ${m} is a gentle ≤1.3 modifier`);
}
console.log(process.exitCode ? 'secondary-goals FAILURES' : `PASS: secondary-goals — ${pass} assertions`);
```

- [ ] **Step 2: Run to verify FAIL** — `node apps/mobile/tests/secondary-goals.js` → FAIL (module missing).

- [ ] **Step 3: Author `secondaryGoals.js`**

```js
// packages/engine/src/data/secondaryGoals.js
export const SECONDARY_GOALS = [
  { id:'posture', label:'Counteract a desk job', targetAreas:['upper_back','rear_delts','hip_flexors','thoracic'],
    correctivePatterns:['horizontal_pull','external_rotation','hip_mobility','glute_activation'],
    emphasisModifier:{ back:1.1, shoulders:1.05 },
    accessoryPreferences:['face_pull','band_pull_apart','chest_supported_row'].filter(Boolean) }, // use ids that exist; verify
  { id:'prehab', label:'Injury prevention', targetAreas:['rotator_cuff','knees','hips'],
    correctivePatterns:['rotator_cuff','eccentric_control','single_leg_stability'], emphasisModifier:{}, accessoryPreferences:[] },
  { id:'mobility', label:'Mobility & flexibility', targetAreas:['hips','ankles','shoulders','thoracic'],
    correctivePatterns:['full_rom','loaded_stretch'], emphasisModifier:{}, accessoryPreferences:[] },
  { id:'conditioning', label:'General conditioning', targetAreas:['work_capacity'],
    correctivePatterns:['metabolic_finisher','carries'], emphasisModifier:{}, accessoryPreferences:['farmer_carry'].filter(Boolean) },
];
const BY_ID = new Map(SECONDARY_GOALS.map(g=>[g.id,g]));
export const SECONDARY_GOAL_IDS = SECONDARY_GOALS.map(g=>g.id);
export function getSecondaryGoal(id){ return BY_ID.get(id) || null; }
export default { SECONDARY_GOALS, getSecondaryGoal, SECONDARY_GOAL_IDS };
```
Before finalising, verify each `accessoryPreferences` id exists (`grep "id: '<id>'" packages/engine/src/data/strengthExercises.js`); drop any that don't (keep the list to real ids only — the test enforces this).

- [ ] **Step 4: Run to verify PASS** — `node apps/mobile/tests/secondary-goals.js` → PASS.

- [ ] **Step 5: Byte-identical goldens + KSV re-baseline** (same commands as Task 3 Step 5; expect 0).

- [ ] **Step 6: Full suite + commit**

```bash
cd apps/mobile && npm test
cd /Users/simondring/Code/hybrid-react
git add packages/engine/src/data/secondaryGoals.js apps/mobile/tests/secondary-goals.js packages/engine/src/lib/knowledge/entries.js apps/mobile/tests/__snapshots__/
git commit -m "WP-49 (Plan 1): secondary-goals menu module (byte-identical)"
```

---

### Task 5: Barrel exports + final foundation verification

**Files:**
- Modify: `packages/engine/index.js` (export `DISCIPLINES/getDiscipline`, `SECONDARY_GOALS/getSecondaryGoal`)
- Test: `apps/mobile/tests/discipline-foundation.js`

**Interfaces:**
- Produces: public barrel access to the new knowledge (Plan 2 + the app onboarding will import from `@performance-os/engine`).

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/discipline-foundation.js — the foundation is present + inert
import { DISCIPLINES, getDiscipline, SECONDARY_GOALS } from '@performance-os/engine';
let pass=0; function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1} else pass++ }
assert(DISCIPLINES.length === 3 && getDiscipline('powerlifting'), 'disciplines exported from the barrel');
assert(SECONDARY_GOALS.length === 4, 'secondary goals exported from the barrel');
console.log(process.exitCode ? 'discipline-foundation FAILURES' : `PASS: discipline-foundation — ${pass} assertions`);
```

- [ ] **Step 2: Run to verify FAIL** — barrel doesn't export them yet.

- [ ] **Step 3: Add the barrel exports** in `packages/engine/index.js`:
```js
export { DISCIPLINES, getDiscipline } from './src/data/disciplines/index.js';
export { SECONDARY_GOALS, getSecondaryGoal, SECONDARY_GOAL_IDS } from './src/data/secondaryGoals.js';
```

- [ ] **Step 4: Run to verify PASS** — `node apps/mobile/tests/discipline-foundation.js` → PASS.

- [ ] **Step 5: Final full-suite + byte-identical sign-off**

```bash
cd apps/mobile && npm test   # ALL green (incl. the 5 new test files)
# Confirm the WHOLE plan moved no plan: the only golden change across Plan 1 is the KSV stamp.
cd /Users/simondring/Code/hybrid-react
git --no-pager diff origin/main -- apps/mobile/tests/__snapshots__/engine-golden-master.json | grep -E '^[-+]' | grep -v '^[-+][-+]' | grep -vc knowledgeSetVersion   # Expected: 0
```

- [ ] **Step 6: Commit + open PR**

```bash
git add packages/engine/index.js apps/mobile/tests/discipline-foundation.js
git commit -m "WP-49 (Plan 1): barrel-export the discipline + secondary-goal knowledge; foundation complete"
git push -u origin feat/wp49-build-discipline-engine
gh pr create --base main --title "WP-49 (Plan 1): build discipline knowledge foundation (byte-identical)" --body "Authors the hypertrophy/powerlifting/olympic discipline modules, the missing Olympic lifts (discipline-gated so nothing leaks into current selection), and the secondary-goals menu. Everything validated + barrel-exported; ZERO plan changes (golden drift = KSV stamp only). Plan 2 flips build onto this. Spec: docs/superpowers/specs/2026-07-07-build-discipline-engine-design.md"
```

---

## Self-Review

**Spec coverage:** §2 discipline modules → Tasks 1,3; §3 catalogue → Task 2; §5 secondary goals → Task 4; barrel/consumption seam → Task 5. §4 flip mechanics, §6 removal/migration, §7 golden re-baseline (the *behavioural* parts) → **Plan 2** (deliberately out of scope here; Plan 1 is the byte-identical foundation). §9 seed decisions are baked into the Task-3 module content.

**Placeholder scan:** the module/exercise seed values are illustrative in the plan and MUST be authored to real quality/exercise ids — every task includes a verify-the-real-ids step and a test that fails on a bad id, so there are no silent placeholders. No "TBD/handle edge cases" steps.

**Type consistency:** `validateDisciplineModule`/`validateRegistry`/`getDiscipline`/`DISCIPLINES` names are consistent across Tasks 1,3,5; `getSecondaryGoal`/`SECONDARY_GOALS` across Tasks 4,5; the `discipline` exercise field + `ctx.discipline` gate across Task 2 (defined) and Plan 2 (consumed).

**Note for the executor:** if any byte-identical check returns non-zero, STOP and fix the gate/tagging before proceeding — Plan 1's whole contract is "no plan moves."
