# Team schedule → plan constraints (2026-07-05)

**Goal.** The coach's schedule becomes real: persisted to `teams.schedule`, loaded back
into the board, and fed into each player's plan so gym work steers clear of sport load —
the core Team-package promise (VISION.md, TEAM-ARCHITECTURE.md, TEAM-NEXT-STEPS §3).

**Simon's decisions (2026-07-05):** plan impact = **matches block + fixtures taper**
(match days leave the player's available gym days; upcoming fixtures drive the engine's
existing event-taper; other sport days are soft-avoided, never blocked). Delivery =
both stages autonomous, one PR each.

## The persisted shape (the cross-app contract)

`teams.schedule` (jsonb, coach-update RLS live, member-read RLS live) stores:

```json
{
  "weeklyPattern": [ { "day": "Mon", "type": "gym" }, …7 entries… ],
  "fixtures":      [ { "id": "…", "type": "match", "label": "…", "date": "YYYY-MM-DD" } ]
}
```

- Exactly the web `TeamConstraints` shape minus sport/season, which persist to their own
  `teams.sport` / `teams.season` columns (season stored as the code: `pre|in|off|tournament`,
  mapped from the UI labels in ONE place, `lib/constraints.ts`).
- The column default is `'[]'::jsonb` (an array) — every reader must treat anything that
  isn't an object with those two arrays as "no schedule yet".
- `type` vocabulary = the existing `SessionType` union. Future fields are additive.

## Stage 1 — persist + load (web only, this PR)

- `lib/teams.ts` gains `saveTeamSchedule(teamId, constraints)`: one `teams` update setting
  `sport`, `season` (label→code), `schedule` (pattern+fixtures). Tagged result; the
  ConstraintsView Save button awaits it — success = "saved" toast + local commit, failure =
  the error in the toast and NO local commit (never claim a save that didn't happen).
- `liveBoard.ts` selects `schedule` in the teams embed, parses it defensively, and returns
  `initialConstraints` (parsed, else `constraintsForTeam(team)` defaults) alongside the
  team. It also derives `team.nextFixture` = the earliest fixture of type `match` dated
  today or later — the Match-week panel and "Next match" fact light up from real data.
- `DashboardProvider` seeds its constraints state from `initialConstraints`.
- The coach board needs the coach's TEAM id for saving: the provider already holds `team`.

## Stage 2 — player plans read the schedule (mobile + engine, next PR)

- **Read path:** the player's app fetches their active team's `teams.schedule` (member-read
  RLS) alongside `listMyActiveTeams`, caches it in the store like other synced state.
- **Matches block:** weekdays whose pattern type is `match` are removed from the player's
  available gym days at generation and reflow (intersection with `profile.days`; if the
  intersection would drop below 2 days, keep the player's own days and only soft-avoid —
  never starve a plan).
- **Fixtures taper:** the nearest upcoming fixture date feeds the engine's existing
  event-taper input, which already handles "keep intensity, cut volume" and only engages
  inside its own window — league fixtures outside the window change nothing.
- **Soft-avoid:** pitch/pool/track days get a scheduler penalty (the heavy-axial-adjacency
  penalty family), never a hard block.
- **Determinism:** constraints enter as INPUT (profile/opts), `generatePlan` stays pure;
  with no team schedule the output is byte-identical (golden masters must not move).
- Detailed engine wiring gets its own plan before implementation; HIGH-care but additive.

## Testing

- Stage 1: typecheck + build; staging E2E — save a schedule as the seeded coach, reload,
  confirm the board and Focus render it; confirm a player's client can read it (RLS).
- Stage 2: engine tests for the day-intersection + floor rule and taper hand-off; suite
  stays green with goldens untouched for schedule-less profiles.
