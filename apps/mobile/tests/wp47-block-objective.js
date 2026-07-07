// tests/wp47-block-objective.js — WP-47 · D7 Block Objective (ADVISORY v0).
//
// deriveBlockObjective turns the D5 diagnosis (priority limiters) + season into an
// inspectable BlockPlan. v0 is ADVISORY: it is emitted into meta.diagnosis.blockPlan and
// steers NOTHING — the actual blocks are still resolvePeriodization's. These tests pin the
// object shape, the explainability floor, the deferred-limiter sequencing, and — crucially
// — that it changes no plan (build stays byte-identical; sport merely GAINS the field).
// Design: docs/architecture/D7-BLOCK-OBJECTIVE-SPEC.md.

import { deriveBlockObjective, generatePlan } from '@performance-os/engine';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

let pass = 0;
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else pass++; }

// ── (1) shape + explainability from a D5 fixture ─────────────────────────────
const priorities = [
  { qualityId: 'maxStrength', order: 1, magnitude: 0.6, adaptations: ['myofibrillar'], tracesToLimiter: 'maxStrength' },
  { qualityId: 'explosiveStrength', order: 2, magnitude: 0.4, adaptations: ['rfd'], tracesToLimiter: 'explosiveStrength' },
];
const limitingFactors = [...priorities, { qualityId: 'aerobicCapacity', magnitude: 0.3 }]; // last one deferred
const bp = deriveBlockObjective({ priorityQualities: priorities, limitingFactors, season: 'off', eventCalendar: {}, recoveryRate: 1.0 });

assert(Array.isArray(bp.blocks) && bp.blocks.length === 2, `emits one block per priority (${bp.blocks.length})`);
assert(bp.source === 'diagnosis', 'source is diagnosis when D5 priorities exist');
const b0 = bp.blocks[0];
assert(b0.developsQuality === 'maxStrength' && b0.objective === 'develop:maxStrength',
  `block 0 develops the top limiter (${b0.objective})`);
assert(b0.trajectory === 'accumulation' && b0.volumeShape === 'ramp' && b0.season === 'off',
  `off-season top block is accumulation/ramp (${b0.trajectory}/${b0.volumeShape})`);
assert(b0.maintainsQualities.includes('explosiveStrength'), 'block 0 maintains the other priority (concurrency map)');
// Explainability floor: every block has a non-empty rationale + a tracesTo chain.
assert(bp.blocks.every((b) => typeof b.rationale === 'string' && b.rationale.length > 10 && b.tracesTo && b.tracesTo.limiter),
  'every block carries a rationale + tracesTo (explainability floor)');
// Sequencing: the deferred limiter shows up in sequencingNotes (the "why X waits" signal).
assert(bp.sequencingNotes.some((n) => /aerobicCapacity/.test(n) && /defer/i.test(n)),
  `deferred limiter is recorded in sequencingNotes (${bp.sequencingNotes.length} note(s))`);

// ── (2) recoverability modulates block length (governed priors, not a style enum) ─
const lowRec = deriveBlockObjective({ priorityQualities: priorities, limitingFactors, season: 'off', recoveryRate: 0.8 });
assert(lowRec.blocks[0].lengthWeeks < b0.lengthWeeks,
  `low recoverability shortens the block (${lowRec.blocks[0].lengthWeeks} < ${b0.lengthWeeks})`);

// ── (3) taper flagging when an event is in the horizon ───────────────────────
const taper = deriveBlockObjective({ priorityQualities: priorities, limitingFactors, season: 'in', eventCalendar: { isRace: true, taperWeeks: 2 } });
const taperBlock = taper.blocks[taper.blocks.length - 1];
assert(taperBlock.isTaper === true && taperBlock.volumeShape === 'taper' && taperBlock.intensityShape === 'peak',
  `the in-season final block before an event is a taper — volume down, intensity held (${taperBlock.volumeShape}/${taperBlock.intensityShape})`);

// ── (4) no diagnosis → template source, no blocks ────────────────────────────
const none = deriveBlockObjective({ priorityQualities: [], limitingFactors: [], season: 'off' });
assert(none.source === 'template' && none.blocks.length === 0, 'no priorities → template source, no blocks emitted');

// ── (5) ADVISORY integration: sport AND build (post-flip) carry a blockPlan ───
// WP-49 T6 (THE FLIP): build now runs off the diagnosis engine too, so it gains a diagnosis and
// an advisory blockPlan — the same treatment as the diagnosed sport cohorts.
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const sportPlan = generatePlan(answersToProfile(A({ goalType: 'sport', sport: 'run', runDiscipline: 'sprint', sportIntent: 'compete', experienceLevel: 'advanced', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: { squat: 170, deadlift: 210 } })));
const buildPlan = generatePlan(answersToProfile(A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {} })));

assert(sportPlan.meta.diagnosis && Array.isArray(sportPlan.meta.diagnosis.blockPlan?.blocks) && sportPlan.meta.diagnosis.blockPlan.blocks.length > 0,
  'a diagnosed (sport) plan carries meta.diagnosis.blockPlan');
assert(buildPlan.meta.diagnosis && Array.isArray(buildPlan.meta.diagnosis.blockPlan?.blocks) && buildPlan.meta.diagnosis.blockPlan.blocks.length > 0,
  'the build plan (now discipline-driven) also carries meta.diagnosis.blockPlan');

console.log(process.exitCode ? 'wp47-block-objective FAILURES' : `PASS: wp47-block-objective — ${pass} assertions`);
