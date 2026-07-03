// tests/d11-runner-quality.js — Sprint 8: the sport re-seat is an IMPROVEMENT, not just a change.
// The in-season distance runner gets durability/economy work + NO chest/arm isolation, and leaner
// sessions; the novice sprinter gets a strength base with no competency-gated plyo.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
// In-season = a competitor with a race within ~8 weeks (deriveSeason → 'in'). Computed once so the
// determinism check below regenerates the identical profile.
const inDays = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };
const RUNNER = A({ goalType: 'sport', sport: 'run', runDiscipline: 'long', sportIntent: 'compete', eventDate: inDays(30), experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL });

const plan = generatePlan(answersToProfile(RUNNER));
const allItems = plan.phases.flatMap((ph) => ph.weeks.flatMap((w) => w.sessions.flatMap((s) => s.items || [])));
const names = allItems.map((it) => (it.name || '').toLowerCase());

// Durability / posterior-chain work is present.
assert(names.some((n) => /nordic|romanian|rdl|hamstring|glute|calf/.test(n)), 'runner plan includes posterior-chain / calf durability work');
// NO chest fly / arm isolation (off-target for a distance runner) anywhere.
assert(!names.some((n) => /chest fly|pec deck|biceps curl|spider curl|triceps|lateral raise/.test(n)), 'runner plan excludes chest/arm isolation');
// Every sport session is non-empty.
assert(plan.phases.every((ph) => ph.weeks.every((w) => w.sessions.every((s) => (s.items || []).length >= 1))), 'no empty sport session');

// Novice sprinter → a strength-base compound (squat/hinge), and no depth-jump/olympic plyo (competency).
const sp = generatePlan(answersToProfile(A({ goalType: 'sport', sport: 'run', runDiscipline: 'sprint', experienceLevel: 'beginner', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: FULL })));
const spNames = sp.phases[0].weeks[0].sessions.flatMap((s) => (s.items || []).map((it) => (it.name || '').toLowerCase()));
assert(spNames.some((n) => /squat|deadlift|trap.?bar|press/.test(n)), 'novice sprinter gets a strength-base compound');
assert(!spNames.some((n) => /depth jump|power clean|hang clean/.test(n)), 'novice sprinter has no competency-gated olympic/plyo work');

// Determinism.
assert(JSON.stringify(generatePlan(answersToProfile(RUNNER))) === JSON.stringify(plan), 'deterministic');
