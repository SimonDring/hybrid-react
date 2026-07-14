# Decision Engine V2 — Explainability

**Status: PROPOSAL — working doc (T4) · 2026-07-14 · not canonical; adopted only via DEVELOPMENT-PLAN §5.3**
**Sprint spec: [`docs/superpowers/specs/2026-07-14-decision-engine-v2-design.md`](../../superpowers/specs/2026-07-14-decision-engine-v2-design.md)**

---

This document specifies V2's explanation architecture — commitment **C6**
(`00-ARCHITECTURE.md` §2.3): the engine's own decision trace, rendered, at the
moment of prescription. It consumes the stage contracts of
[`02-COACHING-PIPELINE.md`](02-COACHING-PIPELINE.md) (every stage output is a
typed artefact carrying `{value, confidence, rationale}` — TAS §5.3; EDS §19)
and the per-item session shape of
[`05-SESSION-BUILDER.md`](05-SESSION-BUILDER.md) §7. It produces the trace and
read-model design that [`09-AI-BOUNDARIES.md`](09-AI-BOUNDARIES.md) narrates
over and [`13-VALIDATION-STRATEGY.md`](13-VALIDATION-STRATEGY.md) tests.

Claims about the shipped engine cite the Sprint 2 audit as facts **as of the
audit pin (`main @ 02f6184`, 2026-07-11)**. Live status lives in HANDOFF.md,
never here.

---

## §1 The principle — the explanation IS the reasoning

**One source.** Every stage of the pipeline already emits its output under the
`{value, confidence, rationale}` contract (02 §2; TAS §5.3), and D14 emits a
report of what passed, what was trimmed or vetoed and why, plus the conflict
resolution records of 02 §3.3. The **decision trace** is the ordered collection
of those artefacts for one engine run — nothing more is manufactured for
explanation, and nothing an explanation says may come from anywhere else.
Explanation is a **projection over that trace**:

> "Explanation is not re-derived after the fact (which would be decision
> leakage) — it is a projection over the trace the decisions already produced"
> (TAS §5.10; EDS SA10; Constitution Art 14).

**Never a parallel story.** The alternative — a narration layer that re-reads
the plan and reconstructs plausible reasons — is architecturally forbidden, not
merely discouraged. A parallel story can drift from the reasoning that actually
ran; a drifted story is indistinguishable from a lie, and the athlete cannot
tell the difference (Art 14's failure mode: "a wrong recommendation is
indistinguishable from a right one"). The sprint brief states the same rule as
mission: the explanation system uses the same reasoning as the engine itself
(spec §3, deliverable 9). The one permitted transformation is **voice** —
plain-language rendering per audience (§5), including AI re-voicing under
AIGAS C2, where form may change but content is the trace (AIGAS §11 C2, §7).

**Why this is a coaching principle before it is an architecture.** A
prescription that arrives without its reasoning is a demand, not coaching
(00-ARCHITECTURE §1.8): the athlete who cannot hear the why quietly edits the
plan and eventually stops believing. Art 14 makes the same point structurally —
a recommendation that cannot be explained must not be made — and the trace
makes it testable: if a stage cannot fill its `rationale` field, the stage is
wrong, not the renderer. The explanation substrate is simultaneously the
debugging, observability, and audit substrate (TAS §11, §14; EDS C2.5) — one
data structure, three lenses.

**The trace, precisely.** For one planning pass the trace contains, in graph
order, the seventeen named node classes of 02 §1.1 — `AthleteModel` (D1),
`DemandProfile` (D2), `RefinedDemandProfile` (D3), `RankedLimitingFactors`
(D4), `PriorityQualities` (D5), `Strategy` (D6), `PeriodisedBlocks` (D7),
`WeeklyObjective` (D8), `SessionObjective` (D9), `MovementRequirements` (D10),
`SelectedInterventions` (D11), `DosedSession` (D12), `ScheduledWeek` (D13),
`ValidatedWeek` + `ValidationReport` with its resolution records (D14) — plus,
per run kind: `AdaptedPendingSessions` (D15) on the runtime pass, and the async
band's `Insights` (D17) and `UpdatedPriors` (D16), which carry their own traces
and enter planning traces only as *cited inputs* (02 §1.2 — forward-only).
Alongside the node outputs the trace records the knowledge entries each stage
read (the knowledge-access trace, TAS §5.4), the assumptions each stage made
(TAS §5.8), any Override entities substituted behind the seam (Ontology §9;
TAS §5.11), and the provenance stamp (§6).

---

## §2 The six questions

The sprint brief fixes six athlete-facing questions the explanation
architecture must answer: **Why? · Why now? · Why this exercise? · Why this
progression? · Why this order? · Why this adaptation?** (spec §3, deliverable
9). They are the coaching projection of the seven trace questions the TAS
already owns (TAS §11: why made / what evidence / which decision / which
assumptions / how confident / which alternatives rejected / what data
influenced) — this section adds the coaching mapping and changes nothing in the
owner: evidence, assumptions, confidence, alternatives, and influencing data
are *dimensions of every answer below* (each node carries them), not separate
questions to route.

Each question maps to named trace nodes — 02's stage IDs verbatim — and to the
surface where it renders. No question is answered by prose the trace does not
contain (§4 H1).

| Question | Trace node(s) — the answer's source | What the athlete hears | Renders at |
|---|---|---|---|
| **Why?** (why this plan — why am I doing any of this?) | `RankedLimitingFactors` (D4) — the diagnosis, per-limiter rationale, magnitude, servability; `PriorityQualities` (D5) — what was selected *and what was parked, with reasons*; grounded by `AthleteModel` (D1) and `DemandProfile`/`RefinedDemandProfile` (D2/D3) incl. the attributed deltas ("why your profile differs from the sport default" — 02 §2.3) and `droppedDemands` | "Low reactive strength is what most limits your sprinting right now; this block attacks it. We parked aerobic capacity — here's why." | Plan overview; block intro; the diagnosis summary |
| **Why now?** (why this, in this week of this season?) | `PeriodisedBlocks` (D7) — block objective, exit criteria, taper placement; `WeeklyObjective` (D8) — how the week bends around the sport; season window from `DemandProfile` (D2) | "You're eight weeks from the season opener: this is the last heavy block before we sharpen. This week is lighter because you play twice." | Block and week headers |
| **Why this exercise?** | `MovementRequirements` (D10) — the requirement each pick serves, the subtracted-pattern list with reasons; `SelectedInterventions` (D11) — per-pick rationale, transfer rating with its knowledge confidence, the stopping point, the value-ordered candidates that lost (TAS §11's rejected-alternatives row), constraint subtractions cited to the constraint artefact (06) | "Trap-bar deadlift because you need hip-dominant power and your lumbar history rules out heavy spinal flexion under load; barbell RDL was considered and lost on that constraint." | The exercise row (the ⓘ seam) — at prescription (§3) |
| **Why this progression?** | `DosedSession` (D12) — the advancement decision (progress / hold / deload) *with its driver signal*, each dose citing its dose-response knowledge entry; `PeriodisedBlocks` (D7) exit criteria (block-over-block arm); priors read as cited inputs (`UpdatedPriors`, D16, previous loop — "we learned you recover quickly") | "Up 2.5 kg because you completed all sets at RPE 7 last week" — or, estimator-driven for the non-logging athlete, "nudged up on schedule; we're assuming, not measuring, so the step is small" (C4; 02 §2.12) | The dose line; week-over-week deltas |
| **Why this order?** | `ScheduledWeek` (D13) — per-placement penalty accounting ("why Thursday" — 02 §2.13); `SelectedInterventions` (D11) — within-session ordering and stopping point (CNS-demand ordering — 05 §4); `WeeklyObjective` (D8) spacing constraints | "Heavy lower is Thursday: 48 h clear of Saturday's match, and not stacked on Wednesday's track session. Power work comes first while you're fresh." | Schedule view; within-session order |
| **Why this adaptation?** (why did my week just change?) | `AdaptedPendingSessions` (D15) — rationale states what reality changed and why; the embedded D14 re-run's `ValidationReport` and resolution records (02 §3.3) for anything trimmed in the reflow | "Readiness has been low three days running, so today drops a set and holds intensity; Saturday is untouched — you already started it." | The reflow annotation on changed items — the pattern that already worked at the pin (§3) |

Two nodes answer questions of their own class and are routed rather than
mapped: the `ValidationReport` (D14) answers "why is this *less* than you
promised?" for every question above (§4 H2 — trims, vetoes, caps, compromises,
resolution records), and `Insights` (D17) answer "what does my data mean?" on
the reporting surface under the DAAS's read-model rules (DAAS §7.1 — designate,
in review), not by this document.

---

## §3 Explanation at prescription — closing the asymmetry

**The audit's finding.** At the pin, the engine explained its *adjustments*
well and its *plan* thinly: session-level why shipped and rendered, reflow
annotations exemplary — but no per-exercise why (selection reasoning computed,
then discarded at placement), no per-dose why, no per-schedule why, confidence
essentially never reaching the athlete, and the two richest artefacts (the
diagnosis meta and the D14 report) never reaching a screen. "An elite coach
explains at the moment of prescription. This engine mostly explains at the
moment of *adjustment*. The asymmetry is the trust gap" (audit 03 §5; G16;
audit 08; Art 14 scored 5/10, HIGH — audit 02 §1).

**The V2 rule.** *Every prescribed item carries its why at delivery time.* The
session artefact of 05 §7 makes this structural: the final session is ordered
items, each carrying `{intervention, dose, rationale, objectiveLink,
confidence}` — so the per-item why is a **field of the prescription**, not a
lookup into a separate system. The `rationale` is D11's per-pick rationale and
D12's per-dose rationale verbatim (02 §2.11, §2.12 — "why this exercise / why
this dose at prescription — commitment C6"); the `objectiveLink` walks the
spine D9 already records (day intent → block objective → priority → limiter —
02 §2.9), which is exactly the "Why?" and "Why now?" chain of §2. Rendering
per-item explanation is therefore a presentation act over data the plan
already contains — never a second derivation (§1), and never blocked on a
future explanation service.

**Adjustment explanations remain — as the generalised pattern.** The reflow
annotation is the one place the pin-era engine already did this right (audit
03 §5): a changed item carried what changed and why, at the moment the athlete
saw it. V2 keeps that behaviour on D15 (`AdaptedPendingSessions` rationale — 02
§2.15) and **generalises its shape to prescription**: the same
reason-attached-to-item mechanic, now present from the first render of the
plan, not only when the plan bends. Prescription and adjustment thus explain
through one mechanism, which is the symmetry Art 14 always implied.

**What "at delivery time" binds.** The explanation ships *with* the artefact
(plan, session, adapted week) as trace references resolved to renderable text —
the athlete does not wait on a round-trip to ask why, and offline delivery
carries its reasons with it. The full drill-down (evidence entries,
assumptions, rejected alternatives, resolution records) resolves through the
read-model on demand (§5); the first-line why is always already in hand.

---

## §4 Honesty rules

Rendering reasons is not automatically honest. Four rules bind every surface
and every audience; `13-VALIDATION-STRATEGY.md` owns their test forms.

**H1 · Nothing renders that did not steer — the display-honesty gate.** Every
explanation fragment carries the trace-node reference it projects, and that
node must be on the causal path of the artefact being explained. Reasoning
that was computed but did not decide the outcome may not be dressed as the
reason — the pin's counter-case is selection reasoning computed and then
discarded before placement (G16; audit 08): whatever text survives must be the
rationale of the node that *actually produced* the shipped item, not a
plausible neighbour. Test form: for every rendered fragment, the referenced
node exists in the trace and the referenced item derives from it (a pure check
over `{artefact, explanation, trace}` — 13).

**H2 · Everything that steered against the athlete's expectation renders —
the silent list is empty or rendered.** The trace already types every
compromise the pipeline can make: `parked` limiters with reasons (D5),
`droppedDemands` (D2), subtracted patterns (D10), unserved requirements (D11),
down-scopes (D6), honest zero-session weeks (D8), trims/vetoes and resolution
records (D14, 02 §3.3), conservative resolutions of contradictory signals
(D15). Art 15's rule — every trim, veto, deferral, forgiveness, cap, and
unservable diagnosis produces a record *and can surface* — is met in V2 by
making surfacing a checked property: each of these record types has a
registered renderable form, and the migration's success criterion is exactly
"the silent list is empty or rendered" (audit 10 §6). A report nothing
displays protects nobody: the pin's D14 report had zero UI consumers (TR-02;
audit 06), which is why §5 makes the `ValidationReport` a first-class
renderable with declared consumers — computed-but-unread is a detected defect
(DAAS §2.4 — designate, in review).

**H3 · Confidence is spoken coach-honestly.** Every answer distinguishes what
is *measured* from what is *assumed* from what is a *prior* — the trace has
this per attribute (D1's rationale names the source of every estimate — 02
§2.1; assumptions are first-class — TAS §5.8) — and renders it in plain words,
not decimals: "we're fairly sure" / "early signs only" / "this plan is
deliberately conservative while we learn how you respond" (Constitution
Arts 13, 16; DAAS §7.1 — designate — for the plain-words register). The
platform never oversells personalisation it has not earned (Art 16): an
estimator-driven progression says it is estimator-driven (C4; 02 §2.12), and a
diagnosis made from an intake conversation renders as the hypothesis it is
stamped as (D4 — 02 §2.4).

**H4 · "Not enough to say" is a first-class answer.** Where the trace holds a
low-confidence or degraded value, the explanation renders the degradation,
never papers over it (Art 15; the D17 discipline generalised — 02 §2.17).
Honesty markers survive rendering in every voice: confidence qualifiers,
declared gaps, and insufficient-data states may be styled, never dropped
(DAAS §7.2 — designate; AIGAS §7's rule for the AI voice, applied to
deterministic renderings too).

**One-source corollary.** H1–H4 jointly restate §1 as enforceable properties:
an explanation may contain no claim without a trace node (no parallel story),
and no trace node of the compromise classes may lack a rendering path. AI
narration adds voice, never content, and is labelled as AI (AIGAS §11 C2, §15;
`09-AI-BOUNDARIES.md`).

---

## §5 The read-model — `explain()` as a pure projection

**The API is already named.** The engine's public surface includes
`explain(decisionTrace, query) → Explanation` (TAS §4.1) — pure, synchronous,
no I/O: trace in, explanation out. V2 fills that signature rather than
inventing a service. The query addresses the trace along the axes §2 defined —
by item (this exercise, this dose, this placement), by question (the six), by
stage (a named node), or by artefact (this session, this week, this plan) —
and the projection assembles the answer from the referenced nodes plus their
evidence, assumption, confidence, and alternative dimensions (TAS §11). Because
it is a pure function of persisted data, the same explanation is reproducible
for the life of the stamped trace (§6), and testable as a function (13).

**One derivation, three audiences.** Following the ratified pattern the DAAS
extends to analytics (DAAS §7.1 — designate, in review: "one derivation
record, three renderings" — itself citing TAS §11), the read-model renders one
trace per audience, never re-deriving:

- **Athlete** — plain language, the six questions, confidence in words (H3),
  every figure theirs to drill into (Art 14 as an athlete right).
- **Coach** — coaching language with full decision detail for their scope:
  the trace of a player's plan, adherence, and injury availability is
  coach-visible under the Team grants; anything derived from raw vitals
  renders at the derived-signal tier only — the trace projection is scoped at
  composition, never at display (Constitution Art 11; TAS §8.1; DAAS §7.1 —
  designate). Overrides render with provenance: "your coach swapped this"
  is part of the honest story (Ontology §9).
- **Engineer/scientist** — the full trace: nodes, knowledge-access trace with
  entry versions, assumptions, resolution records, stamps, confidence
  arithmetic. The explanation substrate is the debug substrate (Art 14;
  EDS C2.5).

**AI narration is a fourth voice, not a fourth source.** The `Explanation`
artefact (or the trace slice behind it) is the *input* to AIGAS category C2 —
AI renders audience-appropriate prose from decision traces + knowledge, form
only, content is the trace, trace-grounded and labelled (AIGAS §11 C2, §7,
§15). The deterministic rendering always exists underneath (AIGAS §9);
`09-AI-BOUNDARIES.md` binds the narration voice to its AIGAS category gates. Nothing AI-voiced may state
what the trace does not (H1 applies to the AI voice verbatim).

**The validation report is a first-class renderable.** The `ValidationReport`
(D14) is not engine telemetry; it is the athlete's honesty ledger (EDS §35.2:
"validation is a source of explanation, not just a gate") and the coach's
sign-off record. V2 registers it as a renderable artefact with declared
consumers on both athlete and coach surfaces — what passed, what was trimmed
or vetoed and why, and every §3.3 resolution record where the conflict order
forced a compromise (02 §3.3; Constitution "When principles conflict" — the
platform records *and surfaces* it). The pin's lesson stands as the
counter-case: five of sixteen validators, report-only, the report reaching no
screen (TR-02; audit 06). A registered consumer plus the H2 check makes the
invisible-report defect class structurally detectable, not culturally avoided.

---

## §6 Trace lifecycle — provenance, persistence, reproducibility

**Stamped at birth.** Every artefact the engine emits — and therefore every
trace — carries the provenance stamp `engineVersion × knowledgeSetVersion`
(TAS §4.1, §5.12; 00-ARCHITECTURE §2.1.2). Priors are versioned on the same
discipline (KA §5; 02 §2.16), so any behaviour shift between two runs is
attributable to a versioned change — "we increased your squat frequency
because we learned you recover quickly" is a *prior-version diff rendered in
plain language* (TAS §10).

**Persisted with the plan hypothesis.** A plan is a bet (00-ARCHITECTURE
§1.9); the trace is the reasoning the bet was placed on. The trace persists
with the plan artefact for the plan's life — it is what D16 scores the block
against (exit criteria and the Performance Outcome — 02 §2.16), what a coach
audits, and what a dispute replays. Runtime projections (D15) emit their own
traces, each referencing the baseline plan's stamp plus the reality inputs
that drove the projection (02 §2.15) — so "why did my week change" (§2, sixth
question) is answerable for any past week, not only the current one.
Persistence mechanics (where traces live, retention, the athlete's ownership,
export and erasure of their own reasoning record) are the data pillar's
territory, not re-owned here (Constitution Art 22; DAAS §3, §3.5 — designate,
in review): V2 defines the trace's content and stamp; the DAAS governs its
custody.

**Reproducible by pinning.** Because the reasoning core is pure and
deterministic (Constitution Art 18; TAS §5.0), pinning a trace's stamped
`engineVersion × knowledgeSetVersion` and re-running over the same inputs
reproduces the artefact — and therefore the explanation, which is a pure
projection of it (§5). A past plan is reproducible by pinning its stamp
(TAS §5.12); a served explanation is reproducible verbatim from its persisted
trace without any re-run at all. This closes the loop the whole document
walks: one reasoning source (§1), rendered at prescription (§3), honestly
(§4), per audience (§5), and standing behind itself for as long as the athlete
holds the plan (§6). The test surface for all of it — trace completeness per
stage, H1/H2 as pure checks, `explain()` golden-mastered per archetype and
audience — is `13-VALIDATION-STRATEGY.md`'s.

---

*Next in the reading order: [`09-AI-BOUNDARIES.md`](09-AI-BOUNDARIES.md) — the
AIGAS-bound seams, including the C2 narration voice this read-model feeds.*
