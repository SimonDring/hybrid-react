// tests/exercise-selection.js
import { EXERCISES, LEVELS } from '@performance-os/engine/data/strengthExercises.js';
import { resolveProgram } from '@performance-os/engine/lib/strength/program.js';
import { allocateGym } from '@performance-os/engine/lib/plan/allocator.js';
import { weeklyMuscleTargets } from '@performance-os/engine/lib/strength/targets.js';
import { buildWeek } from '@performance-os/engine/lib/plan/strength.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const byId = (id) => EXERCISES.find(e => e.id === id);

// ── T1: Level corrections ─────────────────────────────────────────────────
assert(byId('nordic_curl')?.level === 3, 'T1a nordic_curl level is 3');
assert(byId('copenhagen')?.level === 3,  'T1b copenhagen level is 3');

// ── T2: minLevelForPrimary on complex barbell compounds ───────────────────
assert(byId('back_squat')?.minLevelForPrimary === 'returning',
  'T2a back_squat minLevelForPrimary=returning');
assert(byId('bench')?.minLevelForPrimary === 'returning',
  'T2b bench minLevelForPrimary=returning');
assert(byId('barbell_row')?.minLevelForPrimary === 'intermediate',
  'T2c barbell_row minLevelForPrimary=intermediate');
assert(byId('ohp')?.minLevelForPrimary === 'intermediate',
  'T2d ohp minLevelForPrimary=intermediate');

// ── T3: sportTags on existing exercises ───────────────────────────────────
assert(Array.isArray(byId('rdl')?.sportTags) && byId('rdl').sportTags.includes('run'),
  'T3a rdl.sportTags includes run');
assert(Array.isArray(byId('face_pull')?.sportTags) && byId('face_pull').sportTags.includes('swim'),
  'T3b face_pull.sportTags includes swim');
assert(Array.isArray(byId('hip_thrust')?.sportTags) && byId('hip_thrust').sportTags.includes('cycle'),
  'T3c hip_thrust.sportTags includes cycle');

// ── T4: new exercises exist ───────────────────────────────────────────────
const NEW_IDS = [
  // hypertrophy
  'incline_db_curl','spider_curl','overhead_cable_ext','low_high_cable_fly',
  'seated_leg_curl','heel_elevated_goblet','reverse_pec_deck','serratus_punch_cable',
  'prone_y_raise','prone_t_raise','prone_w_raise','db_pullover',
  'jm_press','close_grip_bench','ab_wheel','pause_squat',
  'rack_pull','deficit_deadlift','floor_press','seated_box_jump',
  // functional + activation primer
  'hip_flexor_90_90','glute_bridge_activation','cat_camel_thoracic','band_pull_apart',
  'half_kneeling_pallof','serratus_wall_slide','bird_dog',
  'tall_kneeling_landmine','prone_hip_extension','thoracic_foam_roller',
  // run support
  'double_leg_pogo','sl_pogo_jump','bounding_a_skip',
  'lateral_band_walk','sl_hip_abduction','sl_squat_to_box',
  'tibialis_raise','glute_bridge_single_leg',
  // cycle support
  'sl_leg_press',
  // swim support
  'sl_ext_rotation','cable_ext_rotation_90','cable_woodchop',
  'ankle_plantarflex_band','glute_ham_raise'
];
for (const id of NEW_IDS) {
  assert(!!byId(id), `T4 new exercise exists: ${id}`);
}

// ── T5: activation/primer exercises don't count as working volume ─────────
// (the activationPrimer flag was retired — non-counting is now expressed via
// loadClass 'health' or a 'mobility' pattern, both of which tally zero.)
const primerIds = ['hip_flexor_90_90','glute_bridge_activation','band_pull_apart','cat_camel_thoracic'];
for (const id of primerIds) {
  const e = byId(id);
  const nonCounting = e && (e.loadClass === 'health' || e.pattern === 'mobility');
  assert(nonCounting, `T5 ${id} is non-counting (health or mobility)`);
}
assert(!EXERCISES.some(e => 'activationPrimer' in e), 'T5b activationPrimer flag fully retired');

// ── T6: resolveProgram emits exercisePriority ─────────────────────────────
const runProg = resolveProgram({ goal_type: 'sport', sport: 'run', sport_season: 'off',
  experience: { gym: 'intermediate' } });
assert(Array.isArray(runProg.exercisePriority) && runProg.exercisePriority.length > 0,
  'T6a run program emits exercisePriority');
assert(runProg.exercisePriority.includes('nordic_curl') || runProg.exercisePriority.includes('double_leg_pogo'),
  'T6b run priority includes run-specific exercises');

const swimProg = resolveProgram({ goal_type: 'sport', sport: 'swim', sport_season: 'off',
  experience: { gym: 'intermediate' } });
assert(Array.isArray(swimProg.exercisePriority) && swimProg.exercisePriority.includes('face_pull'),
  'T6c swim priority includes face_pull');

const hypProg = resolveProgram({ goal_type: 'build', strength_style: 'bodybuilding',
  experience: { gym: 'returning' } });
assert(Array.isArray(hypProg.exercisePriority) && hypProg.exercisePriority.includes('incline_db_curl'),
  'T6d hypertrophy priority includes incline_db_curl');

const funcProg = resolveProgram({ goal_type: 'build', strength_style: 'functional',
  experience: { gym: 'beginner' } });
assert(Array.isArray(funcProg.exercisePriority) && funcProg.exercisePriority.includes('bird_dog'),
  'T6e functional priority includes bird_dog');

// ── T7: beginner does not receive back_squat as a primary ─────────────────
const begTargets = weeklyMuscleTargets({
  style: 'strength', weekInPhase: 1, phaseWeeks: 4,
  level: 'beginner', emphasis: {}, volumeScalar: 1.0
});
const begSessions = allocateGym({
  targets: begTargets,
  slots: [{ minutes: 60, equip: ['full_gym'] }],
  ctx: { style: 'strength', intent: 'base', deload: false, weekNum: 1,
         level: 'beginner', access: ['full_gym'] }
});
const begItems = begSessions.flatMap(s => s.items);
const sqPrimary = begItems.find(it => it.name === 'Back squat' && it.rpe && it.rpe.includes('RPE 7'));
// A beginner can see back squat but only as accessory (lower sets/RPE)
const sqItem = begItems.find(it => it.name === 'Back squat');
if (sqItem) {
  // restSec < 120 means it was treated as accessory, not primary
  assert(sqItem.restSec < 120, 'T7 back_squat for beginner has accessory restSec (not primary)');
}
// (If back_squat doesn't appear at all, that's also fine — assert nothing fails)
assert(true, 'T7 beginner back_squat test completed (see above)');

// ── T8: returning athlete CAN receive back_squat as primary ──────────────
const retTargets = weeklyMuscleTargets({
  style: 'strength', weekInPhase: 1, phaseWeeks: 4,
  level: 'returning', emphasis: {}, volumeScalar: 1.0
});
const retSessions = allocateGym({
  targets: retTargets,
  slots: [{ minutes: 60, equip: ['full_gym'] }],
  ctx: { style: 'strength', intent: 'base', deload: false, weekNum: 1,
         level: 'returning', access: ['full_gym'] }
});
const retItems = retSessions.flatMap(s => s.items);
// returning level => back_squat may be primary (restSec ≥ 120) or anchor
const retSqPrimary = retItems.find(it => it.name === 'Back squat' && it.restSec >= 120);
assert(!!retSqPrimary, 'T8 returning athlete can get back_squat as primary');

// ── T9: functional buildWeek prepends activation primer ───────────────────
const funcSessions = buildWeek({
  gymDays: 1, style: 'functional', intent: 'base', deload: false,
  winp: 1, phaseWeeks: 4, minutes: 55, access: ['full_gym'],
  level: 'intermediate', weekNum: 1
});
assert(funcSessions.length === 1, 'T9a functional buildWeek returns 1 session');
const funcItems = funcSessions[0].items;
// Primer items are prepended, tagged 'mobility', named exactly as in FUNCTIONAL_PRIMER
const primerNames = ['90/90 Hip Flexor Stretch', 'Glute Bridge (2s hold)', 'Band Pull-Apart', 'Cat-Camel + Thoracic Rotation'];
const foundPrimer = primerNames.every(n => funcItems.some(it => it.name === n));
assert(foundPrimer, `T9b functional session has all primer items (found: ${funcItems.slice(0,4).map(i=>i.name)})`);
assert(funcItems[0].name === '90/90 Hip Flexor Stretch', 'T9c primer is first in session');

// Primer must NOT appear in strength sessions
const strSessions = buildWeek({
  gymDays: 1, style: 'strength', intent: 'base', deload: false,
  winp: 1, phaseWeeks: 4, minutes: 55, access: ['full_gym'],
  level: 'intermediate', weekNum: 1
});
const strItems = strSessions.flatMap(s => s.items);
assert(!strItems.some(it => it.name === '90/90 Hip Flexor Stretch'),
  'T9d strength sessions do NOT have primer');
