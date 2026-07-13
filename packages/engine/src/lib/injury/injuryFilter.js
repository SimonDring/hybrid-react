// src/lib/injury/injuryFilter.js
// Post-generation session filter. Pure functions — no side effects.
// Called from PlanService.js after plan generation.

import { getContraindications } from './injuryRules.js';
import { getRehabExercisesFor, getPreventionExercisesFor } from '../../data/rehabExercises.js';
import { hasRecurrenceRisk } from '../../data/injuryTaxonomy.js';

const REHAB_REPLACEMENT_THRESHOLD = 0.70; // >70% blocked → replace whole session
// Full replacement only kicks in when at least one injury is high-severity (>=4).
// At severity 1-3, exercises are substituted in-place even if many are blocked.
const FULL_REPLACE_MIN_SEVERITY = 4;

function isBlocked(item, patterns) {
  // Never block mobility primer items
  if (item.tag === 'mobility') return false;
  // Never block already-flagged rehab/prevention items
  if (item.rehab || item.prevention) return false;
  return patterns.some(p => p.test(item.name));
}

function buildInjuryLabel(inj) {
  return [inj.side && inj.side !== 'n/a' ? inj.side.charAt(0).toUpperCase() + inj.side.slice(1) : null, inj.body_part || inj.body_part_key]
    .filter(Boolean).join(' ');
}

const PHASE_LABELS = { protect: 'Protect & Rest', early_motion: 'Early Motion', loading: 'Loading', return_to_sport: 'Return to Sport' };

// P0-2 (engine-audit TR-04/SR-03): when an injury blocks every working item and
// the region has NO rehab content, there is nothing safe to prescribe. The honest
// outcome is an explicit, surfaced `unservable` session (Art 15) — never an empty
// session behind a banner claiming it was "replaced with rehab". The D14 suite
// vetoes it (shipped-empty/unservable), so the failure is loud, not silent.
function buildUnservableSession(injuries, blockedCount) {
  const labels = injuries.map(buildInjuryLabel);
  const phase = injuries[0].rehab_phase || 'protect';
  return {
    title: `Injury — ${labels.join(' & ')} · No safe session`,
    discipline: 'rehab',
    unservable: true,
    focus: `Injury: ${labels.join(' & ')}`,
    duration: '—',
    intensity: 'rest',
    lowerBody: false,
    items: [],
    injuryBanner: {
      injuries: labels,
      unservable: true,
      message: `We can't build a safe session around your ${labels.join(' and ')} injury — every planned exercise is contraindicated and we have no rehab programming for this area yet. Treat this as a rest day, and get a professional assessment if it isn't improving.`,
      phase: PHASE_LABELS[phase] || phase,
      blockedCount,
      fullReplacement: false
    }
  };
}

function buildRehabSession(injuries, blockedCount) {
  const primary = injuries[0];
  const phaseLabels = PHASE_LABELS;
  const phase = primary.rehab_phase || 'protect';
  const label = buildInjuryLabel(primary);
  const rehabItems = getRehabExercisesFor(primary.body_part_key, phase, primary.severity || 3)
    .map((ex, i) => ({
      num: `R${i + 1}`,
      name: ex.name,
      sets: ex.duration,
      rpe: 'Easy–Moderate',
      note: ex.instructions,
      restSec: 30,
      rehab: true,
      rationale: ex.rationale,
      tag: 'rehab'
    }));

  // Bare region: no rehab content exists for this body part at this phase —
  // surface the truth instead of shipping an empty "rehab" session (P0-2).
  if (rehabItems.length === 0) return buildUnservableSession(injuries, blockedCount);

  return {
    title: `Rehab — ${label} · ${phaseLabels[phase] || phase}`,
    discipline: 'rehab',
    focus: `Rehab: ${label}`,
    duration: '20–30 min',
    intensity: 'low',
    lowerBody: false,
    items: rehabItems,
    injuryBanner: {
      injuries: injuries.map(buildInjuryLabel),
      message: `Rehab session for your ${injuries.map(buildInjuryLabel).join(' and ')} injury`,
      phase: phaseLabels[phase] || phase,
      blockedCount: 0,
      fullReplacement: true
    }
  };
}

function applyToSession(session, injuries) {
  // Collect all blocked patterns across all active injuries
  const allPatterns = [];
  injuries.forEach(inj => {
    const { blockedPatterns } = getContraindications(inj.body_part_key, inj.severity || 3, inj.rehab_phase || 'protect');
    allPatterns.push(...blockedPatterns);
  });

  if (allPatterns.length === 0) return session;

  // Count non-mobility items for threshold calculation
  const countable = session.items.filter(it => it.tag !== 'mobility');

  const modifiedItems = session.items.map(item => {
    if (isBlocked(item, allPatterns)) {
      return { ...item, substituted: true, substituteReason: `Contraindicated for ${injuries.map(buildInjuryLabel).join(', ')} at current rehab phase` };
    }
    return item;
  });

  const blockedCount = modifiedItems.filter(i => i.substituted).length;
  const overlapRatio = countable.length > 0 ? blockedCount / countable.length : 0;

  // Full session replacement only when severity is high enough AND most exercises are blocked
  const hasHighSeverity = injuries.some(inj => (inj.severity || 3) >= FULL_REPLACE_MIN_SEVERITY);
  if (hasHighSeverity && overlapRatio > REHAB_REPLACEMENT_THRESHOLD) {
    return buildRehabSession(injuries, blockedCount);
  }

  // Collect rehab exercises, deduplicated by id
  const seen = new Set();
  const rehabItems = [];
  injuries.forEach(inj => {
    getRehabExercisesFor(inj.body_part_key, inj.rehab_phase || 'protect', inj.severity || 3)
      .forEach(ex => {
        if (!seen.has(ex.id)) {
          seen.add(ex.id);
          rehabItems.push({
            num: `R${rehabItems.length + 1}`,
            name: ex.name,
            sets: ex.duration,
            rpe: 'Easy–Moderate',
            note: ex.instructions,
            restSec: 30,
            rehab: true,
            rationale: ex.rationale,
            tag: 'rehab'
          });
        }
      });
  });

  // Hollow session guard (P0-2): every working item struck in place and no rehab
  // content to add — the athlete would see an empty session behind a "modified
  // for your injury" banner. Same honest outcome as the full-replace path.
  const visibleWorking = modifiedItems.filter(it => !it.substituted && it.tag !== 'mobility');
  if (blockedCount > 0 && visibleWorking.length === 0 && rehabItems.length === 0) {
    return buildUnservableSession(injuries, blockedCount);
  }

  const injuryLabels = injuries.map(buildInjuryLabel);
  const phaseLabels = PHASE_LABELS;

  return {
    ...session,
    items: [...modifiedItems, ...rehabItems],
    injuryBanner: {
      injuries: injuryLabels,
      message: `Modified for your ${injuryLabels.join(' and ')} injury`,
      phase: phaseLabels[injuries[0].rehab_phase || 'protect'] || injuries[0].rehab_phase,
      blockedCount,
      fullReplacement: false
    }
  };
}

/**
 * Apply active injury rules to a generated week.
 * @param {{ sessions: object[] }} week
 * @param {object[]} activeInjuries  injuries with status active|rehabbing and a body_part_key
 * @returns modified week
 */
export function applyInjuryRules(week, activeInjuries = []) {
  const injuries = (activeInjuries || []).filter(i => i.body_part_key);
  if (!injuries.length) return week;

  return {
    ...week,
    sessions: week.sessions.map(session => applyToSession(session, injuries))
  };
}

/**
 * Inject prevention exercises into sessions based on recovered injury history.
 * Silently added — no banner.
 * @param {{ sessions: object[] }} week
 * @param {object[]} injuryHistory  ALL injuries (any status) with a body_part_key
 * @returns modified week
 */
export function applyPrevention(week, injuryHistory = []) {
  const recovered = (injuryHistory || []).filter(i =>
    i.status === 'recovered' && i.body_part_key
  );
  if (!recovered.length) return week;

  // Count per body_part_key
  const countByPart = {};
  recovered.forEach(i => { countByPart[i.body_part_key] = (countByPart[i.body_part_key] || 0) + 1; });

  // Build prevention items, deduplicated
  const seen = new Set();
  const preventionItems = [];
  Object.entries(countByPart).forEach(([key, count]) => {
    const full = count >= 2 || recovered.some(i => i.body_part_key === key && hasRecurrenceRisk(i.diagnosis_key));
    getPreventionExercisesFor(key, full).forEach(ex => {
      if (!seen.has(ex.id)) {
        seen.add(ex.id);
        preventionItems.push({
          num: `Prev`,
          name: ex.name,
          sets: ex.duration,
          rpe: 'Easy',
          note: ex.instructions,
          restSec: 20,
          prevention: true,
          preventionNote: `Added to support your ${key.replace('_', ' ')} history`,
          tag: 'mobility'
        });
      }
    });
  });

  if (!preventionItems.length) return week;

  // Insert prevention items at the start of the primer block in each session
  return {
    ...week,
    sessions: week.sessions.map(session => ({
      ...session,
      items: [...preventionItems, ...session.items]
    }))
  };
}

export default { applyInjuryRules, applyPrevention };
