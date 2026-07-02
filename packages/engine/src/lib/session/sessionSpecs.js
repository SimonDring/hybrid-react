/**
 * sessionSpecs — assembles the per-session D9 objective + D10 requirements for a week's sessions.
 * PARALLEL — read only by tests + the /dev readout; nothing in generatePlan consumes it.
 */
import { assignTargetQualities, deriveSessionObjective } from './sessionObjective.js';
import { deriveMovementRequirements } from './movementRequirements.js';

// Map a session's focus label (from allocator.focusLabel: "Lower","Upper","Push","Pull","Core","Full body")
// to a movement region.
export function regionOf(focusLabel = '') {
  const f = String(focusLabel).toLowerCase();
  if (/lower/.test(f)) return 'lower';
  if (/upper|push|pull/.test(f)) return 'upper';
  if (/core/.test(f)) return 'core';
  return 'full';
}

export function deriveSessionSpecs({
  priorityQualities = [], goalPrimary = null, sessions = [], level = 'intermediate',
  phaseIntent = 'base', deload = false, taper = false, season = null, contraindicatedPatterns = new Set(),
} = {}) {
  const list = Array.isArray(sessions) ? sessions : [];
  const targets = assignTargetQualities(priorityQualities, list.length, goalPrimary);
  return list.map((s, i) => {
    const targetQuality = targets[i] || targets[0];
    const region = regionOf(s && s.focus);
    return {
      objective: deriveSessionObjective({ targetQuality, region, phaseIntent, deload, taper, season }),
      requirements: deriveMovementRequirements({ targetQuality, region, level, contraindicatedPatterns }),
    };
  });
}

export default { deriveSessionSpecs, regionOf };
