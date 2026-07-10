// tests/olympic-dose.js — the Olympic classic lifts dose from the DISCIPLINE scheme, never the
// flat ballistic POWER_DOSE (governance-sprint roadmap I1; engine review 2026-07-09 finding W2).
// POWER_DOSE (4 × 4 "move fast", 150 s) is for jumps/throws: a snatch is never programmed for
// fours. Gate: ex.discipline === 'olympic' — provably olympic-cohort-only (discipline-tagged
// lifts are filtered out of every other cohort's selection), proven here by the runner check.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const repsOf = (str) => { const m = /(\d+)\s*[×x]\s*(\d+)/.exec(str || ''); return m ? Number(m[2]) : null; };
const CLASSIC = /snatch|clean|jerk|overhead squat|push press/i;

// ── A · olympic discipline: classic lifts carry the discipline dose ──────────
{
  const plan = generatePlan({
    ...answersToProfile(A({ goalType: 'build', strengthStyle: 'olympic', experienceLevel: 'advanced', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male' })),
    olympic_lift: 'snatch', plan_start_date: '2026-07-06',
  });
  const weeks = plan.phases.flatMap((p) => p.weeks);
  const loadWeeks = weeks.filter((w) => !w.deload && !w.taper);
  const classicItems = loadWeeks.flatMap((w) => w.sessions.flatMap((s) =>
    (s.items || []).filter((i) => i.section !== 'primer' && CLASSIC.test(i.name))));

  assert(classicItems.length >= 8, `A0 the olympic plan programs classic lifts (found ${classicItems.length})`);
  const badReps = classicItems.filter((i) => repsOf(i.sets) == null || repsOf(i.sets) > 3);
  assert(badReps.length === 0, `A1 every classic-lift main is ≤3 reps (doseCharacter 1–3) — offenders: ${badReps.slice(0, 3).map((i) => `${i.name} ${i.sets}`).join('; ') || 'none'}`);
  const badRest = classicItems.filter((i) => i.restSec !== 180 && i.restSec !== 120);
  assert(badRest.length === 0, `A2 classic lifts rest 180 s (mains) / 120 s (pull accessories), never the ballistic 150 — offenders: ${badRest.slice(0, 3).map((i) => `${i.name} ${i.restSec}`).join('; ') || 'none'}`);
  const ballistic = classicItems.filter((i) => /move fast/i.test(i.note || ''));
  assert(ballistic.length === 0, `A3 classic lifts never carry the ballistic POWER_DOSE note — offenders: ${ballistic.slice(0, 3).map((i) => i.name).join('; ') || 'none'}`);
  // Phase progression reaches the competition lifts (base 4×3 → build 5×3): set counts differ
  // across load weeks — the flat 4 × 4 override previously made every week identical.
  const setShapes = new Set(classicItems.map((i) => i.sets));
  assert(setShapes.size >= 2, `A4 classic-lift dose phase-progresses across the block (shapes: ${[...setShapes].join(', ')})`);
}

// ── B · the gate: ballistic power work elsewhere keeps POWER_DOSE ────────────
{
  const plan = generatePlan({
    ...answersToProfile(A({ goalType: 'sport', sport: 'run', run_discipline: 'sprint', experienceLevel: 'advanced', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male' })),
    plan_start_date: '2026-07-06',
  });
  const items = plan.phases.flatMap((p) => p.weeks).flatMap((w) => w.sessions.flatMap((s) => s.items || []));
  const jumps = items.filter((i) => /jump|pogo|bound|hop|throw/i.test(i.name) && /4 × 4/.test(i.sets || ''));
  const anyPower = items.filter((i) => /jump|pogo|bound|hop|throw|power clean/i.test(i.name));
  assert(anyPower.length === 0 || jumps.length > 0 || anyPower.every((i) => i.restSec === 150),
    `B1 a sprinter's ballistic work still doses as POWER_DOSE (4 × 4 / 150 s) — found ${anyPower.length} power items, ${jumps.length} at 4 × 4`);
}

console.log(process.exitCode ? 'olympic-dose FAILURES' : 'PASS: olympic-dose — all gates');
