# Decision Engine V2 — The Performance & Adaptation Model

**Status: PROPOSAL — working doc (T4) · 2026-07-14 · not canonical; adopted only via DEVELOPMENT-PLAN §5.3**
**Sprint spec: [`docs/superpowers/specs/2026-07-14-decision-engine-v2-design.md`](../../superpowers/specs/2026-07-14-decision-engine-v2-design.md)**

---

## §0 How to read this document

This document specifies the **object the engine is optimising** and the model of
adaptation it optimises it through. Where
[`01-DECISION-HIERARCHY.md`](01-DECISION-HIERARCHY.md) named the altitudes of
judgement and [`02-COACHING-PIPELINE.md`](02-COACHING-PIPELINE.md) fixed the
seventeen stages and their contracts, this document answers three questions the
stages assume but do not themselves define:

- **What is "performance", such that the engine can optimise it?** (§1)
- **In what vocabulary of physical qualities does it reason, and how does that
  vocabulary grow?** (§2)
- **How do the qualities it develops become the sporting outcome it promised —
  and how is that promise measured, falsified, and modulated by who the athlete
  is?** (§3–§6)

It uses the stage IDs of `02` §1.1 **verbatim** (D1–D17) and the coaching-level
names of `01` (Athlete … Iteration). It defines no new stage and no new
structure. It **proposes** the AE-1 additive-extension candidate list — ten new
quality entries under the Ontology §13 lane (§2.4) — and produces the five
**adaptation-class** names
(Primary / Secondary / Supporting / Maintenance / Recovery, §3) that
`05-SESSION-BUILDER.md`, `07-PROGRESSION.md`, and `13-VALIDATION-STRATEGY.md`
cite. Claims about the shipped engine cite the Sprint 2 forensic audit
(`docs/reviews/2026-07-11-engine-audit-01…10`) as facts **as of the audit pin
(`main @ 02f6184`, 2026-07-11)**; where Phase 0 Wave A (PRs #173/#174) altered a
pinned finding, the fix reference is given alongside. Live status lives in
HANDOFF.md, never here.

---

## §1 Performance, not volume — the objective function

### 1.1 What the engine maximises

The Constitution fixes the objective in one line: *"the platform optimises the
athlete's long-term performance in the pursuit they have chosen. Everything
else — volume, exercise selection, session count, adherence, engagement — is
instrumental, never the objective"* (Constitution Art 1). Volume is explicitly
demoted: *"volume is computed as an output and checked as a ceiling — never set
as a target to be filled"* (Art 6). The performance model is therefore the
formal statement of what "better" means, so that every stage optimises the same
thing and no stage can substitute a proxy (the benchmark's P1.1 world-class bar:
no dose, exercise, or structure prescribed before a diagnosis it traces to —
audit `governance-00` P1.1).

The object being maximised is **projected performance in the athlete's chosen
pursuit, over the athlete's development horizon, subject to a hard
recoverability-and-safety ceiling** — never a within-week output quantity. The
engine reasons about performance through the **Diagnostic Triangle** (Ontology
§1.3): a Physical Quality is a shared axis; the athlete sits on one side of it
(**Capability**), the pursuit on the other (**Demand**); the **Limiting Factor**
is the demand-weighted gap between them:

```
limiting-factor gap = demand_importance × (target_level − current_level),
                      adjusted by trainability-now and injury-risk
```

This is the Ontology's own formula (§1.3; Ontology §5, Limiting Factor), and the
Ontology flags it precisely: *"a starting heuristic, not a validated formula;
EDS Q1"* — the coefficients and the weighting shape are **knowledge, not code**
(§2.3 below; commitment C3, `00-ARCHITECTURE.md` §2.3), and the pinned engine's
undocumented near-squaring of the demand term is exactly the class of buried
weighting choice this must retire (SR-02; audit 07). The objective function is
thus a *weighted sum of closable gaps* — not a sum of qualities, and never a sum
of sets.

### 1.2 "Optimise performance", operationalised at each decision

The single objective decomposes into a different concrete question at each stage
it touches. Stating them together is what keeps the four stages coherent — the
audit's warning that a coherent prescription chain *downstream of a bad
diagnosis makes the mis-diagnosis more convincing, not less* (SR-02; audit 07)
is the reason each link must optimise the same object explicitly.

| Stage (02 §1.1) | The objective, made concrete here | Governing Article |
|---|---|---|
| **D4** Limiting-Factor Diagnosis | Rank limiters by the demand-weighted gap; the objective is to **name the gaps whose closure would most raise projected performance**, honest about which are measured vs inferred | Art 5 (diagnosis is the pivot); Art 12 (hypothesis, not finding, when inferred) |
| **D5** Priority-Quality Selection | Choose the few gaps (k = 1–3) whose closure yields **the highest projected performance return per unit of recoverable fatigue**, mutually compatible, trainable now — and park the rest, visibly | Art 7 (focus beats breadth); Art 9 (recoverability ceiling) |
| **D11** Intervention Selection | Pick the minimum set of interventions with **the best transfer-to-target per unit fatigue**, stop when the requirement is served, bank the rest | Art 7 (minimum effective; stopping rule); Art 1 (bank, don't pad) |
| **D12** Dose Assignment | Assign **the smallest dose expected to drive the target adaptation** under the recoverability ceiling; volume falls out as a ledger checked at D14, never a target | Art 6 (adaptation before dose); Art 7 (sufficient *and* minimal) |

The through-line is the term **transfer-per-fatigue**: performance is raised by
closing demand-weighted gaps, every closure costs recoverable fatigue, and
fatigue is the scarcest resource in the plan (benchmark P1.7 — athlete time and
recovery capacity are the plan's scarcest resources; audit `governance-00`
P1.7). D5 spends a *budget* of it across qualities; D11 and D12 spend it within a
session. §3's adaptation classes are the accounting structure for that spend.

### 1.3 Why "not volume" is load-bearing, not rhetorical

At the audit pin the legacy fill path *inverted* this object for whole cohorts:
triathletes, zero-gap run/cycle athletes, and code-less GAA rows received
deficit-fill, hypertrophy-shaped programming with in-season handling reduced to
a volume scalar (B1; audit 04 · SR-06; audit 07 · G6; audit 08 — cohort rescue
landed in Wave A, PR #173). That path is the concrete face of a volume-first
objective, and its retirement is commitment C7 (`00-ARCHITECTURE.md` §2.3;
owners `10`/`11`). The performance model is the positive statement of what
replaces it: one objective, demand-weighted, fatigue-bounded, applied by every
cohort's single selection engine (D11).

---

## §2 The quality vocabulary

### 2.1 What a Physical Quality is, and why the set matters

The engine reasons in **Physical Qualities** — *"the organising primitive of
training content … replaces 'muscle' as the thing the engine reasons about"*
(Ontology §5; Constitution Art 5). A quality is authored as knowledge: id,
family, the Adaptations that develop it, a dose-response model with confidence,
fatigue cost, recovery time, prerequisite qualities, an assessment method, and
trainability constraints (Ontology §5, Physical Quality attributes). The
Ontology's own rule bites here: *"a quality with no assessment and no dose model
is a label, and the platform may not act on labels"* (Ontology §5; Constitution
Art 12).

The quality set is therefore the **spine of the whole triangle**: every demand
is a demand *for* a quality, every capability is capability *of* a quality,
every limiting factor is a gap *on* a quality axis, every adaptation target
*develops* a quality. If a sport-defining demand names a quality the engine's
vocabulary does not contain, that demand cannot be diagnosed, prioritised,
dosed, or measured — it is invisible from D4 onward.

### 2.2 The truncation defect this must resolve

That invisibility is a pinned, HIGH-severity defect. The demand projection
mapped the SKB's authored quality vocabulary onto a fixed downstream set and
**silently discarded the remainder**: *"11 authored SKB qualities dropped
(rugby neck/collision/strength-endurance, hurling grip/rotation, sprint
acceleration, swimmer coordination) — the diagnosis literally cannot see what
makes several sports dangerous or winnable"* (SR-05; audit 07). The gap analysis
records the same, with its clinical detail: the projection carried *"no
`droppedDemands`"* record, so *"a prop's neck (importance 8) and collision demand
can never be diagnosed"* — and one entry, `strengthEndurance`, was *"a PM quality
with no identity mapping — likely a bug"* (B3; audit 04 · G2; audit 08).

Two things must be said precisely about the pin state, per the audit-pin frame:

- The **`strengthEndurance` identity-mapping bug** was a discrete defect —
  `strengthEndurance` is an authored Performance-Model quality
  (`packages/engine/src/data/qualities.js`, as of the pin) whose SKB→PM identity
  mapping was missing, dropping rugby's authored importance-7 demand. It was
  addressed by Phase 0 Wave A (the P0-6 fix,
  `packages/engine/src/data/sportQualityMap.js`).
- The **remaining unmapped vocabulary** is a *breadth* limit, not a bug: the
  downstream Performance-Model set is ten qualities (`maxStrength`,
  `hypertrophy`, `explosiveStrength`, `reactiveStrength`, `strengthEndurance`,
  `aerobicCapacity`, `anaerobicCapacity`, `mobility`, `stability`, `robustness`
  — `qualities.js`, as of the pin), and ten SKB-authored demands have no home in
  it: `sprintSpeed`, `acceleration`, `deceleration`, `changeOfDirection`,
  `coordination`, `rotationalPower`, `gripStrength`, `neckStrength`,
  `collisionRobustness`, `aerialAbility` (`sportQualityMap.js`, as of the pin).

### 2.3 V2 position — the demand vocabulary is *open*, with a migration honesty ledger

V2's position on the quality set is a design commitment, not a size:

> **The demand vocabulary is open.** Any quality a sport module authors is a
> first-class citizen of diagnosis. Where the engine's own quality registry does
> not yet contain a matching entry, the authored demand is **carried, not
> dropped** — recorded in a `droppedDemands` honesty ledger on the D2/D3 demand
> profile, surfaced per Constitution Art 15, and consumed by no diagnosis until
> its registry entry lands.

This has three consequences, each owned by a stage `02` already fixed:

1. **D2 Demand Resolution** carries `droppedDemands` as a **mandatory** field of
   the `DemandProfile` — *"its absence is a contract violation"* (`02` §2.2).
   Silent discard becomes structurally impossible; the projection either homes a
   demand or declares that it could not.
2. **The magnitudes are knowledge.** The gap formula's coefficients, the
   demand-importance weights, the trainability-now and injury-risk adjustments
   are governed knowledge entries under the KA universal entry shape (KA §3.1),
   each with evidence level, confidence, source, and `lastReviewed` — never bare
   literals in the reasoner (Constitution Art 17; commitment C3; the pinned
   `~30 shape literals … at full authority` class, TR-12; audit 06 · SR-07;
   audit 07). Homed in `04-KNOWLEDGE-OWNERSHIP-MAP.md`.
3. **Growth is additive and paired.** A new quality is added by authoring a
   registry entry plus its paired dose-response and assessment knowledge — *"add
   a QUALITY → add a taxonomy entry + dose-response + assessment ✓ data only"*
   (KA §3.3). The pairing rule is the audit's Wave C discipline: *"measure what
   you newly diagnose"* — vocabulary expansion is paired so a newly diagnosable
   quality is also newly measurable, never a label (audit 10 Wave C; Ontology §5).

### 2.4 The governance route — Ontology §13 additive lane, not an amendment

Growing the quality vocabulary is explicitly **not** a frozen-set amendment. A
new Physical Quality is a *new entity inside an existing family* (Family III —
the Diagnostic Core), defined under the fixed template, placed in exactly one
family and one structure, with cardinalities stated and *redefining nothing* —
which is the Ontology's own definition of an **additive extension**: *"a
versioned, dated edit — routine, batchable … by construction it cannot
contradict anything: it only names what was nameless"* (Ontology §13). This is
the resolution `00-ARCHITECTURE.md` §4.1 recorded as **AE-1**: quality-vocabulary
expansion runs through the §13 lane, and **no Amendment Register row is opened
for it** — only *redefining* an existing quality would be structural (Ontology
§13). Ratification of any specific entry belongs to the amendment-batch process
and Simon, never to this set (spec §8).

**Proposed §13 additive entries (candidates — not applied here).** These are the
demands the pinned SKB already authors that have no quality home; this document
proposes them as the AE-1 entry list, each to be authored with its paired
dose-response + assessment knowledge (`04-KNOWLEDGE-OWNERSHIP-MAP.md` homes the
pairs). Quality *families* reuse the existing taxonomy (`qualities.js` families:
strength, power, speed, endurance, aerobic, anaerobic, tissue, control,
durability, structural); no new family is proposed (a new family would be
structural — Ontology §13).

| Proposed quality (id) | Family | Origin demand (audit) | Pairing note (measure-what-you-diagnose) |
|---|---|---|---|
| `sprintSpeed` | speed | sprint / field-sport max-velocity demand (SR-05) | assessment: flying-sprint / max-velocity timing; dose-response: max-velocity exposure |
| `acceleration` | speed | sprint acceleration; field-sport first-step (SR-05; B3) | assessment: short-sprint splits (0–10 m); dose-response: resisted/short accel work |
| `deceleration` | speed/control | change-of-direction sports; injury-relevant braking | assessment: deceleration / braking-force protocol; dose-response: eccentric braking |
| `changeOfDirection` | speed/control | field-sport COD demand (G2) | assessment: COD test (e.g. 505); dose-response: COD mechanics + eccentric base |
| `coordination` | control | swimmer / skill-sport coordination (SR-05) | assessment: sport-specific movement-quality battery; dose-response: skill/motor exposure |
| `rotationalPower` | power | hurling / striking-sport rotation (SR-05; B3) | assessment: rotational medicine-ball / isometric; dose-response: rotational power work |
| `gripStrength` | strength | hurling / grip-dependent sport demand (SR-05; B3) | assessment: dynamometry; dose-response: grip-specific loading |
| `neckStrength` | strength/durability | contact-sport neck demand, importance 8 (B3) | assessment: isometric neck protocol; dose-response: graded neck loading |
| `collisionRobustness` | durability | contact-sport collision tolerance (B3) | assessment: exposure + tissue-tolerance proxies; dose-response: collision-prep progression |
| `aerialAbility` | power/control | rugby / aerial-contest sports (B3) | assessment: jump-and-catch / reach protocol; dose-response: jump + landing skill |

Until an entry lands, its demand rides the `droppedDemands` ledger (§2.3) — seen,
declared, and un-acted-upon — never silently dropped. This is the additive-first
guarantee applied to the vocabulary itself: adding qualities never rewires the
reasoner, and a profile whose demands all already have homes produces a
byte-identical diagnosis (audit 10 Wave C gate).

---

## §3 The five adaptation classes

### 3.1 Why classes at all

D5 selects a few Priority Qualities, each carrying its **develop-vs-maintain
designation** (Ontology §5, Priority Quality) and its chosen **Adaptation
Target(s)** (`02` §2.5, ruling R2). D6 commits, per target, an intervention
class and a concurrency model, producing a **develop/maintain map** (`02` §2.6,
ruling R1). "Develop vs maintain" is the ratified binary — but a coach spends the
fatigue budget across *more than two* postures: the thing being pushed, the
things riding alongside it, the base that must be present for the push to work,
the things that must merely not regress, and the deliberate withdrawal of load.
The five **adaptation classes** are that spend, made explicit and typed. They are
a **refinement of D6's develop/maintain map**, not a new decision or entity — the
classification is a typed attribute each Adaptation Target carries out of D5/D6,
consumed by D12 (dose) and D14 (the recoverability and volume gates). They
introduce no §20.1 admission (ruling R3/R4 posture: type existing outputs, do not
add stages).

Each class is defined by three things: its **selection rule** (which D5/D6 output
lands an adaptation there), its **dose-policy inheritance** (how D12 doses it —
`02` §2.12), and its **interference posture** (develop vs maintain vs restore —
the D6 concurrency model, Ontology §7).

### 3.2 The classes

**Primary.**
- *Selection rule.* The block's dominant Adaptation Target(s) — the top-ranked
  D5 priority whose quality the D7 block objective develops dominantly (exactly
  one dominant objective per block — `02` §2.7; Ontology §7). Typically one,
  occasionally two where compatible.
- *Dose-policy inheritance.* Full progressive-overload dose from the target
  adaptation's dose-response knowledge (KA Domain 3), progressed week-over-week
  toward the recoverability ceiling; the **largest share of the session fatigue
  budget** (D9). Progression is anchored to demonstrated capability, and the
  non-logging athlete still progresses on estimator-driven advancement (D12,
  commitment C4; SR-01; audit 07).
- *Interference posture.* **Develop**, and protected: D6 sequences interfering
  work away from it, or trades it explicitly (Ontology §7 — *"a multi-quality
  plan self-sabotages"* without the Strategy).

**Secondary.**
- *Selection rule.* The other selected D5 priorities (ranks 2–3) developed
  concurrently but sub-dominantly this block — real develop targets, held below
  the primary in budget claim.
- *Dose-policy inheritance.* Effective (adaptation-driving) dose at reduced
  volume relative to Primary; progressed, but yielding budget to the primary
  when the recoverability ceiling binds (D5's transfer-per-fatigue budget, §1.2).
- *Interference posture.* **Develop**, but the first to be down-scoped when
  concurrency conflicts surface — the D6 concurrency model decides the trade and
  records it (`02` §2.6).

**Supporting.**
- *Selection rule.* Adaptations that are **not themselves diagnosed priorities**
  but are **prerequisite to or enabling of** a Primary/Secondary target — e.g. a
  maximal-strength base beneath reactive strength (Ontology §5's prerequisite
  qualities: reactive strength has *"prerequisite: a maximal-strength base"*).
  Selected by the prerequisite relation in quality knowledge, not by the gap
  ranking.
- *Dose-policy inheritance.* **Minimum enabling dose** — enough to keep the
  prerequisite from bottlenecking the target, no more (Art 7). Not progressed for
  its own sake.
- *Interference posture.* **Develop-to-enable** — subordinate to the target it
  serves; withdrawn once the target no longer needs it.

**Maintenance.**
- *Selection rule.* Qualities the develop/maintain map marks **maintain** —
  previously developed qualities, or non-priority qualities the demand profile
  still requires, that must **not regress** while attention is elsewhere. This is
  the explicit "maintain" half of D6's map (Ontology §5, Priority Quality
  designation; Ontology §7).
- *Dose-policy inheritance.* **Maintenance dose** — the minimum volume/frequency
  to retain the adaptation (well below the developing dose; typically lower
  frequency), from maintenance-dose knowledge (KA Domain 3/6).
- *Interference posture.* **Maintain, not develop** — deliberately low fatigue
  cost so it does not compete with Primary/Secondary for the recovery budget; the
  distinction is what stops a "maintain" quality quietly consuming a developer's
  budget.

**Recovery.**
- *Selection rule.* Deliberate withdrawal or reduction of load — a programmed
  deload, an active-recovery allocation, or a readiness-driven ease — decided by
  D7 (deload rhythm, `02` §2.7), D12 (advancement decision = deload), or D15
  (runtime ease). Bidirectional progression: *"deload, hold, and rebuild are
  progression decisions too"* (`01` §11; Art 9's ceiling applied over time).
- *Dose-policy inheritance.* Reduced load, **intensity held where the block
  demands** (a real taper cuts volume and holds intensity — `02` §2.7; EDS D7),
  or full restorative reduction for a deload; the dose *decreases* against the
  ceiling rather than climbing toward it.
- *Interference posture.* **Restore** — the class exists to buy back
  recoverability (Art 9), neither developing nor maintaining a quality but
  protecting the capacity every other class spends.

### 3.3 The classes as a fatigue-budget partition

Read together, the five classes are a **partition of the recoverability budget**
(Ontology §5, Priority Quality's *"recoverability budget allotted"*; Art 9's
ceiling): Primary claims the most, Secondary the next, Supporting a minimum
enabling slice, Maintenance a floor that must not starve the developers, and
Recovery the deliberate return of budget to the athlete. Because the budget is
finite, the classes are how the engine expresses *"chasing everything trains
nothing"* (`00-ARCHITECTURE.md` §1.4) as arithmetic D14 can audit: the summed
prescribed load across all classes is the volume ledger checked against the MRV
ceiling at D14 — *"volume is a ceiling checked later, never a target filled"*
(`02` §2.12; Constitution Art 6). The class labels travel on the decision trace,
so the explanation layer can answer "why is this here and dosed this way"
per class (Art 14; `08-EXPLAINABILITY.md`).

---

## §4 How adaptations combine into sporting performance

### 4.1 The transfer chain

The performance model's causal claim runs in one direction:

```
   dose (D12)  →  target adaptation achieved  →  Physical Quality gain (Capability ↑)
        →  demand-profile gap closed (Diagnostic Triangle, §1.1)
        →  projected Performance Outcome improved  →  observed Match Performance
```

Each arrow is a claim the engine is making, and the Constitution requires each to
be treated as a hypothesis, not a fact: *"Science informs decisions; athlete
response validates them"* (Constitution Art 12); *"a plan whose week six equals
week five is a failed hypothesis"* (`01` §11; Art 12). The transfer chain is thus
a **falsifiable hypothesis frame**: developing the prioritised qualities is
*predicted* to close the diagnosed gaps and raise the outcome, and the prediction
is scored against reality — not assumed true because the prescription was
coherent (the SR-02 trap again: coherence downstream of a bad diagnosis is not
validation).

### 4.2 Where the chain is checked — Match Performance as ground truth

The chain's endpoint is not a computed score but an observed one. **Match
Performance** (Ontology §10, Family VIII) is the ratified entity the transfer
check reads: *"the ground truth the Performance Outcome transfer check reads —
did developing the prioritised qualities move what happens on the pitch?"*
(Ontology §10, Match Performance). The wiring is fixed by stages already
specified:

- **D2** carries the resolved **Performance Outcome** as a typed field of the
  demand profile, *so D16's transfer validation has a referee* (`02` §2.2, ruling
  R2; the severed-loop lesson — block verdicts computed then discarded unread,
  audit 03 §3.4).
- **D16 Learning** scores the block against its typed exit criteria (D7) **and**
  the Performance Outcome, reading Match Performance and Test Results as evidence
  (`02` §2.16). The verdict is a hypothesis-test result: did the projected
  quality gains materialise, and did they move the outcome?
- **D17 Observation & Analysis** interprets the trend before anyone acts —
  *meaning before action* (`01` §12; `02` §2.17): a single bad result is noise, a
  sustained divergence between projected and observed transfer is a message, and
  it enters the *next* diagnosis (D1/D4) as a re-diagnosis trigger — never a
  backward edit to a committed plan (EDS §21; `00-ARCHITECTURE.md` §2.1
  property 7).

### 4.3 The honesty duties on transfer claims

Three duties bind every transfer claim, each from a frozen owner:

1. **Confidence bounds authority.** A transfer rating carries knowledge
   confidence and may only steer selection ordering as **soft input**, never
   force a pick, when the evidence is contested (`02` §2.11; Constitution Art 13;
   KA §3.1). Disputed transfer science tilts; it does not gate.
2. **Unservable gaps are surfaced, not buried.** A diagnosed limiting factor the
   current programming cannot serve (e.g. an aerobic-capacity gap while endurance
   programming is deferred) rides forward as an explicit unserved need
   (Ontology §5; Constitution Art 15; `02` §2.4). The transfer model does not
   pretend to close what it cannot.
3. **The projection is stated as a prediction.** A quality gain projected from an
   inferred (not measured) capability is a **Prediction** carrying confidence,
   never a Calculation (KA §2 — Inference/Prediction vs Calculation); the
   projected-performance delta inherits the weakest input's confidence (TAS §5.7,
   as cited across `02`), and low-confidence projections widen margins rather
   than sharpen claims (Art 5's low-confidence-hypothesis duty).

---

## §5 Measurement

### 5.1 The measurement vocabulary (Family VIII, ratified — never invented)

The engine's knowledge of *what the athlete can do* is only as good as what has
been measured, and the vocabulary for measurement is fixed by the ratified
Ontology Family VIII (§10) — this document invents no term:

- **Assessment** — a *"structured, repeatable, versioned measurement protocol"*
  authored as **knowledge** (Ontology §10, Assessment): procedure, conditions,
  the qualities it estimates and the mapping onto each quality's scale, typical
  error, competency prerequisites, injury contraindications, re-test cadence.
  *"A protocol change is a new version, never a silent edit"* — versioning is
  what keeps a 2026 result comparable with a 2031 one (Ontology §10; DAAS
  §2.1.2 — designate, in review).
- **Test Result** — one datum from administering an Assessment on a date, with
  the protocol version and conditions needed to compare it across years.
  **Stored Data — ground truth** (KA §2; Ontology §10, Test Result). *"Capability
  is the current estimate; a Test Result is the evidence."*
- **External Load Observation** — a single captured measurement of training
  stress from outside the gym (GPS/accelerometry, pitch RPE, distances), with
  provenance. **Stored Data** carrying the sport half of Load (Ontology §10;
  the raw-vitals rule applies — a coach sees only what is *derived*,
  Constitution Art 11).
- **Insight** — a **derived, attributed interpretation** (Derived Data promoted
  to a named entity), the product of D17 analysis (Ontology §10). Estimator-facing
  analytical signals reach diagnosis and dosing **only as Insights via D17** —
  D17 is *"the sole entry for any analytical product reaching any decision"*
  (`02` §2.17; DAAS §2.4 — designate, in review).

The KA classification is load-bearing here and follows the clarified derived-data
doctrine (the AQ-5 ratification): **capability estimates are Inference or
Prediction, never Calculation** (a judgement under uncertainty, carrying
confidence, that can be wrong — KA §2); **Test Results are Stored Data**; the
signals derived from them are **Derived Data**, recomputable, never re-served as
stored truth (KA §2.1). A point-in-time capability estimate may be *materialised
as dated historical evidence* — append-only, stamped with the engine +
knowledge-set versions — but is never re-served as the current value (KA §2.1).

### 5.2 D1's per-quality estimators — the estimator classes and their confidence

D1 Athlete Assessment builds capability per Physical Quality *behind one
interface* (commitment C8; `02` §2.1). Each quality's Capability is produced by
whichever estimator its evidence supports, and **the estimator class sets the
confidence tier** (KA §3.1; Constitution Art 13):

| Estimator class | Input | KA kind | Confidence treatment (KA §3.1; Art 13) |
|---|---|---|---|
| **Measured — Test Result** | An Assessment administration (Ontology §10) | Stored Data → Inference on the quality scale | Highest; **measured evidence always displaces inferred priors** for the same attribute, and the displacement is recorded in the rationale (`02` §2.1) |
| **Measured — logged performance** | Tracked lifts / set-granularity capture (e.g. e1RM trajectory) | Stored Data → Inference | High for the qualities the lift indexes (e.g. `maxStrength`), recency-decayed; the pin measured essentially one quality this way (SR-02; audit 07) |
| **Inferred — training-age prior** | Population/sport prior by training-age band | Prediction (learned) / Knowledge prior | **Low — soft input at most**; nine of ten qualities were this class at the pin (SR-02; audit 07 · G1; audit 08), which is the gap C8 closes |

The confidence tiers are operative, not decorative (KA §3.1 rule 2): a
measured-competency or contraindication fact may reach **gate** (it feeds D11/D14
gates); an inferred capability estimate is **soft input** at most; whole-model
confidence is a **reported metric** surfaced to the athlete ("conservative while
we learn") — exactly the per-attribute treatment `02` §2.1 fixes. This is the
generalised cure for the ACWR disease: an estimate never carries more authority
than its evidence grants (KA §3.1; SR-08; audit 07).

### 5.3 The additive-first guarantee

The whole estimator architecture obeys one inviolable rule, the audit's Wave C
gate: **no new data ⇒ estimates unchanged ⇒ byte-identical plan** (audit 10
Wave C: *"additive first — a profile with no new data produces a byte-identical
plan; only newly-measured cohorts re-baseline"*). Wiring per-quality estimators
behind D1's interface changes *nothing* for an athlete who has supplied no new
measurement — their capabilities remain the same inferred priors, dosed the same
way. Measurement *adds* fidelity; it never silently perturbs an unmeasured
athlete's plan. This is what makes the C8 estimator rollout incremental and
golden-master-gated rather than a re-baseline of everyone (spec §7's low-risk
migration criterion; benchmark P2.1 — assessments as first-class, versioned,
comparable data assets, audit `governance-00` P2.1).

### 5.4 What this document does *not* own — the DAAS boundary

Capture, battery scheduling, storage, ingestion, provenance/quality tagging, and
the longitudinal record are **DAAS-owned** and only cited here, per the one-owner
rule:

- Assessment-battery mechanics — protocols as versioned knowledge, scheduling,
  Test Result persistence, comparability — **DAAS §2.1.2** (designate, in review).
- Per-datum provenance and quality model — **DAAS §2.1.1** (designate).
- Monitoring streams, individual baselining, baseline maturity — **DAAS §2.1.3**
  (designate; derivation semantics owned by KA Domain 7).
- The longitudinal athlete record and its consent/export/erasure rights —
  **DAAS §3** under Constitution Art 22 (designate).

V2 **consumes** these; it re-owns none of them (`00-ARCHITECTURE.md` §2.1
property 10; DAAS §1.3/§1.4). Assessment *scheduling* specifically is a future
D17-adjacent decision admitted through EDS §20.1 when built (DAAS §2.1.2 —
designate); until then the protocol entry's cadence guidance is surfaced
advisorily. The benchmark's longitudinal-model and data-quality bars (P2.6, P2.9;
audit `governance-00`) are DAAS acceptance criteria, not this document's.

---

## §6 Age & sex physiology

### 6.1 The defect, and the rule

At the pin, individualisation by age and sex was almost absent: *"chronological
age modulates one readiness sub-weight; sex is a rep bump + standards bands;
MEV/MAV/MRV and dose schemes are 'general trainee' invariants. A 62-year-old
masters swimmer receives a 25-year-old's ramp, ceiling, and recovery
assumptions"* (SR-09; audit 07). The gap analysis is blunter: *"age = one index
weight; sex = 3 constants; developmentPriorities unconsumed; no para model … whole
modifier families"* missing, mis-serving *"masters/female audiences"* (G20; audit
08) — the benchmark's P1.4 world-class bar (two athletes differing in age, sex,
training age, injury, or recovery profile receive materially different plans,
with explicit evidence-graded rules) is unmet by three constants.

The V2 rule is the constitutional one: **modifiers are governed knowledge, never
code constants** (Constitution Art 17; commitment C3). Age and sex physiology
enter at three seams, each as evidence-tagged knowledge entries (KA §3.1) homed
in `04-KNOWLEDGE-OWNERSHIP-MAP.md`:

| Seam | What the modifier does | Stage | Knowledge home (KA) |
|---|---|---|---|
| **Estimation** | Adjust capability priors and normative bands by age/sex/training-age band | D1 | Athlete Knowledge (Domain 1) |
| **Landmarks** | Modulate MEV/MAV/MRV volume landmarks and recovery-time assumptions | D12 / D14 ledger | Recovery/Load-Response (Domain 7); Quality & Adaptation (Domain 3) |
| **Dose** | Modulate dose schemes, ramp rates, and progression rates (e.g. recovery-weighted dosing for masters) | D12 | Quality & Adaptation (Domain 3); Programming (Domain 6) |

Because they are knowledge, they carry evidence level and confidence, and *"thin
evidence for an age band lowers confidence, and lower confidence narrows what may
be prescribed"* (Constitution Art 21). A modifier with weak evidence widens the
margin toward safety; it does not license a confident deviation.

### 6.2 Developmental stage — Article 21's conservative floor

Developmental stage is not one more modifier; it is a **first-class input that
shapes diagnosis and construction, never a filter applied afterward**
(Constitution Art 21; `01` §1). Two rules from Art 21 bind the performance model:

1. **Stage rules are governed knowledge, conservative by default.** *"What may
   and may not be prescribed to a developing or an ageing athlete is explicit,
   governed knowledge — never an assumption that the athlete is a mature adult —
   and where age-modulated evidence is thin, the platform defaults to the
   conservative choice"* (Constitution Art 21). For a developing athlete, *"the
   margin always widens toward safety, never toward stimulus."* The stage-rule
   knowledge home and the LTAD progression level are owned by
   `07-PROGRESSION.md` (the eighth progression level, bounded by Art 21;
   `01` §11); this document fixes only that developmental stage enters
   **estimation and dose as knowledge**, at the same three seams above, at the
   conservative default.
2. **A minor is never reasoned about as an adult.** D1 makes developmental-stage
   presence a **contract requirement for under-18 athletes** — *"a missing stage
   for an under-18 fails the contract rather than defaulting"* (`02` §2.1;
   Constitution Art 21). The performance model therefore cannot even *form* a
   capability-and-dose projection for a minor without the stage that bounds it;
   the failure is fail-closed, surfaced, and safety-tiered (tier 1 of the
   conflict order — `02` §3.1 names Art 21 within tier 1).

Developmental-stage handling is thus not an optimisation refinement but a
**safety obligation** — the class of duty the conflict order places above every
other consideration (Constitution, *When principles conflict*; `02` §3.2 rule 1:
higher tier wins absolutely). The performance model optimises within that floor,
never through it.

---

*Next in the reading order:
[`04-KNOWLEDGE-OWNERSHIP-MAP.md`](04-KNOWLEDGE-OWNERSHIP-MAP.md) — the knowledge
home of every magnitude, coefficient, quality entry, dose-response model,
assessment protocol, and age/sex/stage modifier this document names.*
