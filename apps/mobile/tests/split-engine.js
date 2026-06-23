// tests/split-engine.js
// The gym engine must produce CURATED, differentiated sessions — not four
// near-identical "full body" days — and must DELIVER its weekly volume target
// (the old greedy fill under-delivered, leaving ~20-min sessions). It must respect
// the MEV→MAV ramp (no overshoot — see volume-tracking.js), so a longer session is
// a ceiling, not a quota; what "more time" buys is the ability to fit the target a
// short session can't (time-capping).
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
import { volumeReport } from '@performance-os/engine/lib/plan/volume.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const week1 = (a) => generatePlan(answersToProfile({ ...BLANK_ANSWERS, sex: 'male', equipment: FULL, ...a })).phases[0].weeks[0];
const focusOf = (s) => (s.title || '').split(' · ').slice(1).join(' · ');
const exKey = (s) => s.items.filter(it => !it.substituted && it.tag !== 'mobility').map(it => it.name).sort().join('|');
const delivered = (wk) => volumeReport(wk.sessions).rows.reduce((a, r) => a + r.sets, 0);

// ── S1: a 4-day build plan is a real upper/lower split, not identical days ────
const build4 = week1({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate',
  daysPerWeek: 4, sessionMinutes: 60, lifts: { squat: 140, bench: 100, deadlift: 180 } });
assert(new Set(build4.sessions.map(exKey)).size >= 3,
  `S1a 4-day build days are differentiated (distinct=${new Set(build4.sessions.map(exKey)).size}/4)`);
const f4 = build4.sessions.map(focusOf);
assert(f4.some(f => /Lower/.test(f)) && f4.some(f => /Upper|push|pull/i.test(f)),
  `S1b 4-day build shows distinct upper & lower days (got: ${f4.join(' | ')})`);

// ── S2: a 6-day build plan is push/pull/legs, each region twice ──────────────
const build6 = week1({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced',
  daysPerWeek: 6, sessionMinutes: 60, lifts: {} });
assert(new Set(build6.sessions.map(exKey)).size >= 4,
  `S2 6-day build days are differentiated (distinct=${new Set(build6.sessions.map(exKey)).size}/6)`);

// ── S3: the engine delivers its target — short sessions time-cap below long ──
// (under-delivery used to make even a roomy plan thin; a 20-min day can't fit what
// a 60-min day can, so total work must be strictly greater at 60 min.)
const swim = (m) => week1({ goalType: 'sport', sport: 'swim', sportIntent: 'recreational',
  experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: m, lifts: {} });
assert(delivered(swim(60)) > delivered(swim(20)),
  `S3 more session time fits more of the target (60→${delivered(swim(60)).toFixed(0)} sets, 20→${delivered(swim(20)).toFixed(0)} sets)`);

// ── S4: swim days are differentiated (varied work, not clones) ──────────────
const swim45 = swim(45);
assert(new Set(swim45.sessions.map(exKey)).size >= 3,
  `S4 swim 4×45 days are differentiated (distinct=${new Set(swim45.sessions.map(exKey)).size}/4)`);

console.log('split-engine tests done');
