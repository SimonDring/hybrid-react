// tests/sport-anchor.js
// F8: sport sessions must LEAD with the sport's priority work (swimmer → a pull,
// sprinter → power/plyo), not the generic squat/hinge anchor. Plus: sprint no
// longer accrues a pile of non-specific chest volume.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
import { resolveProgram } from '@performance-os/engine/lib/strength/program.js';
import { volumeReport } from '@performance-os/engine/lib/plan/volume.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const byName = {}; for (const e of EXERCISES) byName[e.name] = e;
const mk = (o) => answersToProfile({ ...BLANK_ANSWERS, goalType: 'sport', sessionMinutes: 60, daysPerWeek: 4,
  equipment: FULL, sex: 'male', lifts: { squat: 140, bench: 100, deadlift: 180 }, experienceLevel: 'intermediate', sportIntent: 'build_base', ...o });

for (const cfg of [{ sport: 'swim' }, { sport: 'run', runDiscipline: 'sprint', experienceLevel: 'advanced' }, { sport: 'run', runDiscipline: 'long' }, { sport: 'cycle' }]) {
  const prof = mk(cfg);
  const prio = new Set(resolveProgram(prof).exercisePriority);
  const wk = generatePlan(prof).phases[0].weeks[0];
  const tag = cfg.sport + (cfg.runDiscipline ? '-' + cfg.runDiscipline : '');
  const allLed = wk.sessions.every(s => { const d = byName[s.items[0] && s.items[0].name]; return d && prio.has(d.id); });
  assert(allLed, `${tag}: every session leads with a sport-priority exercise (leads: ${wk.sessions.map(s => s.items[0] && s.items[0].name).join(', ')})`);
}

// Build plans still open with a fundamental compound (anchor override is sport-only).
const buildWk = generatePlan(answersToProfile({ ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength',
  experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, equipment: FULL, sex: 'male', lifts: { squat: 140, bench: 100, deadlift: 180 } })).phases[0].weeks[0];
const compoundPatterns = new Set(['squat', 'hinge', 'hpush', 'vpush', 'hpull', 'vpull', 'lunge']);
assert(buildWk.sessions.every(s => { const d = byName[s.items[0] && s.items[0].name]; return d && compoundPatterns.has(d.pattern); }),
  'build sessions still open with a fundamental compound');

// Sprint chest volume trimmed (was ~12 sets pre-F8).
const sprintWk = generatePlan(mk({ sport: 'run', runDiscipline: 'sprint', experienceLevel: 'advanced' })).phases[0].weeks[0];
const chest = volumeReport(sprintWk.sessions).rows.find(r => r.muscle === 'chest').sets;
assert(chest <= 8, `sprint chest volume trimmed to <=8 sets (got ${chest})`);

console.log('sport-anchor tests done');
