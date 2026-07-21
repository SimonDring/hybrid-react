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
import { REPORT_ONLY_OBSERVERS } from './observers.js';

// ── The Wave-B REPORT-ONLY net (13-VALIDATION-STRATEGY §4.3; Phase 3 M2 T1) ────
// progression-sanity + dose-coherence are members of the D14 suite that OBSERVE but
// never dispose: they speak `severity`, not the trim/veto verdict vocabulary the gate
// (applyInjuryVetoes) reads, so by construction they cannot trim, veto, or gate a plan
// (the report → flag → gate ladder is M4). They are deliberately NOT in the enforcing
// VALIDATORS array below and NOT run by generatePlan's meta.validation — `validatePlanProgression`
// is a separate advisory surface, so plans stay byte-identical with or without them
// (the golden master proves it). Re-exported here so the D14 suite is discoverable
// from one module.
export {
  progressionSanityValidator,
  doseCoherenceValidator,
  REPORT_ONLY_VALIDATORS,
  validatePlanProgression
} from './progression.js';

// ── The M4b REPORT-ONLY observer wave (observers.js) ──────────────────────────
// Five D14 members that OBSERVE but never dispose (spec 2026-07-15). validateWeek
// runs them below the enforcing VALIDATORS and stamps every finding verdict 'note'
// — a class that never touches counts.trim/veto, so report.pass is untouched and no
// plan moves (the golden master proves byte-identity). Re-exported so the whole D14
// suite is discoverable from this one module.
export {
  sportProtectionObserver,
  mevFloorObserver,
  doseCoherenceObserver,
  progressionSanityObserver,
  deloadPresenceObserver,
  equipmentDetailCoverageObserver,
  REPORT_ONLY_OBSERVERS
} from './observers.js';

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
// 'note' is the REPORT-ONLY verdict (M4b observers) — severity 0, exactly like 'pass',
// so it never wins a conflict and never counts as a trim/veto. It differs from 'pass'
// only in that it CARRIES a reason to surface (an observation), where 'pass' is silence.
const SEVERITY = { pass: 0, note: 0, trim: 1, veto: 2 };
function capVerdict(verdict, authority) {
  const cap = CEILING[authority] || 'pass';
  return SEVERITY[verdict] > SEVERITY[cap] ? cap : verdict;
}

// The SAFETY & LAW class is conflict tier 1 (CONFLICT_ORDER[0]) — the only class
// whose vetoes DISPOSE (M4a: safety-only enforcement, Simon 2026-07-15). Keying
// the gate on the TIER, not one validator id, is what makes the enforcement
// class-based: injury contraindication (safety) AND any lawfulness-class validator
// (law) added to tier 1 both dispose; every non-safety tier stays report-only.
const SAFETY_AND_LAW_TIER = 1;

// ── P0-3 / M4a I5 · the D14 SAFETY & LAW veto GATE (engine-audit 09; EDS §37 tier 1) ─
// Executes EXACTLY what the report vetoed: items pinned by tier-1 (SAFETY & LAW)
// findings whose verdict SURVIVED the authority cap as 'veto' (Art 13 — if the
// knowledge entry were ever downgraded below 'gate', nothing is removed). The
// injury-contraindication finding is identity-keyed at source (M4a T2: the
// validator resolves each item by exId and tests id/pattern, not the display
// name), so a rename or a novel exercise can't slip a contraindicated lift past.
// Removal is keyed on the finding's detail.sessionIndex + detail.itemIndex
// (positions in week.sessions[..].items[..], stamped by the validator) — never on
// titles or names, so duplicate session titles or same-name items can never widen
// the removal beyond what the report named (whole-branch review 2026-07-13). A
// finding without integer indexes is not enforced (it stays reported — the gate
// never guesses which occurrence). Pure: the input week is never mutated; sessions
// are cloned only where an item actually comes out. The same working-item guards
// the validator applied (no primer, no struck, no rehab-prescribed work) keep the
// gate's reach within the report's even for hand-built findings. Exported: this is
// the gate's contract surface (Art 19 — findings are authoritative wherever they
// come from), tested directly in tests/injury-veto-gate.js.
export function applyInjuryVetoes(week, findings) {
  const vetoes = findings.filter((f) =>
    f.tier === SAFETY_AND_LAW_TIER && f.verdict === 'veto' && f.detail
    && Number.isInteger(f.detail.sessionIndex) && Number.isInteger(f.detail.itemIndex));
  if (!vetoes.length) return { week, removed: [] };
  const bySession = new Map(); // sessionIndex → Map(itemIndex → reason)
  for (const f of vetoes) {
    if (!bySession.has(f.detail.sessionIndex)) bySession.set(f.detail.sessionIndex, new Map());
    bySession.get(f.detail.sessionIndex).set(f.detail.itemIndex, f.reason);
  }
  const removed = [];
  const sessions = (week.sessions || []).map((s, si) => {
    const flagged = bySession.get(si);
    if (!flagged) return s;
    const items = (s.items || []).filter((it, ii) => {
      const working = it.section !== 'primer' && !it.substituted && it.tag !== 'rehab' && !/pain-free/i.test(it.name || '');
      const hit = working && flagged.has(ii);
      if (hit) removed.push({ session: s.title, item: it.name, reason: flagged.get(ii) });
      return !hit;
    });
    return items.length === (s.items || []).length ? s : { ...s, items };
  });
  return removed.length ? { week: { ...week, sessions }, removed } : { week, removed };
}

// ── C1 · the conflict-order RESOLUTION PASS (02-COACHING-PIPELINE §3; EDS §37;
// Constitution "When principles conflict") ───────────────────────────────────
// At the audit pin the Constitution's tier order "exists nowhere as code … when
// two soft rules clash, the winner is whichever line runs later — undocumented"
// (engine-audit 02 §3). This pass makes it EXPLICIT and TESTABLE: when ≥2 non-pass
// verdicts land on the SAME item/slot, it resolves them by the Constitution's fixed
// order and emits a RESOLUTION RECORD naming which verdict won, its tier, and why.
//
// The rule (Constitution "When principles conflict", verbatim; §3.2):
//   1. Across tiers: ABSOLUTE. A lower tier NUMBER defeats every higher number
//      regardless of confidence — no optimisation confidence overrides a safety gate
//      (1 > 5); volume trims below target to stay recoverable (3 > 5).
//   2. Within a tier: CONFIDENCE decides — the higher-confidence verdict prevails.
//   3. Within a tier at equal confidence: the CONSERVATIVE (more restrictive) verdict
//      wins — never "whichever line runs later" (the audit's exact defect).
// Confidence is consulted ONLY inside a tier, NEVER across the boundary — the
// absolute-across-tiers invariant (§3.2; property-tested in conflict-resolution.test.mjs).
// Pure: a function of tier-tagged findings alone (no clock, no random, no mutation).
const CONFIDENCE_RANK = { high: 3, moderate: 2, low: 1, reported: 0 };
const confValue = (c) => (typeof c === 'number' ? c : (CONFIDENCE_RANK[c] ?? 0));

// The slot two verdicts must share to "conflict". Item-level first (a single
// exercise), then session-level, then the volume ledger's muscle — never guessed:
// a finding with no locatable slot cannot be shown to contest another and is skipped.
function conflictKey(f) {
  const d = f.detail || {};
  if (d.session != null && d.item != null) return `item::${d.session}::${d.item}`;
  if (Number.isInteger(d.sessionIndex) && Number.isInteger(d.itemIndex)) return `item#${d.sessionIndex}.${d.itemIndex}`;
  if (d.session != null) return `session::${d.session}`;
  if (d.muscle != null) return `muscle::${d.muscle}`;
  return null;
}

const tierName = (tier) => CONFLICT_ORDER[tier - 1] || `tier ${tier}`;

// Resolve one group of ≥2 competing verdicts on a single slot → { winner, rule }.
// The winner is ALWAYS drawn from the lowest tier number present, so a higher-number
// item can never prevail no matter its confidence (rule 1). Confidence is read only
// among the joint-lowest-tier contenders (rule 2); a same-confidence tie falls to the
// more conservative verdict (rule 3), first-seen for determinism.
function pickWinner(group) {
  const minTier = Math.min(...group.map((f) => f.tier));
  const contenders = group.filter((f) => f.tier === minTier);
  if (contenders.length === 1) return { winner: contenders[0], rule: 'across-tier' };
  const maxConf = Math.max(...contenders.map((f) => confValue(f.confidence)));
  const top = contenders.filter((f) => confValue(f.confidence) === maxConf);
  if (top.length === 1) return { winner: top[0], rule: 'within-tier-confidence' };
  const maxSev = Math.max(...top.map((f) => SEVERITY[f.verdict] ?? 0));
  return { winner: top.find((f) => (SEVERITY[f.verdict] ?? 0) === maxSev), rule: 'within-tier-conservative' };
}

function whyText(rule, tier) {
  const name = tierName(tier);
  if (rule === 'across-tier') return `${name} (tier ${tier}) wins absolutely — a higher tier defeats every lower tier regardless of confidence`;
  if (rule === 'within-tier-confidence') return `${name} (tier ${tier}): the higher-confidence verdict prevails within the tier`;
  return `${name} (tier ${tier}): equal confidence — the more conservative (more restrictive) verdict wins`;
}

function resolutionRecord(slot, group, winner, rule) {
  return {
    slot,
    conflict: group.map((f) => ({ source: f.validatorId, tier: f.tier, verdict: f.verdict, confidence: f.confidence ?? null })),
    winner: { source: winner.validatorId, tier: winner.tier, verdict: winner.verdict, confidence: winner.confidence ?? null, reason: winner.reason },
    tier: winner.tier,
    rule,
    why: whyText(rule, winner.tier),
  };
}

/**
 * The conflict-order resolution pass (pure). Groups non-pass findings by the slot
 * they contest; for every slot with ≥2 competing verdicts emits ONE resolution
 * record (which verdict won, its tier, the rule, and why). Higher tier wins
 * ABSOLUTELY; confidence modulates only WITHIN a tier (§3.2).
 * @param {object[]} findings — tier-tagged findings from validateWeek.
 * @returns {object[]} resolution records, in slot-stable (insertion) order.
 */
export function resolveConflicts(findings) {
  const groups = new Map();
  for (const f of findings || []) {
    // 'pass' is silence; 'note' is a report-only observation (M4b) — neither DISPOSES,
    // so neither can contest another verdict for a slot (an observer never gates).
    if (!f || f.verdict === 'pass' || f.verdict === 'note') continue;
    const key = conflictKey(f);
    if (key == null) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  const records = [];
  for (const [slot, group] of groups) {
    if (group.length < 2) continue;   // a conflict needs ≥2 verdicts on one slot
    const { winner, rule } = pickWinner(group);
    records.push(resolutionRecord(slot, group, winner, rule));
  }
  return records;
}

// Composition with T2's enforcement: each ENFORCED tier-1 removal IS a resolved
// conflict — the SAFETY & LAW veto defeated the construction's implicit proposal to
// SHIP that item to serve the objective (§3.1's "construction proposal", OBJECTIVE
// FIDELITY tier 5). Recording it makes the disposal explicit rather than incidental
// (the safety veto beats the lower-tier objective BY TIER — 1 > 5 — every time).
function enforcementResolutions(findings) {
  return findings
    .filter((f) => f.tier === SAFETY_AND_LAW_TIER && f.verdict === 'veto' && f.detail
      && Number.isInteger(f.detail.sessionIndex) && Number.isInteger(f.detail.itemIndex))
    .map((f) => {
      const shipProposal = {
        validatorId: 'construction.ship', tier: 5, verdict: 'proposal', confidence: null,
        reason: `"${f.detail.item}" ships to serve the session objective`,
      };
      return resolutionRecord(conflictKey(f), [f, shipProposal], f, 'across-tier');
    });
}

// ── TR-02 / M4a T4 · the render-ready validation surface (08-EXPLAINABILITY §5;
// 13-VALIDATION-STRATEGY §8.3) ───────────────────────────────────────────────
// At the audit pin the D14 report computed everything a screen would need and
// reached no screen ("computed-but-unread is a detected defect" — audit 06
// TR-02). `explainValidation` closes that gap the way §5 prescribes: a PURE
// PROJECTION over the trace the report already produced — no re-derivation, no
// new judgement, only reshaping `findings` / `resolutions` / `enforced` into a
// vocabulary a UI can render without knowing validator internals (tier
// numbers, verdict enums, capVerdict). Every entry names its tier in PLAIN
// ENGLISH (tierName) so "why was my plan trimmed" never needs a lookup table
// client-side. Called on PlanGenerator's pure baseline report AND on
// PlanService's shipped per-week report (the runtime artefact, post-injury-
// filter/enforcement) — same function, same shape, both audiences (§5's "one
// derivation, three renderings" pattern, applied to the report specifically).
/**
 * @param {object} report — a ValidationReport from validateWeek (pass, findings,
 *   counts, resolutions, optional enforced.removed).
 * @returns {{ pass: boolean, counts: object, notices: object[],
 *   observations: object[], resolutions: object[], removed: object[] }} —
 *   `notices` is every trim/veto finding (the actionable "why your plan was
 *   trimmed" set) with a plain-English tier name; `observations` is the M4b
 *   REPORT-ONLY 'note' findings (the observer wave — sport-protection, MEV-floor,
 *   dose-coherence, progression-sanity, deload-presence), each with reason + tier
 *   name, kept SEPARATE so the trim/veto banner never conflates an observation
 *   with an action taken; `resolutions` mirrors the C1 records with the same tier
 *   name; `removed` is every enforced (safety) veto, tier-stamped (enforcement is
 *   always tier 1 by construction — see applyInjuryVetoes above). Screens render
 *   straight off this shape.
 */
export function explainValidation(report) {
  const notices = (report.findings || [])
    .filter((f) => f.verdict !== 'pass' && f.verdict !== 'note')
    .map((f) => ({
      tier: f.tier,
      tierName: tierName(f.tier),
      verdict: f.verdict,
      validatorId: f.validatorId,
      reason: f.reason,
      session: (f.detail && f.detail.session != null) ? f.detail.session : null,
      item: (f.detail && f.detail.item != null) ? f.detail.item : null,
    }));
  // M4b: the report-only observations — surfaced with reason + plain-English tier,
  // never mixed into `notices` (they name nothing that was done to the plan).
  const observations = (report.findings || [])
    .filter((f) => f.verdict === 'note')
    .map((f) => ({
      tier: f.tier,
      tierName: tierName(f.tier),
      validatorId: f.validatorId,
      reason: f.reason,
      session: (f.detail && f.detail.session != null) ? f.detail.session : null,
      item: (f.detail && f.detail.item != null) ? f.detail.item : null,
    }));
  const resolutions = (report.resolutions || []).map((r) => ({
    slot: r.slot,
    tier: r.tier,
    tierName: tierName(r.tier),
    rule: r.rule,
    why: r.why,
    winner: { source: r.winner.source, verdict: r.winner.verdict, reason: r.winner.reason },
  }));
  // Enforced removals are always SAFETY & LAW (tier 1) by construction —
  // applyInjuryVetoes above only ever pins tier-1 findings.
  const removed = ((report.enforced && report.enforced.removed) || []).map((r) => ({
    session: r.session, item: r.item, reason: r.reason,
    tier: SAFETY_AND_LAW_TIER, tierName: tierName(SAFETY_AND_LAW_TIER),
  }));
  return { pass: report.pass, counts: report.counts, notices, observations, resolutions, removed };
}

/**
 * Run every registered validator over one constructed week.
 * @param {object} week — { sessions: [...] } in the generated shape
 * @param {object} ctx — optional context (athlete state, options) validators read.
 *   ctx.enforceInjuryVetoes (P0-3; PROMOTED to ON at the app layer M4a — Simon's I5,
 *   2026-07-15; the engine ctx option itself still defaults OFF when omitted, so a
 *   caller that omits it is byte-identical to report-only): a PURE input threaded by
 *   the caller, never an env read in the engine. When true, tier-1 SAFETY & LAW
 *   vetoes are ENFORCED — the named items are removed from a
 *   cloned week, each removal recorded by name in `report.enforced.removed`, and
 *   the suite re-runs on what actually ships (`report.week`) so the report proves
 *   the shipped artefact — an emptied session still draws the shipped-empty veto
 *   (Art 15: enforcement may never strand an athlete silently).
 * @returns {{ pass: boolean, findings: object[], counts: {pass,trim,veto},
 *   resolutions: object[] }} — `resolutions` is the C1 conflict-order pass output
 *   (§3): one record per slot where ≥2 verdicts conflicted, higher tier winning
 *   absolutely. Plus { enforced: {removed: []}, week } ONLY when enforcement is on.
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
  // ── M4b · the REPORT-ONLY observer wave (observers.js) ──────────────────────
  // These OBSERVE, never dispose: validateWeek stamps every finding verdict 'note'
  // — a class NOT counted in counts.trim/veto, so report.pass is untouched and no
  // plan can move (the golden master proves byte-identity). The `reportOnly` flag on
  // each observer is the STRUCTURAL guarantee that no observer gates, regardless of
  // the authority its knowledge cites (spec §2.1/§2.4). A silent observer pushes NO
  // 'pass' placeholder — silence is its default; only an actual observation is
  // recorded. Confidence is read from a cited KB entry when the observer names one,
  // else its declared literal (display only — a 'note' never acts).
  for (const v of REPORT_ONLY_OBSERVERS) {
    const tier = v.tier || 6;
    const entry = v.knowledgeId ? kb.get(v.knowledgeId) : null;
    const confidence = entry ? entry.confidence : (v.confidence || 'reported');
    const raw = v.run(week, ctx) || [];
    for (const f of raw) {
      findings.push({ validatorId: v.id, tier, verdict: 'note', authority: 'reported', confidence, reason: f.reason, detail: f.detail, reportOnly: true });
    }
  }
  // Highest-priority problem first (§37: lower tier number wins), then by severity.
  findings.sort((a, b) => (a.tier - b.tier) || (SEVERITY[b.verdict] - SEVERITY[a.verdict]));
  // C1 — the explicit conflict-order pass: resolve every slot contested by ≥2
  // verdicts by tier (higher tier absolute; confidence within a tier), recording each.
  const resolutions = resolveConflicts(findings);
  const report = { pass: counts.veto === 0 && counts.trim === 0, findings, counts, resolutions };
  // Flag OFF (the default everywhere): report-only — today's behaviour, byte-identical.
  if (!ctx.enforceInjuryVetoes) return report;
  const { week: gated, removed } = applyInjuryVetoes(week, findings);
  if (!removed.length) return { ...report, enforced: { removed }, week };
  // Re-prove the SHIPPED week (flag off — enforcement ran; recursion stops here). The
  // enforced tier-1 removals are recorded as explicit across-tier resolutions (safety
  // beat the item's objective-fidelity claim to ship), ahead of the shipped week's own.
  const finalReport = validateWeek(gated, { ...ctx, enforceInjuryVetoes: false });
  return {
    ...finalReport,
    resolutions: [...enforcementResolutions(findings), ...finalReport.resolutions],
    enforced: { removed },
    week: gated,
  };
}

export default { VALIDATORS, validateWeek, explainValidation };
