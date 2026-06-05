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
    name: 'Squat',
    captions: ['Brace — chest up, tall', 'Sit hips back & down', 'Drive up through mid-foot'],
    frames: [
      { head: [50, 12], shoulder: [50, 27], elbow: [58, 34], hand: [66, 38], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [45, 23], shoulder: [46, 37], elbow: [56, 41], hand: [66, 43], hip: [41, 60], knee: [58, 69], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [58, 34], hand: [66, 38], hip: [50, 52], knee: [50, 71], ankle: [50, 90] }
    ]
  },
  hinge: {
    name: 'Hip hinge (RDL / deadlift)',
    captions: ['Stand tall, soft knees', 'Push hips back, flat back', 'Squeeze glutes to stand'],
    frames: [
      { head: [50, 12], shoulder: [50, 27], elbow: [50, 39], hand: [50, 50], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [64, 30], shoulder: [60, 38], elbow: [57, 48], hand: [55, 58], hip: [44, 52], knee: [48, 70], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [50, 39], hand: [50, 50], hip: [50, 52], knee: [50, 71], ankle: [50, 90] }
    ]
  },
  lunge: {
    name: 'Lunge / split squat', bones: TWO_LEG, dots: ['ankleF', 'ankleB', 'hand'],
    captions: ['Stand tall, staggered', 'Lower — both knees ~90°', 'Drive through the front heel'],
    frames: [
      { head: [50, 13], shoulder: [50, 28], elbow: [50, 40], hand: [50, 50], hip: [50, 53], kneeF: [52, 72], ankleF: [52, 90], kneeB: [48, 72], ankleB: [48, 90] },
      { head: [50, 18], shoulder: [50, 32], elbow: [50, 43], hand: [50, 52], hip: [50, 56], kneeF: [62, 73], ankleF: [62, 90], kneeB: [40, 78], ankleB: [33, 90] },
      { head: [50, 13], shoulder: [50, 28], elbow: [50, 40], hand: [50, 50], hip: [50, 53], kneeF: [52, 72], ankleF: [52, 90], kneeB: [48, 72], ankleB: [48, 90] }
    ]
  },
  hipthrust: {
    name: 'Hip thrust / glute bridge', dots: ['hand', 'ankle'],
    captions: ['Hips down, ribs stacked', 'Drive hips up — squeeze glutes', 'Lower with control'],
    frames: [
      { head: [24, 60], shoulder: [32, 60], elbow: [28, 64], hand: [22, 66], hip: [52, 72], knee: [64, 66], ankle: [74, 84] },
      { head: [24, 58], shoulder: [32, 58], elbow: [28, 62], hand: [22, 64], hip: [54, 56], knee: [66, 60], ankle: [74, 84] },
      { head: [24, 60], shoulder: [32, 60], elbow: [28, 64], hand: [22, 66], hip: [52, 72], knee: [64, 66], ankle: [74, 84] }
    ]
  },
  calf: {
    name: 'Calf raise', dots: ['ankle'],
    captions: ['Heels down — full stretch', 'Rise onto the toes', 'Lower slowly'],
    frames: [
      { head: [50, 14], shoulder: [50, 29], elbow: [50, 41], hand: [50, 52], hip: [50, 54], knee: [50, 72], ankle: [50, 88] },
      { head: [50, 9], shoulder: [50, 24], elbow: [50, 36], hand: [50, 47], hip: [50, 49], knee: [50, 67], ankle: [50, 84] },
      { head: [50, 14], shoulder: [50, 29], elbow: [50, 41], hand: [50, 52], hip: [50, 54], knee: [50, 72], ankle: [50, 88] }
    ]
  },

  // ---------------- upper body ----------------
  press: {
    name: 'Overhead press',
    captions: ['Bar at shoulders, ribs down', 'Press straight overhead', 'Lock out over the shoulders'],
    frames: [
      { head: [50, 12], shoulder: [50, 27], elbow: [44, 33], hand: [47, 21], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [49, 18], hand: [49, 9], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [44, 33], hand: [47, 21], hip: [50, 52], knee: [50, 71], ankle: [50, 90] }
    ]
  },
  bench: {
    name: 'Bench press', ground: false, dots: ['hand'],
    captions: ['Bar over chest, blades set', 'Lower to mid-chest', 'Press back up'],
    frames: [
      { head: [64, 54], shoulder: [56, 55], elbow: [56, 44], hand: [56, 34], hip: [44, 57], knee: [36, 66], ankle: [31, 74] },
      { head: [64, 54], shoulder: [56, 55], elbow: [49, 52], hand: [56, 48], hip: [44, 57], knee: [36, 66], ankle: [31, 74] },
      { head: [64, 54], shoulder: [56, 55], elbow: [56, 44], hand: [56, 34], hip: [44, 57], knee: [36, 66], ankle: [31, 74] }
    ]
  },
  pushup: {
    name: 'Push-up', dots: ['hand', 'ankle'],
    captions: ['Plank — straight line, braced', 'Lower chest toward the floor', 'Press back up'],
    frames: [
      { head: [70, 50], shoulder: [60, 54], elbow: [58, 64], hand: [58, 74], hip: [46, 58], knee: [34, 62], ankle: [24, 66] },
      { head: [70, 60], shoulder: [60, 63], elbow: [58, 70], hand: [58, 74], hip: [46, 66], knee: [34, 70], ankle: [24, 74] },
      { head: [70, 50], shoulder: [60, 54], elbow: [58, 64], hand: [58, 74], hip: [46, 58], knee: [34, 62], ankle: [24, 66] }
    ]
  },
  pullup: {
    name: 'Pull-up', bones: TWO_ARM, dots: ['handN', 'handF'], ground: false,
    captions: ['Dead hang, shoulders set', 'Pull chest to the bar', 'Lower under control'],
    frames: [
      { head: [50, 32], shoulder: [50, 40], elbowN: [45, 27], handN: [44, 15], elbowF: [55, 27], handF: [56, 15], hip: [50, 62], knee: [50, 80], ankle: [50, 91] },
      { head: [50, 22], shoulder: [50, 30], elbowN: [45, 23], handN: [44, 15], elbowF: [55, 23], handF: [56, 15], hip: [50, 52], knee: [50, 70], ankle: [50, 81] },
      { head: [50, 32], shoulder: [50, 40], elbowN: [45, 27], handN: [44, 15], elbowF: [55, 27], handF: [56, 15], hip: [50, 62], knee: [50, 80], ankle: [50, 91] }
    ]
  },
  row: {
    name: 'Row', dots: ['hand'],
    captions: ['Hinge, flat back, arm long', 'Row to the ribs, elbow back', 'Lower to a full stretch'],
    frames: [
      { head: [64, 30], shoulder: [60, 38], elbow: [60, 50], hand: [60, 60], hip: [44, 52], knee: [48, 70], ankle: [50, 90] },
      { head: [64, 30], shoulder: [60, 38], elbow: [67, 40], hand: [58, 46], hip: [44, 52], knee: [48, 70], ankle: [50, 90] },
      { head: [64, 30], shoulder: [60, 38], elbow: [60, 50], hand: [60, 60], hip: [44, 52], knee: [48, 70], ankle: [50, 90] }
    ]
  },
  curl: {
    name: 'Biceps curl', dots: ['hand'],
    captions: ['Arm long, elbow pinned', 'Curl up', 'Lower slowly — control'],
    frames: [
      { head: [50, 12], shoulder: [50, 27], elbow: [50, 40], hand: [53, 52], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [50, 40], hand: [55, 30], hip: [50, 52], knee: [50, 71], ankle: [50, 90] },
      { head: [50, 12], shoulder: [50, 27], elbow: [50, 40], hand: [53, 52], hip: [50, 52], knee: [50, 71], ankle: [50, 90] }
    ]
  },
  lateralraise: {
    name: 'Lateral raise', bones: FRONT, dots: ['handN', 'handF'],
    captions: ['Arms at your sides', 'Raise out to shoulder height', 'Lower slowly'],
    frames: [
      { head: [50, 12], shoulder: [50, 27], elbowN: [46, 38], handN: [44, 50], elbowF: [54, 38], handF: [56, 50], hip: [50, 52], kneeF: [45, 71], ankleF: [45, 90], kneeB: [55, 71], ankleB: [55, 90] },
      { head: [50, 12], shoulder: [50, 27], elbowN: [39, 28], handN: [30, 27], elbowF: [61, 28], handF: [70, 27], hip: [50, 52], kneeF: [45, 71], ankleF: [45, 90], kneeB: [55, 71], ankleB: [55, 90] },
      { head: [50, 12], shoulder: [50, 27], elbowN: [46, 38], handN: [44, 50], elbowF: [54, 38], handF: [56, 50], hip: [50, 52], kneeF: [45, 71], ankleF: [45, 90], kneeB: [55, 71], ankleB: [55, 90] }
    ]
  },

  // ---------------- core ----------------
  plank: {
    name: 'Plank', dots: ['hand', 'ankle'], ground: false,
    captions: ['Straight line — ribs down', 'Hold, glutes & core tight'],
    frames: [
      { head: [68, 56], shoulder: [60, 58], elbow: [58, 70], hand: [50, 72], hip: [44, 60], knee: [32, 64], ankle: [24, 68] },
      { head: [68, 55], shoulder: [60, 57], elbow: [58, 70], hand: [50, 72], hip: [44, 59], knee: [32, 63], ankle: [24, 67] }
    ]
  }
};

export default { DEMOS, SIDE_BONES };
