// tests/exercise-load.js — every loadable exercise gets a realistic, research-calibrated
// target weight derived from the five tracked lifts; bodyweight/band/core get none.
import { anchorForName, effectiveCoefficient, formatLoad } from '@performance-os/engine/lib/strength/exerciseLoad.js';
import { applyWeights } from '@performance-os/engine/lib/liftProgression.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const numIn = (s) => { const m = /([\d.]+)/.exec(s || ''); return m ? Number(m[1]) : null; };

// ---- anchorForName mapping -----------------------------------------------
const lat = anchorForName('Lateral raise');
assert(lat && lat.key === 'ohp' && lat.perHand === true && lat.iso === true, 'AN1 Lateral raise → ohp, per-hand, iso');
assert(anchorForName('Leg extension').key === 'squat', 'AN2 Leg extension → squat');
assert(anchorForName('Leg curl').key === 'deadlift', 'AN3 Leg curl → deadlift');
assert(anchorForName('Romanian deadlift').key === 'deadlift', 'AN4 RDL → deadlift');
assert(anchorForName('DB bench press').key === 'bench' && anchorForName('DB bench press').perHand === true, 'AN5 DB bench → bench, per-hand');
assert(anchorForName('Back squat').key === 'squat', 'AN6 Back squat → squat');
assert(anchorForName('Overhead press').key === 'ohp', 'AN7 Overhead press → ohp');
assert(anchorForName('Biceps curl').key === 'bench', 'AN8 Biceps curl anchored to bench (data-backed)');
// no-load movements
assert(anchorForName('Push-up') === null, 'AN9 bodyweight → null');
assert(anchorForName('Band row') === null, 'AN10 band → null');
assert(anchorForName('Plank') === null, 'AN11 core → null');
assert(anchorForName('Pallof press') === null, 'AN12 cable core → null (cue-based)');

// ---- applyWeights over a mixed session -----------------------------------
const lifts = { squat: 140, bench: 100, deadlift: 180, ohp: 60, pull: 70 };
const items = [
  { name: 'Back squat',     sets: '3 × 5',   rpe: 'RPE 8' },
  { name: 'Lateral raise',  sets: '3 × 15',  rpe: 'RPE 8' },
  { name: 'Leg curl',       sets: '3 × 12',  rpe: 'RPE 8' },
  { name: 'DB bench press', sets: '3 × 10',  rpe: 'RPE 8' },
  { name: 'Push-up',        sets: '3 × 12',  rpe: 'RPE 8' },
  { name: 'Band row',       sets: '3 × 15',  rpe: 'RPE 8' },
  { name: 'Plank',          sets: '3 × 30s', rpe: 'RPE 6' }
];
applyWeights(items, lifts, 'intermediate');
assert(/kg$/.test(items[0].weight) && !/hand/.test(items[0].weight), 'AW1 barbell squat → "x kg"');
assert(/\/hand/.test(items[1].weight), 'AW2 lateral raise → per-hand');
assert(items[2].weight && /kg/.test(items[2].weight), 'AW3 machine leg curl → kg');
assert(/\/hand/.test(items[3].weight), 'AW4 DB bench → per-hand');
assert(items[4].weight == null, 'AW5 bodyweight push-up → no weight');
assert(items[5].weight == null, 'AW6 band row → no weight');
assert(items[6].weight == null, 'AW7 core plank → no weight');

// ---- REALISM: the whole point — a lateral raise is a real dumbbell, never 20kg ----
const latKg = numIn(items[1].weight);
assert(latKg >= 6 && latKg <= 11, `AW8 intermediate lateral raise realistic (got ${latKg}kg/hand, want 6–11)`);
const benchHand = numIn(items[3].weight);
assert(benchHand >= 25 && benchHand <= 40, `AW9 DB bench per-hand realistic (got ${benchHand}, want 25–40)`);

// ---- level scaling: isolations scale, compound accessories don't ----------
const latAnchor = anchorForName('Lateral raise');
const rdlAnchor = anchorForName('Romanian deadlift');
assert(effectiveCoefficient(latAnchor, { level: 'beginner' }) < effectiveCoefficient(latAnchor, { level: 'advanced' }),
  'LS1 isolation coefficient lower for beginner than advanced');
assert(effectiveCoefficient(rdlAnchor, { level: 'beginner' }) === effectiveCoefficient(rdlAnchor, { level: 'advanced' }),
  'LS2 compound-accessory coefficient flat across levels');

// ---- superset modifier ----------------------------------------------------
assert(Math.abs(effectiveCoefficient(latAnchor, { level: 'intermediate', superset: true }) -
                effectiveCoefficient(latAnchor, { level: 'intermediate' }) * 0.95) < 1e-9,
  'SS1 supersetted item ~5% lighter');

// ---- progression invariant: stronger anchor → heavier accessory -----------
const a = [{ name: 'Lateral raise', sets: '3 × 15', rpe: 'RPE 8' }];
const b = [{ name: 'Lateral raise', sets: '3 × 15', rpe: 'RPE 8' }];
applyWeights(a, { ...lifts, ohp: 60 }, 'intermediate');
applyWeights(b, { ...lifts, ohp: 90 }, 'intermediate');
assert(numIn(b[0].weight) > numIn(a[0].weight), 'PR1 raising OHP raises the derived lateral-raise weight');

// ---- formatLoad -----------------------------------------------------------
assert(formatLoad(60, { perHand: false }) === '60 kg', 'F1 plain kg');
assert(formatLoad(22.5, { perHand: true }) === '22.5 kg/hand', 'F2 per-hand kg');
