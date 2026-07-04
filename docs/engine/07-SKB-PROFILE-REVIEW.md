# 07 — SKB Profile Review (2026-07-04)

A full review of every sport-knowledge JSON in `packages/engine/src/data/sport-knowledge/`
against the SportProfile contract (21 sections, `sportKnowledge/schema.js`) and against
what the engine actually needs to PROGRAMME each sport. Requested by Simon 2026-07-04.

## Verdict matrix

| Profile | Schema | 21 sections | Completeness | Exercise library | Decision rules | Programmable? |
|---|---|---|---|---|---|---|
| gaelic_football | ✓ | ✓ | 1.00 COMPLETE | 14 (join-guarded) | 12/12 structured | ✓ (reflow rules live) |
| hurling | ✓ | ✓ | 1.00 COMPLETE | 14 (join-guarded) | 12/12 structured | ✓ (reflow rules live) |
| running_sprint | ✓ | ✓ | 1.00 COMPLETE | 13 (join-guarded) | **8/9 structured** (this review) | ✓ D11 + reflow |
| running_middle | ✓ | ✓ | 1.00 COMPLETE | 12 (join-guarded) | **7/8 structured** (this review) | ✓ D11 + reflow |
| running_long | ✓ | ✓ | 1.00 COMPLETE | 12 (join-guarded) | **7/10 structured** (this review) | ✓ D11 + reflow |
| cycling | ✓ | ✓ | 1.00 COMPLETE | 13 (join-guarded) | **10/12 structured** (this review) | ✓ D11 + reflow |
| swimming | ✓ | ✓ | 1.00 COMPLETE | 13 (join-guarded) | 11/11 structured | ✓ category-led D11 + reflow |
| triathlon | ✓ | ✓ | 1.00 COMPLETE | 14 (join-guarded) | **7/11 structured** (this review) | ✓ (binds run; reflow rules live) |
| rugby | ✓ | ✓ | 0.00 SCAFFOLD | 0 | 0 | ✗ — declared scaffold, correctly NOT selectable |
| soccer | ✓ | ✓ | 0.00 SCAFFOLD | 0 | 0 | ✗ — declared scaffold, correctly NOT selectable |

All ten validate against the schema and carry all 21 sections. The eight flagship
profiles score 1.00 on the authored-richness bar; rugby/soccer are section-complete
scaffolds awaiting authoring, and the selectable-sports gate (completeness().complete)
correctly keeps them out of onboarding.

## The gap this review closed: prose-only decision rules

The five endurance profiles carried their `decisionRules` as prose (`if`/`then` strings)
only — `evaluateRules` requires structured `trigger`/`effect`, so the reflow could not
execute a single one of the 50 rules. **39 were structured in this review**, using the
GAA/swim trigger conventions (readiness < 40, ACWR > 1.5, CMJ drop ≥ 12 %, taper window
≤ 336 h, priming ≤ 24 h, in-season, region soreness). Every rule keeps its prose,
confidence, evidenceLevel and source untouched — the structure is a faithful translation,
not new science.

**11 rules stay prose BY DESIGN** (structuring them would misrepresent their scope):

| Rule(s) | Why prose |
|---|---|
| `no_heavy_*_before_*` ×4, `concurrent_sequencing` | Day-level SCHEDULING (which day, not how much) — D13 scheduler scope; no "key session within 24 h" signal exists |
| `bone_stress_warning_offload_refer`, `bone_pain_stop_running`, `low_energy_availability_flag` ×2 | Medical red-flag / referral rules — the injury-triage system's scope, not a gym-volume multiplier |
| `offseason_build_strength_for_economy` | An EMPHASIS (the periodization season model already implements it); the effect vocabulary only reduces |

## Live-signal note

The runtime reflow context supplies `readiness / illness / travel / acwr /
competitionWithinH` today — so those triggers fire now. `season`, `soreness_region`,
`cmj_drop_pct` and `matches_this_week` triggers are structurally executable and covered
by tests, and go live as the context enriches (in-season detection, soreness logging,
CMJ input, the Team fixture calendar — Stage 5).

Also noted: a triathlete WITHOUT `sport_code` falls back (via the engine binding,
`sport: 'run'`, no discipline) to running_middle's rules — the generic runner prior.
New onboarding always persists `sport_code: 'triathlon'`.

## Gates

- `tests/skb-rules.js` — per-endurance-sport activation gates (runtime-shaped profiles).
- `tests/skb-catalogue-join.js` — every exerciseLibrary id still joins the catalogue.
- `tests/skb-run-default.js` — re-pinned: a low-readiness runner now FIRES the
  autoregulate rule (was: asserted prose rules fire nothing).
- Goldens untouched: decisionRules affect the REFLOW only, never generatePlan.
