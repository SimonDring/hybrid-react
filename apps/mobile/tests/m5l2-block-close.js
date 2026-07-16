// tests/m5l2-block-close.js — M5-L2: AthleteModelService.learnFromBlockClose, the app-side
// of the D16 LEARN verb (supersedes the WP-59 staged-priors-wiring test).
//
// The loop is now SUBSTRATE-BACKED (design §4): on block close it appends a block_outcomes
// row to the owner-private substrate, reads a bounded window, runs the pure promotion
// policy, and lands the result. When the substrate is unreachable (offline / signed-out /
// no Supabase — as in this test env) it must ABSTAIN: return the model unchanged, write
// nothing, and — critically — NEVER demote a genuinely-learned prior just because the DB
// couldn't be reached. (The online append→land path is covered by the pure unit tests:
// derive-recovery-observation, m5l2-row-shape, m5l2-promotion-landing.)

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
const Svc = await import('../src/lib/AthleteModelService.js');
const { createAthleteModel } = await import('@performance-os/engine');

const BLOCK = { startISO: '2026-04-01', endISO: '2026-06-01' };
const PRIORITY = [{ qualityId: 'maxStrength' }];

// ── Offline abstain: an UNLEARNED athlete's prior stays population, nothing written ──
{
  Storage.setNamespace('m5l2Test1');
  Database.services.reloadFromStorage();
  Database.services.updateProfile({
    goal_type: 'strength', plan_start_date: BLOCK.startISO, access: ['barbell'],
    athlete_model: createAthleteModel({ meta: { onboardedAt: '2026-04-01' } }),
  });
  // Some logged data over the block (would materialise a row if online).
  for (let w = 0; w < 5; w++) {
    const date = new Date(Date.UTC(2026, 3, 1 + w * 7)).toISOString();
    Database.tables.setLogs.create({ session_id: `s${w}`, exercise_key: 'squat', actual_weight: 120, actual_reps: 5, completed_at: date });
    Database.tables.sessionLogs.create({ session_id: `s${w}`, recovery: 4, completed_at: date });
  }
  const before = Database.services.getProfile().athlete_model.updatedAt;
  const m = await Svc.learnFromBlockClose({ ...BLOCK, priorityQualities: PRIORITY });
  assert(m && m.learnedPriors.recoveryRate.source === 'population' && m.learnedPriors.recoveryRate.value === 1,
    'offline: unlearned recoveryRate stays population (no spurious arm — TR-05 / additive-first)');
  assert(Database.services.getProfile().athlete_model.updatedAt === before,
    'offline: abstains — writes nothing to the profile (no substrate reachable)');
}

// ── Offline NEVER demotes: a genuinely-learned prior survives an unreachable substrate ──
{
  Storage.setNamespace('m5l2Test2');
  Database.services.reloadFromStorage();
  const learnedModel = createAthleteModel({
    learnedPriors: {
      recoveryRate: { value: 1.12, source: 'learned', confidence: 'moderate' },
      volumeTolerance: { value: 1, source: 'population', confidence: 'low' },
    },
  });
  Database.services.updateProfile({ goal_type: 'strength', plan_start_date: BLOCK.startISO, access: ['barbell'], athlete_model: learnedModel });
  const m = await Svc.learnFromBlockClose({ ...BLOCK, priorityQualities: PRIORITY });
  assert(m.learnedPriors.recoveryRate.source === 'learned' && m.learnedPriors.recoveryRate.value === 1.12,
    'offline: a LEARNED prior is NOT demoted (abstain never runs the policy off empty history)');
}

// ── Guardrail: missing window/priorities → early return, no write ─────────────
{
  Storage.setNamespace('m5l2Test3');
  Database.services.reloadFromStorage();
  Database.services.updateProfile({ goal_type: 'strength', athlete_model: createAthleteModel() });
  const before = Database.services.getProfile().athlete_model.updatedAt;
  await Svc.learnFromBlockClose({});
  assert(Database.services.getProfile().athlete_model.updatedAt === before,
    'guardrail: missing args writes nothing');
}

console.log('m5l2-block-close tests done');
