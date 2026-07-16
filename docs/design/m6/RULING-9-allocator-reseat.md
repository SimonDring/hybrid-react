# 🔒 9 — RULED: the allocator re-seat (order + byte-identity gate)

**Status: RULING (Simon, 2026-07-16 — delegated: "rule 🔒 9").**
**Authority: signs off the standing HIGH-risk pause at `M6-PLAN.md` §4 / sub-phase (b) / P2-1.
The re-seat splits `allocator.js` along the EDS stage boundaries into M-SESS (D9/D10/D11),
M-DOSE (D12), M-SCHED (D13), per `10-MIGRATION-ARCHITECTURE.md` §2.2/§2.3. This ruling decides
the EXTRACTION ORDER and the GATE EVIDENCE. It authorises (b) to begin under the conditions
below; it starts no code (execution gets its own design spec + subagent build).**

---

## What's being re-seated

`allocator.js` is a 1,052-line concentration (the fill engines at `:641–:1041` were already
deleted at M2b — the re-seat moves only the surviving D11 path). Three targets:
- **M-DOSE (D12)** — the dose primitives: `scheme` (:128), `makeItem` (:252), `roleSetCount`,
  `restForRole`, `capReps`/`floorReps`/`bumpReps`, + `data/doseSchemes.js` + `lib/strength/*`.
- **M-SCHED (D13)** — structuring + post-passes: `structureItems` (:325), `finaliseSlot` (:1000),
  `styleObjective`, `shiftRpe`, `addHypertrophyIsolation`, `addSupportiveFinishers`,
  `injectSecondaryGoals`, + the already-separate `scheduler.js` / `despine.js` / `axial.js` /
  `primers.js`. D13 is SURVIVES-UNCHANGED (the audit's strongest layer — behaviour frozen).
- **M-SESS (D9/D10/D11)** — the selection core: `allocateGym()` (:517) selection body +
  `lib/session/*` + `lib/plan/selectInterventions.js`. The biggest, most defect-laden piece.

---

## RULING 1 — extraction order: **M-DOSE → M-SCHED → M-SESS**

Ordered by the **call-graph**, leaves first, root last — you never extract a module before the
things it depends on are already behind stable contracts.

1. **M-DOSE first.** The dose primitives are the call-graph **leaf**: both the selection body and
   the post-passes call `makeItem`/`scheme`/rep-rest math; they call almost nothing else. They are
   near-pure functions over scheme tables → the **easiest to put behind a typed
   `{value, confidence, rationale}` contract and prove byte-identical**, so the FIRST extraction
   validates the harness on the lowest-risk, most-provable ground. Extracting it first also gives
   the next two modules a stable dose contract to call (no later rework of dose call-sites).
2. **M-SCHED second.** D13's behaviour is **frozen** (SURVIVES-UNCHANGED) and it is the pipeline
   tail (nothing downstream depends on it). With M-DOSE already extracted, its post-passes call the
   stable M-DOSE contract rather than reaching back into `allocator.js` — a clean separation with
   minimal churn.
3. **M-SESS last.** The selection core is the most entangled and defect-laden; extract it once
   M-DOSE and M-SCHED are proven contracts it can call, and the harness has been exercised twice.
   Its extraction **empties `allocator.js`** — achieving the exit-gate "allocator.js no longer
   exists as a concentration."

*Rejected: data-flow order (M-SESS → M-DOSE → M-SCHED).* It extracts the hardest, most-entangled,
most-defect-prone piece FIRST, before the byte-identity harness is proven — exactly the wrong risk
profile for the standing HIGH-risk pause.

---

## RULING 2 — the gate evidence (the safety story I am signing)

Every condition below is binding on every extraction commit in (b):

1. **Byte-identity PER COMMIT.** Each extraction lands as its own commit/PR with a **byte-identical
   golden run across the FULL M0 archetype matrix** (armed-D7, injured, measured, every rescued
   cohort) **AND** the `reflow≡baseline` property. Any golden delta = the commit is **rejected by
   definition** (R1; invariant 7). This is now **CI-enforced for real** — the engine gate (golden-
   master + `prop-additive-identity` + `prop-reflow-baseline`) was silently broken and never ran
   until #193 (2026-07-16); it now runs on every PR. The re-seat is the first work to land under a
   gate that actually executes.
2. **Pure moves ONLY — no behaviour smuggled in.** An extraction commit relocates code behind a
   contract and nothing else. Any intended behaviour change is a **separate, later commit** with an
   expected-delta note (R1). A re-seat commit that needs a golden re-baseline is, by that fact, not
   a pure move — split it.
3. **KSV unchanged in a re-seat commit.** A code move is not a knowledge change → it must not bump
   `KNOWLEDGE_SET_VERSION` (the golden stamp stays identical). Moving in-code constants to M-KNOW is
   a **separate concern** (M6 sub-phase (a), the governance sweep) and must NOT be bundled into a
   re-seat commit — bundling would produce a stamp-only golden delta and blur the byte-identity story.
4. **Contract proven before the caller is rewired.** Each module's typed `{value, confidence,
   rationale}` contract is exercised with fixtures (no sibling required, §2.1) and green **before**
   the call-sites flip to it. Test the contract in isolation, then flip.
5. **Module-scoped rollback.** A defective extraction reverts alone; the pre-seat arrangement is
   always a valid fallback during M6 (byte-identity guarantees it, §5.3).

---

## RULING 3 — how (b) proceeds (merge posture for a HIGH-risk sequence)

- (b) begins only with the **entry gate held**: M2 settled + M4 floor in place + the M0 net green in
  CI. All three now hold (M0 net is live post-#193; M2/M4 merged).
- **One extraction = one PR**, byte-identity-gated, reviewed adversarially (the M5 discipline).
- **The FIRST extraction (M-DOSE) is Simon's explicit review + merge** — it validates the harness in
  practice, not just on paper. Once that proves the byte-identity machinery clean end to end,
  subsequent byte-identical extractions (M-SCHED, then M-SESS) are low-risk-by-construction (a delta
  is impossible to merge); I'll recommend the merge posture for those at that point based on how the
  first behaves. The crown-jewel engine stays under Simon's control through the sequence.
- The re-seat gets its **own design spec** (extraction sub-steps, the contract shapes, the fixture
  set per module) + subagent-driven execution when Simon says go. **This ruling does not start it.**

---

## Open (untouched here)

🔒 10 (endurance scope trigger). The **constants→M-KNOW governance sweep** (M6 (a)) and the
ballistic/olympic contraindication science review ride alongside but are **not** part of the re-seat
commits (ruling 2.3). The D6/D8 typed-object work (M6 (c)) depends on the re-seat landing first.
