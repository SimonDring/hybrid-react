// tests/engine-rest-and-rep.js
import { resolveProgram } from '../src/lib/strength/program.js';
import { weeklyMuscleTargets } from '../src/lib/strength/targets.js';
import { allocateGym } from '../src/lib/plan/allocator.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── T1: resolveProgram returns style:'sport' for sport athletes ────────────
const prog = resolveProgram({ goal_type: 'sport', sport: 'run', sport_season: 'off',
  experience: { gym: 'intermediate' } });
assert(prog.style === 'sport', "T1 resolveProgram sport → style:'sport'");

// ── T2: weeklyMuscleTargets handles 'sport' style without crashing ─────────
const targets = weeklyMuscleTargets({
  style: 'sport', weekInPhase: 1, phaseWeeks: 4, level: 'intermediate',
  emphasis: prog.emphasis, volumeScalar: prog.volumeScalar
});
assert(typeof targets === 'object' && targets.quads > 0,
  'T2 weeklyMuscleTargets handles sport style');

// ── T3: sport base scheme uses 3×5 on primaries ───────────────────────────
const sportSessions = allocateGym({
  targets,
  slots: [{ minutes: 60, equip: ['full_gym'] }],
  ctx: { style: 'sport', intent: 'base', deload: false, weekNum: 1,
         level: 'intermediate', access: ['full_gym'] }
});
const sportPrimaries = sportSessions[0].items.filter(it => it.restSec >= 120);
assert(sportPrimaries.length >= 1, 'T3a sport session has at least one primary');
assert(sportPrimaries.some(it => /3\s*[×x]\s*5/.test(it.sets)),
  'T3b sport base primary uses 3×5');

// ── T4: every item has a positive restSec ─────────────────────────────────
const allItems = sportSessions.flatMap(s => s.items);
assert(allItems.length > 0, 'T4a session has items');
assert(allItems.every(it => typeof it.restSec === 'number' && it.restSec > 0),
  'T4b every item has restSec > 0');

// ── T5: primary restSec is 180 (strength/sport) or 120 (functional/bb) ────
const primItems = allItems.filter(it => it.restSec >= 120);
assert(primItems.every(it => it.restSec === 180 || it.restSec === 120),
  'T5 primary restSec is 180 or 120');
assert(sportPrimaries.every(it => it.restSec === 180),
  'T5b sport primaries have restSec 180');

// ── T6: no session has more than 2 primaries (restSec >= 120) ─────────────
const longSessions = allocateGym({
  targets: weeklyMuscleTargets({ style: 'strength', weekInPhase: 2, phaseWeeks: 4,
    level: 'intermediate' }),
  slots: [{ minutes: 90, equip: ['full_gym'] }, { minutes: 90, equip: ['full_gym'] }],
  ctx: { style: 'strength', intent: 'build', deload: false, weekNum: 2,
         level: 'intermediate', access: ['full_gym'] }
});
const maxPrimaries = Math.max(...longSessions.map(s =>
  s.items.filter(it => it.restSec >= 120).length));
assert(maxPrimaries <= 2, `T6 no session has >2 primaries (got ${maxPrimaries})`);

// ── T7: superset B items get restSec 20 ───────────────────────────────────
const paired = allItems.filter(it => it.superset);
const bItems = paired.filter(it => it.num.endsWith('2'));
if (bItems.length > 0) {
  assert(bItems.every(it => it.restSec === 20),
    `T7 superset B items have restSec 20 (checked ${bItems.length} items)`);
} else {
  console.log('SKIP T7: no superset B items in this session');
}

console.log('\nAll tests done.');
