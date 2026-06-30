/**
 * ruleVolumeAdjustment — maps a sport's fired decisionRules (via evaluateRules) into a
 * conservative runtime adjustment for the reflow: a volume multiplier (<=1) and a force-
 * deload flag. Pure. Reserved effects (exclude_soreness_above / reduce_region_* /
 * cap_high_speed) are intentionally no-ops this build (they need exercise-level tagging
 * the engine catalogue doesn't have yet).
 */
import { evaluateRules } from './rules.js';

export function ruleVolumeAdjustment(profile, context = {}) {
  const { effects } = evaluateRules(profile, context);
  let volumeMult = 1, forceDeload = false;
  const ruleIds = [];
  for (const e of effects) {
    ruleIds.push(e.ruleId);
    switch (e.type) {
      case 'reduce_volume_pct': { const pct = (e.params && e.params.pct) || 0; volumeMult *= (1 - pct / 100); break; }
      case 'minimal_effective_volume': volumeMult = Math.min(volumeMult, 0.6); break;
      case 'taper':                    volumeMult = Math.min(volumeMult, 0.55); break;
      case 'priming_only':             volumeMult = Math.min(volumeMult, 0.4); break;
      case 'reduce_one_step':          volumeMult *= 0.85; break;
      case 'withhold':                 volumeMult = Math.min(volumeMult, 0.2); break;
      case 'force_deload':             forceDeload = true; break;
      default: break; // reserved → no-op
    }
  }
  return { volumeMult: Math.max(0, Math.min(1, volumeMult)), forceDeload, ruleIds };
}
export default { ruleVolumeAdjustment };
