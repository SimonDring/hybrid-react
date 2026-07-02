// tests/movement-requirements.js — Sprint 7 D10: movement/quality requirements, contraindications up front.
import { deriveMovementRequirements, contraindicatedPatternsFrom } from '@performance-os/engine/lib/session/movementRequirements.js';
import { getContraindications } from '@performance-os/engine/lib/injury/injuryRules.js';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

// Base requirement for max strength on a lower day — region intersect keeps lower patterns.
const base = deriveMovementRequirements({ targetQuality: 'maxStrength', region: 'lower', level: 'intermediate', contraindicatedPatterns: new Set() });
assert(base.movementPatterns.every((p) => ['squat', 'hinge', 'lunge', 'calf'].includes(p)), 'lower region → only lower patterns');
assert(base.forceVelocity === 'maximal-force', 'max strength → maximal-force');
assert(base.contraindicated.length === 0 && base.competencyNote === null, 'no injury/competency → nothing removed');

// Injury contraindication removed up front, with a reason.
const kneeBlocked = getContraindications('knee', 4, 'protect').blockedPatterns;
const kneePatterns = contraindicatedPatternsFrom(kneeBlocked);
assert(kneePatterns.has('squat') && kneePatterns.has('lunge') && kneePatterns.has('hinge'), 'knee injury → squat/lunge/hinge contraindicated');
const injured = deriveMovementRequirements({ targetQuality: 'maxStrength', region: 'lower', level: 'intermediate', contraindicatedPatterns: kneePatterns });
assert(!injured.movementPatterns.includes('squat'), 'knee injury removes the squat requirement');
assert(injured.contraindicated.some((c) => c.pattern === 'squat' && c.reason === 'injury'), 'removal recorded with reason:injury');

// Novice + high-skill force-velocity → downgraded to maximal-force, with a competency note.
const novice = deriveMovementRequirements({ targetQuality: 'explosiveStrength', region: 'lower', level: 'beginner', contraindicatedPatterns: new Set() });
assert(novice.forceVelocity === 'maximal-force', 'novice explosive → force-velocity downgraded to maximal-force');
assert(novice.competencyNote && /base/i.test(novice.competencyNote), 'competency note explains base-first');
// An advanced athlete keeps the high-skill force-velocity.
const adv = deriveMovementRequirements({ targetQuality: 'explosiveStrength', region: 'lower', level: 'advanced', contraindicatedPatterns: new Set() });
assert(adv.forceVelocity === 'strength-speed' && adv.competencyNote === null, 'advanced explosive keeps strength-speed');

assert(deriveMovementRequirements({ targetQuality: 'not_a_quality', region: 'full', level: 'intermediate', contraindicatedPatterns: new Set() }) === null, 'unknown quality → null');

// Deterministic.
assert(JSON.stringify(deriveMovementRequirements({ targetQuality: 'robustness', region: 'lower', level: 'intermediate', contraindicatedPatterns: new Set() }))
     === JSON.stringify(deriveMovementRequirements({ targetQuality: 'robustness', region: 'lower', level: 'intermediate', contraindicatedPatterns: new Set() })), 'deterministic');
