// packages/engine/tests/deload-form-seam.test.mjs
//
// Phase 2 T5 — deload corroboration seam (built, default-OFF). Extends
// deloadRecommendation with an optional `form` (the computeForm output
// {ctl, atl, tsb, band, confidence, rationale}). form.band === 'fatigued' is
// wired as a CORROBORATOR ONLY, alongside lowReadiness/poorRecovery, inside the
// existing loadDeload branch — it can never force a deload on its own (Art 13:
// the form model's population time constants are contested, so it stays a
// soft, low-confidence input, never a gate — same governed pattern as the
// ACWR demotion it sits beside).
//
// No caller passes `form` yet (the reflow flip is Simon's) — this file proves
// two things: (a) the seam is OFF by default (byte-identical to today's
// documented behaviour across a spread of branches), and (b) the seam is
// genuinely WIRED (corroborates a load-deload signal) without ever forcing
// alone.
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

// ── (c) form 'fatigued' DOES corroborate a load-deload signal ────────────
// Same readiness/recovery as the "load-deload signal ALONE" case above (which
// resolved to 'none') — now with form fatigued added, the loadDeload branch's
// corroboration is satisfied and it forces. This is the direct proof the seam
// is wired, not just inert.
{
  const fatiguedForm = { ctl: 40, atl: 60, tsb: -20, band: 'fatigued', confidence: 0.9, rationale: 'x' };
  const withoutForm = deloadRecommendation({ loadAction: 'deload', readiness: 80, recentRecovery: 5 });
  ok(withoutForm.action === 'none', 'baseline (no form) — load-deload alone with high readiness/good recovery does not force');

  const withForm = deloadRecommendation({ loadAction: 'deload', readiness: 80, recentRecovery: 5, form: fatiguedForm });
  ok(withForm.action === 'force', 'WIRED: adding a fatigued form to the same inputs now forces the deload (corroboration)');
}

// ── form must not affect the fresh/defer path ─────────────────────────────
{
  const fatiguedForm = { ctl: 40, atl: 60, tsb: -20, band: 'fatigued', confidence: 0.9, rationale: 'x' };
  const r = deloadRecommendation({ scheduledDeload: true, readiness: 80, recentRecovery: 5, loadAction: 'none', form: fatiguedForm });
  same(r, { action: 'defer', reason: 'Recovered and fresh — pushing the planned deload' }, 'a fatigued form does NOT block/alter the scheduled-deload defer path');
}

console.log(`\ndeload-form-seam: ${n}/${n} checks passed`);
