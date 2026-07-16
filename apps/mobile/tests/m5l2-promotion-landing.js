// tests/m5l2-promotion-landing.js — M5-L2 §5: landing a promotion result onto the model.
//
// The safety-critical app-side decision the design review forced into the open: a PROMOTION
// sets the learned recoveryRate (the only thing that arms the D7 steer post TR-05); a
// DEMOTION resets it to population so a mispredicted prior stops steering; an ABSTAIN with
// no prior learned leaves the population default untouched (additive-first). Pure — no DB.

const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null), setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; }, clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; },
};

const { applyPromotionToModel } = await import('../src/lib/AthleteModelService.js');
const { createAthleteModel } = await import('@performance-os/engine');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = 1; }
  else console.log('PASS:', msg);
}

const learned = { value: 1.12, source: 'learned', confidence: 'moderate' };
const provStub = { tier: 'learned', evidenceBlocks: 3 };

// ── Promotion: a learned recoveryRate lands and arms (source:'learned') ────────
{
  const model = createAthleteModel(); // schema default recoveryRate = population
  const out = applyPromotionToModel(model, { learnedPriors: { recoveryRate: learned }, staged: {}, provenance: provStub });
  assert(out.learnedPriors.recoveryRate.source === 'learned' && out.learnedPriors.recoveryRate.value === 1.12,
    'promotion sets the learned recoveryRate (arms the D7 steer)');
  assert(out.priorProvenance === provStub, 'promotion mirrors provenance');
}

// ── Demotion: a previously-learned prior, no longer supported → reset to population ──
{
  const model = createAthleteModel({ learnedPriors: { recoveryRate: { ...learned }, volumeTolerance: { value: 1, source: 'population', confidence: 'low' } } });
  const out = applyPromotionToModel(model, { learnedPriors: {}, staged: { recoveryRate: { value: 0.95, source: 'staged' } }, provenance: { tier: 'staged' } });
  assert(out.learnedPriors.recoveryRate.source === 'population' && out.learnedPriors.recoveryRate.value === 1,
    'demotion RESETS the learned recoveryRate to population (steer off — the §5 safety hole)');
  assert(out.stagedPriors.recoveryRate.source === 'staged', 'demotion re-stages the estimate');
}

// ── Abstain with no prior learned: population default untouched (additive-first) ──
{
  const model = createAthleteModel(); // population default
  const out = applyPromotionToModel(model, { learnedPriors: {}, staged: {}, provenance: { tier: 'population' } });
  assert(out.learnedPriors.recoveryRate.source === 'population' && out.learnedPriors.recoveryRate.value === 1,
    'abstain leaves the population default unchanged (no spurious arm — TR-05 / additive-first)');
}

// ── Purity: applyPromotionToModel does not mutate the input model ─────────────
{
  const model = createAthleteModel({ learnedPriors: { recoveryRate: { ...learned } } });
  const snapshot = JSON.stringify(model);
  applyPromotionToModel(model, { learnedPriors: {}, staged: {}, provenance: {} });
  assert(JSON.stringify(model) === snapshot, 'input model is not mutated (returns a new model)');
}

if (failed) process.exitCode = 1;
