# Technical Architecture Specification (TAS)

> **The definitive technical blueprint for the platform.**
> This document describes *how software must be architected* so that it faithfully
> implements the coaching philosophy and decision architecture defined in the four
> governing documents. It is the technical tier: every future engineering decision —
> every module, service, schema, API, and AI integration — is validated against it.

---

| | |
|---|---|
| **Status** | v1.0 — governing technical blueprint |
| **Authority** | Subordinate to the four governing documents: the [Constitution](../foundation/CONSTITUTION.md), the [EDS](../engine/00-ENGINE-DESIGN-SPECIFICATION.md), the [Decision Ontology](../foundation/DECISION-ONTOLOGY.md), and the [Knowledge Architecture](../foundation/KNOWLEDGE-ARCHITECTURE.md). The canonical home for *how the software is shaped*. **Where this document conflicts with a governing document, the governing document wins and this one is corrected.** |
| **Scope** | The whole platform: engine, knowledge, orchestration, identity/teams, persistence, wearables, learning, AI, and the player/coach surfaces. |
| **Implementation-independence** | The body names no framework. It defines layers, contracts, and boundaries that remain valid if the frontend, backend, database, or AI stack changes. A single [Current Realization appendix](#appendix-a--current-realization) maps the abstractions to today's stack. |
| **Traceability** | Every architectural decision traces to a governing-document clause. The mapping is [Appendix B](#appendix-b--traceability-matrix). A decision with no trace does not belong here. |

---

## How to read this document

- **§1–§3** — why the architecture is shaped as it is: the risk register (the gate),
  the philosophy, and the layered model that challenges the brief's flat module list.
- **§4** — the module catalogue: every layer and module under a fixed template.
- **§5** — the Decision Engine in depth (the most important section).
- **§6–§11** — the cross-cutting architectures: knowledge flow, data lifecycle,
  configuration, learning, explainability, extensibility.
- **§12–§15** — testing, observability, future AI, security & privacy.
- **§16** — the critical review through four expert lenses, with revisions folded back.
- **Appendices** — the current-stack realization and the traceability matrix.

A reader in a hurry should read **§3 (the layered architecture)** and **§5 (the
Decision Engine)**. Everything else serves those two.

---

# 1. Technical risk register (the gate)

Before any architecture is proposed, the technical risks and gaps the governing
documents leave open are recorded here. The rest of the TAS is the resolution of this
register; each risk closes against a section.

### 1.1 Missing technical assumptions

| # | Gap | Resolved in |
|---|---|---|
| **T1** | **Engine execution location undecided.** The EDS mandates a pure library but never says *where* it runs (client / server / both). Determines reuse by the coach surface and AI. | §4.1 (isomorphic engine), §6 |
| **T2** | **"Plan is derived, never stored" assumes cheap, online recompute.** At team scale that is N recomputes per coach view. *Cache* vs *store-as-truth* is never distinguished. | §4.3, §7, §12 |
| **T3** | **Reproducibility has no version-pinning.** Explainability + audit require binding a recommendation to the `engine-version × knowledge-version` that produced it. | §6.10, §9, §13 |
| **T4** | **Portable athlete state is assumed but unbuilt.** Learned priors and committed freezes are device-local today (EDS W3). | §4.4 (persistence), §7 |
| **T5** | **Knowledge delivery is unspecified.** Knowledge payloads are large; bundling bloats the offline client, fetching breaks the synchronous pure pass. | §4.2, §6 |

### 1.2 Architectural & coupling risks

| # | Risk | Resolved in |
|---|---|---|
| **T6** | **Contracts are aspirational** — without runtime-validated boundaries the decision graph degrades into an implicit pipeline (EDS C2.2). | §5.3 |
| **T7** | **Engine coupled to storage + UI** — reached only via an adapter after a sync DB read, with mutable module-level runtime state in the view store (EDS W1/A5/W4). | §4.1, §4.3 |
| **T8** | **Two surfaces, two implementations** — the coach web app re-derives readiness/verdicts in its own code; drift is guaranteed. | §4.1, §4.6 |
| **T9** | **AI threatens the synchronous deterministic core** — AI is remote, slow, non-deterministic; it cannot sit inline in the pure pass. | §5.13, §14 |
| **T10** | **Duplicated planning logic** — generator and reflow re-derive the same math with no parity test (EDS W2). | §4.1, §5.1 |

### 1.3 Scalability risks

| # | Risk | Resolved in |
|---|---|---|
| **T11** | **Recompute-on-read at team/org scale** needs a derived-artifact cache + a materialized coach surface. | §4.3, §4.4, §7 |
| **T12** | **Population learning has no pipeline** and must never sit on the request path. | §4.5, §10 |
| **T13** | **Wearable ingestion** won't scale as synchronous polling; needs a queued anti-corruption layer. | §4.4 (integration), §7 |

### 1.4 Knowledge leakage (knowledge in code / UI / duplicated)

| # | Leak | Resolved in |
|---|---|---|
| **T14** | Coach web app re-derives coaching signals (a second copy). | §4.6, §6 |
| **T15** | Legacy sport emphasis vectors duplicate the SKB (EDS A8). | §6, Appendix A |
| **T16** | Thresholds/landmarks as code literals — Knowledge leaking into Decision Logic. | §5.2, §6, §9 |
| **T17** | UI re-deriving "why"/numbers instead of rendering the engine's emitted rationale. | §11 |

### 1.5 Decision leakage (coaching decided outside the engine)

| # | Leak | Resolved in |
|---|---|---|
| **T18** | Readiness/load/deload computed in the view store (EDS A5). | §4.1, §4.3 |
| **T19** | The coach-visible roll-up computed **client-side, across a trust boundary** — decision *and* privacy leakage. | §4.4, §15 |
| **T20** | The coach surface computes its own statuses/recommendations — coach decisions made outside the engine. | §4.6, §5 |

### 1.6 Unclear boundaries the TAS must draw

| # | Boundary | Resolved in |
|---|---|---|
| **T21** | The engine's **public API** is undefined ("typed calls in/out" — but which calls?). | §5.0, §4.1 |
| **T22** | **Explainability's nature** — a read-model over the decision trace, not a re-explainer. | §11 |
| **T23** | **The orchestration layer's role** — pure orchestration, zero coaching logic, zero mutable state. | §4.3 |

> These twenty risks are the brief's "do not continue until documented" gate. The
> architecture below exists to close every one of them.

---

# 2. Architectural philosophy

Restated from the governing documents, because the whole architecture follows from it:

> **The software implements coaching decisions; it does not contain coaching
> philosophy.** Philosophy lives in the [Constitution](../foundation/CONSTITUTION.md).
> Knowledge lives in versioned [knowledge repositories](../foundation/KNOWLEDGE-ARCHITECTURE.md).
> The engine consumes knowledge and produces decisions. Surfaces expose reasoning.
> Everything remains modular.

The corollaries that drive every decision below:

1. **One engine, many surfaces.** A player is an athlete; a coach gets a derived,
   privacy-bounded view; an AI substitutes a decision behind a contract. There is
   never a second reasoning system (Constitution Art 18; EDS R9).
2. **Knowledge is data, not code** (Constitution Art 17). Adding a sport, exercise, or
   philosophy is a data change.
3. **The reasoning core is pure and deterministic** (Constitution Art 18). Everything
   impure — I/O, clock, AI, persistence — lives *around* it.
4. **Construction proposes; validation disposes** (Constitution Art 19). A separable
   safety layer gates every output, including a future AI's.
5. **Explainability is first-class** (Constitution Art 14). The decision trace is the
   product surface *and* the debugging surface.
6. **The human is the final authority** (Constitution Art 10). Every decision is
   overridable at its contract boundary.
7. **Privacy is a trust boundary** (Constitution Art 11). Raw vitals never cross a
   person boundary; the roll-up that does is computed in a trusted context.

## 2.1 Core design tenets (the challenge questions)

Every proposed component in this document was put to the governing-document test:

> *Does this belong here? Can it become configuration? Can it become knowledge? Can it
> become a reusable service? Can it become metadata? Can it become inference instead of
> hard-coded logic?*

The most consequential result of applying that test is §3: **most of the brief's
proposed "engines" are not engines.**

---

# 3. The layered architecture

## 3.1 The central challenge: there is ONE engine, not many

The brief proposes ~35 flat modules including an *Assessment Engine, Decision Engine,
Planning Engine, Programme Generator, Validation Engine, Recovery Engine, Readiness
Engine, Recommendation Engine.* **The TAS rejects splitting these into separate
deployable services**, because doing so violates the governing documents:

- It would **fragment the pure, deterministic core across network boundaries** —
  forfeiting determinism, golden-master testability, and synchronous reasoning
  (Constitution Art 18; EDS G1, SA4).
- It would **reintroduce the duplication the EDS exists to remove** (W2: the same math
  in two runtimes). "Assessment," "Planning," "Validation," "Recovery," "Readiness,"
  and "Recommendation" are **decisions D1–D16 *within* the one engine** (EDS §20), not
  engines. They share a decision graph; separating them breaks the graph.
- "Exercise Library / Sport Library / Evidence Library" are **knowledge domains**
  ([Knowledge Architecture §4](../foundation/KNOWLEDGE-ARCHITECTURE.md)), not engines —
  data the one engine reads.

What *are* genuine separate modules: things with a different **runtime, trust
boundary, lifecycle, or scaling profile** from the pure synchronous engine — identity,
membership, persistence, wearable ingestion, learning pipelines, the surfaces, and the
cross-cutting concerns. The architecture is therefore organised by **those** seams.

## 3.2 The six layers + cross-cutting concerns

```
 ┌─ L0 · GOVERNANCE (documents, not code) ───────────────────────────────────────────────┐
 │  Constitution · EDS · Decision Ontology · Knowledge Architecture · (this TAS)          │
 │  All code is validated against these. They change rarely and deliberately.             │
 └───────────────────────────────────────────────────────────────────────────────────────┘
        ▲ validated against
 ┌─ L1 · THE ENGINE (pure, isomorphic library) ──────────────────────────────────────────┐
 │  orchestrator → decision graph D1–D16 (pure fns) → validator suite → explain read-model│
 │  contracts (runtime-validated boundaries). NO I/O · NO clock · NO state · NO knowledge  │
 │  inside it. Same inputs ⇒ identical output. Runs on client AND server.                  │
 └───────────────────────────────────────────────────────────────────────────────────────┘
        │ reads ▼                                                  ▲ injected by L3
 ┌─ L2 · KNOWLEDGE (versioned data + schemas + registries + validators) ──────────────────┐
 │  12 domains: Sport(SKB) · Quality&Adaptation · Movement · Exercise · Programming ·      │
 │  Recovery/Fatigue/Load · Constraint · Injury · Evidence&Confidence · Validation ·       │
 │  Learning · Athlete. Each: schema + registry + validate-on-load + version + provenance. │
 └───────────────────────────────────────────────────────────────────────────────────────┘
        ▲ invoked / fed by
 ┌─ L3 · ORCHESTRATION (the adapter layer — stateful, impure) ────────────────────────────┐
 │  Fetch athlete state + pin knowledge/engine versions → invoke L1 → cache derived        │
 │  artifacts → persist state/outcomes/priors/freezes → run AI substitution OFF the        │
 │  critical path → emit decision traces. Holds ZERO coaching logic, ZERO mutable globals. │
 └───────────────────────────────────────────────────────────────────────────────────────┘
        ▲ uses                                   ▲ uses
 ┌─ L4 · PLATFORM SERVICES ──────────────┐  ┌─ L5 · LEARNING & RESEARCH (off request path)─┐
 │  Identity & Auth · Membership & Access │  │  Athlete Learning · Population Learning      │
 │  (Org/Team/Athlete) · API Gateway ·    │  │  (privacy-preserving) · Experimentation ·    │
 │  Persistence & Sync · Wearable         │  │  Model Training · Analytics. Writes PRIORS   │
 │  Integration (ACL) · Notifications ·   │  │  the engine READS; never mutates plans.      │
 │  Calendar/Reminders · Audit Log        │  └──────────────────────────────────────────────┘
 └────────────────────────────────────────┘
        ▲ consumes (L1+L2+L3)
 ┌─ L6 · EXPERIENCE (surfaces) ──────────────────────────────────────────────────────────┐
 │  Player app · Coach dashboard · future native. Render engine outputs + explanations.    │
 │  Compute NO coaching. BOTH consume the SAME L1 engine + L2 knowledge (no re-derivation). │
 └───────────────────────────────────────────────────────────────────────────────────────┘

 CROSS-CUTTING CONCERNS (present in every layer, owned by none):
   Explainability · Observability/Decision-tracing · Audit · Configuration ·
   Versioning & Reproducibility · Security & the raw-vitals privacy boundary
```

## 3.3 Why this shape (and what it rejects)

| Decision | Rationale | Rejected alternative |
|---|---|---|
| One pure engine, decisions inside it | Determinism, one source of truth, no network in reasoning (Const. Art 18) | Microservice-per-decision (fragments the pure core) |
| Engine isomorphic (client + server) | Coach view, AI, and offline player all reuse one engine (T1, T8) | Client-only engine (no reuse) / server-only (breaks offline) |
| Knowledge a separate versioned package | Data, not code; reviewed by scientists; one source (Const. Art 17) | Knowledge bundled into engine code (T15, T16) |
| Orchestration as a thin impure layer | Keeps the engine pure; all I/O/AI/cache here (T7, T9, T23) | Logic in the view store / in the engine (decision leakage) |
| Learning off the request path | Determinism + scale; priors-only channel (Const. Arts 16, 18; T12) | Inline learning (mutates behaviour unpredictably) |
| Surfaces compute no coaching | Eliminates the two-implementation drift (T8, T14, T20) | Per-surface re-derivation (current web app) |

---

# 4. Module catalogue

Each module is defined under a fixed template: **Purpose · Responsibilities · Inputs ·
Outputs · Dependencies · Consumers · Ownership · Configuration · Versioning · Failure
modes · Testing · Observability · Extensibility.** Where a field is identical across a
layer it is stated once for the layer.

## 4.1 L1 — The Engine (`engine`)

- **Purpose.** Turn athlete state + knowledge into coaching decisions and the artefacts
  rendered from them (plan, adapted week, derived signals, explanations), purely and
  deterministically. The platform's crown jewel.
- **Responsibilities.** Run the decision graph (D1–D16, §5); enforce decision
  contracts; run the validator suite; assemble the explainability read-model; expose a
  small, stable **public API**. *Compute the derived signals (readiness, load) that the
  view store wrongly computes today (T18).*
- **Public API (the platform's most important boundary, T21).** A minimal, typed,
  synchronous surface:
  - `plan(athleteState, knowledge, priors) → Plan` — full deterministic planning pass.
  - `reflow(plan, liveState, knowledge, priors) → AdaptedWeek` — pure runtime
    projection over pending work (D15), eliminating the duplicate-logic risk (T10).
  - `deriveReadiness(athleteState, knowledge) → Readiness` and `deriveLoad(...) → Load`
    — the derived signals, computed *in the engine* (closes T18).
  - `validate(constructedWeek, athleteState, knowledge) → ValidationReport`.
  - `explain(decisionTrace, query) → Explanation` — the read-model (§11).
  - `rollUp(athleteState, knowledge) → CoachVisibleStatus` — the *derived* coach signal
    (no raw vitals), so the boundary-crossing computation is engine logic, not
    re-derived per surface (closes T8, T14, T20); executed server-side (closes T19).
  Every call is pure: state and knowledge in, result out. No call performs I/O.
- **Inputs.** `AthleteState`, a pinned `KnowledgeSet`, `Priors`. (All injected by L3 —
  the engine never fetches.)
- **Outputs.** Typed artefacts, each carrying a **decision trace** (rationale +
  confidence per decision) and a **provenance stamp** (`engineVersion ×
  knowledgeSetVersion`), closing the reproducibility gap (T3).
- **Dependencies.** L2 knowledge (read-only, injected). Nothing else — no storage, no
  network, no clock, no UI (closes T7).
- **Consumers.** L3 orchestration (the only direct caller); transitively every surface
  and the AI layer.
- **Ownership.** Engine team + sports scientists (decision logic ↔ knowledge split).
- **Configuration.** None at runtime beyond the injected knowledge + priors. The engine
  has no feature flags that change reasoning (that would be hidden configuration —
  §9).
- **Versioning.** Semantic; every output stamped with the engine version. Behaviour
  changes are golden-master-gated.
- **Failure modes.** Missing inputs ⇒ degrade conservatively (Const. Art 13), never
  throw a blank plan (EDS L14). A contract violation ⇒ fail fast in dev, fall back to
  the last valid decision in prod, and record it. Never silently ship.
- **Testing.** Golden-master across an archetype matrix; per-decision unit tests;
  property tests for purity/determinism; CI-enforced determinism (§12).
- **Observability.** Emits a structured decision trace per run (the observability +
  explainability substrate are the same data, §11/§13).
- **Extensibility.** New reasoning = a new decision honouring the contract; new content
  = L2 data. The graph shape is stable (§5).

## 4.2 L2 — Knowledge (`knowledge`)

- **Purpose.** Hold all evidence-tagged domain knowledge as versioned data the engine
  reasons from (Const. Art 17; the whole [Knowledge Architecture](../foundation/KNOWLEDGE-ARCHITECTURE.md)).
- **Responsibilities.** Own the 12 domains; provide registries (id → object);
  validate-on-load (structure, provenance, invariants, privacy); version each domain
  and the composed `KnowledgeSet`.
- **Inputs.** Authored data (JSON/declarative); schemas.
- **Outputs.** A validated, versioned `KnowledgeSet` the engine reads.
- **Dependencies.** None (pure data + validators). Independent of the engine.
- **Consumers.** The engine (read-only). The AI layer (as grounding). The research
  layer (as the corpus).
- **Ownership.** Sports scientists / domain specialists; engineers own the schemas.
- **Configuration.** N/A — knowledge *is* the configuration of coaching content.
- **Versioning.** Per-entry `lastReviewed` + per-domain schema version + a composed
  `KnowledgeSet` version. A plan pins the version it used (T3).
- **Failure modes.** A malformed entry fails registry validation at load with a precise
  error — never reaches a decision (closes T16 at the boundary).
- **Testing.** Schema validation; domain-invariant tests (e.g. energy-system %s sum to
  ~100); privacy sweep (no raw-vital KPI coach-visible); scientific-review checklist.
- **Observability.** Knowledge-access tracing: which entries a decision read (the
  "knowledge tracing" the brief asks for, §13).
- **Extensibility.** Add a sport/exercise/quality/injury = a data file + registry line,
  zero engine edits. **Delivery (closes T5):** knowledge is loadable in slices — the
  client lazy-loads only the athlete's sport(s); the server holds the full set for the
  AI/coach/learning paths. The engine receives a `KnowledgeSet` regardless of how it
  was assembled.

## 4.3 L3 — Orchestration (`orchestration` / the adapter)

- **Purpose.** The impure shell that makes the pure engine usable: it fetches, invokes,
  caches, and persists — and holds **no coaching logic** (closes T7, T23). The
  successor to today's `PlanService`, with its mutable runtime state removed (EDS W4).
- **Responsibilities.** Assemble engine inputs (load `AthleteState`, pin a
  `KnowledgeSet` + engine version, load `Priors`); invoke L1; **cache derived
  artefacts** keyed by `signature(state × knowledgeVersion × engineVersion)` (closes
  T2, T11); persist state/outcomes/priors/freezes via L4; orchestrate **AI
  substitution off the critical path** (§5.13); record decision traces to observability.
- **Inputs.** Requests from surfaces; state/knowledge/priors from L4/L2.
- **Outputs.** Engine artefacts (possibly cached); persistence writes; emitted traces.
- **Dependencies.** L1 (invoke), L2 (pin), L4 (persist/fetch), L5 (read priors, enqueue
  outcomes).
- **Consumers.** All surfaces (L6) and the API gateway.
- **Ownership.** Platform/engine team.
- **Configuration.** Cache policy, AI-enable flags (operational, not coaching). These
  are *operational* config, explicitly separated from coaching config (§9).
- **Versioning.** Tracks which engine + knowledge versions it pins; can pin older
  versions to reproduce a past plan (T3).
- **Failure modes.** Engine error ⇒ serve last cached artefact + flag stale; AI timeout
  ⇒ deterministic fallback (the engine result), never a hang (T9); persistence failure
  ⇒ offline-first local write, background retry.
- **Testing.** Integration tests with a fake engine + fake store; cache-correctness
  tests; AI-fallback tests.
- **Observability.** Request tracing, cache hit/miss, AI-substitution outcomes, latency.
- **Extensibility.** A new surface or a new caller is a new consumer of the same
  orchestration API; no engine change.

## 4.4 L4 — Platform services

Genuine separate modules (different runtime, trust boundary, or scaling profile).
Stated once where common: **Ownership** = platform team; **Testing** = unit +
integration + contract tests; **Observability** = structured logs + metrics + audit
events.

### Identity & Authentication
- **Purpose.** Establish *who* is acting (athlete or coach persona) — kept entirely out
  of the engine (Const. Art 18; EDS §7.3).
- **Responsibilities.** Sign-up/in, OAuth, sessions, per-user isolation.
- **Inputs/Outputs.** Credentials → an authenticated principal + token.
- **Dependencies/Consumers.** Used by the API gateway and every service.
- **Configuration.** Providers, token TTLs. **Versioning.** Provider-agnostic interface.
- **Failure modes.** Auth outage ⇒ cached session honoured offline; never leaks data.
- **Extensibility.** A new auth provider is an adapter behind the principal interface.

### Membership & Access (Organisation · Team · Athlete)
- **Purpose.** Model the [Ontology's actor entities](../foundation/DECISION-ONTOLOGY.md#3-family-i--actors--organisation)
  — Organisation ⊃ Team ⊃ Athlete/Coach — and the **access rules** that extend, never
  bypass, athlete ownership (Const. Art 11).
- **Responsibilities.** Roster/role management; the `is_coach_of()`-style access
  predicate; the additive, team-scoped cross-user policy.
- **Inputs/Outputs.** Membership changes → access decisions.
- **Dependencies/Consumers.** Identity; consumed by the API gateway (authorisation) and
  the coach surface.
- **Configuration.** Org/team structure (data, not code). **Versioning.** Policy changes
  are reviewed + tested (RLS tests).
- **Failure modes.** Default-deny: an access predicate that errors denies, never grants.
- **Extensibility.** New roles/scopes = data + a tested policy; no engine change.

### API Gateway
- **Purpose.** The single typed entry to the platform; authenticates, authorises, routes
  to orchestration/services. Keeps the engine boundary clean (the SA1 boundary).
- **Responsibilities.** Request validation, authz (via Membership & Access), rate
  limiting, versioned endpoints.
- **Failure modes.** Backpressure/rate-limit over cascade failure.
- **Extensibility.** New endpoints are additive + versioned; old versions deprecate on a
  schedule.

### Persistence & Sync
- **Purpose.** Durable, portable, **privacy-bounded** storage of `AthleteState`,
  outcomes, priors, and **committed freezes** (closes T4) — offline-first.
- **Responsibilities.** Athlete-owned tables (raw vitals owner-only); the **derived
  coach surface** (the only path raw data crosses, computed server-side — closes T19);
  offline-first local write + background sync; soft deletes.
- **Inputs/Outputs.** State writes/reads; the derived `CoachVisibleStatus`.
- **Configuration.** Retention, sync cadence. **Versioning.** Schema via versioned
  migrations only (a platform hard rule).
- **Failure modes.** Offline ⇒ local-first, queue, reconcile; conflict ⇒ last-writer
  with freeze protection (a committed session never loses to a reflow).
- **Extensibility.** New state = a migration; the engine's state contract is the
  boundary.

### Wearable Integration (anti-corruption layer)
- **Purpose.** Turn many vendors' data into the platform's **manufacturer-independent
  metric model** (EDS doc 04) without leaking vendor specifics inward (closes T13).
- **Responsibilities.** Per-provider adapters; **queued/batched ingestion** (not
  synchronous polling); normalisation; source-reliability tagging (feeds confidence).
- **Inputs/Outputs.** Vendor payloads → normalised metrics in `AthleteState`.
- **Configuration.** Provider credentials, poll/refresh cadence.
- **Failure modes.** Provider outage/rate-limit ⇒ backoff + queue; missing data lowers
  confidence, never blocks (Const. Art 13).
- **Extensibility.** **A new device = a new adapter** to the normalised model; nothing
  downstream changes — the canonical extensibility win for wearables.

### Notifications & Calendar/Reminders
- **Purpose.** Reach the athlete/coach (session reminders, readiness nudges, coach
  alerts). *Calendar/reminders ≠ training scheduling* (that is engine decision D13).
- **Failure modes.** Best-effort; never block coaching; respect quiet hours.
- **Extensibility.** New channels = adapters behind a notification interface.

### Audit Log
- **Purpose.** An append-only record of every consequential action — overrides, access
  to derived surfaces, knowledge edits, learning changes — for auditability (Const.
  Art 14/15) and security.
- **Failure modes.** Audit write failure is itself an alert; never silently dropped.
- **Extensibility.** New audited event types are additive.

## 4.5 L5 — Learning & Research (off the request path)

- **Purpose.** Two independent learning systems (§10) plus the research/experimentation
  surface — improving coaching over time without ever touching the synchronous path or
  silently changing behaviour (Const. Arts 16, 18).
- **Modules.** **Athlete Learning** (per-athlete priors), **Population Learning**
  (cross-athlete, privacy-preserving aggregation — derived signals only, Const. Art
  11), **Experimentation** (A/B of priorities/doses), **Model Training** (AI models),
  **Analytics** (coach + scientific).
- **Inputs/Outputs.** Training outcomes + overrides → updated **Priors** (the only
  channel into the engine) and trained models/insights.
- **Dependencies/Consumers.** Reads outcomes via L4; writes priors L3 injects into L1.
- **Ownership.** ML/data + sports science.
- **Configuration.** Learning rates, shrinkage, experiment definitions (reviewed
  knowledge — §10).
- **Versioning.** Priors and models are versioned; a prior change is explainable and
  attributable (Const. Art 16).
- **Failure modes.** A bad batch never reaches the engine — priors are validated and
  staged; population aggregation that cannot guarantee privacy does not run.
- **Testing.** Backtesting; shadow evaluation; privacy-preservation tests.
- **Observability.** Model monitoring; prior-drift dashboards; experiment results.
- **Extensibility.** A new learnable quantity = a meta-model + a prior the engine reads
  (population default first, so the seam is alive — Const. Art 16).

## 4.6 L6 — Experience (surfaces)

- **Purpose.** Present coaching to humans (player app, coach dashboard, future native)
  and capture their input and overrides — computing **no coaching** (closes T8, T20).
- **Responsibilities.** Render engine artefacts + the **explanation read-model**;
  capture logs, check-ins, and **overrides** (Const. Art 10); the coach renders the
  derived `CoachVisibleStatus`, never raw vitals (Const. Art 11).
- **Inputs/Outputs.** Engine artefacts in; user input + overrides out (to L3).
- **Dependencies.** L3 (data + invocation); **L1 + L2 directly for read-only derivation
  only via the engine's public API** — surfaces never re-implement coaching (closes
  T14, T17).
- **Consumers.** Humans.
- **Ownership.** Product/frontend.
- **Configuration.** User preferences + presentation (explicitly separated from
  coaching — §9).
- **Failure modes.** Offline ⇒ render cached artefacts; degraded data ⇒ show confidence
  honestly (Const. Art 14), never fabricate.
- **Testing.** Component + interaction tests; **coach acceptance tests** (§12); the
  explanation surface is snapshot-tested against decision traces.
- **Observability.** UX + engagement analytics (never as a coaching objective — Const.
  Art 1).
- **Extensibility.** A new surface consumes the same L1/L2/L3; no new reasoning.

## 4.7 Cross-cutting concerns

Not modules — properties every layer must exhibit. Each has a dedicated section:
**Explainability** (§11), **Observability** (§13), **Audit** (§4.4), **Configuration**
(§9), **Versioning & Reproducibility** (§6.10/§9), **Security & Privacy** (§15).

---

# 5. The Decision Engine in depth

The most important module. It is **one pure library that reasons sequentially through a
decision graph** — *not* a black-box optimiser (Const. Art 14; EDS §19–§22). Every
decision is explainable; every output is gated by validators.

## 5.0 What the engine is, precisely

A **directed acyclic graph of pure decision functions** plus an orchestrator that runs
it, a validator suite that gates it, and a read-model that explains it. The engine's
*identity* is the graph; its *interface* is the public API (§4.1).

## 5.1 The decision pipeline & execution order

The planning pass runs D1→D14 top-down; the runtime re-runs the lower subgraph
(D9–D14) over the immutable plan; learning runs asynchronously and feeds priors back to
the top (EDS §21). **The same decision functions serve both passes** (one planner, one
adaptor — closes T10).

```
  PLANNING PASS (pure, deterministic)
  D1 Assess → D2 Demand → D3 Position → D4 DIAGNOSE → D5 Prioritise → D6 Strategy
     → D7 Block → D8 Week → D9 Session → D10 Movement-reqs → D11 Select → D12 Dose
     → D13 Schedule → D14 VALIDATE  ⇒  immutable Plan (+ trace + provenance stamp)

  RUNTIME PASS (pure projection over pending work only)
  D15 Reflow  re-runs D9–D14 for pending sessions, with reality folded in; respects freezes

  LEARNING (async, off path)
  D16 Learn  updates Priors at 3 tiers → read by D1/D4/D7/D12 on the NEXT pass
```

Each Dn maps to an Ontology decision/entity and consumes specific knowledge domains —
the full table is the [Decision Ontology reasoning spine](../foundation/DECISION-ONTOLOGY.md#2-the-reasoning-spine-challenged-and-justified)
and [EDS §20](../engine/00-ENGINE-DESIGN-SPECIFICATION.md).

## 5.2 Decision boundaries & the seven kinds of work

Within the engine, the [Knowledge Architecture's 8-kind taxonomy](../foundation/KNOWLEDGE-ARCHITECTURE.md#2-the-eight-kinds-of-stuff-the-classification-that-prevents-hard-coding)
is enforced at every decision. The engine contains only **Decision Logic, Inference,
Calculation, Optimisation, and Validation**; it contains **no Knowledge** (that is L2)
and produces **Derived Data** and **Predictions** (the latter via L5). Explicitly:

| Kind | In the engine? | Where |
|---|---|---|
| **Knowledge** | No — *read* from L2 | injected `KnowledgeSet` |
| **Decision Logic** | Yes | the decision functions D1–D16 |
| **Inference** | Yes (carries confidence) | e.g. D4 diagnosis |
| **Calculation** | Yes (exact) | e.g. fractional-set ledger |
| **Optimisation** | Yes, but **bounded & explainable** | value-ordered selection (D11), never a black box |
| **Validation** | Yes (separable) | the validator suite (D14) |
| **Learning** | No — async in L5 | priors injected at D1/D4/D7/D12 |

> **Optimisation is constrained to be explainable.** D11 is a *value-ordered selection
> with a stopping rule* (the [session value hierarchy](../foundation/KNOWLEDGE-ARCHITECTURE.md)),
> not a numeric optimiser whose choices cannot be narrated. This is a hard
> architectural rule: no decision may be a black box (Const. Art 14).

## 5.3 Contracts (closing T6)

Every decision honours a runtime-validated contract: typed inputs, typed output
carrying `{value, confidence, rationale}`, declared dependencies and consumers, and
declared failure modes (EDS §19). A dedicated **contracts** module validates
inputs/outputs at every boundary in development and CI; in production a contract
violation triggers the decision's declared fallback and an audit event. **Without
enforced contracts the graph degrades into the implicit pipeline it replaced** — so
enforcement is non-negotiable, not aspirational.

## 5.4 Inputs & knowledge consumed

Inputs: `AthleteState`, a pinned `KnowledgeSet`, `Priors`. Each decision declares
exactly which knowledge domains it reads (e.g. D4 reads Sport + Quality&Adaptation +
Injury); the engine emits a **knowledge-access trace** (§13) so "which data influenced
this" is answerable (Const. Art 14).

## 5.5 Outputs

Typed artefacts (Plan, AdaptedWeek, Readiness, Load, ValidationReport, CoachVisible
Status), each carrying its **decision trace** and **provenance stamp**
(`engineVersion × knowledgeSetVersion`).

## 5.6 Validation (construction proposes, validation disposes)

After D11–D13 construct, D14 runs the **validator suite** — independent pure checks
(recoverability, sport-compatibility, balance, joint/spinal/neural load, MRV ceiling,
equipment, duration honesty, competency, contraindication, scientific consistency,
purpose coherence, lawfulness) — each returning `pass | trim | veto` with a reason and
authority. Conflicts resolve by the [Constitution's conflict order](../foundation/CONSTITUTION.md#when-principles-conflict).
The suite is a **separable module any construction path must pass — including AI**
(§5.13). Its report feeds explainability and the no-silent-debt rule (Const. Arts 14,
15).

## 5.7 Confidence estimation

Every fact and decision carries confidence; it composes up the graph (a chain is no
more confident than its weakest link — flagged open, §16) and maps to an authority tier
(gate / soft input / reported metric). Confidence governs margin width and what may
gate (Const. Art 13). Missing data lowers confidence, never blocks a value (graceful
degradation).

## 5.8 Assumption handling

Assumptions are first-class and must be made explicit (Knowledge Architecture §2): the
engine records the assumptions a decision made (e.g. inferred-not-measured capability)
in the trace, surfaces them in explanations, and — where possible — converts them into
tested Predictions (L5) or confirmed state. The engine never acts on a hidden
assumption.

## 5.9 Fallback behaviour & error handling

Layered, conservative (EDS L14): missing inputs ⇒ population priors + wider margins;
sport unknown ⇒ generic athletic demand profile + low confidence; all ideal patterns
contraindicated ⇒ best available transfer + recorded compromise; irreconcilable
constraints ⇒ the safest satisfiable session + a surfaced compromise. **Never** a blank
or unsafe plan; **never** a silent omission.

## 5.10 Explainability (engine side)

Each decision *emits* its rationale + confidence as data; the explainability read-model
(§11) assembles them. Explanation is not re-derived after the fact (which would be
decision leakage) — it is a projection over the trace the decisions already produced
(Const. Art 14; EDS SA10).

## 5.11 Coach & athlete overrides

Every decision is overridable at its contract boundary (Const. Art 10). An **Override**
(Ontology entity) substitutes a decision's output behind the same seam an AI uses; it is
recorded, fed to learning, and **still gated by the validators** (an override cannot
ship an unsafe/unlawful plan — Const. Art 19). Committed sessions are frozen; reflow
touches only pending work.

## 5.12 Versioning

The engine is semantically versioned; every artefact is stamped with its version.
Behaviour-changing edits are golden-master-gated and excluded from the master with a
documented reason. A past plan is reproducible by pinning its stamped
`engineVersion × knowledgeSetVersion` (closes T3).

## 5.13 Future AI integration (the substitution seam)

AI augments or replaces a *specific decision* behind its contract — never the graph
(EDS E3, SA8). The architecture keeps AI safe and off the critical path:

```
  Deterministic engine ── always runs, always the fallback ──▶ result
        │ (between sessions / async, NOT inline)
        ▼
  L3 enqueues an AI proposal for a substitutable decision (e.g. D4 diagnosis,
  D11 selection, explanation prose)
        ▼
  AI proposes ──▶ the DETERMINISTIC validators (D14) gate it ──▶ if it passes,
  the proposal is cached as a validated artefact / captured as a prior; if not,
  the deterministic result stands. The AI NEVER gets the last word.
```

Three hard rules: **(1)** AI is never an inline `await` in the pure synchronous pass —
it proposes asynchronously, the deterministic path always produces a result first (T9).
**(2)** AI **self-reported confidence is never trusted**; an AI proposal earns
confidence only by passing validation and by its track record (Knowledge Architecture
Domain 11). **(3)** the API key is server-side only (Const. Art 11; never in the
browser). Candidate decisions for AI, and the open question of *how* its proposals are
bounded beyond the validators, are recorded in §14.

---

# 6. Knowledge flow & governance

How knowledge moves, never duplicated, never hard-coded (Const. Art 17).

```
  AUTHORED (scientists) ─▶ L2 domain file (+ provenance) ─▶ validate-on-load ─▶ registry
        ─▶ composed into a versioned KnowledgeSet ─▶ INJECTED into the engine by L3
        ─▶ a decision READS it (knowledge-access traced) ─▶ output stamped with the KnowledgeSet version
```

- **No duplication.** One canonical home per fact (Knowledge Architecture §3). The
  legacy sport emphasis vectors are derived from the SKB, not authored twice (closes
  T15); any muscle-emphasis the ledger needs is *computed from* the demand profile.
- **No hard-coding.** Thresholds/landmarks live in L2, not as code literals (closes
  T16); the engine reads them. The classification test (Knowledge Architecture §2.2) is
  applied at authoring time.
- **Delivery (closes T5).** Knowledge loads in slices: the client lazy-loads the
  athlete's sport(s) + shared domains; the server holds the full set for AI/coach/
  learning. The engine is indifferent — it receives a `KnowledgeSet`.
- **Versioning & updates.** Per-entry `lastReviewed`; per-domain schema version; a
  composed `KnowledgeSet` version. Changing knowledge is a **reviewed data edit** with
  its own change log; behaviour-changing edits are golden-master-gated.
- **Governance.** The evidence→authority mapping is itself a reviewed, dated knowledge
  entry (Const. Art 13). A knowledge-freshness watchdog flags stale/ superseded entries.
- **Reproducibility (T3).** Because a plan pins its `KnowledgeSet` version, "which
  evidence supported this recommendation" is answerable months later.

Supported domains (the [12](../foundation/KNOWLEDGE-ARCHITECTURE.md#4-the-knowledge-domains)):
Sport · Quality&Adaptation · Movement · Exercise · Programming · Recovery/Fatigue/Load
· Constraint · Injury · Evidence&Confidence · Validation · Learning · Athlete. (The
brief's "coach knowledge" = coach philosophy/overrides, modelled as athlete-scoped
configuration + overrides, §9, not a knowledge domain — coach *preferences* are
configuration; coaching *science* is the 12 domains.)

---

# 7. Data flow & lifecycle

The complete lifecycle, every transition documented, with the privacy boundary marked.

```
  ① Athlete input (onboarding, logs, check-ins)        [Stored Data; owner-only]
        │ L4 Persistence (offline-first local write → background sync)
        ▼
  ② Assessment  (D1 builds the athlete model)           [Inference; in engine]
        │ L3 assembles inputs (state + pinned knowledge + priors), invokes L1
        ▼
  ③ Decision Engine  (D2–D12 reason; D13 schedules)     [Decision Logic/Inference; pure]
        │ emits decision trace + provenance stamp
        ▼
  ④ Programme generation  (the immutable Plan)          [Derived Data; cached, not stored-as-truth]
        │ D14 validators gate it (trim/veto + report)
        ▼
  ⑤ Scheduling  (sessions on days; team constraints)    [Derived; engine D13 + team schedule input]
        │ rendered by L6; athlete commits → freeze
        ▼
  ⑥ Execution  (session runner; sets logged)            [Stored Data; owner-only]
        │ L4 persists outcomes (prescribed vs actual)
        ▼
  ⑦ Wearables  (vendor data → normalised metrics)       [Stored; via L4 ACL; RAW = owner-only]
        │ queued ingestion → manufacturer-independent model
        ▼
  ⑧ Feedback / derived signals  (readiness, load)       [Derived; engine deriveReadiness/Load]
        │ ─ ─ PRIVACY BOUNDARY ─ ─  server-side rollUp() → CoachVisibleStatus (NO raw vitals)
        ▼
  ⑨ Validation of the hypothesis  (did it work?)        [Inference; L5 transfer check vs Performance Outcome]
        ▼
  ⑩ Learning  (outcomes → updated Priors, 3 tiers)      [Prediction; L5, async, off path]
        │ priors injected on the NEXT planning pass — never mutate this plan
        ▼
  ⑪ Improved decisions  (the next loop, sharper)        ── back to ②
```

Transition notes: ②→③ the engine never fetches (L3 injects); ④ the plan is *cached*
(recomputable), never *stored as truth* (closes T2); ⑦ raw vitals enter owner-only
storage and **never leave it**; ⑧ the only boundary crossing is the **server-side**
roll-up (closes T19); ⑩ learning writes priors, never plans (Const. Art 18).

---

# 8. (folded into §7 — the data lifecycle is the single source for data flow)

---

# 9. Configuration architecture

Nothing is mixed. Every datum has exactly one home, by lifetime, owner, and authority
(Knowledge Architecture §2; the brief's separation requirement):

| Category | What | Lifetime / owner | Changeable by | Home |
|---|---|---|---|---|
| **Immutable principles** | The Constitution's Articles | permanent / platform | formal amendment only | L0 docs |
| **Knowledge** | Evidence-tagged coaching facts | versioned / platform | reviewed data edit | L2 |
| **Operational configuration** | Cache/AI flags, cadences | per-deploy / platform | ops | L3/L4 config |
| **User preferences** | Units, notifications, theme | per-user / athlete | the user | L4 state (presentation) |
| **Coach philosophy** | A coach's defaults + standing overrides | per-coach / coach | the coach | athlete-scoped overrides + coach config |
| **Organisation philosophy** | Org-wide defaults/policies | per-org / org | the org | membership config |
| **Sport-specific configuration** | A sport's demand model | versioned / platform | scientists | L2 (Sport domain) |
| **Athlete-specific configuration** | Goal, constraints, equipment | per-athlete / athlete | the athlete/coach | L4 `AthleteState` |
| **Generated outputs** | Plans, weeks, signals | ephemeral / computed | (recomputed) | cache, never authored |

Two rules: **(1)** coaching *science* is Knowledge (L2); coaching *preference* (a
coach's or org's philosophy) is configuration/overrides — they never mix. **(2)** No
"feature flag" in the engine may change *reasoning* — that would be hidden,
unversioned knowledge (§5.1). Reasoning changes only via knowledge or engine versions.

---

# 10. Learning architecture (two independent systems)

Per the brief: two systems, neither silently changing engine behaviour, every change
explainable (Const. Arts 16, 18).

```
  ATHLETE LEARNING (personalises THIS athlete)        POPULATION LEARNING (improves FUTURE decisions)
  ────────────────────────────────────────────        ───────────────────────────────────────────────
  outcomes + overrides (one athlete)                   derived signals across many athletes
        │ shrinkage toward athlete-specific                  │ privacy-preserving aggregation
        ▼                                                    ▼   (DERIVED only; raw vitals NEVER — Art 11)
  ATHLETE-TIER PRIORS (private, in AthleteState)        SPORT- & POPULATION-TIER PRIORS (become Knowledge)
        └──────────────┬───────────────────────────────────┘
                       ▼ injected by L3, READ by the pure engine (D1/D4/D7/D12) on the NEXT pass
                 the engine's behaviour shifts ONLY via priors it reads — never by in-place mutation
```

- **Independence.** The two run separately and at different cadences; athlete learning
  is fast and private, population learning is slow and aggregated.
- **No silent change.** Both write **Priors** — the only channel into the engine.
  Because the engine is pure and stamped, any behaviour shift is attributable to a
  versioned prior change and is **explainable** ("we increased your squat frequency
  because we learned you recover quickly").
- **Falsifiability.** Learning also validates the engine's own diagnoses against
  Performance Outcomes (Const. Art 12; the platform as a research instrument).
- **Off the path.** Neither runs on the request path (closes T12); a bad batch is
  staged and validated before any prior is promoted.

---

# 11. Explainability architecture (first-class)

A first-class component, not an afterthought (Const. Art 14; the brief's emphasis). It
is a **read-model over the decision trace** every pure decision already emits — never a
re-derivation (closes T22, T17).

For any recommendation the system answers the brief's seven questions, each from trace
data:

| Question | Source in the trace |
|---|---|
| **Why was this made?** | the decision's rationale + the limiting factor it serves |
| **What evidence supported it?** | the knowledge entries read, with evidence level/source |
| **Which decision produced it?** | the decision id + its place in the graph |
| **Which assumptions were made?** | the recorded assumptions (§5.8) |
| **How confident is it?** | the composed confidence + authority tier |
| **Which alternatives were rejected?** | the value-ordered candidates D11 considered and why each lost |
| **What data influenced it?** | the athlete-state fields + priors the decision read |

Architecturally: decisions emit traces → L3 records them → the engine's `explain()`
read-model assembles an `Explanation` → surfaces render it. **The same trace is the
observability and audit substrate** (§13) — explanation, debugging, and audit are one
data structure, three lenses. Explanations are rendered for the athlete (plain English),
the coach (with more detail), and engineers (the full trace), all from one source.

---

# 12. Extensibility architecture

The platform supports each foreseeable addition with **data or an adapter, not a
redesign** (Const. Art 17; the brief's list):

| Addition | Mechanism | Code change |
|---|---|---|
| New sport | L2 Sport file + registry line | none |
| New exercise | L2 Exercise entry | none |
| New programming methodology | L2 Programming model | none |
| New wearable device | L4 provider adapter → normalised model | adapter only |
| New recovery metric | L2 Recovery domain + weighted contributor | none/adapter |
| New AI model | substitute a decision behind its contract (§5.13) | adapter only |
| New assessment method | L2 Quality assessment + Athlete estimation rule | none |
| New evidence source | L2 Evidence entry / re-review | none |
| New coach philosophy | coach configuration + overrides (§9) | none |
| New organisation | Membership data | none |

The test of the architecture (EDS §40.3): **the things most likely to be added require
touching the least.** Any addition that demands an engine-core edit is a signal that
knowledge has leaked into logic — and is corrected, not accommodated.

---

# 13. Testing strategy

Every layer has a validation strategy; the engine's determinism makes the most
important tests cheap and exhaustive.

| Test kind | Target | Mechanism |
|---|---|---|
| **Unit** | each decision / service function | pure-function tests with fixtures |
| **Knowledge validation** | every L2 entry | schema + invariant + provenance + privacy validators (on load + CI) |
| **Decision validation** | each decision's logic | golden-master per archetype + property tests |
| **Scientific validation** | knowledge correctness | expert review checklist; evidence-tagged sign-off |
| **Regression** | the whole engine | golden-master across the archetype matrix; behaviour changes are explicit, reviewed diffs |
| **Simulation** | the system over time | simulated athletes across seasons (does it adapt sanely? does it converge?) |
| **Integration** | layer boundaries | contract tests with fakes (engine/store/AI) |
| **Coach acceptance** | the coach surface | scripted coach scenarios against the dashboard |
| **Athlete outcome validation** | the engine's efficacy | did developing the priority quality move the Performance Outcome? (the learning loop, Const. Art 12) |

**The engine supports deterministic testing** (Const. Art 18; EDS SA9): same inputs ⇒
identical output, so golden-masters catch any unintended change, and CI fails on
non-deterministic output. Because the engine is isomorphic (§4.1), a **cross-runtime
determinism test** asserts byte-identical output on the client and the server (no
locale/precision drift). Determinism is the property that makes this whole table
feasible for a small team.

---

# 14. Observability architecture

Every coaching decision is observable, because the **decision trace is emitted by
design** (§11) — observability is not bolted on.

| Concern | Mechanism |
|---|---|
| **Logging** | structured, correlated by request + athlete + plan provenance stamp |
| **Decision tracing** | the per-decision trace (inputs read, rationale, confidence, output) — the explainability substrate |
| **Knowledge tracing** | which knowledge entries each decision read (and their versions) |
| **Performance metrics** | engine latency, cache hit/miss, ingestion lag, API SLOs |
| **Error reporting** | contract violations, fallbacks taken, validator vetoes |
| **Model monitoring** | AI proposal accept/reject rates, prior drift, population-learning health |
| **Coach analytics** | team loading/adherence views (built on the engine's roll-up, never re-derived) |
| **Scientific analytics** | diagnosis-validity, transfer, prevention efficacy (the research instrument) |

A production incident is debugged by **replaying the stamped inputs through the pinned
engine + knowledge versions** — determinism makes every recommendation reproducible
(Const. Art 14; closes the observability gap behind T3).

---

# 15. Future AI architecture

AI capability will expand dramatically; **none of it requires architectural redesign**,
because it all enters through two existing seams: a **substituted decision** (§5.13) or
a **new intervention/knowledge** (§6, §12).

| AI capability | Enters as | Bounded by |
|---|---|---|
| LLMs (explanations, drafting knowledge, conversation) | decision substitution + knowledge authoring | validators; human review of authored knowledge |
| Reasoning models (diagnosis, prioritisation) | substitute D4/D5 behind contract | validators; confidence from validation, not self-report |
| Predictive models (recovery, response) | feed **Priors** via L5 | prior validation/staging |
| Computer vision / movement analysis | a new **assessment** producing **Capability** estimates | confidence; field-test reliability |
| Personalisation models | **Priors** (athlete tier) | learning governance (§10) |
| Knowledge extraction / evidence synthesis | drafts **L2 knowledge** for review | scientific review; no fabricated evidence |
| Simulation | the research/experimentation layer (L5) | off the request path |

Invariants (all from the governing docs): AI **proposes, validators dispose**; AI is
**off the synchronous critical path**; AI **self-confidence is never trusted**; the API
key is **server-side only**. **Open question carried forward** (EDS Q8): the precise
contract each substitutable decision must honour, and the eval harness for AI proposals,
are specified per-decision when the AI layer is built — recorded, not hidden.

---

# 16. Critical architectural review

Reviewed through four lenses; the critiques are genuine, the revisions folded back.

## 16.1 Lens — Principal Engineer, Google (scale, determinism, data)

- **C1 — Recompute-on-read won't scale to large orgs even with a client cache.** A
  federation with thousands of athletes needs the coach/analytics paths served from
  *materialized* derived state, not on-demand engine runs. **Revision:** §4.4 makes the
  `CoachVisibleStatus` roll-up a **server-side, materialized** surface (refreshed on
  outcome/ingestion events), and §4.3's cache is keyed by a precise signature so the
  player path is recompute-once. The synchronous engine is never on a fan-out read path.
- **C2 — "Isomorphic engine" can rot if client and server diverge in subtle ways
  (number precision, locale).** **Revision:** §12 adds a cross-runtime determinism test
  (the same inputs must produce byte-identical output on client and server) to CI. The
  engine forbids locale/precision-dependent operations (already implied by purity;
  now tested).
- **C3 — Provenance stamping everything has a storage cost.** **Assessment:** stamps
  are small (two version ids); traces are emitted but only *persisted* for committed
  plans and on demand for replay (not every ephemeral recompute). Noted as a retention
  policy in §13.

## 16.2 Lens — Distinguished Engineer, Microsoft (coupling, contracts, compatibility)

- **C1 — The engine's public API is the platform's most important compatibility
  surface; if it churns, every surface breaks.** **Revision:** §4.1's API is
  deliberately *minimal* (six calls) and semantically versioned; the API gateway
  (§4.4) versions endpoints so surfaces pin a major version. The small surface is the
  feature, not a limitation.
- **C2 — Contracts validated "in dev + CI" can still be bypassed in prod for
  performance.** **Revision:** §5.3 keeps lightweight contract checks in prod at
  decision *boundaries* (cheap shape checks), with full validation in dev/CI; a prod
  violation takes the declared fallback and audits. Contracts are never fully disabled.
- **C3 — L3 orchestration risks becoming a god-layer (the new PlanService).**
  **Revision:** §4.3 constrains L3 to four verbs (fetch, invoke, cache, persist) +
  AI-dispatch, with **zero coaching logic** as an enforced rule; anything resembling a
  decision must move into L1. Reviewers reject coaching logic in L3 the way they reject
  it in the UI store today.

## 16.3 Lens — Chief Architect, global SaaS (multi-tenancy, security, ops)

- **C1 — Multi-tenancy + the privacy boundary is the highest-risk area; one RLS mistake
  leaks health data.** **Revision:** §15 makes the raw-vitals boundary a **trust
  boundary, not a code convention**: raw vitals are owner-only and *never* have a coach
  policy; only the server-computed derived surface is coach-readable; cross-user access
  *extends* `auth.uid()` via tested predicates; the `service_role` key is never
  client-side; a privacy validator fails the build on any raw-vital coach exposure. RLS
  tests are required before relying on a policy.
- **C2 — Operational config and coaching config blur under delivery pressure.**
  **Revision:** §9's table makes the separation explicit and auditable; the engine
  rejects any reasoning-changing flag (§5.1). Ops can tune cache/AI; ops cannot tune
  coaching.
- **C3 — Offline-first + a server-materialized coach surface creates consistency
  questions.** **Revision:** §4.4 states the model: the player path is offline-first
  (local write, background sync); the coach surface is *eventually consistent* derived
  state refreshed on sync — acceptable because it is an *overview*, and freeze
  protection guarantees committed sessions never regress.

## 16.4 Lens — Head of Engineering, elite sports performance (does it serve coaches & science?)

- **C1 — Coaches need to trust and shape the system, fast, courtside.** **Revision:**
  §5.11 makes every decision overridable at its boundary and §11 makes the coach
  explanation first-class; §4.6 keeps the coach surface a thin renderer of engine
  decisions so what the coach sees *is* what the engine reasoned — no parallel truth.
- **C2 — Scientific validity must be auditable, not asserted.** **Revision:** §6 and
  §13 make knowledge versioned, provenance-stamped, freshness-watched, and the engine's
  diagnoses falsifiable against outcomes (§10) — the platform proves its coaching, it
  doesn't just claim it.
- **C3 — Over-engineering risk for a small team (the standing tension).**
  **Revision:** the architecture is a *destination* (Const. Art 20); §17 sequences it
  so value ships incrementally — L1+L2 hardening and the engine boundary first; the
  learning/AI/population layers are seams kept alive cheaply (population defaults) and
  built only when a consumer exists. **The smallest version of every layer is the rule.**

## 16.5 Over-engineering & complexity audit (self-imposed)

Applying "challenge every component" to the TAS itself:

- **Removed:** "Recommendation Engine," "Programme Generator," "Assessment/Planning/
  Validation/Recovery/Readiness Engine" as separate services — folded into the one
  engine's decisions (§3.1). This is the single biggest complexity reduction.
- **Folded:** "Exercise/Sport/Evidence Library" into L2 knowledge domains; "Scheduling
  Engine" split into engine-D13 (training) vs L4 calendar/reminders (logistics);
  "Coach knowledge" into configuration + overrides, not a knowledge domain.
- **Kept minimal:** L3 to four verbs; the engine API to six calls; learning/AI as seams
  not built-out machinery until needed.
- **Deferred, not omitted:** population learning, the full AI eval harness, and
  org-scale materialization are architected (seams reserved) but built when a real
  consumer exists — recorded so deferral is explicit, not silent (Const. Art 15).

## 16.6 Standing tensions (recorded honestly)

1. **Confidence composition across decisions** is a simplification (a chain is no more
   confident than its weakest link); the principled model is open (EDS Q1).
2. **The AI-substitution contract** per decision and its eval harness are deferred to
   when the AI layer is built (EDS Q8).
3. **Ambition vs. team size** is permanent; the mitigation is Const. Art 20 and §17's
   incremental sequencing — build the smallest thing that helps an athlete, and let the
   architecture pull the work forward.

---

# 17. Migration & sequencing (smallest-version-first)

The TAS is a destination; it is reached incrementally, each step shipping value
(Const. Art 20; aligned with the EDS migration M0–M10). Ordered by value-per-risk:

1. **Engine boundary + API (§4.1).** Make the engine a pure, isomorphic library with
   the six-call API; move derived-signal computation out of the view store (closes T7,
   T18). Highest leverage; unblocks reuse.
2. **One reflow (§5.1).** Make D15 a pure engine function; retire the duplicated logic
   (closes T10).
3. **Knowledge as a versioned package (§4.2, §6).** Extract L2; pin versions; stamp
   provenance (closes T3, T16). Derive emphasis from the SKB (closes T15).
4. **Contracts enforced (§5.3).** Runtime-validated boundaries (closes T6).
5. **Portable state (§4.4).** Sync priors + freezes (closes T4).
6. **Server roll-up + materialized coach surface (§4.4, §15).** The privacy-correct,
   scalable coach path (closes T19, T11). Surfaces stop re-deriving (closes T8, T14,
   T20).
7. **Wearable ACL (§4.4).** Queued, adapter-based ingestion (closes T13).
8. **Learning seams alive (§10).** Decisions read priors (population defaults) from day
   one.
9. **AI seam + population learning (§5.13, §10).** Built when a consumer exists.

Steps 1–4 are independent of the later ones and ship value immediately — the platform
improves continuously rather than waiting on the full build.

---

# Appendix A — Current Realization

The body is framework-agnostic; this appendix maps it to today's stack, so the
blueprint is actionable. (Frameworks may change; the mapping is updated, the body is
not.)

| TAS abstraction | Today's realization | Migration note |
|---|---|---|
| **L1 Engine** | `packages/engine` (`@performance-os/engine`) — pure JS, the D-graph + validators | Add the six-call API; move readiness/load *in* from the store; make `reflow` a pure fn |
| **L2 Knowledge** | `packages/engine/src/data/*` + `lib/knowledge`, `lib/sportKnowledge`, `lib/sports` | Extract to `packages/knowledge`; version it; retire `lib/sports/*` emphasis vectors (derive from SKB) |
| **L3 Orchestration** | `apps/mobile/src/lib/PlanService.js` | Remove mutable `_runtime`; add the cache; move AI-dispatch here; zero coaching logic |
| **L4 Identity & Auth** | Supabase Auth + `authStore.js` | as-is; keep out of the engine |
| **L4 Membership & Access** | planned `teams`/`team_members` + `is_coach_of()` (TEAM-ARCHITECTURE) | build the RLS spine with tests |
| **L4 Persistence & Sync** | `SyncService.js`, `Database.js`, Supabase (12 tables, RLS), localStorage | add portable priors + freezes; keep offline-first |
| **L4 Wearable Integration** | `supabase/functions/{strava,fitbit}-*`, `enrich-sessions` | formalise as an ACL with provider adapters + a queue |
| **L4 API Gateway** | Supabase RLS + (future) edge functions | add a versioned gateway as server logic grows |
| **L5 Learning/Research** | not built (priors are population defaults) | reserve the prior seam now; build athlete learning first |
| **L6 Player app** | `apps/mobile` (React + Vite PWA, Zustand) | render engine outputs; stop computing coaching in `buildView()` |
| **L6 Coach app** | `apps/web` (Next.js, mock data, `lib/derive.ts`) | replace `derive.ts` with the engine's `rollUp()`; render, don't re-derive |
| **Server roll-up** | currently client-side plan (TEAM-ARCHITECTURE) | move to an edge function (trust boundary) |
| **AI layer** | placeholders only | substitute decisions behind contracts via a server edge function |
| **Provenance stamp** | memoise-by-signature exists | extend to `engineVersion × knowledgeSetVersion` |

---

# Appendix B — Traceability matrix

Every major architectural decision traces to a governing-document clause. A decision
with no trace does not belong in this document.

| TAS decision | Traces to |
|---|---|
| One pure engine; decisions inside it (§3.1) | Constitution Art 18; EDS SA4, G1, §20 |
| Engine isomorphic, pure, no I/O (§4.1) | Constitution Art 18; EDS SA1 |
| Knowledge a separate versioned package (§4.2, §6) | Constitution Art 17; Knowledge Architecture §1, §3 |
| Orchestration holds zero coaching logic (§4.3) | Constitution Art 18; EDS A5, W1, W4 |
| Construction proposes, validators dispose (§5.6) | Constitution Art 19; EDS §35, SA8 |
| Confidence governs authority (§5.7) | Constitution Art 13; EDS §28 |
| Explainability as a read-model over the trace (§11) | Constitution Art 14; EDS SA10 |
| Every decision overridable; freeze-on-commit (§5.11) | Constitution Art 10; EDS L10 |
| AI proposes off the critical path, validators gate (§5.13, §15) | Constitution Arts 13, 18; EDS E3, SA8 |
| Two learning systems via priors only (§10) | Constitution Arts 16, 18; EDS §25 |
| Raw-vitals trust boundary; server-side roll-up (§7, §15) | Constitution Art 11; EDS L13; TEAM-ARCHITECTURE |
| Configuration fully separated from knowledge (§9) | Knowledge Architecture §2, §6 |
| Eight-kind taxonomy enforced in the engine (§5.2) | Knowledge Architecture §2 |
| Smallest-version-first sequencing (§17) | Constitution Art 20; EDS §41 |
| The Ontology entities as the data model (§4.4) | Decision Ontology §3–§9 |

---

*— End of the Technical Architecture Specification v1.0 —*
