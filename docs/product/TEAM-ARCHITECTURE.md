# Team Package — Architecture & Data-Isolation Blueprint

> **STATUS: PLANNED — not built.** The current app is the **Individual** package only
> (`apps/mobile`). This document is the blueprint a future session should build the Team
> package *toward*. It is the recommended target, not a description of existing code.
> Vision context: [../strategy/VISION.md](../strategy/VISION.md). Binding guardrails are
> also summarised in the repo-root `CLAUDE.md` ("TEAM DATA ISOLATION").

The team package wraps the **same decision engine** for a squad across two surfaces, with
**player privacy as a hard architectural constraint** — not a feature bolted on later.

## Surfaces

| Surface | Lives in | Who | Notes |
|---|---|---|---|
| **Player app** | `apps/mobile` (today's React + Vite PWA) | Each player | Gets **exactly** the individual experience — their own tailored, adapting plan. |
| **Coach dashboard** | `apps/web` (Next.js; reserved, not built) | The coach | Squad overview, team schedule entry, plain-English loading view. |

Both talk to the **same Supabase backend** (`supabase/` at the repo root). The coach surface
is web-first because it's a desktop, overview-oriented job; players are mobile-only.

## Team schedule → constraints into each player's plan

The coach owns the team's **fixed schedule**: matches, and pitch / pool / track / gym
sessions the whole squad must do. These become **constraints** on each player's generated
plan, so gym work is scheduled *around* sport load instead of colliding with it (e.g. no
heavy lower-body session the day before a match; deload the squad in a congested fixture
week).

**Where this hooks in — do NOT rewrite the pure generator.** `generatePlan()` in
`apps/mobile/src/lib/PlanGenerator.js` must stay pure (same profile → same plan). Team
constraints belong in the layers that already shape *scheduling and load*, not exercise
selection:

- **`apps/mobile/src/lib/plan/scheduler.js`** — lays sessions onto weekdays. Team fixtures
  and sport sessions become blocked/avoided days and hard anchors here.
- **`apps/mobile/src/lib/PlanService.js`** — the runtime reflow already adapts the current
  week around what's been done + readiness + ACWR. A team-schedule input is another
  constraint this layer reflows around (e.g. force/relax a deload for a fixture week).

Treat the team schedule as an extra **input** to these layers, the same way readiness and
training-load already are. The engine's evidence base is untouched.

## Coach overview — reuse what exists, translate to plain English

The coach's "is the squad doing too much / too little?" view should be built on the
**existing** signals, aggregated per player and rolled up to the team — not a new analytics
stack:

- `apps/mobile/src/lib/plan/trainingLoad.js` — acute/chronic load + **ACWR** + `loadDecision`.
- `apps/mobile/src/lib/Readiness.js` — the readiness score.
- `apps/mobile/src/lib/verdicts.js` — the rule-based layer that turns numbers into plain
  English. The coach view is a **team-level verdicts surface**: extend this vocabulary, don't
  reinvent it.

## Data model (TARGET — illustrative, needs a versioned migration)

Two new tables extend the existing single-tenant schema (every current table is
`user_id`-keyed with RLS `auth.uid() = user_id`). See `supabase/schema.sql`.

```
teams
  id          uuid pk
  name        text
  sport       text
  season      text                  -- in-season | off-season | …
  schedule    jsonb                 -- fixtures + recurring sport sessions (the constraints)
  created_by  uuid → users(id)      -- the founding coach
  created_at / updated_at / deleted_at

team_members
  id        uuid pk
  team_id   uuid → teams(id)
  user_id   uuid → users(id)
  role      text                    -- 'coach' | 'player'
  status    text                    -- 'invited' | 'active' | 'left'
  unique (team_id, user_id)
```

## Data isolation — the security spine (READ THIS BEFORE BUILDING)

The rule from the product owner is explicit and non-negotiable:

> Players see only their own data. A coach sees plan + adherence, **derived** load &
> readiness, and injury status/availability — **never raw wearable/health vitals**. Raw
> HRV / sleep / resting-HR roll *up* into readiness/load; the coach never sees the
> underlying numbers.

This produces a clear, enforceable design:

1. **All existing per-user tables stay owner-only — unchanged.** Especially
   **`daily_metrics`** (raw vitals) and **`wearable_readings`**: keep the current
   `auth.uid() = user_id` policy. **A coach gets NO row access to these.** Do not add a coach
   policy to the raw health tables.

2. **Expose a derived, coach-readable surface instead.** Add one **derived** table — e.g.
   `player_status` — that holds *only* what a coach is allowed to see, computed from the raw
   data but never containing it:

   ```
   player_status        -- one current row per player per team
     user_id   uuid → users(id)
     team_id   uuid → teams(id)
     readiness        int      -- derived score only (not the vitals behind it)
     load_state       text     -- e.g. 'balanced' | 'ramping' | 'overreaching' (from ACWR)
     acwr             numeric
     adherence_pct    numeric  -- completed vs prescribed
     injury_status    text     -- 'available' | 'modified' | 'out'  (NOT the private notes)
     updated_at       timestamptz
   ```

   The player's own client (via SyncService) writes this roll-up; the raw vitals that feed it
   never leave the owner-only tables. (Hardening option for later: compute it server-side in
   an Edge Function so players can't tamper with their own status.)

3. **RLS on the derived surface only** — `own rows OR a coach of this player's team`:

   ```sql
   -- SECURITY DEFINER avoids RLS recursion on team_members
   create function is_coach_of(target uuid) returns boolean
   language sql security definer stable as $$
     select exists (
       select 1
       from team_members coach
       join team_members member on member.team_id = coach.team_id
       where coach.user_id = auth.uid() and coach.role = 'coach'
         and member.user_id = target
     );
   $$;

   create policy "player or their coach" on public.player_status
     for select using (auth.uid() = user_id or is_coach_of(user_id));
   ```

   Players still can never see each other — only a coach, and only within their own team.

4. **Sensitive free-text stays private.** Injury *descriptions, rehab notes, recovery logs*
   in `injuries` stay owner-only. The coach sees **status/availability** (via `player_status`),
   not the private detail.

5. **Standing rules still apply.** Any cross-user access goes through deliberate, **tested**
   RLS that *extends* `auth.uid() = user_id`. **Never** ship the `service_role` key to the
   browser. **Never** change the schema without a versioned migration in `supabase/migrations/`.
   Add RLS tests for the new policies before relying on them.

## Suggested build order (first sub-steps)

1. **Data + RLS spine first:** `teams` + `team_members` + `player_status` + `is_coach_of()`
   in a versioned migration, with RLS tests proving a coach can read their team's derived
   status and **cannot** read another team's, **cannot** read anyone's raw vitals, and
   players can't see each other.
2. **`apps/web` scaffold** — the coach dashboard shell (auth + team list).
3. **Team schedule entry** in the coach app → persisted on `teams.schedule`.
4. **Constraints into the engine** — feed `teams.schedule` into `scheduler.js` /
   `PlanService.js` so player plans avoid sport-load clashes.
5. **Coach loading overview** — aggregate `player_status` into a team verdicts view built on
   the existing `verdicts` + ACWR vocabulary, in plain English.
