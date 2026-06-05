/**
 * Exercise demo data — key-pose frames for the animated stick-figure demos.
 *
 * Each demo is a short loop of poses the StickFigureDemo component interpolates
 * between (so you see the movement), with a caption per pose talking through it.
 * A pose is a side-view skeleton: each joint is an [x, y] point in a 0–100 box
 * (y increases downward; the figure faces right; ground ≈ y 90).
 *
 * This is the framework the long-term animated form library builds on — add a
 * demo here and reference its key from an exercise in exerciseLibrary.js
 * (`demo: 'squat'`). Exercises without a demo show the "coming soon" placeholder.
 */

// Joints: head · shoulder · elbow · hand · hip · knee · ankle (single side).
export const JOINTS = ['head', 'shoulder', 'elbow', 'hand', 'hip', 'knee', 'ankle'];
export const BONES = [
  ['head', 'shoulder'], ['shoulder', 'elbow'], ['elbow', 'hand'],
  ['shoulder', 'hip'], ['hip', 'knee'], ['knee', 'ankle']
];

const pose = (head, shoulder, elbow, hand, hip, knee, ankle) => ({ head, shoulder, elbow, hand, hip, knee, ankle });

export const DEMOS = {
  squat: {
    name: 'Squat',
    captions: ['Brace — chest up, tall', 'Sit hips back & down', 'Drive up through mid-foot'],
    frames: [
      pose([50, 12], [50, 27], [58, 34], [66, 38], [50, 52], [50, 71], [50, 90]),
      pose([45, 23], [46, 37], [56, 41], [66, 43], [41, 60], [58, 69], [50, 90]),
      pose([50, 12], [50, 27], [58, 34], [66, 38], [50, 52], [50, 71], [50, 90])
    ]
  },
  hinge: {
    name: 'Hip hinge (RDL / deadlift)',
    captions: ['Stand tall, soft knees', 'Push hips back, flat back', 'Squeeze glutes to stand'],
    frames: [
      pose([50, 12], [50, 27], [50, 39], [50, 50], [50, 52], [50, 71], [50, 90]),
      pose([64, 30], [60, 38], [57, 48], [55, 58], [44, 52], [48, 70], [50, 90]),
      pose([50, 12], [50, 27], [50, 39], [50, 50], [50, 52], [50, 71], [50, 90])
    ]
  },
  press: {
    name: 'Overhead press',
    captions: ['Bar at shoulders, ribs down', 'Press straight overhead', 'Lock out, stacked over shoulders'],
    frames: [
      pose([50, 12], [50, 27], [44, 33], [47, 21], [50, 52], [50, 71], [50, 90]),
      pose([50, 12], [50, 27], [49, 18], [49, 9], [50, 52], [50, 71], [50, 90]),
      pose([50, 12], [50, 27], [44, 33], [47, 21], [50, 52], [50, 71], [50, 90])
    ]
  },
  pushup: {
    name: 'Push-up',
    captions: ['Plank — straight line, braced', 'Lower chest toward the floor', 'Press back up'],
    frames: [
      pose([70, 50], [60, 54], [58, 64], [58, 74], [46, 58], [34, 62], [24, 66]),
      pose([70, 60], [60, 63], [58, 70], [58, 74], [46, 66], [34, 70], [24, 74]),
      pose([70, 50], [60, 54], [58, 64], [58, 74], [46, 58], [34, 62], [24, 66])
    ]
  }
};

export default { DEMOS, JOINTS, BONES };
