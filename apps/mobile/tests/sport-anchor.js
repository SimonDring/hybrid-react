// tests/sport-anchor.js
// Sport sessions must LEAD with substantive sport work, not a generic anchor or a filler.
// Two regimes (Sprint 8 D11 re-seat): run + cycle are diagnosis-driven (D11) — each session leads
// with a compound or power quality-driver (the value-ordered pick). Swim is still on the legacy path
// — it leads with a sport-priority-list exercise (the original F8 behaviour). Plus: sprint no longer
// accrues a pile of non-specific chest volume.
import * as SKB from '@performance-os/engine/lib/sportKnowledge/index.js';
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
import { resolveProgram } from '@performance-os/engine/lib/strength/program.js';
import { volumeReport } from '@performance-os/engine/lib/plan/volume.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const byName = {}; for (const e of EXERCISES) byName[e.name] = e;
const mk = (o) => answersToProfile({ ...BLANK_ANSWERS, goalType: 'sport', sessionMinutes: 60, daysPerWeek: 4,
  equipment: FULL, sex: 'male', lifts: { squat: 140, bench: 100, deadlift: 180 }, experienceLevel: 'intermediate', sportIntent: 'build_base', ...o });

const D11_SPORTS = new Set(['run', 'cycle']);        // diagnosis-driven selection (Sprint 8)
// WP-20: swim is CATEGORY-LED — each session opens on its SKB category assignment's
// top-rated movement (pull-up / broad jump / trap-bar / dead bug), not the legacy
// priority list.
const SWIM_LIB = new Set((SKB.section('swimming', 'exerciseLibrary')?.exercises || []).map((e) => e.id));
const COMPOUND = new Set(['squat', 'hinge', 'hpush', 'vpush', 'hpull', 'vpull', 'lunge']);
for (const cfg of [{ sport: 'swim' }, { sport: 'run', runDiscipline: 'sprint', experienceLevel: 'advanced' }, { sport: 'run', runDiscipline: 'long' }, { sport: 'cycle' }]) {
  const prof = mk(cfg);
  const wk = generatePlan(prof).phases[0].weeks[0];
  const tag = cfg.sport + (cfg.runDiscipline ? '-' + cfg.runDiscipline : '');
  const leads = wk.sessions.map(s => s.items[0] && s.items[0].name).join(', ');
  if (D11_SPORTS.has(cfg.sport)) {
    // D11: each session leads with a substantive quality-driver — a compound OR a power/plyo movement
    // (the value-ordered pick), never an isolation/core/mobility filler.
    const allLed = wk.sessions.every(s => { const d = byName[s.items[0] && s.items[0].name]; return d && (COMPOUND.has(d.pattern) || d.quality === 'power'); });
    assert(allLed, `${tag}: every session leads with a compound/power quality-driver (leads: ${leads})`);
  } else {
    // Category-led sports (swim, WP-20): lead with a movement from the sport's SKB library.
    const allLed = wk.sessions.every(s => { const d = byName[s.items[0] && s.items[0].name]; return d && SWIM_LIB.has(d.id); });
    assert(allLed, `${tag}: every session leads with a swimming-library movement (leads: ${leads})`);
  }
}

// Build plans still open with a fundamental compound (anchor override is sport-only).
const buildWk = generatePlan(answersToProfile({ ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength',
  experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, equipment: FULL, sex: 'male', lifts: { squat: 140, bench: 100, deadlift: 180 } })).phases[0].weeks[0];
const compoundPatterns = new Set(['squat', 'hinge', 'hpush', 'vpush', 'hpull', 'vpull', 'lunge']);
assert(buildWk.sessions.every(s => { const d = byName[s.items[0] && s.items[0].name]; return d && compoundPatterns.has(d.pattern); }),
  'build sessions still open with a fundamental compound');

// Sprint chest volume trimmed to maintenance (was ~12 sets pre-F8). The
// experience-scaled band lifts an advanced athlete's whole band, so a de-emphasized
// muscle sits at ~MEV (≤10) rather than below it — maintenance, not growth.
const sprintWk = generatePlan(mk({ sport: 'run', runDiscipline: 'sprint', experienceLevel: 'advanced' })).phases[0].weeks[0];
const chest = volumeReport(sprintWk.sessions).rows.find(r => r.muscle === 'chest').sets;
assert(chest <= 10, `sprint chest volume trimmed to maintenance <=10 sets (got ${chest})`);

console.log('sport-anchor tests done');
