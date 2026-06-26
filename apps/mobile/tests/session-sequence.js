// tests/session-sequence.js — supportive work is sequenced last: working → core → health.
import { allocateGym } from '@performance-os/engine/lib/plan/allocator.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const classOf = (name) => { const e = EXERCISES.find(x => x.name === name); return e ? (e.loadClass || 'loaded') : 'loaded'; };
const rank = (it) => { const c = classOf(it.name); return c === 'health' || it.tag === 'mobility' ? 2 : (c === 'isoCore' ? 1 : 0); };

const spec = allocateGym({ targets: { core: 10, quads: 10, chest: 8, back: 8 }, slots: [{ minutes: 75, equip: FULL }], ctx: { style: 'functional', level: 'beginner', weekNum: 1, access: FULL } })[0];
const ranks = spec.items.map(rank);
const nonDecreasing = ranks.every((r, i) => i === 0 || r >= ranks[i - 1]);
assert(nonDecreasing, `working → core → health order (ranks: ${ranks.join('')})`);

console.log('session-sequence done');
