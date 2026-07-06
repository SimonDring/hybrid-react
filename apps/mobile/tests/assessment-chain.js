// apps/mobile/tests/assessment-chain.js — WP-38: the stored Athlete Model reaches the live
// diagnosis (38a), per-lift strength standards (38b), sport-experience priors (38c).
// Spec: docs/superpowers/specs/2026-07-06-wp38-assessment-chain-design.md
import { profileToAthleteModel } from '@performance-os/engine/lib/adapters/profileToAthleteModel.js';
import { estimateCapability, bandForModel } from '@performance-os/engine/lib/performance/estimation.js';
import { performanceModelForProfile } from '@performance-os/engine/lib/performance/forProfile.js';
import { answersToAthleteModelInputs, answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const ASOF = '2026-07-01';
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const near = (a, b, eps = 0.005) => Math.abs(a - b) <= eps;

// ---------- 38a · the adapter threads the stored model ----------

// T1 — no stored model → adapter output unchanged (nulls, as today).
{
  const m = profileToAthleteModel({ goal_type: 'build', experience: { gym: 'intermediate' } }, ASOF);
  assert(m.sportingContext.position == null, 'T1a no stored model → position null');
  assert(m.trainingHistory.resistanceTrainingYears == null, 'T1b no stored model → years null');
}

// T2 — stored model fields reach the adapted model.
{
  const p = {
    goal_type: 'sport', sport: 'gaa', sport_code: 'field_hockey', experience: { gym: 'intermediate' },
    athlete_model: {
      sportingContext: { position: 'Defender' },
      trainingHistory: { resistanceTrainingYears: 6, sportYears: 12 },
    },
  };
  const m = profileToAthleteModel(p, ASOF);
  assert(m.sportingContext.position === 'Defender', 'T2a stored position threads through the adapter');
  assert(m.trainingHistory.resistanceTrainingYears === 6, 'T2b stored resistance years thread through');
  assert(m.trainingHistory.sportYears === 12, 'T2c stored sport years thread through');
  assert(bandForModel(m) === 'highlyAdvanced', 'T2d years-derived band overrides the self-rating');
}

// T3 — position refinement (D3) is live end-to-end: Defender boosts maxStrength demand to the floor.
{
  const base = { goal_type: 'sport', sport: 'gaa', sport_code: 'field_hockey', experience: { gym: 'intermediate' } };
  const noPos = performanceModelForProfile(base, ASOF);
  const withPos = performanceModelForProfile({ ...base, athlete_model: { sportingContext: { position: 'Defender' } } }, ASOF);
  const imp = (pm) => (pm.demandProfile.find((d) => d.qualityId === 'maxStrength') || {}).importance;
  assert(near(imp(noPos), 0.7), 'T3a base field-hockey maxStrength demand 0.7');
  assert(near(imp(withPos), 0.9), 'T3b Defender position boosts maxStrength demand to the 0.9 floor');
}

// ---------- 38b · per-lift strength standards ----------

// T4 — a bench-only athlete is scored against the BENCH standard, not the squat standard.
{
  const m = { identity: { biologicalSex: 'male', bodyMassKg: 82 },
              performanceMetrics: [{ metric: '1rm_bench', value: 100, unit: 'kg' }] };
  const c = estimateCapability('maxStrength', m, ASOF);
  assert(c.source === 'measured', 'T4a bench-only → still a measured estimate');
  assert(near(c.level, 100 / 82 / 1.5, 0.01), `T4b bench scored on the bench standard (got ${c.level.toFixed(3)})`);
}

// T5 — pull-up REPS are not a load metric; alone they never drive maxStrength.
{
  const m = { identity: { biologicalSex: 'male', bodyMassKg: 80 },
              performanceMetrics: [{ metric: '1rm_pull', value: 12, unit: 'reps' }] };
  const c = estimateCapability('maxStrength', m, ASOF);
  assert(c.source === 'inferred', 'T5 pull-reps only → inferred prior, not a bogus measured 0.08');
}

// T6 — multiple lifts → mean of per-lift levels (overall demonstrated strength).
{
  const m = { identity: { biologicalSex: 'male', bodyMassKg: 80 },
              performanceMetrics: [{ metric: '1rm_squat', value: 140, unit: 'kg' },
                                   { metric: '1rm_bench', value: 100, unit: 'kg' }] };
  const c = estimateCapability('maxStrength', m, ASOF);
  const expected = ((140 / 80 / 2.0) + (100 / 80 / 1.5)) / 2;
  assert(near(c.level, expected), `T6 multi-lift → mean of per-lift levels (got ${c.level.toFixed(3)}, want ${expected.toFixed(3)})`);
}

// ---------- 38a · measuredAt stamping + carry ----------

// T7 — onboarding stamps measuredAt = asOf on reported 1RMs.
{
  const model = answersToAthleteModelInputs(A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', equipment: ['barbell'], lifts: { squat: 140, bench: '', deadlift: '', ohp: '', pull: '' } }), ASOF);
  const sq = (model.performanceMetrics || []).find((x) => x.metric === '1rm_squat');
  assert(sq && sq.measuredAt === ASOF, 'T7 onboarding metrics carry measuredAt = asOf');
}

// T8 — the adapter carries a stored metric's measuredAt only when the value still matches.
{
  const base = { goal_type: 'build', experience: { gym: 'intermediate' }, lifts: { squat: 140 } };
  const stored = { performanceMetrics: [{ metric: '1rm_squat', value: 140, measuredAt: '2026-06-25' }] };
  const match = profileToAthleteModel({ ...base, athlete_model: stored }, ASOF);
  assert(match.performanceMetrics.find((x) => x.metric === '1rm_squat').measuredAt === '2026-06-25',
    'T8a value match → measuredAt carried');
  const changed = profileToAthleteModel({ ...base, lifts: { squat: 150 }, athlete_model: stored }, ASOF);
  assert(changed.performanceMetrics.find((x) => x.metric === '1rm_squat').measuredAt == null,
    'T8b value changed → measuredAt honestly dropped');
}

// T9 — recency confidence pin: a fresh measurement reads high. (Regression pin — already true
// when measuredAt is present; T7/T8 make it reachable in production.)
{
  const m = { identity: { biologicalSex: 'male', bodyMassKg: 80 },
              performanceMetrics: [{ metric: '1rm_squat', value: 160, unit: 'kg', measuredAt: '2026-06-25' }] };
  assert(estimateCapability('maxStrength', m, ASOF).confidence === 'high', 'T9 fresh measurement → high confidence');
}

// ---------- 38c · sport-experience priors ----------

// T10 — a lifelong runner is no longer diagnosed aerobically novice.
{
  const profile = answersToProfile(A({ goalType: 'sport', sport: 'run', runDiscipline: 'middle', sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: ['barbell', 'dumbbell', 'bodyweight'] }));
  const before = performanceModelForProfile(profile, ASOF);
  const after = performanceModelForProfile({ ...profile, athlete_model: { trainingHistory: { sportYears: 15 } } }, ASOF);
  const aero = (pm) => pm.capabilities.find((c) => c.qualityId === 'aerobicCapacity');
  assert(near(aero(before).level, 0.5), 'T10a without sport years the gym-band prior applies (0.50)');
  assert(aero(after).level >= 0.85, `T10b 15 sport years → aerobic prior reflects the sport (got ${aero(after).level})`);
  assert(/sport-experience/.test(aero(after).evidence), 'T10c the prior declares itself in the evidence');
  assert(aero(after).confidence === 'low', 'T10d still a prior → confidence stays low');
  assert(after.limitingFactors[0] && after.limitingFactors[0].qualityId !== 'aerobicCapacity',
    'T10e the top limiter is no longer the sport\'s own dominant engine');
}

// T11 — the sport prior only lifts the sport's DOMINANT qualities; unrelated ones keep the gym prior.
{
  const profile = answersToProfile(A({ goalType: 'sport', sport: 'run', runDiscipline: 'middle', sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: ['barbell'] }));
  const pm = performanceModelForProfile({ ...profile, athlete_model: { trainingHistory: { sportYears: 15 } } }, ASOF);
  const hyp = pm.capabilities.find((c) => c.qualityId === 'hypertrophy');
  assert(near(hyp.level, 0.5), 'T11 hypertrophy (not a running demand) keeps the gym-band prior');
}
