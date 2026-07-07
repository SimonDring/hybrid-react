// tests/wp49-injury-vote-gate.js
// WP-49 Plan 1 final-review fix: discipline-tagged exercises (ex.discipline set) must be
// INVISIBLE to the injury-contraindication majority vote in contraindicatedPatternsFrom()
// (packages/engine/src/lib/session/movementRequirements.js). That vote scans ALL exercises
// for a pattern and contraindicates the pattern when a MAJORITY of its catalogue exercises
// match a blocked name-regex. If a new discipline lift (olympic/powerlifting) on an EXISTING
// pattern is counted in the denominator, it can flip a majority-blocked pattern back to
// minority-blocked — silently making an injured athlete's reflow re-include a pattern that
// should stay blocked. That is not just "a leak" — it is unsafe. The fix excludes
// `e.discipline` exercises from the vote so the denominator matches the pre-branch catalogue.
import { contraindicatedPatternsFrom } from '@performance-os/engine';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// A small in-memory 'vpush' catalogue: 3 blocked ('press' in name) + 2 unblocked (no match).
// 3/5 is a majority → 'vpush' is contraindicated under the pre-branch catalogue.
const baseline = [
  { id: 'a', name: 'Overhead Press', pattern: 'vpush' },
  { id: 'b', name: 'Strict Press', pattern: 'vpush' },
  { id: 'c', name: 'Push Press', pattern: 'vpush' },
  { id: 'd', name: 'Dumbbell Arnold Raise', pattern: 'vpush' },
  { id: 'e', name: 'Handstand Hold', pattern: 'vpush' },
];
const blockedRegexes = [/press/i];

const baselineResult = contraindicatedPatternsFrom(blockedRegexes, baseline);
assert(baselineResult.has('vpush'), 'baseline: a majority-blocked pattern (3/5 match) is contraindicated');

// Add ONE discipline-tagged UNBLOCKED lift of the same pattern. If counted, the denominator
// becomes 6 and the blocked count stays 3 → 3/6 is NOT a majority → the pattern would be
// dropped from the contraindicated set. This is the exact unsafe flip WP-49 introduced.
const withDisciplineLift = [
  ...baseline,
  { id: 'f', name: 'Olympic Push Jerk', pattern: 'vpush', discipline: 'olympic' },
];

const naiveDenominatorWouldFlip = 3 <= withDisciplineLift.filter((e) => e.pattern === 'vpush').length / 2;
assert(naiveDenominatorWouldFlip, 'sanity check: an uncounted discipline lift really would flip this vote below majority');

const gatedResult = contraindicatedPatternsFrom(blockedRegexes, withDisciplineLift);
assert(gatedResult.has('vpush'), 'a discipline-tagged lift on the same pattern must NOT flip the majority vote — vpush stays contraindicated');
