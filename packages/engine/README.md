# @performance-os/engine

The deterministic training **engine**, extracted from `apps/mobile` (2026-06-23) so a
second runtime — a future AI Edge Function, or `apps/web` plan previews — can run it
without importing from the app.

## What's here

Pure, framework-agnostic logic (no React / store / Supabase / localStorage):

- `src/lib/PlanGenerator.js` — `generatePlan(profile)`, the deterministic plan.
- `src/lib/strength/` — goal → program, volume targets, exercise load.
- `src/lib/plan/` — allocator, scheduler, split, periodisation, volume, rolling volume,
  training load (ACWR), contributions.
- `src/lib/sports/` — pluggable `SportModule` registry.
- `src/lib/injury/` — data-driven `InjuryProfile` registry + contraindication rules.
- `src/lib/recovery/`, `src/lib/load/` — `RecoveryOutput` / `LoadOutput` contracts.
- `src/lib/knowledge/` — the evidence knowledge base (every constant + its provenance).
- `src/lib/{Readiness,liftProgression,Utils}.js`.
- `src/data/` — the engine's data tables (`strengthExercises`, `muscleVolume`,
  `rehabExercises`, `injuryTaxonomy`).

## Using it

```js
import { generatePlan } from '@performance-os/engine';            // headline API (index.js barrel)
import { weeklyMuscleTargets } from '@performance-os/engine/lib/strength/targets.js'; // deep modules
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
```

The barrel (`index.js`) surfaces the headline API; everything stays reachable via the
`./lib/*` and `./data/*` subpath exports (see `package.json`). ESM only (`"type": "module"`).

## The app boundary

`apps/mobile/src/lib/PlanService.js` is the **thin app adapter** — it feeds
`Database` / the Zustand store runtime / `sessionOverrides` into these pure functions.
It stays in the app. (Splitting its current-week reflow into a pure engine function +
adapter is a clean future improvement, not required for this extraction.)

## Tests

The engine's tests live in `apps/mobile/tests/` and import this package; run them with
`node apps/mobile/tests/*.js` (per file). `golden-master.js` pins `generatePlan` output
byte-for-byte, so engine changes here are caught immediately.
