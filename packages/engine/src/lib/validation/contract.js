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

// ── P0-3 · the D14 injury-veto GATE (engine-audit 09; EDS §37 tier 1) ─────────
// Executes EXACTLY what the report vetoed: items named by tier-1
// injury.contraindication findings whose verdict SURVIVED the authority cap as
// 'veto' (Art 13 — if the knowledge entry were ever downgraded below 'gate',
// nothing is removed). Pure: the input week is never mutated; sessions are
// cloned only where an item actually comes out. The same working-item guards
// the validator applied (no primer, no struck, no rehab-prescribed work) keep
// the gate's reach identical to the report's.
function applyInjuryVetoes(week, findings) {
  const vetoes = findings.filter((f) =>
    f.validatorId === injuryContraindicationValidator.id && f.verdict === 'veto' && f.detail && f.detail.item);
  if (!vetoes.length) return { week, removed: [] };
  // detail.session is the session title the validator stamped — group by it.
  const bySession = new Map();
  for (const f of vetoes) {
    if (!bySession.has(f.detail.session)) bySession.set(f.detail.session, new Map());
    bySession.get(f.detail.session).set((f.detail.item || '').toLowerCase(), f.reason);
  }
  const removed = [];
  const sessions = (week.sessions || []).map((s) => {
    const flagged = bySession.get(s.title);
    if (!flagged) return s;
    const items = (s.items || []).filter((it) => {
      const working = it.section !== 'primer' && !it.substituted && it.tag !== 'rehab' && !/pain-free/i.test(it.name || '');
      const hit = working && flagged.has((it.name || '').toLowerCase());
      if (hit) removed.push({ session: s.title, item: it.name, reason: flagged.get((it.name || '').toLowerCase()) });
      return !hit;
    });
    return items.length === (s.items || []).length ? s : { ...s, items };
  });
  return removed.length ? { week: { ...week, sessions }, removed } : { week, removed };
}

/**
 * Run every registered validator over one constructed week.
 * @param {object} week — { sessions: [...] } in the generated shape
 * @param {object} ctx — optional context (athlete state, options) validators read.
 *   ctx.enforceInjuryVetoes (P0-3, DEFAULT OFF — promotion is Simon's I5 call):
 *   a PURE input threaded by the caller, never an env read in the engine. When
 *   true, tier-1 injury vetoes are ENFORCED — the named items are removed from a
 *   cloned week, each removal recorded by name in `report.enforced.removed`, and
 *   the suite re-runs on what actually ships (`report.week`) so the report proves
 *   the shipped artefact — an emptied session still draws the shipped-empty veto
 *   (Art 15: enforcement may never strand an athlete silently).
 * @returns {{ pass: boolean, findings: object[], counts: {pass,trim,veto} }}
 *   — plus { enforced: {removed: []}, week } ONLY when enforcement is on.
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
  const report = { pass: counts.veto === 0 && counts.trim === 0, findings, counts };
  // Flag OFF (the default everywhere): report-only — today's behaviour, byte-identical.
  if (!ctx.enforceInjuryVetoes) return report;
  const { week: gated, removed } = applyInjuryVetoes(week, findings);
  if (!removed.length) return { ...report, enforced: { removed }, week };
  // Re-prove the SHIPPED week (flag off — enforcement ran; recursion stops here).
  const finalReport = validateWeek(gated, { ...ctx, enforceInjuryVetoes: false });
  return { ...finalReport, enforced: { removed }, week: gated };
}

export default { VALIDATORS, validateWeek };
