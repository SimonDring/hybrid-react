/**
 * fixtureWeeks — PURE fixture→microcycle geometry (D8 wiring, Phase 1). Turns a team's
 * dated fixtures into a per-week match-day offset map (MD-4 → -4 … MD+1 → +1), anchored to
 * plan_start_date (never the clock — Art 18). Baseline-owned: fixtures are known ahead, so
 * this feeds the generator, not the runtime reflow (reflowAdjust.js REFLOW_EXCLUDED_SIGNALS).
 */
const MS_DAY = 86_400_000;
const parseISO = (s) => { const d = new Date(s + 'T00:00:00'); return isNaN(d.getTime()) ? null : d; };
// Monday-anchored week: shift so Monday = 0 … Sunday = 6.
function mondayOf(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

/**
 * @param {object} a
 *   fixtures      [{ dateISO, weekdayIdx }]  match fixtures (already normalised, Mon=0..Sun=6)
 *   matchWeekday  number|null                recurring match weekday (fallback anchor)
 *   planStartDate ISO string                 the plan anchor (asOf)
 *   weekNum       1-based plan week
 * @returns {{ matchesThisWeek: number|null, mdOffsetByWeekday: Map<number,number> }}
 */
export function mdMapForWeek({ fixtures = [], matchWeekday = null, planStartDate = null, weekNum = 1 } = {}) {
  const start = parseISO(planStartDate);
  const empty = { matchesThisWeek: null, mdOffsetByWeekday: new Map() };
  if (!start) return empty;

  // The week window [weekStart, weekStart+7): Monday of plan week `weekNum`.
  const weekStart = mondayOf(start);
  weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
  const weekStartMs = weekStart.getTime();

  // Match weekday indices in THIS week (from dated fixtures that fall in the window).
  const matchIdx = [];
  for (const f of fixtures) {
    const d = parseISO(f && f.dateISO);
    if (!d) continue;
    const off = Math.round((mondayOf(d).getTime() - weekStartMs) / MS_DAY);
    if (off === 0 && typeof f.weekdayIdx === 'number') matchIdx.push(f.weekdayIdx);
  }

  const matchesThisWeek = matchIdx.length;
  const anchors = matchIdx.length ? matchIdx : (matchWeekday != null ? [matchWeekday] : []);
  if (!anchors.length) return empty; // no dated fixture AND no recurring anchor → no reshape

  const mdOffsetByWeekday = new Map();
  for (let d = 0; d <= 6; d++) {
    let nearest = null;
    for (const a of anchors) { const o = d - a; if (nearest == null || Math.abs(o) < Math.abs(nearest)) nearest = o; }
    mdOffsetByWeekday.set(d, nearest);
  }
  // Density: number of DATED matches this week (a recurring-only week is 0, not null).
  return { matchesThisWeek: matchIdx.length ? matchesThisWeek : 0, mdOffsetByWeekday };
}

// Parse every `MD±n` token in a string or string[] into a Set of signed offsets. "MD" alone = 0.
// Non-MD sentinel words ("all", "none", "every day between matches", …) contribute nothing.
function offsetsFrom(spec) {
  const out = new Set();
  const scan = (s) => {
    if (typeof s !== 'string') return;
    const re = /\bMD([+-]\d+)?\b/g; let m;
    while ((m = re.exec(s)) !== null) out.add(m[1] ? Number(m[1]) : 0);
  };
  if (Array.isArray(spec)) spec.forEach(scan); else scan(spec);
  return out;
}

// Which weekday indices in this week carry an offset in `offsets`.
function idxWhereOffset(mdOffsetByWeekday, offsets) {
  const s = new Set();
  if (!offsets.size) return s;
  for (const [d, o] of mdOffsetByWeekday) if (offsets.has(o)) s.add(d);
  return s;
}

/**
 * Translate a sport's spacing constraints + this week's offset map into concrete weekday-index
 * sets the scheduler penalises against. Returns null when nothing is parseable (byte-safe: the
 * scheduler then sees no mdConstraints and runs exactly as today).
 */
export function mdConstraintsFrom(spacingConstraints, mdOffsetByWeekday) {
  if (!spacingConstraints || !mdOffsetByWeekday || !mdOffsetByWeekday.size) return null;
  const avoidHeavyIdx = idxWhereOffset(mdOffsetByWeekday, offsetsFrom(spacingConstraints.avoidHeavyLiftingDays));
  const preferExplosiveIdx = idxWhereOffset(mdOffsetByWeekday, offsetsFrom(spacingConstraints.preferExplosiveWorkDays));
  const heavyTargetIdx = idxWhereOffset(mdOffsetByWeekday, offsetsFrom(spacingConstraints.heavyDay));
  const recoveryIdx = idxWhereOffset(mdOffsetByWeekday, offsetsFrom(spacingConstraints.recoveryDay));
  if (!avoidHeavyIdx.size && !preferExplosiveIdx.size && !heavyTargetIdx.size && !recoveryIdx.size) return null;
  return { avoidHeavyIdx, preferExplosiveIdx, heavyTargetIdx, recoveryIdx };
}

export default { mdMapForWeek, mdConstraintsFrom };
