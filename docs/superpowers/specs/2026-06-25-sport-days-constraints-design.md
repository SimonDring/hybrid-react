# Design: Sport training days as scheduling constraints

**Date:** 2026-06-25
**Status:** Draft for review
**Scope:** apps/mobile (onboarding capture) + packages/engine (scheduling + placement)

## Problem

When a user's goal is to **support a sport** (run / cycle / swim), the engine
already biases the *gym* programming toward that sport (per-muscle emphasis,
priority lifts, season). But it has **no idea which days the user actually trains
their sport.** Example (Simon): swims Tue/Thu. His gym plan should be built *around*
those days — not collide with them, and not hammer the same muscles right before a
key swim.

Today:
- `availability.days` = **gym** days only. `PlanGenerator.chooseDays` +
  `scheduler.scheduleWeek` place gym sessions onto those weekdays.
- There is **no `sport_days` field** anywhere (confirmed by grep).

## Decisions (from brainstorming, 2026-06-25)

1. **Sport vs gym:** *Prefer separate; lighten if forced.* Keep gym off sport days
   when the week allows. When it can't, place a lighter, non-clashing gym session.
2. **Day picking:** *Suggest, let me adjust.* The engine proposes gym days around
   the sport days; the user can override any of them.

## Requirements

- Capture **`profile.sport_days`** (array of weekday keys, e.g.
  `['tuesday','thursday']`) during onboarding, shown only when goal = sport.
- **Suggest** gym days that avoid sport days, pre-filling the existing gym-day
  picker; the user can change them.
- In scheduling/allocation, when gym and sport land on the same or adjacent days:
  - avoid high-fatigue gym work (esp. the muscles the sport just used) **the day
    before** a sport day;
  - when a gym session must **share** a sport day, **lighten** it (reduced
    volume/intensity) and steer away from the sport's primary muscles.
- Respect the **freeze-on-start** principle: none of this recomputes when a session
  is started (it adapts at app-open/refresh while pending). Established by the
  pin-on-start fix in `trainingStore.startSession` +
  `apps/mobile/tests/reflow-start-consistency.js`.
- Stay **gym-only**: sport days are *constraints*, not generated workouts.

## Architecture

Introduce a small, explicit **schedule-constraints** concept the engine consumes,
rather than scattering sport-day logic. This is deliberately the same shape the
**Team package** will later use to feed a coach's fixed team schedule
(`docs/product/TEAM-ARCHITECTURE.md`) — one interface, two sources (self-entered
now, coach-supplied later).

```
ScheduleConstraints = {
  busyDays: WeekdayKey[],          // days already committed to the sport
  loadByDay?: { [WeekdayKey]: 'hard' | 'easy' },  // future: key vs easy sessions
  muscleLoadByDay?: { [WeekdayKey]: MuscleKey[] }  // what the sport taxes that day
}
```

For the individual case we derive `ScheduleConstraints` from `profile.sport_days`
+ the sport module's muscle profile (`packages/engine/src/lib/sports/<sport>.js`).

### 1. Onboarding capture (apps/mobile)

- `onboardingModel.js`: add `sportDays` to the answers model and
  `sport_days` to the profile patch (only when `goalType === 'sport'`).
- `Onboarding.jsx`: a weekday multi-select shown for sport goals
  ("Which days do you do your sport?").
- Add `sp_days` to `profileSignature` in `PlanService.js` so changing sport days
  regenerates the plan.

### 2. Gym-day suggestion (engine, pure)

New helper `suggestGymDays({ daysWanted, sportDays, weekdaysAvailable })`:
- prefer days from `weekdaysAvailable \ sportDays`;
- spread for recovery (avoid back-to-back where possible);
- if `daysWanted > available non-sport days`, place the overflow on the
  least-costly sport days and **mark those as "shared"** (for lightening in step 3).
- Returns the proposed gym weekdays + which are shared. The onboarding UI pre-fills
  the gym-day picker with this; the user can edit.

### 3. Placement + intensity (engine)

- `scheduler.scheduleWeek` / `PlanGenerator`: when assigning a gym session to a day
  that is a sport day (shared) or the day before one, apply:
  - a **lighten multiplier** to the shared-day gym session (reuse the existing
    volume/intensity modifier path the reflow already uses);
  - a **muscle-avoidance bias** from `muscleLoadByDay` so we don't pre-fatigue the
    muscles the sport needs (sport modules already describe primary muscles).
- The **reflow** (`PlanService.adaptedPhases`) passes the same constraints so
  reshaped current-week sessions also respect sport days.

## Components & boundaries

| Unit | Responsibility | Depends on |
|------|----------------|-----------|
| `onboardingModel` / `Onboarding.jsx` | capture `sport_days` | — |
| `deriveConstraints(profile)` (engine) | profile → `ScheduleConstraints` | sport modules |
| `suggestGymDays(...)` (engine, pure) | propose gym days around sport days | — |
| `scheduleWeek` / allocator (engine) | place + lighten around constraints | constraints |
| `PlanService` reflow | feed constraints into current-week reshape | engine |

Each is independently testable; `suggestGymDays` and `deriveConstraints` are pure.

## Testing

- `suggestGymDays`: separation when room exists; correct overflow onto
  least-costly sport days when `daysWanted` is high; recovery spacing.
- Placement: no heavy same-muscle gym session the day before a sport day; shared-day
  gym sessions are lightened; the muscles the sport taxes are de-emphasized.
- Reflow respects constraints (a reshaped session never creates a new clash).
- Regression: a non-sport (build) goal is unaffected (no `sport_days` → no change).

## Optional (flag for review)

- **Show sport days on the calendar** as non-clickable markers (e.g. "Swim" on
  Tue/Thu) so the week reads correctly. Cheap add in `buildCalendar`; nice for
  trust. Include?

## Out of scope (YAGNI)

- Generating actual sport sessions (run/cycle/swim workouts) — still a future stage.
- Per-session "key vs easy" sport intensity (`loadByDay`) — interface is reserved
  but not built now; all sport days treated equally.
- Team/coach-supplied schedules — the constraints interface is designed to support
  it, but the Team package is a separate project.
