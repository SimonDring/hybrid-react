# Strategic Roadmap — 2026-07-09

**Status: REVIEW-dated proposal (governance sprint Phase 7). The decision on
sequencing belongs to Simon; once adopted, the active queue lives in
HANDOFF.md (this file stays as the rationale record).**

Sources: the six phase reviews of this sprint (documentation audit,
architecture review + debt register, decision engine review, knowledge review,
AI review, data review, testing strategy). Every item carries: problem →
evidence → constitutional alignment → impact → complexity → dependencies →
risks. Order within a horizon is the recommended execution order.

Legend: 🔒 = pause for Simon (philosophy / public interface / science review).

---

## IMMEDIATE (days — defects, safety, and cheap structural wins)

**I1 · Fix the Olympic classic-lift dose override** *(task chip filed)*
Problem: snatch/C&J ship as 4×4, ignoring the discipline's 1–3-rep scheme.
Evidence: verified at `allocator.js` makeItem; engine review W2.
Alignment: Art 5/6 (adaptation before dose), Art 1. Impact: high (a whole
discipline's core prescription). Complexity: small. Dependencies: none.
Risks: golden-master re-baseline must stay olympic-only; decide sprinters'
power-clean handling deliberately.

**I2 · Close the injury empty-session hole + roster-removal orphan** *(orphan
task chip filed)* 🔒 (rehab content = science review)
Problem: severity-4 injuries in 5 uncovered regions can ship an empty session;
removed players stay coach-readable.
Evidence: engine review S1/W6; data review F3.
Alignment: Art 8 (safety overrides), Art 11 (privacy). Impact: high (the two
places a real person gets hurt or exposed). Complexity: small-medium
(fallback protocol + 5 knowledge entries; one migration + harness case).
Risks: rehab content needs Simon's science sign-off — fallback protocol can
land first.

**I3 · Static analysis floor (ESLint + purity rules + format)**
Problem: zero linting; engine purity held by convention + tests only.
Evidence: debt TD-02. Alignment: Art 18 (pure core — now machine-enforced
twice), Art 20. Impact: medium now, high at second-contributor time.
Complexity: small (mechanical). Dependencies: none. Risks: initial diff noise
— land as lint-only, no mass reformat of history.

**I4 · CI hygiene: per-test timeout, workflow_call dedupe, path-filtered deploy**
Evidence: TD-10/TD-11. Alignment: Art 19. Impact: low-medium (removes a
deploy-blocking hang class). Complexity: trivial. Risks: none.

**I5 · Enforce gate-tier vetoes on the shipped path** 🔒
Problem: D14 is report-only end-to-end; even injury vetoes don't block.
Evidence: engine review S4/W6b. Alignment: Art 19 ("construction proposes,
validation disposes" — currently aspirational), Art 8. Impact: high (turns the
safety layer real). Complexity: medium (enforce veto-class only; trim stays
report). Dependencies: I2's fallback (so enforcement never strands an athlete
with nothing). Risks: a false-positive veto blocks a legitimate week — start
injury-veto-only, staged behind a flag, golden-master-gated.

## SHORT-TERM (weeks — honesty and confidence)

**S1 · Make athlete-signal confidence operative + smooth the subjective score**
Problem: one un-baselined bad morning cuts volume 22%/RPE−1 at full authority;
readiness confidence computed then ignored. Also the standing ACWR cold-start
concern.
Evidence: engine review W7/S2; HANDOFF open queue #5.
Alignment: Art 13 applied to athlete data, Art 16. Impact: high (every new
user's first weeks). Complexity: medium. Dependencies: none. Risks:
behaviour-changing for reflow — spec + deliberate re-baseline.

**S2 · Wire existing assessments into capability estimation** 🔒
Problem: only maxStrength is measured; ROM/jump/VO2/`1rm_pull` fields exist,
collected, ignored — diagnosis is priors wearing decimals.
Evidence: engine review W1/W3-adjacent. Alignment: Art 5 (diagnosis precedes
prescription — make the diagnosis real), Art 12. Impact: very high (the gap
between "junior coach with an intake form" and "coach who measured the
athlete"). Complexity: medium-high (per-quality estimators behind the existing
interface; additive until data exists). Dependencies: none technically; the
estimator anchors are science calls 🔒. Risks: bad anchors worse than priors —
stage per quality, confidence-tagged.

**S3 · Expand the quality vocabulary to absorb the 8 dropped SKB qualities** 🔒
Problem: grip/rotational/COD/speed/neck demand authored in the SKB is
discarded at the projection — including safety-relevant demand (rugby neck).
Evidence: knowledge review K1; engine review W3.
Alignment: Art 2 (the sport is never subordinated), Art 5; ontology-adjacent
(the Ontology deliberately fixed 10 — extending is a deliberate, documented
decision, candidate amendment). Impact: very high (unlocks the platform's own
moat into the diagnosis). Complexity: medium (vocabulary + map + demand
re-baseline) but philosophically load-bearing 🔒. Dependencies: S2 pairs well
(measure what you newly diagnose). Risks: vocabulary sprawl — add as a
governed family with the same discipline as the original 10.

**S4 · Validator build-out wave 1 (sport-protection, MEV-floor,
dose-coherence, deload-presence)**
Evidence: engine review S5; testing strategy layer 3 (dose-coherence would
have caught I1). Alignment: Art 19, Art 13. Impact: high (each validator
prevents a defect class forever). Complexity: each small. Dependencies: I5
pattern. Risks: low — they land report-only first.

**S5 · Bound the sync + storage back-pressure**
Problem: unbounded full-table pull; silent localStorage write failure — the
first production wall.
Evidence: data review F1. Alignment: Art 15 (no silent truncation — currently
violated at the storage layer). Impact: high (pre-empts data loss).
Complexity: medium. Risks: pagination must not break offline-first reads —
rolling window + on-demand history.

## MEDIUM-TERM (1–3 months — the learning platform)

**M1 · The outcomes/history layer (block_outcomes + readiness snapshots)** 🔒
Problem: "did the plan work" is unanswerable; D16 structurally blocked;
priors/outcomes latest-only in owner-locked JSON.
Evidence: data review F2/F6; engine review forward risk.
Alignment: Art 16 (learn, don't assume), Art 12 (athlete response validates),
TAS §11. Impact: transformative — the precondition for learning, coach
trends, and the AI's evidence base. Complexity: high (schema + service-role
ETL + privacy design 🔒 — de-identification rules are a Simon call).
Dependencies: S5 (sane sync first). Risks: privacy — design against Art 11
with the same rigor as player_status; panel-review the schema.

**M2 · D16 prior promotion + D7 broad activation** 🔒 (already HANDOFF #1/#2)
Evidence: HANDOFF open queue; engine review AR5 (dormant seams rot).
Alignment: Art 16, Art 13 (twice-gated). Impact: high (the engine starts
learning). Complexity: the mechanism exists; the decision + falsifiability
read are Simon's. Dependencies: M1 strengthens it greatly (block history vs
latest-only). Risks: premature promotion on one block's noise — M1 first is
the honest order.

**M3 · Real progression (double-progression, load creep, rotation, warm-ups)** 🔒
Problem: non-logging athletes' week 8 = week 1; accessories frozen; no ramps.
Evidence: engine review W4/W8. Alignment: Art 1, Art 7 ("progressed, never
padded" — currently half-true). Impact: very high for user results.
Complexity: medium-high, behaviour-changing for everyone 🔒. Dependencies:
S4's progression-sanity validator lands first (test the property, then change
the behaviour). Risks: per-discipline rollout with archetype-scoped
re-baselines.

**M4 · Allocator re-seat (split along D11/D12/D13) + retire the legacy fill** 🔒
Evidence: TD-01 (1,243 lines, growing); engine review W5/W9.
Alignment: Art 20, Art 17 (constants → knowledge), Art 6 (un-modelled sports
finally diagnosis-first). Impact: high (velocity + the last volume-first
cohort). Complexity: high — the definitional HIGH-risk re-seat 🔒.
Dependencies: I1, S4 (dose-coherence validator as the net), M3 ideally after
(don't re-seat and change behaviour simultaneously). Risks: byte-identity
gates per extraction step; the un-modelled-sport path is then a deliberate
behaviour change.

**M5 · Team package completion: schedule→constraints + trend storage**
Evidence: VISION/Stage 5; data review F5; TEAM-NEXT-STEPS.
Alignment: the North Star's Team promise; Art 11 shapes the trend tables.
Impact: high (the near-term product priority). Complexity: medium-high.
Dependencies: M1's time-series pattern; the season-window seam already built.
Risks: coach-facing derived data only — reuse the player_status discipline.

**M6 · Knowledge governance completion (validate:knowledge gate, universal
shape for sibling modules, structured citations, review queue)**
Evidence: knowledge review K3 + improvement 4/5. Alignment: Art 17, Art 12/13.
Impact: medium now, high as the knowledge base becomes the product at scale
(SR3). Complexity: medium, mechanical. Dependencies: none. Risks: none
material.

## LONG-TERM (3–12 months — the stated stages)

**L1 · AI go-live (Stage 6)** 🔒 — in the AIGAS-prescribed order: ratification
panel (C14) → eval harnesses (C2 then D11) → observability persistence →
provider adapter + cost controls → `AI_ENABLED` per capability. Evidence: AI
review (structurally ready; operationally not). Alignment: AIGAS end-to-end.
Dependencies: M1 (the AI's evidence base), M6 (C6 knowledge drafting).

**L2 · Endurance session programming (Stage 7 scope change)** 🔒 — the engine
programs run/cycle/swim sessions, not just gym support. Alignment: Art 2;
VISION. Complexity: very high (new session vocabulary, load model, SKB
sections exist). Dependencies: S3 (vocabulary), M1 (outcome measurement).
Explicitly *after* the learning loop proves the gym product.

**L3 · Native iOS + HealthKit (Stage 7)** — unchanged; the pure engine makes
the port cheap by design. Dependencies: product traction, not architecture.

**L4 · Multi-provider wearables done honestly** — rename the fitbit-named
layer, exercise a second provider end-to-end (data review F9).

## RESEARCH (no committed timeline — investigate before deciding)

**R1 · Measured-assessment protocols in-app** (guided ROM/jump/AMRAP tests
feeding S2's estimators) — which self-administered tests are valid enough to
steer plans? 🔒 science.
**R2 · VBT/RIR autoregulation tables** (knowledge review missing-concepts) —
evidence review before any table ships.
**R3 · Population priors from M1's de-identified outcomes** — the Art 16
endgame; needs volume of athletes + a privacy design review first.
**R4 · Sex/masters/youth modifiers on capability priors** — standards have
them, priors don't; needs literature pass 🔒.
**R5 · The reflow re-seat** (replay-not-redecide, WP-24 family) — prototype
against the two fixed divergence bugs' test corpus before committing.

## NEVER IMPLEMENT (recorded so they stop being re-litigated)

**N1 · AI as the coaching engine / AI-generated plans without D14 disposal** —
constitutionally excluded (AIGAS §13); the seam exists precisely so this never
does.
**N2 · Raw vitals to coaches, ever, including "just trends of HRV"** — Art 11;
derived signals only.
**N3 · A backend middle tier between app and Supabase** — RLS + edge
functions is the shape; a middle tier doubles the security surface (TAS
position; architecture review anti-recommendations).
**N4 · Rewriting Database.js / splitting the monorepo / framework-chasing**
(React 19, router 7) — no product value; standing anti-recommendations.
**N5 · Blanket UI test coverage** — the engine carries the correctness burden
by design; buy interaction tests only where state machines live.

---

## The one-paragraph strategy

Fix the two places a real person gets hurt or exposed (I1/I2/I5), put the
machine's own discipline on machine footing (I3/I4), then spend the next two
months making the diagnosis *true* (S1–S3) and *guarded* (S4/S5) — because
every later ambition (learning M1/M2, real progression M3, the Team package
M5, AI L1, endurance L2) inherits its ceiling from whether the diagnosis
measures the athlete or guesses. The constitution is already right; the code
now matches it structurally; the remaining decade of work is making the
knowledge and the evidence as honest as the architecture.
