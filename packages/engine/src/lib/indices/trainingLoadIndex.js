/**
 * Training Load Index — how much training stress has been applied, acute vs chronic.
 *
 * Reuses the existing internal-load stack (Edwards zone-TRIMP → 7/28-day EWMA →
 * ACWR) and adds an EXTERNAL load contributor: strength volume-load (Σ actual_weight
 * × actual_reps) from set logs, which the HR-based internal load misses. ACWR stays
 * a demoted, context-only signal (knowledge base: load.acwr.validity); the runtime
 * deload decision is unchanged — this index is the explainable readout.
 * `value` is a 0–100 "load balance" (100 ≈ the sweet spot at ACWR ~1.0, falling off
 * as load runs hot or cold). Pure, no IO.
 *
 * See docs/engine/03-PHYSIOLOGICAL-FRAMEWORK.md §3.4. (knowledge base:
 * load.internal.method, load.external.volume_load.)
 */
import { acuteChronic, acwr, acwrSeries, loadDecision } from '../plan/trainingLoad.js';
import { clamp100 } from '../baseline.js';
import { bandFromValue, computeConfidence } from './contract.js';

const DAY_MS = 86400000;

// ACWR → 0–100 load balance (higher = better balanced).
function loadBalance(a) {
  if (a == null) return null;
  if (a < 0.8) return 65;                                  // under-loaded — room to build
  if (a <= 1.3) return clamp100(100 - Math.abs(a - 1.0) * 50); // sweet spot, peak at 1.0
  if (a <= 1.5) return clamp100(75 - (a - 1.3) * 75);      // easing zone (75 → 60)
  return clamp100(50 - (a - 1.5) * 50);                    // overreaching (< 50)
}

// Strength external load over the trailing 7 days (Σ weight × reps). null if none logged.
function volumeLoad7d(setLogs = [], asOf) {
  if (!asOf) return null;
  const cut = new Date(asOf + 'T00:00:00Z').getTime() - 7 * DAY_MS;
  let total = 0, any = false;
  for (const s of setLogs) {
    if (s.actual_weight == null || s.actual_reps == null) continue;
    const t = s.completed_at ? new Date(s.completed_at).getTime() : null;
    if (t != null && t >= cut) { total += Number(s.actual_weight) * Number(s.actual_reps); any = true; }
  }
  return any ? Math.round(total) : null;
}

/**
 * @param {object} inputs
 * @param {{date,load}[]} inputs.dl   daily loads (from trainingLoad.dailyLoads)
 * @param {string} inputs.asOf        ISO date 'YYYY-MM-DD'
 * @param {object[]} [inputs.setLogs] set_logs rows (for volume-load)
 * @returns index contract (+ acute/chronic/acwr/volumeLoad/action in extra)
 */
export function trainingLoadIndex({ dl = [], asOf = null, setLogs = [] } = {}) {
  const ac = acuteChronic(dl, asOf);
  const acwrVal = acwr(ac);
  const decision = loadDecision(acwrVal, acwrSeries(dl, asOf, 4));
  const volumeLoad = volumeLoad7d(setLogs, asOf);
  const value = loadBalance(acwrVal);

  const parts = [
    { name: 'internal_load', present: ac.chronic >= 1, value: Math.round(ac.acute), weight: 2, source: 'derived', baselineMaturity: 1 },
    { name: 'acwr', present: acwrVal != null, value: acwrVal, weight: 2, source: 'derived', baselineMaturity: 1 },
    { name: 'volume_load', present: volumeLoad != null, value: volumeLoad, weight: 1, source: 'manual', baselineMaturity: 1 }
  ];

  return {
    value: value == null ? null : Math.round(value),
    confidence: computeConfidence(parts),
    band: bandFromValue(value),
    contributors: parts.filter(p => p.present).map(p => ({ name: p.name, value: p.value })),
    missingInputs: parts.filter(p => !p.present).map(p => p.name),
    acute: Math.round(ac.acute),
    chronic: Math.round(ac.chronic),
    acwr: acwrVal,
    volumeLoad,
    action: decision.action
  };
}

export default { trainingLoadIndex };
