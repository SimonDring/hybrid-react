# Project Handoff — state of play

_Last updated: 2026-07-13 (Phase 0: Track B merged, Track A Wave A complete pending PR). This file carries **current
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
  `20260712`; applied to prod 2026-07-14 — see open queue #4), **CI hygiene**
  (#164 — per-test timeout, one test definition, doc-aware deploys), **ESLint floor
  with engine-purity rules** (#165 — Art 18 enforced at lint time; found
  TrainingCalendar.jsx provably dead, TD-22), and the **CLAUDE.md overview reframed**
  per Simon (#167 + #162 — an elite S&C platform; the plan is the OUTPUT). Suite
  196/196. Remaining Immediate items are Simon-gated: I5 (enforce injury vetoes) +
  the 5 missing rehab regions (science review).

- **Sprint 2 — decision-engine forensic audit MERGED (2026-07-11, #169).**
  Ten deliverables in `docs/reviews/2026-07-11-engine-audit-*.md`: current-state map,
  constitutional alignment (5.4/10 — the four failed verbs are *measure, progress,
  dispose, learn*), coaching-quality verdict, bodybuilding-bias report, knowledge-usage
  census, technical + scientific risk registers, gap analysis (G1–G22), ranked P0–P3
  backlog, and a DRAFT migration blueprint (waves A–F). Headline NEW defects found:
  post-flip style-id fallthrough (all 3 build disciplines silently run the *functional*
  volume band — re-baselined into goldens unnoticed), the D14 report is invisible
  (zero UI consumers), empty rehab sessions are filtered out of their own validator,
  D7 steer silently live in prod (schema-default prior arms it; goldens never exercise
  it), plan-memo staleness (profileSignature omits sport_code/game dates/model), the
  legacy fill's real cohorts are triathlon + zero-gap run/cycle + code-less GAA (not
  un-modelled sports), and the SKB projection drops 11 qualities (not 8; one is a
  mapping bug).

- **Governance forensic audit DELIVERED (2026-07-11, branch `governance-audit-2026-07-11`).**
  Ten deliverables in `docs/reviews/2026-07-11-governance-audit-00…09`: a
  first-principles world-class benchmark (six pillars, 43 capabilities), seven
  per-document forensic audits of the governing tier, the data & analytics
  deep-dive, and the verdict + 92-finding register. Headline verdict (deliverable
  09 §1): the programming half of the governance is world-class; the second
  product — measuring/modelling/analysing the athlete — is thin-to-absent with one
  confirmed constitutional root (GA-113) and no architectural owner. Queue-ready
  outputs: AQ-1…AQ-9 amendment candidates + ND-1 (a Data & Analytics Architecture
  Specification, peer to the EDS). Three amendment-pipeline defects
  (GA-701/702/703) must be fixed (living-doc edits) before the queue can land.
  Every finding traceable: 31 COVERED · 41 SPEC-FILLABLE · 15 AMENDMENT · 5
  NEW-DOCUMENT. No frozen document was touched.
- **Decision Engine V2 design sprint: PARKED by Simon (2026-07-11).** Spec
  (`docs/superpowers/specs/2026-07-11-decision-engine-v2-design.md`) + plan
  (`docs/superpowers/plans/2026-07-11-decision-engine-v2-design.md`) are committed
  on branch `engine-v2-design-2026-07-11`; **no deliverables authored yet** — Simon
  ordered the governance audit first. Audit 09 §5 flags which V2-design premises
  its findings alter (knowledge-ownership targets; the V2-P/closed-catalogue
  question → AQ-4).

- **Phase 0 (2026-07-13): Track B MERGED · Track A Wave A COMPLETE, pending PR.**
  Track B (#172): the amendment pipeline is repaired (GA-701/702/703) and
  `docs/AMENDMENT-QUEUE.md` is live. Track A Wave A sits on branch
  `phase0-wave-a-2026-07-13` awaiting its PR — the six P0 engine-audit fixes:
  - **P0-6** — strengthEndurance projection restored + `droppedDemands` ledger
    (no more silent SKB quality loss).
  - **P0-7** — plan-memo signature covers sport_code / game dates / athlete-model
    subset + plan_start_date (memo can no longer serve a stale plan).
  - **P0-1** — volume bands keyed on discipline, not style id (build-goal
    fallthrough to *functional* fixed; sports byte-identical).
  - **P0-2** — rehab sessions visible to their own validators; unservable rehab
    surfaced; phantom volume fixed (TR-04/SR-03).
  - **P0-3** — injury-veto gate at D14, behind `ENFORCE_INJURY_VETOES=false`
    (default OFF; flip awaits I5, Simon-gated).
  - **P0-5** — triathlon + zero-gap run/cycle + code-less GAA rescued off the
    legacy fill onto the diagnosis-first path (quality gate: improved/not-degraded).
  Wave A review residual **P1-10 CLOSED (2026-07-14)**: the F3 migration is applied
  to prod (see open queue #4 — only the Edge Function deploys remain).
- **Phase 1 (2026-07-13): the AQ-1…9 ratification batch is DRAFTED — PR #175 awaits
  Simon's ratification decision.** Six proposal files + whole-batch consistency
  review in `docs/design/amendment-batch-2026-07/` (nothing applied to frozen
  docs); AQ rows flipped to BATCHED in `docs/AMENDMENT-QUEUE.md`. Simon's AQ-1/
  AQ-2 direction verdict unlocks the ND-1 authoring sprint. Wave A follow-up
  fixes: PR #174.

- **Phase 2 (2026-07-14): the V2 BLUEPRINT SET IS AUTHORED — PR pending Simon's
  ratification (DEVELOPMENT-PLAN §5.3).** All 14 deliverables in
  `docs/design/engine-v2/` (+ atlas §4.8): anchors gate-reviewed; the whole-set
  consistency pass is the review-of-record (verdict: READY); reconciliation vs
  the ratified v1.1 set = 22 rows, 0 divergences, empty Amendment Register.
  Migration hardened to M0–M6 (M1 = Wave A, LANDED; legacy fill DELETED at M2);
  ten 🔒 Simon decision points ledgered in deliverable 11 §8.3. Ratifying the
  blueprint opens Phase 3 (the build).

- **Phase 3 · M0 (the test net) — DONE, PR pending Simon's merge (2026-07-14).**
  The CI net under the whole V2 migration, all ADDITIVE (zero engine-source change):
  an engine-owned property suite (`packages/engine/tests/prop-*` — purity,
  determinism, contracts, additive-identity, reflow≡baseline) closing the TR-11
  self-test gap; 16 new golden archetypes for the audit's blind paths (armed-D7,
  injured incl. 5 bare regions, measured-vs-prior, zero-gap rescue, non-logging
  progressor — 0 existing snapshots moved); a mechanical snapshot expected-delta
  guard (TR-01 recurrence killer); RLS harness wired into CI (inert until Simon
  adds `RLS_STAGING_SUPABASE_URL/ANON_KEY`); perf baselines. Suite 203/203 app +
  6/6 engine; Opus review re-verified the net can actually fail.
  **HEADLINE FINDING — CAUGHT *and* FIXED (Simon ruled 2026-07-14).** The
  reflow≡baseline property caught a live double-count: an in-season sport athlete's
  runtime reflow re-applied the SKB season trim (×0.6) off the *profile's* season —
  not live state — on top of a baseline plan that already periodises in-season.
  Fix: reflow diverges ONLY for live state (completions/readiness/injuries/freezes);
  calendar/season signals are excluded from the reflow rule path (`reflowAdjust`
  `REFLOW_EXCLUDED_SIGNALS`). Baseline byte-identical; the property is now a HARD
  invariant (XFAIL retired). ⚠ Still Simon's call, deferred: `competition_within_h`
  (taper) + `matches_this_week` (fixtures) are the same class — taper needs a
  baseline-double-count confirm, fixtures need D8 baseline ownership (M6).

- **Phase 3 · M2a — PROGRESSION IS REAL, PR pending Simon's merge (2026-07-15).**
  The audit's worst finding (SR-01/G9 — non-logging athletes never progressed) is
  fixed for every discipline. Estimator-driven creep: conservative, completion-gated
  (🔒 1), honestly labelled *estimated*, displaced the instant a set is logged.
  Per-discipline: powerlifting/olympic load-creep + programmed warm-up ramps (SR-10),
  hypertrophy reps-first double progression, sport gym-work builds off-season only and
  **holds the maintenance line in/pre/around competition** (Art 2). Rates are governed
  knowledge with provenance (KSV 1.31→1.35). **Scoreboard: flat/non-progressing
  archetypes 38/45 → 6/45, and all 6 residual are legitimate in-season maintenance**
  (Opus review verified). reflow≡baseline + purity hard-green; each discipline's
  goldens re-baselined scoped. The report-only progression-sanity + dose-coherence
  validators are M2a's acceptance instrument (promotion to gating = M4).
  **⚠ Two coaching-judgement calls flagged for Simon:** (1) fresh plans *project*
  progression forward before it's earned (labelled, self-correcting on log — but a
  philosophy choice); (2) `completed_weeks` completion-history is still dormant, so
  completion-gating is aspirational until it's wired (M3/M5).
  M2a MERGED (#181). **M2b — the legacy fill is DELETED, PR pending Simon's merge**
  (branch `phase3-m2b-fill-deletion-2026-07-15`): the volume-first deficit fill,
  its scoring economy, and the `diagnosisSteers` gate are GONE (−240 LOC) — D11/
  M-SESS is the ONLY construction path (G6/TR-08 closed). Proven dead first
  (0/45 archetypes entered it), then byte-identical goldens after (behaviour-neutral).
  The MRV ledger survives (Art 6 — volume validates, no longer drives). Two
  behaviour-neutral dead-code leftovers deferred to M6's sweep (`styleObjective`;
  the `wp61-govern-scoring` SELECTION_SCORING pin now pins production-dead knowledge).

- **Phase 3 · M3a — MEASURED DIAGNOSIS (displacement + honesty), PR pending Simon's
  merge (2026-07-15).** M2 fully merged (#181 progression, #182 fill-deletion — the
  legacy volume-first engine is gone). M3a begins the *measure* verb, per 🔒 2/🔒 3
  (Simon 2026-07-15: strength from logged lifts first; defer the new-quality vocabulary):
  a logged lift now yields a **measured** maxStrength estimate (via the governed
  STRENGTH_STANDARDS — the 🔒 2 anchor) that **displaces the training-age prior at higher
  confidence and NAMES the displaced prior in the D4 rationale** (C8; Art 16); and the
  `droppedDemands` honesty ledger now reaches the plan with reasons (Art 15 — the
  🔒3-deferred qualities are declared, not hidden). **Additive-first proven byte-for-byte**
  (no logged lifts ⇒ identical plan; `prop-additive-identity` green; only 4 lift-bearing
  archetypes moved, rationale-line only). k>1 priorities follow from measured confidence
  (`K_BY_CONFIDENCE`, prioritise.js unchanged). Reuses existing knowledge (no KSV bump).
  **⚠ 🔒 2 sign-off points for Simon** (both sound per review): undated lifts stay
  *moderate* confidence pending measurement-date capture; the squat/press "two priorities"
  example is partial until the 🔒3 vocabulary (strength is one quality today).
  **Next: M3b — athlete-signal confidence operative** (TR-13; separate PR).

- **Phase 3 · M3b — ATHLETE-SIGNAL CONFIDENCE OPERATIVE, PR pending Simon's merge
  (2026-07-15).** M3a merged (#183). M3b closes TR-13/SR-04: one un-baselined bad
  wellness entry can no longer swing volume. `recoveryIndex` computes REAL
  `baselineMaturity` (was hard-coded 1); a recency factor down-weights stale rows;
  the readiness cut is scaled by an authority gate on confidence (bounded below 0.5,
  full for mature signals — Art 13). **Acceptance:** immature single bad entry →
  ~3.3% cut (was ~22%); mature 10-day → full 22% (authority kept); stale < fresh.
  **Review caught + fixed a regression:** the confidence denominator treated
  'no wearable' as low confidence — a mature MANUAL-only logger was wrongly muted;
  now confidence reflects the maturity of the data the athlete actually gives (a
  diligent manual logger reaches full authority; only thin history gates). Golden
  byte-identical (recovery drives reflow, not baseline); no KSV. **⚠ Simon calls:**
  the `FULL_AUTHORITY_CONFIDENCE`=0.5 threshold (now reachable by mature manual
  loggers); the gate cut-points stay in-code PROVISIONAL, tracked for the **M6 P2-10
  knowledge-governance sweep** (with the M2b `styleObjective`/`SELECTION_SCORING`
  leftovers + the deferred taper/fixture calendar signals).
  **M3 then complete** (M3a measured diagnosis + M3b signal confidence).

- **Phase 3 · M4a — VALIDATION DISPOSES, PR pending Simon's merge (2026-07-15).**
  M3 fully merged (#183/#184). M4a closes Art 19's *dispose* verb (the audit's most-
  emphasised gap), per Simon's 2026-07-15 sign-off (safety-only enforcement; 🔒 5
  injury-veto ON, id-keyed):
  - **The injury veto ENFORCES** (I5 flipped on) — a contraindicated exercise that
    reaches the shipped week is vetoed at D14, keyed on a new **id/pattern
    contraindication vocabulary** (retired the fragile name-regex — TR-10; a novel
    exercise can no longer slip past) and removed by item identity. A no-safe-work
    region surfaces an honest *unservable* (never a contraindicated session). It's a
    backstop — the constraints-first filter substitutes upstream, so goldens are
    byte-identical; it bites on slip-through (21 seeded-defect assertions prove it).
  - **The conflict order is an explicit D14 pass** (C1) — Safety>Sport>Recoverability
    >Intent>Objective>Optimisation, higher tier wins absolutely (270-combo property-
    proven), with resolution records. Closes the 'winner is whichever line runs later'
    defect.
  - **The validation report reaches a human** (TR-02) — `explainValidation` +
    a WeekDetail 'why your plan was trimmed' banner; a zero-consumer validation
    product now FAILS CI.
  Golden byte-identical whole-branch; purity + prop-* green; 204/204 + 14/14.
  **⚠ Honest caveats (for the PR): (1) INJURY enforcement is fully live; 'lawfulness
  enforces' is a correctly-wired but EMPTY seam — no lawfulness validator authored
  yet (M4b). (2) Pre-existing ballistic/olympic contraindication gaps (`clearedIds`:
  hang_clean, snatch/C&J never blocked) are faithfully preserved — Simon's near-term
  science review. (3) The contraindication vocab is safety-critical knowledge sitting
  outside the governed KNOWLEDGE_SET ratchet — M6 governance sweep.**
  Deferred: M4b non-safety validator build-out (report-only) + gate-promotion (needs
  a production FP window); override seam + explain-persist (M5). Next: M5 (learning
  loop + the data product on the DAAS).

- **Phase 3 · M5 ENTRY GATE — DAAS RATIFICATION, PR pending Simon's merge (2026-07-15).**
  M4a merged (#185). M5 needs its governing doc canonical first (Simon 2026-07-15:
  ratify the DAAS first, then build the schema/privacy design for panel review before
  any migration). The DAAS went through a fresh **adversarial ratification panel**
  (re-tested against the now-APPLIED v1.1 set — Family VIII/D17/Arts 21-22/derived-data
  doctrine, all ratified since the DAAS was authored): verdict **RATIFY WITH FIXES**,
  fixes applied. It flips designate → **canonical T2, peer to the EDS** (the second
  product's governing foundation). The panel found a real frozen-set inconsistency —
  TAS §4.5/L1 still say 'priors are the only channel / D1–D16' while ratified EDS D17
  also feeds the engine — now queued as **AQ-10** (+ AQ-11/GA-306, AQ-12/GA-309 resolve
  the DAAS's dangling refs); ND-1 → RATIFIED. Merge = the ratify act; DEVELOPMENT-PLAN
  §8's 3→4 DAAS-ratification gate is then satisfied. **Next: M5 first deliverable —
  the append-only outcomes/history + consent SCHEMA + RLS/privacy design for panel
  review (🔒 6), before any migration Simon applies; then D16 promotion policy (🔒 7).**

- **Phase 3 · M5 — OUTCOMES-SUBSTRATE SCHEMA & PRIVACY DESIGN, PR pending Simon's
  🔒 6 sign-off (2026-07-15).** DAAS ratified (#186). First M5 deliverable, DESIGN ONLY
  (no migration ships — Simon 2026-07-15): `docs/design/m5-substrate/SCHEMA-AND-PRIVACY.md`
  — append-only outcomes/history (9 owner-private tables replacing the 256 KB
  users.profile blob — TR-03), consent_grants/events, and the single derived cross-person
  table (squad_signal_snapshots); consent revocation ends the crossing (F3 pattern
  generalised); a 21-assertion RLS proof set. Built on the canonical DAAS §3/§3.5/§5 +
  Art 11/22 + TEAM-ARCHITECTURE. **Adversarial privacy panel: SOUND WITH CONDITIONS** —
  confirmed no raw-vital crossing path + synchronous revocation, and CAUGHT a real leak
  (consent tables missing enable-RLS → cross-athlete consent-map exposure) now fixed
  (B1), plus consent-isolation proofs (B2) and a reframed over-stated CI sweep (B3).
  **⚠ ONE DECISION FOR SIMON (D1):** on revocation, delete the athlete's own derived
  history, or end the crossing at the policy layer only (panel + I recommend policy-only —
  Art 22 the athlete owns/exports their record). **Conditions C1–C3 attach to the real
  migration** (server-truth + append-only + oracle proofs, green on staging). **After
  🔒 6: the real migration is authored + Simon-applied (staging→rls-harness→prod), then
  the D16 promotion policy (🔒 7).** Nothing has touched the database.

- **Overnight autonomous run (2026-07-15 → 16). Summary for Simon:**
  - **M4b MERGED (#189):** the report-only validator suite (5 new EDS §35.1 validators —
    sport-protection, MEV-floor, dose-coherence, progression-sanity, deload-presence),
    structurally unable to change a plan (review-verified), goldens byte-identical.
    Promotion past report-only awaits a production false-positive window (your call + data).
  - **M5 migration PR #188 — OPEN, AWAITING YOU (do not merge blind — you APPLY it).**
    The authored substrate migration (20260713); NOT applied to any DB. Twice-reviewed
    (privacy panel + structural leak-review; caught + fixed the consent-table enable-RLS
    leak AND a pre-existing cross-user readiness/injury RPC oracle — F1). **Apply staging-
    first via the SECURITY-DEPLOY M5 runbook; the rls-harness-m5 (P1–P21 + C1/C2/C3 + F1)
    is the green gate before prod.** Nothing touched the database.
  - **Designs PR #190 — proposals for your gated calls** (docs-only, merge or leave):
    🔒 7 D16 promotion policy (twice-gated staged→learned; 4 sub-decisions, each with a
    conservative rec) + the M6 plan (final phase; 🔒 8/9/10 flagged).
  - **Note:** an overnight shared-working-tree tangle was caught and cleanly recovered
    (the migration branch was rebased to migration-only; M4b re-routed to its own branch).
    No work lost, nothing corrupted; recovery is recorded in the SDD ledger.

  **⏳ DECISIONS WAITING FOR YOU (in rough order):**
  1. **Apply the M5 migration** (#188) staging-first — the only thing blocking the rest of M5.
  2. **🔒 7** — rule on the 4 promotion-policy decisions (#190) → then D16 learning is built.
  3. **🔒 8/9/10** (M6, #190) — functional identity; the allocator re-seat (HIGH-risk); endurance trigger.
  4. Standing: I5 flag→default (safety); the ballistic/olympic contraindication science review;
     RLS_STAGING CI secrets; Edge Function deploys (queue #4); the taper/fixtures calendar signals (M6).

- **🎉 M5 SUBSTRATE IS LIVE ON PROD (2026-07-16, Simon).** All outstanding migrations
  applied via cumulative `db push` (staging → `rls-harness-m5` green → prod); ledger
  updated (20260713 + the 20260706–20260710 chain now confirmed on prod). The athlete's
  **append-only career record + consent model + the derived-only cross-person crossing**
  are real: 12 tables, owner-private at rest, one consent-and-membership-gated crossing,
  policy-only revocation, the F1 cross-user oracle closed. The 256 KB `users.profile`
  blob (TR-03) is retired as the substrate; `block_outcomes` is now the D16 evidence base.
  This SATISFIES the M5 entry gate: the record the learning loop consumes now EXISTS.
  **▶ NEXT (unblocked): 🔒 7 — rule on the D16 promotion-policy decisions (PR #190).**
  Simon's 4 calls (promotion threshold / shrinkage / first-armed lever / demotion) →
  then I build the D16 staged→learned learning loop (the last verb, LEARN). App-side
  wiring to WRITE `block_outcomes` on block close + bounded reads is the paired build.
  ⚠ Confirm: if the 20260707 OAuth chain was among the applied, the paired Edge Functions
  (fitbit/strava callbacks + fitbit-sync) deploy separately — check they're live.

## ⏰ OPEN QUEUE (in rough priority; ⚠ = needs Simon's call)

0. **⚠ THE DEVELOPMENT PLAN — created 2026-07-13, adoption = Simon's merge.**
   The governance-audit PR (#170) is MERGED; all four inputs composed into
   [`docs/DEVELOPMENT-PLAN.md`](docs/DEVELOPMENT-PLAN.md): Phase 0 (Wave A
   engine fixes ∥ amendment-pipeline fixes) → Phase 1 (amendment batch AQ-1…9 +
   commission the Data & Analytics Spec ND-1) → Phase 2 (V2 design re-scope +
   authoring) → Phase 3 (migration M0–M6; legacy fill DELETED at M2) → Phase 4
   (data/analytics product, team analytics, AI go-live, Stage 7). **Merging the
   plan's PR lifts the 2026-07-11 HOLD and starts Phase 0.** Sequencing
   decisions recorded in the plan §1 (parallel tracks; re-scope V2 first).

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
   decision. AIGAS is ratified (2026-07-13, AQ-8 — panel record:
   `docs/architecture/AIGAS-REVIEW-2026-07-06.md` + governance audit 06); the
   remaining Stage 6 preconditions are listed in
   `docs/design/amendment-batch-2026-07/06-aigas-ratification.md` §5.
4. **⚠ Pending applies — DB done, Edge Functions still owed.** **`20260712_player_status_membership_scope.sql`
   (the F3 privacy fix; P1-10) is APPLIED (Simon, 2026-07-14)** per the runbook — DB
   migrations through `20260712` now on prod; ledger updated. **Still owed: the paired
   Edge Functions deploy separately** — OAuth-nonce callbacks + `fitbit-sync` (S1/S4/S8)
   and `ai-render` (AI go-live only), per `supabase/SECURITY-DEPLOY.md`.
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
   constitutional amendment candidates (C1–C5 — now tracked in
   `docs/AMENDMENT-QUEUE.md`; evidence stays in the 2026-07-09 audit §2).

## Governance (unchanged)

The six governing documents are **FROZEN** (frozen v1.0 2026-07-01; each at v1.1 since
the 2026-07 amendment batch, ratified 2026-07-13): Constitution, Decision
Ontology, Knowledge Architecture (`docs/foundation/`), the EDS
(`docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md`), the TAS (`docs/architecture/TAS.md`),
and AIGAS (`docs/architecture/AIGAS.md`) — governing for AI work, ratified 2026-07-13
into the frozen set (AQ-8; Appendix B living). All work validates against them; changing one is a versioned amendment,
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
