# Live coach board — wiring the dashboard to `player_status` (2026-07-05)

**Goal.** Replace the coach dashboard's mock data seam (`apps/web/data/mockApi.ts`) with
live reads of the team spine (`teams` / `team_members` / `player_status`), behind the S12
gate, resolving the open decision in `docs/product/TEAM-NEXT-STEPS.md` §2: **what the live
board shows vs. the mock's richness.**

## The decision: the board renders ONLY the coach-safe surface

The live `player_status` row is deliberately narrow (TEAM-ARCHITECTURE isolation rules,
S11 server-authoritative safety fields, 20260709 server-derived identity):

```
display_name · readiness (int|null) · load_state · acwr · adherence_pct
· injury_status · updated_at
```

Everything the coach UI renders is derived from those seven fields plus the coach's own
`teams` row (name / sport / season / join_code) and the roster (`team_members`, which a
coach may read under the live "coach reads roster" policy). **Nothing is invented**:

| Mock richness | Live board treatment |
|---|---|
| Per-day adherence grid + heatmap | Honest empty state ("appears as players log sessions") |
| Readiness / load spark-line trends | Hidden (empty arrays; components skip rendering) |
| Team weekly load-trend chart | Empty state (history aggregation is a follow-up) |
| Next session name/date | Omitted (not on the safe surface) |
| Player position | Omitted (not on the safe surface) |
| Match-week panel (fixtures) | "Add your team schedule" state — lands with the schedule→constraints feature |
| weeklyLoad / plannedLoad numbers | Removed from the type (never coach-safe as raw numbers) |
| Hand-authored narrative overrides | Dropped; actions come from `statusLogic` STATUS_META + injury-safe copy |

Raw vitals never appear anywhere in `apps/web` — the roll-up already happened on the
player's device (`apps/mobile/src/lib/teamStatus.js`) and was re-stamped by the server
(S11 trigger).

## Vocabulary re-seat: adopt the DB `load_state` bands

The web's mock `LoadState` (`light|balanced|ramping|high`) disagrees with the live,
CHECK-constrained vocabulary written by the player app from the shared ACWR:
`no-data | ramping (<0.8) | balanced (0.8–1.3) | high (1.3–1.5) | overreaching (>1.5)`.
The web adopts the live vocabulary — one number, two audiences, no re-derivation.
`LOAD_META` labels stay plain-English: ramping = "Building up", high = "High",
overreaching = "Overreaching", no-data = "No data".

## Derivations (pure, coach-side, from safe fields only) — `lib/liveDerive.ts`

- **RAG status** (mirrors the mock severity model, re-founded on safe fields):
  `injury_status='out'` → red always. Otherwise `readiness=null` → grey. Otherwise
  severity = (readiness<50 → +2, <65 → +1) + (overreaching +2, high +1) +
  (modified +1) + (adherence_pct<60 → +1); ≥3 red, ≥1 amber, else green.
- **Reasons**: plain-English from the same fields ("Currently unavailable", "Readiness
  well below normal", "Load climbed faster than normal", "Behind on sessions", …).
- **Confidence + data used/missing**: from field completeness + freshness — readiness
  present AND updated ≤48 h AND acwr present → high; some → medium; none → low.
- **lastCheckIn → lastUpdated**: the row's `updated_at` (it is the roll-up write time,
  not a check-in). UI copy says "Updated …".
- Actions come from `STATUS_META`; any active injury (`modified`/`out`) applies the
  existing INJURY_SAFE conservative language.

## Data flow

`app/dashboard/layout.tsx` (server component, already behind `proxy.ts`) →
`lib/liveBoard.ts getLiveDashboardData()`:

1. Server Supabase client from cookies (`lib/supabase/rsc.ts`, `@supabase/ssr` with
   `next/headers` — the RSC sibling of the proxy client). All reads run under the
   coach's own session; RLS does the scoping. No service key anywhere.
2. Coach's teams via `team_members` (role=coach, status=active) joined to `teams`;
   **v1 selects the first team** (created_at order). A team switcher is a follow-up.
3. `player_status` for that team; `team_members` role='player' status='active' count.
4. Map rows through `liveDerive`; return `{ team, players, roster: { joined,
   reporting }, joinCode, loadTrend: [], now: new Date().toISOString() }`.

`Team` view-model: name/sport from the row; `seasonPhase` mapped from `teams.season`
('in' → "In-season" …); fixture/week fields become optional and absent.

## Empty / zero states

- **No players yet**: the home view leads with a "Share your join code" card (code +
  copy button, reusing the /get-started presentation) — the bridge from founding to a
  populated board.
- **Joined but not yet reporting** (roster row, no status row — offline join or failed
  push): a count line "N joined, awaiting their first sync". No ghost rows (a coach
  cannot even name them until the first row lands, by design).
- **Stale rows**: `updated_at` shown as relative "Updated 3d ago"; staleness >7 days
  demotes confidence to low.

## What is deleted vs. kept

- **Deleted**: `data/mockApi.ts`, `mockPlayers.ts`, `mockTeam.ts`,
  `mockRecommendations.ts`, `lib/derive.ts` (the mock roll-up — its severity model
  moves into `liveDerive`), `data/mockClock.ts` if no longer referenced.
- **Kept**: `data/mockConstraints.ts` (+ `mockClock` if ConstraintsView still needs it) —
  the Constraints view remains a local-state prototype until the schedule→constraints
  feature (TEAM-NEXT-STEPS §3).

## Testing / verification

- `npm run typecheck` + `next build` in `apps/web` (CI's web check).
- End-to-end against STAGING (never prod; same guard convention as the RLS harness):
  seed a coach + team + two players via the proven RPCs, run the dashboard locally with
  the staging pair in `apps/web/.env.local`, sign in as the coach, verify the board
  renders the live rows (and the zero-state before players join). Screenshot proof.
- The RLS behind every read is already proven by `supabase/tests/rls-harness.mjs`
  (75/75, including coach-reads-derived-only and the join-code flow).

## Risk

Medium-low: web-only, behind the S12 gate, no schema change, no engine change, no
mobile change. Reversible by re-pointing the one data seam.
