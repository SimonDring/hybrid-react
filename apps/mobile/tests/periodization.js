// tests/periodization.js
import { resolvePeriodization, deriveSeason, continueBlock } from '@performance-os/engine/lib/plan/periodization.js';
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── deriveSeason ───────────────────────────────────────────────────────────
// today = 2026-06-12 (from memory context — tests are written relative to this)
// Dates chosen to be unambiguous regardless of when tests run:

const FAR_OUT  = new Date(); FAR_OUT.setMonth(FAR_OUT.getMonth() + 8);  // ~8 months out → 'off'
const PRE_RACE = new Date(); PRE_RACE.setDate(PRE_RACE.getDate() + 60); // 60 days out → 'pre'
const CLOSE    = new Date(); CLOSE.setDate(CLOSE.getDate() + 28);       // 28 days out → 'in'
const PAST     = new Date(); PAST.setDate(PAST.getDate() - 5);          // 5 days ago → 'transition'

function dateStr(d) { return d.toISOString().slice(0, 10); }

assert(deriveSeason({ sport: 'run', event_date: dateStr(FAR_OUT) }) === 'off',
  'T1 event 8 months out → off');
assert(deriveSeason({ sport: 'run', event_date: dateStr(PRE_RACE) }) === 'pre',
  'T2 event 60 days out → pre');
assert(deriveSeason({ sport: 'run', event_date: dateStr(CLOSE) }) === 'in',
  'T3 event 28 days out → in');
assert(deriveSeason({ sport: 'run', event_date: dateStr(PAST) }) === 'transition',
  'T4 past event → transition');

// sport_intent fallback (no event_date)
assert(deriveSeason({ sport: 'run', sport_intent: 'compete' }) === 'in',
  'T5 intent=compete + no date → in');
assert(deriveSeason({ sport: 'run', sport_intent: 'recreational' }) === 'off',
  'T6 intent=recreational → off');
assert(deriveSeason({ sport: 'run', sport_intent: 'build_base' }) === 'off',
  'T7 intent=build_base → off');
assert(deriveSeason({ sport: null }) === null,
  'T8 no sport → null');

// ── resolvePeriodization ───────────────────────────────────────────────────
// Each profile type returns the evidence-based block length.
function totalWeeks(p) { return resolvePeriodization(p).totalWeeks; }

assert(totalWeeks({ strength_style: 'bodybuilding' }) === 6,
  'T9 bodybuilding → 6-week mesocycle');
assert(totalWeeks({ strength_style: 'strength' }) === 12,
  'T10 strength → 12-week block');
assert(totalWeeks({ strength_style: 'functional' }) === 8,
  'T11 functional → 8-week block');
assert(totalWeeks({ goal_type: 'sport', sport: 'run', sport_intent: 'build_base' }) === 12,
  'T12 sport off-season → 12-week block');
assert(totalWeeks({ goal_type: 'sport', sport: 'run', sport_intent: 'compete' }) === 4,
  'T13 sport in-season → 4-week rolling block');
assert(totalWeeks({ goal_type: 'sport', sport: 'run', event_date: dateStr(PRE_RACE) }) === 6,
  'T14 sport pre-season (60 days out) → 6-week pre-season block');
assert(totalWeeks({ goal_type: 'sport', sport: 'run', event_date: dateStr(PAST) }) === 4,
  'T15 sport transition → 4-week recovery block');

// All blocks have at least one phase
const allProfiles = [
  { strength_style: 'bodybuilding' }, { strength_style: 'strength' },
  { strength_style: 'functional' },
  { goal_type: 'sport', sport: 'run', sport_intent: 'build_base' },
  { goal_type: 'sport', sport: 'run', sport_intent: 'compete' }
];
for (const p of allProfiles) {
  const { split } = resolvePeriodization(p);
  assert(Array.isArray(split) && split.length >= 1, `T16 resolvePeriodization(${JSON.stringify(p)}) has split`);
  const sum = split.reduce((a, b) => a + b.weeks, 0);
  assert(sum === resolvePeriodization(p).totalWeeks, `T16b split weeks sum to totalWeeks for ${JSON.stringify(p)}`);
}

// ── continueBlock ──────────────────────────────────────────────────────────
const baseProfile = {
  strength_style: 'strength', goal_type: 'build',
  plan_start_date: '2026-03-01', plan_weeks: 12,
  block_history: []
};

// Normal progress → next block, history appended
const normal = continueBlock(baseProfile, { feel: 'just_right', changed: false, sameGoal: true, hitSessions: true });
assert(normal.progress === true, 'T17 normal → progress:true');
assert(Array.isArray(normal.profilePatch.block_history) && normal.profilePatch.block_history.length === 1,
  'T18 normal → block_history has 1 entry');
assert(typeof normal.profilePatch.plan_start_date === 'string',
  'T19 normal → new plan_start_date set');
assert(typeof normal.profilePatch.plan_weeks === 'number',
  'T20 normal → plan_weeks set');

// Struggling → repeat same block
const hard = continueBlock(baseProfile, { feel: 'too_hard', changed: false, sameGoal: true, hitSessions: false });
assert(hard.repeat === true, 'T21 too_hard + missed sessions → repeat:true');
assert(hard.profilePatch.plan_weeks === baseProfile.plan_weeks, 'T22 repeat → same plan_weeks');

// Goal changed → recalibrate (re-onboard)
const changed = continueBlock(baseProfile, { feel: 'just_right', changed: false, sameGoal: false, hitSessions: true });
assert(changed.recalibrate === true, 'T23 goal changed → recalibrate:true');

// Injury/life change → bridge block
const injured = continueBlock(baseProfile, { feel: 'hard', changed: true, sameGoal: true, hitSessions: false });
assert(injured.bridge === true, 'T24 life changed → bridge:true');

// ── generatePlan uses resolvePeriodization ─────────────────────────────────
const strengthProfile = {
  goal_type: 'build', strength_style: 'strength', plan_start_date: '2026-06-12',
  experience: { gym: 'intermediate' }, availability: { days_per_week: 3, session_minutes: 60 },
  access: ['full_gym'], onboarded: true
};
const plan = generatePlan(strengthProfile);
const allWeeks = plan.phases.flatMap(ph => ph.weeks);
assert(allWeeks.length === 12, `T25 strength plan has 12 weeks (got ${allWeeks.length})`);

const bbProfile = { ...strengthProfile, strength_style: 'bodybuilding' };
const bbPlan = generatePlan(bbProfile);
const bbWeeks = bbPlan.phases.flatMap(ph => ph.weeks);
assert(bbWeeks.length === 6, `T26 bodybuilding plan has 6 weeks (got ${bbWeeks.length})`);
