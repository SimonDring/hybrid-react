// seasonProgramming — the accessor that resolves a profile to its CURRENT-PHASE machine-consumable
// programming block from the SKB seasonalModel. Season-phased SKB programming (Approach A —
// docs/superpowers/specs/2026-07-09-season-phased-skb-design.md §3). Pure; returns null for a sport
// that hasn't authored a programming block yet (→ the generator falls back to the legacy layer, so
// nothing regresses while sports migrate one at a time).
import * as SKB from './index.js';
import { skbSportIdOf } from './index.js';
import { deriveSeason } from '../plan/periodization.js';

// engine phase (off/pre/in/transition) → SKB seasonalModel phase key.
export const PHASE_MAP = { off: 'offSeason', pre: 'preSeason', in: 'competition', transition: 'recovery' };

/** The programming block for a resolved SKB profile at an engine phase, or null. Pure, no registry. */
export function programmingForPhase(sportProfile, enginePhase) {
  if (!sportProfile || !sportProfile.seasonalModel) return null;
  const skbPhase = PHASE_MAP[enginePhase] || 'offSeason';
  const phase = sportProfile.seasonalModel[skbPhase];
  return (phase && phase.programming) || null;
}

/** The programming block for the CURRENT phase of a user profile, or null. Never throws. */
export function phaseProgrammingFor(profile = {}) {
  const sportProfile = SKB.get(skbSportIdOf(profile));
  if (!sportProfile) return null;
  const phase = deriveSeason(profile) || 'off';
  return programmingForPhase(sportProfile, phase);
}

export default { phaseProgrammingFor, programmingForPhase, PHASE_MAP };
