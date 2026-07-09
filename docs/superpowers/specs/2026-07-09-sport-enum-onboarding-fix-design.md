# Fix: onboarding rejects triathlon + team sports ("Sport is not a recognised value") — design spec (2026-07-09)

> **Status:** approved (autonomous lead-engineer fix, 2026-07-09). Branch `fix-sport-enum-onboarding-2026-07-09`.
>
> **Goal:** let a user finish onboarding for EVERY selectable sport. Today, picking triathlon (or any of the
> five team/field sports) fails the profile save with "Sport is not a recognised value."

## 0. The bug (what the user sees)

Selecting **Triathlon** in onboarding and pressing continue shows **"Sport is not a recognised value."** and the
profile never saves — so no plan is generated. Reported by Simon 2026-07-09.

## 1. Root cause

App-side input validation carries its OWN hand-maintained list of allowed sport values, and it has gone stale.

- `apps/mobile/src/lib/validation/rules.js` → `ENUMS.sport = ['run', 'cycle', 'swim']` (untouched since the
  2026-06-22 monorepo restructure — it predates every sport added since).
- On save, `trainingStore.updateProfile(patch)` calls `validateProfile(patch)`, which runs
  `setEnum('sport', patch.sport, ENUMS.sport, 'Sport')`. If `patch.sport` is not in the list it returns
  `{ ok:false, errors:{ sport:'Sport is not a recognised value.' } }` and the store refuses to save.
- Onboarding computes `patch.sport` from the SKB→engine binding:
  `answersToProfilePatch()` → `bindingFor(skbSport).engineSport`. For triathlon that is `'triathlon'`, which is
  not in `['run','cycle','swim']` → rejected.

This is a classic **duplicated-list-drift** bug: the true source of truth for "what `sport` values a profile can
hold" is the engine's `SKB_ENGINE_BINDING` (`packages/engine/src/data/sportEngineBinding.js`). The validation
enum is a second, copied list that was never updated when triathlon and the team sports were bound.

## 2. Scope (measured, not guessed)

Walking `selectableSports()` × `bindingFor()` against the current enum (11 selectable sports):

| SKB sport | `patch.sport` (engineSport) | Accepted today? |
|---|---|---|
| running_sprint / running_middle / running_long | `run` | ✅ |
| cycling | `cycle` | ✅ |
| swimming | `swim` | ✅ |
| **triathlon** | `triathlon` | ❌ |
| **rugby** | `rugby` | ❌ |
| **soccer** | `soccer` | ❌ |
| **gaelic_football / field_hockey / hurling** | `gaa` | ❌ |

**6 of 11 selectable sports are broken**, not just triathlon — every non-endurance sport. Only the 5 endurance
sports pass, because they map to the 3 legacy engine sports that happen to still be in the stale enum. The
distinct set of engineSport values across all bindings — the correct enum — is
`["cycle","gaa","rugby","run","soccer","swim","triathlon"]`.

Nothing else reads `ENUMS.sport` (grep-confirmed: only `validate.js`'s `setEnum('sport', …)`).

## 3. The fix — derive, don't duplicate

Rather than hand-patch today's four missing strings (which would drift again the next time a flagship sport is
bound — the exact failure we're fixing), **derive the accepted-sport list from the binding**, so it can never go
stale:

1. **Engine** (`packages/engine`): export the distinct engine-sport ids the binding produces —
   `ENGINE_SPORT_IDS` in `sportEngineBinding.js`, re-exported from the public `index.js` next to `bindingFor`.
   Pure derivation of existing data; **no plan output changes** (golden-master unaffected).
2. **App** (`apps/mobile/src/lib/validation/rules.js`): `import { ENGINE_SPORT_IDS }` and set
   `sport: ENGINE_SPORT_IDS`. The enum now mirrors the binding automatically — adding a future flagship sport
   (which per the binding's own doc "only needs an entry here") auto-widens onboarding validation.

This matches the codebase's established direction of collapsing duplicated lists to a single source (cf. the
retire-legacy P2 commit "derive priority from exerciseLibrary; drop the duplicated lists").

## 4. Why not just add the strings? (alternative considered)

Option A — `sport: ['run','cycle','swim','gaa','rugby','soccer','triathlon']` — is a one-line symptom fix. It
would unblock onboarding today but leaves the two lists coupled by hand, so it re-arms the identical bug for the
next sport. Rejected in favour of the derived list (§3), which removes the drift class entirely.

## 5. Non-goals

- No change to plan generation, the SKB, the binding values, or what any sport programs.
- No schema/DB change (there is no DB constraint on `sport`; the block is purely the app-side enum).
- Legacy saved profiles only ever held `run/cycle/swim`, all still accepted — no migration needed.

## 6. Validation / tests

- **Regression test (new):** walk every `selectableSports()` sport through the real chain
  `answersToProfilePatch({goalType:'sport', skbSport:id, …})` → `validateProfile()` and assert `ok === true`
  with no `sport` error. This fails on `main` (6 sports) and passes after the fix, and will catch any future
  unbound-enum drift.
- **Engine unit:** assert `ENGINE_SPORT_IDS` equals the distinct engineSport set of `SKB_ENGINE_BINDING`.
- Full suite green (`npm test`); app still boots (`npm run dev`); manual onboarding of triathlon reaches a plan.
