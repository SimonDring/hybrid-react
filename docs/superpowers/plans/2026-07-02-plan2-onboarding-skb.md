# Plan 2 — Sport/Position-driven Onboarding + SKB Demand Wiring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the onboarding sport list derive from the Sport Knowledge Base (SKB), capture position + session-duration + measurable-training-age + movement-competency into the Athlete Model, and populate the Performance Model's `demandProfile` from the SKB — without changing live plan generation.

**Architecture:** New pure engine modules resolve which SKB sports are selectable (`selectable.js`), map an SKB sport to the legacy engine sport that plans it (`sportEngineBinding.js`), map SKB quality vocabulary to Performance-Model quality ids (`sportQualityMap.js`), and build a demand profile from the SKB (`demandProfile.js`). `derivePerformanceModel` populates `demandProfile`. The adapters carry the SKB sport id on the model while preserving the exact legacy engine `sport`/`run_discipline` in `meta.enginePassthrough`, so the round-trip stays byte-identical and the golden master (now green + CI-gated) is the backward-compat gate. Onboarding is revised to consume these.

**Tech Stack:** Plain ES modules (`"type":"module"`), node test scripts under `apps/mobile/tests/*.js` run via the Sprint-0 runner (`npm test`), engine imported via `@performance-os/engine/...`. React wizard uses the existing `Chip`/`OptionGrid`/`Field`/slider primitives.

## Global Constraints

- **Purity/determinism:** every function in `packages/engine/src/lib/{sportKnowledge,performance,adapters}` and `src/data/` is PURE — no `Date.now()`, no argless `new Date()`, no `Math.random()`. `asOf` is injected. `buildDemandProfile`/`derivePerformanceModel` import in-package SKB data directly (same pattern as `estimation.js` importing `qualities`/`capabilityPriors`) — no signature change.
- **Test harness:** node scripts under `apps/mobile/tests/`; the shared `assert(cond,msg)` helper (copy it into each new file) sets `process.exitCode = 1` on failure; a file "fails" if it exits non-zero. Run one with `node apps/mobile/tests/<file>.js`; run the whole gate with `npm test`.
- **SKB accessor API (verbatim):** `import * as SKB from '@performance-os/engine/lib/sportKnowledge/index.js'` → `SKB.get(id)`, `SKB.has(id)`, `SKB.all()`, `SKB.ids()`, `SKB.section(id,name)`, `SKB.completeness(id) → {id,score,complete,thin}`, `SKB.normalizeSportId(id)` (aliases `swim→swimming`, `run→running`, `cycle→cycling`).
- **SKB data shapes (verbatim):** `get(id).physicalProfile.qualities` is an object `{ qualityName: { importance:1..10, why, confidence, evidenceLevel, source } }`. `section(id,'positions')` is an array of `{ name, role, ..., primaryQualities:[names], secondaryQualities:[names], commonInjuries:[...] }`. Completeness: flagships score `1`, stubs (`rugby`,`soccer`) score `0`.
- **Performance-Model quality ids (Plan 1, fixed vocabulary):** `maxStrength, hypertrophy, explosiveStrength, reactiveStrength, strengthEndurance, aerobicCapacity, anaerobicCapacity, mobility, stability, robustness`.
- **Live plan is UNCHANGED:** no edits to `PlanGenerator.js`, `lib/plan/`, `lib/strength/`, `lib/injury/`, `PlanService.js`. The engine golden-master (`apps/mobile/tests/golden-master.js`) MUST stay green (no `UPDATE=1`) for all existing archetypes after every onboarding/adapter change.
- **Privacy (Article 11):** no raw vitals in the model (unchanged from Plan 1).
- **Do NOT edit frozen docs:** `docs/foundation/*`, `docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md`, `docs/architecture/TAS.md`. HANDOFF.md / CLAUDE.md are running docs (editable).
- **`npm run dev` must boot** at the end of every app-touching task.

---

## File Structure

**Create (engine):**
- `packages/engine/src/data/sportEngineBinding.js` — SKB sport id → `{ engineSport, discipline }` binding.
- `packages/engine/src/lib/sportKnowledge/selectable.js` — `selectableSports()` + `positionsFor(id)`.
- `packages/engine/src/data/sportQualityMap.js` — SKB quality name → Performance-Model quality id.
- `packages/engine/src/lib/performance/demandProfile.js` — `buildDemandProfile(sportId, positionId)`.

**Modify (engine):**
- `packages/engine/src/lib/performance/derivePerformanceModel.js` — populate `demandProfile`.
- `packages/engine/src/lib/performance/index.js` — re-export `buildDemandProfile`.
- `packages/engine/src/lib/adapters/athleteModelToEngineInput.js` — engine sport/discipline from `meta.enginePassthrough` (exact) else `bindingFor(primarySport)`.
- `packages/engine/src/lib/adapters/profileToAthleteModel.js` — set `primarySport` = SKB id; carry legacy `sport` in `enginePassthrough`.

**Modify (app):**
- `apps/mobile/src/lib/onboardingModel.js` — `BLANK_ANSWERS` new fields; `answersToProfilePatch` backward-compatible; `answersToAthleteModelInputs` enriched.
- `apps/mobile/src/components/OnboardingWizard.jsx` — SKB-driven sport + position steps; 3 new question steps.

**Create (tests — `apps/mobile/tests/`):** `sport-engine-binding.js`, `skb-selectable.js`, `sport-quality-map.js`, `demand-profile.js`, `performance-demand.js`, `adapter-sport-position.js`, `answers-athlete-rich.js`.

**Create/modify (docs):** `docs/architecture/ATHLETE-MODEL.md` (demand section), `HANDOFF.md`, `CLAUDE.md`.

---

## Task 1: SKB→engine binding + selectable sports

**Files:**
- Create: `packages/engine/src/data/sportEngineBinding.js`, `packages/engine/src/lib/sportKnowledge/selectable.js`
- Test: `apps/mobile/tests/sport-engine-binding.js`, `apps/mobile/tests/skb-selectable.js`

**Interfaces:**
- Produces (`sportEngineBinding.js`): `SKB_ENGINE_BINDING` (`{ [skbId]: { engineSport, discipline } }`), `bindingFor(skbId) → { engineSport, discipline }|null`.
- Produces (`selectable.js`): `selectableSports() → [{ id, label }]` (SKB ids that are `completeness().complete` AND have a binding), `positionsFor(skbId) → [{ id, name }]` (id = the position `name`).
- Consumes: `SKB.get/section/completeness/ids/all`.

- [ ] **Step 1: Write the failing tests**

```js
// apps/mobile/tests/sport-engine-binding.js
import { SKB_ENGINE_BINDING, bindingFor } from '@performance-os/engine/data/sportEngineBinding.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }

assert(bindingFor('running_sprint').engineSport === 'run' && bindingFor('running_sprint').discipline === 'sprint', 'T1 running_sprint → run/sprint');
assert(bindingFor('running_long').discipline === 'long', 'T2 running_long → long');
assert(bindingFor('cycling').engineSport === 'cycle' && bindingFor('cycling').discipline === null, 'T3 cycling → cycle');
assert(bindingFor('swimming').engineSport === 'swim', 'T4 swimming → swim');
assert(bindingFor('gaelic_football').engineSport === 'gaa' && bindingFor('hurling').engineSport === 'gaa', 'T5 GAA/hurling → gaa');
assert(bindingFor('triathlon').engineSport === 'run', 'T6 triathlon → run (its binding constraint)');
assert(bindingFor('unknown_sport') === null, 'T7 unknown → null');
```

```js
// apps/mobile/tests/skb-selectable.js
import { selectableSports, positionsFor } from '@performance-os/engine/lib/sportKnowledge/selectable.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }

const sel = selectableSports();
const ids = sel.map(s => s.id);
assert(ids.includes('cycling') && ids.includes('swimming') && ids.includes('running_sprint'), 'T1 flagships selectable');
assert(!ids.includes('rugby') && !ids.includes('soccer'), 'T2 stubs (score 0) excluded');
assert(sel.every(s => s.id && s.label), 'T3 each has id + label');

const pos = positionsFor('cycling');
assert(pos.length === 6 && pos[0].name && pos[0].id === pos[0].name, 'T4 cycling positions from SKB (id=name)');
assert(positionsFor('rugby').length === 0, 'T5 stub positions → empty (safe)');
assert(positionsFor('unknown').length === 0, 'T6 unknown → empty (never throws)');
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node apps/mobile/tests/sport-engine-binding.js` then `node apps/mobile/tests/skb-selectable.js`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write minimal implementation**

```js
// packages/engine/src/data/sportEngineBinding.js
// Maps an SKB sport id to the LIVE engine sport module (+ discipline) that plans it, so the
// legacy plan generator still biases correctly while onboarding/demand reason in SKB ids.
// Authoring a new flagship SKB profile only needs an entry here (default is a best-effort guess).
export const SKB_ENGINE_BINDING = {
  running_sprint: { engineSport: 'run', discipline: 'sprint' },
  running_middle: { engineSport: 'run', discipline: 'middle' },
  running_long:   { engineSport: 'run', discipline: 'long' },
  cycling:        { engineSport: 'cycle', discipline: null },
  swimming:       { engineSport: 'swim', discipline: null },
  gaelic_football:{ engineSport: 'gaa', discipline: null },
  hurling:        { engineSport: 'gaa', discipline: null },
  triathlon:      { engineSport: 'run', discipline: null }, // run is triathlon's binding constraint (SKB)
};

export function bindingFor(skbId) {
  return SKB_ENGINE_BINDING[skbId] || null;
}
```

```js
// packages/engine/src/lib/sportKnowledge/selectable.js
// The onboarding sport list is DERIVED from the SKB: a sport is selectable iff its profile is
// sufficiently authored (completeness.complete) AND has an engine binding to plan it. Authoring a
// new flagship profile + adding its binding auto-adds it to onboarding — no wizard change needed.
import * as SKB from './index.js';
import { bindingFor } from '../../data/sportEngineBinding.js';

const humanize = (id) => id.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

export function selectableSports() {
  return SKB.ids()
    .filter((id) => SKB.completeness(id).complete && bindingFor(id))
    .map((id) => {
      const p = SKB.get(id);
      const label = (p && p.meta && (p.meta.label || p.meta.name)) || humanize(id);
      return { id, label };
    });
}

export function positionsFor(skbId) {
  const positions = SKB.section(skbId, 'positions');
  if (!Array.isArray(positions)) return [];
  return positions.map((pos) => ({ id: pos.name, name: pos.name }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node apps/mobile/tests/sport-engine-binding.js` && `node apps/mobile/tests/skb-selectable.js`
Expected: all `PASS:`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/data/sportEngineBinding.js packages/engine/src/lib/sportKnowledge/selectable.js apps/mobile/tests/sport-engine-binding.js apps/mobile/tests/skb-selectable.js
git commit -m "feat(engine): SKB→engine binding + SKB-derived selectable sports"
```

---

## Task 2: SKB quality map + demand profile

**Files:**
- Create: `packages/engine/src/data/sportQualityMap.js`, `packages/engine/src/lib/performance/demandProfile.js`
- Test: `apps/mobile/tests/sport-quality-map.js`, `apps/mobile/tests/demand-profile.js`

**Interfaces:**
- Produces (`sportQualityMap.js`): `SKB_TO_PM_QUALITY` (`{ [skbQuality]: pmQualityId }`), `mapSkbQuality(name) → pmQualityId|null`.
- Produces (`demandProfile.js`): `buildDemandProfile(sportId, positionId) → [{ qualityId, importance, source:'skb', evidence }]` (importance 0..1; aggregated by PM quality taking the MAX; position `primaryQualities` boosted to ≥0.9; `null`/empty-safe).
- Consumes: `SKB.get/section`, `mapSkbQuality`.

- [ ] **Step 1: Write the failing tests**

```js
// apps/mobile/tests/sport-quality-map.js
import { mapSkbQuality, SKB_TO_PM_QUALITY } from '@performance-os/engine/data/sportQualityMap.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }

assert(mapSkbQuality('explosivePower') === 'explosiveStrength', 'T1 explosivePower → explosiveStrength');
assert(mapSkbQuality('aerobicEndurance') === 'aerobicCapacity', 'T2 aerobicEndurance → aerobicCapacity');
assert(mapSkbQuality('relativeStrength') === 'maxStrength' && mapSkbQuality('maxStrength') === 'maxStrength', 'T3 rel/max strength → maxStrength');
assert(mapSkbQuality('reactiveStrength') === 'reactiveStrength', 'T4 reactiveStrength kept');
assert(mapSkbQuality('durability') === 'robustness', 'T5 durability → robustness');
assert(mapSkbQuality('sprintSpeed') === null && mapSkbQuality('coordination') === null, 'T6 unmapped sport-skill qualities → null');
assert(mapSkbQuality('nonsense') === null, 'T7 unknown → null');
```

```js
// apps/mobile/tests/demand-profile.js
import { buildDemandProfile } from '@performance-os/engine/lib/performance/demandProfile.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }

const cyc = buildDemandProfile('cycling', null);
assert(Array.isArray(cyc) && cyc.length > 0, 'T1 cycling yields a demand profile');
assert(cyc.every(d => d.qualityId && d.importance >= 0 && d.importance <= 1 && d.source === 'skb'), 'T2 shape: qualityId + 0..1 importance + source');
const aero = cyc.find(d => d.qualityId === 'aerobicCapacity');
assert(aero && aero.importance >= 0.9, 'T3 cycling aerobicCapacity is a high demand (importance 10 → ~1.0)');
// no duplicate quality ids (aggregated)
assert(new Set(cyc.map(d => d.qualityId)).size === cyc.length, 'T4 one entry per PM quality (aggregated, no dupes)');

// position boost: a climber elevates its primary qualities
const climber = buildDemandProfile('cycling', 'GC / Climber (road)');
const relS = climber.find(d => d.qualityId === 'maxStrength');
assert(relS && relS.importance >= 0.85, 'T5 position primaryQualities boosted (relativeStrength→maxStrength ≥0.85)');

// safety
assert(Array.isArray(buildDemandProfile('unknown_sport', null)) && buildDemandProfile('unknown_sport', null).length === 0, 'T6 unknown sport → [] (never throws)');
assert(buildDemandProfile('cycling', 'no-such-position').length > 0, 'T7 unknown position falls back to base demand');
```

- [ ] **Step 2: Run tests to verify they fail**

Run both files. Expected: FAIL — modules not found.

- [ ] **Step 3: Write minimal implementation**

```js
// packages/engine/src/data/sportQualityMap.js
// SKB physicalProfile quality vocabulary → the Performance-Model quality ids (Plan 1's fixed set).
// SKB qualities with no Performance-Model home yet (sport-skill / speed qualities) map to null and
// are dropped from the demand profile — documented here, not invented into the strength vocabulary.
export const SKB_TO_PM_QUALITY = {
  maxStrength: 'maxStrength',
  relativeStrength: 'maxStrength',
  explosivePower: 'explosiveStrength',
  reactiveStrength: 'reactiveStrength',
  aerobicEndurance: 'aerobicCapacity',
  anaerobicEndurance: 'anaerobicCapacity',
  repeatSprintAbility: 'anaerobicCapacity',
  mobility: 'mobility',
  stability: 'stability',
  balance: 'stability',
  durability: 'robustness',
  // UNMAPPED (return null — future quality expansion / sport-skill layer, not this sprint):
  //   sprintSpeed, acceleration, deceleration, changeOfDirection, coordination,
  //   rotationalPower, gripStrength, neckStrength
};

export function mapSkbQuality(name) {
  return SKB_TO_PM_QUALITY[name] || null;
}
```

```js
// packages/engine/src/lib/performance/demandProfile.js
// Builds a Performance-Model demand profile from the SKB: base importances from the sport's
// physicalProfile, elevated for the chosen position's primary qualities. Pure; imports in-package
// SKB data directly (same pattern as estimation.js). Never throws on unknown sport/position.
import * as SKB from '../sportKnowledge/index.js';
import { mapSkbQuality } from '../../data/sportQualityMap.js';

const PRIMARY_FLOOR = 0.9;   // a position's primary qualities are at least this demanding

export function buildDemandProfile(sportId, positionId) {
  const profile = SKB.get(sportId);
  if (!profile || !profile.physicalProfile || !profile.physicalProfile.qualities) return [];

  // base: max importance per PM quality across all contributing SKB qualities
  const byPm = new Map(); // pmId → { importance, evidence }
  for (const [skbName, q] of Object.entries(profile.physicalProfile.qualities)) {
    const pm = mapSkbQuality(skbName);
    if (!pm || !q || typeof q.importance !== 'number') continue;
    const importance = Math.min(1, Math.max(0, q.importance / 10));
    const cur = byPm.get(pm);
    if (!cur || importance > cur.importance) byPm.set(pm, { importance, evidence: `skb:${sportId}:${skbName}` });
  }

  // position boost: elevate the position's primaryQualities to the floor
  const positions = SKB.section(sportId, 'positions') || [];
  const pos = positions.find((p) => p.name === positionId);
  if (pos && Array.isArray(pos.primaryQualities)) {
    for (const skbName of pos.primaryQualities) {
      const pm = mapSkbQuality(skbName);
      if (!pm) continue;
      const cur = byPm.get(pm) || { importance: 0, evidence: `skb:${sportId}:position` };
      if (cur.importance < PRIMARY_FLOOR) byPm.set(pm, { importance: PRIMARY_FLOOR, evidence: `skb:${sportId}:pos:${positionId}` });
    }
  }

  return [...byPm.entries()].map(([qualityId, v]) => ({ qualityId, importance: v.importance, source: 'skb', evidence: v.evidence }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run both files. Expected: all `PASS:`. (If T3 fails, check the SKB cycling `aerobicEndurance.importance` is 10 → 1.0; the assertion allows ≥0.9.)

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/data/sportQualityMap.js packages/engine/src/lib/performance/demandProfile.js apps/mobile/tests/sport-quality-map.js apps/mobile/tests/demand-profile.js
git commit -m "feat(engine): SKB quality map + demand profile builder"
```

---

## Task 3: Populate demandProfile in the Performance Model

**Files:**
- Modify: `packages/engine/src/lib/performance/derivePerformanceModel.js`, `packages/engine/src/lib/performance/index.js`
- Test: `apps/mobile/tests/performance-demand.js`

**Interfaces:**
- Consumes: `buildDemandProfile` (Task 2).
- Produces: `derivePerformanceModel(model, asOf)` unchanged signature; `demandProfile` is now the SKB demand array when `model.sportingContext.primarySport` resolves, else `null`. `index.js` also re-exports `buildDemandProfile`.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/performance-demand.js
import { createAthleteModel } from '@performance-os/engine/lib/athlete/schema.js';
import { derivePerformanceModel } from '@performance-os/engine/lib/performance/derivePerformanceModel.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }
const ASOF = '2026-07-02';

const sport = createAthleteModel({ sportingContext: { primarySport: 'cycling', position: 'GC / Climber (road)' } });
const pm = derivePerformanceModel(sport, ASOF);
assert(Array.isArray(pm.demandProfile) && pm.demandProfile.length > 0, 'T1 sport athlete → demandProfile populated');
assert(pm.demandProfile.some(d => d.qualityId === 'aerobicCapacity'), 'T2 cycling demand includes aerobicCapacity');
assert(pm.capabilities.length > 0, 'T3 capabilities still derived (unchanged)');

const build = createAthleteModel({ goals: [{ id: 'g', outcome: 'build_muscle', priority: 1 }] });
assert(derivePerformanceModel(build, ASOF).demandProfile === null, 'T4 non-sport → demandProfile null');

const pm2 = derivePerformanceModel(sport, ASOF);
assert(JSON.stringify(pm) === JSON.stringify(pm2), 'T5 deterministic');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/performance-demand.js`
Expected: FAIL — `demandProfile` is `null` for the sport athlete (T1).

- [ ] **Step 3: Modify `derivePerformanceModel.js`**

Add the import at the top (after the existing `estimateCapability` import):
```js
import { buildDemandProfile } from './demandProfile.js';
```
Replace the `demandProfile: null,` line in the returned object with:
```js
    demandProfile: (m.sportingContext && m.sportingContext.primarySport)
      ? (buildDemandProfile(m.sportingContext.primarySport, m.sportingContext.position || null).length
          ? buildDemandProfile(m.sportingContext.primarySport, m.sportingContext.position || null)
          : null)
      : null,
```
In `packages/engine/src/lib/performance/index.js`, add:
```js
export { buildDemandProfile } from './demandProfile.js';
```

- [ ] **Step 4: Run test + the Plan 1 performance-model test (no regression)**

Run: `node apps/mobile/tests/performance-demand.js` (expect all PASS) and `node apps/mobile/tests/performance-model.js` (expect all PASS — Plan 1's test builds models without a sport, so demandProfile stays null there).

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/performance/derivePerformanceModel.js packages/engine/src/lib/performance/index.js apps/mobile/tests/performance-demand.js
git commit -m "feat(engine): populate performance-model demandProfile from the SKB"
```

---

## Task 4: Adapter — carry SKB sport id + exact legacy passthrough

**Files:**
- Modify: `packages/engine/src/lib/adapters/profileToAthleteModel.js`, `packages/engine/src/lib/adapters/athleteModelToEngineInput.js`
- Test: `apps/mobile/tests/adapter-sport-position.js`

**Interfaces:**
- Consumes: `bindingFor` (Task 1), `SKB.normalizeSportId`.
- Produces: `profileToAthleteModel` sets `sportingContext.primarySport` to the SKB id (`running_<disc>` / `normalizeSportId(sport)`), and carries the exact legacy `sport` in `meta.enginePassthrough.sport` (alongside the existing `run_discipline`). `athleteModelToEngineInput` reads engine `sport`/`run_discipline` from `meta.enginePassthrough` when present (exact legacy round-trip), else derives them from `bindingFor(primarySport)` (new onboarding path).

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/adapter-sport-position.js
import { createAthleteModel } from '@performance-os/engine/lib/athlete/schema.js';
import { profileToAthleteModel } from '@performance-os/engine/lib/adapters/profileToAthleteModel.js';
import { athleteModelToEngineInput } from '@performance-os/engine/lib/adapters/athleteModelToEngineInput.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }
const ASOF = '2026-07-02';

// Legacy run → SKB id on the model; exact legacy fields preserved for the engine.
const m = profileToAthleteModel({ goal_type: 'sport', sport: 'run', run_discipline: 'sprint', sport_intent: 'compete', access: ['full_gym'], availability: { days_per_week: 3, days: [] } }, ASOF);
assert(m.sportingContext.primarySport === 'running_sprint', 'T1 legacy run/sprint → SKB primarySport running_sprint');
assert(m.meta.enginePassthrough.sport === 'run' && m.meta.enginePassthrough.run_discipline === 'sprint', 'T2 exact legacy sport+discipline preserved in passthrough');
const e = athleteModelToEngineInput(m);
assert(e.sport === 'run' && e.run_discipline === 'sprint', 'T3 round-trip → legacy engine run/sprint (exact)');

// New onboarding path: only SKB id + position, no passthrough → derive engine sport via binding.
const fresh = createAthleteModel({ goals: [{ id: 'g', outcome: 'improve_sport_performance', priority: 1 }], sportingContext: { primarySport: 'cycling', position: 'Sprinter (road)' } });
const ef = athleteModelToEngineInput(fresh);
assert(ef.sport === 'cycle', 'T4 new path: cycling → engine sport cycle via binding');
assert(ef.goal_type === 'sport', 'T5 sport goal preserved');

// cycle legacy round-trips
const mc = profileToAthleteModel({ goal_type: 'sport', sport: 'cycle', access: ['full_gym'], availability: { days_per_week: 3, days: [] } }, ASOF);
assert(mc.sportingContext.primarySport === 'cycling', 'T6 legacy cycle → cycling');
assert(athleteModelToEngineInput(mc).sport === 'cycle', 'T7 cycle round-trips exactly');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/adapter-sport-position.js`
Expected: FAIL — `primarySport` is `'run'` (not `'running_sprint'`) and no `enginePassthrough.sport`.

- [ ] **Step 3: Modify the adapters**

In `profileToAthleteModel.js`, add the import (with the other adapter imports):
```js
import { normalizeSportId } from '../sportKnowledge/index.js';
```
Add a helper above the function:
```js
// Legacy engine sport (+ run discipline) → SKB profile id. Running splits by discipline; others
// use the alias map. Falls back to normalizeSportId when there's no finer id.
function toSkbSportId(sport, runDiscipline) {
  if (!sport) return null;
  if (sport === 'run') return runDiscipline ? `running_${runDiscipline}` : normalizeSportId('run');
  return normalizeSportId(sport) || sport;
}
```
Change the `sportingContext.primarySport` assignment (currently `p.sport || null`) to:
```js
      primarySport: toSkbSportId(p.sport, p.run_discipline),
```
In the `enginePassthrough` object, ADD `sport` (keep the existing keys):
```js
  if (p.sport != null) enginePassthrough.sport = p.sport;
```

In `athleteModelToEngineInput.js`, add the import:
```js
import { bindingFor } from '../../data/sportEngineBinding.js';
```
Add, after `const pass = (model.meta && model.meta.enginePassthrough) || {};`:
```js
  const binding = bindingFor(sc.primarySport) || {};
```
Change the `sport` and `run_discipline` fields in the returned object to prefer the exact passthrough, else the binding:
```js
    sport: isSport ? (pass.sport ?? binding.engineSport ?? sc.primarySport ?? null) : null,
    ...
    run_discipline: isSport && ((pass.sport ?? binding.engineSport) === 'run')
      ? (pass.run_discipline ?? binding.discipline ?? null) : null,
```

- [ ] **Step 4: Run the new test + BOTH golden masters (no regression)**

Run: `node apps/mobile/tests/adapter-sport-position.js` (expect all PASS).
Run: `node apps/mobile/tests/adapter-to-engine.js` and `node apps/mobile/tests/adapter-from-profile.js` (Plan 1 adapter tests — expect PASS; if T-cases assert `primarySport === 'run'`, update them to the new SKB id `running_*`/`cycling` per this task, since that is the intended new behaviour — do NOT weaken any plan assertion).
Run: `node apps/mobile/tests/athlete-adapter-golden-master.js` and `node apps/mobile/tests/golden-master.js` — BOTH must stay green (the passthrough makes the legacy round-trip exact, so plans are byte-identical).

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/adapters/ apps/mobile/tests/adapter-sport-position.js apps/mobile/tests/adapter-to-engine.js apps/mobile/tests/adapter-from-profile.js
git commit -m "feat(engine): adapters carry SKB sport id + exact legacy engine passthrough"
```

---

## Task 5: Onboarding model — new fields, backward-compatible profile mapping

**Files:**
- Modify: `apps/mobile/src/lib/onboardingModel.js`
- Test: `apps/mobile/tests/answers-athlete-rich.js` (created here; extended in Task 6)

**Interfaces:**
- Consumes: `selectableSports`/`positionsFor` are NOT needed here (they're UI); the model change is data-only.
- Produces: `BLANK_ANSWERS` gains `skbSport: ''` (an SKB id, e.g. `'running_sprint'`/`'cycling'`), `position: ''`, `sessionDurationMin: null`, `resistanceTrainingYears: '', sportYears: '', movementCompetency: {}`. `answersToProfilePatch` stays backward-compatible: when `skbSport` is set it derives the legacy `sport`/`run_discipline` via `bindingFor`; when only the OLD `sport`/`runDiscipline` fields are set (existing callers, golden-master), behaviour is unchanged.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/answers-athlete-rich.js
import { answersToProfilePatch, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }
const A = (o) => ({ ...BLANK_ANSWERS, ...o });

// New SKB sport selection derives the legacy engine sport/discipline.
const p = answersToProfilePatch(A({ goalType: 'sport', skbSport: 'running_sprint', position: '100 m (pure speed / ATP-PC)', daysPerWeek: 3, equipment: ['barbell'] }));
assert(p.sport === 'run' && p.run_discipline === 'sprint', 'T1 skbSport running_sprint → legacy run/sprint');

const pc = answersToProfilePatch(A({ goalType: 'sport', skbSport: 'cycling', daysPerWeek: 3, equipment: ['barbell'] }));
assert(pc.sport === 'cycle' && pc.run_discipline === null, 'T2 skbSport cycling → legacy cycle');

// Backward-compat: OLD fields still work unchanged (this is what the golden-master uses).
const old = answersToProfilePatch(A({ goalType: 'sport', sport: 'run', runDiscipline: 'long', daysPerWeek: 4, equipment: ['barbell'] }));
assert(old.sport === 'run' && old.run_discipline === 'long', 'T3 legacy sport/runDiscipline fields unchanged');

assert('skbSport' in BLANK_ANSWERS && 'position' in BLANK_ANSWERS && 'sessionDurationMin' in BLANK_ANSWERS && 'resistanceTrainingYears' in BLANK_ANSWERS, 'T4 BLANK_ANSWERS has the new fields');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/answers-athlete-rich.js`
Expected: FAIL — new fields/derivation absent.

- [ ] **Step 3: Modify `onboardingModel.js`**

Add the import (with the other engine imports at the top):
```js
import { bindingFor } from '@performance-os/engine/data/sportEngineBinding.js';
```
In `BLANK_ANSWERS`, add (keep every existing field):
```js
  skbSport: '',                 // SKB profile id (e.g. 'running_sprint' | 'cycling'); preferred over `sport`
  position: '',                 // SKB position name
  sessionDurationMin: null,     // minutes per session
  resistanceTrainingYears: '',  // measurable training age (years)
  sportYears: '',               // years in the sport
  movementCompetency: {},       // { squat|hinge|press|pull: 'novice'|'intermediate'|'advanced' }
```
In `answersToProfilePatch`, at the very top of the function body, add a bridge that resolves the legacy `sport`/`run_discipline` from `skbSport` when present (leaving the old fields as the fallback the golden-master uses):
```js
  // Bridge: a new SKB sport selection derives the legacy engine sport + run discipline. Old
  // answer seeds (goalType+sport+runDiscipline) are untouched, so existing callers + the
  // golden-master are byte-identical.
  const bind = a.skbSport ? bindingFor(a.skbSport) : null;
  const legacySport = bind ? bind.engineSport : a.sport;
  const legacyRunDisc = bind ? (bind.discipline || null) : (a.runDiscipline || null);
```
Then, wherever `answersToProfilePatch` currently reads `a.sport` and `a.runDiscipline` to build the profile's `sport` and `run_discipline`, use `legacySport` / `legacyRunDisc` instead. (Search the function for `a.sport` and `a.runDiscipline`; replace those two reads. Do NOT change any other field.)

- [ ] **Step 4: Run the new test + the golden-master regression**

Run: `node apps/mobile/tests/answers-athlete-rich.js` (expect all PASS).
Run: `node apps/mobile/tests/golden-master.js` — MUST stay green (old field path unchanged; new fields default empty). If it drifts, your change altered the old path — revert to make the bridge purely additive.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/onboardingModel.js apps/mobile/tests/answers-athlete-rich.js
git commit -m "feat(app): onboarding model accepts SKB sport + new individual fields (backward-compatible)"
```

---

## Task 6: `answersToAthleteModelInputs` — populate the rich model fields

**Files:**
- Modify: `apps/mobile/src/lib/onboardingModel.js`
- Test: `apps/mobile/tests/answers-athlete-rich.js` (extend)

**Interfaces:**
- Consumes: existing `answersToAthleteModelInputs(a, asOf)` (Plan 1), which routes through `answersToProfilePatch` → `profileToAthleteModel`.
- Produces: after building the base model, it enriches it from the NEW answer fields: `sportingContext.primarySport = a.skbSport` (when set), `sportingContext.position = a.position`, `constraints.sessionDurationMin`, `trainingHistory.resistanceTrainingYears/sportYears/movementCompetency`.

- [ ] **Step 1: Add the failing assertions to `answers-athlete-rich.js`**

```js
// append to apps/mobile/tests/answers-athlete-rich.js
import { answersToAthleteModelInputs } from '../src/lib/onboardingModel.js';
const ASOF = '2026-07-02';
const m = answersToAthleteModelInputs(A({
  goalType: 'sport', skbSport: 'cycling', position: 'Sprinter (road)',
  daysPerWeek: 4, equipment: ['barbell'], sessionDurationMin: 50,
  resistanceTrainingYears: '3', sportYears: '5',
  movementCompetency: { squat: 'advanced', hinge: 'intermediate' },
}), ASOF);
assert(m.sportingContext.primarySport === 'cycling', 'T5 model primarySport = SKB id');
assert(m.sportingContext.position === 'Sprinter (road)', 'T6 model position from answers');
assert(m.constraints.sessionDurationMin === 50, 'T7 session duration into model');
assert(m.trainingHistory.resistanceTrainingYears === 3 && m.trainingHistory.sportYears === 5, 'T8 measurable training age into model (numeric)');
assert(m.trainingHistory.movementCompetency.squat === 'advanced', 'T9 movement competency into model');
```

- [ ] **Step 2: Run test to verify the new assertions fail**

Run: `node apps/mobile/tests/answers-athlete-rich.js`
Expected: FAIL on T5–T9 (base model doesn't yet carry the new fields).

- [ ] **Step 3: Modify `answersToAthleteModelInputs` in `onboardingModel.js`**

Replace the body of `answersToAthleteModelInputs` with the enriched version (keeps the Plan 1 base, then overlays the new rich fields):
```js
export function answersToAthleteModelInputs(a, asOf) {
  const profile = answersToProfilePatch(a);
  const model = profileToAthleteModel(profile, asOf);
  model.meta = { ...model.meta, source: 'onboarding' };

  // Overlay the richer question set (fields the legacy profile doesn't carry).
  if (a.skbSport) model.sportingContext.primarySport = a.skbSport;
  if (a.position) model.sportingContext.position = a.position;
  if (a.sessionDurationMin != null && a.sessionDurationMin !== '') {
    model.constraints.sessionDurationMin = Number(a.sessionDurationMin);
  }
  const ry = numOrNull(a.resistanceTrainingYears);
  const sy = numOrNull(a.sportYears);
  if (ry != null) model.trainingHistory.resistanceTrainingYears = ry;
  if (sy != null) model.trainingHistory.sportYears = sy;
  if (a.movementCompetency && typeof a.movementCompetency === 'object') {
    model.trainingHistory.movementCompetency = { ...model.trainingHistory.movementCompetency, ...a.movementCompetency };
  }
  return model;
}
```
(`numOrNull` is already exported/defined in this file.) `profileToAthleteModel` must NOT be re-imported — it's already imported from Plan 1.

- [ ] **Step 4: Run the test + the answers→model + golden-master**

Run: `node apps/mobile/tests/answers-athlete-rich.js` (all PASS), `node apps/mobile/tests/answers-to-athlete-model.js` (Plan 1, PASS), `node apps/mobile/tests/golden-master.js` (green).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/onboardingModel.js apps/mobile/tests/answers-athlete-rich.js
git commit -m "feat(app): answersToAthleteModelInputs populates sport position + individual fields"
```

---

## Task 7: Wizard — SKB-driven sport + position steps

**Files:**
- Modify: `apps/mobile/src/components/OnboardingWizard.jsx`

**Interfaces:**
- Consumes: `selectableSports`, `positionsFor` (Task 1); the wizard `Chip`/`OptionGrid` primitives; `set(patch)`; answers `a.skbSport`, `a.position`.
- Behaviour: the sport step (shown when `isSport`) lists `selectableSports()` and sets `a.skbSport`; a following position step lists `positionsFor(a.skbSport)` and sets `a.position`. These REPLACE the old hard-coded `SPORTS` + `RUN_DISCIPLINES` picker for the sport path. The build-path "training style" step is unchanged.

- [ ] **Step 1: Add the imports + the two steps**

At the top of `OnboardingWizard.jsx` (with the other imports):
```js
import { selectableSports, positionsFor } from '@performance-os/engine/lib/sportKnowledge/selectable.js';
```
Just above the `steps` array (near where `isBuild`/`isSport` are computed), add:
```js
  const SKB_SPORTS = selectableSports();
  const SKB_POSITIONS = a.skbSport ? positionsFor(a.skbSport) : [];
```
Replace the existing sport step (the `isSport && { title: 'Which sport — and where are you?' ... }` object) with two steps:
```js
    isSport && { title: 'Which sport?', subtitle: 'Your sport + position set the demands your training serves.', valid: () => !!a.skbSport,
      render: () => (
        <OptionGrid cols={2}>
          {SKB_SPORTS.map(s => (
            <Chip key={s.id} selected={a.skbSport === s.id} onClick={() => set({ skbSport: s.id, position: '' })} label={s.label} />
          ))}
        </OptionGrid>
      ) },

    (isSport && a.skbSport && SKB_POSITIONS.length > 0) && { title: 'Your position / event?', subtitle: 'This sharpens the demand profile.', valid: () => !!a.position,
      render: () => (
        <OptionGrid cols={1} gap={6}>
          {SKB_POSITIONS.map(p => (
            <Chip key={p.id} selected={a.position === p.id} onClick={() => set({ position: p.id })} label={p.name} />
          ))}
        </OptionGrid>
      ) },
```
Keep the sport intent/season/event-date and sport-days questions as their own steps (they are the subjective layer). If they were nested inside the old sport step, move them into a following `isSport && { ... }` step so they still render. (Read the current step to see whether intent/season live in the same object; preserve them.)

Update the summary step's sport rows to read the new fields:
```js
{isSport && <SummaryRow label="Sport" value={(SKB_SPORTS.find(s => s.id === a.skbSport) || {}).label || '—'} />}
{isSport && a.position && <SummaryRow label="Position" value={a.position} />}
```

- [ ] **Step 2: Verify in the browser**

Start the preview (`preview_start` "dev"), then:
- `preview_console_logs` (error) → no new errors.
- Because onboarding is behind auth in a fresh preview, drive the wizard module directly to confirm the SKB data flows:
  ```js
  // preview_eval
  (async () => { const { selectableSports, positionsFor } = await import('/hybrid-react/src/../..//'); return null; })()
  ```
  Simpler: `preview_eval` importing the engine selectable module via the app's node_modules is not resolvable from the browser path; instead assert the component renders by taking a `preview_snapshot` after navigating an onboarded=false state. If auth blocks it, rely on the node tests (Task 1) for the data and confirm only that the app still BOOTS with no console error (the import resolves in the bundle).

- [ ] **Step 3: Confirm the app builds**

Run: `npm run build --workspace hybrid-react` (or `npm run build` from root) → clean.

- [ ] **Step 4: Golden-master + answers tests still green**

Run: `npm test` → 100% pass (the wizard change is UI-only; the model/adapter tests already cover the data).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/OnboardingWizard.jsx
git commit -m "feat(app): SKB-driven sport + position onboarding steps"
```

---

## Task 8: Wizard — session duration, training age, movement competency

**Files:**
- Modify: `apps/mobile/src/components/OnboardingWizard.jsx`

**Interfaces:**
- Consumes: `Field`/`OptionGrid`/`Chip` primitives; answers `a.sessionDurationMin`, `a.resistanceTrainingYears`, `a.sportYears`, `a.movementCompetency`.
- Behaviour: three new steps (or fields folded into the existing availability/experience steps): session duration (minutes), measurable training age (years RT + years sport), and a light movement-competency grid. Reuse existing components; no visual redesign.

- [ ] **Step 1: Add the steps**

Add a session-duration field to the existing "How much can you train?" step (next to daysPerWeek), or as a new step:
```js
    { title: 'How long per session?', subtitle: 'Roughly how many minutes you have for a gym session.', valid: () => true,
      render: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <input type="range" min={20} max={120} step={5} value={a.sessionDurationMin ?? 60}
            onChange={e => set({ sessionDurationMin: Number(e.target.value) })} style={{ flex: 1, accentColor: 'var(--accent)' }} />
          <div style={{ minWidth: 74, textAlign: 'right', fontSize: 22, fontWeight: 700, color: 'var(--txt-strong)' }}>
            {a.sessionDurationMin ?? 60}<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt-muted)' }}> min</span>
          </div>
        </div>
      ) },
```
Add measurable training age (a new step; keep the coarse experience step as an optional self-rating):
```js
    { title: 'How long have you trained?', subtitle: 'Years is more useful to us than a label.', valid: () => true,
      render: () => (
        <OptionGrid cols={2}>
          <Field label="Years lifting" type="number" value={a.resistanceTrainingYears} onChange={v => set({ resistanceTrainingYears: v })} suffix="yrs" />
          {isSport && <Field label="Years in sport" type="number" value={a.sportYears} onChange={v => set({ sportYears: v })} suffix="yrs" />}
        </OptionGrid>
      ) },
```
Add movement competency:
```js
    { title: 'Movement confidence', subtitle: 'Roughly how solid are these patterns for you?', valid: () => true,
      render: () => (
        <div style={{ display: 'grid', gap: 12 }}>
          {[['squat','Squat'],['hinge','Hinge / deadlift'],['press','Press'],['pull','Pull']].map(([k, label]) => (
            <div key={k}>
              <label style={FIELD_LABEL}>{label}</label>
              <OptionGrid cols={3} gap={6}>
                {['novice','intermediate','advanced'].map(lvl => (
                  <Chip key={lvl} center selected={(a.movementCompetency || {})[k] === lvl}
                    onClick={() => set({ movementCompetency: { ...(a.movementCompetency || {}), [k]: lvl } })}
                    label={lvl[0].toUpperCase() + lvl.slice(1)} />
                ))}
              </OptionGrid>
            </div>
          ))}
        </div>
      ) },
```

- [ ] **Step 2: Verify in the browser + persistence**

Start/reuse the preview. Confirm no console errors and the app boots. Then verify the fields persist into the athlete model via `preview_eval` (drive the wired service like Plan 1's Task 15 verification):
```js
(async () => {
  const svc = await import('/hybrid-react/src/lib/AthleteModelService.js');
  const om = await import('/hybrid-react/src/lib/onboardingModel.js');
  const a = { ...om.BLANK_ANSWERS, goalType:'sport', skbSport:'cycling', position:'Sprinter (road)', daysPerWeek:4, equipment:['barbell'], sessionDurationMin:50, resistanceTrainingYears:'3', movementCompetency:{ squat:'advanced' } };
  const saved = await svc.buildAndSaveFromAnswers(a);
  return { primarySport: saved.sportingContext.primarySport, position: saved.sportingContext.position, dur: saved.constraints.sessionDurationMin, ry: saved.trainingHistory.resistanceTrainingYears, squat: saved.trainingHistory.movementCompetency.squat };
})()
```
Expected: `{ primarySport:'cycling', position:'Sprinter (road)', dur:50, ry:3, squat:'advanced' }`.

- [ ] **Step 3: Build + full suite**

Run: `npm run build` (clean) and `npm test` (100% pass).

- [ ] **Step 4: Screenshot proof**

`preview_screenshot` of the wizard (if reachable) or note the eval proof above.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/OnboardingWizard.jsx
git commit -m "feat(app): session-duration + training-age + movement-competency onboarding steps"
```

---

## Task 9: Docs + final verification

**Files:**
- Modify: `docs/architecture/ATHLETE-MODEL.md`, `HANDOFF.md`, `CLAUDE.md`

- [ ] **Step 1: Update `docs/architecture/ATHLETE-MODEL.md`**

In §5 (Performance Model), replace the "demandProfile scaffolded null" note with the now-live behaviour: `demandProfile` is populated from the SKB via `buildDemandProfile(sportId, positionId)` (`sportQualityMap` maps SKB quality vocab → PM quality ids; unmapped sport-skill qualities documented, dropped; position `primaryQualities` boosted). Add an "SKB-driven sport selection" subsection: `selectable.js` derives the onboarding sport list from the SKB (completeness-gated ∩ has-binding), `sportEngineBinding.js` maps SKB sport → engine sport; the adapter preserves the exact legacy `sport`/`run_discipline` in `meta.enginePassthrough` so plans are unchanged. Update §12 known limitations: demand is modelled but does NOT yet change plan generation (diagnosis = next sprint); SKB qualities without a PM home are unmapped.

- [ ] **Step 2: Update running docs**

`HANDOFF.md`: add a "Plan 2" entry under the latest-work section — SKB-driven onboarding + demand wiring landed; live plan unchanged; next is the diagnosis engine (couple demand × capability). `CLAUDE.md`: extend the Athlete-Model pointer with "onboarding sport list is SKB-derived (`sportKnowledge/selectable.js`); Performance Model `demandProfile` is populated from the SKB (`performance/demandProfile.js`)."

- [ ] **Step 3: Frozen-doc check**

Run: `git status --porcelain docs/foundation docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md docs/architecture/TAS.md`
Expected: empty.

- [ ] **Step 4: Full gate**

Run: `npm test` → 100% pass (incl. golden-master green). Run: `npm run build` → clean.

- [ ] **Step 5: Commit**

```bash
git add docs/architecture/ATHLETE-MODEL.md HANDOFF.md CLAUDE.md
git commit -m "docs(plan2): SKB-driven onboarding + demand-profile wiring"
```

---

## Final verification

- [ ] `npm test` → all files pass (new: sport-engine-binding, skb-selectable, sport-quality-map, demand-profile, performance-demand, adapter-sport-position, answers-athlete-rich; unchanged: golden-master green).
- [ ] `npm run build` clean; `npm run dev` boots (preview, no console errors).
- [ ] Frozen docs untouched.

---

## Self-review (completed during planning)

- **Spec coverage:** §4 SKB-driven selection → Task 1; §6 demand wiring → Tasks 2–3; §7 legacy compat → Task 4 (+ golden master in 4/5/6/7/8); §5 revised questions → Tasks 5–8; §8 testing → every task; docs → Task 9. Scope boundary (no plan change from demand) respected — no edits to plan/strength/PlanGenerator.
- **Type consistency:** `bindingFor(skbId) → {engineSport,discipline}` used identically in Tasks 1/4/5; `buildDemandProfile(sportId, positionId)` consistent Tasks 2/3; `demandProfile` entry shape `{qualityId,importance,source,evidence}` consistent; PM quality ids match Plan 1's fixed set; `answersToAthleteModelInputs(a, asOf)` signature unchanged from Plan 1.
- **Placeholder scan:** every code/test step shows complete content; Task 5 Step 3 instructs a precise find-replace of `a.sport`/`a.runDiscipline` (the only two reads) rather than pasting the whole large function — the engineer edits in place.
- **Golden-master discipline:** Tasks 4–8 each re-run `golden-master.js` and must keep it green (the backward-compat gate); no `UPDATE=1`.
