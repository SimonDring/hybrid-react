# Design: "When do you want to start?" — plan start date in onboarding

**Date:** 2026-06-25
**Status:** Draft for review
**Scope:** apps/mobile (onboarding only — no engine change)

## Problem

The plan's start date drives the whole calendar: which week is "current", what
"today's session" is, and the rolling reflow horizon (see `PlanService` calendar
anchoring). Today the start date is set **silently to the local "today"** at
onboarding — there is no question for it:

- `apps/mobile/src/lib/onboardingModel.js:109` → `plan_start_date: today`

A user can't choose to start tomorrow, next Monday, or on a specific date. Simon
asked for an explicit choice so the plan lines up with real life.

## Requirements

- Add an onboarding question: **"When do you want to start?"** with options:
  **Today**, **Tomorrow**, **Next Monday**, **Pick a date**.
- The choice writes `profile.plan_start_date` as a **local** ISO date
  (`YYYY-MM-DD`) — never the UTC date (the existing `localISODate` rule; see the
  off-by-one guard tested in `apps/mobile/tests/plan-epoch.js`).
- Everything downstream already consumes `plan_start_date`; no engine change.

## Approach

Add the question as a step in the existing onboarding flow (`Onboarding.jsx`),
right after availability (days/minutes), since it's calendar-related. Map the
chosen option to a concrete date in `onboardingModel.js`.

### Date mapping (local time)

| Option       | Resolves to                                                    |
|--------------|---------------------------------------------------------------|
| Today        | `localISODate(now)`                                            |
| Tomorrow     | `now + 1 day`                                                  |
| Next Monday  | the soonest Monday that is **today or later** (today if Monday)|
| Pick a date  | user-selected date, constrained to **today or later**         |

A small pure helper (e.g. `resolveStartDate(option, customDate, now)`) does this
mapping so it is unit-testable in isolation.

### Default selection

Default to **Today** (decided 2026-06-25 — matches current behaviour, lowest
friction, and the order Simon listed the options). The UI shows a one-line note on
the option list:

> Weeks run Monday→Sunday. Starting mid-week gives a shorter first week — pick
> "Next Monday" for a full first week.

### Why a mid-week start is already safe

`buildCalendar` hides any session dated before the start date
(`PlanService.js` — `if (d < start) return;`), so a Tuesday start simply omits
Mon/Tue of week 1. No engine change is needed to support non-Monday starts; the
only consequence is a partial first week, which the UI note explains.

## Components / data flow

```
Onboarding.jsx  (new "Start when?" step: 4 chips + optional date input)
   │  answers.startWhen ∈ {today,tomorrow,monday,date}, answers.startDate?
   ▼
onboardingModel.js
   answersToProfilePatch():
     plan_start_date = resolveStartDate(answers.startWhen, answers.startDate, new Date())
   ▼
profile.plan_start_date  → PlanService calendar anchoring (unchanged)
```

## Testing

- Unit-test `resolveStartDate` for each option, including the "today is Monday"
  edge for Next Monday, and the "today or later" clamp for Pick-a-date.
- Timezone test (reuse the `Asia/Tokyo` / `Europe/London` pattern from
  `plan-epoch.js`): a late-evening "Today" resolves to the **local** date, not UTC.
- Onboarding model test: each `startWhen` produces the expected `plan_start_date`.

## Out of scope (YAGNI)

- Changing the start date *after* onboarding (there's a separate "start over"
  flow). Could be a later add to Settings.
- Time-of-day scheduling. Day granularity only.
