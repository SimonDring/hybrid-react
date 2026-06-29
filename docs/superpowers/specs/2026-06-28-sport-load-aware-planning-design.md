# Sport-load-aware planning for sport athletes

**Date:** 2026-06-28
**Status:** Design — approved, pre-implementation
**Author:** Simon + Claude

## 1. Problem

A sport-supporting gym plan (e.g. a swimmer who also swims 3×/week) is currently
generated as if the gym is the athlete's *only* training. Reviewing a real profile
(intermediate swimmer, "building base", swims Tue/Thu/Sat, gym 3×/week) surfaced
four problems:

1. **Onboarding is muddled.** A single "Which sport — and where are you?" screen
   mixes sport choice with a three-way `compete / recreational / build_base` intent,
   and competitors are nudged toward an event date. There's no clean "do you compete?"
   → "what's your season / goal?" branch.
2. **No sport-load accounting.** `volumeScalar` for an off-season athlete is `1.0`
   (`DEFAULT_SEASON_VOLUME.off`), so the gym demands full volume on top of the sport.
   Nothing reflects *how many* sport sessions the athlete already does each week.
3. **Scheduling collides with sport days.** When the athlete offers generous
   availability (e.g. all weekdays), `chooseDays()` does `slice(0, n)` and ignores
   sport days entirely — producing gym on Mon/Tue/Wed, which clashes with the Tue
   pool session and clusters load. Offering *more* availability produces a *worse*
   schedule. (`suggestGymDays()` already solves this but is only called when gym days
   are left blank.)
4. **Sessions are too dense.** With few gym days and a high weekly MEV→MRV target,
   the allocator packs 6–9 exercises (several heavy compounds) into each session —
   high fatigue that can impair pool performance.

These are one coupled problem: **the gym plan should support the sport, not compete
with it**, from day one (before any wearable data exists).

## 2. Goals / non-goals

**Goals**
- Restructure sport onboarding into a clear compete→season / recreational→goal branch.
- Make weekly gym volume a function of the athlete's real sport load.
- Cap per-session fatigue without losing the swimmer's-shoulder prehab.
- Fix day scheduling so gym routes around sport days even when availability is generous.
- Stop generating a "Peak & Sharpen / taper" phase (and its false "volume drops so you
  arrive fresh" copy) when there is no event to peak for.

**Non-goals (YAGNI / later stages)**
- No full per-session training-stress budget (approach C). The reactive wearable ACWR
  layer (`trainingLoad.js`) already covers total-load once data flows; this spec is the
  *proactive, generation-time* layer.
- No endurance/sport session programming (still gym-only).
- No change to the build (non-sport) goal path beyond shared plumbing.

## 3. Onboarding flow & data model

Replace the combined sport screen with a branch (`OnboardingWizard.jsx`, mirrored in
the pure mapping in `onboardingModel.js`):

```
Sport selected
 └─ Q: "Do you compete in your sport?"        → sport_intent: 'compete' | 'recreational'
     ├─ compete →
     │    Q: "Where are you in your season?"   → sport_season: 'in_season' | 'off_season'
     │    Q (optional): "Key event date?"      → event_date (adds a taper near the date)
     └─ recreational →
          Q: "What's your training goal?"      → sport_goal: 'build_base' | 'get_stronger' | 'stay_durable'
```

**Field changes (`BLANK_ANSWERS` + `answersToProfilePatch`):**
- `sport_intent`: now `'compete' | 'recreational'` (drop `'build_base'` as an intent).
- `sport_season`: re-introduced as an explicit answer (`'in_season' | 'off_season'`),
  set during onboarding for competitors. It is already a consumed profile field
  (`program.js:34`, `program.js` prefers `profile.sport_season` over `deriveSeason`);
  onboarding stopped setting it — we set it again. The onboarding value maps to the
  engine's internal season key (`'in_season' → 'in'`, `'off_season' → 'off'`) in the
  season resolver; the rest of the engine continues to use the `off/pre/in/transition`
  keys.
- `sport_goal`: new, for recreational athletes only.

**Migration (backwards compatibility).** Old saved profiles / answer seeds with
`sport_intent: 'build_base'` map to `sport_intent: 'recreational'` +
`sport_goal: 'build_base'`. `sport_intent: 'recreational'` with no `sport_goal`
defaults to `build_base`. Handle in `answersToProfilePatch` so both old answers and
old persisted `users.profile` rows resolve. `deriveSeason()` keeps working as a
fallback for any profile lacking an explicit `sport_season`.

## 4. Periodisation mapping

Onboarding answers resolve to a `season` (the existing block + base-scalar key) plus,
for recreational athletes, a `sport_goal` that further shapes block and scalar. The
**`peak` segment is removed from no-event sport blocks** — peaking is owned by the
event-date taper in `PlanGenerator` (`taperWeeks`), not baked into the block.

| Onboarding | resolved season | block shape | taper |
|---|---|---|---|
| compete · off-season | `off` | base → build (de-peaked) | only if `event_date` |
| compete · in-season | `in` | short maintenance (rolling) | only if `event_date` |
| recreational · build_base | `off` | longer base → build (de-peaked) | none |
| recreational · get_stronger | `off` | base → build, heavier/lower-rep | none |
| recreational · stay_durable | `in` | low-volume maintenance | none |
| event within pre-window | `pre` | taper block | yes (event taper) |

**De-peak change.** In `_schema.js`, `SPORT_BLOCKS.off.split` currently ends in
`{intent:'peak', weeks:2}`. Change the trailing segment to `{intent:'build', weeks:2}`
(or fold into the build segment) so no-event plans end on an honest build, not a
"peak". The event-date taper (already in `PlanGenerator.generatePlan`) still provides
real peaking/sharpening when an event exists. Verify `themeFor()` / `PHASE_META`
copy no longer claims a taper for non-event final phases.

**In-season block length: stays short.** In-season uses the existing short rolling
maintenance block (`SPORT_BLOCKS.in`, 4 weeks) so the athlete re-assesses sooner —
*decision: shorten via the existing short block, not same-length-lower-volume.*

## 5. Sport-load volume scalar (overload fix)

Replace the single lookup at `program.js:46`
(`volumeScalar: (seasonModifiers||DEFAULT_SEASON_VOLUME)[season] ?? 1.0`) with a pure
helper `sportLoadScalar(profile, { season, mod })`:

```
volumeScalar = clamp(seasonBase × goalFactor × sportDayFactor × sportTypeFactor, 0.5, 1.0)
```

- **seasonBase** — revised `DEFAULT_SEASON_VOLUME`: `{ off: 0.90, pre: 0.85, in: 0.60, transition: 0.70 }`
  (off-season pulled back from 1.0 → 0.90; others unchanged). Per-sport
  `seasonModifiers` may still override.
- **goalFactor** — recreational `sport_goal` only (compete = 1.0):
  `build_base 1.0 · get_stronger 0.90 · stay_durable 1.0` (stay_durable already maps
  to the low `in` seasonBase, so its factor stays 1.0 to avoid double-discounting).
- **sportDayFactor** — count of `profile.sport_days`: `≤2 → 1.0 · 3 → 0.92 · 4 → 0.85 · ≥5 → 0.78`.
- **sportTypeFactor** — new per-module field `systemicFactor` (default 1.0):
  `swim 0.95 · run 0.90 · cycle 0.95` (team sports can tune later).
- **clamp** to `[0.50, 1.00]`. *Decision: floor 0.50* — maintenance research shows
  strength/size is retained on ~⅓–½ of accumulation volume (Bickel 2011; Spiering 2021),
  so half-volume gym still maintains while leaving recovery for sport.

**Worked examples (the review swimmer, 80 kg male, swims 3×/week):**
- In-season ×3/wk: `0.60 × 1.0 × 0.92 × 0.95 = 0.524 → clamp 0.52`.
- Off-season (build_base) ×3/wk: `0.90 × 1.0 × 0.92 × 0.95 = 0.787 → 0.79`.
- Off-season ×2/wk: `0.90 × 1.0 × 1.0 × 0.95 = 0.855 → 0.86`.

`volumeScalar` multiplies the weekly per-muscle targets in `weeklyMuscleTargets()`;
per-muscle `emphasis` (the relative shape) is unchanged, so the plan keeps its swim
bias but at a lower magnitude. Lower weekly target ⇒ the allocator spreads less work
across the gym slots ⇒ sessions thin out automatically (partial fix for §6). All
numbers live in one tunable table; we dial them in DevPlayground.

## 6. Session-density guardrail

In `allocator.js`, cap **fatiguing** work per session independently of the weekly
target. Add `MAX_HEAVY_PER_SESSION = 3` (heavy = items on the *main*/compound scheme —
the session's primary barbell/compound lifts, which run RPE 7 in base and 8–9 in
build/peak — as distinct from the light accessory/prehab scheme at RPE 6–7):

- Track a per-slot heavy-pick counter during the greedy fill.
- Once a slot reaches the cap, exclude further heavy/compound candidates from that
  slot (they fall to a lighter accessory variant or the slot ends).
- Light prehab/core/accessory (RPE 6–7) stay eligible beyond the cap, up to a total
  per-session ceiling (~6 exercises).

Net: ≈4–6 exercises/session, ≤3 of them heavy, with shoulder-prehab/core preserved.
The cap applies to sport plans; build plans keep current behaviour unless we choose to
extend it (default: sport only, gated on `program.sport`).

## 7. Scheduling fix

Rewrite `chooseDays()` in `PlanGenerator.js` so user-picked availability still avoids
sport days:

1. From the user's available days, split into **free** (not a sport day) and **clash**
   (on a sport day).
2. If `free.length >= n`: spread-pick `n` from free (reuse `suggestGymDays`'s
   even-spread so we don't cluster — e.g. Mon/Wed/Fri, not Mon/Tue/Wed).
3. Else: take all free days + the fewest clash days needed, spread; any session that
   lands on a sport day is passed through `lightenItems()` (already wired via
   `scheduleWeek` / `busyDays`) so a clash day is lighter.
4. If the user left days blank: unchanged — `suggestGymDays({ sportDays, gymDays })`.

Result for "all weekdays available, swims Tue/Thu/Sat, 3 gym days" → **Mon/Wed/Fri**.

## 8. Files touched (implementation map)

- `apps/mobile/src/components/OnboardingWizard.jsx` — branch the sport step into
  compete? → season / goal questions; event date optional.
- `apps/mobile/src/lib/onboardingModel.js` — `BLANK_ANSWERS` (`sport_season`,
  `sport_goal`), `answersToProfilePatch` mapping + `build_base` migration.
- `packages/engine/src/lib/plan/periodization.js` — `deriveSeason` honours explicit
  `sport_season`; recreational `sport_goal` → season/block; de-peak.
- `packages/engine/src/lib/sports/_schema.js` — revised `DEFAULT_SEASON_VOLUME`;
  de-peaked `SPORT_BLOCKS.off`; optional `systemicFactor` in the module contract.
- `packages/engine/src/lib/sports/*.js` — add `systemicFactor` (swim/run/cycle);
  optional per-goal block variants for `get_stronger`.
- `packages/engine/src/lib/strength/program.js` — `sportLoadScalar()` replacing the
  flat `volumeScalar` lookup; thread `sport_goal`.
- `packages/engine/src/lib/plan/allocator.js` — `MAX_HEAVY_PER_SESSION` per-slot cap.
- `packages/engine/src/lib/PlanGenerator.js` — `chooseDays()` rewrite; confirm
  `themeFor`/`PHASE_META` peak/taper copy.

## 9. Testing & verification

- **Unit tests (engine, `node tests/*.js`):**
  - `sportLoadScalar`: the worked examples above; clamp floor/ceiling; compete vs
    recreational; sport-day-count steps; per-sport `systemicFactor`.
  - `chooseDays`: all-weekdays + swim Tue/Thu/Sat → Mon/Wed/Fri; packed week falls
    back to a lightened clash day; blank days unchanged.
  - allocator: no session exceeds `MAX_HEAVY_PER_SESSION` heavy items; prehab survives.
  - periodisation: no `peak` segment / no "taper" copy for no-event sport plans;
    event-date plans still taper.
  - onboarding migration: `build_base` intent → recreational + build_base goal.
- **Golden master:** the archetype matrix (`tests/golden-master.js`) intentionally
  changes — regenerate with `UPDATE=1` and eyeball the swim/cycle/run archetypes
  (lower weekly sets, leaner sessions, de-peaked finals).
- **End-to-end sanity:** re-run the review swimmer through a DevPlayground-style dump
  and confirm: in-season weekly sets ≈ half of current, ≤3 heavy/session, gym on
  Mon/Wed/Fri, no false taper phase.
- `npm run dev` runs clean at the end.

## 10. Risks & open items

- **Scalar values are judgement calls.** Mitigated by keeping them in one table and
  tuning in DevPlayground; defaults above are the starting point.
- **Golden-master churn is large** (this changes most sport archetypes). Expected and
  intentional; the diff is the review surface.
- **`get_stronger` block variant** may be deferred to "same block, heavier rep scheme"
  if a distinct block template proves unnecessary — decide during implementation.
- The build (non-sport) path is intentionally untouched; the per-session cap is sport-only
  by default.
