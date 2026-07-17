// tests/session-sequence.js — supportive work is sequenced last: working → core → health.
import { allocateGym } from '@performance-os/engine/lib/session/sessionBuilder.js';
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

// ── Supersets: heavy / high-CNS work and the session's lead lift must run STRAIGHT ──
// Mirror of the engine's cnsTier(): high-CNS work is never eligible to be supersetted.
const cnsTierOf = (e) => {
  if (!e) return 'low';
  if (e.cns) return e.cns;
  if (e.role === 'primary' || (e.axialLoad || 0) >= 2 || e.quality === 'power') return 'high';
  if ((e.axialLoad || 0) >= 1) return 'moderate';
  if (e.role === 'iso' || e.pattern === 'core' || e.pattern === 'calf' || e.loadClass === 'health') return 'low';
  return 'moderate';
};
const exByName = (name) => EXERCISES.find(x => x.name === name);

// A strength session, advanced level, posterior-heavy → likely to pull in heavy hinge
// accessories (RDL / Good morning / Rack pull) that used to get supersetted.
const heavy = allocateGym({
  targets: { hamstrings: 12, glutes: 10, back: 12, biceps: 6, quads: 8 },
  slots: [{ minutes: 75, equip: FULL }],
  ctx: { style: 'strength', level: 'advanced', weekNum: 1, access: FULL }
})[0];

assert(heavy.items.length > 0 && !heavy.items[0].superset, 'anchor (lead lift) runs straight-set, never supersetted');

const supersettedHighCns = heavy.items.filter(it => it.superset && cnsTierOf(exByName(it.name)) === 'high');
assert(supersettedHighCns.length === 0,
  `no high-CNS exercise is supersetted (offenders: ${supersettedHighCns.map(i => i.name).join(', ') || 'none'})`);

console.log('session-sequence done');
