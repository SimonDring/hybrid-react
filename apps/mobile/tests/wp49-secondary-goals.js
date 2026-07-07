// tests/wp49-secondary-goals.js — WP-49 Plan 2 Task 5: the fixed secondary-goals menu
// (posture / prehab / mobility / conditioning) layers corrective work onto a discipline plan's
// ACCESSORY TAIL only. The hard rule (design §5): secondary goals NEVER touch the main work —
// they never displace a priority lift or cut its dose. They compete only for leftover accessory
// budget, after the discipline diagnosis. Also: functional now auto-carries a conditioning
// secondary (its distinctive layer, re-added post-flip).
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const ASOF = '2026-07-06';

const build = (style, extra = {}) => {
  const { secondaryGoals, ...rest } = extra;
  return generatePlan({
    ...answersToProfile(A({ goalType: 'build', strengthStyle: style, experienceLevel: 'advanced', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', bodyweight_kg: 82, lifts: { squat: 180, bench: 130, deadlift: 230 }, ...rest })),
    ...(secondaryGoals ? { secondary_goals: secondaryGoals } : {}),   // profile field is snake_case
    plan_start_date: ASOF,
  });
};
const workWeek = (p) => p.phases[0].weeks.find((w) => !w.deload && !w.taper && w.num >= 2) || p.phases[0].weeks[0];
const allItems = (week) => week.sessions.flatMap((s) => s.items || []);
// The MAIN work = every item that counts toward volume (excludes the factor-0 corrective tail).
const mainWork = (week) => allItems(week).filter((it) => (it.volumeFactor ?? 1) > 0 && it.section !== 'primer').map((it) => `${it.name}|${it.sets}`);

// ── A · the hard rule: secondary goals never change the main work ──────────────
{
  const without = workWeek(build('bodybuilding'));
  const withPosture = workWeek(build('bodybuilding', { secondaryGoals: ['posture'] }));
  assert(JSON.stringify(mainWork(without)) === JSON.stringify(mainWork(withPosture)),
    'A1 the main/working items (name + sets) are IDENTICAL with vs without a secondary goal');
  const injected = allItems(withPosture).filter((it) => it.secondaryGoal);
  assert(injected.length > 0, 'A2 the posture goal injects corrective work into the accessory tail');
  assert(injected.every((it) => (it.volumeFactor ?? 1) === 0), 'A3 injected corrective work is factor-0 (never adds to the muscle-volume ledger)');
  assert(injected.every((it) => it.secondaryGoal === 'posture'), 'A4 injected items are tagged with their secondary goal');
  const names = injected.map((it) => it.name.toLowerCase());
  assert(names.some((n) => /face pull|pull-apart|chest-supported row/.test(n)), `A5 the posture correctives are the goal's own (face pull / band pull-apart / chest-supported row) — got: ${names.join(', ')}`);
  assert(allItems(without).every((it) => !it.secondaryGoal), 'A6 the plan WITHOUT a secondary goal carries no injected corrective work');
}

// ── B · multi-select spreads across goals (round-robin, not one goal stacked) ──
{
  const week = workWeek(build('bodybuilding', { secondaryGoals: ['posture', 'mobility'] }));
  const goals = new Set(allItems(week).filter((it) => it.secondaryGoal).map((it) => it.secondaryGoal));
  assert(goals.has('posture') && goals.has('mobility'), `B1 both selected goals appear (got: ${[...goals].join(', ')})`);
}

// ── C · functional auto-carries the conditioning secondary (its distinctive layer) ──
{
  const fn = workWeek(build('functional'));
  const cond = allItems(fn).filter((it) => it.secondaryGoal === 'conditioning');
  assert(cond.length > 0, 'C1 a functional plan auto-injects conditioning work (carries)');
  assert(cond.some((it) => /carry/i.test(it.name)), `C1b the conditioning work is loaded carries — got: ${cond.map((it) => it.name).join(', ')}`);
  // Functional is now DISTINCT from plain bodybuilding again (which has no conditioning tail).
  const bb = workWeek(build('bodybuilding'));
  assert(allItems(bb).every((it) => it.secondaryGoal !== 'conditioning'), 'C2 plain bodybuilding has no conditioning tail (functional ≠ bodybuilding again)');
}

console.log(process.exitCode ? 'wp49-secondary-goals FAILURES' : 'PASS: wp49-secondary-goals — all gates');
