// tests/form-view.js — Phase 2 T4 + the Phase 2 flip (2026-07-21): buildView
// computes a parallel `formView` readout (CTL/ATL/TSB) from the athlete's own
// aerobic load history. Since the flip, `formView` DOES reach setRuntime — it
// feeds the deload-corroboration seam (deloadRecommendation's conservative
// tiering, packages/engine/src/lib/plan/trainingLoad.js) — but it must still
// NEVER reach the PURE baseline: generatePlan/PlanGenerator.js never reads it,
// so every plan stays byte-identical (Art 18; spec
// docs/superpowers/specs/2026-07-20-phase2-aerobic-form-model-design.md). This
// test pins (a) formView's correctness for a seeded load history, (b) that it
// DOES now reach setRuntime, and (c) that PlanGenerator (and PlanService, which
// only ever handles it opaquely — see PlanService.setRuntime) never imports the
// form/aerobic-load engine modules.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

// localStorage shim must exist BEFORE Database.js boots (it writes on import).
const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; },
  clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; }
};

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── structural proof: the ONLY channel from buildView into the reflow/plan is
// setRuntime — pin that its call NOW carries a form reference (the Phase 2 flip),
// and that the plan path (PlanService, PlanGenerator) still never IMPORTS the
// form/aerobic-load engine modules directly (PlanService only ever receives the
// value opaquely through setRuntime/runtime().form). Grepped on SOURCE TEXT so
// this can't pass by runtime accident.
const here = path.dirname(url.fileURLToPath(import.meta.url));
const storeSrc = fs.readFileSync(path.join(here, '../src/stores/trainingStore.js'), 'utf8');
assert(/aerobicDailyLoads/.test(storeSrc) && /computeForm/.test(storeSrc),
  'trainingStore imports aerobicDailyLoads + computeForm');
const setRuntimeCall = (storeSrc.match(/setRuntime\(\{[^}]*\}\);/) || [''])[0];
assert(setRuntimeCall.length > 0, 'setRuntime(...) call is found in trainingStore.js');
assert(/form/i.test(setRuntimeCall), `setRuntime(...) call carries a form reference (Phase 2 flip — got: ${setRuntimeCall})`);

for (const rel of ['../src/lib/PlanService.js', '../../../packages/engine/src/lib/PlanGenerator.js']) {
  const src = fs.readFileSync(path.join(here, rel), 'utf8');
  assert(!/aerobicDailyLoads|computeForm|aerobicLoad/.test(src),
    `${path.basename(rel)} does not reference the form/aerobic-load modules`);
}

// ---------------------------------------------------------------------------
// Seed: an onboarded athlete + a 30-day aerobic block that TAPERS into "today" —
// a textbook "fresh" read (CTL/"fitness" still up, ATL/"fatigue" collapsed).
// ---------------------------------------------------------------------------
const Database = (await import('../src/lib/Database.js')).default;

const DAY_MS = 86400000;
const todayISO = new Date().toISOString().split('T')[0];   // UTC date — matches buildView's `today`
const dayOffset = (n) => new Date(Date.parse(`${todayISO}T00:00:00.000Z`) - n * DAY_MS).toISOString().split('T')[0];

Database.services.updateProfile({
  plan_start_date: todayISO, plan_weeks: 8,
  goal_type: 'build', strength_style: 'strength', focus: ['gym'], primary: 'gym',
  experience: { gym: 'intermediate' },
  availability: { days_per_week: 3, session_minutes: 60, days: [] },
  access: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'],
  onboarded: true,
  age: 30,
  sex: 'male'
});

Database.services.upsertDailyMetric({ date: todayISO, resting_hr: 55, source: 'manual' });

// Days -40..-11 (30 loaded days) then an 11-day taper -10..0 (no load) — CTL (42d
// time constant) barely decays over the taper while ATL (7d) collapses, so TSB
// (form) should read comfortably positive → band "fresh".
for (let n = 40; n >= 11; n--) {
  const date = dayOffset(n);
  Database.tables.workouts.create({
    provider: 'test', type: 'run', session_id: null,
    start_time: `${date}T12:00:00.000Z`, end_time: `${date}T12:50:00.000Z`,
    duration_sec: 3000, avg_hr: 145
  });
}

// ---------------------------------------------------------------------------
// Build the view (module-level `...buildView()` runs on this import) and the plan.
// ---------------------------------------------------------------------------
const { useTrainingStore } = await import('../src/stores/trainingStore.js');
const Plan = await import('../src/lib/PlanService.js');

const view = useTrainingStore.getState();

// ── formView correctness ─────────────────────────────────────────────────────
assert(!!view.formView, 'formView is present on the built view');
const f = view.formView || {};
assert(typeof f.ctl === 'number' && typeof f.atl === 'number' && typeof f.tsb === 'number',
  `formView has numeric ctl/atl/tsb (got ${JSON.stringify(f)})`);
assert(typeof f.confidence === 'number' && f.confidence > 0 && f.confidence <= 1,
  `formView has a plausible confidence (${f.confidence})`);
assert(['fresh', 'neutral', 'fatigued'].includes(f.band), `formView has a real band (got ${f.band})`);
assert(f.band === 'fresh', `the 30d-block→11d-taper history reads "fresh" (ctl=${f.ctl}, atl=${f.atl}, tsb=${f.tsb}, band=${f.band})`);
assert(f.tsb > 0, 'TSB (form) is positive after the taper');

// ── formView is a SIBLING of load, not nested inside it or the reflow runtime ──
assert(Object.prototype.hasOwnProperty.call(view, 'load'), 'view still carries load (sanity)');
assert(view.load.formView === undefined, 'formView is not nested inside load');
assert(JSON.stringify(view.adaptation || {}).indexOf('"tsb"') === -1,
  'formView does not leak into adaptation (the reflow runtime readout)');

// ── plan stability: recomputing formView (refresh → buildView again) must not
// perturb the plan — the strongest available proof short of Task 7's golden master.
const plan1 = JSON.stringify(Plan.getPhases());
useTrainingStore.getState().refresh();
const plan2 = JSON.stringify(Plan.getPhases());
assert(plan1 === plan2, 'the generated plan is unchanged across a second buildView (formView recomputed, plan stable)');
assert(!!useTrainingStore.getState().formView, 'formView is still present after refresh()');

console.log(process.exitCode ? 'form-view FAILURES' : 'PASS: form-view');
