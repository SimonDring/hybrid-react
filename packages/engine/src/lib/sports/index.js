// src/lib/sports/index.js
/**
 * Sport registry — the single place that lists the available sports. The core engine
 * (resolveProgram / resolvePeriodization) looks sports up here; it never imports a
 * specific sport. Adding a sport = import its module and add it to MODULES below.
 *
 * `get(id)` returns undefined for an unknown sport (callers fall back to generic
 * sport defaults) — unlike the knowledge base, an unknown sport id is a legitimate
 * runtime case, not a code typo.
 */
import { running } from './running.js';
import { cycling } from './cycling.js';
import { swimming } from './swimming.js';
import { rugby } from './rugby.js';
import { soccer } from './soccer.js';
import { gaa } from './gaa.js';
import { validateRegistry } from './_schema.js';

// Order is irrelevant to behaviour; alphabetical-ish by introduction.
const MODULES = [running, cycling, swimming, rugby, soccer, gaa];

const BY_ID = new Map(MODULES.map(m => [m.id, m]));

export function get(id) { return BY_ID.get(id); }
export function has(id) { return BY_ID.has(id); }
export function all() { return MODULES.slice(); }
export function ids() { return MODULES.map(m => m.id); }

/** Validate every registered module against the SportModule contract. */
export function validate() { return validateRegistry(MODULES); }

export default { get, has, all, ids, validate };
