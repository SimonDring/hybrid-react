// tests/load-class.js — exercises carry the right loadClass (default loaded).
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const cls = (id) => (EXERCISES.find(e => e.id === id) || {}).loadClass;

assert(cls('back_squat') === undefined, 'loaded is the default (no loadClass on back_squat)');
assert(cls('ab_wheel') === undefined, 'ab wheel stays loaded (dynamic core)');
assert(cls('plank') === 'isoCore' && cls('dead_bug') === 'isoCore' && cls('bird_dog') === 'isoCore', 'isometric/anti-movement core = isoCore');
assert(cls('prone_y_raise') === 'health' && cls('band_pull_apart') === 'health' && cls('ankle_plantarflex_band') === 'health', 'scapular/prehab = health');
assert(cls('bw_squat') === 'bodyweightStrength' && cls('pushup') === 'bodyweightStrength', 'bodyweight strength work = bodyweightStrength');
assert(cls('pullup') === undefined, 'pull-up stays loaded (weightable, stays hard)');
assert(!EXERCISES.some(e => 'activationPrimer' in e), 'activationPrimer flag retired');

console.log('load-class done');
