# M6 — Structure & Breadth: the final migration phase (PLAN)

`Status: DESIGN PROPOSAL / PLAN — for Simon (🔒 8/9/10 are his calls) · 2026-07-16 · no code`

Governing set: `11-MIGRATION-PHASES.md` §7 (the phase definition), `10-MIGRATION-ARCHITECTURE.md`
§2.2/§2.3 (the module set + the three structural moves), `12-MODULE-DEPENDENCY-DIAGRAM.md`
(the target graph), `04-KNOWLEDGE-OWNERSHIP-MAP.md` §3 (the C3 closure list).
Binding articles: **Constitution Art 17** (knowledge is data, not code — the whole point of the
governance sweep) and **Art 20** (simplicity/byte-identity discipline — a phase that only rearranges
code must prove byte-identity instead of value).

This document is a PLAN, not code. It proposes how M6 is broken into shippable sub-phases and
flags every decision that is Simon's. Nothing here touches the frozen six; nothing here ships until
M2 has settled into audited baselines and Simon signs 🔒 9 before the first extraction.

### §0 How to read this / scope boundary

M6 corresponds to audit 10's Wave F ("structure & breadth") and is the seventh and final phase of the
V2 migration (M0–M6). Backlog IDs (P2-n/P3-n) are audit 09's; module IDs (M-XXX) are `10` §2.2's.
This plan neither reinvents nor overrides `11` §7 — it *breaks §7's single phase into six
independently-shippable sub-phases* with per-sub-phase gates, and homes the tracked in-code leftovers
this migration accumulated (below) into that structure.

**In scope:** the allocator re-seat (structure), the knowledge-governance completion (Art 17), the
D6/D8 objects, the age/sex modifier family, the wearable adapter, and P3 polish. **Out of scope,
named only:** Stage-7 endurance *sessions* themselves (M6 builds the D6/D8 prerequisite, not the
sessions — 🔒 10), and any behaviour change to an existing athlete's plan (behaviour changed in M2/M3;
M6 is byte-identity-disciplined by design).

### At a glance — the six sub-phases

| | Sub-phase | Backlog | Byte-identity posture | 🔒 |
|---|---|---|---|---|
| (a) | Governance sweep — magnitudes → knowledge | P2-10 | Stamp-only KSV moves; goldens byte-identical | science content (d/§4) |
| (b) | Allocator re-seat — M-SESS/M-DOSE/M-SCHED | P2-1 | **Byte-identical golden PER extraction commit** | **🔒 9** |
| (c) | D6 strategy + D8 microcycle objects | P2-2 | Byte-identical for no-fixture cohort; scoped re-baseline on newly-consumed signals | — |
| (d) | Age/sex modifier family | P2-5 | Existing modifier stamp-only; new members scoped + science-gated | age/sex science |
| (e) | Wearable adapter interface | P2-9 | Interface consolidation only — byte-identical | — |
| (f) | P3 polish + dead-scaffolding sweep | P3-1…P3-5 | Proven-dead-first, then delete — byte-identical | — |

Ordering rationale: (a) leads because it is pure knowledge-relocation and *shrinks* the in-code
surface (b) then has to carry across module boundaries. (b) is the HIGH-risk pause and waits on 🔒 9.
(c)–(e) are additive breadth, parallelisable with or after (b). (f) closes out the dead code.

---

## §1 The objective, in plain language

M6 is the **last** migration phase. After it, V2 *is* the engine — there is no further
"migration" left to run.

M6 does two jobs, and — this is the entire safety story — **it does not change what any athlete's
plan looks like.** The earlier phases (M2 progression, M3 measurement, M4 validation) were where
behaviour changed. M6 only re-arranges the *structure* that produced that behaviour and finishes the
*knowledge governance*. Two jobs:

1. **Re-seat the structure the behaviour phases proved.** At the audit pin, one file —
   `packages/engine/src/lib/plan/allocator.js`, 1,253 lines — holds selection, dose surgery,
   scheduling and post-passes all together. Audit 06 (TR-07): *"every construction defect in this
   audit lands there."* M6 splits it along its already-ratified D11/D12/D13 boundaries into three
   modules — **M-SESS** (selection), **M-DOSE** (dose), **M-SCHED** (scheduling) — each behind a
   typed contract. The rule that makes this safe: **byte-identity per extraction** — every extraction
   commit produces a byte-identical golden-master run. A re-seat PR that contains *any* golden delta
   is rejected by definition (10 §4 R1; invariant 7). No behaviour is allowed to ride along.

2. **Complete the knowledge governance (Art 17).** Every remaining coaching *magnitude* still living
   as a code literal at full authority moves onto the governed knowledge surface (the C3 closure list,
   `04` §3). Sports scientists must be able to review every number that steers a plan without reading
   engine code. Each move is a **KSV stamp-only golden move**: the value's *home* changes, its *value*
   does not, so the plan does not change and the golden stays byte-identical.

Plus the **breadth** items that widen the platform without breaking the gym product: the D6 strategy
object and D8 microcycle decision made real (the prerequisite for Stage-7 endurance), the age/sex
modifier family as governed knowledge, the wearable adapter interface with honest naming, and the P3
polish + dead-scaffolding sweep.

**Independently shippable value** (Art 20 / invariant 6): velocity and safety. Construction defects
stop concentrating in one file; every steering magnitude becomes reviewable as knowledge; the
strategy/microcycle objects unlock fixture-congestion coaching for the Team package. Each sub-phase
below ships on its own and is independently revertible.

---

## §2 Entry gate — never re-seat and change behaviour at once

M6 starts only when **both** hold (11 §7 entry gate; 10 §1.1 invariant 7):

- **M2 has settled into audited baselines.** The behaviour changes (progression, the fill deletion)
  are merged and their re-baselines are stable — not in flight. You cannot cleanly prove
  "byte-identical" against a target that is still moving. (M3's measurement work is additive-first and
  already byte-identical for unmeasured cohorts, so it does not block; M2 is the binding predecessor
  because it is the last phase that *moved goldens for existing athletes*.)
- **M4's suite is the independent floor under the re-seat.** M4 built out the validator suite and the
  conflict-order pass; that suite plus M0's archetype matrix and the reflow≡baseline property test are
  what certify a re-seat did not smuggle a behaviour change. Without an independent floor, byte-identity
  of the goldens is necessary but not sufficient.
- **🔒 9 is signed** before the first extraction commit lands (§4).

Diagram 2 edges (`12`): `M2 --"behaviour settles before the re-seat"--> M6` and `M4 --> M6`.

---

## §3 The sub-phases (ordered)

M6 is large; it is broken into six independently-shippable, gate-per-commit steps. The governance
sweep (a) leads because it is pure knowledge-relocation with no structural risk and it *reduces* the
surface the allocator re-seat (b) then has to move (fewer in-code literals to carry across a boundary).
(b) is the standing HIGH-risk pause and does not begin until 🔒 9 is signed. (c)–(e) are additive
breadth that can proceed in parallel with or after (b). (f) is the closing polish.

### (a) The governance sweep — P2-10 · every remaining magnitude onto the knowledge surface

- **Objective.** Close commitment C3: *no coaching magnitude steers a plan from code at full
  authority.* The C3 closure list in `04-KNOWLEDGE-OWNERSHIP-MAP.md` reads **empty** at the end.
  This is the Art 17 job — knowledge is data, separate from reasoning; a sports scientist reviews
  every steering number without opening the engine.
- **What moves.** The 13 rows of the `04` §3 closure list — each a coefficient class relocated to its
  KA domain home with provenance/confidence/`lastReviewed`, or explicitly labelled a **seed** with an
  authority cap (Art 13). Plus the tracked in-code leftovers this migration accumulated, each a row of
  the same sweep:
  - **M3b signal-confidence gate cut-points** — `FULL_AUTHORITY_CONFIDENCE`=0.5 and the recency/
    baseline-maturity gate magnitudes, landed in-code PROVISIONAL (HANDOFF M3b). → KA Domain 7.
  - **M2b `styleObjective` + the `wp61-govern-scoring` SELECTION_SCORING pin** — the fill was deleted
    but these behaviour-neutral dead-knowledge remnants remain (HANDOFF M2b). Governance-sweep them or
    delete them as dead scaffolding (see (f)); the SELECTION_SCORING pin now pins production-dead
    knowledge and should be retired, not merely re-homed.
  - **The M4a id/pattern contraindication vocabulary** — safety-critical knowledge sitting *outside*
    the governed KNOWLEDGE_SET ratchet (HANDOFF M4a caveat 3). This is `04` §3 row 4's sibling and is
    **mandatory-not-seed** (gate-tier under Art 8 requires high-confidence knowledge, Art 13).
  - **The deferred taper (`competition_within_h`) + fixtures (`matches_this_week`) calendar signals** —
    excluded from the M0 reflow-fix rule path pending Simon's call; taper needs a baseline-double-count
    confirm, fixtures need D8 baseline ownership (HANDOFF M0). These land as governed decision-rule
    signals once (d)/(c) give D8 an owner and Simon confirms the taper semantics.
  - Plus the corollaries: wire the `kb.staleEntries` **staleness watchdog** (KV-6), ship the
    **`validate:knowledge`** closure lint over sibling tables (KV-4), and upgrade **structured
    citations** on the comment-provenance band (`04` §3 row 13).
- **Byte-identity / KSV discipline.** Every move is **stamp-only**: the literal's *numeric value* is
  preserved to the last digit; only its *home* changes. Result — the plan is unchanged and the golden
  is byte-identical. Each move bumps KSV (the knowledge-set version) and is committed with an
  expected-delta note reading "no plan delta — knowledge relocation only." Any move that would change
  a plan is out of scope for M6 (that is behaviour, and behaviour changed in M2/M3).
- **Rollback.** By KSV pin (10 §5.4): a bad entry reverts by pinning the prior knowledge-set version,
  never by code surgery.
- **🔒 decision.** None structural — but the **age/sex modifier science** and the **contraindication
  vocab / ballistic-olympic clearedIds science** surface here as content that needs Simon's science
  review (see (d) and §4).

### (b) The allocator re-seat — P2-1 · extract M-SESS / M-DOSE / M-SCHED

- **Objective.** `allocator.js` no longer exists as a concentration. The three structural moves of
  `10` §2.3: selection logic → **M-SESS** (D9/D10/D11 — the one selection engine, C7), dose surgery →
  **M-DOSE** (D12), structuring + post-passes → **M-SCHED** (D13). Each behind a typed
  `{value, confidence, rationale}` contract exercisable with fixtures, no sibling required (§2.1).
- **What moves.** Per `10` §2.2's file map: `lib/session/*` + `lib/plan/selectInterventions.js` +
  `allocator.js` selection body → M-SESS; `allocator.js` dose surgery + `data/doseSchemes.js` +
  `lib/strength/*` → M-DOSE; `lib/plan/scheduler.js` + `despine.js`/`axial.js`/`primers.js` → M-SCHED.
  Note the fill engines (`allocator.js:641–1041`) are **already deleted** at M2b — the re-seat moves
  only the surviving D11 path, which lightens the extraction.
- **Byte-identity / KSV discipline.** **Byte-identity PER EXTRACTION COMMIT** — the whole safety story
  of this sub-phase. Each extraction lands as its own commit with a byte-identical golden run across
  every M0 archetype (armed-D7, injured, measured, each rescued cohort) *and* the reflow≡baseline
  property. A commit with any golden delta is rejected by definition (R1; invariant 7). Extraction
  order and the gate evidence are part of the 🔒 9 plan Simon signs.
- **Rollback.** Module-scoped (10 §5.3): because modules are independently replaceable behind typed
  contracts, a defective extraction reverts alone, and the pre-seat arrangement is always a valid
  fallback during M6 (byte-identity guarantees it).
- **🔒 decision.** **🔒 9 — the allocator re-seat itself** is the standing HIGH-risk pause. The re-seat
  plan (extraction order + gate evidence) pauses for Simon before the **first** extraction lands.

### (c) D6 strategy + D8 microcycle objects — P2-2

- **Objective.** Turn the strategy and microcycle decisions from downstream hard-coded fragments into
  typed decision objects: **M-STRAT** (D6, the develop/maintain map at intervention-class granularity,
  02 §2.6) and **M-PERIOD**'s **D8** microcycle (fixture-aware, 02 §2.8). This is the named
  **prerequisite for Stage-7 endurance programming** (10 §3; 11 §7).
- **What moves.** D6 strategy fragments (no single home at the pin — G4) compose into M-STRAT;
  D8 gains fixture-density ownership (the `microcycles` SKB section, dormant at the pin, gets its
  consuming stage). This is where the **deferred `matches_this_week` fixtures signal** from (a) finds
  its baseline owner.
- **Byte-identity / KSV discipline.** D6/D8 emit *typed decisions consumed downstream* — but for
  existing athletes with no fixture calendar the emitted decision must reproduce today's implicit
  behaviour, so the goldens stay byte-identical for the no-fixture cohort. Any athlete-visible change
  from a *newly consumed* fixture signal is a scoped re-baseline with an expected-delta note (this is
  the one place M6 may legitimately move a golden — a newly-consumed input, not a re-seat).
- **Rollback.** The new consumer is flag-gated default-OFF (10 §5.1); disabling it returns the
  no-fixture behaviour.
- **🔒 decision.** None newly reserved; the taper semantics confirm from (a) rides here.

### (d) Age/sex modifier family — P2-5

- **Objective.** Promote the engine's only sex modifier (`femaleRepBump` +2, `allocator.js:227` —
  `04` §3 row 5) from an ungoverned literal to the first member of a **governed athlete-modifier
  family** (age/sex/developmental — G20; Art 21 binds the youth/LTAD members).
- **What moves.** The `femaleRepBump` literal → a KA Domain 6 scheme-modifier entry; the family
  expansion (age bands, developmental stage) is `03`/`07` design fed by this row.
- **Byte-identity / KSV discipline.** The existing `+2` relocates stamp-only (byte-identical). *New*
  family members (age bands) are new knowledge that changes plans for the cohorts they touch — those
  are scoped re-baselines with expected-delta notes, staged per modifier, and gated on 🔒 science
  anchors. No modifier arms without a signed anchor.
- **Rollback.** Per-modifier: an ill-calibrated modifier disarms alone, returning that cohort to prior.
- **🔒 decision.** **Age/sex modifier science** — the anchor values and the youth/LTAD bindings (Art 21)
  are Simon's science call (P2-5 🔒), proposed by `03`/`07`.

### (e) Wearable adapter — P2-9

- **Objective.** Give wearable ingestion a typed **adapter interface with honest naming** (TR-15):
  a wearable reading enters through one named seam, not scattered field reads, and the naming stops
  overclaiming what the device actually measures.
- **What moves.** The wearable read path consolidates behind M-ATH's adapter interface
  (`lib/adapters/*`); naming is corrected to reflect measured-vs-derived honestly (Art 16).
- **Byte-identity / KSV discipline.** Pure interface consolidation — the *values* read are unchanged,
  so goldens stay byte-identical. A naming change is a label, not a decision.
- **Rollback.** Adapter-scoped revert; no decision changes.
- **🔒 decision.** None.

### (f) P3 polish + dead-scaffolding sweep — P3-1…P3-5 remainder

- **Objective.** Delete what the migration made dead and close the last polish items.
- **What moves.** The M2b `styleObjective` remnant and the production-dead SELECTION_SCORING pin
  (retired, not re-homed); the audit's dead-scaffolding list (`10` §3 disposition: stretch-bias claim
  + `stretchMult` path, `ISO_SETS.bodybuilding`, style-bridge remnants, stale headers, the uncalled
  clock default — TR-16/TR-18); the remaining P3-1…P3-5 items.
- **Byte-identity / KSV discipline.** Dead code is *proven dead first* (0 archetypes exercise it — the
  M2b method), then deleted, then goldens confirmed byte-identical. Deletion of proven-dead code is
  byte-identical by construction.
- **Rollback.** Each deletion is an isolated commit; git-revert restores it if a path is found to have
  been live after all (the proof window).
- **🔒 decision.** None.

---

## §4 The 🔒 decisions for Simon — HIS calls, not decided here

These are flagged for Simon and left open. This plan does **not** decide them.

- **🔒 8 · Functional-discipline identity + equipment-demotion honesty copy (philosophy/product).**
  P2-8's call: does "functional fitness" get a **real GPP (general physical preparedness) module** with
  its own coaching identity, or an **honest label** that names what it is without a bespoke engine path?
  And the equipment-demotion copy: when limited equipment forces a lighter discipline, the app must say
  so honestly — **no silent discipline demotion.** Real module vs honest label is Simon's philosophy
  call; it gates the shape of that cohort's coaching.

- **🔒 9 · The allocator re-seat itself (standing HIGH-risk pause).** The re-seat plan — extraction
  order (M-SESS / M-DOSE / M-SCHED), and the gate evidence proving byte-identity per commit — pauses
  for Simon **before the first extraction lands** (sub-phase (b)). This is the standing HIGH-risk pause
  of the charter; it is not autonomously mergeable. Nothing in (b) begins until this is signed.

- **🔒 10 · Endurance-programming scope trigger (Stage 7).** Stage-7 endurance builds on the D6/D8
  objects (c) and the widened quality vocabulary, explicitly **after the learning loop proves the gym
  product** (audit 10 §3 Wave F). The *trigger* — when to open that scope — is Simon's, taken at M6
  exit or later. It is out of scope for this migration set beyond **naming the seam** (spec §8); M6
  only builds the D6/D8 prerequisite, not the endurance sessions themselves.

- **Ballistic/olympic `clearedIds` science review (from M4a).** Pre-existing contraindication gaps
  faithfully preserved by M4a — `hang_clean`, `snatch`, clean-&-jerk were never blocked (HANDOFF M4a
  caveat 2). This is **safety-critical science content**, not a structural call: whether these lifts
  should be contraindicated for given injury regions is Simon's near-term science review, and it
  travels with the contraindication vocab governance move in (a). Until reviewed, the current
  (permissive) behaviour is preserved byte-identical.

---

## §5 Exit gate — V2 *is* the engine

M6 is done — and the whole migration is done — when all of the following hold (11 §7 exit gate;
10 §6):

- **`allocator.js` no longer exists as a concentration.** Selection, dose and structuring live behind
  the **M-SESS / M-DOSE / M-SCHED** contracts, with **byte-identical goldens across every extraction
  commit**.
- **Zero coaching magnitudes at full authority in code.** The **C3 closure list in
  `04-KNOWLEDGE-OWNERSHIP-MAP.md` reads empty** — every steering number is a governed entry with
  provenance/confidence, or an explicitly-labelled seed capped at soft input (Art 13). The
  `validate:knowledge` closure lint (KV-4) enforces this continuously; the staleness watchdog (KV-6)
  is wired.
- **D6/D8 emit typed decisions consumed downstream** — the strategy and microcycle objects are real,
  unlocking fixture-congestion coaching for Team and the D6/D8 prerequisite for Stage 7.
- **Every coaching decision has a clear owner** (pipeline stage + knowledge domain); knowledge and
  logic are cleanly separated (10 §6.2 — nothing owned by "the code").
- **Zero edits to the frozen six**; the Amendment Register stays empty (invariant 4).

After this gate, there is no further migration phase. **V2 is the engine.** What follows (Team
analytics, AI go-live, Stage 7 endurance) is Phase 4 net-new product on the V2 substrate, not migration.

---

## §6 Risk / rollback ledger (summary)

| Risk | Mitigation | Source |
|---|---|---|
| Behaviour change smuggled into a re-seat | Byte-identity per extraction commit; a golden delta rejects the PR by definition (invariant 7) | 10 §4 R1 |
| Golden blind spots certify a bad extraction | M0's armed-prod archetype matrix + reflow≡baseline property; M4's suite as the independent floor | 10 §4 R2; §2 entry gate |
| A knowledge move changes a plan silently | Stamp-only moves (value preserved to the digit); expected-delta note reads "no plan delta"; KSV bump | Art 20; 10 §5.4 |
| Re-seat begins before behaviour settled | Entry gate binds M2-settled + M4-floor + 🔒 9 signed | 11 §7; invariant 7 |
| Scope creep toward a cathedral | Each sub-phase ships independently with a measurable exit; anything beyond the gate defers | Art 20; invariant 6 |

**Rollback posture, per sub-phase:** (a)/(d-relocations) by KSV pin; (b) module-scoped revert with the
pre-seat arrangement always valid; (c)/(e) flag-default-OFF; (f) isolated deletion commits inside a
proof window. Byte-identity is what makes every one of these independently revertible.

---

*Cited: `11-MIGRATION-PHASES.md` §7 · `10-MIGRATION-ARCHITECTURE.md` §2.2/§2.3/§4/§5 ·
`12-MODULE-DEPENDENCY-DIAGRAM.md` · `04-KNOWLEDGE-OWNERSHIP-MAP.md` §3 · Constitution Art 8/13/16/17/20/21.
This is a PLAN. 🔒 8/9/10 + the ballistic/olympic science review are Simon's calls, left open.*
