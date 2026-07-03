/**
 * movementRequirements — D10: translate a session objective into MOVEMENT/QUALITY REQUIREMENTS
 * (patterns + force-velocity + contraction) — requirements, not exercises (EDS P5). Constraints are
 * computed BEFORE content (EDS L8): injury-contraindicated patterns are subtracted up front, and a
 * novice's high-skill force-velocity is downgraded to a strength base (EDS L4). PARALLEL.
 */
import { movementRequirementsFor } from '../../data/qualityMovementMap.js';
import { EXERCISES } from '../../data/strengthExercises.js';

// Patterns that belong to each session region (a soft filter — see below).
const REGION_PATTERNS = {
  lower: ['squat', 'hinge', 'lunge', 'calf'],
  upper: ['hpush', 'vpush', 'hpull', 'vpull'],
  core: ['core', 'carry', 'iso'],
  full: null, // no filter
};
const ALL_PATTERNS = ['squat', 'hinge', 'lunge', 'hpush', 'vpush', 'hpull', 'vpull', 'carry', 'core', 'calf', 'iso', 'mobility'];
const HIGH_SKILL_FV = new Set(['ballistic', 'strength-speed']);

// Map the injury system's NAME-regex block list onto the MOVEMENT-PATTERN vocabulary: a pattern is
// contraindicated when a majority of its catalogue exercises' names match a blocked regex.
export function contraindicatedPatternsFrom(blockedRegexes = [], exercises = EXERCISES) {
  const out = new Set();
  const rx = Array.isArray(blockedRegexes) ? blockedRegexes : [];
  if (!rx.length) return out;
  for (const p of ALL_PATTERNS) {
    const exs = exercises.filter((e) => e.pattern === p);
    if (!exs.length) continue;
    const blocked = exs.filter((e) => rx.some((r) => r.test(e.name))).length;
    if (blocked > exs.length / 2) out.add(p);
  }
  return out;
}

export function deriveMovementRequirements({ targetQuality, region = 'full', level = 'intermediate', contraindicatedPatterns = new Set() } = {}) {
  const base = movementRequirementsFor(targetQuality);
  if (!base) return null;

  // Region intersect (soft: if the quality's patterns don't touch the region, keep the full set).
  const rp = REGION_PATTERNS[region];
  let patterns = base.movementPatterns.slice();
  if (rp) {
    const inRegion = patterns.filter((p) => rp.includes(p));
    if (inRegion.length) patterns = inRegion;
  }

  // Subtract injury-contraindicated patterns up front (L8).
  const blocked = contraindicatedPatterns instanceof Set ? contraindicatedPatterns : new Set(contraindicatedPatterns || []);
  const contraindicated = [];
  patterns = patterns.filter((p) => {
    if (blocked.has(p)) { contraindicated.push({ pattern: p, reason: 'injury' }); return false; }
    return true;
  });

  // Competency (L4): a novice can't express high-skill velocity — build the strength base first.
  let forceVelocity = base.forceVelocity;
  let competencyNote = null;
  if (level === 'beginner' && HIGH_SKILL_FV.has(forceVelocity)) {
    competencyNote = 'plyometric/Olympic velocity deferred — build the strength base first';
    forceVelocity = 'maximal-force';
  }

  const rationale = `${base.contraction} ${patterns.join('/') || '(all ideal patterns contraindicated)'} at ${forceVelocity}`
    + (contraindicated.length ? `; removed ${contraindicated.map((c) => c.pattern).join(', ')} — injury` : '')
    + (competencyNote ? `; ${competencyNote}` : '');

  return { movementPatterns: patterns, forceVelocity, contraction: base.contraction, contraindicated, competencyNote, rationale };
}

export default { deriveMovementRequirements, contraindicatedPatternsFrom };
