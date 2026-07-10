# Platform Data Dictionary

**Performance OS — every important domain object, explained in coaching terms**
Audience: the founder. Each entry answers: what does this represent in the real world, who owns it, what does it contain, who creates/reads it, where does it flow, is it mutable, is it persistent, and what's the single source of truth.

This document deliberately does **not** copy interfaces or type definitions verbatim — it explains what each object means to a coach or athlete, then gives just enough structural detail to be useful.

---

## How objects are grouped

1. Identity & Access
2. Athlete Representation (the "who is this person" layer)
3. Sport & Demand Knowledge
4. The Diagnosis (the "what do they need" layer)
5. The Plan Hierarchy (the "what did we prescribe" layer)
6. Session Content
7. Physiological State (readiness, load, recovery, fatigue)
8. Injury
9. Team & Coaching
10. Knowledge & Governance
11. Learning & AI

---

## 1. Identity & Access

### User
**Purpose.** The account — one row per signed-up person, whether they use the platform as a player, a coach, or both.
**Owner (in coaching terms).** The person themself, always.
**Fields (plain English).** Name, email, a freeform `profile` blob (age, bodyweight, height, sex, goals, and — nested inside it — the whole Athlete Model), a `settings` blob (units, pool length, theme).
**Relationships.** One `User` → many `Sessions`, `Injuries`, `daily_metrics` rows, `TrainingPlans`; optionally → one or more `TeamMembership` rows (as coach or player).
**Who creates it.** Supabase Auth on signup (a database trigger, `handle_new_user`, auto-creates the matching app-facing row).
**Who consumes it.** Every screen in the mobile app; the coach dashboard only ever reads a name via a server-derived function, never this table directly.
**Mutable?** Yes — a person can change their name, goals, settings at any time.
**Persistent?** Yes, indefinitely, until account deletion.
**Source of truth.** Supabase `users` table (owner-only Row-Level Security — `auth.uid() = id`, no exceptions, no coach access).

### TeamMembership
**Purpose.** The record of one person belonging to one team, in one role.
**Fields.** Team, user, role (`coach` or `player`), status (`invited`, `active`, `left`).
**Who creates it.** A coach founding a team (self as coach), or a player joining via a share code.
**Who consumes it.** RLS policies across the platform use this to decide who may see what; the dashboard's roster view.
**Mutable?** Role/team/user cannot be changed by the member themself (a database trigger explicitly blocks a member from promoting their own role) — only a coach can change another member's role/status.
**Persistent?** Yes.
**Source of truth.** Supabase `team_members` table.

---

## 2. Athlete Representation

### AthleteProfile (the legacy shape)
**Purpose.** What the plan generator has read since the very first version of the product: goal, sport, experience level, training days, equipment access, tracked lift 1RMs, plan start date.
**Owner.** The athlete.
**Who creates it.** The onboarding wizard.
**Who consumes it.** `generatePlan()` — every plan generated today ultimately reads this shape (even when an Athlete Model exists, it's translated back into this shape via an adapter before the engine reads it).
**Mutable?** Yes — updated whenever the user changes a setting, re-onboards, or logs a new lift.
**Persistent?** Yes.
**Source of truth.** `users.profile` (a JSONB column).

### AthleteModel (the newer, richer representation)
**Purpose.** The foundation for the diagnosis-first re-seat — a structured, versioned representation of the whole athlete: identity, goals (plural, prioritised), sporting context (sport, position, level, competition calendar), training history (years training, specific-movement competency, not just a vague "beginner/advanced" label), constraints (equipment, injuries, medical restrictions, travel/shift-work), lifestyle (sleep quality, stress, recovery opportunities), assessments and performance metrics (structured, source- and confidence-tagged), and `learnedPriors` (currently always population defaults — the slot a future learning system writes into).
**Owner.** The athlete (this is still their data — the richer shape doesn't change who owns it).
**Who creates it.** Built from onboarding answers alongside the legacy profile (dual-write); every stored field is justified against a "why do we collect this, what decision does it serve" registry, mechanically checked by a test.
**Who consumes it today.** The Performance Model (diagnosis); two user-facing screens (Atlas, Block Check-in) that show diagnosis insight directly from it. The diagnosis it feeds now steers plan generation for **all cohorts** — build goals via the discipline engine since the 2026-07-07 build flip, every sport via the diagnosis-steered sport paths (see the Architecture Atlas §4.0). *(updated 2026-07-09)*
**Mutable?** Yes, versioned — an older stored model is automatically "upgraded" (missing fields defaulted) rather than migrated destructively.
**Persistent?** Yes.
**Source of truth.** `users.profile.athlete_model` (a nested JSONB sub-object, versioned).

### Capability
**Purpose.** How good the athlete currently is at ONE physical quality (see below), with an honest confidence tag.
**Fields.** Quality id, level (0–1), source (`measured` / `inferred`), confidence, evidence, last-updated date.
**Who creates it.** The estimation layer — measured from a logged 1RM (only max strength has a real measured path today; every other quality falls back to a population or sport-experience prior), or inferred from training-age band / sport experience.
**Who consumes it.** The diagnosis (D4).
**Mutable?** Recomputed fresh every time a diagnosis runs (not stored independently).
**Persistent?** Not itself persisted as a row — it's a computed value, deterministically re-derivable from the Athlete Model at any time.
**Source of truth.** Derived, not stored — the underlying inputs (1RMs, training history) are the persisted truth.

### DemandProfile
**Purpose.** What a sport (and specific position within it) actually requires of an athlete's body, expressed as an importance weight (0–1) per physical quality.
**Who creates it.** Built from the Sport Knowledge Base for sport athletes, or from a hand-authored "goal demand" table for pure gym-goal athletes (so even a non-sport user gets a real demand profile, never a null one).
**Who consumes it.** The diagnosis (D4), alongside Capability.
**Mutable?** Recomputed, not stored.
**Persistent?** No — derived from the Sport Knowledge Base (which is itself persistent, versioned data) and the athlete's chosen sport/position.

### LimitingFactor
**Purpose.** The gap between what a quality demands and what the athlete currently has — the actual output of "diagnosis." Ranked by magnitude (gap × importance × trainability-at-this-training-age × injury-risk-relevance).
**Who creates it.** D4 (`diagnose.js`).
**Who consumes it.** D5 (prioritisation); the two user-facing "here's your #1 limiting factor" screens.
**Mutable?** Recomputed every time; not itself stored as a persistent row (though it can be surfaced/displayed and thus effectively "seen" by a user at a point in time).
**Persistent?** No — always freshly derived. (A record of a *specific* diagnosis at a point in time is effectively persisted only insofar as it's embedded in a generated plan's `meta.diagnosis`, when shown.)

### PriorityAdaptation
**Purpose.** The 1–3 physical qualities actually chosen to develop this training block, after filtering out anything that conflicts with a higher-ranked pick (e.g. never simultaneously prioritise max-strength and aerobic capacity — the classic interference effect).
**Who creates it.** D5 (`prioritise.js`).
**Who consumes it.** Session objective derivation (D9), and actual exercise selection (D11) — for all cohorts since the 2026-07-07 build flip. *(updated 2026-07-09)*
**Persistent?** No — derived fresh each time; embedded in a generated plan's metadata when it actually steered that plan.

---

## 3. Sport & Demand Knowledge

### Sport (Sport Knowledge Base entry)
**Purpose.** Everything the platform knows about one sport: physical-quality importances, energy-system mix, movement/injury-risk profile, position modifiers, season/microcycle structure, an exercise library tagged with transfer-to-sport ratings, machine-readable decision rules (e.g. "if a competition is within 24 hours, reduce volume"), a readiness-weighting model, a KPI framework.
**Owner.** A sports scientist/domain expert (in principle — the SKB is explicitly designed to be authorable/reviewable without reading code).
**Who creates it.** Authored as a large, structured JSON file per sport (11 sports today, all scoring "complete").
**Who consumes it.** The demand-profile builder; the onboarding sport/position picker (the visible sport list is literally derived from which SKB entries are complete and have an engine binding); category-coverage-based exercise selection for the sports that need it.
**Mutable?** Yes, but as a deliberate content-authoring act, not a runtime computation.
**Persistent?** Yes — versioned JSON files in the engine package, not a database table.
**Source of truth.** `packages/engine/src/data/sport-knowledge/*.json`.
**Note (updated 2026-07-09).** Each sport's `seasonalModel` now carries a per-phase, machine-consumable `programming` block (off-season / pre-season / competition) that the engine reads directly — season-phased programming is live for all 11 sports, with the phase detected from the athlete's season window (first/last game dates). The SKB is also the **sole** source for sport gym-support data (the legacy `sportGymSupport` layer was deleted, PR #160), and the onboarding sport enum is derived from the engine binding (`ENGINE_SPORT_IDS`, PR #161) rather than hand-copied.

### PhysicalQuality
**Purpose.** One of 10 distinct athletic capacities the platform reasons about separately, rather than treating "fitness" as one blob: max strength, hypertrophy, explosive strength, reactive strength, strength endurance, aerobic capacity, anaerobic capacity, mobility, stability, robustness.
**Fields.** Which physiological adaptations build it, how fatiguing it is to train (neural/metabolic/mechanical), how it responds to training age, evidence-based dosing.
**Who creates/owns it.** Authored, governed knowledge (evidence-tagged, explicitly labelled "seed... not yet exhaustive").
**Who consumes it.** Nearly every part of the diagnosis and session-building layers.
**Mutable?** As a deliberate content decision, not at runtime.
**Persistent?** Yes — a data file, not a database table.
**Source of truth.** `packages/engine/src/data/qualities.js`.

### Adaptation
**Purpose.** The actual physiological mechanism underneath a quality — e.g. "myofibrillar hypertrophy" develops both max strength and hypertrophy; a many-to-many relationship (one adaptation can feed multiple qualities).
**Persistent?** Yes, as governed data. **Source of truth.** `packages/engine/src/data/adaptations.js`.

---

## 4. The Diagnosis Layer — see also Section 2 & 3 above

(Capability, DemandProfile, LimitingFactor, and PriorityAdaptation are all part of "the diagnosis" and are covered above since they're derived directly from the Athlete Model and Sport knowledge; they're not a separate stored object family.)

### Decision (the general concept)
**Purpose.** The platform's atomic unit of reasoning — not "generate a session" but a specific, named, inspectable step (e.g. D4 Diagnose, D9 Session Objective, D14 Validate), each carrying a rationale and a confidence. The Decision Ontology names 16 of these (D1–D16); as of this document, roughly half are fully live, some are gated/partial, a few (D6 Strategy, full D16 population learning) don't exist as first-class objects yet.
**Persistent?** Not itself a stored row — it's an architectural concept realised as specific function calls (`diagnoseLimitingFactors`, `deriveSessionObjective`, `validateWeek`, etc.) whose *outputs* are sometimes persisted (embedded in a plan) and sometimes purely computed on demand.

### KnowledgeEntry
**Purpose.** A single piece of governed scientific knowledge the engine consumes — e.g. "weekly volume landmarks per muscle," "ACWR sweet-spot thresholds," "confidence → authority mapping." Every entry carries a citation, an evidence level (L1 meta-analysis → L5 expert opinion), a confidence rating (high/moderate/low), and a last-reviewed date.
**Who creates it.** Whoever authors/reviews the underlying science — a deliberate, reviewed content act, schema-validated on load (a malformed entry is rejected, not silently accepted).
**Who consumes it.** Nearly every coaching-decision module in the engine, via a single read interface (`kb.value(id)`) that throws on an unknown id (a fail-fast typo guard).
**Mutable?** Yes, as a governed content change (each engine build stamps a `KNOWLEDGE_SET_VERSION`, e.g. progressed 1.0.0 → 1.8.0 across one recent sprint).
**Persistent?** Yes. **Source of truth.** `packages/engine/src/lib/knowledge/entries.js`.

---

## 5. The Plan Hierarchy

### TrainingPlan
**Purpose.** The top of the periodisation hierarchy — one generated programme, with a name, a start date, a target end date, a status (active/paused/completed/archived).
**Who creates it.** The engine's `generatePlan()`, orchestrated by `PlanService.js`.
**Who consumes it.** Every plan-browsing screen.
**Mutable?** The underlying generated content is a **pure, immutable output** of `generatePlan(profile)` — the SAME profile always regenerates the SAME plan. What changes over time is the *profile* (new lifts logged, injuries added) and the *runtime reflow* layered on top for the current/next week only; the base plan itself is never mutated in place.
**Persistent?** Yes.
**Source of truth.** Supabase `training_plans` table (row metadata) + the deterministically-regenerable plan content itself (not separately stored as a blob — regenerated from the profile on demand, then reflowed).

### Phase (a Mesocycle/Block)
**Purpose.** A multi-week chunk of the plan with one dominant training emphasis (e.g. a "Base" phase, a "Peak" phase). Carries a week range and — for provisional future phases — an explicit "this may still adapt" flag.
**Mutable?** No, once generated (part of the pure plan). **Persistent?** Yes, `phases` table (row-level tracking of status only; content is regenerable).

### Week (a Microcycle)
**Purpose.** One week inside a phase — carries a deload flag, a theme, and (at runtime) a set of adaptation annotations (`_adapted`, `_ruleTrim`, `deloadReason`, `_catchUp`) that make visible *why* this week looks the way it does, if it was reshaped by the reflow.
**Mutable?** The CURRENT and NEXT week only can be reshaped by the runtime reflow (readiness, load, missed volume, injuries, sport rules); every week beyond that is untouched until it becomes current.
**Persistent?** Yes, `weeks` table (status/deload tracking); full content regenerable + reflow-adjusted.

### Session
**Purpose.** One prescribed workout — a day's training, with an ordered list of exercise items, a day label, a status (pending/in_progress/completed/skipped), and a stable `template_ref` id (e.g. `p1_wk5_s0`) that survives regeneration and reflow so the app can always find "the same slot."
**Who creates it.** The allocator (`allocateGym`) as part of plan generation; individually re-derived by the reflow when its inputs change.
**Who consumes it.** Nearly every screen in the Daily Session Execution journey.
**Mutable?** Yes, at the STATE level (started/completed/skipped, logged ratings) — always via a store action, never a direct database write from a screen. The *content* becomes immutable the moment the user starts it (freeze-on-start).
**Persistent?** Yes. **Source of truth.** Supabase `sessions` table (state) + `session_logs` (post-session ratings, HR summary) + `set_logs` (per-set actual weight/reps/RPE — real training history, distinct from ephemeral in-session UI ticks).

### SessionObjective / MovementRequirement (D9/D10)
**Purpose.** The session's single named purpose (a target quality, an intensity zone, a fatigue budget) and the movement characteristics that purpose implies (which patterns, at what force-velocity) — derived BEFORE any specific exercise is chosen.
**Persistent?** No — computed fresh; live for every cohort since the 2026-07-07 build flip. *(updated 2026-07-09)*

---

## 6. Session Content

### Exercise
**Purpose.** One entry in the ~118-exercise catalogue the engine can select from — tagged with movement pattern, equipment needed, experience-level gate, spinal load, which physical quality/qualities it primarily and secondarily develops, force-velocity profile, and (for sport-specific work) sport/goal tags.
**Who creates/owns it.** Authored, governed content.
**Who consumes it.** Exercise selection, substitution, injury-contraindication matching (by rendered name — a known, documented fragility), volume accounting.
**Persistent?** Yes, as a data file, not a database table. **Source of truth.** `packages/engine/src/data/strengthExercises.js`.

### Dose (Programming Variables)
**Purpose.** The `{sets × reps, RPE}` (or duration/distance for non-strength work) prescription for a lift, indexed by scheme key × training phase, extracted into governed data specifically so a non-engineer can audit the actual prescriptions real people receive.
**Persistent?** Yes, as governed data. **Source of truth.** `packages/engine/src/data/doseSchemes.js`.

### MuscleVolume / VolumeLandmark
**Purpose.** The MEV (Minimum Effective Volume) / MAV (Maximum Adaptive Volume) / MRV (Maximum Recoverable Volume) weekly set-count landmarks per muscle group — the safety ledger that all exercise selection, however it's driven, is still checked against.
**Persistent?** Yes, governed knowledge. **Source of truth.** `packages/engine/src/data/muscleVolume.js` (reading landmark VALUES from the knowledge base).

---

## 7. Physiological State — Readiness, Recovery, Fatigue, Load

### DailyMetric
**Purpose.** One row per user per day: everything about how the person's body is doing that day — objective wearable data (resting heart rate, HRV, sleep stages/duration/score, SpO2, steps, active minutes) and subjective self-report (energy, soreness, mood, stress, illness/travel flags).
**Who creates it.** The user (manual entry) or an automated wearable sync (Google Health API today, historically named "Fitbit" in code).
**Who consumes it.** Every index in the Recovery/Readiness/Load layer.
**Mutable?** Yes (a user can edit a manual entry; a wearable sync upserts idempotently by date).
**Persistent?** Yes. **Source of truth.** Supabase `daily_metrics` table — the single most sensitive table in the schema; **never** readable by a coach, under any circumstance.

### Readiness (the Readiness Index)
**Purpose.** The single "can I train hard today" number (0–100) the plan actually reacts to — a blend of sub-indices (sleep, cardiovascular recovery, subjective wellness, recovery, fatigue, and optionally training load / recovery capacity / consistency), each carrying its own value, confidence, and band.
**Who creates it.** `indices/readinessIndex.js`, computed fresh from `DailyMetric` + recent session-recovery ratings.
**Who consumes it.** `PlanService`'s reflow (volume/RPE adjustment, deload triggers); several UI screens.
**Persistent?** No — always freshly derived; never stored as a row (by design — it must always reflect the current state of the underlying data, not a stale snapshot).

### Load / ACWR
**Purpose.** The acute (7-day):chronic (28-day) training-load ratio, computed from heart-rate-zone-weighted session load (or a duration-based estimate). A deliberately weakened signal (see ADR-07) — can nudge volume down modestly alone, can only corroborate (never solely trigger) a hard deload.
**Who creates it.** `plan/trainingLoad.js`.
**Who consumes it.** The reflow's deload/ease/nudge-up decision; the coach dashboard's team-load view (once history exists — currently always empty there).
**Persistent?** The underlying session/workout data is persistent; the ratio itself is always freshly computed, never stored.

### Fatigue / RecoveryCapacity / Consistency
**Purpose.** Supporting sub-indices: how depleted the athlete currently is (fatigue), their trait-level ability to absorb and recover from training over time (recovery capacity — a ceiling modifier), and how behaviourally reliable their check-in/session-logging habit is (consistency — a confidence modifier, not a training-content driver).
**Persistent?** No — all derived on demand.

---

## 8. Injury

### InjuryProfile (the knowledge object)
**Purpose.** The reference entry for one body region (14 regions total): what's contraindicated at each of 4 recovery phases (Protect → Early Motion → Loading → Return to Sport), known risk factors, prevention/"prehab" exercises, and return-to-performance milestones.
**Owner.** Authored, governed content (the model the whole engine is meant to follow: small reasoning code over a large structured knowledge base).
**Persistent?** Yes, governed data. **Source of truth.** `packages/engine/src/lib/injury/profiles.js`.

### Injury (the athlete's own record)
**Purpose.** A specific injury a specific person reported: body part, side, diagnosis (if known), severity (1–5), status (active/rehabbing/recovered/monitoring), rehab phase, structured triage flags (red-flag triggered, referred to a professional), a free-text recovery log, prevention notes.
**Who creates it.** The user, via a guided triage flow (physio-diagnosed path or a self-assessment symptom questionnaire with genuine clinical red-flag safety nets).
**Who consumes it.** The injury filter (blocks/substitutes exercises in the generated plan), the diagnosis's injury-risk weighting, and — in derived, non-clinical form only — the coach-visible `injury_status` field.
**Mutable?** Yes — status/phase/severity update as the person recovers.
**Persistent?** Yes. **Source of truth.** Supabase `injuries` table — clinical detail never leaves the owner; only a coarse status (available/modified/out) is ever derived for a coach to see.

---

## 9. Team & Coaching

### Team
**Purpose.** A coach's squad — name, sport, season phase (in/off/pre), a weekly schedule + fixture list (jsonb), a join code.
**Who creates it.** A coach, via the "found a team" flow.
**Who consumes it.** `applyTeamSchedule()` (turns the schedule into constraints on every player's individual plan), the coach dashboard's Constraints view.
**Mutable?** Yes, coach-only for schedule/sport/season; the join code is protected even from the roster (only the coach can retrieve it, via a dedicated function).
**Persistent?** Yes. **Source of truth.** Supabase `teams` table.

### PlayerStatus
**Purpose.** The ONLY per-player table a coach can ever read — readiness (a number), load_state, ACWR, adherence percentage, injury status (available/modified/out), display name. Two of these fields are server-derived (can't be spoofed by the player's own device); the rest are client-computed but clamped.
**Who creates it.** The player's own device pushes this after any relevant change (a completed session, an injury update); a server trigger overwrites the safety-relevant fields from source-of-truth tables.
**Who consumes it.** The coach dashboard, via `rollUp()` (the same function used identically on both the mobile and web sides).
**Mutable?** Yes, continuously refreshed.
**Persistent?** Yes. **Source of truth.** Supabase `player_status` table — the entire technical mechanism behind the platform's "coach sees derived signal only, never raw vitals" rule.

### WearableConnection
**Purpose.** One connected device/provider per user (Google Health, historically labelled Fitbit in code; Strava) — OAuth tokens, connection status, which device (if any) supplies the "baseline" recovery metrics when more than one is connected.
**Mutable?** Yes. **Persistent?** Yes. **Source of truth.** Supabase `wearable_connections` — the tokens themselves are excluded from the browser's column grant, so even the owning user's own client can't read its own access/refresh tokens directly; only the server-side Edge Functions (using the service_role key) can.

---

## 10. Knowledge & Governance

### The five (soon six) frozen governance documents
Covered in the Architecture Atlas §2 and the ADR — these are documents, not data rows, but they function as the platform's highest-authority "objects": every feature is validated against them, and changing one requires a formal, versioned amendment.

### Authority Tier
**Purpose.** The decision-facing translation of a KnowledgeEntry's confidence rating: `gate` (may force/veto a decision alone), `soft` (may scale a decision alone), `reported` (may only corroborate, never act alone). This is what keeps contested science (like ACWR) from being able to make strong calls unilaterally — a general mechanism, not a special case per metric.
**Persistent?** The mapping itself is governed knowledge (`knowledge.authority.mapping`); the *result* for any given entry is computed on demand, not stored.

---

## 11. Learning & AI

### StagedPrior / LearnedPrior
**Purpose.** A candidate adjustment to how the engine treats a specific athlete, generated by comparing a training block's actual outcome against its diagnosis (did tracked lifts improve, did recovery hold up). `StagedPrior` = computed, not yet trusted, nothing reads it. `LearnedPrior` = the same value, promoted by a deliberate human decision, which the engine DOES read (currently for exactly one gated decision — block-length/deload-cadence steering).
**Who creates it.** `learning/blockOutcome.js` (staged); a human decision (promotion to learned).
**Mutable?** Yes.
**Persistent?** Yes, both stored on the Athlete Model (`learnedPriors`, `stagedPriors`).

### DecisionContract (the AI seam)
**Purpose.** The formal gate a proposed replacement for one specific decision (today: only D11, exercise selection) must pass before being used — it's re-validated by the exact same deterministic checks any human-built week must pass, and rejected outright on any finding worse than "pass."
**Who creates it.** Declared, per decision, in `ai/contracts.js` — currently only D11 has a live contract; D4/D5 are named future candidates, explicitly not yet declared pending an evaluation harness that doesn't exist yet.
**Persistent?** The contract definitions are code/config, not data rows; a specific AI *proposal* (when this feature eventually goes live) would be an ephemeral, validated-or-rejected object, not something persisted as a plan unless it passes.

---

## Source-of-truth quick reference

| Domain | Source of truth |
|---|---|
| Identity, auth session | Supabase Auth + `users` table |
| Legacy athlete profile | `users.profile` (JSONB) |
| Athlete Model | `users.profile.athlete_model` (JSONB, versioned) |
| Sport knowledge | `packages/engine/src/data/sport-knowledge/*.json` |
| Physical qualities, adaptations, dose schemes, volume landmarks | `packages/engine/src/data/*.js` (governed, evidence-tagged) |
| Generated plan content | Deterministically regenerated from the profile (`generatePlan()`); never stored as an opaque blob |
| Session state, logs, sets | Supabase `sessions`, `session_logs`, `set_logs` |
| Daily physiological data | Supabase `daily_metrics` (never coach-visible) |
| Injuries | Supabase `injuries` (never coach-visible in raw form) |
| Team, roster | Supabase `teams`, `team_members` |
| Coach-visible player signal | Supabase `player_status` (the ONLY coach-readable per-player row) |
| Knowledge base entries | `packages/engine/src/lib/knowledge/entries.js` |
| Governance documents | `docs/foundation/`, `docs/engine/00-...`, `docs/architecture/TAS.md` (frozen) |
