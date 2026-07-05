// tests/portable-freezes.js — WP-28 (audit V8): the two-device simulation.
// Start a session on device A ⇒ its frozen content is mirrored to
// users.profile.session_overrides ⇒ device B's pull + reconcile shows the SAME
// frozen content. Conflicts resolve FROZEN-WINS (Art 10): per key, the EARLIER
// freeze is the truth — a later re-freeze on another device never rewrites what
// the athlete actually saw and trained. Also closes the old cross-account leak
// (the raw un-namespaced localStorage key) with a one-time migration.

// localStorage shim must exist BEFORE Database.js boots (it writes on import).
const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; },
  clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; },
};

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const Storage = await import('../src/lib/Storage.js');
const Database = (await import('../src/lib/Database.js')).default;
const Ov = await import('../src/lib/sessionOverrides.js');

// ── legacy migration: the old raw key is adopted into the namespace, once ─────
localStorage.setItem('htp_session_overrides', JSON.stringify({
  p1_wk1_s0: { focus: 'Legacy pin', items: [], createdAt: 111 },
}));
Storage.setNamespace('deviceA');
Database.services.reloadFromStorage();
assert(Ov.getOverride('p1_wk1_s0')?.focus === 'Legacy pin', 'T1 the legacy raw-key blob is adopted into the namespace');
assert(localStorage.getItem('htp_session_overrides') === null, 'T2 …and the un-namespaced key is removed (cross-account leak closed)');

// ── device A pins a session; the mirror lands on the profile ─────────────────
Ov.setOverride('p1_wk2_s1', { focus: 'Lower — frozen on A', duration: '~45 min', items: [{ name: 'Trap-bar deadlift', sets: '3 × 5' }], pinnedAtStart: true });
await Ov.flushMirror();   // await the mirror deterministically (no sleeps — CI-safe)
const profileA = Database.services.getProfile();
assert(profileA.session_overrides && profileA.session_overrides.p1_wk2_s1
  && profileA.session_overrides.p1_wk2_s1.focus === 'Lower — frozen on A',
  'T3 a pin mirrors to users.profile.session_overrides (the synced row — no schema migration)');

// ── "device B": fresh namespace, the profile arrives via the pull ─────────────
const cloudCopy = JSON.parse(JSON.stringify(profileA.session_overrides));
Storage.setNamespace('deviceB');
Database.services.reloadFromStorage();
assert(Ov.getOverride('p1_wk2_s1') === null, 'T4 device B starts without the pin (namespaced cache)');
Ov.reconcileFromProfile(cloudCopy);
const onB = Ov.getOverride('p1_wk2_s1');
assert(onB && onB.focus === 'Lower — frozen on A' && onB.items[0].name === 'Trap-bar deadlift',
  'T5 THE ACCEPTANCE: device B shows the exact content device A froze');

// ── frozen wins: the earlier freeze beats a later re-freeze ──────────────────
// B (offline) froze the same slot EARLIER than the cloud copy A pushed.
Storage.save('htp_session_overrides_v2', {
  ...Ov.getOverrides(),
  p1_wk3_s0: { focus: 'B froze first', items: [], createdAt: 1000 },
});
Ov.reconcileFromProfile({ p1_wk3_s0: { focus: 'A froze later', items: [], createdAt: 2000 } });
assert(Ov.getOverride('p1_wk3_s0').focus === 'B froze first',
  'T6 frozen wins: the EARLIER freeze survives the merge (Art 10)');

// …and symmetrically, an earlier cloud freeze beats a later local one.
Storage.save('htp_session_overrides_v2', {
  ...Ov.getOverrides(),
  p1_wk4_s0: { focus: 'local, later', items: [], createdAt: 5000 },
});
Ov.reconcileFromProfile({ p1_wk4_s0: { focus: 'cloud, earlier', items: [], createdAt: 4000 } });
assert(Ov.getOverride('p1_wk4_s0').focus === 'cloud, earlier',
  'T7 …in both directions (the merge is symmetric on createdAt)');

// keys only one side knows survive the merge in both directions
assert(Ov.getOverride('p1_wk2_s1') !== null, 'T8 cloud-only pins survive local merges');
Ov.setOverride('p9_wk9_s9', { focus: 'B-only offline pin', items: [] });
await Ov.flushMirror();
Ov.reconcileFromProfile(cloudCopy);
assert(Ov.getOverride('p9_wk9_s9') !== null, "T9 a pin made offline on B survives the next pull's reconcile");

// clearing a pin clears the mirror too (re-completing rebuilds from the plan)
Ov.clearOverride('p9_wk9_s9');
await Ov.flushMirror();
assert(!((Database.services.getProfile() || {}).session_overrides || {}).p9_wk9_s9,
  'T10 clearing a pin clears it from the mirrored profile copy');

console.log('portable-freezes tests done');
