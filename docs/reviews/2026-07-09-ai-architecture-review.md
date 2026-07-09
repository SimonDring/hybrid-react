# AI Architecture Review — 2026-07-09

**Status: REVIEW (dated) · governance sprint Phase 4 · assessed against
`docs/architecture/AIGAS.md` v1.0 (draft-pending-ratification) · all AI code is
behind flags, nothing live.** Full compliance table with file:line evidence in
the underlying survey; this document is the synthesis.

## Verdict

**The constitutional question — can AI ever be the coaching engine here? — is
answered correctly, in code, with tests.** The deterministic engine cannot call
AI (`ai-seam.js` greps the engine tree for AI imports and network I/O and fails
the suite on any hit); the only decision-path capability (Seam 1, D11 proposal
substitution) is disposed of by the real D14 validator suite, and a rejected
proposal leaves the deterministic result standing; the only wired capability
(C2 explanation via `ai-render`) never touches the decision path at all. Keys
are server-side only; the kill chain is genuinely dual (server `AI_ENABLED`
env + per-user `ai_features` flag, both default-off). AI is confined to
translator/advisor/reporting exactly as AIGAS demands.

**What is not ready is everything operational around the seam** — and the
encouraging finding is that closing the general pre-go-live gaps is the same
work that unblocks Stage 6:

| Gap (ranked) | AIGAS § | State |
|---|---|---|
| **No eval harness** — the recorded, blocking go-live gate for every capability | §20/§6.2/§17 | Doesn't exist for C2 or C7; code comments acknowledge it |
| **Observability is ephemeral** — the §20 stamp is built correctly then `console.log`'d; Seam-1 disposals logged nowhere; `ai_recommendations` table exists, dead | §20 | Persist stamps + disposal events |
| **Provider lock-in** — Anthropic SDK, model id (`claude-opus-4-8`), and provider-specific params inline in the edge function; "models are configuration" not honoured | §8 | Thin task-class adapter + versioned routing config |
| **No cost governance** — Opus routed to a formatting task; no caching (artefact-stamp-keyed cache is trivially available); no per-user rate limit; `max_tokens:1024` shared with thinking tokens risks truncation | §18 | Right-size model (Haiku-class for C2), cache, rate-limit |
| **Leak gate input-only + denylist-shaped** — `RAW_VITAL_KEYS` duplicated in two places; a new raw metric with an unlisted key would pass; output unscreened | §19 | Single shared positive allowlist; bidirectional gate |
| **Transparency labelling deferred to a caller that doesn't exist** | §15 | Must land with the first UI surface |

## Dimension summary

- **Routing**: one hardcoded route (`explain_week` → Opus). C1–C9 taxonomy
  exists on paper only; C2 is the only route, C7 the only contract (D11).
- **Context assembly**: `buildWeekArtefact` is a positive field-level allowlist
  (the right shape); the edge-function leak gate 422s on raw-vital keys as
  defence-in-depth, and a test proves a stray `hrv:42` is stripped. Raw vitals
  cannot leak in through the built path.
- **Memory**: none — correct per AIGAS §4 ("AI is not the memory of the
  platform"). `ai_recommendations` is a Stage-8 placeholder with RLS wired,
  no readers/writers.
- **Explainability**: the stamp (capability, model, promptVersion, inputRefs,
  tokens, timestamp) is per-spec; persistence is the missing half.
- **Confidence**: no AI self-reported confidence anywhere near a gate — §16
  honoured by construction.

## Stage 6 readiness

**Structurally ready; operationally not.** Stage 6 "AI plan adjustment" is
Seam 1 on D11 — the boundary invariants it needs are already built and
test-pinned. What's missing is not a redesign but three additions:

1. **The orchestration wrapper** (run deterministic first → request proposal
   async off the critical path → validate → persist the passing artefact with
   provenance → record the disposal either way).
2. **The D11 eval harness** (mandatory per §6.2/EDS Q8 before the contract
   gets a live caller).
3. **Audit persistence** (stamps + disposal events into `ai_recommendations`
   or a purpose-built table).

## Pre-go-live checklist (recommendation to Simon)

1. Build the **C2 eval harness** (golden artefacts; assert grounding — no
   invented numbers; honesty-marker survival — a deload stays a deload) and
   treat it as blocking for `AI_ENABLED=true`. Same bar for D11 before Seam 1
   gains a caller.
2. **Persist observability**: every render stamp + every Seam-1 disposal to a
   table; alert on schema-failure/grounding-violation rates.
3. **Provider adapter + routing config** so a model/provider change is config,
   and degradation with a provider disabled is actually exercised.
4. **Cost controls before live traffic**: small-fast model for C2, response
   cache keyed on artefact stamp + prompt version, per-user rate limit,
   verified token budget.
5. **Labelling + allowlist**: AI prose visually/semantically distinct at the
   first surface; unify the duplicated denylist into one shared positive
   allowlist, screen output too.

Also queued (Phase 0 finding): AIGAS itself still needs its **ratification
panel pass** — recommended 2026-07-06, not yet run. Ratify before Stage 6 work
begins so the spec being built against is frozen.
