# Season-phased SKB programming — design spec (2026-07-09)

> **Status:** approved design (brainstormed with Simon 2026-07-09). Implementation on branch
> `season-phased-skb-2026-07-09` (stacked on `skb-audit-fixes-2026-07-08`). Not for main until reviewed.
>
> **One-line:** make the Sport Knowledge Base carry machine-consumable, per-phase (off / pre / in-season)
> programming directives, and have the plan generator read them directly — so a sport plan changes its
> *shape* across the season (off-season rounds the athlete out; in-season narrows to sport-specific +
> prehab), not just its volume.

## 1. Why

Two findings from the 2026-07-08 audit (`docs/engine/08-SKB-CONSUMPTION-AND-SEASON-AUDIT.md`) drive this:

1. The rich SKB is **~95% dormant** — the live plan is built from a 32-line-per-sport legacy layer
   (`data/sportGymSupport/*.js`). Sessions are shallow because that thin layer can't express per-phase,
   per-pattern coaching detail.
2. **"Season" only scales volume today** (`DEFAULT_SEASON_VOLUME`) + picks a block template. It cannot
   express "off-season = generalise / round out" or "in-season = sport-specific + prehab", even though
   every SKB `seasonalModel` already *describes* that arc in prose.

This spec is the **first concrete slice of T3** (wire the SKB into generation). We start with the season
model because it is the most-wanted behaviour and it forces us to build the SKB→generation wire for one
clear purpose. **Architecture is uncompromising Approach A** (the SKB becomes the source, no throwaway
interim); the *rollout* is staged sport-by-sport behind the golden-master.

## 2. The coaching model (approved)

| Phase (engine) | SKB phase | Emphasis | Round-out / session policy |
|---|---|---|---|
| `off` | `offSeason` | Balanced base — de-emphasised groups floored up; **no mass-chasing** | **1 round-out session/week** that trains the sport's *under-developed* groups/patterns; full patterns allowed |
| `pre` | `preSeason` | Narrowing toward sport-specific | Round-out → maintenance (0–1); reactive/economy/sport-relevant work rises |
| `in` | `competition` | Sport-specific (today's narrow vector) | Lower/single-leg/calf/stability/**prehab pool**; upper (or whatever the sport lacks) kept to a **minimal maintenance touch**, folded into a session — not a dedicated day; heavy bilateral spinal loading deprioritised |

**The round-out session is NOT a generic push/pull day.** It is a **sport-specific session that additionally
guarantees a block hitting the sport's under-developed groups/patterns**, where "under-developed" is
**derived from the sport's own emphasis/demand profile in the background** — so it adapts per sport:

- **Runner** (upper de-emphasised) → round-out adds upper (postural/scapular pulls + light overhead / arm-drive
  press — things running *also* benefits from, per its `gymPhilosophy`).
- **Swimmer** (legs de-emphasised: quads/hams/glutes ~0.7, calves 0.5) → round-out adds **lower** (squat / hinge / calf).
- **Cyclist** → upper **and** hamstrings.
- A sport that trains upper+lower but skips groups within them → round-out targets exactly those.

The upper/lower/specific choice is never hardcoded; it is computed from the sport focus, with an optional
explicit per-sport override for precision the derivation would miss.

## 3. Architecture — Approach A (SKB is the source)

```
profile ──deriveSeason──▶ phase (off/pre/in/transition)
        ──skbSportIdOf──▶ sportId
                          │
                          ▼
      seasonalModel[phaseMap[phase]].programming   ── or null (unmigrated → legacy fallback)
                          │
   ┌──────────────────────┼───────────────────────────────┐
   ▼                      ▼                                 ▼
muscleEmphasis      roundOut (mode/dose/targets)      movementPolicy (require/maintainOnly/deprioritize)
   │                      │                                 │
   ▼                      ▼                                 ▼
weeklyMuscleTargets   split reserves a round-out     allocator filters/weights its
(targets.js)          session (off/pre)              candidate pool by pattern (in-season)
```

New/changed units, each with one clear job:

- **`seasonProgramming.js`** (new, `lib/sportKnowledge/`) — pure accessor. `phaseProgrammingFor(profile)`
  → the resolved `programming` block for the current phase, or `null`. Owns `phaseMap`
  (`off→offSeason, pre→preSeason, in→competition, transition→recovery`).
- **`roundOutTargets.js`** (new, `lib/sportKnowledge/` or `lib/plan/`) — pure. Given a sport's
  `muscleEmphasis` (+ optional explicit override), returns the under-developed muscle groups + movement
  patterns to train in the round-out (the "derive in the background" logic).
- **`resolveProgram`** (changed) — for a migrated sport, reads `programming.muscleEmphasis` for the current
  phase instead of the legacy module vector; falls back to legacy when `programming` is null.
- **split resolver** (changed) — when `roundOutSessionsPerWeek ≥ 1`, marks `min(N, gymDays−1)` sessions as
  round-out sessions carrying the derived gap-block; the rest stay sport-specific. Folds into a session
  when `gymDays == 1`.
- **allocator** (changed) — honours `movementPolicy`: `require` patterns selected first, `maintainOnly`
  capped to a light dose, `deprioritize` pushed down. The round-out session's gap-block is sourced from the
  sport's own priority/library first, general balance fillers only to close the gap.

Purity/determinism preserved throughout (pure function of the profile; golden-master still pins it).

## 4. SKB schema extension — the `programming` block

Add a `programming` object to each authored phase of `seasonalModel`, alongside the existing prose (which
stays as human-readable provenance). Shape:

```jsonc
"offSeason": {
  "primaryObjective": "…prose (unchanged)…",
  "trainingEmphasis":  "…prose (unchanged)…",
  "gymFrequencyPerWeek": 3,
  "programming": {
    "muscleEmphasis": { "quads":1.15, "hamstrings":1.30, "glutes":1.25, "calves":1.25, "core":1.20,
                        "back":1.00, "shoulders":0.95, "chest":0.90, "biceps":0.90, "triceps":0.90 },
    "roundOutSessionsPerWeek": 1,
    "roundOut": { "mode": "derive", "dose": "develop" },   // mode: derive|explicit; dose: develop|maintain|none
    // optional when mode:"explicit" → "targetMuscles": [...], "targetPatterns": [...]
    "movementPolicy": { "require": ["squat","hinge","single_leg","vertical_pull","horizontal_push","calf","anti_rotation"],
                        "maintainOnly": [], "deprioritize": [] },
    "confidence": "moderate", "evidenceLevel": "L3", "source": "…S&C rationale…"
  }
},
"competition": {                    // engine 'in'
  "programming": {
    "muscleEmphasis": { "quads":1.15,"hamstrings":1.30,"glutes":1.25,"calves":1.20,"core":1.20,
                        "back":0.90,"shoulders":0.80,"chest":0.55,"biceps":0.55,"triceps":0.70 },
    "roundOutSessionsPerWeek": 0,
    "roundOut": { "mode": "derive", "dose": "maintain" },
    "movementPolicy": { "require": ["single_leg","calf","hinge","anti_rotation","hip_stability"],
                        "maintainOnly": ["vertical_pull","horizontal_push"],
                        "deprioritize": ["bilateral_spinal_loading"] },
    "confidence": "moderate", "evidenceLevel": "L3", "source": "…" }
}
```

- `movementPolicy` patterns use the engine's existing movement-pattern vocabulary (validated against the
  catalogue — see §6). `hip_stability` / `bilateral_spinal_loading` are pattern *groups*; the engine maps
  them to concrete patterns/exercise flags (e.g. `bilateral_spinal_loading` = barbell squat/deadlift/row
  with `axialLoad`).
- A phase with **no** `programming` block is a valid scaffold (unmigrated) → legacy fallback.

## 5. Round-out derivation (`mode: "derive"`)

Given the phase's `muscleEmphasis` (a `{muscle: ×}` map; unlisted = 1.0):

1. **Under-developed muscles** = muscles whose emphasis is meaningfully below neutral — `emphasis[m] < UNDERDEV_THRESHOLD` (start `0.9`), i.e. the groups the sport itself trains least.
2. **Target patterns** = the movement patterns that primarily train those muscles (via the existing
   muscle↔pattern knowledge, e.g. `chest→horizontal_push`, `lats/upper-back→vertical_pull/horizontal_pull`,
   `quads→squat`, `posterior-chain→hinge`, `calves→calf`).
3. The round-out block guarantees ≥1 exercise per target pattern, **sourced from the sport's own
   `priorityExercises` / SKB `exerciseLibrary` first** (sport-relevant), then a neutral balanced fallback
   from the catalogue only to fill an uncovered target.
4. `dose` scales the block: `develop` (a real but non-mass dose, e.g. 2–3 exercises), `maintain` (1 light
   touch), `none` (skip).

`mode: "explicit"` bypasses steps 1–2 and uses the authored `targetMuscles` / `targetPatterns`.

## 6. Validation / error handling

Extend `validateSportProfile` (`lib/sportKnowledge/schema.js`) — when a phase `programming` block exists:
- `muscleEmphasis`: object of `muscle → number in [0.1, 2.0]`.
- `roundOutSessionsPerWeek`: integer `≥ 0`.
- `roundOut.mode ∈ {derive, explicit}`; `roundOut.dose ∈ {develop, maintain, none}`; if `explicit`,
  `targetMuscles`/`targetPatterns` are non-empty arrays.
- `movementPolicy.{require,maintainOnly,deprioritize}`: arrays of tokens from the known pattern/group
  vocabulary (a fixed `MOVEMENT_POLICY_TOKENS` set the validator checks).
- Provenance (`confidence`, `source`) present (same "provenance where content exists" rule).
- A **missing** block is valid (scaffold). Unknown phase → derive maps to nearest (`transition→recovery`
  else `off`). Never throws.

## 7. Rollout & fallback

- **Order:** schema+engine machinery first (proven with `running_middle`), then author `programming` for the
  endurance sports (running ×3, cycling, swimming, triathlon), then the team sports later.
- **Fallback:** no `programming` block → legacy `sportGymSupport` path → byte-identical. The legacy layer is
  **retained** (deleted only once all sports are migrated). This keeps "uncompromising A" honest and safe.
- Each migrated sport = one intentional, documented golden-master re-baseline.

## 8. Gym-days scaling

`effectiveRoundOut = min(roundOutSessionsPerWeek, max(0, gymDays − 1))` — always leave ≥1 purely
sport-specific session. If `gymDays == 1`, the round-out block **folds into** that single session (adds the
gap-block to the sport session) rather than consuming it.

## 9. Testing

- **Property tests (per phase, the real guardrails):**
  - Off-season: the plan contains a round-out session that trains the sport's *derived* gaps — runner →
    upper push+pull present; swimmer → lower (squat/hinge/calf) present; cyclist → upper + hamstrings.
  - In-season: sport-specific-dominant; round-out down to a maintenance touch; `require` prehab patterns
    present; heavy bilateral spinal loading deprioritised.
  - Pre-season: between the two.
- **Fallback test:** an un-migrated sport is byte-identical (guard against accidental regression).
- **Schema-validation tests** for the new block (valid + each invalid case).
- **Derivation unit tests** (`roundOutTargets`): runner→upper, swimmer→lower, cyclist→upper+hams,
  explicit-override honoured, threshold behaviour.
- Extend `skb-triathlon-blend.js` across seasons.
- **Golden-master:** per-sport re-baselines (documented); add `pre`/`in` fixtures where missing.
- **Versioning:** `KNOWLEDGE_SET_VERSION` (SKB data) + `ENGINE_VERSION` (generator/allocator logic).

## 10. Governance

Extending `seasonalModel` is consistent with the frozen **EDS** (the SKB *is* the Sport Model the engine
reads) and the **Knowledge Architecture** (structured knowledge, not hard-coded logic). `schema.js` / doc 03
are living references, not the frozen five — this is an allowed extension, not a governance amendment. The
per-phase directives are *data*; the engine stays a pure interpreter of them.

## 11. Scope boundary (YAGNI)

- Covers `off` / `pre` / `in`. `transition` maps to `recovery` (light). **Playoffs/taper** reuse the
  existing taper logic — not a new phase here.
- Does **not** delete the legacy `sportGymSupport` layer (fallback until all sports migrate).
- Does **not** change the diagnosis/Performance-Model path — this is the legacy-generator seam only.
- Does **not** introduce new endurance *session* programming (still gym-only; out of scope, per CLAUDE.md).

## 12. Risks

- **Split/allocator are core, shared code.** Mitigation: gate every new behaviour behind the presence of a
  `programming` block, so un-migrated sports and all build goals are provably byte-identical; stage per sport
  behind the golden-master; land the machinery on `running_middle` first as a walking skeleton.
- **Movement-pattern vocabulary drift.** Mitigation: a single `MOVEMENT_POLICY_TOKENS` source, validated,
  mapped to real catalogue patterns/flags in one place.
- **Over-generalising the round-out.** Mitigation: derive from the sport's own emphasis + source exercises
  from the sport's own library first; explicit override where needed.
