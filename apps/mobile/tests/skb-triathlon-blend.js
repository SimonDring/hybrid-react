// tests/skb-triathlon-blend.js — SKB audit 08 T1.
//
// Before the fix, onboarding bound triathlon → engineSport 'run' with NO triathlon
// gym-support module, so a triathlete was programmed as a middle-distance runner:
// chest 0.55, pressing demoted, a lower-body-only priority list → a spine-heavy plan
// (trap-bar deadlift most days) with zero upper body, ignoring the SWIM entirely.
//
// This test pins the intent of the fix: a triathlete's plan must serve the swim
// (upper-body PULL + shoulder-health prehab) and a moderate PRESS for balance, and
// must NOT stack the spine in every session. It is deliberately property-based (not a
// byte snapshot — that's the golden-master's job) so it survives allocator tuning.
import { generatePlan, resolveProgram } from '@performance-os/engine';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

const profile = answersToProfile({
  ...BLANK_ANSWERS, goalType: 'sport', skbSport: 'triathlon',
  sportIntent: 'recreational', sportGoal: 'build_base',
  experienceLevel: 'intermediate', daysPerWeek: 3, days: ['mon', 'wed', 'fri'],
  equipment: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'],
  sex: 'male', lifts: {}, sportDays: ['tue', 'sat'],
});

// T1 — the athlete resolves to its OWN module, not the runner template.
const prog = resolveProgram(profile);
assert(prog.sport === 'triathlon', 'T1 profile resolves to the triathlon module (not run)');
assert(prog.emphasis.chest >= 0.7, `T2 chest emphasis rounded up for balance (got ${prog.emphasis.chest}, runner was 0.55)`);
assert(prog.emphasis.back >= 1.0, `T3 back emphasis prioritised for the swim pull (got ${prog.emphasis.back})`);

// Collect every exercise name across the whole plan.
const plan = generatePlan(profile);
const names = [];
for (const phase of plan.phases) for (const wk of (phase.weeks || [])) {
  for (const s of (wk.sessions || wk.days || [])) for (const it of (s.items || s.exercises || [])) {
    names.push((it.name || it.exercise || it.id || '').toString());
  }
}
const PULL = /pull|row|lat|face|rotation|straight-arm|pulldown|y-raise|t-raise/i;
const PRESS = /bench|press|push-?up|dip|ohp|overhead/i;

assert(names.length > 0, 'T4 plan produced exercises');
assert(names.some(n => PULL.test(n)), 'T5 plan contains upper-body PULL work (swim propulsion + shoulder balance)');
assert(names.some(n => PRESS.test(n)), 'T6 plan contains PRESS work (antagonist balance; was structurally impossible when bound to run)');

// T7 — not spine-stacked: the heavy axial lifts must NOT appear in EVERY session.
const SPINE = /trap-bar|deadlift|back squat|barbell row/i;
let sessions = 0, spineSessions = 0;
for (const phase of plan.phases) for (const wk of (phase.weeks || [])) {
  for (const s of (wk.sessions || wk.days || [])) {
    sessions++;
    const its = (s.items || s.exercises || []).map(it => (it.name || it.exercise || it.id || '').toString());
    if (its.some(n => SPINE.test(n))) spineSessions++;
  }
}
assert(sessions > 0 && spineSessions < sessions, `T7 spine loading not in every session (${spineSessions}/${sessions})`);
