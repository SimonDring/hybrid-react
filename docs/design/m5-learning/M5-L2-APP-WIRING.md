# M5-L2 — The app writes the learning loop closed: implementation design

**Status: DESIGN PROPOSAL — for Simon · 2026-07-16 (rev 2, post adversarial review) · no
production code in this doc**
**Authority: `docs/superpowers/specs/2026-07-16-m5-d16-learning-loop-design.md` §2 (M5-L2,
the paired follow-up). Executes DAAS §3 (append-only record) / §3.2 (predicted-before-observed)
/ §5.3 (outcome_signals shape, co-ratified here) against the LIVE substrate (`20260713` on
prod). M5-L1 (`promoteFromOutcomes`, the D16 policy) is on PR #191 — this build stacks on it.**

> **Rev 2 note.** An adversarial review of rev 1 caught a load-bearing error: rev 1 claimed the
> existing WP-59 `blockOutcome()` already emits `observed.recoveryRate ≈1.0 + a numeric
> confidence`. It does **not** — it returns per-quality `verdicts` (a lift/recovery *slope*) and a
> single `volumeTolerance` candidate with a *string* confidence
> (`packages/engine/src/lib/learning/blockOutcome.js:84`, `:80`). The materialisation the loop
> needs is a **new, defined derivation**, not a reuse. Rev 2 specifies it, corrects the engine-scope
> claim, and fixes three call-shape defects (demotion `opts.current`, demotion landing, confidence
> placement). The findings that were verified CORRECT (anti-circular `predicted`-omission;
> additive-first/TR-05; no RLS crossing) are retained.

---

## 0. Why this is a design, not a blind build

M5-L2 is the first thing that **writes the live production substrate on the normal app path**
and it **materialises the very evidence the whole learning loop learns from** (`observed.recoveryRate`
+ `confidence` per block). A subtly-wrong materialisation would silently feed `promoteFromOutcomes`
bad evidence — on prod, append-only. Every M5 step has been gated design-first for exactly this
reason (schema → 🔒 6 → migration; policy → 🔒 7 → M5-L1). This doc is that gate for L2. It carries
**no 🔒 coaching-philosophy decision** (the coaching policy was ruled at 🔒 7); the open questions
here are engineering + materialisation, which this proposal resolves and flags for your veto.

---

## 1. The three seams today, and the quality mismatch rev 1 missed

| Seam | Where | What it ACTUALLY emits (verified) | Fate under M5-L2 |
|---|---|---|---|
| **WP-59 staging** | `AthleteModelService.syncStagedPriors` → engine `blockOutcome()` → `model.stagedPriors` (JSONB blob, latest block only) | `{ verdicts, candidatePriors }`. `verdicts[].observed` = an **e1RM slope (kg/day)** or **recovery-trend slope (pts/day)**. `candidatePriors` = at most one **`volumeTolerance: 0.9`**, `confidence: 'low'` (a **string**). It gathers the raw logged data (recovery ratings + e1RMs over the window) — that gathering is reusable; its *output shape is not*. | **Its data-gather is reused; its output is NOT fed to the policy.** It keeps producing its human-readable `verdicts` (used for the block check-in narrative). |
| **M5 substrate** | `block_outcomes` table (live, `20260713`), append-only, owner-private | Columns: `period_start/end`, `plan_id`, `block_index`, `goal_snapshot`, `planned`, `observed jsonb`, `outcome_signals jsonb`, + `NOT NULL` provenance (`engine_version`, `knowledge_set_version`, `method_id`, `method_version`). **No `confidence` column, no `predicted` column** — those live *inside* `observed`/`outcome_signals`. | **Becomes the evidence history** `promoteFromOutcomes` reads. |
| **M5-L1 policy** | engine `promoteFromOutcomes(blockOutcomeHistory, pop, opts)` | Reads `b.observed.recoveryRate` (or flat `b.recoveryRate`) + **numeric** `b.confidence`/`b.observed.confidence` (non-number ⇒ 0) + optional `b.period_end`. Returns `{learnedPriors, staged, provenance}`. | **Consumes the deserialised window; its output lands on the model.** |

**The quality mismatch (the deeper thing rev 1 glossed).** WP-59's `blockOutcome()` proposes a
**`volumeTolerance`** candidate; the 🔒 7 policy arms **`recoveryRate`** ONLY (the sole reversible
lever this increment). They are different qualities. So M5-L2 does **not** pipe `blockOutcome`'s
candidate into the policy. It **materialises a `recoveryRate` observation** (§3, new) for the
substrate row, and `promoteFromOutcomes` learns from that. `volumeTolerance` learning stays out of
scope (🔒 7) — its candidate remains a staged, unarmed note.

---

## 2. The flow M5-L2 wires (block close → learn)

```
BlockCheckin (block close)
  │  (already gathers: sessionRecoveries[], liftLog[] over the block window)
  ▼
① MATERIALISE  deriveRecoveryObservation({ sessionRecoveries, baseline, start, end })   ← NEW pure helper (§3)
  │             → { recoveryRate: ≈1.0 | null, confidence: 0..1 }   (null/low ⇒ abstain)
  ▼
② WRITE (append-only)  SyncService.appendBlockOutcome(row)  → public.block_outcomes
  │             row = { engine_version, knowledge_set_version, method_id:'deriveRecoveryObservation',
  │                     method_version, period_start/end, plan_id, block_index, goal_snapshot,
  │                     planned, observed:{ recoveryRate, confidence }, outcome_signals:{…} }
  ▼
③ READ (bounded)  SyncService.readBlockOutcomes({ limit: 12 })  → rows, newest→oldest
  │             owner-private (auth.uid()=user_id); DESERIALISE each row into the policy shape:
  │             { period_end, observed:{ recoveryRate }, confidence }   (re-sorted oldest→newest)
  ▼
④ LEARN (pure)  promoteFromOutcomes(history, populationPrior=1, { current: { learnedPriors: model.learnedPriors } })
  │             → { learnedPriors, staged, provenance }
  ▼
⑤ LAND (both outcomes, not just promotion):
     if result.learnedPriors.recoveryRate present  → model.learnedPriors.recoveryRate = it   (source:'learned')
     else if model.learnedPriors.recoveryRate.source === 'learned'  → RESET to population default   (demotion — §5)
     model.stagedPriors    = result.staged        (distinct field; the D7 steer never reads it)
     model.priorProvenance = result.provenance
     → SyncService.updateProfile({ athlete_model })
```

The engine (④) stays pure — handed an in-memory history array; it never touches the DB. Steps
①②③⑤ are the impure L3/L4 band (AthleteModelService + SyncService), where DAAS §3 says the
substrate is written/read. Step ① is a **pure engine helper** with no I/O (see §6 scope note).

---

## 3. The row materialisation (① — the load-bearing decision, now specified)

This is the part that most deserves your eyes, because it defines what the loop learns from. Rev 1
hand-waved it as "reuse blockOutcome"; that was wrong. Here is the actual derivation.

**`observed.recoveryRate`** — the block's realised recovery signal, normalised so **≈1.0 = this
athlete recovered in line with their own norm**, **>1.0 = recovered faster** (tolerated the load),
**<1.0 = recovered worse** (under-recovered). It is a *relative* signal (Art 13 — it measures this
athlete vs their own baseline, never an absolute physiological claim):

```
recoveryRate = clamp( meanBlockRecovery / rollingBaselineRecovery , 0.7 , 1.3 )
```
- `meanBlockRecovery` = mean of the athlete's own 1–5 session-recovery ratings *inside the block
  window* (the same ratings WP-59 already gathers).
- `rollingBaselineRecovery` = mean of that athlete's recovery ratings over a trailing baseline
  (proposed: the prior ~8 weeks, or all history if shorter) — their personal norm.
- The `[0.7, 1.3]` clamp bounds a single block's authority (Art 16 — never oversell); it sits
  *outside* the policy's own ≤15–30% shrinkage, which is applied later against the population prior.
- This mapping is co-ratified into **DAAS §5.3** as the canonical `recoveryRate` materialisation
  (this doc proposes it; the DAAS owns it — no silent divergence).

**Abstain** — if the window has too few rated sessions to form a stable ratio (proposed floor:
**< 3 rated sessions in-block**, or no baseline yet), `recoveryRate = null`. The policy treats null
as *abstain* — it never promotes, never demotes (`observedOf` → null ⇒ the block can't test the
prior). Honest under-evidence (Art 15: recorded, not hidden).

**`observed.confidence`** — the composed **numeric** 0..1 confidence of THIS block's signal
(DAAS §5.3), placed **inside `observed`** so the policy's `confidenceOf` reads it (it reads
`b.confidence` or `b.observed.confidence` — **never** `outcome_signals`; storing confidence only in
`outcome_signals` would make the policy see 0 and never clear Gate A). Proposed:
```
confidence = clamp( 0.35 + 0.1·(ratedSessions − 3) , 0 , 0.9 )  , boosted +0.1 if an in-block
             e1RM slope corroborates the recovery direction (both up, or both down).
```
So a 3-rated-session block sits at ~0.35 (below Gate A's 0.5 floor — it stages, doesn't promote);
corroborated blocks with more sessions cross 0.5. Below the policy's `blockInterpretFloor` (0.15)
the block abstains outright.

**`predicted` — omitted at write time (verified anti-circular, retained from rev 1).** The policy
derives each block's prediction from the running staged estimate over *strictly-earlier* blocks
(`runningEstimate(upToExclusive)` over `observedSignals.slice(0, i)`). Stamping a prediction into
the row would duplicate that and risk circularity. **Decision: do not stamp `predicted`.**

**`outcome_signals`** — carries the human-auditable detail (the WP-59 `verdicts`, the rated-session
count, the baseline used, the raw mean) for explainability (Art 14) and future re-derivation. It is
NOT the policy input path — `observed` is.

**Provenance columns (all `NOT NULL`, must be supplied or the insert is rejected):**
`engine_version`, `knowledge_set_version`, `method_id: 'deriveRecoveryObservation'`,
`method_version` — the derived-data doctrine (DAAS §3.2/§3.3): dated append-only evidence, stamped
with what produced it, never re-served as current.

---

## 4. The bounded read (③)

- **Window:** most-recent **N = 12** rows, `order by created_at desc limit 12`, re-sorted
  oldest→newest and **deserialised into the policy shape** `{ period_end, observed:{recoveryRate},
  confidence }` before the policy (TR-03: no unbounded `select('*')`). Superseding rows
  (`supersedes_id`) collapse to the superseder.
- **Owner-private:** the read is `auth.uid() = user_id` (the table's RLS, migration §1 loop
  policies). No cross-user path; coaches never read this table — there is **no coach policy** on
  `block_outcomes` (raw crossing forbidden, Art 11 / TEAM-ARCHITECTURE). The RLS harness proves the
  owner-only P-set.
- **Offline:** if the substrate read fails (offline), the loop **abstains this pass** — it does NOT
  fall back to the stale `model.stagedPriors` blob as evidence (that would double-count). The prior
  already on the model stays as-is. Fire-and-forget, like `syncInjuryHistory`.

---

## 5. The landing (⑤) — demotion is a first-class outcome (fixes the safety hole)

- `promoteFromOutcomes` is the **only** writer of `model.learnedPriors.recoveryRate`, and only on
  promotion (source:'learned').
- **Demotion must be landed, not dropped.** When `result.learnedPriors.recoveryRate` is **absent**
  AND `model.learnedPriors.recoveryRate.source === 'learned'` (a learned prior previously existed),
  the app **resets** `model.learnedPriors.recoveryRate` to the schema default
  `{ value: 1, source: 'population', confidence: 'low' }`. Rev 1's "write only on promotion" left a
  mispredicted prior **still steering deloads** (`PlanGenerator.js:213` reads
  `source==='learned' && value!=null`) — a real dosing-safety hole. Rev 2 closes it.
- `.staged` lands on `model.stagedPriors` (the structurally-distinct field the steer never reads).
- **`opts.current` shape:** pass `{ current: { learnedPriors: model.learnedPriors } }`. The policy's
  `wasLearned` accepts `{ learnedPriors: { recoveryRate } }` — passing `model.learnedPriors`
  directly (rev 1) has `.recoveryRate` at the top and no `.learnedPriors`, so `wasLearned` is always
  false and demotion never fires. Fixed.
- `model.priorProvenance` records the three-tier stamp (EDS §25) for explainability (Art 14): the
  UI can say *why* a prior is or isn't live.

**Additive-first (verified CORRECT by review, retained): zero rows ⇒ population plan, byte-identical.**
Empty history ⇒ `promoteFromOutcomes` returns `learnedPriors:{}` ⇒ §2 ⑤ writes nothing new ⇒
`model.learnedPriors.recoveryRate` stays the schema default `source:'population'` ⇒ the M5-L1
source-gate (`PlanGenerator.js:213`) resolves the steer to null ⇒ population rhythm, byte-identical.
This holds **only with the §5 demotion reset in place** (else a stale learned value survives).

**Test obligations (green before the L2 PR):**
1. `prop-additive-identity` — engine unchanged on the plan path.
2. App test: an athlete with **zero** `block_outcomes` rows → `learnedPriors.recoveryRate.source
   === 'population'` → plan byte-identical to pre-L2.
3. Loop test (synthetic history): 3 predictive blocks → promotion → `source:'learned'` lands → next
   plan pass arms the D7 steer; a 4th mispredicting block → **demotion → reset → steer off**
   (exercises the §5 reset + the `opts.current` shape).
4. `deriveRecoveryObservation` unit tests: the ≈1.0 normalisation, the `[0.7,1.3]` clamp, the <3
   abstain, the numeric confidence + corroboration boost.
5. `appendBlockOutcome` is **insert-only** (never `update`/`delete` from the app) — SyncService unit
   test; enforced at rest by the `block_outcomes_no_update` trigger (migration §1 loop — this is the
   append-only guard for block_outcomes; the "C1" label denotes the *squad_signal_snapshots*
   triggers, not this one). The insert must supply all four `NOT NULL` version columns.

---

## 6. What M5-L2 touches (change surface, corrected)

- `packages/engine/src/lib/learning/deriveRecoveryObservation.js` — **NEW pure helper** (§3):
  `({ sessionRecoveries, baselineRecoveries, liftLog, startISO, endISO }) → { recoveryRate, confidence }`.
  Pure math, no clock/IO. **No plan-path caller ⇒ all goldens byte-identical** (the additive-first
  law holds; nothing in `generatePlan` calls it). Exported from the engine index.
  *(Rev 1 wrongly said "engine untouched." Materialising `recoveryRate` is a real, if small, engine
  addition — it belongs with the learning module and must be golden/unit-testable. It does not touch
  the plan path, so it changes no existing plan.)*
- `apps/mobile/src/lib/SyncService.js` — **new** `appendBlockOutcome(row)` (insert-only, `clean()`
  attaches `user_id`) + `readBlockOutcomes({limit})` (bounded owner select). No schema change.
- `apps/mobile/src/lib/AthleteModelService.js` — evolve `syncStagedPriors` → `learnFromBlockClose`:
  gather (reuse) → `deriveRecoveryObservation` → `appendBlockOutcome` → `readBlockOutcomes` →
  `promoteFromOutcomes` → land per §5. Keep `blockOutcome()`'s `verdicts` for the check-in narrative.
  Keep a change-driven write guard (no churn).
- `apps/mobile/src/screens/BlockCheckin.jsx` — call-site rename only (same trigger, same args).
- Tests — the five obligations in §5.

**No migration. No frozen-doc edit.** One DAAS §5.3 co-ratification (the `recoveryRate`
materialisation mapping) — an Appendix-B-style living addition, not a frozen edit. One additive pure
engine helper (no plan-path effect).

---

## 7. Open decisions flagged for Simon (engineering, not 🔒)

1. **`observed.recoveryRate` mapping (§3).** Proposed: `mean-block-recovery / rolling-baseline`,
   clamped `[0.7,1.3]`, abstain < 3 rated sessions. *Alternative:* fold in ACWR rebound — deferred,
   because ACWR is a demoted soft input (project memory: ACWR calibration gate) and would import its
   cold-start false-flagging into learning. **Recommend the rating-ratio mapping; hold ACWR out.**
2. **Baseline window for the ratio (§3).** Proposed: trailing ~8 weeks (all history if shorter).
   Cheap to change.
3. **Read window N = 12 (§4)** and **confidence curve (§3).** Recommended defaults; one constant each.
4. **`model.stagedPriors` supersession (§1).** Recommend evolving WP-59's writer in place (reuse its
   gather; land the policy's `.staged`) rather than leaving a second dormant staging path.

None of these change an existing athlete's plan today (all gated behind an *earned* promotion, which
requires ≥3 real blocks of genuine recovery evidence). The first behaviour change for any real
athlete is a promotion, which by construction only happens after the loop has genuinely learned.

---

## 8. Out of scope

Volume-tolerance / block-length learning (deload-rhythm only this increment — 🔒 7); team-trend
surfaces + AI go-live (later M5 / Phase 4); the M6 governance sweep; any UI that *renders* the
provenance (the field is written; surfacing it is a later polish item).
