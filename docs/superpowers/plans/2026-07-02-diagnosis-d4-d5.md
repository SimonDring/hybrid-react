# Diagnosis Layer (D4 + D5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the Performance Model's empty `limitingFactors` (D4) and `priorityAdaptations` (D5) scaffolds by computing the diagnosis (ranked limiting factors + confidence-scaled priority qualities) purely from the existing `capabilities` × `demandProfile` — with NO plan-generation change.

**Architecture:** Two new pure functions in `packages/engine/src/lib/performance/` — `diagnose.js` (D4: rank the demand−capability gap) and `prioritise.js` (D5: pick k≈1–3 priority qualities, each mapped to its developing adaptations). `derivePerformanceModel` calls them to populate the two scaffold fields. A tiny `data/qualityCompatibility.js` backs the D5 compatibility guard. The live plan generator is untouched; the golden master stays green.

**Tech Stack:** Plain ES modules (`"type":"module"`), node test scripts under `apps/mobile/tests/*.js` (run via `npm test`), engine imported via `@performance-os/engine/...`.

## Global Constraints

- **Purity/determinism:** every new/changed function is PURE — no `Date.now()`, no argless `new Date()`, no `Math.random()`. Same inputs → same outputs (deterministic ranking with a stable tiebreak). `derivePerformanceModel(model, asOf)` keeps its signature.
- **Test harness:** node scripts under `apps/mobile/tests/`; copy this `assert` into each new file: `function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }`. Run one with `node apps/mobile/tests/<file>.js`; the whole gate with `npm test`.
- **Data shapes (verbatim, from Plans 1–2):** a capability is `{ qualityId, level(0..1), source, confidence('low'|'moderate'|'high'), evidence, updatedAt }`; a demand entry is `{ qualityId, importance(0..1), source:'skb', evidence }`; `demandProfile` is `null` for non-sport. The quality registry (`@performance-os/engine/data/qualities.js`) exports `getQuality(id)` → `{ id, family, adaptations:[adaptationId], ... }` and `qualityIds()`.
- **D4 formula (spec §4):** `magnitude = max(0, demandImportance − capabilityLevel) × demandImportance × trainability × injuryRisk`, with `trainability = injuryRisk = 1.0` (neutral seams). `confidence` = the capability's confidence (the weakest input). A sport athlete's diagnosis is NEVER empty (all demanded qualities ranked, incl. zero-magnitude); non-sport → `[]`.
- **D5 (spec §5):** k confidence-scaled from the top positive-magnitude limiter — `low→1, moderate→2, high→3`; only positive-magnitude limiters selected; each entry maps to the quality's registry `adaptations[]` and traces to its limiter; a minimal compatibility guard defers a quality antagonistic to an already-selected higher-priority one.
- **Live plan UNCHANGED:** no edits to `PlanGenerator.js`, `lib/plan/`, `lib/strength/`, `lib/injury/`, `PlanService.js`. `apps/mobile/tests/golden-master.js` MUST stay green (no `UPDATE=1`).
- **Frozen docs untouched:** `docs/foundation/*`, `docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md`, `docs/architecture/TAS.md`. HANDOFF.md/CLAUDE.md are editable running docs.

---

## File Structure

**Create (engine):**
- `packages/engine/src/lib/performance/diagnose.js` — `diagnoseLimitingFactors(capabilities, demandProfile)`.
- `packages/engine/src/data/qualityCompatibility.js` — `INCOMPATIBLE_PAIRS` + `areIncompatible(a,b)`.
- `packages/engine/src/lib/performance/prioritise.js` — `prioritiseQualities(limitingFactors)`.

**Modify (engine):**
- `packages/engine/src/lib/performance/derivePerformanceModel.js` — populate `limitingFactors` + `priorityAdaptations`.
- `packages/engine/src/lib/performance/index.js` — re-export the two new functions.

**Create (tests — `apps/mobile/tests/`):** `diagnose-limiting-factors.js`, `prioritise-qualities.js`, `performance-diagnosis.js`.

**Modify (docs):** `docs/architecture/ATHLETE-MODEL.md`, `HANDOFF.md`, `CLAUDE.md`.

---

## Task 1: D4 — diagnose limiting factors

**Files:**
- Create: `packages/engine/src/lib/performance/diagnose.js`
- Test: `apps/mobile/tests/diagnose-limiting-factors.js`

**Interfaces:**
- Produces: `diagnoseLimitingFactors(capabilities, demandProfile) → [{ qualityId, magnitude, demandImportance, capabilityLevel, confidence, trainability, injuryRisk, rationale }]`, ranked by `magnitude` desc (stable tiebreak by `qualityId`). `null`/empty `demandProfile` → `[]`. Never throws.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/diagnose-limiting-factors.js
import { diagnoseLimitingFactors } from '@performance-os/engine/lib/performance/diagnose.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }

const caps = [
  { qualityId: 'aerobicCapacity', level: 0.3, source: 'inferred', confidence: 'low' },
  { qualityId: 'maxStrength', level: 0.5, source: 'measured', confidence: 'high' },
];
const demand = [
  { qualityId: 'aerobicCapacity', importance: 0.9, source: 'skb' },
  { qualityId: 'maxStrength', importance: 0.5, source: 'skb' },
];
const lf = diagnoseLimitingFactors(caps, demand);
assert(lf[0].qualityId === 'aerobicCapacity', 'T1 biggest gap ranked first');
assert(lf[0].magnitude === 0.54, 'T2 magnitude = gap(0.6) × importance(0.9)');
assert(lf[0].confidence === 'low', 'T3 confidence = weakest input (capability)');
assert(lf.find(f => f.qualityId === 'maxStrength').magnitude === 0, 'T4 met demand → 0 magnitude');
assert(lf.length === 2, 'T5 diagnosis always includes every demanded quality');
assert(typeof lf[0].rationale === 'string' && lf[0].rationale.length > 0, 'T6 rationale present (explain required)');
assert(lf[0].trainability === 1 && lf[0].injuryRisk === 1, 'T7 neutral seams');
assert(diagnoseLimitingFactors(caps, null).length === 0, 'T8 null demand → [] (non-sport)');
let threw = false; try { diagnoseLimitingFactors(null, demand); } catch { threw = true; }
assert(!threw, 'T9 never throws on null capabilities');
// deterministic tiebreak on equal magnitude (both 0): alphabetical by qualityId
const eq = diagnoseLimitingFactors(
  [{ qualityId: 'stability', level: 0.5, confidence: 'low' }, { qualityId: 'mobility', level: 0.5, confidence: 'low' }],
  [{ qualityId: 'stability', importance: 0.5 }, { qualityId: 'mobility', importance: 0.5 }]);
assert(eq[0].qualityId === 'mobility', 'T10 equal magnitude → deterministic tiebreak by qualityId');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/diagnose-limiting-factors.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// packages/engine/src/lib/performance/diagnose.js
// D4 · Limiting-Factor Diagnosis (the pivot). Pure: ranks the gap between the sport/position DEMAND
// (demandProfile) and the athlete's CAPABILITY per quality. A sport athlete always has a diagnosis
// (every demanded quality is ranked, incl. zero-magnitude). trainability + injuryRisk are neutral
// seams (=1.0) — typed + ready to enrich. Confidence = the weakest input (the capability estimate).
const round2 = (n) => Math.round(n * 100) / 100;

export function diagnoseLimitingFactors(capabilities, demandProfile) {
  if (!Array.isArray(demandProfile) || demandProfile.length === 0) return [];
  const capById = new Map((Array.isArray(capabilities) ? capabilities : []).map((c) => [c.qualityId, c]));

  const factors = demandProfile.map((d) => {
    const cap = capById.get(d.qualityId) || {};
    const capabilityLevel = typeof cap.level === 'number' ? cap.level : 0;
    const capabilityConfidence = cap.confidence || 'low';
    const demandImportance = typeof d.importance === 'number' ? d.importance : 0;
    const gap = Math.max(0, demandImportance - capabilityLevel);
    const trainability = 1.0; // neutral seam (enrich later from the quality registry)
    const injuryRisk = 1.0;   // neutral seam (enrich later from the injury system)
    const magnitude = round2(gap * demandImportance * trainability * injuryRisk);
    const confidence = capabilityConfidence; // demand is SKB-evidence-backed; capability is the weak link
    const rationale = gap > 0
      ? `demands ${d.qualityId} at ${round2(demandImportance)}; your level is ${round2(capabilityLevel)} (${cap.source || 'inferred'}) — gap ${round2(gap)}.`
      : `you meet the ${d.qualityId} demand (${round2(demandImportance)}); maintain it.`;
    return { qualityId: d.qualityId, magnitude, demandImportance: round2(demandImportance), capabilityLevel: round2(capabilityLevel), confidence, trainability, injuryRisk, rationale };
  });

  factors.sort((a, b) => (b.magnitude - a.magnitude) || (a.qualityId < b.qualityId ? -1 : a.qualityId > b.qualityId ? 1 : 0));
  return factors;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node apps/mobile/tests/diagnose-limiting-factors.js`
Expected: all `PASS:`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/performance/diagnose.js apps/mobile/tests/diagnose-limiting-factors.js
git commit -m "feat(engine): D4 diagnose limiting factors (ranked demand−capability gap)"
```

---

## Task 2: D5 — prioritise qualities (+ compatibility)

**Files:**
- Create: `packages/engine/src/data/qualityCompatibility.js`, `packages/engine/src/lib/performance/prioritise.js`
- Test: `apps/mobile/tests/prioritise-qualities.js`

**Interfaces:**
- Consumes: `getQuality` (`data/qualities.js`); a limiting factor `{ qualityId, magnitude, confidence }` (Task 1).
- Produces (`qualityCompatibility.js`): `INCOMPATIBLE_PAIRS` (`[[a,b],…]`), `areIncompatible(a,b) → boolean`.
- Produces (`prioritise.js`): `prioritiseQualities(limitingFactors) → [{ qualityId, order, magnitude, confidence, adaptations:[id], tracesToLimiter, rationale }]`. k = confidence-scaled from the top positive limiter (`low→1, moderate→2, high→3`); only positive-magnitude limiters; compatibility guard defers antagonistic picks. Never throws.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/prioritise-qualities.js
import { prioritiseQualities } from '@performance-os/engine/lib/performance/prioritise.js';
import { areIncompatible } from '@performance-os/engine/data/qualityCompatibility.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }

assert(areIncompatible('maxStrength', 'aerobicCapacity') && areIncompatible('aerobicCapacity', 'maxStrength'), 'T0 antagonism is symmetric');

const low = [{ qualityId: 'aerobicCapacity', magnitude: 0.5, confidence: 'low' }, { qualityId: 'reactiveStrength', magnitude: 0.3, confidence: 'low' }];
assert(prioritiseQualities(low).length === 1, 'T1 low confidence → k=1');

const high = [
  { qualityId: 'hypertrophy', magnitude: 0.5, confidence: 'high' },
  { qualityId: 'reactiveStrength', magnitude: 0.4, confidence: 'high' },
  { qualityId: 'mobility', magnitude: 0.3, confidence: 'high' },
  { qualityId: 'stability', magnitude: 0.2, confidence: 'high' },
];
const hi = prioritiseQualities(high);
assert(hi.length === 3, 'T2 high confidence → k=3');
assert(hi[0].order === 1 && hi[0].qualityId === 'hypertrophy', 'T3 ordered, top limiter first');
assert(Array.isArray(hi[0].adaptations) && hi[0].adaptations.length > 0, 'T4 mapped to developing adaptations');
assert(hi[0].tracesToLimiter === 'hypertrophy', 'T5 traces to its limiter');

// compatibility: maxStrength (top) + aerobicCapacity → aerobic deferred; mobility fills next
const clash = [
  { qualityId: 'maxStrength', magnitude: 0.6, confidence: 'high' },
  { qualityId: 'aerobicCapacity', magnitude: 0.5, confidence: 'high' },
  { qualityId: 'mobility', magnitude: 0.4, confidence: 'high' },
];
const c = prioritiseQualities(clash).map((s) => s.qualityId);
assert(c.includes('maxStrength') && !c.includes('aerobicCapacity'), 'T6 compatibility guard defers antagonistic aerobic');
assert(c.includes('mobility'), 'T7 fills from the next eligible after a deferral');

assert(prioritiseQualities([{ qualityId: 'x', magnitude: 0, confidence: 'high' }]).length === 0, 'T8 no positive-magnitude limiter → []');
let threw = false; try { prioritiseQualities(null); } catch { threw = true; }
assert(!threw, 'T9 never throws on null');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/prioritise-qualities.js`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write minimal implementation**

```js
// packages/engine/src/data/qualityCompatibility.js
// Antagonistic quality pairs for the D5 compatibility guard (frozen D5: priorities must be compatible —
// "no max-strength + max-endurance crammed"). Seeded with the classic concurrent-training interference.
export const INCOMPATIBLE_PAIRS = [
  ['maxStrength', 'aerobicCapacity'],
];

export function areIncompatible(a, b) {
  return INCOMPATIBLE_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}
```

```js
// packages/engine/src/lib/performance/prioritise.js
// D5 · Priority-Quality Selection. Pure: from the ranked limiting factors, pick a confidence-scaled
// set (k 1–3) of positive-magnitude priority qualities, each mapped to the adaptations that develop it
// (quality registry) and tracing to its limiter, respecting a compatibility guard.
import { getQuality } from '../../data/qualities.js';
import { areIncompatible } from '../../data/qualityCompatibility.js';

const K_BY_CONFIDENCE = { low: 1, moderate: 2, high: 3 };

export function prioritiseQualities(limitingFactors) {
  const ranked = (Array.isArray(limitingFactors) ? limitingFactors : []).filter((f) => f && f.magnitude > 0);
  if (ranked.length === 0) return [];
  const k = K_BY_CONFIDENCE[ranked[0].confidence] || 1;

  const selected = [];
  for (const f of ranked) {
    if (selected.length >= k) break;
    if (selected.some((s) => areIncompatible(s.qualityId, f.qualityId))) continue; // defer — conflicts with a higher priority
    const q = getQuality(f.qualityId);
    const adaptations = (q && Array.isArray(q.adaptations)) ? q.adaptations.slice() : [];
    selected.push({
      qualityId: f.qualityId,
      order: selected.length + 1,
      magnitude: f.magnitude,
      confidence: f.confidence,
      adaptations,
      tracesToLimiter: f.qualityId,
      rationale: `prioritising ${f.qualityId} (limiter magnitude ${f.magnitude}); develop via ${adaptations.join(', ') || 'n/a'}.`,
    });
  }
  return selected;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node apps/mobile/tests/prioritise-qualities.js`
Expected: all `PASS:`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/data/qualityCompatibility.js packages/engine/src/lib/performance/prioritise.js apps/mobile/tests/prioritise-qualities.js
git commit -m "feat(engine): D5 prioritise qualities (confidence-scaled k + compatibility guard)"
```

---

## Task 3: Integrate diagnosis into the Performance Model

**Files:**
- Modify: `packages/engine/src/lib/performance/derivePerformanceModel.js`, `packages/engine/src/lib/performance/index.js`
- Test: `apps/mobile/tests/performance-diagnosis.js`

**Interfaces:**
- Consumes: `diagnoseLimitingFactors` (Task 1), `prioritiseQualities` (Task 2).
- Produces: `derivePerformanceModel(model, asOf)` (signature unchanged) now returns populated `limitingFactors` (ranked, D4) and `priorityAdaptations` (D5, ordered priority-quality entries carrying adaptations). `index.js` re-exports `diagnoseLimitingFactors, prioritiseQualities`.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/performance-diagnosis.js
import { createAthleteModel } from '@performance-os/engine/lib/athlete/schema.js';
import { derivePerformanceModel } from '@performance-os/engine/lib/performance/derivePerformanceModel.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }
const ASOF = '2026-07-02';

const sport = createAthleteModel({ sportingContext: { primarySport: 'cycling', position: 'GC / Climber (road)' } });
const pm = derivePerformanceModel(sport, ASOF);
assert(pm.limitingFactors.length > 0, 'T1 sport → limitingFactors populated');
assert(pm.limitingFactors[0].magnitude >= pm.limitingFactors[1].magnitude, 'T2 ranked descending');
assert(typeof pm.limitingFactors[0].rationale === 'string', 'T3 rationale present');
assert(Array.isArray(pm.priorityAdaptations), 'T4 priorityAdaptations present');
if (pm.priorityAdaptations.length) {
  assert(Array.isArray(pm.priorityAdaptations[0].adaptations) && pm.priorityAdaptations[0].tracesToLimiter, 'T5 priority carries adaptations + trace');
}

const build = createAthleteModel({ goals: [{ id: 'g', outcome: 'build_muscle', priority: 1 }] });
const pmb = derivePerformanceModel(build, ASOF);
assert(pmb.limitingFactors.length === 0 && pmb.priorityAdaptations.length === 0, 'T6 build (no demand) → empty diagnosis');
assert(pmb.demandProfile === null, 'T7 build demandProfile still null (Plan 2 behaviour unchanged)');

assert(JSON.stringify(pm) === JSON.stringify(derivePerformanceModel(sport, ASOF)), 'T8 deterministic');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/performance-diagnosis.js`
Expected: FAIL — `limitingFactors` still `[]` (T1).

- [ ] **Step 3: Modify `derivePerformanceModel.js`**

Add the imports (after the existing `buildDemandProfile` import):
```js
import { diagnoseLimitingFactors } from './diagnose.js';
import { prioritiseQualities } from './prioritise.js';
```
Replace the `return { ... }` block so it computes and returns the diagnosis:
```js
  const demandProfile = dp.length ? dp : null;
  const limitingFactors = diagnoseLimitingFactors(capabilities, demandProfile);
  const priorityAdaptations = prioritiseQualities(limitingFactors);
  return {
    athleteId: m.athleteId || null,
    derivedAt: asOf || null,
    capabilities,
    demandProfile,
    limitingFactors,
    priorityAdaptations,
  };
```
In `packages/engine/src/lib/performance/index.js`, add:
```js
export { diagnoseLimitingFactors } from './diagnose.js';
export { prioritiseQualities } from './prioritise.js';
```

- [ ] **Step 4: Run the new test + regressions + the golden master**

Run: `node apps/mobile/tests/performance-diagnosis.js` (all PASS).
Run: `node apps/mobile/tests/performance-model.js`, `node apps/mobile/tests/performance-demand.js` (Plan 1/2 — must still PASS).
Run: `node apps/mobile/tests/golden-master.js` — MUST be green (no plan change; the diagnosis is model output only).

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/performance/derivePerformanceModel.js packages/engine/src/lib/performance/index.js apps/mobile/tests/performance-diagnosis.js
git commit -m "feat(engine): populate performance-model diagnosis (limitingFactors + priorityAdaptations)"
```

---

## Task 4: Docs + final verification

**Files:**
- Modify: `docs/architecture/ATHLETE-MODEL.md`, `HANDOFF.md`, `CLAUDE.md`

- [ ] **Step 1: Update `docs/architecture/ATHLETE-MODEL.md`**

In §5 (Performance Model), update the scaffolding note: `limitingFactors` and `priorityAdaptations` are now COMPUTED — D4 ranks the demand−capability gap (`magnitude = max(0, demandImportance − capabilityLevel) × demandImportance`, confidence = the weakest input, a plain-English rationale, a sport diagnosis always exists), and D5 selects a confidence-scaled (k 1–3) set of priority qualities, each traced to its limiter and mapped to the developing adaptations, with a minimal compatibility guard. Note the field naming: `priorityAdaptations` holds priority QUALITY entries carrying their adaptations. In §12 (known limitations): the diagnosis is model output and does NOT yet steer plan generation (the diagnosis→plan re-seating is the next sprint); `trainability`/`injuryRisk` are neutral seams (=1.0); build-goal diagnosis is empty until goal-as-sport demand profiles are built.

- [ ] **Step 2: Update running docs**

`HANDOFF.md`: add a newest-first entry — the D4/D5 diagnosis layer landed on branch `feat/diagnosis-d4-d5`; the Performance Model now diagnoses (limiting factors + priorities) purely from capability × demand; live plan unchanged (golden master green); next is steering the plan from the diagnosis. `CLAUDE.md`: extend the Athlete-Model pointer with one sentence — the Performance Model now computes the diagnosis (`performance/diagnose.js` D4 limiting factors, `performance/prioritise.js` D5 priority qualities); it is model output only (does not yet steer the plan).

- [ ] **Step 3: Frozen-doc check**

Run: `git status --porcelain docs/foundation docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md docs/architecture/TAS.md`
Expected: empty.

- [ ] **Step 4: Full gate**

Run: `npm test` → all files pass (incl. the 3 new diagnosis tests + golden master green). Run: `npm run build` → clean.

- [ ] **Step 5: Commit**

```bash
git add docs/architecture/ATHLETE-MODEL.md HANDOFF.md CLAUDE.md
git commit -m "docs(diagnosis): D4/D5 diagnosis layer — limiting factors + priority qualities"
```

---

## Final verification

- [ ] `npm test` → all pass (new: diagnose-limiting-factors, prioritise-qualities, performance-diagnosis; golden-master green).
- [ ] `npm run build` clean.
- [ ] Frozen docs untouched; live-plan path unchanged (`git diff --stat main HEAD -- packages/engine/src/lib/plan packages/engine/src/lib/strength packages/engine/src/lib/PlanGenerator.js apps/mobile/src/lib/PlanService.js` → empty).

---

## Self-review (completed during planning)

- **Spec coverage:** §4 D4 → Task 1; §5 D5 + compatibility → Task 2; §6 integration → Task 3; §7 testing → each task + golden master; §8 non-goals honoured (no plan change — Task 3 runs the golden master green); docs → Task 4.
- **Type consistency:** limiting-factor entry `{qualityId,magnitude,demandImportance,capabilityLevel,confidence,trainability,injuryRisk,rationale}` consistent Tasks 1/3; `prioritiseQualities(limitingFactors)` consumes `{qualityId,magnitude,confidence}` consistently; `derivePerformanceModel(model, asOf)` signature unchanged; PM quality ids + registry `adaptations[]` match Plan 1.
- **Placeholder scan:** every code/test step is complete; Task 4 doc edits reference the exact behaviour from the committed code.
- **Golden-master discipline:** Task 3 explicitly runs `golden-master.js` and requires green (the diagnosis is model output; no plan change).
