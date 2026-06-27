#!/usr/bin/env node
/**
 * random-sessions.js — generate ONE fully-random athlete profile (any goal
 * branch: strength / hypertrophy / functional / run / cycle / swim) and print
 * the full session plan for N randomly chosen sessions from across the whole
 * programme. Companion to review-samples.js; pure + read-only.
 *
 * Run from apps/mobile/:
 *   node scripts/random-sessions.js            # 1 random profile, 5 random sessions
 *   node scripts/random-sessions.js 7          # 7 sessions
 *   node scripts/random-sessions.js 5 1234     # 5 sessions, seed 1234 (reproducible)
 */

import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
import { resolveProgram } from '@performance-os/engine/lib/strength/program.js';

const nSessions = Number(process.argv[2]) || 5;
const seed = Number(process.argv[3]) || (Math.random() * 1e9) | 0;

// seeded RNG (mulberry32) so a run can be reproduced from its seed.
function makeRng(s0) {
  let s = s0 >>> 0;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makeRng(seed);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const between = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const inDays = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const DB = ['dumbbell', 'bodyweight'];
const BW = ['bodyweight'];
const spreadDays = (n) => ({
  1: ['wed'], 2: ['tue', 'fri'], 3: ['mon', 'wed', 'fri'], 4: ['mon', 'tue', 'thu', 'fri'],
  5: ['mon', 'tue', 'wed', 'fri', 'sat'], 6: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
  7: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
}[n]);

// ── one fully-random profile, spanning every goal branch ───────────────────────
function randomAnswers() {
  const goalType = pick(['build', 'build', 'sport']); // build a touch more likely
  const level = pick(['beginner', 'returning', 'intermediate', 'advanced']);
  const sex = pick(['male', 'female']);
  const bw = between(58, 105);

  if (goalType === 'build') {
    const style = pick(['strength', 'bodybuilding', 'functional']);
    const days = between(3, 6);
    const equipment = style === 'functional' ? pick([FULL, DB, BW]) : pick([FULL, FULL, DB]);
    // Strength athletes often enter maxes; others let the engine estimate.
    const hasBarbell = equipment.includes('barbell');
    const enter = style === 'strength' && hasBarbell && rng() < 0.7;
    const k = { beginner: 0.7, returning: 0.85, intermediate: 1.0, advanced: 1.35 }[level];
    return {
      ...BLANK_ANSWERS, goalType: 'build', strengthStyle: style, experienceLevel: level,
      daysPerWeek: days, days: spreadDays(days), equipment, sex, bodyweight_kg: bw,
      lifts: enter ? { squat: Math.round(140 * k), bench: Math.round(95 * k), deadlift: Math.round(175 * k), ohp: Math.round(58 * k), pull: '' } : {}
    };
  }

  const sport = pick(['run', 'cycle', 'swim']);
  const compete = rng() < 0.5;
  const days = between(2, 4);
  return {
    ...BLANK_ANSWERS, goalType: 'sport', sport,
    runDiscipline: sport === 'run' ? pick(['sprint', 'middle', 'long']) : '',
    sportIntent: compete ? 'compete' : 'recreational',
    eventDate: compete ? inDays(between(24, 80)) : '',
    experienceLevel: level === 'beginner' ? 'intermediate' : level, // sport assumes some base
    daysPerWeek: days, days: spreadDays(days), equipment: FULL, sex, bodyweight_kg: bw, lifts: {}
  };
}

// ── pretty-printing ────────────────────────────────────────────────────────────
const C = { dim: '\x1b[2m', bold: '\x1b[1m', rust: '\x1b[31m', moss: '\x1b[32m', ochre: '\x1b[33m', cyan: '\x1b[36m', reset: '\x1b[0m' };
const rule = (ch = '─', n = 76) => ch.repeat(n);

function printSession(ctx) {
  const { phase, week, session } = ctx;
  const flag = week.taper ? `${C.ochre} · TAPER${C.reset}` : week.deload ? `${C.ochre} · DELOAD${C.reset}` : '';
  console.log(`\n${C.cyan}${C.bold}${session.title}${C.reset}  ${C.dim}${session.duration || ''}${C.reset}`);
  console.log(`${C.dim}${phase.title} · Week ${week.num}${C.reset}${flag}   ${C.dim}${session.focus ? 'focus: ' + session.focus : ''}${C.reset}`);
  for (const it of session.items || []) {
    const name = it.name || it.stroke || '—';
    const parts = [];
    if (it.sets) parts.push(it.sets);
    if (it.rpe) parts.push(it.rpe);
    if (it.weight) parts.push(`${C.cyan}${it.weight}${C.reset}`);
    if (it.restSec) parts.push(`${C.dim}rest ${it.restSec}s${C.reset}`);
    if (it.tag === 'mobility') parts.push(`${C.dim}(mobility)${C.reset}`);
    const num = (it.num || '').padEnd(3);
    const ss = it.superset ? `${C.rust}${num}${C.reset}` : `${C.dim}${num}${C.reset}`;
    console.log(`   ${ss} ${name.padEnd(28)} ${parts.join('  ')}`);
    if (it.note) console.log(`       ${C.dim}↳ ${it.note}${C.reset}`);
  }
}

// ── main ───────────────────────────────────────────────────────────────────────
const answers = randomAnswers();
const profile = answersToProfile(answers);
const plan = generatePlan(profile);
const prog = resolveProgram(profile);
const a = profile;

console.log(`${C.dim}seed=${seed} — reproduce with \`node scripts/random-sessions.js ${nSessions} ${seed}\`${C.reset}`);
console.log(`${C.bold}${rule('═')}${C.reset}`);
console.log(`${C.bold}RANDOM ATHLETE${C.reset}`);
console.log(rule('═'));
console.log(`${C.dim}goal:${C.reset} ${a.goal_type}${a.goal_type === 'build' ? '/' + a.strength_style : '/' + a.sport + (a.run_discipline ? '-' + a.run_discipline : '') + ' (' + a.sport_intent + ')'}`);
console.log(`${C.dim}athlete:${C.reset} ${a.experience.gym}, ${a.sex || '—'}, ${a.bodyweight_kg}kg   ${C.dim}schedule:${C.reset} ${a.availability.days_per_week}d/wk (${a.availability.days.join('/')})`);
console.log(`${C.dim}equipment:${C.reset} ${a.access.join(', ')}`);
const liftStr = a.lifts ? Object.entries(a.lifts).filter(([, v]) => v != null).map(([k, v]) => `${k} ${v}kg`).join(', ') : `${C.dim}none entered → estimated${C.reset}`;
console.log(`${C.dim}lifts:${C.reset} ${liftStr}`);
if (a.event_date) console.log(`${C.dim}event:${C.reset} ${a.event_date}`);
console.log(`${C.dim}engine →${C.reset} style=${prog.style} level=${prog.level} volumeScalar=${prog.volumeScalar}   ${C.bold}${plan.totalWeeks} weeks · ${plan.phases.length} phases${C.reset}`);

// Flatten every session with its phase/week context, then pick N at random.
const all = [];
for (const phase of plan.phases) for (const week of phase.weeks) for (const session of week.sessions) all.push({ phase, week, session });
const take = Math.min(nSessions, all.length);
const idxs = [...all.keys()];
for (let i = idxs.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [idxs[i], idxs[j]] = [idxs[j], idxs[i]]; }
const chosen = idxs.slice(0, take).sort((x, y) => x - y); // keep chronological order for readability

console.log(`\n${C.bold}${take} randomly chosen sessions${C.reset} ${C.dim}(of ${all.length} in the programme)${C.reset}`);
for (const i of chosen) printSession(all[i]);
console.log(`\n${rule('═')}\n${C.bold}✓ done${C.reset} ${C.dim}(seed ${seed})${C.reset}\n`);
