// derive-recovery-observation.test.mjs — Phase 3 M5-L2 (§3 materialisation).
// Pins the recoveryRate/confidence shape the D16 loop learns from: the ≈1.0
// normalisation, the [0.7,1.3] clamp, the <3 abstain, the numeric confidence +
// corroboration boost. Imports ONLY from @performance-os/engine (no app boot).
import { deriveRecoveryObservation } from '@performance-os/engine';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// Helper: build daily recovery ratings from an array of values starting at a date.
function ratings(startISO, values) {
  const start = Date.parse(startISO);
  return values.map((v, i) => ({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), recovery: v }));
}

// A block window with an 8-week baseline before it.
const BLOCK_START = '2026-03-01';
const BLOCK_END = '2026-03-28';

// ── (a) At-baseline block → recoveryRate ≈ 1.0 ────────────────────────────────
{
  const baseline = ratings('2026-01-04', Array(20).fill(3)); // ~8wk of 3s before the block
  const block = ratings(BLOCK_START, [3, 3, 3, 3, 3]);        // 5 in-block 3s
  const out = deriveRecoveryObservation({ sessionRecoveries: [...baseline, ...block], startISO: BLOCK_START, endISO: BLOCK_END });
  assert(approx(out.recoveryRate, 1.0), `(a) recovered in line with own norm → ≈1.0 (got ${out.recoveryRate})`);
  assert(out.confidence > 0.5, `(a) 5 rated sessions → confidence above Gate-A floor (got ${out.confidence})`);
}

// ── (b) Better-than-baseline block → recoveryRate > 1.0, clamped at 1.3 ────────
{
  const baseline = ratings('2026-01-04', Array(20).fill(2));  // low norm
  const block = ratings(BLOCK_START, [5, 5, 5, 5]);           // much better in-block
  const out = deriveRecoveryObservation({ sessionRecoveries: [...baseline, ...block], startISO: BLOCK_START, endISO: BLOCK_END });
  assert(out.recoveryRate === 1.3, `(b) 5/2 = 2.5 clamps to the 1.3 ceiling (got ${out.recoveryRate})`);
}

// ── (c) Worse-than-baseline block → recoveryRate < 1.0, clamped at 0.7 ─────────
{
  const baseline = ratings('2026-01-04', Array(20).fill(5));  // high norm
  const block = ratings(BLOCK_START, [2, 2, 2, 2]);           // under-recovered
  const out = deriveRecoveryObservation({ sessionRecoveries: [...baseline, ...block], startISO: BLOCK_START, endISO: BLOCK_END });
  assert(out.recoveryRate === 0.7, `(c) 2/5 = 0.4 clamps to the 0.7 floor (got ${out.recoveryRate})`);
}

// ── (d) Fewer than 3 in-block sessions → ABSTAIN (null, 0) ─────────────────────
{
  const baseline = ratings('2026-01-04', Array(20).fill(3));
  const block = ratings(BLOCK_START, [3, 3]);                 // only 2 in-block
  const out = deriveRecoveryObservation({ sessionRecoveries: [...baseline, ...block], startISO: BLOCK_START, endISO: BLOCK_END });
  assert(out.recoveryRate === null && out.confidence === 0, `(d) <3 in-block ratings → abstain (got ${JSON.stringify(out)})`);
}

// ── (e) No baseline history → ABSTAIN ─────────────────────────────────────────
{
  const block = ratings(BLOCK_START, [3, 3, 3, 3]);           // in-block only, no prior norm
  const out = deriveRecoveryObservation({ sessionRecoveries: block, startISO: BLOCK_START, endISO: BLOCK_END });
  assert(out.recoveryRate === null && out.confidence === 0, `(e) no baseline → abstain (got ${JSON.stringify(out)})`);
}

// ── (f) Corroboration boost: rising e1RM agrees with better recovery → +0.1 ────
{
  const baseline = ratings('2026-01-04', Array(20).fill(3));
  const block = ratings(BLOCK_START, [3, 4, 4, 4]);           // mean 3.75 > 3 (recovery up)
  const noLift = deriveRecoveryObservation({ sessionRecoveries: [...baseline, ...block], startISO: BLOCK_START, endISO: BLOCK_END });
  const risingLift = deriveRecoveryObservation({
    sessionRecoveries: [...baseline, ...block],
    liftLog: [{ date: '2026-03-02', e1rm: 100 }, { date: '2026-03-14', e1rm: 104 }, { date: '2026-03-26', e1rm: 108 }],
    startISO: BLOCK_START, endISO: BLOCK_END,
  });
  assert(approx(risingLift.confidence, clamp01(noLift.confidence + 0.1)), `(f) agreeing e1RM slope boosts confidence +0.1 (got ${noLift.confidence} → ${risingLift.confidence})`);
}
function clamp01(x) { return Math.min(0.9, Math.max(0, Math.round(x * 1000) / 1000)); }

// ── (g) Purity: same inputs → same observation (no clock/randomness) ──────────
{
  const baseline = ratings('2026-01-04', Array(20).fill(3));
  const block = ratings(BLOCK_START, [3, 4, 3, 4]);
  const args = { sessionRecoveries: [...baseline, ...block], startISO: BLOCK_START, endISO: BLOCK_END };
  const a = deriveRecoveryObservation(args), b = deriveRecoveryObservation(args);
  assert(JSON.stringify(a) === JSON.stringify(b), '(g) deterministic — identical output for identical input');
}
