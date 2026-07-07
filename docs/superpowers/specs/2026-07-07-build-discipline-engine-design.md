# Build Discipline Engine — Design Spec (WP-49, the build flip)

**Date:** 2026-07-07 · **Status:** design approved (brainstorming), spec under review · **Owner:** Simon
**Governing docs:** validated against the frozen set — EDS (diagnosis-first, muscle-volume as a
downstream ledger), Constitution Art 3 (goal is athlete data), Art 5 (diagnosis precedes
prescription), Art 8 (safety overrides), Art 14 (explainable), Art 17 (knowledge separate from
reasoning). This is the long-flagged WP-49 "build flip," now scoped as a discipline-knowledge engine.

---

## 1. Why this exists (the goal, in plain English)

Today the largest cohort — people whose goal is a gym outcome (get stronger / build muscle /
functional fitness) — get a **shallow, volume-first plan**: a `strength_style` nudges per-muscle
emphasis and a greedy allocator fills per-muscle set targets. There is no diagnosis of what the
individual actually lacks. Sports, by contrast, run **diagnosis-first**: the sport creates a demand,
the engine finds where the athlete falls short of it, and targets that.

This project gives the strength disciplines the **same diagnosis-first treatment**. Each discipline
(hypertrophy, powerlifting, Olympic weightlifting) becomes a first-class **knowledge module** that
defines its demand; a build athlete is then diagnosed and programmed through the *same* decision
chain the sports use. The legacy volume-first path for build is removed.

### Decisions locked in brainstorming (2026-07-07)
1. **Discipline set = REPLACE.** Hypertrophy, powerlifting, and Olympic weightlifting become THE
   build disciplines. `build muscle → hypertrophy`, `get stronger → powerlifting`, `Olympic` is new.
   "Functional fitness" is retired as a build style and folds into the **conditioning** secondary goal.
2. **Secondary goals = a FIXED MENU of add-ons** (posture/anti-desk-job, prehab, mobility,
   conditioning). They add corrective/accessory work + gentle emphasis but NEVER override the
   discipline's main lifts or a safety constraint.
3. **Rollout = DIRECT FLIP.** Build immediately runs the new engine; the legacy path is deleted in
   the same change. Every build plan changes at once (large, audited golden re-baseline). No gated
   parallel soak (unlike the sport flips).
4. **Architecture = Approach A.** First-class discipline knowledge modules parallel to the sport
   modules, feeding the SAME diagnosis→selection engine. (Not disciplines-as-sports; not
   goalDemand-only.)

### Success criteria
- A build athlete's plan is driven by their diagnosis against their chosen discipline: a powerlifter
  with a lagging bench gets more bench-specific work; a hypertrophy athlete's lagging muscle groups
  get the volume; an Olympic athlete limited by overhead mobility gets it addressed.
- Each discipline has a reviewable knowledge file; changing programming policy is a knowledge edit.
- Sports are byte-identical (the flip touches only build).
- The legacy volume-first build path no longer exists; the volume ledger remains as the downstream
  accountant (per the EDS), not the driver.
- Secondary goals visibly change only the accessory tail.

---

## 2. The discipline knowledge modules (the core deliverable)

Location: `packages/engine/src/data/disciplines/{hypertrophy,powerlifting,olympic}.js`, with a
`_schema.js` (validator, parallel to `sportGymSupport/_schema.js`) and an `index.js` registry.

### 2.1 Module shape (`DisciplineModule`)
```
{
  id,                    // 'hypertrophy' | 'powerlifting' | 'olympic'
  label,
  demand,               // { qualityId: 0..1 } — the quality-importance vector the DIAGNOSIS reads.
                        //   Replaces/supersedes the goalDemand.js GOAL_DEMAND entries. The LEAD
                        //   quality is definitional (evidence:'goal'); supporting weights are
                        //   coaching judgement (confidence:'low', needsReview:true).
  priorityLifts,        // ordered exId[] — the competition/core lifts the plan is built around
                        //   (anchor the sessions; get weak-lift targeting from the diagnosis).
  periodization,        // { off|pre|in|transition: BlockTemplate } — the discipline's block shape.
                        //   Build has no "season", so a build athlete uses the 'off' template by
                        //   default (a full development macrocycle), with an event/peak overlay if a
                        //   meet date is entered (powerlifting/Olympic) — reuses the proven taper.
  doseCharacter,        // rep/intensity/rest profile per role (main/accessory), e.g.
                        //   powerlifting main: 1–5 reps, RPE 7–9, long rest; hypertrophy main:
                        //   6–12, RPE 7–8, short rest; Olympic main: 1–3 explosive, full rest.
  accessoryPatterns,    // the supporting-work model: hypertrophy → per-muscle MEV→MAV balance;
                        //   powerlifting → lift-specific weak-point patterns; Olympic → positions +
                        //   pulling strength + overhead stability.
  provenance,           // source + evidenceLevel + needsReview flags (seed content, SME sign-off)
}
```
`BlockTemplate` reuses the sport shape: `{ totalWeeks, split:[{intent,weeks}], deloads:[] }`.

### 2.2 Seed content (mine to draft from standard S&C; ships `needsReview` for Simon/SME sign-off)
- **Powerlifting.** Demand: maxStrength 1.0 (definitional), hypertrophy 0.6 (CSA base), robustness
  0.5, stability 0.4, mobility 0.35. Priority lifts: back squat, bench press, deadlift + competition
  variants (paused bench, deficit/rack pull, pause/pin squat). Periodisation: accumulation →
  intensification → peak/taper (meet overlay if a date is entered). Dose: main heavy low-rep, long
  rest; accessories moderate. **Diagnosis targets the lagging competition lift (e1RM-driven).**
- **Hypertrophy.** Demand: hypertrophy 1.0, maxStrength 0.6 (progressive tension), strengthEndurance
  0.4, robustness 0.45, mobility 0.35. Priority: compound + isolation across all muscle groups.
  Periodisation: volume accumulation → deload. Dose: moderate rep, higher volume, short rest;
  lengthened-position bias. **Diagnosis targets lagging muscle groups; the volume ledger is central.**
- **Olympic.** Demand: explosiveStrength/power 1.0 (definitional), maxStrength 0.8 (strength underpins
  the lifts), mobility 0.7 (overhead/squat positions gate everything — weighted unusually high),
  stability 0.5. Priority: snatch, clean & jerk + derivatives, front/overhead squat, pulls, push
  press. Periodisation: technical-power + strength blocks; frequent classic-lift exposure. Dose:
  low-rep explosive, full recovery, high technical frequency. **Diagnosis targets mobility / leg
  strength / the weaker classic lift.**

---

## 3. Catalogue dependency (the biggest authoring chunk)

The exercise catalogue (`packages/engine/src/data/strengthExercises.js`, 118 entries) HAS the
powerlifting/hypertrophy lifts (squat/bench/deadlift + variants, Front squat, Power/Hang Clean, Rack
Pull, Pause Squat) but is **missing most Olympic lifts.** New entries needed (~8–12), each authored
to the FULL schema (id, name, pattern, equip, level, role, `axialLoad`, `liftKey`/`PROGRESSION_LIFTS`
if trackable, muscle-contribution map for the volume ledger, `CORE_HOLDS`/quality tags, and
`exerciseLibrary` form-guide content):
- **Olympic:** snatch, clean & jerk (full), power snatch, split jerk, overhead squat, push press,
  snatch pull, clean pull, muscle snatch, hang snatch. (Power clean, hang clean, front squat exist.)
- **Powerlifting variants (few):** board press / Spoto press, pin squat. (Most exist.)

New exercises must carry correct `axialLoad` (Olympic lifts are high-axial), quality tags (power),
and muscle maps so the volume ledger, de-spine, and validators all handle them. This is a discrete,
reviewable sub-task and the largest single piece of the build.

---

## 4. The flip mechanics (a build athlete's decision chain)

1. **Onboarding → discipline + secondary goals.** The profile carries `discipline` (replaces
   `strength_style`) and `secondaryGoals: string[]`.
2. **Assess (D1).** Unchanged — experience, entered lifts, capability → athlete model.
3. **Demand (D2).** The discipline module's `demand` IS the demand profile (as a sport's is).
4. **Diagnose + prioritise (D4/D5).** demand × capability → limiters → priority qualities. Already
   works for build (WP-42a); the flip feeds richer demand and lets it steer.
5. **Periodise (D6/D7).** The discipline's periodisation template drives block structure (reuses the
   D7 block-objective machinery from WP-47; the discipline is the objective source). Meet/peak taper
   overlay if a date is entered.
6. **Select (D9–D11).** REMOVE the `style === 'sport'` gate (`diagnosisSteers` in allocator +
   PlanGenerator). Build routes through diagnosis-driven / category-led selection: discipline
   priority lifts anchor sessions; diagnosis priority qualities + discipline accessory patterns +
   secondary-goal corrective work fill the rest.
7. **Dose (D12).** The discipline's `doseCharacter` sets rep/intensity/rest per role.

**"Remove the old engine" means:** delete the volume-*first* driving logic for build — the
strength/bodybuilding/functional emphasis branch in `resolveProgram`, and build's use of the greedy
per-muscle fill as its *primary* driver. KEEP the **volume ledger** (`countWeeklyVolume`, MEV→MAV→MRV
landmarks, the MRV ceiling validator) as the downstream accountant under the diagnosis — exactly the
EDS's "diagnosis-first, muscle-volume as a downstream ledger." For hypertrophy the ledger stays
central; it just now serves the diagnosis (lagging muscles) instead of being the whole engine.

**Sports unaffected** — they already run this chain; the flip only changes which cohorts pass the gate.

---

## 5. Secondary goals (`packages/engine/src/data/secondaryGoals.js`)

A fixed menu the athlete multi-selects (0..N). Each entry:
```
{ id, label, correctivePatterns[], emphasisModifier{muscle:×}, accessoryPreferences[exId], targetAreas[] }
```
Menu:
1. **posture** (anti-desk-job) — upper-back/rear-delt/external-rotation, hip-flexor mobility, glute
   activation, thoracic extension.
2. **prehab** — rotator-cuff + knee/hip stability, tendon-friendly eccentrics (the "no injury, wants
   insurance" sibling of the injury system).
3. **mobility** — full-ROM + flexibility emphasis, longer warm-up primers.
4. **conditioning** — a work-capacity finisher / higher-density accessory blocks (absorbs old
   "functional fitness").

**Behaviour (the hard rule):** secondary goals layer AFTER the discipline diagnosis and compete ONLY
for the accessory/finisher slots. Authority order: **safety > discipline main work > diagnosis
priorities > secondary-goal corrective work.** They may bias what fills the accessory tail and nudge
emphasis; they may NEVER displace a priority lift, cut the main work below its dose, or override an
injury constraint. Experience level gates which corrective drills are appropriate.

---

## 6. Removed / migrated

- `resolveProgram` (strength/program.js): strength/bodybuilding/functional style + emphasis branch → discipline resolution.
- `diagnosisSteers` gate: drop the `style === 'sport'` requirement for build.
- `periodization.js`: legacy per-style PROFILES (strength/hypertrophy/functional) for build → discipline templates.
- `goalDemand.js` `GOAL_DEMAND`: refactored into the disciplines' `demand` vectors (one source).
- **Onboarding UI (apps/mobile):** style choice → discipline picker + secondary-goals multi-select.
- **Existing-user migration:** one-time profile map `strength → powerlifting`, `bodybuilding →
  hypertrophy`, `functional → hypertrophy + conditioning` (a safe default; users can re-pick). No
  existing build profile ends up invalid.

---

## 7. Testing & safety

- **Golden re-baseline is LARGE and INTENTIONAL** (unlike recent PRs). Every build archetype's plan
  changes — that IS the flip. Audit flips from "byte-identical" to "each changed build plan reviewed
  against its discipline." Add per-discipline build archetypes to `golden-master.js`; audit each new
  plan (does it read as a coherent powerlifting/hypertrophy/Olympic programme?).
- **Sports byte-identical** — a regression assertion pinning the sport archetypes proves the flip
  touched only build.
- **New behavioural tests:** each discipline yields a valid, coherent plan; the diagnosis targets the
  right limiters (weak lift / weak muscle / mobility); secondary goals only ever alter the accessory
  tail; Olympic lifts get correct axial spacing + technical frequency; a beginner is competency-gated.
- **Validation (D14):** every flipped build plan passes the runtime validators (injury, MRV,
  equipment, duration, purpose-coherence).
- **Determinism (Art 18):** same profile → same plan, test-pinned.
- **Knowledge governance:** the discipline + secondary-goal + new-exercise data are ratchet-covered →
  KSV bump; seed content ships `needsReview` for Simon/SME sign-off before it is treated as final.

---

## 8. Implementation phasing (lands as one flip; builds in this order)

1. **Olympic catalogue lifts** — author the missing exercises (schema + form guide + volume maps).
2. **Discipline modules** — `_schema.js`, hypertrophy/powerlifting/olympic, registry, validation test.
3. **Secondary-goals module** — the menu + corrective patterns.
4. **Wire the flip** — discipline resolution in `resolveProgram`; drop the gate; discipline
   periodisation (via the D7 machinery); discipline dose; secondary-goal accessory injection.
5. **Remove the legacy build path** — style/emphasis branch, legacy periodisation profiles.
6. **Onboarding UI** — discipline picker + secondary-goals multi-select (apps/mobile).
7. **Golden re-baseline + audit + new tests + sport-unchanged regression.**
8. **Existing-user migration.**

This is the biggest single change since the 2026-07-05 audit — a multi-session build. The
implementation plan (writing-plans) will step through the above with checkpoints.

---

## 9. Resolved decisions (Simon, 2026-07-07)
1. **Discipline seed content** — I draft the demand vectors, priority lifts, dose ranges, and
   periodisation weeks from standard S&C. Simon has approved the drafting; values still ship with a
   `provenance` trail (evidenceLevel + source) but are treated as accepted for v1 (not blocked on a
   separate SME pass).
2. **Olympic scope** — RESOLVED: competency-gate the full classic lifts. Beginners get power/hang
   variants + overhead-squat/positions first; the full snatch / clean & jerk unlock at
   intermediate+ (mirrors the existing competency gating for other high-skill lifts).
3. **Meet/peak handling** — RESOLVED: INCLUDE in v1. Powerlifting/Olympic accept an event date and
   get a peak/taper overlay by REUSING the existing proven event-taper (volume down, intensity held).
   It only fires when a date is entered, so it adds near-zero risk for the no-event majority.
4. **Migration default for `functional`** — RESOLVED: `hypertrophy + conditioning` secondary goal.
