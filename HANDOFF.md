# Project Handoff — state of play

_Last updated: 2026-07-09 (documentation governance sprint). This file carries **current
state and the open queue only**. The full session-by-session history (2026-06-11 →
2026-07-09, ~1,800 lines) is preserved verbatim at
[`docs/archive/HANDOFF-HISTORY-2026-06--2026-07.md`](docs/archive/HANDOFF-HISTORY-2026-06--2026-07.md).
Keep this file current at the end of each session; when an entry stops being current,
move it to the archive file rather than letting this one grow._

## Where the platform stands (2026-07-09, main)

- **Engine: diagnosis-first, all cohorts.** The D1–D16 chain steers every goal and
  every sport. The build flip deployed 2026-07-07 (get stronger → powerlifting,
  build muscle / functional → hypertrophy, olympic weightlifting first-class); the
  legacy volume-first path is retired. All 11 sports are diagnosis-steered.
- **One sport source.** The legacy `sportGymSupport/` layer is DELETED (PR #160); the
  SKB (`packages/engine/src/data/sport-knowledge/*.json`) is the sole source for every
  sport, including the relocated `gymSupport` section. All 11 sports are season-phased
  (off-season round-out, in-season specific vector), with season-window phase detection
  from first/last game dates — the seam the future coach fixture-input plugs into.
- **Onboarding is drift-proof on sports.** `ENUMS.sport` derives from the engine
  binding's `ENGINE_SPORT_IDS` (PR #161) — a newly-bound sport can never be rejected
  at profile save again.
- **Team spine live on prod.** teams / team_members / player_status with additive,
  privacy-preserving RLS (46/46 harness proofs); coach dashboard (apps/web) gated and
  wired to live `player_status`; join-code founding; raw vitals never coach-readable.
- **Suite:** 195/195 green, CI-gated. Golden master order-insensitive (`UPDATE=1` only
  for intended changes, audited per re-baseline). KSV (knowledge-set version) **1.30.0**.
- **Docs:** governed as of 2026-07-09 — see `docs/DOCUMENTATION-GOVERNANCE.md` (policy),
  `docs/DOCUMENTATION-INDEX.md` (the map), and
  `docs/reviews/2026-07-09-documentation-audit.md` (the audit behind it).
- **Governance sprint + Immediate-tier execution — ALL MERGED (2026-07-10, PRs
  #162–#167).** The full Phase 0–7 review set is in `docs/reviews/` (architecture,
  engine, knowledge, AI, data, testing strategy, and the **prioritised roadmap** —
  `docs/reviews/2026-07-09-strategic-roadmap.md`: the next execution order). The
  roadmap's Immediate tier is executed and live: **Olympic 4×4 dose defect FIXED**
  (#163 — classic lifts dose from the discipline scheme; only the olympic archetype
  re-baselined; `tests/olympic-dose.js`), **player_status roster-removal privacy gap
  FIXED in the repo** (#166 — `coach_reads_member` policy + cleanup trigger, migration
  `20260712`; ⚠ staging apply + harness still owed, see open queue #4), **CI hygiene**
  (#164 — per-test timeout, one test definition, doc-aware deploys), **ESLint floor
  with engine-purity rules** (#165 — Art 18 enforced at lint time; found
  TrainingCalendar.jsx provably dead, TD-22), and the **CLAUDE.md overview reframed**
  per Simon (#167 + #162 — an elite S&C platform; the plan is the OUTPUT). Suite
  196/196. Remaining Immediate items are Simon-gated: I5 (enforce injury vetoes) +
  the 5 missing rehab regions (science review).

## ⏰ OPEN QUEUE (in rough priority; ⚠ = needs Simon's call)

1. **⚠ D16 prior promotion** — staged recoverability priors (`athlete_model.stagedPriors`,
   written at block check-in) are read by NOTHING. Promoting staged→learned is the switch
   that makes the D7 deload/block steering and `volumeTolerance` actually fire. Twice-gated
   pattern; needs the falsifiability read. (See archive: WP-59, WP-47.)
2. **⚠ D7 broad activation + D6 strategy object** — D7 block steering is live but gated on
   a learned recoverability prior no athlete has (dormant for everyone). Activating beyond
   the gate is the live-plan flip. A real D6 training-strategy object is still unbuilt.
   Open design questions: `docs/architecture/D7-BLOCK-OBJECTIVE-SPEC.md` §9.
3. **⚠ AI go-live (WP-60 / AIGAS)** — the seam is merged behind flags (ai-render edge
   function, AiService, `AI_ENABLED` kill switch, all OFF). Needs: per-capability eval
   harness (recorded as REQUIRED), the edge-function deploy, and Simon's `AI_ENABLED`
   decision. AIGAS itself still needs its ratification panel pass (
   `docs/architecture/AIGAS-REVIEW-2026-07-06.md` recommends ratification).
4. **⚠ Pending applies (NEW STEP FIRST)** — **`20260712_player_status_membership_scope.sql`
   (the F3 privacy fix, merged #166) is in the repo but applied NOWHERE yet: apply to
   STAGING → run `node supabase/tests/rls-harness.mjs` (7 new F3 cases) → prod, per
   `supabase/SECURITY-DEPLOY.md`.** DB migrations through `20260711` are on prod; the paired
   **Edge Functions deploy separately**: OAuth-nonce callbacks + `fitbit-sync` (S1/S4/S8)
   and `ai-render` (AI go-live only). WP-50 staging harness run still owed
   (per `supabase/SECURITY-DEPLOY.md`).
5. **ACWR cold-start calibration gate** — don't let acute:chronic load steer a fresh
   plan until enough per-user recovery data exists (fresh plans false-flag returning
   users as overtraining). Future WP, design not started.
6. **`movementPolicy` consumption** — in-season pool restriction (deprioritise heavy
   spinal, cap upper) is in the SKB schema + validated but the allocator does NOT read
   it yet; the clean next increment is a candidate-filter in the allocator. Also deferred:
   congestion-aware in-season micro-phasing (needs the coach's fixture list — Team
   package), per-sport `meta.preSeasonWeeks`/`transitionWeeks` authoring.
7. **Endurance session programming** — run/cycle/swim workouts remain out of scope
   (Stage 7); the engine is gym-only by design today.
8. **Docs follow-ups from the 2026-07-09 governance sprint** — reconcile `docs/SCHEMA.md`
   (12 of 19 tables documented); merge the two OAuth guides (they recommend different
   Apple Services IDs — verify the live value in the Apple portal first); ⚠ product
   naming decision ("Hybrid Training" vs "Performance OS" vs `hybrid-react`); the five
   constitutional amendment candidates (C1–C5 in
   `docs/reviews/2026-07-09-documentation-audit.md` §2).

## Governance (unchanged)

The five governing documents are **FROZEN v1.0 (2026-07-01)**: Constitution, Decision
Ontology, Knowledge Architecture (`docs/foundation/`), the EDS
(`docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md`), the TAS (`docs/architecture/TAS.md`).
AIGAS (`docs/architecture/AIGAS.md`) is governing for AI work, pending formal
ratification. All work validates against them; changing one is a versioned amendment,
never an inline edit. Documentation precedence and lifecycle:
`docs/DOCUMENTATION-GOVERNANCE.md`.

## How work is run here (follow this)

`superpowers:brainstorming` → design spec in `docs/superpowers/specs/YYYY-MM-DD-*.md`
(commit) → `superpowers:writing-plans` (plan in `docs/superpowers/plans/`) →
`superpowers:subagent-driven-development` (SDD ledger at `.superpowers/sdd/`, NOT
committed) → whole-branch review → PR → **merges are Simon's** (deploys are
consequential); the standing charter (2026-07-03) allows autonomous merging of green,
low-risk PRs only. Tests: `npm test` (all of `apps/mobile/tests/*.js` via `run-all.mjs`,
CI-gated). Engine work starts from the frozen EDS; check
`docs/DOCUMENTATION-INDEX.md` for which document owns the concept you're touching.

**Invariants to carry forward:** `generatePlan` stays pure/deterministic (diagnosis
`asOf` from `profile.plan_start_date`, never the clock); golden master re-baselined
only deliberately, audited key-by-key; muscle-volume is the downstream MRV ledger, not
the selection driver; raw vitals never enter the model or reach a coach (Constitution
Art 11); the SKB is the source of truth for selectable sports; freeze-on-start — a
started session is never recomputed.
