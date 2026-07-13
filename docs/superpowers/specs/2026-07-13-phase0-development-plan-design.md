# Phase 0 of THE DEVELOPMENT PLAN — Design Spec

**Status: DESIGN SPEC (immutable sprint record once merged) · 2026-07-13**
**Authority: executes `docs/DEVELOPMENT-PLAN.md` §3 (adopted 2026-07-13, PR #171). The
HOLD is lifted; this is the first work under the plan.**

## 1. Scope — two parallel tracks, two PRs

**Track B — repair the amendment pipeline** (docs-only, lands first):
- **GA-702**: create the amendment queue's real home — `docs/AMENDMENT-QUEUE.md`,
  class WORKING (T4). It POINTS to the evidence (C1–C5 in the 2026-07-09
  documentation audit §2; AQ-1…9 + ND-1 in governance audit 09 §3) and tracks
  each item's lifecycle (QUEUED → BATCHED → RATIFIED/REJECTED); it never
  restates the candidates' content (one owner per concept).
- **GA-703**: add to `docs/DOCUMENTATION-GOVERNANCE.md` (living) the
  ratification / T2-entry path: how a designate document (AIGAS now, ND-1
  later) formally becomes canonical — proposal → adversarial panel review →
  Simon ratifies → index/status flip, reconciled in one change.
- **GA-701**: add the batch-amendment protocol to the same doc: a batch is
  proposed as one written set, whole-frozen-set consistency review, single
  dated version bump per document, Simon ratifies the batch.
- Register + governance edits cross-reference; DOCUMENTATION-INDEX gains the
  register at T4.

**Track A — Wave A: stop the bleeding** (engine/app code; one PR, Simon merges):
Six fixes from the engine-audit backlog (`docs/reviews/2026-07-11-engine-audit-09`),
detail owned by the audit deliverables cited per task in the plan:
- **P0-6** `strengthEndurance` identity-mapping bug + `droppedDemands` honesty
  ledger (SR-05/B3).
- **P0-7** plan-memo staleness — `profileSignature` gains sport_code /
  first+last game dates / athlete_model (TR-06).
- **P0-1** style-band fallthrough — volume tables keyed on discipline;
  build-archetype goldens re-baselined DELIBERATELY with an expected-delta
  note (TR-01).
- **P0-2** injury honesty — rehab sessions visible to validators; no empty
  rehab sessions (honest "unservable" surface, Art 15); no phantom volume
  from hidden struck items (TR-04/SR-03).
- **P0-3** injury-veto enforcement as a D14 gate **behind a flag, default
  OFF** (promotion to default is Simon's I5 call — out of scope here).
- **P0-5** legacy-cohort rescue — triathlon, zero-gap run/cycle, code-less
  GAA moved onto the diagnosis-first D11 path; their goldens re-baselined
  deliberately (B1/G6). Biggest item; runs last.
- **P1-10 ⚠ PAUSES for Simon**: applying
  `20260712_player_status_membership_scope.sql` to STAGING → RLS harness →
  prod touches live infrastructure (deploys are consequential). The sprint
  prepares the exact runbook commands and stops.

## 2. Non-negotiables

Golden master: UPDATE=1 only deliberate, audited key-by-key, archetype-scoped,
expected-delta note per re-baseline (the TR-01 recurrence guard). Engine stays
pure. Sports byte-identical except where a task's scope says otherwise
(P0-5's named cohorts; P0-1's build archetypes). `npm test` + `npm run lint`
green before every commit. No frozen doc touched. Simon merges both PRs.

## 3. Out of scope

Everything Phase 1+ (amendments themselves, ND-1, V2 re-scope); I5 flag
promotion; the 5 missing rehab regions (Simon science review); any engine
restructure (that's M6).
