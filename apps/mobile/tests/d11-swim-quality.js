// tests/d11-swim-quality.js — WP-20: the swim re-seat is an IMPROVEMENT, not just a
// change (the HANDOFF's required standard, mirroring d11-runner-quality.js).
//
// Sprint 8's swim flip failed: all-hinge, undifferentiated, under-dosed, no pulling.
// Under category-led D11 (approved Sprint 9 design, Option B) a swimmer's week must
// carry: upper-body PULL strength (propulsion), shoulder health (ER/face pull/
// scapular — swimmers' #1 injury site), core anti-rotation, posterior-chain work —
// on DIFFERENTIATED days, at a real dose, and never posterior-chain-only.

import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

const SWIMMER = A({ goalType: 'sport', sport: 'swim', sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL });
const plan = generatePlan(answersToProfile(SWIMMER));
const week = plan.phases[0].weeks[0];
const working = (s) => (s.items || []).filter((it) => it.volumeFactor !== 0 && it.section !== 'primer');
const names = week.sessions.flatMap((s) => working(s).map((it) => (it.name || '').toLowerCase()));

// The propulsion need: upper-body pull STRENGTH, plural (row + vertical pull).
assert(names.some((n) => /pull-up|pulldown/.test(n)), 'vertical pull present (propulsion)');
assert(names.some((n) => /\brow\b/.test(n)), 'horizontal row present');
// Shoulder health — swimmers' #1 injury site.
assert(names.some((n) => /external rotation|face pull|scapular|serratus|prone [ytw]/.test(n)) ||
  week.sessions.some((s) => (s.items || []).some((it) => /external rotation|face pull|serratus|prone [ytw]/i.test(it.name))),
  'shoulder ER / scapular health work present');
// Core anti-rotation / anti-extension.
assert(names.some((n) => /pallof|dead bug|woodchop|plank/.test(n)), 'core anti-rotation/anti-extension present');
// Posterior chain present — but NEVER the whole plan (the Sprint-8 failure).
assert(names.some((n) => /deadlift|hinge|glute/.test(n)), 'posterior-chain work present');
const hingey = names.filter((n) => /deadlift|hinge|glute|rdl|nordic/.test(n)).length;
assert(hingey / names.length < 0.5, `NOT posterior-chain-only (${hingey}/${names.length} hinge-family)`);

// Differentiated days (the collapse was the failure mode).
const sigs = new Set(week.sessions.map((s) => working(s).map((it) => it.name).join('|')));
assert(sigs.size >= 3, `days are differentiated (${sigs.size} distinct of ${week.sessions.length})`);

// Not under-dosed: every session carries real working items, and the week's working
// sets are a real dose (the Sprint-8 flip collapsed to ~63% of legacy volume).
assert(week.sessions.every((s) => working(s).length >= 2), 'every session has ≥2 working items');
const setCount = week.sessions.flatMap(working).reduce((a, it) => a + (Number((/^(\d+)/.exec(it.sets || '') || [])[1]) || 0), 0);
assert(setCount >= 40, `weekly working sets are a real dose (${setCount})`);

// Explainability: category-led sessions carry the library rationale on the objective
// (surfaced via meta only when validation reports — here we check the plan is valid).
assert(plan.meta.validation.pass === true, 'the flipped swim plan passes the validator suite');

// Determinism.
assert(JSON.stringify(generatePlan(answersToProfile(SWIMMER))) === JSON.stringify(plan), 'deterministic');
