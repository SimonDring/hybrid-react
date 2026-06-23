// tests/injuries.js
// PHASE 4 — the data-driven injury layer: every region profile obeys the InjuryProfile
// contract, getContraindications keeps its exact behaviour (parity with the prior regex
// table), prevention protocols are evidence-tagged to the knowledge base, and a new
// region plugs in via data alone. (End-to-end filtering is covered by injury-engine.js.)
import injury from '../src/lib/injury/index.js';
import { validateInjuryProfile } from '../src/lib/injury/_schema.js';
import { getContraindications } from '../src/lib/injury/injuryRules.js';
import kb from '../src/lib/knowledge/kb.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── registry validity + coverage ──────────────────────────────────────────────
const v = injury.validate();
assert(v.ok, `every injury profile is valid (${v.errors.join(' | ') || 'no errors'})`);
const REGIONS = ['knee', 'ankle', 'hamstring', 'hip', 'calf', 'shin', 'quad', 'shoulder', 'elbow', 'wrist', 'lumbar', 'thoracic', 'cervical', 'core'];
for (const r of REGIONS) assert(injury.hasProfile(r), `registry contains "${r}"`);
assert(injury.getProfile('tentacle') === undefined, 'unknown region → undefined');

// ── parity: getContraindications keeps its exact behaviour ─────────────────────
const knee = getContraindications('knee', 3, 'protect');
assert(knee.blockedPatterns.some(p => p.test('Squat')) && knee.blockedPatterns.some(p => p.test('Running interval')), 'knee protect blocks squat + run');
assert(getContraindications('knee', 3, 'return_to_sport').blockedPatterns.length < knee.blockedPatterns.length, 'return_to_sport blocks fewer than protect');
assert(getContraindications('knee', 4, 'return_to_sport').blockedPatterns.some(p => p.test('Squat')), 'severity 4 forces protect-level blocks');
assert(getContraindications('knee', 1, 'loading').blockedPatterns.length === 0, 'severity 1 → no blocks');
assert(getContraindications('lumbar', 3, 'protect').blockedPatterns.some(p => p.test('Deadlift')), 'lumbar protect blocks deadlift');
assert(getContraindications('tentacle', 3, 'protect').blockedPatterns.length === 0, 'unknown region → no blocks');

// ── evidence-based prevention protocols (with dosing) tied to the knowledge base ─
const ham = injury.getProfile('hamstring');
assert(ham.preventionExercises.some(e => e.id === 'nordic_curl' && e.dosing && e.evidenceId === 'prevention.nordic_hamstring'), 'hamstring → Nordic curl prevention w/ dosing + evidence');
const hip = injury.getProfile('hip');
assert(hip.preventionExercises.some(e => e.id === 'copenhagen' && e.evidenceId === 'prevention.copenhagen_groin'), 'hip/groin → Copenhagen prevention w/ evidence');
for (const id of ['prevention.copenhagen_groin', 'prevention.nordic_hamstring', 'prevention.neuromuscular_acl']) {
  assert(kb.has(id), `knowledge base has ${id}`);
}
// Nordic's contested magnitude is honestly tagged.
assert(kb.get('prevention.nordic_hamstring').confidence === 'moderate', 'Nordic prevention tagged confidence:moderate (contested magnitude)');

// Every prevention evidenceId referenced by a profile resolves in the knowledge base.
let dangling = 0;
injury.allProfiles().forEach(p => p.preventionExercises.forEach(e => { if (e.evidenceId && !kb.has(e.evidenceId)) { dangling++; console.error('FAIL: dangling evidenceId', p.region, e.evidenceId); } }));
assert(dangling === 0, 'no dangling prevention evidenceId references');

// ── extensibility: a new region plugs in via data alone ────────────────────────
const newProfile = {
  region: 'jaw', label: 'Jaw',
  contraindications: { protect: [/chewing/i], early_motion: [], loading: [], return_to_sport: [] },
  riskFactors: ['bruxism'],
  preventionExercises: [{ id: 'jaw_relax', dosing: 'daily' }],
  returnToPerformance: ['pain-free chewing']
};
assert(validateInjuryProfile(newProfile).length === 0, 'a well-formed new region validates (zero core edits needed)');
assert(validateInjuryProfile({ region: 'broken' }).length > 0, 'a malformed profile is rejected');

console.log('injuries tests done');
