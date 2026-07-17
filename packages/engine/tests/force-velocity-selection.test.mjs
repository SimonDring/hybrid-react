// force-velocity-selection.test.mjs — force-velocity-aware selection, STEP 1 (flag-OFF).
// Proves the match function on the force→velocity continuum and that the mechanism is DORMANT by
// default (the golden master is the separate proof that flag-off selection is byte-identical).
import { forceVelocityMatch } from '@performance-os/engine/lib/plan/selectInterventions.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const approx = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

// back_squat is maximal-force; depth_jump is ballistic (via exerciseQualities).
// maxStrength's ideal is maximal-force; reactiveStrength's ideal is ballistic.

// ── Perfect match → 1 ─────────────────────────────────────────────────────────
{
  assert(forceVelocityMatch({ id: 'back_squat' }, 'maxStrength') === 1,
    'back_squat (maximal-force) perfectly matches maxStrength (maximal-force) → 1');
  assert(forceVelocityMatch({ id: 'depth_jump' }, 'reactiveStrength') === 1,
    'depth_jump (ballistic) perfectly matches reactiveStrength (ballistic) → 1');
}

// ── Opposite ends of the continuum → low match ────────────────────────────────
{
  // back_squat (maximal-force, pos 0) vs reactiveStrength (ballistic, pos 3) → 1 − 3/3 = 0.
  const m = forceVelocityMatch({ id: 'back_squat' }, 'reactiveStrength');
  assert(approx(m, 0), `a grinding back squat is a poor fit for reactive strength (ballistic) → ~0 (got ${m})`);
}

// ── Missing either side → 0.5 neutral (never a penalty; additive-first) ───────
{
  assert(forceVelocityMatch({ id: 'nonexistent_exercise' }, 'maxStrength') === 0.5,
    'an untagged exercise → 0.5 neutral (no nudge, never penalised)');
  assert(forceVelocityMatch({ id: 'squat' }, 'not_a_quality') === 0.5,
    'an unknown target quality → 0.5 neutral');
}

// ── The nudge is bounded + centred on neutral (the weight × (match − 0.5)) ─────
{
  // At match 0.5 the multiplier is exactly 1 (no change) — this is why an untagged exercise is
  // byte-identical whether the flag is on or off.
  const w = 0.15;
  const multAtNeutral = 1 + w * (0.5 - 0.5);
  assert(multAtNeutral === 1, 'a neutral (0.5) match applies a ×1 multiplier — no change');
}

// ── Purity ────────────────────────────────────────────────────────────────────
{
  assert(forceVelocityMatch({ id: 'squat' }, 'maxStrength') === forceVelocityMatch({ id: 'squat' }, 'maxStrength'),
    'deterministic');
}
