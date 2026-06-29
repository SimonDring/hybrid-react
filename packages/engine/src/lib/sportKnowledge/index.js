/**
 * Sport Knowledge Base — the read interface over the SportProfile registry.
 *
 * Each sport is a pure-JSON profile in ../../data/sport-knowledge/. The engine (and any
 * future AI layer / coach dashboard) consumes profiles through this accessor; it never
 * imports a JSON file directly, so adding a sport is one import + one array entry here.
 *
 * `get(id)` returns undefined for an unknown sport — like the sport registry, an unknown
 * id is a legitimate runtime case (caller falls back to generic handling), not a typo.
 *
 * JSON is loaded with import attributes (`with { type: 'json' }`) — supported by Node 20.10+
 * (the test runtime is Node 26) and modern Vite (the app build). If a build ever rejects
 * the attribute, drop it (Vite imports .json natively) and load via fs in the node test.
 */
import gaelicFootball from '../../data/sport-knowledge/gaelic_football.json' with { type: 'json' };
import hurling from '../../data/sport-knowledge/hurling.json' with { type: 'json' };
import rugby from '../../data/sport-knowledge/rugby.json' with { type: 'json' };
import soccer from '../../data/sport-knowledge/soccer.json' with { type: 'json' };
import running from '../../data/sport-knowledge/running.json' with { type: 'json' };
import cycling from '../../data/sport-knowledge/cycling.json' with { type: 'json' };
import swimming from '../../data/sport-knowledge/swimming.json' with { type: 'json' };

import { validateRegistry, SECTIONS } from './schema.js';

const PROFILES = [gaelicFootball, hurling, rugby, soccer, running, cycling, swimming];
const BY_ID = new Map(PROFILES.map(p => [p.id, p]));

export function get(id) { return BY_ID.get(id); }
export function has(id) { return BY_ID.has(id); }
export function all() { return PROFILES.slice(); }
export function ids() { return PROFILES.map(p => p.id); }

/** One section of a profile (e.g. section('hurling', 'positions')). Undefined if missing. */
export function section(id, name) {
  const p = BY_ID.get(id);
  return p ? p[name] : undefined;
}

/** Validate every registered profile against the SportProfile contract. */
export function validate() { return validateRegistry(PROFILES); }

// Sections whose richness signals "authored, not scaffold" — the content-bearing ones.
// (meta/energySystems/gymPhilosophy etc. are present even in a stub, so they don't count.)
const RICH = {
  'physicalProfile.qualities': (v) => Object.keys(v || {}).length >= 12,
  'positions':                 (v) => (v || []).length >= 3,
  'assessments':               (v) => (v || []).length >= 4,
  'injuryProfile.common':      (v) => (v || []).length >= 3,
  'exerciseLibrary.exercises': (v) => (v || []).length >= 8,
  'injuryPreventionLibrary':   (v) => (v || []).length >= 2,
  'decisionRules':             (v) => (v || []).length >= 6,
  'references':                (v) => (v || []).length >= 6,
  'kpiFramework.kpis':         (v) => (v || []).length >= 8,
  'gymProgramming':            (v) => !!v && !!v.emphasis && Array.isArray(v.priorityExercises) && v.priorityExercises.length > 0
};

function dig(p, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), p);
}

/**
 * How fully a profile is authored. score 0..1 (fraction of RICH sections that meet the
 * bar) + the list of still-thin sections. Modelled on kb.staleEntries — a report, not a
 * pass/fail (a scaffold is a low score, not an error).
 */
export function completeness(id) {
  const p = BY_ID.get(id);
  if (!p) return { id, score: 0, complete: false, thin: SECTIONS.slice() };
  const keys = Object.keys(RICH);
  const thin = keys.filter(k => !RICH[k](dig(p, k)));
  const score = (keys.length - thin.length) / keys.length;
  return { id, score, complete: thin.length === 0, thin };
}

const ID_ALIASES = { swim: 'swimming', run: 'running', cycle: 'cycling' };
export function normalizeSportId(id) { if (!id) return null; return ID_ALIASES[id] || id; }
export function selectable() { return PROFILES.filter(p => completeness(p.id).complete); }
export function gymProgrammingFor(id) { const p = BY_ID.get(normalizeSportId(id)); return p ? p.gymProgramming || null : null; }

export default { get, has, all, ids, section, validate, completeness, normalizeSportId, selectable, gymProgrammingFor };
