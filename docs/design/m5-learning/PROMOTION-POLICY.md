# D16 Staged→Learned Prior Promotion Policy & D7 Gate Semantics

`Status: DESIGN PROPOSAL — for Simon's 🔒 7 ruling · 2026-07-16 · no code; the promotion thresholds are HIS call`

> This is a **proposal**, not a decision and not an implementation. It lays out
> the options for the 🔒 7 decision the migration set reserves —
> [`11-MIGRATION-PHASES.md`](../engine-v2/11-MIGRATION-PHASES.md) §6: *"D16
> staged→learned promotion policy; D7 gate semantics — the falsifiability read
> and the twice-gated pattern are Simon's call before any prior steers a live
> plan."* It recommends the conservative option at every fork and says why, but
> the ruling is Simon's. **Nothing here builds anything.** The M5 substrate
> migration ([`../m5-substrate/SCHEMA-AND-PRIVACY.md`](../m5-substrate/SCHEMA-AND-PRIVACY.md))
> must be authored and Simon-applied first; this policy is implemented per
> Simon's ruling *after* `block_outcomes` exists and holds real rows.

---

## 0. How to read this document

Section **1** frames the problem in plain language — no jargon, because the
decision is Simon's and he is the reader. Sections **2–4** are the mechanism:
the staged→learned lifecycle (§2), the falsifiability read that gates it (§3),
and what a promoted prior is then allowed to *do* to a live plan (§4, the D7
gate semantics + the TR-05 hard rule). Section **5** is the point of the whole
document: four **decision points**, each a clear choice with a recommendation.
Section **6** is the safety guarantee — additive-first and demotable, mirroring
M3's discipline. Section **7** is a worked example. Section **8** states what
this proposal explicitly does *not* decide.

Authorities this proposal is validated against, cited inline throughout:
EDS §25 (the three learning tiers; shrinkage; confidence-is-learned) and the
D16/D7 decision contracts (EDS §20 catalogue); Constitution **Art 12**
(falsifiable hypothesis), **Art 13** (confidence governs authority), **Art 16**
(become personal as evidence accumulates; never oversell), **Art 18** (learning
enters only via priors); **TR-05** (audit 06 — a schema-default prior must not
arm a learned steer); DAAS **§3** (the longitudinal record — the evidence
substrate) and **§3.4** (baselines / maturity).

---

## 1. The problem, in plain language

Today the engine coaches every athlete from **population priors**: best-guess
starting numbers drawn from the published science — a generic recovery rate, a
generic volume tolerance, generic dose-response. Those numbers are the same for
everyone until measured otherwise. That is correct and honest on day one
(Art 16): the engine has no reason yet to believe *you* recover faster than the
textbook says.

The M5 substrate changes what is *possible*. Once `block_outcomes` exists
(the append-only record of what each training block prescribed and what the
athlete actually did and how they responded — DAAS §3, §5.3), the engine can
finally **learn an athlete's real response** instead of assuming the textbook.
That is the D16 "learn" verb (EDS §25): convert outcomes into sharper priors,
so the next planning pass reads *this athlete's* demonstrated recovery rate and
volume tolerance rather than the population default.

Here is the danger, and it is the whole reason 🔒 7 is Simon's call. A prior
that is **half-learned or noisy** — computed from one block, or from a block the
athlete barely completed, or from a signal that happened to be flattering that
month — is *worse* than the honest population default, because it wears the
authority of "we learned this about you" while being a guess. And a bad
recovery-rate prior does not just mislabel a chart: it **steers the plan** —
D7's deload rhythm and (later) block length, D12's dose. Over-trust a noisy
"recovers fast" prior and the engine under-deloads a real person toward
overtraining; over-trust a noisy "recovers slow" prior and it wastes their
training year being timid.

So the question 🔒 7 answers is exactly:

> **When has the engine learned enough about an athlete that a prior may stop
> being a private estimate and start steering their live plan?**

That threshold — how many blocks, how good the prediction has to be, how far
the prior may then deviate, and when it gets pulled back — is the decision.
This proposal recommends a deliberately conservative answer to each part and
explains the reasoning, but the numbers are Simon's to set.

---

## 2. The staged→learned lifecycle (the twice-gated pattern)

A prior moves through **four states**. The engine's *live* behaviour changes
only at the last transition, and only under two independent gates.

```
   block closes                 gate A: evidence            gate B: falsifiability
   (block_outcomes row)         (N blocks · confidence)     (the prior PREDICTED
        │                              │                     the last outcome)
        ▼                              ▼                              ▼
  ┌───────────┐  D16 update   ┌──────────────┐   promote    ┌──────────────┐
  │ OBSERVED  │ ────────────▶ │    STAGED    │ ───────────▶ │   LEARNED    │
  │ (evidence)│               │ (private     │              │ (steers D7/  │
  └───────────┘               │  estimate,   │ ◀─────────── │  D12, shrunk │
        ▲                     │  steers      │   demote      │  toward pop) │
        │                     │  NOTHING)    │   (§ decision └──────────────┘
   population prior           └──────────────┘    point d)          │
   (the cold-start default; ALWAYS the fallback)  ◀─────────────────┘
```

**OBSERVED → STAGED (D16 update, always safe).** On block close the app writes a
`block_outcomes` row (DAAS §5.3's `outcome_signals`: planned dose, achieved
dose, adherence, `response_delta`, a composed `confidence`, and the
`engine × knowledge` stamp). D16 reads the athlete's accumulated rows
asynchronously (off the planning critical path — Art 18, EDS §25) and updates a
**staged** estimate of each learnable quantity: recovery rate, volume tolerance
per quality, dose-response, readiness baseline (EDS §25's "what the engine
learns" table). A staged prior is a **private estimate**. It is
confidence-tagged (Art 13), shrunk toward the population prior in proportion to
how little evidence backs it (§ shrinkage, decision point b), and it **steers
nothing** — it is exactly today's `stagedPriors` slot, which by design is
*"written at block check-in, read by NOTHING"* (HANDOFF open-queue item 1).
Writing and refining a staged prior can never hurt a live plan, so this
transition needs no gate.

**STAGED → LEARNED (promotion — the twice-gated step).** A staged prior is
promoted to **learned** — the state the read-path (`priors.js`:
`learnedPriors.recoveryRate.value`) actually consumes — only when it clears
**both** gates, independently:

- **Gate A — evidence sufficiency.** At least **N** blocks of outcome evidence
  for this quantity, and the composed confidence of the staged estimate at or
  above a floor (Art 13: authority follows confidence). This is the "enough
  data" gate. N and the floor are **decision point (a)**.
- **Gate B — falsifiability.** The staged prior must have been **predictive**:
  its prediction for the most recent block matched the observed outcome within
  tolerance (§3). This is the "and it was actually right about you" gate. A
  prior that mispredicts is *not* promoted, no matter how many blocks back it —
  volume of data cannot buy authority that the prediction failed to earn.

"Twice-gated" means **both** must hold. Gate A alone is the classic trap — N
blocks of a confidently-wrong estimate — and Gate B is what closes it. This
directly answers the EDS's own open question C3.2 (§ closing critique): *"the
single most important scientific commitment this platform can make is to treat
its own diagnoses as falsifiable hypotheses and measure them"* — promotion is
where that commitment becomes a mechanism.

**LEARNED → STAGED (demotion).** A learned prior that begins to mispredict is
**pulled back** to staged (steers nothing again) and the plan reverts to the
population default for that quantity. The demotion rule is **decision point
(d)**. Demotion is not failure — it is Art 12's referee doing its job: the
athlete's lived response is the arbiter, and when it contradicts the learned
belief, the belief loses its authority.

**Population prior — the floor under everything.** At no state is the population
prior discarded. It is the cold-start default, the shrinkage anchor (§ decision
b), and the fall-back that a demotion returns to. This is what makes the whole
system additive-first and rollback-clean (§6).

---

## 3. The falsifiability read (Art 12) — the second gate in detail

Art 12: *"Every plan is a falsifiable hypothesis, and the athlete's lived
response is the referee."* A learned prior is a hypothesis of the same kind —
"this athlete recovers at rate R" is a claim that predicts something measurable
about the next block. Promotion **requires that prediction to have been tested
and held**.

Mechanically, each staged prior carries a **prediction** it commits to before
the block it will be judged on:

- A *recovery-rate* prior of R predicts a readiness-rebound trajectory after a
  known load (EDS §25 table: "observed readiness rebound after known loads").
  Gate B compares the predicted rebound against the `readiness_snapshots` the
  block actually produced.
- A *volume-tolerance* prior for a quality predicts that the prescribed volume
  was recoverable — no readiness collapse, no adherence cliff, response in the
  expected band. Gate B compares against `block_outcomes.outcome_signals.
  response_delta` and the adherence/monitoring drift.
- A *dose-response* prior predicts a performance delta for the delivered dose;
  Gate B compares against the observed `e1rm_pct` / response delta.

The read is **directional and honest**, not a precision contest:

1. **Predicted before observed.** The prediction is recorded from the prior as
   it stood *entering* the block (stamped, DAAS §3.2), then scored against the
   outcome. This is what stops the circularity of "learn from the block, then
   test on the same block."
2. **Predictive ⇒ eligible to promote.** Prediction within tolerance → Gate B
   passes. The tolerance band is wide early (Art 13: low confidence ⇒ wide
   margins) and can tighten as confidence rises.
3. **Mispredicts ⇒ not promoted / demoted.** A staged prior that mispredicts
   stays staged; a *learned* prior that mispredicts is demoted (§ decision d).
   Either way the plan keeps the population default — the safe number.
4. **Insufficient signal ⇒ abstain, never guess.** If the block did not
   generate the signal the prediction needs (athlete skipped the readiness
   check-ins; adherence too low to interpret), Gate B **abstains** — it neither
   passes nor fails, and the prior waits for a block that can test it. Absence
   of evidence is not evidence of correctness (Art 15: no silent debt).

This is the difference between "we have five blocks of data" (Gate A) and "and
our belief about you actually predicted what happened" (Gate B). Only the
second earns the right to steer a real person's training.

---

## 4. D7 gate semantics — what a learned prior may steer, and the hard rule

### 4.1 The TR-05 hard rule (non-negotiable)

> **A schema-default or unlearned prior must NEVER arm the steer. The steer is
> OFF until a genuinely learned prior exists for that athlete.**

This is TR-05 (audit 06, Critical → High): at the audit pin the D7 steer armed
for *every* onboarded sport user because the dual-written athlete model carried
a **schema-default** `recoveryRate {value:1}` — a non-null default that is not a
learned fact — so steered split/deload logic ran live in production while the
golden archetypes (having no athlete_model) exercised only the template path.
*"A schema-default prior must not arm a learned steer"* is the root defect this
whole policy exists to prevent recurring.

The current read-path already enforces the shape of this rule: `blockDeloadSteers`
gates on `recoveryRate != null` reading from
`profile.athlete_model.learnedPriors.recoveryRate.value` (not a schema default),
and no-prior profiles keep the template **byte-identical** (`priors.js`: *"today
every read resolves to the population default, so live output is
byte-identical"*). The promotion policy's job is to be the **only writer** that
ever populates `learnedPriors.<quantity>` — and to write it only for a prior
that cleared both gates (§2). The invariant, stated for the implementation:

- **The presence of a `learnedPriors.<quantity>` value is itself the arming
  signal.** No value ⇒ steer OFF ⇒ population behaviour (byte-identical).
- **A value is written by promotion alone.** Never by schema default, never by
  onboarding, never by a staged (un-promoted) estimate. A staged prior lives in
  a *separate* field the steer does not read (`stagedPriors`, not
  `learnedPriors`) — the two must be structurally distinct so a staging bug can
  never leak into the steer.
- **The golden matrix must exercise the armed path.** M0's exit gate requires
  golden archetypes that carry a *promoted* learned prior (the TR-05 case), so a
  steered plan is never again untested by the suite.

### 4.2 What a learned prior is allowed to steer

Per EDS D16's declared consumers (*"Feed these back as priors consumed by D1,
D4, D7, D12"*) and the D7 contract (block objective: length, intensity/volume
trajectory, deload rhythm — chosen from objective **and the athlete's
recoverability**, not a fixed template). The candidate levers, ordered by
reversibility / safety:

| Lever | Decision | What the prior changes | Risk if wrong |
|---|---|---|---|
| **Deload rhythm** | D7 | How often a deload week falls (`deloadsFromRecoverability`) | Low — a mis-timed deload costs a week, self-corrects next block |
| **Volume tolerance** | D12 | The volume scalar the dose chain inherits (`volumeTolerance`, already read by `resolveProgram`) | Medium — scales real training stress up/down |
| **Block length** | D7 | How long a block runs before re-planning | Medium — longer commitment before the referee reads the outcome |
| **Intensity/volume trajectory** | D7 | The ramp shape within a block | Higher — compounds across the block |

**How** it steers is unchanged from the built seam: the learned value flows in
as a *typed prior input* to the pure decision (Art 18 — learning enters only via
priors; the core stays deterministic), the decision computes as always, and
**D14 still disposes** (Art 19): an over-aggressive learned volume tolerance
that pushes past MRV is trimmed by the MEV/MRV validator exactly as a population
dose would be. The learned prior never gets the last word — it shifts the
*starting* number, and the validators still gate the result. This is the second
safety net under the promotion gates.

---

## 5. The decision points for Simon

Each is a genuine fork. The recommendation is the conservative option, with the
reasoning; Simon rules.

### (a) The promotion threshold — how many blocks, what predictive bar

The bar for STAGED → LEARNED (Gate A + Gate B, §2).

| Option | Gate A (evidence) | Gate B (predictive) |
|---|---|---|
| Aggressive | N = 1 block | prediction within a loose band |
| **Recommended** | **N = 3 blocks** for this quantity **AND** composed confidence ≥ a "moderate" floor (Art 13) | **the most recent block predicted within tolerance**, with at least one earlier block not contradicting |
| Cautious | N = 4–5 blocks + two consecutive predictive blocks | strict tolerance |

**Recommendation: N = 3 blocks + moderate-confidence floor + last block
predictive (Gate B).** Reasoning: one or two blocks cannot separate a real
personal trait from a good/bad month (Art 12's overfit-a-single-week failure;
EDS D16: *"never overfit a single session"*). Three blocks with a *predictive*
most-recent block is the first point at which "this is how you respond" is more
than noise, while still letting a genuinely distinctive athlete out of the
generic plan within a season. Recovery rate — the highest-stakes lever — could
carry a stricter N=4; per-quality thresholds are permitted (Gate A is
per-quantity), and that is itself a knob Simon may set (see §8).

### (b) Shrinkage — how far a learned prior may deviate from population

Even a promoted prior should not jump straight to its raw learned value; it is
blended toward the population prior, the blend weight rising with evidence
(EDS §25: *"as athlete data accumulates, its weight rises and the population
prior's weight falls — a standard shrinkage/Bayesian posture"*; Art 16: never
oversell unearned personalisation).

| Option | Schedule | Behaviour |
|---|---|---|
| Aggressive | Full learned value at promotion | Big day-one swing |
| **Recommended** | **Capped shrinkage: effective = pop + clamp(learned − pop, ±X%), X small at promotion (e.g. 15%) and widening with block count** | Bounded, evidence-proportional deviation |
| Cautious | Fixed heavy shrinkage toward population indefinitely | Barely moves |

**Recommendation: capped, evidence-proportional shrinkage — a learned prior may
deviate from population by at most a bounded amount that *widens as more
predictive blocks accrue*.** Reasoning: the cap makes the worst case of a
still-imperfect prior small (a 15% deviation cannot lurch a real person into
overtraining, and D14 still trims — §4.2), while the widening reward means a
genuinely well-evidenced athlete does eventually get sharply personal coaching.
This is the operational form of "become personal *as evidence accumulates*"
(Art 16) rather than all-at-once.

### (c) Which levers a learned prior may steer first — conservative subset vs full

From the §4.2 table. Not all levers need arm at once.

| Option | Armed at first go-live |
|---|---|
| Full | Deload rhythm + volume tolerance + block length + trajectory |
| **Recommended** | **Deload rhythm only** (most reversible), with **volume tolerance** as the second increment once deload-steering has a track record |
| — | Block length + trajectory deferred to a later, separately-ruled increment |

**Recommendation: arm the most reversible lever first — deload rhythm — and
only that.** Reasoning: a mis-timed deload costs at most a week and self-corrects
at the next block boundary, so it is the safest place to let the first learned
priors touch real plans and build an *audited track record* of promotion
decisions (the append-only history makes D16's own accuracy reviewable — DAAS
§5.3, AIGAS §16 discipline). Volume tolerance arms second, once deload-steering
has shown the promotion gates behave. Block length and trajectory — which commit
an athlete for longer before the referee reads the outcome — wait for a later
increment Simon rules on separately. This mirrors M3's per-quality staged arming
(a quality's estimator arms only when its anchors are signed).

### (d) The demotion rule — pulling back a learned prior that starts mispredicting

The LEARNED → STAGED transition (§2, §3).

| Option | Trigger | Effect |
|---|---|---|
| Lenient | Demote after several consecutive mispredictions | Slow to react |
| **Recommended** | **Demote on the FIRST block where the learned prior mispredicts beyond tolerance** (asymmetric with promotion's 3-block bar) | Fast off, slow on |
| Strict | Any single abstain-or-miss demotes | Jumpy |

**Recommendation: asymmetric hysteresis — slow to promote (3 predictive
blocks), fast to demote (one clear misprediction).** Reasoning: the cost of a
wrong *learned* steer on a live plan is asymmetric — under-recovery risk is a
safety cost (Art 8/9 posture: safety overrides optimisation), while losing a
correct prior for a block is only a lost optimisation. So the moment the
athlete's lived response contradicts the belief (Art 12's referee), the belief
should lose its authority immediately and the plan revert to the safe
population default; the prior returns to staged and must re-earn promotion
through the full gate. An *abstain* (§3 step 4 — the block could not test the
prior) does **not** demote; only a genuine misprediction does.

---

## 6. Additive-first and rollback (mirrors M3's discipline)

The whole policy is built so its OFF state is exactly today's behaviour, provably:

- **No learned priors ⇒ population behaviour, byte-identical.** With no
  `learnedPriors.<quantity>` written, every read resolves to the population
  default (`priors.js`) and the D7 steer is OFF (`recoveryRate == null`). A
  golden-master run over the archetype matrix must be **byte-identical** to
  pre-M5 — the same additive-first gate M3 uses (a profile with no new data
  produces a byte-identical plan). This is the acceptance test for the policy's
  neutrality.
- **A learned prior is per-athlete and demotable.** Promotion writes one
  athlete's `learnedPriors`; it touches no shared knowledge and no other
  athlete. Demotion (§ decision d) or a global reader-disable returns that
  athlete to population behaviour with **no data loss** — the `block_outcomes`
  evidence is append-only and untouched (DAAS §3.3 R1); only the *derived*
  learned prior is withdrawn. This is the M5 rollback posture verbatim
  (11 §6: *"append-only + async-readers-only means disabling readers restores
  pre-M5 behaviour without data loss; prior promotions demote by policy"*).
- **Two structurally distinct fields.** `stagedPriors` (steers nothing) and
  `learnedPriors` (steers) are separate slots; the steer reads only the latter.
  A bug in staging cannot leak into a live plan because the steer literally does
  not read the staging field.
- **Kill switch.** A single reader-disable flag (learned-prior consumption OFF)
  is the coarse rollback: flip it and every athlete reverts to population priors
  regardless of promotion state, byte-identical, instantly. Recommended to ship
  with the policy, default-ON-for-population / OFF-for-steer until Simon's
  go-live — the same default-OFF discipline as the injury-veto flag (P0-3) and
  the AI seam.

---

## 7. A worked example (recovery rate, deload rhythm)

An intermediate soccer player onboards. Recovery-rate prior = population
default; `learnedPriors` empty; D7 deload steer OFF; plan is the template
(byte-identical to any other same-profile athlete).

- **Block 1 closes.** `block_outcomes` row written. D16 stages a recovery-rate
  estimate — say it leans "recovers faster than average." Confidence low
  (one block). **Steers nothing** (staged, not learned).
- **Block 2 closes.** Estimate refined, still "faster," confidence rising. The
  staged prior *predicted* block 2's readiness rebound — Gate B would pass — but
  Gate A (N=3) is not met. **Still staged.**
- **Block 3 closes.** Third block; confidence ≥ moderate (Gate A ✓); the staged
  prior predicted block 3's rebound within tolerance (Gate B ✓). **Promotion.**
  A learned recovery-rate value is written to `learnedPriors.recoveryRate`,
  **shrunk** so it deviates from population by the capped amount (§b). D7's
  deload steer now arms **for this athlete only** — deloads fall slightly less
  often, reflecting demonstrated faster recovery. D14 still validates the result.
- **Block 5 mispredicts.** The athlete comes back from a life-stress month;
  readiness does not rebound as the learned prior predicted. **Immediate
  demotion** (§d): `learnedPriors.recoveryRate` withdrawn, deload steer OFF,
  plan reverts to the population deload rhythm. The prior returns to staged and
  must re-earn all three predictive blocks. The `block_outcomes` history is
  intact throughout.

At every step the athlete could be shown honest copy (Art 14/16): *"still
learning your recovery — plan is deliberately standard"* → *"we've learned you
recover a bit faster, so your deloads are spaced slightly wider."*

---

## 8. What this proposal does NOT decide (deferred / out of scope)

- **It builds nothing.** M5's substrate migration must be authored and
  Simon-applied first (🔒 6 → migration); only then is `block_outcomes`
  populated and this policy implementable.
- **The exact estimator maths** (the Bayesian update / shrinkage formula per
  quantity, the confidence composition) is an implementation-design follow-on,
  bounded by the thresholds Simon rules here and by DAAS §5.3's
  `outcome_signals` contract. This proposal fixes the *policy*, not the
  arithmetic.
- **Per-quantity threshold tuning** (whether recovery rate carries a stricter N
  than volume tolerance) is permitted by the design (Gate A is per-quantity) and
  recommended, but the specific per-quantity numbers are a science-review item
  once real distributions of `block_outcomes` exist — not guessable a priori.
- **The `outcome_signals` row shape is a DAAS-EXTENSION co-ratification**
  (M5 substrate §5.3, EXT-2): it must be co-ratified by EDS D16 + DAAS, not
  adopted here. This policy consumes it; it does not define it.
- **Sport/population-tier learning** (EDS §25's outer two tiers; E7
  cross-athlete aggregation) is out of scope: this policy is the
  **athlete-specific** tier only. Cross-athlete priors require
  privacy-preserving aggregation (derived-only, L13) and are a later stage.
- **AI in the D16 seam** (EDS E3 — an AI proposing prior updates) stays behind
  AIGAS and D14; nothing here opens it. D16's outputs remain capped at
  soft-input authority until the KA internal-evidence rung exists (M5 §5.3,
  Art 13).

---

### One-line ask

Rule on the four decision points in §5 (promotion threshold, shrinkage schedule,
first-armed levers, demotion rule) and confirm the §4.1 TR-05 hard rule as
binding. On those rulings, the policy is implementable — after the substrate
migration lands — with the additive-first / demotable guarantees of §6.
