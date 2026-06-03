/**
 * PlanService — the single entry point screens use for plan content.
 *
 * It mirrors the public API of src/data/Plan.js (getPhases, getPhase, getWeek,
 * findNextSession) but chooses the source per user:
 *
 *   • Onboarded users (profile.focus set) → a plan generated from their answers
 *     by PlanGenerator. This is what makes plans per-user.
 *   • Everyone else (e.g. the original hand-built plan, pre-onboarding state) →
 *     the legacy static Plan.js ("hybrid_v1"), unchanged.
 *
 * Generation is a pure function of the profile, so we memoise on a signature of
 * the relevant fields and only regenerate when they change. Session keys follow
 * the same p{phase}_wk{week}_s{idx} scheme either way, so completion state maps
 * correctly regardless of source.
 *
 * Screens import THIS instead of data/Plan.js. When the AI coach lands (Stage 5)
 * it edits the generated plan (or a persisted copy) behind this same interface.
 */

import Database from './Database.js';
import * as Legacy from '../data/Plan.js';
import { generatePlan } from './PlanGenerator.js';

let _cache = { sig: null, plan: null };

function profileSignature(profile) {
  return JSON.stringify({
    f: profile.focus, e: profile.experience, g: profile.goals,
    a: profile.availability, ac: profile.access, p: profile.pool_length_m
  });
}

// Returns the generated plan for the current user, or null to use the legacy plan.
function generated() {
  const profile = Database.services.getProfile() || {};
  if (!profile.focus || profile.focus.length === 0) return null;
  const sig = profileSignature(profile);
  if (_cache.sig !== sig) {
    _cache = { sig, plan: generatePlan(profile) };
  }
  return _cache.plan;
}

export function getPhases() {
  const g = generated();
  return g ? g.phases : Legacy.getPhases();
}

export function getPhase(id) {
  const g = generated();
  if (g) return g.phases.find(p => p.id === id) || null;
  return Legacy.getPhase(id);
}

export function getWeek(pid, wkNum) {
  const phase = getPhase(pid);
  return phase && phase.weeks ? phase.weeks.find(w => w.num === wkNum) : null;
}

/**
 * First not-yet-completed session across the whole plan — the "up next".
 * Same contract as Plan.findNextSession.
 * @returns {{ phase, week, session, sessionIdx, key }|null}
 */
export function findNextSession(sessions = {}) {
  for (const phase of getPhases()) {
    const full = getPhase(phase.id);
    if (!full || !full.weeks) continue;
    for (const week of full.weeks) {
      for (let i = 0; i < week.sessions.length; i++) {
        const key = `p${phase.id}_wk${week.num}_s${i}`;
        if (!sessions[key] || !sessions[key].completed) {
          return { phase, week, session: week.sessions[i], sessionIdx: i, key };
        }
      }
    }
  }
  return null;
}

export default { getPhases, getPhase, getWeek, findNextSession };
