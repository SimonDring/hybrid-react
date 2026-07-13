# THE DEVELOPMENT PLAN — from audited platform to Decision Engine V2

**Class: WORKING (T4) · living roadmap-of-record · created 2026-07-13 (adopted when Simon merges its PR)**
**Status of execution lives in HANDOFF.md; this file owns the ORDER and the WHY.**

---

## 1. What this plan is

The plan of record that composes the four bodies of work built 2026-07-09 →
2026-07-11 into one executable programme. Its adoption **lifts the HOLD** on
the engine-audit backlog (HANDOFF open-queue item 0).

**The four inputs:**

| Input | Where | What it contributes |
|---|---|---|
| 1. Governance sprint | `docs/reviews/2026-07-09-*` | Platform-wide risk registers, tech-debt ledger, the strategic roadmap whose Immediate tier is already executed |
| 2. Engine forensic audit | `docs/reviews/2026-07-11-engine-audit-01…10` | The verified as-built map, G1–G22 gaps, ranked P0–P3 backlog, DRAFT migration waves A–F |
| 3. Governance forensic audit | `docs/reviews/2026-07-11-governance-audit-00…09` | The world-class benchmark (43 capabilities), 92-finding register, amendment queue AQ-1…9 + ND-1 |
| 4. V2 design sprint (parked) | branch `engine-v2-design-2026-07-11` (spec + 16-task plan committed, unexecuted) | The method for designing Decision Engine V2 — first-principles, reconciled against governance |

**The destination (Simon, 2026-07-13):** Decision Engine V2 becomes THE
engine; the legacy volume-first programming path is completely removed; the
platform is best-in-class at both of its products — elite science-based
programming, and world-class analysis of the athlete (gym, recovery,
on-pitch).

**Two sequencing decisions (Simon, 2026-07-13):**
1. **Parallel tracks** — the Wave A athlete-safety fixes start immediately
   alongside the governance work; governance does not block safety.
2. **Re-scope V2 before executing** — the parked V2 design sprint is updated
   to absorb the governance-audit findings before its 16 tasks run.

## 2. The shape at a glance

```
PHASE 0  (now)            Track A: Wave A engine fixes  ∥  Track B: amendment-pipeline fixes
PHASE 1  (next)           The amendment batch (AQ-1…9) + commission ND-1 (Data & Analytics Spec)
PHASE 2  (then)           V2 design re-scope → execute the 16-task authoring sprint → ratify blueprint
PHASE 3  (the build)      V2 migration M0…M6 — progression, ONE selection engine (legacy fill DELETED),
                          measured diagnosis, validation that disposes, substrate & learning
PHASE 4  (second product) Data & Analytics build → Team analytics → AI go-live → Stage 7 endurance
```

Each phase runs as one or more normal sprints (brainstorm → spec → plan →
subagent execution → review → PR) and is independently valuable. No phase
starts before its gate (§8) is met, but phases 0A and 0B run concurrently.

## 3. Phase 0 — two parallel tracks (days)

### Track A — Wave A: stop the bleeding (engine audit 10, Wave A)

The six P0 defects shipping to real athletes now, plus the pending privacy
apply. All are days-scale, mostly autonomous, golden-master gated:

- **P0-1** style-band fallthrough — all three build disciplines silently run
  the *functional* volume band (TR-01); key the tables on discipline.
- **P0-2** injury edge cases — empty/hollow rehab sessions visible to their
  own validators; honest banners; no phantom volume (TR-04/SR-03).
- **P0-3** injury-veto enforcement, landed behind a flag (I5 remains ⚠ Simon).
- **P0-5** legacy-cohort rescue — triathlon, zero-gap run/cycle, code-less GAA
  moved onto the diagnosis-first path (B1/G6). *This begins the legacy
  removal; the fill itself dies in Phase 3.*
- **P0-6** SKB quality-projection mapping bug + `droppedDemands` honesty
  ledger (SR-05/B3).
- **P0-7** plan-memo staleness — signature includes sport/game-dates/model
  (TR-06).
- **P1-10** apply `20260712_player_status_membership_scope.sql` to STAGING →
  RLS harness (7 F3 cases) → prod, per `supabase/SECURITY-DEPLOY.md`.

### Track B — repair the amendment pipeline (governance audit GA-701/702/703)

Living-document edits only (no frozen doc touched), and the register cannot
land legitimately without them:

- **GA-702** give the amendment queue a real home — a WORKING (T4) register
  file, replacing the "queue inside an uneditable REVIEW" contradiction.
- **GA-703** define the ratification / T2-entry path (how AIGAS — and later
  ND-1 — formally becomes canonical).
- **GA-701** define the batch-amendment protocol (one reconciled batch,
  whole-set consistency, single version bump).

## 4. Phase 1 — the amendment batch + commissioning the second product

One reconciled batch through the Phase-0B pipeline. **Simon is the steward of
every item** (frozen docs change only by his hand on the ratify step). The
queue-ready entries are in governance audit 09 §3:

| Item | What it does | Why it's in the critical path |
|---|---|---|
| AQ-1 | Constitution: name the second product (the athlete data asset) in the Preamble's purpose | The confirmed root (GA-113) — everything below inherits it |
| AQ-2 | Ontology: Measurement & Analysis entity family + the analysis structure | V2's vocabulary for tests, match data, insights (GA-203/205–209) |
| AQ-3 | EDS: the analysis decision family | The engine decision that reads athlete data and decides what it means (GA-417) |
| AQ-4 | EDS + Ontology extension clauses | Lets the catalogue/ontology grow additively — resolves V2's `V2-P` naming workaround (GA-204/419) |
| AQ-5 | KA + EDS + TAS: derived-data doctrine clarification | Unblocks the longitudinal history store (GA-802 — the set's one PRECLUDES) |
| AQ-6 | Constitution Title III: developmental-stage duty of care | Constitutionally silent; bites at the Team stage we are in (GA-107) |
| AQ-7 | Constitution Title III: athlete data ownership & consent | Same (GA-109) |
| AQ-8 | Ratify AIGAS | Ends the designate limbo before Stage 6 (GA-610) |
| AQ-9 | TAS: restore the Security & Privacy section + fix §-numbering | Verified structural defect in a frozen doc (GA-509) |
| **ND-1** | **Commission the Data & Analytics Architecture Specification** — a new governing document, peer to the EDS, entering T2 via the GA-703 path | The second product's missing owner; its scope statement is benchmark P2 + audit 08 §4 |

ND-1's authoring is a full sprint of its own (it is to the data product what
the EDS is to the engine) and can begin as soon as AQ-1/AQ-2 direction is
settled — it need not wait for the whole batch to ratify.

## 5. Phase 2 — Decision Engine V2 design (re-scope, then execute)

1. **Re-scope** the parked spec/plan (branch `engine-v2-design-2026-07-11`)
   against the amended governance, applying audit 09 §5's premise changes:
   the pipeline gains the analysis decision family (AQ-3) instead of ad-hoc
   `V2-P` stages; `04-KNOWLEDGE-OWNERSHIP-MAP` maps data-side inputs to ND-1's
   domains; `06-CONSTRAINT-ENGINE`/`03-PERFORMANCE-MODEL` consume the new
   measurement vocabulary (AQ-2); the Amendment Register deliverable now
   *reconciles against the amended set* rather than queueing what Phase 1
   already landed.
2. **Execute** the 16-task authoring sprint → the 15 deliverables in
   `docs/design/engine-v2/` (architecture, hierarchy, pipeline, performance
   model, knowledge map, session builder, constraint engine, progression,
   explainability, AI boundaries, migration set, validation strategy, atlas).
3. **Ratify the blueprint** (Simon): the V2 set is adopted as the
   implementation blueprint; its migration deliverables (10/11/12) supersede
   the engine audit's DRAFT waves A–F as the build order.

## 6. Phase 3 — the build: V2 becomes the engine (migration M0…M6)

Implementation of the V2 blueprint as independently-shippable,
golden-master-gated migration phases (final definitions land in V2
deliverable 11; the audited draft order below is the working assumption):

- **M0 — the test net first.** Archetype-matrix extension (armed-D7 athletes,
  injured athletes, measured athletes, each legacy-rescue cohort),
  expected-delta notes on every re-baseline (the TR-01 recurrence guard), an
  engine-own suite (TR-11).
- **M1 — progression becomes real.** Minimum viable progression for
  non-logging athletes (creep + double-progression + programmed ramps —
  SR-01/G9, the audit's most critical scientific finding), behind
  progression-sanity + dose-coherence validators that land first.
- **M2 — ONE selection engine.** The legacy deficit fill is **deleted**, not
  bypassed: after M1 and the P0-5 rescue prove the D11 path serves every
  cohort, the volume-first branch, its scoring economy, and its dead
  scaffolding are removed. Acceptance: **zero cohorts served by volume-first
  selection; the volume ledger survives only as the downstream guardrail**
  (Constitution Art 6). *This is the "completely removing the legacy poor
  programming" milestone.*
- **M3 — measured diagnosis.** Assessments → capability estimators behind the
  same interface (SR-02/G1/G3); athlete-signal confidence made operative
  (SR-04/SR-08); quality-vocabulary expansion paired with measurement.
  Gate: additive-first — no new data ⇒ byte-identical plan.
- **M4 — validation disposes.** Validator build-out toward the EDS §35 suite;
  the report → flag → gate promotion ladder with a false-positive budget;
  the validation report rendered to humans (TR-02/G11; Art 19). Coach
  override v1 through the same seam (proves the AI seam with a human).
- **M5 — substrate & learning.** The append-only outcomes/history layer +
  bounded sync (TR-03; enabled by AQ-5), D16 prior promotion under policy,
  honest D7 gating — the one substrate that unlocks learning, team trends,
  coach evidence, and the AI track record (G13/G18/G21).
- **M6 — structure & breadth.** The allocator monolith re-seated along the
  D11/D12/D13 boundaries (byte-identity per extraction), constants and
  sport-facts moved onto the governed knowledge surface, age/sex modifiers as
  knowledge entries, D6 strategy + D8 microcycle objects.

Throughout: the migration invariants from engine audit 10 §1 are binding —
the pure core stays pure; never re-seat and change behaviour at once; every
phase ships athlete value on its own; the 🔒 Simon decision points (audit 10
§5) pause where marked.

## 7. Phase 4 — the second product, then the frontier

Built on ND-1 (governance) + M5 (substrate):

1. **Data & Analytics build** — testing batteries as data assets (P2.1),
   the longitudinal athlete model, analytics read-models and reporting
   (athlete-facing and coach-facing), benchmarking/norms — per ND-1.
2. **Team analytics** — squad readiness/load views from derived signals only
   (raw vitals never coach-readable — non-negotiable, Constitution Art 11);
   coach fixture list → per-player plan constraints (the Stage 5 seam).
3. **AI go-live** — AIGAS ratified (AQ-8), per-capability eval harness built,
   `AI_ENABLED` is Simon's switch (Stage 6).
4. **Stage 7** — endurance programming through the AQ-4 extension clause +
   V2's session vocabulary; React Native/HealthKit per the roadmap.

## 8. Gates between phases

| Gate | Condition |
|---|---|
| 0 → 1 | Amendment pipeline fixed (GA-701/702/703 merged); Wave A may still be finishing — it does not block |
| 1 → 2 | AQ-1/AQ-2/AQ-3/AQ-4 direction ratified by Simon (the vocabulary V2 designs against); ND-1 commissioned |
| 2 → 3 | V2 blueprint ratified by Simon; M-phase definitions final in V2 deliverable 11 |
| 3 internal | Each M-phase: green suite, golden-master audit, its own acceptance criteria met |
| 3 → 4 | M5 substrate live; ND-1 ratified into T2 |
| Always | Merges are Simon's; HIGH-risk re-seats, coaching-philosophy calls, and frozen-set changes PAUSE for him |

## 9. Success criteria (the plan is done when…)

From the engine audit (10 §6), the governance audit (09), and the benchmark:

- Zero cohorts served by volume-first selection; the legacy fill is deleted
  (G6; Simon's headline).
- A non-logging intermediate's week 6 ≠ week 5 in load or reps (G9).
- ≥4 of the reasoning qualities measurable from data the app collects;
  measured athletes get k>1 priorities (G1/G3).
- ≥12 EDS §35 validators exist; injury + lawfulness classes enforce; the
  validation report renders (G11).
- Block outcomes persist append-only; ≥1 prior promoted under policy and
  consumed by a later plan (G13).
- The amendment batch is ratified; ND-1 exists as a T2 peer document; the
  92-finding register's rank-1 set is closed.
- The silent list is empty or rendered; every re-baseline carries an
  expected-delta note (the TR-01 class cannot recur unaudited).
- Every capability the benchmark marks as the two products' core reads
  COVERED on re-audit — the platform is defensibly best-in-class on both.

## 10. Standing invariants (unchanged by anything above)

`generatePlan` stays pure and deterministic · golden master re-baselined only
deliberately, audited key-by-key · muscle volume is the downstream ledger,
never the driver · raw vitals never enter the model or reach a coach · the
SKB is the sole sport source · freeze-on-start — a started session is never
recomputed · the frozen set changes only via the amendment process · no
schema change without a versioned migration · AI proposes, never disposes.
