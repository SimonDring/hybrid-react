# @performance-os/web — Coach Dashboard

The coach-facing web product (Stage 5, the **Team package**). It turns each
player's data into a squad-level, decision-led view so a coach can answer, in
under five minutes: **who is ready, who needs adjusting, who is falling behind,
and what to do next.**

Built with **Next.js 14 (App Router) · TypeScript · Tailwind CSS v4 · Recharts**.
It shares the player app's "Midnight" design system and reuses the decision
engine's verdict language, so coach and player read the same story.

> First version runs on **realistic mock data**. No backend or auth yet — but the
> code is structured so both slot in without touching the UI (see below).

## Views (left sidebar)

A persistent, collapsible left sidebar routes between four focused views (real
URLs, so each is bookmarkable):

| View | Route | What it's for |
| --- | --- | --- |
| **Home** | `/dashboard` | The 5-minute landing — overview cards, readiness split, match week, top of the attention queue + coach actions. |
| **Focus** | `/dashboard/focus` | *Direction + who it affects.* This block's training direction (from the constraints), then the flagged players it hits hardest, as recommendation cards. |
| **Squad** | `/dashboard/squad` | The analytical view — the full filter/sort/search table, load-trend chart, and adherence heatmap. |
| **Constraints** | `/dashboard/constraints` | The coach sets the team's sport, season, weekly training pattern, and fixtures. These steer every player's plan direction. |

A shared `DashboardProvider` (`components/dashboard/DashboardProvider.tsx`) holds
the cross-view state — the selected player (so the detail drawer works from any
view), the editable constraints, and the toast — so navigating between views
keeps everything intact. `app/dashboard/layout.tsx` fetches the data **once** and
the layout (sidebar + provider) stays mounted across view switches.

### The constraints → plan cascade

The Constraints view makes the team→player model explicit: **you set** team
constraints (sport, schedule, fixtures) → **each player sets** their own
onboarding (goal, experience, strengths/weaknesses, injury history) → **the
engine builds** a personalised plan that supports the sport and steers clear of
match/pitch load. Editing the season phase there updates the Focus view's
direction live (shared context). Today it saves to local state shaped as
`TeamConstraints`; later it writes to the `teams.schedule` jsonb.

## Run it

From the **repo root**:

```bash
npm install
npm run dev -w @performance-os/web      # http://localhost:3000/dashboard
npm run build -w @performance-os/web    # production build
npm run typecheck -w @performance-os/web
```

(The root `npm run dev` still runs the **mobile** app on :5173 — they're separate
workspaces.)

## The one rule: coaches never see raw vitals

This is a binding product constraint (see `CLAUDE.md` and
`docs/product/TEAM-ARCHITECTURE.md`). A coach sees a **derived** readiness/load
signal + plain-English flags + adherence + injury *availability* — never the raw
HRV / sleep / resting-HR / soreness behind it.

The code enforces this with two shapes in `types/dashboard.ts`:

| Shape | Holds | Who reads it |
| --- | --- | --- |
| `PlayerPrivateSource` | raw vitals (sleep, HRV, RHR, soreness, RPE) | **only** the mock layer + `lib/derive.ts` |
| `CoachVisiblePlayer` | derived score, load band, adherence, injury status, plain-English reasons | every component |

`lib/derive.ts` is the **roll-up boundary** — raw vitals go in, coach-safe
signals come out, and no raw number ever crosses it (reasons are qualitative,
e.g. "Sleep below normal", never "5.1h"). In production this roll-up runs
server-side; here it runs in the mock layer so the boundary is explicit and
testable. (`grep -rE "sleepHours|hrv|soreness" components/` returns nothing.)

## Structure

```
app/
  layout.tsx · globals.css      root layout + Midnight @theme tokens
  page.tsx                      redirects → /dashboard
  dashboard/
    layout.tsx                  fetches data once → DashboardProvider + frame
    page.tsx                    Home    (renders HomeView)
    focus/page.tsx              Focus
    squad/page.tsx              Squad
    constraints/page.tsx        Constraints
components/
  dashboard/
    DashboardProvider.tsx       shared client state (selected player, constraints, toast) + drawer
    DashboardFrame.tsx          sidebar + top bar + page; owns nav UI state
    Sidebar.tsx · TopBar.tsx    navigation chrome
    views/                      HomeView · FocusView · SquadView · ConstraintsView
    <section components>        TeamOverviewCards, ReadinessSummary, PlayerStatusTable,
                                LoadTrendChart, AdherenceHeatmap, PlayerRecommendationCard,
                                PlayerDetailDrawer, TeamDirectionPanel, …
  ui/                           reusable primitives (Card, Badge, Button, Tabs, Drawer, icons, …)
content/dashboardCopy.ts        all UI strings + the injury safety language
data/
  mockApi.ts                    ← THE DATA SEAM: async getTeam/getPlayers/getLoadTrend
  mockPlayers.ts                24 PlayerPrivateSource records (private)
  mockTeam.ts · mockConstraints.ts · mockRecommendations.ts · mockClock.ts
lib/
  derive.ts                     raw → coach-safe roll-up (the privacy boundary)
  statusLogic.ts                RAG status → label / meaning / action / colour
  constraints.ts                session-type colours + team-direction logic
  dashboardUtils.ts             squad split, attention ordering, filter/sort, coach actions
  formatting.ts · cn.ts
types/dashboard.ts              the contracts
```

Only `data/mockApi.ts` reads the mock arrays — every view reads through the
provider / async getters. That's the single swap point for going live.

## Replacing mock data with the backend

Implement the getters in `data/mockApi.ts` against Supabase; **nothing in the
components changes**.

```ts
// data/mockApi.ts
export async function getPlayers(): Promise<CoachVisiblePlayer[]> {
  const { data } = await supabase.from("player_status").select("*");
  // RLS (is_coach_of) returns only this coach's team; raw vitals are not selectable.
  return data.map(rowToCoachVisiblePlayer);
}
```

- The roll-up (`lib/derive.ts`) moves **server-side** — a Supabase Edge Function
  or DB view that writes the `player_status` table. `derive.ts` documents the
  exact contract that function must satisfy.
- Drop the `now` field from `getDashboardData` and let relative-time formatting
  fall back to the real clock (the helpers already accept a `now` arg).

## Adding auth

The structure is auth-ready: no data is imported into components, and the page
is the only place that calls the data layer.

1. Add `middleware.ts` + Supabase SSR session; redirect unauthenticated users.
2. In `dashboard/page.tsx`, read the coach's `team_id` from the session before
   calling the data layer.
3. Gate coach-only actions on `team_members.role === "coach"`.

## Extending later

| Feature | Where it slots in |
| --- | --- |
| **Export weekly report** | `app/api/report/route.ts` server route → PDF/CSV from the same getters; wire to the existing `onExport` handler |
| **Coach notes** | a `coach_notes` table; the drawer textarea already exists — make it an optimistic write |
| **Team comparisons** | a team switcher in `DashboardHeader`; getters take a `teamId` |
| **Sport-specific dashboards** | variant maps in `statusLogic.ts` / `dashboardCopy.ts` keyed by `team.sport` |
| **Role-based permissions** | a `can(role, action)` helper wrapping the action buttons |
| **Billing / subscription** | gate at the team-select layer once teams exist |

## Design notes

- **Teal (`--color-accent`) is the interactive accent only.** Player status uses
  a separate red / amber / green / grey ramp so "green = go" never reads as a
  teal button. Tokens live in `app/globals.css` under `@theme`.
- The data is **deterministic** (pinned mock clock in `data/mockClock.ts`) so the
  dashboard screenshots identically every time.
