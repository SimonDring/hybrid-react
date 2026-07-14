// smoke.test.mjs — Phase 3 M0 T1: the engine-owned suite's first test.
//
// Proves the engine is exercisable WITHOUT booting the app (spec §2.1, closing
// TR-11): imports ONLY the published @performance-os/engine barrel — never
// apps/mobile/src/lib/onboardingModel.js or any other app-side adapter — and
// builds the minimal valid engine-shaped profile by hand (snake_case fields
// PlanGenerator reads directly: goal_type, strength_style, availability, ...).
//
// Non-vacuous: asserts real top-level shape and values (phase/week/session
// counts, meta.validation.pass, provenance versions) — not just truthiness.
// Deterministic: a fixed plan_start_date, no clock/randomness (Art 18).
import { generatePlan } from '@performance-os/engine';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// The minimal valid profile: a 3-day beginner strength build, full equipment
// access, fixed start date. No sport, no injuries, no athlete_model — the
// engine's own defaults carry the rest (resolveProgram/resolvePeriodization
// both accept `profile = {}` and fall back sanely).
const MINIMAL_PROFILE = {
  goal_type: 'build',
  strength_style: 'strength',
  experience_level: 'beginner',
  sex: 'male',
  access: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'],
  availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] },
  plan_start_date: '2026-07-14',
};

const plan = generatePlan(MINIMAL_PROFILE);

// ── top-level shape ──────────────────────────────────────────────────────────
assert(plan && typeof plan === 'object', 'generatePlan returns an object');
assert(Array.isArray(plan.phases) && plan.phases.length > 0, 'plan.phases is a non-empty array');
assert(typeof plan.totalWeeks === 'number' && plan.totalWeeks > 0, 'plan.totalWeeks is a positive number');
assert(plan.totalWeeks === 12, `a beginner 3d/wk strength build resolves a 12-week block (got ${plan.totalWeeks})`);
assert(plan.phases.length === 3, `resolves the standard 3-phase split (base/build/peak) (got ${plan.phases.length})`);

// ── first week's first session is real gym content, not a stub ──────────────
const week1 = plan.phases[0].weeks[0];
assert(week1 && Array.isArray(week1.sessions), 'phase 1 week 1 has a sessions array');
assert(week1.sessions.length === 3, `week 1 has one session per training day (got ${week1.sessions.length})`);
const s0 = week1.sessions[0];
assert(s0 && typeof s0.title === 'string' && s0.title.length > 0, 'session 0 has a non-empty title');
assert(Array.isArray(s0.items) && s0.items.length > 0, 'session 0 has a non-empty items (exercise) list');

// ── D14 validation + provenance are attached, not silently dropped ──────────
assert(plan.meta && typeof plan.meta === 'object', 'plan.meta is present');
assert(plan.meta.validation && plan.meta.validation.pass === true, 'plan.meta.validation.pass is true for a clean minimal profile');
assert(plan.meta.provenance && typeof plan.meta.provenance.engineVersion === 'string', 'plan.meta.provenance.engineVersion is a string');
assert(typeof plan.meta.provenance.knowledgeSetVersion === 'string', 'plan.meta.provenance.knowledgeSetVersion is a string');

// ── purity: same profile, same plan (Art 18 — no clock/randomness inside) ───
const again = generatePlan({ ...MINIMAL_PROFILE });
assert(JSON.stringify(again) === JSON.stringify(plan), 'the same profile yields a byte-identical plan on a second call (purity)');
