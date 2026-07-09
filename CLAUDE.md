# CLAUDE.md — the operational handbook

This file is the operating context for every session. Read it, then read
`HANDOFF.md` (current state + open queue). Everything else is reachable through
`docs/DOCUMENTATION-INDEX.md`.

The user (Simon) is a beginner coder. Explain changes in plain language. Give
context for why, not just what. Don't assume prior technical knowledge.

## App overview

A dynamic, personalised gym-plan generator. From a short onboarding
questionnaire it builds a multi-week, periodised strength programme tailored to
each user's OWN goal — getting stronger, building muscle, functional fitness,
olympic weightlifting, or strength support for a sport they train (running,
cycling, swimming, triathlon, rugby, soccer, GAA, hurling, field hockey). It
tracks training sessions, weekly check-ins, daily recovery metrics, and
injuries, and reassesses at the end of each training block. It's a PWA today;
the long-term aim is an AI-coached native iOS app.

Product North Star: the platform opens ELITE strength & conditioning to clubs,
teams, and people who can't afford an elite S&C coach. Two packages:
1. INDIVIDUAL — live: one person onboards and gets a tailored plan.
2. TEAM — the data spine is LIVE on prod (teams/team_members/player_status with
   privacy-preserving RLS) and the coach web dashboard (apps/web) is gated and
   wired to live player status. Still to come: the coach's team schedule as
   CONSTRAINTS feeding each player's plan. Coaches see derived readiness/load
   signals only — never raw vitals.
Full vision: docs/strategy/VISION.md. Team blueprint + binding data-isolation
rules: docs/product/TEAM-ARCHITECTURE.md.

Scope note: the engine is GYM-ONLY today. A user's sport shapes the gym
programming (via the Sport Knowledge Base: emphasis, priority patterns,
season-phased periodisation) to SUPPORT the sport — it does NOT yet generate
endurance/aerobic sessions. That is a planned future stage. The user's
onboarding goal drives the training — no goals are hard-coded.

Long term: a fitness companion that reacts to daily life — adjusting programming
to dynamic goals and available time, with AI learning and wearable data
(effort, injury, illness, adherence) steering the plan toward each person's goal.

## Documentation governance (read before citing or writing any doc)

- **Precedence**: Constitution → Ontology + Knowledge Architecture → EDS / TAS /
  AIGAS → supporting references → working docs → reviews → archive. Higher wins.
  Full rules: docs/DOCUMENTATION-GOVERNANCE.md. Master map + owner of every
  concept: docs/DOCUMENTATION-INDEX.md.
- **The FROZEN set (v1.0, 2026-07-01)** — never edit as routine work:
  docs/foundation/CONSTITUTION.md (20 Articles — the tie-breaker),
  DECISION-ONTOLOGY.md, KNOWLEDGE-ARCHITECTURE.md,
  docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md (the EDS),
  docs/architecture/TAS.md. New work is VALIDATED AGAINST them, never modifies
  them. Changing one = a deliberate, versioned amendment (Constitution →
  Amendment & Stewardship), reconciled across the whole set. Frozen-doc defects
  go to the amendment queue (documentation audit §2), not inline fixes.
  docs/architecture/AIGAS.md governs all AI work (draft pending ratification).
- **Status lives in HANDOFF.md only.** Specs never carry "currently"/"not built
  yet" claims — that is how this repo's docs rotted before 2026-07-09. Reviews
  (docs/reviews/) are dated evidence, never current state.
- **Archive, never delete.** Superseded docs move to docs/archive/ (git mv) or
  get a dated banner if frozen docs/code reference their path.

## Philosophy (distilled from the frozen set — the originals win)

- **Engineering**: the reasoning core is pure and deterministic (Art 18); the
  same profile always produces the same plan; knowledge is data, separate from
  reasoning (Art 17) — adding a sport/exercise/rule is a data change, not a core
  edit; validation is a separable layer that disposes what construction proposes
  (Art 19); simplicity is a feature — complexity must earn its place (Art 20).
- **Coaching**: diagnosis precedes prescription; reason in physical qualities,
  not muscles (Art 5); adaptation is chosen before dose — volume is a guardrail,
  not a goal (Art 6); minimum effective intervention (Art 7); the gym serves the
  sport (Art 2); safety and recoverability override optimisation (Arts 8–9).
- **AI (AIGAS)**: the deterministic engine makes coaching decisions; AI
  interprets, communicates, analyses, augments — NEVER replaces the engine or
  the human. AI enters only through two seams (validated decision substitution;
  knowledge/priors), always behind D14 validation, never with a browser-held key.
- **Evidence**: confidence governs authority (Art 13) — contested science can
  never hard-gate; every recommendation must be explainable (Art 14); no silent
  truncation or debt (Art 15).

## Tech stack & structure

React 18 + Vite · React Router 6 · Zustand 5 · Supabase (Postgres + Auth,
online-first sync) · localStorage (offline cache) · GitHub Pages via Actions on
push to main (base path /hybrid-react/) · apps/web: Next.js.

Monorepo — npm workspaces. `npm run dev` / `npm run build` from the REPO ROOT
(delegate to apps/mobile). Top level:
- apps/mobile/ — the app today (React PWA; Individual package + player surface)
- apps/web/ — Next.js: config-driven marketing site + the coach dashboard
  (gated, live-wired to player_status; leads/analytics stubs await wiring)
- packages/engine/ — `@performance-os/engine`: the pure decision engine +
  knowledge/science data tables (packages/shared/ still reserved/empty)
- supabase/ — schema.sql, migrations (ledger: supabase/migrations/README.md —
  canonical), edge functions, SECURITY-DEPLOY.md runbook
- docs/ — governed per docs/DOCUMENTATION-GOVERNANCE.md; map in
  docs/DOCUMENTATION-INDEX.md
- HANDOFF.md — current state of play (update at the end of each session; history
  lives in docs/archive/)

Inside apps/mobile/ (paths below relative to here):
- src/screens/ — one file per screen (~25, plus auth/)
- src/components/ — shell (TopBar, TabBar, ScreenContainer) + ui/ primitives
- src/lib/ — app-side data/runtime layer: Database.js, Storage.js,
  SyncService.js, supabaseClient.js, PlanService.js (wraps the engine + runs the
  adaptive reflow), AthleteModelService.js, AiService.js (behind flags),
  sessionOverrides.js, verdicts.js, teamStatus.js, validation/, and more
- src/stores/ — trainingStore.js (app data), authStore.js (auth session)
- src/data/ — APP-side tables only: activityTypes.js, strengthStandards.js
  (display bands), exerciseLibrary.js (form-guide content for the ⓘ guide),
  metricGlossary.js, providers.js
- src/styles/main.css — all styles (dark-only "Midnight" design system)

The ENGINE's science/knowledge tables live in packages/engine/src/data — the
SKB (sport-knowledge/*.json — the SOLE source for every sport), exercise
catalogue + quality tags, muscle-volume landmarks (MEV/MAV/MRV), injury
taxonomy, rehab exercises, dose schemes, governed knowledge entries
(knowledge/entries.js, versioned as KNOWLEDGE_SET_VERSION).

## The decision engine (core)

The pure engine lives in packages/engine (governing spec: the EDS).
`generatePlan(profile)` in src/lib/PlanGenerator.js is PURE — same profile,
same plan (dates from profile.plan_start_date, never the clock).

It is DIAGNOSIS-FIRST end to end (since the build flip, 2026-07-07):

```
onboarding → Athlete Model (WHO) → Performance Model:
  capabilities × demandProfile → D4 limiting factors → D5 priority qualities
  → D9 session objective → D10 movement requirements
  → D11 intervention selection (value hierarchy, transfer-per-fatigue budget)
  → D12 dose by quality → scheduling → D14 validation (plan.meta.validation)
```

- Build goals run the discipline engine (get stronger → powerlifting; build
  muscle / functional → hypertrophy; olympic weightlifting first-class).
- Sport goals are steered by the SKB — all 11 sports, season-phased (off-season
  round-out ↔ in-season specific), season window derived from first/last game.
- Muscle-volume (MEV/MAV/MRV) is the downstream LEDGER/guardrail, not the driver.
- Injuries filter at selection (constraints-first) with the render-time filter
  as backstop; validators cap verdicts by knowledge confidence (Art 13).

PlanService.js (app-side) wraps the engine for screens and runs the adaptive
RUNTIME reflow: the current week reflows around what's been done + readiness +
training load, incl. adaptive deloads. The pure generator is never mutated.
Freeze-on-start: a STARTED session is pinned, never recomputed.

Try it: the /dev route (DevPlayground) generates a plan from any onboarding
answers with a live volume readout. Tests: `npm test` (CI-gated; golden master
re-baselined only deliberately via UPDATE=1, audited key-by-key).

## How data flows (IMPORTANT)

Screens → trainingStore (Zustand) → SyncService → Supabase (primary)
↘ Database.js / localStorage (cache)

WRITES go through SyncService (Supabase first when signed in, then
localStorage; falls back offline). READS go through the store's buildView()
(localStorage, instant). On sign-in, syncFromCloud() pulls from Supabase.

## Hard rules — do not break these

- NEVER commit .env.local (Supabase keys; gitignored).
- NEVER put the service_role key in app code. Only the anon key belongs in the
  browser, protected by Row Level Security.
- TEAM DATA ISOLATION (binding, live). Players see ONLY their own rows. Coach
  access is ADDITIVE and TEAM-SCOPED. RAW vitals (daily_metrics health columns,
  wearable_readings) are NEVER coach-readable — coaches get only the derived
  readiness/load signal + plan/adherence + injury availability. Cross-user
  access only via deliberate, tested RLS extending auth.uid() = user_id.
  Pattern: docs/product/TEAM-ARCHITECTURE.md; proofs: supabase rls-harness.
- ALL data writes go through SyncService (via store actions). Never write to
  Database.js directly from a screen. Don't rewrite Database.js (stable,
  synchronous API others depend on).
- Use REAL theme variables only:
  USE: --bg-surface, --bg-surface-2, --txt-strong, --txt-muted, --txt-body,
  --hairline, --rust, --moss, --ochre, --shadow-sm, --shadow-md
  NEVER: --card-bg, --border, --accent-bg (don't exist; this bug has recurred 3×).
- No Supabase schema change without a versioned migration + a row in the ledger
  (supabase/migrations/README.md).
- The frozen five are never edited inline (see Documentation governance above).
- The engine stays pure: no clock reads, no randomness, no I/O inside
  packages/engine plan generation.
- Never call an AI provider with a key in the browser — server-side Edge
  Function only (ai-render), behind the AIGAS gates.
- The app must still run (npm run dev) at the end of every change.

## Workflow — how work runs here

1. **Reason before coding.** Locate the decision you're touching in the D1–D16
   catalogue (EDS §20) and the concept's canonical doc (DOCUMENTATION-INDEX).
   Validate the approach against the Constitution/EDS/TAS BEFORE building.
   If it needs new knowledge, it's a data/knowledge-entry change, not core code.
2. **Sprints begin with**: superpowers:brainstorming → design spec
   (docs/superpowers/specs/YYYY-MM-DD-*-design.md, committed) → plan
   (docs/superpowers/plans/) → subagent-driven development → whole-branch
   review → PR. Specs/plans are immutable records once merged.
3. **Test with npm test + npm run dev before committing.** Commit small,
   described steps; review every diff. Golden-master changes must be intended,
   audited, and explained.
4. **Merges are Simon's** (deploys are consequential). Standing charter
   (2026-07-03): green, low-risk PRs may merge autonomously; HIGH-risk re-seats,
   coaching-philosophy calls, public-interface changes, and anything touching
   the frozen set PAUSE for Simon.
5. **Drift prevention**: status claims go in HANDOFF.md only; update HANDOFF +
   the DOCUMENTATION-INDEX at session end; run a docs staleness sweep after
   each major milestone (template: docs/reviews/2026-07-09-documentation-audit.md).
6. Debugging silent failures: theme variables, RLS (auth.uid() = user_id), and
   the store→Sync→Supabase path are the three usual suspects when something
   "doesn't save".

## Current state & roadmap

Current state, open queue, and invariants: **HANDOFF.md** (always the freshest).
Canonical stage map:
- Stages 3–4.5 (DONE): Supabase backend/auth/sync; wearables + training load
  (ACWR, demoted to soft input); Midnight UI; OAuth + open signup; monorepo.
- Stage 5 (CURRENT): TEAM package — spine + dashboard live; next: coach schedule
  → per-player plan constraints; plain-English team loading view.
- Stage 6: AI layer via Supabase Edge Function per AIGAS (seam built, flags OFF;
  needs eval harness + Simon's go-live).
- Stage 7 (future): real endurance programming; React Native/Expo iOS + HealthKit.
