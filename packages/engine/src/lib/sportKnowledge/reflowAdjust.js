/**
 * ruleVolumeAdjustment — maps a sport's fired decisionRules (via evaluateRules) into a
 * conservative runtime adjustment for the reflow: a volume multiplier (<=1) and a force-
 * deload flag. Pure. Reserved effects (exclude_soreness_above / reduce_region_* /
 * cap_high_speed) are intentionally no-ops this build (they need exercise-level tagging
 * the engine catalogue doesn't have yet).
 */
import { evaluateRules } from './rules.js';
import { REFLOW_EFFECT_MAGNITUDES as M } from '../../data/reflowEffects.js';

// Calendar / season-schedule signals are KNOWN at plan-generation time and are already
// applied by baseline periodisation (seasonProgramming → the SKB `competition` block;
// V2 D7/D8; fixtures → team_fixtures/team_match_weekday, Phase 1 M6). They must NOT
// drive the runtime reflow, or in-season volume is reduced TWICE — once in the
// baseline plan, once again here — excessively cutting load with nothing having
// actually changed. The reflow may diverge from baseline only for LIVE state:
// completions (→ acwr), readiness, injuries (soreness/illness), freezes (Simon's
// ruling, 2026-07-14; the M0 reflow≡baseline property caught the season double-count).
// `competition_within_h` (taper) is the same class and remains a candidate to join
// this list once baseline owns it too (needs the baseline-taper double-count
// confirmed) — flagged for Simon, deferred here to avoid removing behaviour baseline
// can't yet replace.
export const REFLOW_EXCLUDED_SIGNALS = ['season', 'matches_this_week'];

export function ruleVolumeAdjustment(profile, context = {}, { excludeSignals = REFLOW_EXCLUDED_SIGNALS } = {}) {
  const { effects } = evaluateRules(profile, context, { excludeSignals });
  let volumeMult = 1, forceDeload = false;
  const ruleIds = [];
  for (const e of effects) {
    ruleIds.push(e.ruleId);
    switch (e.type) {
      case 'reduce_volume_pct': { const pct = (e.params && e.params.pct) || 0; volumeMult *= (1 - pct / 100); break; }
      case 'minimal_effective_volume': volumeMult = Math.min(volumeMult, M.minimal_effective_volume); break;
      case 'taper':                    volumeMult = Math.min(volumeMult, M.taper); break;
      case 'priming_only':             volumeMult = Math.min(volumeMult, M.priming_only); break;
      case 'reduce_one_step':          volumeMult *= M.reduce_one_step; break;
      case 'withhold':                 volumeMult = Math.min(volumeMult, M.withhold); break;
      case 'force_deload':             forceDeload = true; break;
      default: break; // reserved → no-op
    }
  }
  return { volumeMult: Math.max(0, Math.min(1, volumeMult)), forceDeload, ruleIds };
}
export default { ruleVolumeAdjustment };
