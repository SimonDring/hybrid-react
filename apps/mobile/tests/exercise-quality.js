// tests/exercise-quality.js — exercises carry the right training quality (default general).
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const q = (id) => (EXERCISES.find(e => e.id === id) || {}).quality;

assert(q('back_squat') === undefined && q('bench') === undefined && q('deadlift') === undefined, 'big compounds stay general (no quality tag)');
assert(q('hip_thrust') === undefined, 'hip thrust stays general (never gated despite sportTags)');
assert(q('hang_clean') === 'power' && q('power_clean') === 'power' && q('depth_jump') === 'power' && q('sled_push') === 'power', 'Olympic lifts + plyos = power');
assert(q('leg_ext') === 'hypertrophy' && q('chest_fly') === 'hypertrophy' && q('spider_curl') === 'hypertrophy', 'isolation = hypertrophy');
assert(q('pause_squat') === 'strength' && q('rack_pull') === 'strength' && q('deficit_deadlift') === 'strength', 'heavy specialist variants = strength');

console.log('exercise-quality done');
