// tests/session-objective.js — Sprint 7 D9: per-session objective from the diagnosis.
import { gymTrainableTargets, assignTargetQualities, deriveSessionObjective } from '@performance-os/engine/lib/session/sessionObjective.js';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

// Cardio priority translates to gym-support qualities; gym-trainable passes through.
assert(JSON.stringify(gymTrainableTargets([{ qualityId: 'aerobicCapacity' }], null)) === JSON.stringify(['robustness', 'reactiveStrength']),
  'aerobicCapacity priority → [robustness, reactiveStrength]');
assert(JSON.stringify(gymTrainableTargets([{ qualityId: 'explosiveStrength' }], null)) === JSON.stringify(['explosiveStrength']),
  'explosiveStrength priority → [explosiveStrength]');
// Build athlete (empty diagnosis) → goalPrimary.
assert(JSON.stringify(gymTrainableTargets([], 'hypertrophy')) === JSON.stringify(['hypertrophy']), 'empty priorities → [goalPrimary]');
assert(JSON.stringify(gymTrainableTargets([], null)) === JSON.stringify(['maxStrength']), 'empty + no goal → [maxStrength] fallback');

// Sprint 8 fix: mobility/stability are NOT session drivers — translated to a loadable strength cousin.
assert(JSON.stringify(gymTrainableTargets([{ qualityId: 'mobility' }], null)) === JSON.stringify(['robustness']), 'mobility priority → robustness (never an all-mobility session)');
assert(JSON.stringify(gymTrainableTargets([{ qualityId: 'stability' }], null)) === JSON.stringify(['robustness']), 'stability priority → robustness');
assert(JSON.stringify(gymTrainableTargets([{ qualityId: 'maxStrength' }], null)) === JSON.stringify(['maxStrength']), 'a strength quality still passes through');

// Round-robin assignment across sessions.
const a = assignTargetQualities([{ qualityId: 'aerobicCapacity' }], 4, null); // → [robustness,reactiveStrength]
assert(a.length === 4 && a[0] === 'robustness' && a[1] === 'reactiveStrength' && a[2] === 'robustness', 'round-robin across 4 sessions');

// deriveSessionObjective — all four fields present.
const o = deriveSessionObjective({ targetQuality: 'maxStrength', region: 'lower', phaseIntent: 'build', deload: false, taper: false, season: null });
assert(o.purpose && /max strength/i.test(o.purpose) && /lower/i.test(o.purpose), 'purpose names the quality + region');
assert(o.targetQuality === 'maxStrength', 'targetQuality echoed');
assert(typeof o.intensityZone === 'string' && o.intensityZone.length, 'intensityZone present');
assert(o.fatigueBudget && ['low', 'moderate', 'high'].includes(o.fatigueBudget.level), 'fatigueBudget has a level');
assert(typeof o.rationale === 'string' && o.rationale.length, 'rationale present');

// In-season sport → "maintain, minimal fatigue" + a reduced fatigue budget.
const hi = deriveSessionObjective({ targetQuality: 'maxStrength', region: 'lower', phaseIntent: 'base', deload: false, taper: false, season: null });
const inS = deriveSessionObjective({ targetQuality: 'maxStrength', region: 'lower', phaseIntent: 'base', deload: false, taper: false, season: 'in' });
assert(/maintain/i.test(inS.purpose) && /minimal fatigue/i.test(inS.purpose), 'in-season purpose = maintain, minimal fatigue');
const rank = { low: 0, moderate: 1, high: 2 };
assert(rank[inS.fatigueBudget.level] <= rank[hi.fatigueBudget.level], 'in-season fatigue budget is not higher');

// Deterministic.
assert(JSON.stringify(deriveSessionObjective({ targetQuality: 'robustness', region: 'lower', phaseIntent: 'base' }))
     === JSON.stringify(deriveSessionObjective({ targetQuality: 'robustness', region: 'lower', phaseIntent: 'base' })), 'deterministic');
