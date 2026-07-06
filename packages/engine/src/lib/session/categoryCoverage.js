/**
 * categoryCoverage — Sprint 9 19b (D9 extension): plan a sport athlete's gym week as
 * COVERAGE of their SKB exercise library's categories.
 *
 * Why: the Performance-Model quality vocabulary is a deliberate fixed 10 — it cannot
 * say "upper-body pull" or "shoulder prehab", which is a swimmer's actual gym need
 * (the reason the Sprint-8 swim flip failed). The sport's exerciseLibrary already
 * encodes that need as CATEGORIES with per-movement transfer ratings; this module
 * turns them into per-session coverage assignments the selection layer can serve.
 * Approved design: docs/superpowers/specs/2026-07-04-sprint9-skb-primary-design.md
 * (Option B — the library is a requirement source; the diagnosis stays the pivot).
 *
 * PARALLEL as of 19b: nothing in generatePlan consumes this yet. WP-20 wires it into
 * the D11 branch for swim. Run/cycle deliberately stay rating-based (19a): their
 * categories agree with their diagnosed qualities, so this machinery would add risk
 * for no gain there — recorded scope decision.
 *
 * Pure + deterministic: sorts carry explicit tiebreaks; no clock, no randomness.
 */
import * as SKB from '../sportKnowledge/index.js';
import { EXERCISES } from '../../data/strengthExercises.js';
import { exerciseQualities } from '../../data/exerciseQualities.js';

const CATALOGUE_IDS = new Set(EXERCISES.map((e) => e.id));
// The library's difficulty vocabulary → the minimum athlete level that should get it.
const DIFficulty_OK = {
  'beginner-friendly': () => true,
  beginner: () => true,
  intermediate: (levelName) => levelName !== 'beginner',
  advanced: (levelName) => levelName === 'advanced',
};

const ratingOf = (e) => e.transferToSportRating ?? 5;

/**
 * Distribute a sport's library categories across the week's gym sessions.
 *
 * @param {string} skbSportId — e.g. 'swimming'
 * @param {number} sessionCount — gym sessions this week
 * @param {{levelName?: string, season?: string|null}} opts
 * @returns {null | { sessions: Array<{categories: string[], exerciseIds: string[],
 *   doseQuality: string, rationale: string}>, uncovered: string[] }}
 *   null when the sport has no usable library (caller keeps its current planning).
 */
export function weekCategoryPlan(skbSportId, sessionCount, { levelName = 'intermediate', season = null } = {}) {
  const lib = skbSportId ? SKB.section(skbSportId, 'exerciseLibrary') : null;
  if (!lib || !Array.isArray(lib.exercises) || !lib.exercises.length) return null;
  const n = Math.max(1, sessionCount || 1);

  // Usable movements: joined to the catalogue, level-appropriate, season-suitable.
  const usable = lib.exercises.filter((e) => {
    if (!CATALOGUE_IDS.has(e.id)) return false;
    const ok = DIFficulty_OK[e.difficulty] || (() => true);
    if (!ok(levelName)) return false;
    if (season === 'in' && e.suitableInSeason === false) return false;
    return true;
  });
  if (!usable.length) return null;

  // Group by category; rank categories by their best transfer rating (the sport
  // scientist's judgement of what matters most), tiebreak alphabetical.
  const byCat = new Map();
  for (const e of usable) {
    const cat = e.category || 'general';
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(e);
  }
  const ranked = [...byCat.entries()]
    .map(([cat, exs]) => ({
      cat,
      exs: exs.slice().sort((a, b) => ratingOf(b) - ratingOf(a) || (a.id < b.id ? -1 : 1)),
      top: Math.max(...exs.map(ratingOf)),
    }))
    .sort((a, b) => b.top - a.top || (a.cat < b.cat ? -1 : 1));

  // Round-robin the ranked categories across sessions: the highest-value categories
  // land on distinct days first (differentiation), lower tiers fill behind them.
  const sessions = Array.from({ length: n }, () => ({ categories: [], exerciseIds: [] }));
  ranked.forEach((c, i) => {
    const s = sessions[i % n];
    s.categories.push(c.cat);
    s.exerciseIds.push(...c.exs.map((e) => e.id));
  });

  // Each session's DOSE quality (the D12 seam): the primary quality tag of its
  // HIGHEST-RATED movement — the day's main event sets the dose (a posterior-chain
  // day doses like its trap-bar HSR, not like the prehab moves that outnumber it).
  // Fallback: maxStrength.
  const ratingById = new Map(usable.map((e) => [e.id, ratingOf(e)]));
  for (const s of sessions) {
    const lead = s.exerciseIds.slice().sort((a, b) => (ratingById.get(b) || 0) - (ratingById.get(a) || 0) || (a < b ? -1 : 1))[0];
    const primary = lead ? (exerciseQualities(lead)?.qualities || []).find((q) => q.role === 'primary') : null;
    s.doseQuality = primary ? primary.id : 'maxStrength';
    s.rationale = `covers ${s.categories.join(' + ')} from the ${skbSportId} library; dosed as ${s.doseQuality} (led by ${lead})`;
  }

  const covered = new Set(sessions.flatMap((s) => s.categories));
  const uncovered = (lib.categories || []).filter((c) => !covered.has(c));
  return { sessions, uncovered };
}

// Sports whose gym week is CATEGORY-LED (the quality diagnosis cannot express their
// needs — swim's upper-pull, the invasion sports' rotational power / change-of-direction /
// prevention work; flipped per sport: swim WP-20, the team sports WP-48 on Simon's
// 2026-07-06 direction). Run/cycle stay rating-based (their categories agree with their
// diagnosed qualities — recorded 19b scope decision).
const CATEGORY_LED = new Set(['swimming', 'hurling', 'gaelic_football', 'field_hockey', 'soccer', 'rugby']);

/** The category plan for a sport IF it is category-led; null otherwise. */
export function categoryPlanFor(skbSportId, sessionCount, opts = {}) {
  if (!skbSportId || !CATEGORY_LED.has(skbSportId)) return null;
  return weekCategoryPlan(skbSportId, sessionCount, opts);
}

export default { weekCategoryPlan, categoryPlanFor };
