/**
 * Movement-specific PRIMERS.
 *
 * A "primer" is a short activation move that preps the EXACT pattern you're about
 * to load — e.g. band pull-aparts (scapular retraction) before a bench press, glute
 * bridges before a squat. It is NOT a generic warm-up: each entry is keyed by the
 * movement pattern of the day's main lift, so the primer the athlete sees matches
 * the work they're about to do.
 *
 * Keyed by primer pattern (a coarse grouping of the engine's exercise patterns):
 *   hpush  horizontal press   (bench, push-up, dip, chest press)
 *   vpush  vertical press     (overhead / shoulder press)
 *   squat  knee-dominant      (squat, leg press, lunge, split squat, step-up)
 *   hinge  hip-dominant       (deadlift, RDL, hip thrust, swing, good morning)
 *   pull   horizontal/vertical pull (row, pull-up, chin, lat pulldown, face-pull)
 *
 * Each move carries the SAME item shape the allocator emits (name, sets, rpe, note,
 * restSec, equip) plus an optional `alt` — a no-kit fallback used when the athlete
 * lacks the move's equipment (resolved in lib/plan/primers.js, mirroring how the
 * old functional primer swapped Band Pull-Apart → Scapular Wall Slide).
 *
 * Primer moves are bodyweight/band and tagged `mobility` downstream, so they add
 * ZERO counted muscle volume — they never touch MEV/MAV/MRV accounting.
 */

// Shared no-kit fallbacks.
const SCAP_SLIDE = {
  name: 'Scapular Wall Slide', sets: '2 × 10', rpe: 'RPE 4',
  note: 'Slide arms up the wall — blades down and back', restSec: 0, equip: 'bodyweight'
};
const PRONE_RETRACT = {
  name: 'Prone Scapular Retraction', sets: '2 × 12', rpe: 'RPE 4',
  note: 'Face-down — squeeze the shoulder blades together', restSec: 0, equip: 'bodyweight'
};

export const PRIMERS = {
  hpush: [{ name: 'Band Pull-Apart', sets: '2 × 15', rpe: 'RPE 4',
    note: 'Retract the shoulder blades before pressing', restSec: 0, equip: 'band', alt: SCAP_SLIDE }],

  vpush: [{ name: 'Band Shoulder Dislocate', sets: '2 × 10', rpe: 'Easy',
    note: 'Open the shoulders before pressing overhead', restSec: 0, equip: 'band', alt: SCAP_SLIDE }],

  squat: [{ name: 'Glute Bridge (2s hold)', sets: '2 × 10', rpe: 'RPE 4',
    note: 'Wake the glutes — squeeze 2s at the top', restSec: 0, equip: 'bodyweight' }],

  hinge: [{ name: 'Bodyweight Hip Hinge', sets: '2 × 10', rpe: 'Easy',
    note: 'Groove the hinge — hips back, flat back', restSec: 0, equip: 'bodyweight' }],

  pull: [{ name: 'Band Face-Pull', sets: '2 × 15', rpe: 'RPE 4',
    note: 'Pull to the eyes, elbows high', restSec: 0, equip: 'band', alt: PRONE_RETRACT }]
};

export default { PRIMERS };
