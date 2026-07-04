// tests/sport-split.js
// Sport plans must be CURATED + sport-appropriate, not four near-identical full-body
// days. The split is now emphasis-weighted: a swimmer (upper-pull heavy) gets varied
// days (e.g. a pull day, a press/shoulder day, a posterior/legs day), trains its
// emphasised muscles ~2×/week and its de-emphasised ones ~1×, and still leads every
// session with sport-priority work.
import * as SKB from '@performance-os/engine/lib/sportKnowledge/index.js';
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
const LEGS = ['quads', 'hamstrings', 'glutes', 'calves'];
const focusOf = (s) => (s.title || '').split(' · ').slice(1).join(' · ');
// muscle → number of sessions that train it with a meaningful dose (≥2 sets)
const daysTraining = (sessions, muscle) =>
  sessions.filter(s => (volumeReport([s]).rows.find(r => r.muscle === muscle)?.sets || 0) >= 2).length;

const prof = answersToProfile({ ...BLANK_ANSWERS, goalType: 'sport', sport: 'swim', sportIntent: 'recreational',
  experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 45, equipment: FULL, sex: 'male', lifts: {} });
const prio = new Set(resolveProgram(prof).exercisePriority);
const wk = generatePlan(prof).phases[0].weeks[0];

// S1: the four days are differentiated, not clones.
const focuses = wk.sessions.map(focusOf);
assert(new Set(focuses).size >= 3, `S1 swim 4-day has >=3 distinct day focuses (got: ${focuses.join(' | ')})`);

// S2: legs are supported but NOT hammered every day (swim de-emphasises lower body).
const legDays = Math.max(...LEGS.map(m => daysTraining(wk.sessions, m)));
assert(legDays >= 1 && legDays <= 2, `S2 legs trained on 1–2 days, not every day (got ${legDays})`);

// S3: the emphasised pulling muscles get real frequency (~2×/week).
assert(daysTraining(wk.sessions, 'back') >= 2, `S3 back (swim's prime mover) trained >=2 days (got ${daysTraining(wk.sessions, 'back')})`);

// S4 (WP-20): swim is category-led — every session leads with a swimming-library movement.
const SWIM_LIB = new Set((SKB.section('swimming', 'exerciseLibrary')?.exercises || []).map((e) => e.id));
const exByNameS4 = Object.fromEntries(EXERCISES.map((e) => [e.name, e]));
const allLed = wk.sessions.every(s => { const d = exByNameS4[s.items[0] && s.items[0].name]; return d && SWIM_LIB.has(d.id); });
assert(allLed, `S4 every swim session leads with a swimming-library movement (leads: ${wk.sessions.map(s => s.items[0] && s.items[0].name).join(', ')})`);

// S5: weekly volume still tracks the target (split redistributes, never inflates).
const tg = resolveProgram(prof);
let target = 0, actual = 0;
const tgts = (await import('@performance-os/engine/lib/strength/targets.js')).weeklyMuscleTargets({
  style: tg.style, intent: 'base', level: tg.level, weekInPhase: 1, phaseWeeks: 4,
  emphasis: tg.emphasis, volumeScalar: tg.volumeScalar, blockFrac: 0 });
volumeReport(wk.sessions).rows.forEach(r => { actual += r.sets; target += (tgts[r.muscle] || 0); });
assert(actual / target <= 1.15, `S5 weekly volume not inflated by the split (${(actual / target * 100).toFixed(0)}% of target)`);

console.log('sport-split tests done');
