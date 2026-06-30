# The Knowledge Architecture

> **How knowledge exists inside the platform — so that the engine *reasons*, and does
> not *hard-code*.**
> The goal of this document is singular and demanding: adding a new sport, exercise,
> quality, injury, or programming philosophy should require **adding knowledge, not
> editing engine logic.** Everything here exists to make that true and to keep it
> true for a decade.

---

| | |
|---|---|
| **Status** | v1.0 — foundational |
| **Authority** | Subordinate to the [Constitution](CONSTITUTION.md) (esp. Articles 13, 17, 18) and the [Decision Ontology](DECISION-ONTOLOGY.md) (the entities knowledge describes). The canonical home for *how knowledge and data are structured, owned, versioned, and classified*. |
| **Scope** | Platform-wide. The engine-level realisations live in the [EDS](../engine/00-ENGINE-DESIGN-SPECIFICATION.md) Part VII and the existing knowledge modules; this document is the governing model they implement. |
| **Grounding** | Built on the schemas that already exist in code: the evidence knowledge base (`packages/engine/src/lib/knowledge/schema.js`), the Sport Knowledge Base (`.../sportKnowledge/schema.js`, 21 sections, 10 sports authored), the physiological index contract (`.../indices/contract.js`), the exercise library (`.../data/strengthExercises.js`), and the injury subsystem. These are the templates; this document generalises them. |

---

## How to read this document

Five movements:

1. **The first principle** (§1) — knowledge separated from reasoning, and *why* this
   is the load-bearing wall.
2. **The eight kinds of "stuff"** (§2) — *the most important section.* A precise
   taxonomy that classifies every datum in the platform into exactly one of eight
   kinds: Knowledge, Decision Logic, Inference, Calculation, Stored Data, Derived
   Data, Assumption, Prediction. With a classification rule and a worked table. If you
   read one section, read this one.
3. **The anatomy of knowledge** (§3) — the universal knowledge-entry shape,
   registries, and how new knowledge plugs in.
4. **The knowledge domains** (§4) — each domain under a fixed template (Purpose,
   Ownership, Schema, Relationships, Consumers, Versioning, Extensibility, Future AI).
5. **Governance** (§5–§7) — versioning, the "where does this belong?" decision
   framework, privacy, and the consolidated AI roadmap.

---

# 1. The first principle: knowledge is separated from reasoning

> **The engine reasons *from* structured, evidence-tagged knowledge; it does not embed
> knowledge in code. The reasoning core is small and generic; the knowledge is large
> and domain-specific. Adding a sport, a quality, an exercise, an injury, or a
> programming philosophy is a *data* change with zero edits to the reasoning core.**
> (Constitution Article 17.)

This is not an aesthetic preference. It is the difference between a platform that can
grow for ten years and one that calcifies around its first use case. Three reasons:

- **Extensibility.** A system meant to absorb sports, qualities, and philosophies not
  yet imagined cannot require core surgery for each one. Knowledge-as-data means new
  capability is new content.
- **Reviewability.** Sports scientists must be able to author and audit the science
  *without reading code*. Knowledge that lives in an allocator's `if` branches cannot
  be reviewed by the people qualified to judge it.
- **Honesty & evolvability.** Evidence is perishable and contested (Constitution
  Articles 12, 13). Knowledge-as-data carries provenance and confidence and can be
  re-reviewed and versioned; knowledge baked into logic cannot.

The platform already proves this works: the **injury subsystem** stores
contraindications, rehab, and prevention as validated data, with small generic
reasoning over it — and it is the strongest part of the engine. This document
generalises that pattern to *everything*.

The opposite — the anti-pattern this architecture exists to kill — is the **legacy
sport module** (`lib/sports/*.js`): a sport reduced to per-muscle emphasis
multipliers and a priority-exercise list scattered through the allocator. It is the
"lossy shadow" the EDS marks for retirement: knowledge *encoded as logic*, duplicated
against the richer SKB, and impossible to review as science. Every design decision
here is, in part, "do it the SKB way, not the emphasis-vector way."

---

# 2. The eight kinds of "stuff" (the classification that prevents hard-coding)

The platform contains many kinds of "stuff," and the central discipline of this
architecture is that **every datum is exactly one of eight kinds.** Confusing them is
how coaching logic gets hard-coded, how contested science silently gates decisions,
and how derived guesses get mistaken for facts. The brief asks for this distinction;
here it is, made operational.

## 2.1 The eight kinds

| # | Kind | What it is | Lifetime | Carries confidence? | Where it lives |
|---|------|-----------|----------|---------------------|----------------|
| **1** | **Knowledge** | An evidence-tagged domain *fact* the engine reasons from | Versioned, slow-changing, shared by all athletes | **Yes** (evidence + confidence) | Knowledge modules / registries (§4) |
| **2** | **Decision Logic** | The *reasoning* that combines knowledge + state into a coaching answer | Code; changes deliberately | No (it is *the reasoner*) | `decisions/*` (pure functions) |
| **3** | **Inference** | A *judgement* derived by reasoning over uncertain inputs (a diagnosis, a priority) | Ephemeral; recomputed | **Yes** (inherits input confidence) | Output of a Decision |
| **4** | **Calculation** | A *deterministic computation* with a single correct answer given inputs | Ephemeral; recomputed | No (it is exact) | Inside Decisions / utilities |
| **5** | **Stored Data** | A *recorded fact about reality* — what the athlete is/did | Long-lived, per-athlete, private | n/a (it is ground truth) | Athlete State (persisted) |
| **6** | **Derived Data** | Something *computed from* stored data + knowledge | Ephemeral / recomputable | Sometimes (e.g. readiness confidence) | Computed; never stored as truth |
| **7** | **Assumption** | A belief the platform acts on but has *not verified* | Until tested or replaced | **Must be flagged** | Made explicit; ideally retired |
| **8** | **Prediction** | A *forward-looking estimate* about a future state or response | Updated by outcomes | **Yes** (a learned confidence) | Priors / forecasts (Learning) |

The four most-confused pairs, sharpened:

- **Knowledge vs. Assumption.** Knowledge has *evidence and a citation*; an Assumption
  does not. "Added mass harms running economy" (cited) is Knowledge; "this athlete
  logs consistently" (uncited, untested) is an Assumption. The platform's rule:
  *Assumptions must be made explicit and, wherever possible, converted into
  Predictions the learning loop tests, or into Stored Data the athlete confirms.* An
  unstated assumption is a latent bug (Constitution Article 12).
- **Knowledge vs. Prediction.** Knowledge is what is true *in general* (a population
  dose-response curve); a Prediction is an estimate about *this athlete's future*
  (their learned recovery rate). A learned per-athlete prior is a **Prediction with
  confidence, not Knowledge** — a category error the architecture must not make,
  because it would let one athlete's data masquerade as universal science.
- **Inference vs. Calculation.** A Calculation has one correct answer (fractional set
  counting: a squat = 1.0 quad + 0.5 glute — arithmetic). An Inference is a judgement
  under uncertainty (limiting-factor diagnosis) and therefore *carries confidence and
  can be wrong*. Treating an Inference as a Calculation is exactly the ACWR disease:
  dressing a contested judgement as an exact number.
- **Stored vs. Derived Data.** Stored Data is ground truth recorded from reality (the
  athlete did 3×4 @ RPE 7). Derived Data is computed from it (readiness = 62). *Only
  Stored Data is persisted as truth; Derived Data is always recomputable* — which is
  why the Plan itself is Derived, not Stored (Constitution Article 18).

## 2.2 The classification rule (use this on every new datum)

```
   Is it a fact about the world the engine reasons FROM, with a citation?      → KNOWLEDGE
   Is it the code that COMBINES facts + state into a coaching answer?          → DECISION LOGIC
   Is it a JUDGEMENT under uncertainty (could be wrong; needs confidence)?     → INFERENCE
   Is it an EXACT computation (one right answer given inputs)?                  → CALCULATION
   Is it a recorded fact about THIS athlete / what they did?                   → STORED DATA
   Is it COMPUTED from stored data + knowledge, and recomputable?             → DERIVED DATA
   Is it a belief we ACT ON but have NOT verified or cited?                    → ASSUMPTION (flag it!)
   Is it an estimate about a FUTURE state or response?                         → PREDICTION
```

**The governing test for hard-coding** (Constitution Article 17): if you are about to
write something into **Decision Logic** (kind 2) that is really **Knowledge** (kind
1) — a sport's needs, a dose-response, a threshold — *stop*. It belongs in a knowledge
module. Decision Logic should contain only *how to reason*, never *what is true about
a sport, a quality, or an exercise*.

## 2.3 Worked classification (real platform data)

Applying the rule to concrete items, to show the taxonomy bites:

| Datum | Kind | Why |
|---|---|---|
| Per-muscle MEV/MAV/MRV landmarks | **Knowledge** (L5, low confidence) | Cited expert heuristic, shared by all |
| Taper holds intensity, cuts volume | **Knowledge** (L1, high) | Meta-analytic fact |
| `diagnose.limiting-factors` (the function) | **Decision Logic** | The reasoner over demand vs. capability |
| "Your top limiter is reactive strength" | **Inference** (carries confidence) | A judgement under uncertain capability |
| Fractional sets: squat = 1.0 quad + 0.5 glute | **Calculation** | Exact, by the contribution table |
| Limiting-factor gap = importance × (target − current) | **Calculation** *on* **Inference** inputs | The arithmetic is exact; its *inputs* are inferred, so the *output* is an Inference |
| The athlete did 3×4 squat @ RPE 7 on Tuesday | **Stored Data** | Recorded reality |
| Today's readiness score = 62 (amber) | **Derived Data** (with confidence) | Computed from stored vitals + wellness |
| The full 16-week plan | **Derived Data** | Recomputed from state + knowledge; never stored as truth |
| ACWR = 1.4 | **Derived Data**, surfaced as a **reported metric** only | Computed, but low-confidence → may not gate |
| "This athlete recovers ~20% faster than average" | **Prediction** (learned, confidence rising) | A forward estimate about *this* athlete |
| "The athlete logs consistently" | **Assumption** → must be flagged | Acted on, uncited, untested |
| Nordic curl reduces hamstring injury ~51% | **Knowledge** (conditional, moderate) | Cited, but adherence-eroded → tagged conditional |
| The conflict-resolution priority order | **Decision Logic** (constitutional) | How conflicts resolve — reasoning, not a fact |
| "No deep-knee-flexion loading for this injury" | **Knowledge** (contraindication) → becomes a **Constraint** | Cited rule; applied as a bound on construction |

> The table is the architecture in miniature: most of what *looks* like engine cleverness
> is actually **Knowledge** (movable to data) or **Derived Data** (recomputable), and the
> genuinely irreducible **Decision Logic** is small. That ratio — lots of reviewable
> knowledge, a little generic reasoning — is the health metric of this platform.

---

# 3. The anatomy of knowledge

## 3.1 The universal knowledge entry

Every fact in every knowledge module carries provenance and confidence. This already
exists in code (the evidence KB's `validateEntry`) and is made *universal* and
*operative*:

```
KNOWLEDGE ENTRY
  id            stable dotted id, e.g. 'volume.landmarks', 'taper.intensity'
  rule          one-line human statement of the fact
  value         the fact the engine consumes (number | curve | rule | mapping | profile)
  appliesTo     which decisions/domains consume it, e.g. ['dose', 'validation']
  evidenceLevel L1 (meta-analysis / major RCT) … L5 (expert opinion / anatomical logic)
  confidence    high | moderate | low   ← READ BY DECISIONS; governs authority (Article 13)
  source        real citation(s) — NEVER fabricated
  lastReviewed  YYYY-MM-DD — knowledge is perishable; re-checked on a cadence
```

Two non-negotiable rules (both already mandated by the SKB and KB validators):

1. **No fabricated evidence, ever.** Thin evidence is *labelled* (confidence: low,
   evidenceLevel: L5), never invented. A stub is honest; a fake citation is corrupt.
2. **Confidence is operative, not decorative.** The `confidence` field is *read by
   decisions* and maps to an authority tier — **gate / soft input / reported metric**
   (Constitution Article 13). This is the generalised cure for the ACWR defect: the
   engine stops treating a low-confidence ratio with the authority of a
   high-confidence dose-response curve.

## 3.2 Registries: how new knowledge plugs in

Each domain with many interchangeable members (sports, injuries, qualities, exercises,
goal profiles, periodisation models) is a **registry**: a validated lookup from `id →
knowledge object`. Decisions consult the registry, never a specific member.

```
   D2 Demand Resolution
        │ reads
        ▼
   sportRegistry.get(athlete.sport)  →  Sport demand profile
        │
        └─ to add "tennis": author tennis.json (21 sections) + one registry line. Done.
           The decision code does not change.            (Constitution Article 17)
```

Every registry validates its members **on load** (the SKB and KB both ship a
`validateRegistry`): structure, required provenance on authored content, and domain
invariants (e.g. SKB energy-system percentages summing to ~100; physical-quality
importances in 1–10; the privacy sweep). A malformed knowledge file fails fast, at
load, with a precise error — not silently at runtime.

## 3.3 The "add knowledge, not code" test

The architecture is correct only if **the things most likely to be added require
touching the least.** The test, restated as a checklist:

```
   add a SPORT          → author <sport>.json (21 sections) + registry line     ✓ data only
   add a POSITION       → add a positions entry inside that sport               ✓ data only
   add an EXERCISE      → add an entry (pattern, qualities, costs, transfer)     ✓ data only
   add an INJURY        → add a taxonomy entry + contraindication profile        ✓ data only
   add a QUALITY        → add a taxonomy entry + dose-response + assessment       ✓ data only
   add a PROGRAMME PHIL.→ add a periodisation/scheme model                        ✓ data only
   add ENDURANCE PROG.  → add energy-system interventions + dose models           ✓ data only (no new engine)
   add an AI to a step  → substitute a Decision behind its contract               ✓ logic, but bounded by validators
```

If a proposed addition requires editing the reasoning core, that is a signal the core
has knowledge baked into it that should be extracted — *or* a genuine new kind of
reasoning, which is a deliberate, reviewed core change, not a routine one.

---

# 4. The knowledge domains

The platform's knowledge is partitioned into **twelve domains**. This reconciles the
EDS's 9 modules and the brief's 14 (see the [reconciliation](#41-reconciling-the-domain-set)).
Each domain is defined under a fixed template.

## 4.1 Reconciling the domain set

The brief lists 14 candidate domains; some are sub-schemas of others or are *derived
state* rather than knowledge. The canonical set applies the §2 taxonomy and the
"challenge complexity" instruction (Constitution Article 20):

| Brief's candidate | Canonical home | Rationale |
|---|---|---|
| Athlete | **Athlete Knowledge** | Kept (the *modelling rules*, not the athlete's data, which is Stored Data) |
| Sport | **Sport Knowledge (SKB)** | Kept — the anchor domain |
| Position | → folded into **Sport** | The SKB already has a `positions` section; a position is a sub-schema, not a domain |
| Competition | → folded into **Sport** + **Programming** | Season/fixture *structure* is Sport knowledge; taper/peaking is Programming; a specific competition is Stored Data |
| Exercise | **Exercise (Intervention) Knowledge** | Kept |
| Movement | **Movement Knowledge** | Kept (thin: pattern taxonomy + force-velocity vocabulary, shared by Exercise + requirements) |
| Adaptation | **Quality & Adaptation Knowledge** | Merged with qualities (they are one taxonomy: qualities developed by adaptations) |
| Programming | **Programming Knowledge** | Kept |
| Recovery | **Recovery, Fatigue & Load-Response Knowledge** | Merged (one load→fatigue→recovery→readiness system; the Ontology §8 unified them) |
| Fatigue | → merged into the above | Fatigue *knowledge* (decay/recovery models) belongs with recovery; current fatigue is Derived Data |
| Constraint | **Constraint Knowledge** | Kept |
| (Injury) | **Injury Knowledge** | Added — the EDS's exemplar registry; rich enough for its own domain |
| Evidence | **Evidence & Confidence Knowledge** | Kept (cross-cutting meta-knowledge) |
| Validation | **Validation Knowledge** | Kept |
| Learning | **Learning Knowledge** | Kept (the meta-models; produces Predictions/Priors) |

**The twelve:** Athlete · Sport · Quality & Adaptation · Movement · Exercise ·
Programming · Recovery/Fatigue/Load · Constraint · Injury · Evidence & Confidence ·
Validation · Learning.

---

### Domain 1 — Athlete Knowledge
- **Purpose.** The *rules for modelling an athlete*: the athlete-model schema, training-age/competency classification, and how each **Physical Quality**'s **Capability** is estimated from inputs (lifts, history, assessments, or population priors when unmeasured). *Note: this is knowledge about how to model athletes — the athlete's actual data is Stored Data (§2), not knowledge.*
- **Ownership.** Platform (sports scientist + engineer); per-quality estimation methods reviewed with the quality taxonomy.
- **Schema.** Capability-estimation rules per quality (`measured | inferred`, with the formula and confidence); training-age bands; competency gates per movement (the L4 gate).
- **Relationships.** Consumes the **Quality** taxonomy (what to estimate) and **Strength-standard** priors; produces the athlete-model shape the diagnosis reads.
- **Consumers.** D1 (assessment), D4 (diagnosis).
- **Versioning.** Estimation rules versioned with the quality taxonomy; changing how a quality is inferred is a reviewed knowledge edit.
- **Extensibility.** New quality ⇒ add its estimation rule here; new assessment type ⇒ wire it to the relevant capability.
- **Future AI.** AI estimates hard-to-measure capabilities from sparse signals (e.g. inferring reactive strength from logged jump-training history) — proposed as Inference, gated by confidence.

### Domain 2 — Sport Knowledge (the SKB)
- **Purpose.** The structured, evidence-tagged model of *what each sport demands* — the anchor domain and the platform's competitive moat. Replaces re-weighting muscles with reasoning about demand and transfer (Constitution Articles 2, 5).
- **Ownership.** Sports scientists / S&C specialists per sport; privacy and structure enforced by the validator.
- **Schema (real, in code).** 21 sections per `SportProfile`: `meta · physicalProfile` (18 ranked qualities, importance 1–10) `· energySystems` (aerobic/glycolytic/atp-pc, sum ≈100) `· movementProfile · injuryProfile · positions · assessments · developmentPriorities · seasonalModel · microcycles · gymPhilosophy · exerciseLibrary · injuryPreventionLibrary · decisionRules` (machine-readable `trigger{signal,op,value}`+`effect{type,params}`) `· loadManagement · readinessModel · coachDashboard · athleteDashboard · validation · references · kpiFramework`. Every authored recommendation carries provenance; the validator enforces all 21 sections, the hard invariants, and the **privacy rule** (no raw-vital KPI is coach/team-visible).
- **Relationships.** Subsumes **Position** (its `positions` section) and competition/season *structure* (`seasonalModel`, `microcycles`); supplies transfer ratings to **Exercise** selection; supplies `readinessModel` weights to **Recovery**; supplies `decisionRules` to the runtime. Resolves (with Position + Performance Outcome) into a **Demand Profile**.
- **Consumers.** D2 (demand), D3 (position), D8 (week), D11 (selection), D12/D15 (sport-weighted dose/adapt), D1/D16 (assessments/learning).
- **Versioning.** `schemaVersion` per profile; `completeness()` reports how fully each is authored (10 sports today: running sprint/middle/long, cycling, swimming, triathlon, GAA, hurling + rugby/soccer stubs). A scaffold (empty arrays) is valid; authored content must carry provenance.
- **Extensibility.** Add a sport = a JSON file + a registry line, zero core edits. The exemplar of Constitution Article 17.
- **Future AI.** AI drafts a new sport profile from the literature for expert review; AI keeps `decisionRules` current as evidence evolves — always authored as reviewable data, never executed unreviewed.

### Domain 3 — Quality & Adaptation Knowledge
- **Purpose.** The *organising taxonomy of training content* (Constitution Article 5) — the vocabulary the engine decides *what to develop* in. The single most important domain to build (largely absent today: only a 3-value `quality` tag exists on ~25 exercises).
- **Ownership.** Sports scientist; each entry gated on being measurable and dosable (Constitution Article 12 — "no acting on labels").
- **Schema.** Per **Quality**: `id · family · adaptations[] · doseResponse` (with confidence) `· fatigueCost` (neural/metabolic/mechanical) `· recoveryTime · prerequisites[] · assessment` (links to SKB assessments) `· trainabilityNotes · evidence`. Per **Adaptation**: the change, the qualities it develops, its dose-response and recovery character.
- **Relationships.** Read against the **Demand Profile** to find **Limiting Factors**; specifies **Movement Requirements**; drives **Dose** (the dose-response). The shared axis of the Diagnostic Triangle.
- **Consumers.** D5 (priority), D10 (movement), D12 (dose).
- **Versioning.** A quality is *admitted to the taxonomy only when it carries an assessment and a dose-response* — a versioned bar, not a name.
- **Extensibility.** Add a quality ⇒ taxonomy entry + dose-response + assessment. Energy-system qualities are already sketched here, ready for endurance programming.
- **Future AI.** AI proposes dose-response refinements from aggregated outcome data (Domain 12); AI suggests cheap field assessments for hard-to-measure qualities.

### Domain 4 — Movement Knowledge
- **Purpose.** The thin, shared vocabulary of movement: the **Movement Pattern** taxonomy (squat, hinge, lunge, push/pull h/v, carry, core, sport signatures), the force-velocity vocabulary (heavy-slow / light-fast / elastic / isometric), contraction emphasis, and balance pairings (push/pull, bi/unilateral, anterior/posterior).
- **Ownership.** Platform; small and stable.
- **Schema.** Pattern entries with balance pairing; force-velocity and contraction vocabularies; the rules that turn a **Session Objective** + **Demand Profile** into **Movement Requirements** (minus contraindications).
- **Relationships.** Classifies **Exercises**; consumed by the movement-requirements decision and the movement-balance validator. Distinct from **Movement Requirement** (which is Derived Data, not knowledge).
- **Consumers.** D10 (movement requirements), D11 (selection variety), D14 (balance validation).
- **Versioning.** Rarely changes; a new sport-specific movement signature is the main addition.
- **Extensibility.** Add a pattern or a force-velocity descriptor; mostly stable.
- **Future AI.** AI maps a novel sport movement to the closest known pattern + transfer profile.

### Domain 5 — Exercise (Intervention) Knowledge
- **Purpose.** The library of **Interventions** the engine selects from, each described by *what adaptation it drives and at what cost* — so selection optimises transfer-per-fatigue, not muscle-deficit pay-down (Constitution Articles 5, 6).
- **Ownership.** S&C specialist (selection/transfer) + engineer (structure).
- **Schema (real + target).** Today: `id · pattern · equip · level · role · liftKey · axialLoad · cns · quality · stretchBias · unilateral · sportTags · goalTags · loadClass · minLevelForPrimary` (and `muscle` for isolation). **Target additions** (the key gap): primary/secondary **Qualities** and **Adaptations** driven; force-velocity profile; explicit fatigue + joint/neural cost; per-sport transfer rating (the SKB `exerciseLibrary` already has these 1–10); contraindication patterns; the substitution graph (regressions/progressions); fractional **muscle contribution** as the *ledger* input.
- **Relationships.** Classified by **Movement Pattern**; satisfies **Movement Requirements**; drives **Adaptations**; contributes fractional sets to the volume ledger; lives in the exercise registry.
- **Consumers.** D11 (selection), D12 (dose), D14 (equipment/competency/contraindication/axial validators).
- **Versioning.** Adding an exercise is data; re-tagging adaptation/cost is a reviewed knowledge edit (changes selection, so golden-master-checked).
- **Extensibility.** Add an exercise = one entry. The exercise stops being "a thing that adds sets to muscles" and becomes "an intervention that drives an adaptation at a cost."
- **Future AI.** AI proposes adaptation/cost tags for new exercises from description + EMG/biomechanics literature, for expert confirmation.

### Domain 6 — Programming Knowledge
- **Purpose.** How objectives become structure: periodisation models, rep/intensity/tempo/rest **schemes** per quality and phase, **progression** models, **deload/taper** models, and the **session value hierarchy** (the ordering + stopping rule that encodes minimum-effective dosing).
- **Ownership.** S&C specialist; schemes tied to the quality taxonomy.
- **Schema.** Periodisation models (linear/block/undulating/conjugate/in-season-maintenance), selectable by goal/quality (not one fixed style template); scheme tables keyed to `(quality, phase)` (e.g. max strength → low reps/high load/long rest; RFD → low reps/maximal intent/full recovery); progression rules anchored to demonstrated rate of progress; deload = volume *and* intensity down; **taper = volume down, intensity held**; the value hierarchy (primary compound → … → mobility, then *bank*).
- **Relationships.** Consumes **Quality** dose-response and the **Strategy**; subsumes competition **taper/peaking** knowledge; produces the structure of blocks/weeks/sessions.
- **Consumers.** D7 (block), D8 (week), D12 (scheme/dose).
- **Versioning.** Schemes and models are reviewed knowledge; the value hierarchy is near-constitutional (it encodes Article 7) and changes rarely.
- **Extensibility.** Add a periodisation philosophy = a model entry; it becomes available to any goal whose qualities suit it.
- **Future AI.** AI selects/blends periodisation models per athlete from response history; AI tunes progression rates within the learned recoverability ceiling.

### Domain 7 — Recovery, Fatigue & Load-Response Knowledge
- **Purpose.** The model of the **Load → Fatigue → Recovery → Readiness/Recoverability** system (Ontology §8): readiness weights, fatigue decay/recovery times by type, capacity estimation, and state (illness/travel/stress) rules. *Merges the brief's Recovery and Fatigue — they are one system.*
- **Ownership.** Sports scientist (the science) + engineer (the index computation).
- **Schema (real, in code).** The **index contract**: every derived index returns `{ value (0–100|null), confidence (0–1), band (green/amber/red|null), contributors[], missingInputs[] }`. Confidence = `Σ(weight · present · sourceReliability · baselineMaturity) / Σ(weight)` — *missing inputs lower confidence, never block the value* (Constitution Article 13's graceful degradation, in code). Per-source reliability (ecg/chest-strap/finger-ring/wrist-optical/manual) scales confidence, never the value. Readiness blends **subjective wellness ≥ objective** (Saw 2016). Sport-specific weights come from the SKB `readinessModel`.
- **Relationships.** Consumes **Load** (Stored/Derived) and raw vitals (Stored, private); produces **Readiness** and **Recoverability** (Derived Data); fatigue decay models feed scheduling and deload logic; the SKB weights it per sport.
- **Consumers.** D12 (dose sizing), D15 (runtime adaptation/deload), D13 (spacing high-fatigue work).
- **Versioning.** Index weights are reviewed knowledge; the readiness re-weighting (subjective ≥ objective) is a behaviour-changing, golden-master-gated edit.
- **Extensibility.** New signal (e.g. HealthKit metric) ⇒ add it as a weighted contributor; confidence adjusts automatically via the contract.
- **Future AI.** AI personalises readiness weights per athlete (which signals actually predict *their* performance — FR4); AI models individual fatigue decay from response history.

### Domain 8 — Constraint Knowledge
- **Purpose.** How time, equipment, the fixed sport schedule, **Injuries**, **Recoverability**, and technical competency *bound the solution* — and how to compute the constraint box *before* construction (Constitution Article 19).
- **Ownership.** Engineer + S&C (the competency/recoverability bounds).
- **Schema.** Per constraint: its source (athlete/coach), what it *shapes* (which decision) and what re-checks it (which validator), and how it is computed. The mapping of equipment→available exercises, days/duration→session budget, schedule→spacing, injury→contraindicated patterns, recoverability→volume ceiling, competency→exercise gating.
- **Relationships.** Draws on **Injury** knowledge (contraindications), **Recovery** (the recoverability ceiling), and the **Coach**'s schedule; shapes D10/D11/D12/D13; re-checked by **Validation**.
- **Consumers.** Every construction decision; D14 (re-check).
- **Versioning.** Stable; new constraint *kinds* are rare and reviewed.
- **Extensibility.** A new constraint kind (e.g. environmental/heat) = a knowledge entry describing how it shapes and is re-checked.
- **Future AI.** AI infers soft constraints from behaviour (e.g. "this athlete never completes Friday evening sessions" → a learned scheduling constraint, surfaced as a Prediction).

### Domain 9 — Injury Knowledge
- **Purpose.** The taxonomy, contraindication profiles, rehab library, and prevention protocols — the platform's *exemplar* of knowledge-as-data with small generic reasoning (Constitution Article 8).
- **Ownership.** Physiotherapist / S&C; prevention efficacy tagged *conditionally* (real-world adherence erodes trial effects).
- **Schema.** Injury taxonomy entries; per-injury contraindicated **Movement Patterns**/loads by stage; rehab **Interventions**; prevention protocols with evidence; `high_risk → referral` flags (the platform is not a diagnostic tool — Constitution Article 8).
- **Relationships.** Feeds **Constraint** knowledge (contraindications) and **Diagnosis** (injury-risk weighting of limiting factors); supplies rehab/prevention **Interventions** to selection.
- **Consumers.** D4 (risk-weighted diagnosis), D10/D11 (shape selection up front), D14 (contraindication validator).
- **Versioning.** Evidence-tagged; prevention magnitudes re-reviewed as the literature shifts.
- **Extensibility.** Add an injury = a taxonomy entry + profile + (optional) rehab/prevention. Already the model the whole engine should follow.
- **Future AI.** AI triages free-text symptom reports to taxonomy entries (proposing, with a referral bias for high-risk); AI personalises prevention to an athlete's flare-up history.

### Domain 10 — Evidence & Confidence Knowledge
- **Purpose.** The cross-cutting layer attached to *every* entry in *every* domain — and the **evidence→authority mapping** that decides whether a confidence tier may gate, inform, or only display (Constitution Article 13).
- **Ownership.** Platform (a governance role); the mapping is itself a reviewed knowledge entry, not a hard-coded constant.
- **Schema.** The evidence scale (L1–L5) with default authorities; the confidence summary (high/moderate/low or 0–1); the three authority tiers (gate | soft input | reported metric); how confidence composes up the decision graph. *The exact composition of confidence across chained decisions is a modelling simplification and an acknowledged open problem (uncertainties may be correlated; scalar multiplication is a convenience, not a proof — EDS Q1/Q8). Until validated, composition is treated conservatively: a chain is no more confident than its weakest link.*
- **Relationships.** Attached to all **Knowledge**; consulted by all **Decisions** to set authority; the source of margin-widening under uncertainty.
- **Consumers.** Every decision; **Validation** (validator authority); the athlete-facing "how sure we are."
- **Versioning.** The evidence→authority mapping is dated and reviewed — *governance must be visible* (Constitution Article 13). Changing what L3 may do is a reviewed act.
- **Extensibility.** New evidence kinds or a new authority tier = a mapping edit, reviewed.
- **Future AI.** AI flags knowledge whose `lastReviewed` is stale or whose cited evidence has been superseded — a knowledge-freshness watchdog.

### Domain 11 — Validation Knowledge
- **Purpose.** The validators, their thresholds, and the **conflict-resolution priority order** — the separable safety layer every construction path (including a future AI) must pass (Constitution Article 19).
- **Ownership.** Engineer + S&C (thresholds); the priority order is constitutional.
- **Schema.** Per validator: what it checks, its `pass | trim | veto` action, its authority (gate vs. soft), its confidence. The validator suite (recoverability, sport-compatibility, movement balance, joint/spinal/neural loading, MRV ceiling, equipment, duration honesty, constraint compliance, competency, contraindication, scientific consistency, purpose coherence, lawfulness). The conflict order (Safety & Law > Sport > Recoverability > Athlete intent > Objective > Optimisation).
- **Relationships.** Reads **Recovery**, **Sport**, **Injury**, **Constraint**, the volume ledger, and the Engine Laws; emits the validation report consumed by explanation and no-silent-debt (Constitution Articles 14, 15).
- **Consumers.** D14; the runtime; an AI proposer (as its gate).
- **Versioning.** Thresholds are reviewed knowledge; the priority order changes only by constitutional amendment.
- **Extensibility.** Add a validator = a pure check + an authority tier; it composes into the suite.
- **Future AI.** AI proposes *new* validators by spotting recurring unsafe patterns in outcome data — but validators, once added, run deterministically; AI never *is* a validator.
  > **The AI-confidence caveat (a panel-review addition).** An AI's *self-reported*
  > confidence is never trusted — a language model is fluently certain about
  > everything (Constitution Article 13's warning, sharpened for AI). An AI-proposed
  > decision earns confidence only from (a) passing the deterministic **Validation**
  > suite and (b) its observed track record over time (Domain 12), never from the
  > model asserting it is sure. And *how* an AI proposal is bounded beyond the
  > validators — the contract each substitutable decision must honour, and its eval
  > harness — is itself an open problem (EDS Q8), recorded here rather than hidden.

### Domain 12 — Learning Knowledge
- **Purpose.** The meta-models that convert **Training Outcomes** into **Predictions** (Priors) at three tiers, and that validate the engine's own diagnoses as hypotheses (Constitution Articles 12, 16). Produces the only data that legitimately personalises the pure core — via priors it *reads*, never by mutation (Constitution Article 18).
- **Ownership.** ML/engineer + sports scientist (what to learn, at what rate).
- **Schema.** Per learnable quantity (recovery rate, volume tolerance, dose-response, readiness baseline, adherence pattern, injury susceptibility): its three tiers (population/sport/athlete), learning rate, shrinkage/Bayesian update rule, and a *learned confidence*. The diagnosis-validation model (did developing the priority quality move the Performance Outcome?).
- **Relationships.** Consumes **Training Outcomes** and **Overrides**; produces **Priors** (Predictions) read by D1/D4/D7/D12 on the *next* loop; aggregates to sport/population tiers *privacy-preservingly* (derived only, raw vitals never — Constitution Article 11).
- **Consumers.** The next planning loop (as typed priors); the platform's research instrument.
- **Versioning.** Learning rates and update rules are reviewed; population/sport priors become *data-driven* over time but remain Knowledge (shared), while athlete priors are Predictions in Athlete State.
- **Extensibility.** A new learnable quantity = a meta-model entry + a prior the relevant decision reads (population default from day one, so the seam is alive — Constitution Article 16).
- **Future AI.** The richest AI surface: per-athlete dose-response (FR1), real-world prevention efficacy (FR2), transfer validation (FR3), readiness-signal value (FR4), diagnosis validation (FR5) — all as Predictions with confidence, never as unaudited universal Knowledge.

---

# 5. Versioning & governance of knowledge

Knowledge is perishable, contested, and consequential, so it is governed like the
asset it is:

- **Provenance on everything.** Every entry carries `evidenceLevel`, `source`,
  `confidence`, `lastReviewed`. No fabrication; thin evidence is labelled, not
  invented.
- **Review cadence.** `lastReviewed` is real: knowledge is re-checked on a schedule;
  stale entries are flagged (Domain 10's future watchdog). Superseded science is a
  reviewed edit, not a silent overwrite.
- **Validators at the boundary.** Every registry validates members on load
  (structure, provenance-where-authored, domain invariants, privacy). Malformed
  knowledge fails fast with a precise error.
- **Change is data review, not code review.** Changing a threshold or a dose-response
  is a *reviewed knowledge edit* with its own change log — not a number buried in an
  allocator. Behaviour-changing edits are golden-master-gated (the determinism
  guarantee, Constitution Article 18).
- **Governance is visible.** The evidence→authority mapping (Domain 10) is itself a
  dated, reviewed knowledge entry. *Who decided L3 is "soft input"* is answerable.

---

# 6. The "where does this belong?" decision framework

The brief's recurring questions, turned into a checklist every contributor runs
*before* writing anything. (This operationalises Constitution Articles 17 and 20.)

```
   Should this exist at all?            If it can't trace to "the one question", cut it.   (Article 1)
   Can it be DATA?                      If it's a domain fact, it's Knowledge — not code.  (Article 17, §2)
   Can it be KNOWLEDGE (cited)?         If yes, give it provenance + confidence.           (§3.1)
   Can it be INFERENCE?                 A judgement under uncertainty → a Decision output, with confidence.
   Can it be CALCULATION?               One right answer → a pure utility, no confidence.
   Is it really an ASSUMPTION?          Flag it; convert to a tested Prediction or confirmed Stored Data. (Article 12)
   Should it be CONFIGURABLE?           A reviewed knowledge value, versioned — not a magic literal.
   Should it be IMMUTABLE?              Only if it's constitutional (a Law, the value hierarchy, the conflict order).
   Should it be COACH-configurable?     Only via Override at a decision boundary; recorded + learned.  (Article 10)
   Should it be ATHLETE-specific?       Then it's a Prediction/Prior, learned — not universal Knowledge.  (Article 16)
   Should it EVOLVE through learning?   Then reserve a prior seam now (population default), even if learning is later. (Article 16)
```

Two anchoring rules:

- **Default to data.** When unsure whether something is Knowledge or Decision Logic,
  it is almost always Knowledge. Logic should be small and generic.
- **Default to athlete-specific *aspiration*, population-prior *reality*.** Reason from
  population priors on day one; let the learning loop earn personalisation. Never
  assert bespoke knowledge you have not learned (Constitution Articles 12, 16).

---

# 7. Privacy, knowledge, and the cross-person boundary

Knowledge is shared by all athletes; athlete *data* is private. The boundary between
them is also the privacy boundary (Constitution Article 11):

- **Knowledge** (all twelve domains) is platform-owned, versioned, and shared — it
  contains no athlete data and crosses every boundary freely.
- **Stored Data** (raw vitals especially) is athlete-owned and **never crosses a
  person boundary**. The SKB validator *fails the build* if a raw-vital KPI is flagged
  coach/team-visible (`RAW_VITALS` set in code).
- **Derived Data** (readiness, load state) *may* cross to a coach — it is computed from
  raw vitals but contains none of them. This roll-up is the only path across the
  boundary.
- **Predictions/Priors** at the **athlete tier** are private (Athlete State); at the
  **sport/population tier** they are Knowledge, and may be aggregated *only*
  privacy-preservingly (derived signals, never raw — the condition on the platform's
  research value, FR1–FR5).

```
   PLATFORM KNOWLEDGE (shared)  ─── crosses every boundary ───▶ all athletes, coaches, AI
   DERIVED DATA (readiness, load) ── rolls UP ──▶ the coach (Team)        ✓ derived only
   STORED DATA (raw vitals, notes) ── NEVER crosses ──✗  (validator fails the build)
   ATHLETE-TIER PRIORS ── private; aggregate to sport/population ONLY as derived ──▶ Knowledge
```

---

# 8. What this architecture deliberately decided (vs. the brief and the EDS)

1. **Twelve domains, not fourteen** — Position and Competition folded into Sport;
   Recovery and Fatigue merged into one load-response system; Injury and Evidence &
   Confidence added as first-class. Complexity challenged per Constitution Article 20.
2. **The eight-kind taxonomy** (§2) — the brief's three-way split (Knowledge/Decision
   Logic/Inference/Calculation/Stored/Derived/Assumption/Prediction) made into eight
   classes with a classification rule, because *Assumption* and *Prediction* were the
   missing distinctions that let guesses masquerade as facts.
3. **Learned priors are Predictions, not Knowledge** — an explicit category boundary
   that stops one athlete's data from becoming universal science.
4. **Grounded in real schemas** — the SKB 21-section contract, the evidence-KB entry,
   and the index contract are cited as the templates the architecture generalises,
   not invented anew.
5. **The legacy emphasis vector named as the anti-pattern** — knowledge-encoded-as-
   logic, marked for retirement, as the concrete foil for every "data, not code"
   decision.

---

*— End of the Knowledge Architecture v1.0 —*
