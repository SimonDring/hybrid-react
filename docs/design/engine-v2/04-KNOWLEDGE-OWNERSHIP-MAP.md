# Decision Engine V2 — The Knowledge Ownership Map

**Status: PROPOSAL — working doc (T4) · 2026-07-14 · not canonical; adopted only via DEVELOPMENT-PLAN §5.3**
**Sprint spec: [`docs/superpowers/specs/2026-07-14-decision-engine-v2-design.md`](../../superpowers/specs/2026-07-14-decision-engine-v2-design.md)**

---

## §0 What this document is

This is the ownership verdict for **every input the V2 pipeline names**: for
each entry in the *Inputs* and *Knowledge Required* fields of
[`02-COACHING-PIPELINE.md`](02-COACHING-PIPELINE.md)'s seventeen stage
specifications, one owner — a Knowledge Architecture domain (KA §4), a DAAS
data-side domain *(designate, in review)*, or the bounded engine-logic
category of §5. It delivers commitment **C3** (00-ARCHITECTURE §2.3): *every
magnitude the pipeline reads has a named knowledge home with provenance and
confidence* — the audit's HOW-MUCH gap (TR-12; audit 06 · SR-07; audit 07 ·
audit 05 §4) closed as a design property, not a cleanup list.

Ownership rules inherited, never restated (one owner per concept):

- **KA §4 owns the domain list.** Twelve domains, fixed there. This map
  assigns inputs *to* them; it creates no domain (the DAAS reached the same
  conclusion for analysis knowledge — DAAS §2.3.3, designate, in review).
- **The DAAS owns the data side.** Capture, provenance/quality, assessment
  batteries, the longitudinal record, the Metric Dictionary, analysis
  products, and the quality→confidence→authority propagation are DAAS-owned
  concepts (DAAS §1.3 — designate, in review). This map **registers** pipeline
  inputs against those homes exactly as the DAAS's own non-ownership table
  does in the other direction (DAAS §1.4) — it links, coordinates, and never
  re-derives a rule.
- **`02` owns stage naming and behaviour links.** Stage IDs are used verbatim.
- **Facts about the shipped engine** are cited from the Sprint 2 audit as of
  the audit pin (`main @ 02f6184`, 2026-07-11); where Phase 0 Wave A
  (PRs #173/#174) altered a pinned finding, the fix reference rides alongside.
  Live status lives in HANDOFF.md, never here.

Consumers of this document: `03-PERFORMANCE-MODEL.md` (homes for estimator
knowledge and the AE-1 paired entries), `05`–`07` (the magnitudes their
designs read), `10`/`11` (the closure list as migration workload), and
`13-VALIDATION-STRATEGY.md`, which cites the knowledge-validation hooks
registered in §6.

---

## §1 The rule: the engine consumes knowledge, never contains it

Constitution Art 17, operationalised by the KA's hard-coding test (KA §2.2):
anything about to be written into Decision Logic that is really Knowledge — a
sport's needs, a dose-response, a threshold, **any coefficient that says how
much** — stops, and goes to a knowledge module with provenance and confidence.
V2 extends the ratified principle's *reach*, not its content
(00-ARCHITECTURE §3, "DEEPENS"): the audit found the WHAT layer genuinely
knowledge-driven while coaching magnitudes lived as code literals at full
authority (audit 05 §1). The rule this map enforces on every row:

> **Every value that steers a decision is either (a) a governed knowledge
> entry with provenance, confidence, and a version surface, or (b) explicitly
> labelled a seed with an authority cap (Art 13), or (c) provably Decision
> Logic / Calculation under KA §2 — in which case it carries no domain fact.**

### 1.1 The nine sources, mapped onto the twelve KA domains

The sprint brief reasons in nine knowledge sources. KA §4 owns the canonical
partition (twelve domains); the correspondence below is a *mapping*, not a
re-partition — where a source is not knowledge at all, the map says so and
names the real owner.

| Brief's source | Canonical home | Note |
|---|---|---|
| Scientific knowledge | KA Domains 3 (Quality & Adaptation) · 4 (Movement) · 6 (Programming) · 7 (Recovery/Fatigue/Load) · 9 (Injury) · 10 (Evidence & Confidence) · 11 (Validation thresholds) · 12 (Learning meta-models) | "Scientific" is a provenance quality, not a domain — it partitions across the domains that carry evidence tags (KA §3.1) |
| Sport knowledge | KA Domain 2 (the SKB) | Position and competition structure fold in per KA §4.1 |
| Exercise knowledge | KA Domain 5 (Exercise / Intervention) | Incl. the target additions KA Domain 5 names (adaptations driven, costs, transfer, substitution graph) |
| Recovery knowledge | KA Domain 7 (Recovery, Fatigue & Load-Response) | One merged system per KA §4.1 |
| Constraint knowledge | KA Domain 8 (Constraint) | How constraints shape and are re-checked — the *rules*; a specific athlete's constraints are Stored Data |
| Athlete knowledge | KA Domain 1 (Athlete) | The *modelling rules only* — KA Domain 1's own boundary: the athlete's actual data is Stored Data, owned data-side |
| Historical athlete data | **Not knowledge** — Stored Data (KA §2 kind 5) in the longitudinal athlete record, DAAS §3 *(designate, in review)*; athlete-owned, consent-based (Constitution Art 22) | This map registers every such input against the DAAS home (§2) |
| Coach configuration | **Not knowledge** — authored constraint data (the coach's season/team calendar — Ontology §3; the Stage-5 Team seam in 02 §2.8) and recorded Overrides (Ontology §9) | Enters decisions as typed *input*, behind the override seam where it substitutes an output (TAS §5.11); never enters a knowledge registry |
| Engine logic | **Not knowledge** — KA §2 kinds 2 (Decision Logic) and 4 (Calculation) | Legitimate only within §5's bounded list; a domain fact found here is a defect by definition (KA §2.2) |

### 1.2 The version surfaces

Every owned input names the surface that versions it (the last column of §2):

- **KSV** — the engine's knowledge-set version: the governed KB entries and
  the engine's sibling data modules, stamped into every plan
  (`engineVersion × knowledgeSetVersion`, TAS §5.12).
- **SKB** — per-profile `schemaVersion` under the 21-section contract
  (KA §4 Domain 2), registry-validated on load.
- **Priors** — learned Predictions, versioned like knowledge with provenance
  (KA §5; EDS D16); athlete-tier priors live privately in Athlete State
  (KA §7), never on the shared surface.
- **Dictionary** — Metric Dictionary entry versions (DAAS §4.1 — designate,
  in review), governing every captured metric's semantics.
- **Record** — the longitudinal athlete record's append-only stamps: Stored
  Data is ground truth with provenance tags, not versioned knowledge;
  materialised derivations carry computation date + engine and knowledge-set
  versions (KA §2.1; DAAS §3.2 — designate, in review).

---

## §2 Ownership per pipeline input — the master table

One row per input named by 02's stage specifications (*Inputs* + *Knowledge
Required* fields, both — knowledge-side rows carry a KA domain; data-side rows
are **registered against the DAAS** *(designate, in review)* and re-derive
nothing). Engine-internal artefacts (a prior stage's typed output consumed by
the next stage) are owned by the emitting stage's contract (02 §2) and appear
only where 02 names them as an input from *outside* the D1→D14 chain of
custody. Authority tiers restate 02's per-stage Confidence Level rulings in
one word; 02 governs the nuance.

Shape vocabulary: `entry` = universal knowledge entry (KA §3.1) · `registry` =
validated registry of entries (KA §3.2) · `SKB section` = a section of the
21-section profile (KA §4 Domain 2) · `contract` = the Domain 7 index contract
· `stored` / `derived` / `prediction` = KA §2 kinds 5 / 6 / 8 · `dictionary` =
Metric Dictionary entry (DAAS §4.1 — designate) · `entity` = Ontology-owned
entity instance.

| Stage | Input | Owner | Shape (KA §3.1 / §2) | Authority tier (Art 13) | Version surface |
|---|---|---|---|---|---|
| D1 | Onboarding answers; demographics incl. developmental stage (Art 21) | Stored Data — capture per DAAS §2.1 (designate); entity vocabulary Ontology §10 | stored | ground truth (n/a); missing safety fields fail the contract, never default (02 §2.1) | Record |
| D1 | Tracked lifts; training history | Stored Data — longitudinal record, DAAS §3 (designate); athlete-owned (Art 22) | stored | ground truth; sanity-bounded at entry (EDS D1) | Record |
| D1 | Test Results & observations (Family VIII) | Stored Data — assessment batteries DAAS §2.1.2 (designate); entities Ontology §10 | stored (protocol = knowledge, see next) | measured facts may reach gate (02 §2.1) | Record + Dictionary |
| D1 | Assessment protocols (what a test is, how it scores) | KA Domains 2/3 (SKB `assessments` + quality-taxonomy assessment links); battery mechanics DAAS §2.1.2 (designate) | SKB section + entry | soft input to estimation | SKB + KSV |
| D1 | Athlete-tier priors (from D16, previous loop) | Prediction — KA Domain 12 meta-models; stored privately per KA §7 | prediction | soft input; never gate-capable alone (02 §2.16) | Priors |
| D1 | D17 insights as assessment evidence (previous loop) | Insight entity — DAAS §2.3 (designate); Ontology §10 | derived (promoted entity) | as granted at birth; reported unless consumed under stated rationale (DAAS §2.4 — designate) | Record (materialised) |
| D1 | Capability-estimation rules per quality; training-age bands; competency gates | KA Domain 1 (Athlete) | entry / registry | measured competency + contraindication facts gate-capable; inferred estimates soft (02 §2.1) | KSV |
| D1 | Evidence→authority mapping | KA Domain 10 (Evidence & Confidence) | entry (itself governed) | meta — governs the tiers | KSV |
| D2 | Goal / sport, event, season window, intent, Performance Outcome | Stored Data (athlete-stated; the goal belongs to the athlete — Art 3); capture DAAS §2.1 (designate) | stored | season/fixture facts gate scheduling; the goal is never overridable (02 §2.2) | Record |
| D2 | The sport's SKB module | KA Domain 2 (Sport / SKB) | SKB sections (`meta`, `physicalProfile`, `energySystems`, `movementProfile`, `injuryProfile`, `seasonalModel`) | demand importances soft; contested claims reported (02 §2.2) | SKB |
| D2 | Goal-as-sport demand profiles (build goals) | KA Domain 2 — registered as goal-as-sport members of the sport registry (at the pin: `data/goalDemand.js` + discipline modules, provenance in comments — audit 05 §4) | registry → full entry shape (closure §3) | soft input | KSV |
| D2 | Quality & Adaptation taxonomy (demand vocabulary) | KA Domain 3 | registry | soft input | KSV |
| D3 | Position / event | Stored Data (athlete- or coach-stated) | stored | factual | Record |
| D3 | Individual demand signals (history, asymmetries, stated priorities) | Stored Data + Derived Data — longitudinal record, DAAS §3 (designate) | stored / derived | soft; refinement never vetoes (02 §2.3) | Record |
| D3 | Position modifiers | KA Domain 2 (SKB `positions` section) | SKB section | soft input, SKB-confidence-inherited | SKB |
| D3 | Athlete modelling rules (folding individual signals) | KA Domain 1 | entry | soft input | KSV |
| D4 | Injury status (active/history) | Stored Data — athlete state; entity Ontology §10 | stored | factual; drives gates downstream via Domain 9 | Record |
| D4 | Recent performance / assessment data | Stored Data — DAAS §3 (designate) | stored | measured beats inferred (02 §2.1); contradiction recorded, never averaged (02 §2.4) | Record |
| D4 | Sport / athlete-tier priors (previous loop) | Prediction — KA Domain 12; sport/population tiers are shared Knowledge, athlete tier private (KA §7) | prediction | soft input | Priors |
| D4 | D17 insights incl. re-diagnosis triggers (previous loop; EDS §23) | Insight entity — DAAS §2.3/§2.4 (designate) | derived (promoted entity) | as granted at birth | Record (materialised) |
| D4 | Sport demand knowledge | KA Domain 2 | SKB sections | soft input | SKB |
| D4 | Quality gap/trainability knowledge | KA Domain 3 | entry | soft input | KSV |
| D4 | Injury-risk weighting knowledge | KA Domain 9 (at the pin: `data/regionQualityRisk.js`, provenance in comments — audit 05 §4) | entry (closure §3 shape-upgrade) | soft input to ranking | KSV |
| D4 | Evidence→authority mapping (diagnosis confidence ≤ weakest input) | KA Domain 10 | entry | meta | KSV |
| D5 | Season / phase context | Stored Data (calendar) + D7-owned phase artefact | stored / derived | factual | Record |
| D5 | Recoverability budget | Derived Data — computed under KA Domain 7's contract | contract output | gate-tier ceiling at D14; soft during selection | KSV (weights) |
| D5 | Priority-count bound (k), compatibility/interference knowledge | KA Domain 6 (Programming — interference models) + Domain 3 | entry | k is a governed bound (02 §2.5) | KSV |
| D5 | Recovery / fatigue-cost knowledge | KA Domain 7 | entry | soft input | KSV |
| D6 | Constraints; training history | Stored Data (athlete state) + the R4 constraint artefact (engine-internal, 02 §4) | stored / derived | per constraint kind (Domain 8) | Record |
| D6 | Concurrent-training / interference models; sequencing rules | KA Domain 6 | entry | soft input; L1-evidence-backed (02 §2.6) | KSV |
| D6 | Quality & adaptation compatibility | KA Domain 3 | entry | soft input | KSV |
| D7 | Season / competition calendar | Stored Data — athlete- or Team-coach-authored constraint data (Ontology §3) | stored | fixed dates gate scheduling (02 §2.7) | Record |
| D7 | Recoverability priors (previous loop) | Prediction — KA Domain 12 | prediction | soft input | Priors |
| D7 | Periodisation models; taper knowledge; block-length heuristics | KA Domain 6 (at the pin, partly `data/blockPriors.js` + `data/periodizationDefaults.js`, provenance in comments — audit 05 §4) | entry / registry | periodisation-beats-none L1; exact lengths heuristic → moderate (02 §2.7) | KSV |
| D7 | Deload-rhythm / recoverability knowledge | KA Domain 7 | entry | bounds deload cadence — soft with a gate-tier recoverability ceiling | KSV |
| D8 | The fixed sport schedule | Stored Data — athlete- or Team-coach-authored (the Stage-5 seam, 02 §2.8); coach configuration per §1.1 | stored | gate (tier 2, Sport Protection) | Record |
| D8 | Fixture congestion | Derived Data (computed from the calendar) | derived | factual input to templates | Record |
| D8 | Microcycle templates by fixture density | KA Domain 6 (+ SKB `microcycles` per-sport — §4) | entry + SKB section | soft input | KSV + SKB |
| D8 | Sport-calendar semantics (constraint kind) | KA Domain 8 | entry | shapes; re-checked at D14 (EDS §36) | KSV |
| D9 | The resolved constraint artefact (ruling R4) | Engine-internal Derived Data composed from D1/D6/D8 outputs (`06-CONSTRAINT-ENGINE.md`); constraint *kinds* = KA Domain 8 | derived (Calculation over decided facts — KA §2; 02 §4 R4) | per constraint kind; injury subtractions gate-tier | n/a (recomputed; stamped) |
| D9 | Session-objective / fatigue-budget knowledge | KA Domain 6 | entry | soft input; purpose coherence gated at D14 (02 §2.9) | KSV |
| D9 | Quality targets & intensity-zone knowledge | KA Domain 3 | entry | soft input | KSV |
| D10 | Movement-pattern taxonomy; force-velocity & contraction vocabulary; requirement-derivation rules | KA Domain 4 (Movement) | registry + entry | requirements soft (02 §2.10) | KSV |
| D10 | Contraindicated patterns (per injury, per stage) | KA Domain 9 | registry | **gate** — subtractions are gate-tier facts (02 §2.10) | KSV |
| D11 | Exercise / intervention library (patterns, qualities, costs, transfer, substitution graph) | KA Domain 5 | registry (target additions per KA Domain 5; tag-provenance upgrade — closure §3) | transfer ratings soft; equipment/competency/contraindication checks gate (02 §2.11) | KSV |
| D11 | Per-sport transfer ratings | KA Domain 2 (SKB `exerciseLibrary`, 1–10 with provenance) | SKB section | soft input to ordering | SKB |
| D11 | Movement vocabulary (requirement matching) | KA Domain 4 | registry | soft | KSV |
| D11 | Equipment / competency / time constraint rules | KA Domain 8 | entry | gate-tier checks | KSV |
| D11 | The value hierarchy + stopping rule (EDS §34) | KA Domain 6 — near-constitutional (encodes Art 7; changes rarely) | entry | governs ordering; not a tunable | KSV |
| D12 | Dose-response models per quality/adaptation | KA Domain 3 | entry | direction high; magnitudes athlete-specific (02 §2.12); missing model ⇒ most conservative governed scheme, flagged (KA §3.1 no-fabrication) | KSV |
| D12 | Schemes, ramps, progression/advancement rules | KA Domain 6 (at the pin: `data/doseSchemes.js` partial evidence blocks — audit 05 §4; the governed progression model is named missing knowledge — audit 05 §6) | entry | soft input | KSV |
| D12 | Recoverability ceiling; readiness-scaling rules | KA Domain 7 | contract + entry | ceiling gate-tier; readiness scaling symmetric (EDS D12) | KSV |
| D12 | Readiness (runtime, via D15 re-entry) | Derived Data — Domain 7 contract; propagation per DAAS §4.2 (designate) | contract output | soft input, never gate (EDS §28.3) | Record (materialised history) |
| D12 | Per-athlete dose-response priors (previous loop) | Prediction — KA Domain 12 | prediction | soft input | Priors |
| D12 | D17 trend insights as advancement driver signals (previous loop) | Insight entity — DAAS §2.3 (designate); drivers designed in `07-PROGRESSION.md` | derived (promoted entity) | as granted at birth | Record (materialised) |
| D13 | Spacing / interference penalty weights | KA Domain 6 (at the pin: governed `data/schedulingPolicy.js` — the audit's strongest layer, audit 03 §2) | entry | soft (tier 6 Optimisation); sport schedule + key-session protection gate (tier 2) | KSV |
| D13 | Fatigue decay / recovery-time models | KA Domain 7 | entry | soft input | KSV |
| D14 | Validator definitions: checks, thresholds, `pass|trim|veto` actions, authority, **constitutional tier tags** (02 §3.1) | KA Domain 11 (Validation) | registry | per validator: safety validators gate at moderate confidence; optimisation validators defer (02 §2.14) | KSV |
| D14 | The conflict order | Decision Logic (constitutional — KA §2.3); compiled as 02 §3's pass | code (bounded, §5) | n/a — it *is* the resolution rule | engine version |
| D14 | Recoverability model; volume ledger (MRV) | KA Domain 7 + Domain 5 contribution weights (ledger inputs — closure §3) | entry | recoverability/MRV gate-tier ceilings (Art 6) | KSV |
| D14 | Constraint re-check rules | KA Domain 8 | entry | gate | KSV |
| D14 | Verdict-authority mapping (contested science cannot veto) | KA Domain 10 | entry | meta | KSV |
| D14 | Overrides / AI proposals seeking to ship | Override entity (Ontology §9); AI via AIGAS seams | entity | disposed by the suite — never last-word (Art 19) | Record |
| D15 | The immutable plan (D14 output) | Derived Data (the plan is Derived, never Stored-as-truth — KA §2.3) | derived | n/a — the baseline | Record (stamped) |
| D15 | Done vs prescribed; committed-session freezes | Stored Data — DAAS §3 (designate) | stored | freezes inviolable (Art 10) | Record |
| D15 | Today's readiness; training load (absolute + change) | Derived Data — Domain 7 contract; DAAS §4.2 propagation (designate) | contract output | readiness soft; contested load ratios (ACWR class) soft-or-reported, never gate (EDS §28.3) | Record (materialised) |
| D15 | Active injuries | Stored Data (as inputs, not post-filter — 02 §2.15) | stored | drives Domain 9 gates | Record |
| D15 | Sport decision rules (runtime triggers) | KA Domain 2 (SKB `decisionRules` — trigger/effect vocabulary; §4) | SKB section | per-rule confidence; effect magnitudes governed (closure §3) | SKB + KSV |
| D15 | D17-derived signals as typed runtime inputs | Insight entity — DAAS §2.4 sole-entry rule (designate) | derived (promoted entity) | at the tier D17 assigned — never self-upgraded | Record (materialised) |
| D15 | Transitively: every domain D9–D14 read | as per those rows (same decision functions, both passes — TAS §5.1) | — | — | — |
| D16 | Prescribed vs actual; readiness/recovery responses; performance changes over time | Stored + Derived Data — DAAS §3 (designate) | stored / derived | evidence for updates | Record |
| D16 | D17 insights as evidence | Insight entity — DAAS §2.3 (designate) | derived (promoted entity) | evidence only | Record (materialised) |
| D16 | Recorded Overrides as signal | Override entity (Ontology §9) | entity | evidence only | Record |
| D16 | The Performance Outcome (transfer referee — ruling R2) | Typed field carried from D2 (Ontology §4) | derived (carried field) | referee for block verdicts | Record |
| D16 | Learning rates; shrinkage/update rules; promotion policy | KA Domain 12 (Learning) | entry | governs updates; priors it emits are soft-input-only (02 §2.16) | KSV |
| D16 | Confidence composition rules | KA Domain 10 | entry | meta (open-problem status recorded there) | KSV |
| D17 | Athlete-state history; the longitudinal record | Stored Data — DAAS §3 (designate); V2 consumes, never re-owns | stored | ground truth | Record |
| D17 | Test Results, Match Performances, External Load Observations | Stored Data — capture DAAS §2.1.2/§2.1.5 (designate); entities Ontology §10 | stored | per-datum provenance/reliability (DAAS §2.1.1 — designate) | Record + Dictionary |
| D17 | Metric definitions (semantics, source classes, privacy class, baseline treatment) | Metric Dictionary — DAAS §4.1 (designate); entry contents authored under KA discipline | dictionary | definitional; privacy classes feed build-failing validators | Dictionary |
| D17 | Signal-derivation & baseline models; trend/anomaly rules & thresholds | KA Domain 7 — homed per DAAS §2.3.3 (designate): analysis knowledge is knowledge, never literals in analysis code; no new domain | entry | products born reported; promotion only by governance (02 §2.17) | KSV |
| D17 | Normative bands / benchmarks | KA Domain 1 — per DAAS §2.3.3 + §6.1 (designate); Art 21 conservative differentiation binds | entry | comparison context — reported | KSV |
| D17 | Evidence→authority treatment of analytical products | KA Domain 10; propagation composed by DAAS §4.2 (designate) | entry | meta | KSV |
| D17 | The knowledge-set version (attribution input) | TAS §5.12 provenance stamp | stamp | attribution, not authority | KSV (by definition) |

**Completeness rule (for `13` and the whole-set pass, Task 15).** A stage
input that cannot be placed on this table is a defect in this document, not a
licence to hard-code: the row is added (with its owner argued), or the input
is renamed to one that exists. The table is closed over 02's text at
authoring time; 02 is the naming authority and later 02 changes reopen it.

---

## §3 The HOW-MUCH closure list

The audit's bare-coefficient census (audit 05 §4; TR-12; audit 06 · SR-07;
audit 07 · G19; audit 08) made actionable: one row per finding, each given its
target home under §1's rule. All code references are facts **as of the audit
pin (`main @ 02f6184`, 2026-07-11)**. Phase 0 Wave A (PRs #173/#174) altered
none of these rows — its fixes were honesty and routing repairs on adjacent
findings (P0 set incl. the `strengthEndurance` identity mapping +
`droppedDemands` ledger, injury veto keying, legacy cohort rescue — PR #173;
veto identity keying + unified demand traversal — PR #174), so each pinned
finding below stands, with the fix PRs cited alongside where they touched the
same file.

**The closure rule (restating §1 for this list):** every coefficient below
either becomes a governed entry (KA §3.1 shape: provenance, confidence,
`lastReviewed`, on a version surface) or is explicitly labelled a **seed**
with an authority cap (Art 13) — a seed may steer at soft input at most, its
seed status is surfaced in the rationale of every decision it touches, and it
carries a named replacement path (measurement, literature, or the D16 loop).
Silent full-authority literals cease to exist as a category.

| # | Coefficient class (as pinned) | Where (audit pin) | Target home | Closure verdict |
|---|---|---|---|---|
| 1 | ~30 allocator shape literals (splits, caps, ordering magnitudes; session ceiling + pattern cap already governed at the pin — audit 05 §3) | `packages/engine/src/lib/plan/allocator.js` (TR-12; audit 06 · G19; audit 08); file also touched by Wave A cohort rescue, PR #173 — literals unaffected | KA Domain 6 (Programming) governed entries | Governed entries; any without literature anchor labelled seed + capped |
| 2 | `PATTERN_CONTRIB` fractional-set weights — the entire volume ledger's input | `packages/engine/src/data/muscleVolume.js:61`, consumed via `lib/plan/contributions.js` (audit 05 §4) | KA Domain 5 (muscle-contribution ledger input, named in Domain 5's target schema) | Governed entries with provenance; the fractional-set *arithmetic* stays Calculation (KA §2.3) — only the weights are knowledge |
| 3 | `exerciseSimilarity` SIM matrix (substitution distances, default 0.4) | `packages/engine/src/data/exerciseSimilarity.js:52` (audit 05 §4) | KA Domain 5 (the substitution graph, named in Domain 5's target schema) | Governed entries; default-distance labelled seed + capped |
| 4 | `injuryTaxonomy` `high_risk` flags — gate professional-referral triage with no citation | `packages/engine/src/data/injuryTaxonomy.js` (audit 05 §4) | KA Domain 9 (Injury) | Governed entries with citations — **mandatory**, not seed-eligible: these are gate-tier under Art 8, and a gate requires high-confidence knowledge (Art 13) |
| 5 | `femaleRepBump` +2 — the engine's only sex modifier, ungoverned | `packages/engine/src/lib/plan/allocator.js:227` (audit 05 §4; the modifier-family gap is G20; audit 08) | KA Domain 6 scheme-modifier entry, first member of the athlete-modifier family (age/sex/developmental — G20; Art 21 binds the youth members) | Governed entry or labelled seed + capped; the family expansion is `03`/`07` design fed by this row |
| 6 | Duplicated readiness weights — code copy operative, KB entry `index.readiness.weights` decorative | `packages/engine/src/lib/indices/readinessIndex.js:38` vs `lib/knowledge/entries.js:379` (audit 05 §4; TR-12; audit 06) | KA Domain 7 — the governed entry becomes the **single operative source**, read by the index | One source; the drift class (governed-entry-as-decoration) is a §6 hook (KV-2) |
| 7 | Sport-fact sets in engine logic: `D11_SPORTS`, `CATEGORY_LED`, `SSC_SPORTS` | `lib/plan/allocator.js:88` · `lib/session/categoryCoverage.js:110` · `data/qualityMovementMap.js:44` (TR-12; audit 06 · SR-07; audit 07) | KA Domain 2 — SKB `meta` cohort/routing facts (audit 05 §7 rec 5) | A sport's cohort membership becomes an authored SKB fact; adding a sport stops requiring a code-set edit (the Art 17 falsification TR-12 names) |
| 8 | Exercise axial / CNS / level / stretch tags at zero provenance | `packages/engine/src/data/strengthExercises.js` (audit 05 §4) | KA Domain 5 | Shape upgrade: per-tag provenance or seed label; axial/CNS feed D13/D14 spacing and so steer |
| 9 | `sportLoad` systemic-load factors | `packages/engine/src/lib/strength/sportLoad.js` (audit 05 §4) | KA Domain 2 — SKB `loadManagement` (per-sport), Domain 7 defaults | Governed; per-sport override activates a dormant SKB section (§4) |
| 10 | Season cutoffs 56/120 days (phase detection) | `packages/engine/src/lib/plan/periodization.js:56-57` (audit 05 §4) | KA Domain 6 periodisation defaults; per-sport override via SKB `seasonalModel` | Governed entry; sport-specific windows are SKB facts |
| 11 | `reflowAdjust` effect magnitudes (volume multipliers per decision-rule effect: 0.6 / 0.55 / 0.4 / 0.85 / 0.2) | `packages/engine/src/lib/sportKnowledge/reflowAdjust.js:17-23` (audit 05 §4) | KA Domain 7 (load-response magnitudes), parameterisable per rule via SKB `decisionRules` `effect.params` | Governed entries; a sport's authored rule may carry its own magnitude, validated on load |
| 12 | `LIGHT_STRENGTH_MAINS` — the one dose scheme with no evidence block | `packages/engine/src/data/doseSchemes.js` (audit 05 §4) | KA Domain 6 | Shape upgrade to the full entry |
| 13 | The comment-provenance band: `selectionScoring` · `schedulingPolicy` · `blockPriors` · `capabilityPriors` · `regionQualityRisk` · `strengthStandards` · `goalDemand` · `periodizationDefaults` · `qualities` | `packages/engine/src/data/*` (audit 05 §4 — "provenance in comments only") | Their §2 domains (6 · 6 · 6 · 1 · 9 · 1 · 2 · 6 · 3 respectively) | Shape upgrade: machine-readable provenance + confidence per entry — comments cannot be read by decisions, so Art 13 cannot operate on them |

Two audit corollaries ride with the list, closed by the same rule rather than
by rows of their own: the unwired `kb.staleEntries` staleness watchdog (audit
05 §2) becomes hook KV-6 (§6), and the "decorative confidence" pattern —
athlete-signal confidence computed and never branched on (audit 05 §5;
SR-08; audit 07) — is closed structurally by the DAAS propagation rule
(§4.2 — designate, in review), which 02's D15/D17 rows already bind to.

---

## §4 SKB activation map

The SKB is the platform's deepest authored asset; at the audit pin roughly six
of its 21 sections steered plans (audit 05 §2). V2 assigns **every section a
consuming stage or an explicit deferral** — an authored section with neither
is exactly the "computed-but-unread" defect class the chain rule forbids
(DAAS §2 no-orphan-outputs — designate, in review; Art 20). Section list per
the ratified 21-section contract (KA §4 Domain 2); consumption facts as of the
audit pin (audit 05 §2). The relocated `gymSupport` section (post-v1.0
addition to the profiles) is included for completeness.

| SKB section | V2 consumer (stage · use) | Status of the assignment |
|---|---|---|
| `meta` | D2 registry identity + **cohort/routing facts** (closure §3 row 7) | Active at pin; widened by closure |
| `physicalProfile` | D2 ranked demand (the Diagnostic Triangle's demand leg) | Active at pin |
| `energySystems` | D2 energy-system targets in the demand profile | Consumed into demand; **dosing deferred — Stage 7 (endurance programming)**: no stage doses energy-system work until the endurance interventions + dose models exist (KA §3.3's endurance row) |
| `movementProfile` | D3 refinement · D10 sport movement signatures | Activation with `03`/`05` designs |
| `injuryProfile` | D4 injury-risk weighting · D11 prevention emphasis | Activation with `03` |
| `positions` | D3 position modifiers | Active at pin |
| `assessments` | D1 measured estimators (C8 — the audit's single highest-leverage gap, audit 05 §6); capture mechanics DAAS §2.1.2 (designate) | Activation with `03` §5 |
| `developmentPriorities` | D1 developmental-stage modelling · D7/`07` LTAD level (Art 21) | Dormant at pin (audit 05 §2); activation with `07`'s LTAD design |
| `seasonalModel` | D2 season context · D7 block objectives (active at pin since the 2026-07-09 wiring — audit 05 §3) | Active at pin; widened by closure §3 row 10 |
| `microcycles` | D8 fixture-density templates | Dormant at pin; activation with `05`; full value arrives with the **Team coach-schedule constraints (Stage 5 dependency)** |
| `gymPhilosophy` | D6 strategy defaults per sport | Activation with `05` |
| `exerciseLibrary` | D11 per-sport transfer ratings | Active at pin |
| `injuryPreventionLibrary` | D11 prevention selection · D8 prevention-day intent | Dormant at pin; activation with `05`/`06` |
| `decisionRules` | D15 runtime triggers (see the no-op ruling below) | Partially active at pin |
| `loadManagement` | D12/D15 per-sport load overrides (closure §3 row 9) | Dormant at pin (global entries used instead — audit 05 §2) |
| `readinessModel` | D15 per-sport readiness weights (KA Domain 7 names this wire) | Dormant at pin; activation with the Domain 7 single-source fix (closure §3 row 6) |
| `coachDashboard` | D17 squad roll-up + report assembly, rendered per DAAS §5/§7 (designate) | **Deferred — Team package**: activates with the coach reporting surface; derived-only posture binds (Art 11) |
| `athleteDashboard` | D17 report assembly → PRESENT (DAAS §7 — designate) | Activation with the reporting read-model |
| `validation` | D14 sport-specific thresholds (KA Domain 11 registry members) | Activation with `13` |
| `references` | Provenance substrate for every section (KA §3.1 `source`) | Cross-cutting; active by construction |
| `kpiFramework` | D17 benchmark comparison + reporting KPIs (privacy-validated at pin, consumed by nothing else — audit 05 §2) | **Deferred — Team package** for coach KPIs; athlete-facing KPIs activate with `08`/reporting |
| `gymSupport` (relocated) | D6/D7 strategy + periodisation defaults · D11/D12 sport gym-support | Active at pin |

**The four no-op `decisionRules` effects, ruled.** At the pin, 4 of 11
validated effect types were evaluator no-ops — a sport's authored safety rule
could fire and do nothing, silently (audit 05 §2): `exclude_soreness_above`,
`reduce_region_eccentric`, `reduce_region_overhead`, `cap_high_speed`
(`lib/sportKnowledge/schema.js:38-44`). **Ruling: all four are made real, none
rejected** — each is a legitimate coaching action whose blocker is missing
Exercise knowledge, not a bad idea: they require the per-exercise region
mapping, contraction-emphasis, overhead, and velocity-class tags that KA
Domain 5's target schema already names. The activation is therefore a
Domain 5 data addition plus evaluator wiring, sequenced in `11`; until wired,
a profile authoring one MUST fail SKB validation loudly rather than validate a
no-op — a rule that cannot act may not pretend to (Art 15; the silent-list
discipline, G17; audit 08).

---

## §5 What stays engine logic — the bounded category

"Engine logic" is not a residual bucket; it is a closed list under KA §2's
kinds 2 (Decision Logic) and 4 (Calculation). Everything on it shares one
property: **it operates ON knowledge and state, and contains no domain fact**
— no sport's needs, no dose magnitude, no threshold. If a literal steering a
decision is found inside any of these, §3's rule applies to it; the category
never shelters it.

1. **The decision functions themselves** (KA kind 2) — the D1–D17 reasoners:
   gap arithmetic's *structure*, ranking, selection-with-stopping-rule,
   dose assembly, placement optimisation. The EDS owns each stage's reasoning
   (02 §2); the parameters they read are §2's rows.
2. **The conflict order and its resolution pass** (constitutional Decision
   Logic — KA §2.3; 02 §3). Changes only by constitutional amendment; the
   *tier tag on each validator* is Domain 11 knowledge (02 §3.1), the pass is
   code.
3. **Calculations** (KA kind 4) — fractional-set arithmetic over the Domain 5
   contribution weights, volume-ledger summation, calendar/window arithmetic,
   constraint-artefact composition (ruling R4: Calculation over
   already-decided facts), confidence composition per the Domain 10 rule.
4. **Contract enforcement and registry validation machinery** — the
   validate-on-load harness, stage-boundary contract checks (TAS §5.3);
   *what* they check is Domains 10/11 + registry invariants; *that* they
   check is code.
5. **The provenance/versioning substrate** — stamping
   `engineVersion × knowledgeSetVersion`, trace assembly (TAS §5.12, §5.5).

Everything else the pipeline touches is knowledge (KA §4 domains, versioned),
athlete data (DAAS-owned — designate, in review; athlete-owned per Art 22),
learned Predictions (Domain 12 channel), or coach-authored input (Ontology
§3/§9). That fourfold split plus this bounded list is the whole territory:
there is no fifth place for a coaching fact to live.

---

## §6 Knowledge-validation hooks (registered for `13-VALIDATION-STRATEGY.md`)

The ownership verdicts above are enforceable, not aspirational. `13` owns the
suite and enforcement ladder; this map registers the hooks it cites:

- **KV-1 · Registry load validation.** Every registry validates members on
  load: structure, provenance-where-authored, domain invariants, privacy
  sweep (KA §3.2). Includes §4's loud-failure rule for unwireable
  `decisionRules` effects.
- **KV-2 · Single-operative-source check.** No governed entry may have a code
  twin (closure §3 row 6's defect class): a knowledge value consumed by any
  decision is read from its version surface, and a duplicated literal fails
  the closure lint (KV-4).
- **KV-3 · Authority-tier compliance.** Granted tier ≤ mapping(confidence);
  consumer usage ≤ granted tier; contested science capped at soft input —
  the DAAS propagation rule's checkable form (DAAS §4.2 rules 4–6 —
  designate, in review; Domain 10 mapping).
- **KV-4 · The closure lint.** A static check over the reasoning core: no
  numeric literal steers a decision unless it is (a) a Calculation constant
  with no domain content, or (b) annotated to its governed entry / seed
  label. The §3 list is its initial worklist; the lint keeps the class closed
  after migration.
- **KV-5 · Consumption coverage.** Every authored knowledge surface declares
  its consumers or its explicit deferral (§4's discipline; the DAAS
  no-orphan-outputs rule — designate, in review). Authored-but-unconsumed
  without a deferral entry is a detected defect, not a fact of life.
- **KV-6 · The staleness watchdog, wired.** `lastReviewed` cadence checking
  feeds a review queue with a real consumer (Domain 10's watchdog; the
  authored-but-unwired state at the pin — audit 05 §2 — is the counter-case).
- **KV-7 · Seed-authority audit.** Every seed-labelled value (closure rule,
  §3) is enumerable, carries its cap and replacement path, and appears in the
  validation report of any plan it steered (Art 13; Art 15).

---

*Next in the reading order: [`05-SESSION-BUILDER.md`](05-SESSION-BUILDER.md),
[`06-CONSTRAINT-ENGINE.md`](06-CONSTRAINT-ENGINE.md), and
[`07-PROGRESSION.md`](07-PROGRESSION.md) — the construction designs that read
these owned inputs.*
