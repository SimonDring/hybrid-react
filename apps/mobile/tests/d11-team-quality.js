// tests/d11-team-quality.js — WP-48: the TEAM-SPORT flip gate (hurling, gaelic football,
// field hockey → category-led D11), Simon's 2026-07-06 direction: every sport's diagnosis
// STEERS its plan with full explainability. The mirror of d11-swim-quality.js for the
// invasion sports: if the flip (or any later change) turns these weeks into generic gym
// filler — or back into un-steered legacy fill — THIS fails, not just a snapshot.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { weekCategoryPlan } from '@performance-os/engine/lib/session/categoryCoverage.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

const planFor = (code) => generatePlan({
  ...answersToProfile(A({ goalType: 'sport', sport: 'gaa', sportIntent: 'compete', sportSeason: 'off_season', experienceLevel: 'intermediate', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: FULL, sportDays: ['tue', 'sat'] })),
  sport_code: code, plan_start_date: '2026-07-06',
});

// Non-gym library entries each sport legitimately cannot cover in the gym (documented
// in skb-catalogue-join.js's allowlist) — anything else uncovered is a coverage failure.
const NON_GYM_CATEGORIES = {
  hurling: new Set(['speed/sprint']),
  gaelic_football: new Set(['speed/sprint']),
  field_hockey: new Set(['conditioning support']),
  soccer: new Set([]),
};

for (const code of ['hurling', 'gaelic_football', 'field_hockey', 'soccer']) {
  const plan = planFor(code);
  const week = plan.phases[0].weeks[1] || plan.phases[0].weeks[0];
  const sessions = week.sessions.filter((s) => !s.discipline || s.discipline === 'gym');
  const names = sessions.flatMap((s) => (s.items || []).map((it) => (it.name || '').toLowerCase()));

  // 1 · The diagnosis steers AND says so.
  assert(plan.meta.diagnosis && (plan.meta.diagnosis.priorityQualities || []).length > 0,
    `${code}: meta.diagnosis shipped (the plan is diagnosis-steered now)`);
  assert(sessions.every((s) => s._objective && s._objective.source !== 'style'),
    `${code}: every session carries a category/D9 objective, not the legacy style fallback`);

  // 2 · The sport's signature content is present (the library steers selection).
  assert(names.some((n) => /nordic|leg curl|romanian|rdl|hinge|deadlift|glute/i.test(n)),
    `${code}: posterior-chain / hamstring-prevention work present`);
  assert(names.some((n) => /pallof|woodchop|rotation|chop/i.test(n)),
    `${code}: rotational / anti-rotation trunk work present (the invasion-sport signature)`);
  assert(names.some((n) => /jump|pogo|bound|clean|swing|sled/i.test(n)),
    `${code}: explosive / plyometric work present`);

  // 3 · A real week: differentiated days, real dose, never all-hinge.
  const purposes = new Set(sessions.map((s) => s._objective && s._objective.purpose));
  assert(purposes.size >= 2, `${code}: days are differentiated (${[...purposes].join(' / ')})`);
  assert(sessions.every((s) => (s.items || []).filter((it) => (it.volumeFactor ?? 1) > 0).length >= 3),
    `${code}: every session ships ≥3 working items`);
  const hingeShare = names.filter((n) => /deadlift|rdl|romanian|good morning|hinge|swing/.test(n)).length / Math.max(1, names.length);
  assert(hingeShare < 0.5, `${code}: not posterior-chain-only (hinge share ${Math.round(hingeShare * 100)}%)`);

  // 4 · Coverage honesty: everything the library declares is either planned or a
  //     documented non-gym category.
  const cp = weekCategoryPlan(code, 3, { levelName: 'intermediate', season: 'off' });
  assert(cp && cp.sessions.every((s) => s.exerciseIds.length > 0), `${code}: category plan exists with selectable movements per session`);
  const badUncovered = (cp.uncovered || []).filter((c) => !NON_GYM_CATEGORIES[code].has(c));
  assert(badUncovered.length === 0, `${code}: no gym-coverable category is dropped (${badUncovered.join(', ') || 'clean'})`);
}
