# Phase 2 — Aerobic loading + fitness–fatigue ("form") model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** A governed Banister-TRIMP aerobic-load method + a CTL/ATL/TSB "form" model, computed as a **parallel-advisory readout** (flag-OFF, byte-identical to current plans), surfaced in plain language on the Training Load screen.

**Architecture:** Two pure engine modules (`aerobicLoad`, `computeForm`) + governed knowledge; the store computes a `formView` readout from the athlete's own load history; a screen card renders it. **`generatePlan` and the reflow never read form** → every plan byte-identical bar the KSV stamp. Spec: `docs/superpowers/specs/2026-07-20-phase2-aerobic-form-model-design.md`.

**Tech Stack:** Pure ES modules in `packages/engine` (no clock/IO); `@performance-os/engine` barrel; Zustand store (`apps/mobile/src/stores/trainingStore.js`); React screen (`apps/mobile/src/screens/TrainingLoad.jsx`); Node test scripts (`node:assert/strict`).

## Global Constraints

- **Engine purity (Art 18):** no clock/IO/randomness in `packages/engine`. `computeForm`/`aerobicLoad` take dates + values as arguments (the STORE reads the clock and passes `asOf`).
- **Additive-first / byte-identical:** form is a READOUT; it must NOT enter `generatePlan` or the reflow. Golden plans stay byte-identical bar the `knowledgeSetVersion` stamp. `prop-*` stay green.
- **Confidence governs authority (Art 13; DAAS §4.2):** aerobic TRIMP confidence `moderate`, form model `low` → soft-input-capped, never a gate. Renderings state the basis when HR quality is low.
- **Knowledge is data:** the TRIMP coefficients, HRmax/HRrest defaults, CTL/ATL time constants, and TSB band cut-points are governed entries in `entries.js` (each addition bumps `KNOWLEDGE_SET_VERSION`), NOT literals in code.
- **Raw vitals never cross a person boundary (Art 11):** form is a derived signal; nothing here widens the coach surface.
- **Theme variables:** UI uses ONLY real tokens (`--bg-surface`, `--bg-surface-2`, `--txt-strong`, `--txt-muted`, `--txt-body`, `--hairline`, `--moss`, `--ochre`, `--rust`, `--status-positive/caution/strain`). NEVER `--card-bg`/`--border`/`--accent-bg`.
- **The knowledge-set ratchet** (`apps/mobile/tests/knowledge-set-ratchet.js`) must be re-baselined (`UPDATE=1`) in the same change as any KSV bump — done at T7.

---

### Task 1: Aerobic load — Banister TRIMP (governed, pure)

**Files:**
- Create: `packages/engine/src/lib/load/aerobicLoad.js`
- Modify: `packages/engine/src/lib/knowledge/entries.js` (add `load.aerobic.trimp`; bump KSV 1.48.0 → 1.49.0)
- Modify: `packages/engine/index.js` (barrel)
- Test: `packages/engine/tests/aerobic-load.test.mjs`

**Interfaces:**
- Produces: `aerobicLoad(workout, { restHr=null, maxHr=null, sex=null, age=null }) → { load: number, method: 'trimp'|'duration', confidence: 'moderate'|'low' }` and `aerobicDailyLoads(sessionLogs, workouts, ctx) → [{date, load}]` (mirrors `trainingLoad.dailyLoads` but scores unlinked workouts via `aerobicLoad`; sessions via the existing `sessionLoad`).

**The science (Banister 1991; verified — see spec):** `HRr = (avgHr − restHr)/(maxHr − restHr)`, clamped to [0,1]; `weight = sex==='female' ? 0.86*Math.exp(1.67*HRr) : 0.64*Math.exp(1.92*HRr)`; `TRIMP = durationMin * HRr * weight`. `maxHr` falls back to `Math.round(208 − 0.7*age)` (Tanaka 2001) when absent+age present; `restHr` falls back to 60 (confidence drops to `low`). If avgHr or a usable maxHr/restHr pair is missing → `{ load: round(min*3), method:'duration', confidence:'low' }` (the current proxy).

- [ ] **Step 1: Write the failing test.** Assert: a workout with avgHr 150, maxHr 190, restHr 50, sex male, 60 min → TRIMP ≈ `60 * ((150-50)/(190-50)) * 0.64*e^(1.92*(100/140))` (compute the expected number in the test and assert within 0.5); female coefficient path differs; missing-HR → `method:'duration'` equals `round(min*3)`; `aerobicDailyLoads` sums unlinked workouts by date and ignores `session_id`-linked ones. Import from `@performance-os/engine`.
- [ ] **Step 2: Run → RED** (`node packages/engine/tests/aerobic-load.test.mjs`; `aerobicLoad` undefined).
- [ ] **Step 3: Implement** `aerobicLoad.js` (pure; import `sessionLoad` from `../plan/trainingLoad.js` for `aerobicDailyLoads`; read TRIMP coefficients + HRmax/HRrest defaults from a new governed `load.aerobic.trimp` entry via `kb.value(...)` — do NOT hardcode the coefficients). Add the governed entry to `entries.js` in the `{id, rule, value, evidenceLevel, source, confidence, lastReviewed, appliesTo}` shape used at `entries.js:230-259`, with `value: { maleC:0.64, maleK:1.92, femaleC:0.86, femaleK:1.67, hrMaxIntercept:208, hrMaxAgeSlope:0.7, restHrDefault:60 }`, `evidenceLevel:'L2'`, `source:'Banister 1991; Morton, Fitz-Clarke & Banister 1990 (impulse-response); Tanaka 2001 (HRmax=208−0.7·age)'`, `confidence:'moderate'`, `appliesTo:['load']`. Bump `KNOWLEDGE_SET_VERSION` to `'1.49.0'` prepending a rationale (preserve full history — same care as PR A's Task 3). Barrel-export `aerobicLoad`, `aerobicDailyLoads`.
- [ ] **Step 4: Run → GREEN.** Also `node packages/engine/tests/prop-purity.test.mjs` (still green — the module is pure).
- [ ] **Step 5: Commit** `feat(engine): governed Banister-TRIMP aerobic load (parallel; KSV 1.49.0)`.

---

### Task 2: Form model — CTL / ATL / TSB (governed, pure)

**Files:**
- Create: `packages/engine/src/lib/load/form.js`
- Modify: `packages/engine/src/lib/knowledge/entries.js` (add `load.form.model`; bump KSV 1.49.0 → 1.50.0)
- Modify: `packages/engine/index.js` (barrel)
- Test: `packages/engine/tests/form-model.test.mjs`

**Interfaces:**
- Produces: `computeForm(dailySeries, { asOf }) → { ctl:number, atl:number, tsb:number, band:'fresh'|'neutral'|'fatigued'|null, confidence:number, rationale:string }` where `dailySeries` is `[{date, load}]` (from `aerobicDailyLoads` or `dailyLoads`).

**The science (TrainingPeaks PMC / Coggan, from Banister — verified):** build a continuous daily load array from the first loaded day (or `asOf − maxWindow`) through `asOf` (missing days = 0). Iterate day-by-day: `CTL = CTL_prev*e^(−1/42) + load*(1−e^(−1/42))`; `ATL = ATL_prev*e^(−1/7) + load*(1−e^(−1/7))`; seed both at 0. `TSB = CTL − ATL` (yesterday's CTL−ATL is the classic "form"; use same-day CTL−ATL for simplicity, documented). `band`: `tsb ≥ freshCut → 'fresh'`, `tsb ≤ fatiguedCut → 'fatigued'`, else `'neutral'`; `null` when history is too short (fewer than `minDays` loaded days → low confidence, no band). `confidence` scales 0→1 with loaded-day count up to a maturity window (governed).

- [ ] **Step 1: Write the failing test.** Assert: the EWMA recurrence for a known series (e.g. constant load 50/day for 60 days → CTL and ATL both approach 50, TSB ≈ 0, band 'neutral'); a taper (load drops to 0 for 10 days after a block) → TSB positive → band 'fresh'; a ramp (load spikes) → TSB negative → 'fatigued'; empty series → `{ctl:0,atl:0,tsb:0,band:null,confidence:0}`; determinism (same input+asOf → same output). Import from `@performance-os/engine`.
- [ ] **Step 2: Run → RED.**
- [ ] **Step 3: Implement** `form.js` (pure; read time constants + TSB band cut-points + maturity window from a new governed `load.form.model` entry, `value: { ctlDays:42, atlDays:7, freshTsb:5, fatiguedTsb:-15, minDays:14, matureDays:42 }`, `evidenceLevel:'L4'`, `source:'TrainingPeaks Performance Manager / Coggan (CTL 42d / ATL 7d EWMA); Banister impulse-response 1991'`, `confidence:'low'` (population time constants; per-individual calibration contested → soft input, Art 13), `appliesTo:['load']`). Bump KSV to `'1.50.0'` (preserve history). Barrel-export `computeForm`.
- [ ] **Step 4: Run → GREEN** + `prop-purity`, `prop-determinism` green.
- [ ] **Step 5: Commit** `feat(engine): governed CTL/ATL/TSB form model (parallel; KSV 1.50.0)`.

---

### Task 3: Form verdict + typed output (app-side, presentation)

**Files:**
- Modify: `apps/mobile/src/lib/verdicts.js` (add `formVerdict`)
- Test: `apps/mobile/tests/form-verdict.test.mjs`

**Interfaces:**
- Consumes: the `computeForm` output shape (Task 2).
- Produces: `formVerdict(form) → { tone, label, headline, note, color }` in the exact style of `readinessVerdict`/`loadVerdict` (`verdicts.js:21-58`), using `TONE` tokens.

- [ ] **Step 1: Write the failing test.** Assert: band 'fresh' → tone 'positive' + a "form is fresh / good time to push" note; 'fatigued' → 'strain' + an ease note; 'neutral' → 'caution'/'neutral' steady note; `band:null`/low confidence → a "building your load history" neutral note; the returned `color` is the `TONE[tone]` value. Confidence-qualify the copy when `form.confidence < 0.5`.
- [ ] **Step 2: Run → RED** (`node apps/mobile/tests/form-verdict.test.mjs`).
- [ ] **Step 3: Implement** `formVerdict` in `verdicts.js` matching the existing pattern (a `FORM` map keyed by band + a null/low-confidence fallback; reuse `TONE`; optionally reuse `confidenceNote`). Pure, no new deps.
- [ ] **Step 4: Run → GREEN.**
- [ ] **Step 5: Commit** `feat(app): plain-language form verdict`.

---

### Task 4: Store readout — `formView` (no plan change)

**Files:**
- Modify: `apps/mobile/src/stores/trainingStore.js` (in `buildView`, ~lines 92–146)
- Test: `apps/mobile/tests/form-view.js` (app-side tests are `.js` — `run-all.mjs` only globs `tests/*.js`; a `.test.mjs` is invisible to `npm test`/CI)

**Interfaces:**
- Consumes: `aerobicDailyLoads` (Task 1), `computeForm` (Task 2). Produces a `formView` on the built view object alongside `loadView`.

- [ ] **Step 1: Read** `apps/mobile/src/stores/trainingStore.js` `buildView` to see the exact locals (`today`, `sessionLogsAll`, `workoutsAll`, `dailyMetrics`, `latestMetric`, `profileRow`) and where `loadView` is assembled + returned.
- [ ] **Step 2: Write the failing test.** Seed (via the store's test harness / Database) an athlete with a workout history that yields a known form band, build the view, and assert: (a) `formView` is present with `{ctl, atl, tsb, band, confidence}`; (b) the returned PLAN is byte-identical to the same build WITHOUT the formView change (guard against any accidental reflow coupling — compare `getPhases()`/plan JSON before/after). Model the harness on an existing store test (e.g. `apps/mobile/tests/wp53-rollup.js` or whichever seeds Database + calls buildView).
- [ ] **Step 3: Run → RED.**
- [ ] **Step 4: Implement.** In `buildView`, after `loadView` is built: derive rest HR from recent `daily_metrics.resting_hr`, `sex`/`age` from `profileRow`, compute `const formDl = aerobicDailyLoads(sessionLogsAll, workoutsAll, { restHr, maxHr:null, sex, age })` and `const formView = computeForm(formDl, { asOf: today })`; add `formView` to the returned view object next to `loadView`. Do NOT pass form into `setRuntime`/reflow/plan. Import the two functions from `@performance-os/engine`.
- [ ] **Step 5: Run → GREEN** (formView correct; plan byte-identical).
- [ ] **Step 6: Commit** `feat(app): compute form readout in buildView (parallel; no plan change)`.

---

### Task 5: Deload corroboration seam (built, default-OFF)

**Files:**
- Modify: `packages/engine/src/lib/plan/trainingLoad.js` (`deloadRecommendation`)
- Test: `packages/engine/tests/deload-form-seam.test.mjs`

**Interfaces:**
- Extends: `deloadRecommendation({ ..., form=null })` — an optional `form` (the `computeForm` output). When `form` is null/absent (every current caller), behaviour is byte-identical.

- [ ] **Step 1: Write the failing test.** Assert: (a) with `form` omitted, output equals today's for representative inputs (byte-identical); (b) `form.band==='fatigued'` acts ONLY as a corroborator — it can satisfy the `poorRecovery`-style corroboration for a high-load signal, but NEVER forces a deload alone (form fatigued + high readiness + good recovery + no illness → still `action:'none'`), honouring Art 13 (form is low-confidence, soft-input). Prove the non-forcing with a direct case.
- [ ] **Step 2: Run → RED.**
- [ ] **Step 3: Implement.** Add `form=null` to the signature; incorporate a `formFatigued = form && form.band === 'fatigued'` term ONLY into the *corroboration* branch (alongside `lowReadiness`/`poorRecovery` for the `loadDeload` case), never into a standalone force. Keep it governed-consistent: form may corroborate, never gate. Byte-identical when `form` is null.
- [ ] **Step 4: Run → GREEN** + `node packages/engine/tests/prop-reflow-baseline.test.mjs` green (no caller passes form; reflow unchanged).
- [ ] **Step 5: Commit** `feat(engine): form corroboration seam in deloadRecommendation (default-OFF)`.

---

### Task 6: UI — Form card on the Training Load screen

**Files:**
- Modify: `apps/mobile/src/screens/TrainingLoad.jsx`
- (No new test file — verified in the browser per the verification workflow.)

- [ ] **Step 1: Read** `apps/mobile/src/screens/TrainingLoad.jsx` to match its card/section pattern and how it reads the view (`loadView`) from the store, and `verdicts.js` `loadVerdict` usage.
- [ ] **Step 2: Implement** a "Form" card: read `formView` from the store, render CTL (fitness) / ATL (fatigue) / TSB (form) as three figures + the `formVerdict(formView)` headline/note with its `color`, and a confidence caveat via `confidenceNote(formView.confidence)`. When `formView.band == null` render the neutral "building your load history" state. Use ONLY real theme tokens. Match the existing screen's spacing/typography.
- [ ] **Step 3: Verify in the browser.** `preview_start` the dev server; navigate to `/tracking/load`; `read_console_messages` (no errors), `read_page` (the Form card renders CTL/ATL/TSB + verdict), `resize_window` dark/light sanity, screenshot. Fix + re-check on any issue.
- [ ] **Step 4: Commit** `feat(app): form (fitness/fatigue) card on the Training Load screen`.

---

### Task 7: Verification gate + stamp-only re-baseline

**Files:**
- Modify: `apps/mobile/tests/__snapshots__/engine-golden-master.json` + `knowledge-set-manifest.json` (`UPDATE=1`)
- Create: `docs/superpowers/plans/EXPECTED-DELTA-2026-07-20-phase2.md`

- [ ] **Step 1: Confirm the golden drift is STAMP-ONLY.** `node apps/mobile/tests/golden-master.js` compare; verify every diff line is `knowledgeSetVersion` (1.48.0 → 1.50.0) — abort if any `sessions`/`dayIdx`/`items` moved (would mean form leaked into `generatePlan`). Same programmatic check PR A used (`grep` the diff for any non-`knowledgeSetVersion` `snapshot:`/`current :` line → must be empty).
- [ ] **Step 2: Re-baseline** both snapshots: `UPDATE=1 node apps/mobile/tests/golden-master.js` and `UPDATE=1 node apps/mobile/tests/knowledge-set-ratchet.js`.
- [ ] **Step 3: Full green.** `npm test` (all pass), `npm run test:engine` (all pass, incl. `prop-*`), `npm run lint` (0 errors).
- [ ] **Step 4: Write** `EXPECTED-DELTA-2026-07-20-phase2.md` documenting STAMP-ONLY scope (KSV 1.48.0 → 1.50.0; two new governed entries `load.aerobic.trimp`, `load.form.model`; form is not read by `generatePlan`; the flip is Simon's).
- [ ] **Step 5: Commit** `test(engine): re-baseline golden + KSV manifest to 1.50.0 (Phase 2, form parallel, byte-identical)`.

---

## Self-review (spec coverage)
- Aerobic TRIMP → T1; form model → T2; verdict → T3; readout → T4; steering seam (OFF) → T5; UI → T6; byte-identity gate → T7. ✅
- The flip (workoutLoad→aerobicLoad, form steering, D9 dose-shrink) is OUT of scope (spec §The flip) — Simon's. ✅
- Additive-identity: T4 asserts plan byte-identical; T5 default-OFF; T7 stamp-only golden + prop-* green. ✅
