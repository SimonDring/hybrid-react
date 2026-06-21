// tests/atlas-and-coachnote.js
// The home coach-note generator + the Atlas pillar engine. Verifies the educator
// summary reads the right goal, and that every shipped sport produces its OWN
// pillar set with valid scores and a focus — without throwing.
import { buildCoachNote } from '../src/lib/coachNote.js';
import { computePillars } from '../src/lib/atlas/pillars.js';
import { SPORTS } from '../src/data/sports/index.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const base = { sex: 'male', bodyweight_kg: 75, experience: { gym: 'intermediate' },
  availability: { days_per_week: 4 }, lifts: { squat: 140, bench: 100, deadlift: 180 } };

const sportProfile = (sport, disc) => ({ ...base, goal_type: 'sport', sport, run_discipline: disc });
const buildProfile = { ...base, goal_type: 'build', strength_style: 'strength' };

const data = { sessions: {}, logs: [], dailyMetrics: [], load: { chronic: 90 }, currentWeek: 2 };

// ---- coach note ----------------------------------------------------------
const cnSport = buildCoachNote(sportProfile('run', 'long'), { phaseTitle: 'Base', weekNum: 1, totalWeeks: 12, isDeload: false });
assert(/Running/.test(cnSport.tag), 'T1 sport coach-note tags the sport');
assert(cnSport.headline && cnSport.body && cnSport.translatesTo, 'T2 sport coach-note has headline + body + translates line');
assert(cnSport.footer === 'Week 1 of 12 · Base', 'T3 sport coach-note footer shows week + block');

const cnBuild = buildCoachNote(buildProfile, { phaseTitle: 'Base', weekNum: 2, totalWeeks: 12 });
assert(cnBuild.tag === 'Strength' && cnBuild.headline === 'Getting you stronger', 'T4 build coach-note uses the strength voice');

const cnDeload = buildCoachNote(sportProfile('swim'), { weekNum: 4, totalWeeks: 12, isDeload: true });
assert(cnDeload.headline === 'Deload week' && /deload/.test(cnDeload.footer), 'T5 deload week reframes the note');

// ---- pillars: every shipped sport ---------------------------------------
const cases = [
  ['run_sprint', sportProfile('run', 'sprint')],
  ['run_middle', sportProfile('run', 'middle')],
  ['run_long', sportProfile('run', 'long')],
  ['cycle', sportProfile('cycle')],
  ['swim', sportProfile('swim')],
  ['build', buildProfile]
];

for (const [key, profile] of cases) {
  const res = computePillars(profile, data);
  assert(res.sport === key, `T6 ${key}: resolves to its own sport config`);
  const ids = res.pillars.map(p => p.id);
  assert(ids.length === SPORTS[key].pillars.length && SPORTS[key].pillars.every(id => ids.includes(id)),
    `T7 ${key}: pillar set matches the registry (${ids.join(',')})`);
  assert(res.pillars.every(p => Number.isFinite(p.score) && p.score >= 0 && p.score <= 100),
    `T8 ${key}: every pillar scores 0–100`);
  assert(res.focus && typeof res.focus.why === 'string', `T9 ${key}: has a focus with a why`);
  assert(res.estimated === true, `T10 ${key}: benchmarks flagged estimated`);
}

// ---- pillars are sport-specific, not generic ----------------------------
const sprint = computePillars(sportProfile('run', 'sprint'), data).pillars.map(p => p.id);
const swim = computePillars(sportProfile('swim'), data).pillars.map(p => p.id);
const long = computePillars(sportProfile('run', 'long'), data).pillars.map(p => p.id);
assert(sprint.includes('explosive') && sprint.includes('speed_strength'), 'T11 sprint leads with power/speed pillars');
assert(swim.includes('upper_pull') && swim.includes('shoulder_health'), 'T12 swim has its upper-body pillars');
assert(long.includes('aerobic') && long.includes('durability'), 'T13 distance running leads with aerobic + durability');
assert(JSON.stringify(sprint) !== JSON.stringify(swim), 'T14 different sports get different pillar sets');
