// progression-creep.test.mjs — Phase 3 M2 T2: the G9 ACCEPTANCE GATE (the phase headline).
//
// The audit's worst finding (SR-01/G9): a non-logging athlete received the SAME stimulus
// for 3–4 weeks — no overload — "the most athlete-visible coaching failure" (audit 08, P0).
// M2 T2 makes the non-logging POWERLIFTER progress: estimator-driven creep advances the
// compound load week-over-week at a governed conservative rate, completion-gated, LABELLED
// estimated, with accessory double-progression and programmed warm-up ramps (SR-10) — any
// logged set displaces the estimate. Gated to powerlifting (hypertrophy/olympic/sports are
// T3–T5 and MUST stay unchanged here).
//
// THE EXIT GATE (spec §7 M2a; plan T2): a non-logging PL intermediate's WEEK 6 ≠ WEEK 5 in
// load or reps, and the advancement is labelled estimated with its driver in the trace.
//
// Engine-owned: imports ONLY ../src/... — never apps/mobile. Pure/deterministic (dates from
// plan_start_date, never the clock).
import { generatePlan } from '../src/lib/PlanGenerator.js';
import { validatePlanProgression } from '../src/lib/validation/progression.js';

let failures = 0;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failures++; process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const plProfile = (extra = {}) => ({
  goal_type: 'build', strength_style: 'strength',                 // → powerlifting discipline (barbell-gated)
  experience_level: 'intermediate', experience: { gym: 'intermediate' },
  sex: 'male', bodyweight_kg: 82, access: FULL, plan_start_date: '2026-07-13',
  lifts: {}, availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] },
  ...extra,
});

const weekOf = (plan, n) => plan.phases.flatMap((p) => p.weeks).find((w) => w.num === n);
// The TOP set (max load) of a named primary compound across a week (aggregating the
// undulating days the way the progression-sanity validator does).
function topSet(week, nameRe) {
  let best = null;
  for (const s of week.sessions || []) {
    for (const it of s.items || []) {
      if ((it.group || (it.num || '')[0]) !== 'A') continue;
      if (!nameRe.test(it.name || '')) continue;
      const kg = Number((/(\d+(?:\.\d+)?)\s*kg/.exec(it.weight || '') || [])[1]) || 0;
      if (!best || kg > best.kg) best = { kg, it };
    }
  }
  return best;
}
const parseReps = (sets) => Number((/×\s*(\d+)/.exec(sets || '') || [])[1]) || null;

// ── 1 · THE G9 GATE — a non-logging PL intermediate's week 6 ≠ week 5 (load or reps) ──
{
  const plan = generatePlan(plProfile());
  const w5 = topSet(weekOf(plan, 5), /squat/i);
  const w6 = topSet(weekOf(plan, 6), /squat/i);
  assert(w5 && w6, 'G9: the squat top set is present in weeks 5 and 6 (build block)');
  const loadMoved = w5.kg > 0 && w6.kg > 0 && w6.kg !== w5.kg;
  const repsMoved = parseReps(w6.it.sets) !== parseReps(w5.it.sets);
  assert(loadMoved || repsMoved,
    `G9: week 6 ≠ week 5 in load or reps (SR-01 closed) — wk5 ${w5.it.sets} ${w5.it.weight} → wk6 ${w6.it.sets} ${w6.it.weight}`);
  assert(w6.kg > w5.kg || repsMoved, 'G9: the movement is PROGRESSIVE (load up, not down)');

  // Labelled estimated, with its driver in the trace (Art 16).
  assert(w6.it.estimated === true, 'G9: the week-6 advancement is LABELLED estimated (never dressed as measured)');
  assert(w6.it.progression && /estimated/i.test(w6.it.progression.driver),
    `G9: the estimate carries its DRIVER in the trace — "${w6.it.progression && w6.it.progression.driver}"`);
  assert(w6.it.progression && w6.it.progression.confidence === 'low',
    'G9: the estimate carries a lowered confidence tier (Art 13)');
}

// ── 2 · the progression-sanity NET goes QUIET for the powerlifter (the acceptance instrument) ──
{
  const plan = generatePlan(plProfile());
  const report = validatePlanProgression(plan);
  const flat = report.findings.filter((f) => f.validator === 'progression.sanity' && /flat block/.test(f.reason));
  assert(flat.length === 0, `progression-sanity is QUIET for the crept PL plan — no flat block (was the SR-01 defect); found ${flat.length}`);
  const regress = report.findings.filter((f) => f.validator === 'progression.sanity' && /unexplained regression/.test(f.reason));
  assert(regress.length === 0, 'progression-sanity finds NO unexplained regression in the crept PL plan (creep is monotonic within a block)');
}

// ── 3 · programmed warm-up RAMP on the top set (SR-10 closed) ────────────────────────
{
  const plan = generatePlan(plProfile());
  const w6 = topSet(weekOf(plan, 6), /squat/i);
  assert(Array.isArray(w6.it.warmupRamp) && w6.it.warmupRamp.length >= 2,
    'SR-10: the heavy top set carries a programmed warm-up ramp (never cold off a primer)');
  const ascends = w6.it.warmupRamp.every((r, i, a) => i === 0 || r.pct > a[i - 1].pct);
  assert(ascends, 'SR-10: the ramp ascends toward the working set');
}

// ── 4 · accessory DOUBLE PROGRESSION — reps climb across the block ────────────────────
{
  const plan = generatePlan(plProfile());
  const dp = [];
  for (const w of [5, 8]) {
    for (const s of weekOf(plan, w).sessions) for (const it of s.items)
      if (it.progression && it.progression.currency === 'reps') dp.push({ w, name: it.name, reps: parseReps(it.sets), added: it.progression.addedReps });
  }
  assert(dp.some((x) => x.w === 8 && x.added > 0), 'double progression: an accessory has climbed reps by week 8 (reps→load, load held)');
}

// ── 5 · GATE PROOF — a non-PL discipline is UNCHANGED (hypertrophy/olympic/sports = T3–T5) ──
{
  const hyp = generatePlan({ ...plProfile(), strength_style: 'bodybuilding' });
  const anyEstimated = hyp.phases.flatMap((p) => p.weeks).flatMap((w) => w.sessions).flatMap((s) => s.items).some((it) => it.estimated);
  assert(!anyEstimated, 'GATE: a hypertrophy plan carries NO estimator-creep labels (creep is powerlifting-only this task)');
  const oly = generatePlan({ ...plProfile(), strength_style: undefined, discipline: 'olympic', lifts: { squat: 150 } });
  const olyEstimated = oly.phases.flatMap((p) => p.weeks).flatMap((w) => w.sessions).flatMap((s) => s.items).some((it) => it.estimated);
  assert(!olyEstimated, 'GATE: an olympic plan carries NO estimator-creep labels (T4)');
}

// ── 6 · LOGGED displaces the estimate — the fast path is untouched ────────────────────
{
  const logged = generatePlan(plProfile({ lift_log: { squat: { e1rm: 170, rpe: 8, at: '2026-07-10' } } }));
  const w5 = topSet(weekOf(logged, 5), /back squat/i);
  const w6 = topSet(weekOf(logged, 6), /back squat/i);
  assert(w5 && w6 && !w5.it.estimated && !w6.it.estimated,
    'LOGGED: a logged compound is NOT labelled estimated (measured displaces inferred — the fast path stays)');
  assert(w5.kg === w6.kg, 'LOGGED: the logged compound does not creep (autoregulation owns it)');
}

// ── 7 · COMPLETION-GATED — an uncompleted week does not advance ───────────────────────
{
  // Only week 5 completed; week 6/7 uncompleted → creep holds at the week-5 completion count.
  const gated = generatePlan(plProfile({ completed_weeks: [5] }));
  const w6 = topSet(weekOf(gated, 6), /squat/i);
  const w7 = topSet(weekOf(gated, 7), /squat/i);
  assert(w6.it.progression.weeks === 1, 'COMPLETION-GATED: week 6 creeps over the 1 completed prior working week');
  assert(w7.it.progression.weeks === 1 && w7.kg === w6.kg,
    'COMPLETION-GATED: week 7 does NOT advance past week 6 (week 6 was not marked complete — a missed block holds, never advances blind)');
}

// ── 8 · determinism — same profile, same plan (Art 18) ────────────────────────────────
{
  const a = JSON.stringify(generatePlan(plProfile()));
  const b = JSON.stringify(generatePlan(plProfile()));
  assert(a === b, 'determinism: the crept plan is a pure function of the profile (no clock, no randomness)');
}

if (failures) { console.error(`\n${failures} assertion(s) failed.`); }
else { console.log('\nprogression-creep: all assertions passed.'); }
