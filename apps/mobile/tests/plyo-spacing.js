// tests/plyo-spacing.js — H9 C7 (the scheduler half): plyometric exposures need
// 48–72 h between them (tendon/SSC recovery — de Villarreal 2009). The per-session
// foot-contact ceiling shipped with WP-21; this closes the SPACING half: the D13
// scheduler now pays a governed penalty (REACTIVE_LIMITS.spacing) when two
// plyo-loaded gym days land adjacent, so plans keep ≥2 calendar days between them
// whenever the week's geometry allows it.

import assert from 'node:assert';
import { generatePlan, EXERCISES, REACTIVE_LIMITS } from '@performance-os/engine';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

let pass = 0;
function ok(cond, msg) { assert(cond, msg); pass++; console.log('PASS:', msg); }

// The governed constant exists and matches the literature window.
ok(REACTIVE_LIMITS.spacing && REACTIVE_LIMITS.spacing.minHours === 48 && REACTIVE_LIMITS.spacing.maxHours === 72,
  'the 48–72 h spacing window is a governed knowledge constant');

const POWER = new Set(EXERCISES.filter((e) => e.quality === 'power').map((e) => e.name));
const isPlyoSession = (s) => (s.items || []).some((it) => POWER.has(it.name));

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
function plyoDayGaps(answers) {
  const plan = generatePlan(answersToProfile(answers));
  const weeks = plan.phases.flatMap((p) => p.weeks);
  const gaps = [];
  let plyoWeeks = 0;
  for (const w of weeks) {
    const days = w.sessions.filter(isPlyoSession).map((s) => s.dayIdx).filter((d) => d != null).sort((a, b) => a - b);
    if (days.length >= 2) {
      plyoWeeks++;
      for (let i = 1; i < days.length; i++) gaps.push(days[i] - days[i - 1]);
    }
  }
  return { gaps, plyoWeeks };
}

// ── the plyo-richest cohort: sprinters, 4 well-spread days available ──────────
const sprinter = { ...BLANK_ANSWERS, goalType: 'sport', sport: 'run', runDiscipline: 'sprint',
  sportIntent: 'recreational', experienceLevel: 'advanced', daysPerWeek: 4,
  days: ['mon', 'tue', 'thu', 'sat'], equipment: FULL };
const sp = plyoDayGaps(sprinter);
ok(sp.plyoWeeks > 0, `sprint plans have multi-plyo weeks to space (${sp.plyoWeeks} weeks)`);
ok(sp.gaps.every((g) => g >= 2),
  `every pair of plyo days sits ≥2 days apart — inside the 48 h floor never (gaps: ${[...new Set(sp.gaps)].join(',')})`);

// ── a hurler (field sport, explosive work) with a spread week ─────────────────
const hurler = { ...BLANK_ANSWERS, goalType: 'sport', skbSport: 'hurling', position: 'Midfield',
  sportIntent: 'recreational', experienceLevel: 'advanced', daysPerWeek: 4,
  days: ['mon', 'tue', 'thu', 'sat'], equipment: FULL };
const hu = plyoDayGaps(hurler);
ok(hu.gaps.every((g) => g >= 2) || hu.gaps.length === 0,
  `field-sport plyo days are spaced too (${hu.plyoWeeks} multi-plyo weeks; gaps: ${[...new Set(hu.gaps)].join(',') || 'n/a'})`);

// ── the penalty is a nudge, not a gate: cramped weeks still schedule ──────────
const cramped = { ...BLANK_ANSWERS, goalType: 'sport', sport: 'run', runDiscipline: 'sprint',
  sportIntent: 'recreational', experienceLevel: 'advanced', daysPerWeek: 3,
  days: ['mon', 'tue', 'wed'], equipment: FULL };
const plan = generatePlan(answersToProfile(cramped));
ok(plan.phases[0].weeks[0].sessions.length === 3,
  'a cramped 3-consecutive-day week still schedules fully (spacing is a penalty, never a gate)');

console.log(`\n${pass} plyo-spacing checks passed.`);
