// tests/duration.js
// F5: the session duration estimate must reflect the realised work, and the
// internal per-session ceiling must bind so 1–2-day plans don't silently pack
// 90+ min into one session. (Session length is volume-driven now — sessionMinutes
// in the fixtures is ignored; the ceiling is SESSION_CEILING_MIN.)
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { SESSION_CEILING_MIN } from '@performance-os/engine/lib/plan/allocator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const mins = (d) => parseInt(String(d).match(/\d+/)?.[0] || '0', 10);
const firstSession = (a) => generatePlan(answersToProfile(a)).phases[0].weeks[0].sessions[0];

// ── 1-day/week: realised duration must not exceed the per-session ceiling ────
const oneDay = firstSession({ ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength',
  experienceLevel: 'beginner', daysPerWeek: 1, equipment: FULL, sex: 'male', lifts: {} });
assert(mins(oneDay.duration) <= SESSION_CEILING_MIN, `1-day session duration honest & within the ceiling (got ${oneDay.duration}, ${oneDay.items.length} items)`);
assert(oneDay.items.length <= 16, `1-day session no longer crams an absurd number of exercises (got ${oneDay.items.length})`);

// ── normal 4-day session: a sensible, non-trivial estimate ────────────────
const normal = firstSession({ ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength',
  experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, equipment: FULL, sex: 'male', lifts: { squat: 140, bench: 100, deadlift: 180 } });
const d = mins(normal.duration);
assert(d > 0 && d <= 60, `normal 60-min session has a realistic estimate (got ${normal.duration})`);

console.log('duration tests done');
