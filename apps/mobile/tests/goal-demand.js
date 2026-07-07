// tests/goal-demand.js — WP-42a: goal-as-sport demand profiles (EDS D2: "for build goals,
// resolve the goal's quality-importance profile") + diagnosis-emission HONESTY (meta.diagnosis
// ships only on plans the diagnosis actually STEERS).
//
// PARALLEL / VERIFIED-UNUSED: build cohorts stay on the legacy fill (the D11 gate requires
// style === 'sport'); their new diagnosis is model output only. Goldens byte-identical.
// Backlog: docs/architecture/REASSESSMENT-2026-07-05.md Priority 4.
import { performanceModelForProfile } from '@performance-os/engine/lib/performance/forProfile.js';
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const ASOF = '2026-07-06';

const buildProfile = (style, extra = {}) => ({
  ...answersToProfile(A({ goalType: 'build', strengthStyle: style, experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', bodyweight_kg: 82 })),
  plan_start_date: ASOF, ...extra,
});

// ── T1 · a build athlete finally HAS a demand profile and a diagnosis ─────────
{
  const pm = performanceModelForProfile(buildProfile('strength'), ASOF);
  assert(Array.isArray(pm.demandProfile) && pm.demandProfile.length > 0, 'T1a get_stronger → non-null demand profile');
  const ms = pm.demandProfile.find((d) => d.qualityId === 'maxStrength');
  // WP-49 T6 (THE FLIP): a build goal now runs off its DISCIPLINE, so the demand is sourced from
  // the discipline vector (strength → powerlifting: maxStrength 1.0), not the legacy goal outcome.
  assert(ms && ms.importance === 1.0 && ms.source === 'discipline', 'T1b maxStrength leads at 1.0, source declared as discipline (powerlifting)');
  assert(pm.limitingFactors.length > 0 && pm.limitingFactors.every((f) => typeof f.rationale === 'string' && f.rationale.length > 0),
    'T1c limiting factors exist and explain themselves (EDS D4: never no diagnosis)');
  assert(pm.priorityAdaptations.length >= 1 && pm.priorityAdaptations.length <= 3, 'T1d 1–3 priority qualities (focus beats breadth)');
}

// ── T2 · the diagnosis is PERSONAL: measured strength changes the verdict ─────
{
  const weak = performanceModelForProfile(buildProfile('strength'), ASOF);
  const strong = performanceModelForProfile(buildProfile('strength', { lifts: { squat: 170, bench: 120, deadlift: 210 } }), ASOF);
  assert(weak.limitingFactors[0].qualityId === 'maxStrength',
    'T2a unmeasured get_stronger athlete → maxStrength is the top limiter (the goal itself)');
  assert(strong.limitingFactors[0].qualityId !== 'maxStrength',
    `T2b a 2×BW squatter's limiter moves off maxStrength (got ${strong.limitingFactors[0].qualityId})`);
}

// ── T3 · style identity: bodybuilding is hypertrophy-led, functional is broad ──
{
  const bb = performanceModelForProfile(buildProfile('bodybuilding'), ASOF);
  const hy = bb.demandProfile.find((d) => d.qualityId === 'hypertrophy');
  assert(hy && hy.importance === 1.0, 'T3a build_muscle → hypertrophy demand 1.0');
  const fn = performanceModelForProfile(buildProfile('functional'), ASOF);
  assert(fn.demandProfile.length >= 5, 'T3b general fitness → broad demand (≥5 qualities)');
}

// ── T4 · THE FLIP (WP-49 T6): the build plan IS diagnosis-driven and says so ──
// Pre-flip this cohort was verified-UNUSED (build ran the legacy volume-first path and emitted no
// diagnosis). The flip routes build through the discipline engine, so meta.diagnosis is now emitted
// AND followed — displaying it is honest for build too, exactly as for the sport cohorts below.
{
  const plan = generatePlan(buildProfile('bodybuilding'));
  assert(plan.meta.diagnosis !== undefined, 'T4a build plan NOW emits meta.diagnosis (diagnosis-driven — the flip)');
  assert(plan.meta.diagnosis.priorityQualities && plan.meta.diagnosis.priorityQualities.length > 0,
    'T4b the build diagnosis carries real priority qualities that steer selection (not style-derived)');
}

// ── T5 · emission honesty for SPORT cohorts ───────────────────────────────────
{
  const run = generatePlan({
    ...answersToProfile(A({ goalType: 'sport', sport: 'run', runDiscipline: 'middle', sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL })),
    plan_start_date: ASOF,
  });
  assert(run.meta.diagnosis && run.meta.diagnosis.sport === 'run', 'T5a runner (D11-steered) still ships meta.diagnosis');

  // WP-48 (Simon's 2026-07-06 direction): the team sports are category-led — their
  // diagnosis STEERS the plan, so displaying it is honest again. The emission gate stays
  // load-bearing: it flips per cohort exactly when the plan follows the diagnosis.
  const hurler = generatePlan({
    ...answersToProfile(A({ goalType: 'sport', sport: 'gaa', experienceLevel: 'intermediate', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: FULL })),
    sport_code: 'hurling', plan_start_date: ASOF,
  });
  const pmHurler = performanceModelForProfile({ ...answersToProfile(A({ goalType: 'sport', sport: 'gaa', experienceLevel: 'intermediate', daysPerWeek: 3, equipment: FULL })), sport_code: 'hurling' }, ASOF);
  assert(pmHurler.priorityAdaptations.length > 0, 'T5b the hurler HAS a real diagnosis (model output)');
  assert(hurler.meta.diagnosis && hurler.meta.diagnosis.priorityQualities.length > 0,
    'T5c …and the category-led plan now DISPLAYS the diagnosis it follows (WP-48)');
}
