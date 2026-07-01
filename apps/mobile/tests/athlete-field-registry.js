// apps/mobile/tests/athlete-field-registry.js
import { createAthleteModel } from '@performance-os/engine/lib/athlete/schema.js';
import { FIELD_REGISTRY, listStoredFieldPaths, registryGaps }
  from '@performance-os/engine/lib/athlete/fieldRegistry.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const model = createAthleteModel();
const gaps = registryGaps(model);
assert(gaps.length === 0, `T1 every stored field is justified (gaps: ${JSON.stringify(gaps)})`);

for (const [path, entry] of Object.entries(FIELD_REGISTRY)) {
  assert(typeof entry.why === 'string' && entry.why.length > 0, `T2 ${path} has a why`);
  assert(Array.isArray(entry.decisions) && entry.decisions.length > 0, `T3 ${path} maps to ≥1 decision`);
  assert(typeof entry.mandatory === 'boolean', `T4 ${path} declares mandatory`);
}
assert(listStoredFieldPaths(model).includes('identity.age'), 'T5 paths include identity.age');
