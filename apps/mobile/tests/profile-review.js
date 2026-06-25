/**
 * profile-review.js
 * Generates 5 specific athlete profiles through the decision engine and prints
 * a human-readable program overview for each one.
 *
 *   node tests/profile-review.js
 */
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
import { countWeeklyVolume, gradeVolume } from '@performance-os/engine/lib/plan/volume.js';
import { VOLUME_LANDMARKS } from '@performance-os/engine/data/muscleVolume.js';

// ── reproducible randomisation ────────────────────────────────────────────────
// Seeded so results are the same every run but look random.
let seed = 0xDEADBEEF;
function rand() { seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF; return (seed >>> 0) / 0xFFFFFFFF; }
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function randInt(lo, hi) { return lo + Math.floor(rand() * (hi - lo + 1)); }

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const NAMES_M = ['Alex', 'Jordan', 'Marcus', 'Sam', 'Daniel', 'Liam', 'Chris'];
const NAMES_F = ['Sophie', 'Emma', 'Priya', 'Chloe', 'Laura', 'Maya', 'Erin'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const SEXES = ['male', 'female'];
const SPORT_INTENTS = ['recreational', 'build_base', 'compete'];

function randomBase(overrides) {
  const sex = pick(SEXES);
  const name = pick(sex === 'male' ? NAMES_M : NAMES_F);
  const age = randInt(22, 45);
  const bw = sex === 'male' ? randInt(68, 95) : randInt(54, 75);
  const level = pick(LEVELS);
  // Rough strength baselines by sex/level for realism
  const sqBase = sex === 'male' ? { beginner: 60, intermediate: 100, advanced: 150 }[level]
                                : { beginner: 40, intermediate: 70, advanced: 100 }[level];
  const dlBase = Math.round(sqBase * 1.3);
  const bpBase = Math.round(sqBase * 0.7);
  const ohpBase = Math.round(bpBase * 0.6);
  const jitter = () => randInt(-15, 15);
  return {
    ...BLANK_ANSWERS,
    name, age: String(age), sex, bodyweight_kg: String(bw),
    experienceLevel: level,
    equipment: FULL,
    lifts: {
      squat: String(sqBase + jitter()),
      bench: String(bpBase + jitter()),
      deadlift: String(dlBase + jitter()),
      ohp: String(ohpBase + jitter()),
      pull: String(randInt(5, 15))
    },
    pullMode: 'reps',
    ...overrides
  };
}

// ── the 5 profiles ─────────────────────────────────────────────────────────────
const PROFILES = [
  {
    label: 'Profile 1 — Swimmer (3 × 45 min gym)',
    answers: randomBase({
      goalType: 'sport', sport: 'swim',
      sportIntent: pick(SPORT_INTENTS),
      sportDays: pick([['mon', 'wed', 'fri'], ['tue', 'thu', 'sat'], ['mon', 'tue', 'thu']]),
      daysPerWeek: 3, sessionMinutes: 45,
      days: ['mon', 'wed', 'fri']
    })
  },
  {
    label: 'Profile 2 — Strength Athlete (6 × 60 min)',
    answers: randomBase({
      goalType: 'build', strengthStyle: 'strength',
      daysPerWeek: 6, sessionMinutes: 60,
      days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    })
  },
  {
    label: 'Profile 3 — Sprint Runner (2 × 45 min gym)',
    answers: randomBase({
      goalType: 'sport', sport: 'run', runDiscipline: 'sprint',
      sportIntent: pick(SPORT_INTENTS),
      sportDays: pick([['mon', 'wed', 'fri', 'sat'], ['tue', 'thu', 'sat', 'sun'], ['mon', 'tue', 'fri', 'sat']]),
      daysPerWeek: 2, sessionMinutes: 45,
      days: ['tue', 'fri']
    })
  },
  {
    label: 'Profile 4 — Distance Runner (3 × 30 min gym)',
    answers: randomBase({
      goalType: 'sport', sport: 'run', runDiscipline: 'long',
      sportIntent: pick(SPORT_INTENTS),
      sportDays: pick([['mon', 'wed', 'fri'], ['tue', 'thu', 'sat'], ['mon', 'wed', 'sat']]),
      daysPerWeek: 3, sessionMinutes: 30,
      days: ['mon', 'wed', 'fri']
    })
  },
  {
    label: 'Profile 5 — Hypertrophy Athlete (5 × 90 min)',
    answers: randomBase({
      goalType: 'build', strengthStyle: 'bodybuilding',
      daysPerWeek: 5, sessionMinutes: 90,
      days: ['mon', 'tue', 'wed', 'fri', 'sat']
    })
  }
];

// ── formatting helpers ─────────────────────────────────────────────────────────
const MUSCLES = ['chest','back','shoulders','biceps','triceps','quads','hamstrings','glutes','calves','core'];
const ML = { chest:'Chest', back:'Back', shoulders:'Shoulders', biceps:'Biceps', triceps:'Triceps',
              quads:'Quads', hamstrings:'Hams', glutes:'Glutes', calves:'Calves', core:'Core' };

function bar(n, max = 20) {
  const filled = Math.round((n / max) * 20);
  return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, 20 - filled));
}

function avgVol(plan) {
  // Compute average weekly sets per muscle across all non-deload weeks
  const totals = {};
  let count = 0;
  for (const phase of plan.phases) {
    for (const week of phase.weeks) {
      if (week.deload || week.taper) continue;
      count++;
      const { counts } = countWeeklyVolume(week.sessions);
      for (const [m, v] of Object.entries(counts)) {
        totals[m] = (totals[m] || 0) + v;
      }
    }
  }
  if (!count) return {};
  const out = {};
  for (const m of MUSCLES) out[m] = +((totals[m] || 0) / count).toFixed(1);
  return out;
}

// Peak-week (last non-deload build week) volume for science review
function peakVol(plan) {
  let last = null;
  for (const phase of plan.phases) {
    for (const week of phase.weeks) {
      if (!week.deload && !week.taper) last = week;
    }
  }
  if (!last) return {};
  return countWeeklyVolume(last.sessions).counts;
}

function sessionSummary(s) {
  const items = (s.items || []).filter(i => !i.tag).slice(0, 3).map(i => i.name).join(', ');
  return `${s.title}  ${s.duration}  [${items}${s.items && s.items.length > 3 ? '…' : ''}]`;
}

function printWeek(week) {
  const flags = [week.deload && 'DELOAD', week.taper && 'TAPER'].filter(Boolean).join('+');
  console.log(`      Wk ${String(week.num).padStart(2)}: ${week.theme || ''} ${flags ? `(${flags})` : ''}`);
  for (const s of week.sessions) {
    console.log(`        • ${sessionSummary(s)}`);
  }
}

// ── main ───────────────────────────────────────────────────────────────────────
for (const { label, answers } of PROFILES) {
  const profile = answersToProfile(answers);
  const plan = generatePlan(profile);
  const vol = avgVol(plan);

  // ── header ──
  console.log('\n' + '═'.repeat(72));
  console.log(`  ${label}`);
  console.log('═'.repeat(72));

  // ── athlete card ──
  const a = answers;
  console.log(`\n  Athlete`);
  console.log(`    Name : ${profile.name}   Age : ${profile.age}   Sex : ${profile.sex}`);
  console.log(`    Level: ${profile.experience?.gym || 'intermediate'}   BW : ${profile.bodyweight_kg} kg`);
  if (a.goalType === 'sport') {
    const disc = a.runDiscipline ? ` / ${a.runDiscipline}` : '';
    console.log(`    Goal : ${a.sport}${disc} — ${a.sportIntent}`);
    if (a.sportDays && a.sportDays.length) console.log(`    Sport days: ${a.sportDays.join(', ')}`);
  } else {
    console.log(`    Goal : ${a.strengthStyle}`);
  }
  console.log(`    Lifts (1RM): Squat ${a.lifts.squat} kg  Bench ${a.lifts.bench} kg  DL ${a.lifts.deadlift} kg  OHP ${a.lifts.ohp} kg  Pull ${a.lifts.pull} reps`);
  console.log(`    Sessions   : ${a.daysPerWeek} × ${a.sessionMinutes} min / week`);

  // ── plan overview ──
  console.log(`\n  Plan (${plan.totalWeeks} weeks, ${plan.phases.length} phases)`);
  for (const phase of plan.phases) {
    const deloads = phase.weeks.filter(w => w.deload).map(w => `Wk ${w.num}`);
    const tapers  = phase.weeks.filter(w => w.taper).map(w => `Wk ${w.num}`);
    const flags = [deloads.length && `deload ${deloads.join(',')}`, tapers.length && `taper ${tapers.join(',')}`].filter(Boolean).join(' · ');
    console.log(`\n    ── Phase ${phase.id}: ${phase.title} (${phase.range}) ${flags ? `· ${flags}` : ''}`);
    console.log(`       ${phase.tagline}`);
    for (const week of phase.weeks) printWeek(week);
  }

  // ── average weekly volume per muscle (with grade vs. landmarks) ──
  const peak = peakVol(plan);
  console.log('\n  Avg weekly sets / muscle  (avg | peak | grade vs. MEV/MAV/MRV):');
  const maxVol = Math.max(...MUSCLES.map(m => Math.max(vol[m] || 0, peak[m] || 0)), 1);
  for (const m of MUSCLES) {
    const avg = vol[m] || 0;
    const pk = peak[m] || 0;
    const lm = VOLUME_LANDMARKS[m];
    const grade = lm ? gradeVolume(m, pk) : '—';
    const landmarks = lm ? `MEV ${lm.mev} / MAV ${lm.mav} / MRV ${lm.mrv}` : '';
    const gradeIcon = { under: '⚠ under MEV', low: '✓ low-productive', ideal: '✓ ideal', high: '✓ high-productive', over: '✗ over MRV' }[grade] || grade;
    console.log(`    ${ML[m].padEnd(12)} avg ${String(avg.toFixed(1)).padStart(5)} | peak ${String(pk.toFixed(1)).padStart(5)}  ${bar(pk, maxVol)}  [${gradeIcon}]  ${landmarks}`);
  }
  console.log('');
}

console.log('\n' + '═'.repeat(72));
console.log('  Generation complete.');
console.log('═'.repeat(72) + '\n');
