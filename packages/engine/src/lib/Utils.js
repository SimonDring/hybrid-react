/**
 * Utils — pure helper functions.
 *
 * No dependencies on other modules. All functions deterministic.
 * Tested in /tests/utils.test.js.
 */

export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

export const chevronRight = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

/** Round to the nearest half (…, 4.5, 5, 5.5). Used for weekly set-count targets. */
export const roundHalf = (x) => Math.round(x * 2) / 2;

/**
 * Resolve a profile's gym experience level, tolerating legacy focus keys
 * (strength_functional / strength_physique). The `fallback` differs by caller:
 * programme resolution defaults to 'intermediate', everywhere else 'beginner'.
 */
export function getGymLevel(profile, fallback = 'beginner') {
  const e = (profile && profile.experience) || {};
  return e.gym || e.strength_functional || e.strength_physique || fallback;
}

/**
 * Build the canonical key for a specific session within a week.
 * Used as the link between the static plan template and stored session records.
 * Example: weekKey(1, 5, 2) → "p1_wk5_s2"
 */
export function weekKey(phaseId, weekNum, sessionIdx) {
  return `p${phaseId}_wk${weekNum}_s${sessionIdx}`;
}

/**
 * Count completed sessions across the whole sessions object.
 * Handles BOTH the legacy boolean shape (`true`) and the v4 structured shape
 * (`{ completed: true, ... }`). Returns the count of completed entries only —
 * "in progress" sessions are not counted.
 */
export function countCompleted(sessionsObj) {
  return Object.values(sessionsObj).filter(v => {
    if (v === true) return true;
    if (v && typeof v === 'object') return v.completed === true;
    return false;
  }).length;
}

/**
 * Format an elapsed duration between two ISO timestamps as "Xm SSs".
 * Returns empty string for invalid/missing inputs.
 */
export function formatDuration(startISO, endISO) {
  if (!startISO || !endISO) return '';
  const ms = new Date(endISO) - new Date(startISO);
  if (ms < 0 || !isFinite(ms)) return '';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m + 'm ' + s.toString().padStart(2, '0') + 's';
}

/**
 * Parse an exercise's `sets` string + `rpe` string into structured columns
 * for the gym table view.
 *
 * The plan stores sets as human strings like "4 × 5", "3 × 6–8", "3 × 12 ea.",
 * "10 × 20m", "2 min", "see note". This splits them into a typed object so the
 * session table can show aligned columns, and so the future AI engine can read
 * and adjust loads programmatically.
 *
 * Returns:
 *   { type: 'strength', sets: 4, reps: '5' }          // "4 × 5"
 *   { type: 'distance', display: '10 × 20m' }          // swim lengths
 *   { type: 'duration', display: '2 min' }             // timed holds
 *   { type: 'note', display: 'see note' }              // refers to note column
 *   { type: 'raw', display: '...' }                    // anything unrecognised
 *
 * `rpe` is passed through cleaned of the redundant "RPE " prefix.
 */
export function parseExercise(item) {
  const raw = (item.sets || '').trim();
  const rpeClean = (item.rpe || '').replace(/^RPE\s+/i, '').trim();

  // "see note" → defer to the note column
  if (/^see note$/i.test(raw)) {
    return { type: 'note', display: raw, rpe: rpeClean, weight: item.weight || '' };
  }

  // Duration: "2 min", "30s", "60s", "15 min"
  if (/^\d+\s*(min|s|sec|hr)\b/i.test(raw) || /^\d+\s*×?\s*\d*\s*min$/i.test(raw)) {
    if (!/×/.test(raw)) {
      return { type: 'duration', display: raw, rpe: rpeClean, weight: item.weight || '' };
    }
  }

  // Has a "×" — could be strength (sets × reps) or distance (n × 20m)
  if (raw.includes('×')) {
    const [left, right] = raw.split('×').map(s => s.trim());
    const sets = parseInt(left, 10);
    // Distance/interval: right side contains "m" (metres) → swim or run interval
    if (/m\b/i.test(right) || /km/i.test(right)) {
      return { type: 'distance', display: raw, rpe: rpeClean, weight: item.weight || '' };
    }
    // Time-based interval e.g. "6 × 3 min"
    if (/(min|s|sec)\b/i.test(right)) {
      return { type: 'distance', display: raw, rpe: rpeClean, weight: item.weight || '' };
    }
    // Strength: sets × reps (reps may be "5", "6–8", "12 ea.", "8 each")
    if (!isNaN(sets)) {
      return { type: 'strength', sets, reps: right, rpe: rpeClean, weight: item.weight || '' };
    }
  }

  // Fallback — show the raw value
  return { type: 'raw', display: raw, rpe: rpeClean, weight: item.weight || '' };
}

// Default export for namespace-style imports
export default { escapeHtml, chevronRight, roundHalf, getGymLevel, weekKey, countCompleted, formatDuration, parseExercise };
