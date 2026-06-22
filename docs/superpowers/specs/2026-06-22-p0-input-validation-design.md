# P0 — Input Validation Layer (design spec)

**Date:** 2026-06-22
**Source:** [docs/SECURITY-AUDIT.md](../../SECURITY-AUDIT.md) — finding §3 (Input
Validation & Processing Integrity, scored 42/100), P0 fix items 1–2.
**Status:** approved design, pending spec review → implementation plan.

## Problem

Every user input is validated (if at all) **only in the UI**. The data layer
(`SyncService.js`, `Database.js`) writes through with minimal cleaning, and
`supabase/schema.sql` has **no CHECK constraints, no length limits, and no enum
enforcement** — only column types + RLS. So a crafted request (browser DevTools,
or `curl` with the user's own valid token) bypasses every UI guard and writes
straight to the row. Two concrete harms:

1. **Plan-engine corruption** — `generatePlan()` is a pure function; unbounded
   `age` / `bodyweight_kg` / lifts / 1–5 ratings flow straight in and produce a
   garbage plan with no guard rail.
2. **Storage abuse** — free-text fields (`notes`, `title`, `description`,
   `rehab_plan`, `recovery_log[].*`) have no length cap.

## Goal

Validate every write **before it is persisted**, at two layers so the UI is not
the only line of defence: an app-layer rulebook (with user-facing messages) and
matching database constraints.

## Decisions (locked)

- **Behaviour = "Block & explain".** Out-of-range **numbers** are rejected and a
  friendly message is surfaced to the screen (we never silently rewrite a
  recorded health number). **Free text** is silently trimmed and length-capped
  (no error). **Unknown enum** values are rejected.
- **Hand-rolled, no new dependency** (no `zod`). Rules are simple
  (ranges/enums/lengths); a small readable rulebook keeps the lean dependency set
  and is easy to tune. zod remains the fallback if validation later grows complex.
- **First slice = the four highest-risk paths** (those that feed the plan engine
  and hold health data): **onboarding/profile**, **daily metrics**, **session
  completion**, **injuries** — plus the DB migration for those tables. Remaining
  screens reuse the same rulebook incrementally afterward.

## Architecture (three layers)

### Layer 1 — pure rulebook: `src/lib/validation/`

The single source of truth. No React, no I/O, fully unit-testable.

- `rules.js` — one tunable config object describing each field's limits.
- `validate.js` — generic helpers (`num`, `int`, `oneOf`, `text`) + per-payload
  validators for the four paths: `validateProfile`, `validateDailyMetric`,
  `validateSessionLog`, `validateInjury`.

**Contract** — every validator returns:

```js
{ ok: boolean,                 // false if any number/enum is invalid
  value: object,               // normalised payload (text trimmed+capped, numbers parsed)
  errors: { [field]: string }  // friendly messages, present when ok === false
}
```

- Numbers out of range → `ok:false` + `errors[field]`.
- Text → always normalised in `value` (trimmed, capped); never an error.
- Unknown enum → `ok:false` + `errors[field]`.
- **Enum sets are derived from existing sources** where they already exist
  (the label maps in `Profile.jsx`, the `OnboardingWizard` choice arrays,
  `injuryTaxonomy.js`, `activityTypes.js`) so there is no second copy to drift.

### Layer 2 — wire into the store actions (`src/stores/trainingStore.js`)

The chokepoint every screen already calls. Target actions: `updateProfile`,
`upsertDailyMetric`, `completeSession`, `addInjury`. (The weekly check-in's
`addLog`/`addCheckin` is deferred to the later incremental rollout, but its
table still gets DB constraints in Layer 3.) Each action:

1. runs the matching validator;
2. if `!ok` → **does not write**, returns `{ ok:false, errors }`;
3. if `ok` → writes `value` (the normalised payload) via the existing
   `Sync.* → Database.*` path, returns `{ ok:true }`.

The **four target screens** (onboarding wizard, daily-metrics entry,
`SessionDetail` complete, `Injuries` add/edit) read the returned `errors` and
show the friendly message inline. Screens not yet wired keep working: their UI
already constrains inputs, and the DB migration is the backstop.

### Layer 3 — database constraints: `supabase/migrations/010_validation_constraints.sql`

Mirror the numeric ranges and text length caps as Postgres `CHECK` constraints
on the real scalar columns of `session_logs`, `daily_metrics`, `weekly_checkins`,
and `injuries` (`weekly_checkins` included at the DB level even though its
app-layer wiring is deferred). Run manually in the Supabase SQL editor, per the
001–009 convention.

- Use **`ADD CONSTRAINT … NOT VALID`** so the constraint applies to *new* writes
  without failing on any pre-existing out-of-range dev rows; optionally
  `VALIDATE CONSTRAINT` later once data is known clean.
- `jsonb` columns (`users.profile`, `injuries.recovery_log`,
  `reassessments.answers`) can't easily get nested CHECKs — their internals stay
  enforced by Layer 1; the migration covers the scalar columns.

## Representative rules (all live in `rules.js`, tunable)

| Field | Rule |
|---|---|
| `age` | integer 13–120 |
| `bodyweight_kg` | 30–300 |
| `lifts.squat/bench/deadlift` | 0–500 (kg) |
| `daysPerWeek` | integer 1–7 |
| `sessionMinutes` | one of {20,30,45,60,75,90} |
| `quality`/`energy`/`recovery`/`soreness`/`mood` | integer 1–5 |
| RPE | 1–10 |
| `injury.severity` | integer 1–5 |
| `resting_hr` | 30–220 |
| `hrv_ms` | 1–400 |
| `spo2_pct` | 50–100 |
| `sleep_score` | 0–100 · `sleep_duration_min` 0–1440 |
| enums (`goal_type`, `strength_style`, `sport`, `experience`, `equipment[]`, `injury.status`, `rehab_phase`, body region/diagnosis) | whitelisted to existing UI values |
| `name` | trim, ≤ 80 chars |
| `injury.title` | trim, ≤ 120 chars |
| `notes`/`description`/`rehab_plan`/`recovery_log[].*` | trim, ≤ 2000 chars |
| `profile.avatar.url` | must be `data:image/*` or an `https:` URL on our Supabase storage host; otherwise dropped (closes the delta-review note) |

Empty/optional fields (`'' `/`null`) remain allowed — these are optional inputs,
matching today's `numOrNull` behaviour.

## Testing

- New `tests/validation.js` (node, matching the `node tests/*.js` convention):
  valid payload passes; out-of-range number → `ok:false` with a message; over-long
  text → trimmed in `value`, `ok` stays true; unknown enum → `ok:false`; junk
  `avatar.url` → dropped.
- Manual: `npm run dev` still runs; a normal onboarding + a session-complete + a
  daily-metric save still persist; entering a 1–5 rating of 50 shows the inline
  message and does not save.

## Out of scope (YAGNI)

- Rolling validation into all ~23 screens (the four risk paths first; the rest
  reuse the rulebook later).
- Deep validation of free-form `reassessments.answers`.
- All other audit items (OAuth CSRF nonce/PKCE, CAPTCHA, CSP, avatars bucket MIME
  limit, etc.) — separate follow-ups in the audit's P1–P3 list.
- Adopting `zod`.

## Affected files

- **New:** `src/lib/validation/rules.js`, `src/lib/validation/validate.js`,
  `supabase/migrations/010_validation_constraints.sql`, `tests/validation.js`.
- **Edited:** `src/stores/trainingStore.js` (the 4 target actions);
  `src/components/OnboardingWizard.jsx`, `src/screens/SessionDetail.jsx`,
  `src/screens/Injuries.jsx`, and whichever screen calls `upsertDailyMetric`
  (to be confirmed during implementation) — all for inline error display. No
  change to `SyncService.js`/`Database.js` write internals beyond receiving
  already-normalised payloads.
