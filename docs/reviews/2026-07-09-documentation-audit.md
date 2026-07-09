# Documentation Audit — inventory, classification, conflict report

**Date:** 2026-07-09 · **Scope:** every documentation file in the repository (~150 files)
· **Produced by:** the autonomous governance sprint (Phase 0) · **Status:** REVIEW (point-in-time)

This is the evidence record behind the documentation restructure of 2026-07-09:
the full inventory, a classification for every document, and the consolidated
conflict report. The *policy* that came out of it lives in
[`docs/DOCUMENTATION-GOVERNANCE.md`](../DOCUMENTATION-GOVERNANCE.md); the *map*
lives in [`docs/DOCUMENTATION-INDEX.md`](../DOCUMENTATION-INDEX.md).

Classification vocabulary (defined in the governance doc):

- **CANONICAL** — the single source of truth for a concept; actively governs.
- **SUPPORTING** — accurate reference material that supports a canonical doc.
- **WORKING** — a living document tracking in-flight work; updated continuously.
- **REVIEW** — a dated, point-in-time audit/assessment kept as evidence; never updated.
- **ARCHIVE** — fully superseded; historical record only.

---

## 1. Classification of every document

### 1.1 The constitutional tier (frozen v1.0, 2026-07-01)

| Document | Class | Reasoning |
|---|---|---|
| `docs/foundation/CONSTITUTION.md` | **CANONICAL** | The supreme governing document; 20 Articles; ultimate tie-breaker. Frozen. |
| `docs/foundation/DECISION-ONTOLOGY.md` | **CANONICAL** | The canonical vocabulary (~40 entities, 7 families). Frozen. |
| `docs/foundation/KNOWLEDGE-ARCHITECTURE.md` | **CANONICAL** | The knowledge/data model (8 kinds, 12 domains). Frozen. |
| `docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md` | **CANONICAL** | The governing engine spec (P1–P15, L1–L15, D1–D16). Frozen. Note: self-labels "Draft v1.0" — freeze status is recorded out-of-band; stamping it is a formal amendment candidate. |
| `docs/architecture/TAS.md` | **CANONICAL** | The governing technical blueprint (L0–L6 layers, six-call engine API, T1–T23 risks). Frozen. |
| `docs/architecture/AIGAS.md` | **CANONICAL-designate** | v1.0 draft, written to canonical standard, traces cleanly to the frozen set. Pending formal ratification (the independent panel pass recommended by AIGAS-REVIEW has not run). Treated as governing for all AI work in the meantime. |
| `docs/foundation/PANEL-REVIEW.md` | **REVIEW** | Completed provenance for the foundation set; its revisions are folded in. Referenced by frozen docs → stays in place. Its "no term drift" verdict predates TAS/AIGAS and must not be cited as covering them. |
| `docs/foundation/README.md` | **SUPPORTING** | Navigational index. Updated this sprint: its set table previously omitted TAS and AIGAS. |
| `docs/engine/README.md` | **SUPPORTING** | Navigational index for the engine set. Updated this sprint: docs 06–08 were previously unlisted (ungoverned by the set's own map). |
| `docs/architecture/README.md` | **SUPPORTING** | Navigational index. Updated this sprint: previously indexed only TAS + AIGAS, omitting 7 of the folder's documents. |

### 1.2 Engine documentation (docs/engine/ 01–08 + evaluation)

| Document | Class | Reasoning |
|---|---|---|
| `01-PANEL-REVIEW.md` (2026-06-23) | **SUPPORTING** (evidence) / historical (architecture half) | The evidence citation-base the EDS's laws lean on — still authoritative. Its present-tense architecture claims (engine in `apps/mobile`, ACWR a live hard gate, `packages/engine` empty) are historical; read via its banner. Linked from the frozen EDS → stays in place. |
| `02-REFACTOR-ROADMAP.md` (2026-06-23) | **ARCHIVE-in-place** | Its migration (phases 0–5) is complete and its target module shape (`GoalModule`/`SportModule` registries) was superseded by the EDS's D1–D16 architecture. Its frozen `PlanOutput` contract (§9) remains load-bearing. Linked from the frozen EDS → cannot move; banner added. |
| `03-SPORT-KNOWLEDGE-BASE.md` (2026-06-28) | **CANONICAL** (schema) | The 21-section `SportProfile` contract the EDS adopts as *the* Sport Model. Its dated Status/positioning paragraphs ("not merged yet, nothing consumes it"; 5 profiles) are superseded — the SKB is now the *sole* sport source (PR #160), 11 profiles, all season-phased. Banner added. |
| `04-PHYSIOLOGICAL-FRAMEWORK.md` (2026-06-28) | **CANONICAL** | The metrics model (raw schema → baselines → 9 indices → decision bands). Path-accurate, consistent with current code and the EDS. The cleanest document in the set. |
| `05-INDEX-LAYER-FOLLOWUPS.md` (2026-06-29) | **WORKING** | Live spec for the deferred index-layer pieces; Spec B (readiness-integrator re-weighting) remains the open behaviour-changing step. |
| `06-SEED-EVIDENCE-REVIEW.md` | **REVIEW** | Provenance for the C1–C14 seed-data corrections; mostly dispositioned by its own 2026-07-05 status line. |
| `07-SKB-PROFILE-REVIEW.md` | **REVIEW** | SKB conformance audit; the triathlon-binding issue it noted was fixed by 08's T1a + PR #161. |
| `08-SKB-CONSUMPTION-AND-SEASON-AUDIT.md` | **REVIEW** | The audit that led to PRs #160/#161 and season-phasing. Headline findings ("SKB ~95% dormant", triathlon collapse, season = volume dial) all resolved; kept as the record of why. Residual live content: the T3 backlog tail. |
| `docs/decision-engine-evaluation.md` (2026-06-21) | **REVIEW** | The founding F1–F10 evaluation and golden-master seed. Findings closed; paths pre-monorepo. Linked from the frozen EDS → stays in place; banner added. |

### 1.3 Architecture documentation (docs/architecture/, non-frozen)

| Document | Class | Reasoning |
|---|---|---|
| `MIGRATION-BLUEPRINT.md` (2026-07-01) | **SUPPORTING** | The D1–D16 contracts, decision-ownership rules, and target module map remain the actively-cited design reference. Its sprint backlog (Parts 7–8) is essentially executed (only D16 prior promotion and endurance programming remain, both deliberately deferred); Parts 4–5 are historical. Banner added noting backlog completion. |
| `ATHLETE-MODEL.md` | **SUPPORTING** | Accurate implementation reference for the athlete/performance/diagnosis layer. Its "which cohorts steer" statements (§5.4/§5.7/§12) predated the build flip — patched this sprint. |
| `D7-BLOCK-OBJECTIVE-SPEC.md` | **WORKING** | Live design spec; the gated-dormant slice shipped (#147/#151/#154) but its §9 open questions and the D6 strategy decision still gate broad activation. Header updated this sprint (previously said "nothing built"). |
| `REASSESSMENT-2026-07-05.md` | **REVIEW** | The WP-38…WP-61 ledger other docs cite by number. Verdicts and "PAUSE" flags overtaken (WP-49 shipped). Referenced from test-file comments → stays in place; banner added. |
| `AIGAS-REVIEW-2026-07-06.md` | **REVIEW** | Ratification evidence for AIGAS; verdict ("ALIGNED — recommend ratification") stands; the independent panel pass it recommends is still open. |
| `BASELINE-ARCHITECTURE-ASSESSMENT.md` (2026-07-01) | **ARCHIVE** → moved to `docs/archive/` | Every headline claim superseded (npm test fixed, SKB now sole source, diagnosis live, build flipped, all sports authored). |
| `PHASE3-ARCHITECTURAL-AUDIT.md` (2026-07-03) | **ARCHIVE** → moved to `docs/archive/` | The "split-brain era" audit; the split it describes was dissolved by the build flip + PR #160. |
| `STATE-OF-THE-APP-2026-07-07.md` | **REVIEW** → moved to `docs/reviews/` | Plain-English brief overtaken within hours (build flip deployed same day); KSV/test numbers stale. |

### 1.4 The architecture-atlas suite (`docs/architecture-atlas/`, 2026-07-06, previously untracked)

The suite was authored the day before the build flip; its central thesis ("two
engines; ~90% of users on the legacy volume-first path") was inverted the next
day. Disposition (executed in Phase 1 of this sprint): refresh the stale
engine-thesis sections, add dated banners, and commit as the Repository Atlas.

| Document | Class | Notes |
|---|---|---|
| `README.md` | SUPPORTING | Honest self-positioning; needed a dated banner. |
| `01-ARCHITECTURE-ATLAS.md` | SUPPORTING (after refresh) | Highest-quality founder-facing map; §0/§4 carried the invalidated thesis. |
| `02-ARCHITECTURE-DECISION-REGISTER.md` | SUPPORTING (near-canonical for decision rationale) | Most durable, least duplicative; ADR-02/ADR-04 needed "Resolved: shipped" stamps. |
| `03-PLATFORM-DATA-DICTIONARY.md` | SUPPORTING | Least stale; only cohort-scoping lines needed patching; more current than `docs/SCHEMA.md`. |
| `04-DEPENDENCY-INFORMATION-FLOW-MAP.md` | SUPPORTING (after refresh) | Flow diagrams durable; the cohort-gate node and coupling list #2–3 were stale. |
| `05-PLATFORM-HEALTH-REPORT.md` | REVIEW | Headline finding (H1, "two engines") closed; remaining findings re-verified in this sprint's Phase 1 health assessment rather than patched in place. |

### 1.5 Product, strategy, setup, security, schema

| Document | Class | Reasoning |
|---|---|---|
| `docs/strategy/VISION.md` | **CANONICAL** (product direction) | Evergreen North Star. "Not built yet" asides about the team package patched this sprint. |
| `docs/product/TEAM-ARCHITECTURE.md` | **SUPPORTING** (design canon for team isolation) | The privacy/RLS blueprint that shipped. Its "STATUS: PLANNED — not built" banner was false — patched this sprint. |
| `docs/product/TEAM-NEXT-STEPS.md` | **WORKING** | The most current team-status tracker (join-code founding, live dashboard, schedule→constraints next). |
| `docs/SCHEMA.md` | **SUPPORTING (stale — flagged)** | Documents 12 tables and the pre-team, invite-gated model; reality is 19 tables, open signup, team spine. Banner added; full reconcile is a roadmap item (the atlas Data Dictionary is currently the more accurate human-readable reference). |
| `docs/SECURITY-AUDIT.md` | **REVIEW** (June body) + **WORKING** (S1–S15 addendum) | The authoritative security trail, paired with `supabase/SECURITY-DEPLOY.md`. |
| `docs/setup/sign-in-with-apple.md` | **SUPPORTING** | Accurate deep guide; conflicts with OAUTH-SETUP on the recommended Apple Services ID (see conflict C9). |

### 1.6 Operational docs (supabase/, READMEs, roots)

| Document | Class | Reasoning |
|---|---|---|
| `CLAUDE.md` | **CANONICAL** (operational handbook) | Rewritten this sprint (Step 0.9): now carries documentation precedence, philosophies, and session protocol. |
| `HANDOFF.md` | **WORKING** | Split this sprint: current state stays; the 1,800-line history moved verbatim to `docs/archive/HANDOFF-HISTORY-2026-06--2026-07.md`. |
| `README.md` (root) | **SUPPORTING** | Was materially stale (engine "empty placeholder", web "not built") — patched this sprint. |
| `apps/mobile/README.md` | **SUPPORTING** | Was pre-monorepo/Stage-2 framing — patched this sprint. |
| `apps/web/README.md` | **SUPPORTING** | Strong and recent; its "mock data" sections predated the live wiring (PR #123) — patched this sprint. |
| `apps/web/public/images/README.md` | **SUPPORTING** | Current, mechanical, self-contained. |
| `packages/engine/README.md` | **SUPPORTING** (canonical for the package boundary) | Accurate. |
| `packages/shared/README.md` | **SUPPORTING** | Accurate placeholder. |
| `supabase/migrations/README.md` | **CANONICAL** (DB-change discipline) | The migration ledger. Was one entry behind (`20260711_team_scoping.sql`) — row added this sprint. |
| `supabase/SECURITY-DEPLOY.md` | **WORKING** | Live deploy tracker; minor internal S12 double-listing to reconcile on next touch. |
| `supabase/OAUTH-SETUP.md` | **SUPPORTING** | Accurate; overlaps the Apple guide (conflict C9); merge candidate. |
| `docs/superpowers/specs/` (47) + `plans/` (33) | **ARCHIVE-in-place** (policy) | All correspond to shipped work (verified against main). Kept in place — HANDOFF cites exact paths. Policy README added at `docs/superpowers/README.md`. Exception: `2026-07-01-athlete-model-design.md` is cited by CLAUDE.md as the design record for a live subsystem (the living reference is `docs/architecture/ATHLETE-MODEL.md`). |
| `.superpowers/sdd/` | (not repo documentation) | Ephemeral SDD session artifacts; correctly double-gitignored. Local disk hygiene only. |
| `memory/` (repo root) | (not repo documentation) | Gitignored local Claude-memory store, last touched 2026-06-17, superseded by HANDOFF.md + CLAUDE.md. Never committed; no repo action possible or needed. Do not consult it for current state. |

---

## 2. Conflict report

Consolidated from six parallel audits. C1–C5 concern the constitutional tier
(resolution requires formal amendment — recorded, not fixed inline); C6–C12 were
resolvable in living docs and were fixed by this sprint; C13–C15 remain open.

### Constitutional tier (amendment candidates — do NOT fix inline)

- **C1 — Freeze status is out-of-band.** The five frozen docs carry no "FROZEN
  v1.0 (2026-07-01)" marker; the EDS and engine README self-label the EDS
  "Draft v1.0". Freeze status currently lives only in CLAUDE.md/HANDOFF.
  *Candidate amendment:* stamp freeze status + date into each frozen doc's
  status block in one reconciled pass.
- **C2 — "Seven kinds" vs the canonical eight.** TAS §5.2 titles its table "the
  seven kinds of work" and introduces *Optimisation* and *Validation*, which are
  not in the Knowledge Architecture's canonical eight-kind taxonomy (§2).
  Genuine terminology drift between two frozen docs. *Candidate amendment:*
  reconcile TAS §5.2 to the KA taxonomy (or extend the KA deliberately).
- **C3 — Sport-count drift.** EDS §26/§30 say "21 sections × 8 sports"; the
  Knowledge Architecture says 10 authored. Reality (2026-07-09): 11 profiles,
  all season-phased. Both frozen numbers are stale statements of a moving fact.
  *Candidate amendment:* replace hard counts with a pointer to the SKB registry.
- **C4 — EDS rank ambiguity.** The EDS header says it sits "alongside" the
  Ontology and Knowledge Architecture; the foundation README's stack diagram
  places Ontology + KA on a tier *above* the EDS. Rarely bites (the Constitution
  is the tie-breaker and the Ontology governs naming), but the rung is stated
  inconsistently. *Candidate amendment:* state the rung once, identically, in all
  four docs. (The governance doc records the working interpretation:
  Constitution → Ontology + KA → EDS.)
- **C5 — Cosmetic defect in a frozen doc.** EDS §20's notation legend contains a
  mojibake glyph (`�beforewhich = dependencies`). Fix rides with the next formal
  amendment; noted so it isn't "discovered" repeatedly.

Positive findings worth recording so future audits don't chase phantoms: the
D1–D16 numbering is fully consistent across all five frozen docs + AIGAS; the
conflict-resolution order is stated identically in the Constitution and EDS §37;
"quality" vs "adaptation" usage is disciplined and consistent.

### Fixed by this sprint (living docs)

- **C6 — "Not built yet" epidemic.** Root README (engine "empty", web "not
  built"), TEAM-ARCHITECTURE ("STATUS: PLANNED — not built"), VISION (team
  "not built yet"), CLAUDE.md (web "not built yet"), apps/web README ("mock
  data") all described as future things live in production. All patched.
- **C7 — Three overlapping "living" status trackers.** REASSESSMENT,
  STATE-OF-THE-APP, and HANDOFF all claimed living-tracker roles with divergent
  KSV numbers (1.9.0 vs 1.30.0) and divergent build-flip status. Resolved:
  HANDOFF.md is the *single* living tracker (governance rule); the other two are
  banner-stamped REVIEW snapshots.
- **C8 — Stage-numbering incoherence.** STAGE2-GUIDE, the web README, VISION,
  and the Apple guide each used different stage numbers for the same milestones.
  Resolved: CLAUDE.md's roadmap is the canonical stage map; STAGE2-GUIDE archived.
- **C9 — Duplicate/conflicting OAuth guidance.** `supabase/OAUTH-SETUP.md` and
  `docs/setup/sign-in-with-apple.md` overlap and recommend *different* Apple
  Services IDs (`com.simondring.hybridtraining.web` vs
  `com.simondring.performanceos.web`). Cross-reference notes added; full merge is
  a roadmap item. (The live production value is whatever is configured in the
  Apple Developer portal — verify there before touching either doc.)
- **C10 — Unindexed documents.** The engine README omitted docs 06–08 and the
  evaluation; the architecture README omitted 7 of its folder's 11 documents;
  the foundation README's table omitted TAS and AIGAS. All three indexes updated.
- **C11 — Migration ledger one entry behind.** `20260711_team_scoping.sql`
  applied to prod (per SECURITY-DEPLOY) but absent from
  `supabase/migrations/README.md`. Row added.
- **C12 — HANDOFF.md as append-only log.** 1,814 lines / ~59k tokens read by
  every session. Split: current state + open queue stays; history archived
  verbatim.

### Remaining open (roadmap items)

- **C13 — `docs/SCHEMA.md` materially incomplete** (12 of 19 tables; pre-team;
  claims invite-gating removed by migration 004). Needs a full reconcile against
  `supabase/schema.sql` — deliberate work, not a banner.
- **C14 — AIGAS ratification.** Recommended by AIGAS-REVIEW; the independent
  panel pass has not run; AIGAS remains formally a draft.
- **C15 — Product naming drift.** "Hybrid Training" vs "Performance OS" vs repo
  name `hybrid-react` across READMEs, bundle IDs, and package names. A naming
  decision belongs to Simon; recorded in the roadmap.
