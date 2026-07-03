// tests/session-archetypes.js — Sprint 7 headline: the EDS §22 runner vs sprinter come out
// categorically different (same sport, different diagnosis → different session specs).
import { BLANK_ANSWERS, answersToAthleteModelInputs } from '../src/lib/onboardingModel.js';
import { derivePerformanceModel } from '@performance-os/engine/lib/performance/index.js';
import { deriveSessionSpecs, regionOf } from '@performance-os/engine/lib/session/sessionSpecs.js';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

const asOf = '2026-07-02';
const specsFor = (over, sessions, extra = {}) => {
  const a = { ...BLANK_ANSWERS, goalType: 'sport', ...over };
  const pm = derivePerformanceModel(answersToAthleteModelInputs(a, asOf), asOf);
  return { pm, specs: deriveSessionSpecs({ priorityQualities: pm.priorityAdaptations, sessions, ...extra }) };
};

// regionOf maps focus labels to regions.
assert(regionOf('Lower') === 'lower' && regionOf('Upper') === 'upper' && regionOf('Push') === 'upper' && regionOf('Core') === 'core' && regionOf('Full body') === 'full',
  'regionOf maps focus labels to regions');

const twoDays = [{ focus: 'Lower' }, { focus: 'Upper' }];

// In-season distance runner: priority aerobicCapacity → gym-support robustness + reactiveStrength.
const runner = specsFor({ skbSport: 'running_long', experienceLevel: 'intermediate', sportSeason: 'in' }, twoDays, { level: 'intermediate', season: 'in' });
const runnerTargets = new Set(runner.specs.map((s) => s.objective.targetQuality));
assert(runnerTargets.has('robustness') || runnerTargets.has('reactiveStrength'), 'runner targets durability/economy (robustness/reactiveStrength)');
assert(!runnerTargets.has('explosiveStrength') && !runnerTargets.has('hypertrophy'), 'runner does NOT chase power or mass');
// No chest/arm work: the lower session's requirements exclude hpush.
const runnerLower = runner.specs[0].requirements;
assert(!runnerLower.movementPatterns.includes('hpush'), 'runner lower session requires no chest (hpush) pattern');

// Novice sprinter: priority explosiveStrength; on a novice the force-velocity is competency-downgraded.
const sprinter = specsFor({ skbSport: 'running_sprint', experienceLevel: 'beginner', sportSeason: 'off' }, twoDays, { level: 'beginner', season: 'off' });
const sprinterTargets = new Set(sprinter.specs.map((s) => s.objective.targetQuality));
assert(sprinterTargets.has('explosiveStrength'), 'sprinter targets explosive strength');
assert(sprinter.specs.some((s) => s.requirements && s.requirements.competencyNote), 'novice sprinter has a competency note (base first)');
assert(sprinter.specs.every((s) => s.requirements.forceVelocity !== 'ballistic'), 'novice sprinter force-velocity is not left ballistic');

// CATEGORICALLY DIFFERENT: the two share the sport of running but their target-quality sets are disjoint.
const intersection = [...runnerTargets].filter((q) => sprinterTargets.has(q));
assert(intersection.length === 0, 'runner and sprinter target-quality sets are disjoint (categorically different)');

// Build athlete (no diagnosis) falls back to the goal primary — still coherent.
const build = deriveSessionSpecs({ priorityQualities: [], goalPrimary: 'hypertrophy', sessions: twoDays, level: 'intermediate' });
assert(build.every((s) => s.objective.targetQuality === 'hypertrophy'), 'build athlete → goal-primary objective');

// Deterministic.
const again = specsFor({ skbSport: 'running_long', experienceLevel: 'intermediate', sportSeason: 'in' }, twoDays, { level: 'intermediate', season: 'in' });
assert(JSON.stringify(again.specs) === JSON.stringify(runner.specs), 'deterministic');
