/**
 * blockObjective — D7 · Block Objective (WP-47). A PURE function that turns the D5
 * diagnosis (priority limiters) + season + recoverability into an inspectable BlockPlan:
 * an ordered list of BlockObjective objects, each naming the ONE adaptation a block
 * develops, traced to the limiter that made it a priority, with the incompatible limiters
 * D5 deferred scheduled into later blocks.
 *
 * Design: docs/architecture/D7-BLOCK-OBJECTIVE-SPEC.md.
 *
 * ROLLOUT — v0 is ADVISORY / PARALLEL. `deriveBlockObjective` is emitted into
 * meta.diagnosis.blockPlan and steers NOTHING: resolvePeriodization still produces the
 * actual blocks. This is the same safe seam the D4/D5 diagnosis shipped on — it lets the
 * diagnosis-driven block structure be inspected + reviewed (and shows exactly where it
 * diverges from today's template) before it is ever allowed to drive the plan (a later,
 * reviewed step — the EDS D7 flip). Pure: no I/O, no clock (Art 18).
 */
import { SEASON_OBJECTIVE, BASE_LENGTH_WEEKS, RECOVERABILITY_LENGTH_ADJ, DELOAD_CADENCE_WEEKS, recoverabilityBand } from '../../data/blockPriors.js';

const normSeason = (s) => {
  const v = String(s || 'off').toLowerCase().replace(/_season$/, '');
  return SEASON_OBJECTIVE[v] ? v : 'off';
};

// Deload week indices within a block of `len` weeks at cadence `every`.
function deloadWeeksFor(len, every) {
  const out = [];
  for (let w = every; w <= len; w += every) out.push(w);
  return out;
}

/**
 * @param {object} inputs
 * @param {Array}  inputs.priorityQualities  D5 output — ranked, compatible limiters
 *                 [{ qualityId, order, magnitude, adaptations, tracesToLimiter, rationale }]
 * @param {Array}  inputs.limitingFactors    all D4 limiters (used to recover the DEFERRED set)
 * @param {string} inputs.season             deriveSeason output ('off'|'pre'|'in'|'transition')
 * @param {object} inputs.eventCalendar      { isRace, taperWeeks } — from the race-taper decision
 * @param {number} inputs.recoveryRate       learnedPriors.recoveryRate value (≈1.0), or null
 * @returns {{ blocks: BlockObjective[], sequencingNotes: string[], source: string }}
 */
export function deriveBlockObjective({ priorityQualities = [], limitingFactors = [], season, eventCalendar = {}, recoveryRate = null } = {}) {
  const priorities = Array.isArray(priorityQualities) ? priorityQualities.filter((p) => p && p.qualityId) : [];
  if (!priorities.length) {
    return { blocks: [], sequencingNotes: ['no diagnosis — the legacy template governs block structure'], source: 'template' };
  }

  const band = recoverabilityBand(recoveryRate);
  const lenAdj = RECOVERABILITY_LENGTH_ADJ[band] || 0;
  const cadence = DELOAD_CADENCE_WEEKS[band] || 4;
  const s0 = normSeason(season);

  // Block 0 develops the top limiter in the CURRENT season. Subsequent priority limiters
  // occupy consecutive accumulation blocks (the macrocycle ahead). Season only advances a
  // step from the current one for the immediate next block (off→pre→in) when an event is
  // known; beyond that v0 does not speculate a full calendar (confidence stays 'low').
  const seasonAt = (i) => {
    if (i === 0) return s0;
    if (!eventCalendar.isRace) return 'off';        // no event → keep accumulating
    const order = ['off', 'pre', 'in'];
    const idx = Math.min(order.indexOf(s0) + i, order.length - 1);
    return order[idx < 0 ? Math.min(i, order.length - 1) : idx];
  };

  const blocks = priorities.map((p, i) => {
    const season = seasonAt(i);
    const tmpl = SEASON_OBJECTIVE[season];
    const len = Math.max(2, (BASE_LENGTH_WEEKS[tmpl.trajectory] || 4) + lenAdj);
    const isTaper = !!eventCalendar.isRace && season === 'in' && i === priorities.length - 1;
    const objective = `${tmpl.verb}:${p.qualityId}`;
    const maintainsQualities = priorities.filter((q) => q.qualityId !== p.qualityId).map((q) => q.qualityId);
    return {
      index: i,
      objective,
      developsQuality: p.qualityId,
      maintainsQualities,
      season,
      lengthWeeks: len,
      trajectory: tmpl.trajectory,
      volumeShape: isTaper ? 'taper' : tmpl.volumeShape,
      intensityShape: isTaper ? 'peak' : tmpl.intensityShape,
      deloadWeeks: isTaper ? [] : deloadWeeksFor(len, cadence),
      isTaper,
      rationale: `${tmpl.verb} ${p.qualityId} — ${i === 0 ? 'top' : `#${i + 1}`} D5 limiter (magnitude ${p.magnitude ?? 'n/a'}); ${season}-season ${tmpl.trajectory}, ${len}wk (recoverability ${band})${isTaper ? '; taper block (volume down, intensity held)' : ''}.`,
      confidence: 'low',
      source: 'diagnosis',
      tracesTo: { limiter: p.tracesToLimiter || p.qualityId, order: p.order ?? i + 1 },
    };
  });

  // Sequencing notes: the limiters D5 DEFERRED (incompatible with a higher priority) are
  // the coach-like "why is X waiting" signal. They are limitingFactors with positive
  // magnitude that did not make the compatible priority set.
  const chosen = new Set(priorities.map((p) => p.qualityId));
  const deferred = (Array.isArray(limitingFactors) ? limitingFactors : [])
    .filter((f) => f && f.qualityId && f.magnitude > 0 && !chosen.has(f.qualityId));
  const sequencingNotes = deferred.map((f) =>
    `${f.qualityId} (limiter magnitude ${f.magnitude}) deferred — conflicts with a higher-priority quality this block; develop it in a later block.`);

  return { blocks, sequencingNotes, source: 'diagnosis' };
}

/**
 * WP-47 (D7 steer, gated): the block plan's recoverability-driven DELOAD rhythm may steer
 * periodisation — the first place D7 actually drives the plan, and the concrete A9 step
 * (deload cadence from the diagnosis's recoverability, not the style enum). Deliberately
 * narrow + reversible: it fires ONLY for a diagnosed SPORT cohort that ALSO carries a
 * recoverability prior. No-prior profiles (every golden archetype) are untouched, so the
 * baseline plans don't move; block-LENGTH/structure steering is a larger follow-on.
 */
export function blockDeloadSteers({ sport, priorityQualities, recoveryRate } = {}) {
  return !!sport && Array.isArray(priorityQualities) && priorityQualities.length > 0 && recoveryRate != null;
}

/** Deload week numbers across a block of `totalWeeks`, spaced by the recoverability cadence
 *  (low recoverability → tighter). Never the final week (kept for the peak/realisation). */
export function deloadsFromRecoverability(totalWeeks, recoveryRate) {
  const cadence = DELOAD_CADENCE_WEEKS[recoverabilityBand(recoveryRate)] || 4;
  const out = [];
  for (let w = cadence; w < totalWeeks; w += cadence) out.push(w);
  return out;
}

// Block trajectory → the periodisation phase intent the allocator consumes (base|build|peak).
const TRAJECTORY_INTENT = {
  accumulation: 'base',      // develop the base (off-season)
  transmutation: 'build',    // convert toward expression (pre-season)
  realisation: 'peak',       // express / peak
  maintenance: 'build',      // hold with real work (in-season)
};

/**
 * WP-47 (completion): the block plan's STRUCTURE drives periodisation — the diagnosis-driven
 * phase split, not the style template. Each block becomes a { intent, weeks } segment (intent
 * from its trajectory / taper), scaled to fit the plan's totalWeeks exactly (every segment ≥ 1
 * week; rounding drift absorbed by the longest segment). Returns null if it can't (no blocks) —
 * the caller then keeps the template. Pure.
 */
export function blockPlanToSplit(blocks, totalWeeks) {
  if (!Array.isArray(blocks) || !blocks.length || !(totalWeeks > 0)) return null;
  // At most one segment per week; if more blocks than weeks, keep the highest-priority ones.
  const src = blocks.slice(0, totalWeeks);
  const raw = src.map((b) => ({ intent: b.isTaper ? 'peak' : (TRAJECTORY_INTENT[b.trajectory] || 'build'), weeks: Math.max(1, b.lengthWeeks || 1) }));
  const rawTotal = raw.reduce((a, s) => a + s.weeks, 0);
  const split = raw.map((s) => ({ intent: s.intent, weeks: Math.max(1, Math.round(s.weeks * totalWeeks / rawTotal)) }));
  // Reconcile to EXACTLY totalWeeks: grow the last segment / shrink the longest until it fits.
  let diff = totalWeeks - split.reduce((a, s) => a + s.weeks, 0);
  let guard = 0;
  while (diff !== 0 && guard++ < 1000) {
    if (diff > 0) { split[split.length - 1].weeks += 1; diff -= 1; }
    else {
      let i = -1, max = 1;
      for (let k = 0; k < split.length; k++) if (split[k].weeks > max) { max = split[k].weeks; i = k; }
      if (i < 0) break;
      split[i].weeks -= 1; diff += 1;
    }
  }
  return split;
}

export default { deriveBlockObjective, blockDeloadSteers, deloadsFromRecoverability, blockPlanToSplit };
