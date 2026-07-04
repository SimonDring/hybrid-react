// src/lib/load/load.js
/**
 * load — turns training-load signals into a normalized LoadOutput.
 *
 * Built on ACWR (acute:chronic workload ratio) but DELIBERATELY DEMOTED: the ratio is
 * mathematically coupled (the acute window is part of the chronic window) and a poor
 * injury gate — Impellizzeri 2019 (BJSM) & 2020 (Sports Medicine), Lolli et al.
 * (knowledge base: load.acwr.validity, confidence:low). So ACWR is treated as ONE
 * soft, low-confidence input: it gently eases volume and may CORROBORATE a deload, but
 * it can no longer slam volume or force a deload on its own. The strong cut now comes
 * only from corroborated recovery signals (see recovery + the deload composition).
 *
 * Pure. See docs/engine/01-PANEL-REVIEW.md §3.2 / §6 / §9.
 *
 * @typedef {Object} LoadOutput
 * @property {'low'|'moderate'|'high'} riskLevel
 * @property {number} loadModifier            0.85..1.0 — gentle volume scale (ACWR alone never cuts harder)
 * @property {string|null} loadRecommendation plain-English, coach-readable
 * @property {{acwr:number|null, action:string}} inputs
 * @property {'low'} confidence
 * @property {boolean} corroboratesDeload     ACWR is sustained-high (a soft corroborating signal)
 */
import { loadDecision } from '../plan/trainingLoad.js';
import { mayScaleAlone } from '../knowledge/authority.js';

// ACWR alone may not cut volume below this. The former 0.5 "deload" multiplier is
// retired as a solo lever — that depth of cut now requires a corroborated deload.
const ACWR_ONLY_FLOOR = 0.85;

// WHY the floor applies: the ACWR entries are confidence:'low' → authority
// 'reported' (knowledge/authority.js), which may only adjust within a conservative
// floor. If the science were ever upgraded (entry confidence raised), the floor
// would lift by mechanism — not by someone remembering this constant.
const ACWR_FLOORED = !mayScaleAlone('load.acwr.thresholds');

/**
 * @param {Object} inputs
 * @param {number|null} inputs.acwrVal     today's acute:chronic ratio (or null)
 * @param {number[]} inputs.recentAcwr     recent daily ACWR values
 * @returns {LoadOutput}
 */
export function assessLoad({ acwrVal = null, recentAcwr = [] } = {}) {
  const d = loadDecision(acwrVal, recentAcwr);   // { action, multiplier, reason }
  return {
    riskLevel: d.action === 'deload' ? 'high' : d.action === 'ease' ? 'moderate' : 'low',
    loadModifier: ACWR_FLOORED ? Math.max(ACWR_ONLY_FLOOR, d.multiplier) : d.multiplier,
    loadRecommendation: d.reason,
    inputs: { acwr: acwrVal, action: d.action },
    confidence: 'low',
    corroboratesDeload: d.action === 'deload'
  };
}

export default { assessLoad };
