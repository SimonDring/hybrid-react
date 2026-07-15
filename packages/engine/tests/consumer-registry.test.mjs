// tests/consumer-registry.test.mjs — M4a Task 4 (TR-02): the zero-consumer
// check, made structural (13-VALIDATION-STRATEGY §8.3 — "every validation
// product declares its consumers at registration, and a product with zero
// consumers fails the build").
//
// The pin's lesson: the D14 report (5/16 validators live, all report-only)
// computed a proof of every trim/veto and reached zero screens for the whole
// life of the pin (audit 06 TR-02). A validator suite nobody reads is worse
// than none — it LOOKS like a guarantee. This test proves the registry
// (packages/engine/src/lib/validation/consumers.js) actually discriminates:
//   (a) the REAL registry passes (every shipped product has a declared reader);
//   (b) a SYNTHETIC registry with an empty consumers array FAILS (throws) —
//       proving the check is not a rubber stamp that would pass on an empty
//       or malformed registry too;
//   (c) an empty registry (zero products declared at all) also fails — a
//       validation surface can't dodge the check by declaring nothing.
//
// Engine-only imports (run-engine.mjs convention).

import { VALIDATION_PRODUCTS, assertEveryProductHasConsumers } from '@performance-os/engine/lib/validation/consumers.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

function throws(fn) {
  try { fn(); return null; } catch (e) { return e; }
}

// ── (a) the real, shipped registry has zero zero-consumer products ─────────
{
  assert(Object.keys(VALIDATION_PRODUCTS).length > 0, 'a1 the real registry declares at least one validation product');
  const err = throws(() => assertEveryProductHasConsumers());
  assert(err === null, `a2 the real registry passes the zero-consumer check (${err && err.message})`);
  for (const [id, p] of Object.entries(VALIDATION_PRODUCTS)) {
    assert(Array.isArray(p.consumers) && p.consumers.length > 0, `a3 product "${id}" has ≥1 declared consumer`);
  }
}

// ── (b) THE DISCRIMINATION PROOF: a product with zero consumers goes RED ────
{
  const badRegistry = {
    'meta.validation': { description: 'ok', consumers: ['some screen'] },
    'phantom.report': { description: 'a product nobody wired up', consumers: [] },
  };
  const err = throws(() => assertEveryProductHasConsumers(badRegistry));
  assert(err instanceof Error, 'b1 a zero-consumer product in the registry THROWS — the check is not a no-op');
  assert(/phantom\.report/.test(err.message), 'b2 the failure names the offending product');
  assert(!/meta\.validation/.test(err.message), 'b3 the failure does NOT falsely implicate the product that DOES have a consumer');
}

// ── (b′) a missing `consumers` key is treated the same as empty (undeclared) ─
{
  const badRegistry = { 'undeclared.report': { description: 'no consumers field at all' } };
  const err = throws(() => assertEveryProductHasConsumers(badRegistry));
  assert(err instanceof Error, 'b′1 a product with no consumers field at all also fails (not just an empty array)');
}

// ── (c) an empty registry (no products declared) also fails, not silently passes ─
{
  const err = throws(() => assertEveryProductHasConsumers({}));
  assert(err instanceof Error, 'c1 an empty registry fails loudly rather than vacuously passing');
}

// ── (d) two clean products with real consumers → no throw ──────────────────
{
  const goodRegistry = {
    a: { description: 'x', consumers: ['screen A'] },
    b: { description: 'y', consumers: ['screen B', 'screen C'] },
  };
  const err = throws(() => assertEveryProductHasConsumers(goodRegistry));
  assert(err === null, 'd1 a registry where every product has ≥1 consumer passes cleanly');
}
