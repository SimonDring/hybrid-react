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
// load held) instead of load-creep + ramp.
//
// M2 T4 extends the SAME mechanism to OLYMPIC: intensity-led, like powerlifting — the
// classic lifts (snatch, clean & jerk) and their derivatives LOAD-creep (not reps-first),
// and this is where the programmed warm-up ramp matters MOST (SR-10) — a near-maximal
// technical single/double gets a FINER per-adaptation ramp than the generic 3-step one.
// T4 also discovered and fixed a prerequisite gap: the classic lifts (pattern 'olympic')
// had NO weight-anchor at all (exerciseLoad.js), so there was nothing to creep or ramp —
// closed with a conservative %-of-squat anchor (sections 15–19 below). Sports are T5 and
// MUST stay unchanged here (the gate proof, section 5 below, now tests a SPORT profile).
//
// THE EXIT GATE (spec §7 M2a; plan T2/T3/T4): a non-logging intermediate's WEEK 6 ≠ WEEK 5
// in load or reps, and the advancement is labelled estimated with its driver in the trace —
// for powerlifting (sections 1–4, 6–8), hypertrophy (sections 9–11), and olympic (15–19).
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

// ── 5 · GATE PROOF — a non-creep-gated cohort is UNCHANGED (sports = T5, not yet gated) ──
// Olympic is now GATED ON (T4 below) — this proof moves to a SPORT profile instead (sport
// goals resolve discipline=null via resolveBuildDisciplineId, so applyProgressionCreep's
// gate never engages; sections 15+ below cover olympic itself).
{
  const sport = generatePlan({
    goal_type: 'sport', sport: 'run', run_discipline: 'sprint', sport_intent: 'compete', event_date: '2026-08-30',
    experience_level: 'intermediate', experience: { gym: 'intermediate' }, sex: 'male', bodyweight_kg: 75,
    access: FULL, plan_start_date: '2026-07-13', lifts: {}, availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] },
  });
  const sportEstimated = sport.phases.flatMap((p) => p.weeks).flatMap((w) => w.sessions).flatMap((s) => s.items).some((it) => it.estimated);
  assert(!sportEstimated, 'GATE: a sport plan carries NO estimator-creep labels (T5 — powerlifting T2 + hypertrophy T3 + olympic T4 are the only creep-gated disciplines so far)');
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

// ══════════════════════════════════════════════════════════════════════════════════
// M2 T4 — OLYMPIC (intensity-led load-creep on the classic lifts; finer warm-up ramp)
// ══════════════════════════════════════════════════════════════════════════════════
// Olympic sessions carry MULTIPLE lettered primaries per session (Snatch=A, Power Snatch=B,
// Overhead Squat=C, etc — unlike PL/hypertrophy's single group-A main lift), so this section
// locates a named item wherever it sits (not group-A-only, unlike the topSet() helper above).
function findItem(week, nameRe) {
  for (const s of week.sessions || []) {
    for (const it of s.items || []) if (nameRe.test(it.name || '')) return it;
  }
  return null;
}
// The 'advanced' experience level matches the golden-master's own olympic archetype
// (build·olympic·advanced·4d) — it also happens to be a coaching-real prerequisite: snatch,
// clean_and_jerk, power_snatch, hang_snatch, split_jerk, and overhead_squat all carry
// minLevelForPrimary:'advanced' (olympic.js's documented competency gate on the technical
// classic lifts), so at 'intermediate' those SPECIFIC exercises are demoted to accessory
// (or not selected at all) and an athlete instead trains their power/hang/pull derivatives —
// exactly the "beginners build toward them" design the discipline module documents. This
// profile is therefore what genuinely exercises "the competition lifts carry a ramp".
const olyProfile = (extra = {}) => ({
  goal_type: 'build', strength_style: 'olympic',              // → olympic discipline
  experience_level: 'advanced', experience: { gym: 'advanced' },
  sex: 'male', bodyweight_kg: 82, access: FULL, plan_start_date: '2026-07-13',
  lifts: { squat: 150 }, availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] },
  ...extra,
});

// ── 15 · THE G9 GATE, olympic — week 6 ≠ week 5 in load (SR-01 closed) ────────────────
// Uses Overhead Squat (role primary, discipline 'olympic', a loadable classic-lift-family
// exercise) for the headline week5→6 comparison — see section 16/17 below for the LITERAL
// competition lifts (snatch, clean & jerk) specifically.
{
  const plan = generatePlan(olyProfile());
  const w5 = findItem(weekOf(plan, 5), /overhead squat/i);
  const w6 = findItem(weekOf(plan, 6), /overhead squat/i);
  assert(w5 && w6, 'G9 (olympic): Overhead Squat is present in weeks 5 and 6 (build block)');
  const kg5 = Number((/(\d+(?:\.\d+)?)\s*kg/.exec(w5.weight || '') || [])[1]) || 0;
  const kg6 = Number((/(\d+(?:\.\d+)?)\s*kg/.exec(w6.weight || '') || [])[1]) || 0;
  assert(kg5 > 0 && kg6 > kg5, `G9 (olympic): week 6 ≠ week 5, PROGRESSIVE (load up) — wk5 ${w5.weight} → wk6 ${w6.weight}`);
  assert(w6.estimated === true, 'G9 (olympic): the week-6 advancement is LABELLED estimated');
  assert(w6.progression && /estimated/i.test(w6.progression.driver) && w6.progression.adaptation === 'explosiveStrength',
    `G9 (olympic): the estimate carries its DRIVER + explosiveStrength adaptation in the trace — "${w6.progression && w6.progression.driver}"`);
  assert(w6.progression && w6.progression.confidence === 'low', 'G9 (olympic): the estimate carries a lowered confidence tier (Art 13)');
  assert(w6.progression && w6.progression.weeklyLoadPct === 0.01,
    'G9 (olympic): explosiveStrength creeps at its OWN governed rate (1.0%/wk — deliberately slower than powerlifting maxStrength\'s 1.5%)');
}

// ── 16 · THE COMPETITION LIFTS carry a programmed warm-up ramp (SR-10 closed — this is
// where it matters MOST, 07-PROGRESSION §2.2) ──────────────────────────────────────────
{
  const plan = generatePlan(olyProfile());
  const w5 = weekOf(plan, 5);
  const snatch = findItem(w5, /^Snatch$/);
  const cj = findItem(w5, /^Clean and Jerk$/);
  assert(snatch && cj, 'sanity: Snatch and Clean and Jerk are both present (advanced athlete, minLevelForPrimary met)');
  for (const [name, it] of [['Snatch', snatch], ['Clean and Jerk', cj]]) {
    assert(Array.isArray(it.warmupRamp) && it.warmupRamp.length === 4,
      `SR-10 (olympic): "${name}" carries a programmed warm-up ramp with the FINER 4-step explosiveStrength override (not the generic 3-step)`);
    const ascends = it.warmupRamp.every((r, i, a) => i === 0 || r.pct > a[i - 1].pct);
    assert(ascends, `SR-10 (olympic): "${name}"'s ramp ascends toward the working set`);
    assert(it.warmupRamp[it.warmupRamp.length - 1].pct < 1, `SR-10 (olympic): "${name}"'s ramp stays below the working top set`);
    assert(it.estimated === true && it.progression && it.progression.confidence === 'low',
      `"${name}" is labelled estimated with a lowered confidence tier`);
  }
}

// ── 17 · THE COMPETITION LIFTS progress in load across the block — an UNCONFOUNDED
// two-completed-week proof (wk5→wk7). NOTE: at the coarse 2.5 kg display rounding (round2_5)
// combined with the deliberately-conservative 1.0%/wk rate, a SINGLE week's creep on these
// specific lifts sometimes doesn't cross a rounding step at wk6 (the same hold-biased
// round2_5 behaviour already documented in T2 for lighter loads) — exactly the reason T3
// used an unconfounded two-week pair for hypertrophy. Two completed working weeks (wk5→wk7,
// no deload between them) isolates the mechanism cleanly. ─────────────────────────────────
{
  const plan = generatePlan(olyProfile());
  const w5 = weekOf(plan, 5), w7 = weekOf(plan, 7);
  assert(!w5.deload && !w5.taper && !weekOf(plan, 6).deload && !w7.deload, 'sanity: weeks 5, 6, 7 are consecutive WORKING weeks (no deload between)');
  const snatch5 = findItem(w5, /^Snatch$/), snatch7 = findItem(w7, /^Snatch$/);
  const cj5 = findItem(w5, /^Clean and Jerk$/), cj7 = findItem(w7, /^Clean and Jerk$/);
  const kg = (it) => Number((/(\d+(?:\.\d+)?)\s*kg/.exec(it.weight || '') || [])[1]) || 0;
  assert(kg(snatch7) > kg(snatch5), `olympic creep is PROGRESSIVE on Snatch across two completed working weeks: wk5 ${snatch5.weight} → wk7 ${snatch7.weight}`);
  assert(kg(cj7) > kg(cj5), `olympic creep is PROGRESSIVE on Clean and Jerk across two completed working weeks: wk5 ${cj5.weight} → wk7 ${cj7.weight}`);
  assert(snatch7.progression.weeks > snatch5.progression.weeks && cj7.progression.weeks > cj5.progression.weeks,
    'the completed-working-week count accumulates block-scoped, as designed');
}

// ── 18 · progression-sanity's FLAT-BLOCK flag goes QUIET for olympic (T4's acceptance
// instrument) ───────────────────────────────────────────────────────────────────────────
{
  const plan = generatePlan(olyProfile());
  const report = validatePlanProgression(plan);
  const flat = report.findings.filter((f) => f.validator === 'progression.sanity' && /flat block/.test(f.reason));
  assert(flat.length === 0, `progression-sanity is QUIET for the crept olympic plan (was the SR-01 defect); found ${flat.length}`);
}

// ── 19 · LOGGED displaces the estimate for olympic too — the fast path is untouched ──────
// A 6-day olympic week carries an "Upper" accessory day with Bench press (a recognised
// tracked lift) — proving the logged fast path survives even inside a discipline whose
// classic lifts have no e1RM tracking of their own.
{
  const sixDay = (extra = {}) => olyProfile({ availability: { days_per_week: 6, days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] }, ...extra });
  const logged = generatePlan(sixDay({ lift_log: { bench: { e1rm: 100, rpe: 8, at: '2026-07-10' } } }));
  const w5 = findItem(weekOf(logged, 5), /^Bench press$/);
  const w6 = findItem(weekOf(logged, 6), /^Bench press$/);
  assert(w5 && w6 && !w5.estimated && !w6.estimated,
    'LOGGED (olympic): a logged bench press is NOT labelled estimated (measured displaces inferred — the fast path stays)');
  assert(w5.weight === w6.weight, 'LOGGED (olympic): the logged lift does not creep (autoregulation owns it)');
}

// ── 20 · determinism — same olympic profile, same plan (Art 18) ──────────────────────────
{
  const a = JSON.stringify(generatePlan(olyProfile()));
  const b = JSON.stringify(generatePlan(olyProfile()));
  assert(a === b, 'determinism (olympic): the crept plan is a pure function of the profile');
}

if (failures) { console.error(`\n${failures} assertion(s) failed.`); }
else { console.log('\nprogression-creep: all assertions passed.'); }
