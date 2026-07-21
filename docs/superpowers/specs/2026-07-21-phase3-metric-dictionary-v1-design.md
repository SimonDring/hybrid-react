# Phase 3 · S1 — The Metric Dictionary v1 · DESIGN

**Goal.** Stand up the governed **Metric Dictionary** (DAAS §4.1 / GA-804): the
platform-owned definition of every captured metric — the single normalisation target
every ingestion boundary keys on. This is **DAAS staging step S1**, and the design's own
instruction is to build it **first**: "everything keys on it; retrofitting semantics is
the expensive path" (DAAS §9).

Parent roadmap: `docs/superpowers/specs/2026-07-17-sport-data-integration-roadmap-design.md`
(Phase 3). Phase-3 umbrella spec:
`docs/superpowers/specs/2026-07-20-phase3-sport-match-ingestion-design.md` (§"What the
build needs", item 1 — flagged as **the one autonomous-safe piece**).

> **STATUS: this slice is autonomous-safe and additive.** It ships a new governed registry
> + validate-on-load + a validation seam — **no Supabase migration, no RLS, no schema
> change, no plan behaviour change.** The registry is *authored knowledge*; nothing reads
> it into plan output yet. The schema/RLS/adapter parts of Phase 3 remain Simon's (staging
> → rls-harness → prod). The M5 substrate tables it targets (`external_load_observations`,
> `match_performances`) are **already on prod** (migration `20260713`, applied 2026-07-16),
> carrying `metric_id` / `provenance_class` / `reliability_tag` columns built for exactly
> this registry.

## Why this is inert (the governance placement decision)

The KNOWLEDGE_SET_VERSION ratchet (`apps/mobile/tests/knowledge-set-ratchet.js`) hashes
`packages/engine/src/data/**` + `lib/knowledge/entries.js`. Placing the Metric Dictionary
under **`packages/engine/src/lib/metrics/`** (NOT `src/data/`) keeps it **outside** that
hash set. Consequence: **no KSV bump, no golden-master re-baseline, every plan
byte-identical.** This is also the correct governance call — DAAS §4.1 defines the Metric
Dictionary as a **distinct governed registry** ("the KA §3.2 pattern"), parallel to the
evidence KB, not part of it. It therefore carries its **own** `METRIC_DICTIONARY_VERSION`
and its **own** validate-on-load, exactly as `entries.js` carries `KNOWLEDGE_SET_VERSION`.

## The entry contract (DAAS §4.1, verbatim requirements)

One entry per metric, one metric per concept. Each entry carries:

- `id` — stable dotted id (`gps.total_distance.session`, `hrv.rmssd.night`).
- **Semantics** — one falsifiable sentence of what the number means; `unit`; `scale`;
  valid `range`.
- **Source classes** — which §2.1.1 provenance classes may supply it, each with a
  per-class reliability default; plus the **precedence** rule when several sources cover
  one window.
- **Commensurability ruling** — which vendor fields map to it, and which superficially
  similar fields are *distinct metrics* (the two-vendor "sleep score" problem, settled per
  entry — never in an adapter).
- **Privacy class** — `raw-vital` (owner-only forever, Art 11's enumerated protection) or
  `derived-safe` (may appear in derived roll-ups). This is what the build-failing privacy
  validators check against. **Note: privacy class ≠ storage posture** — *every* Phase-3
  observation is owner-private at rest via RLS regardless; privacy class governs only
  whether a metric may appear in a *derived cross-person roll-up*.
- **Baseline treatment** — whether individually baselined, and under which model.
- **Definition provenance** — author, date, review, confidence (KA §3.1).

**Hard rule (DAAS §4.1 / §2.1.1 rule 1):** no ingestion boundary, analysis method, or
surface may reference a metric with no dictionary entry, and none may reinterpret an entry
locally. A datum without a known dictionary id + a valid provenance class is **rejected at
the boundary** (fail-fast, exactly as malformed knowledge fails).

## The closed provenance set (§2.1.1 — governed there, imported here)

`measured` · `device` · `self-administered` · `self-report` · `third-party` ·
`coach-report`. A metric's `sources` classes must be a subset of this closed set; the
validator rejects any other.

## v1 metric set (13 entries — the honest minimum, non-vacuous on every axis)

**Family: `vital`** (raw-vital anchor + wearable-boundary reconciliation seed — makes the
privacy dimension non-vacuous; the full wearable reconciliation is later work):
- `hr.resting.daily` — resting heart rate, bpm — `raw-vital`
- `hrv.rmssd.night` — overnight HRV (RMSSD), ms — `raw-vital`
- `sleep.duration.night` — total sleep time, min — `raw-vital`
  (commensurability ruling names the vendor "sleep **score**" as a **distinct** metric,
  not this id — mirrors the honest split in `adaptWearableReading`.)

**Family: `external-load`** (all `derived-safe` — none is an Art-11 enumerated vital):
- `gps.total_distance.session` — total ground-tracked distance, m → `distance_m`
- `gps.high_speed_distance.session` — distance above the high-speed-running threshold, m
  → `high_speed_m`
- `speed.max.session` — peak instantaneous velocity, m/s → metric-keyed row / `raw`
- `sprint.count.session` — efforts above the sprint threshold, count → `sprint_count`
- `accel.count.session` — high accelerations, count → `raw`
- `decel.count.session` — high decelerations, count → `raw`
- `rpe.session.pitch` — session RPE (Borg CR10) for a pitch session, self-report only
  → `pitch_rpe`
- `srpe.load.session` — session load = RPE(CR10) × duration(min), Foster sRPE, AU
  → derived, lands via `raw`/`context` (commensurability ruling records the RPE×min
  definition; a vendor that logs it directly maps here as `third-party`)

**Family: `match-performance`** (all `derived-safe`):
- `exposure.minutes.match` — minutes played in a fixture, min → `minutes`
- `availability.status.match` — enum `available|modified|unavailable` (a status fact,
  never clinical detail, per the Ontology Injury rule) → `availability_status`

Each entry additionally records `storesTo: {table, column|null}` — the concrete M5 landing
column — making "the schema is source-agnostic from day one" checkable and giving Phase-3
adapters an unambiguous target.

## Modules (all new, all under `src/lib/metrics/`)

1. `metricDictionary.js` — governed data: `PROVENANCE_CLASSES` (frozen closed set),
   `RELIABILITY_TAGS`, `METRIC_DICTIONARY` (the 13 entries), `METRIC_DICTIONARY_VERSION`
   (`'1.0.0'`), `M5_TABLES` (the known landing tables).
2. `index.js` — **validate-on-load** (asserts the whole registry at import; throws a
   precise error on any malformed entry, exactly as `lib/knowledge/schema.js` disciplines
   the KB) + the lookup/validation API:
   - `getMetric(id)` · `isKnownMetric(id)` · `privacyClassOf(id)` · `precedenceFor(id)`
   - `reliabilityFor(id, provenanceClass)` — the per-class default, or `null`
   - `validateObservation({metric_id, provenance_class})` → `{ok, errors[]}` — the seam
     Phase-3 adapters call; enforces §2.1.1 hard rule (1)
   - `mayCrossToRollUp(id)` → `privacyClassOf(id) === 'derived-safe'` — the privacy-
     validator hook (rule 6 of the §4.2 propagation rule)
   - `assertValidRegistry()` · re-exports the data + version

Engine public surface (`packages/engine/index.js`): export the metrics API additively.

## Verification

- **New** `packages/engine/tests/metric-dictionary.test.mjs` (added to the engine suite):
  1. validate-on-load throws on a deliberately malformed entry (bad id / unknown
     provenance class / min>max / missing privacy class) — the discipline is real;
  2. every id is unique + dotted-lowercase; every `sources` class ∈ the closed set;
     every `precedence` ⊆ its sources;
  3. **both** privacy classes are present (non-vacuous): ≥1 `raw-vital`, ≥1 `derived-safe`;
  4. the v1 metrics are present and each `storesTo` names a real M5 table (or null);
  5. `validateObservation` accepts a well-formed sport datum and **rejects** an unknown
     `metric_id` and a provenance class the metric does not permit (both directions tested
     — non-vacuous);
  6. `mayCrossToRollUp('hrv.rmssd.night') === false` and
     `mayCrossToRollUp('exposure.minutes.match') === true`.
- **No** golden-master change, **no** KSV bump (registry is outside the ratchet hash set —
  asserted by the whole engine suite staying green with `KNOWLEDGE_SET_VERSION` untouched).
- `npm test` (engine + app) green; `npm run lint` green; `npm run dev` still boots.

## Explicitly NOT in this slice (Simon's / later Phase-3 tasks)

- The schema migration(s) + RLS proofs for any *new* columns (the M5 tables already exist;
  only additive columns, if any, would need a migration — deferred, none needed for v1).
- The ACL **adapters** that *write* observations (manual entry first, then vendor GPS
  vests) + the logging **surface** in the app — additive, but they *consume* this registry,
  so the registry lands first.
- The CI privacy sweep wiring (reads `mayCrossToRollUp` / privacy classes) — a follow-up
  once a boundary actually writes.
