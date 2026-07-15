// tests/injury-id-keying.js — TR-10 / M4a Task 1: the injury safety join keys on exercise
// IDENTITY (id / movement pattern), not display name. Proves the two failure modes the
// name-regex join could not defend against:
//   (1) RENAME — a catalogue exercise renamed to dodge the regex is STILL blocked (via exId).
//   (2) NOVEL  — a brand-new exercise of a contraindicated pattern is blocked by safe default,
//       even with a name no regex anticipated.
// And the false-positive guard: a clean exercise of a non-contraindicated pattern is NOT blocked.

import { applyInjuryRules } from '@performance-os/engine/lib/injury/injuryFilter.js';
import { getContraindicatedExercises } from '@performance-os/engine/lib/injury/injuryRules.js';
import { isExerciseContraindicated, contraindicationCell } from '@performance-os/engine/lib/injury/contraindicationVocab.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const kneeProtect = { body_part_key: 'knee', severity: 4, rehab_phase: 'protect', status: 'active', side: 'left', body_part: 'Knee' };

// ── 1 · RENAME-PROOF: exId wins over a dodging display name ───────────────────
{
  // back_squat is contraindicated for a protected knee (pattern 'squat'). Give the item a
  // display name that matches NO knee regex ("Zercher Hold" has no squat/lunge/deadlift/…).
  const week = {
    num: 1,
    sessions: [{
      title: 'Gym — Lower', discipline: 'gym', lowerBody: true, items: [
        { num: 'A1', exId: 'back_squat', name: 'Zercher Hold', sets: '4 × 5', rpe: 'RPE 8', restSec: 180 },
        { num: 'B1', exId: 'bench', name: 'Bench press', sets: '3 × 8', rpe: 'RPE 7', restSec: 120 },
      ],
    }],
  };
  const out = applyInjuryRules(week, [kneeProtect]);
  const squat = out.sessions[0].items.find(i => i.exId === 'back_squat');
  const bench = out.sessions[0].items.find(i => i.exId === 'bench');
  assert(squat && squat.substituted === true, '1a renamed contraindicated lift is blocked by exId, not fooled by the dodging name');
  assert(bench && !bench.substituted, '1b a safe lift (bench) is untouched for a knee injury (FP guard)');
}

// ── 2 · NOVEL exercise of a contraindicated pattern → blocked by safe default ─
{
  const { patternSet, extraIdSet, clearedIdSet } = getContraindicatedExercises('knee', 4, 'protect');
  const sets = { patternSet, extraIdSet, clearedIdSet };
  // A brand-new squat-pattern exercise with a name no regex would catch.
  assert(isExerciseContraindicated({ id: 'sissy_squat_v2', pattern: 'squat' }, sets),
    '2a a novel squat-pattern exercise is contraindicated for a protected knee (caught by pattern, not name)');
  // A novel non-contraindicated-pattern exercise is NOT blocked (no over-block).
  assert(!isExerciseContraindicated({ id: 'novel_biceps_thing', pattern: 'iso' }, sets),
    '2b a novel isolation exercise is NOT blocked for a knee (no false positive)');
}

// ── 3 · clearedIds preserve behaviour: an existing regex-gap lift stays cleared ─
{
  const cell = contraindicationCell('knee', 'protect');
  assert(cell.clearedIds.includes('hang_clean'),
    '3a hang_clean is a recorded residual (cleared) — behaviour preserved, promotion deferred to science review');
  const { patternSet, extraIdSet, clearedIdSet } = getContraindicatedExercises('knee', 4, 'protect');
  assert(!isExerciseContraindicated({ id: 'hang_clean', pattern: 'squat' }, { patternSet, extraIdSet, clearedIdSet }),
    '3b the existing hang_clean stays cleared (byte-identical to the regex era) — a NOVEL squat is not');
}

// ── 4 · severity policy mirrors getContraindications (≤1 none, ≥4 force protect) ─
{
  const none = getContraindicatedExercises('knee', 1, 'protect');
  assert(none.patternSet.size === 0 && none.extraIdSet.size === 0, '4a severity ≤1 → no contraindications');
  const forced = getContraindicatedExercises('knee', 4, 'return_to_sport');
  assert(forced.forcedPhase === 'protect' && forced.patternSet.size > 0, '4b severity ≥4 forces protect-level blocks');
  const unknown = getContraindicatedExercises('tentacle', 4, 'protect');
  assert(unknown.patternSet.size === 0 && unknown.extraIdSet.size === 0, '4c unknown region → no contraindications');
}
