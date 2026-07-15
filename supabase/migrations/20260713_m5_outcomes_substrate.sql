-- 20260713_m5_outcomes_substrate.sql — M5: the athlete's append-only career
-- record + consent model + RLS. The platform's most privacy-sensitive migration.
--
-- WHAT THIS DOES
--   Builds the outcomes substrate designed in
--   docs/design/m5-substrate/SCHEMA-AND-PRIVACY.md (ratified — privacy panel
--   SOUND WITH CONDITIONS + 🔒 6). Twelve new tables:
--     * NINE owner-private, append-only tables carrying every raw / raw-bearing
--       observation + materialised derivation (block_outcomes, session_outcomes,
--       readiness_snapshots, monitoring_entries, test_results, match_performances,
--       external_load_observations, baselines, served_artefacts);
--     * ONE cross-person derived roll-up (squad_signal_snapshots) — the only table
--       a coach can ever read across a person boundary, and it has NO raw-vital
--       column by construction;
--     * the CONSENT pair (consent_grants + consent_events).
--   Plus: has_active_grant() (the consent predicate), the append-only guard +
--   snapshot server-truth triggers, the consent audit trigger, and an extended
--   delete_user() that explicitly erases all 12 new tables (C3).
--
--   The four architectural laws are enforced in the SCHEMA, not by reviewer
--   vigilance (design §0): (1) append-only evidence — no UPDATE policy + a guard
--   trigger, corrections append via supersedes_id; (2) owner-private at rest —
--   auth.uid() = user_id on every table, NO coach policy on any raw-bearing table;
--   (3) only a derived roll-up crosses a person boundary, and only by consent —
--   squad_signal_snapshots requires BOTH active membership AND an active grant;
--   (4) every derived row is stamped engine_version × knowledge_set_version.
--   A coach-visible raw value is therefore impossible without an ALTER TABLE +
--   a new coach policy — a deliberate schema change, never a coding slip (Art 11).
--
-- LINEAGE
--   Generalises the F3 / player_status team-isolation pattern
--   (20260712_player_status_membership_scope.sql + schema.sql): SECURITY DEFINER
--   helpers with search_path pinned, server-truth triggers that override the
--   safety fields from the member's OWN owner-private data, and coach reads that
--   end the instant the membership (coach_reads_member) OR the consent
--   (has_active_grant) lapses. player_status stays the CURRENT-row coach surface;
--   squad_signal_snapshots is its append-only, consent-gated dated history.
--
-- REVOCATION IS POLICY-ONLY (🔒 D1, Simon 2026-07-15)
--   Revoking a grant ends the coach's crossing FORWARD at the RLS policy layer
--   (has_active_grant() → false). The athlete's own snapshot rows are KEPT — they
--   are the athlete's dated career record (Art 22 export must return them). There
--   is deliberately NO delete-own-history trigger on squad_signal_snapshots, on
--   revocation OR on membership-end; the policy predicates are the complete
--   control. Erasure (delete_user) stays the athlete's ONLY destructive path.
--
-- STAGING-FIRST, SIMON-APPLIED
--   Idempotent, like the rest of the chain. This file is AUTHORED but NOT APPLIED
--   by any agent. It is applied to STAGING first and proven with the extended
--   RLS harness (supabase/tests/rls-harness-m5.mjs — all of P1–P21 + C1/C2/C3
--   green) before Simon runs the human-gated prod apply per
--   supabase/SECURITY-DEPLOY.md. Policies ship only with their proofs
--   (docs/product/TEAM-ARCHITECTURE.md §5).

-- ============================================================================
-- 0) SHARED HELPERS / TRIGGER FUNCTIONS
-- ============================================================================

-- Append-only guard (design §0 law 1, §3.1). Belt-and-suspenders on top of the
-- "no UPDATE policy" RLS default-deny: even a future policy slip that let an
-- UPDATE through is rejected here. A correction is a NEW row that supersedes the
-- old one (supersedes_id), never an in-place edit.
create or replace function public.forbid_evidence_update()
returns trigger language plpgsql as $$
begin
  raise exception 'evidence rows are append-only; insert a superseding row (supersedes_id)';
end; $$;

-- NOTE: has_active_grant() is a LANGUAGE sql function that references
-- consent_grants, so with check_function_bodies on (the default) it can only be
-- created AFTER that table exists — it is defined at the end of section 2, just
-- before the squad_signal_snapshots policy (§3) that consumes it.

-- ============================================================================
-- 1) THE NINE OWNER-PRIVATE, APPEND-ONLY TABLES (design §1.3, §3.1)
--
-- Shared columns on every substrate table (design §1.2):
--   id, user_id (the OWNER), created_at (immutable), supersedes_id (self-FK).
-- Derived/materialised tables ALSO carry the derived stamp (design §1.2; TAS
-- §4.1): engine_version × knowledge_set_version + method_id/method_version +
-- computed_for + input_refs. Observation tables carry the provenance contract
-- (design §1.2, DAAS §2.1.1): metric_id, provenance_class, reliability_tag,
-- source_system, observed_at, quality_flags — quality descriptors, NOT
-- confidence (confidence is born at derivation).
-- ============================================================================

-- ── block_outcomes (derived) — the D16 prior substrate; TR-03 cure ──────────
create table if not exists public.block_outcomes (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users(id) on delete cascade,
  created_at            timestamptz not null default now(),
  supersedes_id         uuid references public.block_outcomes(id),
  engine_version        text not null,
  knowledge_set_version text not null,
  method_id             text not null,
  method_version        text not null,
  computed_for          date,
  input_refs            jsonb not null default '[]'::jsonb,
  plan_id               uuid references public.training_plans(id) on delete set null,
  block_index           int,
  period_start          date,
  period_end            date,
  goal_snapshot         jsonb,
  planned               jsonb,
  observed              jsonb,
  outcome_signals       jsonb
);
create index if not exists idx_block_outcomes_user on public.block_outcomes(user_id, created_at desc);

-- ── session_outcomes (derived) — per-session materialisation on close ───────
create table if not exists public.session_outcomes (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users(id) on delete cascade,
  created_at            timestamptz not null default now(),
  supersedes_id         uuid references public.session_outcomes(id),
  engine_version        text not null,
  knowledge_set_version text not null,
  method_id             text not null,
  method_version        text not null,
  computed_for          date,
  input_refs            jsonb not null default '[]'::jsonb,
  session_id            uuid references public.sessions(id) on delete set null,
  completed_on          date,
  adherence_pct         numeric,
  volume_by_quality     jsonb,
  e1rm_by_lift          jsonb,
  session_load          numeric
);
create index if not exists idx_session_outcomes_user on public.session_outcomes(user_id, created_at desc);

-- ── readiness_snapshots (derived) — daily readiness/load as computed that day ─
-- NOTE: DERIVED. The raw vitals behind it stay in daily_metrics (owner-only) and
-- are NOT copied here.
create table if not exists public.readiness_snapshots (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users(id) on delete cascade,
  created_at            timestamptz not null default now(),
  supersedes_id         uuid references public.readiness_snapshots(id),
  engine_version        text not null,
  knowledge_set_version text not null,
  method_id             text not null,
  method_version        text not null,
  computed_for          date,
  input_refs            jsonb not null default '[]'::jsonb,
  readiness             int,
  load_state            text,
  acwr                  numeric,
  baseline_maturity     numeric
);
create index if not exists idx_readiness_snapshots_user on public.readiness_snapshots(user_id, created_at desc);

-- ── monitoring_entries (observation) — the governed longitudinal stream ─────
-- One row PER METRIC PER OBSERVATION, provenance-split (a self-report and a
-- device reading are TWO rows). Some rows here ARE raw vitals (metric_id whose
-- Metric Dictionary privacy_class = 'raw-vital'): owner-only forever, NO coach
-- policy — the Art 11 floor asserted on the data (proof P4).
create table if not exists public.monitoring_entries (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users(id) on delete cascade,
  created_at            timestamptz not null default now(),
  supersedes_id         uuid references public.monitoring_entries(id),
  metric_id             text not null,
  provenance_class      text not null,
  reliability_tag       text,
  source_system         text,
  observed_at           timestamptz not null,
  quality_flags         jsonb not null default '{}'::jsonb,
  value                 numeric,
  unit                  text,
  window_start          timestamptz,
  window_end            timestamptz
);
create index if not exists idx_monitoring_entries_user on public.monitoring_entries(user_id, observed_at desc);
create index if not exists idx_monitoring_entries_metric on public.monitoring_entries(user_id, metric_id, observed_at desc);

-- ── test_results (observation) — one administration of a versioned protocol ──
create table if not exists public.test_results (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users(id) on delete cascade,
  created_at            timestamptz not null default now(),
  supersedes_id         uuid references public.test_results(id),
  metric_id             text not null,
  provenance_class      text not null,
  reliability_tag       text,
  source_system         text,
  observed_at           timestamptz not null,
  quality_flags         jsonb not null default '{}'::jsonb,
  assessment_id         text not null,
  protocol_version      text not null,
  raw_values            jsonb not null,
  derived_score         numeric,
  score_map_version     text,
  conditions            jsonb
);
create index if not exists idx_test_results_user on public.test_results(user_id, observed_at desc);

-- ── match_performances (observation) — exposure + output; availability is a
-- STATUS fact, never clinical detail (Art 11) ───────────────────────────────
create table if not exists public.match_performances (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users(id) on delete cascade,
  created_at            timestamptz not null default now(),
  supersedes_id         uuid references public.match_performances(id),
  metric_id             text not null,
  provenance_class      text not null,
  reliability_tag       text,
  source_system         text,
  observed_at           timestamptz not null,
  quality_flags         jsonb not null default '{}'::jsonb,
  fixture_ref           text,
  played_on             date,
  minutes               numeric,
  availability_status   text,
  return_horizon        date,
  output_kpis           jsonb,
  context               jsonb
);
create index if not exists idx_match_performances_user on public.match_performances(user_id, played_on desc);

-- ── external_load_observations (observation) — GPS/accelerometry/pitch-RPE ──
create table if not exists public.external_load_observations (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users(id) on delete cascade,
  created_at            timestamptz not null default now(),
  supersedes_id         uuid references public.external_load_observations(id),
  metric_id             text not null,
  provenance_class      text not null,
  reliability_tag       text,
  source_system         text,
  observed_at           timestamptz not null,
  quality_flags         jsonb not null default '{}'::jsonb,
  session_ref           text,
  observed_on           date,
  distance_m            numeric,
  sprint_count          int,
  high_speed_m          numeric,
  pitch_rpe             numeric,
  raw                   jsonb
);
create index if not exists idx_external_load_user on public.external_load_observations(user_id, observed_on desc);

-- ── baselines (derived) — personal per-metric baseline VALUES (DAAS §3.4) ────
create table if not exists public.baselines (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users(id) on delete cascade,
  created_at            timestamptz not null default now(),
  supersedes_id         uuid references public.baselines(id),
  engine_version        text not null,
  knowledge_set_version text not null,
  method_id             text not null,
  method_version        text not null,
  computed_for          date,
  input_refs            jsonb not null default '[]'::jsonb,
  metric_id             text not null,
  central               numeric,
  spread                numeric,
  maturity              numeric
);
create index if not exists idx_baselines_user on public.baselines(user_id, metric_id, created_at desc);

-- ── served_artefacts (derived) — every Insight/Report shown to a human is
-- itself evidence, reproducible verbatim (DAAS §3.2) ────────────────────────
create table if not exists public.served_artefacts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users(id) on delete cascade,
  created_at            timestamptz not null default now(),
  supersedes_id         uuid references public.served_artefacts(id),
  engine_version        text not null,
  knowledge_set_version text not null,
  method_id             text not null,
  method_version        text not null,
  computed_for          date,
  input_refs            jsonb not null default '[]'::jsonb,
  artefact_type         text not null,   -- 'insight'|'report'|'benchmark'|'squad_signal'
  audience              text not null,   -- 'athlete'|'coach'|'engineer'
  statement             jsonb not null,
  derivation            jsonb not null,
  quality               jsonb not null,
  authority             jsonb not null,
  privacy_class         text not null,   -- max of inputs' classes (DAAS §4.2 rule 6)
  served_at             timestamptz not null default now()
);
create index if not exists idx_served_artefacts_user on public.served_artefacts(user_id, served_at desc);

-- ── RLS + append-only guard for the nine owner-private tables (design §3.1) ──
-- All identical: read/insert/delete YOUR OWN rows; NO update policy (append-only
-- → RLS default-denies in-place edits); NO cross-person policy AT ALL. These
-- carry raw vitals + raw-bearing derivations; a coach gets zero row access —
-- the same discipline as daily_metrics / wearable_readings. Default-deny is the
-- posture: a table with RLS on and no matching policy returns nothing.
do $$
declare t text;
begin
  foreach t in array array[
    'block_outcomes','session_outcomes','readiness_snapshots','monitoring_entries',
    'test_results','match_performances','external_load_observations','baselines',
    'served_artefacts'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists "own rows read" on public.%I;', t);
    execute format('create policy "own rows read" on public.%I
                      for select using (auth.uid() = user_id);', t);

    execute format('drop policy if exists "own rows insert" on public.%I;', t);
    execute format('create policy "own rows insert" on public.%I
                      for insert with check (auth.uid() = user_id);', t);

    -- owner delete = the Art 22 erasure right; the ONLY destructive path an owner has
    execute format('drop policy if exists "own rows delete" on public.%I;', t);
    execute format('create policy "own rows delete" on public.%I
                      for delete using (auth.uid() = user_id);', t);

    -- (deliberately NO "for update" policy → RLS default-denies in-place edits)

    execute format('drop trigger if exists %I_no_update on public.%I;', t, t);
    execute format('create trigger %I_no_update before update on public.%I
                      for each row execute function public.forbid_evidence_update();', t, t);
  end loop;
end $$;

-- ============================================================================
-- 2) CONSENT — consent_grants (state) + consent_events (append-only audit)
--    (design §2; Art 22). [DAAS-EXTENSION CANDIDATE — ratify into GA-510.]
-- ============================================================================

-- consent_grants — the CURRENT state of every grant the athlete has made.
create table if not exists public.consent_grants (
  id               uuid primary key default gen_random_uuid(),
  grantor_user_id  uuid not null references public.users(id) on delete cascade,  -- the ATHLETE (always)
  grantee_kind     text not null,    -- 'team' | 'coach' | 'platform_research'
  grantee_team_id  uuid references public.teams(id) on delete cascade,           -- for team/coach grants
  scope            text not null,    -- 'derived_status' | 'availability' | 'plan_adherence' | 'squad_signals'
  granularity      jsonb not null default '{}'::jsonb,
  secondary_use    boolean not null default false,   -- Art 22: research/benchmark use is a DISTINCT flag
  purpose          text,             -- required (app-side) when secondary_use = true
  ai_processing    boolean not null default false,   -- may a C5 scan read under this grant?
  granted_at       timestamptz not null default now(),
  revoked_at       timestamptz,      -- null = active; set = revoked/ended (closes the crossing FORWARD)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (grantor_user_id, grantee_kind, grantee_team_id, scope)
);
create index if not exists idx_consent_grants_grantor on public.consent_grants(grantor_user_id);
create index if not exists idx_consent_grants_team on public.consent_grants(grantee_team_id);

-- consent_events — the append-only audit trail (durable, inspectable — Art 22).
create table if not exists public.consent_events (
  id               uuid primary key default gen_random_uuid(),
  grant_id         uuid references public.consent_grants(id) on delete set null,
  grantor_user_id  uuid not null references public.users(id) on delete cascade,
  event            text not null,    -- 'granted' | 'revoked' | 'scope_narrowed' | 'expired'
  detail           jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists idx_consent_events_grantor on public.consent_events(grantor_user_id, created_at desc);
create index if not exists idx_consent_events_grant on public.consent_events(grant_id);

-- keep consent_grants.updated_at fresh (revocation flips revoked_at via UPDATE)
drop trigger if exists trg_consent_grants_updated on public.consent_grants;
create trigger trg_consent_grants_updated
  before update on public.consent_grants
  for each row execute function set_updated_at();

-- Every write to consent_grants appends a consent_events row (design §2.1). The
-- audit trail is thus server-truth: it cannot be forged or skipped by a client.
-- SECURITY DEFINER so it can insert into consent_events (which has NO client
-- insert policy — inserts are trigger-only).
create or replace function public.consent_grants_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into consent_events (grant_id, grantor_user_id, event, detail)
      values (new.id, new.grantor_user_id, 'granted',
              jsonb_build_object('scope', new.scope, 'grantee_kind', new.grantee_kind,
                                 'grantee_team_id', new.grantee_team_id,
                                 'secondary_use', new.secondary_use,
                                 'ai_processing', new.ai_processing));
  elsif tg_op = 'UPDATE' then
    if new.revoked_at is not null and old.revoked_at is null then
      insert into consent_events (grant_id, grantor_user_id, event, detail)
        values (new.id, new.grantor_user_id, 'revoked', jsonb_build_object('scope', new.scope));
    elsif new.granularity is distinct from old.granularity then
      insert into consent_events (grant_id, grantor_user_id, event, detail)
        values (new.id, new.grantor_user_id, 'scope_narrowed', jsonb_build_object('scope', new.scope));
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists consent_grants_audit on public.consent_grants;
create trigger consent_grants_audit
  after insert or update on public.consent_grants
  for each row execute function public.consent_grants_audit();

-- RLS — consent_grants (design §3.2). MUST be enabled (B1: the panel's leak — an
-- un-RLS'd consent table falls back to the blanket authenticated grant, leaking a
-- cross-athlete map of who-consented-to-what). The athlete manages ONLY their own
-- grants; a named coach may READ (never write) grants that name their team.
alter table public.consent_grants enable row level security;

drop policy if exists "grantor manages grants" on public.consent_grants;
create policy "grantor manages grants" on public.consent_grants
  for all using (auth.uid() = grantor_user_id) with check (auth.uid() = grantor_user_id);

drop policy if exists "named coach reads their grants" on public.consent_grants;
create policy "named coach reads their grants" on public.consent_grants
  for select using (grantee_team_id is not null and is_coach_of_team(grantee_team_id));

-- RLS — consent_events (design §3.2; B1). Owner reads their OWN audit trail;
-- inserts are trigger-only (SECURITY DEFINER above), so there is NO insert policy.
alter table public.consent_events enable row level security;

drop policy if exists "own consent events read" on public.consent_events;
create policy "own consent events read" on public.consent_events
  for select using (auth.uid() = grantor_user_id);

-- has_active_grant (design §3.3): is there a live grant from `member` to the
-- coach's `team`, covering `want_scope`? SECURITY DEFINER + search_path pinned,
-- mirroring coach_reads_member. Defined here (not in §0) because it references
-- consent_grants, which must already exist.
--
-- C2 — ORACLE LOCKDOWN. The predicate is gated on is_coach_of_team(team), so for
-- any caller who is NOT an active coach of `team` it is CONSTANTLY FALSE — it can
-- never be used to enumerate who-consented-to-what (never a consent oracle),
-- exactly the non-oracle posture of coach_reads_member. The consent join only
-- ever answers "yes" to a coach who could already read the roster.
create or replace function public.has_active_grant(member uuid, team uuid, want_scope text)
returns boolean language sql security definer stable
set search_path = public as $$
  select is_coach_of_team(team)   -- C2: false for any non-coach of `team`
     and exists (
       select 1 from consent_grants g
       where g.grantor_user_id = member
         and g.grantee_team_id  = team
         and g.scope            = want_scope
         and g.revoked_at is null
     );
$$;

-- ============================================================================
-- 3) THE ONE CROSS-PERSON TABLE — squad_signal_snapshots (design §3.4)
--
-- The append-only history of the derived coach surface; player_status's dated
-- history (closes its point-in-time-only limitation). EVERY column is
-- derived-safe by construction — there is NO raw-vital column, so there is
-- nothing raw for a coach read to expose. Adding one would be an ALTER TABLE.
-- ============================================================================
create table if not exists public.squad_signal_snapshots (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users(id) on delete cascade,   -- the member (owner)
  team_id               uuid not null references public.teams(id) on delete cascade,
  engine_version        text not null,
  knowledge_set_version text not null,
  method_id             text not null,
  method_version        text not null,
  computed_for          date,
  input_refs            jsonb not null default '[]'::jsonb,
  readiness             int,             -- derived score ONLY (never the vitals behind it)
  load_state            text,            -- 'balanced'|'ramping'|'overreaching'|...
  acwr                  numeric,
  adherence_pct         numeric,
  injury_status         text,            -- 'available'|'modified'|'out' (status, never the private notes)
  confidence            numeric,         -- a sparse-data roll-up says so (DAAS §5.2)
  created_at            timestamptz not null default now(),
  supersedes_id         uuid references public.squad_signal_snapshots(id)
  -- NOTE: NO raw-vital column exists. Adding one is a schema change that would
  -- fail the future Metric-Dictionary privacy sweep (EXT-5) — but the guarantee
  -- does NOT depend on that sweep: the protection is the ABSENCE of the column.
);
create index if not exists idx_squad_signal_snapshots_team
  on public.squad_signal_snapshots(team_id, user_id, created_at desc);
create index if not exists idx_squad_signal_snapshots_user
  on public.squad_signal_snapshots(user_id, created_at desc);

-- coach-visible free-text bounds (mirroring player_status, schema.sql)
alter table public.squad_signal_snapshots
  drop constraint if exists chk_squad_signal_texts,
  add  constraint chk_squad_signal_texts
       check (char_length(coalesce(load_state, '')) <= 40
              and char_length(coalesce(injury_status, '')) <= 40) not valid;

-- C1 — SERVER-TRUTH (BEFORE INSERT). Generalises player_status_server_truth: a
-- member can neither publish a false availability nor a value crossing another
-- person's boundary. injury_status / readiness are OVERRIDDEN from the member's
-- OWN owner-private data; the soft trend metrics are clamped. Raw vitals never
-- appear because no raw column exists. Append-only ⇒ the trigger fires only on
-- INSERT (UPDATE is forbidden by the guard below).
create or replace function public.squad_signal_snapshots_server_truth()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.injury_status := derive_injury_status(new.user_id);
  new.readiness     := latest_readiness(new.user_id);
  if new.adherence_pct is not null then
    new.adherence_pct := greatest(0, least(100, new.adherence_pct));
  end if;
  if new.acwr is not null and new.acwr < 0 then new.acwr := null; end if;
  if new.confidence is not null then
    new.confidence := greatest(0, least(1, new.confidence));
  end if;
  if new.load_state is not null
     and new.load_state not in ('no-data','ramping','balanced','high','overreaching')
  then new.load_state := null; end if;
  return new;
end; $$;

drop trigger if exists squad_signal_snapshots_server_truth on public.squad_signal_snapshots;
create trigger squad_signal_snapshots_server_truth
  before insert on public.squad_signal_snapshots
  for each row execute function public.squad_signal_snapshots_server_truth();

-- C1 — APPEND-ONLY GUARD (BEFORE UPDATE). Same guard as the nine owner tables;
-- with no UPDATE policy this is belt-and-suspenders.
drop trigger if exists squad_signal_snapshots_no_update on public.squad_signal_snapshots;
create trigger squad_signal_snapshots_no_update
  before update on public.squad_signal_snapshots
  for each row execute function public.forbid_evidence_update();

-- RLS — squad_signal_snapshots (design §3.4).
alter table public.squad_signal_snapshots enable row level security;

-- the member writes their OWN snapshot (own-row + active membership) — like player_status
drop policy if exists "own snapshot insert" on public.squad_signal_snapshots;
create policy "own snapshot insert" on public.squad_signal_snapshots
  for insert with check (auth.uid() = user_id and is_member_of_team(team_id));

-- the athlete keeps their own record; delete is the athlete's own right (erasure)
drop policy if exists "own snapshot delete" on public.squad_signal_snapshots;
create policy "own snapshot delete" on public.squad_signal_snapshots
  for delete using (auth.uid() = user_id);

-- THE CROSSING — the ONLY cross-person read in the whole substrate. A member
-- reads their own; a coach reads it ONLY with BOTH an active, team-scoped
-- membership (F3: coach_reads_member) AND an active consent grant
-- (has_active_grant). Revoking either ends the read FORWARD at this layer, with
-- no delete of the athlete's own history (🔒 D1 policy-only).
drop policy if exists "member or consented coach" on public.squad_signal_snapshots;
create policy "member or consented coach" on public.squad_signal_snapshots
  for select using (
    auth.uid() = user_id
    or (coach_reads_member(team_id, user_id)
        and has_active_grant(user_id, team_id, 'squad_signals'))
  );
-- (no coach UPDATE/DELETE policy: server-truth + append-only, exactly like player_status)

-- ============================================================================
-- 4) C3 — ERASURE: delete_user() explicitly covers all 12 new tables.
--
-- Belt-and-suspenders beyond ON DELETE CASCADE (matching the existing team-surface
-- pattern in schema.sql). Append-only binds the PLATFORM against silent
-- rewriting; it never limits the athlete's Art 22 erasure right — erasure is the
-- owner's ONLY destructive path. Re-create the whole RPC so this file is the
-- reconciled definition.
-- ============================================================================
create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- pre-M5 surfaces (unchanged)
  delete from public.set_logs          where user_id = uid;
  delete from public.session_logs      where user_id = uid;
  delete from public.sessions          where user_id = uid;
  delete from public.weekly_checkins   where user_id = uid;
  delete from public.reassessments     where user_id = uid;
  delete from public.daily_metrics     where user_id = uid;
  delete from public.injuries          where user_id = uid;
  delete from public.workouts          where user_id = uid;
  delete from public.training_plans    where user_id = uid;
  delete from public.wearable_connections where user_id = uid;
  delete from public.player_status     where user_id = uid;

  -- M5 outcomes substrate (C3): the nine owner-private tables, the cross-person
  -- snapshot, and the consent pair — all explicitly erased.
  delete from public.block_outcomes             where user_id = uid;
  delete from public.session_outcomes           where user_id = uid;
  delete from public.readiness_snapshots        where user_id = uid;
  delete from public.monitoring_entries         where user_id = uid;
  delete from public.test_results               where user_id = uid;
  delete from public.match_performances         where user_id = uid;
  delete from public.external_load_observations where user_id = uid;
  delete from public.baselines                  where user_id = uid;
  delete from public.served_artefacts           where user_id = uid;
  delete from public.squad_signal_snapshots     where user_id = uid;
  delete from public.consent_events             where grantor_user_id = uid;
  delete from public.consent_grants             where grantor_user_id = uid;

  delete from public.team_members      where user_id = uid;   -- teams they FOUNDED cascade via teams.created_by
  delete from public.users             where id = uid;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_user() from public;
grant execute on function public.delete_user() to authenticated;

-- ============================================================================
-- Done. Twelve new tables (verify in the Table Editor):
--   block_outcomes, session_outcomes, readiness_snapshots, monitoring_entries,
--   test_results, match_performances, external_load_observations, baselines,
--   served_artefacts, squad_signal_snapshots, consent_grants, consent_events.
-- Proven by supabase/tests/rls-harness-m5.mjs (P1–P21 + C1/C2/C3) on STAGING
-- before any prod apply (supabase/SECURITY-DEPLOY.md).
-- ============================================================================
