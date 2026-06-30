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
for (const id of ['gaelic_football', 'hurling', 'rugby', 'soccer', 'running_sprint', 'running_middle', 'running_long', 'cycling', 'swimming', 'triathlon']) {
  assert(skb.has(id), `registry contains "${id}"`);
}
assert(skb.get('kabaddi') === undefined, 'unknown sport returns undefined (generic fallback)');

// ── flagships fully authored ───────────────────────────────────────────────────
const FLAGSHIPS = ['gaelic_football', 'hurling', 'swimming', 'cycling', 'triathlon', 'running_sprint', 'running_middle', 'running_long'];
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

// cycling is a genuinely different sport: aerobic endurance leads, power-to-weight is the currency
const cy = skb.get('cycling');
assert(cy.physicalProfile.qualities.aerobicEndurance.importance >= 9,
  `cycling weights aerobic endurance very high (${cy.physicalProfile.qualities.aerobicEndurance.importance}) — the dominant determinant`);
assert(cy.physicalProfile.qualities.rotationalPower.importance <= 3,
  `cycling weights rotational power low (${cy.physicalProfile.qualities.rotationalPower.importance}) — a symmetric, sagittal sport`);
assert(cy.kpiFramework.kpis.some(k => k.metric === 'ftp_wkg'),
  'cycling carries a power-to-weight (FTP W/kg) KPI — the climbing/GC currency');

// ── running disciplines are genuinely DISTINCT events, not one 'running' profile ──
const rsp = skb.get('running_sprint');
const rmd = skb.get('running_middle');
const rlg = skb.get('running_long');
assert(rsp.physicalProfile.qualities.explosivePower.importance > rlg.physicalProfile.qualities.explosivePower.importance,
  `sprint weights explosive power higher than long (${rsp.physicalProfile.qualities.explosivePower.importance} > ${rlg.physicalProfile.qualities.explosivePower.importance})`);
assert(rlg.physicalProfile.qualities.aerobicEndurance.importance > rsp.physicalProfile.qualities.aerobicEndurance.importance,
  `long weights aerobic endurance higher than sprint (${rlg.physicalProfile.qualities.aerobicEndurance.importance} > ${rsp.physicalProfile.qualities.aerobicEndurance.importance})`);
assert(rlg.physicalProfile.qualities.durability.importance > rsp.physicalProfile.qualities.durability.importance,
  `long weights durability higher than sprint (${rlg.physicalProfile.qualities.durability.importance} > ${rsp.physicalProfile.qualities.durability.importance})`);
assert(rsp.energySystems.atpPcPct > rlg.energySystems.atpPcPct && rlg.energySystems.aerobicPct > rsp.energySystems.aerobicPct,
  `sprint is ATP-PC/glycolytic-led, long aerobic-dominant (sprint atpPc ${rsp.energySystems.atpPcPct} vs long ${rlg.energySystems.atpPcPct}; long aerobic ${rlg.energySystems.aerobicPct} vs sprint ${rsp.energySystems.aerobicPct})`);
assert(rmd.energySystems.aerobicPct > rsp.energySystems.aerobicPct && rmd.energySystems.aerobicPct < rlg.energySystems.aerobicPct,
  `middle sits between sprint and long on the aerobic axis (${rsp.energySystems.aerobicPct} < ${rmd.energySystems.aerobicPct} < ${rlg.energySystems.aerobicPct})`);
const sprintMetrics = rsp.kpiFramework.kpis.map(k => k.metric);
const longMetrics = rlg.kpiFramework.kpis.map(k => k.metric);
assert(sprintMetrics.includes('nordic_hamstring') && !longMetrics.includes('nordic_hamstring'),
  'sprint carries a Nordic-hamstring eccentric-strength KPI that long does not');
assert(longMetrics.includes('energy_availability') && !sprintMetrics.includes('energy_availability'),
  'long carries an energy-availability (RED-S/bone) KPI that sprint does not');

// ── stubs are valid scaffolds (structurally fine, low completeness) ─────────────
for (const id of ['rugby', 'soccer']) {
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

console.log('sport-knowledge tests done');
