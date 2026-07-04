/**
 * uiHelpers — presentation-only helpers for rendering plan/health data.
 *
 * Moved OUT of the engine (WP-26): the engine ships coaching decisions, the app
 * decides how they look on screen. Nothing here changes what is prescribed —
 * these only reshape strings/numbers for display.
 */

/**
 * Parse an exercise's `sets` string + `rpe` string into structured columns
 * for the gym table view.
 *
 * The plan stores sets as human strings like "4 × 5", "3 × 6–8", "3 × 12 ea.",
 * "10 × 20m", "2 min", "see note". This splits them into a typed object so the
 * session table can show aligned columns.
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

/** Format a sleep duration (minutes) as "7h 25m". Null when no data. */
export function fmtSleep(min) {
  if (min == null) return null;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}
