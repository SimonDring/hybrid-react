// tests/scheduler-recovery.js
// Micro-recovery: the scheduler must not place two sessions that hammer the SAME
// muscle group on consecutive weekdays (e.g. benching heavy two days running). It
// arranges the week's sessions so a worked region gets ~48h before it's hit hard
// again.
import { generatePlan } from '../src/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
import { volumeReport } from '../src/lib/plan/volume.js';
import { scheduleWeek } from '../src/lib/plan/scheduler.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const DOW = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };

// ── Unit: the scheduler must not stack two sessions that work the SAME muscle hard
// onto consecutive weekdays. Two back-heavy "Pull" days are handed FIRST, so a naive
// identity placement drops them on Mon+Tue (adjacent). The scheduler must reorder. ──
const spec = (focus, muscleVol) => ({
  focus, duration: '~45 min', items: [{ name: focus }],
  intensity: 'hard', lowerBody: (muscleVol.quads || 0) + (muscleVol.glutes || 0) > 0, muscleVol
});
const out = scheduleWeek({
  sportSpecs: [
    spec('Pull', { back: 12, biceps: 4 }),
    spec('Pull', { back: 12, biceps: 4 }),
    spec('Push', { chest: 10, shoulders: 6, triceps: 4 }),
    spec('Lower', { quads: 10, glutes: 6, hamstrings: 4 })
  ],
  dayNames: ['Monday', 'Tuesday', 'Thursday', 'Saturday'] // Mon/Tue are adjacent
});
const pullDays = out.filter(o => / · Pull$/.test(o.title)).map(o => DOW[o.title.split(' · ')[0]]).sort((a, b) => a - b);
assert(pullDays.length === 2 && (pullDays[1] - pullDays[0]) > 1,
  `U1 two back-heavy days are not on consecutive weekdays (got days ${pullDays}, layout: ${out.map(o => o.title).join(', ')})`);
const dayIdx = (s) => DOW[(s.title || '').split(' · ')[0]];
const dominant = (s) => {
  const rows = volumeReport([s]).rows.filter(r => r.sets > 0).sort((a, b) => b.sets - a.sets);
  return rows[0]?.muscle || null;
};
// the muscle groups a session works HARD (top tier — within 60% of its biggest)
const heavyMuscles = (s) => {
  const rows = volumeReport([s]).rows.filter(r => r.sets > 0).sort((a, b) => b.sets - a.sets);
  if (!rows.length) return new Set();
  const cut = rows[0].sets * 0.6;
  return new Set(rows.filter(r => r.sets >= cut).map(r => r.muscle));
};

function checkWeek(label, prof) {
  const wk = generatePlan(prof).phases[0].weeks[0];
  const placed = wk.sessions.map(s => ({ idx: dayIdx(s), dom: dominant(s), heavy: heavyMuscles(s), focus: (s.title || '').split(' · ').slice(1).join(' · ') }))
    .filter(p => p.idx != null).sort((a, b) => a.idx - b.idx);
  let sameDom = 0, sharedHeavy = 0;
  for (let i = 0; i < placed.length - 1; i++) {
    if (placed[i + 1].idx - placed[i].idx !== 1) continue; // only consecutive calendar days
    if (placed[i].dom && placed[i].dom === placed[i + 1].dom) sameDom++;
    for (const m of placed[i].heavy) if (placed[i + 1].heavy.has(m)) { sharedHeavy++; break; }
  }
  const layout = placed.map(p => `${Object.keys(DOW)[p.idx].slice(0, 3)}:${p.focus}(${p.dom})`).join('  ');
  assert(sameDom === 0, `${label}: no consecutive days share a dominant muscle — ${layout}`);
  assert(sharedHeavy === 0, `${label}: no consecutive days share a heavily-worked muscle — ${layout}`);
}

// Swim — the reported case: was giving back-to-back heavy upper days.
checkWeek('swim 4×45', answersToProfile({ ...BLANK_ANSWERS, goalType: 'sport', sport: 'swim', sportIntent: 'recreational',
  experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 45, equipment: FULL, sex: 'male', lifts: {} }));

// Build — upper/lower split must stay alternated onto spaced days.
checkWeek('build 4×60', answersToProfile({ ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength',
  experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, equipment: FULL, sex: 'male', lifts: { squat: 140, bench: 100, deadlift: 180 } }));

console.log('scheduler-recovery tests done');
