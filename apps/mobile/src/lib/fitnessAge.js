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
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

export function fitnessAge(profile = {}, dailyMetrics = []) {
  const age = Number(profile.age);
  if (!age) return null;

  // Recent averages (last 14 days) smooth day-to-day noise.
  const recent = [...(dailyMetrics || [])].sort((a, b) => (a.date || '').localeCompare(b.date || '')).slice(-14);
  const hrv = avg(recent.map(m => Number(m.hrv_ms)).filter(v => !isNaN(v)));
  const rhr = avg(recent.map(m => Number(m.resting_hr)).filter(v => !isNaN(v)));
  if (hrv == null && rhr == null) return null;

  const expectedHRV = clamp(68 - 0.45 * (age - 20), 30, 75); // ms, declines with age
  const expectedRHR = 62; // bpm, healthy-adult reference

  let sum = 0, weight = 0;
  if (hrv != null) { sum += 0.6 * (-(hrv - expectedHRV) / 3.5); weight += 0.6; } // ~3.5 ms ≈ 1 yr
  if (rhr != null) { sum += 0.4 * ((rhr - expectedRHR) / 2.5); weight += 0.4; }  // ~2.5 bpm ≈ 1 yr
  const offset = clamp(sum / weight, -15, 15);

  const fAge = Math.max(18, Math.round(age + offset));
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
