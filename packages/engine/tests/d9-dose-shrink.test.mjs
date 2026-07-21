// d9-dose-shrink.test.mjs — D9 form-fatigued volume trim in the runtime reflow
// (coaching-refinements-md4-d9-2026-07-21, refinement 2).
//
// The form model (Phase 2 flip) is LIVE and already threaded into reflowPhases as a
// CORROBORATOR for the adaptive-deload decision (deload-form-seam.test.mjs). This adds
// a SEPARATE, independent fold-in: when the live form readout reads band 'fatigued',
// the current week's volume multiplier is capped via `mult = Math.min(mult, formMult)`
// (governed load.form.dose.fatiguedVolumeMult, currently 0.9) — Math.min, not multiply,
// so a deload that already cut `mult` below 0.9 is never double-counted; the trim only
// bites in the "fatigued but not deloading" middle zone.
//
// This file proves three real discriminators (not vacuous assertions):
//   (a) form=null (or omitted) reproduces the baseline plan byte-identically — the
//       CRITICAL invariant generatePlan (the pure engine) never reads form; the golden
//       master's own reflow≡baseline property (prop-reflow-baseline.test.mjs) already
//       proves this holds for every archetype's neutral reflow, so this file adds one
//       direct, local check rather than re-deriving the whole property.
//   (b) form 'fatigued' with an otherwise-neutral live state (no readiness/load/illness/
//       scheduled-deload signal) measurably TRIMS the current week's volume vs the same
//       reflow with form=null — a real decrease in countWeeklyVolume's total set count,
//       found by an empirical sweep across build archetypes (bodybuilding/advanced/
//       male/7d/full is the fixture used here: 146.5 → 134.5 total sets at week 1,
//       an ~8% cut, reproducible and non-vacuous).
//   (c) form 'fatigued' WHEN the live state is ALREADY deloading (recovery.volumeModifier
//       0.5 — mult already well below the 0.9 trim floor) produces NO additional cut:
//       the reflowed week is byte-identical whether form is null or fatigued, proving
//       Math.min (not multiplication) is really what's wired — no double-counting.
//
// Mirrors prop-reflow-baseline.test.mjs's pattern: reconstruct gymCtx()/dateForSession()
// from engine exports only (no apps/mobile import — repo convention for
// packages/engine/tests/*.test.mjs), and build the full reflow input by hand.
import assert from 'node:assert/strict';
import {
  generatePlan, reflow, resolveProgram, resolveLifts, performanceModelForProfile,
  countWeeklyVolume,
} from '@performance-os/engine';

let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); console.log('PASS:', m); };

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

// The fixture profile (empirically verified — see the refinement's report): a full-gym,
// advanced, 7-day/week bodybuilding build fills the session-minutes budget closely enough
// that a 10% cut is a real, measurable trim, not absorbed as slack.
const PROFILE = {
  goal_type: 'build', strength_style: 'bodybuilding', experience_level: 'advanced',
  experience: { gym: 'advanced' }, sex: 'male', bodyweight_kg: 85, access: FULL,
  availability: { days_per_week: 7, days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  plan_start_date: '2026-07-13', lifts: { squat: 140, bench: 100, deadlift: 180, ohp: 60 },
};

// ── calendar helpers — mirror apps/mobile PlanService.dateForSession() exactly ──
const DAY_IDX = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };
const parseISO = (s) => { const d = new Date(s + 'T00:00:00'); return isNaN(d.getTime()) ? null : d; };
function mondayOf(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
function weekdayOfTitle(title) { const t = (title || '').toLowerCase(); for (const k in DAY_IDX) if (t.includes(k)) return DAY_IDX[k]; return null; }
function dateForSession(startDate, weekNum, title) {
  const wi = weekdayOfTitle(title);
  if (!startDate || wi == null) return null;
  const d = mondayOf(startDate);
  d.setDate(d.getDate() + (weekNum - 1) * 7 + wi);
  return d;
}

// ── gctx — mirror apps/mobile PlanService.gymCtx() exactly, engine exports only ──
function gymCtx(profile) {
  const program = resolveProgram(profile);
  const e = profile.experience || {};
  const level = e.gym || e.strength_functional || e.strength_physique || 'beginner';
  const minutes = 75; // SESSION_CEILING_MIN — volume-driven, PlanService no longer takes a session-length answer
  const asOf = profile.plan_start_date || null;
  const perf = performanceModelForProfile(profile, asOf);
  return {
    style: program.style, level, minutes,
    access: profile.access || [], sex: profile.sex, lifts: resolveLifts(profile),
    bodyweight: profile.bodyweight_kg,
    emphasis: program.emphasis, volumeScalar: program.volumeScalar,
    exercisePriority: program.exercisePriority || [], priorityByIntent: program.priorityByIntent || new Map(),
    sport: profile.sport || null, power: !!program.power,
    priorityQualities: (perf && perf.priorityAdaptations) || [], season: program.season, skbIds: new Map(),
    skbSportId: null, discipline: program.discipline || null,
    competedLift: profile.olympic_lift || 'both',
  };
}

const plan = generatePlan({ ...PROFILE });
const startDate = parseISO(PROFILE.plan_start_date);
const today = new Date(startDate); today.setHours(0, 0, 0, 0);

// Build the full neutral reflow input for week 1, "today" = plan start — mirrors
// prop-reflow-baseline.test.mjs's neutralReflowInput().
function reflowInput(extra = {}) {
  return {
    phases: plan.phases, currentWeek: 1, today, gctx: gymCtx(PROFILE), profile: PROFILE,
    sessions: {}, recovery: null, load: null, reverted: false, overrides: {}, activeInjuries: [],
    dateFor: (wn, title) => dateForSession(startDate, wn, title), totalWeeks: plan.totalWeeks,
    startDate, startISO: PROFILE.plan_start_date,
    ...extra,
  };
}

const totalSets = (sessions) => Object.values(countWeeklyVolume(sessions).counts).reduce((a, b) => a + b, 0);

const FATIGUED_FORM = { ctl: 40, atl: 60, tsb: -20, band: 'fatigued', confidence: 0.9, rationale: 'high accumulated aerobic fatigue' };

// ── (a) form=null (or omitted) ≡ baseline, byte-identical ──────────────────────────
{
  const rOmitted = reflow(reflowInput());
  const rNull = reflow(reflowInput({ form: null }));
  ok(JSON.stringify(rOmitted.phases) === JSON.stringify(plan.phases),
    'form omitted → reflow reproduces the baseline plan byte-identically (D9 never fires when form is absent)');
  ok(JSON.stringify(rNull.phases) === JSON.stringify(plan.phases),
    'form: null → reflow reproduces the baseline plan byte-identically (D9 never fires on an explicit null form)');
  ok(JSON.stringify(rOmitted.phases) === JSON.stringify(rNull.phases),
    'form omitted and form: null are indistinguishable to the reflow');
}

// ── (b) form 'fatigued', otherwise neutral (no readiness/load/illness/scheduled-deload
// signal) — the current week's volume is TRIMMED vs form=null. Non-vacuous: this is a
// real, measured decrease in weekly set volume, not merely "some field differs". ──────
{
  const rNull = reflow(reflowInput({ form: null }));
  const rFatigued = reflow(reflowInput({ form: FATIGUED_FORM }));
  const w1Null = rNull.phases[0].weeks[0];
  const w1Fatigued = rFatigued.phases[0].weeks[0];

  // Non-vacuity: the fatigued run actually reshaped the week (mult moved off 1, so the
  // "keep the baseline session" neutral-globals shortcut is bypassed).
  ok(w1Fatigued._adapted === true, 'fatigued form: the reflow DID reshape week 1 (non-vacuous — the trim actually engaged)');
  ok(!w1Null._adapted, 'form=null: week 1 stays untouched (the baseline-identity shortcut still applies) — the contrast is real');

  const setsNull = totalSets(w1Null.sessions);
  const setsFatigued = totalSets(w1Fatigued.sessions);
  ok(setsFatigued < setsNull,
    `fatigued form trims week-1 volume: ${setsFatigued} sets vs ${setsNull} sets with form=null (a real, observable reduction)`);
  // A gentle trim, not a crash-diet: the governed fatiguedVolumeMult is 0.9, so the cut
  // should be a modest fraction of the neutral total, not a wholesale gutting.
  ok(setsFatigued > setsNull * 0.5,
    `the trim is GENTLE (autoregulation, not a deload) — ${setsFatigued} sets is still well over half of ${setsNull}`);
}

// ── (c) form 'fatigued' WHILE ALREADY DELOADING (mult already < 0.9 from a real
// recovery signal) — NO additional cut. Math.min, not multiplication: proves the fold-in
// doesn't double-count a cut a deload already applied. ──────────────────────────────
{
  // A real, independent recovery signal that cuts volume well below the 0.9 trim floor.
  const deloadingRecovery = { volumeModifier: 0.5, rpeOffset: 0, sessionOverride: null, score: 40 };

  const rNullDeloading = reflow(reflowInput({ form: null, recovery: deloadingRecovery }));
  const rFatiguedDeloading = reflow(reflowInput({ form: FATIGUED_FORM, recovery: deloadingRecovery }));
  const w1NullDeloading = rNullDeloading.phases[0].weeks[0];
  const w1FatiguedDeloading = rFatiguedDeloading.phases[0].weeks[0];

  ok(JSON.stringify(w1NullDeloading.sessions) === JSON.stringify(w1FatiguedDeloading.sessions),
    'while already deloading (mult 0.5 < 0.9), a fatigued form adds NO further cut — byte-identical to form=null (Math.min, not multiplied — no double-counting)');

  // Non-vacuity: the deloading recovery signal alone is a REAL, independent cut (confirms
  // 0.5 < 0.9 genuinely dominates rather than this pair coincidentally matching for some
  // unrelated reason — e.g. both paths erroring out to the same fallback).
  const rNullNeutral = reflow(reflowInput({ form: null }));
  const setsDeloading = totalSets(w1NullDeloading.sessions);
  const setsNeutral = totalSets(rNullNeutral.phases[0].weeks[0].sessions);
  ok(setsDeloading < setsNeutral,
    `non-vacuity: the deloading recovery signal alone is a real, independent cut (${setsDeloading} vs ${setsNeutral} sets neutral) — the (c) equality above is a genuine "no double-count", not two vacuously-equal no-ops`);
}

console.log(`\nd9-dose-shrink: ${n}/${n} checks passed`);
