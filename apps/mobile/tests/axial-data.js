import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
let pass = 0;
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else pass++; };
const ax = (id) => { const e = EXERCISES.find(x => x.id === id); return e ? (e.axialLoad ?? 0) : null; };

// high (2)
['back_squat','front_squat','deadlift','deficit_deadlift','barbell_row','good_morning','rack_pull','ohp']
  .forEach(id => assert(ax(id) === 2, `${id} axialLoad=2 (got ${ax(id)})`));
// moderate (1)
['trap_bar_dl','rdl','db_rdl','db_row','split_squat','db_ohp','landmine_press','farmer_carry','suitcase_carry',
 'bw_split_squat','walking_lunge','tall_kneeling_landmine','kb_swing']
  .forEach(id => assert(ax(id) === 1, `${id} axialLoad=1 (got ${ax(id)})`));
// none (0) — explicit or default
['chest_supported_row','cable_row','lat_pulldown','hack_squat','leg_curl','leg_ext','hip_thrust','pushup','pause_squat']
  .forEach(id => assert(ax(id) === 0, `${id} axialLoad=0 (got ${ax(id)})`));

console.log(process.exitCode ? 'axial-data FAILURES' : `PASS: axial-data — ${pass} assertions`);
