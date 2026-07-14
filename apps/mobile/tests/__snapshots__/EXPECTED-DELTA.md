# Expected-delta log

The TR-01 recurrence guard (13-VALIDATION-STRATEGY.md §2.3; enforced by
`apps/mobile/tests/snapshot-note-guard.mjs`, wired into CI). TR-01 was a real
behaviour regression re-baselined into the goldens unnoticed — a re-baseline
without a reviewed note is exactly the failure mode this file exists to catch.

**Rule:** any commit/PR that changes a file under `apps/mobile/tests/__snapshots__/`
(the golden master, the injury-classification pin, or the knowledge-set
manifest) must EITHER append an entry below in the SAME diff, OR carry a line
starting `EXPECTED-DELTA:` in its commit message. The guard fails the build if
neither is present.

**Entry shape** (one per re-baseline, newest first):

```
## YYYY-MM-DD — <short description / PR or commit ref>
- Changed archetypes: <list, or "none — new keys only">
- Added archetypes: <list, or "none">
- Keys that moved, per archetype: <e.g. "meta.provenance.engineVersion; phases[0].weeks[0].sessions[1].items">
- Why: <the behaviour change's design source — a WP/PR/spec citation>
- Claim: no other archetype moved (audited key-by-key against this note)
```

---

*No entries yet — this file is seeded empty by Phase 3 M0 T4. The first
re-baseline after this guard lands appends its entry above the line, per the
shape above.*
