/**
 * VERDICTS — the single source of truth for the product's decision vocabulary on
 * the marketing site, kept deliberately in sync with the real surfaces so a
 * visitor reads the SAME words on the site as they will in the app.
 *
 * Coach-facing (the dashboard squad view) mirrors:
 *   apps/web/lib/statusLogic.ts  →  Ready / Monitor / Adjust / No data
 * Player-facing (the athlete's daily call) mirrors:
 *   apps/mobile/src/lib/verdicts.js  →  Primed / Steady / Ease in
 *
 * If either of those changes, update this file too. The marketing visuals
 * (hero decision card, /teams squad glance) import from here, never hard-code.
 */

/** What a COACH sees per player on the dashboard. */
export const COACH_VERDICT = {
  ready: "Ready",
  monitor: "Monitor",
  adjust: "Adjust",
  nodata: "No data",
} as const;

/** What a PLAYER sees as their daily readiness call in the app. */
export const PLAYER_VERDICT = {
  primed: "Primed",
  steady: "Steady",
  easeIn: "Ease in",
} as const;
