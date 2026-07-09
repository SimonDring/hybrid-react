// tests/season-pattern-map.js — season-phased SKB: the friendly-vocabulary ↔ catalogue bridge.
import { MOVEMENT_POLICY_TOKENS, PATTERN_FOR_MUSCLE, expandPolicyToken, exerciseMatchesToken }
  from '@performance-os/engine/data/movementPatternMap.js';
function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

assert(PATTERN_FOR_MUSCLE.chest.includes('horizontal_push'), 'T1 chest → horizontal_push');
assert(PATTERN_FOR_MUSCLE.back.includes('vertical_pull') && PATTERN_FOR_MUSCLE.back.includes('horizontal_pull'), 'T2 back → v+h pull');
assert(PATTERN_FOR_MUSCLE.quads.includes('squat'), 'T3 quads → squat');
assert(PATTERN_FOR_MUSCLE.hamstrings.includes('hinge') && PATTERN_FOR_MUSCLE.glutes.includes('hinge'), 'T4 ham/glutes → hinge');
assert(PATTERN_FOR_MUSCLE.calves.includes('calf'), 'T5 calves → calf');

assert(expandPolicyToken('horizontal_push').patterns.includes('hpush'), 'T6 horizontal_push → catalogue hpush');
assert(expandPolicyToken('single_leg').patterns.includes('lunge'), 'T7 single_leg → lunge');
assert(expandPolicyToken('bilateral_spinal_loading').flag === 'axialLoad', 'T8 bilateral_spinal_loading → axialLoad flag');
assert(expandPolicyToken('nonsense').patterns.length === 0, 'T9 unknown token → no patterns (never throws)');

assert(exerciseMatchesToken({ pattern: 'hpush' }, 'horizontal_push'), 'T10 bench matches horizontal_push');
assert(exerciseMatchesToken({ pattern: 'squat', axialLoad: 1 }, 'bilateral_spinal_loading'), 'T11 axial squat matches bilateral_spinal_loading');
assert(!exerciseMatchesToken({ pattern: 'calf' }, 'horizontal_push'), 'T12 calf does not match horizontal_push');

assert(MOVEMENT_POLICY_TOKENS.has('horizontal_push') && MOVEMENT_POLICY_TOKENS.has('single_leg'), 'T13 token set populated');
