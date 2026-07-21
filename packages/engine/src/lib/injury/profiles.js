// src/lib/injury/profiles.js
/**
 * Injury profiles — the structured, evidence-tagged source of truth for the injury
 * layer (schema: ./_schema.js). The phase-staged `contraindications` regex are
 * relocated VERBATIM from the former inline table in injuryRules.js (behaviour
 * unchanged), now alongside risk factors, an evidence-based prevention protocol with
 * dosing + knowledge-base provenance, and return-to-performance notes.
 *
 * Matching is on exercise NAME (session items carry only a name). Severity handling
 * (≤1 = no blocks, ≥4 = force protect) lives in injuryRules.getContraindications.
 */

/** @type {Object<string, import('./_schema.js').InjuryProfile>} */
export const INJURY_PROFILES = {
  knee: {
    region: 'knee',
    label: 'Knee',
    contraindications: {
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
    riskFactors: ['poor landing mechanics / dynamic valgus', 'quad-dominant strength', 'prior knee injury'],
    preventionExercises: [
      { id: 'split_squat', dosing: '2–3×/wk, build eccentric control through full ROM', evidenceId: 'prevention.neuromuscular_acl' },
      { id: 'nordic_curl', dosing: '2×/wk, 2–3 sets — posterior-chain balance', evidenceId: 'prevention.nordic_hamstring' },
      { id: 'glute_bridge_single_leg', dosing: '2×/wk — hip control to limit valgus', evidenceId: 'prevention.neuromuscular_acl' },
    ],
    returnToPerformance: ['restore single-leg strength symmetry (<10% deficit)', 'progress landing/cutting drills before sport'],
  },

  ankle: {
    region: 'ankle',
    label: 'Ankle',
    contraindications: {
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
    riskFactors: ['prior ankle sprain', 'poor single-leg balance / proprioception'],
    preventionExercises: [
      { id: 'sl_calf', dosing: '3×/wk, slow eccentric — restore plantarflexor strength', evidenceId: 'prevention.neuromuscular_acl' },
      { id: 'tibialis_raise', dosing: '2–3×/wk — anterior shin balance', evidenceId: 'prevention.neuromuscular_acl' },
    ],
    returnToPerformance: ['single-leg balance ≥30s eyes-closed', 'pain-free hopping before plyometrics'],
  },

  hamstring: {
    region: 'hamstring',
    label: 'Hamstring',
    contraindications: {
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
    riskFactors: ['prior hamstring strain (strongest predictor)', 'low eccentric hamstring strength', 'high-speed running exposure'],
    preventionExercises: [
      { id: 'nordic_curl', dosing: '1–2×/wk, 2–3 sets of 3–6 eccentric reps; progress volume', progression: 'partial → full ROM → added load', evidenceId: 'prevention.nordic_hamstring' },
      { id: 'rdl', dosing: '1–2×/wk — hip-hinge eccentric loading at length', evidenceId: 'prevention.nordic_hamstring' },
    ],
    returnToPerformance: ['restore eccentric strength symmetry', 'graded high-speed running exposure before full sprinting'],
  },

  hip: {
    region: 'hip',
    label: 'Hip / Groin',
    contraindications: {
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
    riskFactors: ['low adductor strength / adductor:abductor imbalance', 'prior groin injury', 'change-of-direction sport load'],
    preventionExercises: [
      { id: 'copenhagen', dosing: '3×/wk pre-season (6–8 wk), 1×/wk in-season; 3 progression levels', progression: 'short-lever → mid → long-lever (full Copenhagen)', evidenceId: 'prevention.copenhagen_groin' },
      { id: 'lateral_band_walk', dosing: '2×/wk — hip abductor balance', evidenceId: 'prevention.copenhagen_groin' },
    ],
    returnToPerformance: ['pain-free adductor squeeze at strength', 'progressive change-of-direction loading'],
  },

  calf: {
    region: 'calf',
    label: 'Calf',
    contraindications: {
      protect: [
        /run/i, /sprint/i, /jump/i, /plyometric/i, /calf.?raise/i,
        /standing.?calf/i, /squat/i, /lunge/i,
      ],
      early_motion: [/run/i, /sprint/i, /jump/i, /plyometric/i],
      loading: [/sprint/i, /depth.?jump/i, /plyometric/i],
      return_to_sport: [],
    },
    riskFactors: ['prior calf strain', 'low plantarflexor capacity', 'high running volume'],
    preventionExercises: [
      { id: 'sl_calf', dosing: '3×/wk, slow eccentric, straight + bent knee', evidenceId: 'prevention.nordic_hamstring' },
    ],
    returnToPerformance: ['single-leg calf-raise capacity restored', 'graded return to running volume'],
  },

  shin: {
    region: 'shin',
    label: 'Shin',
    contraindications: {
      protect: [
        /run/i, /sprint/i, /jump/i, /plyometric/i, /squat/i, /lunge/i,
        /step.?up/i,
      ],
      early_motion: [/run/i, /sprint/i, /jump/i, /plyometric/i],
      loading: [/sprint/i, /jump/i, /plyometric/i],
      return_to_sport: [],
    },
    riskFactors: ['rapid increase in running load', 'low tibialis strength', 'poor footwear / surface'],
    preventionExercises: [
      { id: 'tibialis_raise', dosing: '2–3×/wk — anterior tibialis capacity', evidenceId: 'prevention.nordic_hamstring' },
    ],
    returnToPerformance: ['pain-free loaded walking', 'graded running progression (<10%/wk)'],
  },

  quad: {
    region: 'quad',
    label: 'Quad',
    contraindications: {
      protect: [
        /squat/i, /lunge/i, /leg.?press/i, /leg.?extension/i, /step.?up/i,
        /jump/i, /sprint/i, /run/i, /split.?squat/i,
      ],
      early_motion: [/squat/i, /lunge/i, /jump/i, /sprint/i, /run/i],
      loading: [/jump/i, /sprint/i],
      return_to_sport: [],
    },
    riskFactors: ['prior quad strain', 'eccentric strength deficit', 'sprint/kicking exposure'],
    preventionExercises: [
      { id: 'split_squat', dosing: '2×/wk — eccentric quad loading through range', evidenceId: 'prevention.neuromuscular_acl' },
    ],
    returnToPerformance: ['restore quad strength symmetry', 'graded sprint/kick exposure'],
  },

  shoulder: {
    region: 'shoulder',
    label: 'Shoulder',
    contraindications: {
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
    riskFactors: ['rotator-cuff / scapular control deficit', 'external:internal rotation imbalance', 'overhead-sport load'],
    preventionExercises: [
      { id: 'face_pull', dosing: '2–3×/wk — posterior cuff + scapular control', evidenceId: 'prevention.neuromuscular_acl' },
      { id: 'prone_y_raise', dosing: '2×/wk — lower-trap / scapular health', evidenceId: 'prevention.neuromuscular_acl' },
    ],
    returnToPerformance: ['restore pain-free overhead ROM', 'progressive pressing/overhead load'],
  },

  elbow: {
    region: 'elbow',
    label: 'Elbow',
    contraindications: {
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
    riskFactors: ['repetitive gripping/loading (tendinopathy)', 'sudden load spikes'],
    preventionExercises: [
      { id: 'wrist_curl', dosing: '2–3×/wk — isometric → slow eccentric forearm loading' },
    ],
    returnToPerformance: ['pain-free gripping at load', 'graded pressing/pulling return'],
  },

  wrist: {
    region: 'wrist',
    label: 'Wrist',
    contraindications: {
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
    riskFactors: ['prior wrist sprain', 'loaded extension under bodyweight (push-ups, front rack)'],
    preventionExercises: [
      { id: 'wrist_curl', dosing: '2–3×/wk — graded wrist flexion/extension loading' },
    ],
    returnToPerformance: ['pain-free loaded extension', 'reintroduce barbell holds progressively'],
  },

  lumbar: {
    region: 'lumbar',
    label: 'Lower back',
    contraindications: {
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
    riskFactors: ['poor trunk endurance / motor control', 'high spinal-load exposure', 'prior low-back pain'],
    preventionExercises: [
      { id: 'dead_bug', dosing: '2–3×/wk — anti-extension trunk control', evidenceId: 'prevention.neuromuscular_acl' },
      { id: 'side_plank', dosing: '2–3×/wk — lateral trunk endurance (McGill)', evidenceId: 'prevention.neuromuscular_acl' },
      { id: 'pallof', dosing: '2×/wk — anti-rotation control', evidenceId: 'prevention.neuromuscular_acl' },
    ],
    returnToPerformance: ['restore trunk endurance', 'reload hinge/squat from light, controlled positions'],
  },

  thoracic: {
    region: 'thoracic',
    label: 'Mid back',
    contraindications: {
      protect: [
        /overhead.?press/i, /pull.?up/i, /row/i, /bench.?press/i,
        /deadlift/i,
      ],
      early_motion: [/overhead.?press/i, /heavy.?row/i],
      loading: [],
      return_to_sport: [],
    },
    riskFactors: ['poor thoracic mobility', 'prolonged flexed posture'],
    preventionExercises: [
      { id: 'thoracic_foam_roller', dosing: 'daily — restore thoracic extension/rotation' },
    ],
    returnToPerformance: ['restore pain-free thoracic rotation', 'progressive pulling/overhead load'],
  },

  cervical: {
    region: 'cervical',
    label: 'Neck',
    contraindications: {
      protect: [
        /overhead.?press/i, /upright.?row/i, /pull.?up/i,
        /shrug/i, /deadlift/i, /barbell/i,
      ],
      early_motion: [/overhead.?press/i, /heavy.?deadlift/i, /shrug/i],
      loading: [],
      return_to_sport: [],
    },
    riskFactors: ['poor deep-neck-flexor control', 'sustained loaded postures'],
    preventionExercises: [
      { id: 'dead_bug', dosing: '2×/wk — proximal trunk/neck control' },
    ],
    returnToPerformance: ['pain-free cervical ROM', 'reintroduce axial loading gradually'],
  },

  core: {
    region: 'core',
    label: 'Core / Abdominal',
    contraindications: {
      protect: [
        /deadlift/i, /squat/i, /overhead.?press/i, /sit.?up/i,
        /crunch/i, /leg.?raise/i,
      ],
      early_motion: [/deadlift/i, /heavy.?squat/i, /overhead.?press/i],
      loading: [],
      return_to_sport: [],
    },
    riskFactors: ['prior abdominal strain', 'rapid loaded-flexion exposure'],
    preventionExercises: [
      { id: 'dead_bug', dosing: '2–3×/wk — anti-extension control', evidenceId: 'prevention.neuromuscular_acl' },
      { id: 'side_plank', dosing: '2–3×/wk — lateral trunk endurance' },
    ],
    returnToPerformance: ['restore trunk control without pain', 'progressive loaded bracing'],
  },
};

// The injury taxonomy's region vocabulary — the SOLE legal token set for a position's
// `commonInjuryRegions` (Sprint 3 B3). A region maps a body area to its evidence-based
// prevention protocol (preventionExercises above), so a position that flags a region can
// have that region's prevention entries preferred at selection.
export const INJURY_REGIONS = Object.keys(INJURY_PROFILES);

/**
 * preventionIdsForRegions — Sprint 3 B3: resolve a set of injury regions to the exercise
 * ids their prevention protocols recommend (INJURY_PROFILES[region].preventionExercises).
 * PURE: deduped + sorted for determinism. Unknown regions contribute nothing (a nudge,
 * never a gate). This is the "prevention library" a position's commonInjuryRegions map onto.
 * @param {string[]} regions
 * @returns {string[]} deterministic, deduped exercise ids
 */
export function preventionIdsForRegions(regions = []) {
  const ids = new Set();
  for (const region of regions || []) {
    const profile = INJURY_PROFILES[region];
    if (!profile) continue;
    for (const ex of profile.preventionExercises || []) if (ex && ex.id) ids.add(ex.id);
  }
  return [...ids].sort();
}

export default INJURY_PROFILES;
