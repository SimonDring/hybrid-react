// tests/primers.js
// The movement-specific PRIMER: each session gets short activation moves matched to
// its main lifts (band pull-aparts before bench, glute bridges before squat), with a
// no-kit swap when the athlete lacks the equipment. Primer items are tagged
// `mobility` so they add ZERO counted volume. See data/primers.js + lib/plan/primers.js.
import { buildPrimer, patternForName } from '@performance-os/engine/lib/plan/primers.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── patternForName ─────────────────────────────────────────────────────────
assert(patternForName('Bench press') === 'hpush', 'bench → hpush');
assert(patternForName('Back squat') === 'squat', 'back squat → squat');
assert(patternForName('Hack / leg-press') === 'squat', 'leg press → squat (not a horizontal press)');
assert(patternForName('Romanian deadlift') === 'hinge', 'rdl → hinge');
assert(patternForName('Overhead press') === 'vpush', 'ohp → vpush');
assert(patternForName('Barbell row') === 'pull', 'row → pull');
assert(patternForName('Lateral raise') === null, 'isolation → no primer pattern');

// ── bench session → horizontal-press primer ─────────────────────────────────
const bench = { items: [{ name: 'Bench press', sets: '4 × 5', rpe: 'RPE 8' }, { name: 'Lateral raise', sets: '3 × 12' }] };
const r1 = buildPrimer(bench, { access: ['full_gym'] });
assert(r1.primer.length === 1 && r1.primer[0].name === 'Band Pull-Apart', 'bench → Band Pull-Apart primer');
assert(r1.primer.every(p => p.section === 'primer' && p.tag === 'mobility'), 'primer items tagged primer + mobility (volume guard)');
assert(r1.main.length === 2 && r1.main.every(m => m.section === 'main'), 'working items tagged main');

// ── squat session → glute activation ────────────────────────────────────────
const squat = { items: [{ name: 'Back squat', sets: '4 × 5' }] };
assert(buildPrimer(squat, { access: ['full_gym'] }).primer[0].name === 'Glute Bridge (2s hold)', 'squat → Glute Bridge');

// ── mixed session: de-duped by pattern, capped, numbered, first-seen order ───
const mix = { items: [
  { name: 'Back squat', sets: '4 × 5' },
  { name: 'Bench press', sets: '4 × 5' },
  { name: 'Front squat', sets: '3 × 5' },   // squat again → de-duped
  { name: 'Barbell row', sets: '3 × 8' },
  { name: 'Deadlift', sets: '3 × 3' }       // beyond the cap of 3
] };
const r3 = buildPrimer(mix, { access: ['full_gym'] });
assert(r3.primer.length === 3, 'primer capped at 3 moves');
assert(new Set(r3.primer.map(p => p.name)).size === 3, 'primer de-duped by pattern');
assert(r3.primer.map(p => p.num).join(',') === 'P1,P2,P3', 'primer numbered P1..P3');

// ── no band → band move swapped for its bodyweight alternative ───────────────
const r4 = buildPrimer(bench, { access: ['bodyweight'] });
assert(r4.primer[0].name === 'Scapular Wall Slide', 'no band → Scapular Wall Slide swapped in');
assert(r4.primer[0].equip === 'bodyweight', 'swapped move is bodyweight');

// ── no compound work → no primer ────────────────────────────────────────────
const mob = { items: [{ name: 'Cat-Camel', tag: 'mobility' }] };
assert(buildPrimer(mob, { access: ['full_gym'] }).primer.length === 0, 'no compound → empty primer');

console.log('primers tests done');
