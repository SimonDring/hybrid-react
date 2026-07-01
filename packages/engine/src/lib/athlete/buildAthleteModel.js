// Pure builder: partial inputs → validated Athlete Model. asOf is an injected 'YYYY-MM-DD'
// string used for any timestamp — the function never reads a clock (determinism).
import { createAthleteModel } from './schema.js';
import { validateAthleteModel } from './validation.js';

export function buildAthleteModel(inputs = {}, asOf) {
  const model = createAthleteModel(inputs);
  model.meta = { ...model.meta, onboardedAt: (inputs.meta && inputs.meta.onboardedAt) || asOf || null,
                 source: (inputs.meta && inputs.meta.source) || 'onboarding' };
  return validateAthleteModel(model).value;
}
