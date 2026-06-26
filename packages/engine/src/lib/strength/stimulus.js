/**
 * stimulus — how much one working set of an exercise counts toward the volume
 * ledger, by the exercise's load class and the athlete's experience level. A
 * loaded compound counts full for everyone; a bird dog loads a novice's core but
 * is a warm-up for an advanced athlete; scapular-health work never counts.
 *
 * Pure. Applied in ONE shared place (the allocator's volume accounting, which
 * stamps item.volumeFactor; countWeeklyVolume reads the stamp) so the count and
 * the plan stay coherent. `factor: 0` means "not counted", NOT "not programmed".
 */

// stimulus factor by load class and athlete level.
export const CLASS_FACTOR = {
  loaded:             { beginner: 1.0, returning: 1.0,  intermediate: 1.0, advanced: 1.0  },
  bodyweightStrength: { beginner: 1.0, returning: 0.75, intermediate: 0.4, advanced: 0.2  },
  isoCore:            { beginner: 0.5, returning: 0.5,  intermediate: 0.3, advanced: 0.15 },
  health:             { beginner: 0,   returning: 0,    intermediate: 0,   advanced: 0    }
};

export function stimulusFactor(ex = {}, level) {
  const row = CLASS_FACTOR[ex.loadClass] || CLASS_FACTOR.loaded;
  return row[level] != null ? row[level] : row.intermediate;
}

export default { stimulusFactor, CLASS_FACTOR };
