// tests/volume-band.js — experience now scales BOTH the ramp start and the top.
import { weeklyMuscleTargets } from '@performance-os/engine/lib/strength/targets.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const chest = (over) => weeklyMuscleTargets({
  style: 'bodybuilding', intent: 'build', phaseWeeks: 1, weekInPhase: 1,
  deload: false, emphasis: {}, volumeScalar: 1, ...over
}).chest;

// Advanced bodybuilding chest (MEV 8 / MAV 16 / MRV 22):
const advWk1  = chest({ level: 'advanced', blockFrac: 0 });
const advPeak = chest({ level: 'advanced', blockFrac: 1 });
assert(advWk1 >= 14 && advWk1 <= 18, `advanced BB chest week 1 ~16 (got ${advWk1})`);
assert(advPeak >= 21 && advPeak <= 22, `advanced BB chest peak near MRV 22 (got ${advPeak})`);

// Beginner still starts at MEV in week 1 (no near-MEV penalty for experienced only):
const begWk1 = chest({ level: 'beginner', blockFrac: 0 });
assert(begWk1 >= 7 && begWk1 <= 9, `beginner BB chest week 1 ~MEV 8 (got ${begWk1})`);

// Intermediate week 1 sits clearly above beginner (started higher up the band):
const intWk1 = chest({ level: 'intermediate', blockFrac: 0 });
assert(intWk1 > begWk1 + 1, `intermediate week 1 above beginner (int ${intWk1} > beg ${begWk1})`);

// Deload still drops to ~MEV regardless of level:
const advDeload = chest({ level: 'advanced', blockFrac: 1, deload: true });
assert(advDeload >= 7 && advDeload <= 9, `advanced deload ~MEV 8 (got ${advDeload})`);

console.log('volume-band done');
