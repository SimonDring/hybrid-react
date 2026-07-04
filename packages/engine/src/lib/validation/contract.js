/**
 * validation — the independent floor every constructed week must pass (D14).
 *
 * Constitution Art 19 / EDS §35: construction and validation are separate powers.
 * The greedy fill (and one day the AI seam, or a human override) may build a week
 * however it likes — a separable validator suite then judges the result. Today the
 * deterministic constructor also enforces most constraints in-loop for efficiency;
 * the validators are the AUTHORITATIVE, independently-testable statement of the
 * rules, and the report is the proof a week complies. Construction proposes,
 * validators dispose.
 *
 * A validator is a pure object:
 *   { id,                    dotted id, e.g. 'volume.mrv-ceiling'
 *     knowledgeId,           the KB entry whose science it enforces (drives authority)
 *     run(week, ctx) →       findings: [{ verdict, reason, detail? }] — [] = pass }
 *
 * Verdicts: 'pass' | 'trim' (the week over-delivers and must be scaled — the
 * maximum verdict a 'soft'-authority rule can issue) | 'veto' (the week is unsafe
 * or incoherent and may not ship — reserved for 'gate'-authority rules, e.g.
 * injury contraindication). A validator's ceiling verdict comes from its knowledge
 * entry via knowledge/authority.js — contested science cannot veto (Art 13).
 *
 * validateWeek(week, ctx) runs the registry and returns a ValidationReport:
 *   { pass, findings: [{ validatorId, verdict, authority, confidence, reason, detail }],
 *     counts: { pass, trim, veto } }
 */
import kb from '../knowledge/kb.js';
import { authorityOf } from '../knowledge/authority.js';
import { mrvCeilingValidator } from './mrvValidator.js';
import { injuryContraindicationValidator, durationHonestyValidator, equipmentValidator, purposeCoherenceValidator } from './validators.js';

// EDS §37 — the fixed conflict-resolution priority order ("the Engine Laws,
// compiled"). Higher tiers win ABSOLUTELY; confidence modulates within a tier,
// never across. Every validator declares its tier; the report is sorted by it.
export const CONFLICT_ORDER = [
  'SAFETY & LAW',        // 1 — never an unsafe or contraindicated prescription
  'SPORT PROTECTION',    // 2 — never compromise the sport (L1)
  'RECOVERABILITY',      // 3 — never exceed capacity (L3)
  'ATHLETE INTENT',      // 4 — honour committed choices + stated constraints (L10)
  'OBJECTIVE FIDELITY',  // 5 — serve the objective as fully as the above allow
  'OPTIMISATION'         // 6 — efficiency, balance, variety, preference
];

// The registry, in tier order.
export const VALIDATORS = [
  injuryContraindicationValidator,   // tier 1
  mrvCeilingValidator,               // tier 3
  durationHonestyValidator,          // tier 4
  equipmentValidator,                // tier 4
  purposeCoherenceValidator          // tier 5
];

// A verdict may never exceed what the validator's knowledge authority allows:
// reported → pass-only (it can observe, not act), soft → trim, gate → veto.
const CEILING = { reported: 'pass', soft: 'trim', gate: 'veto' };
const SEVERITY = { pass: 0, trim: 1, veto: 2 };
function capVerdict(verdict, authority) {
  const cap = CEILING[authority] || 'pass';
  return SEVERITY[verdict] > SEVERITY[cap] ? cap : verdict;
}

/**
 * Run every registered validator over one constructed week.
 * @param {object} week — { sessions: [...] } in the generated shape
 * @param {object} ctx — optional context (athlete state, options) validators read
 * @returns {{ pass: boolean, findings: object[], counts: {pass,trim,veto} }}
 */
export function validateWeek(week, ctx = {}) {
  const findings = [];
  const counts = { pass: 0, trim: 0, veto: 0 };
  for (const v of VALIDATORS) {
    const entry = kb.get(v.knowledgeId);
    const authority = authorityOf(entry);
    const tier = v.tier || 6;
    const raw = v.run(week, ctx) || [];
    if (raw.length === 0) {
      counts.pass++;
      findings.push({ validatorId: v.id, tier, verdict: 'pass', authority, confidence: entry.confidence, reason: null });
      continue;
    }
    for (const f of raw) {
      const verdict = capVerdict(f.verdict, authority);
      counts[verdict]++;
      findings.push({ validatorId: v.id, tier, verdict, authority, confidence: entry.confidence, reason: f.reason, detail: f.detail });
    }
  }
  // Highest-priority problem first (§37: lower tier number wins), then by severity.
  findings.sort((a, b) => (a.tier - b.tier) || (SEVERITY[b.verdict] - SEVERITY[a.verdict]));
  return { pass: counts.veto === 0 && counts.trim === 0, findings, counts };
}

export default { VALIDATORS, validateWeek };
