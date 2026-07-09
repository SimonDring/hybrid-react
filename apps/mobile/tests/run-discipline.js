// tests/run-discipline.js
import { resolvePeriodization, deriveSeason } from '@performance-os/engine/lib/plan/periodization.js';
import { resolveProgram } from '@performance-os/engine/lib/strength/program.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Event windows are measured from plan_start_date, never the clock (Art 18).
const ANCHOR   = '2026-07-06';
const FAR_OUT  = '2027-03-06';   // ~8 months after the anchor → 'off'
const PRE_RACE = '2026-09-04';   // 60 days after the anchor → 'pre'

// ── T1: deriveSeason unaffected by run_discipline ──────────────────────────
assert(
  deriveSeason({ sport: 'run', run_discipline: 'sprint', plan_start_date: ANCHOR, event_date: FAR_OUT }) === 'off',
  'T1 deriveSeason ignores run_discipline — still returns off'
);

// ── T2–T4: resolvePeriodization — sprint ──────────────────────────────────
assert(
  resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'sprint', sport_intent: 'build_base' }).totalWeeks === 6,
  'T2 sprint off-season → 6 weeks'
);
assert(
  resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'sprint', plan_start_date: ANCHOR, event_date: PRE_RACE }).totalWeeks === 4,
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
  resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'middle', plan_start_date: ANCHOR, event_date: PRE_RACE }).totalWeeks === 6,
  'T6 middle pre-season → 6 weeks (reuses sportPre)'
);

// ── T7: resolvePeriodization — long ───────────────────────────────────────
assert(
  resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'long', sport_intent: 'build_base' }).totalWeeks === 12,
  'T7 long off-season → 12 weeks (falls through to sportOff)'
);

// ── T8: resolvePeriodization — no discipline falls back ───────────────────
assert(
  resolvePeriodization({ goal_type: 'sport', sport: 'run', sport_intent: 'build_base' }).totalWeeks === 10,
  'T8 no run_discipline → the middle prior, 10 weeks (deliberate default 2026-07-04 — was the generic sportOff fallback)'
);

// ── T9–T10: resolveProgram — priority list (derived from the exerciseLibrary, P2 2026-07-09) ──
// sprint prioritises power/olympic work (power_clean); tibialis_raise is a run-long/middle prehab
// that isn't in the sprint library → not derived here.
const sprintProg = resolveProgram({ goal_type: 'sport', sport: 'run', run_discipline: 'sprint', experience: { gym: 'intermediate' }, access: ['full_gym'] });
assert(
  sprintProg.exercisePriority.includes('power_clean'),
  'T9 sprint priority (derived) leads with power/olympic work (power_clean)'
);
assert(
  !sprintProg.exercisePriority.includes('tibialis_raise'),
  'T10 sprint priority does NOT include tibialis_raise'
);

// ── T11–T12: resolveProgram — emphasis ────────────────────────────────────
// long-distance emphasis config: calves: 1.4 (achilles tendon), chest: 0.45 (avoid mass).
// Season-phased SKB (2026-07-09): this sport-specific vector is the IN-SEASON one (off-season
// rounds it out); pin sport_season:'in' to assert it.
const longProg = resolveProgram({ goal_type: 'sport', sport: 'run', run_discipline: 'long', sport_season: 'in', experience: { gym: 'intermediate' } });
assert(
  longProg.emphasis.calves === 1.4,
  'T11 long distance calves emphasis = 1.4'
);
assert(
  longProg.emphasis.chest === 0.45,
  'T12 long distance chest emphasis = 0.45'
);
