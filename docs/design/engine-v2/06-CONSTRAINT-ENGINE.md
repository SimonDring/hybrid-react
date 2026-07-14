# Decision Engine V2 — The Constraint Engine

**Status: PROPOSAL — working doc (T4) · 2026-07-14 · not canonical; adopted only via DEVELOPMENT-PLAN §5.3**
**Sprint spec: [`docs/superpowers/specs/2026-07-14-decision-engine-v2-design.md`](../../superpowers/specs/2026-07-14-decision-engine-v2-design.md)**

---

This document specifies V2's dedicated constraint layer — commitment **C2**
of [`00-ARCHITECTURE.md`](00-ARCHITECTURE.md) §2.3: *constraints resolve
before construction*. It is governed throughout by ruling **R4** of
[`02-COACHING-PIPELINE.md`](02-COACHING-PIPELINE.md) §4, which is binding on
this document: the constraint layer is **a resolved, typed artefact — the
constraint envelope — composed from D1/D6/D8 outputs, not a named pass**. No
new stage is proposed here, no EDS §20.1 admission arises, and no edge of the
ratified D1–D17 graph is rewired.

Four documents hang off this one: [`05-SESSION-BUILDER.md`](05-SESSION-BUILDER.md)
consumes the envelope contract (§3); [`07-PROGRESSION.md`](07-PROGRESSION.md)
takes the return-to-play hook (§4.4); [`13-VALIDATION-STRATEGY.md`](13-VALIDATION-STRATEGY.md)
tests against the taxonomy (§2); [`04-KNOWLEDGE-OWNERSHIP-MAP.md`](04-KNOWLEDGE-OWNERSHIP-MAP.md)
homes every knowledge owner the taxonomy names.

The frozen owners this document links and deepens, never restates: the
Constraint and Injury entities and the Load → Fatigue → Recovery → Readiness
system (Ontology §8); the observation vocabulary (Ontology §10, Family VIII);
the Constraint Framework and its shapes/re-checks pairing (EDS §36); the
conflict order (Constitution *When principles conflict*; EDS §37); and
Constitution Arts 2, 3, 8, 9, 10, 15, 21, 22. Claims about the shipped engine
cite the Sprint 2 audit as facts **as of the audit pin (`main @ 02f6184`,
2026-07-11)**, with Wave A fix references given where Phase 0 altered a
pinned finding.

---

## §1 Constraints resolve before construction

### 1.1 The ordering argument

The Constitution states the rule this section operationalises: constraints
are *the box inside which construction happens* — "computed before content"
(Constitution Art 19; Ontology §8, Constraint: "Computed first; content must
satisfy it; never filtered in afterward"). The EDS makes the same call as its
key reform: constraints move from *post-filter* to *pre-shape*, with the
post-hoc validator as "a safety net for edge cases, not the primary
mechanism" (EDS §36).

The audit shows exactly what happens when the order is inverted. At the pin,
injuries were runtime-first with a render-time filter as the real defence:
the rehab replacement stamped sessions with a discipline tag that every
validator then filtered out, so **"the 'shipped empty' veto can never see the
exact case it was written for"** (TR-04; audit 06). The results were the
empty-rehab defect class: empty rehab sessions in 5 of 14 body regions (9 of
14 at severity ≥ 4), hollow sessions carrying a false "replaced with rehab"
banner, severity-4 stranding, and phantom volume from hidden struck items
still counted in the MRV ledger (SR-03; audit 07 · G14; audit 08). The
architecture built the session first and subtracted reality afterwards — and
the subtraction had holes precisely at the moments of highest duty of care.

The immediate defects are landed history: Wave A's **P0-2** (fallback
protocol so a rehab replacement is never empty; validators see rehab
sessions; truthful banners; no phantom volume) and **P0-3** (gate-tier injury
vetoes enforced on the shipped path, flag-staged) closed the holes
(DEVELOPMENT-PLAN §3, PRs #173/#174). Those fixes are the *baseline*, not the
*architecture*: they harden the backstop. V2's position is that the backstop
was never meant to be the primary defence at all.

### 1.2 The V2 inversion

V2 places the fully resolved constraint set **ahead of the session builder**:
every construction decision (D9–D13) receives the constraint envelope as a
typed input and **can never propose into forbidden space**. A knee-injured
athlete's session is *designed around the knee*, never designed and then
stripped (EDS §36's own sentence). What this buys, concretely:

- **Selection cannot see excluded options.** D10 subtracts contraindicated
  patterns against the envelope before requirements are set; D11's candidate
  pool is pre-filtered by equipment, competency, and contraindication
  (02 §2.10, §2.11). An empty or hollow session stops being a filtering
  accident and becomes an explicit, typed outcome (§4.3).
- **D14 becomes the backstop it was always meant to be.** The injury,
  equipment, and competency validators re-check what the envelope already
  shaped (EDS §36's shapes/re-checks pairing) — they catch composition edge
  cases, they are not the mechanism (C2; TR-04; audit 06).
- **Honesty comes structurally.** Because exclusions happen before
  construction, everything excluded is *known* and *recorded* at the moment
  of exclusion — the substrate for Art 15's no-silent-truncation duty and for
  the explanation read-model's "why not X" answers (Constitution Arts 14, 15;
  [`08-EXPLAINABILITY.md`](08-EXPLAINABILITY.md)).

### 1.3 An artefact, not a pass (ruling R4)

Ruling R4 settles how this layer registers against the ratified catalogue,
and this document builds strictly inside it (02 §4 R4):

- **Constraint resolution is Calculation, not Decision Logic** (KA §2): it
  computes over already-decided facts. Athlete constraints (availability,
  equipment, injuries, competency, developmental stage) are **D1** outputs;
  strategy bounds (fatigue budgets, interference separations) are **D6**
  outputs; spacing and the sport calendar are **D8** outputs. The EDS already
  places constraint computation *inside* those stages — "computed first
  (during D1/D6/D8)" (EDS §36).
- **The envelope is the composition of those outputs into one resolved,
  typed artefact** (§3), consumed by D9–D13 as an input and re-checked by
  D14. No stage is added, no edge rewired, zero §20.1 admissions.
- **The envelope resolves *bounds*, never *conflicts*.** Deterministic merge
  of compatible bounds (intersection of allowed sets, minimum of ceilings,
  union of exclusions — §3.3) happens in the envelope. A genuine conflict —
  time vs recoverability, the only high-transfer exercise contraindicated —
  is *not* decided here: it surfaces through construction and is disposed by
  D14 under the compiled conflict order (02 §3; EDS §37). The envelope is a
  box, not a judge.

---

## §2 The taxonomy — thirteen constraint kinds

### 2.1 The three classes

Every constraint kind acts on construction in exactly one primary mode:

- **HARD VETO — removes options.** The bound is absolute within its scope: an
  option outside it may never be proposed by any construction path, human
  override included (an override may propose; D14 still disposes —
  Constitution Arts 10, 19). Hard vetoes remove *options*, never *goals*
  (§6).
- **SHAPING — transforms requirements.** The constraint changes *what is
  asked for* before selection: the microcycle period, blocked and anchored
  days, fatigue ceilings, substitution directives, added objectives (rehab).
  Shaping output is still subject to D14.
- **SOFT PENALTY — weighs in optimisation.** The constraint tilts choices
  through governed weights at tier 6 (or scales dose as governed soft input)
  and can always be outweighed by anything above it. A soft penalty never
  removes an option and never vetoes.

The class is a **governed fact of Constraint Knowledge, not code** — each
kind's class, tier, shaping targets, and re-checking validator are versioned
knowledge-set entries (KA §4 Domain 8; commitment C3), so re-classing a
constraint kind is a reviewed knowledge edit. The constitutional tier column
binds each kind into D14's resolution pass (02 §3.1): when a constraint's
consequence collides with another verdict, the tier decides.

### 2.2 The thirteen kinds

| # | Kind | What it bounds | Class | Constitutional tier | Knowledge owner (KA §4 → [`04`](04-KNOWLEDGE-OWNERSHIP-MAP.md)) | Composed from | Re-checked by (D14) |
|---|---|---|---|---|---|---|---|
| 1 | **Sport Calendar** | The recurring fixed sport schedule — pitch/pool/track/gym squad sessions; *defines the microcycle period as data* (01 §7) | SHAPING | 2 · Sport Protection | Domain 8 (Constraint — sport-calendar semantics) with Domain 2 (Sport/SKB) | D8 (schedule laid by D8 from athlete/coach-authored calendar) | Sport compatibility, constraint compliance |
| 2 | **Competition Schedule** | Fixture dates and congestion — immovable anchors, taper windows, protected days before/after competition (Ontology §4, Competition) | SHAPING | 2 · Sport Protection | Domain 8 with Domain 2 (competition semantics per sport) | D8 (from the season window resolved at D2/D7) | Sport compatibility, key-session protection |
| 3 | **Training Availability** | Which days exist and how long — days/week, per-day duration envelope | HARD VETO | 4 · Athlete Intent (a stated constraint — Constitution, conflict order) | Domain 8 (days/duration → session budget mapping) | D1 (athlete model) | Duration honesty, constraint compliance |
| 4 | **Equipment** | The exercise pool the athlete can physically access | HARD VETO | 4 · Athlete Intent (stated reality; never rewrites the goal — §6) | Domain 8 (equipment → available-exercise mapping) with Domain 5 (Exercise) | D1 | Equipment validator |
| 5 | **Mobility** | Range-of-motion and technical-competency bounds — which positions and expressions this athlete can safely reach (Art 8's competency gating) | SHAPING (regression/substitution directives; the competency gate inside it is veto-strength) | 1 · Safety & Law where competency-gated; otherwise 5 | Domain 1 (Athlete — competency assessment) with Domain 4 (Movement — regression ladders) | D1 | Technical suitability |
| 6 | **Injuries** | Contraindicated patterns/loads by taxonomy entry, severity, and stage; plus the rehab objective it *adds* (§4) | HARD VETO (exclusions) + SHAPING (rehab construction directives) | 1 · Safety & Law | Domain 9 (Injury — taxonomy, contraindication profiles, rehab library) | D1 (injury status) | Injury contraindication (gate) |
| 7 | **Pain** | Athlete-reported pain without a triaged injury — provisional exclusion of the provoking pattern, conservative by default | HARD VETO (provisional, conservative — safety acts on a single observation, §5.4) | 1 · Safety & Law | Domain 9 (triage rules; `high_risk → referral` — the platform is not a diagnostic tool, Art 8) | D1 / D15 (runtime report) | Injury contraindication |
| 8 | **Recovery** | The recoverability ceiling — window-level budget over gym + sport + life; per-session fatigue ceilings; per-region loading caps (Constitution Art 9; Ontology §8, Recoverability) | SHAPING | 3 · Recoverability | Domain 7 (Recovery, Fatigue & Load-Response) | D1 (priors) × D6 (strategy budgets) | Recoverability (gate), MRV ledger |
| 9 | **Readiness** | Today's capacity to train hard — a derived, today-local D17 signal that scales dose symmetrically (Ontology §8, Readiness) | SOFT PENALTY (governed soft input — never gate; §5) | 3 · Recoverability (acting at soft authority) | Domain 7, signal derivation homed per DAAS §2.3.3 *(designate, in review)* | D17-derived signal, consumed on D15's re-entry (§5.2) | Recoverability re-check on the projected session |
| 10 | **Travel** | A dated window where availability and equipment differ from baseline — decomposes into kinds 3/4 scoped to the window | SHAPING (window-scoped rewrite of the availability/equipment envelope) | 4 · Athlete Intent | Domain 8 (window-scoping semantics) | D1 (declared windows) | Constraint compliance for the window |
| 11 | **Lifestyle** | Work/family/life commitments and preferences — preferred slots, life-stress load contribution | SOFT PENALTY (scheduling weights; life load feeds the tier-3 Recovery budget rather than acting itself) | 4 · Athlete Intent (stated commitments) / 6 · Optimisation (preferences) | Domain 8 with Domain 7 (life load into recoverability) | D1 | Constraint compliance (stated), scheduling penalties (preferred) |
| 12 | **Coach Constraints** | Team-package authored bounds: squad schedule, mandatory squad sessions, squad deload directives — *authored constraint data, not an override* (Ontology §3; TEAM-ARCHITECTURE) | SHAPING | 2 · Sport Protection (the team schedule *is* the sport schedule); squad-management directives at 3 | Domain 8 (coach-schedule semantics) | D8 (the Stage-5 seam: coach schedule → every player's week — 02 §2.8) | Sport compatibility, constraint compliance |
| 13 | **Environmental** | Heat, altitude, facility conditions — session-timing and modality weights, escalating to exclusion in extremes | SOFT PENALTY (governed weights), with a tier-1 escalation lane for extreme-condition safety rules | 6 · Optimisation, escalating to 1 · Safety & Law at governed thresholds | Domain 8 (KA §4 Domain 8 names this the exemplar new kind: "a knowledge entry describing how it shapes and is re-checked") | D1 / D8 (declared or scheduled conditions) | Constraint compliance; safety gate at escalation |

Three reading notes on the table:

- **Dual-mode kinds are classified by their primary effect.** Injuries are
  the clearest dual: they *remove* (contraindicated patterns — HARD VETO) and
  they *add* (a rehab objective — SHAPING); both modes are specified in §4.
  Every kind's full shapes/re-checks pairing follows EDS §36's table — a
  constraint shapes construction *and* is re-verified by its validator, and
  neither leg may be dropped.
- **Tier is where a kind argues, not what it is.** A SOFT PENALTY kind at
  tier 4 (Lifestyle commitments) still loses to tier 3 (Recoverability)
  absolutely — the class says *how* the constraint acts on construction; the
  tier says *who wins* when its consequence meets another verdict inside
  D14's resolution pass (02 §3.2).
- **New kinds are knowledge entries.** The taxonomy is closed at thirteen
  for this design, but extension is a Domain 8 knowledge entry per KA §4's
  extensibility rule — never a core edit and never a new stage
  (Constitution Arts 17, 20).

---

## §3 The envelope contract

### 3.1 What the envelope is

The **constraint envelope** is the single resolved, typed artefact the
thirteen kinds compose into — the operational form of Ontology §8's
Constraint entity ("the box inside which construction happens") and the
input contract [`05-SESSION-BUILDER.md`](05-SESSION-BUILDER.md) builds
against. It is composed from D1/D6/D8 outputs (R4), carries
`{value, confidence, rationale}` on every field (TAS §5.3; EDS §19), and is
stamped with the `engineVersion × knowledgeSetVersion` provenance of the pass
that composed it (TAS §5.12).

### 3.2 The contract (design sketch, non-normative)

```
ConstraintEnvelope                      composed from D1 / D6 / D8 outputs (R4)
  scope           the planning horizon this envelope binds (block/week)
  provenance      engineVersion × knowledgeSetVersion + source-decision ids

  # HARD BOUNDS — options removed (HARD VETO kinds)
  allowedDays[]           {value, confidence, rationale}   ← Availability, Travel
                          per-day duration envelope (honest minutes, not booked hours)
  allowedEquipment[]      {value, confidence, rationale}   ← Equipment, Travel
  excludedPatterns[]      {value, confidence, rationale}   ← Injuries, Pain, Mobility gate
                          each: pattern/load id · source kind · taxonomy id + stage
                          (injury) or report ref (pain) · tier · expiry/review trigger

  # SHAPED STRUCTURE — requirements transformed (SHAPING kinds)
  microcyclePeriod        {value, confidence, rationale}   ← Sport Calendar (01 §7 —
                          the period is data, never a hard-coded seven)
  anchoredSessions[]      immovable sport/squad sessions   ← Sport Calendar, Coach
  protectedWindows[]      pre/post-competition protection  ← Competition Schedule
  fatigueCeilings         {value, confidence, rationale}   ← Recovery
                          per-session ceiling · weekly budget (gym + sport + life)
  perRegionLoadingCaps[]  {value, confidence, rationale}   ← Recovery, Injuries
                          region/tissue · cap · driver (rehab stage, residual fatigue)
  substitutionDirectives[]{value, confidence, rationale}   ← Mobility, Injuries
                          pattern → governed regression/alternative (Domain 4/9 ladders)
  requiredObjectives[]    {value, confidence, rationale}   ← Injuries (§4.2)
                          rehab session objectives the week MUST serve, as first-class
                          D9 objectives — never a discipline tag

  # SOFT WEIGHTS — optimisation inputs (SOFT PENALTY kinds)
  schedulingWeights[]     {value, confidence, rationale}   ← Lifestyle, Environmental
                          governed weights, tier-6 authority, D13-consumed
  readinessSignal         {value, confidence, rationale}   ← D17 signal derivation (§5)
                          band · trend context · recency · staleness flag — consumed
                          on D15's re-entry only, soft authority, never gate

  # HONESTY — what the box could not hold (Art 15)
  unservable[]            needs the envelope cannot serve, each with its reason (§4.3)
  narrowings[]            every recorded narrowing of means (§6): what was excluded/
                          regressed, by which kind, surfaced where
```

### 3.3 Composition rules

Composition is a pure Calculation (KA §2) with deterministic merge semantics
— the same inputs always compose the same envelope (Constitution Art 18):

1. **Allowed sets intersect.** Days, equipment: the athlete trains in the
   intersection of every applicable bound (a travel window intersects its
   scoped rewrite, not the baseline).
2. **Ceilings take the minimum.** Fatigue ceilings, loading caps, duration
   envelopes: the most restrictive applicable bound wins, and the rationale
   records which kind supplied it.
3. **Exclusions union.** Excluded patterns from every source accumulate;
   each carries its source kind, tier, and review trigger independently, so
   lifting one injury's exclusions never lifts another's.
4. **Weights compose additively within tier 6** under governed combination
   rules (Domain 8); no soft weight may compose into veto strength.
5. **Conflicts are not resolved — they are carried.** Where two bounds
   genuinely conflict (the intersection of allowed days is empty; a required
   rehab objective cannot fit the fatigue ceiling), the envelope does not
   pick a winner: it records the conflict and construction surfaces it to
   D14's resolution pass, where the conflict order governs (R4; 02 §3). The
   one exception is composition *within* a single semantics — rule 2's
   minimum is a merge, not a judgement.
6. **Confidence propagates as the weakest input** per field (TAS §5.7): an
   envelope field is never more certain than the D1/D6/D8 output it was
   composed from.

### 3.4 Who consumes what

| Stage | Reads | Under |
|---|---|---|
| D9 Session Objective | fatigueCeilings, allowedDays (duration), requiredObjectives, readinessSignal (runtime) | 02 §2.9 — the box at construction's head |
| D10 Movement Requirements | excludedPatterns, substitutionDirectives | 02 §2.10 — subtraction up front (C2) |
| D11 Intervention Selection | allowedEquipment, excludedPatterns, substitutionDirectives, competency bounds | 02 §2.11 — pre-filtered candidate pool |
| D12 Dose Assignment | fatigueCeilings, perRegionLoadingCaps, readinessSignal (runtime) | 02 §2.12 |
| D13 Scheduling | anchoredSessions, protectedWindows, microcyclePeriod, schedulingWeights | 02 §2.13 |
| D14 Validation | the whole envelope | re-check of every shaped/vetoed bound (EDS §36) |
| D15 Runtime | the envelope re-composed with live state | 02 §2.15 — same functions, both passes |

---

## §4 Injury handling redesigned

### 4.1 Triage → constraint set → rehab construction

The injury pathway is one chain with three named steps, each already owned
by a frozen entity — this section wires them in the constraints-first order:

1. **Triage** (Ontology §8, Injury; Domain 9): symptom/injury intake resolves
   to a taxonomy entry with severity and stage, or to a `high_risk →
   referral` flag — the platform is not a diagnostic tool and defers
   high-risk presentations to professionals (Constitution Art 8). The audit
   found triage genuinely good at the pin — "the risk concentrates *after*
   triage" (SR-03; audit 07). V2 keeps it.
2. **Constraint set**: the taxonomy entry's contraindication profile becomes
   envelope entries — `excludedPatterns` (HARD VETO, tier 1),
   `perRegionLoadingCaps`, and `substitutionDirectives` — *before any
   session exists* (§1.2). This replaces the pin's runtime-first blocking
   with pre-shaped selection; D14's injury gate re-checks (EDS §36; the
   Wave A P0-3 enforcement is the landed floor this builds on).
3. **Rehab construction as a first-class session objective**: the injury's
   rehab protocol (Domain 9's rehab library) enters the envelope as a
   `requiredObjectives` entry, which D9 serves as a **named session
   objective like any other** — with a target quality (tissue robustness /
   return-to-load), a fatigue budget, and the full D10–D14 treatment.

### 4.2 Never a filtered-out discipline

The pin's structural defect was that rehab lived *outside* the decision
graph: a replacement pass stamped a discipline tag, and every validator
filtered to gym sessions, so the safety net could not see the case it
existed for (TR-04; audit 06). Wave A P0-2 made the validators see those
sessions; V2 removes the category itself:

- A rehab session is a **session objective**, not a discipline. It flows
  D9 → D10 → D11 → D12 → D13 → D14 like every session, is visible to
  **every** validator, counts honestly in the volume ledger (no phantom
  volume, no hidden struck items), and carries its rationale into the
  explanation read-model ("why this session is rehab, and what it protects"
  — Constitution Arts 14, 15).
- Rehab exercises are selected by D11 from Domain 9's rehab interventions
  under the same value-ordered, minimum-effective discipline as everything
  else (Constitution Art 7) — protecting and rebuilding tissue is
  first-order work, because availability is the currency of long-term
  performance (Constitution Art 8; Ontology §8, Injury).

### 4.3 The unservable outcome

When the envelope leaves no safe session — every pattern for a region
excluded and no rehab content applicable, a fatigue ceiling of zero, an empty
allowed-day intersection — the outcome is an **explicit, typed result, never
an empty session**:

- The envelope records the need in `unservable[]` with its reason (which
  bounds collided, at which tiers); construction emits no fabricated
  content; D14's report carries the outcome; and the athlete sees the honest
  statement and its reason — "no safe session exists this week for X,
  because Y" (Constitution Art 15; EDS D14 ✗). `items: []` shipping as a
  session is the named forbidden artefact (TR-04; SR-03 — the P0-2a fallback
  protocol is the landed floor; V2 makes the case a first-class outcome
  rather than a caught edge).
- Where the unservable need is a *rehab* need (severity-4 stranding at the
  pin — SR-03), the outcome escalates rather than strands: the referral
  pathway (Domain 9's `high_risk → referral`) and the coach/athlete surface
  are told explicitly that the platform cannot serve this case.

### 4.4 The return-to-play hook

The pin had no time- or criteria-based return-to-play progression (SR-03;
audit 07). V2 homes that progression in
[`07-PROGRESSION.md`](07-PROGRESSION.md), and this document fixes only the
seam: the injury's **stage** is the envelope's input, and stage transitions
are *progression decisions* — criteria-based (pain-free range, load
tolerance demonstrated at the current stage), never purely calendar-based —
whose effect on this layer is a **re-composed envelope** (exclusions narrow,
caps rise, the rehab objective advances). The envelope never advances a
stage itself; it reflects the stage the progression architecture has
decided. Return-to-play is thereby a first-class progression track with the
same demonstrated-progress anchoring as every other arm (commitment C4).

---

## §5 Readiness and the single-observation discipline

### 5.1 This layer consumes; it never measures

The constraint layer **invents no measurement vocabulary and computes no
signal ad hoc**. What it consumes arrives in the ratified vocabulary, from
the owners:

- **Raw observations are Family VIII entities** (Ontology §10): a pitch-GPS
  datum is an **External Load Observation**; a measured capability datum is a
  **Test Result**; a fixture's exposure record is a **Match Performance**.
  None of these is read directly by this layer — raw observations follow the
  raw-vitals rule and aggregate upward (Constitution Art 11).
- **Readiness and load state arrive as D17-derived signals** — products of
  the D17 family's signal-derivation member (EDS §20 D17; 02 §2.17), typed
  `{value, confidence, rationale}`, authority-tiered at birth (EDS §28.3),
  entering the constraint layer as the `readinessSignal` field on D15's
  re-entry (02 §2.15). Capture mechanics and the longitudinal record are
  DAAS territory *(designate, in review — DAAS §2.1.2, §3)*; V2 consumes,
  never re-owns.

### 5.2 Trend over single observation

The pin's defect class: **single-observation autoregulation at full
authority** — one un-baselined bad wellness entry cut volume 22% and RPE −1,
with no trend smoothing, no recency gate (a days-old row kept trimming; a
stale *good* row masked a bad week), and readiness confidence computed but
gating nothing (SR-04; audit 07 · G12, G15; audit 08). The platform's own
cited standard supports monitoring against baseline and trend, not one-day
gating. V2's discipline, binding on every athlete-signal consumer in this
layer:

1. **Trend beats point.** A dose-affecting signal is read against the
   athlete's own baseline and trend (D17's meaning-before-action duty —
   01 §12: one bad morning is noise; a three-week drift is a message). The
   trend context travels *inside* the signal's rationale — the constraint
   layer never re-derives it.
2. **Recency gates.** Every signal carries its observation window; a signal
   older than its governed recency bound (Domain 7 knowledge, per signal
   type) degrades to stale — it stops scaling dose in either direction and
   is flagged, so a stale good row can no longer mask a bad week (G12).
3. **Confidence is load-bearing, not decorative.** The signal's confidence
   scales its effect: low-confidence readiness widens margins instead of
   amplifying swings (TAS §5.7), and a signal below its governed confidence
   floor is reported, not consumed (G15).

### 5.3 The ACWR demotion, generalised

The knowledge-side demotion of the acute:chronic ratio — floored,
corroboration-gated, soft-input-capped — was exemplary at the pin, and
absent for the athlete's own data (SR-08; audit 07: the same disease cured
in one of its two habitats). V2 generalises the cure: **every athlete-signal
consumed by this layer carries a governed authority ceiling** (EDS §28.3),
set by Domain 10's evidence→authority mapping and never self-upgraded —
readiness at governed **soft input**, contested load ratios at **soft input
or reported metric**, never gate (02 §2.12, §2.15). An over-trusted signal
becoming a hidden rule is the platform's most insidious historical disease;
the ceiling is the structural cure.

### 5.4 The safety asymmetry

The trend discipline has one deliberate exception, and it runs in the
conservative direction only: **safety-tier inputs act on a single
observation**. A pain report (kind 7) provisionally excludes the provoking
pattern immediately — safety gates act even at moderate confidence
(Constitution Art 8), and waiting for a pain *trend* is the wrong kind of
patience. The asymmetry is principled: a single observation may *narrow*
(conservative, reversible, surfaced), it may never *push* — no single good
reading ever raises a ceiling, advances a rehab stage, or unlocks intensity
(that direction always requires trend + recency + confidence, §5.2, §4.4).

---

## §6 Equipment never rewrites the goal

The goal belongs to the athlete (Constitution Art 3), and no constraint —
equipment least of all — may substitute it. The audit named the defect class
this section forbids: at the pin, equipment scarcity could silently demote
the athlete's chosen discipline to a different one (audit 01 §7's
silent-demotion finding; carried as level-2 context in 01 §2).

The rule, structurally:

- **Constraint output narrows *means*; it never touches *ends*.** The
  envelope's hard bounds act on the exercise pool, the days, the ceilings —
  never on the `DemandProfile` or the goal recorded at D2's head. There is
  no path by which envelope composition rewrites a demand: the envelope is
  composed from D1/D6/D8 outputs and consumed by D9–D13, and the goal sits
  upstream of all of them (02 §1.2). A dumbbell-only athlete who chose
  strength gets *strength trained with dumbbells* — regressions, tempo, and
  density as governed substitutions (Domain 4/5 ladders) — not hypertrophy
  because hypertrophy is the path of least resistance.
- **When narrowed means genuinely cannot serve the end, the engine says so.**
  The gap surfaces as an explicit down-scope through D6's discipline
  (02 §2.6: prioritise, down-scope, record — silent goal demotion is the
  named forbidden class) or as an `unservable[]` entry (§4.3), reaching the
  athlete in plain language: "with your equipment, we can serve X of your
  goal; fully serving it needs Y" (Constitution Arts 3, 15). The athlete may
  then change the goal — that decision is theirs alone (Art 3; tier 4,
  Athlete Intent).
- **Every narrowing is recorded.** The envelope's `narrowings[]` ledger
  (§3.2) carries what was excluded or regressed, by which kind, and where it
  was surfaced — the explanation read-model's substrate for "why not X"
  and the whole-set test surface for the silent-demotion class
  ([`13-VALIDATION-STRATEGY.md`](13-VALIDATION-STRATEGY.md)).

---

*Next in the reading order: [`07-PROGRESSION.md`](07-PROGRESSION.md) — the
eight-level progression architecture, including the return-to-play track
this document's §4.4 hooks into.*
