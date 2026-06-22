// tests/onboarding-lifts.js — five-lift capture (squat/bench/deadlift/ohp/pull),
// Epley helpers, pull normalisation, and the answers→profile mapping + lifts_source.
import {
  epley1RM, pullupE1RM, matchLift, resolveLifts
} from '../src/lib/liftProgression.js';
import {
  BLANK_ANSWERS, answersToProfilePatch, normalizePullToKg
} from '../src/lib/onboardingModel.js';
import STANDARDS, { BANDS } from '../src/data/strengthStandards.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ---- Epley helpers -------------------------------------------------------
assert(epley1RM(100, 5) === 117.5, 'E1 epley1RM(100,5) = 117.5 (round to 2.5)');
assert(epley1RM(60, 10) === 80, 'E2 epley1RM(60,10) = 80');
assert(epley1RM(0, 10) === 0, 'E3 epley1RM(0,reps) = 0');
assert(pullupE1RM(10, 80) === 107.5, 'E4 pullupE1RM(10 reps, 80kg bw) = 107.5');
assert(pullupE1RM(1, 80) === 82.5, 'E5 pullupE1RM(1 rep, 80kg) ≈ bodyweight');

// ---- matchLift: only the 5 tracked mains, barbell/cable variants ----------
assert(matchLift('Overhead press').key === 'ohp', 'M1 Overhead press → ohp');
assert(matchLift('Lat pulldown').key === 'pull', 'M2 Lat pulldown → pull');
assert(matchLift('Pull-up') === null, 'M3 bodyweight Pull-up → null (reps-only)');
assert(matchLift('DB shoulder press') === null, 'M4 DB shoulder press → null (not a tracked main)');
assert(matchLift('Band-assisted pull-up') === null, 'M5 Band-assisted pull-up → null');
assert(matchLift('Bench press').key === 'bench', 'M6 Bench press still → bench');

// ---- resolveLifts now returns ohp + pull ---------------------------------
const r = resolveLifts({ lifts: { squat: 140, bench: 100, deadlift: 180, ohp: 55, pull: 70 } });
assert(r.ohp === 55 && r.pull === 70, 'R1 entered ohp/pull pass through resolveLifts');
const rEst = resolveLifts({ experience: { gym: 'intermediate' }, bodyweight_kg: 80, sex: 'male' });
assert(typeof rEst.ohp === 'number' && rEst.ohp > 0, 'R2 ohp estimated when no input');
assert(typeof rEst.pull === 'number' && rEst.pull > 0, 'R3 pull estimated when no input');

// ---- normalizePullToKg ---------------------------------------------------
assert(normalizePullToKg('70', 'kg', 80) === 70, 'N1 kg mode passes the entered 1RM through');
assert(normalizePullToKg('10', 'reps', 80) === 107.5, 'N2 reps mode → pull-up e1RM (Epley)');
assert(normalizePullToKg('', 'kg', 80) === null, 'N3 empty → null (kg)');
assert(normalizePullToKg('', 'reps', 80) === null, 'N4 empty → null (reps)');

// ---- answersToProfilePatch: five lifts + lifts_source --------------------
const barbell = answersToProfilePatch({
  ...BLANK_ANSWERS, goalType: 'build', bodyweight_kg: '80', sex: 'male',
  equipment: ['barbell', 'cable', 'bodyweight'],
  lifts: { squat: '140', bench: '100', deadlift: '180', ohp: '55', pull: '10' },
  pullMode: 'reps'
});
assert(barbell.lifts.ohp === 55, 'A1 ohp stored as kg');
assert(barbell.lifts.pull === 107.5, 'A2 pull (10 reps @ 80kg) normalised to e1RM');
assert(barbell.lifts_source.ohp === 'entered' && barbell.lifts_source.pull === 'entered',
  'A3 provided lifts marked entered');

const bw = answersToProfilePatch({
  ...BLANK_ANSWERS, goalType: 'build', bodyweight_kg: '80', sex: 'male',
  equipment: ['bodyweight'],
  lifts: { squat: '', bench: '', deadlift: '', ohp: '', pull: '8' }, pullMode: 'reps'
});
assert(bw.lifts && bw.lifts.pull === 102.5, 'A4 bodyweight-only user: pull-up reps stored');
assert(bw.lifts.squat === null && bw.lifts.ohp === null, 'A5 barbell lifts null without a barbell');
assert(bw.lifts_source.pull === 'entered' && bw.lifts_source.squat === 'estimated',
  'A6 unprovided lifts marked estimated');

const blank = answersToProfilePatch({ ...BLANK_ANSWERS, goalType: 'build', equipment: ['barbell'] });
assert(blank.lifts === null, 'A7 all-blank lifts → null (preserves skip)');

const tested = answersToProfilePatch({
  ...BLANK_ANSWERS, goalType: 'build', bodyweight_kg: '80', equipment: ['barbell'],
  lifts: { squat: '', bench: '', deadlift: '', ohp: '50', pull: '' },
  liftsSource: { ohp: 'tested' }
});
assert(tested.lifts.ohp === 50 && tested.lifts_source.ohp === 'tested', 'A8 tested lift marked tested');

// A tested pull is ALREADY a kg e1RM (the quick-test computed it) — it must not be
// re-normalised through the reps path even when pullMode is still 'reps'.
const testedPull = answersToProfilePatch({
  ...BLANK_ANSWERS, goalType: 'build', bodyweight_kg: '80', equipment: ['cable'],
  lifts: { squat: '', bench: '', deadlift: '', ohp: '', pull: 100 }, pullMode: 'reps',
  liftsSource: { pull: 'tested' }
});
assert(testedPull.lifts.pull === 100, 'A9 tested pull kept as kg e1RM (not re-normalised as reps)');

// ---- strengthStandards: ohp + pull bands (÷BW), monotonic ----------------
for (const k of ['ohp', 'pull']) {
  for (const sex of ['male', 'female']) {
    const t = STANDARDS[sex] && STANDARDS[sex][k];
    const present = !!t && BANDS.every(b => typeof t[b] === 'number');
    assert(present, `ST-${sex}-${k} table present with all bands`);
    let mono = present;
    for (let i = 1; present && i < BANDS.length; i++) if (t[BANDS[i]] <= t[BANDS[i - 1]]) mono = false;
    assert(mono, `ST-${sex}-${k} bands strictly increasing`);
  }
}
