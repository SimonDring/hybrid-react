// tests/skb-run-default.js — the discipline-less runner default (deliberate coaching
// change, 2026-07-04). A runner profile WITHOUT run_discipline used to map to the
// nonexistent SKB id 'running' — no demand profile, no D4/D5 diagnosis, silent fall
// back to the legacy volume-first path. Now every SKB lookup resolves through ONE
// derivation (sportKnowledge skbSportIdFor): no-discipline run → running_middle, the
// generic runner prior. Stated disciplines are always respected.
//
// Scope proof: the golden-master archetypes all state a discipline, so this flip moves
// ZERO golden keys (asserted by golden-master.js staying byte-identical in the suite).

import assert from 'node:assert';
import { generatePlan } from '@performance-os/engine';
import { skbSportIdFor, get as skbGet } from '@performance-os/engine/lib/sportKnowledge/index.js';
import { evaluateRules } from '@performance-os/engine/lib/sportKnowledge/rules.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

let pass = 0;
function ok(cond, msg) { assert(cond, msg); pass++; console.log('PASS:', msg); }

// ── the single derivation ────────────────────────────────────────────────────
ok(skbSportIdFor('run', undefined) === 'running_middle', "no-discipline run → running_middle (the generic prior)");
ok(skbSportIdFor('run', 'sprint') === 'running_sprint'
  && skbSportIdFor('run', 'long') === 'running_long', 'stated disciplines are respected');
ok(skbSportIdFor('swim') === 'swimming' && skbSportIdFor('cycle') === 'cycling', 'alias sports unchanged');
ok(skbGet(skbSportIdFor('run', undefined)) != null, 'the default resolves to a REAL SKB profile');

// ── the cohort flip: a discipline-less runner is diagnosis-first now ─────────
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const answers = {
  ...BLANK_ANSWERS, goalType: 'sport', sport: 'run', sportSeason: 'off',
  experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 45,
  days: ['mon', 'wed', 'fri'], strengthAccess: 'full_gym', equipment: FULL,
};
const plan = generatePlan(answersToProfile(answers));
ok(plan.meta.diagnosis && plan.meta.diagnosis.sport === 'run',
  'discipline-less runner gets a D4→D5 diagnosis');
const sessions = plan.phases.flatMap((p) => p.weeks.flatMap((w) => w.sessions));
ok(sessions.length > 0 && sessions.every((s) => s._objective),
  `every session carries the D9 objective (${sessions.length} sessions)`);

// The default matches the explicit middle-distance plan exactly — same prior, same plan.
const explicit = generatePlan(answersToProfile({ ...answers, runDiscipline: 'middle' }));
ok(JSON.stringify(plan) === JSON.stringify(explicit),
  'defaulted plan is byte-identical to the explicit runDiscipline:middle plan');

// ── reflow rules ─────────────────────────────────────────────────────────────
// The lookup finds the runner's real profile (it found NOTHING before — the old
// 'running' alias pointed nowhere), and since the SKB review structured the
// endurance decisionRules (2026-07-04), a runner's rules now FIRE at reflow:
// low readiness → autoregulate one step, exactly as running_middle prescribes.
const eff = evaluateRules({ sport: 'run' }, { readiness: 10 });
ok(eff.effects.some((e) => e.ruleId === 'low_readiness_autoregulate' && e.type === 'reduce_one_step'),
  "a low-readiness runner fires running_middle's autoregulate rule at reflow");
const swimEff = evaluateRules({ sport: 'swim' }, {});
ok(Array.isArray(swimEff.effects), 'swim lookup (structured rules) still resolves');

console.log(`\n${pass} skb-run-default checks passed.`);
