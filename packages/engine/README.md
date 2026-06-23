# @performance-os/engine (placeholder)

Reserved slot for the training **engine**, split into:

- `decisionEngine/` — the deterministic plan generator.
- `programmingLogic/` — periodisation / allocation / scheduling.
- `recommendationLogic/` — readiness / load / deload recommendations.

**Empty for now — by design.** The engine currently lives in
`apps/mobile/src/lib/` (`PlanGenerator.js`, `strength/`, `plan/`, etc.) and is *not*
extracted in this restructure. This folder reserves the slot so the engine can be
lifted out into a standalone package later without another reshuffle.

---

## When to extract

Extract when a **second consumer needs to _run_ the engine** — not for tidiness.
Today only `apps/mobile` consumes it, the core is already pure (no React / store /
Supabase / localStorage), and this slot is reserved — so the architectural benefit is
already in place. Moving it now is pure cost (workspace wiring, import churn across
~26 modules + 35 tests, making Vite/PWA resolve a workspace package) with no payoff.

Pull the trigger when **either** becomes real:

1. **A server-side AI Edge Function (Stage 6)** needs to call `generatePlan` /
   `loadDecision` / `deloadRecommendation` from Deno — a genuine second runtime. This
   is the cleanest trigger; a shared package beats importing from `apps/mobile/src`.
2. **`apps/web` (coach dashboard, Stage 5) needs to _generate or preview_ plans**
   client-side (e.g. "if I schedule this match, here's how each player's plan shifts")
   rather than only reading the derived `player_status` from Supabase.

**Nuance:** as blueprinted in `HANDOFF.md`, Stage 5 feeds the team schedule as
constraints into `scheduler.js` / `PlanService` on the **player** side, and the coach
reads a **derived** status surface — that path does **not** require extraction. The
trigger is the literal moment `apps/web` or an Edge Function wants
`import { generatePlan }`.

## Prerequisite — the clean boundary

The pure core is ready to lift as-is: `PlanGenerator.js` (`generatePlan`), `strength/`
(program, targets, exerciseLoad), `plan/` (allocator, scheduler, split, periodization,
volume, rollingVolume, trainingLoad, contributions), `injury/` rules,
`liftProgression.js`, `Utils.js`, and the engine `data/` tables. These are
framework-agnostic; the 35 `tests/*.js` already import them with relative paths and run
under plain `node`.

The one blocker is **`PlanService.js`**, which is the *app adapter* (Database + Zustand
store runtime + localStorage), not the engine. Before (or as part of) extraction, split
it into:

- a **pure reflow** function taking `profile` / `runtime` / `overrides` / `injuries`
  as arguments → moves to the engine package;
- a **thin app adapter** that reads those from `Database`, the store (`setRuntime`), and
  `sessionOverrides` → stays in `apps/mobile`.

This split is a testability win on its own and can be done independently, before any
trigger fires.

## How to extract (when the trigger fires)

1. Move the pure tree into `packages/engine/src/`: `PlanGenerator.js`, `strength/`,
   `plan/`, `injury/` rules, `liftProgression.js`, `Utils.js`, and the engine-only
   `data/` tables (`strengthExercises`, `muscleVolume`, `strengthStandards`,
   `rehabExercises`, `injuryTaxonomy`; keep UI-only tables like `exerciseDemos`,
   `activityTypes` in the app unless the engine needs them).
2. Add a package entry point (`package.json` `"main"`/`"exports"` + an `index.js`
   re-exporting `generatePlan` and the pure helpers). Keep ESM (`"type": "module"`).
3. Rewrite the engine's internal imports to stay relative within the package; update
   `apps/mobile` consumers (`PlanService.js`, `DevPlayground.jsx`) to import from
   `@performance-os/engine`.
4. Repoint the 35 `tests/*.js` (decide: keep in `apps/mobile/tests` importing the
   package, or move alongside the engine).
5. Verify Vite/PWA resolves the workspace package in the `apps/mobile` build, and the
   GitHub Pages base path `/hybrid-react/` is unaffected.
