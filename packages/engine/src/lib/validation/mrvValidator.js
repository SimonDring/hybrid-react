/**
 * MRV ceiling validator — the first named validator (WP-11).
 *
 * Rule: the realised weekly fractional volume per muscle (counting synergist
 * credit from compounds) may not exceed that muscle's MRV (knowledge:
 * volume.landmarks). The constructor enforces this in-loop while selecting
 * (allocator.js weeklyCeiling) — this validator is the independent floor that
 * PROVES the built week complies, and the rule any other construction path
 * (AI proposal, human override) will be judged by.
 *
 * Verdict class: 'trim' — volume.landmarks is confidence:'moderate', so its
 * authority is 'soft' (may scale a plan, may not veto one). Over-MRV work is
 * over-delivery to cut, not a safety veto.
 *
 * Tolerance: fractional-set accounting rounds to halves in places; anything
 * within EPSILON of the ceiling is compliant, not a violation.
 */
import { countWeeklyVolume } from '../plan/volume.js';
import { VOLUME_LANDMARKS } from '../../data/muscleVolume.js';

const EPSILON = 0.51;   // half-set rounding slack — over by ≤ half a set is not a finding

export const mrvCeilingValidator = {
  id: 'volume.mrv-ceiling',
  knowledgeId: 'volume.landmarks',
  tier: 3,   // EDS §37 RECOVERABILITY — never exceed capacity (L3)
  run(week) {
    const { counts } = countWeeklyVolume(week.sessions || []);
    const findings = [];
    for (const muscle in VOLUME_LANDMARKS) {
      const mrv = VOLUME_LANDMARKS[muscle].mrv;
      const delivered = counts[muscle] || 0;
      if (delivered > mrv + EPSILON) {
        findings.push({
          verdict: 'trim',
          reason: `${muscle}: ${delivered} weekly sets exceeds its recoverable ceiling (MRV ${mrv}) — trim ${Math.ceil((delivered - mrv) * 2) / 2} sets`,
          detail: { muscle, delivered, mrv, over: delivered - mrv }
        });
      }
    }
    return findings;
  }
};

export default { mrvCeilingValidator };
