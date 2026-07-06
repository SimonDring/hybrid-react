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
import { blockedNameRegexesForInjuries } from '../session/movementRequirements.js';

const EX_BY_NAME = new Map(EXERCISES.map((e) => [e.name.toLowerCase(), e]));
const EX_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
// WP-46 s2: resolve a plan item to its catalogue entry by stable exId first (a
// rename can't defeat the safety gate), falling back to name for un-stamped items.
const exForItem = (it) => (it.exId != null && EX_BY_ID.get(it.exId)) || EX_BY_NAME.get((it.name || '').toLowerCase());
const UPPER = new Set(['chest', 'back', 'shoulders', 'biceps', 'triceps']);
const LOWER = new Set(['quads', 'hamstrings', 'glutes', 'calves']);

const gymSessions = (week) => (week.sessions || []).filter((s) => !s.discipline || s.discipline === 'gym');
const mainItems = (s) => (s.items || []).filter((it) => it.section !== 'primer');

// ── Tier 1 · SAFETY: contraindicated movements never ship ────────────────────
// Direct policy check: no shipped working item may match an active injury's
// blocked name-regexes (the injury system's own severity/phase policy). This is
// deliberately NOT a diff against the injury filter — the filter legitimately
// APPENDS rehab work (not idempotent), and a diff can't catch pattern-level
// under-blocking. Items the injury system itself prescribed (tag 'rehab') and
// pain-free-range work are exempt by construction.
export const injuryContraindicationValidator = {
  id: 'injury.contraindication',
  knowledgeId: 'injury.contraindication_policy',
  tier: 1,
  run(week, ctx = {}) {
    const injuries = (ctx.injuries || []).filter((i) => i && i.body_part_key);
    if (!injuries.length) return [];
    const blocked = blockedNameRegexesForInjuries(injuries);
    if (!blocked.length) return [];
    const findings = [];
    for (const s of gymSessions(week)) {
      for (const it of mainItems(s)) {
        if (it.tag === 'rehab' || /pain-free/i.test(it.name || '')) continue;
        // An item the injury system itself struck (marked `substituted` — hidden at
        // render, never performed) is not shipped; judging it would re-litigate the
        // filter's own verdict. WP-40 replaces mark-and-hide with real redistribution.
        if (it.substituted) continue;
        if (blocked.some((r) => r.test(it.name || ''))) {
          findings.push({
            verdict: 'veto',
            reason: `${s.title || 'session'}: "${it.name}" is contraindicated by an active injury`,
            detail: { session: s.title, item: it.name }
          });
        }
      }
    }
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
    for (const s of gymSessions(week)) {
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
    for (const s of gymSessions(week)) {
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
    for (const s of gymSessions(week)) {
      if (mainItems(s).length === 0) {
        findings.push({ verdict: 'veto', reason: `${s.title || 'session'}: shipped empty — no working items`, detail: { session: s.title } });
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
