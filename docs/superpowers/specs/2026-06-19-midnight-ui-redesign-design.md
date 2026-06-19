# Midnight — full UI/UX redesign

_Spec date: 2026-06-19. Status: draft for review._

## 1. Summary

A ground-up visual and interaction redesign of the whole app, plus a new **Goal
Engine** subsystem that makes the Progress tab show real, motivating progress. The
product promise — _"the app does the thinking"_ — is made felt by translating the
engine's raw signals (readiness, training load, lift estimates, goal progress)
into a **plain-language verdict first, with the numbers demoted to supporting
evidence**. The target user does not understand the science, so the app must say
what to do, not just show data.

**Product scope (important):** the app is a **strength-training companion**. It
programs strength only. It _ingests_ aerobic activity (runs/swims/rides from
wearables) solely to inform training load, recovery and adaptation — it does not
coach those sports. The Goal Engine is therefore **strength-first**, but built so
endurance goals can switch on later without a rewrite. Delivering both strength
_and_ endurance with minimal input and adaptive to availability is the intended
long-term differentiator; this work lays the foundation for it.

The visual language is **"Midnight": a calm precision instrument** — dark-only,
navy-tinted, soft pastel accents, rounded surfaces, generous whitespace, warm but
intelligent copy (Oura/Whoop territory).

Delivered as **one cohesive redesign** (a single spec) covering a shared
foundation, the goal subsystem, and all four primary screens. Internally phased
(§9) so it can be built and reviewed in sensible chunks.

## 2. Decisions captured during brainstorming

1. **Ambition:** ground-up rethink (the warm "paper/ink" editorial look is retired).
2. **Feel:** calm precision instrument.
3. **Direction:** "Midnight" — navy-dark, soft pastel accents (teal / periwinkle /
   amber), rounded cards, more air, supportive copy.
4. **Light/dark:** **dark-only.** The current light "paper" theme and the
   `prefers-color-scheme` / `data-theme` light branch are removed.
5. **Packaging:** one big redesign — a single spec, foundation + four screens.
6. **Product scope:** the app is a **strength-training companion** — it programs
   strength, and ingests aerobic activity only for load / recovery / adaptation.
7. **Goal engine:** **strength-first, endurance-extensible.** Goals are
   auto-derived with minimal input (each main lift's next strength-standard
   milestone + an availability-aware consistency goal). An optional user-set
   **lifting target overrides** the auto milestone for that lift. Endurance goal
   types are designed into the model but stay dormant until aerobic programming is
   integrated.

## 3. Goals / non-goals

**Goals**
- Replace the visual language end-to-end with the Midnight system (dark-only).
- Add a translation layer so every engine signal reads as a verdict + color.
- Redesign Home, Program, Progress, Profile around that language.
- Build a strength-first Goal Engine: auto-derived, standards-based goals (+ an
  optional target override) → current ability → status, surfaced primarily in
  Progress (and lightly on Home/Profile); architected to extend to endurance later.
- Keep the app shippable as a PWA; `npm run dev` must run after every change.

**Non-goals (explicitly out of scope here)**
- Light mode (removed; not re-added in this work).
- Native iOS / HealthKit (Stage 6).
- AI-generated coaching copy. All verdicts here are **rule-based templates**.
  Stage 5's Edge Function can later replace the copy generators behind the same
  interface.
- Changes to periodization/plan-generation logic, `SyncService`, or `Database.js`
  internals. We re-skin and re-compose; we do not rewrite the data layer.
- Changing the 4-tab + center "Train" navigation structure (it's good; it stays).
- **Programming aerobic training** (running/swimming/cycling). The app ingests
  those activities for load/recovery only.
- **Surfacing endurance goals** in the UI. The engine is built to extend to them;
  they stay dormant in this work.

## 4. Foundation (the Midnight design system)

Dark-only. The **semantic token names that already exist are kept** (so the
migration doesn't reintroduce the recurring "broken colors" bug, and screens can
move over incrementally) — their _values_ are remapped to Midnight. New concepts
get new, clearly-named tokens. We never introduce `--card-bg`, `--border`, or
`--accent-bg` (the three banned names from CLAUDE.md).

### 4.1 Color tokens

Structural (existing names, remapped values):

| Token | Value | Use |
|---|---|---|
| `--bg-app` (new) | `#0D1016` | Page background (navy-ink) |
| `--bg-surface` | `#161B24` | Default card |
| `--bg-surface-2` | `#1B2230` | Raised / secondary card, inputs |
| `--bg-surface-elev` | `#20283A` | Sheets, modals, popovers |
| `--txt-strong` | `#F0F3F7` | Headlines, numbers |
| `--txt-body` | `#C2C9D6` | Body copy |
| `--txt-muted` | `#7F8A9C` | Secondary/meta |
| `--txt-faint` (new) | `#5D6675` | Labels, captions, disabled |
| `--hairline` | `rgba(255,255,255,0.07)` | Default 1px divider/border |
| `--hairline-strong` | `rgba(255,255,255,0.12)` | Emphasis divider |
| `--shadow-sm` / `--shadow-md` | very soft / mostly flat | Reserved; Midnight leans on hairlines + fills, not shadows |

Brand accents (new, the Midnight palette):

| Token | Value | Use |
|---|---|---|
| `--accent` | `#6FD3C4` (teal) | Primary interactive accent + "positive/on-track" |
| `--accent-2` | `#97A6FF` (periwinkle) | Secondary data series, neutral highlight |
| `--accent-warm` | `#F2C14E` (amber) | Tertiary / "building/caution" |

Status / verdict ramp (new — meaning only, never decoration):

| Token | Value | Meaning |
|---|---|---|
| `--status-positive` | `#6FD3C4` | Ready / on-track / balanced |
| `--status-caution` | `#F2C14E` | Building / watch / elevated |
| `--status-strain` | `#E8836F` (soft coral) | Behind / overreaching / ease off |

Discipline tints (new — categorical, deliberately drawn from a **separate ramp**
to the status colors so a session type never reads as "good/bad"). The app
programs strength, but **ingested aerobic activity still appears** on the calendar,
so disciplines color that logged activity (and any sport-bias context). Each tint
always appears with a label or icon, never color-alone:

| Token | Value | Discipline |
|---|---|---|
| `--disc-gym` | `#97A6FF` | Gym / strength |
| `--disc-run` | `#E0A1B0` | Run (ingested) |
| `--disc-swim` | `#5FB6D4` | Swim (ingested) |
| `--disc-cycle` | `#C9B273` | Ride (ingested) |
| `--disc-brick` | `#B79BE0` | Brick |
| `--disc-general` | `#8A93A3` | Movement / other |

> Fixes a real bug in the current app: rust/moss/ochre are reused for both
> disciplines _and_ status, so a "run" (rust) reads like a warning. Midnight keeps
> the two systems on separate ramps.

### 4.2 Typography

- **Single family: system sans** (`--sans`). The serif headings/topbar are retired
  — a precision instrument reads cleaner in one neutral sans.
- **Tabular numerals** for all figures (`font-feature-settings: "tnum"`), so
  numbers don't jitter as they animate/update.
- Scale: display 40 / h1 21 / h2 16 / body 14 / meta 13 / label 12 / caption 11.
  Minimum on-screen size 11px.
- Weights: 400 (body), 500 (titles/labels), 600 (big numbers only). No 700+.
- **Sentence case everywhere.** No ALL CAPS headers; for the "label" tier use
  letter-spacing (`0.08–0.14em`) on sentence-case text for the premium feel.

### 4.3 Shape, spacing, motion

- Radius: `--r-sm 12` (pills/inputs use 999), `--r-md 16`, `--r-lg 20`. Cards use
  `--r-lg`; nested rows use `--r-md`.
- Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 (px). Screen gutters 16–18px.
- Elevation is **flat**: surfaces separate via fill + hairline, not drop shadows.
  No gradients (they also flash during PWA repaint).
- Motion is **restrained**: rings/arcs animate their fill once on mount (~0.6s
  ease-out); verdict colors cross-fade; the existing 0.28s screen slide is softened
  to a short fade+slide. All motion respects `prefers-reduced-motion`.

### 4.4 Component kit

Reusable, each with one clear job (built as React components + CSS classes; screens
compose these, no more ad-hoc inline styling like today's Profile/TrainingLoad):

- `Card` / `Section` — surface + optional sentence-case label header.
- `MetricRing` — circular progress (readiness, goal %). Props: value, max, color,
  centerLabel, sublabel, size.
- `GoalRing` — small `MetricRing` + caption, used in the Progress hero row.
- `ProgressBar` — horizontal track + fill (goal rows).
- `LoadBand` — 4-segment band or marker showing easy / balanced / hard / too much.
- `VerdictBlock` — big number/ring + headline verdict + faint evidence line.
- `StatTile` — label / value / delta (replaces today's `.stat-card`).
- `Sparkline` / `TrendChart` — inline SVG line (+ optional flat area fill) for
  strength, recovery, load trends. No chart library; lightweight inline SVG.
- `WeekStrip` — the horizontal day strip (dots = sessions, colored by discipline,
  filled = done, ring = missed). Evolves the current `TrainingCalendar` strip.
- `SessionCard` — discipline-tinted card: type, duration, count, Start affordance.
- `InsightCard` — "Working" (positive) / "Watch this" (caution) translation tiles.
- `StatusPill` — sentence-case pill colored by status ramp.
- `LinkRow` — drill-down row (kept for secondary navigation).
- `TabBar` / `TopBar` — restyled dark; structure unchanged (4 tabs + center Train).

### 4.5 The translation layer (engine → plain language)

A small set of pure helpers map engine outputs to `{ headline, note, status,
color }`. These are the heart of "the app does the thinking." All rule-based
templates today; the interface is AI-replaceable later.

- **Readiness verdict** — extends existing `Readiness.js` (which already returns
  `score`, `status`, `headline`, `estimated`, `vitals{sleepMin,hrv,rhr}`,
  `accent`). We remap its `accent` to the new status tokens and tighten copy to
  action-first ("Push today" / "Train as planned" / "Ease in").
- **Load verdict** — maps `load.band` (`under|sweet|high|over`) + `adaptation` to
  "Balanced — plan stays as written" / "Easing this week — you've ramped fast" etc.
  Replaces the raw "ACWR 1.24" surface for normal users (the number stays on the
  Training Load detail screen). Load is informed partly by ingested aerobic work.
- **Goal status** — from the Goal Engine (§5): `ahead | on_track | building |
  behind` → pill + color + one-line note.

## 5. Goal Engine (new subsystem)

Turns training into measurable, motivating progress with **minimal user input**.
Strength-first today; the data model and engine are built so endurance goals can
switch on later without a rewrite. Self-contained: a data model, an estimator, a
standards reference, and a status mapper. Surfaced by Progress; consumed read-only
elsewhere.

### 5.1 Principles

- **Minimal input / auto-derived.** Goals exist by default without the user setting
  anything: each main lift gets a goal automatically (its next strength-standard
  milestone), and consistency is derived from logged sessions. The app proposes; it
  doesn't interrogate.
- **Optional target override.** A user can set an explicit lifting target (e.g.
  squat → 150kg). When set, that target **supersedes** the auto-derived milestone
  for that lift and becomes the tracked goal.
- **Availability-adaptive.** The consistency goal is measured against the user's own
  `availability.days_per_week`, not a fixed number.
- **Honest about data.** No estimate yet → an explicit "log a set to start
  tracking" state, never a fake number.

### 5.2 Active domains (shipped now)

- `strength` — per main lift (squat / bench / deadlift, plus any other tracked lift).
- `consistency` — sessions completed vs available days, rolling 4 weeks.
- `body` — bodyweight trend toward an optional target.

### 5.3 Dormant domains (designed in, not surfaced)

- `run` / `swim` / `cycle` — endurance goals. The enum, data-model fields and the
  estimator interface accommodate them; the UI does **not** surface them until
  aerobic programming is integrated. Because aerobic activity is already ingested
  into `workouts`, the later estimators (e.g. Riegel run-time projection from recent
  efforts, continuous-swim distance) have their data source ready — they are simply
  not built or shown in this work.

### 5.4 Data model

A `goals` array persisted on the profile via store→Sync→Supabase (a dedicated table
is a possible later normalization). Each goal:

```
{
  id,
  domain: 'strength' | 'consistency' | 'body',   // run|swim|cycle reserved (dormant)
  lift,                    // for strength: 'squat'|'bench'|'deadlift'|...
  mode: 'standard' | 'target',   // standard = auto milestone, target = user override
  target_value,            // kg (strength/body) | sessions/week (consistency)
  target_date,             // ISO or null
  baseline_value, baseline_date,
  current_value,           // newest estimate
  current_source,          // 'logged' | 'estimated' | 'manual'
  active
}
```

### 5.5 Estimation & standards (strength)

- **current_value (strength):** `resolveLifts(profile)` estimated 1RM per lift
  (from logged top sets via `liftProgression`).
- **Strength standards:** a new reference dataset maps 1RM ÷ bodyweight to a band
  (untrained → beginner → novice → intermediate → advanced → elite), by sex (and
  optionally age) where available, with a generic ratio fallback. Lives in
  `src/data/` (e.g. `strengthStandards.js`).
- **Auto milestone (`mode: 'standard'`):** the goal's `target_value` is the weight
  that reaches the **next band up** at the user's bodyweight. Recomputes as strength
  or bodyweight changes (adaptive, zero input).
- **Override (`mode: 'target'`):** user-entered `target_value`; supersedes the
  milestone for that lift.
- **consistency current_value:** completed sessions ÷ weeks over the last 4 weeks,
  compared to `availability.days_per_week`.
- **body current_value:** latest logged bodyweight.

### 5.6 Progress %, status, copy

- **Progress %** = `(current − baseline) / (target − baseline)`, clamped 0–100;
  inverted for "lower is better" (bodyweight-down).
- **Status:** with a `target_date`, compare actual % to expected-by-now (linear) →
  `ahead | on_track | building | behind`; without a date, threshold bands on %.
- **Plain-language note** per domain template (e.g. "Squat's one band off advanced —
  ~10kg to go" / "2 of 4 sessions this week — one more keeps you on pace").

### 5.7 Target capture (minimal)

- **Default: nothing to fill in.** Strength + consistency goals exist automatically.
- An editable **Goals** surface in Profile lets a user optionally set a lifting
  target (per lift) and an optional date; this flips that lift's goal to
  `mode: 'target'`.
- Qualitative ambitions (e.g. longevity) are status-only chips, not numeric rings —
  honest about what's measurable.

## 6. Screen designs

### 6.1 Home (`Today`)

Vertical stack in Midnight:
1. **Readiness VerdictBlock** (hero) — ring + score, action-first headline, faint
   evidence (`slept 7h42 · hrv 62↑ · rhr 48`). Taps through to daily metrics.
2. **Adaptation banner** (only when the load engine adjusted the week) — restyled;
   keeps the revert / "let load adapt" toggle.
3. **Today's `SessionCard`** — discipline-tinted, Start affordance.
4. **`WeekStrip`** — the scrollable day strip (from `TrainingCalendar`), including
   ingested aerobic activity.
5. **`LoadBand`** — verdict + band ("Balanced — plan stays as written").
6. **Catch-up** — past-due sessions with one-tap Done/Missed (kept).
7. **Train now** — on-demand session entry (kept; see §6.5 on the two entry points).

### 6.2 Program (`Plan`)

Fix the "too many clicks" problem by collapsing the `Plan → Phase → Week → Session`
list stack:
- Keep the **calendar/`WeekStrip` as the ≤2-tap fast path** to any session.
- Replace the drill-down list screens with **one horizontally swipeable phase/week
  surface**: swipe between phases, the current week is pinned, and a persistent
  "jump to current week" control is always present. You step _through_ the block
  instead of pushing/popping list pages.
- `SessionDetail` is unchanged in flow (re-skinned).
- Per-phase/week progress shown as quiet rings/bars, not heavy tiles.

### 6.3 Progress

The motivating snapshot, strength-goal-momentum first:
1. **Momentum hero** — headline verdict ("Strength climbing — on track") + a row of
   `GoalRing`s: the three main lifts (progress to next strength standard, or to a
   set target) + a consistency ring (vs available days).
2. **Goal rows** — per goal: current → target with the band name (e.g.
   "intermediate → advanced"), `ProgressBar`, `StatusPill`; an optional bodyweight
   row if a body goal is set; and a row affordance to **set/replace a target**.
3. **`InsightCard` pair** — strength-oriented "Working" / "Watch this" (e.g. "Bench
   +5kg est. this block" / "One more session keeps your week on pace").
4. **Strength `TrendChart`** — estimated-1RM line climbing + the three lifts.
5. **Recovery trend** — 7-day readiness `Sparkline` + average (recovery still
   matters: it's fed partly by ingested aerobic load).
6. Secondary `LinkRow`s (Daily metrics, Trends, Injuries, Training load) kept below
   the fold for depth — demoted, not removed.

### 6.4 Profile

Re-skinned Midnight cards; light-touch:
- **You** (name/age/bodyweight), **Goals** (now prominent and editable → §5.7, the
  single place to set a lifting target), **Plan** (block/week/sessions + up next),
  **Injuries** (status), and the **Settings** gear (kept; still the single path to
  Settings).

### 6.5 Navigation & shell

- 4 tabs + center **Train** FAB unchanged structurally, restyled dark.
- Resolve the **two "Train" entry points** (center FAB + Home's "Train now" CTA):
  keep both but differentiate clearly — the FAB starts today's _planned_ session (or
  Train-now if none); the Home CTA is explicitly the on-demand "got a gap" flow.
  Copy/labels make the difference obvious.
- `TopBar`: dark, keeps the sync indicator.

## 7. Data contracts referenced (no rewrites)

- `computeReadiness(dailyMetrics, logs)` → `{score, status, accent, headline,
  estimated, vitals}` (extend mapping only).
- `load` → `{acute, chronic, acwr, band, sessions}`; `adaptation` →
  `{week, reason, reverted}`.
- `resolveLifts(profile)` → estimated 1RMs; `profile.bodyweight_kg`;
  `profile.availability.days_per_week`.
- `workouts` rows (ingested aerobic activity) feed load/recovery and the calendar.
- New: `goals` (§5.4) + a `strengthStandards` dataset + goal-engine helpers.

## 8. Theming / migration strategy

- Rewrite the `:root` token block in `src/styles/main.css` to the Midnight values;
  **delete** the `html[data-theme="dark"]` and `@media (prefers-color-scheme:
  dark)` branches and the light "paper" values (dark-only).
- Keep semantic token **names**; remap values; add the new accent/status/discipline
  tokens (§4.1). Never add `--card-bg` / `--border` / `--accent-bg`.
- Migrate screens to the component kit; remove ad-hoc inline color styling.
- Each screen must still render and `npm run dev` must run after each phase.

## 9. Build phasing (internal, within the one redesign)

1. **Foundation** — tokens, type, component kit, translation helpers, shell
   (TabBar/TopBar). Proven on Home.
2. **Goal Engine** — data model, strength-standards dataset, estimator, status
   mapper + tests.
3. **Home** — recompose on the kit.
4. **Program** — swipeable stepper + calendar fast path.
5. **Progress** — strength momentum hero, goal rows, insights, trends.
6. **Profile** — re-skin + Goals/target editing.
7. **Final dark-only cleanup** (remove dead light CSS) + polish.

## 10. Testing & verification

- Unit tests: strength-standard band lookup, auto-milestone (next band) and target
  override, progress-% (incl. inverted bodyweight), status bands (with/without
  target date), consistency vs availability, readiness/load verdict mapping.
- Empty/insufficient-data states for every goal and every recovery surface (new
  user, no logged lifts, no wearable).
- Dark-only contrast / a11y pass (text on surfaces, status pills, discipline dots
  always paired with label/icon).
- `npm run dev` runs; manual walkthrough of all four tabs after each phase.

## 11. Risks

- **Large diff:** the token rewrite touches every screen. Mitigated by keeping
  semantic token names and phasing.
- **Goal-engine accuracy with sparse data:** new users / no logged lifts → must lean
  on graceful empty states, never fake milestones.
- **Strength-standard fidelity:** the standards dataset should be a defensible,
  cited reference; copy says "estimated," not a verdict on the person.
- **Performance:** goal computations in `buildView` should be cheap/memoized (avoid
  the redundant-recompute pattern noted in HANDOFF follow-ups).
- **CLAUDE.md drift:** CLAUDE.md still describes a hybrid run/swim planner; this spec
  reflects the strength-companion reality. CLAUDE.md should be updated separately
  (not in this work) to match.
- **CLAUDE.md theme rule:** the redesign redefines the system; the safeguard is
  keeping the approved semantic names and never inventing the three banned tokens.
