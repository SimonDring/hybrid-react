// Runtime validation + normalisation. Degrades gracefully: missing data is valid; bad values
// are clamped or flagged. Never throws (Constitution Article 5 — never refuse to model).
import { createAthleteModel } from './schema.js';

const SEXES = new Set(['male', 'female', 'other']);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export function validateAthleteModel(model) {
  const errors = {};
  const src = (model && typeof model === 'object') ? model : {};
  const value = createAthleteModel(src);

  // identity — guard against a null / non-object / array identity so we never throw
  // and never emit a corrupt identity (createAthleteModel can pass an explicit null through).
  if (!value.identity || typeof value.identity !== 'object' || Array.isArray(value.identity)) {
    value.identity = createAthleteModel().identity;
  }
  const id = value.identity;
  if (id.age != null) {
    if (typeof id.age !== 'number' || Number.isNaN(id.age)) { errors['identity.age'] = 'age must be a number'; id.age = null; }
    else id.age = clamp(id.age, 5, 100);
  }
  if (id.bodyMassKg != null) {
    if (typeof id.bodyMassKg !== 'number' || Number.isNaN(id.bodyMassKg)) { errors['identity.bodyMassKg'] = 'bodyMassKg must be a number'; id.bodyMassKg = null; }
    else id.bodyMassKg = clamp(id.bodyMassKg, 20, 300);
  }
  if (id.biologicalSex != null && !SEXES.has(id.biologicalSex)) {
    errors['identity.biologicalSex'] = `unknown sex "${id.biologicalSex}"`;
  }

  // goals
  value.goals = (Array.isArray(value.goals) ? value.goals : []).map((g) => ({
    ...g,
    priority: g && g.priority != null ? Math.max(1, Math.round(Number(g.priority) || 1)) : 1,
  }));

  return { ok: Object.keys(errors).length === 0, value, errors };
}
