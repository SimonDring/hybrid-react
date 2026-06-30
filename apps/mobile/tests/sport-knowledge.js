// tests/sport-knowledge.js
// The Sport Knowledge Base (SKB): every profile obeys the SportProfile contract, the two
// GAA flagships (Gaelic football + hurling) are fully authored AND distinct, the other
// sports are valid scaffolds, and the binding privacy rule (no raw-vital KPI is coach/team
// visible — see docs/product/TEAM-ARCHITECTURE.md) is enforced by the validator.
import skb from '@performance-os/engine/lib/sportKnowledge/index.js';
import { validateSportProfile, RAW_VITALS } from '@performance-os/engine/lib/sportKnowledge/schema.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── registry validity + coverage ──────────────────────────────────────────────
const v = skb.validate();
assert(v.ok, `every sport profile is valid (${v.errors.slice(0, 4).join(' | ') || 'no errors'})`);
for (const id of ['gaelic_football', 'hurling', 'rugby', 'soccer', 'running', 'cycling', 'swimming']) {
  assert(skb.has(id), `registry contains "${id}"`);
}
assert(skb.get('kabaddi') === undefined, 'unknown sport returns undefined (generic fallback)');

// ── flagships fully authored ───────────────────────────────────────────────────
const FLAGSHIPS = ['gaelic_football', 'hurling', 'swimming'];
for (const id of FLAGSHIPS) {
  const c = skb.completeness(id);
  assert(c.complete, `${id} is fully authored (score ${c.score.toFixed(2)}; thin: ${c.thin.join(', ') || 'none'})`);
}

// ── flagships are genuinely DISTINCT sports, not one GAA profile ────────────────
const fb = skb.get('gaelic_football');
const hu = skb.get('hurling');
const fbGrip = fb.physicalProfile.qualities.gripStrength.importance;
const huGrip = hu.physicalProfile.qualities.gripStrength.importance;
assert(huGrip > fbGrip, `hurling weights grip strength higher than football (${huGrip} > ${fbGrip}) — striking/stick demand`);
const fbRot = fb.physicalProfile.qualities.rotationalPower.importance;
const huRot = hu.physicalProfile.qualities.rotationalPower.importance;
assert(huRot > fbRot, `hurling weights rotational power higher than football (${huRot} > ${fbRot}) — sliotar striking`);
const huMetrics = hu.kpiFramework.kpis.map(k => k.metric);
assert(huMetrics.includes('grip') && !fb.kpiFramework.kpis.map(k => k.metric).includes('grip'),
  'hurling carries a grip-strength KPI football does not');

// swimming is a genuinely different sport: mobility leads, shoulder is the injury target
const sw = skb.get('swimming');
assert(sw.physicalProfile.qualities.mobility.importance >= 9,
  `swimming weights mobility very high (${sw.physicalProfile.qualities.mobility.importance}) — shoulder/ankle range`);
assert(sw.kpiFramework.kpis.some(k => k.metric === 'shoulder_er_strength'),
  'swimming carries a shoulder external-rotation KPI (swimmer\'s-shoulder focus)');

// ── stubs are valid scaffolds (structurally fine, low completeness) ─────────────
for (const id of ['rugby', 'soccer', 'running', 'cycling']) {
  assert(validateSportProfile(skb.get(id)).length === 0, `${id} stub is structurally valid`);
  assert(!skb.completeness(id).complete, `${id} stub reports as a scaffold (not yet complete)`);
}

// ── §3 energy systems sum to ~100 across every profile ──────────────────────────
for (const p of skb.all()) {
  const es = p.energySystems;
  const sum = es.aerobicPct + es.glycolyticPct + es.atpPcPct;
  assert(Math.abs(sum - 100) <= 2, `${p.id} energy systems sum to ~100 (${sum})`);
}

// ── PRIVACY RULE: a coach-visible raw-vital KPI must be REJECTED ─────────────────
assert(RAW_VITALS.has('hrv'), 'schema recognises hrv as a raw vital');
const bad = structuredClone(fb);
bad.kpiFramework.kpis.push({
  name: 'HRV (leak)', metric: 'hrv', category: 'Recovery', leadingOrLagging: 'leading',
  importance: 5, athleteDashboard: true, coachDashboard: true, teamDashboard: false,
  confidence: 'moderate', evidenceLevel: 'L3', source: 'test fixture'
});
const badErrs = validateSportProfile(bad);
assert(badErrs.some(e => /privacy/i.test(e)), 'validator rejects a coach-visible raw-vital KPI (privacy rule fires)');
// sanity: the legitimate private HRV KPI (coach=false) does NOT trip the rule
assert(validateSportProfile(fb).length === 0, 'a correctly-private HRV KPI (athlete-only) passes');

// ── §21 dashboard limits + score weights (flagships) ────────────────────────────
for (const id of FLAGSHIPS) {
  const kf = skb.get(id).kpiFramework;
  assert(kf.athleteDashboardKpis.length <= 8, `${id}: at most 8 athlete-dashboard KPIs (${kf.athleteDashboardKpis.length})`);
  assert(kf.coachDashboardKpis.length <= 15, `${id}: at most 15 coach-dashboard KPIs (${kf.coachDashboardKpis.length})`);
  const wsum = kf.performanceScore.components.reduce((a, c) => a + c.weight, 0);
  assert(Math.abs(wsum - 1) < 0.001, `${id}: performance-score weights sum to 1 (${wsum.toFixed(3)})`);
}

// ── §14 decision rules are well-formed IF/THEN with provenance (flagships) ──────
for (const id of FLAGSHIPS) {
  const rules = skb.get(id).decisionRules;
  assert(rules.length >= 6, `${id}: has a decision-rule set (${rules.length})`);
  assert(rules.every(r => r.if && r.then && r.confidence), `${id}: every decision rule has if/then/confidence`);
}

// ── gymProgramming authored + rules structured (flagships) ──────────────────────
for (const id of FLAGSHIPS) {
  const gp = skb.get(id).gymProgramming;
  assert(gp && Object.keys(gp.emphasis).length > 0, `${id} has gymProgramming.emphasis`);
  assert(skb.get(id).decisionRules.every(r => r.trigger && r.effect), `${id} rules are all structured`);
}
assert(JSON.stringify(skb.ids().filter(id => skb.completeness(id).complete).sort())
  === JSON.stringify(['gaelic_football','hurling','swimming'].sort()),
  'exactly the three flagships are complete');

// ── onboarding discipline mechanism ─────────────────────────────────────────
// a profile that declares meta.disciplines must use {key,label,hint}
// keys that match its gymProgramming.byDiscipline keys (the wizard reads meta.disciplines).
const runMeta = skb.get('running').meta.disciplines;
assert(Array.isArray(runMeta) && runMeta.length === 3 && runMeta.every(d => d.key && d.label),
  'running.meta.disciplines is a well-formed {key,label,hint}[]');
assert(JSON.stringify(runMeta.map(d => d.key).sort()) === JSON.stringify(Object.keys(skb.get('running').gymProgramming.byDiscipline).sort()),
  'running.meta.disciplines keys match gymProgramming.byDiscipline keys');

console.log('sport-knowledge tests done');
