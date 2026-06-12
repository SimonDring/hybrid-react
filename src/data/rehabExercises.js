// src/data/rehabExercises.js
// Evidence-based rehab exercises per body_part_key + rehab phase.
// Each entry: id, name, instructions, body_part_keys[], phases[], rationale, duration, equipment.

export const REHAB_EXERCISES = [

  // ── KNEE ─────────────────────────────────────────────────────────────────
  { id: 'quad_set', name: 'Quad set (isometric)',
    instructions: 'Lie flat, roll a towel under the knee. Press the back of the knee into the floor and hold.',
    body_part_keys: ['knee'], phases: ['protect'],
    rationale: 'Activates the quadriceps without any joint compression or movement.',
    duration: '3 × 10 × 5s hold', equipment: 'none' },

  { id: 'slr_knee', name: 'Straight leg raise',
    instructions: 'Lie flat, bend the good leg. Tighten the quad of the injured leg and raise it to 45°, hold 2s, lower slowly.',
    body_part_keys: ['knee'], phases: ['protect', 'early_motion'],
    rationale: 'Builds quad and hip flexor strength with zero knee joint stress.',
    duration: '3 × 15', equipment: 'none' },

  { id: 'tke', name: 'Terminal knee extension (band)',
    instructions: 'Loop a band around a post at knee height. Step back, bend the knee slightly into the band. Straighten fully, squeezing the quad at end range.',
    body_part_keys: ['knee'], phases: ['early_motion', 'loading'],
    rationale: 'Isolates VMO activation in the last 30° of extension — the range lost earliest in knee injuries.',
    duration: '3 × 15 each side', equipment: 'band' },

  { id: 'heel_slide', name: 'Heel slide',
    instructions: 'Lie on your back. Slowly slide the heel toward the buttock as far as comfortable, hold 2s, slide back.',
    body_part_keys: ['knee'], phases: ['early_motion'],
    rationale: 'Gently restores knee flexion range of motion without load.',
    duration: '3 × 10', equipment: 'none' },

  { id: 'mini_squat', name: 'Mini squat (0–60°)',
    instructions: 'Stand with feet shoulder-width apart. Squat to roughly where your thighs are at 30–45° — no deeper. Drive up through the heels.',
    body_part_keys: ['knee'], phases: ['loading'],
    rationale: 'Progressive knee loading in the pain-free range; avoids peak patellofemoral forces at deeper angles.',
    duration: '3 × 12', equipment: 'none' },

  { id: 'low_step_up', name: 'Low step-up',
    instructions: 'Use a 10–15 cm step. Step up leading with the injured leg, control the descent. Keep the knee tracking over the second toe.',
    body_part_keys: ['knee'], phases: ['loading'],
    rationale: 'Single-leg loading in a functional pattern; height controls intensity.',
    duration: '3 × 10 each leg', equipment: 'step' },

  { id: 'leg_press_partial', name: 'Leg press (partial range)',
    instructions: 'Set the seat so the knee starts at 60°. Press to full extension, control the return to 60° only.',
    body_part_keys: ['knee'], phases: ['loading'],
    rationale: 'Controlled bilateral loading for the quad; partial range avoids the painful deep flexion arc.',
    duration: '3 × 12', equipment: 'machine' },

  { id: 'nordic_curl_iso', name: 'Nordic hamstring curl (isometric)',
    instructions: 'Kneel with feet anchored. Lean forward slowly, controlling with the hamstrings. Hold for 5s at 45° from vertical.',
    body_part_keys: ['knee', 'hamstring'], phases: ['loading'],
    rationale: 'Builds hamstring strength that protects the posterior knee capsule and ACL.',
    duration: '3 × 6 × 5s holds', equipment: 'anchor' },

  // ── HAMSTRING ─────────────────────────────────────────────────────────────
  { id: 'prone_knee_bend', name: 'Prone knee bend (pain-free range)',
    instructions: 'Lie face down. Gently bend the knee as far as comfortable without pain, hold 2s, lower.',
    body_part_keys: ['hamstring'], phases: ['protect', 'early_motion'],
    rationale: 'Maintains hamstring flexibility and joint mobility without loading the healing tissue.',
    duration: '3 × 10', equipment: 'none' },

  { id: 'standing_hip_ext', name: 'Standing hip extension',
    instructions: 'Hold a surface for balance. Straighten and lift the injured leg backward 15–20 cm. Keep a neutral spine.',
    body_part_keys: ['hamstring', 'hip'], phases: ['early_motion'],
    rationale: 'Low-load glute and proximal hamstring activation in a position safe for healing muscle fibres.',
    duration: '3 × 10 each side', equipment: 'none' },

  { id: 'nordic_curl_full', name: 'Nordic hamstring curl',
    instructions: 'Kneel with feet anchored. Lean forward as slowly as possible, controlling with your hamstrings. Use hands to push back up.',
    body_part_keys: ['hamstring'], phases: ['loading', 'return_to_sport'],
    rationale: 'The highest-evidence exercise for hamstring injury prevention and rehabilitation.',
    duration: '3 × 5–8 (build reps over weeks)', equipment: 'anchor' },

  { id: 'rdl_light', name: 'Romanian deadlift (light)',
    instructions: 'Hold light dumbbells. Hinge at the hips, keeping the back straight and knees soft. Feel a stretch in the hamstring, then drive the hips forward to stand.',
    body_part_keys: ['hamstring'], phases: ['loading'],
    rationale: 'Progressive eccentric loading of the hamstring — the mechanism that reduces re-injury risk.',
    duration: '3 × 8', equipment: 'dumbbells' },

  { id: 'sprint_prog', name: 'Running progression (graded)',
    instructions: 'Week 1: walk/jog alternating. Week 2: continuous easy jog. Week 3: stride-outs at 75%. Week 4: full effort only when pain-free for 2 weeks.',
    body_part_keys: ['hamstring'], phases: ['return_to_sport'],
    rationale: 'Gradual return-to-running protocol — evidence shows re-injury risk drops sharply with structured progression vs. self-guided return.',
    duration: 'As per weekly phase', equipment: 'none' },

  // ── ANKLE / FOOT ──────────────────────────────────────────────────────────
  { id: 'ankle_alphabet', name: 'Ankle alphabet',
    instructions: 'Seated, ankle off the floor. Trace each letter of the alphabet with your toes, moving only the foot and ankle.',
    body_part_keys: ['ankle'], phases: ['protect', 'early_motion'],
    rationale: 'Restores ankle range of motion in all planes with zero load on healing ligaments.',
    duration: '2 × full alphabet', equipment: 'none' },

  { id: 'seated_calf_raise', name: 'Seated calf raise',
    instructions: 'Seated, knees bent to 90°. Rise up onto the ball of the foot, hold 2s, lower slowly.',
    body_part_keys: ['ankle', 'calf'], phases: ['early_motion'],
    rationale: 'Loads the soleus in a low-demand position — critical for Achilles and ankle recovery.',
    duration: '3 × 15', equipment: 'none' },

  { id: 'single_leg_balance', name: 'Single-leg balance',
    instructions: 'Stand on the injured foot. Hold for 30s. Progress by closing eyes, then standing on a folded mat.',
    body_part_keys: ['ankle'], phases: ['loading', 'return_to_sport'],
    rationale: 'Proprioception training — re-injury risk after ankle sprain is primarily from proprioceptive deficit, not structural weakness.',
    duration: '3 × 30s each side', equipment: 'none' },

  { id: 'banded_eversion', name: 'Banded ankle eversion',
    instructions: 'Seated, band around the outside of the foot. Slowly turn the foot outward against the band resistance, return.',
    body_part_keys: ['ankle'], phases: ['loading'],
    rationale: 'Strengthens the peroneal muscles — the primary stabilisers against the lateral ankle sprain mechanism.',
    duration: '3 × 15 each side', equipment: 'band' },

  { id: 'standing_calf_raise', name: 'Standing calf raise',
    instructions: 'Stand on the edge of a step. Lower the heel below the step level, then rise to full tip-toe. Lower slowly (3s down).',
    body_part_keys: ['ankle', 'calf'], phases: ['loading', 'return_to_sport'],
    rationale: 'Eccentric loading is the most effective protocol for Achilles tendinopathy and ankle stability.',
    duration: '3 × 12 (each leg, build to single-leg)', equipment: 'step' },

  // ── LOWER BACK / LUMBAR ───────────────────────────────────────────────────
  { id: 'knee_to_chest', name: 'Knee to chest stretch',
    instructions: 'Lie on your back. Gently pull one knee toward the chest, hold 20s. Alternate legs.',
    body_part_keys: ['lumbar'], phases: ['protect', 'early_motion'],
    rationale: 'Reduces lumbar compressive load and gently mobilises the facet joints.',
    duration: '3 × 20s each side', equipment: 'none' },

  { id: 'pelvic_tilt', name: 'Pelvic tilt',
    instructions: 'Lie on your back, knees bent. Gently flatten the lower back into the floor by tightening the abdomen, hold 5s.',
    body_part_keys: ['lumbar'], phases: ['protect', 'early_motion'],
    rationale: 'Activates deep abdominal stabilisers without loading the lumbar spine.',
    duration: '3 × 10 × 5s hold', equipment: 'none' },

  { id: 'cat_camel', name: 'Cat-camel',
    instructions: 'On hands and knees. Arch the back up (cat), then let it sag (camel). Move slowly and continuously through the full range.',
    body_part_keys: ['lumbar', 'thoracic'], phases: ['early_motion'],
    rationale: 'Mobilises the lumbar and thoracic spine through its natural flexion-extension range.',
    duration: '2 × 10 slow cycles', equipment: 'none' },

  { id: 'bird_dog', name: 'Bird dog',
    instructions: 'On hands and knees, back flat. Extend one arm and the opposite leg simultaneously. Hold 5s. Keep the hips level — no rotation.',
    body_part_keys: ['lumbar', 'core'], phases: ['early_motion', 'loading'],
    rationale: 'Trains the multifidus and erector spinae without spinal compression — part of the McGill Big 3.',
    duration: '3 × 8 each side × 5s hold', equipment: 'none' },

  { id: 'dead_bug', name: 'Dead bug',
    instructions: 'Lie on your back, arms pointing to ceiling, knees bent to 90° off the floor. Extend opposite arm and leg toward the floor simultaneously. Keep the lower back flat.',
    body_part_keys: ['lumbar', 'core'], phases: ['early_motion', 'loading'],
    rationale: 'Anti-extension core stability in a safe supine position — protects the lumbar spine while building deep core control.',
    duration: '3 × 8 each side', equipment: 'none' },

  { id: 'mcgill_side_plank', name: 'McGill side plank',
    instructions: 'Lie on your side, feet stacked, prop up on the forearm. Raise the hips to form a straight line. Hold.',
    body_part_keys: ['lumbar', 'core'], phases: ['loading'],
    rationale: 'The most effective anti-lateral flexion exercise — part of the McGill Big 3 for low back rehabilitation.',
    duration: '3 × 20–30s each side', equipment: 'none' },

  { id: 'glute_bridge_lumbar', name: 'Glute bridge',
    instructions: 'Lie on your back, knees bent. Drive through the heels, squeeze the glutes, and raise the hips until the body forms a straight line. Hold 2s.',
    body_part_keys: ['lumbar', 'hip'], phases: ['loading'],
    rationale: 'Loads the glutes and hamstrings to share lumbar workload — glute weakness is a common driver of recurrent low back pain.',
    duration: '3 × 12', equipment: 'none' },

  // ── SHOULDER ──────────────────────────────────────────────────────────────
  { id: 'pendulum', name: 'Pendulum (Codman) exercise',
    instructions: 'Lean forward, support the good arm on a table. Let the injured arm hang. Swing it gently in small circles using body weight only.',
    body_part_keys: ['shoulder'], phases: ['protect'],
    rationale: 'Gentle traction distraction of the glenohumeral joint — reduces pain and early stiffness without active muscle contraction.',
    duration: '2 × 30s circles each direction', equipment: 'none' },

  { id: 'scapular_setting', name: 'Scapular setting',
    instructions: 'Sit or stand tall. Gently draw the shoulder blades down and back — as if putting them into your back pockets. Hold 5s.',
    body_part_keys: ['shoulder'], phases: ['protect', 'early_motion'],
    rationale: 'Activates the lower trapezius and serratus anterior to establish correct scapular position before loading.',
    duration: '3 × 10 × 5s hold', equipment: 'none' },

  { id: 'side_lying_er', name: 'Side-lying external rotation',
    instructions: 'Lie on the good side, elbow bent to 90°. Rotate the forearm upward (external rotation), hold 2s, lower slowly. Use a very light dumbbell or no weight.',
    body_part_keys: ['shoulder'], phases: ['early_motion', 'loading'],
    rationale: 'The primary rotator cuff strengthening exercise — targets infraspinatus and teres minor in a gravity-resisted position.',
    duration: '3 × 15', equipment: 'light_dumbbell' },

  { id: 'prone_y', name: 'Prone Y raise',
    instructions: 'Lie face down, arms reaching overhead in a Y shape with thumbs up. Lift the arms a few inches, hold 2s, lower.',
    body_part_keys: ['shoulder'], phases: ['early_motion', 'loading'],
    rationale: 'Lower trapezius activation — critical for scapular upward rotation and rotator cuff health.',
    duration: '3 × 12', equipment: 'none' },

  { id: 'band_row', name: 'Band / cable row (scapular focus)',
    instructions: 'Anchor a band at elbow height. Pull back leading with the elbow, squeeze the scapula. Hold 1s, return slowly.',
    body_part_keys: ['shoulder'], phases: ['loading', 'return_to_sport'],
    rationale: 'Strengthens the mid-trapezius and rhomboids — restores the scapular control needed for overhead activities.',
    duration: '3 × 12', equipment: 'band' },

  { id: 'serratus_wall', name: 'Serratus wall press',
    instructions: 'Stand facing a wall, hands flat. Push the wall as if trying to push it away — protract the shoulder blades maximally. Hold 2s.',
    body_part_keys: ['shoulder'], phases: ['loading'],
    rationale: 'Serratus anterior is the primary scapular protractor — weakness here is the most common cause of shoulder impingement.',
    duration: '3 × 10', equipment: 'none' },
];

// Return rehab exercises for a body part and phase.
// Higher severity (4-5) restricts to the simpler, lower-load exercises.
export function getRehabExercisesFor(body_part_key, rehab_phase, severity = 3) {
  const allPhases = severity >= 4
    ? ['protect']
    : severity <= 2
      ? [rehab_phase, 'return_to_sport']
      : [rehab_phase];

  return REHAB_EXERCISES.filter(ex =>
    ex.body_part_keys.includes(body_part_key) &&
    ex.phases.some(p => allPhases.includes(p))
  );
}

// Return prevention exercises for a recovered body part.
// More exercises when injuryCount >= 2 or recurrence_risk is flagged.
export function getPreventionExercisesFor(body_part_key, full = false) {
  const allPhases = ['loading', 'return_to_sport'];
  const candidates = REHAB_EXERCISES.filter(ex =>
    ex.body_part_keys.includes(body_part_key) &&
    ex.phases.some(p => allPhases.includes(p))
  );
  return full ? candidates : candidates.slice(0, 3);
}

export default { REHAB_EXERCISES, getRehabExercisesFor, getPreventionExercisesFor };
