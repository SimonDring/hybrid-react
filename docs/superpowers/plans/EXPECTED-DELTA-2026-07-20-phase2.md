# EXPECTED DELTA — 2026-07-20 Phase 2 (aerobic + form model; KSV 1.48.0 → 1.50.0)

**Scope: STAMP-ONLY.** The form model is a parallel-advisory READOUT — `computeForm`/
`aerobicLoad` are NOT read by `generatePlan` or the reflow — so no plan content moved. Two
committed snapshots re-baseline for the two-step KSV bump:

1. **`apps/mobile/tests/__snapshots__/engine-golden-master.json`** — every archetype carrying
   `meta.provenance.knowledgeSetVersion` (39 of 46) changed exactly that one field
   `1.48.0` → `1.50.0`. Verified: all 78 diff lines were `knowledgeSetVersion`; zero
   `sessions`/`dayIdx`/`items`/`axialLoad`/`title` changes; archetype count stable (46 → 46).
2. **`apps/mobile/tests/__snapshots__/knowledge-set-manifest.json`** — the KSV ratchet manifest,
   regenerated over 46 governed files at 1.50.0. The two real content changes the bump carries:
   the new governed entries **`load.aerobic.trimp`** (T1, KSV 1.49.0) and **`load.form.model`**
   (T2, KSV 1.50.0).

**Why byte-identical:** `generatePlan` reads neither `computeForm` nor `aerobicLoad`; the form
readout is computed app-side in `trainingStore.buildView` and rendered on the Training Load
screen. The steering seam (`deloadRecommendation`'s optional `form` corroborator) is default-OFF
(no caller passes `form`; `prop-reflow-baseline` stays green). The **flip** (form steers plans,
aerobic load replaces the `duration×3` proxy in the live ACWR, the D9 dose-shrink) is a separate,
Simon-gated PR — see the spec's §The flip.

Suite state at Phase 2 close: `npm test` 207/207, `npm run test:engine` 33/33, `npm run lint`
0 errors.
