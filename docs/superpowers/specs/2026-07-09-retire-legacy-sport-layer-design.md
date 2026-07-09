# Retire the legacy sport layer + season-window detection — design spec (2026-07-09)

> **Status:** approved design (brainstormed with Simon 2026-07-09). Continues the season-phased SKB work
> on branch `season-phased-skb-2026-07-09`. Not for main until reviewed.
>
> **Goal:** make the SKB the single source for ALL sport programming so the legacy `sportGymSupport/`
> layer becomes redundant and is deleted; bring the 5 team/field sports onto the season-phased standard;
> and detect an athlete's season phase from their competitive-season window (first/last game).

## 0. Why

The 8-file `sportGymSupport/` layer still feeds the engine six things (`emphasis`, `priorityExercises`,
`power`, `systemicFactor`, `seasonModifiers`, `periodization` block templates) + `keyMuscles`. Only
per-phase emphasis is on the SKB so far (6 endurance sports). To delete the legacy layer and finish the
Approach-A wire, every one of those must come from the SKB for all 11 sports. And team-sport athletes need
their phase derived from a season *window*, not a single event.

## 1. The four phases

| Phase | What | Behaviour change? |
|---|---|---|
| **P1** | Relocate legacy data verbatim into a new SKB `gymSupport` section; rewire the 4 consumers to read it; delete the legacy modules | **None** — byte-identical (golden-master unchanged) |
| **P2** | Derive `priorityExercises` from each sport's `exerciseLibrary`; drop the relocated lists | Yes — intentional, per-sport golden-master re-baseline |
| **P3** | Season-phase the 5 team/field sports (`programming` blocks + round-out) | Yes — off-season fixtures for those sports |
| **P4** | Season-window `deriveSeason` (first/last game) + onboarding dates | Yes — season-based athletes get window-derived phases |

Each phase is its own commit-group behind the golden-master.

## 2. P1 — the SKB `gymSupport` section (byte-identical relocation)

Add one sport-level section to every SKB profile, copied VERBATIM from the sport's legacy module (running
disciplines take their `byDiscipline[disc]` values — each running discipline is already its own SKB profile,
so no `byDiscipline` nesting is needed in the SKB):

```jsonc
"gymSupport": {
  "emphasis": { "quads":1.15, "hamstrings":1.30, ... },   // season-INVARIANT fallback (= legacy emphasis)
  "power": true,
  "systemicFactor": 0.90,
  "keyMuscles": ["hamstrings","glutes","calves","quads"],
  "priorityExercises": ["nordic_curl","split_squat", ...],// TEMPORARY — P2 derives + deletes this
  "seasonVolume": { "off":0.90, "pre":0.85, "in":0.60, "transition":0.70 },
  "periodization": {                                       // block templates per season
    "off": { "totalWeeks":12, "split":[{"intent":"base","weeks":5},{"intent":"build","weeks":7}], "deloads":[5,10] },
    "pre": { ... }, "in": { ... }, "transition": { ... }
  }
}
```

**Emphasis resolution after P1** (one rule, replaces the legacy fallback): a phase's emphasis =
`seasonalModel[phase].programming.muscleEmphasis` if present, else `gymSupport.emphasis`. So the migrated
endurance sports keep their per-phase emphasis; every sport has a season-invariant fallback for uncovered phases.

**Consumers rewired to read the SKB (legacy fallback removed at the end of P1):**
- `strength/program.js` (resolveProgram) — emphasis, priorityExercises, power.
- `strength/sportLoad.js` — `gymSupport.seasonVolume`, `gymSupport.systemicFactor`.
- `plan/periodization.js` (resolvePeriodization) — `gymSupport.periodization[phase]`.
- `plan/constraints.js` — `gymSupport.keyMuscles`.

All read via a small accessor `gymSupportFor(profile)` (mirrors `phaseProgrammingFor`). Relocation is done by
a one-off script that imports the legacy registry + writes each profile's `gymSupport` — guaranteeing verbatim
values. **Validate byte-identical (golden-master), then delete `data/sportGymSupport/` entirely.**

**Schema:** extend `validateSportProfile` to validate `gymSupport` (emphasis numbers in range, power boolean,
systemicFactor 0.3–1.0, seasonVolume/periodization well-formed). Required once legacy is gone (every selectable
sport must have it) — but introduced as optional→required across P1 so intermediate states validate.

## 3. P2 — derive priority from `exerciseLibrary` (single source)

New pure `derivePriorityExercises(skbProfile, phase)` in `lib/sportKnowledge/`:
- Take `exerciseLibrary.exercises`, keep those that JOIN to the catalogue (`strengthExercises`), are
  phase-suitable (`suitableInSeason`/`suitableOffSeason`), rank by `transferToSportRating` (tiebreak id).
- Return the ordered ids (the ×1.35 priority list the allocator already consumes).

`resolveProgram` calls it instead of reading `gymSupport.priorityExercises`; that field is then deleted from
every profile. **Intentional change → golden-master re-baseline per sport**, with a guard test that each
sport's derived list is non-empty and leads with a high-transfer movement. This is the single-source cleanup.

## 4. P3 — season-phase the 5 team/field sports

Author `seasonalModel.{offSeason,preSeason,competition}.programming` for rugby, soccer, gaelic_football,
hurling, field_hockey — same shape as the endurance sports (off-season floors the emphasis + a round-out
session; in-season keeps the sport-specific vector; round-out targets DERIVE from each sport's emphasis).
Team-sport in-season also honours match-congestion via the existing SKB `decisionRules` (unchanged). Per-sport
golden-master re-baseline (off-season fixtures).

## 5. P4 — season-window `deriveSeason`

Extend `deriveSeason(profile, asOf)` with a **window mode** when `first_game_date` + `last_game_date` are set:
- `in` (competition): `firstGame ≤ today ≤ lastGame`
- `pre`: `firstGame − preWeeks ≤ today < firstGame`
- `transition`: `lastGame < today ≤ lastGame + transitionWeeks`
- `off`: otherwise

`preWeeks` / `transitionWeeks` come from the sport's SKB (`meta` / `seasonalModel` durations) via a helper,
defaulting to pre=6, transition=3. Precedence unchanged otherwise: explicit `sport_season` override >
window (first/last game) > single `event_date` (existing) > intent/goal default. Pure + deterministic
(anchored to `asOf`/`plan_start_date`, like the existing date logic).

**Onboarding (`apps/mobile`):**
- `onboardingModel.js`: add `firstGameDate` / `lastGameDate` answers → `first_game_date` / `last_game_date`
  profile fields (season-based sports only).
- `OnboardingWizard.jsx`: for a season-based sport (a sport whose SKB `meta.teamOrIndividual` is `team`, or a
  new `seasonBased` flag), the "when do you compete" step asks **first game + last game** instead of the single
  in/off toggle. Endurance/single-event sports keep today's `eventDate` field.
- Golden-master fixtures: add a team-sport fixture that exercises the window (first/last game offsets).

## 6. Testing & validation

- **P1:** golden-master byte-identical after relocation (the safety gate for deletion); schema tests for
  `gymSupport`; a test that `gymSupportFor` returns each sport's values; suite green after deleting legacy.
- **P2:** `derivePriorityExercises` unit tests (non-empty, ordered by rating, phase-filtered); per-sport
  golden-master re-baseline reviewed.
- **P3:** per-sport season property tests (off-season round-out present + sport-derived; in-season narrow) —
  extend `season-endurance.js` pattern to a `season-team.js`.
- **P4:** `deriveSeason` window-mode unit tests (each phase boundary, off/pre/in/transition, precedence);
  onboarding-model test (dates → profile fields); a golden-master team fixture.
- Version bumps: `KNOWLEDGE_SET_VERSION` (SKB data) each phase; `ENGINE_VERSION` (P1 wiring, P2 derivation,
  P4 deriveSeason logic).

## 7. Governance

`gymSupport` + season-window detection are SKB/engine data + pure logic — consistent with the frozen EDS
(SKB is the Sport Model) and Knowledge Architecture. Deleting `sportGymSupport/` removes a duplicate knowledge
source, which the SKB spec (doc 03) already anticipated ("a future pass may have those modules derive from the
SKB… not merged yet"). No frozen-doc edits.

## 8. Scope boundary (YAGNI)

- The **team/coach fixture-input** path (`apps/web`) is NOT built — P4 builds the *window model + individual
  input*; the coach path plugs into the same `deriveSeason(window)` seam later.
- Congestion-aware in-season micro-phasing (from a full fixture list) is future (needs the coach fixture data).
- `movementPolicy` consumption stays deferred (separate follow-up).
- No change to the diagnosis/Performance-Model path.

## 9. Risks

- **P1 verbatim relocation must be exact** → generated by a script from the legacy modules, gated by the
  golden-master (any drift = a copy error, caught immediately). Delete legacy only when byte-identical.
- **P2/P3 change many fixtures** → staged per sport; each re-baseline reviewed for sensible content (upper for
  runners, lower for swimmers, sport-appropriate for team sports).
- **P4 changes phase for season-based athletes** → covered by unit tests on every boundary + precedence; the
  single-event and explicit-override paths stay byte-identical.
