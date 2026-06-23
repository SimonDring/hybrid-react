// tests/volume-ceiling.js
// F1: the allocator must never prescribe more than a muscle's MRV across a week,
// even for high-frequency / limited-equipment plans (the worst over-MRV offenders).
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
import { volumeReport } from '@performance-os/engine/lib/plan/volume.js';
import { VOLUME_LANDMARKS } from '@performance-os/engine/data/muscleVolume.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const EQUIP = {
  full_gym: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'],
  bodyweight: ['bodyweight']
};
// Cases that used to blow past MRV (back ~57 vs 25, glutes/hams over) pre-F1.
const cases = [
  { strengthStyle: 'functional', experienceLevel: 'advanced', daysPerWeek: 7, sessionMinutes: 45, eq: 'bodyweight' },
  { strengthStyle: 'functional', experienceLevel: 'advanced', daysPerWeek: 6, sessionMinutes: 60, eq: 'full_gym' },
  { strengthStyle: 'strength', experienceLevel: 'returning', daysPerWeek: 5, sessionMinutes: 60, eq: 'bodyweight' },
  { strengthStyle: 'bodybuilding', experienceLevel: 'advanced', daysPerWeek: 6, sessionMinutes: 75, eq: 'full_gym' }
];

let overCount = 0, worst = { over: 0 }, empties = 0, weeksChecked = 0;
for (const c of cases) {
  const a = { ...BLANK_ANSWERS, goalType: 'build', strengthStyle: c.strengthStyle, experienceLevel: c.experienceLevel,
    daysPerWeek: c.daysPerWeek, sessionMinutes: c.sessionMinutes, equipment: EQUIP[c.eq], sex: 'male', lifts: {} };
  const plan = generatePlan(answersToProfile(a));
  plan.phases.forEach(p => p.weeks.forEach(w => {
    weeksChecked++;
    w.sessions.forEach(s => { if (!s.items.length) empties++; });
    const { rows } = volumeReport(w.sessions);
    rows.forEach(r => {
      const lm = VOLUME_LANDMARKS[r.muscle];
      if (lm && r.sets > lm.mrv) {
        overCount++;
        const over = r.sets - lm.mrv;
        if (over > worst.over) worst = { over, muscle: r.muscle, sets: r.sets, mrv: lm.mrv, combo: `${c.strengthStyle}/${c.experienceLevel}/${c.daysPerWeek}d/${c.eq}`, wk: w.num };
      }
    });
  }));
}

assert(overCount === 0, `no muscle exceeds MRV across worst-case plans (overCount=${overCount}, worst=${JSON.stringify(worst)})`);
assert(empties === 0, `no empty sessions (${empties} empty across ${weeksChecked} weeks)`);

// Sanity: a normal plan still hits a productive amount of volume (cap doesn't gut it).
const normal = generatePlan(answersToProfile({ ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength',
  experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, equipment: EQUIP.full_gym, sex: 'male', lifts: { squat: 140, bench: 100, deadlift: 180 } }));
const wk6 = normal.phases.flatMap(p => p.weeks).find(w => w.num === 6);
const { rows: nrows } = volumeReport(wk6.sessions);
const quads = nrows.find(r => r.muscle === 'quads');
assert(quads && quads.sets >= VOLUME_LANDMARKS.quads.mev, `normal build still trains quads at/above MEV (got ${quads && quads.sets})`);

console.log('volume-ceiling tests done');
