/**
 * rls-harness — WP-32: prove the Row Level Security isolation against STAGING.
 *
 * Signs up throwaway users on the linked STAGING project and asserts the binding
 * data-isolation rules (repo CLAUDE.md + docs/product/TEAM-ARCHITECTURE.md):
 *   1. a player reads ONLY their own rows, in every user-data table;
 *   2. no cross-user read, update, delete, or insert-as-someone-else;
 *   3. RAW VITALS (daily_metrics health columns) are unreadable cross-user;
 *   4. a signed-out (anon) client reads nothing.
 * When WP-33 lands the teams/team_members model, this harness grows the coach
 * assertions (team-scoped derived reads; raw vitals STILL never) — the policies
 * ship only with their proofs.
 *
 * DELIBERATELY NOT part of the CI suite: it needs the network and a staging
 * project. Run on demand from the repo root:
 *     node supabase/tests/rls-harness.mjs
 * Credentials come from apps/mobile/.env.local (the staging pair). A hard guard
 * refuses to run against the known PRODUCTION project ref.
 *
 * Leftovers: the throwaway auth users stay in staging (deleting auth users needs
 * service_role, which this harness deliberately never touches). Harmless in a
 * sandbox; the seeded DATA rows are cleaned up.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// ── the one project this may touch ────────────────────────────────────────────
const PROD_REF = 'ggldomlmycvpwtzzjzcd';   // hybrid-training (production) — NEVER

function env() {
  const raw = readFileSync(new URL('../../apps/mobile/.env.local', import.meta.url), 'utf8');
  const get = (name) => {
    const m = raw.match(new RegExp(`^${name}\\s*=\\s*"?([^"\\n]+)"?`, 'm'));
    return m ? m[1].trim() : null;
  };
  return { url: get('VITE_SUPABASE_URL'), anonKey: get('VITE_SUPABASE_ANON_KEY') };
}

const { url, anonKey } = env();
if (!url || !anonKey) { console.error('No staging credentials in apps/mobile/.env.local'); process.exit(1); }
const ref = new URL(url).hostname.split('.')[0];
if (ref === PROD_REF) {
  console.error(`REFUSING TO RUN: .env.local points at the PRODUCTION project (${ref}).`);
  console.error('Point it at hybrid-training-staging first.');
  process.exit(1);
}
console.log(`Target project ref: ${ref} (verified ≠ production)\n`);

// ── tiny test kit ─────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; console.log('PASS:', msg); }
  else { failed++; console.error('FAIL:', msg); }
}
const stamp = Date.now();
const newClient = () => createClient(url, anonKey, { auth: { persistSession: false } });

async function signUpUser(label) {
  const client = newClient();
  const email = `rls-harness-${stamp}-${label}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: `Harness!${stamp}` });
  if (error || !data.session) throw new Error(`sign-up failed for ${label}: ${error?.message || 'no session (is Confirm email OFF?)'}`);
  return { client, id: data.user.id, email };
}

// Every table the app writes for a user, with a minimal legal row.
const USER_TABLES = (uid) => ({
  sessions:        { user_id: uid, template_ref: `p1_wk1_s0`, status: 'pending' },
  weekly_checkins: { user_id: uid, week_ending: '2026-07-05', avg_rpe: 7 },
  daily_metrics:   { user_id: uid, date: '2026-07-05', readiness_score: 61, hrv_ms: 68, resting_hr: 52, sleep_duration_min: 431 },
  injuries:        { user_id: uid, body_part: 'Right hamstring', title: 'Harness strain', status: 'active' },
  reassessments:   { user_id: uid, quarter_number: 1, answers: {} },
  workouts:        { user_id: uid, provider: 'manual', type: 'run', start_time: new Date(stamp).toISOString() },
});
// The columns the Team rules class as RAW VITALS — never cross-user-readable.
const RAW_VITAL_COLS = 'hrv_ms, resting_hr, sleep_duration_min';

const inserted = [];   // { table, id, client } — for cleanup

async function main() {
  console.log('Creating two throwaway players…');
  const A = await signUpUser('player-a');
  const B = await signUpUser('player-b');
  const anon = newClient();   // never signed in

  // ── seed player A's rows ────────────────────────────────────────────────────
  for (const [table, row] of Object.entries(USER_TABLES(A.id))) {
    const { data, error } = await A.client.from(table).insert(row).select('id').single();
    ok(!error && data?.id, `A inserts into ${table}${error ? ` — ${error.message}` : ''}`);
    if (data?.id) inserted.push({ table, id: data.id, client: A.client });
  }

  // ── 1. A reads their own rows ───────────────────────────────────────────────
  for (const table of Object.keys(USER_TABLES(A.id))) {
    const { data, error } = await A.client.from(table).select('id').eq('user_id', A.id);
    ok(!error && data.length >= 1, `A reads their own ${table}`);
  }
  const { data: ownProfile } = await A.client.from('users').select('id').eq('id', A.id);
  ok(ownProfile?.length === 1, 'A reads their own users row');

  // ── 2. B sees NOTHING of A's — read, update, delete, impersonated insert ──
  for (const table of Object.keys(USER_TABLES(A.id))) {
    const { data } = await B.client.from(table).select('id').eq('user_id', A.id);
    ok((data || []).length === 0, `B cannot READ A's ${table}`);
  }
  const { data: crossProfile } = await B.client.from('users').select('id').eq('id', A.id);
  ok((crossProfile || []).length === 0, "B cannot read A's users row");

  const target = inserted.find((r) => r.table === 'daily_metrics');
  const { data: updData } = await B.client.from('daily_metrics')
    .update({ readiness_score: 1 }).eq('id', target.id).select('id');
  ok((updData || []).length === 0, "B cannot UPDATE A's daily_metrics (0 rows affected)");
  const { data: delData } = await B.client.from('sessions')
    .delete().eq('user_id', A.id).select('id');
  ok((delData || []).length === 0, "B cannot DELETE A's sessions (0 rows affected)");
  const { error: imperr } = await B.client.from('daily_metrics')
    .insert({ user_id: A.id, date: '2026-07-06', readiness_score: 99 });
  ok(!!imperr, 'B cannot INSERT a row AS A (denied by policy)');

  // ── 3. raw vitals: the binding rule, asserted on the columns themselves ────
  const { data: vitals } = await B.client.from('daily_metrics')
    .select(RAW_VITAL_COLS).eq('user_id', A.id);
  ok((vitals || []).length === 0, "RAW VITALS (hrv/rhr/sleep) return ZERO rows cross-user — the Team boundary's floor");

  // ── 4. a signed-out client reads nothing ────────────────────────────────────
  for (const table of ['users', 'sessions', 'daily_metrics', 'injuries']) {
    const { data } = await anon.from(table).select('id').limit(5);
    ok((data || []).length === 0, `anon (signed out) reads nothing from ${table}`);
  }

  // ── cleanup the seeded data rows ────────────────────────────────────────────
  for (const r of inserted) await r.client.from(r.table).delete().eq('id', r.id);
  console.log(`\nCleanup: ${inserted.length} seeded rows removed (throwaway auth users remain — sandbox).`);

  console.log(`\n${passed} passed, ${failed} failed.`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('HARNESS ERROR:', e.message); process.exit(1); });
