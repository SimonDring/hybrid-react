/**
 * fitnessAge — a transparent, directional "fitness age" estimate from the two
 * age-correlated recovery markers we actually measure: resting HR and HRV. NOT a
 * medical/biological-age claim — it's a motivational estimate (à la Garmin Fitness
 * Age), labelled as such in the UI.
 *
 * Model (deliberately simple + explainable):
 *   - higher HRV than typical-for-age  → younger
 *   - lower resting HR than a healthy reference → younger
 * Each marker maps a deviation to a year offset; HRV weighted 0.6, RHR 0.4; the
 * total offset is clamped to ±15 yrs. Coefficients are ballpark and tunable.
 */
// Governed model constants (WP-58): the fitness-age model's coefficients gathered in
// one inspectable, documented place instead of scattered magic numbers. Kept app-side
// (this is a display/motivational metric, not an engine coaching decision). Ballpark +
// tunable — evidence level L5. Changing a value here changes the displayed fitness age.
const FITNESS_AGE_MODEL = {
  window: 14,                    // days of trailing daily-metrics averaged (noise smoothing)
  expectedHRV: { base: 68, perYearDecline: 0.45, fromAge: 20, clampMs: [30, 75] }, // typical HRV(age)
  expectedRHR: 62,               // bpm, healthy-adult reference
  weights: { hrv: 0.6, rhr: 0.4 },
  msPerYear: 3.5,                // ~ HRV ms deviation ≈ 1 yr
  bpmPerYear: 2.5,               // ~ resting-HR bpm deviation ≈ 1 yr
  offsetClampYears: 15,          // total offset clamped to ±15 yr
  floorAge: 18,                  // never report a fitness age below this
};

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

export function fitnessAge(profile = {}, dailyMetrics = []) {
  const age = Number(profile.age);
  if (!age) return null;

  const M = FITNESS_AGE_MODEL;
  // Recent averages (trailing window) smooth day-to-day noise.
  const recent = [...(dailyMetrics || [])].sort((a, b) => (a.date || '').localeCompare(b.date || '')).slice(-M.window);
  const hrv = avg(recent.map(m => Number(m.hrv_ms)).filter(v => !isNaN(v)));
  const rhr = avg(recent.map(m => Number(m.resting_hr)).filter(v => !isNaN(v)));
  if (hrv == null && rhr == null) return null;

  const [hrvLo, hrvHi] = M.expectedHRV.clampMs;
  const expectedHRV = clamp(M.expectedHRV.base - M.expectedHRV.perYearDecline * (age - M.expectedHRV.fromAge), hrvLo, hrvHi);
  const expectedRHR = M.expectedRHR;

  let sum = 0, weight = 0;
  if (hrv != null) { sum += M.weights.hrv * (-(hrv - expectedHRV) / M.msPerYear); weight += M.weights.hrv; }
  if (rhr != null) { sum += M.weights.rhr * ((rhr - expectedRHR) / M.bpmPerYear); weight += M.weights.rhr; }
  const offset = clamp(sum / weight, -M.offsetClampYears, M.offsetClampYears);

  const fAge = Math.max(M.floorAge, Math.round(age + offset));
  const delta = age - fAge; // + = younger than chronological
  const status = delta > 1 ? 'younger' : delta < -1 ? 'older' : 'on_par';
  const color = status === 'younger' ? 'var(--status-positive)' : status === 'older' ? 'var(--status-strain)' : 'var(--txt-muted)';

  return { age, fitnessAge: fAge, delta, status, color, hrv: hrv != null ? Math.round(hrv) : null, rhr: rhr != null ? Math.round(rhr) : null };
}

// Fitness age over time: for each day, compute it from the trailing window up to
// that day, so the line shows how it shifts as the person trains. One point per
// day that has enough data to estimate.
export function fitnessAgeSeries(profile = {}, dailyMetrics = []) {
  const sorted = [...(dailyMetrics || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    const fa = fitnessAge(profile, sorted.slice(0, i + 1));
    if (fa) out.push({ date: sorted[i].date, fitnessAge: fa.fitnessAge });
  }
  return out;
}
