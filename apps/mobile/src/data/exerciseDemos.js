/**
 * Exercise demo data — key-pose frames for the animated stick-figure demos.
 *
 * Each demo is a short loop of poses the StickFigureDemo component interpolates
 * between (so you see the movement), with a caption per pose. A pose maps joint
 * names → [x, y] in a 0–100 box (y down; figure faces right; ground ≈ y 90).
 *
 * Each demo can declare its OWN skeleton via `bones` (a list of joint pairs to
 * draw) so two-arm / two-leg movements work, not just the side view. `dots`
 * marks joints to emphasise (hands/feet); `ground:false` hides the floor line
 * (lying / hanging movements). Reference a demo from exerciseLibrary.js with
 * `demo: 'squat'`. This is the framework the form-video library grows from.
 */

// Skeleton presets (joint-pair "bones" to draw).
export const SIDE_BONES = [
  ['head', 'shoulder'], ['shoulder', 'elbow'], ['elbow', 'hand'],
  ['shoulder', 'hip'], ['hip', 'knee'], ['knee', 'ankle']
];
const TWO_LEG = [
  ['head', 'shoulder'], ['shoulder', 'elbow'], ['elbow', 'hand'], ['shoulder', 'hip'],
  ['hip', 'kneeF'], ['kneeF', 'ankleF'], ['hip', 'kneeB'], ['kneeB', 'ankleB']
];
const TWO_ARM = [
  ['head', 'shoulder'], ['shoulder', 'elbowN'], ['elbowN', 'handN'], ['shoulder', 'elbowF'], ['elbowF', 'handF'],
  ['shoulder', 'hip'], ['hip', 'knee'], ['knee', 'ankle']
];
const FRONT = [
  ['head', 'shoulder'], ['shoulder', 'elbowN'], ['elbowN', 'handN'], ['shoulder', 'elbowF'], ['elbowF', 'handF'],
  ['shoulder', 'hip'], ['hip', 'kneeF'], ['kneeF', 'ankleF'], ['hip', 'kneeB'], ['kneeB', 'ankleB']
];

export const DEMOS = {
  // ---------------- lower body ----------------
  squat: {
    // Back squat — to PARALLEL (thigh horizontal at the bottom). The bar sits on the traps, in line with
    // the hands and slightly to the REAR of the torso (translucent plate so the hands show). The neck
    // stays in line with the torso. Front squat / goblet reuse this leg+torso shape; only hands + weight change.
    name: 'Back squat', dots: ['hand'], props: [{ type: 'barbell', at: 'hand' }],
    captions: ['Brace — bar on the traps, tall', 'Sit to parallel — hips back, knees forward, torso leans', 'Drive up through mid-foot'],
    frames: [
      { head: [50, 13], shoulder: [50, 28], elbow: [44, 34], hand: [47, 27], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [57, 40], shoulder: [50, 52], elbow: [44, 57], hand: [47, 50], hip: [38, 72], knee: [57, 72], ankle: [50, 90] },
      { head: [50, 13], shoulder: [50, 28], elbow: [44, 34], hand: [47, 27], hip: [50, 52], knee: [50, 71], ankle: [50, 90] }
    ]
  },
  frontsquat: {
    // Front squat — to parallel, MORE UPRIGHT torso than the back squat (bar in the front rack keeps the
    // weight forward, so the COG sits with a taller torso). Bar across the front of the shoulders / clavicle.
    name: 'Front squat', dots: ['hand'], props: [{ type: 'barbell', at: 'rack' }],
    captions: ['Front rack — elbows high, bar on the shoulders', 'Sit to parallel — torso tall, bar over mid-foot', 'Drive up, elbows stay high'],
    frames: [
      { head: [51, 13], shoulder: [50, 28], elbow: [59, 30], hand: [53, 25], hip: [50, 52], knee: [50, 71], ankle: [50, 90], rack: [54, 27] },
      { head: [51, 37], shoulder: [47, 50], elbow: [60, 48], hand: [53, 46], hip: [40, 72], knee: [59, 72], ankle: [50, 90], rack: [54, 49] },
      { head: [51, 13], shoulder: [50, 28], elbow: [59, 30], hand: [53, 25], hip: [50, 52], knee: [50, 71], ankle: [50, 90], rack: [54, 27] }
    ]
  },
  goblet: {
    // Goblet squat — to parallel, upright torso. The dumbbell is held VERTICALLY by one end, just below
    // the chin (vert flag rotates it 90°).
    name: 'Goblet squat', dots: ['hand'], props: [{ type: 'dumbbell', at: 'hand', vert: true }],
    captions: ['Hold the dumbbell on end, just below the chin', 'Sit to parallel — chest up, weight stays high', 'Drive up through mid-foot'],
    frames: [
      { head: [51, 13], shoulder: [50, 28], elbow: [52, 42], hand: [54, 32], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [51, 37], shoulder: [47, 50], elbow: [51, 58], hand: [53, 50], hip: [40, 72], knee: [59, 72], ankle: [50, 90] },
      { head: [51, 13], shoulder: [50, 28], elbow: [52, 42], hand: [54, 32], hip: [50, 52], knee: [50, 71], ankle: [50, 90] }
    ]
  },
  rdl: {
    // STRAIGHT-LEG hip hinge (RDL), double leg. Legs nearly straight (soft knee). Arms hang VERTICAL with
    // the bar; the bar tracks straight down the front of the legs (over the mid-foot) to ~mid-shin as the
    // hips push BACK, then drives back up. Neck stays in line with the torso.
    name: 'Straight-leg hinge (RDL)', dots: ['hand'], props: [{ type: 'barbell', at: 'hand' }],
    captions: ['Stand tall, soft knees — bar at the thighs', 'Push the hips BACK — bar tracks down the legs, only a soft knee bend', 'Drive the hips forward to stand tall'],
    frames: [
      { head: [50, 12], shoulder: [50, 27], elbow: [50, 38], hand: [50, 49], hip: [50, 52], knee: [50, 70], ankle: [50, 90] },
      { head: [63, 39], shoulder: [52, 46], elbow: [52, 58], hand: [52, 69], hip: [32, 58], knee: [45, 73], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [50, 38], hand: [50, 49], hip: [50, 52], knee: [50, 70], ankle: [50, 90] }
    ]
  },
  sldl: {
    // SINGLE-LEG straight-leg hinge. Stand on one (planted) leg with a soft knee; the free leg sweeps
    // straight BACK behind as the torso tips forward, the weight lowering down the planted leg.
    name: 'Single-leg straight-leg hinge', bones: TWO_LEG, dots: ['hand', 'ankleF', 'ankleB'], shinFeet: true, props: [{ type: 'dumbbell', at: 'hand' }],
    captions: ['Stand on one leg — both feet forward, soft knee', 'Hinge — the free leg sweeps straight BACK (full length), arm hangs down', 'Return to standing tall'],
    frames: [
      { head: [50, 12], shoulder: [50, 27], elbow: [50, 38], hand: [50, 49], hip: [50, 52], kneeF: [50, 71], ankleF: [50, 90], kneeB: [50, 71], ankleB: [50, 90] },
      { head: [74, 40], shoulder: [62, 46], elbow: [62, 57], hand: [62, 68], hip: [44, 54], kneeF: [49, 71], ankleF: [50, 90], kneeB: [27, 57], ankleB: [10, 56] },
      { head: [50, 12], shoulder: [50, 27], elbow: [50, 38], hand: [50, 49], hip: [50, 52], kneeF: [50, 71], ankleF: [50, 90], kneeB: [50, 71], ankleB: [50, 90] }
    ]
  },
  deadlift: {
    // BENT-LEG hip hinge (deadlift), double leg. STARTS on the floor (bar on the ground), more knee bend
    // than the RDL. Stand up in one smooth motion — the bar tracks up the legs, weight over the mid-foot.
    name: 'Bent-leg hinge (deadlift)', dots: ['hand'], props: [{ type: 'barbell', at: 'hand' }],
    captions: ['Set up over the bar on the floor — hips set, shins close', 'Stand up in one smooth motion — bar stays in front of the legs, over mid-foot', 'Lower the bar back down the legs'],
    frames: [
      { head: [64, 53], shoulder: [54, 60], elbow: [54, 72], hand: [56, 85], hip: [42, 68], knee: [53, 73], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [50, 40], hand: [51, 52], hip: [50, 52], knee: [49, 70], ankle: [50, 90] },
      { head: [64, 53], shoulder: [54, 60], elbow: [54, 72], hand: [56, 85], hip: [42, 68], knee: [53, 73], ankle: [50, 90] }
    ]
  },
  lunge: {
    // Lunge / split squat with dumbbells. STEP the front foot out (it lifts and lands forward — not a
    // slide), then lower DEEP: front thigh ~parallel, back knee dropping toward the floor on the ball of
    // the back foot. Torso stays upright. Feet follow the shins (shinFeet).
    name: 'Lunge / split squat', bones: TWO_LEG, dots: ['ankleF', 'ankleB', 'hand'], props: [{ type: 'dumbbell', at: 'hand' }],
    captions: ['Stand tall, dumbbells at your sides', 'Step the front foot forward — knee bends up', 'Lower deep — front thigh parallel, back knee toward the floor'],
    frames: [
      { head: [50, 13], shoulder: [50, 28], elbow: [50, 41], hand: [50, 54], hip: [50, 53], kneeF: [50, 71], ankleF: [50, 90], toeF: [57, 90], kneeB: [50, 71], ankleB: [50, 90], toeB: [57, 90] },
      { head: [50, 14], shoulder: [50, 29], elbow: [50, 42], hand: [50, 55], hip: [50, 54], kneeF: [66, 58], ankleF: [62, 74], toeF: [69, 76], kneeB: [49, 71], ankleB: [50, 90], toeB: [57, 90] },
      { head: [48, 32], shoulder: [48, 47], elbow: [48, 57], hand: [48, 67], hip: [48, 71], kneeF: [66, 72], ankleF: [68, 90], toeF: [75, 90], kneeB: [47, 86], ankleB: [32, 85], toeB: [37, 90] }
    ]
  },
  hipthrust: {
    // upper back on the bench, shoulders fixed, feet planted, bar across the hips
    name: 'Hip thrust', dots: ['hand', 'ankle'],
    props: [{ type: 'bench', at: [20, 72], w: 28 }, { type: 'barbell', at: 'hip' }],
    captions: ['Shoulders on the bench, hips low', 'Drive the hips up — bar over the hips, shins vertical', 'Lower with control'],
    frames: [
      { head: [24, 67], shoulder: [32, 71], elbow: [42, 77], hand: [52, 82], hip: [52, 82], knee: [67, 72], ankle: [72, 90] },
      { head: [24, 67], shoulder: [32, 71], elbow: [43, 71], hand: [54, 71], hip: [54, 71], knee: [72, 71], ankle: [72, 90] },
      { head: [24, 67], shoulder: [32, 71], elbow: [42, 77], hand: [52, 82], hip: [52, 82], knee: [67, 72], ankle: [72, 90] }
    ]
  },
  calf: {
    // balls of the feet on a step edge, heels hang off behind; movement is ankle flexion only
    name: 'Standing calf raise', dots: ['ankle'],
    props: [{ type: 'step', at: [66, 84], w: 24 }],
    captions: ['Balls on the step edge, heels dropped — calf stretch', 'Drive up onto the balls of the feet', 'Lower the heels under control'],
    frames: [
      { head: [51, 21], shoulder: [51, 36], elbow: [56, 45], hand: [59, 50], hip: [51, 51], knee: [52, 69], ankle: [50, 88], toe: [54, 84] },
      { head: [50, 14], shoulder: [50, 29], elbow: [55, 38], hand: [58, 43], hip: [50, 44], knee: [51, 62], ankle: [49, 81], toe: [54, 84] },
      { head: [51, 21], shoulder: [51, 36], elbow: [56, 45], hand: [59, 50], hip: [51, 51], knee: [52, 69], ankle: [50, 88], toe: [54, 84] }
    ]
  },
  seatedcalf: {
    // seated, knee at 90°, dumbbell resting on the knee; ball on a small step, heel drives up
    name: 'Seated calf raise', dots: ['ankle'],
    props: [{ type: 'bench', at: [28, 63], w: 26 }, { type: 'step', at: [68, 84], w: 16 }, { type: 'dumbbell', at: 'knee' }],
    captions: ['Sit tall, knee bent 90°, weight on the knee, heel dropped', 'Drive up through the ball of the foot', 'Lower the heel below the step'],
    frames: [
      { head: [40, 33], shoulder: [40, 47], elbow: [48, 57], hand: [57, 67], hip: [40, 62], knee: [57, 68], ankle: [56, 86], toe: [60, 84] },
      { head: [40, 33], shoulder: [40, 47], elbow: [49, 54], hand: [58, 61], hip: [40, 62], knee: [58, 62], ankle: [58, 80], toe: [60, 84] },
      { head: [40, 33], shoulder: [40, 47], elbow: [48, 57], hand: [57, 67], hip: [40, 62], knee: [57, 68], ankle: [56, 86], toe: [60, 84] }
    ]
  },

  // ---------------- upper body ----------------
  press: {
    // Strict press: the bar starts in front of the clavicle, the head leans BACK to clear it, then the
    // head presses 'through' the window as the bar locks out directly over the head. Knees softly unlocked.
    name: 'Overhead press', dots: ['hand'], props: [{ type: 'barbell', at: 'hand' }],
    captions: ['Bar in front of the shoulders — head leans back', 'Press past the face — head comes through', 'Locked out — elbow by the head, bar stacked high above'],
    frames: [
      { head: [45, 26], shoulder: [50, 37], elbow: [55, 52], hand: [54, 40], hip: [50, 56], knee: [51, 73], ankle: [50, 90] },
      { head: [50, 24], shoulder: [50, 37], elbow: [50, 20], hand: [50, 8], hip: [50, 56], knee: [51, 73], ankle: [50, 90] },
      { head: [45, 26], shoulder: [50, 37], elbow: [55, 52], hand: [54, 40], hip: [50, 56], knee: [51, 73], ankle: [50, 90] }
    ]
  },
  bench: {
    // Lying flat on a bench, feet planted on the floor. The bar travels straight up/down over the chest
    // with the shoulder and elbow opening together for a strong, stacked press.
    name: 'Bench press', dots: ['hand'], props: [{ type: 'bench', at: [38, 62], w: 44 }, { type: 'barbell', at: 'hand' }],
    captions: ['Lie flat, blades set, bar stacked over the shoulder', 'Lower to the chest — shoulder and elbow open together', 'Press straight back up'],
    frames: [
      { head: [24, 60], shoulder: [34, 60], elbow: [34, 49], hand: [34, 37], hip: [54, 60], knee: [64, 74], ankle: [60, 90] },
      { head: [24, 60], shoulder: [34, 60], elbow: [40, 68], hand: [35, 57], hip: [54, 60], knee: [64, 74], ankle: [60, 90] },
      { head: [24, 60], shoulder: [34, 60], elbow: [34, 49], hand: [34, 37], hip: [54, 60], knee: [64, 74], ankle: [60, 90] }
    ]
  },
  pushup: {
    // Hands and toes STATIC on the floor; the body lowers as a straight plank by bending at the
    // shoulders and elbows — the chest/shoulders travel toward the ground.
    name: 'Push-up', dots: ['hand', 'ankle'],
    captions: ['Top — straight line from head to heels', 'Lower the chest — shoulders and elbows both open', 'Press back up'],
    frames: [
      { head: [67, 65], shoulder: [58, 70], elbow: [59, 80], hand: [60, 90], hip: [46, 77], knee: [37, 82], ankle: [28, 87], toe: [23, 90] },
      { head: [67, 74], shoulder: [59, 78], elbow: [49, 84], hand: [60, 90], hip: [45, 82], knee: [37, 85], ankle: [28, 88], toe: [23, 90] },
      { head: [67, 65], shoulder: [58, 70], elbow: [59, 80], hand: [60, 90], hip: [46, 77], knee: [37, 82], ankle: [28, 87], toe: [23, 90] }
    ]
  },
  pullup: {
    // Wider-than-shoulder grip; knees bent with the ankles crossed behind (shins form an X).
    name: 'Pull-up', bones: FRONT, dots: ['handN', 'handF'], ground: false,
    captions: ['Dead hang — wide grip, ankles crossed', 'Pull the chest to the bar', 'Lower under control'],
    frames: [
      { head: [50, 32], shoulder: [50, 40], elbowN: [44, 27], handN: [40, 14], elbowF: [56, 27], handF: [60, 14], hip: [50, 60], kneeF: [55, 69], kneeB: [45, 69], ankleF: [48, 81], ankleB: [52, 81], toeF: [45, 85], toeB: [55, 85] },
      { head: [50, 22], shoulder: [50, 30], elbowN: [43, 21], handN: [40, 14], elbowF: [57, 21], handF: [60, 14], hip: [50, 50], kneeF: [55, 59], kneeB: [45, 59], ankleF: [48, 71], ankleB: [52, 71], toeF: [45, 75], toeB: [55, 75] },
      { head: [50, 32], shoulder: [50, 40], elbowN: [44, 27], handN: [40, 14], elbowF: [56, 27], handF: [60, 14], hip: [50, 60], kneeF: [55, 69], kneeB: [45, 69], ankleF: [48, 81], ankleB: [52, 81], toeF: [45, 85], toeB: [55, 85] }
    ]
  },
  row: {
    // Hinged over with bent knees; the weight hangs straight down, then is pulled into the lower
    // belly/waist with the elbow driving up and BACK behind the torso (perpendicular to the spine).
    name: 'Row', dots: ['hand'], props: [{ type: 'barbell', at: 'hand' }],
    captions: ['Hinge with bent knees, weight hanging long', 'Row to the belly — elbow drives up and back', 'Lower to a full stretch'],
    frames: [
      { head: [66, 41], shoulder: [60, 48], elbow: [60, 59], hand: [60, 69], hip: [44, 66], knee: [53.5, 76], ankle: [50, 90] },
      { head: [66, 41], shoulder: [60, 48], elbow: [49, 51], hand: [52, 60], hip: [44, 66], knee: [53.5, 76], ankle: [50, 90] },
      { head: [66, 41], shoulder: [60, 48], elbow: [60, 59], hand: [60, 69], hip: [44, 66], knee: [53.5, 76], ankle: [50, 90] }
    ]
  },
  curl: {
    // Elbow pinned just in front of the torso (for separation); the forearm keeps a constant length
    // so the hand sweeps a smooth circular arc. Dumbbell shown end-on in the hand.
    // Dense steps along the forearm's arc + linear interpolation = one continuous, fluid sweep
    // (easeInOut would stop dead at every keyframe). Forearm length is constant (radius 13 from the
    // pinned elbow), so the hand traces a clean semicircle out in front of the body and back.
    name: 'Biceps curl', dots: ['hand'], props: [{ type: 'dumbbellEnd', at: 'hand' }], linear: true, segMs: 180,
    captions: ['Arm long by your side', 'Curl up and out', 'Curl up and out', 'Curl up and out', 'Curl up and out', 'Curl up and out', 'Curl up and out', 'Curl up and out', 'Top — hand to the shoulder', 'Lower under control', 'Lower under control', 'Lower under control', 'Lower under control', 'Lower under control', 'Lower under control', 'Lower under control'],
    frames: [
      { head: [50, 12], shoulder: [50, 27], elbow: [52, 41], hand: [52, 54], hip: [50, 52], knee: [51, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [52, 41], hand: [56, 53], hip: [50, 52], knee: [51, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [52, 41], hand: [60, 51], hip: [50, 52], knee: [51, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [52, 41], hand: [63, 48], hip: [50, 52], knee: [51, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [52, 41], hand: [65, 43], hip: [50, 52], knee: [51, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [52, 41], hand: [65, 39], hip: [50, 52], knee: [51, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [52, 41], hand: [63, 35], hip: [50, 52], knee: [51, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [52, 41], hand: [60, 31], hip: [50, 52], knee: [51, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [52, 41], hand: [57, 29], hip: [50, 52], knee: [51, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [52, 41], hand: [60, 31], hip: [50, 52], knee: [51, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [52, 41], hand: [63, 35], hip: [50, 52], knee: [51, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [52, 41], hand: [65, 39], hip: [50, 52], knee: [51, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [52, 41], hand: [65, 43], hip: [50, 52], knee: [51, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [52, 41], hand: [63, 48], hip: [50, 52], knee: [51, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [52, 41], hand: [60, 51], hip: [50, 52], knee: [51, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [52, 41], hand: [56, 53], hip: [50, 52], knee: [51, 71], ankle: [50, 90] }
    ]
  },
  lateralraise: {
    name: 'Lateral raise', bones: FRONT, dots: ['handN', 'handF'], props: [{ type: 'dumbbell', at: 'handN' }, { type: 'dumbbell', at: 'handF' }],
    captions: ['A dumbbell in each hand, arms at your sides', 'Raise out to shoulder height', 'Lower slowly'],
    frames: [
      { head: [50, 12], shoulder: [50, 27], elbowN: [46, 38], handN: [44, 50], elbowF: [54, 38], handF: [56, 50], hip: [50, 52], kneeF: [45, 71], ankleF: [45, 90], kneeB: [55, 71], ankleB: [55, 90] },
      { head: [50, 12], shoulder: [50, 27], elbowN: [39, 28], handN: [30, 27], elbowF: [61, 28], handF: [70, 27], hip: [50, 52], kneeF: [45, 71], ankleF: [45, 90], kneeB: [55, 71], ankleB: [55, 90] },
      { head: [50, 12], shoulder: [50, 27], elbowN: [46, 38], handN: [44, 50], elbowF: [54, 38], handF: [56, 50], hip: [50, 52], kneeF: [45, 71], ankleF: [45, 90], kneeB: [55, 71], ankleB: [55, 90] }
    ]
  },

  // ---------------- core ----------------
  plank: {
    // Forearm plank: elbows on the floor, hands forward, neutral neck, up on the toes
    // (most people can't keep a flat foot here). Held isometrically with a subtle brace.
    name: 'Plank', dots: ['elbow', 'toe'],
    captions: ['Forearms down, body in a straight line', 'Hold — glutes & core tight'],
    frames: [
      { head: [62, 72], shoulder: [54, 75], elbow: [54, 89], hand: [63, 89], hip: [41, 79], knee: [31, 82], ankle: [23, 85], toe: [26, 90] },
      { head: [62, 71], shoulder: [54, 74], elbow: [54, 89], hand: [63, 89], hip: [41, 78], knee: [31, 81], ankle: [23, 84], toe: [26, 90] }
    ]
  },

  // ---------------- accessories / carry / plyo (first-draft — refine) ----------------
  carry: {
    // March in place: each foot clearly LIFTS off the floor and plants (a step), not a slide.
    name: "Loaded carry", bones: TWO_LEG, dots: ['hand', 'ankleF', 'ankleB'], props: [{ type: 'dumbbellEnd', at: 'hand' }],
    captions: ['Stand tall, a weight in each hand', 'Step — pick the foot up', 'Tall and braced', 'Step — other foot up'],
    frames: [
      { head: [50, 14], shoulder: [50, 29], elbow: [50, 40], hand: [50, 51], hip: [50, 52], kneeF: [54, 72], ankleF: [56, 90], kneeB: [46, 72], ankleB: [44, 90] },
      { head: [50, 13], shoulder: [50, 28], elbow: [50, 39], hand: [50, 50], hip: [50, 51], kneeF: [56, 68], ankleF: [58, 84], kneeB: [46, 72], ankleB: [44, 90] },
      { head: [50, 14], shoulder: [50, 29], elbow: [50, 40], hand: [50, 51], hip: [50, 52], kneeF: [54, 72], ankleF: [56, 90], kneeB: [46, 72], ankleB: [44, 90] },
      { head: [50, 13], shoulder: [50, 28], elbow: [50, 39], hand: [50, 50], hip: [50, 51], kneeF: [54, 72], ankleF: [56, 90], kneeB: [44, 68], ankleB: [42, 84] }
    ]
  },
  stepup: {
    // Both feet start on the floor in front of the box. The front foot steps up; the torso leans so the
    // centre of gravity stacks over the front foot, then the back foot steps up to MEET it (level, not
    // past it). Dumbbells hang in the hands.
    name: 'Step-up', bones: TWO_LEG, dots: ['ankleF', 'ankleB', 'hand'], props: [{ type: 'step', at: [64, 80], w: 24 }, { type: 'dumbbellEnd', at: 'hand' }],
    captions: ['Stand at the box, feet on the floor', 'Front foot onto the box — weight over it', 'Back foot up to meet it, stand tall'],
    frames: [
      { head: [46, 20], shoulder: [46, 34], elbow: [46, 42], hand: [46, 50], hip: [46, 55], kneeF: [52, 72], ankleF: [52, 90], kneeB: [40, 72], ankleB: [40, 90] },
      { head: [61, 28], shoulder: [60, 41], elbow: [60, 49], hand: [60, 57], hip: [55, 55], kneeF: [63, 67], ankleF: [60, 80], kneeB: [47, 74], ankleB: [42, 90] },
      { head: [60, 21], shoulder: [60, 33], elbow: [60, 41], hand: [60, 49], hip: [59, 48], kneeF: [60, 64], ankleF: [60, 80], kneeB: [57, 64], ankleB: [56, 80] }
    ]
  },
  facepull: {
    // Side-on view facing a cable machine; rope at face height. Pull the hands to the ears, elbows high.
    name: 'Face pull', dots: ['hand'], props: [{ type: 'cable', at: [86, 24], to: 'hand' }],
    captions: ['Reach forward to the rope at face height', 'Pull the hands to your ears — elbows high', 'Return slow under control'],
    frames: [
      { head: [50, 16], shoulder: [50, 30], elbow: [58, 28], hand: [67, 28], hip: [50, 52], knee: [51, 71], ankle: [50, 90] },
      { head: [50, 16], shoulder: [50, 30], elbow: [45, 22], hand: [51, 17], hip: [50, 52], knee: [51, 71], ankle: [50, 90] },
      { head: [50, 16], shoulder: [50, 30], elbow: [58, 28], hand: [67, 28], hip: [50, 52], knee: [51, 71], ankle: [50, 90] }
    ]
  },
  nordic: {
    // Knees and shins on the floor (anchored heels). Slow, controlled eccentric.
    name: 'Nordic hamstring curl', dots: ['hand'], props: [{ type: 'anchor', at: 'ankle' }], segMs: 1800,
    captions: ['Tall kneel — heels anchored, glutes squeezed', 'Lower slowly — hamstrings resist', 'Catch on your hands, push back up'],
    frames: [
      { head: [50, 31], shoulder: [50, 47], elbow: [46, 57], hand: [46, 67], hip: [50, 67], knee: [50, 89], ankle: [44, 89] },
      { head: [68, 45], shoulder: [60, 57], elbow: [64, 65], hand: [70, 71], hip: [55, 69], knee: [50, 89], ankle: [44, 89] },
      { head: [80, 63], shoulder: [71, 69], elbow: [77, 79], hand: [84, 89], hip: [58, 79], knee: [50, 89], ankle: [44, 89] }
    ]
  },
  copenhagen: {
    // Side-on: bottom forearm on the floor, TOP leg resting on a bench, BOTTOM leg hanging below it.
    // The top arm rests on the hip (so it reads clearly as a side view).
    name: 'Copenhagen plank', bones: FRONT, dots: ['ankleF', 'handF'], props: [{ type: 'bench', at: [82, 69], w: 20 }],
    captions: ['On your side — forearm down, top leg on the bench', 'Lift the hips into a straight line', 'Hold, then lower'],
    frames: [
      { head: [18, 70], shoulder: [26, 73], elbowN: [26, 88], handN: [37, 88], elbowF: [38, 69], handF: [52, 71], hip: [54, 72], kneeF: [68, 71], ankleF: [82, 69], toeF: [89, 68], kneeB: [56, 76], ankleB: [59, 81], toeB: [62, 85] },
      { head: [18, 67], shoulder: [26, 70], elbowN: [26, 88], handN: [37, 88], elbowF: [38, 66], handF: [52, 67], hip: [54, 68], kneeF: [68, 68], ankleF: [82, 69], toeF: [89, 68], kneeB: [56, 73], ankleB: [59, 78], toeB: [62, 82] },
      { head: [18, 70], shoulder: [26, 73], elbowN: [26, 88], handN: [37, 88], elbowF: [38, 69], handF: [52, 71], hip: [54, 72], kneeF: [68, 71], ankleF: [82, 69], toeF: [89, 68], kneeB: [56, 76], ankleB: [59, 81], toeB: [62, 85] }
    ]
  },
  plyo: {
    // Ankle-driven pogo: stiff knees, big ankle flexion (loaded/flat on the floor → pointed in the air),
    // with a natural countermovement arm swing (back & down on the load, up & forward off the floor).
    name: 'Pogo hops / plyometrics', dots: ['ankle'],
    captions: ['Tall, stiff knees — load the ankles', 'Spring off the toes — arms swing up', 'Land soft on the balls of the feet'],
    frames: [
      { head: [50, 16], shoulder: [50, 30], elbow: [46, 40], hand: [43, 48], hip: [50, 53], knee: [52, 70], ankle: [50, 85], toe: [54, 90] },
      { head: [50, 11], shoulder: [50, 25], elbow: [55, 19], hand: [61, 12], hip: [50, 48], knee: [52, 64], ankle: [50, 76], toe: [51, 83] },
      { head: [50, 16], shoulder: [50, 30], elbow: [46, 40], hand: [43, 48], hip: [50, 53], knee: [52, 70], ankle: [50, 85], toe: [54, 90] }
    ]
  },

  // ---------------- more accessories (first-draft — refine) ----------------
  tricep: {
    // Elbow pinned by the side but offset just in front of the torso (separation/clarity). The forearm
    // pivots around the fixed elbow at constant length, sweeping a semicircle down in front of the body.
    name: 'Triceps extension / pushdown', dots: ['hand'], props: [{ type: 'cable', at: [60, 9], to: 'hand', post: false }], linear: true, segMs: 170,
    captions: ['Elbows pinned in front, forearms up', 'Push down', 'Push down', 'Push down', 'Push down', 'Push down', 'Extended — elbows locked', 'Return up', 'Return up', 'Return up', 'Return up', 'Return up'],
    frames: [
      { head: [50, 12], shoulder: [50, 27], elbow: [53, 42], hand: [62, 34], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [53, 42], hand: [64, 37], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [53, 42], hand: [65, 42], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [53, 42], hand: [64, 46], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [53, 42], hand: [62, 50], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [53, 42], hand: [58, 53], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [53, 42], hand: [53, 54], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [53, 42], hand: [58, 53], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [53, 42], hand: [62, 50], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [53, 42], hand: [64, 46], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [53, 42], hand: [65, 42], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [53, 42], hand: [64, 37], hip: [50, 52], knee: [50, 71], ankle: [50, 90] }
    ]
  },
  fly: {
    name: 'Chest fly', bones: FRONT, dots: ['handN', 'handF'], props: [{ type: 'cable', at: [8, 30], to: 'handN' }, { type: 'cable', at: [92, 30], to: 'handF' }],
    captions: ['Arms open wide, slight elbow bend', 'Squeeze the arms across the chest', 'Open back with control'],
    frames: [
      { head: [50, 13], shoulder: [50, 28], elbowN: [38, 30], handN: [28, 34], elbowF: [62, 30], handF: [72, 34], hip: [50, 52], kneeF: [46, 71], ankleF: [46, 90], kneeB: [54, 71], ankleB: [54, 90] },
      { head: [50, 13], shoulder: [50, 28], elbowN: [46, 26], handN: [49, 22], elbowF: [54, 26], handF: [51, 22], hip: [50, 52], kneeF: [46, 71], ankleF: [46, 90], kneeB: [54, 71], ankleB: [54, 90] },
      { head: [50, 13], shoulder: [50, 28], elbowN: [38, 30], handN: [28, 34], elbowF: [62, 30], handF: [72, 34], hip: [50, 52], kneeF: [46, 71], ankleF: [46, 90], kneeB: [54, 71], ankleB: [54, 90] }
    ]
  },
  legext: {
    // Seated machine: backrest fairly upright (small hip angle), thighs on the seat, ankle pad (roller)
    // on the shins. Toes stay pointed (ankle ~45–60°, not a flat 90°) as the knees straighten.
    name: 'Leg extension', dots: ['ankle'], props: [{ type: 'seat', at: [36, 58], w: 20, bh: 22 }, { type: 'roller', at: 'ankle', dx: 3, pivot: [58, 58] }], linear: true, segMs: 210,
    captions: ['Seated tall, shins hanging down', 'Straighten', 'Straighten', 'Straighten — toes pointed', 'Knees locked, toes pointed', 'Lower', 'Lower', 'Lower'],
    frames: [
      { head: [37, 28], shoulder: [39, 42], elbow: [43, 50], hand: [46, 57], hip: [40, 56], knee: [58, 56], ankle: [58, 74], toe: [58, 81] },
      { head: [37, 28], shoulder: [39, 42], elbow: [43, 50], hand: [46, 57], hip: [40, 56], knee: [58, 56], ankle: [65, 72], toe: [66, 79] },
      { head: [37, 28], shoulder: [39, 42], elbow: [43, 50], hand: [46, 57], hip: [40, 56], knee: [58, 56], ankle: [71, 68], toe: [74, 74] },
      { head: [37, 28], shoulder: [39, 42], elbow: [43, 50], hand: [46, 57], hip: [40, 56], knee: [58, 56], ankle: [75, 62], toe: [79, 68] },
      { head: [37, 28], shoulder: [39, 42], elbow: [43, 50], hand: [46, 57], hip: [40, 56], knee: [58, 56], ankle: [76, 54], toe: [81, 59] },
      { head: [37, 28], shoulder: [39, 42], elbow: [43, 50], hand: [46, 57], hip: [40, 56], knee: [58, 56], ankle: [75, 62], toe: [79, 68] },
      { head: [37, 28], shoulder: [39, 42], elbow: [43, 50], hand: [46, 57], hip: [40, 56], knee: [58, 56], ankle: [71, 68], toe: [74, 74] },
      { head: [37, 28], shoulder: [39, 42], elbow: [43, 50], hand: [46, 57], hip: [40, 56], knee: [58, 56], ankle: [65, 72], toe: [66, 79] }
    ]
  },
  proney: {
    // TOP-DOWN view (looking at the back of someone lying face-down). The arms cycle through the
    // shapes: Y (arms 45° by the head), T (straight out), W (bent elbows). Lift is toward the viewer.
    name: 'Prone raise (Y / T / W)', bones: FRONT, dots: ['handN', 'handF'], ground: false,
    captions: ['Y — arms 45° up by the head', 'T — arms straight out to the sides', 'W — elbows bent, squeeze the upper back'],
    frames: [
      { head: [50, 15], shoulder: [50, 30], elbowN: [40, 24], handN: [30, 17], elbowF: [60, 24], handF: [70, 17], hip: [50, 58], kneeF: [47, 72], ankleF: [46, 85], toeF: [45, 90], kneeB: [53, 72], ankleB: [54, 85], toeB: [55, 90] },
      { head: [50, 15], shoulder: [50, 30], elbowN: [39, 30], handN: [28, 30], elbowF: [61, 30], handF: [72, 30], hip: [50, 58], kneeF: [47, 72], ankleF: [46, 85], toeF: [45, 90], kneeB: [53, 72], ankleB: [54, 85], toeB: [55, 90] },
      { head: [50, 15], shoulder: [50, 30], elbowN: [34, 35], handN: [42, 23], elbowF: [66, 35], handF: [58, 23], hip: [50, 58], kneeF: [47, 72], ankleF: [46, 85], toeF: [45, 90], kneeB: [53, 72], ankleB: [54, 85], toeB: [55, 90] }
    ]
  },
  serratus: {
    // Pushing against a wall in front: reach forward, shoulder blade protracts (slides forward).
    name: 'Serratus punch / wall slide', dots: ['hand'], props: [{ type: 'wall', at: [79, 0] }],
    captions: ['Arm out at shoulder height, hand on the wall', 'Reach forward — shoulder blade slides forward', 'Return with control'],
    frames: [
      { head: [50, 14], shoulder: [50, 28], elbow: [62, 30], hand: [73, 31], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [52, 14], shoulder: [53, 28], elbow: [65, 30], hand: [77, 31], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [50, 14], shoulder: [50, 28], elbow: [62, 30], hand: [73, 31], hip: [50, 52], knee: [50, 71], ankle: [50, 90] }
    ]
  },
  er: {
    // Side-lying: bottom forearm props the torso up slightly (separation), top arm does the external
    // rotation with a small dumbbell — elbow pinned at the waist, forearm rotates up.
    // Forearm pivots around the pinned elbow through a big arc — from down at the floor all the way up
    // to vertical (pointing at the sky). Fluid (linear) so it doesn't collapse through the elbow.
    name: 'External rotation', bones: FRONT, dots: ['handF'], props: [{ type: 'dumbbellEnd', at: 'handF' }], linear: true, segMs: 200,
    captions: ['Forearm down, elbow pinned at the waist', 'Rotate up', 'Rotate up', 'Rotate up', 'Forearm points to the sky', 'Lower', 'Lower', 'Lower'],
    frames: [
      { head: [26, 72], shoulder: [40, 78], elbowN: [40, 88], handN: [50, 88], elbowF: [52, 82], handF: [52, 90], hip: [60, 86], kneeF: [73, 87], ankleF: [86, 87], kneeB: [73, 87], ankleB: [86, 87] },
      { head: [26, 72], shoulder: [40, 78], elbowN: [40, 88], handN: [50, 88], elbowF: [52, 82], handF: [57, 88], hip: [60, 86], kneeF: [73, 87], ankleF: [86, 87], kneeB: [73, 87], ankleB: [86, 87] },
      { head: [26, 72], shoulder: [40, 78], elbowN: [40, 88], handN: [50, 88], elbowF: [52, 82], handF: [60, 83], hip: [60, 86], kneeF: [73, 87], ankleF: [86, 87], kneeB: [73, 87], ankleB: [86, 87] },
      { head: [26, 72], shoulder: [40, 78], elbowN: [40, 88], handN: [50, 88], elbowF: [52, 82], handF: [58, 77], hip: [60, 86], kneeF: [73, 87], ankleF: [86, 87], kneeB: [73, 87], ankleB: [86, 87] },
      { head: [26, 72], shoulder: [40, 78], elbowN: [40, 88], handN: [50, 88], elbowF: [52, 82], handF: [52, 74], hip: [60, 86], kneeF: [73, 87], ankleF: [86, 87], kneeB: [73, 87], ankleB: [86, 87] },
      { head: [26, 72], shoulder: [40, 78], elbowN: [40, 88], handN: [50, 88], elbowF: [52, 82], handF: [58, 77], hip: [60, 86], kneeF: [73, 87], ankleF: [86, 87], kneeB: [73, 87], ankleB: [86, 87] },
      { head: [26, 72], shoulder: [40, 78], elbowN: [40, 88], handN: [50, 88], elbowF: [52, 82], handF: [60, 83], hip: [60, 86], kneeF: [73, 87], ankleF: [86, 87], kneeB: [73, 87], ankleB: [86, 87] },
      { head: [26, 72], shoulder: [40, 78], elbowN: [40, 88], handN: [50, 88], elbowF: [52, 82], handF: [57, 88], hip: [60, 86], kneeF: [73, 87], ankleF: [86, 87], kneeB: [73, 87], ankleB: [86, 87] }
    ]
  },
  clean: {
    // Hang clean, all in front of the body: bar just above the knee → explosive hip extension (tall,
    // on the toes) → catch in the front rack at the clavicle (like the front-squat top).
    name: 'Clean (power / hang)', dots: ['hand'], props: [{ type: 'barbell', at: 'hand' }], linear: true, segMs: 250,
    // per-segment speed: drive→pull→high-pull fire fast (explosive), setup/catch/hold/lower stay measured
    durs: [1.0, 0.5, 0.4, 0.4, 0.5, 0.7, 1.0, 2.2, 1.3, 1.3, 1.3, 1.4],
    captions: ['Hang — bar above the knee, arms vertical down', 'Drive — knees and hips straighten', 'Extend tall — bar at the hip', 'Pull — elbows lead up, bar close to the body', 'High pull — elbows high (flaring out to the sides)', 'Whip the elbows under', 'Catch — bend the knees to absorb', 'Stand tall — front rack at the clavicle', 'Lower', 'Lower', 'Lower', 'Lower'],
    frames: [
      { head: [60, 31], shoulder: [54, 38], elbow: [54, 51], hand: [54, 64], hip: [44, 55], knee: [52, 70], ankle: [50, 90] },
      { head: [55, 22], shoulder: [52, 33], elbow: [52, 46], hand: [52, 58], hip: [48, 53], knee: [51, 68], ankle: [50, 90] },
      { head: [50, 15], shoulder: [50, 28], elbow: [51, 41], hand: [51, 53], hip: [50, 49], knee: [50, 67], ankle: [50, 89] },
      { head: [50, 14], shoulder: [50, 27], elbow: [53, 33], hand: [53, 43], hip: [50, 49], knee: [50, 67], ankle: [50, 88] },
      { head: [50, 13], shoulder: [50, 27], elbow: [54, 24], hand: [54, 33], hip: [50, 49], knee: [50, 67], ankle: [50, 88] },
      { head: [50, 13], shoulder: [50, 27], elbow: [58, 31], hand: [54, 30], hip: [50, 50], knee: [50, 68], ankle: [50, 89] },
      { head: [50, 16], shoulder: [50, 30], elbow: [56, 40], hand: [54, 32], hip: [50, 54], knee: [50, 73], ankle: [50, 90] },
      { head: [50, 13], shoulder: [50, 27], elbow: [56, 37], hand: [54, 29], hip: [50, 50], knee: [50, 69], ankle: [50, 90] },
      { head: [50, 13], shoulder: [50, 27], elbow: [58, 31], hand: [54, 30], hip: [50, 50], knee: [50, 68], ankle: [50, 89] },
      { head: [50, 13], shoulder: [50, 27], elbow: [54, 24], hand: [54, 33], hip: [50, 49], knee: [50, 67], ankle: [50, 88] },
      { head: [50, 15], shoulder: [50, 28], elbow: [51, 41], hand: [51, 53], hip: [50, 49], knee: [50, 67], ankle: [50, 89] },
      { head: [55, 22], shoulder: [52, 33], elbow: [52, 46], hand: [52, 58], hip: [48, 53], knee: [51, 68], ankle: [50, 90] }
    ]
  },
  sled: {
    // Set-up / ready position: bent over into the sled, neutral spine and neck, back leg driving,
    // hands on the poles. Just the braced position (not an actual push cycle).
    name: 'Sled push', bones: TWO_LEG, dots: ['hand', 'ankleF', 'ankleB'], props: [{ type: 'sled', at: [78, 53] }],
    captions: ['Bent over the sled — neutral spine and neck', 'Braced and leaning in, ready to drive'],
    frames: [
      { head: [64, 47], shoulder: [56, 53], elbow: [66, 55], hand: [76, 57], hip: [42, 67], kneeF: [48, 76], ankleF: [44, 90], kneeB: [33, 78], ankleB: [24, 90] },
      { head: [66, 48], shoulder: [58, 54], elbow: [68, 56], hand: [77, 57], hip: [43, 68], kneeF: [50, 76], ankleF: [44, 90], kneeB: [34, 79], ankleB: [24, 90] }
    ]
  },
  abduction: {
    // Side-lying: propped on the bottom forearm, top arm resting down the side, bottom leg on the floor
    // at all times; only the TOP leg lifts up and away (abduction).
    name: 'Hip abduction', bones: FRONT, dots: ['ankleF'],
    captions: ['Side-lying, propped on the bottom forearm', 'Lift the top leg up and away', 'Lower slowly — bottom leg stays down'],
    frames: [
      { head: [26, 73], shoulder: [36, 78], elbowN: [34, 89], handN: [44, 89], elbowF: [47, 82], handF: [57, 85], hip: [58, 84], kneeF: [72, 84], ankleF: [86, 84], kneeB: [72, 86], ankleB: [86, 88] },
      { head: [26, 73], shoulder: [36, 78], elbowN: [34, 89], handN: [44, 89], elbowF: [47, 82], handF: [57, 85], hip: [58, 84], kneeF: [71, 78], ankleF: [84, 72], kneeB: [72, 86], ankleB: [86, 88] },
      { head: [26, 73], shoulder: [36, 78], elbowN: [34, 89], handN: [44, 89], elbowF: [47, 82], handF: [57, 85], hip: [58, 84], kneeF: [72, 84], ankleF: [86, 84], kneeB: [72, 86], ankleB: [86, 88] }
    ]
  },
  bandwalk: {
    // Crab walk: band around the ankles, athletic stance; step wide to one side, the other foot catches up.
    name: 'Lateral band walk', bones: FRONT, dots: ['ankleF', 'ankleB'], props: [{ type: 'band', from: 'ankleF', to: 'ankleB' }],
    captions: ['Band around the ankles, athletic stance', 'Big step out to the side', 'The other foot catches up', 'Step out the other way'],
    frames: [
      { head: [50, 16], shoulder: [50, 30], elbowN: [45, 41], handN: [44, 52], elbowF: [55, 41], handF: [56, 52], hip: [50, 52], kneeF: [46, 70], ankleF: [44, 90], kneeB: [54, 70], ankleB: [56, 90] },
      { head: [50, 16], shoulder: [50, 30], elbowN: [45, 41], handN: [44, 52], elbowF: [55, 41], handF: [56, 52], hip: [50, 52], kneeF: [40, 71], ankleF: [33, 90], kneeB: [54, 70], ankleB: [56, 90] },
      { head: [50, 16], shoulder: [50, 30], elbowN: [45, 41], handN: [44, 52], elbowF: [55, 41], handF: [56, 52], hip: [50, 52], kneeF: [46, 70], ankleF: [44, 90], kneeB: [54, 70], ankleB: [56, 90] },
      { head: [50, 16], shoulder: [50, 30], elbowN: [45, 41], handN: [44, 52], elbowF: [55, 41], handF: [56, 52], hip: [50, 52], kneeF: [46, 70], ankleF: [44, 90], kneeB: [60, 71], ankleB: [67, 90] }
    ]
  },
  birddog: {
    // On all fours (both hands + both knees down). One arm reaches forward and the OPPOSITE leg reaches
    // back, level; the other hand and knee stay planted.
    name: 'Bird dog', bones: FRONT, dots: ['handF', 'ankleB'],
    captions: ['On hands and knees, flat back', 'Reach the opposite arm and leg out level', 'Return, then switch sides'],
    frames: [
      { head: [36, 69], shoulder: [44, 65], elbowN: [44, 77], handN: [44, 89], elbowF: [44, 77], handF: [44, 89], hip: [64, 65], kneeF: [64, 89], ankleF: [74, 89], kneeB: [64, 89], ankleB: [74, 89] },
      { head: [34, 62], shoulder: [44, 65], elbowN: [44, 77], handN: [44, 89], elbowF: [33, 62], handF: [22, 59], hip: [64, 65], kneeF: [64, 89], ankleF: [74, 89], kneeB: [75, 71], ankleB: [87, 64] },
      { head: [36, 69], shoulder: [44, 65], elbowN: [44, 77], handN: [44, 89], elbowF: [44, 77], handF: [44, 89], hip: [64, 65], kneeF: [64, 89], ankleF: [74, 89], kneeB: [64, 89], ankleB: [74, 89] }
    ]
  },
  catcamel: {
    // Hands and knees on the floor (a mid-spine joint lets the back actually bend): round UP (spine to
    // the sky, chin tucked) then arch DOWN (belly drops, head to the ceiling).
    name: 'Cat-camel', bones: [['head', 'shoulder'], ['shoulder', 'elbow'], ['elbow', 'hand'], ['shoulder', 'mid'], ['mid', 'hip'], ['hip', 'knee'], ['knee', 'ankle']], dots: ['hand'],
    captions: ['Round the back up — spine to the sky, chin tucked', 'Arch — drop the belly, head to the ceiling'],
    frames: [
      { head: [36, 67], shoulder: [40, 62], mid: [53, 54], elbow: [40, 76], hand: [40, 89], hip: [66, 62], knee: [66, 89], ankle: [76, 89], toe: [82, 88] },
      { head: [31, 55], shoulder: [40, 63], mid: [53, 70], elbow: [40, 76], hand: [40, 89], hip: [66, 63], knee: [66, 89], ankle: [76, 89], toe: [82, 88] }
    ]
  },

  // ---------------- dedicated splits of earlier stand-ins (first-draft — refine) ----------------
  tibraise: {
    name: 'Tibialis raise', bones: [...SIDE_BONES, ['ankle', 'toe']], dots: ['toe'],
    captions: ['Stand tall, heels down', 'Pull the toes up toward your shins', 'Lower the toes with control'],
    frames: [
      { head: [50, 14], shoulder: [50, 29], elbow: [48, 40], hand: [49, 51], hip: [50, 52], knee: [52, 71], ankle: [50, 89], toe: [57, 90] },
      { head: [50, 14], shoulder: [50, 29], elbow: [48, 40], hand: [49, 51], hip: [50, 52], knee: [52, 71], ankle: [50, 89], toe: [56, 83] },
      { head: [50, 14], shoulder: [50, 29], elbow: [48, 40], hand: [49, 51], hip: [50, 52], knee: [52, 71], ankle: [50, 89], toe: [57, 90] }
    ]
  },
  legpress: {
    // Seated machine: reclined back pad behind the torso, feet on the moving foot plate (translucent).
    name: 'Leg press', dots: ['ankle'], props: [{ type: 'line', at: [14, 65], to: [41, 81], w: 5 }, { type: 'line', at: [49, 68], to: [85, 43], w: 1.5, dash: true }, { type: 'footplate', at: 'ankle', rot: -35 }],
    captions: ['Bottom — knees bent toward the chest', 'Press the legs out', 'Return with control'],
    frames: [
      { head: [18, 59], shoulder: [26, 64], elbow: [34, 72], hand: [42, 79], hip: [45, 75], knee: [44, 61], ankle: [59, 61], toe: [64, 56] },
      { head: [18, 59], shoulder: [26, 64], elbow: [34, 72], hand: [42, 79], hip: [45, 75], knee: [56, 64], ankle: [72, 52], toe: [78, 48] },
      { head: [18, 59], shoulder: [26, 64], elbow: [34, 72], hand: [42, 79], hip: [45, 75], knee: [44, 61], ankle: [59, 61], toe: [64, 56] }
    ]
  },
  pullover: {
    // Lying back with the upper back/shoulders on a bench (shoulders fixed). A dumbbell in the hands
    // reaches back over the head into a deep stretch, then pulls back over the chest.
    name: 'Dumbbell pullover', ground: false, dots: ['hand'], props: [{ type: 'bench', at: [52, 58], w: 30 }, { type: 'dumbbellEnd', at: 'hand' }],
    captions: ['Lying back, arms over the chest', 'Reach back over the head — deep stretch', 'Pull back over the chest'],
    frames: [
      { head: [64, 54], shoulder: [56, 55], elbow: [56, 44], hand: [56, 33], hip: [44, 57], knee: [36, 66], ankle: [31, 74] },
      { head: [66, 52], shoulder: [56, 55], elbow: [67, 47], hand: [80, 47], hip: [44, 57], knee: [36, 66], ankle: [31, 74] },
      { head: [64, 54], shoulder: [56, 55], elbow: [56, 44], hand: [56, 33], hip: [44, 57], knee: [36, 66], ankle: [31, 74] }
    ]
  },
  swing: {
    // Straight arms (motion comes from the shoulder, not the elbow): the bell swings on a long arm in an
    // arc from between the legs up to in front. Hip hinge drives it.
    name: 'Kettlebell swing', dots: ['hand'], props: [{ type: 'kettlebell', at: 'hand' }],
    captions: ['Hinge — bell back between the legs', 'Snap the hips — swing it up in an arc', 'Let it swing back down'],
    frames: [
      { head: [63, 33], shoulder: [56, 40], elbow: [50, 52], hand: [44, 64], hip: [44, 52], knee: [50, 68], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [59, 28], hand: [68, 30], hip: [50, 50], knee: [50, 70], ankle: [50, 90] },
      { head: [63, 33], shoulder: [56, 40], elbow: [50, 52], hand: [44, 64], hip: [44, 52], knee: [50, 68], ankle: [50, 90] }
    ]
  },
  goodmorning: {
    // Same hip hinge as the RDL, but the bar is racked on the back (traps), like a squat — not in the hands.
    name: 'Good morning', dots: ['hand'], props: [{ type: 'barbell', at: 'hand' }],
    captions: ['Bar on the back (traps), soft knees', 'Hinge — push the hips back, flat back', 'Stand tall, squeeze the glutes'],
    frames: [
      { head: [50, 13], shoulder: [50, 28], elbow: [44, 34], hand: [47, 27], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [63, 39], shoulder: [52, 46], elbow: [46, 51], hand: [50, 46], hip: [32, 58], knee: [45, 73], ankle: [50, 90] },
      { head: [50, 13], shoulder: [50, 28], elbow: [44, 34], hand: [47, 27], hip: [50, 52], knee: [50, 71], ankle: [50, 90] }
    ]
  },
  dip: {
    // Supported on parallel dip bars (hands fixed at the sides). Lower by bending the shoulder and elbow;
    // legs hang in a neutral position.
    name: 'Dip', ground: false, dots: ['hand'], props: [{ type: 'dipbar', at: [50, 42], w: 20 }],
    captions: ['Support tall on the bars, arms straight', 'Lower — chest forward, elbows tuck back, forearms vertical', 'Press back up to lockout'],
    frames: [
      { head: [50, 14], shoulder: [50, 26], elbow: [50, 34], hand: [50, 42], hip: [50, 54], knee: [48, 70], ankle: [46, 85] },
      { head: [58, 27], shoulder: [57, 38], elbow: [50, 34], hand: [50, 42], hip: [54, 58], knee: [51, 73], ankle: [49, 87] },
      { head: [50, 14], shoulder: [50, 26], elbow: [50, 34], hand: [50, 42], hip: [50, 54], knee: [48, 70], ankle: [46, 85] }
    ]
  },
  hanging: {
    name: 'Hanging knee raise', ground: false, dots: ['hand'], props: [{ type: 'pullupbar', at: [50, 14], w: 26 }],
    captions: ['Dead hang, shoulders set', 'Raise the knees toward the chest', 'Lower the legs with control'],
    frames: [
      { head: [48, 34], shoulder: [50, 40], elbow: [50, 27], hand: [50, 15], hip: [50, 62], knee: [50, 80], ankle: [50, 92] },
      { head: [48, 34], shoulder: [50, 40], elbow: [50, 27], hand: [50, 15], hip: [50, 62], knee: [58, 56], ankle: [66, 60] },
      { head: [48, 34], shoulder: [50, 40], elbow: [50, 27], hand: [50, 15], hip: [50, 62], knee: [50, 80], ankle: [50, 92] }
    ]
  },
  abwheel: {
    // Kneeling (knees fixed on the floor). The wheel rolls forward as the body extends into a long line,
    // then the abs pull it back.
    name: 'Ab-wheel rollout', dots: ['knee'], props: [{ type: 'abwheel', at: 'hand' }],
    captions: ['Kneeling, wheel under the shoulders', 'Roll out — long, braced body', 'Pull back with the abs'],
    frames: [
      { head: [50, 64], shoulder: [46, 62], elbow: [52, 72], hand: [58, 84], hip: [40, 68], knee: [32, 86], ankle: [26, 86] },
      { head: [66, 70], shoulder: [58, 70], elbow: [69, 78], hand: [82, 86], hip: [46, 76], knee: [32, 86], ankle: [26, 86] },
      { head: [50, 64], shoulder: [46, 62], elbow: [52, 72], hand: [58, 84], hip: [40, 68], knee: [32, 86], ankle: [26, 86] }
    ]
  },
  woodchop: {
    name: 'Cable woodchop', dots: ['hand'], props: [{ type: 'cable', at: [86, 12], to: 'hand' }],
    captions: ['Start high to one side', 'Chop diagonally across the body', 'Control back to the top'],
    frames: [
      { head: [50, 14], shoulder: [50, 28], elbow: [58, 22], hand: [66, 16], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [50, 15], shoulder: [50, 29], elbow: [44, 40], hand: [36, 50], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [50, 14], shoulder: [50, 28], elbow: [58, 22], hand: [66, 16], hip: [50, 52], knee: [50, 71], ankle: [50, 90] }
    ]
  },
  pallof: {
    // FRONT view: the cable is anchored to the left and pulls across the body. Both hands hold the
    // handle at the chest and press it straight out (arms extend); resist the pull twisting you.
    name: 'Pallof press', bones: FRONT, dots: ['handN'], props: [{ type: 'cable', at: [9, 34], to: 'handN' }],
    captions: ['Handle at the chest, cable pulling from the side', 'Press straight out — stay square, resist the twist', 'Return to the chest'],
    frames: [
      { head: [50, 15], shoulder: [50, 30], elbowN: [41, 33], handN: [50, 35], elbowF: [59, 33], handF: [50, 35], hip: [50, 52], kneeF: [44, 70], ankleF: [43, 90], kneeB: [56, 70], ankleB: [57, 90] },
      { head: [50, 15], shoulder: [50, 30], elbowN: [47, 35], handN: [50, 38], elbowF: [53, 35], handF: [50, 38], hip: [50, 52], kneeF: [44, 70], ankleF: [43, 90], kneeB: [56, 70], ankleB: [57, 90] },
      { head: [50, 15], shoulder: [50, 30], elbowN: [41, 33], handN: [50, 35], elbowF: [59, 33], handF: [50, 35], hip: [50, 52], kneeF: [44, 70], ankleF: [43, 90], kneeB: [56, 70], ankleB: [57, 90] }
    ]
  }
};

export default { DEMOS, SIDE_BONES };
