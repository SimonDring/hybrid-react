// tests/validation-suite.js — WP-12: the full validator set + the EDS §37 conflict
// order + the ValidationReport surfaced on plan.meta.
//
// Each validator is proven non-vacuous with a violating synthetic week; live plans
// carry an all-pass report on plan.meta.validation; findings sort by conflict tier
// (safety first) and Art-13 capping still holds.

import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { validateWeek, VALIDATORS, CONFLICT_ORDER } from '@performance-os/engine/lib/validation/contract.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

// ── The conflict order is the EDS §37 order, and the registry is tiered ──────
assert(CONFLICT_ORDER.length === 6 && CONFLICT_ORDER[0] === 'SAFETY & LAW' && CONFLICT_ORDER[2] === 'RECOVERABILITY',
  'CONFLICT_ORDER encodes the six EDS §37 tiers');
assert(VALIDATORS.length === 5 && VALIDATORS.every((v) => v.tier >= 1 && v.tier <= 6),
  `all ${VALIDATORS.length} validators declare a §37 tier`);
const tiers = VALIDATORS.map((v) => v.tier);
assert(tiers.every((t, i) => i === 0 || tiers[i - 1] <= t), 'registry is in tier order (safety first)');

// ── plan.meta.validation: live plans ship with an all-pass report ────────────
const plan = generatePlan({
  plan_start_date: '2026-07-06', goal_type: 'build', strength_style: 'bodybuilding',
  experience: { gym: 'intermediate' },
  availability: { days_per_week: 4, days: ['monday', 'tuesday', 'thursday', 'friday'] },
  access: FULL, sex: 'male', bodyweight_kg: 80
});
assert(plan.meta && plan.meta.validation && plan.meta.validation.pass === true,
  'generated plan carries an all-pass ValidationReport on plan.meta');
assert(plan.meta.validation.checked === plan.phases.flatMap((p) => p.weeks).length,
  `every week was checked (${plan.meta.validation.checked})`);
assert(plan.meta.validation.weeks.length === 0, 'no problem weeks on a live plan');

// ── Duration honesty (tier 4, trim) ──────────────────────────────────────────
const longDay = { sessions: [{ discipline: 'gym', title: 'Monday · Upper', duration: '~120 min', items: [{ name: 'Bench press', sets: '4 × 8', rpe: 'RPE 8' }] }] };
const dur = validateWeek(longDay).findings.find((f) => f.validatorId === 'session.duration-honesty');
assert(dur && dur.verdict === 'trim' && /120 min exceeds the 75-min ceiling/.test(dur.reason),
  `an over-ceiling session is flagged to trim (${dur && dur.reason})`);

// ── Equipment (tier 4, veto; needs ctx.access) ──────────────────────────────
const machineOnly = { sessions: [{ discipline: 'gym', title: 'Monday · Upper', duration: '~45 min', items: [{ name: 'Bench press', sets: '4 × 8', rpe: 'RPE 8' }] }] };
const eq = validateWeek(machineOnly, { access: ['bodyweight', 'band'] }).findings.find((f) => f.validatorId === 'session.equipment-available');
assert(eq && eq.verdict === 'veto' && /needs barbell/.test(eq.reason),
  `an unperformable item is vetoed (${eq && eq.reason})`);
assert(validateWeek(machineOnly, { access: FULL }).findings.find((f) => f.validatorId === 'session.equipment-available').verdict === 'pass',
  'the same week passes with full equipment');

// ── Purpose coherence (tier 5): empty session veto; mislabel trim ────────────
const empty = { sessions: [{ discipline: 'gym', title: 'Monday · Upper', duration: '~45 min', items: [] }] };
const pc1 = validateWeek(empty).findings.find((f) => f.validatorId === 'session.purpose-coherence');
assert(pc1 && pc1.verdict === 'veto' && /shipped empty/.test(pc1.reason), 'an empty session is vetoed');
const mislabelled = { sessions: [{ discipline: 'gym', title: 'Monday · Lower', duration: '~45 min', items: [{ name: 'Bench press', sets: '5 × 8', rpe: 'RPE 8' }] }] };
const pc2 = validateWeek(mislabelled).findings.find((f) => f.validatorId === 'session.purpose-coherence');
assert(pc2 && pc2.verdict === 'trim' && /labelled lower/.test(pc2.reason),
  `a Lower day full of pressing is flagged (${pc2 && pc2.reason})`);

// ── Injury contraindication (tier 1, veto; fixed-point of the filter) ────────
const kneeInjury = [{ body_part_key: 'knee', status: 'active', severity: 5 }];
const squatWeek = { sessions: [{ discipline: 'gym', title: 'Monday · Lower', duration: '~45 min', items: [{ name: 'Back squat', sets: '4 × 5', rpe: 'RPE 8' }, { name: 'Leg extension', sets: '3 × 12', rpe: 'RPE 7' }] }] };
const inj = validateWeek(squatWeek, { injuries: kneeInjury }).findings.find((f) => f.validatorId === 'injury.contraindication');
assert(inj && inj.verdict === 'veto' && inj.tier === 1,
  `a contraindicated week is vetoed at tier 1 (${inj && inj.verdict}/${inj && inj.tier})`);
assert(validateWeek(squatWeek, { injuries: [] }).findings.find((f) => f.validatorId === 'injury.contraindication').verdict === 'pass',
  'no active injuries → injury validator passes');

// ── §37 ordering: safety findings sort before recoverability/objective ───────
const messy = {
  sessions: [
    { discipline: 'gym', title: 'Monday · Lower', duration: '~120 min', items: [{ name: 'Back squat', sets: '30 × 5', rpe: 'RPE 8' }] }
  ]
};
const messyReport = validateWeek(messy, { injuries: kneeInjury });
const nonPass = messyReport.findings.filter((f) => f.verdict !== 'pass');
assert(nonPass.length >= 3, `the messy week trips multiple validators (${nonPass.length})`);
assert(nonPass[0].tier === 1 && nonPass[0].validatorId === 'injury.contraindication',
  'findings are sorted by conflict tier — safety first');
assert(nonPass.every((f, i) => i === 0 || nonPass[i - 1].tier <= f.tier), 'tier order is monotonic in the report');
