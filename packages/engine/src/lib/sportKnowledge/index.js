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
import runningSprint from '../../data/sport-knowledge/running_sprint.json' with { type: 'json' };
import runningMiddle from '../../data/sport-knowledge/running_middle.json' with { type: 'json' };
import runningLong from '../../data/sport-knowledge/running_long.json' with { type: 'json' };
import cycling from '../../data/sport-knowledge/cycling.json' with { type: 'json' };
import swimming from '../../data/sport-knowledge/swimming.json' with { type: 'json' };
import triathlon from '../../data/sport-knowledge/triathlon.json' with { type: 'json' };

import { validateRegistry, SECTIONS } from './schema.js';

const PROFILES = [gaelicFootball, hurling, rugby, soccer, runningSprint, runningMiddle, runningLong, cycling, swimming, triathlon];
const BY_ID = new Map(PROFILES.map(p => [p.id, p]));

export function get(id) { return BY_ID.get(id); }
export function has(id) { return BY_ID.has(id); }
export function all() { return PROFILES.slice(); }
export function ids() { return PROFILES.map(p => p.id); }

// Map a legacy short sport id (used by onboarding / saved profiles) to its canonical SKB
// profile id, so engine code can look a sport up consistently (e.g. 'swim' → 'swimming').
// NOTE: 'run' is NOT aliased here — running splits by discipline (running_sprint/middle/
// long) and must resolve through skbSportIdFor below. (The old 'run' → 'running' alias
// pointed at a profile that does not exist, which silently dropped every discipline-less
// runner off the diagnosis path.)
const ID_ALIASES = { swim: 'swimming', cycle: 'cycling' };
export function normalizeSportId(id) { if (!id) return null; return ID_ALIASES[id] || id; }

/**
 * The ONE derivation from an engine sport id (profile.sport) + run discipline to the SKB
 * profile that knows it. A runner who never stated a discipline gets running_middle — the
 * generic runner prior (deliberate default, 2026-07-04): the D4/D5 diagnosis must never
 * silently vanish because one optional answer is missing. Every caller (the athlete-model
 * adapter, the reflow decision rules) resolves through here so the mapping cannot drift.
 */
export function skbSportIdFor(sport, runDiscipline) {
  if (!sport) return null;
  if (sport === 'run') return `running_${runDiscipline || 'middle'}`;
  return normalizeSportId(sport) || sport;
}

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
  'kpiFramework.kpis':         (v) => (v || []).length >= 8
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

export default { get, has, all, ids, section, validate, completeness, normalizeSportId };
