App Overview:
A dynamic, personalised gym-plan generator. From a short onboarding
questionnaire it builds a multi-week, periodised strength programme tailored to
each user's OWN goal — getting stronger, building muscle, functional fitness, or
strength support for a sport they train (running, cycling, swimming). The target
user is a busy person who wants to trust they're getting the best possible
training for their goal and the time they have. It tracks training sessions,
weekly check-ins, daily recovery metrics, and injuries, and reassesses at the end
of each training block. It's a PWA today; the long-term aim is an AI-coached
native iOS app.

Scope note (important): the engine is GYM-ONLY today. When a user picks a sport,
it biases the gym programming (per-muscle emphasis, priority lifts, periodisation
season) to SUPPORT that sport — it does NOT yet generate endurance/aerobic
sessions (actual run/cycle/swim workouts). Users currently do their own sport
training (wearables track it). Programming real endurance sessions is a planned
future stage, not current scope. The user's onboarding goal drives the training —
no goals are hard-coded into the app.

The long term aim of this app is to be an app that is designed to be a fitness companion where it can react to daily life in adjusting workout programming and regime based on dynamic goals and time available. It should create detail from initial input, with AI learning integrated to adjust the plan. Wearable integration will provide data from workouts to determine how hard each user is working, injuries, illness, and ability to meet the plan, and adjust to maximise a persons ability to reach their goals.

The user (Simon) is a beginner coder. Explain changes in plain language. Give
context for why, not just what. Don't assume prior technical knowledge.

Tech Stack & Structure:
React 18 + Vite (build tool, dev server)
React Router 6 (navigation)
Zustand 5 (state)
Supabase (Postgres + Auth) — online-first sync
localStorage (offline cache + fallback)
Deployed to GitHub Pages via GitHub Actions on push to main
Base path: /hybrid-react/

Where things live

src/screens/ — one file per screen (19 screens)
src/components/ — shared shell: TopBar, TabBar, ScreenContainer
src/lib/ — data layer: Database.js, Storage.js, SyncService.js,
supabaseClient.js, Utils.js, SessionHelper.js
src/stores/ — trainingStore.js (app data), authStore.js (auth session)
src/data/ — Plan.js (52-week plan content), activityTypes.js (registry)
src/styles/main.css — all styles
supabase/ — schema.sql, runbook
docs/SCHEMA.md — human-readable data model summary

How data flows (IMPORTANT)
Screens → trainingStore (Zustand) → SyncService → Supabase (primary)
↘ Database.js / localStorage (cache)

WRITES go through SyncService. It writes to Supabase first (when signed in),
then updates localStorage. Falls back to localStorage if offline.
READS go through the store's buildView(), which reads localStorage directly
for instant rendering.
On sign-in, the store's syncFromCloud() pulls all rows from Supabase.

Hard rules — do not break these

NEVER commit .env.local. It holds Supabase keys. It is gitignored.
NEVER put the Supabase service_role key in app code. Only the anon key
belongs in the browser, protected by Row Level Security.
ALL data writes go through SyncService (via the store actions). Never write
to Database.js directly from a screen.
Use the REAL theme variables, never invented ones:
USE:   --bg-surface, --bg-surface-2, --txt-strong, --txt-muted, --txt-body,
--hairline, --rust, --moss, --ochre, --shadow-sm, --shadow-md
NEVER: --card-bg, --border, --accent-bg  (these don't exist; they cause
broken colours in dark/auto mode — this bug has recurred 3 times)
Don't rewrite Database.js. It's stable and tested; other code depends on
its synchronous API. SyncService wraps it.
Don't change the Supabase schema without a versioned migration.
The app must still run (npm run dev) at the end of every change.

Workflow rules

Test with npm run dev before committing.
Commit in small, described steps. Tag milestones with git tag.
Review every diff before committing.
Theme variables, RLS (auth.uid() = user_id), and the store→Sync→Supabase
path are the three things most likely to cause silent failures. Check them
first when something "doesn't save".

Known issues / current state

Sync layer (SyncService) is newly built and lightly tested. Sessions and
weekly check-ins sync; injuries, daily metrics, and reassessments are wired
but not independently verified end-to-end.
Session D (one-time migration of existing localStorage data into Supabase)
is NOT done yet. Real training history may still live only in localStorage.
Run-type sessions render under the Strength column layout (acceptable for
now; add a run entry to activityTypes.js to fix properly).
AI features (virtual physio, AI plan adjustment, quarterly AI assessment)
are PLACEHOLDERS only. Real AI is Stage 5 and needs a server-side Edge
Function holding the API key — never call Claude with a key in the browser.
Apple Sign-In, HealthKit, push notifications, native app = Stage 6, future.

Roadmap (for context)
Stage 3 (current): Supabase backend + auth + sync. Sessions A-C done; D pending.
Stage 4: richer auth.
Stage 5: Claude AI plan generation via Supabase Edge Function.
Stage 6: React Native / Expo native iOS app + HealthKit + App Store.

