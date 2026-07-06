/**
 * ai/contracts — Seam 1 of the AIGAS (decision substitution): the decision contracts,
 * as CODE artefacts, and the one gate every proposal passes.
 *
 * AIGAS §6.2 / Constitution Arts 18–19: the deterministic engine always runs and is
 * always the fallback; an AI (or human, or any other proposer) may substitute a SPECIFIC
 * decision behind its declared contract — never the graph — and the deterministic D14
 * validators dispose of the proposal. A passing proposal becomes a validated artefact;
 * a failing one leaves the deterministic result standing. The AI never gets the last word.
 *
 * DEPENDENCY DIRECTION (pinned by tests/ai-seam.js): decision modules NEVER import this
 * module; it imports THEM. The AI client itself lives in the platform layer (a Supabase
 * edge function holding the key, per Stage 6) — the engine performs no IO.
 *
 * v0 scope: D11 (intervention selection) is the first declared-substitutable decision —
 * a proposal is a constructed WEEK in the generated shape. Adding a contract = adding an
 * entry here + its shape gate; per-capability eval harnesses ride each go-live (AIGAS §17).
 */
import { validateWeek } from '../validation/contract.js';

// Shape gates are cheap structural checks BEFORE the science gates run — a malformed
// proposal is refused without ever invoking a validator (and long before any athlete).
function weekShaped(proposal) {
  if (!proposal || typeof proposal !== 'object') return 'proposal is not an object';
  if (!Array.isArray(proposal.sessions) || proposal.sessions.length === 0) return 'proposal has no sessions array';
  for (const s of proposal.sessions) {
    if (!s || typeof s !== 'object') return 'a session is not an object';
    if (!Array.isArray(s.items)) return `session "${s.title || '?'}" has no items array`;
    for (const it of s.items) {
      if (!it || typeof it.name !== 'string' || !it.name.trim()) return 'an item is missing its exercise name';
    }
  }
  return null;
}

export const DECISION_CONTRACTS = {
  D11: {
    id: 'D11',
    decides: 'intervention selection — which exercises satisfy the session requirements',
    substitutable: true,
    // What a proposer must produce: a full constructed week in the generated shape
    // (sessions[] with items[]). The dose/schedule ride along; D14 judges the result.
    proposalShape: 'week: { sessions: [{ title, items: [{ name, sets, rpe, ... }] }] }',
    shapeGate: weekShaped,
  },
  // D4 (diagnosis) and D5 (prioritisation) are named substitution candidates in the
  // AIGAS; their contracts are declared when their eval harnesses are built — a
  // contract without an eval harness must not go live (AIGAS §6.2/§17).
};

export function contractFor(decisionId) {
  return DECISION_CONTRACTS[decisionId] || null;
}

/**
 * Dispose of a proposal: shape gate, then the full deterministic D14 suite with the
 * athlete's real context (equipment, ACTIVE injuries). Pure.
 * @returns {{ accepted: boolean, reason: string|null, findings: object[] }}
 */
export function validateProposal(decisionId, proposal, ctx = {}) {
  const contract = contractFor(decisionId);
  if (!contract || !contract.substitutable) {
    return { accepted: false, reason: `decision ${decisionId} is not substitutable — no contract declared`, findings: [] };
  }
  const shapeError = contract.shapeGate(proposal);
  if (shapeError) return { accepted: false, reason: `shape gate: ${shapeError}`, findings: [] };

  const report = validateWeek(proposal, ctx);
  // Verdict policy: any veto refuses outright; any trim refuses in v0 (a proposer must
  // deliver a compliant week — the engine's own constructor pre-trims, so a trimming
  // proposal is by definition worse than the deterministic result it would replace).
  const accepted = report.counts.veto === 0 && report.counts.trim === 0;
  return {
    accepted,
    reason: accepted ? null : (report.findings.find((f) => f.verdict !== 'pass') || {}).reason || 'validation failed',
    findings: report.findings,
  };
}

export default { DECISION_CONTRACTS, contractFor, validateProposal };
