// tests/wp61-govern-scoring.js — WP-61: scheduling + selection scoring are governed knowledge.
//
// Per the Knowledge Architecture (Art 17), the numbers the D13 scheduler and D11 allocator score
// with are now DATA (data/schedulingPolicy.js, data/selectionScoring.js), not literals in the
// reasoning code — so scheduling/selection POLICY is reviewable, version-tracked knowledge. The
// extraction is byte-identical (the golden-master proves the plans didn't move); this test PINS
// the governed values so an accidental edit is caught, and confirms the engine still schedules.

import { generatePlan } from '@performance-os/engine';
import { SCHEDULING_PENALTIES } from '@performance-os/engine/data/schedulingPolicy.js';
import { SELECTION_SCORING } from '@performance-os/engine/data/selectionScoring.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

let pass = 0;
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else pass++; }

// ── the governed values reproduce the previous inline literals EXACTLY ───────
assert(SCHEDULING_PENALTIES.sportProximity.onDay === 3 && SCHEDULING_PENALTIES.sportProximity.adjacent === 2,
  'scheduler sport-proximity penalties = 3 / 2');
assert(SCHEDULING_PENALTIES.adjacent.sameMusclePerGroup === 14 && SCHEDULING_PENALTIES.adjacent.hardHard === 10 && SCHEDULING_PENALTIES.adjacent.highAxialHighAxial === 9,
  'scheduler adjacent penalties = 14 / 10 / 9');
assert(SCHEDULING_PENALTIES.twoApart.sameMusclePerGroup === 3 && SCHEDULING_PENALTIES.twoApart.hardHard === 2,
  'scheduler two-apart penalties = 3 / 2');
assert(SELECTION_SCORING.repeatPatternMult === 0.6 && SELECTION_SCORING.axialPreferredMult === 1.35 && SELECTION_SCORING.crossSessionRepeatBase === 0.82,
  'allocator scoring multipliers = 0.6 / 1.35 / 0.82');
assert(SELECTION_SCORING.openCompound.primary === 1.2 && SELECTION_SCORING.openCompound.other === 0.85 && SELECTION_SCORING.posturePullLean === 1.05,
  'allocator open-compound / posture = 1.2 / 0.85 / 1.05');
assert(SELECTION_SCORING.focusFloor === 0.4 && SELECTION_SCORING.focusSpan === 0.6 && SELECTION_SCORING.rotationJitter === 0.01,
  'allocator focus / jitter = 0.4 + 0.6 / 0.01');

// ── the engine still schedules a coherent week (sanity) ──────────────────────
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const plan = generatePlan(answersToProfile({ ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength', experienceLevel: 'advanced', daysPerWeek: 5, days: ['mon', 'tue', 'wed', 'fri', 'sat'], equipment: FULL, sex: 'male', lifts: { squat: 180, bench: 130, deadlift: 230 } }));
const gymSessions = (plan.phases[0].weeks[0].sessions || []).filter((s) => (s.items || []).length);
assert(gymSessions.length > 0, `the plan still schedules gym sessions (${gymSessions.length})`);

console.log(process.exitCode ? 'wp61-govern-scoring FAILURES' : `PASS: wp61-govern-scoring — ${pass} assertions`);
