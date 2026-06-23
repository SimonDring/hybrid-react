/**
 * Evidence knowledge base — the single, traceable home for the scientific constants
 * and positions the engine relies on. Each entry follows the KnowledgeEntry schema
 * (./schema.js). Engine modules read VALUES via ./kb.js; reviewers read the
 * provenance. Updating the science = editing an entry here, not engine logic.
 *
 * Confidence is honest: contested numbers (the ACWR thresholds) are tagged 'low' so
 * the engine — and any future AI layer — treats them as soft inputs. The reasoning
 * and citations live in docs/engine/01-PANEL-REVIEW.md (§3, §13, §15).
 *
 * This is the first migration (roadmap Phase 1). `volume.landmarks` and the
 * `load.acwr.*` thresholds are now SOURCED here (the engine reads them); other
 * thresholds (readiness bands, taper, level/style scalars) will migrate next.
 */

/** @type {import('./schema.js').KnowledgeEntry[]} */
export const ENTRIES = [
  // ── Volume ──────────────────────────────────────────────────────────────────
  {
    id: 'volume.landmarks',
    rule: 'Weekly hard-set landmarks per muscle (MEV/MAV/MRV), general-trainee mid-range.',
    value: {
      chest:      { mev: 8,  mav: 16, mrv: 22 },
      back:       { mev: 10, mav: 18, mrv: 25 },
      shoulders:  { mev: 8,  mav: 18, mrv: 26 },
      biceps:     { mev: 6,  mav: 14, mrv: 20 },
      triceps:    { mev: 6,  mav: 14, mrv: 20 },
      quads:      { mev: 8,  mav: 16, mrv: 20 },
      hamstrings: { mev: 6,  mav: 13, mrv: 18 },
      glutes:     { mev: 6,  mav: 14, mrv: 20 },
      calves:     { mev: 6,  mav: 13, mrv: 20 },
      core:       { mev: 0,  mav: 16, mrv: 25 }
    },
    evidenceLevel: 'L5',
    source: 'Renaissance Periodisation / Israetel landmarks; dose-response support: Schoenfeld 2017, Pelland 2024 (Sports Medicine)',
    confidence: 'moderate',
    lastReviewed: '2026-06-23',
    appliesTo: ['volume', 'targets', 'allocator']
  },
  {
    id: 'volume.dose_response',
    rule: 'More weekly volume raises hypertrophy & strength with diminishing returns; count fractional (synergist-weighted) sets. MRV is a recoverability / diminishing-returns guide, not a hard cliff.',
    value: { diminishingReturns: true, fractionalSets: true },
    evidenceLevel: 'L1',
    source: 'Pelland et al. 2024/25, Sports Medicine (meta-regression, 67 studies); Schoenfeld, Ogborn & Krieger 2017',
    confidence: 'high',
    lastReviewed: '2026-06-23',
    appliesTo: ['volume', 'allocator']
  },

  // ── Training load ─────────────────────────────────────────────────────────────
  {
    id: 'load.acwr.thresholds',
    rule: 'ACWR bands used by the week-level load decision (sweet-spot 0.8–1.3, high 1.5).',
    value: { sweetLow: 0.8, easeFrom: 1.3, high: 1.5 },
    evidenceLevel: 'L2',
    source: 'Gabbett 2016 (origin); CRITIQUED — Impellizzeri 2019 (BJSM) & 2020 (Sports Medicine), Lolli et al. (mathematical coupling → spurious correlation)',
    confidence: 'low',
    lastReviewed: '2026-06-23',
    appliesTo: ['load']
  },
  {
    id: 'load.acwr.policy',
    rule: 'How the load decision scales volume from ACWR (deload/ease/nudge) and the combined readiness×load floor.',
    value: { deloadMultiplier: 0.5, easeSlope: 0.3, nudgeUp: 1.0, sustainedDays: 3, combinedFloor: 0.5 },
    evidenceLevel: 'L5',
    source: 'Internal heuristic layered on the (contested) ACWR signal — see load.acwr.validity',
    confidence: 'low',
    lastReviewed: '2026-06-23',
    appliesTo: ['load']
  },
  {
    id: 'load.acwr.validity',
    rule: 'ACWR is mathematically coupled (acute ⊂ chronic) → spurious correlation; the "sweet spot" figure is flawed. Treat ACWR as ONE soft, low-confidence input, never a hard injury gate; prefer absolute load + week-on-week change.',
    value: 'soft-input',
    evidenceLevel: 'L2',
    source: 'Impellizzeri et al. 2019 (BJSM) & 2020 (Sports Medicine, "Conceptual Issues and Fundamental Pitfalls"); Lolli et al.',
    confidence: 'low',
    lastReviewed: '2026-06-23',
    appliesTo: ['load']
  },

  // ── Recovery / readiness ──────────────────────────────────────────────────────
  {
    id: 'readiness.subjective_priority',
    rule: 'Subjective wellness (sleep quality, soreness, mood, stress, energy) is at least as sensitive as objective HRV/RHR for monitoring load response — weight it ≥ objective signals, and combine.',
    value: true,
    evidenceLevel: 'L1',
    source: 'Saw, Main & Gastin 2016, BJSM (systematic review)',
    confidence: 'high',
    lastReviewed: '2026-06-23',
    appliesTo: ['recovery']
  },

  // ── Injury prevention protocols ───────────────────────────────────────────────
  {
    id: 'prevention.copenhagen_groin',
    rule: 'The Copenhagen adduction programme reduces groin-problem risk (~41% in male footballers) — adductor eccentric strengthening, 3×/wk pre-season then 1×/wk in-season, 3 progression levels.',
    value: { riskReduction: 0.41 },
    evidenceLevel: 'L3',
    source: 'Harøy et al. 2019, BJSM (cluster-RCT); supported by adductor-strength reviews',
    confidence: 'high',
    lastReviewed: '2026-06-23',
    appliesTo: ['injury', 'prevention']
  },
  {
    id: 'prevention.nordic_hamstring',
    rule: 'Nordic hamstring exercise reduces hamstring-injury risk — popular meta-analysis ~51%, but a stricter-methodology reappraisal was inconclusive (GRADE: conditionally recommended). Eccentric loading; adherence-limited.',
    value: { riskReduction: 'conditional' },
    evidenceLevel: 'L1',
    source: 'van Dyk et al. 2019 (meta ~51%); methodological reappraisal (inconclusive); 2024 umbrella review (GRADE conditional)',
    confidence: 'moderate',
    lastReviewed: '2026-06-23',
    appliesTo: ['injury', 'prevention']
  },
  {
    id: 'prevention.neuromuscular_acl',
    rule: 'Neuromuscular warm-up programmes (e.g. FIFA 11+) reduce injury ~30–57% (incl. ~52% knee; pronounced female ACL benefit) — strength + balance + plyometric control. Efficacy is strong but adherence-dependent.',
    value: { riskReduction: [0.30, 0.57] },
    evidenceLevel: 'L1',
    source: 'FIFA 11+ systematic reviews & meta-analyses; Webster & Hewett (ACL)',
    confidence: 'high',
    lastReviewed: '2026-06-23',
    appliesTo: ['injury', 'prevention']
  }
];

export default ENTRIES;
