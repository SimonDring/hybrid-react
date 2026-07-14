# Decision Engine V2 — Validation Strategy

**Status: PROPOSAL — working doc (T4) · 2026-07-14 · not canonical; adopted only via DEVELOPMENT-PLAN §5.3**
**Sprint spec: [`docs/superpowers/specs/2026-07-14-decision-engine-v2-design.md`](../../superpowers/specs/2026-07-14-decision-engine-v2-design.md)**

---

## §0 Scope, stance, and one dependency note

This document is the **test net under the whole V2 migration**: what is verified,
by what mechanism, and at which migration phase each guarantee must hold. It is
the operational depth [`02-COACHING-PIPELINE.md`](02-COACHING-PIPELINE.md) §2.14
delegates ("owner `13` for suite depth"), designed against the ratified owners —
validation as a separable layer that disposes what construction proposes
(Constitution Art 19; EDS §35), confidence governing authority everywhere
(Constitution Art 13), knowledge validated at every boundary (KA §5), and the
TAS's testing table as the frame (TAS §13). The audit's verdict stands under it
all: the test suite is the **rebuild risk multiplier** — "the net under every
wave" (TR-11; audit 06 · G22; audit 08).

Two vocabularies anchor everything below:

- **Stage IDs** are `02-COACHING-PIPELINE.md` §1.1's ratified D1–D17, verbatim.
- **Phase IDs `M0`–`M6`** are `11-MIGRATION-PHASES.md`'s: **M0** the test net
  itself, **M1**–**M6** adopting audit-10 waves A–F in order (M1 = Wave A,
  recorded as landed history — DEVELOPMENT-PLAN Phase 0, PRs #173/#174;
  M2 = Wave B progression · M3 = Wave C measurement · M4 = Wave D validation &
  seams · M5 = Wave E substrate & learning · M6 = Wave F structure & breadth).

> **Module vocabulary.** §1's rows are keyed one-to-one to the seventeen V2
> modules of [`10-MIGRATION-ARCHITECTURE.md`](10-MIGRATION-ARCHITECTURE.md)
> §2.2, under the same IDs — the same node set
> `12-MODULE-DEPENDENCY-DIAGRAM.md` diagram 1 draws (reconciled node-for-node
> in the whole-set consistency pass).

**The one law of this document:** every migration phase lands its net **before**
its behaviour change ("test the property, then change the behaviour" — audit 10
Wave B), every guarantee is mechanised (a test or a build-failing validator,
never reviewer vigilance — EDS L13 pattern), and every enforcement follows the
**report → flag → gate ladder** with a measured false-positive budget before
promotion (§8; commitment C5, 00-ARCHITECTURE §2.3).

---

## §1 Per-module validation

One row per V2 module. *Expected behaviour* is the one-sentence contract a
failing test accuses; *test classes* reference the taxonomy of TAS §13 as
extended here — **U** unit · **K** knowledge validation (§3) · **GM**
golden-master (§2) · **P** property (§5) · **SV** scientific validation (§4) ·
**SIM** simulation (§5.4) · **CA** coach acceptance (§7) · **PB** performance
benchmark (§6).

One row per module of 10 §2.2, under the same ID — seventeen rows, matching
diagram 1 of `12-MODULE-DEPENDENCY-DIAGRAM.md` node-for-node; the ratified
conceptual map behind them is EDS §39's.

| Module (10 §2.2) | Expected behaviour (one sentence) | Inputs | Outputs | Test classes |
|---|---|---|---|---|
| **M-ATH** · Athlete model (D1) | Builds the confidence-honest `AthleteModel` — per-quality measured estimators behind one interface, measured evidence displacing inferred priors with the displacement recorded (C8; EDS D1; 02 §2.1). | onboarding, lifts, Test Results, priors, insights | `AthleteModel` | U · GM · P (additive-identity) · CA |
| **M-DEM** · Demand (D2/D3) | Resolves and refines the demand profile from the SKB / goal-as-sport modules with the mandatory `droppedDemands` ledger — an authored demand is homed or declared, never silently dropped (02 §2.2–§2.3; SR-05). | goal/sport, season window, SKB, position, individual signals | `DemandProfile`, `RefinedDemandProfile` (Performance Outcome carried) | U · GM · K · P (`droppedDemands` always present) |
| **M-DIAG** · Diagnosis (D4/D5) | Emits a non-empty ranked limiter list and a k=1–3 priority set with typed Adaptation Targets, where every priority traces to a limiter and every non-selection is parked with a reason (EDS D4/D5; 02 §2.4–§2.5, ruling R2). | model, demand, priors, insights | `RankedLimitingFactors`, `PriorityQualities` | U · GM · SV · CA |
| **M-STRAT** · Strategy (D6) | Commits the typed develop/maintain map at intervention-class granularity with a chosen concurrency model — down-scopes recorded, never silent (02 §2.6, ruling R1). | priorities, constraints, training history | `Strategy` | U · GM · SV |
| **M-PERIOD** · Periodisation (D7/D8) | Produces the block sequence with typed exit criteria/handover and fixture-aware weekly objectives — sport-shaped weeks, never a calendar template (EDS D7/D8; 02 §2.7–§2.8). | priorities, strategy, season calendar, priors | `PeriodisedBlocks`, `WeeklyObjective` | U · GM · SV · SIM · CA |
| **M-CONSTR** · Constraint engine ([`06-CONSTRAINT-ENGINE.md`](06-CONSTRAINT-ENGINE.md)) | Composes D1/D6/D8 outputs into one resolved, typed constraint envelope consumed by D9–D13 and re-checked by D14 — injuries pre-shape, never post-filter (ruling R4, 02 §4; EDS §36; commitment C2). | D1/D6/D8 outputs, sport calendar | the constraint envelope | U · P · GM |
| **M-SESS** · Session builder (D9–D11 — [`05-SESSION-BUILDER.md`](05-SESSION-BUILDER.md)) | Constructs inside the box: one named objective, requirements before any exercise name, value-ordered selection under the anti-filler admission rule and the stopping rule — the one selection engine for every cohort (05 S1–S4; EDS D9–D11; Art 7; C7). | objectives, constraint envelope, knowledge | `SessionObjective`, `MovementRequirements`, `SelectedInterventions` | U · GM · SV · CA |
| **M-DOSE** · Dose (D12) | Assigns the smallest sufficient, context-aware dose per intervention, every magnitude citing its knowledge entry, carrying the advancement decision (progress/hold/deload) with its driver signal (05 S5; 02 §2.12; Arts 6, 7; C4). | selected interventions, envelope, dose knowledge, priors | `DosedSession`s + volume ledger (output only) | U · GM · SV · CA |
| **M-SCHED** · Scheduler (D13) | Places sessions to minimise interference with governed penalty weights and traced placements — the pin's strongest layer, preserved (audit 03 §2; EDS D13). | dosed sessions, spacing constraints | `ScheduledWeek` + penalty accounting | U · GM · P |
| **M-VAL** · Validation (D14 suite + resolution pass) | Runs every EDS §35.1 validator on every pass, disposes (trim/veto with reason + tier), and resolves conflicts by the compiled conflict order — fail-closed on validator crash (02 §2.14, §3; Art 19). | scheduled week, laws, ledger, envelope | `ValidatedWeek` + `ValidationReport` + resolution records | U · P · GM · CA · PB |
| **M-EXPL** · Explanation read-model ([`08-EXPLAINABILITY.md`](08-EXPLAINABILITY.md)) | Renders the decision trace so every prescribed item answers its six questions without re-deciding anything (Art 14; commitment C6). | decision trace, validation report | explanations | U · CA · PB |
| **M-RT** · Runtime projection (D15) | Projects pending work only, by re-running D9–D14; committed sessions frozen absolutely; identical inputs reproduce the baseline exactly (EDS D15; 02 §2.15; Art 10). | plan, live state, freezes, derived signals | `AdaptedPendingSessions` | U · P (reflow≡baseline) · GM · CA · PB |
| **M-ANLYS** · Analysis (D17 family) | Interprets accumulated data into attributed, confidence-tiered insights — never prescribes, degrades explicitly, squad roll-ups from derived signals only (EDS D17; 02 §2.17; Art 11). | athlete history, knowledge | `Insights` | U · K (privacy) · P · CA |
| **M-LEARN** · Learning (D16) | Writes priors only — three tiers, versioned, provenance-stamped; an output naming a plan/session/dose is a contract violation (EDS D16; 02 §2.16; Art 18). | outcomes, insights, overrides | `UpdatedPriors` | U · P · SIM |
| **M-KNOW** · Knowledge registries (the twelve KA §4 domains) | Every registry validates members on load — structure, provenance-where-authored, domain invariants, privacy — and malformed knowledge fails fast, never inside a pass (KA §3.2, §5). | authored entries | validated registries | K · U · PB |
| **M-HIST** · History substrate (DAAS §3 — designate, in review) | Persists outcomes, readiness snapshots, and Family VIII captures append-only with bounded sync — written by the impure layer, read by the async band only; V2 consumes the record, never re-owns it (TR-03; Art 22). | engine artefacts, captures, overrides | the longitudinal record (append-only) | Integration · P (append-only, bounded sync) · CA |
| **M-ORCH** · Orchestration (L3, thin/impure) | Fetches state, pins versions, invokes the pure core, persists outputs, emits traces — computes no coaching decision (TAS §4.3–§4.4; 10 §2.2). | athlete state, engine artefacts | persisted state, rendered surfaces | Integration (contract tests with fakes — TAS §13) · CA |

Four suite-wide mechanics back this table:

- **The graph composition is tested as a property of the whole pass, not a
  module.** The D1→D14 spine runs in ratified order, composing stage outputs
  with no knowledge content and no I/O (EDS §21, §39; TAS §4.1) — asserted by
  the golden master (§2) plus the purity and determinism properties of §5.2,
  across every module row above.
- **Contract enforcement at every stage boundary is cross-cutting machinery**
  (TAS §5.3; 04 §5): `{value, confidence, rationale}` present and typed,
  confidence ≤ weakest input (TAS §5.7), failing fast in dev/CI and falling
  back with an audit event in prod — exercised by §5.2's contract properties
  against every boundary in the table.
- **The engine owns its suite.** As of the audit pin the engine had no test
  suite of its own — it delegated to the app's (TR-11; audit 06). M0 seeds an
  engine-owned suite (`packages/engine`), with the app suite retained for the
  adapter/store/UI seams; every module row above must be exercisable without
  booting the app.
- **Every wave adds the validator that would have caught its defect class**
  (audit 10, continuous rails). A defect reaching production without a failing
  test is itself a defect in this document.

---

## §2 Golden athlete tests — the migration's spine

The golden-master mechanism is the single most load-bearing regression
instrument in the migration: a committed snapshot of `generatePlan(profile)`
across an archetype matrix, byte-compared on every CI run, regenerated **only
deliberately** via `UPDATE=1` (mechanics as of the audit pin:
`apps/mobile/tests/golden-master.js` + `run-all.mjs`, `main @ 02f6184`,
2026-07-11 — date-relative profiles so relative plan structure is
calendar-independent, worktree guard against testing the wrong engine).

### 2.1 Coverage as of the audit pin

The pinned matrix: **28 archetypes** spanning three build styles × experience
levels × frequency (1-day/7-day edges) × equipment (full / dumbbell /
bodyweight), sport cohorts (run sprint/middle/long, cycle, swim) across
off/in-season(taper)/pre/transition, entered-vs-absent lifts, and a female
archetype (G22; audit 08). Alongside it, two sibling pins: the
**injury-classification pin** (per region × rehab phase, exactly which
catalogue exercises are blocked — a rename fails CI with a reviewable diff)
and the **knowledge-set ratchet** (content hash of the science tables pinned
against `KNOWLEDGE_SET_VERSION` — §3.3). Wave A (M1, landed — PRs #173/#174)
re-baselined against this matrix with audited expected deltas.

### 2.2 The extension set (M0)

The pinned matrix covers decision-bearing branches of the *default* paths; the
audit's central criticism is that the **armed-production paths** — states real
users reach that no archetype exercises — were blind (TR-05/TR-11; audit 06).
M0 extends the matrix with, at minimum:

| Extension archetypes | What they pin | Why (audit evidence) |
|---|---|---|
| **Armed-D7 athletes** — profiles with populated recoverability priors, so the D7 progression/deload arm runs armed rather than on schema defaults | Block-length steer, deload rhythm, and exit-criteria behaviour under real priors | The D7 gate was armed by a schema default at the pin — the armed path had zero golden coverage (G13; audit 08 · TR-05; audit 06) |
| **Injured athletes** — active injuries across regions, **including the five bare rehab regions** (regions whose rehab content is unauthored — Simon ledger item 4, audit 10 §5) | Constraints-first selection, rehab-session content and visibility, the honesty fallback when rehab knowledge is thin | Empty/hollow rehab sessions were invisible to their own safety net at the pin (TR-04; audit 06; Wave A fixed the immediate defects — PRs #173/#174 — the goldens keep them fixed) |
| **Measured-vs-prior pairs** — the same profile with and without test results / tracked-lift evidence | The measured estimator seam (D1) and the additive-first guarantee: the no-new-data twin must stay **byte-identical** while the measured twin re-baselines deliberately | 1/10 qualities measured at the pin; measurement entering diagnosis is commitment C8 and Wave C's whole risk (SR-02; audit 07 · G1; audit 08) |
| **Legacy-rescue cohorts** — one archetype per rescued cohort: **triathlon** (blend, not collapse), **zero-gap run/cycle endurance**, **code-less GAA** | That each cohort stays on the tiered selection engine and never falls back to volume-first fill as the fill is retired (M2) | The legacy deficit fill served exactly these cohorts at the pin (B1; audit 04 · G6; audit 08); rescue landed in Wave A (PR #173) — the goldens make the rescue permanent |
| **Non-logging progressors** — an intermediate who never logs a set, snapshotted at week *n* and week *n+1* | That progression exists without logging: week 6 ≠ week 5 in load or reps (the audit's measurable target — audit 10 §6) | Overload was absent for non-loggers at the pin — the most athlete-visible coaching failure (SR-01; audit 07 · G9; audit 08) |

Sport-steered paths (SKB decision rules, position modifiers) grow archetypes
in the same M0 batch (P1-4's "steered-path archetypes" — audit 10, continuous
rails).

### 2.3 Re-baseline discipline — the TR-01 recurrence guard

TR-01 is the proof of failure mode: a real behaviour regression (the
style-band fallthrough) was **re-baselined into the goldens unnoticed** —
"precisely the failure mode golden-master auditing exists to catch" (TR-01;
audit 06). The discipline, binding from M0 on every phase:

1. **`UPDATE=1` is deliberate, never routine.** A re-baseline is a reviewed
   act; CI never auto-updates a snapshot; a PR whose diff touches
   `__snapshots__/` without the accompanying note (rule 2) fails review.
2. **Every re-baseline carries an expected-delta note** — committed alongside
   the snapshot: *which archetypes* are expected to move, *which keys*, *why*
   (citing the behaviour change's design source), and the explicit claim "no
   other archetype moves".
3. **Re-baselines are archetype-scoped.** The intended change's delta is
   audited key-by-key against the note; **any archetype outside the declared
   scope that moves is a defect, not a diff to accept** — the exact check
   whose absence let TR-01 land. Golden re-baselines each carrying an
   expected-delta note is a migration exit criterion in its own right
   (audit 10 §6).
4. **Behaviour-neutral phases are byte-identity phases.** Extractions and
   re-seats (M6's allocator split, knowledge externalisation) assert
   byte-identical goldens per extraction — a re-seat and a behaviour change
   never share a commit (audit 10 §4's sequencing rule).

---

## §3 Knowledge validation

Knowledge is the engine's substance; a fabricated or malformed entry corrupts
every plan downstream of it. Three mechanisms, all mechanical — together they
discharge the seven knowledge-validation hooks registered for this document
in [`04-KNOWLEDGE-OWNERSHIP-MAP.md`](04-KNOWLEDGE-OWNERSHIP-MAP.md) §6
(KV-1–KV-7):

### 3.1 Validate-on-load at every registry

Every KA §4 domain registry validates its members **on load**: structure,
required provenance on authored content, domain invariants (energy-system
percentages ≈ 100, importances 1–10, quality admission requiring an assessment
*and* a dose-response — KA §3.2, §4), and privacy (no raw-vital KPI
coach-visible — the build-failing SKB sweep, preserved from the pin's
strongest patterns; audit 10 §2 "survives unchanged"). Malformed knowledge
fails fast at the boundary with a precise error — **never inside a decision
pass** (KA §5; 02 §2.2). V2 makes this universal: a registry without a
validator cannot register (the KA's rule made a CI fact). This is hook
**KV-1**, including 04 §4's loud-failure rule for unwireable
`decisionRules` effects.

### 3.2 The `validate:knowledge` gate (G19)

One CI command that loads **every** registry and runs **every** registry
validator without generating a plan — so a knowledge PR fails in seconds, on
the entry, with the entry's id. This closes the pin's asymmetry: 33 governed
entries + the SKB validated while sibling science tables sat bare, with sport
facts and ~30 coaching literals living in code where no validator can see
them (G19; audit 08). The gate's coverage ratchets with M6's
knowledge-externalisation work: every constant moved onto the governed
surface (commitment C3) lands **inside** the gate's sweep, and the gate's
entry count is asserted monotonically non-decreasing — knowledge can be
added or reviewed, never silently dropped from governance.

Three more hooks ride the same gate: the **closure lint** (**KV-4**) — a
static check that no numeric literal steers a decision in the reasoning core
unless it is a domain-free Calculation constant or annotated to its governed
entry / seed label (the 04 §3 list is its initial worklist); the
**single-operative-source check** (**KV-2**) — no governed entry may have an
operative code twin (04 §3 row 6's defect class); and **consumption
coverage** (**KV-5**) — every authored knowledge surface declares its
consumers or an explicit deferral (04 §4's discipline), with
authored-but-unconsumed a detected defect, not a fact of life.

### 3.3 The KSV ratchet and provenance completeness

- **KSV ratchet.** Any science-table edit bumps `KNOWLEDGE_SET_VERSION`: a
  content hash of the knowledge set (entries + every science table the engine
  reads, deliberately excluding logic) is pinned against the version; any
  science change under the same version fails CI; re-baselining the hash is
  only legal together with a version bump (mechanics as of the audit pin:
  `apps/mobile/tests/knowledge-set-ratchet.js`). This is what makes the
  provenance stamp on every plan honest — a plan stamped with KSV *n* is
  reproducible from science *n* (TAS §5.12; KA §5).
- **Provenance completeness.** Every entry carries `evidenceLevel`, `source`,
  `confidence`, `lastReviewed`; **no fabricated evidence** — thin evidence is
  labelled, never invented (KA §3.1, §5). The completeness check is part of
  the §3.2 gate: authored content missing provenance is malformed, full stop.
  The staleness watchdog (Domain 10's review-cadence check on `lastReviewed`)
  enters the gate **report-only** at M4 and promotes per §8's ladder — a
  stale entry warns long before it blocks (hook **KV-6**). And every
  seed-labelled value under 04 §3's closure rule is enumerable with its
  authority cap and replacement path, and appears in the validation report of
  any plan it steered (hook **KV-7**; Arts 13, 15). Hook **KV-3**
  (authority-tier compliance) is §4.2's subject.

---

## §4 Scientific validation

Where §3 checks that knowledge is *well-formed*, this layer checks that what
the engine **does** with it is scientifically sane — the "Scientific
validation" row of TAS §13, mechanised.

### 4.1 Per-quality dose-response sanity ranges

Every Physical Quality admitted to the taxonomy carries a dose-response model
(KA §4 Domain 3's admission bar). V2 attaches to each a **governed sanity
envelope** — bounds on prescribable dose per session and per week (intensity
zone, rep ranges, set counts, rest) with provenance like any knowledge entry.
A CI sweep generates plans across the full archetype matrix and asserts every
prescribed dose sits inside its target quality's envelope; a violation names
the archetype, the session, the dose, and the envelope entry. The envelope is
knowledge, so a scientist can review it (closing the G19 complaint that
"scientists can't review what steers plans") and tightening it is a reviewed
knowledge edit, golden-master-gated (KA §5).

### 4.2 Authority-tier tests (Art 13)

Confidence governs authority, and the tests make the tiers load-bearing
(hook KV-3 — granted tier ≤ mapping(confidence), consumer usage ≤ granted
tier; 04 §6):

- **Contested science can never hard-gate.** For every knowledge entry whose
  confidence tier is below gate, a test asserts no D14 verdict at gate
  authority cites it — the generalised form of the pin's ACWR demotion
  (`capVerdict`, preserved and extended, never bypassed — audit 10 §2). The
  canonical regression: a contested load ratio may tilt a dose as soft input
  or be displayed, and a test proves it **cannot force a deload** (Art 13's
  own "violated" example; 02 §2.12).
- **The evidence→authority mapping is itself data.** The mapping is a dated,
  reviewed knowledge entry (KA §4 Domain 10), so the test reads the mapping
  and derives its assertions from it — re-tiering a validator or a signal is
  a knowledge edit that automatically re-derives the test's expectations,
  never a hand-edited constant (Art 13; 02 §3.1).
- **Uncertainty widens margins, never halts.** Property tests drive profiles
  with degraded inputs (no wearable, sparse onboarding, missing lifts) and
  assert a complete, more conservative plan emerges — never a halt, never an
  *un*-widened margin (Art 13; EDS D1 ✗/D4 ✗).

### 4.3 The Wave-B net: progression-sanity + dose-coherence validators

These two validators land **first, as report-only members of the D14 suite,
before M2 changes progression behaviour** — the net precedes the leap
(audit 10 Wave B; P1-3):

- **Progression-sanity** — week-over-week and block-over-block dose movements
  are explicable: advancement only with demonstrated progress or an
  estimator-driven hold honestly labelled (commitment C4; 02 §2.12); no
  unexplained dose regression; deload cadence within recoverability bounds;
  a flat six weeks for a progressing athlete is a **failure**, not a default
  (SR-01; audit 07).
- **Dose-coherence** — every prescription's scheme matches its target
  adaptation: intensity zone, rep range, tempo, and rest mutually coherent
  with the quality the session objective names (the EDS §35.1 scientific-
  consistency validator, deepened); the "3×12 for everyone" fixed-scheme
  class is the named counter-case a coherence sweep must flag (SR-14;
  audit 07).

Both follow §8's ladder to flag and gate. Their report output is also the
**acceptance instrument for M2 itself**: the progression redesign is judged
by these validators going quiet for the right reasons, not by eyeballing
plans.

---

## §5 Regression — pins and properties

### 5.1 The three pinned surfaces

Carried forward from the pin and kept CI-blocking through every phase: the
**golden master** (§2), the **injury-classification pin** (region × phase
blocklists — a safety-behaviour diff can never be silent), and the
**knowledge-set ratchet** (§3.3). Each has its own `UPDATE=1` discipline and
its own expected-delta review rules (§2.3 applies to all three).

### 5.2 New property classes (M0 onward)

Properties assert invariants across generated input spaces, catching what a
finite archetype matrix cannot:

- **Reflow ≡ baseline when nothing changed.** `reflow(plan, liveState)` with
  a liveState containing no completions, no readiness signal, no injuries,
  and no freezes must reproduce the baseline week **exactly**. Both
  historical reflow/baseline divergences were caught after the fact
  (TR-11; audit 06); this property makes the third impossible. It also pins
  the pin-verified freeze discipline: with freezes present, frozen sessions
  are byte-identical to their committed form (EDS D15; 02 §2.15).
- **Cross-runtime determinism.** The engine is isomorphic — it runs on
  client and server (TAS §4.1) — so a property test asserts **byte-identical
  output** for identical inputs across the runtimes in play (browser JS
  engine vs server Node; number precision, locale, collation are the known
  drift channels — TAS §13). No such proof existed at the pin (TR-11).
- **Additive-measurement byte-identity.** For any profile, adding *zero* new
  measurements produces a byte-identical plan; only newly-measured cohorts
  may differ (commitment C8's additive-first guarantee; Wave C's explicit
  gate — audit 10). This property is the entry gate for every M3 estimator
  landing.
- **Purity triple-enforcement, continued.** The pin's purity/determinism
  regime (no clock, no randomness, no I/O — Constitution Art 18) survives
  unchanged as the crown jewel (audit 10 §2) and extends to every new
  module: the same profile through the same engine + knowledge versions is
  the same plan, forever.
- **Contract properties.** Fuzzed valid inputs at every stage boundary: output
  always carries `{value, confidence, rationale}`; confidence never exceeds
  the weakest input (TAS §5.7); `droppedDemands`/`parked` lists always
  present even when empty (02 §2.2, §2.5); D16 output that names a plan,
  session, or dose fails (02 §2.16); the D14 resolution pass never resolves
  across tiers by confidence (02 §3.2 — the absolute-across-tiers invariant,
  property-tested per TAS §13 discipline).

### 5.3 What regression protects during retirement

M2's legacy-fill retirement and M6's allocator re-seat are the two places the
audit predicts regression risk concentrates (TR-07/TR-08; audit 06). The
rule: **cohort-rescue acceptance tests (§2.2's rescue archetypes) plus
byte-identity-per-extraction are the merge gate** — a retirement PR that
moves any non-declared archetype fails, exactly as §2.3 prescribes.

### 5.4 Season-length simulation (M2 onward, grows through M5)

No season-length simulation existed at the pin (TR-11). From M2, simulated
athletes run whole seasons through the planning + runtime + learning loops
with scripted adherence/readiness/injury streams, asserting slow-time-scale
sanity no single-plan test can see: block objectives rotate rather than
repeat; deloads arrive within governed cadence bounds; taper holds intensity
before the simulated competition; the non-logging progressor's load advances
across the season; and — once M5 arms the learning loop — priors converge
rather than oscillate, and a returning simulated athlete is not re-diagnosed
from scratch (EDS §25; TAS §13's simulation row).

---

## §6 Performance benchmarks

The engine runs on client **and** server (TAS §4.1) — the client is a mid-tier
phone running a PWA, so plan generation must be budgeted for the weakest
target, not the CI runner. Benchmarks land at M0 as **measured baselines**,
become **budgets** once two phases of data exist, and fail CI on regression
past the tolerance — numbers below are design targets to calibrate at M0, not
retrofitted claims:

| Operation | Budget (target) | Rationale |
|---|---|---|
| Full planning pass (D1–D14, multi-week plan) | p95 ≤ 500 ms on reference mid-tier mobile hardware; p95 ≤ 150 ms server-side | Runs at onboarding and re-planning — a visible wait, but not interactive-loop latency |
| Runtime projection (D15 reflow) | p95 ≤ 100 ms client-side | Runs at app-open over pending work; anything slower degrades the daily surface |
| `validate(week)` standalone | p95 ≤ 50 ms | It runs inside every D15 re-run; the suite must stay cheap enough to never tempt skipping a validator |
| Trace/explain projection (`explain(trace, query)`) | p95 ≤ 30 ms per query; **trace emission adds ≤ 15% to the planning pass** | Explainability is a read-model over an already-emitted trace (commitment C6; TAS §4.1) — if emitting the trace is expensive, it will be turned off, so its cost is bounded and benchmarked |
| Decision trace + provenance size | bounded per plan (target ≤ 128 KB serialised) | The trace must be persistable within the platform's storage envelope; unbounded traces recreate the profile-blob problem class (TR-03; audit 06) |
| Knowledge-registry load + validation (§3.1) | one-time ≤ 200 ms client-side, amortised/cached thereafter | Validate-on-load must never be the argument for skipping validation |

Mechanics: a benchmark harness in the engine-owned suite runs the archetype
matrix against fixed reference profiles, records percentiles per engine +
knowledge version, and flags any >20% regression for review (a regression
with a justifying note may re-baseline — same discipline as §2.3). Server
percentiles ride CI; client percentiles are sampled on real reference
hardware at each phase boundary.

---

## §7 Coach acceptance tests

Each scenario is a scripted coaching judgement — phrased as a coach would
adjudicate it, executed as a test against engine artefacts (plans, reports,
traces), and **mapped to the migration phase that must make it pass**. A
scenario passing early is welcome; a scenario failing at or after its M-phase
blocks that phase's exit gate. (M1 rows assert the landed Wave A baseline —
PRs #173/#174 — and keep it true.)

| # | Coaching judgement (the script) | Must pass at | Verifying class |
|---|---|---|---|
| CA-1 | **A returning athlete after 3 weeks off is NOT flagged overtraining** — a fresh plan with no chronic-load history widens margins and starts conservative; no contested load ratio forces a deload or an overtraining flag (Art 13; EDS §28.3) | **M3** (disciplined signals) | §4.2 authority tests + GM |
| CA-2 | **An in-season rugby player's heavy spinal work is capped the week of a match** — axial load is budgeted and spaced around the fixture, the cap appears in the validation report, and the sport session is untouched (Art 2; EDS §35.1 spinal/sport-compatibility) | **M4** (validation enforces) | D14 gate test + CA script |
| CA-3 | **A non-logging athlete's week 6 differs from week 5** in load or reps, with the advancement decision and its driver signal in the trace (audit 10 §6; SR-01) | **M2** (progression) | §2.2 progressor goldens + §4.3 |
| CA-4 | **Every prescribed item answers its six questions from [`08-EXPLAINABILITY.md`](08-EXPLAINABILITY.md)** from the trace alone — no engine re-run, no fabricated rationale (Art 14; commitment C6) | **M4** (explainability at prescription) | explain read-model sweep |
| CA-5 | **A knee-injured athlete's session is designed around the knee** — no contraindicated pattern is ever proposed (constraints-first), the rehab session is visible to every validator, and a thin-rehab region produces an honest reduced session, never a silent empty one (Art 19; TR-04) | **M1** (landed baseline, held) · veto promotion at **M4** | injury goldens + injury pin + D14 test |
| CA-6 | **A triathlete gets a blended plan, not a collapsed single-sport fill** — and the zero-gap run/cycle and code-less GAA cohorts likewise ride the tiered selection engine (G6; B1) | **M1** (landed, held) · fill retired **M2** | §2.2 rescue goldens |
| CA-7 | **A measured athlete with a strong squat but a poor jump is diagnosed on the measurement, not the prior** — the displaced prior is named in the rationale, and k>1 priorities emerge for measured athletes (G1/G3; audit 10 §6) | **M3** (measurement) | measured-vs-prior goldens + trace assert |
| CA-8 | **A coach swaps an exercise and the swap only ships if it passes the gates** — a contraindicated substitute is rejected with a reason at its tier; the override is recorded and visible to learning (TAS §5.11; Art 19) | **M4** (override v1 through the proposal seam) | contract + D14 integration test |
| CA-9 | **At block end, the engine learned something** — outcomes persist append-only; at least one prior is promoted under policy and demonstrably consumed by the next plan (G13; audit 10 §6) | **M5** (substrate & learning) | SIM + typed-prior integration test |
| CA-10 | **A congested fixture week yields an honest reduced gym week** — the sport wins, the reduction is explained, and a zero-slot week says so rather than fabricating a fit (Art 2; Art 15; 02 §2.8) | **M6** (D8 microcycle decisions) | D8 goldens + CA script |
| CA-11 | **A 16-year-old is never reasoned about from adult physiology** — a missing developmental stage for a minor fails the contract rather than defaulting, and stage rules arrive as governed knowledge (Constitution Art 21; 02 §2.1) | **M6** (athlete-type modifiers) | contract test + K |
| CA-12 | **A coach sees derived signals only** — a squad roll-up that would need raw vitals fails the build, and player-visible detail never widens through any V2 surface (Constitution Arts 11, 22; EDS D17 ✗) | **M5** (team trends) — privacy stack held from the pin at every phase | privacy validator + RLS harness (in CI from M0) |
| CA-13 | **The validation report reaches a human** — every trim/veto renders on a surface with its reason and tier; computed-but-unread is a detected defect (TR-02; DAAS §2.4 — designate, in review) | **M4** (report renders) | report-consumer registration test |

The scenario list grows with each phase (each 🔒 Simon decision that changes
coaching behaviour adds its own acceptance script), but a scenario, once
passing, **never leaves the suite** — coach acceptance is a ratchet, like
everything else here.

**AI touchpoints test against the register [`09-AI-BOUNDARIES.md`](09-AI-BOUNDARIES.md)
§6 fixes (AI-T1–T11).** Within M0–M6 exactly one is exercised: CA-8 proves,
with a human proposer, the substitution seam AI-T8 will later use (the
proposal contract, D14 disposal, and recorded outcome are identical for coach
and model). Every other touchpoint arms only in Phase 4, behind its AIGAS
per-capability eval harness and Simon's go-live (11 §6; AIGAS §9, §17) — and
each arming touchpoint adds its own acceptance script here, keyed to its
AI-T id, before it serves an athlete or coach.

---

## §8 Validating the validators

A validator that cries wolf gets muted; a muted validator is worse than none,
because it *looks* like a guarantee (the pin's counter-case: report-only at
both boundaries, report reaching no screen — TR-02; audit 06). So the
validators are themselves under test:

### 8.1 The false-positive budget (audit 10 Wave D)

Every validator lands **report-only**. During its report-only period its
verdicts are collected across real and archetype traffic and **adjudicated**
(sampled review: was this trim/veto coaching-correct?). Promotion moves one
rung at a time up the ladder — **report → flag (visible, non-enforcing) →
gate (disposing)** — and each promotion requires a measured false-positive
rate under the budget for its class over the full report-only window:

| Validator class (EDS §35.1 authority) | FP budget to reach *flag* | FP budget to reach *gate* |
|---|---|---|
| Safety-tier (recoverability, contraindication, sport protection, lawfulness) | ≤ 5% | ≤ 1%, plus a 🔒 Simon sign-off (safety promotions are product decisions — audit 10 §5, ledger item 5) |
| Honesty/coherence-tier (duration honesty, purpose coherence, dose-coherence, progression-sanity) | ≤ 10% | ≤ 3% |
| Optimisation-tier (balance, redundancy, spacing preferences) | ≤ 15% | usually never — optimisation validators may stay soft indefinitely (they defer when unsure — EDS D14) |

Budgets are design targets to calibrate against M4's first report-only data;
the *mechanism* — no promotion without a measured window — is the invariant.
Demotion is symmetric: a gated validator whose live FP rate breaches budget
drops back to flag, with the breach recorded.

### 8.2 True-positive proof: injected defects

A low FP rate is meaningless if the validator also misses real violations. For
every validator, the suite carries **seeded-defect fixtures** — weeks
constructed to violate exactly its rule (a contraindicated lift smuggled in, a
week over MRV, a taper that drops intensity, a session whose content
contradicts its objective) — and asserts the validator fires, at the right
tier, with a reason. Every validator added by any phase ships with its seeded
defects in the same PR (the "every wave adds the validator that would have
caught its defect class" rail, made testable — audit 10).

### 8.3 Structural honesty checks

- **Fail-closed:** a validator crash is a veto at its tier, never a pass —
  property-tested by injecting throwing validators (02 §2.14).
- **No skipped gates:** every validator runs on every pass; the suite asserts
  the report enumerates every registered validator, every time.
- **The report reaches a surface:** every validation product declares its
  consumers at registration, and a product with zero consumers fails the
  build — the TR-02 lesson made structural (DAAS §2.4 — designate, in
  review; CA-13).
- **Resolution-pass integrity:** whenever two or more verdicts conflicted, a
  resolution record exists, and no recorded resolution ever crossed tiers on
  confidence (02 §3.2–§3.3 — the compiled conflict order is only trustworthy
  because this is asserted, not assumed).

---

*This closes the reading order: the net described here is what makes every
other document in this set safe to build. No M-phase begins before
DEVELOPMENT-PLAN §5.3 ratifies the set; once it does, M0 — this document made
real — goes first.*
