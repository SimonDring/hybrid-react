// packages/engine/tests/form-model.test.mjs
//
// Phase 2 T2 — governed CTL/ATL/TSB "form" model (TrainingPeaks PMC / Coggan, from
// Banister impulse-response 1991). PARALLEL/advisory only: computeForm is not read
// by generatePlan — nothing in the plan path changes (Task 7 re-baselines the golden
// stamp only). This file independently re-derives the EWMA recurrence (not by
// importing computeForm's internals — by re-implementing the published formula) so
// the assertions are a genuine cross-check, not a tautology.
import assert from 'node:assert/strict';
import { computeForm } from '@performance-os/engine';

let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); console.log('PASS:', m); };
const close = (a, b, tol, m) => ok(Math.abs(a - b) < tol, `${m} (got ${a}, expected ~${b})`);
// assert.throws is synchronous — if computeForm's asOf guard is missing/broken,
// the call inside `fn` hangs forever (the day-walk never terminates) rather than
// returning or throwing, so this is a genuine "does not hang" check, not just a
// throw check: a regression here fails by freezing the test run, not by a red assert.
const throwsOk = (fn, re, m) => { n++; assert.throws(fn, re, m); console.log('PASS:', m); };

// Independent re-derivation of the published CTL/ATL EWMA recurrence (TrainingPeaks
// PMC / Coggan; ctlDays=42 "fitness", atlDays=7 "fatigue") — NOT a call into form.js.
function independentEwma(loads, ctlDays = 42, atlDays = 7) {
  let ctl = 0, atl = 0;
  const kCtl = 1 - Math.exp(-1 / ctlDays);
  const kAtl = 1 - Math.exp(-1 / atlDays);
  for (const load of loads) {
    ctl = ctl * (1 - kCtl) + load * kCtl;
    atl = atl * (1 - kAtl) + load * kAtl;
  }
  return { ctl, atl, tsb: ctl - atl };
}

// Build a `[{date, load}]` series starting 'YYYY-MM-DD' for N days of given loads
// (loads[i] applied on day i; zero-load days are OMITTED — aerobicDailyLoads never
// emits a zero-load entry, so a real dailySeries never carries one either).
function seriesFrom(startISO, loads) {
  const start = new Date(startISO + 'T00:00:00Z');
  const out = [];
  loads.forEach((load, i) => {
    if (!load) return;
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    out.push({ date: d.toISOString().slice(0, 10), load });
  });
  return out;
}
function dateAt(startISO, offsetDays) {
  const d = new Date(startISO + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// ── constant load 50/day for 200 days → CTL and ATL both approach 50, TSB ≈ 0,
//    band 'neutral' (well inside the fresh/fatigued cut-points) ──
{
  const N = 200;
  const loads = Array(N).fill(50);
  const start = '2026-01-01';
  const asOf = dateAt(start, N - 1);
  const series = seriesFrom(start, loads);
  const expected = independentEwma(loads);
  const r = computeForm(series, { asOf });
  close(r.ctl, expected.ctl, 0.2, 'constant-load — CTL matches the independently re-derived EWMA');
  close(r.atl, expected.atl, 0.2, 'constant-load — ATL matches the independently re-derived EWMA');
  close(r.tsb, expected.tsb, 0.2, 'constant-load — TSB matches the independently re-derived EWMA');
  ok(Math.abs(r.ctl - 50) < 2, 'constant-load — CTL has converged near 50 (fitness ≈ steady load)');
  ok(Math.abs(r.atl - 50) < 2, 'constant-load — ATL has converged near 50 (fatigue ≈ steady load)');
  ok(Math.abs(r.tsb) < 2, 'constant-load — TSB (form) is close to 0 — steady state, no taper/spike');
  ok(r.band === 'neutral', 'constant-load — band is neutral');
  ok(r.confidence === 1, 'constant-load — 200 loaded days ≥ matureDays(42) → confidence saturates at 1');
}

// ── a block (42 days @ load 80) then a 10-day taper to 0 → CTL still up, ATL has
//    dropped fast (7d time constant) → TSB positive → band 'fresh' ──
{
  const start = '2026-01-01';
  const block = Array(42).fill(80);
  const series = seriesFrom(start, block); // the 10 taper days carry NO entry (load 0 → omitted)
  const asOf = dateAt(start, 42 + 10 - 1); // 10 days after the last loaded day
  const expected = independentEwma(block.concat(Array(10).fill(0)));
  const r = computeForm(series, { asOf });
  close(r.tsb, expected.tsb, 0.2, 'taper — TSB matches the independently re-derived EWMA');
  ok(r.tsb > 5, 'taper — TSB is well clear of the fresh cut-point');
  ok(r.band === 'fresh', 'taper — band is fresh');
}

// ── a ramp/spike (30 days @ 50 then 7 days @ 150) → ATL shoots up (7d time
//    constant) far faster than CTL → TSB deeply negative → band 'fatigued' ──
{
  const start = '2026-01-01';
  const loads = Array(30).fill(50).concat(Array(7).fill(150));
  const series = seriesFrom(start, loads);
  const asOf = dateAt(start, loads.length - 1);
  const expected = independentEwma(loads);
  const r = computeForm(series, { asOf });
  close(r.tsb, expected.tsb, 0.2, 'ramp — TSB matches the independently re-derived EWMA');
  ok(r.tsb < -15, 'ramp — TSB is well past the fatigued cut-point');
  ok(r.band === 'fatigued', 'ramp — band is fatigued');
}

// ── too little history (fewer than minDays loaded days) → band:null, low confidence ──
{
  const start = '2026-01-01';
  const loads = Array(5).fill(60); // 5 loaded days, well under minDays(14)
  const series = seriesFrom(start, loads);
  const asOf = dateAt(start, loads.length - 1);
  const r = computeForm(series, { asOf });
  ok(r.band === null, 'sparse-history — band is null (fewer than minDays loaded days)');
  ok(r.confidence > 0 && r.confidence < 1, 'sparse-history — confidence is a partial, non-zero fraction');
  ok(r.confidence < 0.5, 'sparse-history — confidence is low with only 5/42 loaded days');
}

// ── empty series → the documented zero/null shape ──
{
  const r = computeForm([], { asOf: '2026-07-20' });
  ok(r.ctl === 0, 'empty series — ctl 0');
  ok(r.atl === 0, 'empty series — atl 0');
  ok(r.tsb === 0, 'empty series — tsb 0');
  ok(r.band === null, 'empty series — band null');
  ok(r.confidence === 0, 'empty series — confidence 0');
  ok(typeof r.rationale === 'string' && r.rationale.length > 0, 'empty series — rationale is still a non-empty explanatory string');
}

// ── invalid asOf → fail-fast throw, NOT an infinite loop (review-confirmed bug: a
//    missing/malformed asOf used to lexically sort above any real date, so the
//    day-walk never reached `end` and hung the process) ──
{
  throwsOk(
    () => computeForm([{ date: '2026-01-01', load: 50 }], {}),
    /asOf must be a YYYY-MM-DD date/,
    'missing asOf — throws fail-fast (does not hang)'
  );
  throwsOk(
    () => computeForm([{ date: '2026-01-01', load: 50 }], { asOf: 'not-a-date' }),
    /asOf must be a YYYY-MM-DD date/,
    'malformed asOf — throws fail-fast (does not hang)'
  );
}

// ── empty series → the zero object even with NO asOf at all (empty-series
//    short-circuit runs BEFORE the asOf guard, so an empty series never needs one) ──
{
  const r1 = computeForm([], { asOf: '2026-01-01' });
  const r2 = computeForm([], {});
  for (const r of [r1, r2]) {
    ok(r.ctl === 0 && r.atl === 0 && r.tsb === 0 && r.band === null && r.confidence === 0,
      'empty series (with or without asOf) — still returns the zero object, no throw');
  }
}

// ── determinism: same input + asOf → identical output, every field, twice ──
{
  const start = '2026-01-01';
  const loads = Array(60).fill(50);
  const series = seriesFrom(start, loads);
  const asOf = dateAt(start, loads.length - 1);
  const a = computeForm(series, { asOf });
  const b = computeForm(series.map((d) => ({ ...d })), { asOf }); // fresh objects, same values
  ok(JSON.stringify(a) === JSON.stringify(b), 'determinism — identical input+asOf serialises identically across calls');
}

// ── shape sanity: every field present with the documented type, on a real case ──
{
  const start = '2026-01-01';
  const loads = Array(60).fill(50);
  const series = seriesFrom(start, loads);
  const asOf = dateAt(start, loads.length - 1);
  const r = computeForm(series, { asOf });
  ok(typeof r.ctl === 'number', 'shape — ctl is a number');
  ok(typeof r.atl === 'number', 'shape — atl is a number');
  ok(typeof r.tsb === 'number', 'shape — tsb is a number');
  ok(['fresh', 'neutral', 'fatigued', null].includes(r.band), 'shape — band is one of the documented bands or null');
  ok(typeof r.confidence === 'number' && r.confidence >= 0 && r.confidence <= 1, 'shape — confidence is a number in [0,1]');
  ok(typeof r.rationale === 'string' && r.rationale.length > 0, 'shape — rationale is a non-empty string');
}

console.log(`\nform-model: ${n}/${n} checks passed`);
