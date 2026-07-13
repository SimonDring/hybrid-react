// tests/discipline-style-band.js — P0-1 (audit TR-01): the post-flip style-id fallthrough.
//
// Since the build flip (WP-49 T6) a build profile's style is its DISCIPLINE id
// (powerlifting / hypertrophy / olympic), but the style-keyed tables — STYLE_TOP
// (KB volume.style_top), STYLE_SCHEME_BRIDGE, and the allocator's style whitelist —
// only knew the legacy names, so all three disciplines silently took the
// FUNCTIONAL volume band and scheme. These tests pin the fix:
//   • powerlifting rides the strength band (0.6 — intensity carries it) and keeps
//     the 3-primary session cap;
//   • hypertrophy rides the bodybuilding band (1.4 overreach past MAV);
//   • olympic rides the strength band and resolves to its explosiveStrength scheme.
import { weeklyMuscleTargets } from '@performance-os/engine/lib/strength/targets.js';
import { DOSE_SCHEMES, DISCIPLINE_DOSE_QUALITY } from '@performance-os/engine/data/doseSchemes.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
import allocator, { allocateGym } from '@performance-os/engine/lib/plan/allocator.js';
const { scheme } = allocator;

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── 1 · Volume band: each discipline id resolves to its legacy family's band ──
const bands = (style) => weeklyMuscleTargets({
  style, intent: 'build', level: 'intermediate',
  phaseWeeks: 4, weekInPhase: 4, emphasis: {}, volumeScalar: 1,
});
const same = (a, b) => JSON.stringify(bands(a)) === JSON.stringify(bands(b));

assert(same('powerlifting', 'strength'), 'powerlifting volume band === strength (0.6)');
assert(same('hypertrophy', 'bodybuilding'), 'hypertrophy volume band === bodybuilding (1.4 overreach)');
assert(same('olympic', 'strength'), 'olympic volume band === strength (0.6)');
assert(!same('powerlifting', 'functional'), 'powerlifting band is NOT the functional band');
assert(!same('hypertrophy', 'functional'), 'hypertrophy band is NOT the functional band');
// Direction sanity: strength band < functional < bodybuilding at the top of the ramp.
const quads = (s) => bands(s).quads;
assert(quads('powerlifting') < quads('functional'), `powerlifting quads below functional (${quads('powerlifting')} < ${quads('functional')})`);
assert(quads('hypertrophy') > quads('functional'), `hypertrophy quads above functional (${quads('hypertrophy')} > ${quads('functional')})`);

// ── 2 · Scheme resolution: a discipline id resolves to its OWN scheme, never the
// functional default — and always the SAME scheme its per-session dose pin
// (DISCIPLINE_DOSE_QUALITY) uses, so fallback and pinned dose never disagree.
assert(scheme('powerlifting', 'base') === DOSE_SCHEMES.maxStrength.base, 'scheme: powerlifting → maxStrength');
assert(scheme('hypertrophy', 'build') === DOSE_SCHEMES.hypertrophy.build, 'scheme: hypertrophy → hypertrophy');
assert(scheme('olympic', 'base') === DOSE_SCHEMES.explosiveStrength.base, 'scheme: olympic → explosiveStrength');
for (const [disc, q] of Object.entries(DISCIPLINE_DOSE_QUALITY)) {
  assert(scheme(disc, 'base') === DOSE_SCHEMES[q].base, `scheme and DISCIPLINE_DOSE_QUALITY agree for ${disc}`);
}

// ── 3 · Allocator whitelist: powerlifting keeps the strength family's 3-primary cap ──
// Exercised on the legacy fill path (no ctx.discipline) so the bestExercise cap is the
// thing under test. Generous targets + a long slot so the cap is the binding constraint.
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const bigTargets = { quads: 12, hamstrings: 10, glutes: 10, chest: 10, back: 12, shoulders: 8, core: 6 };
const roleOf = new Map(EXERCISES.map((e) => [e.id, e.role]));
const primaryCount = (style) => {
  const [session] = allocateGym({
    targets: { ...bigTargets },
    slots: [{ minutes: 90, equip: FULL }],
    ctx: { style, intent: 'base', level: 'advanced', sex: 'male', access: FULL, lifts: {} },
  });
  return (session.items || []).filter((it) => roleOf.get(it.exId) === 'primary').length;
};
const plPrimaries = primaryCount('powerlifting');
const fnPrimaries = primaryCount('functional');
assert(plPrimaries === 3, `powerlifting session holds 3 primaries (got ${plPrimaries})`);
assert(fnPrimaries <= 2, `functional session capped at 2 primaries (got ${fnPrimaries})`);

console.log('discipline-style-band done');
