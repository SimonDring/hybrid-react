// m5l2-row-shape.test.mjs — M5-L2: the block_outcomes ROW SHAPE the app materialises
// must feed promoteFromOutcomes correctly. Guards the design-review finding that
// `confidence` MUST sit inside `observed` (where the policy's confidenceOf reads it) —
// if it were only in `outcome_signals`, the policy would see 0 and NEVER promote.
import { promoteFromOutcomes } from '@performance-os/engine';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// A row exactly as AthleteModelService.learnFromBlockClose builds it (observed carries
// BOTH recoveryRate and confidence; outcome_signals is audit-only, not the input path).
const row = (periodEnd, recoveryRate, confidence) => ({
  period_end: periodEnd,
  observed: { recoveryRate, confidence },
  outcome_signals: { recoveryRate, confidence, verdicts: [] },
});

// ── 3 predictive, confident blocks (confidence 0.6 > Gate-A 0.5) → PROMOTE ─────
{
  const history = [
    row('2026-02-01', 1.12, 0.6),
    row('2026-03-01', 1.11, 0.6),
    row('2026-04-01', 1.12, 0.6),
  ];
  const out = promoteFromOutcomes(history, 1, {});
  assert(out.learnedPriors.recoveryRate && out.learnedPriors.recoveryRate.source === 'learned',
    'app row shape (confidence inside observed) PROMOTES after 3 predictive blocks');
  assert(out.learnedPriors.recoveryRate.value > 1 && out.learnedPriors.recoveryRate.value <= 1.15,
    'promoted value is shrunk toward population (≤15% early) — not the raw estimate');
}

// ── Same rows but confidence ONLY in outcome_signals (the WRONG placement) → NO promote ──
// Proves the guard has teeth: mis-placing confidence silently blocks all learning.
{
  const misplaced = [
    { period_end: '2026-02-01', observed: { recoveryRate: 1.12 }, outcome_signals: { confidence: 0.6 } },
    { period_end: '2026-03-01', observed: { recoveryRate: 1.11 }, outcome_signals: { confidence: 0.6 } },
    { period_end: '2026-04-01', observed: { recoveryRate: 1.12 }, outcome_signals: { confidence: 0.6 } },
  ];
  const out = promoteFromOutcomes(misplaced, 1, {});
  assert(!out.learnedPriors.recoveryRate,
    'confidence misplaced in outcome_signals ⇒ policy sees 0 ⇒ NO promotion (the finding this guards)');
}

// ── Abstaining rows (recoveryRate null) never promote ─────────────────────────
{
  const abstain = [row('2026-02-01', null, 0), row('2026-03-01', null, 0), row('2026-04-01', null, 0)];
  const out = promoteFromOutcomes(abstain, 1, {});
  assert(!out.learnedPriors.recoveryRate, 'all-abstain history → no promotion');
}
