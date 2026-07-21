// tests/onboarding-equipment-detail.js — Sprint 3 Task C3: the optional "detail my
// gym" answer (equipmentDetail) maps to profile.access_detail, nullable, degrading
// to today's behaviour (access_detail: null) when never captured.
import { answersToProfilePatch, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

assert('equipmentDetail' in BLANK_ANSWERS, 'BLANK_ANSWERS has equipmentDetail');
assert(BLANK_ANSWERS.equipmentDetail === null, 'BLANK_ANSWERS.equipmentDetail defaults to null');

// Detail present → access_detail carries the array through.
const withDetail = answersToProfilePatch({
  ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength',
  equipment: ['barbell', 'machine'], equipmentDetail: ['leg_press_45']
});
assert(Array.isArray(withDetail.access_detail) && withDetail.access_detail.length === 1 && withDetail.access_detail[0] === 'leg_press_45',
  'access_detail carries the detailed items through (got ' + JSON.stringify(withDetail.access_detail) + ')');

// Detail absent (never opened, i.e. still null) → access_detail is null (degrade-to-today).
const noDetail = answersToProfilePatch({
  ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength',
  equipment: ['barbell', 'machine'], equipmentDetail: null
});
assert(noDetail.access_detail === null, 'access_detail is null when equipmentDetail was never set (got ' + JSON.stringify(noDetail.access_detail) + ')');

// Detail an empty array (expander opened, everything unchecked) also normalises to null —
// engine treats [] and null identically, and this keeps the profile shape consistent.
const emptyDetail = answersToProfilePatch({
  ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength',
  equipment: ['barbell', 'machine'], equipmentDetail: []
});
assert(emptyDetail.access_detail === null, 'access_detail normalises an empty array to null (got ' + JSON.stringify(emptyDetail.access_detail) + ')');

// Old answer seeds (no equipmentDetail key at all — pre-C3 shape) are unaffected: still null.
const legacySeed = { ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength', equipment: ['barbell'] };
delete legacySeed.equipmentDetail;
const legacyPatch = answersToProfilePatch(legacySeed);
assert(legacyPatch.access_detail === null, 'old answer seeds with no equipmentDetail key still emit access_detail: null');
assert(Array.isArray(legacyPatch.access) && legacyPatch.access.includes('barbell'), 'legacy seed access is unaffected (got ' + JSON.stringify(legacyPatch.access) + ')');

console.log('onboarding-equipment-detail done');
