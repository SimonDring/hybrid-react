# Project Handoff — state of play

_Last updated: 2026-07-21 (overnight UX/coaching-depth branch complete — PR #228 open, DO NOT MERGE
until Simon reviews B/C; branch merged up to main incl. the sport-data roadmap flips — match-day
scheduling + the form model are LIVE on main). This file carries **current
state and the open queue only**. The full session-by-session history (2026-06-11 →
2026-07-09, ~1,800 lines) is preserved verbatim at
[`docs/archive/HANDOFF-HISTORY-2026-06--2026-07.md`](docs/archive/HANDOFF-HISTORY-2026-06--2026-07.md).
Keep this file current at the end of each session; when an entry stops being current,
move it to the archive file rather than letting this one grow._

## 2026-07-21 — overnight branch `claude/session-ui-flow-improvements-92b44a` (PR open, unmerged)

Simon's 2026-07-20 fix list, executed as three sprints (specs + plans in
`docs/superpowers/{specs,plans}/2026-07-20-sprint*`); every task subagent-implemented,
per-task reviewed, whole-branch reviewed (verdict: ready for PR). Suite 217/217 after
merging main (PRs #223–#230 incl. the sport-data flips) into the branch, lint 0 errors,
KSV **1.56.0** on the branch (this branch's four bumps renumbered 1.53–1.56 above main's
1.52.0 in the merge — see `EXPECTED-DELTA.md`'s merge note).

- **Sprint 1 (app-only UX):** selection-contrast fix (real `.rating-btn` class-mismatch
  bug + shared `.opt-chip`/`.is-selected` treatment), rest timer plan-driven only
  (presets removed, Restart kept), live-session pull-down overview (SessionOverview),
  completion celebration + Return home, Midnight summary card with measured duration,
  onboarding draft persistence (`lib/onboardingDraft.js`).
- **Sprint 2 (app-only session intelligence):** the spec's engine change proved
  unnecessary (items already carry `exId` — deviation note in the spec);
  `lib/exerciseMeta.js` classifier + `lib/runnerSteps.js` gate RPE/weight by role
  (mobility → Done; loadable core → weight + cross-session last-time memory). A Critical
  superset content-drop was caught in review and fixed (simple-done superset members
  surface once as prep steps).
- **Sprint 3 (coaching depth):** A — Atlas limiting-factor panel in plain English
  (`lib/atlasLanguage.js`), numbers demoted to a "How we worked this out" disclosure.
  B — SKB position depth woken: secondary-quality floor 0.7 (B1); `priorityPatterns`
  D11 nudge ships ON and moves the 2 positioned fixtures (B2); `commonInjuryRegions`
  prevention nudge ships ON but tier≥3-gated and currently **inert in fixtures** (B3 —
  open coaching call for Simon: should prevention steer session anchors?). C — equipment
  taxonomy (~30-item "Detail my gym" model): governed data + narrowing-only availability
  + D14 coverage fallback + onboarding expander; no-detail behaviour byte-identical
  (acceptance-tested).
- **Root-cause chip fix (Simon-initiated):** the 3 mobility catalogue entries gained
  `loadClass: 'health'` (stamp-only).
- **Golden net delta vs main (audited post-merge; entries in `EXPECTED-DELTA.md`):**
  KSV 1.52.0→1.56.0 stamps + B1's one droppedDemands row + B2's two positioned-archetype
  swaps. Nothing else — no interaction deltas with main's match-day/form work.
- **Merge gates:** Sprints 1–2 + 3A are green/low-risk per the charter; **B2/B3/C pause
  for Simon** (coaching philosophy + public onboarding surface). Noted follow-ups (see PR
  body): weight stepper gated to loadable equipment across all roles (Simon's call,
  2026-07-21 — closed); B3 anchor-steering question;
  SessionOverview same-name merge edge; QUALITY_LABELS circular-import tidy.

## 2026-07-20 — SPORT-DATA INTEGRATION ROADMAP (aerobic + match-day → S&C output)

New workstream, adopted this session (Simon's direction). Umbrella spec:
`docs/superpowers/specs/2026-07-17-sport-data-integration-roadmap-design.md`. It feeds
aerobic (Strava) + pitch/GPS data into the athlete model and reacts the S&C output to it,
in four phases, built the house way (additive-first, flag-OFF, byte-identical until a
deliberate flip). **Key reframe: most of this is finishing pipes that already exist** —
Strava OAuth+sync is LIVE (`workouts` table), already contributes to load via a crude
`duration×3` proxy, and the match-day microcycle logic is already AUTHORED in every team
SKB (just switched off).

- **Phase 1 — match-day-aware scheduling (team-driven). PR A MERGED to main (flag OFF).**
  The fixture-aware microcycle MECHANISM: `mdMapForWeek`/`mdConstraintsFrom` (new
  `microcycle/fixtureWeeks.js`), governed `SCHEDULING_PENALTIES.md` (KSV 1.48.0), scheduler
  MD penalties (inert when null), `PlanGenerator` wiring behind `opts.fixtureMicrocycle`
  (default OFF), `applyTeamSchedule` stamps `team_fixtures`/`team_match_weekday`, and
  `matches_this_week` added to `REFLOW_EXCLUDED_SIGNALS` (kills the baseline/reflow
  double-count). Computed in the BASELINE, never the reflow (fixtures are deterministic from
  plan_start_date). Whole-branch reviewed READY-TO-MERGE; byte-identity proven (stamp-only
  golden + manifest re-baseline); 205/205 + engine 30/30 + lint clean. Plan:
  `docs/superpowers/plans/2026-07-17-phase1-matchday-scheduling.md`.
  **PR B — the FLIP — MERGED to main (PR #225): match-day scheduling is now LIVE** for team
  athletes with coach fixtures (placement-only). Additive-identity audited (golden: 1 archetype
  ADDED, 0 existing moved — every fixture-less athlete byte-identical). Prereqs done (`\b`-anchored
  the MD regex; `preferExplosiveWorkDays` verified authored in all 11 sports). **DEFERRED (Simon's,
  open):** the congested-week volume cut; sentinel semantics (`"all"`/`"none"`/`"match-day priming"`
  parse to null → no reshape today). **Heavy→MD-4 preference LANDED (PR #229):**
  `heavyOffTargetDayPerStep` raised 2→4 (cap-safe: 4×3=12 ≤ muscle-spacing 14; a regression test
  guards the cap). **⚠ Simon's call, open:** the pinned fixture archetype's heavy STILL lands on MD-2,
  not MD-4, because its plyo-loaded accessories create a real 48–72h spacing conflict; forcing MD-4
  there needs weight **6**, which would override muscle-recovery spacing — your tradeoff to make.
- **Phase 2 — aerobic loading + a fitness–fatigue ("form") model. MERGED to main (PR #223, flag OFF).**
  Governed **Banister-TRIMP** aerobic load (`load/aerobicLoad.js`, `load.aerobic.trimp`) + a
  **CTL/ATL/TSB** form model (`load/form.js`, `load.form.model`; TrainingPeaks PMC), KSV
  1.48.0→**1.50.0**, all science cited (Banister 1991 / Tanaka 2001 / TrainingPeaks). Built as a
  **parallel-advisory READOUT**: `computeForm` runs app-side in `buildView` → `formView` +
  `formVerdict` → a Form card on the Training Load screen; **NOT read by `generatePlan`/reflow** →
  byte-identical (stamp-only golden re-baseline). The deload **corroboration seam**
  (`deloadRecommendation`'s optional `form`) is **default-OFF** (never forces alone — Art 13).
  Whole-branch reviewed READY-TO-MERGE; 207/207 + engine 33/33 + lint clean. Spec/plan:
  `docs/superpowers/specs|plans/2026-07-20-phase2-aerobic-form-model*`.
  **⚠ Not visually verified:** the Form card's pixel render is behind auth (compile/lint/theme-var
  clean, null-safe, reuses existing styled classes) — a 30-sec glance behind sign-in closes it.
  **The FLIP — MERGED to main (PR #226): the form model now STEERS the runtime.** (A) aerobic
  Banister-TRIMP is the live ACWR basis (`buildView` uses `aerobicDailyLoads`; closes the two-basis
  seam — ACWR + form + readiness load-card now share one basis; only HR-bearing workouts change,
  no-HR/no-workout byte-identical). (B) form → `deloadRecommendation` with **CONSERVATIVE tiering**:
  `formCorroborates = formFatigued && !(highReadiness && goodRecovery)` — corroborates a high-load
  deload but never forces alone or against a clearly-fresh athlete (Art 13). **golden byte-identical**
  (baseline reads neither ACWR nor form); `prop-reflow-baseline` green; 208/208. Reviewer cleared the
  readiness blast-radius (TRIMP carries 0 weight in the blended readiness *value* — display-only).
  **D9 dose-shrink LANDED (PR #229, Simon-approved):** governed `load.form.dose = {fatiguedVolumeMult:
  0.9}`; in the reflow, `mult = Math.min(mult, form.band==='fatigued' ? 0.9 : 1)` — a gentle
  form-fatigued volume trim, capped, byte-identical when not fatigued, `Math.min` prevents
  double-counting a deload (proven vs the real 0.5 ACWR floor). Golden stamp-only (baseline never
  reflows); KSV 1.50.0→**1.52.0**. **Backlog (Simon's/deferred):** a form-specific deload reason string
  (Art 14); per-day (not week-level) D9 granularity; TRIMP-scale heterogeneity within `dl`; readout
  fidelity (per-date restHr, HR-quality→confidence).
  **AI integration (asked 2026-07-21):** production AI = a server-side Supabase Edge Function
  (`ai-render`) with an `ANTHROPIC_API_KEY` secret (pay-per-token) — the Max plan is for interactive
  dev use, not embedding into the app for end users. Prototype on a little API credit (+ prompt
  caching/Batch), keep `AI_ENABLED=false` in prod, flip to an API key at go-live. Migration runbook:
  `supabase/SECURITY-DEPLOY.md` (write migration + ledger row → staging `db push` → rls-harness → prod
  `db push` → deploy Edge Functions separately → relink staging) — Simon applies to prod.
- **Phase 3 — full sport/match ingestion boundary (DAAS §2.1.5). DESIGN SPEC authored**
  (`docs/superpowers/specs/2026-07-20-phase3-sport-match-ingestion-design.md`). Not built — the
  build is **Supabase schema migrations + RLS** (Simon applies to prod; RLS harness gates). Reuses
  the wearable-ACL pattern + the live M5 owner-private substrate; External Load Observation
  (GPS/top-speed/distance/sprints) + Match Performance (minutes/availability/KPIs); manual/file
  first, vendor GPS-vests later; coach sees derived-roll-up only (Arts 11/22).
- **Phase 4 — AI full-picture (Stage 6/AIGAS). DESIGN NOTE authored**
  (`docs/superpowers/specs/2026-07-20-phase4-ai-full-picture-note.md`). Not started — a dependency,
  not just a deferral: downstream of Phase 3's data + gated on Simon's `AI_ENABLED` go-live (open
  queue #3). AIGAS C5 grounding surface + the three governed routes; never gates/replaces the engine.

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

  **2026-07-16 — M6 BUILD SUB-PHASES COMPLETE (a/b/c/e/f all merged). Decision Engine V2 IS the engine.**
  - (a) governance sweep: 10 mechanical rows merged (#201–#208; KSV 1.35→1.43, every move stamp-only).
    Every plan-STEERING code literal is now governed knowledge (C3 met).
  - (b) allocator re-seat: allocator.js DELETED — split byte-identically into M-DOSE (dose/dose.js),
    M-SCHED (schedule/structure.js), M-SESS (session/sessionBuilder.js) (#198–#200).
  - (c) D6 Strategy (#211) + D8 WeeklyObjective (#212) typed objects — the Stage-7 endurance
    prerequisite. PARALLEL v0 (steer nothing yet; byte-identical). D8 consumes the dormant SKB
    `microcycles` section.
  - (e) wearable adapter (#213): one honest typed seam (adaptWearableReading; measured vs
    vendor-derived vs subjective — TR-15 / Art 16). Byte-identical.
  - (f) polish (#214): TR-18 clock default removed + stale comments; most TR-16 "rot" proved live/
    intentional/already-clean. Also THIS SESSION: fixed the CI engine gate (#193) — it had never run.
  - **REMAINING = Simon's calls only:** the science/provenance review packet (#209 — sweep rows
    2/8/13 + rows 4/5 + ballistic/olympic contraindication vocab); 🔒 10 endurance trigger (Stage 7).
    No mechanical sub-phase remains for autonomous pickup.
  - **PROVENANCE / science review: PARKED (Simon, 2026-07-16), tooled + started.** Harness:
    `npm run provenance:review -w @performance-os/engine [YYYY-MM-DD]` (read-only; A safety → B
    modifiers → C provenance rows 2/8/13 → D staleness). **DONE:** closure §3 ROW 4 shape upgrade —
    all 20 high_risk referral-gate flags carry machine-readable `referral` provenance (basis +
    confidence:'high' + source:null + needsCitation:true), byte-identical (KSV 1.47.0). **PENDING
    (Simon/clinician, no autonomous pickup — do NOT fabricate citations):** the 20 referral SOURCES
    (fill `referral.source`, needsCitation:false → harness flips [PENDING]→[✓]); the ballistic/olympic
    contraindication clearances (hang_clean/power_clean/push_press/bounding_a_skip × injured regions);
    row 5 femaleRepBump + age modifier; rows 2/8/13 per-entry provenance. Resume: run the harness, get
    Simon's calls table-by-table, apply as governed stamp-only changes.
  - **FORCE-VELOCITY selection: PARKED**, mechanism merged (#217), flag reachable, audit reproducible.
    Harness `npm run fv:review`. See `docs/design/m6/FV-SELECTION-PARKED.md` (validate seed fv tags → flip).
  - **D6 flip: ruled OUT** (redundant with quality-tag selection — `docs/design/m6/D6-FLIP-DESIGN.md`).
    **D8 flip: blocked** on the fixture-input pipeline (Stage-5 coach schedule → per-player plan; not
    built). **Force-velocity-aware selection** — the real refinement the D6 analysis surfaced — STEP 1
    (mechanism, flag-OFF, byte-identical) MERGED (#217); the FLIP is **PARKED pending a force-velocity
    science review** (`docs/design/m6/FV-SELECTION-PARKED.md`): the flip audit found 5/15 archetypes
    move but the swaps (e.g. kb_swing→sled_push for explosive work) rest on SEED force-velocity tags —
    validate the tags first, then flip with a scoped audited re-baseline. Flag reachable via
    `generatePlan(p, {forceVelocityAware:true})` (plumbing byte-identical).

  **2026-07-16 (cont.) — M6 in flight: 🔒 8/9/10 all ruled; re-seat DONE; governance sweep mostly done.**
  - **🔒 8/9/10 RULED** (docs/design/m6/RULING-8/9/10). **M6 sub-phase (b) — the allocator re-seat —
    COMPLETE + merged:** allocator.js no longer exists; split byte-identically into M-DOSE
    (`dose/dose.js` #198), M-SCHED (`schedule/structure.js` #199), M-SESS (`session/sessionBuilder.js`
    #200). Every extraction stamp/byte-verified; goldens never moved.
  - **M6 sub-phase (a) — governance sweep: the 10 mechanical rows DONE + merged** (#201–#208; KSV
    1.35.0 → 1.43.0, every move stamp-only, goldens byte-identical). Every plan-STEERING code literal
    is now governed knowledge (C3 met). **Remaining rows are NOT mechanical — routed to you:**
    `docs/design/m6/GOVERNANCE-SWEEP-STATUS.md` — rows 2/8/13 (per-entry provenance authoring, science-
    adjacent) + rows 4/5 + the ballistic/olympic contraindication vocab (always your science calls).
  - **Remaining M6:** sub-phases (c) D6/D8 typed objects, (d) age/sex modifiers (🔒 science, row 5),
    (e) wearable adapter, (f) polish/dead-scaffolding. None re-open a ruled 🔒.

  **⏳ WHAT'S NEXT (all M6 locks now ruled — the road is BUILD work + standing items):**
  1. **M6 sub-phase (b) — the allocator re-seat — is UNBLOCKED to build** (🔒 9 ruled). Say go and
     I author the re-seat design spec + execute it as byte-identity-gated PRs (the FIRST one, M-DOSE,
     is yours to review/merge to validate the harness). This is the highest-leverage next build.
  2. Standing: I5 flag→default (safety); the ballistic/olympic contraindication science review;
     RLS_STAGING CI secrets (arms the now-valid rls-harness job); Edge Function deploys (queue #4).

  ✅ **ALL THREE M6 LOCKS RULED 2026-07-16** (Simon delegated each):
  - **🔒 8** — `docs/design/m6/RULING-8-functional-identity.md`: functional fitness gets an HONEST
    LABEL now (real GPP module defers to Stage 7); equipment-forced discipline demotion must be
    SURFACED, never silent.
  - **🔒 9** — `docs/design/m6/RULING-9-allocator-reseat.md`: extract **M-DOSE → M-SCHED → M-SESS**
    (call-graph leaves first); byte-identity per commit (now CI-enforced post-#193), pure moves only,
    KSV unchanged, contract-proven-with-fixtures; first extraction is Simon's review.
  - **🔒 10** — `docs/design/m6/RULING-10-endurance-trigger.md`: Stage-7 endurance opens on a
    CONJUNCTION (learning loop proven on real data + M6 complete incl. D6/D8 + gym product
    commercially validated + an endurance design/science review ratified first), not a date. As of
    now conditions fail (loop inert, M6 unbuilt) → not near; M6 only NAMES the seam.
  2. Standing: I5 flag→default (safety); the ballistic/olympic contraindication science review;
     RLS_STAGING CI secrets (arms the rls-harness job — now valid, currently skipped); Edge
     Function deploys (queue #4); the taper/fixtures calendar signals (M6).

- **🎉 M5-L2 LIVE ON PROD (2026-07-16, #194 merged, deploy green).** The D16 LEARN verb is closed
  end to end: on block close the app materialises a recovery observation, appends it to the live
  append-only owner-private block_outcomes substrate, reads a bounded window, runs the pure
  promotion policy, and lands the result. **The learning loop is real** — but INERT for every
  athlete until they accrue ≥3 real blocks of recovery evidence AND both gates pass (additive-first:
  no existing plan changed on deploy; offline-safe; the first behaviour change for anyone is an
  earned promotion). Phase 3 milestone M5 (measure → learn) is COMPLETE. Next up the roadmap: M6
  (structure & breadth — all 🔒 8/9/10, Simon's).

- **2026-07-16 (cont.) — M5-L1 + M5-L2 MERGED/BUILT; CI gate restored.**
  - **#191 (M5-L1) + #192 (M5-L2 design) MERGED** (Simon).
  - **⚠ CI WAS SILENTLY BROKEN — now fixed (#193, merged).** `test.yml`'s rls-harness job used
    `if: ${{ secrets.X != '' }}` at JOB level, which is INVALID (secrets aren't available in a
    job-level `if:`) — GitHub rejected the whole workflow at 0s, so the engine gate (npm test +
    test:engine + lint) + snapshot-guard NEVER RAN since the file was added. Every "CI-green" this
    month was local-only. Fixed by gating the harness at STEP level. The gate now runs on every PR.
  - **M5-L2 BUILT — PR #194 (engine+app), awaiting your merge.** Closes the LEARN verb end to end:
    deriveRecoveryObservation (pure materialiser, ≈1.0 vs own baseline) → appendBlockOutcome (live,
    append-only, owner-private) → readBlockOutcomes (bounded) → promoteFromOutcomes → applyPromotionToModel
    (§5 landing; demotion resets to population; OFFLINE ABSTAINS, never demotes). Goldens byte-identical.
    **A build review caught a BLOCKER** — the schema-default population prior was being read as
    "learned" by the policy's wasLearned (existence-not-source), re-arming the D7 steer off ONE block
    (TR-05 through the integration). Fixed at both layers (policy hardened to require source==='learned';
    app passes {tier:'learned'} only when genuinely learned) + 2 new guard tests. 205/205 + 19/19, CI green.

- **Overnight autonomous run (2026-07-16). 🔒 7 ruled → M5-L1 built → M5-L2 designed.**
  - **🔒 7 RULED (Simon: "go with your recommendations").** Twice-gated promotion (≥3 blocks +
    confidence floor; last-block-predictive), ~15% shrinkage widening to 30%, deload-rhythm the
    ONLY armed lever, fast asymmetric demotion. Recorded in `docs/design/m5-learning/PROMOTION-POLICY.md`.
  - **M5-L1 BUILT — PR #191 (the LEARN verb, engine).** Pure `promoteFromOutcomes`
    (packages/engine/.../learning/), the exact ruled gates, anti-circular Gate B, provenance-stamped.
    204/204 + 17/17 + lint clean. **A pre-PR adversarial review caught a real live defect** the
    goldens couldn't see: the schema-default `recoveryRate:{value:1,source:'population'}` was arming
    the D7 deload steer for *every real onboarded user* off a population default with zero learning
    (no golden carries an athlete_model, so it was invisible — the first report falsely read TR-05
    as confirmed). **Fixed:** the steer now arms ONLY on `source==='learned'`; a new schema-default
    golden archetype pins the population plan byte-identical; a `tr05-source-gate` regression test
    has teeth. Additive-only re-baseline (45→46 archetypes, zero existing moved).
  - **M5-L2 DESIGNED — PR #192 (docs-only, awaiting your approval of the approach).** How the app
    writes `block_outcomes` on block close, reads a bounded window, feeds `promoteFromOutcomes`,
    lands the priors. Gated design-first because it's the first LIVE-substrate write on the app path
    and materialises the evidence the loop learns from. **Rev 2 after its own adversarial review**
    caught that WP-59's `blockOutcome()` does NOT emit the `recoveryRate` shape rev 1 assumed —
    rev 2 specifies a new pure `deriveRecoveryObservation` helper + fixes a demotion-drop dosing-
    safety hole. No 🔒 (coaching ruled at 🔒 7); §7 lists the engineering calls to confirm.

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
