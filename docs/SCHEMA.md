# Data model summary

Human-readable overview of the database. The authoritative SQL is in
`supabase/schema.sql`; the in-app mirror is the `SCHEMA` constant in
`src/lib/Database.js`. Keep all three in sync when the model changes.

## Core principle

Everything belongs to a user. Every table (except `users` itself) has a
`user_id` column. Row Level Security on Supabase enforces `auth.uid() = user_id`,
so a signed-in user can only ever see or change their own rows. The `users`
table keys on `id`, which equals the Supabase auth user id.

Every table has `created_at`, `updated_at`, and `deleted_at` (soft delete —
rows are marked deleted, not physically removed, so sync stays consistent).

## Tables (12)

**users** — one profile row per account, 1:1 with Supabase auth.
Key fields: `name`, `email`, `profile` (jsonb), `settings` (jsonb: units, theme,
default pool length). A trigger auto-creates this row on signup; signup is gated
by the `allowed_emails` invite list.
`profile` jsonb holds: `age`, `bodyweight_kg`, `sex`, and the onboarding capture —
`onboarded` (bool), and the strength-focused GOAL model: `goal_type`
('build' | 'sport'), `strength_style` ('strength' | 'bodybuilding' | 'functional',
when build), `sport` ('run' | 'cycle' | 'swim', when sport) + `sport_season`
('in' | 'off'). Plus `experience{ gym: level }`, `availability{ days_per_week,
session_minutes, days[] }`, `access[]` (equipment keys), `lifts{}` (optional 1RMs),
`markers` (free text). `focus` is now always `['gym']` (the plan is always a gym
plan; a supported sport biases the strength program). Legacy fields
(`height_cm`, ranked `goals[]`, `run_goal`, `swim_goal`, `pool_length_m`,
`long_run_day`) may persist on older rows but are no longer captured or used.

**training_plans** — a user's plan(s).
Key fields: `name`, `start_date`, `target_end_date`, `status`
(active/paused/completed/archived), `template_ref`.

**phases** — the 5 macro phases of a plan.
Key fields: `plan_id`, `order`, `week_range_start/end`, `status`, timestamps.

**weeks** — individual weeks within a phase.
Key fields: `phase_id`, `week_number`, `week_in_phase`, `deload` (bool),
`status`.

**sessions** — individual training sessions.
Key fields: `week_id`, `template_ref` (e.g. "p1_wk5_s0" — links plan content to
saved state), `status` (pending/in_progress/completed/skipped), `started_at`,
`completed_at`. This is the most-written table.

**session_logs** — how a completed session actually went.
Key fields: `session_id`, `quality`, `energy`, `recovery` (each 1-5),
`duration_sec`, `notes`.

**weekly_checkins** — the weekly self-report.
Key fields: `week_ending` (date), `bodyweight_kg`, `resting_hr`, `avg_rpe`,
`sleep_score`, `knee_rating`, `notes`.

**reassessments** — quarterly review answers.
Key fields: `quarter_number`, `period_end`, `answers` (jsonb: question id → text).

**daily_metrics** — one row per day; the Fitbit-ready recovery snapshot.
UNIQUE on (user_id, date) so syncing the same day updates instead of
duplicating. Key fields: `source` (manual/fitbit), `resting_hr`, `hrv_ms`,
`breathing_rate`, `spo2_pct`, `skin_temp_variation_c`, sleep fields
(duration/score/deep/rem/light/awake), `readiness_score`, `steps`,
`active_minutes`, `calories_out`, and subjective `energy`/`soreness`/`mood`
(1-5) + `notes`. This is what the AI reads for daily readiness.

**injuries** — injury log + rehab tracking.
Key fields: `body_part`, `title`, `description`, `severity` (1-5), `status`
(active/rehabbing/recovered/monitoring), `date_occurred`, `date_recovered`,
`rehab_plan`, `rehab_plan_source` (self/physio/ai), `physio_approved` (bool),
`affected_activities` (jsonb array of activity-type keys), `recovery_log`
(jsonb array of {date, note, response}), `prevention_notes`, `ai_generated`.
Supports the future "virtual physio" pipeline.

**wearable_readings** — per-workout data (distinct from daily_metrics).
Key fields: `source` (strava/garmin/manual), `recorded_at`, `workout_type`,
`metric`, `value`, `unit`, `raw` (jsonb). For Strava workout detail later.

**ai_recommendations** — placeholder for AI suggestions (Stage 5+).
Key fields: `context` (session/week/phase/recovery), `model`, `recommendation`,
`confidence`, `accepted`, `user_response`.

## Relationships

users → training_plans → phases → weeks → sessions → session_logs
users → weekly_checkins, reassessments, daily_metrics, injuries,
        wearable_readings, ai_recommendations (all directly user-owned)

## Sync notes

- Local (localStorage) uses camelCase table keys (e.g. `weeklyCheckins`);
  Supabase uses snake_case (`weekly_checkins`). SyncService maps between them.
- Online-first: writes hit Supabase first, then localStorage cache. On sign-in,
  the store pulls all rows from Supabase into the local cache.
- Deletes are soft (`deleted_at` set); sync filters these out on pull.
