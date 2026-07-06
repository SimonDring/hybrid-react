// tests/wp46-exercise-ids.js — WP-46 stage 1: structured exercise identity.
//
// The EDS (V12) wants plan items to carry a stable exercise IDENTITY, not just a
// display name — today the engine emits `{ name: 'Bench press' }` and every
// downstream consumer re-joins by name-regex (fragile: one rename silently breaks
// the match, the bug WP-41 fixed for injuries). Stage 1 stamps `exId` on every
// item the allocator places, additively — no join is migrated yet; this pins the
// identity so later stages can switch joins from name → id.
//
// Invariant: in the PURE generatePlan output (no primers — those are added later by
// the app's decoration), EVERY gym-session item carries an `exId` that resolves to
// exactly the EXERCISES catalogue entry whose name it displays.

import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

const EX_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const A = (o) => ({ ...BLANK_ANSWERS, ...o });

// A small but path-diverse matrix: the legacy allocator (build strength/bodybuilding,
// incl. power work + female rep-bump), the sport-biased path (run sprint = plyo
// anchors), and the category-led D11 path (a team sport).
const ARCHETYPES = {
  'build·strength·advanced·5d': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'advanced', daysPerWeek: 5, days: ['mon', 'tue', 'wed', 'fri', 'sat'], equipment: FULL, sex: 'male', lifts: { squat: 180, bench: 130, deadlift: 230, ohp: 80 } }),
  'build·bodybuilding·advanced·6d·female': A({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced', daysPerWeek: 6, days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], equipment: FULL, sex: 'female', lifts: {} }),
  'sport·run-sprint·advanced': A({ goalType: 'sport', sport: 'run', runDiscipline: 'sprint', sportIntent: 'compete', experienceLevel: 'advanced', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: { squat: 170, deadlift: 210 } }),
  'sport·field_hockey·advanced': A({ goalType: 'sport', skbSport: 'field_hockey', sportIntent: 'compete', sportSeason: 'off_season', experienceLevel: 'advanced', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'female', lifts: {}, sportDays: ['wed', 'sat'] }),
};

let pass = 0;
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else pass++; }

// Collect every item that lacks a correct exId, with enough context to diagnose.
const problems = [];
let itemCount = 0;

for (const [key, answers] of Object.entries(ARCHETYPES)) {
  const plan = generatePlan(answersToProfile(answers));
  for (const phase of plan.phases || []) {
    for (const week of phase.weeks || []) {
      for (const session of week.sessions || []) {
        for (const item of session.items || []) {
          itemCount++;
          const ex = item.exId != null ? EX_BY_ID.get(item.exId) : null;
          if (!item.exId) {
            problems.push(`${key} · "${session.title}" · "${item.name}" — NO exId`);
          } else if (!ex) {
            problems.push(`${key} · "${item.name}" — exId "${item.exId}" not in catalogue`);
          } else if (ex.name !== item.name) {
            problems.push(`${key} · exId "${item.exId}" resolves to "${ex.name}" but item shows "${item.name}"`);
          }
        }
      }
    }
  }
}

assert(itemCount > 0, `walked plan items across ${Object.keys(ARCHETYPES).length} archetypes (${itemCount} items)`);
if (problems.length) {
  console.error(`\n${problems.length} item(s) without a correct exId (showing ≤20):`);
  problems.slice(0, 20).forEach((p) => console.error('  ↳', p));
}
assert(problems.length === 0, `every plan item carries an exId resolving to its catalogue entry (${problems.length} problem(s))`);

console.log(process.exitCode ? 'wp46-exercise-ids FAILURES' : `PASS: wp46-exercise-ids — ${pass} assertions, ${itemCount} items`);
