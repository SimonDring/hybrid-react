// tests/atlas-and-coachnote.js
// The home coach-note generator + the Atlas pillar engine. Verifies the educator
// summary reads the right goal, and that every shipped sport produces its OWN
// pillar set with valid scores and a focus — without throwing.
import { buildCoachNote } from '../src/lib/coachNote.js';
import { computePillars } from '../src/lib/atlas/pillars.js';
import { sportConfigFor } from '../src/lib/atlas/sportConfig.js';
import { strength } from '../src/lib/atlas/signals.js';

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
const sportsToTest = [
  sportProfile('run', 'sprint'), sportProfile('run', 'middle'), sportProfile('run', 'long'),
  sportProfile('cycle'), sportProfile('swim'),
  { ...base, goal_type: 'sport', sport: 'gaelic_football' },
  { ...base, goal_type: 'sport', sport: 'hurling' },
  buildProfile
];

for (const profile of sportsToTest) {
  const cfg = sportConfigFor(profile);
  const res = computePillars(profile, data);
  assert(res.sport === cfg.key, `T6 ${cfg.key}: resolves to its own sport config`);
  const ids = res.pillars.map(p => p.id);
  assert(ids.length === cfg.pillars.length && cfg.pillars.every(id => ids.includes(id)),
    `T7 ${cfg.key}: pillar set matches config (${ids.join(',')})`);
  assert(res.pillars.every(p => Number.isFinite(p.score) && p.score >= 0 && p.score <= 100),
    `T8 ${cfg.key}: every pillar scores 0–100`);
  assert(res.focus && typeof res.focus.why === 'string', `T9 ${cfg.key}: has a focus with a why`);
  assert(res.estimated === true, `T10 ${cfg.key}: benchmarks flagged estimated`);
}

// ---- pillars are sport-specific, not generic ----------------------------
const sprint = computePillars(sportProfile('run', 'sprint'), data).pillars.map(p => p.id);
const swim = computePillars(sportProfile('swim'), data).pillars.map(p => p.id);
const long = computePillars(sportProfile('run', 'long'), data).pillars.map(p => p.id);
assert(sprint.includes('explosive') && sprint.includes('speed_strength'), 'T11 sprint leads with power/speed pillars');
assert(swim.includes('upper_pull') && swim.includes('shoulder_health'), 'T12 swim has its upper-body pillars');
assert(long.includes('aerobic') && long.includes('durability'), 'T13 distance running leads with aerobic + durability');
assert(JSON.stringify(sprint) !== JSON.stringify(swim), 'T14 different sports get different pillar sets');

// ---- pull + OHP translate into the sport's capability pillars ------------
// A swimmer's most sport-critical pillars (upper-body pull + shoulder health) were
// ESTIMATES until pull/OHP were tracked — back/biceps had no lift. Tracking them makes
// those pillars REAL, driven by the athlete's actual pulling/overhead strength.
const swimBig3 = { ...base, goal_type: 'sport', sport: 'swim', lifts: { squat: 140, bench: 100, deadlift: 180 } };
const swimFive = { ...swimBig3, lifts: { ...swimBig3.lifts, ohp: 70, pull: 130 } };
const upNo = computePillars(swimBig3, data).pillars.find(p => p.id === 'upper_pull').score;
const upYes = computePillars(swimFive, data).pillars.find(p => p.id === 'upper_pull').score;
assert(upYes > upNo + 10, `T15 tracking pull makes a swimmer's upper_pull pillar real & higher (${upNo}→${upYes})`);
const shNo = computePillars(swimBig3, data).pillars.find(p => p.id === 'shoulder_health').score;
const shYes = computePillars(swimFive, data).pillars.find(p => p.id === 'shoulder_health').score;
assert(shYes > shNo, `T16 tracking OHP lifts a swimmer's shoulder_health pillar (${shNo}→${shYes})`);

// ---- the overall strength score is RELATIVE TO THE SPORT ------------------
// Same lifts, different sport → the score weights the lifts that matter for that sport.
const upperDominant = { ...base, bodyweight_kg: 75, sex: 'male', lifts: { squat: 60, deadlift: 80, bench: 120, ohp: 80, pull: 130 } };
const lowerDominant = { ...base, bodyweight_kg: 75, sex: 'male', lifts: { squat: 200, deadlift: 250, bench: 50, ohp: 30, pull: 50 } };
const asSwim = (p) => strength({ ...p, goal_type: 'sport', sport: 'swim' });
const asSprint = (p) => strength({ ...p, goal_type: 'sport', sport: 'run', run_discipline: 'sprint' });
assert(asSwim(upperDominant) > asSprint(upperDominant), 'T17 upper-dominant athlete scores higher as a swimmer (upper lifts weighted)');
assert(asSprint(lowerDominant) > asSwim(lowerDominant), 'T18 lower-dominant athlete scores higher as a sprinter (leg lifts weighted)');
assert(strength({ ...base, sex: 'male', bodyweight_kg: 75, lifts: { ohp: 60, pull: 90 } }) != null, 'T19 strength counts ohp/pull even without the big-3');
