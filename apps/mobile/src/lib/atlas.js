/**
 * atlas — the athlete profile view-model, read STRAIGHT off the Performance Model.
 *
 * WP-29: the old atlas/ (signals.js capability maths + data/sports pillar picks +
 * athletePillars benchmarks) computed a SECOND, parallel athlete assessment with
 * invented top-5%/elite numbers. Retired. The Atlas now renders the SAME model the
 * planner diagnoses from (performanceModelForProfile → capabilities, demandProfile,
 * D4 limitingFactors): ONE diagnosis, and the "focus" IS the engine's top limiting
 * factor, with the engine's own emitted rationale — never re-derived copy.
 *
 * What stays app-side here is PRESENTATION only: quality labels, how many pillars
 * fit on a radar, and the sport display name.
 */

import { performanceModelForProfile, selectableSports } from '@performance-os/engine';

// Presentation config — quality id → athlete-facing label.
export const QUALITY_LABELS = {
  maxStrength: 'Max strength',
  hypertrophy: 'Muscle',
  explosiveStrength: 'Explosive power',
  reactiveStrength: 'Reactive strength',
  strengthEndurance: 'Strength endurance',
  aerobicCapacity: 'Aerobic engine',
  anaerobicCapacity: 'Anaerobic capacity',
  mobility: 'Mobility',
  stability: 'Stability',
  robustness: 'Robustness',
};
const labelOf = (id) => QUALITY_LABELS[id] || id;

// Radar readability cap — a presentation choice, not a coaching one. Qualities past
// the cap still exist in the model; the bars list shows everything the radar shows.
const RADAR_MAX = 8;

// Build athletes have no sport demand profile — show the strength-relevant qualities
// their plan actually trains (presentation pick; scores still come from the model).
const BUILD_QUALITIES = ['maxStrength', 'hypertrophy', 'strengthEndurance', 'explosiveStrength', 'mobility', 'robustness'];

const pct = (x) => Math.round(Math.max(0, Math.min(1, x)) * 100);

function sportLabel(profile) {
  const code = profile.sport_code
    || (profile.athlete_model && profile.athlete_model.sportingContext && profile.athlete_model.sportingContext.primarySport);
  if (code) {
    const hit = selectableSports().find((s) => s.id === code);
    if (hit) return hit.label;
    return code.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  }
  const legacy = { run: 'Running', cycle: 'Cycling', swim: 'Swimming', gaa: 'GAA' };
  return legacy[profile.sport] || 'Strength';
}

/**
 * computeAtlas(profile, asOfISO) →
 *   { label, hasDemand, estimated, pillars: [{ id, label, score, demand|null,
 *     gap, confidence, source, evidence }], focus: { id, label, score, demand, why } | null }
 *
 * Pure given (profile, asOf) — the caller passes today's date (UI edge owns the clock).
 */
export function computeAtlas(profile = {}, asOfISO = null) {
  const model = performanceModelForProfile(profile, asOfISO) || {};
  const caps = new Map((model.capabilities || []).map((c) => [c.qualityId, c]));
  const cap = (id) => caps.get(id) || { level: 0, confidence: 'low', source: 'inferred', evidence: 'no estimate' };

  let pillars;
  const hasDemand = !!(model.demandProfile && model.demandProfile.length);
  if (hasDemand) {
    pillars = model.demandProfile
      .slice()
      .sort((a, b) => b.importance - a.importance)
      .slice(0, RADAR_MAX)
      .map((d) => {
        const c = cap(d.qualityId);
        return {
          id: d.qualityId, label: labelOf(d.qualityId),
          score: pct(c.level), demand: pct(d.importance),
          gap: pct(d.importance) - pct(c.level),
          confidence: c.confidence, source: c.source, evidence: c.evidence,
        };
      });
  } else {
    pillars = BUILD_QUALITIES.map((id) => {
      const c = cap(id);
      return {
        id, label: labelOf(id), score: pct(c.level), demand: null,
        gap: null, confidence: c.confidence, source: c.source, evidence: c.evidence,
      };
    });
  }

  // The focus IS the engine's top limiting factor (D4) — same diagnosis the planner
  // prioritises from, with its own emitted rationale. Build athletes have no
  // diagnosis, so no focus is invented for them.
  const lf = (model.limitingFactors || [])[0] || null;
  const focus = lf ? {
    id: lf.qualityId, label: labelOf(lf.qualityId),
    score: pct(lf.capabilityLevel), demand: pct(lf.demandImportance),
    why: lf.rationale,
  } : null;

  const estimated = (model.capabilities || []).some((c) => c.source !== 'measured');

  return { label: sportLabel(profile), hasDemand, estimated, pillars, focus };
}

export default { computeAtlas, QUALITY_LABELS };
