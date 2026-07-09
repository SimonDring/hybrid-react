# Fix: sport-enum onboarding rejection — implementation plan (2026-07-09)

Design: [`docs/superpowers/specs/2026-07-09-sport-enum-onboarding-fix-design.md`](../specs/2026-07-09-sport-enum-onboarding-fix-design.md)
Branch: `fix-sport-enum-onboarding-2026-07-09`

TDD order — write the failing regression test first, watch it fail on `main`'s logic, then fix.

## Step 1 — Failing regression test (app-side)

New file `apps/mobile/tests/sport-onboarding-validation.js`:

- Import `selectableSports` (engine), `answersToProfilePatch` + `BLANK_ANSWERS` (onboardingModel), `validateProfile` (validation).
- For each selectable sport, build `answersToProfilePatch({ ...BLANK_ANSWERS, goalType:'sport', skbSport:id, sportIntent:'recreational', daysPerWeek:3, days:['mon','wed','fri'] })`, run `validateProfile(patch)`, assert `ok === true` and no `errors.sport`. Include an explicit triathlon case for a named assertion.
- Expected on current code: FAILS for triathlon, rugby, soccer, gaelic_football, field_hockey, hurling.

Run `node apps/mobile/tests/sport-onboarding-validation.js` → confirm it fails (red).

## Step 2 — Engine: export the derived sport-id set

`packages/engine/src/data/sportEngineBinding.js`:
```js
// The distinct engine-sport ids the binding can produce — the single source of truth for the
// sport values a profile may hold. The app's onboarding validation derives its accepted list
// from this so a newly-bound flagship sport can never be rejected as "not a recognised value".
export const ENGINE_SPORT_IDS = [...new Set(Object.values(SKB_ENGINE_BINDING).map((b) => b.engineSport))];
```
`packages/engine/index.js`: add `ENGINE_SPORT_IDS` to the existing `bindingFor` re-export line.

New engine unit `packages/engine/tests/`… → actually app-side suite runs engine too via imports; add the assertion to the new app test (ENGINE_SPORT_IDS === distinct set) to keep one file.

## Step 3 — App: derive the enum

`apps/mobile/src/lib/validation/rules.js`:
- Add `import { ENGINE_SPORT_IDS } from '@performance-os/engine';` (update the "Pure data" header note to say the sport list is derived from the engine binding).
- Replace `sport: ['run', 'cycle', 'swim'],` with `sport: ENGINE_SPORT_IDS,`.

Re-run Step 1 test → green. Existing `validation.js` (H5/H6, P1–P10) must stay green.

## Step 4 — Full verification

- `npm test` (whole suite) green — especially `validation.js`, `sport-onboarding.js`, `skb-selectable.js`, `golden-master.js`, `knowledge-set-ratchet.js` (the fix adds an export only; no plan/knowledge output change → golden-master + ratchet untouched).
- `npm run dev`, drive onboarding for Triathlon in the browser, confirm it saves and a plan renders (no error toast).

## Step 5 — Ship

- Commit spec + plan, then test + fix as small described steps.
- Push, open PR, self-review the diff, merge to main.
- Update `HANDOFF.md` pointer + memory.

## Risk

Low. Additive engine export (no behaviour change) + a one-value swap in an app-side enum that widens what's
accepted (never narrows). No schema/DB/plan/SKB change. Reversible by reverting two files.
