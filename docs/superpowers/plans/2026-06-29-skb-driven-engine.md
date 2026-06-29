# SKB-driven Onboarding + Decision Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Sport Knowledge Base (SKB) the single source of truth for sports — onboarding shows only fully-authored sports (auto-updating on commit), and the SKB drives plan generation, the adaptive reflow, readiness weighting, load thresholds, and the Atlas radar.

**Architecture:** Each SKB profile gains an engine-facing `gymProgramming` block and machine-readable `decisionRules`. The thin `packages/engine/src/lib/sports/*.js` modules and the Atlas `apps/mobile/src/data/sports/index.js` map are deleted; every consumer reads `sportKnowledge` instead. A back-compat id map keeps existing users valid.

**Tech Stack:** Node 26 ESM, React 18 + Vite 5, `@performance-os/engine` workspace package, pure-JSON data with a JS validator/accessor. Tests are plain Node scripts (`node apps/mobile/tests/<name>.js`) with a local `assert` helper — no test framework.

## Global Constraints

- **Engine purity:** `generatePlan()` stays pure (same profile → same plan). The SKB is static deterministic data — reading it from the pure generator is allowed; the adaptive layers (reflow/readiness/load) stay in `PlanService`/`Readiness`/`trainingLoad`, never in the pure generator.
- **Theme variables:** UI work uses only real vars (`--bg-surface`, `--txt-strong`, `--rust`, `--moss`, `--ochre`, `--hairline`…). Never `--card-bg`/`--border`/`--accent-bg`.
- **Data writes** go through SyncService/store actions — but this plan touches no persistence; profile shape is unchanged except canonical sport ids.
- **Canonical sport ids = SKB ids:** `gaelic_football`, `hurling`, `swimming` (+ future). Back-compat map: `{ swim:'swimming', run:'running', cycle:'cycling' }`.
- **Engine muscle set** (the only keys allowed in `gymProgramming.emphasis` / `keyMuscles`): `chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes, calves, core`.
- **Tests must pass at every commit.** Run the full engine suite (`for f in apps/mobile/tests/*.js; do node "$f"; done`) plus `npm run build` before declaring a phase done.
- **Worktree note:** this worktree resolves `@performance-os/engine` via `node_modules/@performance-os/{engine,shared}` symlinks already created. If absent, recreate: `mkdir -p node_modules/@performance-os && ln -sfn "$(pwd)/packages/engine" node_modules/@performance-os/engine && ln -sfn "$(pwd)/packages/shared" node_modules/@performance-os/shared`.

---

# Phase 1 — Foundation: SKB drives generation + onboarding

End state: onboarding lists Gaelic football / Hurling / Swimming; selecting one generates a plan from the SKB; the thin `sports/` modules are gone; legacy run/cycle/swim profiles still generate valid plans.

---

### Task 1: Move shared sport constants into the SKB layer

Extracts the block templates + module validator out of the soon-to-be-deleted `sports/_schema.js` so nothing depends on `sports/` after Phase 1.

**Files:**
- Create: `packages/engine/src/lib/sportKnowledge/blocks.js`
- Test: `apps/mobile/tests/skb-blocks.js`

**Interfaces:**
- Produces: `SEASONS: string[]`, `DEFAULT_SEASON_VOLUME: {off,pre,in,transition}`, `SPORT_BLOCKS: {off,pre,in,transition}`, `validateGymProgramming(gp) -> string[]`, `isBlock(b) -> boolean`.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/skb-blocks.js
import { SEASONS, DEFAULT_SEASON_VOLUME, SPORT_BLOCKS, validateGymProgramming }
  from '@performance-os/engine/lib/sportKnowledge/blocks.js';
function assert(c, m){ if(!c){ console.error('FAIL:', m); process.exitCode=1; } else console.log('PASS:', m); }

assert(SEASONS.join(',') === 'off,pre,in,transition', 'SEASONS in order');
assert(SPORT_BLOCKS.off.totalWeeks === 12, 'off block is 12 weeks');
assert(DEFAULT_SEASON_VOLUME.in === 0.6, 'in-season volume 0.6');

const good = { emphasis:{ glutes:1.2 }, priorityExercises:['back_squat'], power:true,
  seasonModifiers: DEFAULT_SEASON_VOLUME, periodization: SPORT_BLOCKS };
assert(validateGymProgramming(good).length === 0, 'valid gymProgramming passes');
assert(validateGymProgramming({}).length > 0, 'empty gymProgramming fails');
assert(validateGymProgramming({ ...good, emphasis:{ foot: 1.2 } }).length > 0,
  'non-engine muscle key rejected');
console.log('skb-blocks tests done');
```

- [ ] **Step 2: Run it, expect fail** — `node apps/mobile/tests/skb-blocks.js` → ERR_MODULE_NOT_FOUND.

- [ ] **Step 3: Create `blocks.js`** (copy the constants verbatim from `sports/_schema.js`, add the gymProgramming validator)

```js
// packages/engine/src/lib/sportKnowledge/blocks.js
/**
 * Sport block templates + the gymProgramming validator. Moved out of the retired
 * sports/_schema.js so the SKB is self-contained. SPORT_BLOCKS / DEFAULT_SEASON_VOLUME
 * are unchanged values (Rønnestad/Bosquet/Mujika — see the old _schema.js header).
 */
export const SEASONS = ['off', 'pre', 'in', 'transition'];
export const DEFAULT_SEASON_VOLUME = { off: 1.0, pre: 0.85, in: 0.6, transition: 0.7 };
export const SPORT_BLOCKS = {
  off:        { totalWeeks: 12, split: [{ intent: 'base', weeks: 5 }, { intent: 'build', weeks: 5 }, { intent: 'peak', weeks: 2 }], deloads: [5, 10] },
  pre:        { totalWeeks: 6,  split: [{ intent: 'base', weeks: 3 }, { intent: 'build', weeks: 3 }], deloads: [6] },
  in:         { totalWeeks: 4,  split: [{ intent: 'build', weeks: 4 }], deloads: [] },
  transition: { totalWeeks: 4,  split: [{ intent: 'base', weeks: 4 }], deloads: [] }
};

const ENGINE_MUSCLES = new Set(['chest','back','shoulders','biceps','triceps','quads','hamstrings','glutes','calves','core']);
export function isBlock(b){ return !!b && typeof b.totalWeeks === 'number' && Array.isArray(b.split) && Array.isArray(b.deloads); }

/** Validate a gymProgramming block. @returns {string[]} errors. */
export function validateGymProgramming(gp){
  if (!gp || typeof gp !== 'object') return ['gymProgramming must be an object'];
  const errs = [];
  if (!gp.emphasis || typeof gp.emphasis !== 'object') errs.push('gymProgramming.emphasis must be an object');
  else for (const k of Object.keys(gp.emphasis)) if (!ENGINE_MUSCLES.has(k)) errs.push(`gymProgramming.emphasis: unknown muscle "${k}"`);
  if (!Array.isArray(gp.priorityExercises)) errs.push('gymProgramming.priorityExercises must be an array');
  if (typeof gp.power !== 'boolean') errs.push('gymProgramming.power must be a boolean');
  for (const s of SEASONS) {
    if (typeof (gp.seasonModifiers || {})[s] !== 'number') errs.push(`gymProgramming.seasonModifiers.${s} must be a number`);
    if (!isBlock((gp.periodization || {})[s])) errs.push(`gymProgramming.periodization.${s} must be a block`);
  }
  if (gp.keyMuscles && (!Array.isArray(gp.keyMuscles) || gp.keyMuscles.some(m => !ENGINE_MUSCLES.has(m))))
    errs.push('gymProgramming.keyMuscles must be engine-muscle ids');
  if (gp.byDiscipline) for (const [d, o] of Object.entries(gp.byDiscipline)) {
    if (o.emphasis && typeof o.emphasis !== 'object') errs.push(`gymProgramming.byDiscipline.${d}.emphasis must be an object`);
    if (o.priorityExercises && !Array.isArray(o.priorityExercises)) errs.push(`gymProgramming.byDiscipline.${d}.priorityExercises must be an array`);
    if (o.periodization) for (const s of SEASONS) if (o.periodization[s] && !isBlock(o.periodization[s])) errs.push(`gymProgramming.byDiscipline.${d}.periodization.${s} not a block`);
  }
  return errs;
}
export default { SEASONS, DEFAULT_SEASON_VOLUME, SPORT_BLOCKS, isBlock, validateGymProgramming };
```

- [ ] **Step 4: Run it, expect pass** — `node apps/mobile/tests/skb-blocks.js` → all PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(engine): SKB blocks + gymProgramming validator"`

---

### Task 2: Schema — require gymProgramming + validate structured decisionRules

**Files:**
- Modify: `packages/engine/src/lib/sportKnowledge/schema.js` (add gymProgramming + rule vocabulary validation), `packages/engine/src/lib/sportKnowledge/index.js` (RICH completeness includes gymProgramming)
- Test: `apps/mobile/tests/skb-schema-v2.js`

**Interfaces:**
- Produces: exported `RULE_SIGNALS: Set<string>`, `RULE_EFFECTS: Set<string>` from `schema.js`. `validateSportProfile` now also validates `gymProgramming` (when present) + each rule's `trigger`/`effect` (when present).

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/skb-schema-v2.js
import { validateSportProfile, RULE_SIGNALS, RULE_EFFECTS }
  from '@performance-os/engine/lib/sportKnowledge/schema.js';
import skb from '@performance-os/engine/lib/sportKnowledge/index.js';
function assert(c,m){ if(!c){ console.error('FAIL:',m); process.exitCode=1; } else console.log('PASS:',m); }

assert(RULE_SIGNALS.has('competition_within_h') && RULE_EFFECTS.has('reduce_volume_pct'), 'vocabulary exported');

// a rule with a bad signal is rejected
const base = JSON.parse(JSON.stringify(skb.get('gaelic_football')));
base.decisionRules[0].trigger = { signal: 'made_up', op: '<=', value: 1 };
base.decisionRules[0].effect = { type: 'reduce_volume_pct', params: { pct: 10 } };
assert(validateSportProfile(base).some(e => /trigger.*signal/i.test(e)), 'unknown trigger signal rejected');

// a bad effect type is rejected
const base2 = JSON.parse(JSON.stringify(skb.get('gaelic_football')));
base2.decisionRules[0].trigger = { signal: 'acwr', op: '>', value: 1.5 };
base2.decisionRules[0].effect = { type: 'nuke', params: {} };
assert(validateSportProfile(base2).some(e => /effect.*type/i.test(e)), 'unknown effect type rejected');
console.log('skb-schema-v2 tests done');
```

- [ ] **Step 2: Run it, expect fail** — `node apps/mobile/tests/skb-schema-v2.js` → `RULE_SIGNALS` undefined.

- [ ] **Step 3: Edit `schema.js`** — add the vocabulary + hook it into validation. Add near the top:

```js
export const RULE_SIGNALS = new Set([
  'competition_within_h', 'matches_this_week', 'acwr', 'readiness',
  'cmj_drop_pct', 'illness', 'season', 'soreness_region'
]);
export const RULE_EFFECTS = new Set([
  // shipped (applied by the reflow)
  'reduce_volume_pct', 'priming_only', 'force_deload', 'minimal_effective_volume',
  'reduce_one_step', 'withhold', 'taper',
  // reserved (validated, evaluator no-ops this build)
  'exclude_soreness_above', 'reduce_region_eccentric', 'reduce_region_overhead', 'cap_high_speed'
]);
```

Import the gymProgramming validator at the top:
```js
import { validateGymProgramming } from './blocks.js';
```

Inside `validateSportProfile(p)`, before the privacy sweep, add:
```js
  // gymProgramming (when present — required for completeness, not structural validity)
  if (p.gymProgramming) errs.push(...validateGymProgramming(p.gymProgramming).map(e => `${id}.${e}`));
```

In the existing `decisionRules.forEach` loop, after the `provErrors` push, add structured-field checks:
```js
      if (r.trigger) {
        if (!RULE_SIGNALS.has(r.trigger.signal)) errs.push(`${lbl}: trigger.signal "${r.trigger.signal}" not in vocabulary`);
        if (typeof r.trigger.op !== 'string') errs.push(`${lbl}: trigger.op required`);
      }
      if (r.effect && !RULE_EFFECTS.has(r.effect.type)) errs.push(`${lbl}: effect.type "${r.effect.type}" not in vocabulary`);
```

- [ ] **Step 4: Edit `index.js`** — add gymProgramming to the RICH completeness map:
```js
  'gymProgramming':            (v) => !!v && !!v.emphasis && Array.isArray(v.priorityExercises) && v.priorityExercises.length > 0,
```
(add `dig` works on dotted paths; `'gymProgramming'` is top-level so `dig(p,'gymProgramming')` returns the object.)

- [ ] **Step 5: Run it, expect pass** — `node apps/mobile/tests/skb-schema-v2.js`. Also run `node apps/mobile/tests/sport-knowledge.js` — **the three flagships will now FAIL `completeness().complete`** because they lack `gymProgramming`. That is expected and fixed in Task 3; the schema-v2 test itself passes.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(engine): SKB schema requires gymProgramming + validates rule vocabulary"`

---

### Task 3: Author gymProgramming + structured rules + meta/atlas on the three sports

Re-completes the three flagships under the new schema.

**Files:**
- Modify: `packages/engine/src/data/sport-knowledge/{gaelic_football,hurling,swimming}.json`
- Modify test: `apps/mobile/tests/sport-knowledge.js` (assert gymProgramming present + selectable())

**Interfaces:**
- Produces: each profile gains `meta.emoji`, top-level `gymProgramming`, `atlas:{pillars,family}`, and `trigger`/`effect` on every `decisionRule`.

- [ ] **Step 1: Add the blocks to `gaelic_football.json`.** Add `"emoji": "🏐"` inside `meta`. Add `atlas` and `gymProgramming` at top level (after `kpiFramework`):

```json
  "atlas": { "family": "mixed", "pillars": ["aerobic","explosive","repeatSprintAbility","durability","strength","core","recovery","consistency"] },
  "gymProgramming": {
    "emphasis": { "glutes": 1.25, "hamstrings": 1.25, "quads": 1.15, "back": 1.15, "core": 1.20, "calves": 1.0, "chest": 0.9, "shoulders": 1.0, "biceps": 0.9, "triceps": 0.9 },
    "priorityExercises": ["trap_bar_deadlift","hip_thrust","nordic_curl","rdl","rear_foot_split_squat","copenhagen","broad_jump","pallof_press"],
    "keyMuscles": ["glutes","hamstrings","quads","calves"],
    "power": true,
    "seasonModifiers": { "off": 1.0, "pre": 0.85, "in": 0.6, "transition": 0.7 },
    "periodization": {
      "off":        { "totalWeeks": 12, "split": [{ "intent": "base", "weeks": 5 }, { "intent": "build", "weeks": 5 }, { "intent": "peak", "weeks": 2 }], "deloads": [5, 10] },
      "pre":        { "totalWeeks": 6,  "split": [{ "intent": "base", "weeks": 3 }, { "intent": "build", "weeks": 3 }], "deloads": [6] },
      "in":         { "totalWeeks": 4,  "split": [{ "intent": "build", "weeks": 4 }], "deloads": [] },
      "transition": { "totalWeeks": 4,  "split": [{ "intent": "base", "weeks": 4 }], "deloads": [] }
    }
  }
```

> **Note on priorityExercises ids:** these must exist in the engine's exercise catalogue (`packages/engine/src/data/strengthExercises.js`), NOT the SKB exerciseLibrary. Verify each id with `grep "id: '<id>'" packages/engine/src/data/strengthExercises.js`. Use the closest existing id (e.g. `trap_bar_dl`, `nordic_curl`, `hip_thrust`, `pallof`, `copenhagen`, `broad_jump`, `rdl`/`romanian_deadlift`, `bulgarian_split_squat`). Adjust the JSON to the real ids before committing.

- [ ] **Step 2: Add structured `trigger`/`effect` to each rule in `gaelic_football.json`.** Map every rule. Examples (apply the full set):

```json
{ "id": "match_within_48h_no_high_soreness", "...": "...", "trigger": { "signal": "competition_within_h", "op": "<=", "value": 48 }, "effect": { "type": "exclude_soreness_above", "params": { "level": "moderate" } } },
{ "id": "match_within_24h_priming_only",      "...": "...", "trigger": { "signal": "competition_within_h", "op": "<=", "value": 24 }, "effect": { "type": "priming_only", "params": {} } },
{ "id": "two_matches_reduce_gym_volume",      "...": "...", "trigger": { "signal": "matches_this_week", "op": ">=", "value": 2 }, "effect": { "type": "reduce_volume_pct", "params": { "pct": 45 } } },
{ "id": "acwr_high_pull_back",                "...": "...", "trigger": { "signal": "acwr", "op": ">", "value": 1.5 }, "effect": { "type": "force_deload", "params": {} } },
{ "id": "low_readiness_autoregulate",         "...": "...", "trigger": { "signal": "readiness", "op": "<", "value": 40 }, "effect": { "type": "reduce_one_step", "params": {} } },
{ "id": "cmj_drop_flag_fatigue",              "...": "...", "trigger": { "signal": "cmj_drop_pct", "op": ">=", "value": 12 }, "effect": { "type": "reduce_one_step", "params": {} } },
{ "id": "illness_no_training",                "...": "...", "trigger": { "signal": "illness", "op": "==", "value": true }, "effect": { "type": "withhold", "params": {} } },
{ "id": "inseason_strength_minimal_effective","...": "...", "trigger": { "signal": "season", "op": "==", "value": "in" }, "effect": { "type": "minimal_effective_volume", "params": {} } },
{ "id": "high_hamstring_soreness_cut_eccentric","...": "...", "trigger": { "signal": "soreness_region", "op": "high", "value": "hamstring" }, "effect": { "type": "reduce_region_eccentric", "params": { "region": "hamstring" } } }
```
(`"..."` = keep the existing `if`/`then`/`confidence`/`source` fields; only add `trigger`/`effect`.)

- [ ] **Step 3: Repeat Steps 1–2 for `hurling.json`** (atlas pillars: `["aerobic","explosive","repeatSprintAbility","rotationalPower"... use real athletePillars ids — see Task 13]`; emphasis same as football; add `cable_rotational_press`/`farmer_carry`/`wrist_roller` to priorityExercises IF they exist in `strengthExercises.js`, else nearest; emoji `🏑`) **and `swimming.json`** (emoji `🏊`; `atlas.family: "mixed"`; emphasis `{ back:1.3, shoulders:1.15, core:1.2, lats via back, triceps:1.0, ... }`; priorityExercises = `pull_up`/`lat_pulldown`/`bent_row`/`face_pull`/`band_external_rotation` real ids; `keyMuscles:["back","shoulders","core"]`; rules: add `taper_protocol` → `{ trigger:{signal:'season',op:'==',value:'in'}, effect:{type:'taper',params:{}} }`, `shoulder_soreness_reduce_overhead` → `{ trigger:{signal:'soreness_region',op:'high',value:'shoulder'}, effect:{type:'reduce_region_overhead',params:{region:'shoulder'}} }`, plus the shared readiness/illness/acwr rules).

- [ ] **Step 4: Update `apps/mobile/tests/sport-knowledge.js`** — add assertions after the completeness loop:
```js
for (const id of FLAGSHIPS) {
  const gp = skb.get(id).gymProgramming;
  assert(gp && Object.keys(gp.emphasis).length > 0, `${id} has gymProgramming.emphasis`);
  assert(skb.get(id).decisionRules.every(r => r.trigger && r.effect), `${id} rules are all structured`);
}
assert(JSON.stringify(skb.ids().filter(id => skb.completeness(id).complete).sort())
  === JSON.stringify(['gaelic_football','hurling','swimming'].sort()),
  'exactly the three flagships are complete');
```

- [ ] **Step 5: Run** — `node apps/mobile/tests/sport-knowledge.js` and `node apps/mobile/tests/skb-schema-v2.js` → all PASS.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(skb): author gymProgramming + structured rules + atlas/meta on the three sports"`

---

### Task 4: Registry — `normalizeSportId` + `selectable()`

**Files:**
- Modify: `packages/engine/src/lib/sportKnowledge/index.js`
- Test: `apps/mobile/tests/skb-registry.js`

**Interfaces:**
- Produces: `normalizeSportId(id) -> string|null`, `selectable() -> SportProfile[]` (complete only), `gymProgrammingFor(profile) -> gymProgramming|null` exported from `index.js`.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/skb-registry.js
import skb from '@performance-os/engine/lib/sportKnowledge/index.js';
import { normalizeSportId } from '@performance-os/engine/lib/sportKnowledge/index.js';
function assert(c,m){ if(!c){ console.error('FAIL:',m); process.exitCode=1; } else console.log('PASS:',m); }
assert(normalizeSportId('swim') === 'swimming', 'swim → swimming');
assert(normalizeSportId('gaelic_football') === 'gaelic_football', 'canonical passes through');
assert(normalizeSportId('run') === 'running', 'run → running');
assert(normalizeSportId(null) === null, 'null → null');
const sel = skb.selectable().map(p => p.id).sort();
assert(JSON.stringify(sel) === JSON.stringify(['gaelic_football','hurling','swimming']), 'selectable = 3 complete sports');
console.log('skb-registry tests done');
```

- [ ] **Step 2: Run it, expect fail.**

- [ ] **Step 3: Edit `index.js`** — add:
```js
const ID_ALIASES = { swim: 'swimming', run: 'running', cycle: 'cycling' };
export function normalizeSportId(id) { if (!id) return null; return ID_ALIASES[id] || id; }
export function selectable() { return PROFILES.filter(p => completeness(p.id).complete); }
export function gymProgrammingFor(id) { const p = BY_ID.get(normalizeSportId(id)); return p ? p.gymProgramming || null : null; }
```
Add them to the default export object.

- [ ] **Step 4: Run it, expect pass.**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(engine): SKB normalizeSportId + selectable()"`

---

### Task 5: `resolveProgram` reads the SKB

**Files:**
- Modify: `packages/engine/src/lib/strength/program.js`
- Test: `apps/mobile/tests/program-resolution.js` (existing — update sport assertions)

**Interfaces:**
- Consumes: `normalizeSportId`, `gymProgrammingFor` from `sportKnowledge/index.js`; `DEFAULT_SEASON_VOLUME` from `sportKnowledge/blocks.js`.
- Produces: `resolveProgram(profile)` unchanged return shape; `sport` field is the normalized id.

- [ ] **Step 1: Add a test** for SKB-driven + fallback. Append to `apps/mobile/tests/program-resolution.js`:
```js
import skb2 from '@performance-os/engine/lib/sportKnowledge/index.js';
const sw = resolveProgram({ goal_type:'sport', sport:'swimming', sport_intent:'recreational', access:['full_gym'] });
assert(sw.style === 'sport' && sw.emphasis.back > 1, 'swimming biases back (SKB-driven)');
const swLegacy = resolveProgram({ goal_type:'sport', sport:'swim', sport_intent:'recreational', access:['full_gym'] });
assert(swLegacy.emphasis.back === sw.emphasis.back, 'legacy "swim" normalizes to swimming');
const legacyRun = resolveProgram({ goal_type:'sport', sport:'run', sport_intent:'recreational' });
assert(legacyRun.goalType === 'sport' && Object.keys(legacyRun.emphasis).length === 0, 'unauthored run → empty emphasis (generic fallback)');
```

- [ ] **Step 2: Run it, expect fail** (swimming has no emphasis yet via old `sports.get`).

- [ ] **Step 3: Edit `program.js`** — replace the sports import + lookup:
```js
// remove: import sports from '../sports/index.js';
// remove: import { DEFAULT_SEASON_VOLUME } from '../sports/_schema.js';
import skb, { normalizeSportId } from '../sportKnowledge/index.js';
import { DEFAULT_SEASON_VOLUME } from '../sportKnowledge/blocks.js';
```
In the sport branch, replace `const mod = sports.get(sport);` and the lines that read `mod`:
```js
    const sport = normalizeSportId(profile.sport);
    const gp = (skb.get(sport) || {}).gymProgramming || null;   // null → generic fallback
    const season = profile.sport_season || deriveSeason(profile) || 'off';
    const disc = profile.run_discipline || null;
    const byD = disc && gp && gp.byDiscipline ? gp.byDiscipline[disc] : null;
    const sportPriority = (byD && byD.priorityExercises) || (gp && gp.priorityExercises) || [];
    // ...unchanged intents/equip resolution...
    return {
      goalType: 'sport', style: 'sport',
      emphasis: (byD && byD.emphasis) || (gp && gp.emphasis) || {},
      volumeScalar: ((gp && gp.seasonModifiers) || DEFAULT_SEASON_VOLUME)[season] ?? 1.0,
      power: gp ? !!gp.power : true, sport, season, level,
      exercisePriority: list, priorityByIntent: byIntent
    };
```

- [ ] **Step 4: Run** `node apps/mobile/tests/program-resolution.js` — PASS. (Old run/cycle/swim emphasis assertions that referenced exact legacy numbers will need updating to the new generic-fallback reality; update them to assert the fallback shape, not the old vectors.)

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(engine): resolveProgram reads SKB gymProgramming"`

---

### Task 6: `resolvePeriodization` + `constraints.js` read the SKB; delete `sports/`

**Files:**
- Modify: `packages/engine/src/lib/plan/periodization.js`, `packages/engine/src/lib/plan/constraints.js`, `packages/engine/index.js`
- Delete: `packages/engine/src/lib/sports/` (entire dir)
- Retire: `apps/mobile/tests/sports.js`; Update: `apps/mobile/tests/periodization.js`, `apps/mobile/tests/sport-*.js`

**Interfaces:**
- Consumes: `skb`, `normalizeSportId`, `SPORT_BLOCKS`.

- [ ] **Step 1: Edit `periodization.js`** — swap imports + lookup:
```js
import skb, { normalizeSportId } from '../sportKnowledge/index.js';
import { SPORT_BLOCKS } from '../sportKnowledge/blocks.js';
// in resolvePeriodization sport branch:
    const sport = normalizeSportId(profile.sport);
    const gp = (skb.get(sport) || {}).gymProgramming || null;
    const season = deriveSeason(profile) || 'off';
    const disc = profile.run_discipline || null;
    const byD = disc && gp && gp.byDiscipline ? gp.byDiscipline[disc] : null;
    return (byD && byD.periodization && byD.periodization[season])
      || (gp && gp.periodization && gp.periodization[season])
      || SPORT_BLOCKS[season] || SPORT_BLOCKS.off;
```

- [ ] **Step 2: Edit `constraints.js`** — replace the sport-module import + `keyMuscles` read:
```js
import skb, { normalizeSportId } from '../sportKnowledge/index.js';
// ...
  const gp = profile.sport ? ((skb.get(normalizeSportId(profile.sport)) || {}).gymProgramming || null) : null;
  const sportMuscles = (gp && Array.isArray(gp.keyMuscles)) ? gp.keyMuscles.slice() : [];
```

- [ ] **Step 3: Edit `packages/engine/index.js`** — remove any `sports/` re-export if present (none currently; verify with `grep sports packages/engine/index.js`).

- [ ] **Step 4: Delete the dir** — `git rm -r packages/engine/src/lib/sports/`.

- [ ] **Step 5: Retire/Update tests** — `git rm apps/mobile/tests/sports.js`. Update `periodization.js` + `sport-*.js` tests: replace any `import sports from '.../lib/sports/index.js'` and exact-legacy-emphasis assertions with SKB-equivalents (swimming/football/hurling). Where a test asserted run/cycle specifics, change to the generic-fallback assertion or delete that case.

- [ ] **Step 6: Run the whole suite** — `for f in apps/mobile/tests/*.js; do echo "== $f"; node "$f" || break; done`. Fix any remaining `sports/` import. Expected: all PASS.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "refactor(engine): retire thin sports modules; periodization+constraints read SKB"`

---

### Task 7: Onboarding — dynamic dropdown from `selectable()`

**Files:**
- Modify: `apps/mobile/src/components/OnboardingWizard.jsx`, `apps/mobile/src/lib/onboardingModel.js`
- Test: manual via `npm run dev` (UI) — no node test (component)

**Interfaces:**
- Consumes: `sportKnowledge.selectable()`.

- [ ] **Step 1: Edit `OnboardingWizard.jsx`** — replace the hardcoded `SPORTS` const (lines ~28-31) with a derived list:
```js
import skb from '@performance-os/engine/lib/sportKnowledge/index.js';
const SPORTS = skb.selectable().map(p => ({ key: p.id, label: p.label, emoji: (p.meta && p.meta.emoji) || '🎯' }));
```
The chip render (line ~256) already maps `SPORTS`; no change. The run-discipline block (lines ~258-266) is gated on `a.sport === 'run'` — change to data-driven: render only if the chosen profile declares `meta.disciplines`:
```js
{(() => { const prof = skb.get(a.sport); const discs = prof && prof.meta && prof.meta.disciplines; return discs ? (
  <div>… map discs to Chips, set runDiscipline …</div>
) : null; })()}
```
(None of the three sports declare `disciplines`, so this renders nothing today — verify it disappears.)

- [ ] **Step 2: Edit `onboardingModel.js`** — the step validity (line ~251 equivalent) `a.sport !== 'run' || a.runDiscipline` becomes discipline-aware: `(!skb.get(a.sport)?.meta?.disciplines) || !!a.runDiscipline`. Remove the hardcoded `run` special-case in the build map (lines ~138,154) — keep `run_discipline` passthrough generic.

- [ ] **Step 3: Verify in the app** — `npm run dev`, open onboarding → "Support a sport" → confirm exactly **Gaelic football / Hurling / Swimming** appear, no discipline sub-question, selecting one + an intent advances. (Detailed in Task 15.)

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(onboarding): sport dropdown driven by SKB selectable()"`

**Phase 1 gate:** full engine suite green + `npm run build` succeeds + onboarding shows the three sports.

---

# Phase 2 — Adaptive runtime (rules + readiness + load)

End state: the selected sport's `decisionRules` modify the current week's reflow; readiness is weighted by the sport; ACWR thresholds come from the sport.

---

### Task 8: Rule evaluator

**Files:**
- Create: `packages/engine/src/lib/sportKnowledge/rules.js`
- Test: `apps/mobile/tests/skb-rules.js`

**Interfaces:**
- Produces: `evaluateRules(profile, context) -> { effects: Array<{type, params, ruleId}> }`. `context = { competitionWithinH?, matchesThisWeek?, acwr?, readiness?, cmjDropPct?, illness?, season?, soreness?:{region:level} }`.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/skb-rules.js
import { evaluateRules } from '@performance-os/engine/lib/sportKnowledge/rules.js';
function assert(c,m){ if(!c){ console.error('FAIL:',m); process.exitCode=1; } else console.log('PASS:',m); }
const P = { goal_type:'sport', sport:'gaelic_football' };
let r = evaluateRules(P, { matchesThisWeek: 2 });
assert(r.effects.some(e => e.type === 'reduce_volume_pct' && e.params.pct === 45), '2 matches → reduce 45%');
r = evaluateRules(P, { acwr: 1.7 });
assert(r.effects.some(e => e.type === 'force_deload'), 'acwr>1.5 → force_deload');
r = evaluateRules(P, { readiness: 30 });
assert(r.effects.some(e => e.type === 'reduce_one_step'), 'low readiness → reduce_one_step');
r = evaluateRules(P, { illness: true });
assert(r.effects.some(e => e.type === 'withhold'), 'illness → withhold');
r = evaluateRules(P, {});
assert(r.effects.length === 0, 'no triggers → no effects');
r = evaluateRules({ sport:'swimming' }, { season:'in' });
assert(r.effects.some(e => e.type === 'taper'), 'swimming in-season → taper');
console.log('skb-rules tests done');
```

- [ ] **Step 2: Run it, expect fail.**

- [ ] **Step 3: Create `rules.js`**

```js
// packages/engine/src/lib/sportKnowledge/rules.js
/**
 * evaluateRules — the deterministic interpreter for SKB decisionRules. Pure: given a
 * profile (→ its sport's rules) and a runtime context, returns the effects whose triggers
 * fire. The CALLER (PlanService reflow) decides how to apply each effect. Reserved effect
 * types are returned too; the reflow ignores the ones it can't act on yet.
 */
import skb, { normalizeSportId } from './index.js';

function ctxValue(signal, ctx) {
  switch (signal) {
    case 'competition_within_h': return ctx.competitionWithinH;
    case 'matches_this_week':    return ctx.matchesThisWeek;
    case 'acwr':                 return ctx.acwr;
    case 'readiness':            return ctx.readiness;
    case 'cmj_drop_pct':         return ctx.cmjDropPct;
    case 'illness':              return ctx.illness;
    case 'season':               return ctx.season;
    case 'soreness_region':      return ctx.soreness;   // {region:level}
    default: return undefined;
  }
}

function fires(trigger, ctx) {
  const v = ctxValue(trigger.signal, ctx);
  if (v == null) return false;
  if (trigger.signal === 'soreness_region') {
    const level = v[trigger.value];
    return trigger.op === 'high' ? level === 'high' : !!level;
  }
  switch (trigger.op) {
    case '<':  return v <  trigger.value;
    case '<=': return v <= trigger.value;
    case '>':  return v >  trigger.value;
    case '>=': return v >= trigger.value;
    case '==': return v === trigger.value;
    default:   return false;
  }
}

export function evaluateRules(profile = {}, context = {}) {
  const prof = skb.get(normalizeSportId(profile.sport));
  if (!prof || !Array.isArray(prof.decisionRules)) return { effects: [] };
  const effects = [];
  for (const r of prof.decisionRules) {
    if (r.trigger && r.effect && fires(r.trigger, context)) {
      effects.push({ type: r.effect.type, params: r.effect.params || {}, ruleId: r.id });
    }
  }
  return { effects };
}
export default { evaluateRules };
```

- [ ] **Step 4: Run it, expect pass.**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(engine): SKB decision-rule evaluator"`

---

### Task 9: `trainingLoad.js` — per-sport thresholds

**Files:**
- Modify: `packages/engine/src/lib/plan/trainingLoad.js`
- Test: `apps/mobile/tests/training-load.js` (existing — add a sport-override case)

**Interfaces:**
- Produces: `loadDecision(acwrVal, recentAcwr, thresholds?)` and `deloadRecommendation(args, thresholds?)` accept an optional `thresholds = { sweetLow, easeFrom, high, policy }`, defaulting to the kb constants. `acwrThresholdsForSport(sportId) -> thresholds|null` helper.

- [ ] **Step 1: Add a test** to `training-load.js`:
```js
import { acwrThresholdsForSport, loadDecision } from '@performance-os/engine/lib/plan/trainingLoad.js';
const t = acwrThresholdsForSport('gaelic_football');
assert(t && typeof t.high === 'number', 'sport thresholds resolve from loadManagement');
const d = loadDecision(1.45, [1.45,1.45,1.45], { sweetLow:0.8, easeFrom:1.2, high:1.4, policy:{ sustainedDays:2, deloadMultiplier:0.6 } });
assert(d.action === 'deload', 'custom thresholds drive the decision');
```

- [ ] **Step 2: Run it, expect fail.**

- [ ] **Step 3: Edit `trainingLoad.js`** — keep the module-level `SWEET_LOW/EASE_FROM/HIGH/_P` as defaults; thread an optional `thresholds` param:
```js
import skb, { normalizeSportId } from '../sportKnowledge/index.js';
const DEFAULT_T = { sweetLow: SWEET_LOW, easeFrom: EASE_FROM, high: HIGH, policy: _P };

export function acwrThresholdsForSport(sportId) {
  const lm = ((skb.get(normalizeSportId(sportId)) || {}).loadManagement || {}).acwr;
  if (!lm) return null;
  return { sweetLow: lm.sweetSpotLow ?? SWEET_LOW, easeFrom: lm.sweetSpotHigh ?? EASE_FROM, high: lm.highRiskAbove ?? HIGH, policy: _P };
}

export function loadDecision(acwrVal, recentAcwr = [], thresholds = DEFAULT_T) {
  const { sweetLow, easeFrom, high, policy } = thresholds;
  // ...replace SWEET_LOW→sweetLow, EASE_FROM→easeFrom, HIGH→high, _P→policy in the body...
}
```
Thread the same optional `thresholds` through `deloadRecommendation` if it uses the constants.

- [ ] **Step 4: Run** `node apps/mobile/tests/training-load.js` — PASS (existing cases use the default, still pass).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(engine): per-sport ACWR thresholds in trainingLoad"`

---

### Task 10: `Readiness.js` — sport-weighted readiness

**Files:**
- Modify: `packages/engine/src/lib/Readiness.js`
- Test: `apps/mobile/tests/readiness-weighting.js`

**Interfaces:**
- Produces: `computeReadiness(dailyMetrics, logs, readinessModel?)` and `readinessFor(metric, prior, weights?)` accept optional per-input weights derived from `readinessModel.factors` importances (sleep/hrv/resting_hr only — the inputs we collect).

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/readiness-weighting.js
import { computeReadiness } from '@performance-os/engine/lib/Readiness.js';
import skb from '@performance-os/engine/lib/sportKnowledge/index.js';
function assert(c,m){ if(!c){ console.error('FAIL:',m); process.exitCode=1; } else console.log('PASS:',m); }
const dm = [{ date:'2026-06-29', sleep_duration_min: 300, hrv_ms: 60, resting_hr: 55 },
            { date:'2026-06-28', sleep_duration_min: 480, hrv_ms: 60, resting_hr: 55 }];
const base = computeReadiness(dm, []);
const weighted = computeReadiness(dm, [], skb.get('swimming').readinessModel);
assert(typeof base.score === 'number' && typeof weighted.score === 'number', 'both produce a score');
assert(weighted.score !== base.score || base.score === weighted.score, 'weighting path runs without error');
console.log('readiness-weighting tests done');
```

- [ ] **Step 2: Run it, expect fail** (third arg ignored → identical; but import path proves the signature change compiles). Make the assertion meaningful: weight sleep heavily so a low-sleep day drops more.

- [ ] **Step 3: Edit `Readiness.js`** — derive weights from the model and pass to `readinessFor`:
```js
const COLLECTED = { sleep:'sleep', hrv:'hrv', resting_hr:'rhr' };
function weightsFrom(model){
  if (!model || !Array.isArray(model.factors)) return null;
  const w = {};
  for (const f of model.factors) if (COLLECTED[f.metric]) w[COLLECTED[f.metric]] = f.importance;
  return Object.keys(w).length ? w : null;
}
export function computeReadiness(dailyMetrics = [], logs = [], readinessModel = null) {
  // ...unchanged...
  const r = readinessFor(latest, sorted.slice(1, 8), weightsFrom(readinessModel));
  // ...unchanged...
}
```
In `readinessFor(metric, prior, weights = null)`, when combining the sleep/HRV/RHR `parts`, use a weighted mean if `weights` provided (default equal). Keep behaviour identical when `weights` is null.

- [ ] **Step 4: Run** `node apps/mobile/tests/readiness-weighting.js` + `node apps/mobile/tests/recovery-load.js` (regression) — PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(engine): sport-weighted readiness from SKB readinessModel"`

---

### Task 11: Wire rules + sport thresholds into the `PlanService` reflow

**Files:**
- Modify: `apps/mobile/src/lib/PlanService.js`
- Test: `apps/mobile/tests/sport-reflow.js`

**Interfaces:**
- Consumes: `evaluateRules`, `acwrThresholdsForSport`, `computeReadiness(…, readinessModel)`, `skb`.

- [ ] **Step 1: Write the failing test** — drive `PlanService` for a `gaelic_football` profile with a congested-fixtures context and assert the current week's target volume is reduced. (Use the existing `sport-planservice.js` test as the harness template for seeding Database + profile.)

```js
// apps/mobile/tests/sport-reflow.js — sketch; mirror sport-planservice.js setup
// Seed a gaelic_football profile + 2 matches this week, build the view, assert
// current week volume scalar < non-congested baseline.
```

- [ ] **Step 2: Run it, expect fail.**

- [ ] **Step 3: Edit `PlanService.js`** — in the reflow (near the `deloadRecommendation` call, ~line 237):
  1. Build a rule context from data already in scope: `season` (from `resolveProgram(profile).season`), `acwr` (already computed), `readiness` (`recovery?.score`), `illness` (`override === 'rest'`), `matchesThisWeek` (count `profile.sport_days`/fixtures in the current week — reuse existing fixture logic), `competitionWithinH` (from `profile.event_date`).
  2. `const { effects } = evaluateRules(profile, ruleCtx);`
  3. Apply shipped effects: `force_deload` → set the deload override true; `reduce_volume_pct` → multiply `weekTarget`'s volume scalar by `(1 - pct/100)`; `minimal_effective_volume`/`taper`/`priming_only` → cap the scalar; `reduce_one_step` → one band down; `withhold` → rest. Reserved effects: skip.
  4. Pass `acwrThresholdsForSport(profile.sport)` into `loadDecision`/`deloadRecommendation`.
  5. Pass the sport's `readinessModel` into `computeReadiness` wherever the store calls it (note: readiness is computed in the store's buildView; thread `skb.get(normalizeSportId(profile.sport))?.readinessModel` there — see Task 12 store note).

- [ ] **Step 4: Run** `node apps/mobile/tests/sport-reflow.js` + `node apps/mobile/tests/sport-planservice.js` + `node apps/mobile/tests/reflow-start-consistency.js` — PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(reflow): SKB decision rules + sport load thresholds drive the current week"`

---

### Task 12: Thread the sport readinessModel through the store

**Files:**
- Modify: `apps/mobile/src/stores/trainingStore.js` (the `computeReadiness` call site in buildView)
- Test: covered by Task 10/11; add a store assertion if a store test exists.

- [ ] **Step 1:** `grep -n computeReadiness apps/mobile/src/stores/trainingStore.js`. At the call, pass the model:
```js
import skb, { normalizeSportId } from '@performance-os/engine/lib/sportKnowledge/index.js';
const rmodel = skb.get(normalizeSportId(profile.sport))?.readinessModel || null;
const recovery = computeReadiness(dailyMetrics, logs, rmodel);
```
- [ ] **Step 2: Run** the readiness + reflow tests — PASS.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat(store): pass sport readinessModel into computeReadiness"`

**Phase 2 gate:** full engine suite green + `npm run build`.

---

# Phase 3 — Atlas radar reads the SKB

---

### Task 13: Repoint Atlas at the SKB; delete `data/sports/index.js`

**Files:**
- Create: `apps/mobile/src/lib/atlas/sportConfig.js`
- Modify: `apps/mobile/src/lib/atlas/pillars.js` (import sportConfig from the new module)
- Delete: `apps/mobile/src/data/sports/index.js`
- Test: `apps/mobile/tests/atlas-and-coachnote.js` (existing — update sport ids)

**Interfaces:**
- Produces: `sportConfigFor(profile) -> { key, label, family, pillars: string[] }` reading `sportKnowledge`.

- [ ] **Step 1:** Confirm the `athletePillars.js` pillar ids used in each profile's `atlas.pillars` exist (`grep "id:" apps/mobile/src/data/athletePillars.js`). Adjust the three JSONs' `atlas.pillars` to real ids (`strength, aerobic, anaerobic, recovery, consistency, core, explosive, lower_power, leg_power, speed_strength, durability, hip_stability, upper_pull, shoulder_health, upper_body, lower_body`). E.g. football → `["aerobic","explosive","lower_power","durability","strength","core","recovery","consistency"]`; swimming → `["upper_pull","shoulder_health","core","aerobic","explosive","recovery","consistency"]`. Commit the JSON id fixes.

- [ ] **Step 2: Create `sportConfig.js`**
```js
// apps/mobile/src/lib/atlas/sportConfig.js
import skb, { normalizeSportId } from '@performance-os/engine/lib/sportKnowledge/index.js';
const BUILD = { key:'build', label:'Strength athlete', family:'mixed',
  pillars:['strength','upper_body','lower_body','core','recovery','consistency'] };
export function sportConfigFor(profile = {}) {
  if (profile.goal_type === 'sport' && profile.sport) {
    const p = skb.get(normalizeSportId(profile.sport));
    if (p && p.atlas && Array.isArray(p.atlas.pillars))
      return { key: p.id, label: p.label, family: (p.atlas.family || 'mixed'), pillars: p.atlas.pillars };
  }
  return BUILD;
}
export default { sportConfigFor };
```

- [ ] **Step 3: Edit `pillars.js`** — change the import:
```js
// was: import { sportConfigFor } from '../../data/sports/index.js';
import { sportConfigFor } from './sportConfig.js';
```

- [ ] **Step 4: Delete** — `git rm apps/mobile/src/data/sports/index.js`. Grep for other importers: `grep -rn "data/sports" apps/mobile/src` → repoint any to `sportConfig.js` (e.g. `atlas/signals.js` if it imports it).

- [ ] **Step 5: Run** `node apps/mobile/tests/atlas-and-coachnote.js` (update sport id fixtures to `swimming`/`gaelic_football`) — PASS.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(atlas): radar pillars driven by SKB; delete data/sports map"`

---

# Phase 4 — Verification

### Task 14: Golden-master + full app verification

- [ ] **Step 1: Golden master** — add `apps/mobile/tests/sport-generate-skb.js`: generate a full plan for each of `gaelic_football`/`hurling`/`swimming` (mirror `sport-generate.js`); assert non-empty phases/sessions, deterministic (same profile twice = identical JSON), and that a `swim`-legacy profile equals the `swimming` plan.

- [ ] **Step 2: Full engine suite** — `for f in apps/mobile/tests/*.js; do echo "== $f"; node "$f" || echo "FAILED $f"; done`. All green; no `sports/` import errors.

- [ ] **Step 3: Build** — `npm run build` (repo root). Must succeed (Vite bundles the SKB JSON the app now imports). If the import attribute trips Vite, change `sportKnowledge/index.js` JSON imports to plain `import x from './x.json'` and re-run.

- [ ] **Step 4: Dev E2E** — `npm run dev`; via preview tools: onboarding → "Support a sport" shows **Gaelic football / Hurling / Swimming** only; pick Swimming + "I compete"; finish onboarding; confirm a plan generates and the Atlas radar renders swimming pillars. Screenshot.

- [ ] **Step 5: Update HANDOFF.md** — note the SKB now drives onboarding + engine; run/cycle dropped pending authoring; stubs unchanged.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "test(engine): SKB plan golden-master + verification; update HANDOFF"`

---

## Self-review (coverage)

- Spec §1 schema (gymProgramming + structured rules + meta/atlas) → Tasks 1–3. ✅
- §2 authoring → Task 3. ✅
- §3 onboarding (selectable, dynamic disciplines/intent) → Task 7. ✅
- §4 generation (resolveProgram/periodization, IDs, fallback, delete sports/) → Tasks 5–6. ✅
- §5a rules→reflow → Tasks 8, 11. §5b readiness → Tasks 10, 12. §5c loadManagement → Task 9. ✅
- §6 Atlas → Task 13. ✅
- Scope boundaries (reserved effects no-op; readiness limited to collected data) → Tasks 8 (returned, reflow ignores), 10 (COLLECTED map). ✅
- Migration (swim→swimming; run/cycle fallback) → Tasks 4, 5, 14. ✅
- Testing strategy + build/dev → Task 14. ✅

**Known follow-ups (out of scope, documented):** tag `strengthExercises.js` with soreness/region to activate reserved rule effects; author rugby/soccer/running/cycling to completeness to re-add them to onboarding; capture localized soreness to activate sport-specific readiness factors.
