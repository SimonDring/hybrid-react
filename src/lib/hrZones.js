/**
 * Pure heart-rate-zone math (Karvonen / Heart-Rate Reserve). No IO.
 *
 * HRR intensity = (hr - hrRest) / (hrMax - hrRest). Zones by %HRR:
 *   Z1 <60%  Z2 60-70%  Z3 70-80%  Z4 80-90%  Z5 >=90%
 */

// Best max-HR estimate: a measured observed peak when it beats the age estimate,
// else the Tanaka age estimate (208 - 0.7*age). null if neither is usable.
export function estimateHrMax({ age, observedPeak } = {}) {
  const est = age ? Math.round(208 - 0.7 * age) : null;
  const peak = Number(observedPeak) || null;
  if (peak && (!est || peak > est)) return peak;
  return est;
}

// Which HRR zone a %reserve falls in (1..5).
function zoneOf(pct) {
  if (pct < 0.6) return 1;
  if (pct < 0.7) return 2;
  if (pct < 0.8) return 3;
  if (pct < 0.9) return 4;
  return 5;
}

// Minutes per zone for time-stamped HR samples. Credits the gap between
// consecutive samples to the earlier sample's zone. Null when inputs unusable.
export function hrZonesHRR(samples = [], { hrRest, hrMax } = {}) {
  if (hrRest == null || hrMax == null || hrMax <= hrRest) return null;
  const reserve = hrMax - hrRest;
  const z = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
  for (let i = 0; i < samples.length - 1; i++) {
    const cur = samples[i];
    const dtMin = (samples[i + 1].t - cur.t) / 60000;
    if (!(dtMin > 0)) continue;
    const pct = (cur.hr - hrRest) / reserve;
    z['z' + zoneOf(Math.max(0, Math.min(1, pct)))] += dtMin;
  }
  return { z1: Math.round(z.z1), z2: Math.round(z.z2), z3: Math.round(z.z3), z4: Math.round(z.z4), z5: Math.round(z.z5) };
}

export default { estimateHrMax, hrZonesHRR };
