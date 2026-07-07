// tests/explainability-emission.js — WP-30a: the engine SHIPS its reasons.
// D11 sport sessions carry the D9 objective (quality + purpose + the full rationale
// string, including any injury re-target / category-coverage notes); the plan meta
// carries the D4→D5 diagnosis chain. Build (legacy path) has no diagnosis — the keys
// must be ABSENT, never invented (Constitution: explanations are emitted reasons only).

import assert from 'node:assert';
import { generatePlan } from '@performance-os/engine';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

let pass = 0;
function ok(cond, msg) { assert(cond, msg); pass++; console.log('PASS:', msg); }

// ── a D11 sport plan (runner) ────────────────────────────────────────────────
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const runner = generatePlan(answersToProfile({
  ...BLANK_ANSWERS, goalType: 'sport', sport: 'run', runDiscipline: 'middle',
  sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 3, equipment: FULL,
}));

// meta.diagnosis: the D4→D5 chain, with real rationale strings.
ok(runner.meta.diagnosis && runner.meta.diagnosis.sport === 'run', 'runner plan meta carries diagnosis (sport=run)');
ok(runner.meta.diagnosis.priorityQualities.length > 0
  && runner.meta.diagnosis.priorityQualities.every((p) => p.qualityId && typeof p.rationale === 'string' && p.rationale.length > 0),
  'diagnosis.priorityQualities each carry a rationale');
ok(runner.meta.diagnosis.limitingFactors.length > 0
  && runner.meta.diagnosis.limitingFactors.every((f) => f.qualityId && typeof f.rationale === 'string'),
  'diagnosis.limitingFactors each carry a rationale');

// session._objective on the D11 gym sessions.
const gym = runner.phases.flatMap((p) => p.weeks.flatMap((w) => w.sessions));
const withObj = gym.filter((s) => s._objective);
ok(withObj.length === gym.length && gym.length > 0, `every D11 session carries _objective (${withObj.length}/${gym.length})`);
ok(withObj.every((s) => s._objective.quality && s._objective.purpose && /targeting .+; .+; fatigue budget/.test(s._objective.rationale)),
  '_objective = { quality, purpose, rationale } with the D9 rationale shape');

// ── a build plan (WP-49 T6 — THE FLIP: build runs off the diagnosis engine now) ──
// Build is diagnosis-STEERED post-flip: meta carries the D4→D5 diagnosis and every session's
// objective is diagnosis-derived (a target quality + honest rationale), exactly like the runner.
const build = generatePlan(answersToProfile({ ...BLANK_ANSWERS, goalType: 'stronger', daysPerWeek: 3, equipment: FULL }));
ok('diagnosis' in build.meta && build.meta.diagnosis.priorityQualities.length > 0,
  'build plan meta NOW carries a real diagnosis (the flip: build is diagnosis-steered)');
const buildSessions = build.phases.flatMap((p) => p.weeks.flatMap((w) => w.sessions));
ok(buildSessions.every((s) => s._objective && s._objective.source !== 'style' && s._objective.quality && s._objective.rationale),
  'build sessions carry a diagnosis-derived _objective (a target quality + rationale)');

console.log(`\n${pass} explainability-emission checks passed.`);
