// tests/substitutions.js
// On-the-fly substitution offers SAME-MUSCLE alternatives ranked by alignment with the
// original (same movement pattern first, then same muscles via a different pattern),
// filtered to available equipment + level, each with a recomputed weight target. Never
// offers an unrelated movement. See lib/plan/substitutions.js.
import { substituteOptions } from '@performance-os/engine/lib/plan/substitutions.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const LIFTS = { squat: 160, bench: 110, deadlift: 200, ohp: 60, pull: 80 };
const squat = { name: 'Back squat', sets: '4 × 5', rpe: 'RPE 7' };

// ── full gym, advanced ─────────────────────────────────────────────────────
const opts = substituteOptions(squat, { access: ['full_gym'], lifts: LIFTS, level: 'advanced' });
const names = opts.map(o => o.name);
assert(opts.length > 0, `back squat has substitution options (${opts.length})`);
assert(names.includes('Hack / leg-press'), `options include the leg press (got: ${names.join(', ')})`);
assert(opts[0].pattern === 'squat', `top-ranked option is the closest pattern (squat), got ${opts[0].pattern}`);
assert(opts.some(o => o.pattern === 'lunge'), 'same-muscle different-pattern option present (a split-squat / lunge)');
assert(opts.every(o => !['hpush', 'vpush', 'hpull', 'vpull'].includes(o.pattern)),
  `no unrelated upper-body movement offered (patterns: ${opts.map(o => o.pattern).join(',')})`);

// weight + sameLift
const sameLiftOpt = opts.find(o => o.sameLift);
assert(sameLiftOpt && sameLiftOpt.weight, `a true variant (front/box squat) carries a recomputed weight (${sameLiftOpt && sameLiftOpt.name} @ ${sameLiftOpt && sameLiftOpt.weight})`);
const legPress = opts.find(o => o.name === 'Hack / leg-press');
assert(legPress && legPress.sameLift === false, 'leg press is NOT flagged a true variant (won\'t move the squat e1RM)');

// ── equipment gate: dumbbell-only excludes machine/barbell ──────────────────
const dbOpts = substituteOptions(squat, { access: ['dumbbell'], lifts: LIFTS, level: 'advanced' });
assert(dbOpts.length > 0 && dbOpts.every(o => ['dumbbell', 'bodyweight'].includes(o.equip)),
  `dumbbell-only access yields only dumbbell/bodyweight options (equip: ${dbOpts.map(o => o.equip).join(',')})`);
assert(!dbOpts.some(o => o.name === 'Hack / leg-press'), 'machine leg press excluded for a dumbbell-only athlete');

// ── level gate: a beginner doesn't get intermediate+ variants ───────────────
const beginnerOpts = substituteOptions(squat, { access: ['full_gym'], lifts: LIFTS, level: 'beginner' });
assert(!beginnerOpts.some(o => o.name === 'Front squat'), 'intermediate-level Front squat excluded for a beginner');

// ── bench never offers an OHP (vpush has no chest, the dominant group) ───────
const bench = { name: 'Bench press', sets: '4 × 5', rpe: 'RPE 7' };
const benchOpts = substituteOptions(bench, { access: ['full_gym'], lifts: LIFTS, level: 'advanced' });
assert(!benchOpts.some(o => o.name === 'Overhead press'), 'bench substitution does not offer the overhead press');

// ── unknown / non-loadable item → no options ────────────────────────────────
assert(substituteOptions({ name: 'Cat-Camel', sets: '2 × 8' }, { access: ['full_gym'], lifts: LIFTS }).length === 0,
  'a non-loadable / unknown movement has no substitution options');

console.log('substitutions tests done');
