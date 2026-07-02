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

Product North Star:
The platform opens ELITE strength & conditioning to clubs, teams, and people who
can't afford an elite S&C coach. It ships as two packages:
1. INDIVIDUAL — what exists today: one person onboards and gets a tailored plan,
   no external oversight.
2. TEAM (the near-term priority, NOT built yet) — a player-facing mobile app
   (apps/mobile, same treatment as an individual) PLUS a coach-facing web dashboard
   (apps/web). The coach supplies the team's fixed schedule (matches, pitch / pool /
   track sessions) as CONSTRAINTS that feed each player's plan so gym work doesn't
   clash with sport load, and gets a plain-English view of team recovery + loading
   ("doing too much / too little") aimed at coaches who are NOT S&C specialists.
Full vision: docs/strategy/VISION.md. Team build blueprint + the data-isolation
rules that protect player data: docs/product/TEAM-ARCHITECTURE.md.

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

Monorepo — npm workspaces. Run `npm run dev` / `npm run build` from the REPO ROOT
(they delegate to apps/mobile). Top level:
  apps/mobile/ — the app today (React + Vite PWA; the Individual package + the player surface)
  apps/web/ — RESERVED: coach dashboard + marketing site (Next.js; not built yet)
  packages/engine/ — the EXTRACTED decision engine (`@performance-os/engine`): the pure
    generatePlan pipeline + the sport-knowledge / injury / recovery / load knowledge and
    science data tables. apps/mobile consumes it as a workspace dependency. (packages/shared/
    is still reserved/empty.)
  supabase/ — schema.sql, migrations, edge functions, runbook (shared backend, at the root)
  docs/ — SCHEMA.md, decision-engine-evaluation.md, SECURITY-AUDIT.md, strategy/, product/, prompts/,
    *** FROZEN GOVERNANCE SET (v1.0, 2026-07-01) — do NOT edit as routine work: the Constitution,
    Decision Ontology, Knowledge Architecture (foundation/), the EDS (engine/00), and the TAS
    (architecture/TAS.md). They are the authoritative baseline; new work is VALIDATED AGAINST them,
    never modifies them. Changing one = a deliberate, versioned amendment (Constitution → Amendment
    & Stewardship), reviewed + reconciled across the set. ***
    foundation/ — the PLATFORM-LEVEL governing framework, ABOVE the engine spec: CONSTITUTION.md
    (immutable Articles — the ultimate tie-breaker), DECISION-ONTOLOGY.md (canonical vocabulary),
    KNOWLEDGE-ARCHITECTURE.md (how knowledge is structured, not hard-coded), PANEL-REVIEW.md,
    README.md (index + the governance stack). Validate any new feature/algorithm/schema against
    these BEFORE building.
    architecture/ — the TECHNICAL blueprint (TAS.md, FROZEN): how the software is BUILT to implement
    the governing docs — the six-layer architecture, the pure-engine boundary + public API, knowledge/
    data flow, the two learning systems, the AI seam. Every engineering decision validates against it.
    architecture/ ALSO holds the two Sprint-1/2 planning docs (NOT frozen — the LIVING REBUILD PLAN,
    derived from and validated against the frozen set):
      • BASELINE-ARCHITECTURE-ASSESSMENT.md — the observational baseline: what exists today, how
        coaching decisions are actually made, knowledge + data-flow catalogues, alignment vs the
        frozen set, technical debt, what to preserve / replace / remove.
      • MIGRATION-BLUEPRINT.md — the master rebuild plan: the future decision chain, the D1–D16
        decision catalogue, current→future mapping, knowledge migration, the target module map, the
        migration WAVES (W0–W11) + an executable SPRINT BACKLOG (Sprint 0–12), traceability + a
        six-lens review. START engine-rebuild work from its Part 8 backlog (next up: "Sprint 0 —
        Safety net & CI gate" = fix the broken `npm test` + add a CI test gate).
    engine/ — the FOUNDATIONAL engine spec set (how the engine reasons, BENEATH the Constitution):
    docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md (the EDS) + 01-PANEL-REVIEW, 02-REFACTOR-ROADMAP,
    03-SPORT-KNOWLEDGE-BASE, 04-PHYSIOLOGICAL-FRAMEWORK, 05-INDEX-LAYER-FOLLOWUPS. The EDS is the
    reference for any engine feature/refactor/fix. Index + the foundational-vs-running distinction:
    docs/engine/README.md. (This CLAUDE.md and HANDOFF.md are the RUNNING docs — they track current
    status against those foundational targets.)
  HANDOFF.md — current state of play (keep updated at the end of each session)

Inside apps/mobile/ — NOTE: every `src/...` path elsewhere in this doc is relative to here:
  src/screens/ — one file per screen (~23, plus the auth/ subdir)
  src/components/ — shared shell (TopBar, TabBar, ScreenContainer) + ui/ primitives
  src/lib/ — app-side data + runtime layer: Database.js, Storage.js, SyncService.js,
    supabaseClient.js, PlanService.js (wraps the engine + runs the adaptive reflow),
    sessionOverrides.js, verdicts.js
  NOTE: the PURE decision engine has MOVED OUT to packages/engine (`@performance-os/engine`) —
    see the next section.
  src/stores/ — trainingStore.js (app data), authStore.js (auth session)
  src/data/ — APP-side data tables: activityTypes.js (session-table column registry),
  strengthStandards.js (1RM/BW display bands), exerciseLibrary.js (form-guide content for the ⓘ
  guide — text how-to/cues, matched by name; NOT a competing exercise catalogue), athletePillars.js
  (Atlas), providers.js (wearable providers), sports/.
  NOTE: the ENGINE's science tables — strengthExercises.js, muscleVolume.js (MEV/MAV/MRV landmarks),
  rehabExercises.js, injuryTaxonomy.js — live in packages/engine/src/data, NOT here. (There is no
  exerciseDemos.js — the ⓘ guide shows a "form video coming soon" placeholder.)
  src/styles/main.css — all styles (dark-only "Midnight" design system)

The decision engine (core — generates the gym plan)

LOCATION: the pure engine now lives in packages/engine/src/lib/ (the `@performance-os/engine`
package). The `src/lib/...` and `src/data/...` paths in THIS section are relative to
packages/engine/ — NOT apps/mobile/. Only PlanService.js (the runtime wrapper) stays in
apps/mobile/src/lib/. The GOVERNING design for everything below is the foundational spec set in
docs/engine/ — start with the EDS (00-ENGINE-DESIGN-SPECIFICATION.md).

generatePlan(profile) in packages/engine/src/lib/PlanGenerator.js is a PURE function — the same
profile always produces the same plan. Pipeline:
- resolveProgram (src/lib/strength/program.js) — goal → style, per-muscle emphasis,
  volume scalar, exercise-priority list.
- resolvePeriodization (src/lib/plan/periodization.js) — block length, phase split,
  deload weeks.
- weeklyMuscleTargets (src/lib/strength/targets.js) — MEV→MAV volume ramp per muscle.
- allocateGym (src/lib/plan/allocator.js) — greedy fill: pattern anchors, deficit
  pay-down, weekly MRV ceiling, supersets, rep/RPE scheme, session titles + durations.
- scheduler (src/lib/plan/scheduler.js) — lays the sessions onto weekdays.

PlanService.js wraps the engine for screens (getPhases/getPhase/getWeek) and runs the
adaptive RUNTIME reflow: the CURRENT week reflows around what's actually been done +
readiness + training-load (ACWR), including adaptive deloads (force/defer). The pure
generator is never mutated. Volume accounting lives in src/lib/plan/volume.js +
src/data/muscleVolume.js; injuries filter sessions via src/lib/injury/.

Try it: the /dev route (DevPlayground) generates a plan from any onboarding answers
with a live actual-vs-target volume readout. Engine tests: node tests/*.js.

The Athlete Model (Sprint 3): the athlete representation every FUTURE coaching decision reads —
packages/engine/src/lib/athlete (schema + field-registry justification gate + validation + builder)
and packages/engine/src/lib/performance (capability-per-physical-quality with confidence), fed by
packages/engine/src/data (qualities/adaptations/priors/training-age bands), with adapters that
round-trip to today's engine input (proven byte-identical by apps/mobile/tests/athlete-adapter-golden-master.js).
App-side apps/mobile/src/lib/AthleteModelService.js persists it (versioned) at users.profile.athlete_model
and Onboarding.jsx dual-writes it alongside the legacy profile — the live plan generator is UNCHANGED
(parallel, proven by tests). Design: docs/superpowers/specs/2026-07-01-athlete-model-design.md; tech
doc: docs/architecture/ATHLETE-MODEL.md. NOT yet built: the revised onboarding question wording (Plan 2).

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
TEAM DATA ISOLATION (binding once the Team package is built). Players see ONLY
their own rows. Coach access is ADDITIVE and TEAM-SCOPED — a coach can read their
own team's players, never another team's; players can never see each other. RAW
wearable/health vitals (daily_metrics health columns, wearable_readings) are NEVER
readable by a coach: they roll UP into a derived readiness/load signal, and the
coach sees only that derived signal + plan/adherence + injury status/availability —
never the underlying HRV / sleep / resting-HR. Any cross-user access goes through
deliberate, tested RLS that EXTENDS auth.uid() = user_id (never service_role in the
browser). Design + RLS pattern: docs/product/TEAM-ARCHITECTURE.md.
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
The five governing documents are FROZEN (v1.0). Do NOT edit the Constitution, Decision Ontology,
Knowledge Architecture (docs/foundation/), the EDS (docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md),
or the TAS (docs/architecture/TAS.md) as part of routine work. They are the authoritative baseline
every feature/algorithm/schema is validated against; changing one is a deliberate, versioned
amendment (per the Constitution's Amendment & Stewardship section), reviewed and reconciled across
the whole set — never an inline edit during feature work.
The app must still run (npm run dev) at the end of every change.

Workflow rules

Test with npm run dev before committing.
Commit in small, described steps. Tag milestones with git tag.
Review every diff before committing.
Theme variables, RLS (auth.uid() = user_id), and the store→Sync→Supabase
path are the three things most likely to cause silent failures. Check them
first when something "doesn't save".

Known issues / current state

Decision engine is mature + evidence-based — exhaustively evaluated 2026-06-21
(docs/decision-engine-evaluation.md). Shipped: weekly MRV ceiling, real event taper
(keeps intensity, cuts volume), adaptive deloads (fatigue/ACWR-driven), sport-specific
session anchors, honest durations. It is GYM-ONLY — sport selection biases the gym
plan; it does not yet program run/cycle/swim sessions (a future stage).

ENGINE RE-SEATING (planned, not started — the current major direction). The engine today is a
VOLUME-FIRST gym planner (it computes per-muscle set targets, then fills them). The frozen governing
set defines a DIAGNOSIS-FIRST coaching engine that reasons in physical qualities/adaptations, with
muscle-volume as a downstream ledger. The precise gap + the phased, executable path from one to the
other live in docs/architecture/BASELINE-ARCHITECTURE-ASSESSMENT.md (where we are) and
MIGRATION-BLUEPRINT.md (how we get there — begin at its Part 8 "Sprint 0: safety net & CI gate").
It's a RE-SEATING, not a rewrite: the pure engine + golden-master, the injury system, the SKB, and
freeze-on-commit are preserved. See HANDOFF.md for the current sprint pointer.
Sync layer (SyncService) handles sessions, weekly check-ins, injuries, and daily
metrics; the store is offline-first (instant local write, background cloud sync).
Wearable + training-load (Strava ingest → HR zones → ACWR → plan adaptation) is live.
AI features (virtual physio, AI plan adjustment, quarterly AI assessment) are
PLACEHOLDERS only. Real AI is a later stage and needs a server-side Edge Function
holding the API key — never call Claude with a key in the browser.
Apple Sign-In, HealthKit, push notifications, native app = a later stage, future.

Roadmap (for context)
Stage 3 (DONE): Supabase backend + auth + sync; wearable + training-load (ACWR);
gym decision-engine rebuild + hardening; "Midnight" dark UI.
Stage 4 (DONE): richer auth — Apple/Google OAuth, open signup, per-user cache isolation.
Stage 4.5 (DONE): monorepo restructure — app → apps/mobile, npm workspaces, apps/web +
packages/{shared,engine} reserved, supabase/ at root (2026-06-22).
Stage 5 (NEXT — current priority): TEAM PACKAGE — coach-facing web (apps/web) alongside
the existing player mobile (apps/mobile). The coach's team schedule becomes constraints on
each player's plan; a plain-English team-loading overview reuses the existing verdicts +
training-load (ACWR) layer; a teams/team_members data model with additive, privacy-preserving
RLS keeps raw vitals private (see docs/product/TEAM-ARCHITECTURE.md).
Stage 6: Claude AI plan generation/adjustment via a Supabase Edge Function — the
deterministic engine + the loadDecision/deloadRecommendation signals are clean inputs an
AI layer can consume or override behind PlanService (never call Claude with a key in the browser).
Stage 7 (future): real endurance session programming (run/cycle/swim workouts);
React Native / Expo native iOS app + HealthKit + App Store.

