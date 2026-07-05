# Team Package — next steps + open decisions (2026-07-05)

The Team **foundations are built and secured**: the `teams`/`team_members`/`player_status`
spine is live on prod; the player-side roll-up writes the derived board; the board is
now **server-authoritative** for the safety fields (injury_status/readiness — S11) and
carries a **server-derived display_name** (20260709); the coach dashboard is **gated**
(S12, `apps/web/proxy.ts`). What's left to make it a usable product needs a few product
decisions — laid out here so they can be made quickly and executed.

## 1. Team founding + invite flow — DECISION NEEDED
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

## 2. Wire the coach dashboard to LIVE player_status — READY once #1 exists
The dashboard renders **mock data** (`apps/web/data/mockApi.ts`). To go live: replace
`getDashboardData()` with a Supabase read (server component, behind the `proxy.ts` gate)
that selects `player_status` for the coach's team. The board now has everything a coach
needs and nothing they shouldn't: `display_name, readiness, load_state, acwr,
adherence_pct, injury_status` — raw vitals never. Gap to close: the rich mock UI expects
more per-player fields (avatars, per-day detail, recommendations) than the privacy-safe
`player_status` exposes — **decide what the live board shows vs. the mock's richness**
(some panels may become "available once the player logs more" empty states).

## 3. Team schedule → plan constraints — LATER
`teams.schedule` (jsonb) is meant to feed each player's plan (fixtures/pitch sessions as
constraints so gym work avoids sport load). The engine already takes constraints
(`deriveConstraints`); wiring the team schedule into a player's plan generation is a
self-contained follow-up once teams exist.

## Recommended order
1. **Founding + join-code invite** (decision: web dashboard + join code) → makes teams real.
2. **Wire the dashboard to live player_status** (decision: live-board field set).
3. **Team schedule → constraints**.

## Not in Team scope (paused for Simon)
- **Build flip (WP-22/23)** — the last engine re-seat; HIGH-risk, explicitly paused.
- **AI layer (Stage 6)** — needs a server-side Edge Function holding the API key.
