# Governance Audit 08 — The Data & Analytics Pillar Deep-Dive

**Class: REVIEW (T5) · dated evidence, never current state · 2026-07-11**
**Pin: frozen set v1.0 (2026-07-01) · `main @ fc5e3f8` · KSV 1.30.0**
**Spec: [`docs/superpowers/specs/2026-07-11-governance-forensic-audit-design.md`](../superpowers/specs/2026-07-11-governance-forensic-audit-design.md) · Benchmark: [`…-00-benchmark.md`](2026-07-11-governance-audit-00-benchmark.md)**

---

This deliverable is the cross-document deep-dive on the athlete data &
analytics pillar (benchmark P2.1–P2.11 + P3.5) — the half of the ambition the
benchmark calls "the understanding of the athlete" (00 §1). It synthesises the
seven per-document audits (01–07); their findings are **cited by GA-ID and
never re-derived**. New findings (GA-8xx, §5) are minted **only** for gaps
that exist *between* documents — a gap already carrying a GA-1xx…7xx ID is
cited, not re-minted. Where a capability carries both a vocabulary-slice
finding (Ontology GA-205/206/208/209, per audit 02 §2's probe scoping) and an
architectural finding (TAS/EDS), the two are treated as slices of **one** gap,
not counted twice.

## §1 The end-to-end chain

World-class athlete data analysis, for this platform, is one unbroken chain of
five links. A world-class fragment in one link is worth little if the next
link has no home for its output — which is precisely the shape of what the
per-document audits found.

**CAPTURE** — everything measurable about the athlete enters with known
provenance. For this platform that means: structured test batteries
(strength, power, speed, aerobic, movement quality) as scheduled, versioned,
repeatable protocols (P2.1); daily wellness/HRV/sleep/readiness streams
(P2.2); every gym session's prescribed-versus-done at set granularity (P2.3);
match and pitch data — GPS/accelerometry, minutes, match schedule,
availability (P2.4); and wearables attaching as adapters, never architecture
events (P6.4) — every datum source-tagged and reliability-tagged at the door
(P2.9). As of the pin, the live streams are onboarding answers, session logs,
weekly check-ins, daily metrics, and per-workout wearable readings
(`docs/SCHEMA.md`, read as dated evidence of data reality only — its banner
flags it stale).

**MODEL** — captured data becomes one longitudinal, career-long athlete
model: versioned, append-only, any past state reconstructable, quality and
missingness explicit (P2.6, P2.9). This is the data asset the benchmark calls
the second product — "the understanding of the athlete" that makes every
decision defensible and every trend visible years later (00 §1). The platform
has a real athlete model at the pin (`docs/architecture/ATHLETE-MODEL.md` —
typed, field-justified, source/confidence-tagged) — but a *current-state*
one, and the document that defines it is living/non-frozen, not governance
(see GA-803).

**ANALYSE** — the model yields understanding: trends that quantify whether
training is working (e1RM trajectories, tonnage, adherence — P2.3), a
per-athlete recovery profile (P2.5), normative benchmarking with stated
provenance (P2.8), squad roll-ups answering a coach's real questions (P2.7),
internal evidence generation under privacy-preserving aggregation (P3.5), and
AI-surfaced hypotheses that are attributed and checkable, never silent (P4.3).

**DECIDE** — analysis changes the plan only through defined, traceable
pathways: each analytic signal wired to a named decision with stated
authority, or explicitly advisory; confidence governing authority throughout
(P2.10, with P3.1's discipline). No insight silently steers; none silently
rots unread.

**PRESENT** — insights reach each audience in their language: the athlete
sees progress and rationale without jargon; the coach sees squad state
without raw vitals; every delivery surface is governed for accuracy against
the underlying data (P2.11), with AI rendering gated to rephrase, never
improvise (P4.2 slice).

The chain is sequential in dependency: ANALYSE without MODEL is trend-blind,
DECIDE without ANALYSE has nothing governed to consume, PRESENT without
DECIDE's trace discipline degenerates into decoration. The governance
question of this deliverable: does each link have an owner, and do the links
compose?

## §2 The governance map per link

### CAPTURE — link verdict: THIN

**Governed today by:** the TAS (primary owner of P2.1/P2.3/P2.4/P2.9/P6.4 per
00 §3), with the Ontology owning the vocabulary slice and the KA the
knowledge-semantics slice.

- The world-class islands are real: wearable/native attachment is fully
  governed — adapters behind an anti-corruption layer, normalisation,
  reliability tagging (GA-501, WORLD-CLASS); gym outcome capture is governed
  at the persistence boundary (GA-503 records capture as sound; it is the
  analysis half that fails); and monitoring-stream *derivation* semantics are
  world-class on the EDS side (GA-404).
- Everything else thins out fast. Test batteries: no architecture for
  scheduled, versioned protocols with persistent comparable results (GA-502),
  no Test/Assessment entity in the platform's vocabulary (GA-205, the naming
  slice of the same gap), and no decision that schedules a test — the EDS
  presumes estimates and calls that its own central scientific risk (GA-421,
  seam slice, read THIN per audit 04's token note). Match/pitch data: SILENT
  at the architecture (GA-504), no named carriers in the vocabulary (GA-206),
  no knowledge domain owning match-load semantics (GA-310, the KA-scoped
  slice; GA-504 owns the architectural gap), and only an aggregate "sport
  load" number at the decision seam (GA-420, read THIN).
- Datum-level quality is one clause deep: per-datum provenance, sensor-vs-
  self-report separation, and retention are unarchitected (GA-506), and the
  KA's taxonomy declares Stored Data "ground truth, confidence n/a," leaving
  recorded-data error with no home in the classification (GA-309).

**Missing governance, named:** an assessment-battery architecture; a second
ingestion boundary for match/GPS/availability data; a per-datum
provenance-and-quality model; and the semantic dictionary the ingestion
boundary normalises *into* (new — GA-804).

### MODEL — link verdict: THIN

**Governed today by:** the EDS (owner of P2.6) and TAS (storage/versioning
co-owner) — both of which govern the *current-state* athlete model well and
the *longitudinal* model almost not at all.

- The EDS specifies no versioning, no append-only history, no past-state
  reconstruction, no career span; D16's only model class is
  shrinkage-to-priors (GA-414). The TAS persists latest state, outcomes,
  priors, and freezes, but never architects temporal state (GA-508). The
  Ontology's frame assumes it: "everything else is derived" treats analysis
  products as recomputable exhaust — the assumption audit 02 §6.1 records as
  falsified by the end-state (structural home: GA-207).
- Sprint 2 evidence of where ungoverned modelling lands: all athlete history
  latest-only JSONB in `users.profile`, no outcomes/history substrate — the
  single gap that "caps D16, team trends, coach evidence, and the AI's track
  record at once" (TR-03; engine-audit 06 — evidence of the governance
  vacuum, never a finding itself).
- Two cross-document problems sit under this link and are minted in §5: the
  recompute-don't-store doctrine stated in three frozen documents at once
  (GA-802), and the fact that the model's operative semantics live, at the
  pin, in non-governing documents (GA-803).

**Missing governance, named:** the longitudinal athlete model itself —
append-only, versioned, reconstructable, consent-scoped (consent
preconditions: GA-109, GA-510) — and a reconciled ruling on storing
point-in-time derived history.

### ANALYSE — link verdict: THIN

**Governed today by:** the TAS (P2.3/P2.7 analysis, P3.5 infrastructure), KA
(P2.8 norms, P3.5 grading), EDS (P2.5, co-owned P2.3), AIGAS (P4.3), Ontology
(vocabulary).

- What exists is principled: internal-evidence aggregation infrastructure is
  ADEQUATE (GA-513), the per-athlete recovery profile is real and consumed
  (GA-413), and AI insight surfacing has its category, gate, and ceiling
  (GA-603).
- But the analytical layer as a whole rests on "a single unexpanded word
  ('Analytics') at L5" (GA-512's narrative): no read-model, storage, or
  serving design for trends (GA-503, with GA-416 the decision-side slice of
  the same gap); squad analytics stop at one point-in-time per-player signal
  with no cross-athlete aggregation home (GA-505; naming slice GA-208);
  normative benchmarking has no owning knowledge domain, no differentiation
  axes, no consumers (GA-307); the internal-evidence pathway lacks an
  evidence-scale rung and a promotion gate (GA-306); insights and reports
  have no entities at all (GA-209); and the analysis lifecycle has no
  structural home in the platform's vocabulary (GA-207). AI-side, the
  grounding surface a C5 scan may read is unspecified and match data is
  absent from AIGAS's vocabulary entirely (GA-603).

**Missing governance, named:** a designed analysis layer — trend/insight
products with stated derivations, squad roll-up family, normative bands with
provenance, an internal-evidence promotion gate, and a defined AI grounding
surface. This is the heart of GA-512's NEW-DOCUMENT CANDIDATE.

### DECIDE — link verdict: ADEQUATE

**Governed today by:** the Constitution (Art 13 principle — GA-111), KA
(the confidence→authority mapping, GA-301, WORLD-CLASS), EDS (§28.3 authority
tiers — GA-417), Ontology (consumers-and-confidence template — GA-203), AIGAS
(the AI segment — GA-604).

- This is the pillar's strongest link, and honestly so: the *discipline* for
  how any signal may influence a decision is world-class end to end —
  evidence-graded authority tiers (gate / soft input / reported metric),
  contested science barred from gating, the mapping itself governed as dated
  knowledge (GA-301, GA-111). For AI-origin analysis the seam question is
  answered outright: audit 06's probe (GA-604, a seam-probe verdict distinct
  from the P4.3 row verdict GA-603) established exactly three compliant
  routes for analysis into decisions — advisory to humans, staged/validated
  priors via Seam 2, or user-confirmed structured state — and this deep-dive
  adopts that three-route framing for the whole loop, as audit 06 directed.
- What keeps the link ADEQUATE rather than WORLD-CLASS: the loop has
  authority discipline but no producers and no carriers. There is no decision
  that reads the athlete's data and decides what it means — D15/D16 smuggle
  it, and the re-diagnosis trigger has no producing decision (GA-417); the
  loop's input vocabulary stops at training-state signals, so analytic
  products have nothing named to enter through (GA-203, with GA-205–209 the
  entity-level slices); and the decision catalogue is closed by doctrine, so
  an analysis decision family requires amending frozen text (GA-419, mirrored
  by GA-204 on the Ontology side).

**Missing governance, named:** the analysis decision family (GA-417) and the
extension clauses that let it register (GA-419/GA-204) — plus the
quality→authority propagation rule no single document owns (new — GA-801).

### PRESENT — link verdict: THIN

**Governed today by:** the TAS (owner of P2.11), AIGAS (AI-rendered slice),
Ontology (vocabulary), with the Constitution's explainability right (GA-105)
and the EDS's decision-record mechanics (GA-407) beneath it.

- Decision-explanation delivery is world-class three documents deep: the
  right (GA-105), the mechanics (GA-407), the one-trace/three-audiences
  read-model (audit 05 §2 P2.11 / GA-507; TAS §11) and the AI faithfulness gates (GA-607). The pattern to extend
  is already built and proven.
- Analytical delivery — progress trends, longitudinal insights, squad
  reports — has no compliant home: surfaces may compute nothing, no
  read-model serves trends, and the "coach analytics" row names an output
  with no path (GA-507); Report/Insight have no entities (GA-209); and audit
  05 §5.1 flags the undrawn line between forbidden coaching computation and
  presentational analytics as an over-specification risk that will either
  strangle or corrode this link until drawn.

**Missing governance, named:** an analytics reporting read-model extending
the §11 pattern, audience-accuracy governance for data products, and the
presentational-analytics boundary line.

## §3 The hypothesis, tested

The spec's working hypothesis: *programming governed superbly, data analysis
thinly*. Verdict: **CONFIRMED, with one refinement that matters for the
remedy.**

**The confirming evidence** is overwhelming and consistent across all four
altitude layers. At the architecture tier, seven of the TAS's twelve
owned/co-owned capabilities verdict THIN and two SILENT, with the entire
second product resting on one unexpanded word (GA-502–GA-512; audit 05 §7).
At the engine tier, the EDS "governs the athlete as someone to be coached,
not yet someone to be measured and understood" (audit 04 §7; GA-414, GA-416,
GA-417, GA-420, GA-421). At the vocabulary tier, the programme vocabulary is
complete while the athlete-understanding vocabulary stops at training-state
signals — no test result, no match datum, no insight, no report, no squad
signal, no analysis structure (GA-203, GA-205–GA-209, GA-207; audit 02 §7).
At the knowledge tier, the KA governs evidence-in world-classly and the
athlete-data side of the estate thin-to-silently (GA-306, GA-307,
GA-310; audit 03 §7). Meanwhile the programming pillar collected WORLD-CLASS
verdicts in depth: GA-101, GA-102, GA-110 (Constitution), GA-201, GA-202
(Ontology), GA-401 through GA-406 (EDS). The asymmetry the hypothesis predicted is real,
measured, and uniform in direction.

**The evidence the other way** — and this is what refines rather than
overturns the hypothesis — is that the data pillar is *not* uniformly thin.
It is well governed at exactly two kinds of places: **where data touches a
decision** (the confidence→authority discipline, GA-301/GA-111; monitoring
derivation and autoregulation inputs, GA-404/GA-403; the state-signal
vocabulary, GA-212; the AI analysis seams, GA-604) and **where data touches a
person boundary** (raw-vitals inviolability and its enforcement substance,
GA-103, and the TAS's privacy machinery; the coach's derived-only surface).
And capture is world-class precisely at the one boundary built so far
(GA-501).

**The refinement:** the platform governs athlete data superbly *as an input
to programming and as a privacy liability* — and hardly at all *as a product
in its own right*. That pattern has a single root, and it is the one audit 01
flagged for this deliverable to rule on: **GA-113 is CONFIRMED.** The
Preamble's existence test frames the platform's sole product as the
intervention, so every document below inherited the instrumental stance — the
EDS folded analysis into prior-updating (GA-414/GA-417's shared shape), the
Ontology declared everything beyond athlete state "derived" exhaust (GA-207),
the TAS gave the second product one word at L5 (GA-512), and the KA's
evidence scale never grew a rung for the platform's own data (GA-306). These
are not four accidents; they are one purpose-level omission propagating down
the precedence ladder, exactly as audit 01 §4 (GA-113) predicted ("a purpose-level
gap the P2.x-owning documents cannot repair from below"). Audit 01's watch
item compounds it: Art 20's defer-until-consumer discipline is a
chicken-and-egg trap for analytics, whose consumers are the decisions that
cannot consume what is never built (audit 01 §5.3) — and Sprint 2's evidence
shows the miniature version already run to completion: verdicts computed but
unread, learning staged but never promoted (TR-02, TR-03; engine-audit 06,
as evidence).

So the honest statement is: **programming is governed superbly; data
analysis is governed only as programming's exhaust.** The gap is not
scattered under-specification to be patched capability by capability — it is
a missing second product line, with a constitutional purpose gap at the top
(GA-113) and a missing architectural owner at the bottom (GA-512).

## §4 What world-class requires

Benchmark 00 §3 hypothesised that the P2 cluster (+P3.5) warrants a **Data &
Analytics Architecture Specification** peer to the EDS. This deliverable's
finding: the hypothesis is **supported from every direction this audit set
examined**, and the two strongest supports arrive independently — the TAS
audit from the architecture side (GA-512: no T3 spec pile substitutes for a
coherent peer architecture; the TAS's own seam test *licenses* an analytics
subsystem at L5, audit 05 §5.3) and the EDS audit from the decision/model
side (GA-414: the career-long athlete model is data-pillar territory the EDS
cannot own; GA-421: assessment/testing likewise). The Ontology audit adds the
boundary condition (GA-207): the *names* belong in the Ontology by its own
scope, whatever document owns the mechanics. Deliverable 09 rules; this
section states, at direction level only, what the candidate document — or,
if 09 rules otherwise, the equivalent amendment set — must cover. It is a
scope statement, not the specification.

**Per link:**

1. **CAPTURE** — the assessment-battery architecture: protocols as
   versioned knowledge, scheduling, and a results store whose data points
   are comparable across years (consolidating GA-502 + GA-421 + GA-205);
   the second ingestion boundary for match/GPS/minutes/availability data,
   instantiated on the proven ACL pattern (GA-504 + GA-206 + GA-310 +
   GA-420, with GA-501 as the template to reuse, not reinvent); the
   per-datum provenance/quality model — source, reliability, sensor-vs-self
   separation, retention classes (GA-506 + GA-309); and the governed metric
   dictionary that ingestion normalises into (GA-804).
2. **MODEL** — the longitudinal athlete model: append-only, versioned,
   point-in-time reconstructable, career-long, with plans and decisions as
   history (GA-508 + GA-414); the reconciled ruling on materialising derived
   history (GA-802); and the consent scope carried through the store —
   preconditioned on the Constitution-level rights amendment (GA-109) and
   its TAS enforcement spec (GA-510).
3. **ANALYSE** — the analysis layer design that expands L5's single word:
   trend products with stated derivations and confidence (GA-503 + GA-416),
   the recovery-analytics domain (GA-413), the squad-signal family
   (GA-505 + GA-208), normative bands with provenance and differentiation
   axes (GA-307), the internal-evidence promotion gate into the graded
   pipeline (GA-306 + GA-513), and — answering the question audit 06 §6.5
   routed here — **the candidate document defines the widened AI grounding
   surface**: the enumerated longitudinal data classes a C5 scan may read,
   which AIGAS's per-capability declaration (GA-603) then binds to.
4. **DECIDE** — every analytic product wired under the existing §28.3
   authority-tier discipline and the GA-604 three-route framing (both
   protected, not redesigned); the EDS-side companion amendments queued, not
   duplicated: the analysis decision family (GA-417) and the catalogue/
   ontology extension clauses (GA-419, GA-204); plus the quality→authority
   propagation rule (GA-801) stated once, in this document, for the whole
   chain.
5. **PRESENT** — the analytics reporting read-model extending the proven
   explanation pattern (GA-507 + GA-209), accuracy governance of every
   surface against underlying data, the drawn line between presentational
   analytics and coaching computation (audit 05 §5.1), with the AI-rendered
   slice inheriting AIGAS's existing gates unchanged (GA-607).

**Cross-cutting preconditions, owned elsewhere and cited:** the document
needs an entry path into T2 or it inherits AIGAS's limbo (GA-703); the
concept-family ownership registration must happen before authoring (GA-704);
the constitutional purpose clarification names the second product so the
document has a principle to trace to (GA-113); and the amendment batch it
travels with must be processable (GA-701 — whose forecast clause this
deliverable verified against the actual files: AMENDMENT CANDIDATE findings
exist in five upstream blocks — Constitution, Ontology, EDS, TAS, AIGAS —
not "across seven blocks"; the KA and doc-governance audits minted none,
classing every gap SPEC-FILLABLE. GA-802 below makes it six blocks of
eight.)

**What the candidate document must NOT do:** re-own what is already
world-class. The confidence→authority mapping stays with the KA (GA-301),
the seam discipline with AIGAS (GA-601, GA-604), the ingestion pattern with
the TAS (GA-501), the state-signal semantics with the Ontology (GA-212), and
the decision-record explainability mechanics with the EDS (GA-407). The
data pillar's missing document is a *completion* of the governing set, not a
rival to it — the same conclusion audit 05 §7 reached from inside the TAS.

## §5 Cross-document findings (GA-8xx)

Minted under the rule stated in the preamble: each finding below exists
*between* documents — no single upstream GA-ID covers it, and each entry
states why not.

| ID | Capability | Verdict | Citation | Narrative | Class | Proposed direction |
|---|---|---|---|---|---|---|
| **GA-801** | P2.9 × P2.10 (chain-wide) | SILENT | TAS §4.4 (reliability tagging) via GA-506; KA §2.1/§4 D7 via GA-309; EDS §28.3 via GA-417; KA §4 D10 via GA-301 | Capture-time data quality, datum semantics, and decision authority are each governed — in three different documents — but **no document owns the propagation rule connecting them**: how a datum's source/reliability, recorded at the TAS boundary, flows through an analytic derivation into the authority tier that product may exert at a decision. GA-506 governs tagging, GA-309 the taxonomy's quality hole, GA-301 the knowledge-side mapping — none states the end-to-end rule, so a trend built on wrist-optical wearable data would enter a decision with the same standing as one built on measured tests, or the linkage gets improvised per feature. **What breaks:** the DECIDE link's world-class authority discipline is only as honest as inputs whose quality lineage nothing traces. **When it bites:** the first analytics products consumed by decisions — Stage 5 squad signals, Stage 6 AI insights. **Absorbable without amendment? Mostly yes** — KA Domain 7's reliability-scaling and Domain 10's extensibility are the designed hooks (per GA-309, GA-301); the one amendment pressure point is KA §2.1's "Stored Data: confidence n/a" row, already flagged by GA-309. | NEW-DOCUMENT CANDIDATE | The candidate Data & Analytics spec states the single quality→confidence→authority propagation rule for the whole chain, citing the KA mapping and EDS §28.3 rather than duplicating them. |
| **GA-802** | P2.6 (× P3.5) | PRECLUDES (in aggregate, strict reading) | KA §2.1/§2.3 ("Derived Data … never stored as truth") per audit 03 §5.3; EDS §27 rule 1 per audit 04 §5.4 + §6 A8; TAS §7 (④, T2) + §16.1 C3 per audit 05 §5.4 | Three frozen documents independently state the recompute-don't-store doctrine, and each audit flagged it — as an over-specification **risk**, minting no finding — in its own §5. The cross-document fact is new: because the doctrine is *triply* stated, no single-document fix resolves it, and collectively it obstructs the longitudinal model's core requirement — retaining a derived value *as computed that day under that knowledge version* as historical evidence. The theoretical escape (recompute under pinned versions) rests on disciplines nothing mandates: inputs retained forever and athlete-state versioning, both ungoverned (audit 03 §6.4; audit 04 §6 A8). **What breaks:** readiness trends, e1RM trajectories, and internal evidence (P3.5) are either unavailable or silently wrong when recomputed under later knowledge. **When it bites:** partially at Stage 5 (squad trend views); fully at the analytics end-state and P3.5. **Absorbable without amendment? No** — the rule text lives in at least KA §2.1 and EDS §27, both frozen; it needs one coordinated clarifying amendment ("recomputable given the same inputs and knowledge version; point-in-time derived values may be materialised as dated historical evidence") reconciled across all three documents in a single pass. | AMENDMENT CANDIDATE | Queue one reconciled multi-document clarification of the derived-data doctrine, scoped by the candidate spec's history-store design. |
| **GA-803** | P2 pillar-wide (CAPTURE/MODEL links) | SILENT | Evidence at the pin: `docs/architecture/ATHLETE-MODEL.md` (header: living/non-frozen; §3–§5 define the operative athlete/performance model, incl. `assessments[]`/`performanceMetrics[]` shapes); `docs/SCHEMA.md` (banner: SUPPORTING — FLAGGED STALE); `docs/product/TEAM-ARCHITECTURE.md` §"Data model" via GA-208/GA-511; process side: GA-704 | The data pillar's **operative semantics are, at the pin, defined entirely in non-governing tiers**: the athlete-model schema in a living implementation reference, the database reality in a stale supporting doc, the coach-visible derived surface in a product doc no governing document elevates. No upstream finding states this standing fact — GA-704 supplies the missing *assignment mechanism*, GA-511 only the coach-workflow slice. The effect is a precedence vacuum: GOV's corollary "Implementation never outranks specification" is satisfied vacuously because no specification exists to outrank, so schema choices made at implementation speed (latest-only JSONB history — TR-03; engine-audit 06, as evidence) harden into de facto standards the eventual governing spec must ratify or break at migration cost. **What breaks:** every data-touching sprint between the pin and the candidate document deepens the ungoverned standard. **When it bites:** continuously now; acutely the day the candidate spec is authored. **Absorbable without amendment? Yes** — the candidate document (GA-512) absorbs the content and GA-704's living-GOV fix supplies the process; nothing frozen needs edits for this finding itself. | NEW-DOCUMENT CANDIDATE | The candidate spec's first act: inventory and ratify-or-supersede the de facto material (ATHLETE-MODEL.md, SCHEMA.md's successor, player_status) so the pillar's real semantics enter governance rather than being redesigned around. |
| **GA-804** | P6.4 × P2.9 (semantics slice) | THIN | TAS §4.4 ("manufacturer-independent metric model") via GA-501/GA-506; Ontology §8 via GA-212 (Family VI covers derived state signals, not captured metrics); KA §4 via GA-310 (no domain owns external-data semantics) | The TAS names the normalisation target of every ingestion boundary — the platform's own metric model — but **no document defines it**: the Ontology's Family VI disambiguates derived training-state signals (GA-212), not the captured-metric dictionary beneath them (what "HRV", "sleep score", or a future "sprint distance" mean, in what units, from which source classes); the KA assigns it no domain (GA-310 covers only the match-load slice). Each new adapter therefore normalises into a model that exists only in code — semantic drift at the exact boundary P6.4's world-class pattern was built to protect. No upstream GA carries this: GA-501 verdicts attachment, GA-506 quality tagging, GA-212 derived signals. | SPEC-FILLABLE | A governed metric-dictionary registry (KA §3.2 registry pattern: identity, unit, semantics, source classes per metric) referenced as the normalisation target by the wearable ACL and the future match ACL, its entities registered in the Ontology's measurement family when the GA-205/GA-207 amendment lands. |

No other cross-document gap survived the minting rule: every remaining gap
found while walking the chain already carries its upstream ID and is cited in
§2/§4 where it belongs.

---

*— End of Governance Audit 08 —*
