// tests/run-discipline.js
import { resolvePeriodization, deriveSeason } from '../src/lib/plan/periodization.js';
import { resolveProgram } from '../src/lib/strength/program.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Relative date helpers (unambiguous regardless of when tests run)
const FAR_OUT  = new Date(); FAR_OUT.setMonth(FAR_OUT.getMonth() + 8);  // ~8 months out → 'off'
const PRE_RACE = new Date(); PRE_RACE.setDate(PRE_RACE.getDate() + 60); // 60 days out → 'pre'
function dateStr(d) { return d.toISOString().slice(0, 10); }

// ── T1: deriveSeason unaffected by run_discipline ──────────────────────────
assert(
  deriveSeason({ sport: 'run', run_discipline: 'sprint', event_date: dateStr(FAR_OUT) }) === 'off',
  'T1 deriveSeason ignores run_discipline — still returns off'
);

// ── T2–T4: resolvePeriodization — sprint ──────────────────────────────────
assert(
  resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'sprint', sport_intent: 'build_base' }).totalWeeks === 6,
  'T2 sprint off-season → 6 weeks'
);
assert(
  resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'sprint', event_date: dateStr(PRE_RACE) }).totalWeeks === 4,
  'T3 sprint pre-season (60d out) → 4 weeks'
);
assert(
  resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'sprint', sport_intent: 'compete' }).totalWeeks === 4,
  'T4 sprint in-season (intent=compete) → 4 weeks (sportIn)'
);

// ── T5–T6: resolvePeriodization — middle ──────────────────────────────────
assert(
  resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'middle', sport_intent: 'build_base' }).totalWeeks === 10,
  'T5 middle off-season → 10 weeks'
);
assert(
  resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'middle', event_date: dateStr(PRE_RACE) }).totalWeeks === 6,
  'T6 middle pre-season → 6 weeks (reuses sportPre)'
);

// ── T7: resolvePeriodization — long ───────────────────────────────────────
assert(
  resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'long', sport_intent: 'build_base' }).totalWeeks === 12,
  'T7 long off-season → 12 weeks (falls through to sportOff)'
);

// ── T8: resolvePeriodization — no discipline falls back ───────────────────
assert(
  resolvePeriodization({ goal_type: 'sport', sport: 'run', sport_intent: 'build_base' }).totalWeeks === 12,
  'T8 no run_discipline → 12 weeks (existing sportOff fallback)'
);

// ── T9–T10: resolveProgram — priority list ────────────────────────────────
// hang_clean is in run_sprint priority list; tibialis_raise is run_long/middle only
const sprintProg = resolveProgram({ goal_type: 'sport', sport: 'run', run_discipline: 'sprint', experience: { gym: 'intermediate' } });
assert(
  sprintProg.exercisePriority.includes('hang_clean'),
  'T9 sprint program includes hang_clean in priority list'
);
assert(
  !sprintProg.exercisePriority.includes('tibialis_raise'),
  'T10 sprint program does NOT include tibialis_raise'
);

// ── T11–T12: resolveProgram — emphasis ────────────────────────────────────
// long-distance emphasis config: calves: 1.4 (achilles tendon), chest: 0.45 (avoid mass)
const longProg = resolveProgram({ goal_type: 'sport', sport: 'run', run_discipline: 'long', experience: { gym: 'intermediate' } });
assert(
  longProg.emphasis.calves === 1.4,
  'T11 long distance calves emphasis = 1.4'
);
assert(
  longProg.emphasis.chest === 0.45,
  'T12 long distance chest emphasis = 0.45'
);
