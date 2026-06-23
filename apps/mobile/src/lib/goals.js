/**
 * goals — the strength-first Goal Engine. Turns a profile + logged training into
 * measurable, motivating goals with MINIMAL input: each main lift gets an
 * auto-derived "next strength-standard milestone" (or a user-set target if one
 * exists), plus an availability-aware consistency goal. Pure, no side effects.
 *
 * Endurance goals (run/swim/cycle) are intentionally NOT here yet — the data model
 * + UI can extend to them later; today the app is a strength companion.
 */
import { resolveLifts } from '@performance-os/engine/lib/liftProgression.js';
import STANDARDS, { BANDS } from '../data/strengthStandards.js';

const LIFTS = [
  { key: 'squat', label: 'Squat' },
  { key: 'bench', label: 'Bench' },
  { key: 'deadlift', label: 'Deadlift' },
  { key: 'ohp', label: 'Overhead press' },
  { key: 'pull', label: 'Pull' }
];

const STATUS_COLOR = {
  on_track: 'var(--status-positive)',
  building: 'var(--status-caution)',
  behind: 'var(--status-strain)',
  nodata: 'var(--txt-muted)'
};

const clampPct = (n) => Math.max(0, Math.min(100, n));
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function statusFromPct(pct) {
  if (pct == null) return 'nodata';
  if (pct >= 75) return 'on_track';
  if (pct >= 40) return 'building';
  return 'behind';
}

// Current band = highest whose lower-bound ratio is met; next = the band above it.
function placeBand(ratio, table) {
  let cur = null;
  for (const b of BANDS) if (ratio >= table[b]) cur = b;
  const idx = cur ? BANDS.indexOf(cur) : -1;
  const next = idx + 1 < BANDS.length ? BANDS[idx + 1] : null;
  return { cur, next };
}

export function liftGoal(key, profile = {}) {
  const label = (LIFTS.find(l => l.key === key) || {}).label || cap(key);
  const e1rm = resolveLifts(profile)[key];
  const bw = Number(profile.bodyweight_kg) || null;
  const sex = profile.sex === 'female' ? 'female' : 'male';
  const table = STANDARDS[sex] && STANDARDS[sex][key];
  const override = (profile.lift_targets && Number(profile.lift_targets[key])) || null;

  if (!e1rm || !bw || !table) {
    return { key, label, current: e1rm ? Math.round(e1rm) : null, target: override ? Math.round(override) : null,
      mode: override ? 'target' : 'standard', pct: null, status: 'nodata', sub: 'Log a top set to track', color: STATUS_COLOR.nodata };
  }
  const ratio = e1rm / bw;

  if (override) {
    const pct = Math.round(clampPct((e1rm / override) * 100));
    const status = statusFromPct(pct);
    return { key, label, current: Math.round(e1rm), target: Math.round(override), mode: 'target',
      ratio: +ratio.toFixed(2), pct, status, sub: `${Math.round(e1rm)} → ${Math.round(override)} kg`, color: STATUS_COLOR[status] };
  }

  const { cur, next } = placeBand(ratio, table);
  if (!next) {
    return { key, label, current: Math.round(e1rm), target: Math.round(table.elite * bw), mode: 'standard',
      ratio: +ratio.toFixed(2), pct: 100, status: 'on_track', sub: 'Elite', color: STATUS_COLOR.on_track };
  }
  const lo = cur ? table[cur] * bw : 0;
  const target = table[next] * bw;
  const pct = Math.round(clampPct(((e1rm - lo) / (target - lo)) * 100));
  const status = statusFromPct(pct);
  return { key, label, current: Math.round(e1rm), target: Math.round(target), mode: 'standard',
    ratio: +ratio.toFixed(2), pct, status, sub: `${cap(cur || 'untrained')} → ${cap(next)}`, color: STATUS_COLOR[status] };
}

export function consistencyGoal(profile = {}, sessions = {}, currentWeek) {
  const target = (profile.availability && Number(profile.availability.days_per_week)) || null;
  const completed = Object.values(sessions || {}).filter(s => s && s.completed).length;
  const weeks = Math.max(currentWeek || 1, 1);
  const perWeek = completed / weeks;
  if (!target) {
    return { key: 'consistency', label: 'Consistency', current: +perWeek.toFixed(1), target: null, pct: null,
      status: 'nodata', sub: `${completed} done`, color: STATUS_COLOR.nodata };
  }
  const pct = Math.round(clampPct((perWeek / target) * 100));
  const status = statusFromPct(pct);
  return { key: 'consistency', label: 'Consistency', current: +perWeek.toFixed(1), target, pct, status,
    sub: `${perWeek.toFixed(1)} / ${target} per wk`, color: STATUS_COLOR[status] };
}

// Assemble the goal set + a one-line momentum summary for the Progress hero.
export function goalMomentum(profile = {}, sessions = {}, currentWeek) {
  const goals = [...LIFTS.map(l => liftGoal(l.key, profile)), consistencyGoal(profile, sessions, currentWeek)];
  const tracked = goals.filter(g => g.status !== 'nodata');
  const onTrack = tracked.filter(g => g.status === 'on_track').length;
  return { goals, tracked: tracked.length, onTrack };
}
