/**
 * learning/promoteFromOutcomes — D16 · the STAGED→LEARNED promotion policy (M5-L1).
 * The engine that lets the platform LEARN an athlete — the last verb.
 *
 * GOVERNING SPEC: docs/superpowers/specs/2026-07-16-m5-d16-learning-loop-design.md
 * RULED POLICY (🔒 7, Simon 2026-07-16): docs/design/m5-learning/PROMOTION-POLICY.md
 * EDS §25 (three learning tiers; shrinkage; confidence-is-learned) + D16.
 *
 * A PURE function that reads an athlete's block-outcome history (the append-only
 * evidence the M5 substrate's `block_outcomes.outcome_signals` carries) and decides
 * whether a per-athlete recoveryRate prior has EARNED the right to steer the live
 * plan. It NEVER names a plan/session/dose (Art 18; EDS D16 L9) — it writes priors
 * ONLY. No clock, no randomness (Art 18 purity).
 *
 * ── THE RULED POLICY (implemented EXACTLY) ─────────────────────────────────────
 * • Gate A (evidence sufficiency): ≥3 blocks of outcome evidence AND a composed
 *   confidence at/above a MODERATE floor (Art 13 — authority follows confidence).
 * • Gate B (falsifiability, Art 12): the STAGED prior PREDICTED the last block —
 *   its prediction entering the block (recorded from blocks BEFORE it, never the
 *   block it is judged on) matched the observed recovery signal within tolerance.
 *   A hit advances the predictive count; a miss blocks promotion.
 * • Promotion needs BOTH gates. Gate A alone is the classic trap (N blocks of a
 *   confidently-wrong estimate); Gate B closes it.
 * • Shrinkage (Art 16): the learned value deviates from the population prior by at
 *   most ~15% at promotion, the cap WIDENING with predictive blocks. Population is
 *   always the floor/anchor and the value a demotion returns to.
 * • First-armed lever: recoveryRate (D7 deload rhythm) ONLY this increment. No
 *   learned volumeTolerance / block-length is emitted — those stay population.
 * • Demotion (asymmetric hysteresis): slow to promote (3 blocks), FAST to demote —
 *   the first clear misprediction of a LEARNED prior returns it to staged/population.
 *   An ABSTAIN (the block could not test the prior) does NOT demote.
 *
 * ── TR-05 (the hard rule) ──────────────────────────────────────────────────────
 * A schema-default / unlearned prior must NEVER arm the steer. This function is the
 * ONLY writer of `learnedPriors.recoveryRate`, and it writes it ONLY on promotion.
 * The staged estimate lives in a STRUCTURALLY DISTINCT `staged` field the D7 steer
 * (PlanGenerator's `steerRecoveryRate`, reading `learnedPriors.recoveryRate.value`)
 * never reads. `learnedPriors` and `staged` are never both populated for recoveryRate.
 *
 * ── ADDITIVE-FIRST (the law) ───────────────────────────────────────────────────
 * An athlete with no / insufficient block-outcome history → NO learned prior →
 * `learnedPriors` has no recoveryRate → PlanGenerator's steer resolves to null →
 * the population deload rhythm → a BYTE-IDENTICAL plan. Every golden archetype
 * (none carries learned priors) is untouched.
 *
 * ── INPUT SHAPE (block-outcome history) ────────────────────────────────────────
 * A chronological array of block outcomes. Each entry carries what the substrate's
 * `outcome_signals` will supply for recovery learning (DAAS §5.3; consumed here,
 * co-ratified there — this policy does not define the row shape). Fields read:
 *   {
 *     period_end,                 // ISO block-close date — chronological ordering only (no clock)
 *     observed: {
 *       recoveryRate: number|null // the block's OBSERVED recovery signal: readiness rebound
 *                                 // after known load, normalised ≈1.0 (>1 recovers faster).
 *                                 // null / absent ⇒ the block could not test the prior (abstain).
 *     },
 *     predicted: {                // OPTIONAL — a pre-stamped "predicted before observed" value
 *       recoveryRate: number      // (DAAS §3.2). When present it is scored for falsifiability;
 *     },                          // when absent the function derives the prediction from the
 *                                 // running staged estimate over STRICTLY-EARLIER blocks.
 *     confidence: number          // 0..1 composed confidence of this block's signal (DAAS §5.3).
 *   }
 * Flat aliases are also accepted (`recoveryRate`, `predictedRecoveryRate`) so an
 * app that materialises a flatter row still feeds the same policy.
 */
import { ENGINE_VERSION } from '../../version.js';
import { KNOWLEDGE_SET_VERSION } from '../knowledge/entries.js';

// The policy version — bumps when the RULED thresholds/mechanics change (provenance, EDS §25).
export const PROMOTION_POLICY_VERSION = '1.0.0';
const METHOD_ID = 'promoteFromOutcomes';

// ── The ruled thresholds (governed constants; overridable via opts for tests) ──
export const PROMOTION_DEFAULTS = {
  gateAMinBlocks: 3,          // Gate A: ≥3 blocks of evidence (🔒 7 recommended N)
  confidenceFloor: 0.5,       // Gate A: composed confidence at/above 'moderate' (Art 13)
  predictionTolerance: 0.12,  // Gate B: |predicted − observed| ≤ 12% of population = a HIT (wide-early, Art 13)
  blockInterpretFloor: 0.15,  // below this per-block confidence the block ABSTAINS (can't test)
  shrinkageBase: 0.15,        // ≤15% deviation from population at promotion (Art 16)
  shrinkageWiden: 0.05,       // +5% cap per predictive block beyond the minimum
  shrinkageMax: 0.30,         // the widening cap never exceeds ±30% of population
  highConfBlocks: 5,          // predictive blocks needed before a learned prior may tag 'high'
  highConfFloor: 0.8,         // composed-confidence needed (with the block count) for 'high'
};

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const tierOf = (c) => (c >= 0.8 ? 'high' : c >= 0.5 ? 'moderate' : 'low');

// A block's observed recovery signal (number) or null (abstain) — tolerant of flat/nested rows.
function observedOf(b) {
  const v = b && (b.observed && b.observed.recoveryRate != null ? b.observed.recoveryRate
    : (b.recoveryRate != null ? b.recoveryRate : null));
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
// A block's pre-stamped prediction (number) or null (derive from the running estimate).
function stampedPredictionOf(b) {
  const v = b && (b.predicted && b.predicted.recoveryRate != null ? b.predicted.recoveryRate
    : (b.predictedRecoveryRate != null ? b.predictedRecoveryRate : null));
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
function confidenceOf(b) {
  const v = b && (b.confidence != null ? b.confidence
    : (b.observed && b.observed.confidence != null ? b.observed.confidence : null));
  return typeof v === 'number' && Number.isFinite(v) ? clamp(v, 0, 1) : 0;
}

// The shrinkage-capped blend of a raw estimate toward the population prior (Art 16).
// `cap` is a FRACTION of the population prior; the population prior is the anchor.
function shrink(rawEstimate, pop, cap) {
  const bound = Math.abs(cap * pop);
  return pop + clamp(rawEstimate - pop, -bound, bound);
}

/**
 * @param {Array}  blockOutcomeHistory  chronological block-outcome rows (oldest → newest)
 * @param {number} [populationPrior=1]  the recoveryRate population prior (the floor; ≈1.0 mean)
 * @param {object} [opts]
 *   opts.current   — the previous promotion result (or an athlete model's learnedPriors),
 *                    used ONLY to know whether a LEARNED prior currently exists (demotion).
 *                    Accepts { tier:'learned' } | { provenance:{tier} } | { learnedPriors:{recoveryRate} }.
 *   opts.thresholds — partial override of PROMOTION_DEFAULTS (test seams).
 * @returns {{ learnedPriors: object, staged: object, provenance: object }}
 *   learnedPriors — { recoveryRate: { value, source:'learned', confidence } } ONLY on promotion,
 *                   else {} (nothing arms the D7 steer — additive-first / TR-05).
 *   staged        — { recoveryRate: { value, source:'staged', confidence, prediction, hit } } when
 *                   an estimate exists but is not learned; {} once learned or with no evidence.
 *   provenance    — the three-tier stamp (tier + evidence count + gates + versions; EDS §25).
 */
export function promoteFromOutcomes(blockOutcomeHistory, populationPrior = 1, opts = {}) {
  const T = { ...PROMOTION_DEFAULTS, ...(opts.thresholds || {}) };
  const pop = typeof populationPrior === 'number' && Number.isFinite(populationPrior) ? populationPrior : 1;
  const stamp = {
    engineVersion: ENGINE_VERSION,
    knowledgeSetVersion: KNOWLEDGE_SET_VERSION,
    methodId: METHOD_ID,
    methodVersion: PROMOTION_POLICY_VERSION,
  };

  // Was a LEARNED recoveryRate prior in force before this pass? (drives demotion, §2/§d)
  const cur = opts.current || null;
  const wasLearned = !!(cur && (
    cur.tier === 'learned'
    || (cur.provenance && cur.provenance.tier === 'learned')
    || (cur.learnedPriors && cur.learnedPriors.recoveryRate)
  ));

  // ── Empty / no evidence → population tier, byte-identical (additive-first) ──
  const history = Array.isArray(blockOutcomeHistory) ? blockOutcomeHistory.filter(Boolean) : [];
  if (history.length === 0) {
    return {
      learnedPriors: {},
      staged: {},
      provenance: {
        quantity: 'recoveryRate', tier: 'population', evidenceCount: 0, predictiveBlocks: 0,
        gateA: false, gateB: false, confidence: 'low', populationPrior: pop,
        rationale: 'no block-outcome evidence — population recovery prior (steer OFF, byte-identical).',
        ...stamp,
      },
    };
  }

  // Chronological order (oldest → newest). Stable on period_end when present; input order otherwise.
  const ordered = history
    .map((b, i) => ({ b, i, key: (b.period_end || b.periodEnd || '') }))
    .sort((a, z) => (a.key && z.key ? a.key.localeCompare(z.key) : a.i - z.i))
    .map((x) => x.b);

  const observedSignals = ordered.map(observedOf);           // per block, or null (abstain source)
  const confidences = ordered.map(confidenceOf);
  const testable = observedSignals.filter((v) => v != null); // blocks that actually produced a signal

  // The running staged estimate: the shrinkage-capped mean of the observed signals SEEN SO FAR.
  // Prediction entering block i uses ONLY blocks strictly before i (Art 12 anti-circularity):
  // the prior "predicted before observed" — it never sees the block it is judged on.
  function runningEstimate(upToExclusive) {
    const seen = observedSignals.slice(0, upToExclusive).filter((v) => v != null);
    if (seen.length === 0) return pop; // cold-start prediction = the honest population prior
    const mean = seen.reduce((a, v) => a + v, 0) / seen.length;
    return shrink(mean, pop, T.shrinkageBase);
  }

  // Score falsifiability per block. Block 0 establishes the first staged estimate and is not
  // scored (no staged prior exists ENTERING it). Blocks 1..N-1 test the staged prior.
  //   hit     — the prediction matched the observed signal within tolerance
  //   miss    — a clear misprediction (beyond tolerance)
  //   abstain — the block produced no interpretable signal (null observed OR confidence < floor)
  const tol = Math.abs(T.predictionTolerance * pop);
  const scores = ordered.map((b, i) => {
    if (i === 0) return 'seed';
    const obs = observedSignals[i];
    if (obs == null || confidences[i] < T.blockInterpretFloor) return 'abstain';
    const pred = stampedPredictionOf(b) != null ? stampedPredictionOf(b) : runningEstimate(i);
    return Math.abs(pred - obs) <= tol ? 'hit' : 'miss';
  });

  const predictiveBlocks = scores.filter((s) => s === 'hit').length;
  // The most recent block that actually TESTED the prior (skips trailing abstains) — this is
  // what the DEMOTION decision reads: a trailing abstain must not hide a real prior miss.
  let lastTestable = null;
  for (let i = scores.length - 1; i >= 1; i--) {
    if (scores[i] === 'hit' || scores[i] === 'miss') { lastTestable = scores[i]; break; }
  }
  // The NEWEST block's own score — reported in provenance so a hold on a trailing abstain reads
  // honestly as 'abstain' (the block could not test the prior), even when earlier blocks held it.
  const newestScore = scores[scores.length - 1];

  // Composed confidence of the staged estimate (mean per-block confidence over testable blocks).
  const composedConf = testable.length
    ? clamp(confidences.filter((_, i) => observedSignals[i] != null).reduce((a, c) => a + c, 0) / testable.length, 0, 1)
    : 0;

  // The raw learned estimate (before shrinkage) and its widening cap (widens with predictive blocks).
  const rawEstimate = testable.length ? testable.reduce((a, v) => a + v, 0) / testable.length : pop;
  const cap = clamp(
    T.shrinkageBase + Math.max(0, predictiveBlocks - T.gateAMinBlocks) * T.shrinkageWiden,
    T.shrinkageBase, T.shrinkageMax,
  );
  const effective = shrink(rawEstimate, pop, cap);

  // ── Gate A — evidence sufficiency ──
  const gateA = ordered.length >= T.gateAMinBlocks && composedConf >= T.confidenceFloor;
  // ── Gate B — falsifiability: the last testable block is a HIT, with an earlier corroborating
  //    hit (recommended option: "most recent within tolerance, ≥1 earlier block not contradicting").
  const gateB = lastTestable === 'hit' && predictiveBlocks >= 2;

  const stagedField = (extra = {}) => ({
    recoveryRate: {
      value: effective, source: 'staged', confidence: tierOf(composedConf),
      prediction: runningEstimate(ordered.length), ...extra,
    },
  });
  const learnedConfidence = (predictiveBlocks >= T.highConfBlocks && composedConf >= T.highConfFloor)
    ? 'high' : 'moderate';
  const learnedField = () => ({
    recoveryRate: { value: effective, source: 'learned', confidence: learnedConfidence },
  });
  const shrinkageMeta = { populationPrior: pop, rawEstimate, cap, effective };

  // ── DEMOTION (asymmetric hysteresis) — evaluated FIRST when a learned prior is in force ──
  if (wasLearned) {
    if (lastTestable === 'miss') {
      // Fast demote: the first clear misprediction returns the prior to staged/population.
      return {
        learnedPriors: {},
        staged: stagedField(),
        provenance: {
          quantity: 'recoveryRate', tier: 'staged', demotedFrom: 'learned',
          evidenceCount: ordered.length, predictiveBlocks, gateA, gateB: false,
          confidence: tierOf(composedConf), shrinkage: shrinkageMeta,
          rationale: 'DEMOTED — the learned recovery prior mispredicted the last block; reverted to '
            + 'population deload rhythm (steer OFF). Must re-earn all gates.',
          ...stamp,
        },
      };
    }
    // A HIT or an ABSTAIN keeps the learned prior (an abstain never demotes, §3 step 4).
    return {
      learnedPriors: learnedField(),
      staged: {},
      provenance: {
        quantity: 'recoveryRate', tier: 'learned',
        evidenceCount: ordered.length, predictiveBlocks, gateA, gateB,
        confidence: learnedConfidence, shrinkage: shrinkageMeta,
        held: newestScore === 'abstain' ? 'abstain' : 'predictive',
        rationale: newestScore === 'abstain'
          ? 'HELD learned — the last block could not test the prior (abstain); no demotion.'
          : 'HELD learned — the recovery prior predicted the last block; deload steer stays armed.',
        ...stamp,
      },
    };
  }

  // ── PROMOTION — not currently learned: promote only when BOTH gates pass ──
  if (gateA && gateB) {
    return {
      learnedPriors: learnedField(),
      staged: {},
      provenance: {
        quantity: 'recoveryRate', tier: 'learned',
        evidenceCount: ordered.length, predictiveBlocks, gateA: true, gateB: true,
        confidence: learnedConfidence, shrinkage: shrinkageMeta,
        rationale: `PROMOTED — ${ordered.length} blocks, ${predictiveBlocks} predictive; the staged `
          + `recovery prior predicted the last block. Learned value ${effective.toFixed(3)} `
          + `(≤${Math.round(cap * 100)}% off population ${pop}). D7 deload steer now arms for this athlete.`,
        ...stamp,
      },
    };
  }

  // ── STAGED — evidence exists but has not earned the steer (steers NOTHING) ──
  return {
    learnedPriors: {},
    staged: stagedField({ hit: lastTestable === 'hit' }),
    provenance: {
      quantity: 'recoveryRate', tier: 'staged',
      evidenceCount: ordered.length, predictiveBlocks, gateA, gateB,
      confidence: tierOf(composedConf), shrinkage: shrinkageMeta,
      rationale: !gateA
        ? `STAGED — ${ordered.length}/${T.gateAMinBlocks} blocks or confidence ${composedConf.toFixed(2)} `
          + `below the moderate floor (Gate A unmet). Private estimate; steer OFF.`
        : 'STAGED — evidence sufficient but the staged prior did not predict the last block '
          + '(Gate B unmet). Private estimate; steer OFF.',
      ...stamp,
    },
  };
}

export default { promoteFromOutcomes, PROMOTION_DEFAULTS, PROMOTION_POLICY_VERSION };
