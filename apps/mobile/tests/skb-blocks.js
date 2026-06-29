import { SEASONS, DEFAULT_SEASON_VOLUME, SPORT_BLOCKS, validateGymProgramming }
  from '@performance-os/engine/lib/sportKnowledge/blocks.js';
function assert(c, m){ if(!c){ console.error('FAIL:', m); process.exitCode=1; } else console.log('PASS:', m); }

assert(SEASONS.join(',') === 'off,pre,in,transition', 'SEASONS in order');
assert(SPORT_BLOCKS.off.totalWeeks === 12, 'off block is 12 weeks');
assert(DEFAULT_SEASON_VOLUME.in === 0.6, 'in-season volume 0.6');

const good = { emphasis:{ glutes:1.2 }, priorityExercises:['back_squat'], power:true,
  seasonModifiers: DEFAULT_SEASON_VOLUME, periodization: SPORT_BLOCKS };
assert(validateGymProgramming(good).length === 0, 'valid gymProgramming passes');
assert(validateGymProgramming({}).length > 0, 'empty gymProgramming fails');
assert(validateGymProgramming({ ...good, emphasis:{ foot: 1.2 } }).length > 0,
  'non-engine muscle key rejected');
assert(validateGymProgramming({ ...good, byDiscipline:{ sprint:{ emphasis:{ foot: 1.5 } } } }).length > 0,
  'byDiscipline emphasis rejects non-engine muscle');
console.log('skb-blocks tests done');
