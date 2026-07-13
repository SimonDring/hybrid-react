# Batch Proposal 02 — The Decision Ontology: Measurement & Analysis (AQ-2) + the additive-extension clause (AQ-4, ontology half)

**Status: BATCH PROPOSAL — working doc (T4) · 2026-07-13 · nothing herein is applied; Simon's ratification PR applies it**
Spec: [`docs/superpowers/specs/2026-07-13-phase1-amendment-batch-design.md`](../../superpowers/specs/2026-07-13-phase1-amendment-batch-design.md)

**Target document:** `docs/foundation/DECISION-ONTOLOGY.md` (v1.0, FROZEN — quoted here, never edited).
**Items:** AQ-2 (merged GA-203, GA-205, GA-206, GA-207, GA-208, GA-209) and the ontology half of AQ-4 (GA-204; the EDS half, GA-419, is drafted in [`03-eds.md`](03-eds.md) — numbered **AQ-4.1 here, AQ-4.2 there** per batch reading order, one doctrine stated once in each document).
**Evidence:** governance audit 09 §3 (queue entries AQ-2, AQ-4); audit 02 (GA-203/204/205–209, §5–§7); audit 08 §4 (pairing rulings) and GA-802/GA-804.

**How the entries compose.** AQ-2.1, AQ-2.2, and AQ-2.3 are one coherent edit applied together: 2.1 adds the fourth structure to §1, 2.2 adds the entity family the structure names, 2.3 carries the consequential renumbering and relationship rows. AQ-4.1 then lands on the renumbered document. Section numbers in proposed text refer to the document *as amended* (the renumbering map is in AQ-2.3).

---

### AQ-2.1 — §1 gains the Analysis Spine (the fourth structure)

**Target:** `docs/foundation/DECISION-ONTOLOGY.md` — "How to read this document" (movement 1 of the numbered list), §1 heading, §1 opening paragraph (final sentence), and a new §1.4 inserted after §1.3.

**Current text:**

> ```
> 1. **The three structures** (§1) — the single most important correction this document
>    makes. The platform's concepts are not one hierarchy; they are *three orthogonal
>    structures* that the original brief mashed together. Getting them apart dissolves
>    most ambiguity.
> ```

> `# 1. The three structures`

> "The brief proposes a single top-to-bottom hierarchy: […] There are three distinct structures, and every entity belongs to one of them:"

(§1.4 does not exist; §1 ends with the "single biggest improvement" blockquote after §1.3.)

**Proposed text:**

Movement 1 of "How to read this document" becomes:

```
1. **The four structures** (§1) — the single most important correction this document
   makes, extended once by amendment. The platform's concepts are not one hierarchy;
   they are *four orthogonal structures*: the three the original brief mashed
   together, plus the Analysis Spine — added when the platform's second product, the
   evidence-graded understanding of the athlete, entered scope. Getting them apart
   dissolves most ambiguity.
```

§1's heading becomes:

```
# 1. The four structures
```

The final sentence of §1's opening paragraph ("There are three distinct structures, and every entity belongs to one of them:") becomes:

```
There are four distinct structures, and every entity belongs to one of them. Three
define how the platform *coaches*; the fourth (§1.4, added by amendment) defines how
what the platform *observes* becomes what it *understands*:
```

A new §1.4 is inserted after §1.3 (before the "single biggest improvement" blockquote):

```
### 1.4 The Analysis Spine (evidential: how observation becomes understanding)

The lifecycle of the athlete's data. The Reasoning Spine (§1.1) is the order in
which coaching *decisions* are made; the Analysis Spine is the path *evidence*
travels to reach them — and to reach the humans the platform serves. It exists
because the platform's product is not only the plan but the evidence-graded
understanding of the athlete the plan is reasoned from, and that understanding has
its own lifecycle:

   CAPTURE       the observation itself — Test Result · Match Performance
                 · External Load Observation · training logs · vitals
      │  ▼ an observation is kept comparable, attributed, and private
   MODEL         the athlete's longitudinal record (Athlete State and its history)
      │  ▼ data is interpreted, never merely accumulated
   INSIGHT       the derived, attributed interpretation — Insight · Squad Signal
                 · the content of a Report
      │  ▼ confidence governs authority (the same rail as everywhere else)
   DECISION      entry into the Reasoning Spine (diagnosis, runtime, learning)
                 and delivery to the athlete or coach (Report, Recommendation)

**Why this is a fourth structure and not more spine:** the Reasoning Spine already
ends in Learning, and Learning updates Priors — but priors are not the only thing
data becomes. A test result sharpens a Capability; a season of match data feeds the
transfer check; a trend becomes an Insight a coach reads; a roster of derived
signals becomes a Squad Signal. None of these is a *coaching decision step*; all of
them are *evidence moving toward one*. The Analysis Spine gives that movement a
home without adding a single step to the order of coaching. Its entities live in
Family VIII (§10); its confidence-and-authority discipline is the existing
Confidence rail (§2, §9), unchanged.
```

**Rationale:** GA-207 (SILENT — no structural home for the analysis lifecycle; a fourth structure is an addition to §1, the document's load-bearing frame; "the names belong here by the Ontology's own scope"). Constituent of AQ-2 (audit 09 §3). Benchmark: P2 pillar-wide, esp. P2.10 and P2.6; the plan task names the data→model→insight→decision spine as a peer structure. Audit 02 §6.2 (Learning-to-priors as the only analysis pathway is falsified by the end-state) is the load-bearing-assumption evidence the "why" paragraph answers.

**Consistency:**
- **AQ-1 (01-constitution.md).** §1.4's phrase "the evidence-graded understanding of the athlete" deliberately echoes AQ-1's second-product language so the structure traces to the amended Preamble. If AQ-1's final wording differs, the 07 review should align this phrase — one noun phrase, stated identically in both.
- **AQ-3 (03-eds.md).** The DECISION link is where the EDS-side analysis decision family attaches; §1.4 names the seam ("entry into the Reasoning Spine") without defining any decision — decisions are the EDS's to catalogue.
- **§2 is deliberately untouched.** The Reasoning Spine diagram and edge rationale gain no steps: analysis products enter existing decisions as inputs via consumers/confidence, not as new spine edges. This preserves audit 02 §5.2's warning (the spine reads as normative and closed) without redrawing it — the registration rule for genuinely new decisions is AQ-4.1's business.
- **The three v1.0 structures are unchanged in content**; the Diagnostic Triangle remains "the conceptual engine of the whole platform" (§1.3) — the Analysis Spine feeds it (better-measured Capability), never rivals it.

**Not changed:** the "single biggest improvement" blockquote at the end of §1 (it records the v1.0 correction *of the brief's chain*, whose three structures are the ones the brief tangled — a historical record, accurate as written); the "three movements" framing of "How to read" (structures / spine / catalogue — still three movements); §2 in its entirety; every edge rationale; the cross-cutting rails.

---

### AQ-2.2 — Family VIII: Measurement & Analysis (new §10)

**Target:** `docs/foundation/DECISION-ONTOLOGY.md` — a new section inserted after §9 (Family VII — Epistemics & the Engine), becoming §10; existing §10/§11 renumber per AQ-2.3.

**Current text:** none — the family does not exist. The gap, verbatim from the document's own coverage: assessment appears only as attributes of other entities (Physical Quality carries an "assessment method"; Capability a "source (measured from lifts/assessments/logs, or inferred…)"; Sport an SKB "assessments" section); Competition is "a dated event […] that anchors periodisation and the taper"; Load is "accumulated training stress over time, from gym + sport"; Athlete State is "the only thing that must be persisted portably (everything else is derived)".

**Proposed text (the complete new section):**

```
# 10. Family VIII — Measurement & Analysis

What the platform *observes* about the athlete, and what it *understands* from
those observations — the entities of the Analysis Spine (§1.4). Family VI defines
the athlete's training *state*; this family defines the *evidence*: the measured
facts that persist as ground truth (Test Result, Match Performance, External Load
Observation), and the derived, attributed interpretations built from them (Insight,
Squad Signal, Report). *Added by amendment: v1.0's vocabulary stopped at
training-state signals, so the platform's second product — the evidence-graded
understanding of the athlete — had nothing named to be built from, and the
analytics→decision loop had no entities to enter through.*

Two boundaries govern the whole family:

- **Kind vs. entity.** In the Knowledge Architecture's classification (KA §2),
  Test Results and observations are *Stored Data* — ground truth recorded from
  reality — while Insights, Squad Signals, and Reports are *Derived Data* —
  computed, attributed, recomputable, never stored as truth. This family names the
  entities; the KA owns the kinds. An Insight is Derived Data *promoted to a named
  entity* because decisions and humans consume it and it must therefore carry its
  derivation, confidence, and authority tier like everything else they consume.
- **Names here, mechanics elsewhere.** As with Family VII (whose structure is the
  Knowledge Architecture's subject), these entities' storage, ingestion, and
  computation mechanics belong to the architecture tier — the TAS's boundaries and
  the data-pillar specification it governs. Here, as everywhere, we define what
  each concept *is*.

## Assessment
- **Definition.** A structured, repeatable, versioned measurement protocol the
  athlete performs under stated conditions to estimate one or more **Physical
  Qualities** — the instrument side of measurement, distinct from any single
  result it produces. *Synonyms:* test, testing protocol; a scheduled set of
  Assessments is a testing battery.
- **Purpose.** The thing that turns **Capability** from inference into
  measurement. The Diagnostic Triangle's athlete side is only as strong as what
  has been measured, and "*a quality with no assessment and no dose model is a
  label*" (§5, Constitution Article 12) — this entity is what the **Physical
  Quality**'s "assessment method" attribute names. Versioning is what keeps
  results comparable across years: a protocol change is a new version, never a
  silent edit.
- **Attributes.** Id; the protocol (procedure, conditions, equipment); version;
  the **Quality**(ies) it estimates and the mapping onto each quality's scale;
  measurement reliability/typical error; required competency; **Injury**
  contraindications; re-test cadence guidance; **Evidence**.
- **Relationships.** Authored as **Knowledge** (lives in a **Registry**; adding an
  assessment is a data change); estimates `1..*` **Physical Qualities**; each
  administration to an **Athlete** produces `1` **Test Result**; may be placed in
  a **Session** as a scheduled slot; bounded by **Constraints** and **Injury**
  contraindications like any prescribed activity.
- **Produced from / Feeds.** Authored by sports scientists as data; feeds the
  assessment-scheduling decision and, through its results, the athlete's
  **Capability**.
- **Consumers.** Assessment scheduling; diagnosis (via the Capabilities its
  results sharpen); the athlete-facing "how we measure this."
- **Example.** "Drop jump (reactive-strength index), protocol v2 — contact mat,
  30 cm box, standardised warm-up; estimates reactive strength; typical error
  ±0.1; re-test every 6–8 weeks; contraindicated during patellar-tendinopathy
  stage 1–2."

## Test Result
- **Definition.** One datum produced by administering an **Assessment** to an
  **Athlete** on a date — the measured value plus the protocol version and
  conditions needed to compare it with any other administration, this season or
  five years from now.
- **Purpose.** The comparable, durable data point the longitudinal understanding
  of the athlete is built from. **Capability** is the *current estimate*; a Test
  Result is the *evidence* — keeping them distinct lets the estimate stay
  recomputable while the measured fact persists as ground truth (Stored Data,
  KA §2). A series of Test Results is what a trend is a trend *of*.
- **Attributes.** **Assessment** id + protocol version; date; raw value(s); the
  derived score on the quality's scale (with the mapping version used);
  conditions and deviations; source quality (measured | self-administered);
  the **Confidence** contribution it makes.
- **Relationships.** Produced by `1` **Assessment** administration; belongs to
  `1` **Athlete** (part of **Athlete State**; owned by the athlete like all of
  it); sharpens `1..*` **Capabilities** (source flips from "inferred" toward
  "measured"; **Confidence** rises); read by **Learning** and by the analysis
  decisions; interpreted, in series, by **Insights**.
- **Produced from / Feeds.** Captured when an assessment is performed; feeds
  Capability updates, diagnosis, learning, and trend analysis.
- **Consumers.** Diagnosis (via Capability); learning; insights; the athlete's
  progress view.
- **Example.** "RSI 1.4, 2026-07-01, drop-jump protocol v2, no deviations →
  reactive-strength Capability: moderate, measured (confidence: high)."

## Match Performance
- **Definition.** The dated record of an **Athlete**'s participation and output
  in a **Competition** or sport session — exposure (minutes, availability) and
  the sport's outcome KPIs, as *data about the athlete*. *Synonym:* competition
  performance.
- **Purpose.** Makes the Competition a *producer of observations*, not only a
  calendar anchor (§4's anchoring role is untouched). It is the ground truth the
  **Performance Outcome** transfer check reads — did developing the prioritised
  qualities move what happens on the pitch? — and the exposure record the sport
  half of **Load** is estimated from.
- **Attributes.** Date and the **Competition**/session it belongs to; exposure
  (minutes played, availability status); output KPIs (mapped to the **Sport**'s
  KPI framework); context (importance, congestion); source and provenance.
- **Relationships.** Produced in the context of `1` **Competition** (or sport
  session); belongs to `1` **Athlete**; contributes exposure to **Load**
  (directly, or via attached **External Load Observations** where instrumented);
  feeds the transfer validation in **Learning** via the **Performance Outcome**;
  availability status feeds the coach's availability view (status only — never
  clinical detail, per **Injury**).
- **Produced from / Feeds.** Logged by the athlete/coach or ingested; feeds load
  accounting, transfer validation, and insights.
- **Consumers.** Learning (transfer check); load computation; insights; the
  coach's availability and loading views (derived).
- **Example.** "Sunday championship match: full 60 minutes at midfield;
  high-speed running above season average; flagged heavy — Monday's gym session
  reflows to a primer."

## External Load Observation
- **Definition.** A single captured measurement of training stress from outside
  the gym — a GPS/accelerometry datum, a pitch-session RPE, distances, sprint
  counts — with provenance: source, device class, reliability.
- **Purpose.** **Load** was defined "gym + sport" from its first line (§8); this
  is the named carrier of the sport half — the *observation itself*, distinct
  from the accumulated **Load** it aggregates into. It *extends* Family VI's
  system; it redefines nothing in it. Provenance is the point: what a datum came
  from bounds the confidence of everything derived from it.
- **Attributes.** Metric (name, unit, semantics — normalised at the ingestion
  boundary); value; timestamp/window; source and device class; reliability/
  quality tag; the sport session or **Match Performance** it attaches to.
- **Relationships.** Belongs to `1` **Athlete** (part of **Athlete State**; raw
  observations follow the raw-vitals rule — a **Coach** sees only what is
  derived); aggregates into **Load**; attaches to `0..1` **Match Performance**;
  its quality tag bounds the **Confidence** of derived products.
- **Produced from / Feeds.** Ingested from devices or logged; feeds Load,
  Fatigue modelling, and insights.
- **Consumers.** Load computation; the runtime; insights; learning.
- **Example.** "Tuesday pitch session, GPS vest: 6.2 km total, 14 sprints —
  reliability high; counted into this week's Load; Thursday's heavy lower-body
  session spacing re-checked."

## Insight
- **Definition.** A derived, attributed interpretation of an athlete's data — a
  trend, change-point, comparison against their own history, or flag — carrying
  its full derivation (which data, which method, which knowledge version), its
  **Confidence**, and the authority tier that confidence grants.
- **Purpose.** The named product of analysis, so analytics enters the decision
  loop through the same consumers-and-confidence discipline as every other
  entity — instead of as ad-hoc computed values with improvised standing. An
  Insight may *inform* a decision or merely be *reported*; whether it may ever
  gate is governed by **Confidence** (Constitution Article 13), exactly as for
  any input. It interprets; it never mutates **Athlete State** and never
  prescribes (prescription is the Reasoning Spine's).
- **Attributes.** The statement (typed form + plain-English); derivation (source
  data references, method, knowledge/engine versions); **Confidence**; authority
  tier (gate | soft input | reported metric — granted, not asserted); audience
  relevance; produced date.
- **Relationships.** Derived from **Test Results**, **Match Performances**,
  **External Load Observations**, **Training History**, and Family VI signals;
  produced by the analysis decisions (the EDS catalogues them); consumed by
  diagnosis (a re-diagnosis trigger enters here), the runtime, **Learning**, and
  **Reports**; presented to humans only with its rationale attached
  (Constitution Article 14).
- **Produced from / Feeds.** Computed by analysis decisions off the planning
  critical path; feeds decisions, reports, and the athlete/coach surfaces.
- **Consumers.** Diagnosis; the runtime; learning; reports; the explanation
  system.
- **Example.** "Estimated squat 1RM flat for six weeks while volume held —
  possible plateau. Derived from 14 logged sessions, e1RM method v3; confidence
  moderate → soft input to the next block's diagnosis, and we say so."

## Squad Signal
- **Definition.** A derived, per-**Team**, privacy-bounded aggregate over the
  roster — a squad readiness roll-up, a team loading view, an availability
  board — computed from members' *derived* signals only, never raw vitals.
- **Purpose.** Names the squad-level objects the Team package's coach surface
  serves, under the same rule that created it: a Team adds constraints and a
  derived read surface, "not a second reasoning system" (§3). A Squad Signal is
  that read surface's typed content — aggregation for a coach's judgement, never
  input into another athlete's plan.
- **Attributes.** The **Team**; signal type; per-member derived values
  (readiness band, load state, availability) and the roster aggregate;
  **Confidence**; the window.
- **Relationships.** Aggregates members' **Readiness**/**Load**/availability
  (derived only — Constitution Article 11); belongs to `1` **Team**; consumed by
  the **Coach**'s dashboard and, prospectively, by the coach's scheduling
  judgement (which re-enters athletes' plans only as **Constraints**); athletes
  never see each other's contributions (data isolation, §3).
- **Produced from / Feeds.** Rolled up from members' derived state; feeds the
  coach surface.
- **Consumers.** The coach dashboard; team-level reports.
- **Example.** "Senior hurlers, match week: three players red on readiness,
  squad acute load 12% above the four-week norm, two unavailable (rehab) — a
  plain-English 'who is doing too much / too little' view."

## Report
- **Definition.** A composed, audience-addressed delivery artefact — a bundle of
  **Insights**, state signals, and progress against the **Performance Outcome**,
  rendered in the audience's language, with every figure traceable to the data
  it came from.
- **Purpose.** Gives *analytical* delivery the governance coaching delivery
  already has: a **Recommendation** delivers advice; a Report delivers
  understanding. Naming it makes two duties enforceable — accuracy (every
  surfaced figure traces to underlying data and carries its confidence) and
  privacy (the audience's scope is applied at composition, not at display).
- **Attributes.** Audience (**Athlete** | **Coach**); period; contents (insight
  and signal references); the privacy scope applied; generated date; the
  knowledge/engine versions it was composed under.
- **Relationships.** Composes `1..*` **Insights** (plus Family VI signals and
  **Performance Outcome** progress); addressed to `1` **Athlete** or **Coach**;
  a coach-addressed Report is bounded by the derived-only rule (Constitution
  Article 11 — raw vitals never); an AI-rendered Report passes through the AI
  seam's existing gates unchanged.
- **Produced from / Feeds.** Assembled from insights and signals; feeds the
  athlete/coach surfaces and (as engagement/acceptance) learning.
- **Consumers.** The athlete; the coach; learning.
- **Example.** "End-of-block report: hamstring robustness up (Nordic strength
  measured, +15%); aerobic-capacity gap unchanged (unservable — surfaced, per
  Article 15); readiness stable; next block's focus and why."
```

**Rationale:** GA-205 (SILENT — no Test/Assessment or Test Result entity; "a hard gate on the assessment build"; benchmark P2.1), GA-206 (THIN — no Match Performance or External Load carrier; P2.4), GA-208 (THIN — squad-level derived objects unnamed; `player_status` has no ontological home; P2.7), GA-209 (THIN — no Report/Insight entities; P2.11), GA-203 (ADEQUATE — the analytics→decision loop has no input entities; P2.10). Merged as AQ-2 (audit 09 §3): "the names land here, the mechanics there, counted once." Entity list per the plan task (Assessment, Test Result, Match Performance, External Load, Insight, Report) **plus Squad Signal**: GA-208 is a constituent finding of AQ-2 and the queue entry names the Squad Signal gap explicitly; omitting it would leave AQ-2 partially unresolved. Flagged for the 07 review to confirm or strike.

**Consistency:**
- **Family VI is not redefined** (plan constraint; GA-212 protected). Load, Fatigue, Recovery, Readiness, Recoverability keep their exact v1.0 text. External Load Observation *extends* the system — Load's definition was already "gym + sport"; the new entity is the named carrier of an already-in-scope quantity. Readiness remains "the canonical derived signal a coach may see"; Squad Signal aggregates it, does not replace it.
- **Derived Data (KA §2) vs Insight — boundary stated in the drafted text:** Test Result / Match Performance / External Load Observation are Stored Data (ground truth); Insight / Squad Signal / Report are Derived Data promoted to named entities because they have consumers and must carry derivation + confidence + authority. Current-state derived values remain recomputable-never-truth; whether a *point-in-time* Insight/Report may be materialised as dated historical evidence is AQ-5's doctrine ([`04-derived-data-doctrine.md`](04-derived-data-doctrine.md)) — this family deliberately does not restate it.
- **Vocabulary pairs with the architectural owners** (audit 08 §4 pairing rulings): Assessment/Test Result ↔ GA-502/GA-421 (capture architecture); Match Performance/External Load Observation ↔ GA-504/GA-501 (second ingestion boundary on the proven ACL pattern); Squad Signal ↔ GA-505 (squad-signal family) and `docs/product/TEAM-ARCHITECTURE.md`'s `player_status`; Insight/Report ↔ GA-503/GA-507 (analysis layer, reporting read-model). The metric dictionary GA-804 names is *referenced* by External Load Observation's "normalised at the ingestion boundary" phrase but *defined* by the data-pillar spec — the registry lands there, its entities registering here per GA-804's direction.
- **AQ-3 (03-eds.md):** "the analysis decisions (the EDS catalogues them)" is the deliberate seam — the noun this family provides (Insight) is the output type AQ-3's decision family emits. The 07 review should confirm the two drafts use the same noun.
- **AQ-7 (01-constitution.md):** every entity here is athlete-owned data; Report's composition-time privacy scope and Squad Signal's derived-only bound are the entity-level hooks AQ-7's consent/visibility rights will bind to. Nothing here weakens Article 11 — every coach-facing entity restates the derived-only rule.
- **ND-1 forward-reference:** the drafted text says "the data-pillar specification the TAS governs" without naming a document, because ND-1 is authored only after this batch (spec §2 rule 5). The 07 review should check this phrasing survives if ND-1's title is settled earlier.

**Not changed:** every existing entity in Families I–VII, verbatim — including Capability's "source (measured from lifts/assessments/logs…)" attribute (now satisfied by Test Result rather than reworded), Competition's calendar-anchor definition (its producer role arrives via Match Performance, not by editing §4), Athlete State's attribute list, and Learning's definition (it remains the priors pathway; Insights are a *peer* pathway, per audit 02 §6.2 — Learning's text needs no edit to admit them). The `Athlete —has→ Goal 1:1` cardinality (audit 02 §5.3's risk) is deliberately out of AQ-2's scope. The dangling "§9.3" reference in Team's relationships is a pre-existing defect, not touched by this batch item.

---

### AQ-2.3 — Consequential renumbering and relationship rows

**Target:** `docs/foundation/DECISION-ONTOLOGY.md` — "How to read this document" movement 3; §10 and §11 headings (renumber); the relationship table in renumbered §11; the closing line.

**Current text:**

> ```
> 3. **The entity catalogue** (§3–§9) — every entity, grouped into seven families, each
>    defined under a fixed template:
> ```

> `# 10. Relationship summary & cardinalities`

> `# 11. What this ontology deliberately changed (vs. the brief and the EDS)`

> `*— End of the Decision Ontology v1.0 —*`

**Proposed text:**

Movement 3 of "How to read this document" becomes:

```
3. **The entity catalogue** (§3–§10) — every entity, grouped into eight families, each
   defined under a fixed template:
```

Renumbering map (headings only; content unchanged except the table rows below):

| v1.0 | As amended |
|---|---|
| — | **§10. Family VIII — Measurement & Analysis** (new, AQ-2.2) |
| §10. Relationship summary & cardinalities | §11 |
| §11. What this ontology deliberately changed | §12 |
| — | **§13. Growth: additive extension vs. structural amendment** (new, AQ-4.1) |

The relationship table (renumbered §11) gains these rows, appended after
`Training Outcome —updates→ Prior (via Learning)`:

```
| Assessment —estimates→ Physical Quality | `1 : 1..*` | Protocol is knowledge, versioned |
| Assessment —administered as→ Test Result | `1 : 0..*` | One result per administration |
| Athlete —has→ Test Result | `1 : 0..*` | Stored Data; part of Athlete State |
| Test Result —sharpens→ Capability | `1 : 1..*` | Source flips inferred → measured |
| Competition —produces→ Match Performance | `1 : 0..*` | Per athlete; anchor role unchanged |
| External Load Observation —aggregates into→ Load | `* : 1` | The sport half's named carrier |
| Insight —derived from→ (Test Results · Match Performances · Observations · History · state signals) | `1 : 1..*` | Derivation always attributed |
| Report —composes→ Insight | `1 : 1..*` | Audience-scoped at composition |
| Team —has→ Squad Signal | `1 : 0..*` | Derived only; raw vitals never |
```

The closing line's version stamp changes with the whole-batch version bump — **one bump per document, planned in [`07-consistency-review.md`](07-consistency-review.md)**, not here.

**Rationale:** Consequential to GA-205–GA-209 (AQ-2); the ontology's own template discipline (audit 02 §3.5 — the §10 cardinality table is part of what makes the document world-class) requires new entities to appear in the quick-reference table, and the family count in "How to read" must stay true.

**Consistency:**
- Internal cross-references to the renumbered sections: the document's own text contains **no** "§10"/"§11" self-references outside the headings (verified by search), so the renumber is heading-only inside the document.
- External citations: the 2026-07-11 audit set cites "Ontology §10/§11" — reviews are dated evidence pinned to v1.0 and are never updated (CLAUDE.md; GOV). Living documents that cite Ontology §10/§11 by number, if any, are swept in the ratification PR — listed for the 07 review to enumerate.
- The insertion position (Family VIII at §10, adjacent to the other families, rather than appended after §11) keeps the catalogue contiguous, which "How to read" movement 3 promises ("§3–§10"). The cost is the two-heading renumber above; the alternative (family after the relationship table) was rejected as breaking the document's stated reading order.

**Not changed:** every existing row of the relationship table, verbatim — including `Athlete —has→ Goal | 1 : 1`; the content of renumbered §11 and §12; the §12 record's nine numbered items (the amendment is recorded by the batch protocol and the version bump, not by rewriting the v1.0 design record).

---

### AQ-4.1 — The additive-extension clause (ontology half)

**Target:** `docs/foundation/DECISION-ONTOLOGY.md` — the header table's **Principle** row, and a new final section (§13 in the as-amended numbering, after §12). The paired EDS half (AQ-4.2 — the decision-catalogue extension clause, GA-419) is drafted in [`03-eds.md`](03-eds.md); it is one doctrine, stated once in each document.

**Current text:**

> `| **Principle** | Nothing should be implemented until the entity it manipulates is defined here. New concepts are added to this ontology *first*, then built. |`

(No extension clause exists; the document's frozen status makes every vocabulary addition a constitutional-grade amendment.)

**Proposed text:**

The header **Principle** row becomes:

```
| **Principle** | Nothing should be implemented until the entity it manipulates is defined here. New concepts are added to this ontology *first*, then built. Additive growth inside an existing family is a versioned, dated edit under the extension clause (§13); changing the structures themselves is a constitutional-grade amendment. |
```

A new final section is added after §12:

```
# 13. Growth: additive extension vs. structural amendment

The Principle — concepts are defined here *first* — is discipline, not a
bottleneck, and this section keeps it that way. The platform grows in entity
families (measurement, endurance, return-to-play, nutrition…), and if every new
entity required a constitutional-grade amendment, contributors would learn to
bypass the ontology — recreating the vocabulary drift it exists to prevent. So
this document distinguishes two kinds of change:

**Additive extension (a versioned, dated edit — routine, batchable).** A change
is *additive* when it only adds vocabulary:

- a **new entity inside an existing family** (I–VIII), defined under the fixed
  template (§ "How to read") — all seven fields, including Consumers and the
  Confidence it carries or grants;
- placed in **exactly one family** and belonging to **exactly one structure**
  (§1);
- whose **relationships to existing entities are stated with cardinality**, and
  appended to the relationship summary (§11);
- that **redefines nothing**: no existing entity's Definition, no existing
  relationship or cardinality, no structure, no family boundary.

An additive extension enters by a dated, versioned edit under the amendment
batch protocol (DOCUMENTATION-GOVERNANCE), recorded in this document's version
history — proposed, reviewed for consistency with the whole set, ratified by
the steward. It does not require the full frozen-set amendment machinery,
because by construction it cannot contradict anything: it only names what was
nameless.

**Structural amendment (constitutional-grade — deliberate, reconciled,
versioned).** Everything else, in particular:

- a **new family**, or a **new structure** in §1;
- **redefining or removing** any existing entity, relationship, or cardinality;
- changing the **template** itself, this section, or the header Principle.

The same rule, seen from the Reasoning Spine: the spine (§2) is the *order* of
coaching, exemplary and load-bearing — but it is not a closed membership list.
A genuinely new **Decision** registers into the engine's DAG by declaring its
purpose, typed inputs and outputs, dependencies, and consumers under the
Decision template (§9); its *entities* enter under this clause; its *catalogue
entry* is governed by the EDS's paired extension clause. What no addition may
ever do silently is alter the meaning of what is already here.
```

**Rationale:** GA-204 (ADEQUATE — "the 'concepts added here first' Principle × frozen status makes every extension a frozen-doc amendment — a growth tax the end-state cadence will pay repeatedly"; direction: "an extension clause distinguishing *additive* entity/decision registration inside an existing family (versioned, routine) from *structural* change to the three structures (constitutional amendment)"). Audit 02 §5.1 (the growth bottleneck is the top over-specification risk; "GA-204's extension clause is the release valve") and §6.5 (the low-change-cadence assumption is falsified; "GA-204's additive-vs-structural distinction is the survivable form of the freeze"). AQ-4 (audit 09 §3): "the same doctrine stated once in each document." Benchmark: P6.2. The registration-rule paragraph answers audit 02 §5.2 (the spine reads normative and closed) at the vocabulary level, leaving decision admission criteria (contract completeness, graph position, validation integration) to the EDS half — AQ-4.2.

**Consistency:**
- **AQ-4.2 (03-eds.md) is the pair.** The split of labour is deliberate and must survive the 07 review: the ontology's clause governs *entities and naming* (template completeness, one family, one structure, no redefinition); the EDS's clause governs *decisions* (admission criteria, DAG position, D1–D16 semantics never silently altered). The shared sentence of doctrine — additive registration is versioned and routine; structural change is an amendment — should read equivalently in both.
- **AQ-2 is the proving case:** Family VIII itself enters as a *structural* amendment (a new family + a new structure — exactly the tier this clause reserves for full amendment), while its future growth (e.g. an Endurance Test entity inside Family VIII) becomes additive. The clause makes the batch's own machinery self-describing.
- **DOCUMENTATION-GOVERNANCE (living):** the clause leans on the batch protocol landed there (#172); it adds no new process, only classifies which changes may use the lighter path. GOV's precedence is below this document's, so the clause states the rule and GOV carries the mechanics — no circularity.
- **Constitution (Amendment & Stewardship):** the clause narrows nothing constitutional — the steward still ratifies every edit; Title III is untouched; the frozen set's "validated against, never modified" posture survives because additive edits are, by construction, incapable of modifying existing meaning.

**Not changed:** the Principle's first two sentences, verbatim — concepts-first discipline is strengthened, not relaxed; the freeze itself (the document remains frozen; the clause defines *how* it may grow, not that it is open); the fixed entity template; the three v1.0 structures and the spine's content; the EDS-side admission criteria (AQ-4.2's, not restated here).

---

*— End of batch proposal 02 · applied only by Simon's ratification PR —*
