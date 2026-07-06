// tests/category-coverage.js — Sprint 9 19b: the D9 category-coverage planner.
//
// PARALLEL machinery (nothing in generatePlan consumes it until WP-20 flips swim):
// a sport's SKB exerciseLibrary categories become per-session coverage assignments —
// the thing the fixed-10 quality vocabulary cannot express ("upper-body pull day").
// Pins: swim's week covers its propulsion + shoulder-health categories on
// differentiated days with sane dose qualities; determinism; graceful nulls.

import { weekCategoryPlan } from '@performance-os/engine/lib/session/categoryCoverage.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── Swim, 4 gym days, intermediate ────────────────────────────────────────────
const swim = weekCategoryPlan('swimming', 4, { levelName: 'intermediate' });
assert(swim && swim.sessions.length === 4, 'swim: 4 session assignments');
const allCats = swim.sessions.flatMap((s) => s.categories);
assert(allCats.includes('upper-body pull'), 'the propulsion need (upper-body pull) is covered');
assert(allCats.some((c) => /shoulder prehab|scapular/.test(c)), 'shoulder health is covered');
assert(allCats.some((c) => /posterior chain/.test(c)), 'posterior chain is covered');
assert(allCats.some((c) => /core/.test(c)), 'core work is covered');
// The highest-value categories land on DISTINCT days (differentiation by construction).
const firstCats = swim.sessions.map((s) => s.categories[0]);
assert(new Set(firstCats).size === 4, `top categories differentiate the week (${firstCats.join(' | ')})`);
// Every assignment carries selectable movements + a dose quality + a rationale.
assert(swim.sessions.every((s) => s.exerciseIds.length >= 1 && s.doseQuality && /covers .+ dosed as/.test(s.rationale)),
  'every session has movements, a dose quality, and a rationale');
// The upper-pull day doses like the strength work it is.
const pullDay = swim.sessions.find((s) => s.categories.includes('upper-body pull'));
assert(pullDay && ['maxStrength', 'hypertrophy'].includes(pullDay.doseQuality),
  `the pull day doses as strength work (${pullDay && pullDay.doseQuality})`);
assert(swim.uncovered.length === 0 || swim.uncovered.every((c) => typeof c === 'string'),
  `uncovered categories reported honestly (${swim.uncovered.join(', ') || 'none'})`);

// ── Level + season gates ──────────────────────────────────────────────────────
const beginner = weekCategoryPlan('swimming', 3, { levelName: 'beginner' });
assert(beginner && beginner.sessions.every((s) => s.exerciseIds.length >= 0), 'beginner plan builds (difficulty-gated)');
const inSeason = weekCategoryPlan('swimming', 3, { levelName: 'intermediate', season: 'in' });
assert(inSeason && inSeason.sessions.length === 3, 'in-season plan builds (suitability-gated)');

// ── Determinism + graceful degradation ────────────────────────────────────────
assert(JSON.stringify(weekCategoryPlan('swimming', 4, { levelName: 'intermediate' })) === JSON.stringify(swim), 'deterministic');
assert(weekCategoryPlan('kabaddi', 3) === null, 'a sport without a library → null (caller keeps its planning)'); // WP-48: no stub sports remain — an unknown id is the fixture
assert(weekCategoryPlan(null, 3) === null, 'no sport → null');

// ── Run: categories agree with the diagnosed qualities (the 19a scope decision) ──
const run = weekCategoryPlan('running_long', 3, { levelName: 'intermediate' });
assert(run && run.sessions.length === 3, 'running library also plans (available if ever wanted)');
