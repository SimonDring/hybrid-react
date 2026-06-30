# Sport Knowledge Base (SKB) — schema, authoring & policy

> **What this is:** a reusable, evidence-tagged per-sport knowledge base — the closest
> digital equivalent we can build of what an elite Head of Performance knows about a sport,
> in a shape a deterministic engine (and a future AI layer / coach dashboard) can consume.
> **The sport is the priority; the gym exists only to serve it.** Adding a sport requires
> **zero engine code** — just a new JSON profile + one line in the registry.

## Where it lives

```
packages/engine/src/data/sport-knowledge/*.json   # the knowledge base (pure data)
packages/engine/src/lib/sportKnowledge/
  schema.js    # the SportProfile contract: validateSportProfile / validateRegistry / RAW_VITALS / SECTIONS
  index.js     # the accessor: get / has / all / ids / section / validate / completeness
```

Consume it via the engine barrel: `import { sportKnowledge } from '@performance-os/engine'`
(or the deep path `@performance-os/engine/lib/sportKnowledge/index.js`).

This sits **alongside**, and is distinct from, two existing layers:
- `src/lib/sports/*.js` — the thin **gym-biasing** modules the engine already consumes
  (`emphasis`, `priorityExercises`, `periodization`). The SKB is the richer SME layer; a
  future pass may have those modules *derive* their values from the SKB. **Not merged yet.**
- `src/lib/knowledge/` — the engine-wide evidence registry. The SKB reuses its
  provenance discipline (`confidence` / `evidenceLevel` / `source`).

## The 21 sections

Every profile declares all 21 top-level sections (see `SECTIONS` in `schema.js`): `meta`,
`physicalProfile`, `energySystems`, `movementProfile`, `injuryProfile`, `positions`,
`assessments`, `developmentPriorities`, `seasonalModel`, `microcycles`, `gymPhilosophy`,
`exerciseLibrary`, `injuryPreventionLibrary`, `decisionRules`, `loadManagement`,
`readinessModel`, `coachDashboard`, `athleteDashboard`, `validation`, `references`,
`kpiFramework` (KPI classification + ≤8 athlete / ≤15 coach dashboards + weighted
performance score + gamification).

See `gaelic_football.json`, `hurling.json`, `swimming.json`, `cycling.json` and
`triathlon.json` as the **fully-authored reference profiles** (two team sports + three
individual endurance sports — proof the same schema flexes across very different sports,
e.g. swimming's "positions" are event/stroke archetypes, cycling's are discipline
archetypes — climber / sprinter / TT / track — and triathlon's are distance archetypes
(Sprint / Olympic / 70.3 / Ironman) for one unified multi-discipline profile — each
elevating its own sport-specific readiness input: shoulder soreness for swimming, leg/knee
soreness for cycling, lower-limb (run) soreness for triathlon).

## Evidence policy (non-negotiable)

Every *authored* recommendation carries provenance: `confidence` (high/moderate/low),
`evidenceLevel` (`L1` meta/systematic review … `L5` expert opinion) and a `source` string.

- Cite **real** consensus statements / reviews only where confident (IOC load-monitoring
  consensus, Gabbett ACWR + Impellizzeri/Lolli critiques, Malone GAA workload, FIFA 11+,
  Nordic hamstring trials, Harøy adductor RCT, Saw subjective-wellness review, etc.).
- **Never fabricate** DOIs, page numbers or studies. Where evidence is thin, label it
  **expert consensus** and tag `confidence:'low'` / `evidenceLevel:'L5'`.
- Contested science (e.g. exact ACWR thresholds) is tagged `low` so the engine — and any
  future AI layer — treats it as a *soft* input, not a hard rule. Honesty over false
  precision: see each profile's `validation` section.

## Privacy is enforced, not just documented

The binding rule from `docs/product/TEAM-ARCHITECTURE.md` / root `CLAUDE.md` ("TEAM DATA
ISOLATION"): **a coach/team surface never exposes raw vitals** (HRV, sleep, resting HR…).
Those roll *up* into a derived readiness/load signal the coach *can* see.

`schema.js` encodes this: `RAW_VITALS` lists the private metrics, and
`validateSportProfile` **fails** if any KPI whose `metric` is a raw vital is flagged
`coachDashboard:true` or `teamDashboard:true`. Raw-vital KPIs may be `athleteDashboard:true`
only. (The flagship profiles include private HRV/sleep/RHR KPIs that correctly stay
athlete-only — and a test fixture proves the validator rejects a coach-visible one.)

## Adding or extending a sport

1. Add `packages/engine/src/data/sport-knowledge/<sport>.json` (copy a stub or a flagship).
2. Import it + add to the `PROFILES` array in `sportKnowledge/index.js`.
3. Run `node apps/mobile/tests/sport-knowledge.js` — it must validate.

A **stub** is structurally valid (all sections present, energy %s sum ~100, empty arrays
allowed) but reports a low `completeness()` score. Fill the empty sections to promote it to
a full profile. `rugby/soccer/running.json` are the current scaffolds.

`completeness(id)` (modelled on `kb.staleEntries`) returns `{ score, complete, thin[] }` —
a report, not a pass/fail — so scaffolds are honestly flagged without failing CI.

## Status

- **Built (2026-06-28):** the schema/validator/accessor; **Gaelic football**, **hurling**
  and **swimming** fully authored (the two GAA codes are modelled as *separate* sports —
  hurling carries the striking / grip / rotational-power demands football lacks; swimming
  proves the schema flexes to an individual endurance sport).
- **Added (2026-06-29):** **cycling** fully authored — a second individual endurance sport,
  modelled by *discipline* (climber / sprinter / TT / track / criterium), elevating leg/knee
  soreness as its sport-specific readiness input and carrying a power-to-weight (FTP W/kg)
  KPI; the gym serves the evidence-based strength→economy gain (Rønnestad/Sunde/Aagaard).
- **Added (2026-06-30):** **triathlon** fully authored — a unified multi-discipline endurance
  profile modelled by *distance* (Sprint / Olympic / 70.3 / Ironman / draft-legal), elevating
  lower-limb (run) soreness as its readiness input (the run is the highest-injury discipline),
  carrying a run-off-the-bike `brick_decoupling` KPI and building RED-S / energy availability
  in as the highest-severity risk; strength is sequenced for economy + durability without
  added mass (concurrent-training interference). Three conformant stubs remain (rugby, soccer,
  running). Additive only — **no plan-generation rewiring**; nothing in the app consumes it yet.
- **Next:** author the remaining stubs to depth; wire `decisionRules` / `readinessModel` /
  `loadManagement` into `PlanService` reflow + the future coach dashboard; reconcile the
  thin `src/lib/sports/*.js` modules to derive from the SKB.

## Verification

```
node apps/mobile/tests/sport-knowledge.js   # SKB contract + privacy + flagship completeness
node apps/mobile/tests/sports.js            # existing gym-biasing sport layer (regression)
node apps/mobile/tests/knowledge.js         # evidence KB (regression)
```
