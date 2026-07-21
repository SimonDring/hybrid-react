// Onboarding draft persistence — save/load/clear + 7-day staleness.
import { saveDraft, loadDraft, clearDraft, DRAFT_KEY } from '../src/lib/onboardingDraft.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Map-backed localStorage shim — Node has no localStorage global.
function makeLocalStorageShim() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
  };
}
globalThis.localStorage = makeLocalStorageShim();

assert(loadDraft() === null, 'T1 loadDraft() is null on empty store');

saveDraft({ goalType: 'build' }, 3);
const d = loadDraft();
assert(d.answers.goalType === 'build' && d.step === 3, 'T2 saveDraft/loadDraft round-trip answers + step');

// Tamper savedAt to 8 days ago — stale drafts are ignored (and removed).
const raw = JSON.parse(localStorage.getItem(DRAFT_KEY));
raw.savedAt = Date.now() - 8 * 24 * 60 * 60 * 1000;
localStorage.setItem(DRAFT_KEY, JSON.stringify(raw));
assert(loadDraft() === null, 'T3 loadDraft() is null past the 7-day staleness cap');

saveDraft({ goalType: 'sport' }, 1);
clearDraft();
assert(localStorage.getItem(DRAFT_KEY) === null, 'T4 clearDraft() removes the key');
