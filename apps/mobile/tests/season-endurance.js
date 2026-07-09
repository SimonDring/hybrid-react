// tests/season-endurance.js — season-phased SKB: the round-out is SPORT-DERIVED, not "add upper".
// Each endurance sport rounds out what IT under-develops: runner/cyclist → upper, swimmer → lower.
import { resolveProgram } from '@performance-os/engine';
function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

const prog = (sport, code, disc, season) => resolveProgram({
  goal_type: 'sport', sport, sport_code: code, run_discipline: disc,
  sport_intent: 'compete', sport_season: season, access: ['full_gym'], experience_level: 'intermediate',
});

// swimmer: upper/pull-dominant sport → off-season round-out adds LOWER (squat/hinge/calf).
const swimOff = prog('swim', 'swimming', null, 'off');
assert(swimOff.roundOut.patterns.includes('squat') && swimOff.roundOut.patterns.includes('hinge') && swimOff.roundOut.patterns.includes('calf'),
  'T1 swimmer round-out adds LOWER (squat/hinge/calf) — not upper');
assert(!swimOff.roundOut.patterns.includes('horizontal_push'), 'T2 swimmer round-out does NOT add push (already trained)');

// cyclist: leg-dominant → off-season round-out adds UPPER.
const cycOff = prog('cycle', 'cycling', null, 'off');
assert(cycOff.roundOut.patterns.includes('horizontal_push'), 'T3 cyclist round-out adds upper push');

// distance runner → upper push + pull.
const longOff = prog('run', 'running_long', 'long', 'off');
assert(longOff.roundOut.patterns.includes('horizontal_push') && longOff.roundOut.patterns.includes('horizontal_pull'),
  'T4 distance runner round-out adds upper push+pull');

// sprinter: shoulders already trained (1.10) → no vertical_push in the round-out.
const sprintOff = prog('run', 'running_sprint', 'sprint', 'off');
assert(sprintOff.roundOut.patterns.includes('horizontal_push') && !sprintOff.roundOut.patterns.includes('vertical_push'),
  'T5 sprinter round-out adds push but NOT vertical_push (shoulders already emphasised)');

// triathlon: balanced already → a light push round-out.
const triOff = prog('run', 'triathlon', null, 'off');
assert(triOff.roundOut.patterns.includes('horizontal_push'), 'T6 triathlon round-out adds push');

// the arc holds for every migrated endurance sport: 1 round-out session off, 0 in.
for (const [sport, code, disc] of [['swim', 'swimming', null], ['cycle', 'cycling', null], ['run', 'running_long', 'long'], ['run', 'running_sprint', 'sprint'], ['run', 'triathlon', null]]) {
  assert(prog(sport, code, disc, 'off').programming.roundOutSessionsPerWeek === 1, `T7 ${code} off has a round-out session`);
  assert(prog(sport, code, disc, 'in').programming.roundOutSessionsPerWeek === 0, `T8 ${code} in has NO round-out session`);
}
