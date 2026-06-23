// tests/duration.js
// F5: the session duration estimate must reflect the realised work, and the time
// budget must bind so 1–2-day plans don't silently pack 90 min into "~60 min".
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const mins = (d) => parseInt(String(d).match(/\d+/)?.[0] || '0', 10);
const firstSession = (a) => generatePlan(answersToProfile(a)).phases[0].weeks[0].sessions[0];

// ── 1-day/week: realised duration must not exceed the requested length ────
const oneDay = firstSession({ ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength',
  experienceLevel: 'beginner', daysPerWeek: 1, sessionMinutes: 60, equipment: FULL, sex: 'male', lifts: {} });
assert(mins(oneDay.duration) <= 60, `1-day session duration honest & within budget (got ${oneDay.duration}, ${oneDay.items.length} items)`);
assert(oneDay.items.length <= 12, `1-day session no longer crams >12 exercises (got ${oneDay.items.length})`);

// ── normal 4-day session: a sensible, non-trivial estimate ────────────────
const normal = firstSession({ ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength',
  experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, equipment: FULL, sex: 'male', lifts: { squat: 140, bench: 100, deadlift: 180 } });
const d = mins(normal.duration);
assert(d > 0 && d <= 60, `normal 60-min session has a realistic estimate (got ${normal.duration})`);

console.log('duration tests done');
