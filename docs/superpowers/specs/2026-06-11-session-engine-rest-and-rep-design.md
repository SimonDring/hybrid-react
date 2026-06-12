# Session Engine: Rest Prescriptions, Sport Rep Scheme, 2-Primary Cap

**Date:** 2026-06-11
**Status:** Approved — ready for implementation

---

## Problem

Session build quality is poor. Three root causes identified through research:

1. Rest periods are not prescribed anywhere — the allocator uses `perSetMin()` as a time-budget abstraction, but the user never sees a rest instruction and the timer defaults to a generic value.
2. Sport-support athletes (run/cycle/swim) share the generic `strength` rep scheme. The research shows sport athletes need a dedicated scheme: heavier primaries (3–6 reps), lower accessory volume, higher RPE on primaries.
3. The greedy fill loop can place 3+ primary compound lifts in a session. Neural quality degrades after 2; the extra primaries displace accessory work that would be more valuable.

---

## Research basis

- **Schoenfeld et al. 2016** — 3 min rest vs 1 min rest: 3 min produced significantly greater strength and size gains. 2 min is insufficient for heavy primary work.
- **Frontiers 2024 meta-analysis** — 60s+ rest consistently outperforms shorter rest for hypertrophy. Floor for accessories: 60s.
- **Rønnestad 2014** — Heavy low-rep strength work (3–6 reps, ≥80% 1RM) improves running economy and cycling efficiency via neuromuscular adaptation. High-rep "endurance lifting" does not. Low volume prevents bulk.
- **NSCA / RP Strength** — Session structure: 1–2 primary compounds first (high neural demand, must be performed fresh), then 2–4 accessories. Quality degrades beyond 2 primaries.
- **Superset mechanics** — Antagonist supersets: rest during the paired exercise equals full recovery for the first muscle. B-exercise rest can be 15–30s. Total cycle time is equivalent to normal rest.

---

## Scope

Two files. No UI changes (the `restSec` field is added to items so the UI can use it later without another engine change).

| File | Change |
|---|---|
| `src/lib/plan/allocator.js` | Rest values in `makeItem()`; sport scheme in `scheme()`; 2-primary cap in fill loop; 20s rest for superset B in `structureItems()` |
| `src/lib/strength/program.js` | Sport athletes: `style: 'sport'` instead of `style: 'strength'` |

---

## Design

### 1. Rest prescription (`restSec` field on items)

Added to `makeItem()` in `allocator.js`. Rule lookup by role and style:

| Situation | `restSec` | Rationale |
|---|---|---|
| Primary compound — strength or sport style | 180 | 3 min; Schoenfeld; neural recovery |
| Primary compound — hypertrophy/functional style | 120 | 2 min; moderate-load compound |
| Accessory compound (supersetted) | 75 | 75s; actual rest = other exercise's work time |
| Isolation / filler / core / calf | 60 | Small muscle mass, fast recovery |
| Superset B exercise (second in pair) | 20 | Rested during A; transition is the "rest" |

The 20s override is applied in `structureItems()` after items are structured into superset blocks — it reads `superset: true` and `pos > 0` within the block.

### 2. Sport rep scheme (new `scheme()` row)

New `sport` key added to the scheme table. Used when `style === 'sport'` (sport-support athletes).

| Phase | Primary | Accessory | Primary RPE | Accessory RPE |
|---|---|---|---|---|
| Base | 3 × 5 | 3 × 8 | RPE 7 | RPE 6 |
| Build | 4 × 4 | 3 × 8 | RPE 8 | RPE 7 |
| Peak | 4 × 3 | 3 × 6 | RPE 8→9 | RPE 7→8 |
| Deload | 2 × 4 | 2 × 6 | RPE 5 | RPE 5 |

Design intent:
- Lower rep ceiling on primaries than generic `strength` (avoids hypertrophy volume competing with sport training load)
- Accessory volume kept lean — sport training already accumulates fatigue
- Higher primary RPE in build/peak — the goal is neural drive, not pump

`resolveProgram()` in `program.js` returns `style: 'sport'` for all `goalType === 'sport'` athletes. The `scheme()` function in `allocator.js` handles this new key; all other style paths are unchanged.

### 3. 2-primary cap

Each slot's working state gains `primaryCount: 0`. Two rules:

- **Anchor step (step 1):** After placing the fundamental compound, increment `slot.primaryCount`.
- **Greedy fill (step 2):** Before accepting a candidate, check: if `slot.primaryCount >= 2 && ex.role === 'primary'`, skip it.

The filler pass (step 3) is unaffected — fillers are never primaries.

**Effect by session length:**
- 30 min → 1 primary + 2–3 accessories
- 60 min → 2 primaries + 3–4 accessories + fillers
- 75 min → 2 primaries + more accessory sets / additional fillers (correct — extra time goes to volume, not more heavy compounds)

Sessions previously containing 3+ primaries will have the 3rd+ replaced by accessories. Primary volume decreases slightly; session quality increases.

---

## Additional touch-points for `style: 'sport'`

Two existing style guards must be extended or `'sport'` silently falls back to `'functional'`:

1. **`allocateGym()` style validation** (`allocator.js` line 262):
   ```js
   // Before
   const style = ['strength', 'bodybuilding', 'functional'].includes(ctx.style) ? ctx.style : 'functional';
   // After — add 'sport'
   const style = ['strength', 'bodybuilding', 'functional', 'sport'].includes(ctx.style) ? ctx.style : 'functional';
   ```

2. **`STYLE_TOP` in `targets.js`** — `weeklyMuscleTargets()` uses this to set how high volume ramps across the phase. Sport athletes should use the same lean ramp as `strength` (0.6) — they're not chasing volume, just maintaining/building neuromuscular quality:
   ```js
   const STYLE_TOP = { strength: 0.6, functional: 1.0, bodybuilding: 1.4, sport: 0.6 };
   ```

---

## What is not changing

- `SessionDetail.jsx` and all other UI files — no changes. The `restSec` field is ready on items for a future UI pass.
- `Database.js`, `SyncService.js`, `Storage.js` — engine-only change, no data layer impact.
- The Supabase schema — items are computed at runtime, never persisted as structured exercise fields.
- All non-sport styles (`strength`, `bodybuilding`, `functional`) — rep schemes, RPE, and volume logic unchanged.
- The supplemental-strength builder (`buildSupport`) — already produces short, low-volume sessions; unaffected.

---

## Success criteria

- Every item in a built session has a `restSec` field with a non-zero value.
- Sport-style sessions (`goalType: 'sport'`) use the new rep scheme, not the generic strength scheme.
- No session contains more than 2 exercises with `role === 'primary'`.
- `npm run dev` passes with no console errors after changes.
