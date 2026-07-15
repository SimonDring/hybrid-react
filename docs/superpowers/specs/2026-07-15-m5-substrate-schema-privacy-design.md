# Phase 3 · M5 — Outcomes Substrate: Schema & Privacy Design Spec

**Status: DESIGN SPEC (immutable sprint record once merged) · 2026-07-15**
**Authority: DEVELOPMENT-PLAN §5.3; executes `11-MIGRATION-PHASES.md` §6 (M5), building
against the now-CANONICAL DAAS §3 (longitudinal record) / §3.5 (consent) / §5 (team
privacy lineage) / §4 (metric dictionary + propagation). Simon 2026-07-15: the schema +
RLS/privacy model is produced as a DESIGN for panel review (🔒 6) BEFORE any migration is
written or applied. NO database change ships from this sprint.**

## 1. What this sprint produces (design only)

ONE reviewable design deliverable: `docs/design/m5-substrate/SCHEMA-AND-PRIVACY.md`
(+ a README if the set grows) — the append-only outcomes/history substrate + consent
model + RLS/privacy design + bounded-sync plan, ready for an adversarial **privacy panel
review** (player_status rigor). **No `supabase/migrations/*` file is authored or applied
this sprint** (a DRAFT migration may be embedded in the design as a review artefact,
clearly marked NOT-APPLIED; the real migration is a later, Simon-applied step after 🔒 6).

## 2. What the design must specify

1. **The append-only outcomes/history store** (DAAS §3; TR-03). Replace the latest-only
   `users.profile` JSONB (256 KB cap, whole-blob push) with append-only tables for:
   block outcomes, session outcomes, readiness snapshots, and the Family VIII captures
   (Test Result, Match Performance, External Load Observation, monitoring entries). Every
   row: owner `user_id`, `created_at`, and — for derived/materialised values — the
   `engineVersion × knowledgeSetVersion` stamp (DAAS §3.2/§3.3; the derived-data doctrine:
   dated append-only historical evidence, never re-served as current). A superseding
   observation references the one it supersedes (append-only correction, DAAS §3).
2. **Consent grants as durable state** (DAAS §3.5; Art 22). Ownership is the athlete's;
   consent is informed, granular, revocable; visibility boundaries are constitutional
   (incl. team contexts — "joining a team is accompanied by an explicit recorded scoped
   grant; membership never implies visibility"). Secondary/research use only under a
   distinct consent flag. Erasure + export as rights (Art 22). Model the grant table +
   how a revoked/ended grant ends the derived crossing (the F3 pattern, generalised).
3. **The RLS / privacy model** (Art 11; TEAM-ARCHITECTURE binding rules). Owner-private at
   rest (`auth.uid() = user_id`, the schema's established pattern). **Raw data NEVER crosses
   a person boundary** — coaches/teams see ONLY derived roll-up signals, by consented,
   team-scoped grant (extend the `player_status`/`coach_reads_member` pattern). Every new
   table gets its policy; the design states each policy explicitly and what the RLS harness
   must prove (the proof set the panel + a future `rls-harness` run will check).
4. **Bounded sync + storage back-pressure** (TR-03). No unbounded `select('*')` pulls; the
   append-only store is read in bounded windows / paginated; a write/quota back-pressure
   story (the 256 KB blot problem retired). State the read patterns the app uses and their
   bounds.
5. **The seam to the engine** (DAAS §3 / EDS D17 / D16). The substrate is written by the
   impure L3/L4 layer and read by the async band ONLY (D17 for interpretation, D16 for
   priors) — never on the pure plan path (Art 18). State the read/write ownership so M5's
   later D16-promotion work (🔒 7) has a defined record to consume.
6. **Migration & rollback plan** (design-level): the versioned migration this becomes (a
   ledger row in `supabase/migrations/README.md`), the staging→RLS-harness→prod runbook it
   will follow (Simon applies), and the rollback (append-only + async-readers-only means
   disabling readers restores pre-M5 behaviour without data loss — DAAS/11 §6).
7. **Panel-review readiness:** a checklist the design satisfies — Art 11 (no raw crossing),
   Art 22 (consent/ownership/erasure), the TEAM-ARCHITECTURE isolation rules, the RLS proof
   set, the derived-data doctrine stamping, and the DAAS §3 record shape.

## 3. Rules (binding)

1. **DESIGN ONLY — no DB change ships.** No `supabase/migrations/*` authored/applied; no
   `schema.sql` edit. A draft migration inside the design is a marked review artefact.
2. **The DAAS is now canonical (T2)** — the design cites it as governing (not designate);
   where the design needs a shape the DAAS doesn't specify, IT proposes it and flags it for
   the DAAS's own extension (not a silent divergence).
3. **Binding data-isolation is non-negotiable** (CLAUDE.md hard rules + TEAM-ARCHITECTURE +
   Art 11): players see only their own rows; coach access is additive + team-scoped + derived-
   only; raw vitals never coach-readable. The design must make a violation require a schema
   change, not just a broken habit.
4. **No production code / no engine change** this sprint (design doc only). Suite stays green
   trivially (docs-only). No frozen-doc edits.
5. The design goes to an **adversarial privacy panel** before the PR; the PR is Simon's 🔒 6
   sign-off. Only AFTER 🔒 6 does the real migration get authored + Simon-applied.

## 4. Out of scope

Writing/applying the migration (post-🔒 6, Simon-applied); the D16 staged→learned promotion
policy (🔒 7, needs this record first); team-trend surfaces + AI go-live (later M5 / Phase 4);
the M4b validator build-out; the M6 governance sweep.
