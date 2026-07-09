// tests/season-roundout.js — season-phased SKB: the sport-derived round-out target logic.
import { deriveRoundOutTargets } from '@performance-os/engine/lib/plan/roundOutTargets.js';
function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

// Runner off-season vector: upper de-emphasised → round-out should add push + pull.
const runner = { quads: 1.15, hamstrings: 1.3, glutes: 1.25, calves: 1.25, core: 1.2, back: 1.0, shoulders: 0.85, chest: 0.6, biceps: 0.7, triceps: 0.7 };
const rt = deriveRoundOutTargets(runner, { mode: 'derive' });
assert(rt.muscles.includes('chest') && rt.muscles.includes('shoulders'), 'T1 runner under-develops chest/shoulders');
assert(rt.patterns.includes('horizontal_push'), 'T2 runner round-out → horizontal_push');
assert(rt.patterns.includes('vertical_push') && rt.patterns.includes('horizontal_pull'), 'T3 runner round-out → v-push + h-pull');
assert(!rt.patterns.includes('squat'), 'T4 runner round-out does NOT add legs (already emphasised)');

// Swimmer vector: legs de-emphasised → round-out should add lower (squat/hinge/calf).
const swimmer = { back: 1.3, shoulders: 1.25, chest: 1.0, quads: 0.7, hamstrings: 0.7, glutes: 0.7, calves: 0.5, core: 1.2 };
const st = deriveRoundOutTargets(swimmer, { mode: 'derive' });
assert(st.muscles.includes('quads') && st.muscles.includes('calves'), 'T5 swimmer under-develops legs');
assert(st.patterns.includes('squat') && st.patterns.includes('hinge') && st.patterns.includes('calf'), 'T6 swimmer round-out → squat/hinge/calf');
assert(!st.patterns.includes('horizontal_push'), 'T7 swimmer round-out does NOT add push (already emphasised)');

// Explicit override.
const ex = deriveRoundOutTargets(runner, { mode: 'explicit', targetPatterns: ['carry'], targetMuscles: ['core'] });
assert(ex.patterns.length === 1 && ex.patterns[0] === 'carry' && ex.muscles[0] === 'core', 'T8 explicit override honoured verbatim');

// Neutral / balanced vector → no round-out targets.
const neutral = deriveRoundOutTargets({ chest: 1.0, back: 1.0, quads: 1.0 }, { mode: 'derive' });
assert(neutral.muscles.length === 0 && neutral.patterns.length === 0, 'T9 balanced vector → empty targets');

// Determinism.
const a = deriveRoundOutTargets(runner, { mode: 'derive' });
assert(JSON.stringify(a) === JSON.stringify(rt), 'T10 deterministic');
