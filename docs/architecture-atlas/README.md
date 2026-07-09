# Architecture Atlas — documentation suite

> **Snapshot 2026-07-06, engine sections refreshed 2026-07-09.** The build flip (2026-07-07) and the SKB consolidation (PR #160) landed after first authoring; sections describing the engine were updated 2026-07-09. Current state always lives in `HANDOFF.md`; classification in `docs/DOCUMENTATION-INDEX.md`.

**A founder-facing architecture review of Performance OS, produced from a full-repository read on 2026-07-06.**

This is a documentation-only sprint: nothing in `apps/`, `packages/`, or `supabase/` was changed to produce these five documents. They describe the platform as it exists today, for a reader who understands coaching, systems, and engineering, but doesn't want to read source code to follow along.

## What's here

1. **[Architecture Atlas](01-ARCHITECTURE-ATLAS.md)** — the master map. Every subsystem, organised by what it *does* (not by folder), with diagrams, plain-English explanations, and an architectural-importance rating.
2. **[Architecture Decision Register](02-ARCHITECTURE-DECISION-REGISTER.md)** — the major decisions already made, inferred from the code, the governance docs, and the session history — with context, alternatives considered, trade-offs, and open questions.
3. **[Platform Data Dictionary](03-PLATFORM-DATA-DICTIONARY.md)** — every important domain object (Athlete, Programme, Session, Team, Readiness, and more), explained in coaching terms: purpose, owner, fields, who creates/consumes it, mutability, and source of truth.
4. **[Dependency & Information Flow Map](04-DEPENDENCY-INFORMATION-FLOW-MAP.md)** — Mermaid diagrams tracing how information actually moves end to end, plus an explicit call-out of coupling and simplification opportunities.
5. **[Platform Health Report](05-PLATFORM-HEALTH-REPORT.md)** — an engineering assessment with every finding classified Critical/High/Medium/Low, and concrete (not-yet-applied) recommendations.

## How this relates to the rest of `docs/`

This suite sits **alongside**, not above or in place of, the platform's existing documentation stack:

- The five **frozen governance documents** (`docs/foundation/`, `docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md`, `docs/architecture/TAS.md`) remain the authoritative source of *why* the platform is built the way it is, and were **not modified** by this sprint. This Atlas describes and cross-references them; it does not supersede them.
- The **living companion documents** (`docs/architecture/BASELINE-ARCHITECTURE-ASSESSMENT.md`, `MIGRATION-BLUEPRINT.md`, the dated reassessments) remain the authoritative, continuously-updated source for *current migration status and the next sprint's backlog*. This Atlas is a point-in-time synthesis of them for a non-engineer reader, not a replacement for keeping them current.
- `HANDOFF.md` and `CLAUDE.md` at the repo root remain the day-to-day working references for anyone (human or AI) picking up a session.

If a fact in this suite and a fact in one of those documents ever disagree, treat the frozen/living documents as authoritative for engineering decisions — and treat the disagreement itself as a signal that either this suite or the other document needs a refresh (the Platform Health Report names several such staleness gaps already found during this sprint).

## Suggested reading order

- **New to the platform?** Read the Architecture Atlas first, top to bottom.
- **Trying to understand a specific past decision?** Go straight to the Decision Register.
- **Trying to understand what a specific piece of data means?** Go straight to the Data Dictionary.
- **Trying to trace "what happens when X occurs"?** Go straight to the Flow Map.
- **Preparing for a technical conversation (an engineer, an investor, a hire)?** Read the Health Report last — it assumes the context the other four documents build.
