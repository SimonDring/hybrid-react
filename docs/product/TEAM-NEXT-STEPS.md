# Team Package — next steps + open decisions (2026-07-05)

The Team **foundations are built and secured**: the `teams`/`team_members`/`player_status`
spine is live on prod; the player-side roll-up writes the derived board; the board is
now **server-authoritative** for the safety fields (injury_status/readiness — S11) and
carries a **server-derived display_name** (20260709); the coach dashboard is **gated**
(S12, `apps/web/proxy.ts`). What's left to make it a usable product needs a few product
decisions — laid out here so they can be made quickly and executed.

## 1. Team founding + invite flow — DONE (join codes)
> Coach founds a team at `/get-started` (web, outside the coach-gate) and shares a 6-char code;
> a player enters it in the mobile app (`/settings/teams`). RPCs create_team/join_team_with_code/
> rotate_team_code (migration 20260710); harness 75/75. Original decision notes below (for history).

### (original decision — resolved: join codes)
A coach must be able to create a team and add players. The RLS already supports it
(a coach founds a team + bootstraps their own coach row; a coach manages the roster;
a player accepts by setting their own membership `status`). Open decisions:

- **Where does founding live?** The coach dashboard (`apps/web`) is the natural home
  (coach-facing), but the mobile app could also host it. *Recommendation: web dashboard.*
- **How are players invited?** Options:
  a. **By email** — the coach enters an email; we insert a `team_members` row with an
     `invited` status. But `team_members.user_id` is a FK to `users`, so the invitee must
     already have an account. Needs either an "invite pending signup" table keyed by email
     (resolved on the invitee's next login), or restricting invites to existing users.
  b. **By join code** — the coach shares a code; a player enters it in the mobile app to
     self-add (needs an RPC that inserts their own `team_members` row for a valid code).
     *Simpler; no email resolution; recommended for v1.*
- **Acceptance** — a player sees pending invites / enters a code in the mobile app, then
  their roll-up starts populating the coach's board.

## 2. Wire the coach dashboard to LIVE player_status — DONE (PR #123)
> The dashboard reads the live spine behind the S12 gate: `lib/liveBoard.ts` (server
> component; coach's own RLS session; errors THROW rather than render a lying empty
> board; status rows reconciled against the active roster; soft-deleted teams skipped)
> + `lib/liveDerive.ts` (pure: the seven coach-safe fields → RAG status, plain-English
> reasons, confidence). **Decision resolved**: the board renders ONLY the coach-safe
> surface; history/schedule panels are honest empty states until their feeds exist; a
> zero-player board leads with the join code; the web adopted the DB load_state
> vocabulary. The mock squad chain is deleted. Spec:
> `docs/superpowers/specs/2026-07-05-live-coach-board-design.md`.
> Follow-ups noted there: per-player history feed (fills trends/adherence panels), a
> team switcher for multi-team coaches, team-load aggregation for the trend chart.

## 3. Team schedule → plan constraints — LATER
`teams.schedule` (jsonb) is meant to feed each player's plan (fixtures/pitch sessions as
constraints so gym work avoids sport load). The engine already takes constraints
(`deriveConstraints`); wiring the team schedule into a player's plan generation is a
self-contained follow-up once teams exist.

## Recommended order
1. ~~Founding + join-code invite~~ **DONE** (PRs #120–#122).
2. ~~Wire the dashboard to live player_status~~ **DONE** (PR #123).
3. **Team schedule → constraints** — NEXT. The Constraints view already edits a
   `TeamConstraints` shape that matches `teams.schedule` jsonb (now seeded from the
   live team row, session-local only): persist the coach's edits to `teams.schedule`
   (coach-update RLS is live), read it back on load, then feed it into each player's
   plan generation via the engine's constraints path.

## Not in Team scope (paused for Simon)
- **Build flip (WP-22/23)** — the last engine re-seat; HIGH-risk, explicitly paused.
- **AI layer (Stage 6)** — needs a server-side Edge Function holding the API key.
