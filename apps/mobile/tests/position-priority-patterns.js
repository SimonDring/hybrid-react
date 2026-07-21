// tests/position-priority-patterns.js — Sprint 3 Task B2: the POSITION priority-pattern nudge.
// Each position in the five team-sport SKBs now declares a structured `priorityPatterns` list
// (authored from its gymPriorities prose), and D11 (selectInterventions) gains a small GOVERNED
// additive nudge preferring candidates whose movement pattern is in the athlete's position list.
//
// The two contracts this pins (the mirror of select-interventions.js for the position seam):
//   (a) PREFERENCE difference — two positions of the SAME sport whose priorityPatterns differ
//       produce a DIFFERENT selection ordering (the nudge actually steers), and directionally the
//       position that lists a pattern ranks that pattern's exercise NO LATER than the one that
//       doesn't.
//   (b) NUDGE, not GATE — the candidate POOL is identical with/without a position: under an
//       unbounded fatigue budget the SET of picked ids is the same regardless of position (the
//       nudge only re-orders WITHIN a quality tier; it never makes an exercise unavailable).
import { selectInterventions } from '@performance-os/engine/lib/plan/selectInterventions.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
import { muscleContribution } from '@performance-os/engine/lib/plan/contributions.js';
import * as SKB from '@performance-os/engine/lib/sportKnowledge/index.js';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

const makePick = (ex) => ({ ex, sets: ex.role === 'primary' ? 4 : 3, contrib: muscleContribution(ex), effectiveRole: ex.role });
const FULL = new Set(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'kettlebell']);
const bigCeiling = {}; for (const e of EXERCISES) for (const m in muscleContribution(e)) bigCeiling[m] = 999;

// Real SKB position patterns — the test is tied to the authored data, so a drift in either the
// SKB or the resolver fails loudly here.
const positions = SKB.section('rugby', 'positions') || [];
const patternsFor = (name) => (positions.find((p) => p.name === name) || {}).priorityPatterns;
const frontRow = patternsFor('Front row (props & hooker)');       // ['hinge','squat','core']
const halfBacks = patternsFor('Half-backs (scrum-half & fly-half)'); // ['hinge','lunge','core']

// T0 — fixtures present + they genuinely differ (squat vs lunge) so the nudge has something to move.
assert(Array.isArray(frontRow) && frontRow.length >= 2, 'T0a rugby front row declares priorityPatterns');
assert(Array.isArray(halfBacks) && halfBacks.length >= 2, 'T0b rugby half-backs declare priorityPatterns');
assert(frontRow.includes('squat') && !halfBacks.includes('squat'), 'T0c front row lists squat, half-backs do not');
assert(halfBacks.includes('lunge') && !frontRow.includes('lunge'), 'T0d half-backs list lunge, front row do not');

// A max-strength lower session admitting squat, hinge and lunge drivers — both squat and lunge
// compounds are eligible, so the position nudge can re-order them against each other.
const req = {
  objective: { targetQuality: 'maxStrength', fatigueBudget: { level: 'high' } },
  requirements: { movementPatterns: ['squat', 'hinge', 'lunge'], contraindicated: [] },
};
const run = (positionPatterns) => selectInterventions({
  req, equip: FULL, level: 3, levelName: 'advanced', sport: 'rugby',
  skbIds: new Set(), ledger: { weeklyDelivered: {}, weeklyCeiling: bigCeiling }, makePick, positionPatterns,
});

const ids = (picks) => picks.map((p) => p.ex.id);
const frontPicks = run(frontRow);
const halfPicks = run(halfBacks);
const noPos = run(null);

// ── (a) preference difference ─────────────────────────────────────────────────
assert(JSON.stringify(ids(frontPicks)) !== JSON.stringify(ids(halfPicks)),
  'A1 two positions with different priorityPatterns produce a different selection ordering');

// directional: squat (a maxStrength primary compound) leads the no-position baseline. The
// squat-listing position (front row) preserves that lead — squat AND hinge are both boosted, so
// their relative order is unchanged. The position that lists hinge but NOT squat (half-backs)
// boosts hinge past squat, DEMOTING squat below the baseline. Both moves are the nudge at work.
const rank = (picks, pattern) => picks.findIndex((p) => p.ex.pattern === pattern);
const squatFront = rank(frontPicks, 'squat'), squatHalf = rank(halfPicks, 'squat'), squatNone = rank(noPos, 'squat');
assert(squatFront !== -1 && squatNone !== -1, 'A2 a squat driver is selected (front row + no-position baseline)');
assert(squatFront < squatHalf,
  `A3 squat ranks strictly earlier for the squat-listing position than the hinge-listing one (front ${squatFront} < half ${squatHalf})`);
assert(squatFront === squatNone,
  `A4 the squat-listing position preserves squat's natural top rank (front ${squatFront} == baseline ${squatNone})`);
assert(squatHalf > squatNone,
  `A5 the hinge-listing position demotes squat below the baseline (half ${squatHalf} > baseline ${squatNone}) — the nudge lifted hinge past it`);

// ── (b) nudge, not gate ───────────────────────────────────────────────────────
// Under the (already generous) budget the candidate POOL each position draws from is identical —
// the nudge only changes ORDER, never membership. Proven by the SET of picked ids being equal
// across both positions and the no-position baseline.
const set = (picks) => [...new Set(ids(picks))].sort();
assert(JSON.stringify(set(frontPicks)) === JSON.stringify(set(halfPicks)),
  'B1 the picked SET is identical across the two positions (nudge re-orders, never gates)');
assert(JSON.stringify(set(frontPicks)) === JSON.stringify(set(noPos)),
  'B2 the picked SET matches the no-position baseline (position never removes a candidate)');
assert(frontPicks.length === noPos.length && halfPicks.length === noPos.length,
  'B3 the same number of interventions is selected with or without a position');

// ── determinism / purity ──────────────────────────────────────────────────────
assert(JSON.stringify(run(frontRow)) === JSON.stringify(frontPicks), 'C1 deterministic under a fixed position');
