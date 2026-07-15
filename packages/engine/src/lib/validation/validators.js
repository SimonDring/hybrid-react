/**
 * The D14 validators beyond the MRV ceiling (WP-12).
 *
 * Each validator declares its EDS §37 conflict tier (1 SAFETY & LAW · 2 SPORT
 * PROTECTION · 3 RECOVERABILITY · 4 ATHLETE INTENT · 5 OBJECTIVE FIDELITY ·
 * 6 OPTIMISATION) and the knowledge entry whose policy it enforces (which caps
 * its verdict via authority — Art 13). Validators judge what SHIPS: the injury
 * validator expects the post-filter week; generatePlan's meta validation runs
 * the profile-known subset (no runtime injuries there).
 */
import kb from '../knowledge/kb.js';
import { EXERCISES, availableEquip } from '../../data/strengthExercises.js';
import { parseSetCount, exerciseMuscles } from '../plan/volume.js';
import { getContraindications, getContraindicatedExercises } from '../injury/injuryRules.js';
import { isExerciseContraindicated } from '../injury/contraindicationVocab.js';

const EX_BY_NAME = new Map(EXERCISES.map((e) => [e.name.toLowerCase(), e]));
const EX_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
// WP-46 s2: resolve a plan item to its catalogue entry by stable exId first (a
// rename can't defeat the safety gate), falling back to name for un-stamped items.
const exForItem = (it) => (it.exId != null && EX_BY_ID.get(it.exId)) || EX_BY_NAME.get((it.name || '').toLowerCase());
const UPPER = new Set(['chest', 'back', 'shoulders', 'biceps', 'triceps']);
const LOWER = new Set(['quads', 'hamstrings', 'glutes', 'calves']);

// P0-2 (engine-audit TR-04): validators judge what SHIPS — gym sessions AND the
// injury system's own rehab replacements (discipline:'rehab'). Filtering to gym
// only made the rehab-replaced session invisible to the very "shipped empty"
// veto written for it. Endurance disciplines (run/swim/ride) stay out of scope.
const isShipped = (s) => !s.discipline || s.discipline === 'gym' || s.discipline === 'rehab';
const shippedSessions = (week) => (week.sessions || []).filter(isShipped);
// Struck items (`substituted` — hidden at render, never performed) are not
// shipped work; judging or counting them re-litigates the injury filter's own
// verdict (P0-2: they were phantom volume in the region-share tally too).
const isMain = (it) => it.section !== 'primer' && !it.substituted;
const mainItems = (s) => (s.items || []).filter(isMain);

// ── Tier 1 · SAFETY: contraindicated movements never ship ────────────────────
// Direct policy check: no shipped working item may be contraindicated for an
// active injury. The join keys on exercise IDENTITY (M4a T2 / TR-10) — each item
// resolves to its catalogue entry (by stable exId, name second) and its id +
// movement pattern are tested against the governed contraindication vocabulary
// (contraindicationVocab.js, the SAME table + severity policy the upstream injury
// filter now uses). A catalogue RENAME can't dodge the gate (keyed on exId), and a
// NOVEL exercise of a contraindicated pattern is caught by its pattern, never
// missed by a name gap. The name-regex survives only as the honest fallback for
// off-catalogue / un-stamped items (no exId, name absent from the catalogue).
// This is deliberately NOT a diff against the injury filter — the filter
// legitimately APPENDS rehab work (not idempotent). Items the injury system itself
// prescribed (tag 'rehab') and pain-free-range work are exempt by construction.
//
// Per-injury contraindication descriptor: the id/pattern vocabulary (primary,
// rename-proof) + the name-regex fallback, each under the injury's own
// severity/phase policy (≤1 → no blocks, ≥4 → force `protect`).
function collectContras(injuries) {
  return injuries.map((inj) => ({
    contra: getContraindicatedExercises(inj.body_part_key, inj.severity || 3, inj.rehab_phase || 'protect'),
    regexes: getContraindications(inj.body_part_key, inj.severity || 3, inj.rehab_phase || 'protect').blockedPatterns,
  }));
}
const hasBlocks = (contras) => contras.some((c) =>
  c.contra.patternSet.size || c.contra.extraIdSet.size || c.regexes.length);
// Is a shipped working item contraindicated for ANY active injury? IDENTITY-keyed
// (exId → id/pattern), name-regex only when the item has no catalogue entry.
function itemContraindicated(it, contras) {
  const ex = exForItem(it);
  return contras.some((c) =>
    ex ? isExerciseContraindicated(ex, c.contra) : c.regexes.some((r) => r.test(it.name || '')));
}
export const injuryContraindicationValidator = {
  id: 'injury.contraindication',
  knowledgeId: 'injury.contraindication_policy',
  tier: 1,
  run(week, ctx = {}) {
    const injuries = (ctx.injuries || []).filter((i) => i && i.body_part_key);
    if (!injuries.length) return [];
    const contras = collectContras(injuries);
    if (!hasBlocks(contras)) return [];
    const findings = [];
    // Indexed walk (not shippedSessions/mainItems): detail must pin the EXACT
    // position in week.sessions[..].items[..] so the D14 gate removes only the
    // occurrence this report vetoed — duplicate session titles or same-name
    // items can never widen the removal (whole-branch review 2026-07-13).
    (week.sessions || []).forEach((s, sessionIndex) => {
      if (!isShipped(s)) return;
      (s.items || []).forEach((it, itemIndex) => {
        // Struck (`substituted`) items are excluded (isMain) — WP-40 replaces
        // mark-and-hide with real redistribution.
        if (!isMain(it)) return;
        if (it.tag === 'rehab' || /pain-free/i.test(it.name || '')) return;
        if (itemContraindicated(it, contras)) {
          findings.push({
            verdict: 'veto',
            reason: `${s.title || 'session'}: "${it.name}" is contraindicated by an active injury`,
            detail: { session: s.title, sessionIndex, item: it.name, itemIndex }
          });
        }
      });
    });
    return findings;
  }
};

// ── Tier 3 · RECOVERABILITY is volume.mrv-ceiling (mrvValidator.js) ──────────

// ── Tier 4 · ATHLETE INTENT: the session fits the athlete's stated time ──────
export const durationHonestyValidator = {
  id: 'session.duration-honesty',
  knowledgeId: 'programming.session_ceiling',
  tier: 4,
  run(week) {
    const { minutes, slackMin } = kb.value('programming.session_ceiling');
    const findings = [];
    for (const s of shippedSessions(week)) {
      const m = /~?(\d+)\s*min/.exec(s.duration || '');
      if (!m) continue;
      const est = Number(m[1]);
      if (est > minutes + slackMin) {
        findings.push({
          verdict: 'trim',
          reason: `${s.title || 'session'}: honest estimate ${est} min exceeds the ${minutes}-min ceiling (+${slackMin} slack) — trim work`,
          detail: { session: s.title, estimatedMin: est, ceilingMin: minutes }
        });
      }
    }
    return findings;
  }
};

// ── Tier 4 · ATHLETE INTENT: every item is performable with their equipment ──
export const equipmentValidator = {
  id: 'session.equipment-available',
  knowledgeId: 'validation.session_purpose',   // definitional coherence policy (high → gate)
  tier: 4,
  run(week, ctx = {}) {
    if (!ctx.access || !ctx.access.length) return [];
    const have = availableEquip(ctx.access);
    const findings = [];
    for (const s of shippedSessions(week)) {
      for (const it of mainItems(s)) {
        const ex = exForItem(it);
        if (ex && ex.equip && !have.has(ex.equip)) {
          findings.push({
            verdict: 'veto',
            reason: `${s.title || 'session'}: "${it.name}" needs ${ex.equip}, which the athlete doesn't have`,
            detail: { session: s.title, item: it.name, equip: ex.equip }
          });
        }
      }
    }
    return findings;
  }
};

// ── Tier 5 · OBJECTIVE FIDELITY: a session is what it says it is ─────────────
export const purposeCoherenceValidator = {
  id: 'session.purpose-coherence',
  knowledgeId: 'validation.session_purpose',
  tier: 5,
  run(week) {
    const { regionMajority } = kb.value('validation.session_purpose');
    const findings = [];
    for (const s of shippedSessions(week)) {
      if (mainItems(s).length === 0) {
        // P0-2 (TR-04/SR-03): name the unservable outcome explicitly — the injury
        // filter stamps `unservable` when a region has no rehab content and no
        // safe work remains (Art 15: surfaced, never a false "rehab" banner).
        const reason = s.unservable
          ? `${s.title || 'session'}: unservable — injury blocks all work and no rehab content exists for this region`
          : `${s.title || 'session'}: shipped empty — no working items`;
        findings.push({ verdict: 'veto', reason, detail: { session: s.title, unservable: !!s.unservable } });
        continue;
      }
      const focus = ((s.title || '').split('·')[1] || '').trim().toLowerCase();
      const labelled = focus.startsWith('upper') ? UPPER : focus.startsWith('lower') ? LOWER : null;
      if (!labelled) continue;   // Full-body / sport-quality labels aren't region claims
      let inRegion = 0, total = 0;
      for (const it of mainItems(s)) {
        const sets = parseSetCount(it.sets);
        const contrib = sets ? exerciseMuscles(it.name) : null;
        if (!contrib) continue;
        const vf = it.volumeFactor == null ? 1 : it.volumeFactor;
        for (const muscle in contrib) {
          const v = sets * contrib[muscle] * vf;
          total += v;
          if (labelled.has(muscle)) inRegion += v;
        }
      }
      if (total > 0 && inRegion / total < regionMajority) {
        findings.push({
          verdict: 'trim',
          reason: `${s.title}: labelled ${focus} but only ${Math.round((inRegion / total) * 100)}% of its volume is ${focus}-body`,
          detail: { session: s.title, share: inRegion / total }
        });
      }
    }
    return findings;
  }
};

export default { injuryContraindicationValidator, durationHonestyValidator, equipmentValidator, purposeCoherenceValidator };
