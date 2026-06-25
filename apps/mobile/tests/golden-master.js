// tests/golden-master.js
// PHASE 0 — the regression safety net for the engine refactor (docs/engine/02-REFACTOR-ROADMAP.md).
//
// Snapshots generatePlan(profile) across a representative archetype matrix and
// compares against a committed snapshot. Refactors that MUST NOT change behaviour
// (Phase 1 knowledge-base migration, Phase 2 sport-module extraction) are verified
// byte-identical here. Intentional behaviour changes (quick wins, Phase 3 recovery/
// load) regenerate the snapshot deliberately via UPDATE=1.
//
// Determinism: profiles are built through answersToProfile() (which anchors
// plan_start_date to "today"), and event dates are expressed as offsets from today,
// so the RELATIVE plan structure is identical on every run regardless of calendar
// date. generatePlan output contains no absolute dates (ranges are "Wks X–Y").
//
//   node tests/golden-master.js            compare against snapshot (capture if absent)
//   UPDATE=1 node tests/golden-master.js   regenerate the snapshot (intentional changes)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const SNAP_DIR = join(__dir, '__snapshots__');
const SNAP = join(SNAP_DIR, 'engine-golden-master.json');

// ── equipment presets ────────────────────────────────────────────────────────
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const DB = ['dumbbell', 'bodyweight'];
const BW = ['bodyweight'];

// Event date N days from now (kept inside season bands with ≥10-day margins so a
// run that straddles midnight can't flip a band — see periodization.deriveSeason).
const inDays = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };
const A = (o) => ({ ...BLANK_ANSWERS, ...o });

// ── archetype matrix — decision-bearing branches, not exhaustive ───────────────
// Covers: 3 build styles × levels × frequency (incl. 1d/7d edges) × session length
// (incl. 20-min edge) × equipment (full/dumbbell/bodyweight); sport run
// sprint/middle/long + cycle + swim across off/in(taper)/pre/transition seasons;
// entered vs absent lifts; a female archetype.
// NOTE: session length is no longer a user input — the engine ignores any
// `sessionMinutes` here and sizes sessions by volume ÷ day count, capped at the
// internal 75-min ceiling. The minutes in the archetype keys are historical labels.
const MATRIX = {
  'build·strength·beginner·3d·45·full': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'beginner', daysPerWeek: 3, sessionMinutes: 45, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'build·strength·intermediate·4d·60·full': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: { squat: 140, bench: 100, deadlift: 180 } }),
  'build·strength·advanced·5d·75·full': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'advanced', daysPerWeek: 5, sessionMinutes: 75, days: ['mon', 'tue', 'wed', 'fri', 'sat'], equipment: FULL, sex: 'male', lifts: { squat: 180, bench: 130, deadlift: 230, ohp: 80 } }),
  'build·strength·intermediate·1d·60·full(edge)': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', daysPerWeek: 1, sessionMinutes: 60, days: ['wed'], equipment: FULL, sex: 'male', lifts: {} }),
  'build·bodybuilding·intermediate·4d·60·full': A({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'build·bodybuilding·advanced·6d·75·full': A({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced', daysPerWeek: 6, sessionMinutes: 75, days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], equipment: FULL, sex: 'female', lifts: {} }),
  'build·functional·intermediate·3d·45·dumbbell': A({ goalType: 'build', strengthStyle: 'functional', experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 45, days: ['mon', 'wed', 'fri'], equipment: DB, sex: 'male', lifts: {} }),
  'build·functional·beginner·3d·20·bodyweight(edge)': A({ goalType: 'build', strengthStyle: 'functional', experienceLevel: 'beginner', daysPerWeek: 3, sessionMinutes: 20, days: ['mon', 'wed', 'fri'], equipment: BW, sex: 'male', lifts: {} }),
  'build·functional·advanced·7d·60·bodyweight(edge)': A({ goalType: 'build', strengthStyle: 'functional', experienceLevel: 'advanced', daysPerWeek: 7, sessionMinutes: 60, days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], equipment: BW, sex: 'male', lifts: {} }),

  'sport·run-sprint·intermediate·off·4d': A({ goalType: 'sport', sport: 'run', runDiscipline: 'sprint', sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'sport·run-sprint·advanced·in·4d(taper)': A({ goalType: 'sport', sport: 'run', runDiscipline: 'sprint', sportIntent: 'compete', eventDate: inDays(30), experienceLevel: 'advanced', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: { squat: 170, deadlift: 210 } }),
  'sport·run-middle·intermediate·off·4d': A({ goalType: 'sport', sport: 'run', runDiscipline: 'middle', sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'sport·run-long·intermediate·off·4d': A({ goalType: 'sport', sport: 'run', runDiscipline: 'long', sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'sport·run-long·intermediate·pre·3d': A({ goalType: 'sport', sport: 'run', runDiscipline: 'long', sportIntent: 'compete', eventDate: inDays(90), experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 45, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'sport·cycle·intermediate·off·3d': A({ goalType: 'sport', sport: 'cycle', sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 45, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'sport·cycle·intermediate·in·2d': A({ goalType: 'sport', sport: 'cycle', sportIntent: 'compete', eventDate: inDays(30), experienceLevel: 'intermediate', daysPerWeek: 2, sessionMinutes: 45, days: ['tue', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'sport·cycle·intermediate·transition·3d': A({ goalType: 'sport', sport: 'cycle', sportIntent: 'compete', eventDate: inDays(-10), experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 45, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'sport·swim·intermediate·off·3d': A({ goalType: 'sport', sport: 'swim', sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 45, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'sport·swim·advanced·in·3d': A({ goalType: 'sport', sport: 'swim', sportIntent: 'compete', eventDate: inDays(30), experienceLevel: 'advanced', daysPerWeek: 3, sessionMinutes: 60, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'female', lifts: {} })
};

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Build the current snapshot (archetype → serialized plan), failing loudly if any
// archetype throws rather than silently dropping it.
function buildCurrent() {
  const out = {};
  let threw = 0;
  for (const [key, answers] of Object.entries(MATRIX)) {
    try {
      out[key] = generatePlan(answersToProfile(answers));
    } catch (e) {
      threw++;
      console.error('FAIL: archetype threw —', key, '—', e && e.message);
      process.exitCode = 1;
    }
  }
  if (threw) console.error(`(${threw} archetype(s) threw during generation)`);
  return out;
}

// First differing line between two pretty-printed JSON blobs (a readable diff hint).
function firstDiff(aStr, bStr) {
  const a = aStr.split('\n'), b = bStr.split('\n');
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      return `  L${i + 1}\n    snapshot: ${a[i] ?? '∅'}\n    current : ${b[i] ?? '∅'}`;
    }
  }
  return '  (length differs only)';
}

const current = buildCurrent();

// In-process determinism: regenerating each archetype must be byte-identical. This
// is clock-independent (both calls within microseconds) and catches accidental
// nondeterminism a refactor might introduce (Set/Map iteration order, stray Date use)
// — independent of whether the committed snapshot is up to date.
for (const [key, answers] of Object.entries(MATRIX)) {
  if (!(key in current)) continue;
  const again = JSON.stringify(generatePlan(answersToProfile(answers)));
  assert(again === JSON.stringify(current[key]), `deterministic: ${key}`);
}

const update = !!process.env.UPDATE;

if (!existsSync(SNAP) || update) {
  if (!existsSync(SNAP_DIR)) mkdirSync(SNAP_DIR, { recursive: true });
  writeFileSync(SNAP, JSON.stringify(current, null, 2) + '\n');
  console.log(`${update ? 'UPDATED' : 'CAPTURED'} golden-master snapshot: ${Object.keys(current).length} archetypes → ${SNAP}`);
  console.log('golden-master done');
} else {
  const snapshot = JSON.parse(readFileSync(SNAP, 'utf8'));
  const snapKeys = Object.keys(snapshot), curKeys = Object.keys(current);
  assert(snapKeys.length === curKeys.length, `archetype count stable (snapshot ${snapKeys.length}, current ${curKeys.length})`);
  // Flag added/removed archetypes (a matrix change is intentional → run UPDATE=1).
  for (const k of curKeys) if (!(k in snapshot)) console.error('FAIL: new archetype not in snapshot (run UPDATE=1):', k);
  for (const k of snapKeys) if (!(k in current)) console.error('FAIL: snapshot archetype missing from matrix:', k);

  let drift = 0;
  for (const key of snapKeys) {
    if (!(key in current)) continue;
    const exp = JSON.stringify(snapshot[key], null, 2);
    const got = JSON.stringify(current[key], null, 2);
    if (exp === got) {
      console.log('PASS:', key);
    } else {
      drift++;
      console.error('FAIL: plan drifted —', key);
      console.error(firstDiff(exp, got));
      process.exitCode = 1;
    }
  }
  if (drift) console.error(`\n${drift} archetype(s) drifted. If intentional, regenerate: UPDATE=1 node tests/golden-master.js`);
  console.log('golden-master done');
}
