# AIGAS v1.0 draft — alignment review (2026-07-06)

**Reviewer:** Claude (principal-engineer + S&C + sports-science lenses, per the reassessment
programme). **Scope:** does the AIGAS draft align with the product vision (VISION.md) and the
frozen governing set (Constitution, EDS, Ontology, Knowledge Architecture, TAS)? **Method:**
full read of all six parts + appendices; spot-check of the traceability matrix; cross-check
against the current codebase (post-#127…#136 queue).

## Verdict

**ALIGNED — recommend ratification** (per the Constitution's Amendment & Stewardship process,
with the panel-review pass AIGAS itself names as the next step). The draft is a faithful
*extension* of the frozen set to the AI layer, not a new philosophy: its central principle —
the deterministic engine decides; AI interprets, communicates, analyses, augments — is
Articles 18/19 restated for a new class of component, and every mechanism I checked derives
from an existing Article rather than negotiating with one.

## Alignment map

| Dimension | Verdict | Evidence |
|---|---|---|
| Vision (VISION.md) | **ALIGNS** | §21 is the Team package's founding promise made concrete: AI lowers the expertise barrier to *reading* elite S&C ("a busy person on a touchline"); the engine keeps the S&C elite. The long-term "AI-coached" trajectory is preserved as augmentation, matching the mission's trust framing ("trust they're getting the best possible training"). |
| Constitution Art 10 (human authority) | **ALIGNS** | §17: hierarchy unchanged; overrides captured as learning data; kill-switch/rollback "without a deploy". §13.8 prohibits AI implying a decision is closed. |
| Art 11 (privacy) | **ALIGNS, strengthened** | §19 adds two genuinely new, correct rules: *inferential* leakage review (AI must not reconstruct what the boundary hides) and "prompts are not a security boundary" — enforcement at context assembly, matching the existing four-layer defence posture. |
| Art 13 (confidence governs authority) | **ALIGNS, sharpened** | §16's "a language model is fluently certain about everything, so its self-reported confidence is worth nothing" is the KA Domain-11 stance made operational; AI-derived signals are capped below the gate tier — consistent with the shipped `authorityOf()` mechanism. |
| Arts 14/15 (explainability, no silent ops) | **ALIGNS** | §7's three obligations (trace-grounding, honesty-marker preservation, register-not-substance) + §15's labelling and "no dark degradation" extend the emission-honesty work now in the queue (#131/#132). |
| Art 18 (pure core) + EDS §35/§37 | **ALIGNS** | §3.1 is the load-bearing argument and it is correct: golden-masterability, replayability, and the validator harness are exactly what a stochastic decision path would forfeit. Seam 1's "AI proposes, validators dispose" is EDS §35.3's third virtue, verbatim in spirit. |
| Decision Ontology | **ALIGNS** | §24 makes the ontology the interlingua and requires ontology amendment BEFORE capability build — the right dependency direction. |
| Knowledge Architecture | **ALIGNS** | §23.3 "model weights are not a knowledge domain; 'the model knows' is not a citation" closes the exact leak KA §2.1 exists to prevent. |
| TAS (seams, provenance, learning) | **ALIGNS** | The two seams are TAS §5.13/§15 verbatim; §20's AI artefact stamp extends the shipped provenance discipline (engineVersion × knowledgeSetVersion) across the AI boundary; §22 routes all learning through L5 priors — the typed read-path (WP-37) is the ready substrate. |
| CLAUDE.md hard rules | **ALIGNS** | Server-side keys only (Stage 6 constraint), raw-vitals rules restated without dilution, freeze-on-commit explicitly binds AI (§13.5). |

## Findings for the ratification pass (none blocking; all reconciliations or build-time notes)

1. **Decision contracts don't exist as code artefacts yet.** §6.2 says candidate decisions are
   those "whose contracts are explicitly declared substitutable (e.g. D4, D5, D11)". Today the
   D-catalogue contracts live in EDS prose; nothing in `packages/engine` declares a decision's
   input/output schema as a first-class object. This is the first engineering prerequisite of
   Seam 1 — built in the WP-60 seam work (below), not a document conflict.
2. **§16 vs the D1 recency rule (C9 future).** When Perception (C9) produces capability
   estimates, `estimation.js`'s measured-path confidence (recency-based, can reach 'high')
   must not apply unmodified to AI-derived assessments — their confidence must come from
   field-test reliability per §16/Art 13. Record as a C9 build-time constraint.
3. **§15 labelling needs a design-system class.** Neither app has a visual/semantic class for
   AI-generated prose vs engine verdicts. Should be specified once (both surfaces) before the
   first athlete-facing capability ships.
4. **§18's "the coaching path is never on the meter" is testable** — the seam build should pin
   it: AI wholly unavailable ⇒ plan/reflow/validate outputs byte-identical to AI-absent runs.
5. **Ratification mechanics:** AIGAS enters as a sixth governing document (peer to TAS). Per
   Amendment & Stewardship that is a versioned amendment reconciled across the set — the
   Constitution's Appendix A mapping and the TAS §15 seam text should gain forward-references.
   This review can serve as one panel input; an independent adversarial pass (the
   PANEL-REVIEW.md pattern) is still worth running before freezing.
6. **Appendix B (current realization) will drift quickly** — the open PR queue already
   strengthens its claims (D14 now validates the runtime path, #128; emission honesty,
   #131/#132). Suggest Appendix B be marked living (like the running docs) even once Parts
   I–VI freeze.

## What the codebase already gives AIGAS

The draft's preconditions are further along than its Appendix B records: a 5-call pure API
with a test-enforced boundary; validators that now gate the SHIPPED artefact with injuries in
context (#128); provenance stamps on every output; the typed priors read-path (Seam 2's
landing zone); emitted rationales + diagnosis summaries (the C2 grounding substrate); and the
team roll-up privacy allowlist (the §19 enforcement pattern). Seam 1's harness essentially
exists — what's missing is the contract objects, the orchestration queue, and the provider
client. That is the build (WP-60, next).
