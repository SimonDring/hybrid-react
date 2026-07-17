/**
 * fv-review — the force-velocity science-review harness (docs/design/m6/FV-SELECTION-PARKED.md).
 *
 * Run: `npm run fv:review -w @performance-os/engine`  (or `node packages/engine/tools/fv-review.mjs`)
 *
 * Prints everything a reviewer needs to validate the force-velocity knowledge BEFORE the flip:
 *   A. Quality → ideal force-velocity (are the ideals right?)
 *   B. Exercise force-velocity tags, by value (are the tags right? — the sparse mid-continuum first)
 *   C. The flip impact: per archetype, which exercises swap, WITH the force-velocity reasoning
 *   D. Sensitivity: where the population is thin, so selection is fragile to a single tag
 *
 * The review loop: read this → edit data/exerciseQualities.js (exercise `forceVelocity`) and/or
 * data/qualityMovementMap.js (quality `forceVelocity`) → re-run → confirm every swap is now a
 * reviewed sharpening → then flip (FV-SELECTED-PARKED.md §"the flip, when the review passes").
 * Read-only: this harness NEVER changes data or plans.
 */
import { EXERCISES } from '../src/data/strengthExercises.js';
import { exerciseQualities } from '../src/data/exerciseQualities.js';
import { QUALITY_MOVEMENT } from '../src/data/qualityMovementMap.js';
import { forceVelocityMatch } from '../src/lib/plan/selectInterventions.js';
import { generatePlan } from '../src/lib/PlanGenerator.js';

const CONTINUUM = ['maximal-force', 'strength-speed', 'speed-strength', 'ballistic'];
const fvOf = (id) => exerciseQualities(id)?.forceVelocity || null;
const bar = (s) => `\n${'═'.repeat(78)}\n${s}\n${'═'.repeat(78)}`;

// ── A. Quality → ideal force-velocity ─────────────────────────────────────────
console.log(bar('A · QUALITY → IDEAL FORCE-VELOCITY  (review: is each ideal right?)'));
const quals = Object.keys(QUALITY_MOVEMENT);
for (const q of quals) {
  const v = QUALITY_MOVEMENT[q];
  const onContinuum = CONTINUUM.includes(v.forceVelocity) ? '' : '  (off-continuum)';
  console.log(`  ${q.padEnd(18)} ideal=${(v.forceVelocity || '—').padEnd(22)} conf=${v.evidence?.confidence || '?'}${onContinuum}`);
}

// ── B. Exercise force-velocity tags, by value (sparse continuum classes first) ─
console.log(bar('B · EXERCISE FORCE-VELOCITY TAGS  (review: is each tag right?)'));
const byFv = {};
for (const e of EXERCISES) { const fv = fvOf(e.id); if (fv) (byFv[fv] ||= []).push(e.id); }
// Continuum classes first (they drive the nudge), then off-continuum, each with its count.
const order = [...CONTINUUM, ...Object.keys(byFv).filter((k) => !CONTINUUM.includes(k))];
for (const fv of order) {
  const ids = byFv[fv] || [];
  const flag = CONTINUUM.includes(fv) && ids.length <= 3 ? '  ⚠ THIN — selection is fragile here' : '';
  console.log(`\n  ${fv}  (${ids.length})${flag}`);
  console.log(`    ${ids.join(', ') || '—'}`);
}

// ── C. Flip impact per archetype, with the force-velocity reasoning ───────────
console.log(bar('C · FLIP IMPACT  (flag OFF vs ON — which exercises swap, and WHY)'));
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const baseP = { experience_level: 'advanced', experience: { gym: 'advanced' }, sex: 'male', bodyweight_kg: 80, access: FULL, availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] }, plan_start_date: '2026-07-13', lifts: {} };
const sports = ['running_sprint', 'running_middle', 'running_long', 'cycling', 'swimming', 'triathlon', 'rugby', 'soccer', 'gaelic_football', 'hurling', 'field_hockey'];
const archetypes = [
  ...sports.map((s) => [`sport·${s}·off`, { ...baseP, goal_type: 'sport', sport: s, sport_intent: 'compete', sport_season: 'off_season', sport_days: ['wed', 'sat'] }]),
  ...[['strength', 'strength'], ['bodybuilding', 'bodybuilding'], ['olympic', 'olympic'], ['functional', 'functional']].map(([k, style]) => [`build·${k}`, { ...baseP, goal_type: 'build', strength_style: style }]),
];
const exIds = (plan) => { const out = []; for (const ph of plan.phases || []) for (const wk of ph.weeks || []) for (const s of wk.sessions || []) for (const it of (s.items || [])) if (it.exId) out.push(it.exId); return out; };
// For a swapped exercise, explain its force-velocity fit to each quality it trains.
function reason(id) {
  const fv = fvOf(id);
  const qs = (exerciseQualities(id)?.qualities || []).map((x) => x.id);
  const fits = qs.filter((q) => QUALITY_MOVEMENT[q]).map((q) => `${q} ideal=${QUALITY_MOVEMENT[q].forceVelocity}→match ${forceVelocityMatch({ id }, q).toFixed(2)}`);
  return `fv=${fv || '—'}${fits.length ? ' | ' + fits.join('; ') : ''}`;
}
let changed = 0;
for (const [key, profile] of archetypes) {
  const off = exIds(generatePlan(profile)), on = exIds(generatePlan(profile, { forceVelocityAware: true }));
  if (JSON.stringify(off) === JSON.stringify(on)) continue;
  changed++;
  const offS = new Set(off), onS = new Set(on);
  const dropped = [...offS].filter((x) => !onS.has(x)), added = [...onS].filter((x) => !offS.has(x));
  console.log(`\n  ▶ ${key}`);
  if (!dropped.length && !added.length) { console.log('    (same exercises, re-ordered only)'); continue; }
  for (const id of dropped) console.log(`    − ${id.padEnd(20)} ${reason(id)}`);
  for (const id of added) console.log(`    + ${id.padEnd(20)} ${reason(id)}`);
}
console.log(`\n  ${changed}/${archetypes.length} archetypes change under the flip.`);

console.log(bar('NEXT: edit the tags above → re-run → confirm every swap is a reviewed sharpening → flip (FV-SELECTION-PARKED.md).'));
