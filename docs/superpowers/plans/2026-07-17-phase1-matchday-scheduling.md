# Phase 1 — Match-day-aware scheduling (team-driven) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the baseline gym plan position heavy/power/recovery days relative to a team's fixtures (MD-4 heavy, MD-2 power, MD+1 recovery, no heavy on MD-1/MD/MD+1), driven by the coach's fixture schedule, behind a default-OFF flag.

**Architecture:** Fixtures are deterministic from `plan_start_date`, so the shaping is computed in the **baseline generator** (`PlanGenerator` → `scheduleWeek`), never the runtime reflow (which stays live-state-only — `matches_this_week` is added to `REFLOW_EXCLUDED_SIGNALS`). A new pure helper turns fixture dates into a per-week match-day offset map; the already-authored `deriveWeeklyObjective` supplies the sport's spacing constraints; the scheduler gains soft penalty terms that pull heavy work away from the match and power work toward MD-2. Everything is gated by `opts.fixtureMicrocycle` (default OFF) and additive (no fixtures ⇒ byte-identical).

**Tech Stack:** Pure ES modules in `packages/engine` (no clock/IO); Node test scripts (`node:assert/strict`) in `apps/mobile/tests` and `packages/engine/tests`; golden-master snapshot suite; `@performance-os/engine` workspace package.

## Global Constraints

- **Engine purity (Art 18):** no clock, no IO, no randomness in `packages/engine` plan generation. Every date derives from `profile.plan_start_date` as `asOf`. New helpers take dates as arguments.
- **Determinism:** `generatePlan(profile)` — same profile ⇒ same plan. Golden-master is byte-compared; snapshot moves require `UPDATE=1` + a `docs/superpowers/plans/EXPECTED-DELTA.md`-style note, audited key-by-key.
- **Additive-first:** byte-identical for athletes the change doesn't apply to (no team fixtures, non-team sports, build goals). Proven by `packages/engine/tests/prop-additive-identity.test.mjs`, `prop-purity`, `prop-determinism`.
- **No double-count:** a calendar/fixture signal owned by the baseline must NOT also fire in the reflow (`prop-reflow-baseline.test.mjs` is the hard guard).
- **Knowledge is data:** scheduler penalty weights live in `packages/engine/src/data/schedulingPolicy.js` (governed), not literals in `scheduler.js`. Any governed-data edit bumps `KNOWLEDGE_SET_VERSION` in `packages/engine/src/lib/knowledge/entries.js` (currently `1.47.0` → `1.48.0`).
- **Flag default OFF:** `opts.fixtureMicrocycle` defaults `false`, mirroring the `opts.forceVelocityAware` precedent (`PlanGenerator.js:169,257`).
- **Two-PR split:** Tasks 1–7 are PR A (mechanism, flag OFF, every golden byte-identical bar the KSV stamp). Task 8 is PR B (the flip — scoped, audited re-baseline of ONE new archetype).

---

# PR A — the mechanism (flag OFF, byte-identical bar the KSV stamp)

### Task 1: Pure helper — fixtures → match-day offset map

**Files:**
- Create: `packages/engine/src/lib/microcycle/fixtureWeeks.js`
- Modify: `packages/engine/index.js` (barrel export)
- Test: `packages/engine/tests/fixture-weeks.test.mjs`

**Interfaces:**
- Produces: `mdMapForWeek({ fixtures, matchWeekday, planStartDate, weekNum }) → { matchesThisWeek: number|null, mdOffsetByWeekday: Map<number,number> }` where weekday index is Mon=0…Sun=6, and the offset is the signed day-distance from that weekday to the nearest match in the week (MD-4 → −4, MD → 0, MD+1 → +1). `fixtures` = `[{ dateISO, weekdayIdx }]`; `matchWeekday` = a fallback recurring weekday index or `null`.

- [ ] **Step 1: Write the failing test**

```js
// packages/engine/tests/fixture-weeks.test.mjs
import assert from 'node:assert/strict';
import { mdMapForWeek } from '@performance-os/engine';

let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); console.log('PASS:', m); };

// Plan starts Mon 2026-07-13. Week 1 = 2026-07-13 (Mon) … 2026-07-19 (Sun).
// A Saturday fixture (2026-07-18) is weekday index 5.
{
  const r = mdMapForWeek({
    fixtures: [{ dateISO: '2026-07-18', weekdayIdx: 5 }],
    matchWeekday: null, planStartDate: '2026-07-13', weekNum: 1,
  });
  ok(r.matchesThisWeek === 1, 'one match in week 1');
  ok(r.mdOffsetByWeekday.get(5) === 0, 'Saturday is MD (offset 0)');
  ok(r.mdOffsetByWeekday.get(4) === -1, 'Friday is MD-1');
  ok(r.mdOffsetByWeekday.get(1) === -4, 'Tuesday is MD-4');
  ok(r.mdOffsetByWeekday.get(6) === 1, 'Sunday is MD+1');
}
// No fixture in the week, but a recurring Saturday match weekday → fallback anchor.
{
  const r = mdMapForWeek({ fixtures: [], matchWeekday: 5, planStartDate: '2026-07-13', weekNum: 1 });
  ok(r.matchesThisWeek === 0, 'no dated fixture this week');
  ok(r.mdOffsetByWeekday.get(1) === -4, 'fallback anchor still gives Tue = MD-4');
}
// Neither dated fixtures nor a recurring weekday → no map.
{
  const r = mdMapForWeek({ fixtures: [], matchWeekday: null, planStartDate: '2026-07-13', weekNum: 1 });
  ok(r.matchesThisWeek === null, 'no signal → null density');
  ok(r.mdOffsetByWeekday.size === 0, 'no signal → empty map');
}
// Two matches (Wed + Sat) → nearest-match offset per weekday.
{
  const r = mdMapForWeek({
    fixtures: [{ dateISO: '2026-07-15', weekdayIdx: 2 }, { dateISO: '2026-07-18', weekdayIdx: 5 }],
    matchWeekday: null, planStartDate: '2026-07-13', weekNum: 1,
  });
  ok(r.matchesThisWeek === 2, 'two matches in week 1');
  ok(r.mdOffsetByWeekday.get(3) === 1, 'Thursday is MD+1 relative to the Wed match (nearest)');
  ok(r.mdOffsetByWeekday.get(4) === -1, 'Friday is MD-1 relative to the Sat match (nearest)');
}
console.log(`\nfixture-weeks: ${n}/${n} checks passed`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node packages/engine/tests/fixture-weeks.test.mjs`
Expected: FAIL — `mdMapForWeek` is not exported (`SyntaxError`/`undefined is not a function`).

- [ ] **Step 3: Write minimal implementation**

```js
// packages/engine/src/lib/microcycle/fixtureWeeks.js
/**
 * fixtureWeeks — PURE fixture→microcycle geometry (D8 wiring, Phase 1). Turns a team's
 * dated fixtures into a per-week match-day offset map (MD-4 → -4 … MD+1 → +1), anchored to
 * plan_start_date (never the clock — Art 18). Baseline-owned: fixtures are known ahead, so
 * this feeds the generator, not the runtime reflow (reflowAdjust.js REFLOW_EXCLUDED_SIGNALS).
 */
const MS_DAY = 86_400_000;
const parseISO = (s) => { const d = new Date(s + 'T00:00:00'); return isNaN(d.getTime()) ? null : d; };
// Monday-anchored week: shift so Monday = 0 … Sunday = 6.
function mondayOf(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

/**
 * @param {object} a
 *   fixtures      [{ dateISO, weekdayIdx }]  match fixtures (already normalised, Mon=0..Sun=6)
 *   matchWeekday  number|null                recurring match weekday (fallback anchor)
 *   planStartDate ISO string                 the plan anchor (asOf)
 *   weekNum       1-based plan week
 * @returns {{ matchesThisWeek: number|null, mdOffsetByWeekday: Map<number,number> }}
 */
export function mdMapForWeek({ fixtures = [], matchWeekday = null, planStartDate = null, weekNum = 1 } = {}) {
  const start = parseISO(planStartDate);
  const empty = { matchesThisWeek: null, mdOffsetByWeekday: new Map() };
  if (!start) return empty;

  // The week window [weekStart, weekStart+7): Monday of plan week `weekNum`.
  const weekStart = mondayOf(start);
  weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
  const weekStartMs = weekStart.getTime();

  // Match weekday indices in THIS week (from dated fixtures that fall in the window).
  const matchIdx = [];
  for (const f of fixtures) {
    const d = parseISO(f && f.dateISO);
    if (!d) continue;
    const off = Math.round((mondayOf(d).getTime() - weekStartMs) / MS_DAY);
    if (off === 0 && typeof f.weekdayIdx === 'number') matchIdx.push(f.weekdayIdx);
  }

  const matchesThisWeek = matchIdx.length;
  const anchors = matchIdx.length ? matchIdx : (matchWeekday != null ? [matchWeekday] : []);
  if (!anchors.length) return empty; // no dated fixture AND no recurring anchor → no reshape

  const mdOffsetByWeekday = new Map();
  for (let d = 0; d <= 6; d++) {
    let nearest = null;
    for (const a of anchors) { const o = d - a; if (nearest == null || Math.abs(o) < Math.abs(nearest)) nearest = o; }
    mdOffsetByWeekday.set(d, nearest);
  }
  // Density: number of DATED matches this week (a recurring-only week is 0, not null).
  return { matchesThisWeek: matchIdx.length ? matchesThisWeek : 0, mdOffsetByWeekday };
}

export default { mdMapForWeek };
```

Add the barrel export in `packages/engine/index.js` immediately after the `deriveWeeklyObjective` export (currently line 101):

```js
export { mdMapForWeek } from './src/lib/microcycle/fixtureWeeks.js';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node packages/engine/tests/fixture-weeks.test.mjs`
Expected: PASS — `fixture-weeks: 12/12 checks passed` (the self-counting `n/n` reports the actual assertion total).

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/microcycle/fixtureWeeks.js packages/engine/index.js packages/engine/tests/fixture-weeks.test.mjs
git commit -m "feat(engine): pure fixture→match-day offset map (Phase 1 D8 wiring)"
```

---

### Task 2: Translate spacing constraints → weekday-index sets

**Files:**
- Modify: `packages/engine/src/lib/microcycle/fixtureWeeks.js`
- Modify: `packages/engine/index.js`
- Test: `packages/engine/tests/fixture-weeks.test.mjs` (extend)

**Interfaces:**
- Consumes: `deriveWeeklyObjective(...).value.spacingConstraints` (`{ avoidHeavyLiftingDays[], preferExplosiveWorkDays[], heavyDay, powerDay, recoveryDay, injuryPreventionDay }` — strings with `MD±n` tokens) and `mdOffsetByWeekday` from Task 1.
- Produces: `mdConstraintsFrom(spacingConstraints, mdOffsetByWeekday) → { avoidHeavyIdx: Set<number>, preferExplosiveIdx: Set<number>, heavyTargetIdx: Set<number>, recoveryIdx: Set<number> } | null` (null when there is nothing parseable — byte-safe).

- [ ] **Step 1: Write the failing test** (append to `fixture-weeks.test.mjs` before the final log line)

```js
import { mdConstraintsFrom } from '@performance-os/engine';

// oneMatchPerWeek soccer constraints, Saturday match (offsets: Tue -4, Thu -2, Fri -1, Sat 0, Sun +1).
{
  const { mdOffsetByWeekday } = mdMapForWeek({
    fixtures: [{ dateISO: '2026-07-18', weekdayIdx: 5 }], matchWeekday: null,
    planStartDate: '2026-07-13', weekNum: 1,
  });
  const c = mdConstraintsFrom({
    avoidHeavyLiftingDays: ['MD-1', 'MD', 'MD+1'],
    preferExplosiveWorkDays: ['MD-2', 'MD-3'],
    heavyDay: 'MD-4 or MD-3 (lower-body strength)', powerDay: 'MD-2 (power)',
    recoveryDay: 'MD+1 (active recovery)', injuryPreventionDay: null,
  }, mdOffsetByWeekday);
  ok(c.avoidHeavyIdx.has(4) && c.avoidHeavyIdx.has(5) && c.avoidHeavyIdx.has(6), 'avoid-heavy = Fri/Sat/Sun (MD-1/MD/MD+1)');
  ok(c.preferExplosiveIdx.has(3) && c.preferExplosiveIdx.has(2), 'prefer-explosive = Thu/Wed (MD-2/MD-3)');
  ok(c.heavyTargetIdx.has(1) && c.heavyTargetIdx.has(2), 'heavy target = Tue/Wed (MD-4/MD-3)');
  ok(c.recoveryIdx.has(6), 'recovery = Sunday (MD+1)');
}
// Sentinel-only congested constraints → null (byte-safe; sentinel semantics are Simon's call).
{
  const { mdOffsetByWeekday } = mdMapForWeek({ fixtures: [{ dateISO: '2026-07-18', weekdayIdx: 5 }], matchWeekday: null, planStartDate: '2026-07-13', weekNum: 1 });
  const c = mdConstraintsFrom({ avoidHeavyLiftingDays: ['all'], preferExplosiveWorkDays: ['match-day primer only'], heavyDay: 'none', powerDay: 'match-day priming only', recoveryDay: 'every non-match day', injuryPreventionDay: null }, mdOffsetByWeekday);
  ok(c === null, 'unparseable sentinel constraints yield no reshape (null)');
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node packages/engine/tests/fixture-weeks.test.mjs`
Expected: FAIL — `mdConstraintsFrom` not exported.

- [ ] **Step 3: Write minimal implementation** (add to `fixtureWeeks.js`)

```js
// Parse every `MD±n` token in a string or string[] into a Set of signed offsets. "MD" alone = 0.
// Non-MD sentinel words ("all", "none", "every day between matches", …) contribute nothing.
function offsetsFrom(spec) {
  const out = new Set();
  const scan = (s) => {
    if (typeof s !== 'string') return;
    const re = /MD([+-]\d+)?/g; let m;
    while ((m = re.exec(s)) !== null) out.add(m[1] ? Number(m[1]) : 0);
  };
  if (Array.isArray(spec)) spec.forEach(scan); else scan(spec);
  return out;
}

// Which weekday indices in this week carry an offset in `offsets`.
function idxWhereOffset(mdOffsetByWeekday, offsets) {
  const s = new Set();
  if (!offsets.size) return s;
  for (const [d, o] of mdOffsetByWeekday) if (offsets.has(o)) s.add(d);
  return s;
}

/**
 * Translate a sport's spacing constraints + this week's offset map into concrete weekday-index
 * sets the scheduler penalises against. Returns null when nothing is parseable (byte-safe: the
 * scheduler then sees no mdConstraints and runs exactly as today).
 */
export function mdConstraintsFrom(spacingConstraints, mdOffsetByWeekday) {
  if (!spacingConstraints || !mdOffsetByWeekday || !mdOffsetByWeekday.size) return null;
  const avoidHeavyIdx = idxWhereOffset(mdOffsetByWeekday, offsetsFrom(spacingConstraints.avoidHeavyLiftingDays));
  const preferExplosiveIdx = idxWhereOffset(mdOffsetByWeekday, offsetsFrom(spacingConstraints.preferExplosiveWorkDays));
  const heavyTargetIdx = idxWhereOffset(mdOffsetByWeekday, offsetsFrom(spacingConstraints.heavyDay));
  const recoveryIdx = idxWhereOffset(mdOffsetByWeekday, offsetsFrom(spacingConstraints.recoveryDay));
  if (!avoidHeavyIdx.size && !preferExplosiveIdx.size && !heavyTargetIdx.size && !recoveryIdx.size) return null;
  return { avoidHeavyIdx, preferExplosiveIdx, heavyTargetIdx, recoveryIdx };
}
```

Update the default export and barrel:

```js
// fixtureWeeks.js
export default { mdMapForWeek, mdConstraintsFrom };
```
```js
// packages/engine/index.js — extend the fixtureWeeks export
export { mdMapForWeek, mdConstraintsFrom } from './src/lib/microcycle/fixtureWeeks.js';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node packages/engine/tests/fixture-weeks.test.mjs`
Expected: PASS — all checks pass.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/microcycle/fixtureWeeks.js packages/engine/index.js packages/engine/tests/fixture-weeks.test.mjs
git commit -m "feat(engine): translate MD spacing constraints to weekday-index sets"
```

---

### Task 3: Governed MD penalty weights + KSV bump

**Files:**
- Modify: `packages/engine/src/data/schedulingPolicy.js`
- Modify: `packages/engine/src/lib/knowledge/entries.js:22` (KSV)
- Test: `packages/engine/tests/scheduling-policy-md.test.mjs`

**Interfaces:**
- Produces: `SCHEDULING_PENALTIES.md = { heavyOnAvoidDay, hardOnRecoveryDay, powerOffPreferredDay, heavyOffTargetDayPerStep }` — all numbers, weighted BELOW `adjacent.sameMusclePerGroup` (14).

- [ ] **Step 1: Write the failing test**

```js
// packages/engine/tests/scheduling-policy-md.test.mjs
import assert from 'node:assert/strict';
import { SCHEDULING_PENALTIES as SP } from '../src/data/schedulingPolicy.js';
import { KNOWLEDGE_SET_VERSION } from '../src/lib/knowledge/entries.js';

let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); console.log('PASS:', m); };
ok(SP.md && typeof SP.md === 'object', 'SCHEDULING_PENALTIES.md exists');
for (const k of ['heavyOnAvoidDay', 'hardOnRecoveryDay', 'powerOffPreferredDay', 'heavyOffTargetDayPerStep'])
  ok(typeof SP.md[k] === 'number', `md.${k} is a number`);
ok(SP.md.heavyOnAvoidDay < SP.adjacent.sameMusclePerGroup, 'MD penalties sit below the muscle-spacing lever (14)');
ok(KNOWLEDGE_SET_VERSION === '1.48.0', 'KSV bumped to 1.48.0 for the new governed weights');
console.log(`\nscheduling-policy-md: ${n}/${n} checks passed`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node packages/engine/tests/scheduling-policy-md.test.mjs`
Expected: FAIL — `SP.md` undefined; KSV still `1.47.0`.

- [ ] **Step 3: Write minimal implementation**

Add the `md` block to `SCHEDULING_PENALTIES` in `packages/engine/src/data/schedulingPolicy.js` (after the `twoApart` block, inside the object):

```js
  // Match-day microcycle shaping (Phase 1; flag-gated fixtureMicrocycle). Soft nudges that
  // position gym work around a fixture: heavy far from the match, power close, recovery after.
  // Weighted BELOW adjacent.sameMusclePerGroup (14) so MD shaping refines placement without
  // overriding muscle-recovery spacing. Evidence L5 (heuristic ordinal — no literature fixes a
  // number; the ORDERING is the knowledge: a heavy lift inside MD-1/MD/MD+1 is the worst case).
  // Confidence low. See docs/superpowers/specs/2026-07-17-sport-data-integration-roadmap-design.md.
  md: {
    heavyOnAvoidDay: 12,          // heavy + high-axial gym work on MD-1/MD/MD+1
    hardOnRecoveryDay: 6,         // any hard session on the MD+1 recovery day
    powerOffPreferredDay: 4,      // power/plyo work NOT on a preferred (MD-2/MD-3) day
    heavyOffTargetDayPerStep: 2,  // × weekday distance from the nearest heavy-target (MD-4/MD-3) day
  },
```

Bump the KSV in `packages/engine/src/lib/knowledge/entries.js` — change line 22's version string to `1.48.0` and PREPEND a rationale to the trailing comment (keep the existing history):

```js
export const KNOWLEDGE_SET_VERSION = '1.48.0'; // 1.48.0 (2026-07-17, Phase 1 match-day scheduling — governed MD spacing weights): new SCHEDULING_PENALTIES.md block (heavyOnAvoidDay 12 / hardOnRecoveryDay 6 / powerOffPreferredDay 4 / heavyOffTargetDayPerStep 2) — the D13 scheduler's fixture-aware penalties. FLAG-GATED (opts.fixtureMicrocycle, default OFF) ⇒ the penalty branch never runs and mdConstraints is never built ⇒ every golden byte-identical BAR this knowledgeSetVersion stamp (a governed data table gained an entry → ratchet bump). Step 2 (flip the flag on, scoped + audited per-archetype delta on ONE new fixture-bearing archetype + Simon's coaching sign-off) is a SEPARATE behaviour-changing PR. // 1.47.0 (2026-07-16, ...
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node packages/engine/tests/scheduling-policy-md.test.mjs`
Expected: PASS — `scheduling-policy-md: 7/7 checks passed`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/data/schedulingPolicy.js packages/engine/src/lib/knowledge/entries.js packages/engine/tests/scheduling-policy-md.test.mjs
git commit -m "feat(engine): governed match-day scheduler penalty weights (KSV 1.48.0)"
```

---

### Task 4: Scheduler consumes `mdConstraints` (inert when null)

**Files:**
- Modify: `packages/engine/src/lib/plan/scheduler.js`
- Test: `packages/engine/tests/scheduler-md.test.mjs`

**Interfaces:**
- Consumes: `mdConstraints` from `mdConstraintsFrom` (Task 2).
- Produces: `scheduleWeek({ sportSpecs, dayNames, busyDays, sportMuscles, mdConstraints })` — new optional `mdConstraints` (default `null`); when null, output is byte-identical to today.

- [ ] **Step 1: Write the failing test**

```js
// packages/engine/tests/scheduler-md.test.mjs
import assert from 'node:assert/strict';
import { scheduleWeek } from '../src/lib/plan/scheduler.js';

let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); console.log('PASS:', m); };

// Three sessions, all available weekdays Mon/Tue/Wed/Thu/Fri (indices 0-4). One is heavy+high-axial.
const spec = (focus, { hard = false, axial = 0 } = {}) => ({
  focus, discipline: 'gym', duration: 60, items: [], axialLoad: axial,
  intensity: hard ? 'hard' : 'moderate', muscleVol: { quads: axial ? 10 : 2 },
});
const sportSpecs = [spec('Heavy', { hard: true, axial: 4 }), spec('Power'), spec('Accessory')];
const dayNames = ['Tuesday', 'Thursday', 'Friday']; // MD-4, MD-2, MD-1 for a Saturday match

// mdConstraints for a Saturday (idx 5) match: avoid heavy on Fri(4)/Sat(5)/Sun(6); heavy target Tue(1)/Wed(2).
const md = {
  avoidHeavyIdx: new Set([4, 5, 6]), preferExplosiveIdx: new Set([3, 2]),
  heavyTargetIdx: new Set([1, 2]), recoveryIdx: new Set([6]),
};

// Baseline (no mdConstraints) — capture placement.
const base = scheduleWeek({ sportSpecs, dayNames, busyDays: [], sportMuscles: [] });
const baseHeavy = base.find((s) => s.title.includes('Heavy')).dayIdx;

// With mdConstraints — the heavy session must NOT land on an avoid-heavy day.
const shaped = scheduleWeek({ sportSpecs, dayNames, busyDays: [], sportMuscles: [], mdConstraints: md });
const shapedHeavy = shaped.find((s) => s.title.includes('Heavy')).dayIdx;
ok(!md.avoidHeavyIdx.has(shapedHeavy), `heavy session avoids MD-1/MD/MD+1 (landed on idx ${shapedHeavy})`);
ok(md.heavyTargetIdx.has(shapedHeavy), `heavy session lands on a heavy-target day (idx ${shapedHeavy})`);

// Null mdConstraints is byte-identical to the no-arg baseline.
const nullMd = scheduleWeek({ sportSpecs, dayNames, busyDays: [], sportMuscles: [], mdConstraints: null });
ok(JSON.stringify(nullMd) === JSON.stringify(base), 'mdConstraints:null is byte-identical to baseline');
console.log(`\nscheduler-md: ${n}/${n} checks passed`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node packages/engine/tests/scheduler-md.test.mjs`
Expected: FAIL — `scheduleWeek` ignores `mdConstraints`, so `shapedHeavy` may equal `baseHeavy` (an avoid-heavy day).

- [ ] **Step 3: Write minimal implementation**

In `packages/engine/src/lib/plan/scheduler.js`:

(a) Add session classifiers near the existing `isHard`/`isHighAxial` (after line 31):

```js
const isHeavy = (s) => isHard(s) && isHighAxial(s);
const isPower = (s) => isPlyoLoaded(s)
  || s._objective?.quality === 'explosiveStrength'
  || s._objective?.quality === 'reactiveStrength';
```

(b) Extend `score` to apply MD penalties. Change the signature to read `ctx.mdConstraints` and add, inside the `for (let i …)` loop, right after the `sportProximity` block (after line 85, before `if (n < 2) continue;`):

```js
    // Match-day microcycle shaping (Phase 1). Soft, additive to the same minimised penalty.
    const md = ctx.mdConstraints;
    if (md) {
      const d = cur.idx;
      if (isHeavy(cur.spec) && md.avoidHeavyIdx.has(d)) pen += SP.md.heavyOnAvoidDay;
      if (isHard(cur.spec) && md.recoveryIdx.has(d)) pen += SP.md.hardOnRecoveryDay;
      if (isPower(cur.spec) && md.preferExplosiveIdx.size && !md.preferExplosiveIdx.has(d)) pen += SP.md.powerOffPreferredDay;
      if (isHeavy(cur.spec) && md.heavyTargetIdx.size && !md.heavyTargetIdx.has(d)) {
        let nearest = 7; for (const t of md.heavyTargetIdx) nearest = Math.min(nearest, dayDistance(d, t));
        pen += SP.md.heavyOffTargetDayPerStep * nearest;
      }
    }
```

(c) Thread `mdConstraints` through `placeSport` and `scheduleWeek`:

```js
// placeSport signature + score call:
function placeSport(sportSpecs, dayNames, busyDays = [], sportMuscles = [], mdConstraints = null) {
  // …unchanged…
    const pen = score(placed, { busyDays, sportMuscles, mdConstraints });
  // …unchanged…
}

// scheduleWeek:
export function scheduleWeek({ sportSpecs = [], dayNames = [], busyDays = [], sportMuscles = [], mdConstraints = null }) {
  const placedSport = placeSport(sportSpecs, dayNames, busyDays, sportMuscles, mdConstraints);
  // …rest unchanged…
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node packages/engine/tests/scheduler-md.test.mjs`
Expected: PASS — heavy avoids MD-1/MD/MD+1, lands on a target day, and null is byte-identical.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/plan/scheduler.js packages/engine/tests/scheduler-md.test.mjs
git commit -m "feat(engine): scheduler honours match-day spacing penalties (inert when null)"
```

---

### Task 5: Generator wiring behind `opts.fixtureMicrocycle` (default OFF)

**Files:**
- Modify: `packages/engine/src/lib/PlanGenerator.js`
- Test: `packages/engine/tests/generator-fixture-microcycle.test.mjs`

**Interfaces:**
- Consumes: `mdMapForWeek`, `mdConstraintsFrom` (Tasks 1–2), `deriveWeeklyObjective` (existing), `SKB.section` (existing), `applyTeamSchedule` output fields `team_fixtures` / `team_match_weekday` (Task 6 populates them; this task reads them defensively).
- Produces: `generatePlan(profile, { fixtureMicrocycle: true })` reshapes team-fixture weeks; default (`{}` / OFF) is byte-identical.

- [ ] **Step 1: Write the failing test**

```js
// packages/engine/tests/generator-fixture-microcycle.test.mjs
import assert from 'node:assert/strict';
import { generatePlan } from '@performance-os/engine';

let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); console.log('PASS:', m); };

// A soccer player, fixed start (Mon 2026-07-13), Saturday fixtures, trains Mon/Wed/Fri.
// team_fixtures/team_match_weekday are what applyTeamSchedule (Task 6) stamps.
const profile = () => ({
  goal_type: 'sport', sport: 'soccer', sport_code: 'soccer', sport_intent: 'compete',
  sport_season: 'off_season', experience_level: 'intermediate', experience: { gym: 'intermediate' },
  sex: 'male', bodyweight_kg: 78, access: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'],
  availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] }, plan_start_date: '2026-07-13',
  lifts: {}, sport_days: ['tue', 'sat'],
  team_fixtures: [{ dateISO: '2026-07-18', weekdayIdx: 5 }, { dateISO: '2026-07-25', weekdayIdx: 5 }],
  team_match_weekday: 5,
});

// Flag OFF (default) → byte-identical to a plan with NO fixture fields.
const bare = { ...profile() }; delete bare.team_fixtures; delete bare.team_match_weekday;
ok(JSON.stringify(generatePlan(profile())) === JSON.stringify(generatePlan(bare)),
  'flag OFF: team_fixtures fields do not change the plan (byte-identical)');

// Flag ON → the Friday (MD-1) session is not the heavy/high-axial one.
const shaped = generatePlan(profile(), { fixtureMicrocycle: true });
const wk1 = shaped.phases[0].weeks[0];
const fri = wk1.sessions.find((s) => s.dayIdx === 4); // Friday = MD-1
ok(fri, 'a Friday session exists');
ok(!(fri.axialLoad >= 3 && /heav|strength/i.test(fri.title)), `Friday (MD-1) is not the heavy day (title "${fri.title}", axial ${fri.axialLoad})`);

// Flag ON but NO fixtures → byte-identical (additive-identity).
const noFix = { ...profile() }; delete noFix.team_fixtures; delete noFix.team_match_weekday;
ok(JSON.stringify(generatePlan(noFix, { fixtureMicrocycle: true })) === JSON.stringify(generatePlan(noFix)),
  'flag ON without fixtures → byte-identical');
console.log(`\ngenerator-fixture-microcycle: ${n}/${n} checks passed`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node packages/engine/tests/generator-fixture-microcycle.test.mjs`
Expected: FAIL — the flag is unknown; the Friday assertion may fail because nothing reshapes.

- [ ] **Step 3: Write minimal implementation**

In `packages/engine/src/lib/PlanGenerator.js`:

(a) Add imports (near line 25/33):

```js
import { deriveWeeklyObjective } from './microcycle/weeklyObjective.js';
import { mdMapForWeek, mdConstraintsFrom } from './microcycle/fixtureWeeks.js';
```

(b) Inside the per-week loop (replace lines 260–261). Currently:

```js
      const dayNames = chooseDays(availability, sportSpecs.length, profile.sport_days || []);
      let sessions = scheduleWeek({ sportSpecs, dayNames, busyDays, sportMuscles });
```

with:

```js
      const dayNames = chooseDays(availability, sportSpecs.length, profile.sport_days || []);
      // Phase 1 — fixture-aware microcycle (flag-gated, default OFF). Baseline-owned: fixtures
      // are deterministic from plan_start_date (Art 18). No flag / no fixtures / no sport → null
      // mdConstraints → scheduleWeek runs exactly as today (additive-identity).
      let mdConstraints = null;
      if (opts.fixtureMicrocycle && skbSportId && (profile.team_fixtures || profile.team_match_weekday != null)) {
        const { matchesThisWeek, mdOffsetByWeekday } = mdMapForWeek({
          fixtures: profile.team_fixtures || [], matchWeekday: profile.team_match_weekday ?? null,
          planStartDate: profile.plan_start_date || null, weekNum,
        });
        const wobj = deriveWeeklyObjective({
          blockObjective: null, microcycles: SKB.section(skbSportId, 'microcycles'), matchesThisWeek,
        });
        if (wobj.value.fixtureAware) mdConstraints = mdConstraintsFrom(wobj.value.spacingConstraints, mdOffsetByWeekday);
      }
      let sessions = scheduleWeek({ sportSpecs, dayNames, busyDays, sportMuscles, mdConstraints });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node packages/engine/tests/generator-fixture-microcycle.test.mjs`
Expected: PASS — flag OFF byte-identical; flag ON reshapes; flag ON w/o fixtures byte-identical.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/PlanGenerator.js packages/engine/tests/generator-fixture-microcycle.test.mjs
git commit -m "feat(engine): fixture-aware microcycle wiring behind opts.fixtureMicrocycle (default OFF)"
```

---

### Task 6: `applyTeamSchedule` stamps fixture inputs; reflow excludes `matches_this_week`

**Files:**
- Modify: `packages/engine/src/lib/plan/teamSchedule.js`
- Modify: `packages/engine/src/lib/sportKnowledge/reflowAdjust.js:23`
- Test: `apps/mobile/tests/team-schedule.js` (extend section 2); `packages/engine/tests/reflow-excludes-fixtures.test.mjs`

**Interfaces:**
- Produces: `applyTeamSchedule` additively stamps `next.team_fixtures = [{ dateISO, weekdayIdx }]` (upcoming `match` fixtures, `date >= asOf`, sorted) and `next.team_match_weekday` (recurring match weekday index or absent). `REFLOW_EXCLUDED_SIGNALS` gains `'matches_this_week'`.

- [ ] **Step 1: Write the failing tests**

Append to `apps/mobile/tests/team-schedule.js` section 2 (after the sport_days assertion at line 56):

```js
  // Phase 1 — fixture inputs are additively stamped for the fixture-aware microcycle.
  const withFix = applyTeamSchedule(profile(), { ...SCHEDULE, fixtures: [
    { id: 'a', type: 'match', label: 'x', date: '2026-07-25' },
    { id: 'b', type: 'match', label: 'y', date: '2026-07-18' },
    { id: 'c', type: 'pitch', label: 'z', date: '2026-07-20' },
  ] }, '2026-07-13');
  ok(Array.isArray(withFix.team_fixtures) && withFix.team_fixtures.length === 2, 'only match fixtures are stamped');
  ok(withFix.team_fixtures[0].dateISO === '2026-07-18', 'fixtures sorted ascending by date');
  ok(withFix.team_fixtures[0].weekdayIdx === 5, 'Saturday 2026-07-18 → weekday index 5');
  ok(withFix.team_match_weekday === 6, 'the recurring Sunday match weekday (pattern) is stamped (index 6)');
```

Create `packages/engine/tests/reflow-excludes-fixtures.test.mjs`:

```js
// Guards the double-count: matches_this_week must be EXCLUDED from the runtime reflow (baseline
// owns fixtures). A congested-week rule that would cut 50% at runtime is neutralised in reflow.
import assert from 'node:assert/strict';
import { ruleVolumeAdjustment } from '@performance-os/engine';
import { REFLOW_EXCLUDED_SIGNALS } from '@performance-os/engine/lib/sportKnowledge/reflowAdjust.js';

let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); console.log('PASS:', m); };
ok(REFLOW_EXCLUDED_SIGNALS.includes('matches_this_week'), 'reflow excludes matches_this_week');

const soccer = { sport: 'soccer', sport_code: 'soccer' };
// WITHOUT the exclusion, a 2-match week fires the congested cut. WITH the default exclusion it does not.
const excluded = ruleVolumeAdjustment(soccer, { matchesThisWeek: 2 });
ok(excluded.volumeMult === 1 && !excluded.forceDeload, 'default reflow: 2-match week does NOT cut volume');
const notExcluded = ruleVolumeAdjustment(soccer, { matchesThisWeek: 2 }, { excludeSignals: [] });
ok(notExcluded.volumeMult < 1, 'sanity: without exclusion the congested rule DOES fire (proves the guard is real)');
console.log(`\nreflow-excludes-fixtures: ${n}/${n} checks passed`);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node apps/mobile/tests/team-schedule.js` (fails: `team_fixtures` undefined) and `node packages/engine/tests/reflow-excludes-fixtures.test.mjs` (fails: `matches_this_week` not excluded).

- [ ] **Step 3: Write minimal implementation**

(a) In `packages/engine/src/lib/plan/teamSchedule.js` — add a weekday-index map and a fixture normaliser, then stamp inside `applyTeamSchedule`:

```js
// Weekday key → Monday-anchored index (Mon=0 … Sun=6), matching fixtureWeeks/scheduler.
const DAY_INDEX = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
const weekdayIdxOfISO = (iso) => { const d = new Date(iso + 'T00:00:00'); return isNaN(d.getTime()) ? null : (d.getDay() + 6) % 7; };

// Upcoming match fixtures (date >= asOf), normalised + sorted, for the fixture-aware microcycle.
function upcomingMatchFixtures(fixtures, asOf) {
  if (!asOf || !ISO_DATE.test(asOf)) return [];
  return fixtures
    .filter(f => f && f.type === 'match' && typeof f.date === 'string' && ISO_DATE.test(f.date) && f.date >= asOf)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(f => ({ dateISO: f.date, weekdayIdx: weekdayIdxOfISO(f.date) }))
    .filter(f => f.weekdayIdx != null);
}
```

Then, inside `applyTeamSchedule`, after the `eventDate` line (line 83) extend the early-return guard and add the stamps before `return changed ? next : profile;`:

```js
  const matchWeekdays = daysWhere(schedule.weeklyPattern, t => t === 'match').map(k => DAY_INDEX[k]);
  const teamFixtures = upcomingMatchFixtures(schedule.fixtures, asOf);
  // widen the "nothing to do" guard so fixture stamping alone still produces a new profile
  if (!matchDays.length && !loadDays.length && !eventDate && !teamFixtures.length && !matchWeekdays.length) return profile;
```

(replace the existing line 84 guard with the widened one above), and before the final return:

```js
  if (teamFixtures.length) { next.team_fixtures = teamFixtures; changed = true; }
  if (matchWeekdays.length) { next.team_match_weekday = matchWeekdays[0]; changed = true; }
```

(b) In `packages/engine/src/lib/sportKnowledge/reflowAdjust.js` — change line 23 and tighten the header note (lines 18–22) to say baseline now owns fixtures:

```js
export const REFLOW_EXCLUDED_SIGNALS = ['season', 'matches_this_week'];
```

- [ ] **Step 4: Run tests to verify they pass**

Run both test files; expected PASS on each. Note the `matches_this_week` guard test proves the exclusion is real (fires without it, silent with it).

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/plan/teamSchedule.js packages/engine/src/lib/sportKnowledge/reflowAdjust.js apps/mobile/tests/team-schedule.js packages/engine/tests/reflow-excludes-fixtures.test.mjs
git commit -m "feat(engine): stamp team fixtures onto profile; exclude matches_this_week from reflow"
```

---

### Task 7: Whole-suite verification — prove flag-OFF byte-identity (PR A gate)

**Files:**
- Modify: `apps/mobile/tests/__snapshots__/engine-golden-master.json` (stamp-only, via `UPDATE=1`)
- Create: `docs/superpowers/plans/EXPECTED-DELTA-2026-07-17.md`

- [ ] **Step 1: Run the engine property + unit suites**

Run: `npm test` and the engine suite. Expected: green EXCEPT golden-master, which should report ONLY the `meta.provenance.knowledgeSetVersion` field changing from `1.47.0` → `1.48.0` on every archetype (the KSV stamp) — no session/placement changes (flag is OFF everywhere).
Explicitly confirm: `node packages/engine/tests/prop-reflow-baseline.test.mjs`, `prop-additive-identity.test.mjs`, `prop-purity.test.mjs`, `prop-determinism.test.mjs`, `weekly-objective-contract.test.mjs` all PASS.

- [ ] **Step 2: Inspect the golden diff before re-baselining**

Run: `node apps/mobile/tests/golden-master.js` (compare mode). Read the reported diff and verify EVERY changed line is a `knowledgeSetVersion` stamp — abort if any `sessions`/`dayIdx`/`items` field moved (that would mean the flag leaked).

- [ ] **Step 3: Re-baseline the stamp**

Run: `UPDATE=1 node apps/mobile/tests/golden-master.js`

- [ ] **Step 4: Write the expected-delta note**

```md
# EXPECTED DELTA — 2026-07-17 Phase 1 PR A (KSV 1.47.0 → 1.48.0)

Scope: STAMP-ONLY. Every golden archetype changes exactly one field —
`meta.provenance.knowledgeSetVersion` 1.47.0 → 1.48.0 — from the new governed
`SCHEDULING_PENALTIES.md` weights. NO session/dayIdx/items field moved: the
`fixtureMicrocycle` flag is OFF for every archetype in the matrix. The behaviour
flip (one new fixture-bearing archetype moves) is PR B / Task 8.
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/tests/__snapshots__/engine-golden-master.json docs/superpowers/plans/EXPECTED-DELTA-2026-07-17.md
git commit -m "test(engine): re-baseline golden stamp KSV 1.48.0 (Phase 1 PR A, flag OFF, byte-identical)"
```

**PR A ends here.** Open the PR; it is green + low-risk (flag OFF, additive) and merges under the standing charter. `npm run dev` still runs (no app-path change).

---

# PR B — the flip (behaviour change; scoped, audited; PAUSES for Simon)

**PR-B prerequisites (surfaced by PR A's final whole-branch review — do these first):**
- **Anchor the MD token regex.** In `fixtureWeeks.js` `offsetsFrom`, change `/MD([+-]\d+)?/g`
  to `\b`-anchored (`/\bMD([+-]\d+)?\b/g`) so a future SKB token like `"UMD-3"` can't silently
  parse. PR B is exactly when SKB spacing-constraint vocabulary widens.
- **Confirm `preferExplosiveWorkDays` authoring.** The power nudge is driven by
  `preferExplosiveWorkDays`, NOT the prose `powerDay` field (which is parsed-then-ignored). Verify
  every SKB sport that should be fixture-shaped authors `preferExplosiveWorkDays`, or the power
  positioning silently no-ops. Add a one-line note to the SKB authoring guide.
- **Optional cosmetic fold-ins:** align `scheduler.js` `let nearest = 7` → `99` (file convention);
  DRY `teamSchedule.js` `matchWeekdays = matchDays.map(k => DAY_INDEX[k])`.

### Task 8: Flip the flag on the app path + one audited fixture archetype

**Files:**
- Modify: `apps/mobile/src/lib/PlanService.js` (`profileSignature` + the `generatePlan` call at line 406)
- Modify: `apps/mobile/tests/golden-master.js` (add ONE fixture-bearing archetype via `OPTS_MATRIX`)
- Modify: `apps/mobile/tests/team-schedule.js` (MD-placement end-to-end assertion)
- Modify: `apps/mobile/tests/plan-memo-signature.js` (cover the new signature fields)
- Modify: `apps/mobile/src/screens/DevPlayground.jsx` (a dev-only fixture preset for eyeballing)
- Modify: `apps/mobile/tests/__snapshots__/engine-golden-master.json` (`UPDATE=1` — ONE new key only)

**Interfaces:**
- Consumes: everything from PR A. `activeProfile()` already runs `applyTeamSchedule` (PlanService.js:36-38), so the profile reaching `generatePlan` already carries `team_fixtures`/`team_match_weekday`.

- [ ] **Step 1: Write the failing end-to-end test** — append to `apps/mobile/tests/team-schedule.js` section 4:

```js
  // Phase 1 flip: a fixed-date soccer schedule with a Saturday fixture positions the heavy
  // day away from MD-1. Uses a FIXED plan_start_date so placement is deterministic.
  const fixedSoccer = () => answersToProfile({
    ...BLANK_ANSWERS, goalType: 'sport', sport: 'soccer', skbSport: 'soccer',
    experienceLevel: 'intermediate', daysPerWeek: 3, days: ['tue', 'thu', 'fri'],
    strengthAccess: 'full_gym', sportSeason: 'off_season',
  });
  const fp = { ...fixedSoccer(), plan_start_date: '2026-07-13' };
  const sched = { weeklyPattern: PATTERN(['gym', 'gym', 'gym', 'gym', 'gym', 'rest', 'match']),
    fixtures: [{ id: 'm', type: 'match', label: 'league', date: '2026-07-18' }] };
  const withSched = applyTeamSchedule(fp, sched, '2026-07-13');
  const flipped = generatePlan(withSched, { fixtureMicrocycle: true });
  const fri = flipped.phases[0].weeks[0].sessions.find((s) => s.dayIdx === 4); // Friday = MD-1
  ok(!fri || fri.axialLoad < 3, `flip: no heavy-axial gym work on Friday (MD-1) (axial ${fri?.axialLoad})`);
```

- [ ] **Step 2: Run to verify it fails**

Run: `node apps/mobile/tests/team-schedule.js`
Expected: FAIL — the flip test fails until `generatePlan` is called with the flag on this path (it already is in the test, so this should actually pass once Task 5/6 landed; if it fails it reveals a placement bug to fix before flipping the app).

- [ ] **Step 3: Flip the app path** — in `apps/mobile/src/lib/PlanService.js`:

(a) Add the fixture fields to `profileSignature` (after line 366, alongside `spd`):

```js
    // Phase 1: team fixtures drive MD-relative placement — a fixture change must regenerate.
    tf: profile.team_fixtures, tmw: profile.team_match_weekday,
```

(b) Pass the flag at line 406:

```js
    _cache = { sig, plan: generatePlan(profile, { fixtureMicrocycle: true }) };
```

- [ ] **Step 4: Add the audited golden archetype** — in `apps/mobile/tests/golden-master.js`, add to `OPTS_MATRIX` (the second-`generatePlan`-arg matrix, near line 185) a fixture-bearing soccer archetype built from a FIXED start date + `applyTeamSchedule` + the flag. Import `applyTeamSchedule` at the top:

```js
import { applyTeamSchedule } from '@performance-os/engine/lib/plan/teamSchedule.js';

// Fixture-bearing soccer: FIXED start (Mon 2026-07-13) + a Saturday fixture, flag ON. This is
// the ONE archetype that legitimately moves on the flip — heavy work placed off MD-1/MD/MD+1.
// Fixed dates (not today-anchored) keep the MD placement deterministic across runs.
const FIXTURE_SOCCER = (() => {
  const base = { ...answersToProfile({ ...BLANK_ANSWERS, goalType: 'sport', skbSport: 'soccer',
    sportIntent: 'compete', sportSeason: 'off_season', experienceLevel: 'intermediate',
    daysPerWeek: 3, days: ['tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
    plan_start_date: '2026-07-13' };
  const schedule = { weeklyPattern: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) =>
    ({ day, type: i === 6 ? 'match' : 'gym' })),
    fixtures: [{ id: 'm', type: 'match', label: 'league', date: '2026-07-18' }] };
  return applyTeamSchedule(base, schedule, '2026-07-13');
})();
```

Then register it in `OPTS_MATRIX` with the flag as the second `generatePlan` arg (follow the existing `OPTS_MATRIX` shape — a `{ profile, opts }` entry keyed `'sport·soccer·fixture-md·intermediate·3d(flip)'`, generated as `generatePlan(entry.profile, entry.opts)` with `opts = { fixtureMicrocycle: true }`).

- [ ] **Step 5: Re-baseline ONLY the new key + verify no others move**

Run: `node apps/mobile/tests/golden-master.js` — expect exactly ONE new key added, ZERO existing keys changed. Then `UPDATE=1 node apps/mobile/tests/golden-master.js`.
Run: `node packages/engine/tests/prop-reflow-baseline.test.mjs` — must stay HARD-green (no fixture signal leaks to reflow).
Run: `npm test` — full suite green.

- [ ] **Step 6: Add the DevPlayground fixture preset (eyeball) + commit**

Add a dev-only preset in `apps/mobile/src/screens/DevPlayground.jsx` that builds a soccer profile, runs it through `applyTeamSchedule` with a Saturday fixture + fixed `plan_start_date`, and calls `generatePlan(profile, { fixtureMicrocycle: true })`, so the heavy/power/recovery placement is visible (session `_objective` rationale already renders). Then:

```bash
git add apps/mobile/src/lib/PlanService.js apps/mobile/tests/golden-master.js apps/mobile/tests/team-schedule.js apps/mobile/tests/plan-memo-signature.js apps/mobile/src/screens/DevPlayground.jsx apps/mobile/tests/__snapshots__/engine-golden-master.json
git commit -m "feat: flip fixture-aware microcycle on the app path (one audited archetype moves)"
```

**PR B PAUSES for Simon** — it is a behaviour change with a golden re-baseline and touches the coaching-philosophy calls flagged in the spec (congested-week volume, sentinel semantics, penalty weights). Do NOT self-merge; present the scoped diff + the DevPlayground screenshot for review.

---

## Self-review notes (spec coverage)

- Spec §Phase-1 items 1–5 → Tasks 6, 1–2, 5, 4, 6 respectively. ✅
- Flag + safe flip → Tasks 5 (flag), 7 (flag-OFF byte-identity), 8 (flip). ✅
- Additive-identity → asserted in Task 5 (flag ON w/o fixtures) + Task 7 (prop-additive-identity). ✅
- Double-count guard → Task 6 (`reflow-excludes-fixtures`) + Task 8 (`prop-reflow-baseline` hard-green). ✅
- Determinism trap (fixture weekday vs today-anchoring) → resolved in Task 8 by a FIXED `plan_start_date` archetype. ✅
- Simon's coaching calls (congested volume cut, sentinel semantics, penalty weights, chooseDays fixture-awareness) → OUT of scope for Phase 1, carried in the spec; sentinels yield null (byte-safe) in Task 2. ✅
```
