# Product Vision — the North Star

_The single source of truth for where this **product** is going. When a build decision is
ambiguous, it should serve this vision. The governing spec for **how the decision engine reasons**
in service of this vision is the **[Engine Design Specification](../engine/00-ENGINE-DESIGN-SPECIFICATION.md)** (the EDS)
— this vision sets the destination; the EDS defines the engine that gets us there (its Executive
Vision, §1, restates this mission). Companion docs: the team build blueprint lives in
[../product/TEAM-ARCHITECTURE.md](../product/TEAM-ARCHITECTURE.md); the full engine spec set is in
[../engine/](../engine/README.md); current state of play is in the repo-root `HANDOFF.md`._

## Mission

**Open elite strength & conditioning to everyone who can't afford an elite S&C coach** —
clubs, teams, and individuals. A busy individual, or a club with no S&C budget, should be
able to trust they're getting close to what a top-level coach would prescribe for their
goal, their sport, and the time they actually have.

## Who it's for

- **Individuals** — a person with a goal (get stronger, build muscle, functional fitness,
  or strength support for a sport they train) who wants a plan they can trust, without
  paying for a coach.
- **Clubs & teams without an S&C resource** — amateur and semi-pro teams whose coaches are
  experts in their sport but **not** in strength & conditioning, and who have no budget for a
  dedicated S&C coach. This is where we see the most value and will push hardest first.

## The two packages

### 1. Individual (exists today)
One person onboards through a short questionnaire and the decision engine produces a
multi-week, periodised plan tailored to their own goal. No external oversight — the person
is their own athlete. This is the app as it stands.

### 2. Team (in build — data spine + coach dashboard live; schedule-constraints next)
The same engine, wrapped for a squad, across two surfaces:

- **Player — mobile** (`apps/mobile`): each player gets **exactly the same treatment as an
  individual** — their own tailored, adapting plan on their phone.
- **Coach — web** (`apps/web` — exists: marketing site + gated live dashboard): an overall
  view of the squad. The coach provides the team's
  fixed schedule — matches, pitch / pool / track / pool sessions — which feed in as
  **constraints** so each player's gym plan works *around* their sport load instead of
  clashing with it. The coach sees **team recovery and performance translated into plain
  English**, and a **team-loading** read ("is the squad doing too much / too little?"),
  designed for someone who is not an S&C specialist.

**A hard line runs through the Team package: player privacy.** Players see only their own
data. The coach sees what they need to manage a squad — each player's plan, adherence,
derived load/readiness, and injury status/availability — but **never a player's raw
wearable/health vitals**. Those private numbers (HRV, sleep stages, resting HR) roll *up*
into the readiness/load signal the coach sees; the underlying data stays with the player.
The how is specified in [../product/TEAM-ARCHITECTURE.md](../product/TEAM-ARCHITECTURE.md).

## What "good" looks like (the product principles)

- **Trustworthy & evidence-based.** Programming is grounded in the science the engine already
  encodes (volume landmarks, periodisation, ACWR-driven load management). We earn the user's
  trust that this is close to elite-quality.
- **Plain English, always.** The athlete is a beginner; the coach is not an S&C specialist.
  Everything — metrics, verdicts, recommendations — is translated into language a
  non-technical person understands. No jargon dumped on the user.
- **Reacts to real life.** The plan is not static. It adapts to what was actually done,
  to readiness and training load, to injuries, and (for teams) to the fixed sport schedule.
  The aim is to maximise each person's ability to reach their goal given their real
  constraints and the time they have.
- **The engine stays honest.** The deterministic generator is pure and inspectable; AI and
  team constraints layer *on top of* it, they don't replace its evidence base.

## Long-term trajectory

The packages above are the near-term shape. Beyond them (see the roadmap in `CLAUDE.md`):

- **AI coaching** — Claude plan generation/adjustment behind the deterministic engine, via a
  server-side Edge Function (never a key in the browser).
- **Real endurance programming** — actually generating run / cycle / swim sessions, not just
  biasing the gym plan to support a sport.
- **Native iOS** — a React Native / Expo app with HealthKit and push notifications.

The North Star behind all of it stays the same: **elite-quality S&C, for people and teams
who could never otherwise afford it.**
