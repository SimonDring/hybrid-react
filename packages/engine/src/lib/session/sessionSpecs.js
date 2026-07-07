/**
 * sessionSpecs — assembles the per-session D9 objective + D10 requirements for a week's sessions.
 * regionOf() IS consumed by the live allocator (D11 branch); deriveSessionSpecs itself
 * remains a test/dev readout of the D9/D10 derivation.
 */
import { assignTargetQualities, deriveSessionObjective } from './sessionObjective.js';
import { deriveMovementRequirements } from './movementRequirements.js';

// Map a session's focus label (from allocator.focusLabel: "Lower","Upper","Push","Pull","Core","Full body")
// to a movement region. Push/Pull both collapse to 'upper' here — this is the COARSE mapping the
// live allocator uses for every non-hypertrophy cohort (and it must stay that way: changing it
// would move sport goldens, since sports label days Push/Pull too).
export function regionOf(focusLabel = '') {
  const f = String(focusLabel).toLowerCase();
  if (/lower|legs/.test(f)) return 'lower';
  if (/upper|push|pull/.test(f)) return 'upper';
  if (/core/.test(f)) return 'core';
  return 'full';
}

// WP-49 Plan 2 T4b: the FINER mapping used ONLY by the hypertrophy discipline's Push/Pull/Legs
// split — a Push day trains push only, a Pull day pull only (so pressing doesn't crowd out the
// back/biceps work, EDS §34). Gated in the allocator to ctx.discipline === 'hypertrophy', so no
// other cohort ever sees 'push'/'pull' regions → sports/PL/olympic stay byte-identical.
export function hypertrophyRegionOf(focusLabel = '') {
  const f = String(focusLabel).toLowerCase();
  if (/push/.test(f)) return 'push';
  if (/pull/.test(f)) return 'pull';
  if (/lower|legs/.test(f)) return 'lower';
  if (/upper/.test(f)) return 'upper';
  if (/core/.test(f)) return 'core';
  return 'full';
}

export function deriveSessionSpecs({
  priorityQualities = [], goalPrimary = null, sessions = [], level = 'intermediate',
  phaseIntent = 'base', deload = false, taper = false, season = null, contraindicatedPatterns = new Set(),
  sport = null,
} = {}) {
  const list = Array.isArray(sessions) ? sessions : [];
  const targets = assignTargetQualities(priorityQualities, list.length, goalPrimary, sport);
  return list.map((s, i) => {
    const targetQuality = targets[i] || targets[0];
    const region = regionOf(s && s.focus);
    return {
      objective: deriveSessionObjective({ targetQuality, region, phaseIntent, deload, taper, season }),
      requirements: deriveMovementRequirements({ targetQuality, region, level, contraindicatedPatterns }),
    };
  });
}

export default { deriveSessionSpecs, regionOf, hypertrophyRegionOf };
