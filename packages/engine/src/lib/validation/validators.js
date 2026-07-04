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
import { applyInjuryRules } from '../injury/injuryFilter.js';

const EX_BY_NAME = new Map(EXERCISES.map((e) => [e.name.toLowerCase(), e]));
const UPPER = new Set(['chest', 'back', 'shoulders', 'biceps', 'triceps']);
const LOWER = new Set(['quads', 'hamstrings', 'glutes', 'calves']);

const gymSessions = (week) => (week.sessions || []).filter((s) => !s.discipline || s.discipline === 'gym');
const mainItems = (s) => (s.items || []).filter((it) => it.section !== 'primer');

// ── Tier 1 · SAFETY: contraindicated movements never ship ────────────────────
// A validated week is a FIXED POINT of the injury filter: applying it changes
// nothing. Runs only when the caller knows the athlete's active injuries.
export const injuryContraindicationValidator = {
  id: 'injury.contraindication',
  knowledgeId: 'injury.contraindication_policy',
  tier: 1,
  run(week, ctx = {}) {
    const injuries = ctx.injuries || [];
    if (!injuries.length) return [];
    const before = gymSessions(week);
    // Deep-clone: the validator must never alter the week it judges.
    const filtered = applyInjuryRules({ sessions: JSON.parse(JSON.stringify(before)) }, injuries);
    const after = filtered.sessions || [];
    const findings = [];
    before.forEach((s, i) => {
      const a = JSON.stringify((s.items || []).map((it) => it.name));
      const b = JSON.stringify(((after[i] || {}).items || []).map((it) => it.name));
      if (a !== b) {
        findings.push({
          verdict: 'veto',
          reason: `${s.title || `session ${i}`}: contains movement(s) contraindicated by an active injury — the injury filter would alter it`,
          detail: { session: s.title, before: JSON.parse(a), after: JSON.parse(b) }
        });
      }
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
        const ex = EX_BY_NAME.get((it.name || '').toLowerCase());
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
