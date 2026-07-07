// tests/session-density.js — session length is volume-driven.
//  • At the OPTIMAL day count, every session is substantial (no trivial 8-set,
//    15-min sessions like the old MEV-start model produced) and none blows past
//    the internal ~75-min ceiling.
//  • BELOW optimal, sessions are CAPPED at the ceiling (honest under-dose), not
//    crammed into 100-min+ monster sessions.
// Substance is measured in WORKING SETS, not wall-clock minutes — antagonist
// supersetting legitimately compresses a 18-set session into ~30 min.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { suggestOptimalFrequency } from '@performance-os/engine/lib/plan/frequency.js';
import { SESSION_CEILING_MIN } from '@performance-os/engine/lib/plan/allocator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const mins = (s) => { const m = /~(\d+)/.exec(s.duration || ''); return m ? Number(m[1]) : 0; };
const workSets = (s) => (s.items || []).filter(i => i.tag !== 'mobility')
  .reduce((a, i) => { const m = /(\d+)\s*[×x]/.exec(i.sets || ''); return a + (m ? Number(m[1]) : 0); }, 0);
const buildWeek = (plan) => plan.phases.flatMap(p => p.weeks).find(w => !w.deload && !w.taper && w.sessions.length);

const profile = answersToProfile({ ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced', equipment: FULL });
const days = (n) => generatePlan({ ...profile, availability: { ...profile.availability, days_per_week: n } });

// --- at optimal days: substantial sessions, ceiling respected ---
const opt = suggestOptimalFrequency(profile).optimalDays;
const optWeek = buildWeek(days(opt));
const optSets = optWeek.sessions.map(workSets);
const optMins = optWeek.sessions.map(mins);
// WP-49 flip (build→discipline): the hypertrophy discipline is DIAGNOSIS-FIRST and compound-led —
// sessions carry ~9-12 working sets (3-4 exercises) rather than the old volume-first crammed count.
// They're still substantial (no trivial 8-set sessions), so recalibrate the floor from 12→9.
assert(optSets.every(v => v >= 9), `advanced hypertrophy sessions substantial at optimum, all >=9 working sets (got ${optSets.join(', ')})`);
assert(optMins.every(d => d <= SESSION_CEILING_MIN + 5), `no session past the ~75-min ceiling at optimum (got ${optMins.join(', ')})`);

// --- below optimal (2 days): still substantial + capped, NOT crammed into monster sessions ---
const lowWeek = buildWeek(days(2));
const lowMins = lowWeek.sessions.map(mins);
const lowSets = lowWeek.sessions.map(workSets);
assert(lowMins.every(d => d <= SESSION_CEILING_MIN + 5), `below-optimal sessions are capped at the ceiling, not monster sessions (got ${lowMins.join(', ')})`);
// WP-49 flip: the diagnosis-first discipline does NOT cram undelivered volume into longer sessions —
// it accepts an honest under-dose (fewer days = less weekly volume) rather than 55-min+ monster days.
// The intent (sessions stay substantial below optimum) now asserts working-set substance, not minutes.
assert(lowSets.every(v => v >= 9), `below-optimal sessions stay substantial, all >=9 working sets (got ${lowSets.join(', ')})`);

console.log('session-density done');
