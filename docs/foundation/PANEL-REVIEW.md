# Foundation Set — Panel Review

> A critique of the three governing documents — the [Constitution](CONSTITUTION.md),
> the [Decision Ontology](DECISION-ONTOLOGY.md), and the
> [Knowledge Architecture](KNOWLEDGE-ARCHITECTURE.md) — as if presented to a panel of
> six experts. The critiques below are genuine; each lens found something real. The
> **revisions** are folded back into the documents (with the location noted) or, where
> the issue is a genuine hard problem, recorded honestly as an open question rather
> than papered over.

| | |
|---|---|
| **Status** | v1.0 — review of the foundation set |
| **Method** | Six lenses, each critiquing the *set* for weakness, ambiguity, unnecessary complexity, and missing concepts. Revisions applied to the documents; this file is the provenance. |
| **Verdict** | Recorded in [§7](#7-final-coherence-verdict). |

---

## 1. Lens — Olympic Head of Performance

*"Sport-first, diagnosis-centred, availability named as first-order — this is how I
think. My worries are about whether you can actually know the athlete well enough to
diagnose, and whether 'minimum effective' quietly becomes 'under-trained.'"*

- **C1 — Diagnosis rests on capability you mostly can't measure.** The Diagnostic
  Triangle needs the athlete's current quality levels, but for a self-coached amateur
  with a phone those are largely inferred. Stated too confidently, "diagnosis precedes
  prescription" over-promises. **Revision:** Constitution Article 5 now states
  explicitly that early diagnosis on inferred capability is a *low-confidence
  hypothesis*, not an assessment, that narrows priorities and widens margins (folded
  into Article 5 *Implications*; reinforced by Articles 12, 16).
- **C2 — "Minimum effective" can under-train an amateur who over-reports fatigue.**
  Self-reported wellness from a nervous beginner can bias the engine timid.
  **Assessment:** covered by the *minimum-effective-but-sufficient-and-progressed*
  framing (Constitution Article 7, whose failure mode explicitly names under-dosing)
  and by progression being first-class (Knowledge Architecture Domain 6). No new
  change; flagged as a real tuning risk for the learning loop to watch.
- **C3 — Availability as currency.** Correctly elevated (Constitution Article 8;
  robustness as a quality family; injury-risk weights the diagnosis). **No change.**

*Verdict:* "Architecturally sport-first and honest about its own uncertainty — which
is rare. Keep being loud that day-one diagnosis is a hypothesis, and let the learning
loop earn the precision."

## 2. Lens — Professor of Sports Science

*"Unusually honest as an evidence platform — confidence tiers, no fabricated
citations, contested science demoted. My critiques are about pseudo-precision and
falsifiability."*

- **C1 — The limiting-factor gap formula looks settled but is a heuristic.**
  `importance × (target − current)` was presented as if validated. **Revision:** the
  Ontology's Limiting Factor now tags it "a starting heuristic, not a validated
  formula (EDS Q1)."
- **C2 — "Confidence composes up the graph" is hand-wavy.** Uncertainties can be
  correlated; scalar multiplication is a convenience, not a proof. **Revision:**
  Knowledge Architecture Domain 10 now records cross-decision confidence composition
  as an acknowledged open problem, treated conservatively (a chain is no more
  confident than its weakest link) until validated.
- **C3 — Qualities must be measurable and dosable, or they are labels.** **Assessment:**
  already enforced — Knowledge Architecture Domain 3 admits a quality to the taxonomy
  *only* with an assessment and a dose-response (Constitution Article 12, "no acting on
  labels"). **No change.**
- **C4 — Falsifiability of diagnoses.** **Assessment:** covered — Learning (Domain 12)
  validates whether developing a priority quality moved the Performance Outcome (the
  reinstated Performance Outcome entity is what makes this measurable). **No change.**

*Verdict:* "The intellectual honesty is the strongest thing here. With the gap formula
and confidence-composition now flagged as open rather than solved, it reads as
research-grade, not a wellness toy."

## 3. Lens — World-Class Strength & Conditioning Coach

*"It reasons like a coach — diagnose, prioritise, dose the minimum, observe. Two
practical gaps."*

- **C1 — Warm-up / priming / skill work is invisible.** Real sessions open with
  preparation. **Assessment:** these are **Intervention** subtypes (the code already
  has `primers.js`), below the ontology's altitude but representable. Noted here so it
  is not mistaken for an omission; no new entity needed.
- **C2 — "Bank the time" will frustrate athletes who want to do more.** **Assessment:**
  this is a communication problem the architecture already answers — explainability
  (Constitution Article 14) means the athlete is *told why they're done*, and surplus
  capacity is offered as *optional* work, not forbidden (Article 7). **No change.**
- **C3 — Self-reported sport load is noisy.** The amateur's "I ran easy" may not be.
  **Assessment:** handled as a low-confidence Constraint/Load input (Knowledge
  Architecture Domains 7, 8); the learning loop sharpens it. Flagged as a real-world
  data-quality risk.

*Verdict:* "It coaches rather than generates. The reasoning order is right; the
practical texture (warm-ups, communication) is representable within the model."

## 4. Lens — Principal Software Architect

*"The knowledge-vs-logic separation and the eight-kind taxonomy are exactly the right
spine. My concern is scope for a small, beginner-led team."*

- **C1 — ~40 entities and 12 knowledge domains could read as a build mandate.** A solo
  developer could stall building the framework. **Revision:** the Ontology's "How to
  read" now states explicitly that it is *a vocabulary, not a build mandate* — entities
  begin as thin pass-throughs and are built only when a consumer needs them
  (Constitution Article 20). The Constitution's Article 20 and the EDS's "M1–M4 ship
  before the re-seating" already enforce incrementalism.
- **C2 — The eight-kind taxonomy needs a home in the module structure, or it's just a
  classification.** **Assessment:** it maps onto the EDS §39 module boundaries
  (knowledge/ vs decisions/ vs validation/ vs derived) and the Knowledge Architecture
  §6 "where does this belong?" checklist makes it actionable at authoring time. **No
  change**, but the link is now explicit in §6.
- **C3 — Cross-document term drift.** **Assessment:** checked — cycle horizons,
  reflow/adaptation-projection, recoverability/readiness, and the conflict order are
  used consistently across the three docs and the EDS, with synonyms noted. **No
  change.**

*Verdict:* "The architecture is correct and the 'data, not code' discipline is
enforceable. The vocabulary-not-mandate clarification is what makes me comfortable a
small team won't drown in it."

## 5. Lens — Staff AI Engineer

*"The 'AI proposes, validators dispose' seam is the standout safety idea. Two things
were underspecified."*

- **C1 — An AI's self-reported confidence cannot be trusted.** The confidence model
  assumes confidence derives from evidence + validation + data sufficiency; an LLM is
  fluently certain regardless. **Revision:** Knowledge Architecture Domain 11 now
  carries the AI-confidence caveat — an AI-proposed decision earns confidence only
  from passing Validation and from its observed track record, never from the model
  asserting it is sure.
- **C2 — How an AI proposal is bounded *beyond* the validators is unspecified.** The
  contract each substitutable decision must honour, and the eval harness, are not
  defined. **Revision:** recorded explicitly as an open problem (EDS Q8) in the same
  Domain 11 note, rather than implied solved. The seam exists (decision contracts +
  Validation gate); its full specification is deferred and named.
- **C3 — Learning and AI both touch priors.** Their interaction is unspecified.
  **Assessment:** noted as an open coordination problem; both write Predictions/Priors
  that the pure core only *reads* (Constitution Article 18), so the safety boundary
  holds even while the coordination detail is open.

*Verdict:* "The safety harness is genuinely strong because it does not depend on
trusting the AI. With the self-confidence caveat explicit and the bounding question
named as open, the seam is honest about what it does and doesn't yet guarantee."

## 6. Lens — Product Architect (decade-long maintainability)

*"My job is to make sure this is still coherent in ten years and dozens of
contributors. The governance surface is large."*

- **C1 — Many documents; who owns what?** Three foundation docs + the EDS + five engine
  specs + running docs invites drift. **Revision:** a foundation-set
  [README](README.md) is added — the index, reading order, the governance stack, the
  canonical-ownership map, and the foundational-vs-running distinction — mirroring the
  engine README. Each foundation doc already declares its authority and canonical
  scope.
- **C2 — Amendment ripple.** When the Constitution amends, lower docs must reconcile.
  **Assessment:** the Constitution's Amendment & Stewardship section requires exactly
  that (reconcile the EDS and foundation docs in the same change). The EDS gets a
  pointer to the Constitution's mapping table. **No change beyond the pointer (task 5).**
- **C3 — Running vs. foundational confusion.** These three are *foundational* (the
  target), not *running* (current status). **Assessment:** stated in each doc's status
  block and in the new README; status stays in `HANDOFF.md`/`CLAUDE.md`. **No change.**

*Verdict:* "With a foundation README and the Constitution's amendment process, the
governance stack is navigable and self-reconciling. This can survive a decade of
contributors."

---

## 7. Final coherence verdict

The three documents form a coherent, internally consistent stack:

- The **Constitution** states the immutable *why* and *what-must-never-happen*, and
  every Engine Law and First Principle maps onto an Article (nothing orphaned).
- The **Decision Ontology** gives every concept the Constitution and EDS use a single,
  unambiguous definition, separates the three structures that were conflated, and adds
  the entities (Performance Outcome, Fatigue, Organisation/Team/Coach/Position,
  Override) the EDS left implicit.
- The **Knowledge Architecture** makes "reason from knowledge, don't hard-code" operable
  through the eight-kind taxonomy and twelve governed domains, grounded in the schemas
  that already exist in code.

**Three commitments the set must keep** (inherited from the EDS self-review and
reaffirmed here):

1. **Measure before you claim** — qualities admitted only when assessable; diagnoses
   treated as falsifiable hypotheses.
2. **Demote contested science in code, not just in comments** — confidence is
   operative; the gap formula and confidence-composition are flagged open, not
   asserted.
3. **Ship athlete value incrementally** — the ontology is a vocabulary, not a mandate;
   build the smallest thing that helps a real athlete, and let the architecture pull
   the work forward.

Hold those three, and this set is a credible conceptual foundation for the world's
leading sports-science coaching operating system — one that thinks like an elite
coach, not a workout generator.

---

*— End of the Foundation Panel Review v1.0 —*
