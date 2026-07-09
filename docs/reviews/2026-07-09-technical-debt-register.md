# Technical Debt Register — 2026-07-09

**Status: REVIEW (dated register; the *living* queue is HANDOFF.md) · produced by
the governance sprint (Phase 1), consolidating the dependency/boundary scan and
the [Platform Health Re-verification](2026-07-09-platform-health-reverification.md)
(which carries per-item evidence: exact lines, grep results, wc counts).**

Severity is impact-on-the-mission (elite coaching platform, solo founder), not
code aesthetics. "Owner decision" marks items needing Simon's call before work
starts. Nothing here is urgent enough to interrupt product work — the suite is
green (195/195 in 14.1s) and the engine boundary is clean.

## Tier 1 — structural (address deliberately, highest leverage)

| ID | Item | Evidence | Direction | Owner decision? |
|---|---|---|---|---|
| TD-01 | **`allocator.js` 1,243 lines and growing** (+200 since 2026-07-06): D11 selection, D12 dose, D13 placement, supersets, titles all meet here | Health H2 | Split along the EDS's own D-boundaries; golden-master-gated re-seat | YES — engine re-seat |
| TD-02 | **No static analysis anywhere**: no ESLint/Prettier/types on mobile+engine; purity held by tests + convention only | Dep scan §7 | Add ESLint (flat config) with a purity ruleset for packages/engine (no-restricted-imports/globals: Date.now, Math.random, fetch); format-on-save | no |
| TD-03 | **Engine has no own test suite** — tested from `apps/mobile/tests`; couples the portable engine to the app | Dep scan §6 | Stage engine-scoped tests into `packages/engine/tests` (see Phase 6 testing strategy) | no |
| TD-04 | **Validator suite 5/16**: mrv-ceiling, injury-contraindication, duration-honesty, equipment, purpose-coherence exist; 11 of the EDS §35 catalogue don't | Health H3 | Next validators by safety value: progression-rate, readiness-response, pattern-balance | philosophy per validator |
| TD-05 | **Injury rehab content 9/14 regions**: elbow, wrist, cervical, quad, shin block exercises but offer no rehab work | Health H5 | Author 5 region entries (knowledge change, science-reviewed) | YES — seed science review |
| TD-06 | **`SyncService.js` 1,008 + `Database.js` 818** — the whole persistence layer in two stateful files | Health H4 | Do NOT rewrite (hard rule); extract per-table sync handlers only if/when a real defect forces entry | no (leave until forced) |

## Tier 2 — consistency and hygiene

| ID | Item | Evidence | Direction |
|---|---|---|---|
| TD-07 | Six-call API vs ~70-symbol barrel | Dep scan §4 | Export-list ratchet test (freeze, then shrink); `explain` still unshipped (WP-30 tail) |
| TD-08 | supabase-js skew: mobile ^2.45 vs web ^2.110 | Dep scan §1 | Align in one PR, smoke-test auth on both |
| TD-09 | Dead `packages/shared` (imported nowhere) | Dep scan §1 | Remove the workspace member or give it its first real consumer; don't leave ambient |
| TD-10 | CI: suite duplicated in test.yml/deploy.yml; deploy not path-filtered (doc commits trigger Pages deploys) | Dep scan §7 | `workflow_call` reusable job; path-filter deploy |
| TD-11 | `run-all.mjs` serial, no per-test timeout | Dep scan §6 | Cheap now (14s total); add timeout first, parallelism when suite >60s |
| TD-12 | Duplicated logic ×4 (weekday tables, RPE-to-load, volume classification, phase-of-week — named lines in re-verification M2) | Health M2 | Consolidate opportunistically when touching those files |
| TD-13 | Store-bypass exceptions: Settings.jsx + Teams.jsx read `Database.tables.*` directly, undocumented | Health M3 | Document as sanctioned read-only exceptions in CLAUDE.md, or route through the store |
| TD-14 | Naming drift: fitbit-prefixed multi-provider code, dual "coach" meanings, teamScheduleCache/teamStatus overlap | Health M8 | Glossary entry in the Ontology's app-side shadow (Data Dictionary) + rename opportunistically |
| TD-15 | Web app: marketing leads route is console.log-only; analytics no-op; "live demo" links lead to auth wall | Health M5/M6 | Wire or remove before any public marketing push (product call) |
| TD-16 | Coach dashboard: coach note + to-do "done" state are unpersisted useState | Health M4 | Persist to a coach-scoped table when the Team package resumes (RLS: coach-only) |

## Tier 3 — small, sweep opportunistically

| ID | Item | Evidence |
|---|---|---|
| TD-17 | Password min-length mismatch (8 vs 6) between validate.js and Supabase config | Health L1 |
| TD-18 | Sessions screen 'today' tab fallback + bare "Phase not found" error | Health L2/L3 |
| TD-19 | 5/23 injury-prevention entries missing evidenceId | Health L4 |
| TD-20 | Stale `blockPriors.js` "steers nothing yet" comment (true but should point at the D16 gate) | Health L5 |
| TD-21 | `--accent-2` used but undocumented in the theme contract | Health L6 |
| TD-22 | Dead code: TrainingCalendar screen, `wearable_readings`/`ai_recommendations` tables unused | Health M1 |
| TD-23 | Edge functions: wildcard CORS ×4; `oauth_states` GC is per-caller only (no pg_cron) | Health M9 |
| TD-24 | apps/web README structure tree still lists deleted mock files | patch agent report |

## Documentation debt (from the documentation audit)

| ID | Item |
|---|---|
| TD-25 | `docs/SCHEMA.md` full reconcile (12→19 tables) — banner in place, work queued |
| TD-26 | OAuth guide merge + Apple Services ID conflict (verify portal first) |
| TD-27 | Product naming decision: "Hybrid Training" vs "Performance OS" vs `hybrid-react` — **owner decision** |
| TD-28 | Constitutional amendment queue C1–C5 (freeze stamps, 7-vs-8 kinds, sport counts, EDS rung, mojibake) — one reconciled amendment pass — **owner decision** |
| TD-29 | AIGAS ratification panel pass (recommended 2026-07-06, not yet run) — **owner decision** |

## Explicitly NOT debt

Engine purity (clean, ratcheted) · the golden-master discipline · Database.js's
synchronous API (stable by design) · the dormant D7/learning/AI seams (gated on
purpose, each test-pinned — tracked in HANDOFF's open queue, not here) · the
monorepo shape · staying on React 18.
