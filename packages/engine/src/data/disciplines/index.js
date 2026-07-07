// Discipline module registry — the three build disciplines (hypertrophy, powerlifting, olympic).
// Parallels data/sportKnowledge's registry shape. Validated against _schema.js on every read via
// disciplineErrors().
import { validateRegistry } from './_schema.js';
import hypertrophy from './hypertrophy.js';
import powerlifting from './powerlifting.js';
import olympic from './olympic.js';

export const DISCIPLINES = [hypertrophy, powerlifting, olympic];
const BY_ID = new Map(DISCIPLINES.map((d) => [d.id, d]));
export function getDiscipline(id) { return BY_ID.get(id) || null; }
export function disciplineErrors() { return validateRegistry(DISCIPLINES).errors; }
export default { DISCIPLINES, getDiscipline, disciplineErrors };
