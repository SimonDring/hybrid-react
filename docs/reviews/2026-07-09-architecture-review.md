# Repository Architecture Review — 2026-07-09

**Status: REVIEW (dated) · produced by the autonomous governance sprint (Phase 1)
· main/governance-sprint branch @ 2026-07-09, KSV 1.30.0, 195 tests green.**

Companions: the [Repository Atlas suite](../architecture-atlas/README.md)
(refreshed + committed this sprint — subsystem map, ADRs, data dictionary, flow
map), the [Technical Debt Register](2026-07-09-technical-debt-register.md), and
the [Platform Health Re-verification](2026-07-09-platform-health-reverification.md).
This document is the executive assessment and the risk registers.

---

## 1. Executive architecture assessment

**Verdict: the architecture is in unusually good shape for a solo-founder
project of this ambition, and — rarer — the code now matches its own
constitution.** The 2026-06/07 rebuild finished what it started: the engine is
diagnosis-first end-to-end (D1–D14 planning, D15 reflow), knowledge is
separated from reasoning and versioned (KSV 1.30.0 with a changelog that works
as an audit trail), the SKB is the single sport source, and the frozen
governance set that was written to *steer* the rebuild is now an accurate
description of the built system rather than an aspiration. The five-layer
shape (governance docs → pure engine → knowledge data → app runtime →
surfaces) is real in the code, not just in the TAS.

**The three structural strengths worth protecting:**

1. **A genuinely pure engine.** `packages/engine` has zero third-party
   dependencies and zero impurities — no clock reads, no randomness, no I/O, no
   DOM anywhere in `src/` (verified by grep this sprint). Purity is *enforced*,
   not aspirational: `engine-api-boundary.js` ratchets deep imports (allowlist
   may only shrink), `determinism-clock` guards the clock, and the golden
   master pins output. This is the platform's deepest moat — it is what makes
   the future AI seam safe (AI proposals can be validated against a
   deterministic oracle) and what makes a native-app port cheap.
2. **Knowledge as governed data.** Scientific constants live in
   `knowledge/entries.js` with provenance, confidence, and a version stamp;
   validator authority derives from evidence confidence (Art 13 is executable).
   Adding a sport is a data change (SKB profile + binding), proven by the fact
   that onboarding's sport list is now *derived* (PR #161).
3. **Contained I/O.** Supabase is touched by 7 files, 73% of call sites in
   `SyncService.js`; no screen or component talks to the backend directly. The
   store → SyncService → Supabase path holds (one read-only diagnostics
   exception in Settings.jsx).

**The honest weaknesses (detail in the debt register):**

- **Verification is monolithic and single-paced.** All 195 tests live in
  `apps/mobile/tests` and run serially with no per-test timeout; the pure
  engine has no test suite of its own and reaches back into the app to test
  itself. Works today; will not scale to the Team/AI stages.
- **The "six-call API" is a story, not a surface.** The engine barrel exports
  ~70 symbols. The narrow API exists as documentation and as an aspiration the
  boundary test partially enforces; the true public surface is much wider.
- **Static analysis is absent.** No linter, no formatter, no types on the two
  JS packages. The engine's discipline is maintained by tests and convention —
  strong today because one mind (plus AI sessions under CLAUDE.md) writes it;
  fragile the moment a second contributor arrives.
- **Two size hotspots sit on critical paths**: `allocator.js` (1,243 lines —
  the engine's selection/fill core) and `SyncService.js` (1,008) +
  `Database.js` (818) (the entire persistence layer, ~1,830 lines in two
  stateful files).

**Layering (as built, verified):** L0 governance docs → L1 pure engine
(`packages/engine/src/lib`: 16 subdirectories — plan/, performance/, session/,
athlete/, knowledge/, validation/, injury/, sportKnowledge/, indices/, load/,
recovery/, learning/, team/, adapters/, ai/, strength/) → L2 knowledge
(`src/data` + `knowledge/entries.js`) → L3/L4 app runtime (PlanService reflow,
SyncService, stores) → L6 surfaces (mobile screens; web coach dashboard reading
only the derived roll-up). The TAS's L5 (learning) exists as staged seams
(`learning/blockOutcome`, stagedPriors) that nothing consumes yet — deliberate,
gated, correctly dormant.

## 2. Dependency review

- **Workspace**: npm workspaces; root scripts proxy to `apps/mobile`. Engine
  consumed via exports map (barrel + `./lib/*`, `./data/*` subpaths).
- **Engine: zero runtime deps** — the headline good fact.
- **Mobile**: react 18.3, react-router 6, zustand 5, supabase-js ^2.45, vite 5
  + PWA plugin. Lean and appropriate.
- **Web**: next 16, react 18.3, supabase-js ^2.110 + @supabase/ssr, recharts,
  tailwind 4, TS 5.6.
- **Findings**: supabase-js version skew across apps (^2.45 vs ^2.110 — same
  backend, two client behaviours; align deliberately); Next 16 will eventually
  force React 19 while mobile sits on 18 (fine — different apps — but track);
  `packages/shared` is a dead placeholder imported by nothing (wire in or
  remove the workspace member); no dependency is unjustified or abandoned.
- **Deep-import discipline**: 11 deep-import lines in 2 files, both allowlisted
  (DevPlayground — dev tooling; PlanService — the reflow namespace import),
  ratcheted by test. Healthy.

## 3. Architecture risk register

| # | Risk | Severity | Evidence | Mitigation direction |
|---|---|---|---|---|
| AR1 | **Bus factor = 1** on an elite-coaching codebase: no linter/types/second reviewer; discipline lives in tests + CLAUDE.md + one founder | High (structural) | Debt scan §7; solo workflow | The governance set + this sprint's docs ARE the mitigation; add static analysis (cheap, mechanical) so the machine holds the line too |
| AR2 | **allocator.js concentration**: 1,243 lines where selection, supersets, dose, titles, and constraints meet; every engine change passes through it | High | Debt D3; it survived the flip as the shared fill layer | Extract along the D-boundaries the EDS already names (D11 selection / D12 dose / D13 scheduling) — a re-seat, pause for Simon |
| AR3 | **Test ownership inversion**: engine tested only via the app suite; suite serial, no timeouts, one hang blocks deploys | Medium-High | Debt D6/D7; `run-all.mjs` | Move engine-scoped tests into `packages/engine/tests` (Phase 6 strategy) |
| AR4 | **API surface bloat** invalidates the TAS's six-call contract over time — consumers will couple to the 70-symbol barrel | Medium | Debt D5 | Ratchet the barrel like deep imports: freeze the export list, shrink deliberately |
| AR5 | **Dormant seams rot**: D7 steering, staged priors, the AI seam, movementPolicy are built-but-off; unexercised code drifts (this is how doc-staleness happened) | Medium | HANDOFF open queue #1/#2/#6 | Each dormant seam has a test pinning it; add a "dormant inventory" to HANDOFF so activation decisions don't get lost |
| AR6 | **Reflow duality**: the runtime reflow re-derives sessions and has twice been caught diverging from baseline identity (D11 differentiation loss; power-work drop, both fixed) | Medium | HANDOFF history WP-55, PR #67 | The reflow re-seat (WP-24 family) — treat reflow as replaying the SAME decisions, not re-deciding |
| AR7 | **CI duplication** (test suite copy-pasted in test.yml + deploy.yml) can drift | Low | Debt D9 | Reusable workflow (`workflow_call`) |
| AR8 | **supabase-js skew** between apps | Low | Debt D1 | Align versions in one PR |

## 4. Scalability risk register

Scalability here means: more athletes, more teams, more sports, more
contributors, more AI — not raw traffic (the PWA + Postgres model is far from
any throughput ceiling at current scale).

| # | Risk | Horizon | Evidence / reasoning | Direction |
|---|---|---|---|---|
| SR1 | **Per-athlete plan data lives in `users.profile` JSON** (athlete_model, plan config): fine per-athlete, invisible to cross-athlete queries — blocks team analytics, population learning (D16), research | Team scale (Stage 5-6) | ATHLETE-MODEL §12 known limitation; schema | Normalise the read-side: derived tables/views fed from the model (the player_status pattern already proves the shape) |
| SR2 | **Serial 195-file suite** grows linearly with sports × disciplines × validators; already the deploy gate | Every sprint | run-all.mjs | Parallel runner + per-test timeout; split engine/app suites |
| SR3 | **SKB authoring is the sport-growth bottleneck**: a flagship profile is 21 sections, science-reviewed; agent-authored profiles (soccer, rugby) still carry ⚠ review flags | Sport catalogue growth | HANDOFF history (soccer/rugby flags) | The knowledge pipeline IS the product at scale: define the review workflow (author → validate → panel → Simon) as governed process; AIGAS C6 (research/knowledge-drafting) is the assist seam |
| SR4 | **Golden-master re-baselining is manual judgement** (UPDATE=1 + eyeball the key diff); at 19 archetypes it works; at 50+ sports/disciplines the audit burden explodes | Sport catalogue growth | Test strategy | Per-archetype provenance asserts + automated diff classification (additive/provenance-only/behavioural) |
| SR5 | **Coach dashboard reads derived `player_status` rows** — correct privacy shape, but the roll-up runs client-of-DB and per-player; team histories/trends have no storage yet | Team scale | web README "empty trend feed" | The rollUp engine call is already extracted — schedule it server-side (edge function/cron) writing time-series |
| SR6 | **One repo, one deploy pipeline, two apps + engine**: path-filtered web CI exists, but mobile deploys on every main push including doc commits | Contributor scale | deploy.yml | Path-filter the Pages deploy; later, per-package versioning |
| SR7 | **AI cost/latency unbounded design not yet exercised**: AIGAS §18 defines cost rules but no capability is live to validate them | Stage 6 | AIGAS App B | The eval harness (already REQUIRED before go-live) should measure cost per capability from day one |

## 5. What NOT to change (anti-recommendations)

- **Do not rewrite Database.js or the sync path** — stable, contained, tested;
  its synchronous API is load-bearing (CLAUDE.md hard rule stands).
- **Do not split the monorepo** — workspace boundaries are doing their job;
  separate repos would break the golden-master + boundary-test discipline.
- **Do not chase framework upgrades** (React 19, router 7) — zero product value
  today; the engine doesn't care.
- **Do not add a backend service layer** between the app and Supabase — RLS +
  edge functions is the right shape at this scale; a middle tier would double
  the security surface (this is also the TAS's position).
