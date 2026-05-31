/**
 * Activity type registry.
 *
 * Each activity type declares how its exercises should be displayed in the
 * session table: what columns to show, and how to pull each column's value
 * from an exercise object.
 *
 * Why a registry: different activities have fundamentally different metrics.
 * Strength is sets × reps @ weight. Swimming is distance × stroke @ effort.
 * Running is distance/time @ pace. Forcing them all into one column layout
 * reads wrong. This registry lets the session table render the right columns
 * for each activity without hard-coded special cases.
 *
 * To add a new activity later (e.g. cycling):
 *   1. Add an entry here with its columns + accessor functions
 *   2. Tag exercises in Plan.js with that type
 *   3. The session table picks it up automatically — no rendering changes
 *
 * This also gives the future AI engine (Stage 5) a machine-readable contract:
 * it knows a swim session has a "distance" concept, a strength session has a
 * "weight" concept, etc, so it can adjust the right dimension.
 *
 * Column definition:
 *   { key, label, width, align, accessor(item) -> string|number, emphasis? }
 * `emphasis: true` renders the value larger/bolder (the primary number).
 * `span: true` means this column stretches across the numeric area (used when
 * a single value like a distance doesn't decompose into multiple columns).
 */

import { parseExercise } from '../lib/Utils.js';

// Clean an RPE/effort string of the redundant "RPE " prefix
function cleanEffort(v) {
  return (v || '').replace(/^RPE\s+/i, '').trim();
}

export const ACTIVITY_TYPES = {
  strength: {
    key: 'strength',
    label: 'Strength',
    accent: '#0e1410',
    tagBg: '#f0ede8',
    columns: [
      // Strength data stores "4 × 5" as one string; parse it into sets + reps.
      { key: 'sets',   label: 'Sets',   accessor: (it) => { const p = parseExercise(it); return p.type === 'strength' ? p.sets : p.display; }, emphasis: true },
      { key: 'reps',   label: 'Reps',   accessor: (it) => { const p = parseExercise(it); return p.type === 'strength' ? p.reps : ''; } },
      { key: 'rpe',    label: 'RPE',    accessor: (it) => cleanEffort(it.rpe), accent: true },
      { key: 'weight', label: 'Weight', accessor: (it) => it.weight || '—' }
    ],
    cue: (it) => it.note || it.cue || ''
  },

  swim: {
    key: 'swim',
    label: 'Swim',
    accent: '#4a5d3a',
    tagBg: '#e8f0ee',
    columns: [
      { key: 'distance', label: 'Distance', accessor: (it) => it.distance || it.sets, emphasis: true },
      { key: 'stroke',   label: 'Stroke / drill', accessor: (it) => it.stroke || it.name, wide: true },
      { key: 'effort',   label: 'Effort', accessor: (it) => cleanEffort(it.effort || it.rpe), accent: true }
    ],
    cue: (it) => it.cue || it.note || ''
  }
};

// Resolve an exercise to its activity type definition.
// Defaults to strength when no recognised tag is present.
export function activityFor(item) {
  const tag = item.tag;
  if (tag && ACTIVITY_TYPES[tag]) return ACTIVITY_TYPES[tag];
  // 'mobility' and other tags fall back to strength layout for now
  // (sets/reps/RPE works fine for mobility holds). New types get added above.
  return ACTIVITY_TYPES.strength;
}

export default { ACTIVITY_TYPES, activityFor };
