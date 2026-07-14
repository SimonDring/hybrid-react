# AI Governance & Architecture Specification (AIGAS)

*The constitutional role of artificial intelligence within the platform.*

| | |
|---|---|
| **Status** | v1.1 — governing AI architecture specification · RATIFIED 2026-07-13 into the frozen set as the sixth governing document (Amendment & Stewardship; ratification record: the 2026-07 amendment batch) · Parts I–VI and Appendix A frozen; Appendix B is living |
| **Authority** | Subordinate to the four governing documents: the [Constitution](../foundation/CONSTITUTION.md), the [EDS](../engine/00-ENGINE-DESIGN-SPECIFICATION.md), the [Decision Ontology](../foundation/DECISION-ONTOLOGY.md), and the [Knowledge Architecture](../foundation/KNOWLEDGE-ARCHITECTURE.md). Peer to the [TAS](TAS.md): the TAS defines *where* AI attaches to the software; this document defines *what AI is allowed to be* and the standards every AI capability must satisfy. Where this document conflicts with a governing document, the governing document wins and this one is corrected. Where it conflicts with the TAS, both are reconciled against the governing documents. |
| **Scope** | Platform-wide and permanent: every AI capability — present or future, athlete-facing or coach-facing, online or offline, from any provider — is validated against this document before it is built. |
| **Audience** | Principal architects, AI engineers, S&C coaches, sports scientists, performance directors, and executive leadership. Written to be legible to all six. |
| **What this is not** | Not an implementation guide, not a prompt, not an API-integration document, and not a product roadmap. It defines the *constitutional role* of AI; per-capability contracts, eval harnesses, and provider integrations are specified when each capability is built — and validated against this document. |
| **Traceability** | Every normative statement traces to a governing-document clause. The mapping is [Appendix A](#appendix-a--traceability-matrix). A statement with no trace does not belong here. |

---

## The central principle

> **The deterministic coaching engine makes coaching decisions.
> AI interprets, communicates, analyses and augments those decisions.
> AI does not replace the coach, and it does not replace the decision engine.**

Everything in this document is an elaboration, boundary, or enforcement mechanism for that single principle. If a future proposal cannot be reconciled with it, the proposal is wrong — not the principle (Constitution, Amendment & Stewardship: the Article is not bent to fit the code).

---

# Part I — Constitutional position

## §1 · Purpose and authority

The platform is an **evidence-based coaching decision engine** (EDS §1) — not a workout generator and not an "AI app". Its atomic unit is the coaching **Decision**: an explicit, inspectable reasoning step (Decision Ontology, Family VII), produced by a pure, deterministic reasoning core (Constitution Art 18) from versioned knowledge (Art 17), gated by independent validators (Art 19), explained in plain English with its evidence and confidence (Art 14), and always overridable by a human (Art 10).

AI will become one of the platform's most valuable layers. Precisely because it is valuable — fluent, fast, persuasive, and improving every year — it is also the layer most capable of quietly eroding the properties above. A language model can produce a plausible training plan in seconds; it cannot produce the *same* plan twice, cannot cite the evidence level of its choices, cannot be golden-master tested, and is fluently certain about everything (Knowledge Architecture, Domain 11). An architecture that let AI drift into the decision path would trade the platform's most valuable property — determinism (Art 18) — for convenience.

This document therefore does for AI what the Constitution does for coaching: it fixes the principles before the capabilities arrive, so that every future AI feature is built *into* a defined role rather than negotiating a new one.

## §2 · The role of AI within the platform

AI is the platform's **augmentation layer**. Its constitutional role has four verbs, and only four:

1. **Interpret** — turn unstructured human input (free text, conversation, documents, and in future images or video) into the structured entities the Decision Ontology defines, so the deterministic engine can reason over them.
2. **Communicate** — turn the engine's structured outputs (decisions, traces, rationales, confidence) into language, tone, and format suited to the reader: a busy athlete, a non-specialist coach, a sports scientist.
3. **Analyse** — read across the engine's outputs and the platform's derived signals to surface patterns, summaries, and questions a human should look at; and, off the request path, contribute candidate knowledge and predictions to the learning systems.
4. **Augment** — propose alternatives for specific, contract-bounded decisions, which the deterministic validators accept or reject (Constitution Arts 18–19). AI proposes; it never disposes.

What AI is **not**: it is not the coach, not the engine, not the source of truth, not the safety layer, and not the memory of the platform. Those roles are already taken — by the human (Art 10), the pure engine (Art 18), versioned knowledge and stored athlete data (Art 17; Knowledge Architecture §2.1), the deterministic validator suite (Art 19), and the persistence layer respectively.

## §3 · The relationship between AI and the deterministic coaching engine

The relationship is asymmetric by design and must remain so:

- **The engine runs without AI; AI never runs without the engine.** Every coaching output the platform ships is produced, or gated, by the deterministic path. AI unavailability degrades tone and convenience, never coaching correctness (§9).
- **The engine is upstream of AI for communication, and downstream of nothing.** When AI explains a plan, the plan came from the engine. When AI proposes a plan element, the proposal goes *into* the engine's validation layer (D14) before it can appear anywhere an athlete or coach acts on it.
- **AI outputs earn standing only through deterministic checks.** An AI proposal that passes validation becomes a validated artefact or a prior; one that fails leaves the deterministic result standing. The AI never gets the last word (TAS §5.13).

### §3.1 · Why coaching decisions remain deterministic

This is the load-bearing argument of the whole document, and it is worth stating in full. Coaching decisions remain the exclusive product of the deterministic engine because determinism is what makes the platform:

- **Testable.** `decision(knowledge, athleteState) → output` is a pure function; the same inputs always produce identical output, so a golden-master across an archetype matrix catches any unintended behaviour change (EDS P12; TAS §13). A stochastic decision-maker cannot be regression-tested this way; every model update would be an untested change to every athlete's programme.
- **Reproducible and auditable.** Any recommendation ever shipped can be replayed by pinning its provenance stamp (`engineVersion × knowledgeSetVersion`, TAS §5.12). When an athlete gets injured, or a coach challenges a prescription, the platform can show exactly what it decided, from what inputs, under which knowledge version. "The model said so" is not an audit trail.
- **Explainable with real reasons.** The engine's rationale is the *actual* causal chain of the decision — the trace of D1–D16 (Art 14; EDS L11). A language model's explanation of its own output is a plausible narrative, not a causal record; presenting it as the reason for a coaching decision would be a fabricated explanation, which Article 14 prohibits in substance.
- **Safe to change.** Behaviour shifts only through versioned knowledge, versioned engine code, or versioned priors (Art 18; TAS §10) — each attributable, reviewable, and reversible. A model swap or provider fine-tune must never be able to silently change what an athlete is told to lift.
- **Accountable.** Athlete safety and availability override optimisation (Art 8), recoverability is a ceiling (Art 9), and the priority order when principles conflict starts with Safety & Law (Constitution, conflict-resolution order). Enforcing hard guarantees requires logic that behaves identically every time it runs. Probabilistic systems cannot *guarantee*; they can only usually comply.

None of these arguments weaken as models improve. A model ten times more capable is still non-deterministic, still unable to carry an evidence level for each internal step, and still fluent when wrong. Capability growth expands what AI may *propose and explain* (§15, TAS §15); it never changes *who decides*.

## §4 · Reasoning, explanation, communication, decision-making — four distinct acts

Much confusion about "AI coaching" comes from collapsing four different acts into one word, "intelligence". The platform keeps them distinct, and assigns each an owner:

| Act | Definition | Owner | AI's involvement |
|---|---|---|---|
| **Decision-making** | Selecting the intervention, dose, schedule, or adaptation target that an athlete will act on — steps D1–D16 of the decision graph | **The deterministic engine**, gated by D14 validation; the human holds final authority (Art 10) | Bounded proposal only, behind a decision contract, validated deterministically (§6.2) |
| **Reasoning** | Deriving structured conclusions from structured inputs under stated rules and evidence | The engine, for anything an athlete acts on; AI may reason **off the critical path** — in analysis, research, and learning — where its conclusions become *hypotheses, priors, or drafts*, never live decisions | Permitted off-path; outputs enter the platform only through validation, human review, or the priors channel (§22) |
| **Explanation** | Stating what was decided, why, on what evidence, and how sure — the content of Article 14 | The engine's **explain read-model over the decision trace** (TAS §4.1, §11). The trace is the ground truth of "why" | AI renders the trace into audience-appropriate prose. It may rephrase the trace; it may not extend, embellish, or contradict it (§7) |
| **Communication** | Tone, register, language, format, timing, and conversation — meeting the human where they are | Shared: surfaces render; AI converses | AI's most natural home. Free rein on *form*, zero authority over *content* of decisions |

The rule that falls out of this table, and is used throughout the document: **AI owns form; the engine owns content; the human owns the final call.**

## §5 · Why AI must never become the source of truth

The platform recognises exactly three kinds of ground truth (Knowledge Architecture §2.1): **Knowledge** (evidence-tagged, versioned domain facts with real citations), **Stored Data** (recorded facts about reality — what the athlete actually did, reported, and measured), and the **decision trace** (what the engine actually decided and why). Everything else is derived and recomputable.

AI output is none of these. It is, in the Knowledge Architecture's own taxonomy, at best an **Inference**, an **Assumption**, or a **Prediction** — each of which carries confidence, can be wrong, and must be flagged as such. Therefore:

- **AI-generated text is never written into Knowledge without human scientific review** (§23). A model can draft a knowledge entry; only a human review can promote it, and its `source` field must cite real evidence — never the model itself. Fabricated citations are a firing offence for a knowledge entry (Knowledge Architecture §3.1: sources are "NEVER fabricated").
- **AI output is never stored as athlete truth.** Summaries, explanations, and chat responses are derived artefacts: cacheable, regenerable, discardable. If an AI extraction of user input is saved (§25), it is saved as structured data *confirmed by the user or validated by schema*, provenance-marked as AI-extracted.
- **AI never overwrites the decision trace.** The trace is the engine's own record; an AI narrative about a decision is a rendering of the trace, stored (if at all) as presentation-layer cache.
- **Plans remain derived, never stored as truth** (Art 18; TAS §7) — which structurally prevents an AI-proposed plan from becoming an unreviewable fait accompli. A validated AI proposal is cached as a *validated artefact* with full provenance, and can always be recomputed away.

The test for any future design: *if every AI output in the system were deleted tonight, would any coaching decision, athlete record, or knowledge entry be lost or changed?* The answer must always be no.

---

# Part II — The architectural boundary

## §6 · The boundary between AI services and the core decision engine

The TAS places all AI outside the pure core: the engine (L1) performs **no I/O, holds no state, and reads no network** — and AI is remote, slow, and non-deterministic, so "it cannot sit inline in the pure pass" (TAS §3.3). AI capabilities are **L3-orchestrated services** — invoked by the orchestration layer, off the synchronous critical path, server-side.

```
        ATHLETE / COACH (final authority — Art 10)
              │ free text, conversation            ▲ prose, rendered plans, answers
              ▼                                    │
 ┌──────────  AI AUGMENTATION LAYER  ─────────────────────────────┐
 │  interpret · communicate · analyse · augment                   │
 │  stateless per call · provider-abstracted (§8) · server-side   │
 └───────┬──────────────────────────────────▲─────────────────────┘
         │ structured entities,             │ typed artefacts, decision traces,
         │ bounded proposals                │ derived signals — STRUCTURED OUTPUTS ONLY
         ▼                                  │
 ┌──────  L3 ORCHESTRATION  ────────────────┴─────────────────────┐
 │  injects state + knowledge → invokes L1 → runs AI substitution │
 │  OFF the critical path → persists traces (TAS §4.3, §5.13)     │
 └───────┬──────────────────────────────────▲─────────────────────┘
         ▼                                  │
 ┌──────  L1 THE ENGINE (pure, deterministic)  ───────────────────┐
 │  decision graph D1–D16 → validator suite (D14) → explain model │
 │  same inputs ⇒ identical output — ALWAYS runs, ALWAYS fallback │
 └────────────────────────────────────────────────────────────────┘
```

Three properties of this boundary are constitutional, not stylistic:

1. **AI is never an inline `await` in the pure synchronous pass** (TAS §5.13). The deterministic path always produces a result first; AI proposals arrive asynchronously and, if validated, take effect on a *subsequent* pass.
2. **Everything crossing the boundary in either direction is typed and schema-validated.** Downward: ontology entities and contract-shaped proposals. Upward: the engine's typed artefacts. Free text never crosses into the engine; raw model output never crosses out to a surface unlabelled (§15).
3. **Credentials live server-side only** (Art 11 discipline; TAS §5.13). No model API key ever ships in a client.

### §6.1 · AI consumes structured outputs, not raw business logic

AI capabilities read the engine's **public artefacts**, never its internals:

- The typed outputs of the public API — `Plan`, `AdaptedWeek`, `Readiness`, `Load`, `ValidationReport`, `CoachVisibleStatus` (TAS §4.1);
- The **decision trace** — rationale and confidence per decision, the canonical "why";
- Derived signals and their plain-English verdict layer (readiness/load verdicts, load decisions, deload recommendations, diagnosis and priority outputs — each already carrying `rationale` and `confidence` fields);
- Versioned **L2 knowledge**, read-only, for grounding explanations in the same facts the engine used.

AI capabilities do **not** receive: engine source code as context for decision emulation, unexported intermediate state, raw business-logic thresholds to "reason with", or any data the reader of the AI's output would not themselves be authorised to see (§19). The reason is invariance: the engine's internals may be refactored freely under golden-master protection precisely because nothing outside L1 — including every prompt in the AI layer — depends on them. An AI layer prompted with business logic becomes a shadow implementation of the engine: unversioned, untestable, and instantly divergent. Structured outputs are the contract; the contract is the *only* thing AI may know.

### §6.2 · The two seams — the only entry points for AI

All AI capability, present and future, enters the architecture through exactly two seams (TAS §15). No third path may be created without amending this document and the TAS together.

**Seam 1 — Decision substitution** (TAS §5.13; Constitution Art 18). AI augments or replaces a *specific decision* behind that decision's contract — never the graph. Candidate decisions are those whose contracts are explicitly declared substitutable (e.g. D4 Limiting-Factor Diagnosis, D5 Priority-Quality Selection, D11 Intervention Selection). The invariant sequence: the deterministic engine always runs and is always the fallback → L3 enqueues an AI proposal asynchronously → the deterministic validators (D14) gate it → a passing proposal is cached as a validated artefact or captured as a prior; a failing one leaves the deterministic result standing. Per-decision proposal contracts and eval harnesses are specified when each substitution is built (EDS Q8 — recorded, not hidden), and each requires its own review before going live.

**Seam 2 — Knowledge and priors** (TAS §6, §10, §15). AI contributes *inputs the engine reads*: drafted L2 knowledge entries (gated by human scientific review, §23) and predictions or priors via the L5 learning layer (gated by prior validation and staging, §22). The engine's behaviour shifts only via versioned priors and knowledge it reads — never by in-place mutation (Art 18).

Everything user-visible that AI does — explanation, conversation, summarisation — sits *outside* both seams entirely: it renders engine outputs and never feeds anything back into the decision path at all.

Precisely: the two seams bound every path by which AI may *influence a coaching decision*. Capabilities that produce inputs upstream of the engine (C1 extraction as user-confirmed structured state; C9 perception as assessments with field-tested reliability, §11) and capabilities that render engine outputs downstream (C2–C4) sit outside both seams and are governed by their category gates (§11), not by seam contracts. A capability becomes seam-bound the moment its output would alter a decision without passing through validated substitution (Seam 1) or versioned knowledge and priors (Seam 2). There is no fourth route.

## §7 · Explainability requirements

Article 14 binds AI exactly as it binds the engine, with three additional obligations that arise because AI generates language:

1. **Ground every explanatory claim in the trace or in knowledge.** An AI explanation of a decision must be derivable from the decision trace, the cited knowledge entries, or the athlete's own visible data. If the trace does not contain a reason, the AI must not invent one. "I don't have the reasoning for that" is a compliant answer; a confabulated mechanism is not.
2. **Preserve the engine's honesty markers.** Confidence qualifiers, low-confidence hypothesis framing (Art 5), surfaced truncations and debts (Art 15), and validator vetoes must survive translation into prose. An AI rendering that upgrades "low-confidence hypothesis" to confident assertion violates Articles 13 and 15 *in the athlete's ear*, whatever the trace says.
3. **Explain at the reader's level without changing the substance.** The same trace may be rendered for an athlete ("we've eased this week because your recovery has been trending down") and for a sports scientist (ACWR values, confidence tiers, evidence levels). Register may vary; facts, uncertainty, and caveats may not.

Explainability of the AI layer itself: every AI capability must be able to answer, for any output it produced, *which inputs it was given, which model and prompt version produced it, and what it was grounded in* (§20). An AI feature whose outputs cannot be reconstructed to that standard does not ship.

## §8 · Model abstraction and provider independence

The platform binds to **capabilities, not providers**. Requirements:

- **A single internal AI service interface.** All AI calls go through a platform-owned abstraction that expresses tasks in platform terms (task class, input artefacts, output schema, latency class, cost tier). No feature code, prompt, or schema names a provider or model directly.
- **Models are configuration, not code** (Knowledge Architecture discipline applied to AI): the mapping from task class to model/provider is versioned operational configuration (TAS §9), changeable without touching feature code — and *swapping a model is a change that must be evaluated*, because model behaviour is de facto behaviour (§20).
- **Structured output at the boundary.** Every AI task defines its output schema; responses are validated against it before use, so a provider change is absorbed at the adapter, not downstream.
- **No provider-proprietary lock-in in stored artefacts.** Cached AI artefacts carry their provenance (§20) but are stored in platform schemas, replayable against any future model.
- **Degradation-tested independence.** The platform must demonstrably run with any single provider disabled (§9). Provider independence that has never been exercised is a hope, not a property.

This is the same principle as Constitution Art 17 (knowledge is data, not code) applied to intelligence: *which model* is a fact about today's market, not about the architecture.

## §9 · Failure modes and graceful degradation

Because AI sits outside the decision path, its failure is by construction a **degradation of experience, never of coaching**:

| Failure | Behaviour |
|---|---|
| AI service down or slow | The deterministic path serves everything it always serves: plans, reflow, readiness/load, validation, and the trace-derived plain-English verdicts. Conversational and generative surfaces state plainly that the assistant is unavailable (Art 15 — no silent degradation). Nothing coaching-critical waits on a model. |
| AI output fails schema validation | Retry within budget; then discard and fall back to the deterministic rendering. Malformed output never reaches a surface or a store. |
| AI proposal fails D14 validation | The deterministic result stands. The failure is logged with the proposal for the eval record (§20); the athlete never sees the rejected proposal. |
| AI output is plausible but wrong (the dangerous case) | Contained structurally: decision content is engine-owned (§4), explanations are trace-grounded (§7), transparency labelling (§15) marks AI prose as AI, and human authority (§17) means no AI statement is ever the final word. Detected drift in eval metrics or user reports triggers rollback of the model/prompt version — a configuration change (§8). |
| Cost or rate ceiling reached | Proportional-use rules (§18) shed the lowest-value AI work first; the deterministic path is free and untouched. |

The design stance: **the platform must always be excellent with AI switched off, and better with it on.** Any feature whose *correctness* requires a live model call is misdesigned and must be rearchitected so the model contributes form, analysis, or proposals — not correctness.

## §10 · Future extensibility

New AI capabilities must be addable **without changing the deterministic coaching engine** (TAS §15: "none of it requires architectural redesign"). Mechanism:

- A new capability declares its **category** (§11), its **seam** (§6.2) or its position outside both, its input artefacts, output schema, grounding sources, transparency labelling, cost tier, and degradation behaviour — a one-page capability declaration validated against this document.
- If it fits an existing category and seam: build it. L1 is untouched; L2 gains no unreviewed entries; the capability registers in the AI service layer.
- If it needs a **new substitutable decision contract**: that is an engine-adjacent change — the contract is added at the decision boundary under golden-master protection, with its eval harness, per EDS Q8. The decision graph itself does not change.
- If it fits **no category**: this document is amended first (deliberate, versioned, panel-reviewed — Amendment & Stewardship), and only then is the capability built. The absence of a category is a signal to think, not a loophole.

This is how the platform absorbs a decade of model progress — multimodal input, movement analysis from video, reasoning models, agentic research — as *additions at the seams*, while the engine that decides an athlete's training remains the same auditable, deterministic core throughout.

---

# Part III — Capability taxonomy

## §11 · AI capability categories

Every AI capability belongs to exactly one primary category. The category fixes its seam, its gate, and its authority ceiling.

| # | Category | What it does | Enters as | Gated by | Authority ceiling |
|---|---|---|---|---|---|
| C1 | **Extraction** (NLU) | Free text / documents / conversation → ontology entities: goals, constraints, injuries, schedule, session feedback | Structured input to the engine, via L3 | Schema validation + user confirmation for consequential fields (§25) | Provides *inputs*; decides nothing |
| C2 | **Explanation** | Decision traces + knowledge → audience-appropriate prose | Rendering of engine output (no seam) | Trace-grounding (§7); labelling (§15) | Form only; content is the trace |
| C3 | **Conversation** | Dialogue with athletes and coaches: Q&A about their plan, their data, their sport | Rendering + C1 extraction as needed | Grounding in the user's own artefacts; scope rules (§13, §19) | May inform and route; may not prescribe |
| C4 | **Summarisation** | Rolling up histories, check-ins, squad status into digests | Rendering of stored/derived data | Faithfulness to source data; privacy scope (§19) | Descriptive only |
| C5 | **Analysis** | Pattern-surfacing across outcomes, adherence, load; "look at this" flags for humans | Derived, recomputable artefacts; hypotheses | Presented as hypotheses with confidence; never auto-acted | Raises questions; humans and the engine answer them |
| C6 | **Research & knowledge drafting** | Evidence synthesis, literature summarisation, drafting L2 knowledge entries | Seam 2 — drafts for review | Human scientific review; real citations only (§23) | Zero until a human promotes the draft |
| C7 | **Decision proposal** | Alternative diagnosis / prioritisation / selection behind a declared contract | Seam 1 — decision substitution | Deterministic D14 validators + per-decision eval harness (§6.2) | Proposal only; validators dispose |
| C8 | **Prediction & learning** | Response modelling, recovery prediction, personalisation models | Seam 2 — priors via L5 | Prior staging and validation (§22) | Shifts priors the engine reads; never edits plans |
| C9 | **Perception** (future) | Movement analysis from video, wearable-stream interpretation | A new *assessment* producing Capability estimates with confidence | Field-test reliability; confidence tiers (TAS §15) | An input signal, subject to Art 13 like any other |

### §12 · Work appropriate for AI

Everything in C1–C9 within its stated ceiling — and especially the work that is *only* possible with AI: meeting a non-specialist coach in plain language (the Team package's founding promise), letting an athlete describe their life in their own words instead of forms, reading a season of training history into three useful sentences, and drafting knowledge candidates from literature at a pace no small team could match.

### §13 · Work explicitly prohibited from AI decision-making

The following are prohibited absolutely — not "not yet", and not subject to model capability:

1. **Making or modifying any coaching decision outside Seam 1.** No AI may set, alter, reorder, or suppress a plan, session, dose, exercise, schedule, deload, or taper except as a C7 proposal through D14 validation.
2. **Overriding or bypassing the validator suite.** Validators are deterministic and human-authored (Art 19). An AI may not author, tune, or veto a validator, and no AI output may reach an athlete on a path that skips validation where validation applies.
3. **Safety, injury, and medical judgements.** Injury triage gates, contraindication filtering, `high_risk → referral` decisions, and return-to-play logic are deterministic knowledge-driven paths (Knowledge Architecture Domain 9). AI may explain them and may flag concerns *to a human*; it may never clear, diagnose, or downgrade them.
4. **Self-graded confidence.** An AI's self-reported confidence is never trusted and never used as an authority input (Knowledge Architecture Domain 11; §16). Confidence is earned through validation and track record only.
5. **Writing to ground truth.** No unreviewed AI output enters L2 knowledge, athlete Stored Data (beyond user-confirmed C1 extraction), the decision trace, or a committed plan (freeze-on-commit, Art 10 — committed sessions are never rewritten by anyone, including AI).
6. **Crossing the privacy boundary.** No AI capability may read raw vitals on behalf of a coach-facing surface, aggregate across athletes except through the privacy-preserving derived channel, or be used to *infer* what the boundary hides (§19).
7. **Silent operation.** No AI-generated content presented as human- or engine-authored; no AI-driven behaviour change without a versioned, attributable cause (§15, §20).
8. **Impersonating final authority.** AI never tells an athlete or coach that a decision is closed to them. Every recommendation remains overridable (Art 10), and the AI's language must keep that door visibly open.

---

# Part IV — Trust: transparency, confidence, oversight

## §14 · Explainability of AI itself

(Complementing §7, which governs AI explaining the *engine*.) Every AI capability must itself be explainable: what it read, what it produced, under which model and prompt version, and on what grounding. Capabilities whose internal reasoning is opaque (all current LLMs) compensate at the boundary — schema-validated outputs, trace-grounding, and eval harnesses — because the platform's explainability guarantee is architectural, not model-dependent.

## §15 · Transparency requirements

- **Labelling.** AI-generated prose is identifiable as such wherever it appears. Engine-derived verdicts and AI-rendered narratives are visually and semantically distinct classes of content.
- **Provenance on demand.** Any AI output can be traced to its inputs and versions (§20). For decision proposals (C7), the athlete- or coach-visible artefact records that an AI proposal was adopted, and that it passed validation.
- **Honest capability claims.** Surfaces never imply the AI *decided* the training, and never imply human review that did not occur. The platform describes its AI as what this document makes it: an interpreter and assistant over a deterministic coaching engine.
- **No dark degradation.** When AI is off, down, or shed for cost, the surface says so (Art 15). Users must never wonder which mode they are in.

## §16 · Confidence scoring and uncertainty handling

Constitution Art 13 — *confidence governs authority* — extends to AI with a sharpened rule from the Knowledge Architecture (Domain 11): **a language model is fluently certain about everything, so its self-reported confidence is worth nothing.** Consequences:

- An AI proposal's confidence is assigned by the platform from (a) passing the deterministic validation suite and (b) the capability's observed track record over time (Domain 12) — never from the model's own assertion.
- AI-derived signals slot into the same three authority tiers as everything else — *gate / soft input / reported metric* — and no AI-derived signal may occupy the **gate** tier. Gates are reserved for deterministic logic and high-confidence knowledge (Art 13).
- Uncertainty must survive rendering (§7): where the engine says "low-confidence hypothesis", the athlete hears a hypothesis, in plain words.
- Where an AI capability cannot ground an answer, the compliant behaviours are: say so, ask, or route to a human. Guessing is not in the option set.

## §17 · Human oversight principles

Article 10 is the ethical floor (Amendment & Stewardship: Title III may be clarified, never weakened). For AI it means:

- **The human hierarchy is unchanged by AI.** The coach (team) or the athlete (individual) is the final decision-maker. AI is subordinate to the engine on content, and the engine is subordinate to the human on authority.
- **Every AI-influenced outcome is overridable at the same contract boundary as any engine decision**, and overrides are captured as durable athlete state feeding the learning loop — so human disagreement with AI is *data*, not friction.
- **Humans gate the two seams.** Seam 2's knowledge path requires named human scientific review (§23). Seam 1's substitutions require human sign-off per decision contract before a capability goes live, and its eval record remains human-reviewed.
- **Escalation is designed in.** Conversational surfaces (C3) recognise the limits of their scope — medical questions, safety concerns, distress — and route to the human authority rather than improvising past their remit.
- **Oversight has teeth.** Kill-switch per capability, rollback per model/prompt version (§8), and audit trails (§20) exist so a human can stop, revert, and understand any AI behaviour — quickly, and without a deploy.

---

# Part V — Operations: cost, privacy, observability

## §18 · Cost governance

Intelligence is a metered resource; determinism is free. The platform spends AI where it changes an outcome for a human, and nowhere else:

- **Intelligent routing.** Every task class declares a capability floor, and the router assigns the *cheapest model that clears it*. Formatting, extraction, and simple summarisation route to small fast models; long-horizon analysis and C7 proposals may justify frontier or reasoning-class models. Routing lives in versioned configuration (§8), reviewed against observed quality, not vibes.
- **Proportional use of reasoning models.** Extended-reasoning invocations are reserved for tasks where deliberation measurably improves the outcome (complex C5 analysis, C7 proposals, C6 synthesis) — never for conversation-speed rendering. The default reasoning effort is the minimum, raised per task class with evidence.
- **Caching as a first-class principle.** The platform's determinism makes AI unusually cacheable: engine artefacts are stamped (`engineVersion × knowledgeSetVersion` + input state), so an AI rendering keyed on the artefact stamp and prompt version is valid until its inputs change. Identical questions over identical artefacts are answered once. Provider-side prompt caching is exploited for stable system context; platform-side artefact caching prevents the call entirely.
- **Budgets and shedding.** Per-capability and per-tenant budgets with alerting; on breach, shed in reverse value order (ambient/decorative first, direct user requests last), degrading to deterministic renderings (§9). The coaching path costs nothing and is never shed because it is never on the meter.
- **Cost is observable** (§20): spend per capability, per task class, per model, per tenant — so cost governance is a data-driven practice, not an annual panic.

## §19 · Privacy and data governance

Constitution Art 11 — *privacy of raw athlete data is inviolable* — binds AI with no dilution, plus AI-specific rules:

- **The reader's scope is the AI's scope.** An AI call made on behalf of a user may be given only data that user is authorised to see. A coach-facing capability reads the derived, server-side roll-up (`CoachVisibleStatus`) — never raw HRV, sleep, or resting-HR, which never cross a person boundary (Art 11; EDS L13; TEAM-ARCHITECTURE). This is enforced at the orchestration layer that assembles the AI's context, not by prompt instructions — prompts are not a security boundary.
- **No inference around the boundary.** AI must not be used to reconstruct what the boundary hides (e.g. inferring a named player's sleep from adjacent signals for a coach). Capabilities are reviewed for inferential leakage, not just direct access.
- **Minimum necessary context.** AI calls receive the artefacts the task needs — not "the athlete's record". Smaller context is cheaper (§18), safer, and easier to audit.
- **Provider data handling.** AI providers are data processors: no training on platform data, contractual retention limits, and regional processing per the platform's obligations. Athlete data sent for inference is the minimum necessary and is not a licence for provider reuse.
- **Population learning stays derived.** C8/C5 work across athletes uses the privacy-preserving derived channel (TAS §10) — derived signals only, raw vitals never (Art 11).
- **The privacy validator applies to AI context assembly** exactly as it applies to coach surfaces: a build that exposes raw vitals to a coach-scoped AI call fails.

## §20 · Logging, observability, and auditability

Determinism gives the engine replayability; the AI layer must earn the closest achievable equivalent:

- **The AI artefact stamp.** Every AI output is stamped: capability + task class, model id + provider, prompt/template version, input artefact references (with their engine/knowledge stamps), schema version, timestamp, token/cost figures, and validation result where applicable. This extends the platform's provenance discipline (TAS §5.12) across the AI boundary.
- **Reconstructability.** From the stamp, any AI output can be re-run against the same inputs (acknowledging model-side non-determinism) and audited for grounding. "Why did the assistant say that?" must be answerable from stored provenance, not from memory.
- **Decision-relevant AI events are audit-log events**: proposal submitted, validation passed/failed, proposal adopted, prior promoted, knowledge draft promoted, override of an AI-influenced artefact. The coaching audit trail (TAS L4 Audit Log) tells one continuous story with AI in it.
- **Quality is measured, not assumed.** Each capability ships with an eval harness (per-capability, per EDS Q8 for C7) and production quality signals — schema-failure rate, validation-rejection rate, user correction/override rate, grounding violations. Model and prompt versions are promoted and rolled back on these metrics (§8).
- **Cost and latency telemetry** per §18, on the same observability substrate as the rest of the platform (TAS §14).

---

# Part VI — AI in the coaching ecosystem

## §21 · Supporting athletes and coaches

**For the athlete**, AI is the plain-language interface to their own programme: ask why this week eased off and hear the trace in human words; report "slept terribly, knee's a bit sore" in a sentence and have it land as structured state the engine reflows around; get a season summarised honestly, uncertainty included. The athlete's AI experience is *their data, the engine's decisions, their language*.

**For the coach** — explicitly a non-S&C-specialist (the Team package's core user) — AI is the translator between elite methodology and a busy person on a touchline: squad status in plain English over the derived roll-up (never raw vitals, §19), "who needs attention and why" summaries grounded in the engine's verdicts, and conversational access to what the programme is doing to support *their* schedule. AI lowers the expertise barrier to *reading* elite S&C; the engine keeps the S&C itself elite.

For both, the same ceilings: AI informs, explains, and routes; the engine decides; the human disposes.

## §22 · AI and continuous learning — without touching programming logic

The learning architecture (TAS §10) already answers how the platform improves without mutating the engine: **everything learned enters as versioned priors the engine reads on its next pass.** AI plugs into this as a contributor, never as a shortcut:

- AI-assisted analysis of outcomes (C5) and trained predictive models (C8) produce candidate priors and predictions at the athlete, sport, and population tiers — staged, validated, and promoted through the L5 pipeline, never written hot.
- The engine's behaviour shift from any AI contribution is therefore *attributable to a versioned prior change* and explainable to the athlete (Art 16; TAS §10: "no silent change").
- Learning also runs in the other direction: every validation rejection, user correction, and override of AI output is training signal for the AI layer's own track record (§16, §20) — the platform learns about its models the same way it learns about its athletes: from observed response, not from self-report (Art 12, applied to AI).
- Deterministic programming logic — the decision graph, the validators, the dose and progression models — is never edited by a learning process. Improving *it* remains a human engineering act under golden-master protection.

## §23 · AI and the Knowledge Architecture

The Knowledge Architecture makes the platform's knowledge structured, evidence-tagged, versioned, and owned (§1, §3). AI interacts with it in three ways, all subordinate to that structure:

1. **As reader.** AI capabilities ground explanations and conversation in L2 knowledge — the same entries, evidence levels (L1–L5), and confidence the engine used. This keeps AI prose and engine behaviour telling one story.
2. **As drafter (C6).** AI accelerates knowledge authoring: synthesising literature, drafting sport profiles or exercise entries in the canonical schema. Every draft enters the human scientific-review gate; `source` cites real literature (never the model); `evidenceLevel` and `confidence` are assigned by the reviewer. A promoted entry is human-owned knowledge that happened to be AI-drafted — provenance records the drafting, review records the responsibility.
3. **Never as knowledge itself.** Model weights are not a knowledge domain; "the model knows" is not a citation; and no decision may consume model output *as if* it were an L2 entry. The eight-kinds taxonomy (§2.1) classifies AI output as Inference/Assumption/Prediction — confidence-carrying, fallible, flagged.

## §24 · AI and the Decision Ontology

The Decision Ontology is the platform's canonical vocabulary — every entity and relationship the platform reasons about. For AI it serves as **the interlingua**:

- **AI speaks ontology at every boundary.** Extraction (C1) targets ontology entities (Goal, Constraint, Injury, Athlete State, Session feedback → Training Outcome). Explanation (C2/C3) renders ontology-typed artefacts (Decision, Recommendation, Limiting Factor, Priority Quality, Readiness). Proposals (C7) are ontology-shaped by their decision contracts.
- **The ontology bounds what AI can claim.** Terms carry definitions and epistemics: a *Recommendation* bundles rationale and confidence; an *Inference* can be wrong and says so; an *Override* is the human's right. AI prose that uses these words must respect their defined meanings — an AI may not present an *Inference* with the certainty of *Stored Data*.
- **Ontology changes precede AI changes.** If a future AI capability needs a concept the ontology lacks, the ontology is amended first (deliberate, versioned), then the capability is built. AI never mints platform vocabulary ad hoc.

## §25 · Natural language understanding — AI at the front door, the engine at the desk

NLU is where AI most improves the platform, and where the division of labour is cleanest:

```
 "Work's mad this week, I can only train twice,      ┌────────────────────────────┐
  and my knee is still niggling on the stairs."  ──▶ │  C1 EXTRACTION (AI)        │
                                                     │  → Constraint {2 sessions} │
                                                     │  → Injury signal {knee,    │
                                                     │    stairs, ongoing}        │
                                                     └──────────┬─────────────────┘
                                                                │ user confirms; schema-valid
                                                                ▼
                                                     DETERMINISTIC ENGINE reflows the week,
                                                     injury logic filters sessions, validators
                                                     gate the result — same answer every time
                                                                │
                                                                ▼
                                                     C2 EXPLANATION (AI) renders the trace:
                                                     "Two sessions it is — I've kept the ones
                                                      that matter most and taken the knee out
                                                      of loaded flexion."
```

The rules of the front door: extraction targets ontology entities under schema validation (§24); **consequential extractions are confirmed with the user before they become state** ("Just to check — training twice this week, and the knee's still an issue?"); ambiguity is asked about, not resolved by guess (§16); and the extracted structure is what the engine sees — never the raw prose. The engine's determinism is preserved *exactly* because everything upstream of it resolves to structured state: two different phrasings of the same week produce the same `AthleteState`, and therefore the same plan.

## §26 · The long-term vision — augmentation, not replacement

The platform's ambition is an AI-coached experience: a companion that reacts to daily life, adjusts around reality, and speaks like the best coach you ever had. This document is not a brake on that ambition — it is the reason the ambition is achievable *safely*. The end-state the architecture points at:

- an athlete who talks to their programme in natural language, and whose programme visibly listens;
- a coach who reads their whole squad in plain English in ninety seconds;
- a knowledge base growing at literature speed under human scientific ownership;
- an engine that gets quietly, attributably better every month through priors and validated proposals;
- and under all of it, the same pure, deterministic, golden-mastered decision core, making the same defensible decisions for the thousandth athlete as for the first.

As models grow more capable, the *proposals get better, the conversation gets richer, the analysis gets deeper* — and the constitution of the system does not move: **the deterministic coaching engine makes coaching decisions; AI interprets, communicates, analyses and augments those decisions; and a human is always the final authority.** AI does not replace the coach. It does not replace the decision engine. It makes both of them better.

---

## Amendment & stewardship

This document changes the way all governing-tier documents change (Constitution, Amendment & Stewardship): an amendment is proposed in writing with rationale, reviewed against the whole set for consistency, version-bumped and dated, and reconciled across the Constitution, EDS, Ontology, Knowledge Architecture, and TAS in the same change. The prohibitions of §13 derive from Titles III–IV of the Constitution and share their status: they may be clarified, never weakened. Per-capability contracts, eval harnesses, model routing tables, and provider integrations are *living operational material* governed by this document — they evolve freely without amending it, and are validated against it.

---

## Appendix A — Traceability matrix

| AIGAS clause | Traces to |
|---|---|
| Central principle; §2 role of AI; §26 vision | Constitution Arts 4, 10, 18; EDS §1 (decision-engine thesis) |
| §3.1 determinism of coaching decisions | Constitution Art 18; EDS P12, SA9; TAS §13 (golden-master, CI determinism) |
| §4 four acts, engine owns content | Constitution Arts 4, 14; Decision Ontology Family VII (Decision vs Recommendation vs Inference) |
| §5 AI never source of truth | Constitution Arts 15, 17, 18; Knowledge Architecture §2.1 (eight kinds), §3.1 (sources never fabricated) |
| §6 boundary; off critical path; server-side keys | Constitution Art 18; TAS §3.3 (T9), §4.3, §5.13 |
| §6.1 structured outputs only | TAS §4.1 (public API + typed artefacts); Constitution Art 17 |
| §6.2 two seams | Constitution Arts 18, 19; TAS §5.13, §15; EDS E3, SA8, Q8; Knowledge Architecture §3.3 ("add an AI to a step → substitute Decision behind its contract") |
| §7, §14 explainability | Constitution Arts 5, 13, 14, 15; EDS L11; TAS §11 (explain read-model) |
| §8 provider independence | Constitution Arts 17, 20; TAS §9 (configuration separation) |
| §9 graceful degradation | Constitution Arts 15, 18; TAS §5.9 (conservative degradation), §5.13 (deterministic fallback) |
| §10 extensibility without engine change | Constitution Art 20; TAS §15 ("no architectural redesign"); EDS Q8 |
| §11–§13 capability taxonomy + prohibitions | Constitution Arts 8–11, 13–15, 18, 19; Knowledge Architecture Domains 9, 11; TAS §15 (capability table) |
| §15 transparency | Constitution Arts 14, 15 |
| §16 confidence; no self-report; no AI gates | Constitution Art 13 (three authority tiers); Knowledge Architecture Domain 11 (AI-confidence caveat) |
| §17 human oversight | Constitution Art 10 (+ Amendment & Stewardship: Title III never weakened); EDS L10 (freeze-on-commit) |
| §18 cost governance | Constitution Art 20 (complexity must earn its place — applied to spend) |
| §19 privacy | Constitution Art 11; EDS L13; TAS §7 (privacy boundary, server-side rollUp); TEAM-ARCHITECTURE (derived signals only) |
| §20 observability & audit | Constitution Arts 12, 14; TAS §5.12 (provenance stamp), §14 (replay); Knowledge Architecture Domain 12 (track record) |
| §22 learning via priors only | Constitution Arts 12, 16, 18; TAS §10 (two learning systems); EDS §25 |
| §23 knowledge interaction | Constitution Art 17; Knowledge Architecture §1–§4, Domain 10 |
| §24 ontology interlingua | Decision Ontology §1–§9 (entities, epistemics) |
| §25 NLU front door | Constitution Arts 3, 18; Decision Ontology Families II, VI; TAS §7 (①→③ the engine never fetches) |

## Appendix B — Current realization (2026-07)

The body of this document is implementation-agnostic; this appendix maps it to today's stack and is updated as the stack evolves (same convention as TAS Appendix A). Designated LIVING at ratification (2026-07-13): unlike Parts I–VI and Appendix A, this appendix is updated by ordinary edits, not amendment.

- **No AI capability is live.** The virtual physio, AI plan adjustment, and quarterly AI assessment in the app are placeholders. This document precedes and governs their build (Stage 6 of the roadmap).
- **The planned entry point** is a Supabase Edge Function holding the provider API key server-side — satisfying §6's server-side-only rule; no model key ever ships in the browser.
- **The structured outputs AI will consume already exist**: the engine's typed artefacts and signals — `loadDecision` and `deloadRecommendation` (`packages/engine/src/lib/plan/trainingLoad.js`), the readiness/load/fatigue indices (`packages/engine/src/lib/indices/`), diagnosis and priority outputs with per-item `rationale` and `confidence` (`packages/engine/src/lib/performance/diagnose.js`, `prioritise.js`), and the plain-English verdict layer (`apps/mobile/src/lib/verdicts.js`). These are the C2/C3/C5 grounding surface, live today.
- **The deterministic fallback rendering required by §9 already ships**: the verdict layer is the no-AI plain-English experience.
- **The privacy substrate required by §19 is live**: the team spine with RLS-enforced isolation and the derived `player_status` roll-up (raw vitals owner-only) — the only athlete-state surface a coach-scoped AI call may ever read.
- **First capabilities, when built, are expected to be** C2 explanation over decision traces and C1 extraction in onboarding/check-ins — the two lowest-risk categories — each requiring a capability declaration per §10 before implementation.
