# EXPECTED DELTA — 2026-07-17 Phase 1 PR A (KSV 1.47.0 → 1.48.0)

**Scope: STAMP-ONLY.** The `opts.fixtureMicrocycle` flag is OFF for every archetype in
the matrix, so no plan content moved. Two committed snapshots re-baseline for the KSV bump:

1. **`apps/mobile/tests/__snapshots__/engine-golden-master.json`** — every archetype that
   carries `meta.provenance.knowledgeSetVersion` (39 of 46) changed exactly that one field
   `1.47.0` → `1.48.0`. Verified: all 78 diff lines were `knowledgeSetVersion`; zero
   `sessions`/`dayIdx`/`items`/`axialLoad`/`title` changes; archetype count stable (46 → 46).
   The 7 `injured·*` archetypes don't carry the stamp in their snapshot and were untouched.
2. **`apps/mobile/tests/__snapshots__/knowledge-set-manifest.json`** — the KSV ratchet
   manifest, regenerated over 46 governed files at 1.48.0 (the new `SCHEDULING_PENALTIES.md`
   weights are the real content change the bump carries; the ratchet's own byte-identity
   check confirms the bump is not empty). Task 3 bumped the version; this manifest re-baseline
   is the paired governance artifact, caught at the PR-A verification gate.

The behaviour flip (one NEW fixture-bearing archetype legitimately moves) is PR B / Task 8 —
a separate, audited re-baseline.

Suite state at PR A close: `npm test` 205/205, `npm run test:engine` 30/30, `npm run lint`
0 errors.
