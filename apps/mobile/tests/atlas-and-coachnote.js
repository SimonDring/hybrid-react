// tests/atlas-and-coachnote.js
// The home coach-note generator + the Atlas view-model (WP-29: re-based onto the
// Performance Model). The Atlas renders the SAME diagnosis the planner uses:
// its focus must EQUAL the engine's top limiting factor, and every score/reason
// must come from the model — nothing re-derived, no invented benchmarks.
import { buildCoachNote } from '../src/lib/coachNote.js';
import { computeAtlas } from '../src/lib/atlas.js';
import { performanceModelForProfile } from '@performance-os/engine';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const base = { sex: 'male', bodyweight_kg: 75, experience: { gym: 'intermediate' },
  availability: { days_per_week: 4 }, lifts: { squat: 140, bench: 100, deadlift: 180 } };

const sportProfile = (sport, disc, code) => ({ ...base, goal_type: 'sport', sport, run_discipline: disc, sport_code: code || null });
const buildProfile = { ...base, goal_type: 'build', strength_style: 'strength' };
const ASOF = '2026-07-04';

// ---- coach note ----------------------------------------------------------
const cnSport = buildCoachNote(sportProfile('run', 'long'), { phaseTitle: 'Base', weekNum: 1, totalWeeks: 12, isDeload: false });
assert(/Running/.test(cnSport.tag), 'T1 sport coach-note tags the sport');
assert(cnSport.headline && cnSport.body && cnSport.translatesTo, 'T2 sport coach-note has headline + body + translates line');
assert(cnSport.footer === 'Week 1 of 12 · Base', 'T3 sport coach-note footer shows week + block');

const cnBuild = buildCoachNote(buildProfile, { phaseTitle: 'Base', weekNum: 2, totalWeeks: 12 });
assert(cnBuild.tag === 'Strength' && cnBuild.headline === 'Getting you stronger', 'T4 build coach-note uses the strength voice');

const cnDeload = buildCoachNote(sportProfile('swim'), { weekNum: 4, totalWeeks: 12, isDeload: true });
assert(cnDeload.headline === 'Deload week' && /deload/.test(cnDeload.footer), 'T5 deload week reframes the note');

// ---- Atlas: sport athletes render the model's demand + diagnosis ---------
const cases = [
  ['run_middle', sportProfile('run', 'middle')],
  ['run_sprint', sportProfile('run', 'sprint')],
  ['swim', sportProfile('swim')],
  ['hurling', { ...base, goal_type: 'sport', sport: 'gaa', sport_code: 'hurling' }],
];
for (const [key, profile] of cases) {
  const atlas = computeAtlas(profile, ASOF);
  assert(atlas.hasDemand && atlas.pillars.length >= 4, `T6 ${key}: renders the sport's demand profile (${atlas.pillars.length} pillars)`);
  assert(atlas.pillars.every(p => Number.isFinite(p.score) && p.score >= 0 && p.score <= 100
    && Number.isFinite(p.demand) && p.demand >= 0 && p.demand <= 100),
    `T7 ${key}: every pillar has 0–100 score + demand`);
  // THE acceptance (audit WP-29): the Atlas focus IS the engine's top limiting factor.
  const model = performanceModelForProfile(profile, ASOF);
  assert(atlas.focus && atlas.focus.id === model.limitingFactors[0].qualityId,
    `T8 ${key}: focus equals the engine's top limiting factor (${atlas.focus && atlas.focus.id})`);
  assert(atlas.focus.why === model.limitingFactors[0].rationale,
    `T9 ${key}: the focus "why" is the diagnosis's own emitted rationale`);
}

// ---- different sports demand differently ---------------------------------
const sprintIds = computeAtlas(sportProfile('run', 'sprint'), ASOF).pillars.map(p => `${p.id}:${p.demand}`);
const swimIds = computeAtlas(sportProfile('swim'), ASOF).pillars.map(p => `${p.id}:${p.demand}`);
assert(JSON.stringify(sprintIds) !== JSON.stringify(swimIds), 'T10 different sports show different demand shapes');

// ---- build athletes: the GOAL demand ring + an engine-emitted focus (WP-42a) ----
// Build goals now resolve a goal-as-sport demand profile (EDS D2), so the Atlas renders
// capability inside the GOAL's demand ring and the focus is the engine's top limiter —
// nothing invented: the rationale is the diagnosis's own emitted string, same as sport.
const b = computeAtlas(buildProfile, ASOF);
assert(b.hasDemand && b.pillars.length >= 4 && b.pillars.every(p => Number.isFinite(p.demand)),
  'T11 build: goal demand ring rendered (WP-42a)');
const bModel = performanceModelForProfile(buildProfile, ASOF);
assert(b.focus && b.focus.id === bModel.limitingFactors[0].qualityId && b.focus.why === bModel.limitingFactors[0].rationale,
  'T12 build: focus IS the engine\'s top limiter with its own emitted rationale');

// ---- measured lifts sharpen the model ------------------------------------
const noLifts = computeAtlas({ ...buildProfile, lifts: null }, ASOF);
const strong = computeAtlas({ ...buildProfile, lifts: { squat: 200 } }, ASOF);
const msNo = noLifts.pillars.find(p => p.id === 'maxStrength');
const msYes = strong.pillars.find(p => p.id === 'maxStrength');
assert(msYes.source === 'measured' && msYes.score > msNo.score,
  `T13 a tracked squat makes maxStrength MEASURED and higher (${msNo.score}→${msYes.score})`);
assert(noLifts.estimated === true, 'T14 estimation is flagged honestly');

console.log('atlas-and-coachnote tests done');
