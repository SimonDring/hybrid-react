# Phase 3 — Full sport & match ingestion boundary (DAAS §2.1.5) · DESIGN

**Goal.** The proper long-term intake for pitch/match data: minutes played, availability, GPS
(top speed, distance covered, sprint counts), pitch-session RPE — normalised, provenance-tagged,
landing in the athlete's owner-private career record, and feeding the form model (Phase 2) and
match-day scheduling (Phase 1). Parent roadmap:
`docs/superpowers/specs/2026-07-17-sport-data-integration-roadmap-design.md` (§Phase 3).

> **STATUS: DESIGN ONLY.** This phase's build touches **Supabase schema migrations + RLS**, which
> per the repo's hard rules only Simon applies to prod (and the RLS harness gates). This document
> is the spec Simon (or a future session) executes; **no migration ships from it autonomously.**
> Authored in the 2026-07-20 autonomous run alongside Phases 1–2 (built + merged).

## Governing architecture (already ratified — this instantiates it)

This is **DAAS §2.1.5 "The second ingestion boundary — sport & match data"** + **DAAS S1** (the
Metric Dictionary). Nothing here is invented; it realises the ratified spec
(`docs/architecture/DATA-ANALYTICS-ARCHITECTURE.md`). Build on:
- The proven **wearable-ACL pattern** (`packages/engine/src/lib/adapters/wearableReading.js` —
  `adaptWearableReading`: measured vs vendor-derived vs subjective, TR-15/Art 16). The sport/match
  boundary is the SAME pattern, a second instance — reused, not reinvented (GA-501).
- The **live M5 append-only owner-private substrate**
  (`docs/design/m5-substrate/SCHEMA-AND-PRIVACY.md`, on prod since 2026-07-16) — observations land
  there, not in the legacy `users.profile` blob (TR-03).
- **TEAM-ARCHITECTURE** (`docs/product/TEAM-ARCHITECTURE.md`) for the coach-visibility posture.

## The two data classes (Ontology Family VIII, verbatim)

1. **External Load Observation** — GPS/accelerometry, total distance, high-speed-running distance,
   **top speed / max velocity**, sprint counts, accelerations/decelerations, pitch-session RPE ×
   duration (sRPE). Provenance: `device` (GPS vest) / `self-report` (pitch RPE) / `third-party`
   (vendor export) / `coach-report`.
2. **Match Performance** — exposure (minutes played), **availability status** (available / modified
   / unavailable + return horizon — a status fact, never clinical detail, per Ontology's Injury
   rule), and output KPIs mapped to the sport's KPI framework.

## The Metric Dictionary (DAAS S1 / §4.1) — the normalisation target

A governed registry (the KA `§3.2` pattern), entries as versioned data validated on load. Each
metric: stable dotted `id` (e.g. `sprint.distance.session`, `speed.max.session`,
`gps.total_distance.session`, `exposure.minutes.match`), one falsifiable semantic sentence, unit,
range, the source classes + per-class reliability, commensurability rulings (which vendor field
maps to it), a **privacy class** (`raw-vital` owner-only vs `derived-safe`), and baseline
treatment. **No ingestion boundary or surface may reference a metric with no dictionary entry.**
Stand up the Metric Dictionary FIRST (S1) — everything keys on it; retrofitting semantics is the
expensive path (DAAS §9).

## Staging (DAAS §9 S6, smallest-first)

1. **S6a — manual/file entry.** A minutes + RPE entry is a valid, honest Match Performance /
   External Load Observation. Ship manual logging + CSV/file import first (schema
   **source-agnostic from day one** — a hand-logged and a GPS-derived load differ in provenance +
   reliability, not shape).
2. **S6b — vendor GPS-vest adapters** (Garmin/Catapult/StatSports) as an **instrumented cohort
   arrives** (DAAS D-1 defers vendor GPS until then — schema must lead hardware). Each adapter maps
   its export into Metric Dictionary metrics on the ACL pattern.

## Privacy (binding — Arts 11/22; the RLS harness gates)

- External-load observations + match performance are **athlete-owned**, owner-private at rest.
- **Coach visibility is derived-roll-up-only by consented grant** — never raw GPS traces or raw
  RPE. The coach surface stays the existing `player_status`-lineage derived signal (availability +
  derived load); this phase does NOT widen it. A squad view that would need a raw vital fails the
  build (the privacy validator).
- Consent widens *who*, never deepens *what* (Art 11 ceiling; Art 22 basis). Revocation ends the
  crossing forward (the F3 pattern, generalised).

## Data flow (once built)

```
manual/file/GPS-vest → Sport & Match ACL adapter → Metric Dictionary metric + provenance + reliability
  → M5 append-only owner-private substrate (External Load Observation / Match Performance)
  → feeds: Phase 2 form model (real per-session external load, replacing history-only maturity)
           Phase 1 match-day density (real minutes/GPS per fixture, not just a fixture count)
           the coach's derived availability/load roll-up (consented, derived-only)
```

## What the build needs (Simon's, when this phase runs)

1. **Metric Dictionary registry** (governed data + validate-on-load) — the one autonomous-safe
   piece; could be built flag-inert first.
2. **Schema migrations** for the External Load Observation / Match Performance tables in the M5
   substrate — **Simon applies (staging → rls-harness → prod)**; a row in the ledger
   (`supabase/migrations/README.md`).
3. **RLS proofs** extending the harness (owner-only at rest; derived-only crossing; consent-gated;
   revocation) — the green gate before prod.
4. **The ACL adapters** (manual first) + a logging surface (app) — additive.

## Verification (when built)

Metric Dictionary registry validate-on-load + adapter conformance tests (vendor fixture → expected
metric + provenance + reliability); the RLS harness (owner-only + derived-only + consent +
revocation) green on staging before prod; the privacy CI sweep reading privacy classes from the
dictionary; each analytical product over the new data validated by the DAAS §8 suite.
