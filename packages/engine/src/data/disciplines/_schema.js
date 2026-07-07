// Discipline module schema — validation for strength-discipline knowledge modules
// (the discipline-level parallel to the sport modules under data/sportKnowledge).
// A "discipline" here means a strength-training discipline/style (e.g. powerlifting,
// bodybuilding) rather than a sport; modules are validated against this schema before
// being admitted to the registry (index.js). Static shape check only — no runtime logic.
import { qualityIds } from '../qualities.js';

const QUALITIES = new Set(qualityIds());
const SEASONS = ['off', 'pre', 'in', 'transition'];
const isBlock = (b) => !!b && typeof b.totalWeeks === 'number' && Array.isArray(b.split) && Array.isArray(b.deloads);
const isDose = (d) => !!d && d.main && d.accessory && typeof d.main.reps === 'string' && typeof d.accessory.reps === 'string';

export function validateDisciplineModule(m) {
  if (!m || typeof m !== 'object') return ['discipline module is not an object'];
  const e = []; const id = m.id || '(no id)';
  if (typeof m.id !== 'string' || !m.id) e.push(`${id}: id required`);
  if (typeof m.label !== 'string' || !m.label) e.push(`${id}: label required`);
  if (!m.demand || typeof m.demand !== 'object') e.push(`${id}: demand must be an object`);
  else for (const q of Object.keys(m.demand)) { if (!QUALITIES.has(q)) e.push(`${id}: unknown quality '${q}' in demand`); if (typeof m.demand[q] !== 'number' || m.demand[q] < 0 || m.demand[q] > 1) e.push(`${id}: demand.${q} must be 0..1`); }
  if (!Array.isArray(m.priorityLifts) || !m.priorityLifts.length) e.push(`${id}: priorityLifts must be a non-empty array`);
  if (!m.periodization || !isBlock(m.periodization.off)) e.push(`${id}: periodization.off must be a block template`);
  if (!isDose(m.doseCharacter)) e.push(`${id}: doseCharacter.main/accessory required`);
  if (!Array.isArray(m.accessoryPatterns)) e.push(`${id}: accessoryPatterns must be an array`);
  return e;
}
export function validateRegistry(modules) {
  const errors = []; const seen = new Set();
  for (const m of modules) { errors.push(...validateDisciplineModule(m)); if (m && m.id) { if (seen.has(m.id)) errors.push(`duplicate discipline id: ${m.id}`); seen.add(m.id); } }
  return { ok: errors.length === 0, errors };
}
export { SEASONS };
export default { validateDisciplineModule, validateRegistry, SEASONS };
