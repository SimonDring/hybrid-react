# Decision Engine V2 — The Progression Architecture

**Status: PROPOSAL — working doc (T4) · 2026-07-14 · not canonical; adopted only via DEVELOPMENT-PLAN §5.3**
**Sprint spec: [`docs/superpowers/specs/2026-07-14-decision-engine-v2-design.md`](../../superpowers/specs/2026-07-14-decision-engine-v2-design.md)**

---

This document designs progression at every level of the coaching hierarchy —
commitment C4 of the set (`00-ARCHITECTURE.md` §2.3). It is bound by **ruling
R3** ([`02-COACHING-PIPELINE.md`](02-COACHING-PIPELINE.md) §4): progression is
**cross-stage, not a stage** — its arms are typed into the ratified catalogue
at **D7** (block-over-block handover), **D12** (dose advancement), and **D15**
(runtime adjustment), informed by **D17** trend insights and **D16** priors
(EDS §20). Every stage ID below is used verbatim from 02 §1.1, and nothing
here proposes a new stage, a new entity, or an EDS §20.1 admission (§6 closes
that question explicitly).

Progression model design and rollout order is the first decision the audit
reserved for Simon (audit 10 §5, point 1) — this document is the design
proposal that decision ratifies or amends, via DEVELOPMENT-PLAN §5.3.

---

## §1 Progression is the product of the plan

**A plan whose week six equals week five is a failed hypothesis.** Every plan
is a falsifiable hypothesis whose entire purpose is that the athlete changes
(Constitution Art 12); a hierarchy without progression plans for an athlete
who stays the same (01 §11). And progression is not an optimisation on top of
a sound plan — it is half of what "sound" means: the right dose is the
smallest one that still produces the required adaptation, **and that dose must
be genuinely sufficient and progressively overloaded** (Constitution Art 7 —
"sufficient, progressed, never padded"; progression is first-class, anchored
to the athlete's demonstrated rate of progress — EDS §34).

The motivation is the audit's most critical scientific finding. At the audit
pin (`main @ 02f6184`, 2026-07-11): **within a phase, loads were
bit-identical** — a static e1RM re-percentaged only at phase boundaries,
accessories never progressing, selection repeating weekly, so a consistent
non-logging athlete received in substance the same stimulus for 3–4 weeks at
a time, under-dosing the very adaptation the plan's own periodisation promised
(SR-01; audit 07). Autoregulation existed only for logging athletes on five
lifts; there was no double progression and no programmed ramp (G9; audit 08 —
graded **P0**, "the most athlete-visible coaching failure"). The population
affected is plausibly the majority: every athlete who doesn't log lifts.

Three design consequences follow, and they organise this document:

1. **Progression is an architecture, not a dose add-on.** It has eight levels
   — adaptation, exercise, weekly, mesocycle, block, season, annual,
   long-term athlete development — each with its own currency (§5), its own
   driver signal, its own decision owner among the ratified stages, and its
   own fallback when the driver signal is absent (§2).
2. **The non-logging athlete MUST still progress.** Every level therefore
   specifies a fallback that works from what is always known — completion,
   time, the calendar, governed knowledge — as **estimator-driven creep with
   honest confidence labelling**: a Prediction, stated as one (Constitution
   Arts 12, 16; KA §2.1 kind 8), displaced the moment measured evidence
   arrives (02 §2.1 — measured displaces inferred, recorded in the
   rationale).
3. **Progression is bidirectional.** Deload, hold, and rebuild are
   progression decisions with the same discipline — driver, owner, record —
   not the absence of one (§3; Constitution Art 9 applied over time; EDS D15
   is symmetric: ease *or* progress).

### 1.1 The eight levels at a glance

| # | Level | What advances | Decision owner (stage arm) | Driver signal | Fallback when unlogged / absent |
|---|---|---|---|---|---|
| 1 | Adaptation | The adaptation itself along its dose-response — continue vs saturated | **D12** (dose arm) within-block; saturation → D17 insight → D5/D7 next pass | Logged performance on the adaptation's estimator; Test Results (Family VIII); D17 response-trend insight | Estimator-driven creep at the governed expected rate of progress, completion-gated, labelled estimated |
| 2 | Exercise | Load, reps, tempo, density, ROM, variant per intervention | **D12** (dose arm); variant graduation via D11 re-selection reading sharpened competency | Logged sets × reps × load vs prescribed; RPE | Governed increment schedule (creep), conservative, labelled; any log displaces it |
| 3 | Weekly | The microcycle wave — week-over-week step inside the block trajectory | **D7** (trajectory, typed field) → D8/D12 instantiate; **D15** (runtime arm) modulates | Completion + readiness/load trend (D17-derived signals, typed runtime inputs) | The wave is knowledge-driven — it exists by design without any logging; missing signals ⇒ baseline plan (EDS D15 ✗) |
| 4 | Mesocycle | Phase intent — accumulate → intensify → realise (or discipline-appropriate) | **D7** (block arm); adaptive deload via **D15** | Planned phase boundaries (deterministic from `plan_start_date`); accumulated-fatigue trend (D17) | Fixed phase rhythm from Programming Knowledge — structural, needs no logs |
| 5 | Block | The dominant-objective handover — exit criteria met, next block starts where this one ended | **D7** (block arm — exit criteria + handover, typed fields per 02 §2.7); scored by D16 at review | Block outcome record: exit criteria vs evidence (Test Results, logs, completion) | Handover on the creep model, exit criteria marked **unverified**; entry doses stay conservative; verification invited |
| 6 | Season | Specificity — the development ↔ freshness trade across SKB season phases | **D7** reading SKB season phasing (KA §4 Domain 2); calendar gates via D13/D14 | The competition calendar (factual — always present when authored); Match Performances, fixture congestion | No season dates ⇒ rolling block model (EDS D7 ✗) — the level degrades to level 5 |
| 7 | Annual | Program sophistication + the macro arc, scored against the Performance Outcome | The coaching-loop re-entry (EDS §23): retaken D4, restructured **D7**, fed by D16/D17 | Benchmark-comparison insights (D17 member); year-over-year Test Results; competition results | Training age still advances (completion history is Stored Data); estimators creep *and decay*; the annual review degrades to adherence + training-age review, low confidence, stated |
| 8 | LTAD | Developmental-band transitions — competency and maturation-appropriate expression | **D1** (stage classification, first-class input — Constitution Art 21); band bounds gate D7/D12 as governed knowledge | Age / maturation status (Stored Data); competency evidence | Unknown stage where it matters ⇒ the more protective band — the conservative default is constitutional (Art 21) |

Levels 1–2 live chiefly at D12 with D15 adjusting them in-week; levels 3–6 at
D7 (with D8/D12 instantiating and D15 modulating); levels 7–8 are properties
of the coaching loop itself — successive planning passes over a sharpening
athlete model (EDS §23) — with D7 the stage that restructures and D1 the
stage that re-classifies. No level requires a stage the ratified catalogue
does not already contain.

---

## §2 The eight levels

Each level below carries the same five fields: **what advances**, the
**driver signal** (what evidence licenses the advancement — trend signals
arrive as D17 insights, named in Family VIII vocabulary, Ontology §10), the
**decision owner** (which stage arm decides, per ruling R3), the
**advancement rule**, and the **fallback** when the driver signal is absent —
because the non-logging athlete must still progress, honestly.

### 2.1 Level 1 — Adaptation

- **What advances** — The physiological adaptation itself, along its
  dose-response: the engine's belief about whether the chosen adaptation
  (the typed target each priority quality carries — ruling R2, 02 §4) is
  still responding to the stimulus or saturating on it. This is progression's
  deepest level: everything above it advances *prescriptions*; this level
  decides whether the prescriptions are still *working*.
- **Driver signal** — Logged performance on the adaptation's estimator (e1RM
  trend for maximal strength, rep performance at fixed load for
  strength-endurance, bar speed where captured); **Test Results** from
  Assessments (Ontology §10, Family VIII; capture mechanics DAAS §2.1.2 —
  designate, in review); and the D17 trend insight that interprets them
  against this athlete's own baselines — *response present / plateauing /
  absent* — meaning decided before anyone acts on it (01 §12).
- **Decision owner** — **D12** (dose arm) inside the block: continuation is
  expressed as the next dose along the dose-response model (02 §2.12).
  Saturation is *not* D12's call to act on alone: it is a D17 insight,
  consumed as evidence by D16 (the rate-of-progress prior flattens) and by
  the next planning pass at D4/D5/D7 — a saturated adaptation is a
  re-diagnosis trigger (EDS §23), because closing one gap promotes another to
  limiter (01 §13).
- **Advancement rule** — Continue the current progression while the response
  trend is positive; escalate the stimulus attribute the adaptation actually
  responds to (load for maximal strength, density for strength-endurance,
  intent/velocity for RFD — Quality & Adaptation Knowledge, KA §4 Domain 3)
  when the trend flattens at the current dose; conclude saturation — and say
  so — when escalation inside the block's budget no longer moves the
  estimator. Dose-response direction is strong knowledge; magnitudes are
  athlete-specific and sharpen via learning (EDS D12 ~).
- **Fallback (no driver signal)** — **Estimator-driven creep.** The
  capability estimate for the target quality advances at the governed
  expected rate of progress for the athlete's training age and quality
  (Domain 3 knowledge, sharpened by the athlete-tier rate-of-progress prior —
  D16), applied only across weeks the athlete actually completed — completion
  is Training History, Stored Data that exists without logging (KA §2.1).
  The crept estimate is a **Prediction with provenance** (KA §2.1 kind 8),
  carries lowered confidence, is labelled as estimated everywhere it
  surfaces (Art 16 — never oversell unearned personalisation), and is
  displaced by the first measured data point (02 §2.1). Determinism holds:
  the creep is a pure function of completion history × knowledge × priors —
  no clock, the plan's own dates only (Constitution Art 18).

### 2.2 Level 2 — Exercise

- **What advances** — The prescription of each selected intervention: load,
  reps, tempo, rest and density, range of motion, and — across passes — the
  exercise variant itself.
- **Driver signal** — Logged sets × reps × load against prescribed, with RPE
  where reported; movement-competency evidence for variant graduation
  (Athlete Knowledge, Domain 1; carried in the `AthleteModel` — 02 §2.1).
- **Decision owner** — **D12** (dose arm) for every within-exercise variable.
  Variant graduation is **not a fourth arm**: selection is re-decided every
  planning pass at D11 as a matter of course, and graduation is D11 reading a
  *sharpened input* — demonstrated competency and capability that levels 1–2
  advanced and D16 recorded — never a separate progression pass (ruling R3
  holds; §6).
- **Advancement rule** — Three governed schemes, chosen per quality and
  scheme model (Programming Knowledge, Domain 6 — knowledge, never
  hard-coded):
  - **Double progression** as the default for rep-range work, including
    accessories: fill the prescribed rep range at a fixed load across
    exposures, then advance the load and let reps drop to the bottom of the
    range. At the pin accessories never progressed at all (SR-01; audit 07)
    — under this rule *every* intervention carries an advancement state,
    recomputed from history (§6), not just the five tracked lifts.
  - **Programmed ramps to near-maximal work**: any near-maximal expression
    (heavy triples at RPE 8–9, peak-week singles) is reached through
    programmed ascent sets inside the session — never cold off an
    activation-only primer. The pin shipped exactly that defect (SR-10;
    audit 07 — "an injury-risk and performance-quality gap no reviewing
    coach would pass"). Ramp structure is scheme knowledge; the ramp needs
    no logging to exist.
  - **Load-step schedules** where a quality progresses by percentage or
    absolute increment per exposure, bounded by the fatigue budget (D9) and
    the recoverability ceiling (tier-3 gate, 02 §3).
- **Fallback (no driver signal)** — The same schemes run on the **governed
  increment schedule** for the lift class and quality — smallest increments
  for upper-body and isolation work, larger for lower-body compounds, all
  entries owned in the knowledge layer (`04-KNOWLEDGE-OWNERSHIP-MAP.md`; the
  HOW-MUCH closure, C3) — scaled conservative, completion-gated, and
  labelled estimated at the surface ("estimated — confirm or adjust"), so
  the athlete's confirmation or a single log converts the Prediction into
  measured truth. An estimated load never feeds a near-maximal prescription:
  ramp top sets under estimated capability cap at the moderate-intensity
  ceiling the stage rules and confidence allow (Art 13 — low confidence
  narrows what may be prescribed).

### 2.3 Level 3 — Weekly

- **What advances** — The microcycle wave: how week *n+1* differs from week
  *n* inside the block — the volume-led step of an accumulation phase, the
  intensity-led step of an intensification phase, the deliberate ease of a
  deload week.
- **Driver signal** — Completion and the readiness/load trend — derived
  signals and trend insights from D17, entering D15 as **typed runtime
  inputs** at the authority tier D17 assigned them (readiness as governed
  soft input; contested load ratios soft input or reported metric, never
  gate — EDS §28.3; 02 §2.15).
- **Decision owner** — **D7** (block arm) *decides* the wave: the
  volume/intensity trajectory is a typed field of `PeriodisedBlocks`
  (02 §2.7). **D8** lays each week's targets from that trajectory, **D12**
  doses them, and **D15** (runtime arm) modulates the step against reality —
  taking it, holding it, or easing it for *pending* work only.
- **Advancement rule** — The planned step is taken by default; D15 eases it
  when the readiness/load trend says the athlete is absorbing poorly, and
  may progress beyond it when the athlete is demonstrably primed and
  under-loaded — symmetric by ratified contract (EDS D15 ⚙). One bad morning
  is noise; a three-week drift is a message — the meaning is decided in D17,
  not in the reflow (02 §2.15, §2.17).
- **Fallback (no driver signal)** — None needed to progress, and that is the
  point: the wave is **knowledge-driven structure** — within-block weeks
  differ *by design*, which is the direct architectural negation of SR-01's
  bit-identical weeks (audit 07). Missing runtime signals mean the planned
  wave ships as the baseline, never a broken or empty week (EDS D15 ✗).

### 2.4 Level 4 — Mesocycle

- **What advances** — The phase intent inside a block: accumulate →
  intensify → realise as the canonical arc, or the discipline-appropriate
  variant the periodisation model prescribes (a hypertrophy block's extended
  accumulation; an olympic-lifting block's technique-led realisation) —
  selectable by goal and quality, never one fixed style template (EDS §34;
  EDS D7 ⚙).
- **Driver signal** — Phase boundaries are planned — deterministic from the
  block structure and `profile.plan_start_date`, never a clock read (Art 18).
  The evidence stream that *modulates* them is the accumulated-fatigue trend:
  readiness drift and load response as D17 trend insights.
- **Decision owner** — **D7** (block arm): the phase sequence and deload
  rhythm are typed into the block's trajectory, bounded by recoverability
  knowledge, not template cadence (02 §2.7). The adaptive deload — pulled
  forward or deferred — is **D15**'s runtime arm acting on pending work under
  the same symmetric contract.
- **Advancement rule** — Phases hand over on plan unless the fatigue evidence
  says otherwise: a sustained negative readiness trend pulls the deload
  forward; a demonstrably fresh athlete may have it deferred within the
  governed bounds. Deload means fatigue clearance — volume *and* intensity
  down; it is never confused with a taper, which cuts volume and **holds**
  intensity (EDS §34 — the two are different tools for different levels; the
  taper belongs to level 6).
- **Fallback (no driver signal)** — The fixed phase rhythm from Programming
  Knowledge (Domain 6). Phase progression is structural: the non-logging
  athlete still accumulates, intensifies, realises, and deloads on the
  governed rhythm, with conservative cut-points — honest about the fact that
  the cut-point numbers themselves await outcome validation (SR-11; audit
  07; §4 is where that validation loop closes).

### 2.5 Level 5 — Block

- **What advances** — The dominant objective itself: each block ends with a
  handover, and the next block starts from what this block demonstrably
  built — not from what a template assumes. The handover and **exit
  criteria** — *what must be true at block end that is not true now* — are
  typed fields of D7's `PeriodisedBlocks` output (02 §2.7).
- **Driver signal** — The **block outcome record** assembled at review (§4):
  exit criteria scored against evidence — Test Results, logged performance,
  completion, readiness response — and interpreted by D17 into the block
  verdict insight.
- **Decision owner** — **D7** (block arm) decides the handover on the next
  planning pass; **D16** scores the block verdict against the typed exit
  criteria and the Performance Outcome (02 §2.16) and writes the priors the
  next D7 reads. The severed-loop defect — block verdicts computed and
  discarded unread (G13; audit 08; audit 03 §3.4) — is closed by this wiring.
- **Advancement rule** — Exit criteria met ⇒ the next block's objective
  builds on the banked adaptation (strength base → power conversion), and
  its entry doses start from the demonstrated end-state. Criteria unmet ⇒
  the handover is *not* automatic: the review decides extend, consolidate,
  or re-diagnose (§3, §4) — a block that failed its hypothesis is
  information, not a formality to skip past (Art 12).
- **Fallback (no driver signal)** — The handover proceeds — the athlete is
  never stalled for not logging — but on the creep model with exit criteria
  marked **unverified**: the next block's entry doses stay conservative
  (crept estimates never earn aggressive jumps — confidence caps step size,
  Art 13), the unverified status is surfaced with the plan's reasoning
  (Art 15), and a verification is invited — an Assessment whose Test Result
  would convert the estimate to measurement, reaching the athlete as D17
  report content (Family VIII; DAAS §2.1.2 — designate, in review).

### 2.6 Level 6 — Season

- **What advances** — Specificity, and the trade between development and
  freshness: off-season builds the general base furthest from competition,
  pre-season converts it toward sport expression, in-season protects and
  maintains it under sport load, and the taper delivers the athlete fresh to
  the days that matter (00 §1.5; EDS D7 ⚙). The season phases are the SKB's
  (Sport Knowledge, KA §4 Domain 2), with the season window derived from the
  athlete's or coach's authored calendar.
- **Driver signal** — The competition calendar — factual, and gate-capable in
  scheduling (02 §2.7 Confidence); fixture congestion shaping microcycles
  (02 §2.8); **Match Performances** and **External Load Observations**
  (Family VIII, Ontology §10) as the evidence of what the season is costing.
- **Decision owner** — **D7** (block arm) lays the macrocycle against the
  season and places the taper — a real taper before key competition: volume
  down, intensity held (EDS D7 ⚙); D8/D13 bend the weeks around fixtures
  (sport wins a clash — Constitution Art 2; EDS D8 ✗); D15 absorbs the
  congestion the calendar didn't predict.
- **Advancement rule** — Season progression runs on specificity, not
  magnitude — and in-season it *inverts the naive currency entirely*:
  holding capability while sport load rises **is** progression, and chasing
  gym PRs mid-season is the regression (the gym serves the sport —
  Constitution Art 2). The taper is the season level's terminal progression:
  arriving fresh, not merely trained (00 §1.5).
- **Fallback (no driver signal)** — No event dates ⇒ the rolling block model
  with a conservative deload rhythm — never an assumed peak that isn't there
  (EDS D7 ✗). The season level degrades gracefully to the block level; it
  re-engages the moment a calendar is authored.

### 2.7 Level 7 — Annual

- **What advances** — The macro arc: year over year, did the training year
  move the athlete's **Performance Outcome** (the resolved, typed referee
  carried from D2 — ruling R2, 02 §4)? And with it, program sophistication:
  a year of training advances training age, and training age changes what
  programming the athlete needs and tolerates — periodisation complexity,
  exposure to higher intensities, autonomy.
- **Driver signal** — The annual review's evidence: **benchmark comparison**
  insights (a ratified D17 family member — 02 §2.17) against the athlete's
  own prior year first and population/sport norms second; year-over-year
  Test Results; competition results (Match Performance); the accumulated
  block verdicts of §4.
- **Decision owner** — No single stage, by design: the annual level is the
  **coaching loop's re-entry** (EDS §23) — diagnosis retaken at D4 from a
  sharpened `AthleteModel`, the macro structure re-laid at D7 — with D16's
  priors (now a year deeper) and D17's annual insights as its inputs. It is
  the loop run at its longest cadence, not a new pass (§6).
- **Advancement rule** — The year's verdict updates the beliefs the next
  year is reasoned from: qualities that moved, qualities that saturated,
  what the athlete's demonstrated rate of progress actually was against the
  assumed one. Later blocks of any annual plan are explicitly provisional —
  only the near term is firm, and the annual arc is re-planned as the
  athlete develops (Art 12 — plans as hypotheses, regenerated from state).
- **Fallback (no driver signal)** — Even a wholly unlogged year advances:
  training age increments from completion history (Stored Data), and the
  capability estimators creep *and decay* per §3.3 — an honest annual
  review exists for every athlete, degraded to what is actually known
  (adherence, completion, training age), labelled low-confidence, and it
  still re-enters diagnosis: the engine never skips the loop because the
  evidence is thin; it narrows the conclusions instead (Art 13).

### 2.8 Level 8 — LTAD (long-term athlete development)

- **What advances** — The athlete's developmental band, across years:
  youth → mature → masters, with maturation stages inside the youth band and
  tissue-and-recovery realities inside the masters band. This level is
  **constitutionally owned**: every prescription honours the athlete's
  developmental stage, never a default adult (Constitution Art 21), and
  **the athlete's long-term development outranks any short-term adaptation,
  at every age** — an LTAD bound defeats every lower level's advancement,
  standing in tier 1 of the conflict order (Safety & Law spans Art 21 —
  02 §3.1).
- **Driver signal** — Age and developmental stage in the `AthleteModel`
  (Stored Data — demographics; 02 §2.1); maturation status where known;
  demonstrated movement competency (the youth band's true currency).
- **Decision owner** — **D1** classifies the developmental stage as a
  first-class input that *shapes* diagnosis and construction — never a
  filter applied afterward (Art 21). The band's bounds then act through the
  existing arms: stage rules gate what D7 may periodise toward and what D12
  may dose (maximal expressions gated behind maturation and competency for
  youth; recovery-weighted dosing and tissue-appropriate progressions by
  default for masters). The band *transition* is a re-classification at D1
  on a later pass — the loop again, not a new stage.
- **Advancement rule** — The stage rules — what is gated, moderated, or
  emphasised at each developmental stage — are **governed, evidence-tagged
  knowledge** under Art 17, reviewable by specialists and versioned, never
  hard-coded (Art 21; homed in `04-KNOWLEDGE-OWNERSHIP-MAP.md`). For a
  developing athlete the progression currency is movement competency, skill
  acquisition, and appropriate loading *before* maximal expression — however
  well heavier work would "fit the plan" (Art 21): no double-progression
  trigger, filled rep range, or crept estimator ever advances a prescription
  through a maturation gate. For masters athletes progression continues —
  age is not a hold — but on recovery-weighted rhythms and
  tissue-appropriate steps.
- **Fallback (no driver signal)** — The conservative default is
  constitutional: where age-modulated evidence is thin, or maturation status
  is unknown where it matters, the platform defaults to the more protective
  band — the margin always widens toward safety, never toward stimulus
  (Art 21; and for minors, a missing stage fails D1's contract rather than
  defaulting to adult — 02 §2.1).

---

## §3 Regression and holding — progression is bidirectional

Progression's arms run in both directions or they are not honest: the same
discipline that advances a prescription must be able to ease, pause, and
rebuild it (EDS D15 ⚙ — symmetric by ratified contract; Constitution Art 9's
recoverability ceiling, applied over time). Three downward decisions, each
with the same driver-owner-record structure as §2's levels:

### 3.1 Deload — planned and adaptive

The planned deload is **D7**'s: a rhythm bounded by recoverability knowledge,
not template cadence (02 §2.7), clearing fatigue with volume *and* intensity
down (EDS §34 — never confused with the taper, which holds intensity). The
adaptive deload is **D15**'s: a sustained negative readiness/load trend — a
D17 trend insight, not a single bad morning (02 §2.17) — pulls the deload
forward for pending work; a demonstrably fresh athlete may have it deferred
within governed bounds. Both are recorded decisions with their driver in the
trace (Art 15).

### 3.2 Hold — a decided sameness, never an undecided one

A hold is legitimate when the driver signal at an advancement point is
absent, contradictory, or below the confidence the step requires — repeat the
exposure, gather the evidence, advance next time. The distinction from SR-01
is the whole point: the pin's bit-identical weeks were an *undecided*
sameness — no owner, no driver, no record (SR-01; audit 07). A V2 hold is a
**decision**: it has an owner (D12 within-session, D15 in-week, D7 at a
block boundary — §2.5's unmet exit criteria), a stated driver, and a
rationale in the trace that the explanation read-model can render
(`08-EXPLAINABILITY.md`; Art 14). In-season, holding under rising sport load
is progression outright (§2.6). A hold that repeats beyond its governed
horizon escalates: persistent failure to earn an advancement is a saturation
or tolerance finding — a D17 insight feeding re-diagnosis (EDS §23), not a
sameness that quietly becomes the plan.

### 3.3 Rebuild — re-entry, and honest decay

After absence, illness, or injury the levels run their arms downward and
then back up:

- **Estimator decay.** The creep of §2.1 is bidirectional: unlogged,
  untrained weeks *decay* capability estimates at governed, quality-specific
  detraining rates (Domain 3 knowledge) exactly as trained weeks advance
  them — a pure function of the same completion history. An engine whose
  estimates only ever rise is lying about the athlete (Art 12).
- **Re-entry ramps.** Return from a gap re-enters below the last
  demonstrated level and re-earns it through the same advancement schemes
  (§2.2) at compressed intervals — the rebuild is faster than the original
  build, but it is still progressed, never resumed cold at the old top.
- **The injury seam.** Return-to-play progression — time- and
  criteria-based, per the injury system — is the injury architecture's to
  own (the pin's gap: no return-to-play progression at all — SR-03; audit
  07); this document names the seam: rehab constraints enter construction
  through the resolved constraint artefact (ruling R4; 02 §4), and the
  rebuild levels above re-engage as the constraint releases.

### 3.4 What regression never touches

All of §3 acts on **pending work only**. A committed session is frozen
absolutely — pinned at start, never recomputed, beyond every arm, every
override, and every regression (Constitution Art 10; EDS D15; the
pin-verified discipline preserved as-is — audit 01 §6). Adaptation is
projection, never mutation: the plan the athlete accepted remains the
immutable record; every ease, hold, and rebuild is a read-time projection
over what has not yet been done (02 §2.15).

---

## §4 Review and iteration — the loop that makes progression compound

Progression within a block is §2; progression *of the engine's beliefs* is
this section. The audit named four missing verbs — measure, progress,
dispose, learn (00 §0; audit 10 §1) — and this loop is where the fourth
closes: "you built the notebook and never opened it" (audit 03 §6; G13;
audit 08 — the loop's last arc severed at the pin).

### 4.1 The cadence and the record

A full turn spans a block; re-diagnosis happens at block boundaries and on
significant events — injury, goal change, a competition result, a sustained
readiness shift (EDS §23). At the block boundary the **block check-in**
assembles the outcome record. What is measured, with its KA classification
(KA §2.1) stated because the classification decides where each product may
live:

| Measured at review | Against | KA §2 kind |
|---|---|---|
| Prescribed vs actual — sessions completed/skipped, sets, loads where logged, adherence pattern | The plan (the immutable hypothesis) | **Stored Data** (Training History / Outcome — ground truth, athlete-owned per Art 22) |
| Test Results, Match Performances, External Load Observations | The block's exit criteria and the Performance Outcome | **Stored Data** (Family VIII captures; mechanics DAAS §2.1.2 — designate, in review) |
| Readiness/load trends, block verdict, saturation and tolerance findings | This athlete's own baselines first | **Derived Data** — recomputable, attributed **Insights** (D17 products) |
| Updated rate-of-progress, volume tolerance, recovery rate, readiness baselines | The evidence above | **Predictions** with learned confidence — Priors (D16 products) |

The outcome record is honest about its own blind spots: for a non-logging
athlete it contains completion, readiness, and any Test Results — and the
review's conclusions narrow accordingly, stated, never padded (Art 13, 15).

### 4.2 The loop, in ratified order

**Block check-in → outcome record → D17 interprets → D16 updates → the next
block reads.** D17 reads the record and decides what it *means*: the block
verdict against D7's typed exit criteria, response-trend findings per
adaptation (§2.1), anomalies, benchmark comparisons — including
**re-diagnosis triggers** when a quality has developed past its limiting
threshold or a prior has shifted enough to change the diagnosis (EDS §23;
02 §2.17). D16 consumes those insights as evidence and writes **priors
only**: the athlete's demonstrated rate of progress per quality (the anchor
Art 7 and EDS §34 demand), volume tolerance (the individual ceiling SR-12
found missing — audit 07), recovery rate, readiness baselines — scored
against the exit criteria and the Performance Outcome (02 §2.16). The next
planning pass reads them at D1, D4, D7, and D12 (EDS D16 →), and §2's levels
run again — sharper.

The D15/D16/D17 boundary is honoured exactly as ratified (EDS §20): **D17
decides what the data means; D15 decides what the athlete does about it this
week; D16 decides what the engine believes differently next time.** An
insight *describes the athlete's data*; a prior *parameterises future
decisions* — the two products are never interchangeable, an insight never
reshapes a plan by itself, and learning never edits a committed week
(02 §1.2). Overrides are signal in the same loop: a coach's or athlete's
recorded substitutions feed D16 as evidence (Ontology §9; 02 §2 override
seam).

### 4.3 What review validates besides the athlete

The loop is also how progression's own knowledge becomes validatable. The
deload cut-points, fatigue budgets, and creep rates this document leans on
are honest-but-unvalidated numbers at the audit pin (SR-11; audit 07) —
governed, low-confidence-tagged, and unprovable without an outcomes layer.
The §4.1 record is that layer's engine-side consumer: every scheme, ramp,
and cut-point becomes a hypothesis whose outcomes accumulate, per athlete
and — de-identified, consent-gated (Constitution Art 22) — per population
(D16's offline aggregation tiers, EDS D16). The platform is a
hypothesis-generating, outcome-observing instrument by constitutional design
(Art 12); progression is its most testable hypothesis stream.

---

## §5 Not "add weight or sets"

The reduction this architecture explicitly forbids: collapsing progression
into load-and-set increments on a fixed exercise list. The sprint brief
demands progression at every level, "never reduced to 'add weight or sets'"
(spec §3, deliverable 8), and the audit shows why the reduction fails even on
its own terms — the pin's engine, which held exactly that model, delivered
it only to logging athletes on five lifts (SR-01; audit 07 · G9; audit 08).
Load is *one currency at one level*. Each level advances in its own:

| # | Level | Progression currency — what "better" means here |
|---|---|---|
| 1 | Adaptation | Continuation along the dose-response — the stimulus attribute the adaptation responds to (load, density, velocity/intent, position), not any fixed knob |
| 2 | Exercise | Load, yes — and reps in range, tempo control, range of motion, position quality, bar speed at fixed load, variant complexity, and reduced external constraint (skill: goblet → front → back is progression with no load change) |
| 3 | Weekly | Density and distribution — the same work absorbed in less time, better spacing around sport load, higher intent quality at equal dose |
| 4 | Mesocycle | The *kind* of stimulus — accumulation's volume yields to intensification's load yields to realisation's expression; advancing means changing currency, not amount |
| 5 | Block | An earned handover — a new dominant objective built on demonstrated exit criteria; "more of last block" is precisely what a handover is not |
| 6 | Season | Specificity and freshness — general → sport-expressed; in-season, capability held under rising sport load *is* the progression, and the taper's freshness is its terminal form |
| 7 | Annual | Sophistication and autonomy — training age earns periodisation complexity, higher-intensity exposure, and self-regulation the novice year could not carry |
| 8 | LTAD | Competency and maturation-appropriate expression — movement vocabulary, skill acquisition, and loading earned in developmental order (Constitution Art 21); for masters, tissue-appropriate continuation, not decline management |

Two consequences bind the whole document to this table. First, every
advancement decision names its currency in its rationale — "why this
progression" is one of the explanation read-model's six answers
(`08-EXPLAINABILITY.md`; Constitution Art 14), and an advancement whose
rationale could only say "week n, therefore +2.5 kg" at a level whose
currency is not load has failed its contract. Second, the currencies are
knowledge, not code: what advancing "position quality" or "maturation-
appropriate expression" concretely means per quality and stage lives in the
governed knowledge layer (Arts 17, 21; `04-KNOWLEDGE-OWNERSHIP-MAP.md`), so
a sports scientist can review and version it without reading engine code.

---

## §6 No new stage — ruling R3 discharged

Ruling R3 left one return path open: if this design surfaced a pass that
genuinely cannot live inside D7/D12/D15's ratified contracts, it would go
back to 02 as a full EDS §20.1 proposed admission (02 §4 R3; the AE-2
candidate "named progression-state pass" — 00 §4.1). **This design needs no
such pass.** The reason is architectural: progression holds no state of its
own. Every "progression state" the eight levels read — the current double-
progression step, the crept estimator value, the decayed capability, the
block's exit-criteria standing — is a **pure recomputation** from the
athlete's longitudinal record (Stored Data — DAAS §3 territory, designate,
in review; V2 consumes, never re-owns) plus governed knowledge plus priors:
Derived Data by classification (KA §2.1), recomputable at every pass, owned
by no store and no stage. The arms therefore remain exactly where R3 typed
them — D7's exit criteria and trajectories, D12's advancement decision
(progress / hold / deload, with its driver signal — already a typed field of
`DosedSession`, 02 §2.12), D15's runtime modulation — informed by D17's
insights and D16's priors, with the annual and LTAD levels running through
the coaching loop's ordinary re-entry (EDS §23) and D1's re-classification.
Zero proposed §20.1 admissions from this document; the stage list stays
closed as 02 left it.

---

*Next in the reading order: [`08-EXPLAINABILITY.md`](08-EXPLAINABILITY.md) and
[`09-AI-BOUNDARIES.md`](09-AI-BOUNDARIES.md) — the read-model that renders
every advancement's "why this progression", and the AI seams that may narrate
progression but never decide it.*
