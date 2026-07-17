# M6 sub-phase (b) — the allocator re-seat: design spec

**Status: DESIGN SPEC (immutable sprint record once merged) · 2026-07-16**
**Authority: executes `docs/design/m6/RULING-9-allocator-reseat.md` (🔒 9, Simon 2026-07-16) and
`M6-PLAN.md` sub-phase (b) / P2-1. Splits `allocator.js` along the EDS stage boundaries into
M-DOSE (D12) → M-SCHED (D13) → M-SESS (D9/D10/D11), byte-identity per commit.**

## 1. The ruled frame (from 🔒 9)

- **Order: M-DOSE → M-SCHED → M-SESS** (call-graph leaves first; the entangled selection core last).
- **Byte-identity per extraction commit** across the full M0 archetype matrix + `reflow≡baseline`,
  now CI-enforced (the engine gate runs for real post-#193). Any golden delta ⇒ rejected.
- **Pure moves only** — no behaviour smuggled in; **KSV unchanged** (constants→knowledge is a
  separate M6 (a) concern, not bundled); contract proven with fixtures before the caller is rewired;
  module-scoped rollback.
- The **first extraction (M-DOSE) is Simon's review** to validate the harness in practice.

## 2. This spec's build — M-DOSE (extraction 1)

**New module: `packages/engine/src/lib/dose/dose.js`** — the D12 dose primitives, moved VERBATIM
from `allocator.js` (byte-identical). The dose contract: given a SELECTED exercise + its resolved
role + style/phase context → the dosed prescription.

**Moves (with their internal helpers):**
- `scheme` (rep/RPE/intensity scheme lookup through the style→scheme bridge)
- `roleSetCount` (working-set count by role × scheme)
- `restForRole` (rest prescription per role/style)
- `makeItem` (the rendered dosed item)
- `capReps` / `floorReps` / `bumpReps` (rep-math)
- `cnsTier` (CNS/recovery tier — drives rest + supersetting)
- internal-only: `LETTERS`, `olympicClassicLift`, `isoStr`, `coreStr`, `mainNote`, `POWER_*` consts

**Stays in `allocator.js`** (selection/scheduling, not dose): `femaleRepBump` (selection computes the
bump, passes it in), `effectiveRoleOf` (caller resolves role, passes it in), `perSetMin` / `slotBudget`
(time-budgeting), `powerAllowed` / `styleGoalTag` (selection gates), `hash` (tie-break jitter),
`shareMuscle` / `canPair` / structuring (M-SCHED, a later extraction).

**Re-imported by `allocator.js`** (used outside the moved cluster): `cnsTier` (structuring `canPair`),
`olympicClassicLift` (selection body), `scheme`, `roleSetCount`, `makeItem`. `capReps`/`floorReps`/
`restForRole`/`bumpReps` are internal to the moved functions → not re-imported.

**Module imports** (leaf-only, no `allocator` import ⇒ no cycle): `CORE_HOLDS`
(data/strengthExercises), `parseSetCount` (plan/volume), `styleFamily` (strength/styleFamily),
`axialOf` (plan/axial), and the dose tables from `data/doseSchemes.js`.

## 3. Rules (binding)

1. **Byte-identical.** `npm test` (incl. the golden master) + `npm run test:engine` +
   `prop-additive-identity` + `prop-reflow-baseline` all green with **zero** golden delta and **no KSV
   bump**. A delta means the move was not pure — fix, don't re-baseline.
2. **Pure move.** Function bodies are copied verbatim; only their *home* changes. No logic edits.
3. **Contract fixture.** A new `dose` fixture test exercises `scheme`/`roleSetCount`/`restForRole`/
   `makeItem` in isolation (no allocator), proving the module is independently testable (§2.1).
4. **Import hygiene.** `allocator.js`'s now-unused imports are removed (lint 0 errors); the dose
   module imports only what its moved functions need.
5. `npm run lint` 0 errors. Merge is Simon's (first extraction).

## 4. Next extractions (not this build)

- **M-SCHED** (extraction 2): `structureItems`, `finaliseSlot`, the post-passes (`shiftRpe`,
  `addHypertrophyIsolation`, `addSupportiveFinishers`, `injectSecondaryGoals`, `styleObjective`) +
  the already-separate `scheduler.js`/`despine.js`/`axial.js`/`primers.js`. Calls the stable M-DOSE
  contract.
- **M-SESS** (extraction 3): the `allocateGym()` selection body + `lib/session/*` +
  `selectInterventions.js`. Extracted against two proven contracts; empties `allocator.js`.

Each is its own byte-identity-gated PR under the same rules.
