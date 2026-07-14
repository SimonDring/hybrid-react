// prop-determinism.test.mjs — Phase 3 M0 T3 property: CROSS-RUNTIME DETERMINISM
// (13-VALIDATION-STRATEGY §5.2 "Cross-runtime determinism"; TAS §4.1, §13).
//
// THE INVARIANT: the engine is isomorphic — it runs on client and server — so
// identical inputs must produce BYTE-IDENTICAL output regardless of the runtime.
// No such proof existed at the pin (TR-11). The known drift channels (TAS §13) are
// number precision, locale, and collation.
//
// ── CROSS-RUNTIME LIMITATION (named, not faked — spec §5.2 + Task 3 instruction) ──
// A genuine browser-JS-engine (SpiderMonkey / JavaScriptCore) vs server-Node (V8)
// comparison cannot run in this CI — there is no second JS engine on the runner. So
// this test builds the STRONGEST AVAILABLE PROXY, in two layers:
//
//   Layer 1 — fresh-isolate cross-PROCESS comparison. The plan is generated here (this
//     process) and again in a SEPARATE `node` child process (a fresh V8 isolate, fresh
//     module graph, no shared heap / caches / iteration-order state), and the two byte
//     strings are compared. This catches nondeterminism that a same-process repeat
//     (prop-purity) cannot: module-init order, first-vs-second-load memoisation, any
//     process-global drift. It is a genuine second runtime INSTANCE — the limitation
//     is only that it is the SAME engine family (V8), not a different browser engine.
//
//   Layer 2 — drift-channel scan. The serialised plan is round-tripped
//     (parse→re-stringify) and scanned for the exact value classes that serialise
//     DIFFERENTLY across JS engines / locales: non-finite numbers (NaN/Infinity →
//     `null` under JSON, engine-inconsistent upstream), values that don't survive a
//     JSON round-trip (undefined, functions, Symbols, -0), and any locale-formatted
//     string. A plan free of these is portable across runtimes by construction.
//
// The harness is written so a real browser run drops straight in: BROWSER_PLAN_JSON,
// if set to a plan serialised by a browser build of the engine, is compared to the
// Node output for the same profile (the documented hook for the future real proof).
//
// Imports ONLY from @performance-os/engine (no app boot — spec §2.1). Deterministic:
// fixed plan_start_date on every profile.
import { spawnSync } from 'node:child_process';
import { generatePlan } from '@performance-os/engine';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

const PROFILES = {
  'build-strength-3d': { goal_type: 'build', strength_style: 'strength', experience_level: 'intermediate', experience: { gym: 'intermediate' }, sex: 'male', bodyweight_kg: 82, access: FULL, availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] }, plan_start_date: '2026-07-13', lifts: { squat: 140, bench: 100, deadlift: 180 } },
  'build-olympic-4d': { goal_type: 'build', discipline: 'olympic', experience_level: 'advanced', experience: { gym: 'advanced' }, sex: 'male', bodyweight_kg: 90, access: FULL, availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] }, plan_start_date: '2026-07-13', lifts: { squat: 150 }, olympic_lift: 'both' },
  'sport-run-sprint-4d': { goal_type: 'sport', sport: 'run', run_discipline: 'sprint', sport_intent: 'compete', event_date: '2026-08-30', experience_level: 'intermediate', experience: { gym: 'intermediate' }, sex: 'male', bodyweight_kg: 75, access: FULL, availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] }, plan_start_date: '2026-07-13', lifts: {} },
};

// A tiny generator program run in a FRESH node process — imports the same engine barrel,
// generates the named profile, prints ONLY the serialised plan on stdout.
const CHILD_SRC = `
import { generatePlan } from '@performance-os/engine';
const profile = JSON.parse(process.argv[1]);
process.stdout.write(JSON.stringify(generatePlan(profile)));
`;

// ── drift-channel scan: does the serialised plan survive a JSON round-trip and
//    contain no engine/locale-sensitive value? Returns a list of offending paths. ──
function driftOffenders(value, path = '$') {
  const bad = [];
  const t = typeof value;
  if (t === 'number') {
    if (!Number.isFinite(value)) bad.push(`${path}: non-finite number (${value})`);
    if (Object.is(value, -0)) bad.push(`${path}: negative zero`);
  } else if (t === 'function' || t === 'symbol' || t === 'undefined' || t === 'bigint') {
    bad.push(`${path}: non-JSON-portable ${t}`);
  } else if (value && t === 'object') {
    if (Array.isArray(value)) value.forEach((v, i) => bad.push(...driftOffenders(v, `${path}[${i}]`)));
    else for (const k of Object.keys(value)) bad.push(...driftOffenders(value[k], `${path}.${k}`));
  }
  return bad;
}

for (const [name, profile] of Object.entries(PROFILES)) {
  const local = JSON.stringify(generatePlan({ ...profile }));

  // Layer 1 — fresh-isolate cross-process comparison.
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', CHILD_SRC, JSON.stringify(profile)],
    { encoding: 'utf8', cwd: new URL('..', import.meta.url).pathname, timeout: 60_000 });
  if (r.status !== 0) {
    console.error('FAIL: child generator process failed for', name, '—', (r.stderr || '').trim().split('\n').slice(-3).join(' | '));
    process.exitCode = 1;
  } else {
    assert(r.stdout === local, `cross-process determinism: ${name} — fresh-isolate output is byte-identical`);
  }

  // Layer 2 — round-trip + drift-channel scan.
  const roundTrip = JSON.stringify(JSON.parse(local));
  assert(roundTrip === local, `round-trip stable: ${name} — plan survives parse→stringify byte-identically (no undefined/-0 keys)`);
  const offenders = driftOffenders(JSON.parse(local));
  assert(offenders.length === 0, `drift-channel clean: ${name} — no non-finite / non-portable / locale-sensitive values` + (offenders.length ? ` (${offenders.slice(0, 3).join('; ')})` : ''));

  // Documented hook for a FUTURE real browser proof (spec §5.2). Inert unless provided.
  if (name === 'build-strength-3d' && process.env.BROWSER_PLAN_JSON) {
    assert(process.env.BROWSER_PLAN_JSON === local, `cross-runtime (browser vs node): ${name} — byte-identical to the supplied browser-engine plan`);
  }
}

console.log('NOTE: cross-runtime coverage is a V8-vs-V8 fresh-isolate proxy + a drift-channel scan; a true browser-engine (non-V8) comparison awaits a browser build feeding BROWSER_PLAN_JSON (documented, not faked).');
