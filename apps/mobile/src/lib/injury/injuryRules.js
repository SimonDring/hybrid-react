// src/lib/injury/injuryRules.js
// Pure functions — no side effects.
// Contraindication rules per body_part_key + severity + rehab_phase.

// ── Blocked exercise name patterns per body part and phase ────────────────
// Each phase entry is an array of RegExp patterns matched against item.name.
// Severity >= 4: always use 'protect' patterns regardless of declared phase.
// Severity === 1: return empty (just add a caution note).

const PHASE_PATTERNS = {
  knee: {
    protect: [
      /squat/i, /lunge/i, /leg.?press/i, /step.?up/i, /deadlift/i, /RDL/i,
      /hip.?hinge/i, /nordic/i, /leg.?curl/i, /leg.?extension/i,
      /hip.?thrust/i, /glute.?bridge/i, /split.?squat/i, /bulgarian/i,
      /jump/i, /box.?jump/i, /depth.?jump/i, /plyometric/i,
      /run/i, /sprint/i, /jog/i,
    ],
    early_motion: [
      /squat/i, /lunge/i, /leg.?press/i, /step.?up/i, /deadlift/i,
      /nordic/i, /split.?squat/i, /bulgarian/i,
      /jump/i, /box.?jump/i, /plyometric/i, /run/i, /sprint/i,
    ],
    loading: [
      /jump/i, /box.?jump/i, /depth.?jump/i, /plyometric/i,
      /sprint/i, /run/i,
    ],
    return_to_sport: [],
  },

  ankle: {
    protect: [
      /run/i, /sprint/i, /jog/i, /jump/i, /plyometric/i, /squat/i,
      /lunge/i, /step.?up/i, /calf.?raise/i, /deadlift/i,
    ],
    early_motion: [
      /run/i, /sprint/i, /jump/i, /plyometric/i,
      /heavy.?squat/i, /heavy.?lunge/i,
    ],
    loading: [/sprint/i, /jump.*depth/i, /plyometric/i],
    return_to_sport: [],
  },

  hamstring: {
    protect: [
      /deadlift/i, /RDL/i, /nordic/i, /hamstring.?curl/i, /leg.?curl/i,
      /sprint/i, /run/i, /jump/i, /hip.?hinge/i, /kettlebell.?swing/i,
      /good.?morning/i,
    ],
    early_motion: [
      /deadlift/i, /RDL/i, /nordic/i, /hamstring.?curl/i,
      /sprint/i, /run/i, /jump/i,
    ],
    loading: [/sprint/i, /depth.?jump/i, /plyometric/i],
    return_to_sport: [],
  },

  hip: {
    protect: [
      /squat/i, /lunge/i, /deadlift/i, /hip.?thrust/i, /glute.?bridge/i,
      /run/i, /sprint/i, /jump/i, /step.?up/i, /split.?squat/i,
    ],
    early_motion: [
      /squat/i, /lunge/i, /deadlift/i, /run/i, /sprint/i, /jump/i,
    ],
    loading: [/sprint/i, /jump/i, /plyometric/i],
    return_to_sport: [],
  },

  calf: {
    protect: [
      /run/i, /sprint/i, /jump/i, /plyometric/i, /calf.?raise/i,
      /standing.?calf/i, /squat/i, /lunge/i,
    ],
    early_motion: [/run/i, /sprint/i, /jump/i, /plyometric/i],
    loading: [/sprint/i, /depth.?jump/i, /plyometric/i],
    return_to_sport: [],
  },

  shin: {
    protect: [
      /run/i, /sprint/i, /jump/i, /plyometric/i, /squat/i, /lunge/i,
      /step.?up/i,
    ],
    early_motion: [/run/i, /sprint/i, /jump/i, /plyometric/i],
    loading: [/sprint/i, /jump/i, /plyometric/i],
    return_to_sport: [],
  },

  quad: {
    protect: [
      /squat/i, /lunge/i, /leg.?press/i, /leg.?extension/i, /step.?up/i,
      /jump/i, /sprint/i, /run/i, /split.?squat/i,
    ],
    early_motion: [/squat/i, /lunge/i, /jump/i, /sprint/i, /run/i],
    loading: [/jump/i, /sprint/i],
    return_to_sport: [],
  },

  shoulder: {
    protect: [
      /bench.?press/i, /overhead.?press/i, /shoulder.?press/i, /dumbbell.?press/i,
      /push.?up/i, /dip/i, /pull.?up/i, /lat.?pull/i, /row/i, /fly/i,
      /lateral.?raise/i, /front.?raise/i, /upright.?row/i,
    ],
    early_motion: [
      /bench.?press/i, /overhead.?press/i, /shoulder.?press/i,
      /pull.?up/i, /lat.?pull/i, /heavy.?row/i, /dip/i,
    ],
    loading: [
      /overhead.?press/i, /shoulder.?press/i, /pull.?up/i,
    ],
    return_to_sport: [],
  },

  elbow: {
    protect: [
      /bench.?press/i, /push.?up/i, /dip/i, /skull.?crusher/i,
      /tricep/i, /bicep.?curl/i, /hammer.?curl/i, /row/i, /pull.?up/i,
    ],
    early_motion: [
      /bench.?press/i, /push.?up/i, /dip/i, /skull.?crusher/i,
      /tricep/i, /pull.?up/i,
    ],
    loading: [/heavy.?press/i, /heavy.?pull/i],
    return_to_sport: [],
  },

  wrist: {
    protect: [
      /bench.?press/i, /push.?up/i, /overhead.?press/i, /pull.?up/i,
      /deadlift/i, /barbell/i, /row/i, /dip/i,
    ],
    early_motion: [
      /bench.?press/i, /overhead.?press/i, /pull.?up/i, /deadlift/i,
    ],
    loading: [/overhead.?press/i, /heavy.?deadlift/i],
    return_to_sport: [],
  },

  lumbar: {
    protect: [
      /deadlift/i, /squat/i, /good.?morning/i, /barbell.?row/i,
      /overhead.?press/i, /bent.?over/i, /Romanian/i, /RDL/i,
      /kettlebell.?swing/i, /hip.?hinge/i,
    ],
    early_motion: [
      /deadlift/i, /squat/i, /barbell.?row/i, /good.?morning/i,
      /bent.?over/i, /Romanian/i, /RDL/i,
    ],
    loading: [/heavy.?deadlift/i, /heavy.?squat/i],
    return_to_sport: [],
  },

  thoracic: {
    protect: [
      /overhead.?press/i, /pull.?up/i, /row/i, /bench.?press/i,
      /deadlift/i,
    ],
    early_motion: [/overhead.?press/i, /heavy.?row/i],
    loading: [],
    return_to_sport: [],
  },

  cervical: {
    protect: [
      /overhead.?press/i, /upright.?row/i, /pull.?up/i,
      /shrug/i, /deadlift/i, /barbell/i,
    ],
    early_motion: [/overhead.?press/i, /heavy.?deadlift/i, /shrug/i],
    loading: [],
    return_to_sport: [],
  },

  core: {
    protect: [
      /deadlift/i, /squat/i, /overhead.?press/i, /sit.?up/i,
      /crunch/i, /leg.?raise/i,
    ],
    early_motion: [/deadlift/i, /heavy.?squat/i, /overhead.?press/i],
    loading: [],
    return_to_sport: [],
  },
};

/**
 * Get blocked exercise name patterns for a body part, severity, and phase.
 * @returns {{ blockedPatterns: RegExp[], forcedPhase: string }}
 */
export function getContraindications(body_part_key, severity = 3, rehab_phase = 'protect') {
  const rule = PHASE_PATTERNS[body_part_key];
  if (!rule) return { blockedPatterns: [], forcedPhase: rehab_phase };

  // Severity 1: train with caution, no blocks
  if (severity <= 1) return { blockedPatterns: [], forcedPhase: rehab_phase };

  // Severity 4+: force protect-level blocks regardless of phase
  const effectivePhase = severity >= 4 ? 'protect' : rehab_phase;
  const patterns = rule[effectivePhase] || rule['protect'] || [];

  return { blockedPatterns: patterns, forcedPhase: effectivePhase };
}

export default { getContraindications };
