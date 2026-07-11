# Prioritised Improvement Backlog — decision engine

**Status: REVIEW (dated) · Sprint 2 forensic audit, deliverable 9 of 10 · main @ 02f6184.**
Every issue from deliverables 01–08, ranked. P0 = critical (defect/safety/honesty —
fix before feature work) · P1 = high (this quarter's substance) · P2 = medium ·
P3 = low. 🔒 = pauses for Simon (science/philosophy/public-interface per the standing
charter). Each item: what → why this rank → source finding. Sequencing across items is
deliverable 10's job; this list is the ranked inventory.

---

## P0 — Critical

**P0-1 · Fix the post-flip style-id fallthrough.** Map `powerlifting`/`hypertrophy`/
`olympic` into STYLE_TOP, the scheme bridge, and the allocator whitelist (or key those
tables on discipline). *Why P0:* a live, unnoticed behaviour regression — all three
build disciplines run functional volume bands today; it was silently re-baselined into
the goldens, so the safety net is currently certifying the defect. → TR-01, G8.

**P0-2 · Close the injury empty/hollow-session hole.** (a) Fallback protocol when a
rehab replacement would be empty (never ship `items:[]`); (b) let validators see
`discipline:'rehab'` sessions; (c) make the "replaced with rehab" banner truthful;
(d) stop counting hidden substituted items in the volume ledger. *Why P0:* highest
duty-of-care moments; the false banner is an honesty breach; all four are small.
→ TR-04, SR-03, G14. *(Rehab content authoring for the 5 bare regions is the 🔒
science half — runs in parallel, P1-6.)*

**P0-3 · Enforce gate-tier injury vetoes on the shipped path (I5, inherited).**
Veto-class only, flag-staged, golden-gated; requires P0-2a so enforcement never
strands an athlete with nothing. *Why P0:* turns the safety layer from observer to
floor at exactly one tier. → TR-02, G11.

**P0-4 · Minimum viable progression for non-loggers.** Block-position load creep
(small % per week within phase on mains) + accessory double-progression + warm-up
ramps for RPE ≥8 / ≤5-rep work. 🔒 (behaviour-changing for everyone; scheme design is
a coaching call). *Why P0:* the most athlete-visible coaching failure; Art 7's
"progressed" clause currently false for the majority cohort. → SR-01, G9, W4/W8.

**P0-5 · Legacy-fill cohort rescue (smallest form).** Seed a fallback quality on
empty sport diagnoses (port the build-goal fix); route triathlon via a category plan;
backfill/derive `sport_code` for legacy GAA rows. *Why P0:* three real cohorts get
Art-6-inverted programming today; each fix is small and surgical; full fill
retirement is P1-8. → B1, G6, SR-06.

**P0-6 · Fix the strengthEndurance mapping bug + emit `droppedDemands`.** One map
line restores authored rugby demand; the projection declares what it drops (Art 15).
*Why P0:* a plain bug plus a two-hour honesty fix guarding the platform's moat.
→ B3, G2, K1-adjacent.

**P0-7 · Repair the plan-memo signature.** Add `sport_code`, game dates, and
`athlete_model` to `profileSignature`. *Why P0:* stale plans after season/model edits
— a correctness defect in what athletes see today. → TR-06.

## P1 — High

**P1-1 · Wire existing assessments into capability (S2, inherited) 🔒 anchors.**
Per-quality estimators behind the existing interface (ROM/jump/VO2/`1rm_pull` first);
additive until data exists. *The* gap between intake-form coaching and measurement.
→ G1, SR-02.

**P1-2 · Make athlete-signal confidence operative (S1, inherited).** Fix the exported
confidence (baselineMaturity), add a recency gate on the driving metrics row, smooth
the subjective score over a trend, gate cut magnitude by confidence + baseline
maturity. → SR-04, TR-13, G12/G15.

**P1-3 · Validator build-out wave 1 (S4, inherited).** Sport-protection, MEV-floor,
dose-coherence, progression-sanity, deload-presence — each lands report-only then
promotes; render the validation report (it is currently invisible). → TR-02, G11/G16.

**P1-4 · Golden coverage for production paths.** Archetypes with a dual-written
athlete model (arming the D7 steer), a reflow≡baseline property test, an engine-owned
suite entry point, RLS harness into CI. → TR-05, TR-11, G22.

**P1-5 · The outcomes/history substrate (M1, inherited) 🔒 privacy design.**
Append-only block_outcomes + readiness snapshots + bounded sync (rolling window) +
storage back-pressure. Unlocks learning, team trends, coach evidence, AI track record.
→ TR-03, G13/G21.

**P1-6 · Author the 5 missing rehab regions + protect-phase entries for 4 more 🔒
science.** Content half of P0-2; includes a completeness check (any region with
blocks must have rehab). → SR-03, G14.

**P1-7 · Absorb the dropped SKB qualities into the vocabulary (S3, inherited) 🔒
ontology-adjacent.** First-class or a governed sport-skill family; pairs with P1-1
(measure what you newly diagnose). → B3, G2.

**P1-8 · Retire the legacy fill.** After P0-5, fold remaining legacy behaviour into
the D11 path (or a declared generic-athletic demand profile) and delete the deficit
engine. Deliberate behaviour change with archetype-scoped re-baselines. → G6, TR-08.

**P1-9 · Silent-list burn-down (Art 15).** Record MRV/budget/time/contact skips in the
session/validation report; render the `lightened` flag; suppress or honest-ify
`_catchUp` and the muscle-target ledger on D11 cohorts; surface no-op SKB rule
effects. → G17, B6/B12, findings-5 §6.

**P1-10 · Apply the staged F3 privacy migration** (staging → harness (7 cases) →
prod) — inherited open-queue item; the register's only privacy action. → TR-17
adjacent, HANDOFF #4.

## P2 — Medium

**P2-1 · Allocator re-seat along D11/D12/D13 + constants → knowledge (M4, inherited)
🔒 HIGH-risk re-seat.** Byte-identity gates per extraction; then the ~30 shape
literals and the sport-fact sets (D11_SPORTS/CATEGORY_LED → SKB `meta.cohort`) onto
the governed surface. → TR-07, TR-12, G19.

**P2-2 · A real D6 strategy object + D8 microcycle decision.** Concurrency model,
develop/maintain map, fixture-density week patterns — prerequisite for endurance
programming later. → G4/G5.

**P2-3 · Coach-override seam v1 (Art 10 second half).** Invoke `validateProposal`
from a coach action on one decision (D11 session swap), recorded to the outcomes
layer; the AIGAS substitution path proves itself on a human first. Needs P1-5.
→ TR-09, G18.

**P2-4 · Id-level contraindication vocabulary (K2, inherited).** Retire the
name-regex safety join. → TR-10.

**P2-5 · Age/sex modifier family 🔒 science.** Governed modifiers on landmarks, dose,
recovery; consume SKB developmentPriorities; masters-conservative defaults first.
→ SR-09, G20.

**P2-6 · Explainability at prescription.** Persist per-item selection rationale
(tier + transfer + trace-to-priority), render meta.diagnosis on a screen, ship the
reserved `explain` call. → G16.

**P2-7 · D16 promotion policy + D7 gate hygiene 🔒 (M2, inherited).** Define
staged→learned promotion (needs P1-5's history); meanwhile make the D7 gate honest —
a schema-default prior should not arm a "learned" steer. → G13, TR-05.

**P2-8 · Functional discipline identity 🔒 philosophy.** A real GPP/mixed-quality
module, or an honest label on the hypertrophy routing; stop silent discipline
demotion on equipment (tell the athlete). → B4, G8/Art 3.

**P2-9 · Wearable adapter interface + honest naming (L4, inherited).** Extract the
provider interface, rename the fitbit-labelled Google layer, design the queued
ingestion. → TR-15.

**P2-10 · Knowledge governance completion (M6, inherited).** `validate:knowledge`
gate over sibling tables, structured citations, wire the staleness watchdog into a
review queue. → G19, SR-16.

## P3 — Low

**P3-1 ·** Dead-code and stale-comment sweep (stretch-bias claim, ISO bodybuilding
branch, "swim keeps legacy fill", secondaryGoals header, uncalled staleEntries clock
default). → TR-16/TR-18.
**P3-2 ·** Level-fallback alignment (reflow 'beginner' vs generator 'intermediate').
→ TR-14.
**P3-3 ·** Muscle-model resolution pass (front delts; split "back") 🔒 science.
→ TR-19.
**P3-4 ·** Sport-intensity awareness in scheduling (match vs light session), CNS
interference term. → G10, SR-13.
**P3-5 ·** Iso/core dose context (season/quality-aware accessory dosing; sprint
power-clean scheme 🔒). → SR-14.
**P3-6 ·** Team-scale hygiene: multi-team coach board, trend series (rides P1-5),
server-side status recompute. → TR-17.

## Rank rationale in one paragraph

P0 is confined to items that are *wrong today* for identifiable athletes (regression,
safety holes, inverted cohorts, absent overload, stale plans) and cost days. P1 is the
quarter's substance: make the diagnosis measured, the signals disciplined, the
validators real, the substrate learnable — the four failed constitutional verbs plus
the net (P1-4) that makes the rest safe to ship. P2 is structure: re-seats, seams, and
governance that convert the P1 gains into a platform. P3 is polish. Simon-gated items
are marked so the autonomous lane never stalls behind them.
