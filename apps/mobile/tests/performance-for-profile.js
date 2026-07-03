// tests/performance-for-profile.js — Sprint 8: derive the Performance Model from a LEGACY profile
// (the diagnosis path for the live plan + the golden master). profileToAthleteModel infers the SKB id.
import { BLANK_ANSWERS, answersToProfile } from '../src/lib/onboardingModel.js';
import { performanceModelForProfile } from '@performance-os/engine/lib/performance/forProfile.js';
import { performanceModelForProfile as barrel } from '@performance-os/engine';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

const asOf = '2026-07-03';
const profFor = (over) => answersToProfile({ ...BLANK_ANSWERS, ...over });
const prioIds = (pm) => (pm.priorityAdaptations || []).map((p) => p.qualityId);

// A legacy sport profile yields a real diagnosis.
const runner = performanceModelForProfile(profFor({ goalType: 'sport', sport: 'run', runDiscipline: 'long', sportSeason: 'in', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], strengthAccess: 'full_gym' }), asOf);
assert(prioIds(runner).includes('aerobicCapacity'), 'legacy distance runner → aerobicCapacity priority');

const sprinter = performanceModelForProfile(profFor({ goalType: 'sport', sport: 'run', runDiscipline: 'sprint', sportSeason: 'off', experienceLevel: 'beginner', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], strengthAccess: 'full_gym' }), asOf);
assert(prioIds(sprinter).includes('explosiveStrength'), 'legacy sprinter → explosiveStrength priority');

// A build profile has no diagnosis (so the allocator keeps its legacy path).
const build = performanceModelForProfile(profFor({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], strengthAccess: 'full_gym' }), asOf);
assert((build.priorityAdaptations || []).length === 0, 'build profile → empty priorityAdaptations');

// Deterministic + barrel parity + null-safe.
assert(JSON.stringify(performanceModelForProfile(profFor({ goalType: 'sport', sport: 'swim' }), asOf)) === JSON.stringify(barrel(profFor({ goalType: 'sport', sport: 'swim' }), asOf)), 'barrel export matches + deterministic');
assert(performanceModelForProfile(null, asOf) && (performanceModelForProfile(null, asOf).priorityAdaptations || []).length === 0, 'null profile → safe empty model');
