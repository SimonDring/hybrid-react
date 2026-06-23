// tests/taper.js
// F4: an event taper must CUT VOLUME but KEEP INTENSITY (Bosquet 2007; Travis &
// Mujika 2020) — not behave like a deload (which drops intensity too).
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
import { volumeReport } from '@performance-os/engine/lib/plan/volume.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const iso = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

// Event ~25 days out → an in-window race → the final week tapers.
const plan = generatePlan(answersToProfile({ ...BLANK_ANSWERS, goalType: 'sport', sport: 'run', runDiscipline: 'middle',
  sportIntent: 'compete', eventDate: iso(25), experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60,
  equipment: FULL, sex: 'male', lifts: { squat: 140, bench: 100, deadlift: 180 } }));
const weeks = plan.phases.flatMap(p => p.weeks);
const taperWk = weeks.find(w => w.taper);
const totalVol = (w) => volumeReport(w.sessions).rows.reduce((a, r) => a + r.sets, 0);
// Compare the taper against the heaviest working week (the meaningful baseline).
const buildWk = weeks.filter(w => !w.taper && !w.deload).sort((a, b) => totalVol(b) - totalVol(a))[0];

assert(taperWk, 'T1 an in-window event produces a taper week');

const taperMain = taperWk && taperWk.sessions.flatMap(s => s.items).find(i => (i.note || '').includes('taper'));
assert(taperMain && /8/.test(taperMain.rpe), `T2 taper keeps main intensity high (got ${taperMain && taperMain.rpe})`);
assert(taperMain && !/RPE\s*[56]\b/.test(taperMain.rpe), 'T3 taper main is NOT deload intensity (RPE 5/6)');

assert(taperWk && buildWk && totalVol(taperWk) < totalVol(buildWk),
  `T4 taper cuts weekly volume vs the heaviest working week (${taperWk && totalVol(taperWk)} < ${buildWk && totalVol(buildWk)})`);

// A real (non-event) deload still drops intensity — make sure we didn't break it.
const deloadPlan = generatePlan(answersToProfile({ ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength',
  experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, equipment: FULL, sex: 'male', lifts: {} }));
const deloadWk = deloadPlan.phases.flatMap(p => p.weeks).find(w => w.deload);
const deloadMain = deloadWk && deloadWk.sessions.flatMap(s => s.items).find(i => (i.note || '').includes('deload'));
assert(deloadMain && /RPE\s*6/.test(deloadMain.rpe), `T5 a real deload still lowers intensity (got ${deloadMain && deloadMain.rpe})`);

console.log('taper tests done');
