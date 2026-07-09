# Architecture Decision Register (ADR)

**Performance OS — the major architectural decisions, as built**
Audience: the founder. These decisions were **inferred** from the codebase, the governance documents, the living assessment docs, and the git/session history (`HANDOFF.md`) — they were not copy-pasted from a pre-existing decision log (none existed in this form before this documentation sprint). Where a decision maps to a Constitution Article or EDS principle, that's noted so you can trace *why* the decision was constitutionally required, not just chosen.

Each entry uses: **Decision → Context → Problem → Alternatives considered → Chosen approach → Trade-offs → Benefits → Future considerations → Open questions.**

---

## ADR-01: The engine is one pure, deterministic library — not a set of services

**Decision.** The entire coaching brain (`packages/engine`) is a single, pure, synchronous JavaScript library: no network calls, no clock reads, no randomness, no stored state. The same input always produces the same output.

**Context.** An early brief for the platform's rebuild proposed roughly 35 separate "engines" (an Assessment Engine, a Planning Engine, a Validation Engine, a Recovery Engine, etc.) as independent services.

**Problem.** Splitting coaching logic across network-separated services would fragment a deterministic core across boundaries that can't guarantee determinism (network latency, partial failure, versioning skew), and would very likely duplicate logic at each service boundary — exactly the "two parallel models silently disagreeing" failure mode the platform has already hit at least twice (see ADR-05 and the coach-dashboard duplication described in ADR-11).

**Alternatives considered.**
- Multiple microservice-style "engines," per the original brief.
- A monolithic engine embedded directly inside the mobile app (no separate package) — rejected because the coach dashboard needs the exact same coaching math, and a copy-paste risks drift (which happened once already, see ADR-11).

**Chosen approach.** One pure library (`@performance-os/engine`), with a minimal public API surface (five synchronous calls: plan, reflow, deriveReadiness, deriveLoad, validate — down from a planned six after "Train Now" was deliberately removed by product decision), consumed as a workspace dependency by both `apps/mobile` and `apps/web`. Impure work (fetching state, persisting, invoking AI) lives in a thin "orchestration" layer outside the engine (`PlanService.js` on the app side).

**Trade-offs.** The engine cannot itself call an AI provider, read a wearable API, or know "now" — every one of those has to be handed in by the caller. This adds a small amount of plumbing at every call site, in exchange for testability.

**Benefits.** A golden-master test can prove, byte-for-byte, that a change didn't alter behaviour for any of ~90,000+ swept test profiles. The same engine already runs identically on the phone and the web dashboard. A future server-side AI Edge Function can call the identical function without any behavioural risk of "the AI's version disagreeing with the phone's version."

**Future considerations.** The engine's public API is deliberately kept small via a "deep-import ratchet" test — internal modules can be reorganised freely as long as nothing outside the package reaches past the front door. This is a real, tested constraint, not just a convention.

**Open questions.** None currently open; this decision is treated as settled and load-bearing (Constitution Article 18, TAS Layer 1).

---

## ADR-02: The engine is being re-seated from volume-first to diagnosis-first — as a staged migration, not a rewrite

**Decision.** The engine's organising primitive is changing from "a weekly per-muscle set target" to "a diagnosed physical-quality limiting factor," executed cohort-by-cohort behind explicit feature gates, while the pure/deterministic core, the golden-master safety net, the injury subsystem, and the Sport Knowledge Base schema are all explicitly preserved unchanged.

**Context.** The frozen governance set (Constitution Articles 5–6, the EDS) defines diagnosis-first reasoning as the target architecture. The engine, as it existed before this rebuild began, was volume-first — a mature, well-evidenced hypertrophy/strength generator that, in the EDS's own words, is "an excellent answer to the wrong question."

**Problem.** A full rewrite is both too risky (this is a live product with a working, evidence-based core) and unaffordable for a solo-founder-scale team (Constitution Article 20 explicitly forbids over-engineering ahead of value). But shipping nothing until the ideal architecture exists would mean years of no improvement to what users actually receive.

**Alternatives considered.**
- A big-bang rewrite of the whole allocator around the new primitive — rejected as by far the highest-regression-risk single change identified anywhere in the platform's own architectural audit.
- Doing nothing until a "perfect" diagnosis-first engine could be designed in full — rejected as incompatible with continuous delivery of value and with the team's actual capacity.

**Chosen approach.** A sequenced set of migration "waves" (W0–W11, an executable Sprint 0–12 backlog in `docs/architecture/MIGRATION-BLUEPRINT.md`), each independently shippable, each gated behind an explicit predicate function (e.g. `diagnosisSteers()`, `blockDeloadSteers()`) so a cohort only gets the new behaviour once it's been individually proven safe by a golden-master-style parity test for the cohorts NOT yet migrated. Concretely: run/cycle got diagnosis-driven exercise selection first (Sprint 8); swim and the invasion/team sports got a *different* mechanism (category-coverage, not raw quality-diagnosis) after the first attempt at diagnosis-driven swim programming produced an objectively worse plan (see ADR-05); "build" goals (get stronger / build muscle / general fitness) remain on the legacy path today, by deliberate, paused decision, pending a "build flip" that requires the founder's sign-off.

**Trade-offs.** The engine currently contains two coexisting reasoning strategies (documented precisely in the Architecture Atlas §4.0), which is real, self-acknowledged complexity — the platform's own mid-migration audit calls this state "split-brained" and quantifies it. This is an accepted, temporary cost of de-risking the migration, not a design goal.

**Benefits.** Every wave shipped so far has been independently tested, independently reversible, and has not required a single regression in the legacy path (proven by parity/golden-master tests specifically written to catch exactly that). The platform has continued to improve in production throughout the migration rather than freezing feature work for a rewrite.

**Future considerations.** The remaining major waves are: extending diagnosis-steering to the "build" cohort (paused, needs the founder's decision on scope and sequencing); making the Sport Knowledge Base the sport system's primary source of truth (retiring the legacy per-sport bias tables entirely); and building out the remaining structural decision types (D6 Strategy, full D7 block-objective steering, D16 population-level learning).

**Open questions.** Six specific open questions are recorded, blocking further work, in `docs/architecture/D7-BLOCK-OBJECTIVE-SPEC.md` (e.g., how aggressively should the engine sequence conflicting priority qualities across successive blocks; what are the correct block-length/deload-cadence numbers, pending an S&C science review). The "build flip" itself is explicitly paused pending the founder's decision on six related product questions.

**Resolved 2026-07-07:** the build flip shipped and deployed — build goals run the diagnosis-first discipline engine; the two-strategies state this ADR describes ended. The staged-migration decision itself stands as the record of HOW the transition was governed.

---

## ADR-03: Monorepo restructure — apps/mobile, apps/web, packages/engine as workspaces

**Decision.** The single original app was moved, as one unit, into `apps/mobile/`, and the repository became an npm-workspaces monorepo with `apps/web/` (reserved, later built out) and `packages/engine/` (later populated by extracting the engine) as siblings, plus `supabase/` and `docs/` promoted to the repo root.

**Context.** The product roadmap's Stage 5 priority (the Team package) requires a second, coach-facing surface that needs to share the exact coaching logic the phone app already has, without copy-pasting it.

**Problem.** A single-app repository has no natural home for a second consumer of the same engine, and no natural boundary that would stop that second consumer from silently reimplementing the coaching math (which is exactly what happened once, briefly — see ADR-11).

**Alternatives considered.** Publishing the engine as a genuinely separate, versioned npm package from day one — considered unnecessary overhead for a project of this size before the Team package existed to justify it. Building the coach dashboard as a second bundle inside the same app — rejected because a coach-facing web dashboard and a player-facing mobile PWA have different frameworks, deployment targets, and audiences.

**Chosen approach.** npm workspaces: one repo, multiple packages, internal-only workspace dependencies (`@performance-os/engine`) resolved via `npm install` without needing to publish to a real registry.

**Trade-offs.** All 226 relative imports across the original app had to be verified to still resolve correctly after the move; the CI/GitHub Pages deploy pipeline had to be re-verified end to end. A known development-only friction: git worktrees can resolve `@performance-os/engine` to the wrong copy (the main repo's, not the worktree's) unless `node_modules` is explicitly symlinked — a recorded, working-as-intended gotcha for anyone doing parallel engine development in a worktree.

**Benefits.** This restructure is the moment the two-package (Individual/Team) product architecture became structurally real in the codebase, not just a plan. `packages/shared/` is reserved but still empty, held in place for future genuinely-shared (non-engine) code between the two apps.

**Future considerations.** None currently blocking; this is treated as a settled, low-risk-to-revisit decision.

---

## ADR-04: The Sport Knowledge Base is authored data, not code — and the legacy per-sport bias tables are being retired

**Decision.** What a sport demands of an athlete (physical-quality importances, energy-system mix, injury-risk profile, per-position modifiers, machine-readable decision rules, a full exercise library with transfer ratings) is captured as a large, schema-validated, evidence-tagged JSON knowledge base — one file per sport — rather than as `if` branches in engine code.

**Context.** Constitution Article 17 ("knowledge is separate from reasoning... the load-bearing wall of the whole architecture") and the Knowledge Architecture document's explicit anti-pattern example: the platform's own pre-existing `lib/sports/*.js` per-sport emphasis-multiplier modules, described as "the lossy shadow the EDS marks for retirement."

**Problem.** Coaching knowledge that lives inside code branches can't be authored or reviewed by a sports scientist without reading source code, can't carry a citation or a confidence rating, and can't evolve independently of an engine release.

**Alternatives considered.** Keep extending the legacy per-sport multiplier tables incrementally — rejected because they structurally cannot express what several sports actually need (see ADR-05), and because they fail the "a non-engineer must be able to author/audit this" test the Knowledge Architecture document sets as a hard requirement.

**Chosen approach.** An 11-sport, 21-section-per-sport authored knowledge base (`packages/engine/src/data/sport-knowledge/*.json`, ~28,000 lines total), read through a single interface (`sportKnowledge/index.js`) with a completeness scorer and a hard-enforced privacy rule (raw vitals can never be flagged coach-visible in any authored KPI — checked by the schema validator itself, not just policy). The legacy per-sport tables (`data/sportGymSupport/`) remain in place only as the fallback/bridge for cohorts not yet fully migrated, explicitly self-labelled in their own header comment as "the residue that retires with the legacy fill."

**Trade-offs.** Authoring 21 sections per sport to a genuinely useful depth is a large content investment; not every sport is equally deep yet (5 sports were authored to full "flagship" depth before the others, though as of 2026-07-06 all 11 selectable sports score complete). Two sports were agent-authored in a single session at speed (soccer, rugby) and are explicitly flagged for the founder's own scientific accuracy review before being fully trusted.

**Benefits.** Adding a new sport is now, in principle, "author one JSON file, add one registry line" — no engine code change required. The knowledge base's completeness and privacy rules are mechanically validated, not just documented.

**Future considerations.** "Sprint 9" — making the SKB the sport system's primary source of truth and fully retiring the legacy bias tables — is explicitly named as not-yet-done, still queued work.

**Open questions.** None blocking; this decision's direction is settled, only its remaining execution pace is open.

**Resolved 2026-07-09 (PR #160):** the legacy sportGymSupport layer was deleted; its data relocated verbatim into the SKB gymSupport section. The SKB is the single sport source.

---

## ADR-05: Two different mechanisms for diagnosis-driven exercise selection — rating-based vs. category-coverage

**Decision.** Run and cycle athletes get exercise selection driven directly by the 10-quality diagnosis (D11, "rating-based"). Swim and the invasion/team sports (soccer, rugby, GAA football, hurling, field hockey) get exercise selection driven instead by *coverage of the sport's own authored exercise-library categories* — a genuinely different mechanism, not a variant of the same one.

**Context.** In the first attempt to bring swim into the diagnosis-first re-seat (Sprint 8), the naive approach was tried: diagnose the swimmer's limiting factor using the fixed 10-quality vocabulary, then select exercises to develop that quality, exactly as had just worked for run and cycle.

**Problem.** It produced an objectively worse plan than the old volume-first fill: a swimmer's actual biggest demand-capability gap is "mobility," which the model correctly translates toward "robustness" — but the highest-transfer robustness exercises happen to be posterior-chain hinges, which ate the entire session's fatigue budget before any of a swimmer's real accessory needs (upper-body pulling strength, shoulder health work) got scheduled. The resulting sessions were ~63% of the athlete's prior training volume, all hinges, with zero pressing or pulling — a concrete, measured regression, not a theoretical concern.

**Alternatives considered.** Force the fit by expanding the 10-quality vocabulary to include swim-specific concepts like "upper-body pull" or "rotational power" — rejected (at least for now) because the Performance Model's fixed quality set is meant to stay a small, generalisable vocabulary, and stretching it for every sport's idiosyncratic needs would undermine that generality. Leave swim and the invasion sports permanently on the legacy volume-first fill — rejected because those sports' own authored knowledge bases already contain exactly the right information (category-tagged exercise libraries with transfer-to-sport ratings), just not in a form the quality-diagnosis pipeline could consume.

**Chosen approach.** A second, parallel session-planning mechanism (`session/categoryCoverage.js`): rank a sport's authored exercise-library categories by their best transfer-to-sport rating, then round-robin distribute the highest-value categories across the week's sessions — directly using the sport's own domain knowledge rather than forcing it through the generic quality lens. Run and cycle deliberately stay on the rating-based mechanism, since their categories already agree with their diagnosed qualities — a recorded, deliberate scope decision, not an oversight.

**Trade-offs.** The engine now genuinely has two different "how do I pick exercises for a diagnosed need" algorithms, which is real complexity to maintain and explain. This is accepted because it reflects a genuine, evidence-grounded limitation of the fixed quality vocabulary rather than a shortcut.

**Benefits.** This is one of the platform's best-documented examples of the constitutional principle "science informs; athlete response validates" being applied literally — a real failure was measured, the root cause was correctly diagnosed (not just patched), and a genuinely different, better-fitting solution was built rather than forcing the first approach to "sort of work."

**Future considerations.** Whether the fixed 10-quality vocabulary should eventually be extended (rather than routed around) is an acknowledged, unresolved question the platform's own architectural audit names as one of its "assumptions to challenge" — the vocabulary has already failed once for swim and is expected to strain further for other field sports.

**Open questions.** None immediately blocking; the current split is considered stable and correct.

---

## ADR-06: Team data isolation — a derived, coach-safe table plus RLS, not a permissions layer on raw data

**Decision.** A coach never queries a player's raw tables. Instead, a single new table (`player_status`) holds only six coach-safe, already-derived fields per player, written by the player's own device and partially overridden server-side for the two fields a coach might act on (injury availability, readiness) so they can't be spoofed by the client.

**Context.** `docs/product/TEAM-ARCHITECTURE.md`'s binding design rule, and Constitution Article 11 ("privacy of raw athlete data is inviolable... enforced structurally in code... not just policy").

**Problem.** The natural, tempting shortcut — grant a coach `SELECT` on a player's rows with an added `WHERE team = coach's team` clause — would still require the coach's application code to *choose* not to display the raw HRV/sleep/resting-HR columns it technically has access to. That is a policy, not a structural guarantee, and the platform's own governing rule requires the guarantee to be structural.

**Alternatives considered.** Row-level "coach can read team members' rows" policies added directly to `daily_metrics`/`injuries`/etc. — rejected outright; explicitly, the team-spine migration's own header comment states this migration adds **no** policy to any raw per-user table, as a deliberate invariant. A view or materialised view exposing only certain columns — considered, but a genuinely separate table with its own trigger-enforced integrity was judged clearer and easier to audit/test in isolation.

**Chosen approach.** `player_status`, written by the player's own client (so RLS's "own row" write access is unchanged), but with a `BEFORE INSERT/UPDATE` Postgres trigger that unconditionally overwrites `injury_status` and `readiness` from the player's own source-of-truth tables server-side — meaning the *soft* trend metrics (ACWR, load state, adherence) are still client-computed (a deliberate choice to avoid re-implementing an EWMA time-series model in SQL and risking drift from the app's own math), but the two fields a coach might use to decide "should this player train today" cannot be faked by the player's device. Coach read access is scoped via a `SECURITY DEFINER` function (`is_coach_of_team`) checking team co-membership, not merely "any team this player is on."

**Trade-offs.** This requires careful, ongoing maintenance: any new per-player signal a coach should eventually see has to be deliberately added to this narrow table, never granted by loosening access to a raw table. That friction is the point — it makes "accidentally leaking raw vitals" require a positive, visible action rather than a possible oversight.

**Benefits.** A four-times-independently-enforced privacy boundary (owner-only raw tables, a narrow derived table, a server-side integrity trigger, and a shared `rollUp()` function computing the same RAG status for both apps) rather than a single point of failure. An adversarial RLS test harness proves both directions: a coach reads zero raw vitals of their own player, and a player can never read a teammate's status.

**Future considerations.** None architecturally; this pattern is expected to be the template for any future coach-visible signal.

**Open questions.** None currently open, though see ADR-14 for the one real historical bug this design had (and fixed) in its early implementation.

---

## ADR-07: ACWR is demoted to a corroborating signal, never a sole trigger

**Decision.** The acute:chronic workload ratio — a popular, easy-to-compute training-load metric — can nudge training volume down modestly on its own, but can never independently force a deload week; it can only *corroborate* a deload decision that other signals (self-reported readiness, session-recovery ratings) are already making.

**Context.** The metric is cited in two contested pieces of sports-science literature (Impellizzeri 2019/2020, Lolli) as mathematically flawed — because the "acute" week's load is literally a subset of the "chronic" average it's being compared against, the ratio can behave in ways that don't reflect what a coach would intuitively call "too much, too fast."

**Problem.** ACWR is nonetheless a real, useful, cheap-to-compute signal — discarding it entirely would throw away legitimate information; trusting it as a hard, sole gate would let contested science make consequential decisions unilaterally, directly violating Constitution Article 13 ("confidence governs authority... contested science never gates").

**Alternatives considered.** Use ACWR as a hard trigger (the original, simpler implementation) — rejected once the contested-evidence concern was raised. Remove ACWR entirely — rejected as throwing away a legitimate, if imperfect, signal.

**Chosen approach.** A general-purpose "knowledge authority" mechanism (`knowledge/authority.js`) that reads a confidence tag off the underlying knowledge-base entry and maps it to a decision-facing tier: `gate` (may force/veto alone), `soft` (may scale alone), `reported` (can only corroborate, never act alone). ACWR's underlying knowledge entry is tagged with confidence low enough to land in `reported`/`soft` territory, so the *general* mechanism — not an ACWR-specific carve-out — is what limits it. If ACWR's evidence base were later judged more solid, lifting the restriction would mean editing a knowledge-base confidence rating, not hunting down hard-coded exceptions.

**Trade-offs.** A user who genuinely is training too hard, with ACWR flagging it clearly but their own self-report not yet reflecting it (self-report lags physiological strain in some people), will not get an automatic hard deload from ACWR alone — they'll get a modest volume nudge instead, until a corroborating signal appears.

**Benefits.** This is one of the clearest pieces of evidence in the whole codebase that "confidence governs authority" (Constitution Article 13) is a real, general, testable mechanism rather than a principle stated in a document and not actually enforced.

**Future considerations.** None; this is treated as settled, evidence-grounded policy.

---

## ADR-08: Subjective wellness is weighted at least as heavily as objective wearable data

**Decision.** In computing daily readiness, the athlete's own 1–5 self-rating of energy, soreness, mood, and stress is weighted equally to or more heavily than objective wearable metrics (HRV, resting heart rate, sleep).

**Context.** A cited 2016 sports-medicine study (Saw, Main & Gastin, British Journal of Sports Medicine) found subjective wellness reporting to be at least as sensitive an early indicator of accumulating fatigue/overtraining as physiological markers.

**Problem.** It would be intuitive — and is a common design mistake in fitness apps — to treat wearable data as inherently more "objective" and therefore more trustworthy than a user's own self-report, when the evidence doesn't actually support that hierarchy.

**Alternatives considered.** Weight objective sensor data more heavily by default (the more conventional design choice) — rejected as contrary to the cited evidence.

**Chosen approach.** A weighted blend (documented in the readiness index's own governed knowledge entry) where subjective wellness carries the largest single share of the composite score, with hard overrides regardless of the blended score if the athlete reports illness (forces full rest) or travel (forces an easy session).

**Trade-offs.** A user who under-reports how they feel (whether through inattention or a desire to "push through") can suppress their own readiness score's accuracy in a way a purely sensor-driven system wouldn't be vulnerable to. This is accepted as the better failure mode given the cited evidence.

**Benefits.** Directly demonstrates Constitution Article 12 ("science informs; athlete response validates") — this is a case where the science actively contradicts a naive, tech-forward instinct, and the platform followed the science.

**Future considerations / open questions.** None currently open.

---

## ADR-09: Offline-first sync — local write always durable first, cloud write best-effort

**Decision.** Every user action writes synchronously to an in-memory + localStorage-backed local database first (making it durable immediately, with no spinner), then attempts a Supabase write asynchronously; a failed cloud write is queued (by table, not by individual operation) and retried automatically on reconnect.

**Context.** The product is used mid-workout, often in gyms with poor connectivity, where an app that blocks on network calls to log a completed set would be actively harmful to the core experience.

**Problem.** A naive "cloud-first" design (write to Supabase, wait for confirmation, then update the UI) would mean a bad gym Wi-Fi signal directly breaks the ability to log a workout.

**Alternatives considered.** A more conventional operation-log-based offline queue (record each failed mutation individually, replay them in order on reconnect) — rejected in favour of a simpler, table-level "dirty" flag that just re-pushes whatever the current local state is, because it's inherently idempotent and immune to ordering bugs (replaying "the current truth" rather than "a sequence of past intentions" sidesteps a whole class of offline-sync bugs).

**Chosen approach.** `Database.js` (synchronous local store) → `SyncService.js` (writes local first, attempts cloud, never throws) → `syncOutbox.js` (per-table dirty flags, drained on the browser's `online` event or an explicit pull).

**Trade-offs.** A genuinely destructive edge case existed and was fixed: an early version of account data-erasure missed wiping the `workouts` table when a user asked to erase their training data (a real, if narrow, "right to be forgotten" gap, closed once identified). The architecture also constrains what CLAUDE.md's hard rules call out explicitly: `Database.js`'s synchronous API must never be rewritten, because a large amount of dependent code assumes it.

**Benefits.** The app works fully offline for logging a workout, with no user-visible degradation, and self-heals to the correct cloud state once connectivity returns — verified by dedicated tests (`sync-outbox.js`, `storage-namespace.js`).

**Future considerations.** None currently blocking; considered a stable, mature part of the architecture.

---

## ADR-10: Freeze-on-start — a started session is immune to further adaptation

**Decision.** The instant a user taps "Start" on a session, its exact current content (after any adaptive reflow) is pinned/snapshotted; the ongoing background reflow of future days can never retroactively change a session that's already in progress.

**Context.** The adaptive reflow (Architecture Atlas §5) recomputes the current and next week continuously as new signals arrive (a new readiness check-in, a missed session elsewhere). Without a freeze mechanism, a session could theoretically change its own exercise list *while the athlete is mid-workout*.

**Problem.** This was, in fact, a real bug at one point (referenced in prior session history as a "pin-on-start" fix) — a session could be silently reshaped after the user had already started it.

**Alternatives considered.** Simply not reflowing "today" at all once any session that day has started — rejected as too coarse; a user might have two sessions planned in one day, or the reflow might still legitimately need to adjust a not-yet-started session later the same day.

**Chosen approach.** A per-session "override" snapshot (`sessionOverrides.js`), keyed by the session's stable template reference, created only if no override already exists (so it never clobbers an earlier pin from a different feature, like the "Train Now" one-off session mechanism). The reflow's own missed-volume and deload logic explicitly skips any slot that already has an override present. The mechanism is portable across devices — reconciled on sign-in with a documented "frozen wins" rule (whichever device froze the session first is kept as truth).

**Trade-offs.** None significant; this is a narrowly-scoped, well-tested safety mechanism with no meaningful downside once correctly implemented.

**Benefits.** Directly implements Constitution Article 10 ("once an athlete commits to a session, it's frozen — the engine never silently reshapes it after the fact").

**Future considerations / open questions.** None currently open.

---

## ADR-11: AI governance — two seams only, and a coach-dashboard duplication that was found and deleted

**Decision.** AI may only enter the platform through two seams (interpret/communicate/analyse for free-text and prose, or a contract-bounded proposal for one specific, already-validated decision type). Separately and concretely: the coach dashboard's own hand-written TypeScript port of the coaching status math was deleted in favour of consuming the shared engine's `rollUp()` function directly.

**Context.** `docs/architecture/AIGAS.md` (the AI Governance & Architecture Specification, drafted and independently reviewed 2026-07-06) formalises the AI boundary. Separately, the coach dashboard was originally built with its own `lib/derive.ts`-style logic mirroring the mobile app's coaching signals, because the shared engine's team-facing `rollUp()` function didn't exist yet when the dashboard was first scaffolded.

**Problem (the AI half).** Without an explicit, narrow, validator-gated boundary, it's easy for an AI feature to creep from "explain this decision in plain English" into "quietly influence the decision itself" — exactly the failure mode Constitution Articles 10, 14, and 18 are designed to prevent. **Problem (the dashboard half).** Two independent implementations of "what does this player's status mean" is precisely the kind of silent-drift risk the whole platform is built to avoid (the TAS explicitly names "the coach web app re-derives its own coaching signals" as a named, pre-identified risk it must close).

**Alternatives considered (AI).** Let a future AI feature call the engine's decision functions directly and choose whether to trust its own output — rejected; the AIGAS explicitly states an AI's self-reported confidence is never trusted, only earned by passing the same deterministic validators every other construction path faces. **Alternatives considered (dashboard).** Keep hand-maintaining parity between the mobile app's and the web dashboard's coaching math via code review discipline — rejected as unsustainable and exactly the kind of manual-sync risk the architecture aims to design out.

**Chosen approach (AI).** Two seams only: Seam 1 (an AI proposes a full replacement for a specific decision — today, only D11/exercise-selection has a declared contract — and the proposal is rejected outright on any validator finding worse than "pass"); Seam 2 (AI drafts knowledge-base entries or learning priors, gated by human review before use). A concrete, careful implementation already exists and is switched off by three independent controls (a profile-level kill switch, an Edge-Function-level kill switch, and a raw-vital leak gate that recursively scans any AI-bound payload). **Chosen approach (dashboard):** the engine's `rollUp()` function was extracted/ported (WP-53) and the dashboard's own duplicate derivation logic was deleted the same day, on 2026-07-06 — the same day this documentation sprint ran.

**Trade-offs.** The AI seam currently has real, tested, but entirely unused plumbing (`AiService.js` has no live caller in the UI today) — a deliberate "build the seam before the feature" sequencing choice, not wasted effort, but worth knowing about if reviewing "what does the AI do today" (answer: nothing yet, by design).

**Benefits.** When AI features do go live, they will do so behind an already-reviewed, already-tested boundary rather than one designed under feature-launch time pressure. The dashboard/engine consolidation permanently removes a class of bug (the two surfaces disagreeing) rather than just fixing today's instance of it.

**Future considerations.** AIGAS is a draft awaiting formal ratification into the frozen governance set (which requires the Constitution's own Amendment & Stewardship process). An independent adversarial panel-review pass is recommended before that ratification, per the review's own conclusion.

**Open questions.** Decision-substitution contracts for D4/D5 (diagnosis/prioritisation) are named as future AI-substitution candidates but explicitly not yet declared, pending an evaluation harness that doesn't exist yet — a deliberate gate, not an oversight.

---

## ADR-12: The learning loop writes only to a staged field; promotion to a live prior is a human decision

**Decision.** The first genuine learning mechanism (comparing a training block's actual outcome — did tracked lifts improve, did recovery hold up — against its diagnosis) writes candidate adjustments to `model.stagedPriors`, a field nothing in the engine currently reads. Moving a value from "staged" to "live" (`model.learnedPriors`, which the engine does read) is a distinct, human-gated step.

**Context.** Constitution Article 16 ("become more personal as evidence accumulates; learn, don't assume... never oversell personalisation it hasn't earned") and Article 18 ("learning updates priors the next planning pass reads; it never mutates an existing plan").

**Problem.** An automatically-self-adjusting system that immediately acts on its own inferred learning is much harder to reason about, debug, and trust than one where a human explicitly reviews and approves the first few instances of the system changing its own behaviour based on data it collected itself.

**Alternatives considered.** Auto-promote any candidate prior that meets a statistical threshold — rejected, at least for this first version, as too large a trust step to take without a human decision point, especially given the underlying signal (a handful of logged sessions over one training block) is genuinely thin evidence.

**Chosen approach.** The candidate-generation logic (`learning/blockOutcome.js`) is real, tested, conservative (requires two independent signals — declining lift progress AND declining self-rated recovery — to corroborate before proposing anything, and only ever proposes a *reduction* in training tolerance, never an increase), but its output is explicitly staged rather than consumed. The founder decides when the first learned-prior writer goes live — described in the code itself as "the same twice-gated pattern as the AI seam."

**Trade-offs.** Real, computed learning insight currently goes unused in production, even though the mechanism to generate it exists and is tested.

**Benefits.** When learning-driven adaptation does go live, it will do so as a deliberate, reviewed decision with a specific, auditable first case, rather than silently accumulating influence no one explicitly approved.

**Future considerations / open questions.** When and how to promote the first staged prior is an open, deliberately-deferred decision belonging to the founder.

---

## ADR-13: Team joining uses a coach-shared code, not email invites

**Decision.** A coach founds a team and receives a short (6-character), human-shareable join code; a player joins by typing the code into the mobile app. There is no email-based invite system.

**Context.** The Team package needed some mechanism for a coach to onboard a squad of players onto their team without requiring the platform to know every player's email address in advance.

**Problem.** Building a full email-invite system (sending, tracking accept/decline state, handling invite expiry, resending) is real infrastructure the team judged unnecessary for the current stage of the product.

**Alternatives considered.** Email-based invites (the more common SaaS pattern) — explicitly considered and rejected in favour of simplicity, per the founder's direct decision.

**Chosen approach.** A `create_team` / `join_team_with_code` / `rotate_team_code` set of `SECURITY DEFINER` database functions; the join code itself is protected by column-level grant revocation so that even a team member cannot casually harvest and re-share it by reading the `teams` table directly — only a coach, via a dedicated function, can retrieve it.

**Trade-offs.** No built-in mechanism yet exists for a coach to track "who have I invited but who hasn't joined" the way an email-invite system naturally would; a leaked code could in principle let an unintended person join a team (mitigated by the coach being able to rotate the code and by the coach retaining removal rights over the roster).

**Benefits.** Substantially less infrastructure, shipped faster, matching Constitution Article 20's discipline.

**Future considerations / open questions.** None currently blocking; revisit only if invite-tracking becomes a real customer need.

---

## ADR-14: A real historical bug — team-scoped vs. player-scoped coach access — caught and fixed within about a day

**Decision (the fix).** The `player_status` table's coach-read policy was changed from "does the caller coach *any* team this player belongs to" (`is_coach_of(user_id)`) to "does the caller coach *this specific row's* team" (`is_coach_of_team(team_id)`).

**Context.** The team data-isolation spine (ADR-06) shipped on 2026-07-05. A player who belongs to two different teams (plausible — a multi-sport athlete, or someone who leaves one club for another) is a scenario the original policy did not correctly handle.

**Problem.** With the original policy, a coach who legitimately coaches a player on Team X could also read that same player's derived status row for Team Y, even though they have no relationship to Team Y at all — a genuine, if narrow, cross-team privacy leak, directly against the platform's own stated isolation rule.

**Alternatives considered.** None seriously — once identified, the fix was unambiguous; the only real decision was how quickly to apply it.

**Chosen approach.** The policy was rewritten to check the specific team on the row being read, not "any team the caller coaches," within roughly 24 hours of the original spine going live, found through the team's own scheduled reassessment process (not an external report) — recorded as "Gap 1" in `docs/architecture/REASSESSMENT-2026-07-05.md`. A companion gap in the same review ("Gap 2" — any team member could read the team's join code directly, not just the coach) was fixed the same way, in the same migration.

**Trade-offs.** None going forward; this is now considered closed and is covered by the RLS test harness specifically to prevent regression.

**Benefits.** This is a genuinely good example of the platform's own review discipline working as intended — the bug was found by the team's own structured reassessment process before any external party reported it, and fixed the same day it was found, with a test added to prevent recurrence. Worth noting explicitly for the founder: this DID ship live for roughly a day before being caught, on a pre-launch product with no live users at the time, which is presumably why the team judged it acceptable to fix forward on production directly rather than treat it as an incident requiring rollback.

**Future considerations / open questions.** None; closed.

---

## ADR-15: Governance documents frozen at v1.0 — changes require a formal amendment, never an inline edit

**Decision.** Five documents (the Constitution, Decision Ontology, Knowledge Architecture, the Engine Design Specification, and the Technical Architecture Specification) were frozen at version 1.0 on 2026-07-01. They are not edited as part of routine feature work; a change requires the Constitution's own Amendment & Stewardship process — a deliberate, versioned, reviewed change reconciled across the whole set.

**Context.** Before this freeze, the platform's understanding of its own target architecture had been evolving rapidly across several documents simultaneously (an engine-specific spec, a sport-knowledge spec, various evaluation documents) with no single moment where "this is now the agreed target" was declared.

**Problem.** Without a frozen baseline, "the architecture" is a moving target that any single session's work can subtly reinterpret — precisely the kind of drift that makes a solo-founder-plus-AI-agents development model hard to keep coherent over months.

**Alternatives considered.** Continue treating architecture documents as living, continuously-editable working notes — rejected as insufficient discipline for documents meant to bind a multi-year rebuild.

**Chosen approach.** A two-tier documentation model: frozen governance (rarely touched, requires ceremony to change) plus living companion documents (`BASELINE-ARCHITECTURE-ASSESSMENT.md`, `MIGRATION-BLUEPRINT.md`, and dated point-in-time reassessments) that are *validated against* the frozen set and updated freely as reality changes. Before freezing, the foundation documents were run through a structured, six-lens adversarial review (an Olympic Head of Performance, a Professor of Sports Science, an elite S&C coach, a Principal Software Architect, a Staff AI Engineer, and a Product Architect) specifically to surface gaps before they became permanent.

**Trade-offs.** Genuine architectural learning that would normally get folded straight back into the "spec" now has to wait for a deliberate amendment cycle, or get captured in a living companion document instead — a small amount of process overhead in exchange for stability.

**Benefits.** A small number of already-caught inconsistencies exist between the frozen set and reality (e.g., a stale claim in one internal doc about how "steered" a decision currently is) — but these are caught and named explicitly in living documents rather than causing silent disagreement about what the target architecture even is.

**Future considerations.** The one document not yet formally folded into the frozen set is AIGAS (see ADR-11) — currently a "v1.0 draft, pending ratification."

**Open questions.** None regarding the freeze mechanism itself; only the pending AIGAS ratification is an open item.

---

## ADR-16: Security hardening is treated as continuous practice, not a one-time audit

**Decision.** Rather than a single point-in-time security audit followed by silence, the platform has run a formal audit (2026-06-21), a dedicated multi-user readiness addendum specifically triggered by the Team package going live (2026-07-05), and has fixed several CRITICAL/HIGH findings same-day or next-day as they were found — including an OAuth `state`-parameter impersonation vulnerability that had existed since the very first wearable-connect feature (over a month), closed by introducing a signed, single-use nonce table.

**Context.** Adding a second product surface (the Team package) that lets one user's account (a coach) legitimately read data derived from another user's account (a player) meaningfully raises the stakes of any RLS or auth mistake, compared to the single-user-only Individual product.

**Problem.** Security posture that isn't re-examined when the product's trust model changes (single-user → coach-can-read-derived-player-data) risks carrying forward assumptions that were safe before and aren't anymore.

**Alternatives considered.** Rely on the original audit remaining valid indefinitely — rejected once the Team package's cross-user access pattern was recognised as a meaningfully different risk profile.

**Chosen approach.** A dedicated "Multi-User Readiness Review" addendum was run specifically because of the Team package launch, re-auditing from the specific angle of "what could a coach improperly see." Findings were triaged by severity and mostly closed within the same working session or the next: OAuth CSRF/impersonation (CRITICAL, fixed via signed nonces), wearable OAuth tokens readable by the owning browser via PostgREST column grants (CRITICAL, fixed via column-level grant revocation), missing DB-level bounds on coach-visible free text (HIGH, fixed via CHECK constraints), Edge Functions logging raw vitals/PII (HIGH, fixed), the coach dashboard having no auth gate at all at one point (HIGH, fixed with a real server-side session + role check), and a vulnerable Next.js version with known HIGH-severity XSS advisories (HIGH, fixed by upgrading).

**Trade-offs.** A small number of low-severity items remain deliberately accepted rather than fixed (e.g., a wildcard CORS header on JWT-gated Edge Functions — low practical risk since every affected function still requires a valid token regardless of origin), and a few genuinely manual, human-gated steps remain outstanding (some dashboard settings, applying certain hardening migrations to production in a deliberate batch rather than automatically).

**Benefits.** A demonstrable pattern of finding real vulnerabilities through the team's own structured process (not through an external incident) and closing them quickly, with the closure recorded in the same migration/commit that introduces the fix — genuinely good practice for a project at this stage and scale.

**Future considerations.** A handful of `NOT VALID` database constraints (enforcing new rules only on new/updated rows, not retroactively validated against historical rows) remain intentionally unvalidated against legacy data — low risk while there are few or no live users, worth revisiting once real production data accumulates.

**Open questions.** A small number of low-severity, explicitly-accepted findings remain open by deliberate choice, documented in `docs/SECURITY-AUDIT.md`'s addendum rather than silently ignored.

---

## Decisions that should become formal, standalone ADRs in future (not yet fully resolved)

1. **Whether the fixed 10-quality vocabulary needs to expand.** Already strained once (swim, ADR-05); likely to strain again for field/invasion sports needing concepts like change-of-direction or grip strength that currently have no home in the model.
2. **The final shape of D6 (Training Strategy)**, which doesn't yet exist as a first-class decision object — currently a prerequisite blocking the D7 block-objective work from proceeding without either building a minimal version first or explicitly recording the debt of skipping it.
3. **The "build flip"** — bringing the majority "get stronger / build muscle / general fitness" cohort onto diagnosis-first reasoning — is a real, paused, high-visibility product decision (not merely an engineering task), explicitly awaiting the founder. **Shipped 2026-07-07** (deployed; see ADR-02's resolution stamp) — this item is now a candidate for a retrospective formal ADR rather than a pending decision.
4. **Whether/when to promote the first learned prior** (ADR-12) and **whether/when to switch on the first AI capability** (ADR-11) are both explicit, deliberately human-gated decisions with no default timeline.
5. **Reconciling `docs/SCHEMA.md` and `docs/architecture/README.md`** against current reality — both are confirmed stale as of this documentation sprint (see the Health Report) and should either be actively maintained or explicitly retired in favour of documents that are.
