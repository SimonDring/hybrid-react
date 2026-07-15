/**
 * The D14 validation-report CONSUMER REGISTRY (TR-02 / M4a T4;
 * 13-VALIDATION-STRATEGY §8.3 — "every validation product declares its
 * consumers at registration, and a product with zero consumers fails the
 * build").
 *
 * The pin's exact defect: the D14 report (5/16 validators live, everything
 * computed) reached zero screens — "computed-but-unread is a detected
 * defect" (audit 06 TR-02). A validator suite that nobody reads is worse than
 * no suite: it *looks* like a guarantee while guaranteeing nothing was ever
 * seen. This registry makes that class of defect STRUCTURAL rather than
 * cultural — every named validation product must declare who reads it, and
 * `assertEveryProductHasConsumers` (run in the engine suite, below) fails the
 * build the moment a product's consumer list goes empty, whether because a
 * new product was added without a reader or an existing consumer was deleted.
 *
 * A "consumer" here is a documented reader (a screen/hook path, or another
 * named surface — a CI report, a coach dashboard, etc.), not a runtime
 * telemetry proof that a human looked today. The check is structural
 * (wired to something) — usage/adherence to what's rendered is a product
 * question, not this gate's job.
 */

// id → { description, consumers: string[] } — one entry per DISTINCT validation
// product the engine ships. Both entries below are read by the same explainValidation
// projection (contract.js) and the same screen; they are still two products
// because they carry different context (pure baseline vs. shipped/runtime) and
// could, in principle, gain independent consumers later.
export const VALIDATION_PRODUCTS = {
  'meta.validation': {
    description: 'PlanGenerator\'s per-week D14 report on the pure baseline plan (profile-known context only, e.g. equipment/duration/purpose — generatePlan is injury-blind). Each problem week carries findings + resolutions + an explainValidation()-shaped render-ready summary (M4b: including `observations` — the report-only observer wave).',
    consumers: [
      'apps/mobile/src/screens/WeekDetail.jsx — "Why your plan was trimmed" banner + "Coaching notes" (observations), reading week._validation, the runtime analogue of this same report',
    ],
  },
  'week._validation': {
    description: 'PlanService\'s shipped-artefact D14 report (reflowed + injury-filtered, active injuries in ctx; M4a T2 enforcement removals + T3 resolution records included; M4b report-only `observations`). What the athlete actually trains, validated.',
    consumers: [
      'apps/mobile/src/screens/WeekDetail.jsx — "Why your plan was trimmed" banner + "Coaching notes" (report-only observations), rendered from explainValidation(week._validation)',
    ],
  },
};

/**
 * Assert every registered validation product has at least one declared
 * consumer. THROWS (rather than returning a boolean) so nothing upstream can
 * silently swallow a failure — the test suite calls this directly and its
 * own throw fails the file (run-engine.mjs convention: a non-zero exit fails
 * the gate).
 * @param {object} [products] — defaults to VALIDATION_PRODUCTS. A caller may
 *   pass a synthetic registry — this is how the suite proves the check
 *   actually discriminates (a product with an empty consumers array must
 *   throw), rather than trivially passing because the real registry happens
 *   to be populated.
 * @returns {true} when every product has ≥1 consumer.
 */
export function assertEveryProductHasConsumers(products = VALIDATION_PRODUCTS) {
  const entries = Object.entries(products || {});
  if (entries.length === 0) {
    throw new Error('the validation-product registry is empty — a validation surface that declares no products cannot prove any of them are read');
  }
  const zero = entries
    .filter(([, p]) => !p || !Array.isArray(p.consumers) || p.consumers.length === 0)
    .map(([id]) => id);
  if (zero.length) {
    throw new Error(
      `zero-consumer validation product(s) — a computed report with no declared reader is the TR-02 defect (13-VALIDATION-STRATEGY §8.3): ${zero.join(', ')}`
    );
  }
  return true;
}

export default { VALIDATION_PRODUCTS, assertEveryProductHasConsumers };
