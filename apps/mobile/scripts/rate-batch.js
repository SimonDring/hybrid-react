#!/usr/bin/env node
/**
 * rate-batch.js — generate N random plans and print, per plan, the goal-fit
 * SIGNALS used to rate the decision engine (not a verdict — an evidence sheet):
 *   • equipment↔goal coherence (a "strength" goal with no barbell can't be met)
 *   • frequency fit (beginner on 5–6 days, etc.)
 *   • upper-body transfer share (chest+arms volume — low transfer for endurance)
 *   • heavy press primaries (180s-rest bench/OHP — questionable for run/cycle)
 *   • sport-priority hit-rate, distinct lifts, avg working exercises/session
 * Read-only; pure engine. Run from apps/mobile/:  node scripts/rate-batch.js [N] [seed]
 */
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
import { volumeReport } from '@performance-os/engine/lib/plan/volume.js';
import { resolveProgram } from '@performance-os/engine/lib/strength/program.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';

const N = Number(process.argv[2]) || 20;
const BASE = Number(process.argv[3]) || ((Math.random() * 1e9) | 0);
function makeRng(s0) { let s = s0 >>> 0; return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const DB = ['dumbbell', 'bodyweight'];
const BW = ['bodyweight'];
const spread = (n) => ({ 1: ['wed'], 2: ['tue', 'fri'], 3: ['mon', 'wed', 'fri'], 4: ['mon', 'tue', 'thu', 'fri'], 5: ['mon', 'tue', 'wed', 'fri', 'sat'], 6: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], 7: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }[n]);
const inDays = (rng, lo, hi) => { const d = new Date(); d.setDate(d.getDate() + lo + Math.floor(rng() * (hi - lo))); return d.toISOString().slice(0, 10); };

function randomAnswers(rng) {
  const pick = (a) => a[Math.floor(rng() * a.length)];
  const between = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  const goalType = pick(['build', 'build', 'sport']);
  const level = pick(['beginner', 'returning', 'intermediate', 'advanced']);
  const sex = pick(['male', 'female']);
  const bw = between(58, 105);
  if (goalType === 'build') {
    const style = pick(['strength', 'bodybuilding', 'functional']);
    const days = between(3, 6);
    const equipment = style === 'functional' ? pick([FULL, DB, BW]) : pick([FULL, FULL, DB]);
    return { ...BLANK_ANSWERS, goalType: 'build', strengthStyle: style, experienceLevel: level, daysPerWeek: days, days: spread(days), equipment, sex, bodyweight_kg: bw, lifts: {} };
  }
  const sport = pick(['run', 'cycle', 'swim']);
  const compete = rng() < 0.5;
  const days = between(2, 4);
  return { ...BLANK_ANSWERS, goalType: 'sport', sport, runDiscipline: sport === 'run' ? pick(['sprint', 'middle', 'long']) : '', sportIntent: compete ? 'compete' : 'recreational', eventDate: compete ? inDays(rng, 24, 80) : '', experienceLevel: level === 'beginner' ? 'intermediate' : level, daysPerWeek: days, days: spread(days), equipment: FULL, sex, bodyweight_kg: bw, lifts: {} };
}

const EX = new Map(EXERCISES.map(e => [e.name.toLowerCase(), e]));
const exOf = (n) => EX.get(String(n || '').toLowerCase()) || null;
const reps = (s) => { const m = /×\s*(\d+)/.exec(s || ''); return m ? Number(m[1]) : null; };
const C = { dim: '\x1b[2m', bold: '\x1b[1m', rust: '\x1b[31m', moss: '\x1b[32m', ochre: '\x1b[33m', cyan: '\x1b[36m', reset: '\x1b[0m' };
const flag = (bad, label) => (bad ? `${C.rust}${label}${C.reset}` : `${C.moss}OK${C.reset}`);

console.log(`${C.dim}base seed=${BASE} — plan i uses seed ${BASE}+i${C.reset}\n`);
for (let i = 0; i < N; i++) {
  const rng = makeRng(BASE + i);
  const a = answersToProfile(randomAnswers(rng));
  let plan; try { plan = generatePlan(a); } catch (e) { console.log(`#${i + 1} THREW: ${e.message}`); continue; }
  const prog = resolveProgram(a);
  const weeks = plan.phases.flatMap(p => p.weeks);
  const working = weeks.filter(w => !w.deload && !w.taper);
  const sessions = working.flatMap(w => w.sessions);
  const items = sessions.flatMap(s => s.items || []);

  // volume shares across working weeks
  const { rows } = volumeReport(sessions);
  const m = Object.fromEntries(rows.map(r => [r.muscle, r.sets]));
  const total = rows.reduce((x, r) => x + r.sets, 0) || 1;
  const armChest = ((m.chest || 0) + (m.biceps || 0) + (m.triceps || 0)) / total;
  const lower = ((m.quads || 0) + (m.hamstrings || 0) + (m.glutes || 0) + (m.calves || 0)) / total;

  // heavy press primaries (180s rest bench/OHP) — questionable for endurance
  const heavyPress = items.filter(it => /overhead press|bench press/i.test(it.name) && it.restSec === 180).length;

  // sport-priority hit-rate
  const prio = prog.exercisePriority || [];
  const usedIds = new Set(items.map(it => exOf(it.name)?.id).filter(Boolean));
  const prioHit = prio.length ? prio.filter(id => usedIds.has(id)).length : 0;

  const distinct = usedIds.size;
  const avgEx = sessions.length ? (items.filter(it => it.tag !== 'mobility' && exOf(it.name)).length / sessions.length) : 0;

  // coherence / frequency flags
  const noBarbell = !a.access.includes('barbell');
  const mismatch = prog.style === 'strength' && noBarbell;
  const days = a.availability.days_per_week;
  const lvl = a.experience.gym;
  const highFreq = (lvl === 'beginner' && days >= 5) || (lvl === 'returning' && days >= 6);
  const endurance = prog.style === 'sport' && (a.sport === 'run' || a.sport === 'cycle');

  const goalStr = a.goal_type === 'build' ? `build/${prog.style}` : `${a.sport}${a.run_discipline ? '-' + a.run_discipline : ''}/${a.sport_intent}`;
  console.log(`${C.bold}#${String(i + 1).padStart(2)} ${goalStr.padEnd(22)}${C.reset} ${C.dim}|${C.reset} ${lvl.padEnd(12)} ${a.sex || '?'} ${String(a.bodyweight_kg).padStart(3)}kg ${C.dim}|${C.reset} ${days}d ${a.access.includes('barbell') ? 'full' : (noBarbell && a.access.length > 1 ? 'DB' : 'BW')} ${C.dim}|${C.reset} ${plan.totalWeeks}w`);
  console.log(`     coherence ${flag(mismatch, 'STRENGTH-no-barbell')}  freq ${flag(highFreq, 'HIGH(' + lvl + ',' + days + 'd)')}  ${C.dim}distinct${C.reset} ${distinct}  ${C.dim}prio${C.reset} ${prioHit}/${prio.length}  ${C.dim}ex/sess${C.reset} ${avgEx.toFixed(1)}`);
  console.log(`     ${C.dim}vol mix:${C.reset} lower ${Math.round(lower * 100)}%  arm+chest ${endurance && armChest > 0.18 ? C.rust : C.dim}${Math.round(armChest * 100)}%${C.reset}  ${C.dim}|${C.reset} heavy press-primary ${endurance && heavyPress > 0 ? C.rust + heavyPress + C.reset : heavyPress}${endurance ? C.dim + ' (endurance)' + C.reset : ''}`);
}
