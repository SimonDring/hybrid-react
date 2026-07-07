// tests/quality-steer.js — strength↔hypertrophy steering + CNS cap flex.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const qByName = new Map(EXERCISES.map(e => [e.name, e.quality || 'general']));
const isPrimary = new Set(EXERCISES.filter(e => e.role === 'primary').map(e => e.name));
const plan = (a) => generatePlan(answersToProfile({ ...BLANK_ANSWERS, equipment: FULL, ...a }));
const names = (p) => p.phases.flatMap(ph => ph.weeks).flatMap(w => w.sessions).flatMap(s => s.items).map(it => it.name);
const countQ = (p, q) => names(p).filter(n => qByName.get(n) === q).length;

// Steering: a bodybuilding plan does more hypertrophy work than a strength plan; and
// a strength plan does more strength-quality work than a bodybuilding plan.
const bb = plan({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced', daysPerWeek: 5 });
const st = plan({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'advanced', daysPerWeek: 5 });
assert(countQ(bb, 'hypertrophy') > countQ(st, 'hypertrophy'), `bodybuilding leans hypertrophy (bb ${countQ(bb,'hypertrophy')} > st ${countQ(st,'hypertrophy')})`);
assert(countQ(st, 'strength') >= countQ(bb, 'strength'), `strength leans strength-quality (st ${countQ(st,'strength')} >= bb ${countQ(bb,'strength')})`);

// CNS cap: a strength session may reach 3 primaries (high-density, few days);
// bodybuilding stays capped at 2.
const maxPrimaries = (p) => Math.max(...p.phases.flatMap(ph => ph.weeks).flatMap(w => w.sessions)
  .map(s => s.items.filter(it => isPrimary.has(it.name)).length));
const st2 = plan({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'advanced', daysPerWeek: 2 });
const bb2 = plan({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced', daysPerWeek: 2 });
assert(maxPrimaries(st2) === 3, `strength session reaches 3 primaries (got ${maxPrimaries(st2)})`);
// WP-49 flip (build→discipline): 'bodybuilding' now routes to the compound-led hypertrophy discipline.
// At a low day count it packs its compound spine (squat/front-squat/deadlift) into full sessions, so
// it reaches 3 primaries too — the old per-style 2-primary cap was a legacy BUILD_INTENTS artefact.
assert(maxPrimaries(bb2) === 3, `hypertrophy session reaches 3 primaries at low day count (got ${maxPrimaries(bb2)})`);

console.log('quality-steer done');
