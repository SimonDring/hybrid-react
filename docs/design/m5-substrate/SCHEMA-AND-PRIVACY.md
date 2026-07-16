# M5 · Outcomes Substrate — Schema & Privacy Design

`Status: DESIGN — PROPOSED for privacy panel review + 🔒 6 sign-off · 2026-07-15 · no DB change ships from this doc`

**Authority.** Executes the M5 spec (`docs/superpowers/specs/2026-07-15-m5-substrate-schema-privacy-design.md`)
against the now-CANONICAL **Data & Analytics Architecture Specification (DAAS)**
(`docs/architecture/DATA-ANALYTICS-ARCHITECTURE.md`, T2) — governing here — and the binding
data-isolation rules of `docs/product/TEAM-ARCHITECTURE.md`, Constitution **Art 11** (raw
data inviolable), **Art 21** (developmental-stage duty of care), and **Art 22** (data
ownership / consent / erasure). It builds on the reality of `supabase/schema.sql`
(the `auth.uid() = user_id` pattern; the `player_status` / `coach_reads_member` / F3
lineage) and cures the TR-03 defect
(`docs/reviews/2026-07-11-engine-audit-06-technical-risk-register.md`: the latest-only
`users.profile` JSONB blob, the unbounded `select('*')` pulls, alert-and-swallow overflow).

**This is a design for review. No `supabase/migrations/*` file is authored or applied by
this document; `schema.sql` is not edited. The DRAFT migration in §6.4 is a marked,
NOT-APPLIED review artefact.** The real migration is a later, Simon-applied step after the
privacy panel and 🔒 6.

**Citation convention.** `DAAS §n` = the canonical Data & Analytics spec; `Art n` = the
Constitution; `TEAM-ARCH §` = the team blueprint; `TAS §4.1` = the engine×knowledge stamp
rule. Where the DAAS does not specify a table shape, this document *proposes* one and marks
it a **[DAAS-EXTENSION CANDIDATE]** so it is queued for the DAAS's own extension, never a
silent divergence (spec Rule 2).

---

## 0. The design in one screen

The platform holds an athlete's career-long health record. The whole of M5's substrate
obeys four architectural laws, each enforced in the schema, not by reviewer vigilance:

1. **Append-only evidence.** Observations and materialised derivations are inserted, never
   updated. A correction is a *new* row that `supersedes` the old one (DAAS §2.1.1 rule 2,
   §3.1). Enforced by: no `UPDATE` policy on any evidence table (RLS default-deny) + a
   guard trigger. The athlete's Art 22 erasure right is the *only* destructive path, and it
   is explicit.
2. **Owner-private at rest.** Every new table is keyed `user_id` with `auth.uid() = user_id`
   — the schema's established pattern (`schema.sql` §ROW LEVEL SECURITY). No coach, teammate,
   or third party reads an athlete's observations or raw-bearing derivations. Ever.
3. **Only a derived roll-up crosses a person boundary, and only by consent.** Exactly ONE
   new table is cross-person readable — `squad_signal_snapshots` — and it has **no
   raw-vital column by construction**. The leak FLOOR that holds *today*, structurally, is
   two facts: (a) that table has no raw-vital column, so there is nothing raw to cross, and
   (b) the nine owner-private tables carry every raw/raw-bearing value and have *no coach
   policy at all*. A coach-visible raw value would therefore require an
   `ALTER TABLE ... ADD COLUMN` **plus** a new coach policy — a deliberate schema change, not a
   coding slip. That is the meaning of "make a leak require a schema change" (Art 11; spec
   Rule 3). *A CI privacy sweep is a **future** backstop on top of this floor, not the floor
   itself: it keys on the Metric Dictionary `privacy_class`, which is not yet built (EXT-5;
   DAAS §9 S1) — no control in this design relies on it existing.*
4. **Every derived row is stamped.** Materialised rows carry `engine_version ×
   knowledge_set_version` + the producing method version + input references (DAAS §3.2;
   TAS §4.1). History is read strictly as "what was computed then", never re-served as
   current (the derived-data doctrine).

The consent join is the spine of law 3: the cross-person read requires BOTH an active team
membership (the existing `coach_reads_member`, F3) AND an active consent grant. Revoking the
grant ends the read forward at the policy layer (the athlete's own rows are kept — 🔒 D1 policy-only),
generalised (§2, §3).

**What this substrate never touches:** the pure plan path. The engine (`packages/engine`,
`PlanGenerator.js`) stays pure (Art 18) — it never reads or writes the substrate. Only the
async band (D17 interpretation, D16 priors) reads it; only the impure L3/L4 app layer writes
it (§5).

---

## 1. The append-only outcomes / history tables

### 1.1 Reconciliation — what is new vs what is extended

The platform already captures rich streams. The substrate does not duplicate them; it adds
the **append-only longitudinal record** the DAAS §3 mandates and TR-03 proves missing.

| Concern | Existing table (capture) | M5 disposition |
|---|---|---|
| Per-set training history | `set_logs` (mutable, `updated_at` trigger) | **KEPT as capture.** Feeds `session_outcomes` (new, append-only, materialised). |
| Per-session log | `session_logs` (mutable) | **KEPT as capture.** Summarised into `session_outcomes`. |
| Daily vitals + subjective | `daily_metrics` (one mutable row/day, raw + subjective conflated) | **KEPT as the current-day working surface.** Governed longitudinal copy lands in `monitoring_entries` (new, per-metric, provenance-split — sensor and self-report are *distinct* rows, DAAS §2.1.1). Backfill is a later step. |
| Weekly check-in | `weekly_checkins` (mutable) | **KEPT as capture.** Its metrics also flow to `monitoring_entries`. |
| Per-workout wearable | `wearable_readings` (append-mostly, owner-only) | **KEPT.** An ingestion source for `monitoring_entries` / `external_load_observations`. |
| Block outcome | *(none — TR-03: `stagedPriors` overwritten per block in `users.profile`)* | **NEW `block_outcomes`** — the D16 prior substrate. |
| Readiness/load history | *(none — `daily_metrics.readiness_score` is last-write, mutable)* | **NEW `readiness_snapshots`** — DAAS §3.2 "daily readiness and load state, as computed that day". |
| Test / assessment results | *(none)* | **NEW `test_results`** (Family VIII Test Result). |
| Match output | *(none)* | **NEW `match_performances`** (Family VIII Match Performance). |
| External sport load | *(none)* | **NEW `external_load_observations`** (Family VIII External Load Observation). |
| Personal baselines | *(none — recomputed ad hoc)* | **NEW `baselines`** (DAAS §3.4). |
| Served insights / reports | *(none)* | **NEW `served_artefacts`** (DAAS §3.2: "every Insight and Report served to a human" is itself evidence). |
| Coach-board snapshots | `player_status` (current row only — §1.5 limitation) | **NEW `squad_signal_snapshots`** — append-only derived history, the ONLY cross-person table (§3, §5.2). |
| Consent | *(none — membership implied visibility)* | **NEW `consent_grants` + `consent_events`** (§2; Art 22). |

**Nine new owner-private tables** (`block_outcomes`, `session_outcomes`, `readiness_snapshots`,
`monitoring_entries`, `test_results`, `match_performances`, `external_load_observations`,
`baselines`, `served_artefacts`), **one cross-person derived table** (`squad_signal_snapshots`),
and **the consent pair** (`consent_grants`, `consent_events`).

### 1.2 Shared columns (every substrate table)

Design artefact — SQL-shaped, **not a migration**. Common contract on every table:

```
  id                  uuid primary key default gen_random_uuid()
  user_id             uuid not null references public.users(id) on delete cascade   -- the OWNER (athlete)
  created_at          timestamptz not null default now()                             -- write time (immutable)
  supersedes_id       uuid references <this table>(id)                               -- append-only correction: this row replaces that one
  -- NO updated_at, NO update trigger: evidence rows are never edited in place (DAAS §2.1.1 rule 2)
```

Derived / materialised tables (`block_outcomes`, `session_outcomes`, `readiness_snapshots`,
`baselines`, `served_artefacts`, `squad_signal_snapshots`) additionally carry the
**derived-data stamp** (DAAS §3.2; TAS §4.1):

```
  engine_version        text not null    -- the engine build that computed this row
  knowledge_set_version text not null    -- KNOWLEDGE_SET_VERSION in force
  method_id             text not null    -- the D17 member / engine call (e.g. 'e1rm.epley', 'readiness.v3')
  method_version        text not null    -- version of that method
  computed_for          date             -- the calendar day/period the value describes (≠ created_at)
  input_refs            jsonb not null default '[]'::jsonb   -- references to the observation rows it was derived from
```

Observation tables (`monitoring_entries`, `test_results`, `match_performances`,
`external_load_observations`) instead carry the **provenance contract** (DAAS §2.1.1) — quality
descriptors, **not** confidence (confidence is born at derivation, §4.2):

```
  metric_id           text not null    -- Metric Dictionary id (DAAS §4.1); FK-in-spirit to the engine-side registry
  provenance_class    text not null    -- 'measured'|'device'|'self-administered'|'self-report'|'third-party'|'coach-report'
  reliability_tag     text             -- per-class default from the dictionary entry
  source_system       text             -- for 'third-party' / 'device': the originating system's identity
  observed_at         timestamptz not null
  quality_flags       jsonb not null default '{}'::jsonb    -- e.g. {"degraded": true} when conditions were missing
```

**Why append-only cures TR-03.** History is now *rows*, each bounded, not one 256 KB
`users.profile` JSONB blob pushed whole. A block outcome is an insert, not a blob rewrite;
`stagedPriors` stops being overwritten (they become `block_outcomes` rows); trend queries read
bounded windows (§4). The single 256 KB scaling wall is retired.

### 1.3 The tables (design artefacts — NOT a migration)

```
-- ── block_outcomes ─────────────────────────────────────────────────────────────
-- The D16 prior substrate (TR-03 cure). One row per completed training block,
-- appended on block close. Read ONLY by the async band (D16 priors, D17). Never
-- on the pure plan path (§5). Shape defined for D16 promotion in §5.3.
block_outcomes
  (shared + derived stamp)
  plan_id             uuid references public.training_plans(id) on delete set null
  block_index         int
  period_start        date
  period_end          date
  goal_snapshot       jsonb           -- the goal/diagnosis this block ran under (context, not a live read)
  planned             jsonb           -- prescribed volume/quality targets for the block
  observed            jsonb           -- achieved: adherence, volume by quality, e1RM deltas, monitoring drift
  outcome_signals     jsonb           -- derived deltas the D16 promotion consumes (typed in §5.3)

-- ── session_outcomes ───────────────────────────────────────────────────────────
-- Append-only per-session derivation, materialised on session close from the
-- (mutable) session_logs + set_logs capture rows. DAAS §3.2: "estimated 1RM per
-- tracked lift, on session close".
session_outcomes
  (shared + derived stamp)
  session_id          uuid references public.sessions(id) on delete set null
  completed_on        date
  adherence_pct       numeric         -- prescribed-vs-done for this session (derived)
  volume_by_quality   jsonb           -- tonnage/sets per physical quality
  e1rm_by_lift        jsonb           -- { squat: 142.5, bench: ... } with method_version in the stamp
  session_load        numeric         -- session load (derived; not a raw vital)

-- ── readiness_snapshots ────────────────────────────────────────────────────────
-- DAAS §3.2: "daily readiness and load state, as computed that day". Append-only;
-- the honest historical readiness/load record daily_metrics.readiness_score (mutable,
-- last-write) cannot provide. NOTE: this is DERIVED — the raw vitals it was computed
-- from stay in daily_metrics (owner-only) and are NOT copied here.
readiness_snapshots
  (shared + derived stamp)
  readiness           int             -- derived score (0-100), as computed that day
  load_state          text            -- 'balanced'|'ramping'|'overreaching'|... (from ACWR)
  acwr                numeric
  baseline_maturity   numeric         -- how mature the baseline behind this was (confidence input; TR-13 fix)

-- ── monitoring_entries ─────────────────────────────────────────────────────────
-- The governed longitudinal monitoring stream. One row PER METRIC PER OBSERVATION,
-- provenance-split: a self-reported "sleep 8h" and a device sleep-duration are TWO
-- rows under distinct provenance_class (DAAS §2.1.1 — never conflated). Some rows
-- here are raw vitals (metric_id privacy_class='raw-vital'): owner-only forever.
monitoring_entries
  (shared + provenance contract)
  value               numeric
  unit                text
  window_start        timestamptz
  window_end          timestamptz

-- ── test_results (Family VIII: Test Result) ────────────────────────────────────
-- One administration of a versioned assessment protocol. DAAS §2.1.2: results are the
-- durable point; Capability stays the recomputable estimate.
test_results
  (shared + provenance contract)
  assessment_id       text not null   -- the protocol knowledge-entry id (engine-side registry)
  protocol_version    text not null   -- what keeps a 2026 result comparable with a 2031 one
  raw_values          jsonb not null  -- as recorded
  derived_score       numeric         -- with the mapping version named in method_* (this row is Stored, score is the observed mapping)
  score_map_version   text
  conditions          jsonb           -- deviations / recording conditions

-- ── match_performances (Family VIII: Match Performance) ────────────────────────
-- Exposure + output. Availability is a STATUS fact, never clinical detail (Art 11).
match_performances
  (shared + provenance contract)
  fixture_ref         text
  played_on           date
  minutes             numeric
  availability_status text            -- 'available'|'modified'|'unavailable'
  return_horizon      date
  output_kpis         jsonb           -- mapped to the sport's KPI framework
  context             jsonb

-- ── external_load_observations (Family VIII: External Load Observation) ─────────
-- GPS/accelerometry/pitch-RPE. Source-agnostic from day one (DAAS §2.1.5): a
-- hand-logged and a GPS-derived load differ in provenance_class + reliability, not shape.
external_load_observations
  (shared + provenance contract)
  session_ref         text
  observed_on         date
  distance_m          numeric
  sprint_count        int
  high_speed_m        numeric
  pitch_rpe           numeric
  raw                 jsonb

-- ── baselines (DAAS §3.4) ──────────────────────────────────────────────────────
-- Personal per-metric baseline, materialised on update as a dated value. Baseline
-- MODEL params are Domain 7 knowledge; baseline VALUES are athlete state.
baselines
  (shared + derived stamp)
  metric_id           text not null
  central             numeric         -- rolling central tendency
  spread              numeric
  maturity            numeric         -- 0-1; low maturity ⇒ humble comparison, never a population constant sold as "their normal"

-- ── served_artefacts (DAAS §3.2: every Insight/Report shown to a human is evidence)
-- Append-only record of what the platform TOLD someone, reproducible verbatim.
served_artefacts
  (shared + derived stamp)
  artefact_type       text not null   -- 'insight'|'report'|'benchmark'|'squad_signal'
  audience            text not null   -- 'athlete'|'coach'|'engineer'
  statement           jsonb not null  -- the typed finding + plain-English form (DAAS §8.1 contract)
  derivation          jsonb not null  -- input refs · method+version · window
  quality             jsonb not null  -- composed confidence · provenance summary · missingInputs[] · degradations
  authority           jsonb not null  -- granted tier (gate|soft input|reported metric) · consumers | 'advisory'
  privacy_class       text not null   -- max of inputs' classes (DAAS §4.2 rule 6)
  served_at           timestamptz not null default now()
```

`squad_signal_snapshots` (the one cross-person table) is defined in §3.4, because its shape is
inseparable from its privacy model.

---

## 2. Consent grants — ownership, revocation, erasure, export

Art 22: "team membership silently becoming a visibility grant" is precisely the failure to
prevent. The substrate makes consent **durable, inspectable, revocable athlete state**
(DAAS §3.5). **[DAAS-EXTENSION CANDIDATE]** — DAAS §3.5 owns the *principle* but explicitly
defers the storage-layer consent-check mechanics to the GA-510 TAS-side consent-enforcement
companion spec. The table shapes below are this design's proposal; they must be ratified into
GA-510 (or a DAAS §3.5 appendix), not adopted silently.

### 2.1 The tables

```
-- consent_grants — the CURRENT state of every grant the athlete has made.
consent_grants
  id                  uuid primary key default gen_random_uuid()
  grantor_user_id     uuid not null references public.users(id) on delete cascade   -- the ATHLETE (always)
  grantee_kind        text not null    -- 'team' | 'coach' | 'platform_research'
  grantee_team_id     uuid references public.teams(id) on delete cascade            -- for team/coach grants
  scope               text not null    -- 'derived_status' | 'availability' | 'plan_adherence' | 'squad_signals'
  granularity         jsonb not null default '{}'::jsonb  -- optional per-metric-class narrowing within scope
  secondary_use       boolean not null default false      -- Art 22: research/benchmark use is a DISTINCT flag
  purpose             text             -- required when secondary_use = true (purpose-scoped)
  ai_processing       boolean not null default false      -- may a C5 scan read under this grant? (DAAS §2.3.4)
  granted_at          timestamptz not null default now()
  revoked_at          timestamptz      -- null = active; set = revoked/ended (closes the crossing FORWARD)
  created_at          timestamptz not null default now()
  updated_at          timestamptz not null default now()
  unique (grantor_user_id, grantee_kind, grantee_team_id, scope)

-- consent_events — the append-only audit log (durable, inspectable — Art 22).
consent_events
  id                  uuid primary key default gen_random_uuid()
  grant_id            uuid references public.consent_grants(id) on delete set null
  grantor_user_id     uuid not null references public.users(id) on delete cascade
  event               text not null    -- 'granted' | 'revoked' | 'scope_narrowed' | 'expired'
  detail              jsonb not null default '{}'::jsonb
  created_at          timestamptz not null default now()
```

`consent_grants` is a small state machine (revocation flips `revoked_at`); `consent_events` is
the append-only trail that satisfies "every grant and revocation is durable, inspectable state
*in* the record" (DAAS §3.5). Every write to `consent_grants` also appends a `consent_events`
row (trigger).

### 2.2 Revoked grant ends the derived crossing — the F3 pattern, generalised

Two layers, exactly as F3 (`20260712_player_status_membership_scope.sql`) did for ended
memberships:

1. **Policy layer.** The cross-person read on `squad_signal_snapshots` (§3.4) requires an
   *active* grant via `has_active_grant()`. The instant `revoked_at` is set,
   `has_active_grant()` returns false → the coach's read ends forward (§3.3). No denominator
   is silently shifted — the signal notes the composition change (DAAS §5.2).
2. **No cleanup DELETE of the athlete's own record — RESOLVED policy-only (🔒 D1, Simon
   2026-07-15).** Unlike `player_status` (a pure coach surface, safely deleted on departure
   by F3), `squad_signal_snapshots` is ALSO the athlete's own dated career record (§3.2;
   Art 22 export). So revocation ends the crossing at the **policy layer ONLY** — the
   `has_active_grant()` predicate going false is the complete control; the rows are **not
   deleted**. There is NO `consent_revocation_cleanup` DELETE trigger on this table. The
   athlete retains their history; the coach simply can no longer read it. (Migration note:
   if the athlete later re-grants, historical snapshots become coach-visible again under the
   fresh consent — acceptable, it is re-consented data; a coach surface wanting only current
   signals filters by `created_at`. Flagged as a migration-time consideration, not a schema
   change.)

Membership AND consent are both required: leaving the team (F3) OR revoking the grant (§2.2)
independently ends the crossing at the policy layer. "Membership never implies visibility"
(Art 22) is thus structural — a member with no active grant is invisible to the coach, and
no athlete's own record is ever destroyed to achieve that.

### 2.3 Erasure and export as rights (Art 22)

- **Export** = the whole record: observations + materialised history + served artefacts +
  grants. Delivered as the athlete's data (DAAS §3.5). A design-level export RPC
  (`export_user_record()`) reads every owner table for `auth.uid()` in bounded pages (§4).
- **Erasure** extends the existing `delete_user()` RPC (`schema.sql`): every new table is
  added to its explicit delete list (belt-and-suspenders like the current team surfaces).
  **Append-only binds the *platform* against silent rewriting; it never limits the athlete's
  erasure right** (DAAS §3.5, the AQ-5 batch-wide reading). Erasure is the *only* destructive
  path an owner has; in-place UPDATE of evidence stays forbidden.

---

## 3. The RLS / privacy model

**Principle (Art 11 ceiling; Art 22 basis; TEAM-ARCH §Data isolation).** Owner-private at
rest; raw data never crosses a person boundary; coaches/teams see ONLY a derived roll-up, and
only under a consented, team-scoped grant. Every new table gets an explicit policy below. The
design makes a violation require a schema change (§0 law 3).

### 3.1 Owner-private tables (the nine)

`block_outcomes`, `session_outcomes`, `readiness_snapshots`, `monitoring_entries`,
`test_results`, `match_performances`, `external_load_observations`, `baselines`,
`served_artefacts` — all identical, all owner-only, **no cross-person policy at all**:

```sql
alter table public.<table> enable row level security;

-- read your own, insert your own; NO update policy (append-only); owner delete = erasure only
create policy "own rows read"   on public.<table> for select using (auth.uid() = user_id);
create policy "own rows insert" on public.<table> for insert with check (auth.uid() = user_id);
create policy "own rows delete" on public.<table> for delete using (auth.uid() = user_id);
-- (deliberately no FOR UPDATE policy → RLS default-denies in-place edits)
```

Plus an append-only guard trigger (belt-and-suspenders against a future policy slip):

```sql
create or replace function public.forbid_evidence_update()
returns trigger language plpgsql as $$
begin raise exception 'evidence rows are append-only; insert a superseding row'; end; $$;
-- attached BEFORE UPDATE on every owner-private evidence table
```

These tables carry raw vitals (`monitoring_entries` rows whose `metric_id` is a `raw-vital`)
and raw-bearing derivations. **No coach policy exists on any of them** — the same discipline as
`daily_metrics` / `wearable_readings` (TEAM-ARCH §Data isolation point 1). A coach gets zero
row access. This is the Art 11 floor.

### 3.2 Consent tables

```sql
-- consent_grants: the athlete manages their own grants; a grantee coach may READ grants that
-- name their team (so they know their own scope), but never write them.
-- RLS MUST be enabled first: without it the policies are INERT and the table falls back to
-- the blanket authenticated grant → a cross-athlete map of who-consented-to-what leaks.
alter table public.consent_grants enable row level security;
create policy "grantor manages grants" on public.consent_grants
  for all using (auth.uid() = grantor_user_id) with check (auth.uid() = grantor_user_id);
create policy "named coach reads their grants" on public.consent_grants
  for select using (grantee_team_id is not null and is_coach_of_team(grantee_team_id));

-- consent_events: owner reads their own audit trail; inserts are trigger-only (SECURITY DEFINER).
alter table public.consent_events enable row level security;
create policy "own consent events read" on public.consent_events
  for select using (auth.uid() = grantor_user_id);
```

### 3.3 The consent-and-membership predicate

```sql
-- has_active_grant: is there a live grant from `member` to the coach's `team`, covering `scope`?
-- SECURITY DEFINER + search_path pinned, mirroring coach_reads_member (schema.sql).
create or replace function public.has_active_grant(member uuid, team uuid, want_scope text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from consent_grants g
    where g.grantor_user_id = member
      and g.grantee_team_id  = team
      and g.scope            = want_scope
      and g.revoked_at is null
  );
$$;
```

### 3.4 The ONE cross-person table — `squad_signal_snapshots`

The append-only history of the derived coach surface (DAAS §5.2; closes the point-in-time-only
limitation of `player_status`, DAAS §1.5). **Every column is derived-safe by construction —
there is no raw-vital column, so there is nothing raw for a coach read to expose.** This is the
structural floor and it holds today. *When the Metric Dictionary + its CI privacy sweep exist
(EXT-5; DAAS §4.1 / EDS L13), the sweep becomes an additional automated backstop that fails the
build if a raw-vital column is ever added here — but the guarantee does not depend on that
sweep: the protection is the absence of the column.*

```
squad_signal_snapshots
  id                  uuid primary key default gen_random_uuid()
  user_id             uuid not null references public.users(id) on delete cascade   -- the member (owner)
  team_id             uuid not null references public.teams(id) on delete cascade
  (derived stamp: engine_version, knowledge_set_version, method_id, method_version, computed_for, input_refs)
  readiness           int             -- derived score ONLY (never the vitals behind it)
  load_state          text            -- 'balanced'|'ramping'|'overreaching'|...
  acwr                numeric
  adherence_pct       numeric
  injury_status       text            -- 'available'|'modified'|'out' (status, never the private notes)
  confidence          numeric         -- rides along; a sparse-data roll-up says so (DAAS §5.2)
  created_at          timestamptz not null default now()
  supersedes_id       uuid references public.squad_signal_snapshots(id)
```

```sql
alter table public.squad_signal_snapshots enable row level security;

-- the member writes their OWN snapshot (own-row, active membership) — like player_status
create policy "own snapshot insert" on public.squad_signal_snapshots
  for insert with check (auth.uid() = user_id and is_member_of_team(team_id));
create policy "own snapshot delete" on public.squad_signal_snapshots
  for delete using (auth.uid() = user_id);

-- THE CROSSING: the member reads their own; a coach reads it ONLY with BOTH an active,
-- team-scoped membership (F3: coach_reads_member) AND an active consent grant.
create policy "member or consented coach" on public.squad_signal_snapshots
  for select using (
    auth.uid() = user_id
    or (coach_reads_member(team_id, user_id)
        and has_active_grant(user_id, team_id, 'squad_signals'))
  );
-- (no coach UPDATE/DELETE: server-truth + append-only, exactly like player_status)
```

A server-truth BEFORE trigger (generalising `player_status_server_truth`) overrides
`injury_status` / `readiness` with values derived from the member's OWN owner-private data and
clamps the soft trend metrics — so a member can neither publish a false availability nor a
value crossing another person's boundary. Raw vitals never appear because no raw column exists.

`player_status` itself remains the *current-row* surface (unchanged); `squad_signal_snapshots`
is its dated history. Per 🔒 D1 (§2.2, §6.5), the crossing is ended **at the policy layer only**
— an ended membership (`coach_reads_member` → false) OR a revoked grant (`has_active_grant` →
false) stops the coach's read forward, and the athlete's own snapshot rows are **kept, never
deleted** (they are the athlete's dated career record, which Art 22 export must return). There is
therefore **no** `consent_revocation_cleanup` trigger, and the `team_members_cleanup_status` F3
trigger is **not** extended to `squad_signal_snapshots` — it still deletes only the pure
coach-surface `player_status` row. Erasure (`delete_user`) stays the athlete's only destructive path.

### 3.5 The RLS proof set (what the harness must prove)

The design ships with its proofs — the panel and a future `rls-harness.mjs` run (mirroring the
existing style, `supabase/tests/rls-harness.mjs`) must assert **every** line below. `P` = proof.

**Owner isolation (per the nine owner-private tables):**
- P1 — an athlete reads only their OWN rows in each new table.
- P2 — athlete B reads ZERO of athlete A's rows (read), and cannot update/delete/insert-as-A.
- P3 — a signed-out (anon) client reads nothing from any new table.
- P4 — **raw vitals never cross:** a `monitoring_entries` row with a `raw-vital` `metric_id`
  returns ZERO rows cross-user (the Art 11 floor, asserted on the data).

**Append-only integrity:**
- P5 — an owner's in-place `UPDATE` of any evidence row is REJECTED (policy + guard trigger).
- P6 — a correction is a new row carrying `supersedes_id`; the superseded row still exists.

**The cross-person derived table (`squad_signal_snapshots`):**
- P7 — a coach reads a member's snapshot ONLY when membership is active AND a `squad_signals`
  grant is active (derived-only board).
- P8 — a teammate (non-coach) reads NOTHING of another member's snapshot.
- P9 — an outsider-team coach reads NOTHING (team-scoped, generalising WP-50).
- P10 — the coach reads ZERO raw vitals and ZERO private injury detail of their own player
  (re-assert the binding rule against the new tables).
- P11 — a member cannot publish a snapshot onto a team they are not an active member of.

**Consent revocation ends the crossing (the F3 generalisation — the headline proof):**
- P12 — pre-check: with active membership + active grant, the coach reads the member's snapshot.
- P13 — the member REVOKES the `squad_signals` grant (sets `revoked_at`).
- P14 — the coach can NO LONGER read that member's snapshot (policy: `has_active_grant` false).
- P15 — the crossed snapshot rows are GONE (cleanup trigger), not merely hidden.
- P16 — an ended MEMBERSHIP (F3) independently ends the crossing, even with a live grant.
- P17 — the *distinct* `secondary_use` / `ai_processing` flags are RECORDED on the grant now,
  and read back exactly as written (default `false`). **Not yet enforced:** no predicate in
  this design consults them, so P17 asserts *recording fidelity*, not a live crossing control —
  enforcement (a research/AI-scan read that a false flag must deny) lands with §6.3 / GA-510
  and gets its own proof then (Art 22; DAAS §2.3.4, §6.3).

**Consent surface (the consent pair — cross-athlete isolation):**
- P18 — the athlete reads their own `consent_events` audit trail; a coach cannot.
- P19 — a coach reads grants naming their own team but cannot create or revoke a grant.
- P20 — athlete B reads ZERO of athlete A's `consent_grants` rows (RLS enabled per B1; the
  who-consented-to-what map never leaks cross-athlete), and cannot insert/update/delete A's.
- P21 — athlete B reads ZERO of athlete A's `consent_events` rows; a signed-out (anon) client
  reads nothing from either consent table.

Twenty-one assertions across five groups. All must pass on staging before any prod apply (§6).

---

## 4. Bounded sync + storage back-pressure (TR-03 cure)

TR-03's second half: ten unbounded `select('*')` pulls into localStorage with
alert-and-swallow overflow (`SyncService.js:227-236`). The append-only store must not
reintroduce that wall.

**Read patterns (bounded, explicit-column, paginated):**
- **No `select('*')` on any substrate table.** Every read lists columns explicitly (the same
  discipline `teams` already forced after WP-50 column-revoke). This also keeps raw-vital
  columns out of accidental wide reads.
- **Bounded windows.** Trend reads take a time window (`computed_for >= now() - interval 'N
  days'`) or a row cap (`.order('created_at', {ascending:false}).limit(N)`) — never the whole
  history. Long-horizon queries paginate with `.range()`; the append-only store is designed for
  windowed reads, not whole-table drains.
- **The plan path never reads the substrate at all** (§5) — so sign-in does not pull it. Only
  the async analytics band fetches, off the request path (DAAS §2.3), into read-models.
- **`squad_signal_snapshots`** is read by the coach board as the latest snapshot per member
  (`distinct on (user_id) ... order by user_id, created_at desc`) plus a bounded trend window —
  never a full-table pull per sign-in (retires the TR-17 "full-table pulls per sign-in" wall).

**Write / quota back-pressure:**
- **Retention classes** (DAAS §2.1.1): `career` (test_results, session_outcomes,
  block_outcomes, injuries — the backbone, never silently thinned); `window` (high-frequency
  `monitoring_entries` from devices retained raw for a bounded window, with derived dailies
  materialised to `career` before expiry — a *declared* truncation surfaced per Art 15);
  `ephemeral` (transport artefacts). Expiry is a governed, logged job, never a silent drop
  (DAAS §3.6).
- **The 256 KB blob is retired.** No single row grows unbounded: history is many bounded rows.
  The `users.profile` size cap stays as a backstop, but it no longer gates history.
- **Overflow is surfaced, never swallowed** (Art 15) — the direct inverse of TR-03's
  alert-and-swallow. A failed/oversized write is recorded and reported; degraded state is
  *said* to the log and, where it affects understanding, to the human (DAAS §8.4).

---

## 5. The engine seam — who writes, who reads

The load-bearing separation (Art 18 purity; DAAS §2.3 / EDS D16 / D17; TAS §4.3/§4.5):

- **WRITTEN by the impure L3/L4 app layer.** `PlanService.js` (block close →
  `block_outcomes`; session close → `session_outcomes`), `SyncService.js` (persistence),
  the ingestion ACLs (`monitoring_entries`, `external_load_observations`, `match_performances`,
  `test_results`), the readiness runtime (`readiness_snapshots`), the baseline updater
  (`baselines`), and the analytics serving layer (`served_artefacts`, `squad_signal_snapshots`).
  These are impure by design (clock, I/O) — they are NOT the engine.
- **READ by the async band ONLY.** **D17** (Observation & Analysis — interpretation:
  trends, anomalies, recovery analytics, benchmark comparisons) reads the record to produce
  Insights; **D16** (priors/learning) reads `block_outcomes` as evidence for staged priors.
  Both run off the request path, materialising read-models (DAAS §2.3). Neither is on the
  synchronous plan path.
- **NEVER on the pure plan path.** `packages/engine` `generatePlan(profile)` reads nothing
  from the substrate — same profile, same plan, dates from `profile.plan_start_date`, no I/O
  (Art 18; CLAUDE.md engine-purity hard rule). Analytical products reach the engine *only* as
  typed D17 outputs on the next planning loop (DAAS §2.4 — D17 is the sole entry), never by a
  substrate read inside construction.

**Why this makes rollback safe (§6.3):** because the plan path never depends on the substrate,
disabling the async readers restores exact pre-M5 behaviour with no data loss.

### 5.3 The `block_outcomes` record shape D16 will consume (🔒 7)

M5's later D16-promotion work (🔒 7 — staged→learned priors) needs a defined record. This
design fixes it so 🔒 7 has a stable contract. **[DAAS-EXTENSION CANDIDATE]** — the DAAS §2.3.1
draws the Insight/Prediction boundary to D16 but does not specify the prior-substrate row
shape; EDS D16 owns the promotion mechanics. This shape must be co-ratified by EDS D16 + DAAS,
not adopted here unilaterally.

```
block_outcome.outcome_signals  (the typed payload D16 reads as evidence)
  {
    quality_id:        e.g. 'max_strength' | 'hypertrophy' | 'aerobic_support',
    planned_dose:      { volume, intensity, frequency },       -- the guardrail the block ran under
    achieved_dose:     { volume, intensity, frequency },       -- from session_outcomes
    adherence_pct:     numeric,
    response_delta:    { e1rm_pct, monitoring_drift, ... },    -- the measured response
    confidence:        numeric,   -- per §4.2: input reliability × completeness × baseline maturity
    stamp:             { engine_version, knowledge_set_version, method_version }
  }
```

D16 consumes `outcome_signals` **as evidence only** — capped at soft-input authority until the
KA internal-evidence rung exists (DAAS §6.3; Art 13). It never gates. The append-only history
is what lets D16's track record be audited (AIGAS §16 discipline).

---

## 6. Migration & rollback plan (design-level)

### 6.1 The versioned migration this becomes

A single dated migration, e.g. `supabase/migrations/20260716_m5_outcomes_substrate.sql`
(date TBD at authoring, post-🔒 6). It creates the twelve tables (§1, §2, §3.4), the
`has_active_grant` predicate, the append-only guard + server-truth + cleanup triggers, the
extended `delete_user()` / new `export_user_record()` RPCs, and the RLS policies — with **no
change to any existing table's policies** (the team spine adds no policy to raw tables;
neither does M5). It also reconciles `schema.sql` (the full-current-schema mirror) in the same
commit.

### 6.2 The ledger row + runbook

A row is added to `supabase/migrations/README.md` (the canonical ledger) on the established
pattern, e.g.:

> `20260716_m5_outcomes_substrate.sql` | 2026-07-16 | M5 outcomes substrate: append-only
> observation/derivation tables (block_outcomes, session_outcomes, readiness_snapshots,
> monitoring_entries, test_results, match_performances, external_load_observations, baselines,
> served_artefacts), the cross-person squad_signal_snapshots (derived-only), consent_grants +
> consent_events, has_active_grant() + append-only/cleanup triggers, extended delete_user() +
> export_user_record() | **No — staging only** until 🔒 6 + panel; prod apply is the human-gated
> `supabase/SECURITY-DEPLOY.md` step.

**The runbook** follows the proven order (`SECURITY-DEPLOY.md`): (1) apply to **staging**;
(2) run `rls-harness.mjs` extended with the §3.5 proof set — **all 21 assertions green**;
(3) Simon reviews; (4) `supabase db push` to **prod** with Simon's approval. No prod apply
without the harness green (the "policies ship only with their proofs" rule, TEAM-ARCH §5).

### 6.3 Rollback

Because the substrate is append-only and read only by the async band (§5), rollback is clean
and lossless:

1. **Disable the readers** (feature-flag D17 analytics + D16 promotion OFF, and hide the
   analytics surfaces). The app returns to exact pre-M5 behaviour — the plan path never read
   the substrate, so nothing in coaching changes.
2. **Data is retained** (append-only; no destructive step). Re-enabling the readers resumes
   from the intact record.
3. Only if the tables themselves must go (extreme case) is a `drop`-style down-migration
   authored — but the default rollback touches *readers*, not schema, and loses nothing
   (DAAS §9 / `11-MIGRATION-PHASES.md` §6 posture).

### 6.4 DRAFT migration — NOT-APPLIED review artefact

> **⚠ THIS IS A REVIEW ARTEFACT, NOT A MIGRATION FILE. It is intentionally in the design doc,
> not in `supabase/migrations/`. It ships nothing. Do not copy it into a migration until after
> the privacy panel and 🔒 6.** Shown abbreviated (one owner-private table + the crossing table
> + the consent predicate) to let the panel review the *exact* SQL shape; the full set follows
> the identical patterns in §1.3 / §3.

```sql
-- DRAFT — NOT APPLIED — review only (M5 outcomes substrate)
create table if not exists public.block_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  supersedes_id uuid references public.block_outcomes(id),
  engine_version text not null, knowledge_set_version text not null,
  method_id text not null, method_version text not null,
  computed_for date, input_refs jsonb not null default '[]'::jsonb,
  plan_id uuid references public.training_plans(id) on delete set null,
  block_index int, period_start date, period_end date,
  goal_snapshot jsonb, planned jsonb, observed jsonb, outcome_signals jsonb
);
alter table public.block_outcomes enable row level security;
create policy "own rows read"   on public.block_outcomes for select using (auth.uid() = user_id);
create policy "own rows insert" on public.block_outcomes for insert with check (auth.uid() = user_id);
create policy "own rows delete" on public.block_outcomes for delete using (auth.uid() = user_id);
create trigger block_outcomes_no_update before update on public.block_outcomes
  for each row execute function public.forbid_evidence_update();

create table if not exists public.squad_signal_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  engine_version text not null, knowledge_set_version text not null,
  method_id text not null, method_version text not null,
  computed_for date, input_refs jsonb not null default '[]'::jsonb,
  readiness int, load_state text, acwr numeric, adherence_pct numeric,
  injury_status text, confidence numeric,
  created_at timestamptz not null default now(),
  supersedes_id uuid references public.squad_signal_snapshots(id)
  -- NOTE: NO raw-vital column exists. Adding one is a schema change that fails the privacy sweep.
);
alter table public.squad_signal_snapshots enable row level security;
create policy "own snapshot insert" on public.squad_signal_snapshots
  for insert with check (auth.uid() = user_id and is_member_of_team(team_id));
create policy "member or consented coach" on public.squad_signal_snapshots
  for select using (
    auth.uid() = user_id
    or (coach_reads_member(team_id, user_id)
        and has_active_grant(user_id, team_id, 'squad_signals')));
create policy "own snapshot delete" on public.squad_signal_snapshots
  for delete using (auth.uid() = user_id);

create or replace function public.has_active_grant(member uuid, team uuid, want_scope text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from consent_grants g
    where g.grantor_user_id = member and g.grantee_team_id = team
      and g.scope = want_scope and g.revoked_at is null);
$$;
-- DRAFT ENDS — NOT APPLIED
```

---

## 6.5 Conditions & open decisions (privacy panel: SOUND WITH CONDITIONS, 2026-07-15)

The adversarial privacy panel returned **SOUND WITH CONDITIONS**: no raw-data-crossing path
exists. Three BLOCKING doc-fixes were applied to this design before 🔒 6 (B1 — enable RLS on
both consent tables, §3.2; B2 — cross-athlete isolation proofs P20/P21 for the consent pair,
§3.5; B3 — the leak floor reframed off the not-yet-built CI sweep and P17 relabelled
recorded-not-enforced, §0/§3.4/§3.5). The following carry forward to the migration author and
to Simon, recorded verbatim so nothing is lost.

**CONDITIONS on the real migration** (must be authored into the migration and be **green on
staging** before any prod apply):
- **C1** — `squad_signal_snapshots` ships WITH its server-truth trigger (generalising
  `player_status_server_truth`) AND the append-only guard trigger, AND a proof that **a member
  cannot publish false snapshot values** (injury_status / readiness overridden from the
  member's own owner-private data; soft metrics clamped). No snapshot table without this trigger.
- **C2** — a **lock-down / oracle proof** that a non-coach cannot use `has_active_grant` to
  enumerate grants: the SECURITY DEFINER function must be constantly false for a non-coach of
  `team` (never a membership/consent oracle), mirroring the `coach_reads_member` non-oracle
  posture (`schema.sql`).
- **C3** — **all 12 tables explicitly listed in `delete_user()`** (the nine owner-private, the
  cross-person snapshot, and the consent pair) — belt-and-suspenders beyond `ON DELETE CASCADE`,
  matching the existing explicit-delete pattern for the team surfaces.

**D1 — RESOLVED (Simon 2026-07-15): POLICY-ONLY revocation.** On consent revocation, the crossing
ends at the **RLS policy layer only** (`has_active_grant()` → false; the coach reads nothing
forward). The athlete's own `squad_signal_snapshots` history is **kept, never deleted** — it is
the athlete's dated career record, which they own and Art 22 export must return; destroying the
owner's own evidence to end someone else's read is rejected. There is **no
`consent_revocation_cleanup` DELETE trigger** on `squad_signal_snapshots`. (The F3
*membership-ended* cleanup of `player_status` is unaffected — that row is a pure coach surface
with no athlete-history role.) The migration authored from this design implements policy-only.

**DEFERRED (explicit, priced):**
- **D2** — RLS-harness CI-gating (TR-11): the harness is manual/non-CI, so the 21 assertions
  (incl. P20/P21) inherit that gap until it is CI-gated. Deferred, not dropped.
- **EXT-5 / DAAS §9 S1** — Metric Dictionary authoring (the `privacy_class` the future CI
  privacy sweep keys on). The M5 leak floor does NOT depend on it (§0 law 3, §3.4); it is a
  future automated backstop and a sequencing prerequisite the panel noted.

---

## 7. Panel-review readiness checklist

Each governing requirement, and the one line by which this design satisfies it:

| # | Requirement (source) | How this design satisfies it |
|---|---|---|
| 1 | **Art 11 — no raw crossing** | Nine owner-private tables carry raw/raw-bearing data with NO coach policy; the sole cross-person table (`squad_signal_snapshots`) has no raw-vital column by construction — a leak needs an `ALTER TABLE` + a failing privacy sweep (§0 law 3, §3.4). Proofs P4, P10. |
| 2 | **Art 22 — ownership / consent / revocation / erasure / secondary use** | `consent_grants` + `consent_events` make consent durable, inspectable, revocable athlete state; membership never implies visibility (grant required, §3.4); revocation ends the crossing forward at the policy layer (`has_active_grant` false; the cleanup-delete on revocation is Simon-decision D1, §6.5); `secondary_use`/`ai_processing` flags recorded now (enforced later, P17/§6.3); `export_user_record()` + extended `delete_user()` (§2.3). Proofs P12–P21. |
| 3 | **Art 21 — developmental-stage duty of care** | `test_results` / `baselines` carry maturity and protocol/mapping versions so youth/masters comparisons render humbly and stage-appropriately; benchmark authority is capped downstream (DAAS §6.1) — the substrate never presents a population constant as a developing athlete's "normal" (§1.3 baselines). |
| 4 | **TEAM-ARCHITECTURE isolation (coach access additive + team-scoped + derived-only)** | The crossing reuses `coach_reads_member` (team-scoped, F3) AND adds `has_active_grant`; the server-truth trigger keeps the board derived + honest; raw tables get no new policy (§3.1, §3.4). Proofs P7–P11. |
| 5 | **The RLS proof set** | Twenty-one assertions across owner-isolation, append-only integrity, the derived crossing, consent-revocation, and the consent-pair cross-athlete isolation — all must be green on staging before prod (§3.5, §6.2). |
| 6 | **Derived-data doctrine — stamping** | Every derived/materialised row carries `engine_version × knowledge_set_version` + `method_id/version` + `input_refs` + `computed_for`; read strictly as "what was computed then"; corrections append via `supersedes_id`; a CI stamp-presence check gates every materialised class (§1.2; DAAS §3.2). |
| 7 | **DAAS §3 record shape** | Append-only observations + dated materialised derivations + baselines + consent grants compose the career-long owner-owned record; reconstruction grades R1/R2/R3 hold (observations exact; derivations exact from materialisation start; no back-computation); history is never re-served as current (§1, §3; DAAS §3.1–§3.4). |

### 7.1 DAAS-extension candidates flagged (not silently diverged)

Where this design proposes a shape the DAAS does not own, it is queued, not adopted:

- **[EXT-1]** `consent_grants` / `consent_events` table shapes — DAAS §3.5 defers storage-layer
  consent mechanics to the GA-510 TAS-side consent-enforcement companion spec. §2's shapes
  must ratify into GA-510 (or a DAAS §3.5 appendix).
- **[EXT-2]** `block_outcomes.outcome_signals` typed payload — the D16 prior-substrate row
  shape (§5.3) must be co-ratified by EDS D16 + DAAS §2.3.1; this design fixes a *candidate*
  contract for 🔒 7, not a final one.
- **[EXT-3]** `served_artefacts` realising DAAS §3.2's "every Insight/Report served is
  evidence" — the concrete table + the DAAS §8.1 artefact contract as stored columns is
  proposed here; DAAS §8.1 owns the contract, so column-mapping should be confirmed against it.
- **[EXT-4]** `squad_signal_snapshots` as `player_status` history — DAAS §5.2 mandates
  snapshot history and §1.5 records the point-in-time-only limitation; the concrete append-only
  shape + the consent-gated crossing policy is proposed here for ratification.
- **[EXT-5]** The Metric Dictionary `privacy_class` (`raw-vital` | `derived-safe`) that the
  RLS/privacy sweep keys on lives engine-side (DAAS §4.1, KA registry pattern), not as a DB
  table; M5 references it. Its authoring is DAAS §9 S1 (Metric Dictionary v1), a prerequisite
  the panel should note as sequencing.

### 7.2 Self-review (against the spec's bar)

- No migration file created — the only SQL is the §6.4 artefact, explicitly NOT-APPLIED and
  outside `supabase/migrations/`; `schema.sql` untouched. ✓
- Every new table has an explicit RLS policy (§3.1, §3.2, §3.4) and appears in the proof set
  (§3.5). ✓
- Consent revocation ends the crossing — policy (`has_active_grant`) + cleanup trigger, the F3
  pattern generalised; proofs P12–P16. ✓
- Raw data never crosses — a coach-visible column is always derived; the sole cross-person
  table has no raw column, so a leak requires a schema change. ✓
- Append-only + stamp discipline honours the derived-data doctrine (no UPDATE policy + guard
  trigger; `supersedes_id`; engine×knowledge stamp on every derived row). ✓
- Banner says DESIGN / no DB change ships. ✓

---

*End — M5 Outcomes Substrate Schema & Privacy Design (PROPOSED for privacy panel review +
🔒 6). No database change ships from this document.*
