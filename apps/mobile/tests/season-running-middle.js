// tests/season-running-middle.js — season-phased SKB walking skeleton (Approach A end-to-end).
// running_middle is the first migrated sport: its seasonalModel.programming now drives the plan.
// Property-based (not a byte snapshot — that's the golden-master's job) so it survives tuning.
import { generatePlan, resolveProgram } from '@performance-os/engine';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const mk = (season) => answersToProfile({
  ...BLANK_ANSWERS, goalType: 'sport', skbSport: 'running_middle', sportIntent: 'compete',
  sportSeason: season, experienceLevel: 'intermediate', daysPerWeek: 3, days: ['mon', 'wed', 'fri'],
  equipment: FULL, sex: 'male', lifts: {},
});
const namesOf = (plan) => {
  const n = [];
  for (const ph of plan.phases) for (const wk of (ph.weeks || [])) for (const s of (wk.sessions || wk.days || [])) for (const it of (s.items || [])) n.push((it.name || it.id || '').toString());
  return n;
};
const PULL = /pull|row|lat|face|rotation|pulldown/i;
const PRESS = /bench|press|push-?up|dip|ohp/i;
const PREHAB = /single-leg|split squat|bulgarian|calf|copenhagen|hip|pallof|dead ?bug/i;

// ── OFF-SEASON: rounds the athlete out ──────────────────────────────────────
const off = mk('off_season');
const offProg = resolveProgram(off);
assert(offProg.programming != null, 'T1 off-season reads the SKB programming block');
assert(offProg.emphasis.chest >= 0.9, `T2 off-season emphasis floored (chest ${offProg.emphasis.chest} ≥ 0.9)`);
assert(offProg.programming.roundOutSessionsPerWeek >= 1, 'T3 off-season has a round-out session');
assert(offProg.roundOut.patterns.includes('horizontal_push'), 'T4 round-out targets the runner\'s under-developed push');
const offNames = namesOf(generatePlan(off));
const offPress = offNames.filter((n) => PRESS.test(n)).length;
const offPull = offNames.filter((n) => PULL.test(n)).length;
assert(offPress > 0, `T5 off-season plan contains PRESSING (${offPress}) — the round-out (was structurally impossible)`);
assert(offPull > 0, `T6 off-season plan contains PULLING (${offPull})`);

// ── IN-SEASON: stays sport-specific + prehab, minimal upper ──────────────────
const inS = mk('in_season');
const inProg = resolveProgram(inS);
assert(inProg.emphasis.chest <= 0.6, `T7 in-season emphasis sport-specific (chest ${inProg.emphasis.chest} ≤ 0.6)`);
assert(inProg.programming.roundOutSessionsPerWeek === 0, 'T8 in-season has NO round-out session');
const inNames = namesOf(generatePlan(inS));
const inPress = inNames.filter((n) => PRESS.test(n)).length;
assert(inNames.some((n) => PREHAB.test(n)), 'T9 in-season contains single-leg / calf / prehab work');
assert(inPress <= 2, `T10 in-season pressing kept to a maintenance touch (${inPress} ≤ 2)`);

// ── the ARC: off-season rounds out more than in-season ───────────────────────
assert(offPress > inPress, `T11 off-season presses (${offPress}) > in-season (${inPress}) — the season arc`);
