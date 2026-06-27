#!/usr/bin/env node
/**
 * review-samples.js — batch engine spot-check.
 *
 * Builds a few diverse athlete profiles, runs the PURE plan generator on each,
 * and prints the full programme to the terminal: periodization, every exercise
 * (sets×reps, RPE, rest, target weight, supersets) and the per-muscle
 * actual-vs-target SET VOLUME readout — the same numbers the hidden /dev
 * DevPlayground screen shows, but for the whole batch at once and without a
 * browser. Nothing here touches the engine, the store, or Supabase: generatePlan
 * is a pure function, so this is read-only.
 *
 * Run from apps/mobile/:
 *   node scripts/review-samples.js          # 3 diverse archetypes
 *   node scripts/review-samples.js 42       # same, but seeded RNG (reproducible)
 */

import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
import { volumeReport } from '@performance-os/engine/lib/plan/volume.js';
import { weeklyMuscleTargets } from '@performance-os/engine/lib/strength/targets.js';
import { resolveProgram } from '@performance-os/engine/lib/strength/program.js';
import { MUSCLE_LABELS } from '@performance-os/engine/data/muscleVolume.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';

// name(lower) → exercise def, for looking up pattern/id/role of a rendered item.
const EX_BY_NAME = new Map(EXERCISES.map(ex => [ex.name.toLowerCase(), ex]));
const exFor = (name) => EX_BY_NAME.get(String(name || '').toLowerCase()) || null;
const FUNDAMENTAL_PATTERNS = ['squat', 'hinge', 'lunge', 'hpush', 'vpush', 'hpull', 'vpull', 'carry', 'core'];

// ── tiny seeded RNG (mulberry32) so a run can be reproduced from its seed ──────
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const seed = Number(process.argv[2]) || (Math.random() * 1e9) | 0;
const rng = makeRng(seed);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const between = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
// n spread-out training days (mon/wed/fri style), never two clustered at the end.
const spreadDays = (n) => {
  const layouts = {
    1: ['wed'], 2: ['tue', 'fri'], 3: ['mon', 'wed', 'fri'],
    4: ['mon', 'tue', 'thu', 'fri'], 5: ['mon', 'tue', 'wed', 'fri', 'sat'],
    6: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], 7: DAY_KEYS
  };
  return layouts[n] || DAY_KEYS.slice(0, n);
};
const inDays = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const DB = ['dumbbell', 'bodyweight'];
const BW = ['bodyweight'];

// ── the three diverse archetypes (specifics randomized within each) ────────────
function archetypeBuildStrength() {
  const level = pick(['beginner', 'intermediate', 'advanced']);
  const days = between(3, 5);
  // Entered barbell maxes scaled loosely by level (kg); engine fills the rest.
  const base = { beginner: 0.7, intermediate: 1.0, advanced: 1.35 }[level];
  return {
    label: 'Build · strength',
    answers: {
      ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength',
      experienceLevel: level, daysPerWeek: days, days: spreadDays(days),
      equipment: FULL, sex: pick(['male', 'female']), bodyweight_kg: between(62, 105),
      lifts: {
        squat: Math.round(140 * base), bench: Math.round(95 * base),
        deadlift: Math.round(175 * base), ohp: Math.round(60 * base), pull: ''
      }
    }
  };
}

function archetypeBuildHypertrophyOrFunctional() {
  const style = pick(['bodybuilding', 'functional']);
  const level = pick(['beginner', 'intermediate', 'advanced']);
  const days = between(3, 6);
  const equipment = style === 'functional' ? pick([FULL, DB, BW]) : FULL;
  return {
    label: `Build · ${style === 'bodybuilding' ? 'hypertrophy' : 'functional'}`,
    answers: {
      ...BLANK_ANSWERS, goalType: 'build', strengthStyle: style,
      experienceLevel: level, daysPerWeek: days, days: spreadDays(days),
      equipment, sex: pick(['male', 'female']), bodyweight_kg: between(58, 100),
      lifts: {} // left blank → engine estimates from level + bodyweight
    }
  };
}

function archetypeSport() {
  const sport = pick(['run', 'cycle', 'swim']);
  const discipline = sport === 'run' ? pick(['sprint', 'middle', 'long']) : '';
  const compete = rng() < 0.5;
  const level = pick(['intermediate', 'advanced']);
  const days = between(2, 4);
  return {
    label: `Sport · ${sport}${discipline ? '-' + discipline : ''} · ${compete ? 'compete' : 'recreational'}`,
    answers: {
      ...BLANK_ANSWERS, goalType: 'sport', sport, runDiscipline: discipline,
      sportIntent: compete ? 'compete' : 'recreational',
      eventDate: compete ? inDays(between(24, 36)) : '', // ~4-5wk out → exercises in-season taper
      experienceLevel: level, daysPerWeek: days, days: spreadDays(days),
      equipment: FULL, sex: pick(['male', 'female']), bodyweight_kg: between(60, 90),
      lifts: {}
    }
  };
}

// ── pretty-printing helpers ────────────────────────────────────────────────────
const C = { dim: '\x1b[2m', bold: '\x1b[1m', rust: '\x1b[31m', moss: '\x1b[32m', ochre: '\x1b[33m', cyan: '\x1b[36m', reset: '\x1b[0m' };
const rule = (ch = '─', n = 76) => ch.repeat(n);
const intentOf = (title) => { const t = (title || '').toLowerCase(); return t.includes('peak') ? 'peak' : t.includes('build') ? 'build' : 'base'; };
// colour the actual/target ratio: green on target, ochre building, rust well short / over.
const ratioColor = (actual, target) => {
  if (!target) return C.dim;
  const r = actual / target;
  if (r >= 0.9 && r <= 1.15) return C.moss;
  if (r >= 0.6) return C.ochre;
  return C.rust;
};

function targetsFor(phase, week, prog) {
  return weeklyMuscleTargets({
    style: prog.style, intent: intentOf(phase.title),
    weekInPhase: week.num - phase.weekStart + 1, phaseWeeks: phase.weekEnd - phase.weekStart + 1,
    level: prog.level, deload: week.deload, emphasis: prog.emphasis, volumeScalar: prog.volumeScalar
  });
}

// One-line weekly volume summary (the ramp/deload trend).
function weekVolumeLine(phase, week, prog) {
  const { rows } = volumeReport(week.sessions);
  const targets = targetsFor(phase, week, prog);
  const active = rows.filter(r => r.sets > 0 || (targets[r.muscle] || 0) > 0);
  const done = Math.round(active.reduce((a, r) => a + r.sets, 0));
  const tgt = Math.round(active.reduce((a, r) => a + (targets[r.muscle] || 0), 0));
  const flag = week.taper ? `${C.ochre}taper${C.reset}` : week.deload ? `${C.ochre}deload${C.reset}` : '     ';
  const col = ratioColor(done, tgt);
  return `   wk ${String(week.num).padStart(2)}  ${flag}  ${week.sessions.length} sess  ` +
    `vol ${col}${String(done).padStart(3)}${C.reset}/${String(tgt).padStart(3)} sets`;
}

// Full per-muscle volume readout for one week.
function printVolumeReadout(phase, week, prog) {
  const { rows, skipped } = volumeReport(week.sessions);
  const targets = targetsFor(phase, week, prog);
  const active = rows.filter(r => r.sets > 0 || (targets[r.muscle] || 0) > 0);
  if (!active.length) { console.log(`     ${C.dim}(no gym volume this week)${C.reset}`); return; }
  const cells = active.map(r => {
    const tgt = targets[r.muscle] || 0;
    const col = ratioColor(r.sets, tgt);
    return `${MUSCLE_LABELS[r.muscle] || r.muscle} ${col}${r.sets}${C.reset}/${tgt}`;
  });
  console.log(`     ${C.dim}volume actual/target →${C.reset} ${cells.join('  ')}`);
  if (skipped.length) {
    console.log(`     ${C.ochre}uncounted (${skipped.length}):${C.reset} ${[...new Set(skipped)].join(', ')}`);
  }
}

// Full exercise breakdown for one week's sessions.
function printSessions(week) {
  for (const s of week.sessions) {
    console.log(`\n     ${C.bold}${s.title}${C.reset}  ${C.dim}${s.duration || ''}${C.reset}`);
    for (const it of s.items || []) {
      const name = it.name || it.stroke || '—';
      const parts = [];
      if (it.sets) parts.push(it.sets);
      if (it.rpe) parts.push(it.rpe);
      if (it.weight) parts.push(`${C.cyan}${it.weight}${C.reset}`);
      if (it.restSec) parts.push(`${C.dim}rest ${it.restSec}s${C.reset}`);
      if (it.tag === 'mobility') parts.push(`${C.dim}(mobility)${C.reset}`);
      const num = (it.num || '').padEnd(3);
      const ssMark = it.superset ? `${C.rust}${num}${C.reset}` : `${C.dim}${num}${C.reset}`;
      console.log(`       ${ssMark} ${name.padEnd(26)} ${parts.join('  ')}`);
      if (it.note) console.log(`           ${C.dim}↳ ${it.note}${C.reset}`);
    }
  }
}

// ── exercise-selection analysis ────────────────────────────────────────────────
// Reads the rendered plan back and answers selection-quality questions: does it
// cover the fundamental patterns, do the goal's science-backed priority lifts
// actually get picked, how varied is it, and does any one lift dominate?
function analyzeSelection(profile, plan) {
  const prog = resolveProgram(profile);
  const priority = prog.exercisePriority || [];
  const weeks = plan.phases.flatMap(p => p.weeks);
  const working = weeks.filter(w => !w.deload && !w.taper); // judge variety on real weeks

  // Frequency of each WORKING (non-mobility) lift across all working weeks.
  const freq = new Map();        // name → count of appearances (one per session it's in)
  const patternsHit = new Set();
  const usedIds = new Set();
  let slots = 0;
  for (const w of (working.length ? working : weeks)) {
    for (const s of w.sessions) {
      for (const it of s.items || []) {
        if (it.tag === 'mobility') continue;
        const ex = exFor(it.name);
        if (!ex) continue;
        slots++;
        usedIds.add(ex.id);
        if (FUNDAMENTAL_PATTERNS.includes(ex.pattern)) patternsHit.add(ex.pattern);
        freq.set(it.name, (freq.get(it.name) || 0) + 1);
      }
    }
  }

  // Per working week: which fundamental patterns appear (coverage consistency).
  const weekPatternCounts = (working.length ? working : weeks).map(w => {
    const pc = {};
    for (const s of w.sessions) for (const it of s.items || []) {
      const ex = exFor(it.name); if (!ex) continue;
      if (FUNDAMENTAL_PATTERNS.includes(ex.pattern)) pc[ex.pattern] = (pc[ex.pattern] || 0) + 1;
    }
    return { num: w.num, pc };
  });

  // Priority-list hit rate: of the goal's curated lifts, how many got selected.
  const priorityHit = priority.filter(id => usedIds.has(id));
  const priorityMiss = priority.filter(id => !usedIds.has(id))
    .map(id => (EXERCISES.find(e => e.id === id)?.name) || id);

  // Week-to-week rotation: avg Jaccard overlap between consecutive working weeks
  // within a phase (lower = more rotation/variety; higher = repetitive).
  const overlaps = [];
  for (const ph of plan.phases) {
    const wk = ph.weeks.filter(w => !w.deload && !w.taper);
    for (let i = 1; i < wk.length; i++) {
      const setOf = (w) => new Set(w.sessions.flatMap(s => (s.items || [])
        .filter(it => it.tag !== 'mobility' && exFor(it.name)).map(it => it.name)));
      const a = setOf(wk[i - 1]), b = setOf(wk[i]);
      const inter = [...a].filter(x => b.has(x)).length;
      const uni = new Set([...a, ...b]).size;
      if (uni) overlaps.push(inter / uni);
    }
  }
  const avgOverlap = overlaps.length ? overlaps.reduce((a, b) => a + b, 0) / overlaps.length : null;

  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  return {
    distinct: usedIds.size, slots,
    patternsHit, missingPatterns: FUNDAMENTAL_PATTERNS.filter(p => !patternsHit.has(p)),
    weekPatternCounts, priority, priorityHit, priorityMiss, top, avgOverlap
  };
}

function printSelection(a) {
  console.log(`\n${C.cyan}${C.bold}▌ EXERCISE SELECTION${C.reset}`);
  console.log(`  ${C.dim}distinct lifts used:${C.reset} ${a.distinct} ${C.dim}across${C.reset} ${a.slots} ${C.dim}working slots${C.reset}` +
    (a.avgOverlap != null ? `   ${C.dim}wk→wk repeat:${C.reset} ${Math.round(a.avgOverlap * 100)}% ${C.dim}(lower = more rotation)${C.reset}` : ''));

  const covered = FUNDAMENTAL_PATTERNS.filter(p => a.patternsHit.has(p));
  console.log(`  ${C.dim}pattern coverage:${C.reset} ${C.moss}${covered.join(' ')}${C.reset}` +
    (a.missingPatterns.length ? `   ${C.rust}missing: ${a.missingPatterns.join(' ')}${C.reset}` : ''));

  const hit = a.priorityHit.length, tot = a.priority.length;
  const col = tot === 0 ? C.dim : hit / tot >= 0.5 ? C.moss : hit / tot >= 0.3 ? C.ochre : C.rust;
  console.log(`  ${C.dim}priority-list landed:${C.reset} ${col}${hit}/${tot}${C.reset}` +
    (tot && a.priorityMiss.length ? `   ${C.dim}not used: ${a.priorityMiss.slice(0, 8).join(', ')}${a.priorityMiss.length > 8 ? '…' : ''}${C.reset}` : ''));

  console.log(`  ${C.dim}most-used:${C.reset} ${a.top.map(([n, c]) => `${n} ${C.bold}${c}×${C.reset}`).join(`${C.dim}, ${C.reset}`)}`);
}

// ── render one whole sample ────────────────────────────────────────────────────
function renderSample(n, label, profile, plan) {
  const prog = resolveProgram(profile);
  const a = profile;
  console.log(`\n${C.bold}${rule('═')}${C.reset}`);
  console.log(`${C.bold}SAMPLE ${n} — ${label}${C.reset}`);
  console.log(rule('═'));

  // Profile header
  const liftStr = a.lifts
    ? Object.entries(a.lifts).filter(([, v]) => v != null).map(([k, v]) => `${k} ${v}kg`).join(', ')
    : `${C.dim}none entered → estimated from level + bodyweight${C.reset}`;
  console.log(`${C.dim}goal:${C.reset} ${a.goal_type}${a.strength_style && a.goal_type === 'build' ? '/' + a.strength_style : ''}` +
    `${a.sport ? '/' + a.sport + (a.run_discipline ? '-' + a.run_discipline : '') + ' (' + a.sport_intent + ')' : ''}`);
  console.log(`${C.dim}athlete:${C.reset} ${a.experience.gym}, ${a.sex || '—'}, ${a.bodyweight_kg || '—'}kg   ` +
    `${C.dim}schedule:${C.reset} ${a.availability.days_per_week}d/wk (${a.availability.days.join('/')})`);
  console.log(`${C.dim}equipment:${C.reset} ${a.access.join(', ')}`);
  console.log(`${C.dim}lifts:${C.reset} ${liftStr}`);
  if (a.event_date) console.log(`${C.dim}event:${C.reset} ${a.event_date} (${a.plan_weeks}wk block)`);
  console.log(`${C.dim}engine →${C.reset} style=${prog.style} level=${prog.level} volumeScalar=${prog.volumeScalar}   ` +
    `${C.bold}${plan.totalWeeks} weeks · ${plan.phases.length} phases${C.reset}`);

  printSelection(analyzeSelection(profile, plan));

  for (const phase of plan.phases) {
    console.log(`\n${C.cyan}${C.bold}▌ ${phase.title}${C.reset} ${C.dim}${phase.range}${C.reset}`);
    if (phase.tagline) console.log(`  ${C.dim}${phase.tagline}${C.reset}`);
    if (phase.gates?.length) console.log(`  ${C.dim}gates: ${phase.gates.map(g => g.label).join(' · ')}${C.reset}`);

    // Weekly volume trend across the phase (shows ramp + deload drop).
    for (const week of phase.weeks) console.log(weekVolumeLine(phase, week, prog));

    // Full detail for representative weeks: first week of the phase + any deload/taper week.
    const detailWeeks = [];
    detailWeeks.push(phase.weeks[0]);
    for (const w of phase.weeks) if ((w.deload || w.taper) && !detailWeeks.includes(w)) detailWeeks.push(w);
    for (const week of detailWeeks) {
      const tag = week.taper ? ' · TAPER' : week.deload ? ' · DELOAD' : '';
      console.log(`\n  ${C.bold}── Week ${week.num}${tag} (detail) ──${C.reset}`);
      if (week.theme) console.log(`     ${C.dim}${week.theme}${C.reset}`);
      printVolumeReadout(phase, week, prog);
      printSessions(week);
    }
  }
}

// ── main ───────────────────────────────────────────────────────────────────────
console.log(`${C.dim}seed=${seed} — re-run with \`node scripts/review-samples.js ${seed}\` to reproduce${C.reset}`);

const builders = [archetypeBuildStrength, archetypeBuildHypertrophyOrFunctional, archetypeSport];
builders.forEach((build, i) => {
  let label = '(unbuilt)';
  try {
    const spec = build();
    label = spec.label;
    const profile = answersToProfile(spec.answers);
    const plan = generatePlan(profile);
    renderSample(i + 1, label, profile, plan);
  } catch (e) {
    console.error(`\n${C.rust}SAMPLE ${i + 1} (${label}) THREW:${C.reset} ${e && e.stack || e}`);
    process.exitCode = 1;
  }
});

console.log(`\n${rule('═')}\n${C.bold}✓ done${C.reset} — 3 samples (seed ${seed})\n`);
