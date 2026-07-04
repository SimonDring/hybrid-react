// tests/validation-mrv.js — WP-11: the validator suite exists and the MRV ceiling
// holds independently of the constructor (Constitution Art 19: construction and
// validation are separate powers).
//
// 1. Every week of every live archetype passes the MRV validator — the allocator's
//    in-loop ceiling leaves ZERO residual violations (the validator is a real,
//    non-vacuous independent floor, proven by the synthetic case below).
// 2. A synthetic over-MRV week yields a 'trim' finding with a recorded reason.
// 3. Art 13 capping: a validator whose knowledge is low-confidence ('reported')
//    cannot act — its findings cap to 'pass' (observe-only).

import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { validateWeek, VALIDATORS } from '@performance-os/engine/lib/validation/contract.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const BASE = {
  plan_start_date: '2026-07-06', experience: { gym: 'intermediate' },
  availability: { days_per_week: 4, days: ['monday', 'tuesday', 'thursday', 'friday'] },
  access: FULL, sex: 'male', bodyweight_kg: 80
};
const ARCHETYPES = {
  'build·bodybuilding': { ...BASE, goal_type: 'build', strength_style: 'bodybuilding' },
  'build·strength': { ...BASE, goal_type: 'build', strength_style: 'strength' },
  'build·functional·beginner': { ...BASE, goal_type: 'build', strength_style: 'functional', experience: { gym: 'beginner' } },
  'sport·run·long': { ...BASE, goal_type: 'sport', sport: 'run', run_discipline: 'long', sport_intent: 'recreational' },
  'sport·cycle': { ...BASE, goal_type: 'sport', sport: 'cycle', sport_intent: 'compete', sport_season: 'in' },
  'sport·swim': { ...BASE, goal_type: 'sport', sport: 'swim', sport_intent: 'recreational' },
  'build·advanced·6d': { ...BASE, goal_type: 'build', strength_style: 'bodybuilding', experience: { gym: 'advanced' }, availability: { days_per_week: 6, days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] } }
};

// ── 1. Live plans: zero residual MRV violations, every week ─────────────────
for (const [label, profile] of Object.entries(ARCHETYPES)) {
  const plan = generatePlan(profile);
  let weeks = 0, bad = [];
  for (const phase of plan.phases) {
    for (const week of phase.weeks) {
      weeks++;
      const report = validateWeek(week);
      if (!report.pass) bad.push(`wk${week.num}: ${report.findings.filter(f => f.verdict !== 'pass').map(f => f.reason).join('; ')}`);
    }
  }
  assert(bad.length === 0, `${label}: all ${weeks} weeks pass the MRV validator${bad.length ? ` — ${bad[0]}` : ''}`);
}

// ── 2. Synthetic over-MRV week → trim finding, recorded reason ───────────────
// One registry-matched exercise, absurd volume (30 weekly bench sets ≫ chest MRV).
// NB: names must match the muscle registry's name patterns — 'Incline dumbbell
// press' / 'Cable fly' silently miss it (the V12 name-join fragility, on display).
const overWeek = {
  sessions: [{
    discipline: 'gym', title: 'Monday · Chest bomb',
    items: [{ name: 'Bench press', sets: '30 × 8', rpe: 'RPE 8' }]
  }]
};
const overReport = validateWeek(overWeek);
const trim = overReport.findings.find((f) => f.validatorId === 'volume.mrv-ceiling' && f.verdict === 'trim' && f.detail?.muscle === 'chest');
assert(!overReport.pass && !!trim, 'synthetic over-MRV week fails validation with a chest trim finding');
assert(trim && /chest: .+ exceeds .+\(MRV \d+\) — trim [\d.]+ sets/.test(trim.reason), `the trim carries a plain-English reason (${trim && trim.reason})`);
assert(trim && trim.authority === 'soft' && trim.confidence === 'moderate',
  'MRV verdict class derives from its knowledge authority (moderate → soft → trim, never veto)');

// ── 3. Art 13 capping: reported-authority knowledge cannot act ───────────────
const spy = {
  id: 'test.reported-cannot-act',
  knowledgeId: 'load.acwr.policy',   // confidence 'low' → authority 'reported'
  run: () => [{ verdict: 'veto', reason: 'attempted veto from contested science' }]
};
VALIDATORS.push(spy);
try {
  const capped = validateWeek({ sessions: [] });
  const f = capped.findings.find((x) => x.validatorId === spy.id);
  assert(f && f.verdict === 'pass' && f.authority === 'reported',
    `a reported-authority validator's veto is capped to observe-only (got ${f && f.verdict})`);
} finally {
  VALIDATORS.splice(VALIDATORS.indexOf(spy), 1);
}

// Report shape sanity.
const shape = validateWeek({ sessions: [] });
assert(shape.pass === true && shape.counts.pass >= 1 && Array.isArray(shape.findings), 'empty week: clean report shape');
