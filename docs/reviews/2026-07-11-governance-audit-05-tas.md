# Governance Audit 05 — The TAS vs the Benchmark

**Class: REVIEW (T5) · dated evidence, never current state · 2026-07-11**
**Pin: frozen set v1.0 (2026-07-01) · `main @ fc5e3f8` · KSV 1.30.0**
**Spec: [`docs/superpowers/specs/2026-07-11-governance-forensic-audit-design.md`](../superpowers/specs/2026-07-11-governance-forensic-audit-design.md) · Benchmark: [`…-00-benchmark.md`](2026-07-11-governance-audit-00-benchmark.md)**

---

## §1 Role and owned slices

The TAS (`docs/architecture/TAS.md`, v1.0, frozen) is the technical tier of the
governance stack: *how the software must be shaped* — layers, contracts, trust
boundaries, storage, sync, isolation, and platforms — so that it faithfully
implements the Constitution, EDS, Ontology, and Knowledge Architecture. It is
the canonical home for data flow (TAS §7), the module catalogue (TAS §4), the
privacy trust boundary's technical enforcement, and every platform seam
(wearables, surfaces, learning, AI plumbing).

Per benchmark 00 §3, the TAS **owns**: **P2.1** (testing/assessment batteries
as data assets), **P2.3** (gym-performance capture & analysis), **P2.4**
(on-pitch/match performance data), **P2.7** (team-level analytics & squad
readiness), **P2.9** (data quality, provenance & missingness), **P2.11**
(reporting & insight delivery), **P6.4** (wearables/native platform
absorption). It **co-owns**: **P2.6** (longitudinal athlete model —
storage/versioning side), **P5.1** (raw-data inviolability — enforcement),
**P5.7** (athlete data ownership & consent — enforcement), **P6.3**
(team/coach workflows — coach-surface side), **P3.5** (internal evidence —
aggregation infrastructure).

The ownership row makes the TAS the primary technical home of the athlete
data & analytics pillar (P2). That framing drives this audit: the TAS must be
judged not only as the decision-platform blueprint it presents itself as, but
as the data-platform blueprint the end-state ambition requires.

## §2 Coverage table

| Capability | Verdict | Cited Article/§ | Reasoning |
|---|---|---|---|
| **P2.1** Testing & assessment batteries as data assets | THIN | TAS §7 step ②, §12 ("New assessment method"), §15 (CV row) | Assessment exists only as D1 model-building (§7 ②) and as extension one-liners: a "new assessment method" is an L2 knowledge addition (§12) and computer vision produces Capability estimates (§15). Nothing architects scheduled, versioned, repeatable test protocols whose *results persist as comparable longitudinal data points* — no storage model, no scheduling, no result time-series anywhere in §4.4 or §7. |
| **P2.3** Gym-performance capture & analysis | THIN | TAS §7 step ⑥, §4.4 (Persistence & Sync), §4.5, §14 | Capture is genuinely governed: outcomes persist as prescribed-vs-actual at §7 ⑥ via L4. Analysis is not: trend analytics (e1RM trajectories, tonnage, adherence rates) have no architected home — L5 lists "Analytics" as a single word (§4.5), §14 names "coach analytics" and "scientific analytics" rows with no read-model, storage, or serving design, and the engine API (§4.1) has no analysis call. |
| **P2.4** On-pitch/match performance data | SILENT | TAS §4.4 (Wearable Integration), §7 step ⑦, §7 step ⑤ | The only external-data ingestion architecture is the Wearable ACL (§4.4), framed exclusively around the "manufacturer-independent metric model"; §7's lifecycle ingests wearables (⑦) and takes "team schedule input" at ⑤, but GPS/accelerometry streams, match statistics, minutes played, and availability appear nowhere as inputs. **What breaks:** gym programming cannot react to the athlete's total load, and squad analytics lack their sport-load half — the pillar's core promise (P2.4). **When it bites:** Stage 5 (Team) partially; fully at end-state team analytics and endurance (Stage 7). **Absorbable without amendment? Yes** — the ACL's adapter+queue+normalise pattern (§4.4) and §4.4's precedent that L4 modules are seams for "different runtime, trust boundary, or scaling profile" generalise to a match/GPS ingestion module via a T3 spec; but high-volume time-series *storage* is governed nowhere (see P2.9 / GA-512). |
| **P2.7** Team-level analytics & squad readiness | THIN | TAS §4.1 (`rollUp`), §16.1 C1, §14 (coach analytics), §4.5 | The privacy-correct substrate is excellent: `rollUp() → CoachVisibleStatus` is engine logic, server-side, materialized (§4.1, §16.1 C1), and §14 forbids re-derivation. But it is a single point-in-time per-player signal: cross-athlete aggregation (readiness distribution, collective load, risk ranking) has no stated home — the engine is per-athlete and pure, L5 "Analytics" is unspecified — and longitudinal squad trends additionally require the history substrate P2.6 lacks (evidence: TR-03; engine-audit 06). |
| **P2.9** Data quality, provenance & missingness | THIN | TAS §4.4 (Wearable Integration), §5.7, §5.9, §4.4 (Persistence: "Retention"), §16.1 C3 | Missingness handling is strong and principled: missing data lowers confidence, never blocks (§5.7, §5.9, §4.4). Decision and knowledge provenance are world-class (§5.5, §6). But *athlete-datum-level* quality architecture is one clause — "source-reliability tagging" in the wearable ACL — with nothing on sensor-vs-self-report separation, per-datum provenance in storage, lineage for derived signals, or time-series retention beyond a config word ("Retention", §4.4) and a passing note (§16.1 C3). |
| **P2.11** Reporting & insight delivery | THIN | TAS §11, §4.6, §14 | Decision-explanation delivery is world-class: one trace, three audience renderings, never re-derived (§11). But reporting beyond explanation — progress trends, longitudinal insights, squad reports — is unarchitected: surfaces "compute NO coaching" (§4.6), the engine API offers no trend/insight read-model (§4.1), and §14's "coach analytics" row names the output without designing the path, leaving data-insight delivery with no compliant home. |
| **P6.4** Wearables/native platform absorption | WORLD-CLASS | TAS §4.4 (Wearable Integration), §13 (cross-runtime determinism), §4.6, §12 | Exactly the benchmark's asked-for shape: per-provider adapters behind an anti-corruption layer, queued/batched ingestion, normalisation into a manufacturer-independent model, reliability tagging, failure modes — "a new device = a new adapter" (§4.4, §12). Native platforms: the isomorphic engine with a CI cross-runtime determinism proof (§13) and surfaces that add no reasoning (§4.6). Nothing material missing at end-state for the *attachment boundary* (volume/storage judged under P2.4/P2.9). |
| **P2.6** Longitudinal athlete model — storage/versioning (co-own) | THIN | TAS §4.4 (Persistence & Sync), §14 (replay), §16.1 C3, §5.12 | Persistence covers current `AthleteState`, outcomes, priors, freezes, portability (T4) and soft deletes; provenance stamps + pinning make individual *decisions* reproducible (§5.12, §14). But a career-long, versioned, append-only athlete model — temporal state, reconstructable past states, long-horizon queryability — is never architected; traces are only persisted for committed plans (§16.1 C3). Implementation evidence that governance never demanded it: latest-only JSONB, no outcomes history (TR-03; engine-audit 06). |
| **P5.1** Raw-data inviolability — enforcement (co-own) | ADEQUATE | TAS §2 (corollary 7), §7 (privacy boundary at ⑧), §4.1 (`rollUp`), §4.4 (Persistence; Membership & Access), §16.3 C1 | Enforcement substance is near world-class: raw vitals owner-only with *no coach policy ever*, the only crossing is the server-side derived roll-up, default-deny access predicates, a privacy validator failing the build, RLS tests required (§7, §4.1, §4.4, §16.3 C1). Held below WORLD-CLASS by a structural defect: the dedicated "Security & Privacy §15" that the document itself designates as the canonical home (§4.7; risk T19's resolution column; the "How to read" preamble; §16.3 C1; §17 step 6) does not exist — actual §15 is "Future AI architecture" — so the binding privacy content lives scattered in revision notes rather than in its promised section. |
| **P5.7** Athlete data ownership & consent — enforcement (co-own) | SILENT | TAS §4.4 (Membership & Access; Audit Log; "soft deletes"), §4.5, §10 | Membership & Access governs *who may read*, but athlete-side rights are absent: no consent records, no scoped/revocable sharing grants on joining a team, no export, no deletion-rights architecture (only "soft deletes"), and population learning (§4.5, §10) aggregates athlete data with no consent gate for secondary use. **What breaks:** team onboarding implies visibility grants no one consented to in any recorded way; internal evidence generation (P3.5) runs on athlete data without an enforceable consent boundary; export/erasure requests have no implementable path — in tension with the append-only Audit Log (§4.4). **When it bites:** Stage 5 (Team); acutely with youth cohorts and P3.5 research. **Absorbable without amendment? Yes** — Membership & Access's "new roles/scopes = data + a tested policy" extensibility (§4.4) can carry consent scopes, and a T3 spec can define consent/export/erasure (pseudonymising rather than deleting audit traces); benchmark 00 §3 notes P5.3+P5.7 may eventually warrant a safeguarding document — deliverable 01/09's call. |
| **P6.3** Team/coach workflows — coach-surface side (co-own) | THIN | TAS §7 step ⑤, §4.6, §4.4 (Membership & Access; Notifications), §9 | The seam is named — scheduling is "engine D13 + team schedule input" (§7 ⑤), coach philosophy is configuration (§9), the coach surface renders and captures overrides (§4.6). But the coach *workflow* is not architected: where fixtures and shared sessions are entered, how the calendar translates into governed engine constraints, congested-week planning, availability management. The load-bearing design lives one tier down in `docs/product/TEAM-ARCHITECTURE.md` (§"Team schedule → constraints"), which the TAS neither elevates nor references. |
| **P3.5** Internal evidence — aggregation infrastructure (co-own) | ADEQUATE | TAS §4.5, §10, §14 (scientific analytics), §13 (athlete outcome validation) | Genuinely governed: privacy-preserving population aggregation over derived signals only, staged/validated priors, off the request path, backtesting and shadow evaluation, experimentation, and falsifiability of the engine's own diagnoses (§4.5, §10, §13) — with population-tier priors flowing back as Knowledge (§10), hooking the graded pipeline. Short of world-class: no research-grade standards (cohort definitions, statistical governance), and the consent precondition is missing (P5.7). |

## §3 What is world-class here

Recorded honestly — these become COVERED findings in deliverable 09:

- **The wearable/native absorption architecture (P6.4)** — the anti-corruption
  layer with adapters, queueing, normalisation and reliability tagging (§4.4),
  the isomorphic engine with a CI-enforced cross-runtime determinism test
  (§13), and "a new surface consumes the same L1/L2/L3" (§4.6) — is precisely
  the benchmark's "an adapter, not an architecture event" (P6.4). → GA-501.
- **The privacy enforcement substance (P5.1)** — the raw-vitals trust
  boundary drawn *in the data architecture* (§7 boundary at ⑧; §4.1 `rollUp`
  server-side; §16.3 C1's no-coach-policy-ever, build-failing privacy
  validator, default-deny predicates) meets the benchmark's "a leak would
  require changing the schema, not just breaking a habit".
- **The method** — a twenty-risk register gating the whole document (§1),
  every architectural decision traced to a governing clause (Appendix B), a
  four-lens adversarial review with revisions folded back (§16), and standing
  tensions recorded rather than hidden (§16.6). As governance *craftsmanship*
  this is the strongest document in the set.
- **The consolidation argument (§3.1–§3.3)** — refusing to fragment the pure
  core into per-decision services, with rejected alternatives tabled, protects
  determinism and explainability (Constitution Art 18) at the exact point
  ambition would otherwise shred it.
- **Extensibility discipline (§12)** — ten foreseeable additions, each mapped
  to data-or-adapter with "code change: none" as the norm, plus the rule that
  a core edit signals leaked knowledge. This is P6-grade thinking applied
  systematically.
- **Configuration separation (§9)** — nine categories, each with one home,
  and the "no reasoning-changing feature flag" rule — closes a classic silent
  drift channel.

## §4 Findings

- **GA-501** · P6.4 · WORLD-CLASS · TAS §4.4 (Wearable Integration), §13,
  §4.6, §12 · The ingestion boundary, adapter pattern, queued scaling, and
  isomorphic-engine native path fully meet the benchmark's attachment
  standard; storage volume is judged separately (GA-504/GA-512). · **COVERED**
  · Direction: none — protect this pattern as the template for every future
  external-data class.
- **GA-502** · P2.1 · THIN · TAS §7 ②, §12, §15 · Assessment exists as
  knowledge-extension one-liners; nothing architects test protocols as
  scheduled, versioned assets whose results persist as comparable longitudinal
  data points. · **SPEC-FILLABLE** · Direction: a T3 assessment-battery spec
  defining protocol entries (L2) plus a results store and scheduling under the
  existing L4 persistence pattern.
- **GA-503** · P2.3 · THIN · TAS §7 ⑥, §4.5, §14, §4.1 · Capture is governed;
  analysis is a one-word L5 module with no read-model, storage, serving path,
  or API surface for trends. · **SPEC-FILLABLE** · Direction: a T3 analytics
  read-model spec giving L5 "Analytics" a real design (inputs, materialized
  outputs, serving via L3/L4) — feeding the GA-512 question of where it
  ultimately lives.
- **GA-504** · P2.4 · SILENT · TAS §4.4, §7 ⑤/⑦ · No ingestion, storage, or
  semantic home for GPS/accelerometry, match statistics, minutes, or
  availability; the sole external-data architecture is wearable-specific.
  Breaks total-load-aware programming and half of team analytics; bites Stage
  5 and fully at end-state; absorbable yes via the ACL pattern. ·
  **SPEC-FILLABLE** · Direction: a T3 spec instantiating a second
  anti-corruption layer (match/GPS ingestion) on §4.4's own pattern, with the
  time-series storage question escalated to GA-512.
- **GA-505** · P2.7 · THIN · TAS §4.1, §16.1 C1, §14, §4.5 · `rollUp` is one
  point-in-time per-player signal; cross-athlete aggregation and longitudinal
  squad analytics have no stated home (evidence of the downstream cap: TR-03;
  engine-audit 06). · **SPEC-FILLABLE** · Direction: a T3 squad-analytics spec
  extending the materialized-surface pattern (§16.1 C1) to distributions and
  trends, dependent on the P2.6 history substrate (GA-508).
- **GA-506** · P2.9 · THIN · TAS §4.4, §5.7, §5.9, §16.1 C3 · Missingness
  handling is principled, but per-datum provenance, sensor-vs-self-report
  separation, lineage for derived signals, and retention/time-series
  governance are one clause and two asides. · **SPEC-FILLABLE** · Direction: a
  T3 data-quality/provenance spec (co-designed with the Knowledge
  Architecture's confidence semantics) defining per-datum source, reliability,
  and retention classes.
- **GA-507** · P2.11 · THIN · TAS §11, §4.6, §14 · Explanation delivery is
  world-class, but data-insight reporting has no compliant home: surfaces may
  compute nothing, and no engine/L5 read-model serves trends or reports. ·
  **SPEC-FILLABLE** · Direction: a T3 reporting spec extending the
  read-model-over-emitted-data pattern (§11) to analytic insights, with
  accuracy governance against the underlying data.
- **GA-508** · P2.6 · THIN · TAS §4.4, §5.12, §14, §16.1 C3 · Current-state
  persistence and decision replay exist; the career-long, versioned,
  append-only athlete model (temporal state, reconstructable history) is never
  architected — and the implementation followed governance into latest-only
  storage (TR-03; engine-audit 06, cited as evidence only). ·
  **SPEC-FILLABLE** · Direction: a T3 longitudinal-state spec (append-only
  outcomes/state history via §4.4's "new state = a migration" seam), the
  substrate GA-503/505/507 all depend on.
- **GA-509** · P5.1 · ADEQUATE · TAS §4.7, §1.5 (T19), §16.3 C1, §17 step 6
  vs actual §15 · The document's designated canonical home for security &
  privacy ("§15") does not exist — §15 is "Future AI architecture"; the
  section numbering drifts by one after §11 (the "How to read" preamble and
  §16.1 C2's "§12 adds a cross-runtime determinism test" confirm it), leaving
  risk T19's named resolution section missing and binding privacy rules
  scattered across §4.4, §7 and a review note (§16.3 C1). · **AMENDMENT
  CANDIDATE** · Direction: a versioned amendment restoring the dedicated
  Security & Privacy section (or correcting every cross-reference), queued per
  the frozen-doc defect process.
- **GA-510** · P5.7 · SILENT · TAS §4.4 (Membership & Access; Audit Log),
  §4.5, §10 · No consent records, sharing grants, export, or erasure
  architecture; population learning has no consent gate; erasure rights sit in
  unexamined tension with the append-only audit log. Bites at Stage 5 (Team)
  and hard with youth cohorts and P3.5; absorbable yes via Membership &
  Access's scope extensibility. · **SPEC-FILLABLE** · Direction: a T3
  consent-and-data-rights spec (scoped revocable team grants, export, erasure
  via pseudonymisation of append-only records), coordinated with deliverable
  01's ruling on a safeguarding document.
- **GA-511** · P6.3 · THIN · TAS §7 ⑤, §4.6, §9 · The fixtures→constraints
  seam is named in one phrase; the coach workflow (schedule entry, calendar→
  constraint translation, congested weeks, availability) is designed only in
  the lower-precedence `docs/product/TEAM-ARCHITECTURE.md`. · **SPEC-FILLABLE**
  · Direction: a T3 coach-workflow spec elevating TEAM-ARCHITECTURE's
  translation design to a governed statement of the coach-surface side,
  jointly with the EDS's constraint side (deliverable 04).
- **GA-512** · P2 cluster (P2.1/P2.3/P2.4/P2.6/P2.7/P2.9/P2.11 collectively)
  · THIN-in-aggregate · TAS §3.2 (L5 box), §4.5, §14 · Each gap above is
  individually spec-fillable through the TAS's own seams — but collectively
  the athlete data & analytics pillar has no architectural owner: one word
  ("Analytics") at L5 carries measurement, modelling, analysis, and reporting
  for the entire second product of an elite performance department (benchmark
  §1). No T3 spec pile substitutes for a coherent peer architecture. ·
  **NEW-DOCUMENT CANDIDATE** · Direction: a Data & Analytics Architecture
  Specification peer to the EDS, per benchmark 00 §3's hypothesis — tested by
  deliverable 08, ruled on by 09.
- **GA-513** · P3.5 · ADEQUATE · TAS §4.5, §10, §13 · Aggregation
  infrastructure is soundly governed (privacy-preserving, staged, off-path,
  falsifiable) but lacks research-grade standards and the P5.7 consent
  precondition. · **SPEC-FILLABLE** · Direction: fold research-cohort and
  statistical-governance standards into the GA-512 candidate document or a T3
  research spec, gated on GA-510.

## §5 Over-specification risks

1. **"Surfaces compute NO coaching" (§4.6, §3.3) read as "compute nothing".**
   The rule exists to kill re-derivation drift (T8/T14/T20) — rightly. But the
   TAS never draws the line between *coaching computation* (forbidden) and
   *presentational analytics* (a tonnage chart, an adherence percentage). Read
   strictly, every trivial aggregation must round-trip through the engine or
   L5; read loosely, analytics re-derivation sneaks back in. Either reading
   strangles or corrodes P2.11 until the line is drawn.
2. **The six-call engine API celebrated as fixed (§4.1, §16.2 C1, §16.5).**
   Minimalism protects the compatibility surface, but a frozen document that
   praises "six calls" as *the feature* creates rhetorical pressure against
   the analysis read-models the data pillar needs. §4.1's own extensibility
   clause (semantic versioning; new decisions honouring contracts) permits
   additive growth — the risk is cultural, not formal, but real in a document
   used as a validation gate.
3. **"There is ONE engine, not many" (§3.1) over-applied.** The argument
   targets fragmenting the *decision graph* — correct. A zealous reading could
   also veto a genuine analytics/warehouse subsystem as "a second engine",
   even though the TAS's own seam test (different runtime, trust boundary,
   scaling profile — §3.1) squarely *licenses* one at L5. GA-512's candidate
   document should invoke that test explicitly.
4. **"Derived, never stored-as-truth" (§7 note on ④, T2).** Correct for the
   recomputable plan; hazardous if the doctrine leaks onto *historical facts*
   (what was prescribed, done, and signalled at the time), which longitudinal
   analytics must store immutably. §16.1 C3 already persists traces only for
   committed plans — the retention posture is minimising exactly the data the
   P2 pillar treats as the product.

## §6 Load-bearing assumptions the end-state falsifies

1. **All platform data is decision-sized.** The architecture hands the pure
   engine a whole `AthleteState` (§4.1, §5.4). End-state data includes
   high-frequency time-series (GPS at Hz rates, wearable streams — P2.4/P6.4)
   that cannot be injected wholesale into a synchronous pure pass;
   pre-aggregation and time-series storage need an owner the layer diagram
   (§3.2) does not name. *Falsified at Stage 7 / end-state.*
2. **Analysis is either learning or explanation.** The TAS gives analysis two
   homes: L5 priors (§10) and the explanation read-model (§11). The benchmark
   requires a third: descriptive/longitudinal analytics serving humans
   (P2.3/P2.7/P2.11), which are neither priors nor decision traces. *Falsified
   the moment reporting ships.*
3. **The coach's question is "what is the squad's status now?"** `rollUp` and
   the materialized coach surface (§4.1, §16.1 C1) are point-in-time. Elite
   coaches ask longitudinal and comparative questions (P2.7); nothing in the
   architecture answers "versus last season". *Falsified at Team maturity.*
4. **Wearables are the only external data class.** Exactly one
   anti-corruption layer exists (§4.4); match/GPS/availability data (P2.4)
   have none. The *pattern* generalises; the assumption that one ACL suffices
   does not. *Falsified at Stage 5+ (fixtures, match load).*
5. **Athlete state is current state.** Persistence stores the latest
   `AthleteState` + outcomes (§4.4); nothing versions state over a career
   (P2.6). TR-03 (engine-audit 06, evidence) shows the implementation
   inheriting exactly this assumption. *Falsified by P1.5/P2.6 end-state.*
6. **One derived-signal shape serves every cross-boundary need.**
   `CoachVisibleStatus` is the single boundary-crossing artefact (§4.1, §7 ⑧).
   Team analytics, reporting, and research aggregation (P2.7/P2.11/P3.5) need
   a *family* of governed derived surfaces, each privacy-proven. The trust
   boundary generalises; the single-artefact assumption does not.

## §7 Document verdict

At its chosen game — the technical governance of a deterministic,
explainable, privacy-bounded coaching decision platform — the TAS is the
best-crafted document in the frozen set: risk-gated from the first page,
traced clause-by-clause to its governing documents, adversarially reviewed
with revisions folded back honestly, and world-class outright on wearable and
native-platform absorption (P6.4) and on the substance of raw-vitals
enforcement (P5.1). But the benchmark assigns the TAS the largest share of
the athlete data & analytics pillar, and there it is a decision-plumbing
document, not a data-platform document: seven of its twelve owned/co-owned
capabilities verdict THIN and two SILENT, with the entire second product of
an elite performance department — testing batteries, match data, longitudinal
modelling, squad analytics, reporting — resting on a single unexpanded word
("Analytics") at L5. Its saving grace is its own extensibility discipline:
nearly every gap is absorbable through seams the TAS itself built, which is
why eleven findings class SPEC-FILLABLE and only the phantom Security &
Privacy section (GA-509) demands amendment. As governance for its full
benchmark role the TAS is not yet world-class — it is a world-class *half*,
whose own architectural honesty (§3.1's seam test, §16.5's deferral ledger)
points to the completion: a data & analytics peer specification (GA-512)
rather than a rewrite.
