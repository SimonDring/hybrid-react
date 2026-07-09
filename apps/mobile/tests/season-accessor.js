// tests/season-accessor.js — season-phased SKB: the phase→programming accessor.
import { phaseProgrammingFor, programmingForPhase, PHASE_MAP }
  from '@performance-os/engine/lib/sportKnowledge/seasonProgramming.js';
function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

// programmingForPhase is the pure helper — test it with a hand-built SKB profile.
const fakeProfile = {
  seasonalModel: {
    offSeason: { programming: { muscleEmphasis: { chest: 0.9 }, roundOut: { mode: 'derive', dose: 'develop' } } },
    competition: { programming: { muscleEmphasis: { chest: 0.55 }, roundOut: { mode: 'derive', dose: 'maintain' } } },
    // preSeason intentionally has no programming block
    preSeason: { primaryObjective: 'x' },
  },
};
assert(programmingForPhase(fakeProfile, 'off').roundOut.dose === 'develop', 'T1 off → offSeason.programming');
assert(programmingForPhase(fakeProfile, 'in').muscleEmphasis.chest === 0.55, 'T2 in → competition.programming');
assert(programmingForPhase(fakeProfile, 'pre') === null, 'T3 pre with no block → null (scaffold)');
assert(programmingForPhase({}, 'off') === null, 'T4 no seasonalModel → null (never throws)');
assert(PHASE_MAP.off === 'offSeason' && PHASE_MAP.in === 'competition' && PHASE_MAP.transition === 'recovery', 'T5 phase map');

// phaseProgrammingFor over the REAL registry: a MIGRATED sport returns its block; an
// un-migrated one returns null (the byte-identical guard — null → legacy fallback).
assert(phaseProgrammingFor({ goal_type: 'sport', sport: 'run', run_discipline: 'middle', sport_season: 'off' }) != null,
  'T6a real registry: running_middle IS migrated → block (Approach A wired)');
// All 11 SKB sports are now season-phased (retire-legacy P3); the null case is a sport with NO
// SKB profile (an unknown sport → generic fallback), which must never throw.
assert(phaseProgrammingFor({ goal_type: 'sport', sport: 'kabaddi', sport_code: 'kabaddi', sport_season: 'off' }) === null,
  'T6b unknown sport (no SKB profile) → null (generic fallback, never throws)');
assert(phaseProgrammingFor({ goal_type: 'build' }) === null, 'T7 build goal → null (never throws)');
