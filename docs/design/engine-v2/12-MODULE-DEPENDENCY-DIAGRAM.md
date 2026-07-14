# Decision Engine V2 — Module Dependency Diagram

**Status: PROPOSAL — working doc (T4) · 2026-07-14 · not canonical; adopted only via DEVELOPMENT-PLAN §5.3**
**Sprint spec: [`docs/superpowers/specs/2026-07-14-decision-engine-v2-design.md`](../../superpowers/specs/2026-07-14-decision-engine-v2-design.md)**

---

Two diagrams close the migration set: **diagram 1** is the V2 module graph —
every node is a module from
[`10-MIGRATION-ARCHITECTURE.md`](10-MIGRATION-ARCHITECTURE.md) §2.2's table,
under the same ID, and edges are typed dependencies (who consumes whose
output); **diagram 2** is the migration dependency spine — the phases
M0–M6 of [`11-MIGRATION-PHASES.md`](11-MIGRATION-PHASES.md) with their gate
dependencies (audit 10 §4, M-numbered). Both are design artefacts,
non-normative: the ratified graph is EDS §20/§21's; the TAS layer
definitions govern; the whole-set consistency pass (Task 15) re-verifies
that diagram 1's node set and 10 §2.2's module table stay identical.

## Legend

| Mark | Meaning |
|---|---|
| `-->` solid edge | In-pass typed dependency: the consumer reads the producer's `{value, confidence, rationale}` artefact inside the same pass (TAS §5.3) |
| `-.->` dashed edge | Trace/report flow: decision trace and validation report feeding the explanation read-model (Constitution Art 14) — read-only, decides nothing |
| `==>` thick edge | Forward-only, next-pass or async flow: priors and insights enter the **next** planning pass; never backward into a committed plan (EDS §21) |
| `[[...]]` node | Substrate/read-model (knowledge, history, explanation) — consumed by decisions, owns none |
| **LANDED** | Phase executed before this set (M1 — Wave A via DEVELOPMENT-PLAN Phase 0, PRs #173/#174) |
| 🔒 n | Simon decision point (11 §8.3 ledger) gating that phase |

Module IDs (diagram 1) are 10 §2.2's; stage IDs are the ratified D1–D17
(02 §1.1); phase IDs (diagram 2) are 11 §0.1's.

## Diagram 1 — the V2 module graph

```mermaid
flowchart TB
  subgraph KNOW["Knowledge rank — versioned, evidence-tagged data (KA §4 domains)"]
    MKNOW[["M-KNOW · Knowledge registries<br/>(SKB · qualities · exercises · dose ·<br/>constraint · injury · stage rules · analysis)"]]
  end

  subgraph CORE["Planning pass — pure, deterministic (D1→D14)"]
    MATH["M-ATH · Athlete model (D1)"]
    MDEM["M-DEM · Demand (D2/D3)"]
    MDIAG["M-DIAG · Diagnosis (D4/D5)"]
    MSTRAT["M-STRAT · Strategy (D6)"]
    MPERIOD["M-PERIOD · Periodisation (D7/D8)"]
    MCONSTR["M-CONSTR · Constraint engine<br/>(the one resolved artefact — 02 §4 R4)"]
    MSESS["M-SESS · Session builder (D9/D10/D11)<br/>the ONE selection engine (C7)"]
    MDOSE["M-DOSE · Dose (D12)"]
    MSCHED["M-SCHED · Scheduler (D13)"]
    MVAL["M-VAL · Validation (D14)<br/>suite + conflict-order pass (02 §3)"]

    MATH --> MDEM --> MDIAG --> MSTRAT --> MPERIOD --> MSESS
    MATH -- "athlete constraints" --> MCONSTR
    MSTRAT -- "strategy bounds" --> MCONSTR
    MPERIOD -- "spacing + sport calendar" --> MCONSTR
    MCONSTR -- "the box, before construction" --> MSESS
    MCONSTR --> MDOSE
    MCONSTR --> MSCHED
    MCONSTR -- "re-check" --> MVAL
    MSESS --> MDOSE --> MSCHED --> MVAL
  end

  MEXPL[["M-EXPL · Explanation read-model (08)<br/>the trace, rendered at prescription (C6)"]]
  MATH -.-> MEXPL
  MDIAG -.-> MEXPL
  MSESS -.-> MEXPL
  MDOSE -.-> MEXPL
  MSCHED -.-> MEXPL
  MVAL -. "validation report" .-> MEXPL

  MRT["M-RT · Runtime projection (D15)<br/>re-runs D9–D14 over pending work;<br/>freeze-on-start absolute"]
  MVAL -- "immutable plan + trace" --> MRT

  subgraph ASYNC["Async band — off the planning path (EDS §21)"]
    MANLYS["M-ANLYS · Analysis (D17 family)<br/>insights: attributed, tiered"]
    MLEARN["M-LEARN · Learning (D16)<br/>writes priors only"]
    MANLYS == "insights as evidence" ==> MLEARN
  end

  MHIST[["M-HIST · History substrate<br/>(append-only record — DAAS §3, designate)"]]
  MORCH["M-ORCH · Orchestration (L3, thin/impure)<br/>fetch state · pin versions · invoke · persist"]

  MKNOW --> CORE
  MKNOW --> MANLYS
  MORCH --> CORE
  MORCH -- "persist outcomes/state" --> MHIST
  MHIST --> MANLYS
  MHIST --> MLEARN
  MANLYS == "typed runtime inputs" ==> MRT
  MANLYS == "insights → D1/D4, next pass" ==> MATH
  MLEARN == "priors → D1·D4·D7·D12, next pass" ==> MATH
```

Reading notes (load-bearing, from the owners):

- **The knowledge rank feeds stages; no stage contains knowledge**
  (Constitution Art 17; C3 — M6 completes the closure).
- **The constraint envelope feeds construction**: M-CONSTR composes
  D1/D6/D8 outputs into one typed artefact consumed by D9–D13 and
  re-checked by D14 — an artefact, not a pass; no edge of the ratified
  graph is rewired (02 §4 R4; EDS §36).
- **Trace feeds explain**: M-EXPL is a projection over the decision trace
  and validation report — it renders, never reasons (TAS §5.10).
- **Next-pass edges are drawn to M-ATH** as the graph root: priors reach
  D1/D4/D7/D12 and insights reach D1/D4 as *inputs to the next planning
  pass* (02 §1.2) — the diagram routes them through the pass boundary, not
  into mid-pass stages.
- **M-HIST is consumed, never owned**: the longitudinal record is the
  DAAS's territory *(designate, in review)*; M-ORCH writes it from the
  impure layer, the async band reads it (Art 22; DAAS §3).

## Diagram 2 — the migration dependency spine (M0–M6)

```mermaid
flowchart LR
  GATE["DEVELOPMENT-PLAN §5.3<br/>Simon ratifies this set as the blueprint<br/>(no M-phase starts before it)"]

  M1["M1 · Defects & safety (Wave A)<br/>LANDED — PRs #173/#174<br/>the baseline every phase measures against"]
  M0["M0 · The test net<br/>archetype matrix (TR-05) ·<br/>expected-delta notes (TR-01) ·<br/>engine-own suite (TR-11)"]
  M2["M2 · Progression + ONE selection engine<br/>(Wave B) 🔒1<br/>M2a progression → M2b fill DELETED"]
  M3["M3 · Measured diagnosis (Wave C) 🔒2·3<br/>additive-first: no new data ⇒ byte-identical"]
  M4["M4 · Validation disposes (Wave D)<br/>suite + ladder + report rendered ·<br/>coach override proves the seam"]
  M5["M5 · Substrate & learning (Wave E) 🔒6·7<br/>built against DAAS §3 (designate)"]
  M6["M6 · Structure & breadth (Wave F) 🔒8·9·10<br/>allocator re-seat, byte-identity per extraction"]
  P4["Phase 4 (DEVELOPMENT-PLAN §7):<br/>Team analytics · AI go-live · Stage 7"]

  GATE --> M0
  M1 --> M0
  M1 --> M2
  M1 --> M3
  M0 -- "the net precedes the change" --> M2
  M0 --> M3
  M0 --> M4
  M3 --> M4
  M2 -- "behaviour settles before the re-seat" --> M6
  M4 --> M6
  M4 --> M5
  M5 --> P4
```

Reading notes:

- **M1 is history**: it appears as the landed baseline (Wave A executed as
  DEVELOPMENT-PLAN Phase 0 Track A), not as plannable work; its residuals
  (P1-10, P1-6 🔒4, the 🔒5 flag flip) travel alongside without blocking
  any edge (11 §2).
- **The three sequencing rules** the edges encode (11 §8.1): the net
  precedes the change (M0 → M2/M3/M4); never re-seat and change behaviour
  at once (M2 → M6, with M4's suite as the independent floor under the
  re-seat); one substrate unlocks three ambitions (M5 → Phase 4's Team
  analytics, AI go-live, Stage 7 — G13/G18/G21 as one design).
- **Gates on the nodes** are 11's per-phase entry/exit gates;
  `13-VALIDATION-STRATEGY.md` attaches its per-module test obligations to
  these same phase IDs.
