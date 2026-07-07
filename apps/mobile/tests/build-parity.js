// tests/build-parity.js — Sprint 8: the BUILD archetypes must stay byte-identical through the D11
// re-seat (which only touches the SPORT path). Captured before Task 4; must never drift after.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const SNAP = join(__dir, '__snapshots__', 'build-parity.json');
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const DB = ['dumbbell', 'bodyweight']; const BW = ['bodyweight'];
const A = (o) => ({ ...BLANK_ANSWERS, ...o });

// The 9 BUILD archetypes from the golden master (must never change under the sport re-seat).
const MATRIX = {
  'build·strength·beginner·3d·45·full': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'beginner', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'build·strength·intermediate·4d·60·full': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: { squat: 140, bench: 100, deadlift: 180 } }),
  'build·strength·advanced·5d·75·full': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'advanced', daysPerWeek: 5, days: ['mon', 'tue', 'wed', 'fri', 'sat'], equipment: FULL, sex: 'male', lifts: { squat: 180, bench: 130, deadlift: 230, ohp: 80 } }),
  'build·strength·intermediate·1d·60·full(edge)': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', daysPerWeek: 1, days: ['wed'], equipment: FULL, sex: 'male', lifts: {} }),
  'build·bodybuilding·intermediate·4d·60·full': A({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'build·bodybuilding·advanced·6d·75·full': A({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced', daysPerWeek: 6, days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], equipment: FULL, sex: 'female', lifts: {} }),
  'build·functional·intermediate·3d·45·dumbbell': A({ goalType: 'build', strengthStyle: 'functional', experienceLevel: 'intermediate', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: DB, sex: 'male', lifts: {} }),
  'build·functional·beginner·3d·20·bodyweight(edge)': A({ goalType: 'build', strengthStyle: 'functional', experienceLevel: 'beginner', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: BW, sex: 'male', lifts: {} }),
  'build·functional·advanced·7d·60·bodyweight(edge)': A({ goalType: 'build', strengthStyle: 'functional', experienceLevel: 'advanced', daysPerWeek: 7, days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], equipment: BW, sex: 'male', lifts: {} }),
};

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }
const stable = (v) => JSON.stringify((function s(x) { return Array.isArray(x) ? x.map(s) : x && typeof x === 'object' ? Object.keys(x).sort().reduce((o, k) => (o[k] = s(x[k]), o), {}) : x; })(v), null, 2);
// This gate tests plan CONTENT parity, not the knowledge STAMP: the knowledgeSetVersion embedded in
// every plan's meta.provenance legitimately bumps on any knowledge change (e.g. a discipline-gated
// data addition that leaves these legacy plans byte-identical), and must not false-fail this gate.
const normalise = (plan) => { const c = JSON.parse(JSON.stringify(plan)); if (c?.meta?.provenance) c.meta.provenance.knowledgeSetVersion = 'X'; return c; };

const current = {}; for (const [k, a] of Object.entries(MATRIX)) current[k] = normalise(generatePlan(answersToProfile(a)));
if (!existsSync(SNAP) || process.env.UPDATE) {
  if (!existsSync(dirname(SNAP))) mkdirSync(dirname(SNAP), { recursive: true });
  writeFileSync(SNAP, stable(current) + '\n');
  console.log(`CAPTURED build-parity snapshot: ${Object.keys(current).length} archetypes`);
} else {
  const snap = JSON.parse(readFileSync(SNAP, 'utf8'));
  for (const k of Object.keys(MATRIX)) assert(stable(current[k]) === stable(snap[k]), `build archetype unchanged: ${k}`);
}
console.log('build-parity done');
