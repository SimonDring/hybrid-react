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

// Default export for namespace-style imports
export default { escapeHtml, chevronRight, weekKey, countCompleted, formatDuration };
