import { despineWeek } from '@performance-os/engine/lib/plan/despine.js';
let pass = 0;
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else pass++; };

// Day 0 = heavy axial; Day 1 (adjacent) holds a barbell row tagged with its intent.
const sessions = [
  { dayIdx: 0, axialLoad: 4, items: [{ name: 'Back squat', sets: '4 × 5', rpe: 'RPE 7' }] },
  { dayIdx: 1, axialLoad: 2, items: [{ num: 'A1', name: 'Barbell row', sets: '4 × 5', rpe: 'RPE 7', intent: 'h_pull' }] }
];
const byIntent = new Map([['h_pull', ['barbell_row','db_row','chest_supported_row','cable_row','inverted_row']]]);
despineWeek(sessions, { priorityByIntent: byIntent, lifts: {}, level: 'advanced' });
assert(sessions[1].items[0].name === 'Chest-supported row', `day-after-squat row de-spined (got ${sessions[1].items[0].name})`);

// Well-spaced day is untouched.
const spaced = [
  { dayIdx: 0, axialLoad: 4, items: [{ name: 'Back squat', sets: '4 × 5', rpe: 'RPE 7' }] },
  { dayIdx: 3, axialLoad: 2, items: [{ num: 'A1', name: 'Barbell row', sets: '4 × 5', rpe: 'RPE 7', intent: 'h_pull' }] }
];
despineWeek(spaced, { priorityByIntent: byIntent, lifts: {}, level: 'advanced' });
assert(spaced[1].items[0].name === 'Barbell row', 'spaced row left as barbell row');

console.log(process.exitCode ? 'despine FAILURES' : `PASS: despine — ${pass} assertions`);
