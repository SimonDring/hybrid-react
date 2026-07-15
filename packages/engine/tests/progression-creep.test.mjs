// progression-creep.test.mjs — Phase 3 M2 T2/T3: the G9 ACCEPTANCE GATE (the phase headline).
//
// The audit's worst finding (SR-01/G9): a non-logging athlete received the SAME stimulus
// for 3–4 weeks — no overload — "the most athlete-visible coaching failure" (audit 08, P0).
// M2 T2 made the non-logging POWERLIFTER progress: estimator-driven creep advances the
// compound load week-over-week at a governed conservative rate, completion-gated, LABELLED
// estimated, with accessory double-progression and programmed warm-up ramps (SR-10) — any
// logged set displaces the estimate.
//
// M2 T3 extends the SAME mechanism to HYPERTROPHY: its rep-range emphasis means there is no
// near-maximal single to ramp toward, so its PRIMARY role runs the reps-first double
// progression T2 already built for accessories (climb reps toward the top of the range,
// load held) instead of load-creep + ramp. Olympic/sports are T4–T5 and MUST stay unchanged
// here (the gate proof, section 5below).
//
// THE EXIT GATE (spec §7 M2a; plan T2/T3): a non-logging intermediate's WEEK 6 ≠ WEEK 5 in
// load or reps, and the advancement is labelled estimated with its driver in the trace —
// for BOTH powerlifting (sections 1–4, 6–8) and hypertrophy (sections 9–11).
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

// ── 5 · GATE PROOF — a non-creep-gated discipline is UNCHANGED (olympic/sports = T4–T5) ──
{
  const oly = generatePlan({ ...plProfile(), strength_style: undefined, discipline: 'olympic', lifts: { squat: 150 } });
  const olyEstimated = oly.phases.flatMap((p) => p.weeks).flatMap((w) => w.sessions).flatMap((s) => s.items).some((it) => it.estimated);
  assert(!olyEstimated, 'GATE: an olympic plan carries NO estimator-creep labels (T4 — powerlifting T2 + hypertrophy T3 are the only creep-gated disciplines so far)');
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

// ══════════════════════════════════════════════════════════════════════════════════
// M2 T3 — HYPERTROPHY (reps-first double progression on the primary; no ramp)
// ══════════════════════════════════════════════════════════════════════════════════
const hypProfile = (extra = {}) => ({
  goal_type: 'build', strength_style: 'bodybuilding',        // → hypertrophy discipline (WP-49 T6 flip)
  experience_level: 'intermediate', experience: { gym: 'intermediate' },
  sex: 'male', bodyweight_kg: 82, access: FULL, plan_start_date: '2026-07-13',
  lifts: {}, availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] },
  ...extra,
});

// ── 9 · THE G9 GATE, hypertrophy — week 6 ≠ week 5 in reps (SR-01 closed) ─────────────
// This profile's 'off' block is base(wks1–3) + build(wks4–10, deloads at 5 & 10) — week 5
// is itself a deload (drops to the deload scheme, no creep applied), so week 6 differs from
// week 5 both by the deload contrast AND by creep; section 10 below isolates creep alone
// (two adjacent WORKING weeks, 6→7) for an unconfounded proof of the mechanism itself.
{
  const plan = generatePlan(hypProfile());
  const w5 = topSet(weekOf(plan, 5), /squat/i);
  const w6 = topSet(weekOf(plan, 6), /squat/i);
  assert(w5 && w6, 'G9 (hypertrophy): the squat primary is present in weeks 5 and 6');
  const repsMoved = parseReps(w6.it.sets) !== parseReps(w5.it.sets);
  assert(repsMoved, `G9 (hypertrophy): week 6 ≠ week 5 in reps (SR-01 closed) — wk5 ${w5.it.sets} → wk6 ${w6.it.sets}`);
  assert(w6.it.estimated === true, 'G9 (hypertrophy): the week-6 advancement is LABELLED estimated');
  assert(w6.it.progression && /reps-first double progression/i.test(w6.it.progression.driver),
    `G9 (hypertrophy): the estimate carries its REPS-FIRST driver in the trace — "${w6.it.progression && w6.it.progression.driver}"`);
  assert(w6.it.progression && w6.it.progression.confidence === 'low',
    'G9 (hypertrophy): the estimate carries a lowered confidence tier (Art 13)');
  assert(!Array.isArray(w6.it.warmupRamp),
    'G9 (hypertrophy): NO warm-up ramp on the primary (no near-maximal single to ramp toward — unlike powerlifting)');
  assert(w6.it.weight === w5.it.weight || Number((/(\d+(?:\.\d+)?)/.exec(w6.it.weight) || [])[1]) <= Number((/(\d+(?:\.\d+)?)/.exec(w5.it.weight) || [])[1]),
    'G9 (hypertrophy): LOAD is never advanced on the crept primary (reps-first — 🔒 1 conservative, load untouched this task)');
}

// ── 10 · UNCONFOUNDED creep proof — two adjacent WORKING weeks (6→7), reps keep climbing ──
{
  const plan = generatePlan(hypProfile());
  const w6 = topSet(weekOf(plan, 6), /squat/i);
  const w7 = topSet(weekOf(plan, 7), /squat/i);
  assert(!weekOf(plan, 6).deload && !weekOf(plan, 7).deload, 'sanity: weeks 6 and 7 are both WORKING weeks (no deload between them)');
  assert(parseReps(w7.it.sets) > parseReps(w6.it.sets),
    `hypertrophy creep is PROGRESSIVE across two working weeks with no deload between: wk6 ${w6.it.sets} → wk7 ${w7.it.sets}`);
  assert(w7.it.progression.addedReps > w6.it.progression.addedReps,
    'the reps-first double progression accumulates (more completed working weeks → more added reps)');
}

// ── 11 · progression-sanity's FLAT-BLOCK flag goes QUIET for hypertrophy (T3's acceptance
// instrument — the specific finding this task closes). NOTE: this archetype also carries a
// pre-existing "unexplained regression" finding on a tiny-load accessory (Lateral raise,
// 8→7 kg) that is NOT part of the creep model and fires IDENTICALLY with hypertrophy creep
// OFF (verified empirically) — a latent weight-rounding artifact of applyWeights on very
// small loads, out of T3's scope (no new machinery); left for a future ticket, not silently
// hidden (Art 15).
{
  const plan = generatePlan(hypProfile());
  const report = validatePlanProgression(plan);
  const flat = report.findings.filter((f) => f.validator === 'progression.sanity' && /flat block/.test(f.reason));
  assert(flat.length === 0, `progression-sanity's flat-block flag is QUIET for the crept hypertrophy plan (was the SR-01 defect); found ${flat.length}`);
}

// ── 12 · hypertrophy accessory double progression is UNCHANGED in shape (same mechanism) ──
{
  const plan = generatePlan(hypProfile());
  const dp = [];
  for (const w of [6, 8]) {
    for (const s of weekOf(plan, w).sessions) for (const it of s.items)
      if (it.progression && it.progression.currency === 'reps' && it.progression.driver === 'estimated — double progression (reps→load, completion-gated)') dp.push({ w, name: it.name, reps: parseReps(it.sets) });
  }
  assert(dp.length > 0, 'hypertrophy accessories also climb reps via the SAME double-progression path (no fork)');
}

// ── 13 · LOGGED displaces the estimate for hypertrophy too — the fast path is untouched ──
{
  const logged = generatePlan(hypProfile({ lift_log: { squat: { e1rm: 140, rpe: 8, at: '2026-07-10' } } }));
  const w6 = topSet(weekOf(logged, 6), /back squat/i);
  const w7 = topSet(weekOf(logged, 7), /back squat/i);
  assert(w6 && w7 && !w6.it.estimated && !w7.it.estimated,
    'LOGGED (hypertrophy): a logged compound is NOT labelled estimated (measured displaces inferred)');
  assert(parseReps(w6.it.sets) === parseReps(w7.it.sets),
    'LOGGED (hypertrophy): the logged compound does not reps-creep either (autoregulation owns it)');
}

// ── 14 · determinism — same hypertrophy profile, same plan (Art 18) ───────────────────
{
  const a = JSON.stringify(generatePlan(hypProfile()));
  const b = JSON.stringify(generatePlan(hypProfile()));
  assert(a === b, 'determinism (hypertrophy): the crept plan is a pure function of the profile');
}

if (failures) { console.error(`\n${failures} assertion(s) failed.`); }
else { console.log('\nprogression-creep: all assertions passed.'); }
