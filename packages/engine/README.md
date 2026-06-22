# @performance-os/engine (placeholder)

Reserved slot for the training **engine**, split into:

- `decisionEngine/` — the deterministic plan generator.
- `programmingLogic/` — periodisation / allocation / scheduling.
- `recommendationLogic/` — readiness / load / deload recommendations.

**Empty for now — by design.** The engine currently lives in
`apps/mobile/src/lib/` (`PlanGenerator.js`, `strength/`, `plan/`, etc.) and is *not*
extracted in this restructure. This folder reserves the slot so the engine can be
lifted out into a standalone package later without another reshuffle.
