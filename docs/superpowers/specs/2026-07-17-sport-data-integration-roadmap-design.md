# Sport-data integration roadmap: aerobic + match-day → S&C output (2026-07-17)

**Goal.** Pull aerobic training (Strava) and live pitch/sports data (GPS: top speed,
distance covered) into the athlete's picture, let that picture influence **loading** and
**form**, and — for pitch sports — schedule **heavy gym days relative to match days**.
The app stays an S&C-only *output*, but that output reacts to the whole training load.
When AI goes live it reasons over the full picture (gym + pitch), never replacing the
engine. This is the DAAS "second product" (the athlete model) feeding the first (the plan).

**Scope note.** This is the umbrella roadmap. Phase 1 (match-day scheduling) is the
immediate build and is specified here to execution depth; Phases 2–4 are specified to
design depth and each gets its own spec when its turn comes. This roadmap is essentially
Stage 5 (team) + DAAS S1/S6 + Stage 7 (endurance inputs) + Stage 6 (AI), and Phase 1 is
the "M6 D8 fixture→constraint" work HANDOFF already names.

## Simon's decisions (this session, 2026-07-17)

1. **Sequencing** — design the whole roadmap now; **build match-day scheduling first**
   (cheapest, highest payoff), then aerobic loading, then GPS/full ingestion, then AI.
2. **Load influence** — add a proper **fitness–fatigue ("form") model** as a new *soft*
   steer (not just deepen the existing ACWR path, not a hard dose-cut by default).
3. **GPS data** — build the **full sport/match ingestion boundary** (manual/file first,
   vendor GPS-vest adapters as a cohort arrives) — the DAAS §2.1.5 path.
4. **Match-day scheduling audience** — **team-driven** (coach fixtures) first; individuals
   later.

## Key finding — much of this already exists (finish pipes, not greenfield)

| Capability | Status today |
|---|---|
| Strava OAuth + activity sync → `workouts` table | **BUILT & LIVE** (`strava-auth-callback`, `strava-sync`) |
| Strava activities feeding training load (ACWR) | **BUILT** — crude `duration × 3` proxy (`trainingLoad.js:workoutLoad`) |
| Full GPS payload in `workouts.raw` (polyline, speed, watts, lat/lng) | **BUILT** (stored) — **nothing reads it** |
| Loading (ACWR) nudging the current week (adaptive deloads) | **BUILT** — deliberately a *soft* signal (0.85 floor, can't scale alone) |
| A "form" (fitness–fatigue / TSB) model | **ABSENT** — split today into *readiness* + *load* |
| Match-day microcycle (MD-4 heavy / MD-2 power / MD+1 recovery) | **AUTHORED in every team SKB** `microcycles` — **switched off** (default-OFF, never fed fixtures) |
| Team fixture pipeline (coach fixtures → player app) | **BUILT** (`applyTeamSchedule`) — fixtures only clear match weekdays, never place heavy/light |
| Governing architecture (the "second ingestion boundary") | **RATIFIED** — DAAS §2.1.5, staged S1→S6 |

Parent spec for Phase 1: [`2026-07-05-team-schedule-constraints-design.md`](2026-07-05-team-schedule-constraints-design.md).
Governing doc for Phases 2–4: [`docs/architecture/DATA-ANALYTICS-ARCHITECTURE.md`](../../architecture/DATA-ANALYTICS-ARCHITECTURE.md).

## Governance guardrails (bind every phase)

- Engine stays **pure** — no clock/IO/randomness in `packages/engine` plan generation;
  external data enters as computed **arguments**; dates from `plan_start_date` as `asOf` (Art 18).
- **Raw vitals never cross a person boundary** — HR/HRV/sleep/GPS traces are owner-only;
  coaches see only derived readiness/load/availability (Art 11; the `player_status` lineage).
- **A signal influences the plan only as hard as its data quality earns** (DAAS §4.2
  propagation rule; Art 13): wrist-optical HR, an opaque vendor "load score", or a
  contested model → *soft input* at most, never a *gate*.
- **Additive-first** — byte-identical for athletes a change doesn't apply to, proven by the
  `prop-*` suite; golden-master moves are deliberate, scoped, audited (`UPDATE=1` +
  `EXPECTED-DELTA.md`).
- **Knowledge is data, not code** — thresholds/patterns/weights live in governed knowledge
  (`entries.js` + `KNOWLEDGE_SET_VERSION`), never literals.

---

## Phase 1 — Match-day-aware scheduling (team-driven) · BUILD FIRST

**Goal.** For a pitch-sport player on a team, position gym days around fixtures: heavy far
from the match (MD-4/MD-3), power/priming close (MD-2), recovery after (MD+1), no heavy
lifting on MD-1/MD/MD+1 — using the microcycle logic already authored in each team SKB and
the fixture pipeline already built.

**Where it computes — the baseline generator, NOT the runtime reflow.** Fixtures are known
and deterministic from `plan_start_date`, so MD shaping is baseline material (same class as
season phasing / event tapers). `reflowAdjust.js:11-22` documents the "double-count trap"
(a past defect where the reflow re-applied a season trim on top of a baseline that already
periodised) and names `matches_this_week` as a signal to move into `REFLOW_EXCLUDED_SIGNALS`
"once baseline owns it." This phase is that work.

**Design (placement/spacing only — the volume-cut question is deferred, see open calls):**

1. **Fixtures → engine inputs (pure).** Extend `applyTeamSchedule`
   (`packages/engine/src/lib/plan/teamSchedule.js:77`) to additively stamp `team_fixtures`
   (upcoming match fixtures as `{dateISO, weekdayIdx}`) and `team_match_weekday` (recurring
   match weekday, fallback anchor) — keeping the same-reference-when-nothing-changes
   discipline so non-team athletes are untouched.
2. **New pure helper** `packages/engine/src/lib/microcycle/fixtureWeeks.js` —
   `mdMapForWeek({fixtures, matchWeekday, planStartDate, weekNum})` → `{matchesThisWeek,
   mdOffsetByWeekday}`: for each weekday in the plan week, signed day-distance to the
   nearest match date (integer ISO-date arithmetic, no clock). Falls back to the recurring
   weekday; `null` density when neither exists (→ byte-identical no-reshape path).
3. **Consume the already-authored logic.** In the per-week loop (`PlanGenerator.js:250-264`),
   when the flag is ON and the profile carries fixtures, call the existing
   `deriveWeeklyObjective({blockObjective, microcycles, matchesThisWeek})`
   (`packages/engine/src/lib/microcycle/weeklyObjective.js:39`) → it selects the density
   bucket and returns `spacingConstraints`. Translate its MD labels
   (`avoidHeavyLiftingDays`, `preferExplosiveWorkDays`, `heavyDay/powerDay/recoveryDay`)
   into concrete weekday-index sets via `mdOffsetByWeekday`.
4. **Scheduler penalties.** Give `scheduleWeek` (`packages/engine/src/lib/plan/scheduler.js`)
   an optional `mdConstraints` arg (default `null` → inert). Add **governed** penalty
   weights to `packages/engine/src/data/schedulingPolicy.js` (an `md` block) consumed in
   `score()`: (i) heavy/high-axial on an avoid-heavy day → large penalty; (ii) power/plyo
   off a preferred day → moderate; (iii) heavy off the MD-4/MD-3 target → moderate. Session
   hardness reuses existing signals (`isHard && isHighAxial`, `isPlyoLoaded`,
   `s._objective?.quality`). Weight **below** the muscle-spacing lever so MD shaping refines
   placement without overriding recovery spacing — soft penalties, never vetoes.
5. **Kill the double-count.** Add `'matches_this_week'` to `REFLOW_EXCLUDED_SIGNALS`
   (`reflowAdjust.js:23`).

**Flag & safe flip** (mirror the `forceVelocityAware` precedent):
- Add `opts.fixtureMicrocycle` (default **OFF**) to `generatePlan`. OFF → every golden
  byte-identical except the KSV stamp bump (stamp-only re-baseline + `EXPECTED-DELTA.md`).
- Additive-identity holds even ON: no fixtures → `fixtureAware:false` → no `mdConstraints`
  → byte-identical. `prop-additive-identity` / `prop-purity` / `prop-determinism` stay green.
- **Flip PR (separate, audited):** add a **fixture-bearing team-sport archetype** to
  `golden-master.js` (none exist), re-baseline **only that key**; `PlanService` passes
  `{fixtureMicrocycle:true}` + adds `team_fixtures` to `profileSignature` (so a fixture
  change busts the plan memo). `prop-reflow-baseline` stays hard-green (proves no fixture
  signal leaks into the reflow).

**Files:** `teamSchedule.js`, new `microcycle/fixtureWeeks.js`, `schedulingPolicy.js` +
`knowledge/entries.js` (KSV), `scheduler.js`, `PlanGenerator.js`, `reflowAdjust.js`; then
(flip) `PlanService.js`, `golden-master.js`, `team-schedule.js`.

**Verify:** engine `prop-*` (esp. `prop-reflow-baseline`) + `weekly-objective-contract`;
`apps/mobile/tests/{golden-master,team-schedule,scheduler-recovery,plyo-spacing,axial-schedule}.js`;
eyeball a fixture-bearing soccer plan on `/dev` (needs a small dev-harness preset that
routes a `teams.schedule` through `applyTeamSchedule` + the flag — `DevPlayground` doesn't
exercise fixtures today).

---

## Phase 2 — Aerobic loading + a fitness–fatigue ("form") model

**Goal.** Turn Strava/aerobic data from a crude proxy into a real signal, and give the
athlete a **form** model (fitness vs fatigue) that softly steers the gym plan.

**2a — Real aerobic load.** Replace the `duration × 3` proxy in `trainingLoad.js`
(`workoutLoad`) with HR/pace-derived load mined from `workouts.raw` (Strava already stores
HR streams, `average_speed`, `distance_m`). Flows through the existing `dailyLoads →
acuteChronic → acwr → assessLoad` path, so aerobic sessions count honestly toward ACWR.

**2b — The form model (a new, governed soft steer).** Add a fitness–fatigue (Banister
impulse-response / CTL-ATL-TSB analog): chronic load = *fitness*, acute load = *fatigue*,
their balance = *form*.
- A new **analytical product** under the DAAS (§2.3.1 recovery/load family), owned by a D17
  member, validated by the §8 contract (attribution, confidence honesty, authority).
- Parameters (time constants, weights) are **governed knowledge** (new `load.form.*`
  entries, cited + confidence-tagged). Contested-adjacent ⇒ capped at **soft input** (Art 13).
- **Plug-in points** (verified): (i) an external-aerobic contributor + form readout in
  `indices/trainingLoadIndex.js`; (ii) a corroborating term in `deloadRecommendation`
  (`trainingLoad.js`) so sustained negative form strengthens a deload case; (iii) optionally
  into **D9's fatigue budget** (`sessionObjective.js` → `selectInterventions`) so a hard
  run/ride the day before shrinks that day's lifting dose. Introduce the honest typed seam
  parallel to `adaptWearableReading` for load readings.
- Render in plain language via `verdicts.js`.

**Recommendation:** stand up a **minimal Metric Dictionary** (DAAS S1) as part of 2a —
"everything keys on it; retrofitting semantics later is the expensive path" (DAAS §9). Makes
Phase 3 an extension, not a rewrite.

*(Own spec when it starts — new coaching model + new knowledge + validators.)*

---

## Phase 3 — Full sport & match ingestion boundary (DAAS §2.1.5)

**Goal.** The proper long-term intake for pitch/match data: minutes, availability, GPS (top
speed, distance covered, sprint counts), pitch-session RPE.

- Build the **Sport & Match ingestion boundary** on the proven wearable-ACL pattern: per-
  source adapters → normalise into Metric Dictionary metrics → provenance + reliability
  tags. **Schema source-agnostic from day one.**
- Data classes: **External Load Observation** (GPS/accel, distances, sprints, pitch RPE) and
  **Match Performance** (minutes, availability status, output KPIs).
- **Staging (DAAS):** manual/file logging first (a minutes + RPE entry is a valid, honest
  observation), then vendor GPS-vest adapters (Garmin/Catapult/StatSports) as an
  instrumented cohort arrives (D-1 defers vendor GPS until then).
- Land in the **live M5 append-only owner-private substrate**, not the legacy profile blob.
- **Privacy:** external-load observations are athlete-owned; coach visibility is
  derived-roll-up-only by consented grant (Arts 11/22).
- Richer inputs feed **back into** Phase 2's form model and Phase 1's density signal (real
  minutes/GPS load per fixture, not just a count).

*(Own spec when it starts — ingestion boundary + Metric Dictionary entries + RLS proofs.)*

---

## Phase 4 — AI full-picture (Stage 6 / AIGAS) · LAST, because it depends on 1–3

**Goal.** AI draws conclusions from the whole picture (gym + pitch + aerobic) — after
Phases 1–3 have put that data into the athlete record.

- AI reads the enumerated **C5 grounding surface** (DAAS §2.3.4): the athlete's own
  observations (incl. pitch/match/aerobic), materialised derivation history, served
  insights, plan/decision traces, and knowledge. Coach-scoped AI sees only derived
  team-scoped surfaces — never member raw vitals.
- AI output takes **exactly three routes** (DAAS §2.4 / AIGAS): advisory-to-human, staged-
  validated-priors (Seam 2), user-confirmed structured state (C1). Never gates, never
  replaces the engine or the human, never holds a browser key (server-side `ai-render` only).
- **Gated on Simon:** the AI seam is merged behind flags (`AI_ENABLED` OFF); go-live needs a
  per-capability eval harness + edge-function deploy + Simon's decision (open queue #3). AI
  is *last* not just deferred — it is **downstream** of the data Phases 1–3 create.

---

## Simon's coaching-philosophy calls (flagged, not assumed)

- **Congested-week volume cut** (2-match / tournament → the authored `reduce_volume_pct 50`):
  Phase 1 ships **placement only**; the cut risks double-counting with the in-season
  maintenance dose. Defer, or reconcile with a governed knob.
- **Sentinel-token semantics** in congested microcycles (`"all"`, `"none"`, `"match-day
  priming only"`) → concrete scheduler behaviour.
- **MD-penalty weights** vs muscle-spacing/sport-proximity levers (governed, but the ordinal
  ordering is a coaching judgement).
- **How hard aerobic fatigue may shrink lifting dose** (Phase 2 D9 fatigue-budget wiring),
  and where the form model sits on the soft-input spectrum.
- **`chooseDays` fixture-awareness** (choose MD-4/MD-2 as gym days, not just order within
  existing days) — larger golden movement; recommend deferring past Phase 1.

## Verification (whole roadmap)

Each phase ends green on `npm test` + engine `prop-*` + `npm run lint`, `npm run dev` still
running, change eyeballed on `/dev` or the relevant screen. Golden-master moves scoped,
audited key-by-key, paired with `EXPECTED-DELTA.md`. No frozen doc edited; new coaching
models/knowledge enter as governed, versioned data.
