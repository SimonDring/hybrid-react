// Discipline module registry — empty for now; strength-discipline modules (powerlifting,
// bodybuilding, etc.) are added in later tasks. Parallels data/sportKnowledge's registry
// shape. Validated against _schema.js on every read via disciplineErrors().
import { validateRegistry } from './_schema.js';

export const DISCIPLINES = [];   // filled by Tasks 4–6
const BY_ID = new Map(DISCIPLINES.map((d) => [d.id, d]));
export function getDiscipline(id) { return BY_ID.get(id) || null; }
export function disciplineErrors() { return validateRegistry(DISCIPLINES).errors; }
export default { DISCIPLINES, getDiscipline, disciplineErrors };
