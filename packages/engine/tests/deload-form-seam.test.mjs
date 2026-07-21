// packages/engine/tests/deload-form-seam.test.mjs
//
// Phase 2 flip (2026-07-21) — the deload corroboration seam is now LIVE:
// reflow.js and PlanService.js both pass the athlete's real `form` (the
// computeForm output {ctl, atl, tsb, band, confidence, rationale}) into
// deloadRecommendation. form.band === 'fatigued' is wired as a CORROBORATOR
// ONLY, alongside lowReadiness/poorRecovery, inside the existing loadDeload
// branch — it can never force a deload on its own (Art 13: the form model's
// population time constants are contested, so it stays a soft, low-confidence
// input, never a gate — same governed pattern as the ACWR demotion it sits
// beside).
//
// CONSERVATIVE TIERING (the flip's coaching call, resolved this session): form
// is NOT an equal-tier corroborator to lowReadiness/poorRecovery. A fatigued
// form corroborates a load-deload signal for anyone who ISN'T clearly fresh, but
// it must NOT be able to force a deload against a CLEARLY FRESH athlete (readiness
// >= readinessFresh AND recentRecovery >= recoveryFresh) — two low-confidence
// signals (ACWR + form) can't outvote strong freshness evidence. This is a
// DELIBERATE behaviour change from the original equal-tier seam design (flagged
// in the Phase 2 design spec's "flip considerations" as Simon's call to make).
//
// This file proves: (a) every caller that omits `form` (or passes null/a
// non-fatigued band) is byte-identical to pre-flip behaviour; (b) form fatigued
// NEVER forces alone, with or without a loadDeload signal; (c) form fatigued
// DOES corroborate a load-deload signal for a NOT-clearly-fresh athlete; (d) form
// fatigued does NOT force against a CLEARLY FRESH athlete (the conservative
// tiering, the file's main discriminator); (e) form never touches the
// scheduled-deload defer path.
import assert from 'node:assert/strict';
import { deloadRecommendation } from '@performance-os/engine';

let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); console.log('PASS:', m); };
const same = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} (got ${JSON.stringify(a)}, expected ${JSON.stringify(b)})`);

// ── (a) OFF-by-default / byte-identical ──────────────────────────────────
// Hand-traced expected outputs from today's shipped logic (before this seam):
//   fatigued = illness || (lowReadiness && poorRecovery)
//     || (loadDeload && (acwrForcesAlone[=false, ACWR is 'reported'] || lowReadiness || poorRecovery))
//   fresh = readiness>=70 && (recentRecovery==null||recentRecovery>=4) && loadAction!=='deload'&&!=='ease'
// thresholds (kb recovery.deload_thresholds): readinessLow=50, readinessFresh=70,
// recoveryPoor=2, recoveryFresh=4.
const cases = [
  {
    label: 'all-defaults — nothing elevated, nothing scheduled',
    input: {},
    expected: { action: 'none', reason: null }
  },
  {
    label: 'illness alone forces, regardless of load/readiness',
    input: { illness: true },
    expected: { action: 'force', reason: 'Illness — deload and recover this week' }
  },
  {
    label: 'load-deload signal ALONE (high readiness + good recovery) does NOT force — ACWR demoted',
    input: { loadAction: 'deload', readiness: 80, recentRecovery: 5 },
    expected: { action: 'none', reason: null }
  },
  {
    label: 'load-deload CORROBORATED by low readiness — forces',
    input: { loadAction: 'deload', readiness: 40, recentRecovery: 5 },
    expected: { action: 'force', reason: 'Sustained high load with low recovery — deload this week' }
  },
  {
    label: 'low readiness + poor recovery (no load signal, no illness) — forces',
    input: { readiness: 30, recentRecovery: 1 },
    expected: { action: 'force', reason: 'Low readiness and recovery — deload this week' }
  },
  {
    label: 'scheduled deload + fresh — defers the planned deload',
    input: { scheduledDeload: true, readiness: 80, recentRecovery: 5, loadAction: 'none' },
    expected: { action: 'defer', reason: 'Recovered and fresh — pushing the planned deload' }
  },
  {
    label: 'scheduled deload + NOT fresh — stays scheduled (no defer, no force)',
    input: { scheduledDeload: true, readiness: 40, loadAction: 'none' },
    expected: { action: 'none', reason: null }
  },
];

for (const { label, input, expected } of cases) {
  const withoutFormKey = deloadRecommendation(input);
  same(withoutFormKey, expected, `byte-identical (form key omitted) — ${label}`);

  const withExplicitNullForm = deloadRecommendation({ ...input, form: null });
  same(withExplicitNullForm, expected, `byte-identical (form: null) — ${label}`);

  for (const band of ['fresh', 'neutral', null]) {
    const withNonFatiguedForm = deloadRecommendation({ ...input, form: { ctl: 10, atl: 10, tsb: 0, band, confidence: 1, rationale: 'x' } });
    same(withNonFatiguedForm, expected, `unaffected by a non-fatigued form (band=${band}) — ${label}`);
  }
}

// ── (b) form 'fatigued' NEVER forces a deload alone ──────────────────────
// High readiness, good recovery, no illness, no scheduled deload, and crucially
// NO load-deload signal (loadAction 'none'/null) — form fatigued must not be
// able to force on its own. Direct proof of the non-forcing requirement.
{
  const fatiguedForm = { ctl: 40, atl: 60, tsb: -20, band: 'fatigued', confidence: 0.9, rationale: 'x' };
  const r1 = deloadRecommendation({ loadAction: 'none', readiness: 90, recentRecovery: 5, illness: false, scheduledDeload: false, form: fatiguedForm });
  same(r1, { action: 'none', reason: null }, 'form fatigued alone (loadAction none, high readiness, good recovery, no illness) — does NOT force');

  const r2 = deloadRecommendation({ loadAction: null, readiness: 90, recentRecovery: 5, illness: false, scheduledDeload: false, form: fatiguedForm });
  same(r2, { action: 'none', reason: null } , 'form fatigued alone (loadAction null) — does NOT force');
}

// ── (c) form 'fatigued' DOES corroborate a load-deload signal for a
// NOT-clearly-fresh athlete ───────────────────────────────────────────────
// readiness 55 / recovery 3 sit BELOW the fresh cut-points (readinessFresh 70,
// recoveryFresh 4) — not low enough to corroborate on their own (lowReadiness
// needs <50, poorRecovery needs <=2), but not fresh enough to block form's
// corroboration either. The same load-deload signal that resolves to 'none'
// alone now forces once a fatigued form corroborates it.
{
  const fatiguedForm = { ctl: 40, atl: 60, tsb: -20, band: 'fatigued', confidence: 0.9, rationale: 'x' };
  const withoutForm = deloadRecommendation({ loadAction: 'deload', readiness: 55, recentRecovery: 3 });
  ok(withoutForm.action === 'none', 'baseline (no form) — load-deload alone (readiness 55, recovery 3 — not clearly fresh) does not force');

  const withForm = deloadRecommendation({ loadAction: 'deload', readiness: 55, recentRecovery: 3, form: fatiguedForm });
  ok(withForm.action === 'force', 'WIRED: a fatigued form corroborates the same load-deload signal for a NOT-clearly-fresh athlete (readiness 55, recovery 3) — forces');
}

// ── (d) CONSERVATIVE TIERING: form 'fatigued' does NOT force against a
// CLEARLY FRESH athlete ───────────────────────────────────────────────────
// readiness 75 / recovery 5 are BOTH at/above the fresh cut-points (70/4) — the
// same "high readiness + good recovery" case that already blocks ACWR from
// forcing alone. This is the DELIBERATE Phase 2 flip behaviour change: an
// equal-tier seam would force here (form fatigued + loadDeload); the
// conservative-tiered seam does not — two low-confidence signals cannot
// outvote strong freshness evidence (Art 13).
{
  const fatiguedForm = { ctl: 40, atl: 60, tsb: -20, band: 'fatigued', confidence: 0.9, rationale: 'x' };
  const r = deloadRecommendation({ loadAction: 'deload', readiness: 75, recentRecovery: 5, form: fatiguedForm });
  same(r, { action: 'none', reason: null }, 'CONSERVATIVE: a fatigued form does NOT force a deload against a clearly fresh athlete (readiness 75, recovery 5)');
}

// ── (e) form 'fatigued' ALONE (no loadDeload signal) never forces — restated
// with NOT-clearly-fresh inputs so this is a real discriminator, not just a
// re-test of the fresh-block from (d) ─────────────────────────────────────
{
  const fatiguedForm = { ctl: 40, atl: 60, tsb: -20, band: 'fatigued', confidence: 0.9, rationale: 'x' };
  const r1 = deloadRecommendation({ loadAction: 'none', readiness: 55, recentRecovery: 3, form: fatiguedForm });
  same(r1, { action: 'none', reason: null }, 'form fatigued alone (no loadDeload signal, not clearly fresh) never forces');
  const r2 = deloadRecommendation({ loadAction: null, readiness: 55, recentRecovery: 3, form: fatiguedForm });
  same(r2, { action: 'none', reason: null }, 'form fatigued alone (loadAction null, not clearly fresh) never forces');
}

// ── form must not affect the fresh/defer path ─────────────────────────────
{
  const fatiguedForm = { ctl: 40, atl: 60, tsb: -20, band: 'fatigued', confidence: 0.9, rationale: 'x' };
  const r = deloadRecommendation({ scheduledDeload: true, readiness: 80, recentRecovery: 5, loadAction: 'none', form: fatiguedForm });
  same(r, { action: 'defer', reason: 'Recovered and fresh — pushing the planned deload' }, 'a fatigued form does NOT block/alter the scheduled-deload defer path');
}

console.log(`\ndeload-form-seam: ${n}/${n} checks passed`);
