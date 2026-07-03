# Supabase migrations — ledger, convention, and how to apply

This folder is the **versioned history of every database change** since the
baseline schema. `supabase/schema.sql` is the reconciled **full current
schema** (baseline + every migration below); a fresh project bootstrapped from
`schema.sql` is byte-for-byte equivalent to one that ran the whole chain.

This README exists because of the Phase 3 architectural audit (WP-07
"Migration discipline", finding V15): migrations were hand-pasted into the
SQL editor with mixed naming and no ledger. This file is the ledger and the
contract going forward.

---

## The ledger

Every migration, oldest-first by the date it was **written** (git history).
"Applied to prod" is inferred, not proven: there is no CLI migration history
on the production project yet (everything was hand-run in the SQL editor), so
status is inferred from the migration headers ("Run in the SQL editor"), the
features being live in the app, and the commit history. Verify against prod
when you link the CLI (see "Adopting the CLI" below).

| File | Written | What it does | Applied to prod? |
|---|---|---|---|
| `001_wearable_connections.sql` | 2026-06-01 | `wearable_connections` table (OAuth tokens per device), read-only RLS — tokens written only by Edge Functions | Yes (inferred — Fitbit connect is live) |
| `002_allowed_emails.sql` | 2026-06-03 | Invite allowlist table + signup-trigger check | Yes (inferred — allowlist was live in Stage A) |
| `003_delete_user.sql` | 2026-06-05 | `delete_user()` RPC — user deletes own account + all data | Yes (inferred — delete-account is live) |
| `20260612_injury_structured_fields.sql` | 2026-06-12 | Structured injury triage columns on `injuries` (body_region, diagnosis_key, rehab_phase, red flags, …) | Yes (inferred — injury triage is live) |
| `004_remove_invite_allowlist.sql` | 2026-06-18 | Open signup: `handle_new_user()` drops the allowlist check, OAuth `full_name` fallback | Yes (inferred — open signup is live) |
| `005_wearable_roles.sql` | 2026-06-19 | `role` column on `wearable_connections` + one-primary-per-user partial unique index | Yes (inferred — device roles are live) |
| `006_workouts.sql` | 2026-06-19 | `workouts` table (external activities from any provider) | Yes (inferred — Strava ingest is live) |
| `007_set_device_primary_rpc.sql` | 2026-06-19 | `set_device_primary(text)` RPC — atomic primary-device flip | Yes (inferred — primary toggle is live) |
| `008_session_log_physiology.sql` | 2026-06-19 | avg_hr / max_hr / calories / hr_source / hr_zones columns on `session_logs` | Yes (inferred — session HR enrichment is live) |
| `009_avatars_storage.sql` | 2026-06-21 | `avatars` public storage bucket + owner-folder RLS policies | Yes (inferred — avatar upload is live) |
| `010_validation_constraints.sql` | 2026-06-22 | NOT VALID CHECK constraints (value bounds) on session_logs / daily_metrics / weekly_checkins / injuries | Yes (inferred — security-hardening pass) |
| `011_avatars_bucket_limits.sql` | 2026-06-22 | 2 MB + image-MIME limits on the avatars bucket | Yes (inferred — same pass as 010) |
| `012_drop_allowed_emails.sql` | 2026-06-22 | Drops the vestigial `allowed_emails` table (unused since 004, had no RLS) | Yes (inferred — same pass as 010) |
| `20260623_daily_metrics_subjective.sql` | 2026-06-23 | stress / illness / travel columns on `daily_metrics` (subjective wellness) | Yes (inferred — daily check-in is live) |
| `013_set_logs.sql` | 2026-06-28 | `set_logs` table — per-set training history from the session runner | Yes (inferred — per-set logging is live) |
| `20260701_athlete_model.sql` | 2026-07-02 | **No-op** (`select 1`) — audit-trail record of the Athlete Model shape stored in `users.profile.athlete_model` JSONB; no DDL | N/A (nothing to apply) |

### Ordering note (read before replaying the chain)

Filename sort order (`001` … `013`, then `20260612` … `20260701`) is **not**
the historical application order — `20260612` was actually applied between
`003` and `004`. This is harmless: no numbered migration depends on anything a
dated migration creates (and vice versa), so replaying the chain in filename
order produces the same end state. This was verified by reading every file
when this ledger was written. Keep it true: never write a new migration that
depends on running *before* an existing one.

---

## Naming convention

**Existing files keep their names.** They are referenced by name throughout
the repo (schema.sql comments, other migrations, docs, commit messages), the
production project has no CLI migration history to protect, and their
filename sort order is already a valid replay order — renaming would break
every cross-reference and `git log --follow` ergonomics for zero functional
gain, and inventing fake timestamps would misrepresent history.

**New migrations use the Supabase CLI convention:**

```
YYYYMMDDHHMMSS_short_description.sql
e.g. 20260703141500_team_tables.sql
```

Create them with the CLI so the timestamp is generated for you:

```bash
supabase migration new short_description
```

Timestamps sort after both the `0NN` files and the `2026MMDD` files, so the
chain stays totally ordered. Rules:

- One concern per migration; a header comment saying what and why.
- **Idempotent where possible** (`if not exists`, `create or replace`,
  `drop ... if exists` before `create`) — every existing migration is, and it
  is what makes the chain safely replayable.
- Never edit or rename a migration that may have been applied anywhere.
  Fix mistakes with a *new* migration.
- Schema semantics change **only** via a migration file in this folder
  (CLAUDE.md hard rule). Update `supabase/schema.sql` in the same PR so it
  stays the reconciled full state, and add a row to the ledger above.
- Team-package migrations must respect the data-isolation rules in
  `docs/product/TEAM-ARCHITECTURE.md` (raw vitals never coach-readable).

---

## How to apply migrations (going forward: `supabase db push`)

Stop hand-pasting into the SQL editor. Use the CLI's linked-project workflow
so applied history is recorded in the database
(`supabase_migrations.schema_migrations`):

```bash
# one-time: install the CLI and log in
brew install supabase/tap/supabase
supabase login

# one-time per machine: link this repo to a project
supabase link --project-ref <PROJECT_REF>   # ref is in the project's dashboard URL

# see what the project has vs what this folder has
supabase migration list

# apply everything not yet recorded (dry-run first)
supabase db push --dry-run
supabase db push
```

### Adopting the CLI on the EXISTING production project (one-time)

Production already *has* the effects of every migration above, but no
recorded history — a bare `supabase db push` would try to re-run the whole
chain. The migrations are idempotent so that would likely converge, **but do
not risk it on prod**. Instead, baseline it: mark the chain as already
applied without running anything:

```bash
supabase link --project-ref <PROD_REF>
supabase migration list          # shows all local files as "not applied"

# mark each existing migration as applied (records history, runs NO SQL)
supabase migration repair --status applied 001
supabase migration repair --status applied 002
supabase migration repair --status applied 003
supabase migration repair --status applied 004
supabase migration repair --status applied 005
supabase migration repair --status applied 006
supabase migration repair --status applied 007
supabase migration repair --status applied 008
supabase migration repair --status applied 009
supabase migration repair --status applied 010
supabase migration repair --status applied 011
supabase migration repair --status applied 012
supabase migration repair --status applied 013
supabase migration repair --status applied 20260612
supabase migration repair --status applied 20260623
supabase migration repair --status applied 20260701

supabase migration list          # local and remote should now agree
```

From then on, every new migration is a file here + `supabase db push`.

### Bootstrapping a FRESH project (staging, a new environment, disaster recovery)

1. Run `supabase/schema.sql` once (SQL editor, or
   `psql "$DB_URL" -f supabase/schema.sql`). It is the reconciled baseline —
   the full state after the whole chain.
2. Link the project and baseline the history exactly as in "Adopting the CLI"
   above (repair-mark 001 → 20260701 as applied).
3. New migrations then flow with `supabase db push`.

(Equivalent alternative: after step 1, `supabase db push` instead of
repair-marking — the chain is idempotent, so replaying it on top of
schema.sql converges to the same state *and* records history. Repair-marking
is simply faster and runs no SQL.)

---

## TODO (Simon): create the STAGING project — do this before any Team-package DDL

The audit (V15/H1) flags that the first cross-user RLS policy must never be
tested on production. Exact steps, ~15 minutes:

1. **Create the project**: supabase.com → New project →
   name `hybrid-training-staging`, same region as prod (West EU), Free plan.
   Save the database password in your password manager.
2. **Bootstrap the schema**: SQL Editor → New query → paste ALL of
   `supabase/schema.sql` → Run. Verify 15 tables in the Table Editor.
3. **Link + baseline the migration history** from this repo:
   `supabase link --project-ref <STAGING_REF>` then the
   `supabase migration repair --status applied …` list above.
   (`supabase link` remembers ONE project — when switching between staging
   and prod, re-run `supabase link` with the other ref.)
4. **Auth providers**: Authentication → Providers → enable Email. (Google /
   Apple OAuth can stay prod-only; staging works with email magic links.)
5. **Staging env vars for the app**: copy `apps/mobile/.env.local.example` to
   `apps/mobile/.env.local` and fill in the STAGING project URL + anon key
   (Project Settings → API) to point your local dev app at staging. Keep prod
   keys only in GitHub Actions secrets and your production `.env.local`.
6. **Edge Function secrets** (only when testing wearables on staging):
   `supabase secrets set` the FITBIT_* / STRAVA_* values, then
   `supabase functions deploy` — see `supabase/functions/`.
7. From now on: every new migration is verified with `supabase db push` on
   staging FIRST, then pushed to prod.
