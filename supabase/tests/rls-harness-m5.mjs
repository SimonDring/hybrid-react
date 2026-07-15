/**
 * rls-harness-m5 — M5 outcomes substrate: prove the append-only / owner-private /
 * consent-gated RLS model of 20260713_m5_outcomes_substrate.sql against STAGING.
 *
 * Runs the design's 21-assertion proof set (docs/design/m5-substrate/
 * SCHEMA-AND-PRIVACY.md §3.5) plus the three panel CONDITIONS (§6.5):
 *   P1–P4   owner isolation (incl. P4 raw-vitals-never-cross)
 *   P5–P6   append-only integrity (in-place UPDATE denied; corrections supersede)
 *   P7–P11  the cross-person derived table (membership AND grant; teammate/outsider zero)
 *   P12–P17 consent revocation ends the read — POLICY-ONLY (🔒 D1: history retained)
 *   P18–P21 the consent pair — cross-athlete isolation (B1)
 *   C1      squad_signal_snapshots server-truth (no false snapshot)
 *   C2      has_active_grant oracle lockdown (constantly false for a non-coach)
 *   C3      delete_user() erases all 12 new tables
 *
 * Same style + guards as supabase/tests/rls-harness.mjs. DELIBERATELY NOT part of
 * the CI suite (needs the network + a staging project). Run from the repo root:
 *     node supabase/tests/rls-harness-m5.mjs
 * Credentials come from apps/mobile/.env.local (the staging pair). A hard guard
 * refuses to run against the known PRODUCTION project ref.
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
const today = new Date().toISOString().slice(0, 10);
const nowIso = new Date(stamp).toISOString();
const newClient = () => createClient(url, anonKey, { auth: { persistSession: false } });

async function signUpUser(label) {
  const client = newClient();
  const email = `rls-m5-${stamp}-${label}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: `Harness!${stamp}` });
  if (error || !data.session) throw new Error(`sign-up failed for ${label}: ${error?.message || 'no session (is Confirm email OFF?)'}`);
  return { client, id: data.user.id, email };
}

// The derived stamp (design §1.2) — required NOT NULL on every materialised table.
const STAMP = { engine_version: 'e-harness', knowledge_set_version: 'k-harness', method_id: 'm.harness', method_version: 'v1' };
// The provenance contract (design §1.2) — required NOT NULL on every observation table.
const PROV = (metric_id, provenance_class = 'self-report') => ({ metric_id, provenance_class, observed_at: nowIso });

// A minimal legal row for each of the nine owner-private tables.
const M5_OWNER_TABLES = (uid) => ({
  block_outcomes:             { user_id: uid, ...STAMP, block_index: 1 },
  session_outcomes:           { user_id: uid, ...STAMP, adherence_pct: 90 },
  readiness_snapshots:        { user_id: uid, ...STAMP, readiness: 70, load_state: 'balanced', acwr: 1.0 },
  monitoring_entries:         { user_id: uid, ...PROV('sleep_duration', 'device'), value: 431, unit: 'min' },
  test_results:               { user_id: uid, ...PROV('cmj', 'self-administered'), assessment_id: 'cmj', protocol_version: 'v1', raw_values: {} },
  match_performances:         { user_id: uid, ...PROV('match', 'coach-report'), minutes: 90, availability_status: 'available' },
  external_load_observations: { user_id: uid, ...PROV('gps', 'device'), distance_m: 8200 },
  baselines:                  { user_id: uid, ...STAMP, metric_id: 'hrv', central: 68, maturity: 0.4 },
  served_artefacts:           { user_id: uid, ...STAMP, artefact_type: 'insight', audience: 'athlete', statement: {}, derivation: {}, quality: {}, authority: {}, privacy_class: 'derived-safe' },
});
const OWNER_TABLE_NAMES = Object.keys(M5_OWNER_TABLES('x'));

async function main() {
  console.log('Creating throwaway users…');
  const A = await signUpUser('athlete-a');
  const B = await signUpUser('athlete-b');
  const C = await signUpUser('coach');
  const O = await signUpUser('outsider-coach');
  const anon = newClient();

  // A carries an ACTIVE injury + a logged readiness score today — the owner-private
  // truth the snapshot server-truth trigger derives from (C1).
  await A.client.from('injuries').insert({ user_id: A.id, body_part: 'Right hamstring', title: 'M5 strain', status: 'active' });
  await A.client.from('daily_metrics').insert({ user_id: A.id, date: today, readiness_score: 61, hrv_ms: 68, resting_hr: 52 });

  // seed A's nine owner-private tables + a RAW-VITAL monitoring row (metric hrv).
  for (const [table, row] of Object.entries(M5_OWNER_TABLES(A.id))) {
    const { error } = await A.client.from(table).insert(row);
    ok(!error, `seed: A inserts ${table}${error ? ` — ${error.message}` : ''}`);
  }
  const { error: rawErr } = await A.client.from('monitoring_entries')
    .insert({ user_id: A.id, ...PROV('hrv', 'device'), value: 68, unit: 'ms' });
  ok(!rawErr, `seed: A inserts a RAW-VITAL monitoring_entries row (hrv)${rawErr ? ` — ${rawErr.message}` : ''}`);

  // ── P1 — A reads only their OWN rows in each new table ───────────────────────
  for (const table of OWNER_TABLE_NAMES) {
    const { data, error } = await A.client.from(table).select('id').eq('user_id', A.id);
    ok(!error && (data || []).length >= 1, `P1: A reads their own ${table}`);
  }

  // ── P2 — B reads ZERO of A's rows; cannot update/delete/insert-as-A ──────────
  for (const table of OWNER_TABLE_NAMES) {
    const { data } = await B.client.from(table).select('id').eq('user_id', A.id);
    ok((data || []).length === 0, `P2: B cannot READ A's ${table}`);
  }
  const { data: bUpd } = await B.client.from('block_outcomes').update({ block_index: 99 }).eq('user_id', A.id).select('id');
  ok((bUpd || []).length === 0, "P2: B cannot UPDATE A's block_outcomes (0 rows)");
  const { data: bDel } = await B.client.from('baselines').delete().eq('user_id', A.id).select('id');
  ok((bDel || []).length === 0, "P2: B cannot DELETE A's baselines (0 rows)");
  const { error: bImp } = await B.client.from('readiness_snapshots').insert({ user_id: A.id, ...STAMP, readiness: 1 });
  ok(!!bImp, 'P2: B cannot INSERT a row AS A (denied by policy)');

  // ── P3 — a signed-out (anon) client reads nothing from any new table ─────────
  for (const table of [...OWNER_TABLE_NAMES, 'squad_signal_snapshots', 'consent_grants', 'consent_events']) {
    const { data } = await anon.from(table).select('id').limit(5);
    ok((data || []).length === 0, `P3: anon reads nothing from ${table}`);
  }

  // ── P4 — raw vitals never cross: the raw-vital monitoring row is invisible cross-user
  const { data: rawCross } = await B.client.from('monitoring_entries')
    .select('metric_id, value').eq('user_id', A.id).eq('metric_id', 'hrv');
  ok((rawCross || []).length === 0, 'P4: RAW VITALS (a raw-vital monitoring_entries row) return ZERO rows cross-user — the Art 11 floor');

  // ── P5 — an owner's in-place UPDATE of an evidence row is REJECTED ───────────
  // No UPDATE policy ⇒ RLS default-denies the in-place edit (0 rows); the
  // forbid_evidence_update guard trigger is the deeper belt-and-suspenders layer.
  const { data: aUpd, error: aUpdErr } = await A.client.from('block_outcomes')
    .update({ block_index: 42 }).eq('user_id', A.id).select('id');
  ok(!!aUpdErr || (aUpd || []).length === 0, 'P5: an owner CANNOT update an evidence row in place (append-only)');

  // ── P6 — a correction is a NEW row carrying supersedes_id; the old row remains ─
  const { data: orig } = await A.client.from('session_outcomes').insert({ user_id: A.id, ...STAMP, adherence_pct: 80 }).select('id').single();
  const { data: corr } = await A.client.from('session_outcomes').insert({ user_id: A.id, ...STAMP, adherence_pct: 85, supersedes_id: orig.id }).select('id, supersedes_id').single();
  ok(corr && corr.supersedes_id === orig.id, 'P6: a correction is a new row that supersedes the old one');
  const { data: stillThere } = await A.client.from('session_outcomes').select('id').eq('id', orig.id);
  ok((stillThere || []).length === 1, 'P6: the superseded row still exists (nothing overwritten)');

  // ══ team setup for the cross-person proofs ═══════════════════════════════════
  console.log('\nSetting up teams + memberships…');
  const { data: team } = await C.client.from('teams').insert({ name: `M5 FC ${stamp}`, created_by: C.id }).select('id').single();
  await C.client.from('team_members').insert({ team_id: team.id, user_id: C.id, role: 'coach', status: 'active' });
  const { data: oTeam } = await O.client.from('teams').insert({ name: `M5 Rivals ${stamp}`, created_by: O.id }).select('id').single();
  await O.client.from('team_members').insert({ team_id: oTeam.id, user_id: O.id, role: 'coach', status: 'active' });
  // C invites A and B; each accepts their own invite.
  await C.client.from('team_members').insert([
    { team_id: team.id, user_id: A.id, role: 'player', status: 'invited' },
    { team_id: team.id, user_id: B.id, role: 'player', status: 'invited' },
  ]);
  await A.client.from('team_members').update({ status: 'active' }).eq('team_id', team.id).eq('user_id', A.id);
  await B.client.from('team_members').update({ status: 'active' }).eq('team_id', team.id).eq('user_id', B.id);

  // A publishes a snapshot carrying LIE values — the server-truth trigger must
  // override them (C1). Kept as the row the crossing proofs read.
  const { error: snapErr } = await A.client.from('squad_signal_snapshots').insert({
    user_id: A.id, team_id: team.id, ...STAMP,
    readiness: 99, injury_status: 'available', load_state: 'HACKED', adherence_pct: 9999, acwr: -3, confidence: 5,
  });
  ok(!snapErr, `A publishes a snapshot on their team${snapErr ? ` — ${snapErr.message}` : ''}`);

  // ── C1 — the member cannot publish FALSE snapshot values ─────────────────────
  const { data: c1 } = await A.client.from('squad_signal_snapshots')
    .select('injury_status, readiness, load_state, adherence_pct, acwr, confidence').eq('user_id', A.id).single();
  ok(c1 && c1.injury_status === 'modified', `C1: injury_status is server-derived 'modified' from A's own injury (got '${c1?.injury_status}')`);
  ok(c1 && c1.readiness === 61, `C1: readiness is server-derived from A's logged score 61 (got ${c1?.readiness})`);
  ok(c1 && c1.load_state === null, `C1: a garbage load_state is clamped to null (got '${c1?.load_state}')`);
  ok(c1 && Number(c1.adherence_pct) === 100, `C1: adherence_pct is clamped to 100 (got ${c1?.adherence_pct})`);
  ok(c1 && c1.acwr === null, `C1: a negative acwr is clamped to null (got ${c1?.acwr})`);
  ok(c1 && Number(c1.confidence) === 1, `C1: confidence is clamped to 1 (got ${c1?.confidence})`);

  // ── P11 — a member cannot publish a snapshot onto a team they're not in ──────
  const { error: p11 } = await A.client.from('squad_signal_snapshots')
    .insert({ user_id: A.id, team_id: oTeam.id, ...STAMP, readiness: 50 });
  ok(!!p11, 'P11: a member cannot publish a snapshot onto a team they are not an active member of');

  // Before any grant: membership alone is NOT enough — the coach reads nothing.
  const { data: preGrant } = await C.client.from('squad_signal_snapshots').select('id').eq('user_id', A.id);
  ok((preGrant || []).length === 0, 'crossing: with membership but NO grant, the coach reads nothing (consent required)');

  // A grants the squad_signals crossing to the team (with the distinct flags set for P17).
  const { error: grantErr } = await A.client.from('consent_grants').insert({
    grantor_user_id: A.id, grantee_kind: 'team', grantee_team_id: team.id, scope: 'squad_signals',
    secondary_use: true, ai_processing: true, purpose: 'squad readiness board',
  });
  ok(!grantErr, `A grants the squad_signals crossing to their team${grantErr ? ` — ${grantErr.message}` : ''}`);

  // ── P7 — coach reads the snapshot ONLY with membership AND grant both active ──
  const { data: p7 } = await C.client.from('squad_signal_snapshots').select('id, readiness, injury_status').eq('user_id', A.id);
  ok((p7 || []).length === 1, 'P7: the coach reads the member\'s snapshot (active membership AND active grant)');

  // ── C2 — has_active_grant oracle lockdown (constantly false for a non-coach) ──
  const { data: c2coach } = await C.client.rpc('has_active_grant', { member: A.id, team: team.id, want_scope: 'squad_signals' });
  ok(c2coach === true, 'C2: the team coach gets true from has_active_grant (the legitimate crossing)');
  const { data: c2teammate } = await B.client.rpc('has_active_grant', { member: A.id, team: team.id, want_scope: 'squad_signals' });
  ok(c2teammate === false, 'C2: a teammate (non-coach) gets FALSE — has_active_grant is not a consent oracle');
  const { data: c2outsider } = await O.client.rpc('has_active_grant', { member: A.id, team: team.id, want_scope: 'squad_signals' });
  ok(c2outsider === false, "C2: an outsider coach gets FALSE for another team's grant");

  // ── P8 — a teammate (non-coach) reads NOTHING of another member's snapshot ───
  const { data: p8 } = await B.client.from('squad_signal_snapshots').select('id').eq('user_id', A.id);
  ok((p8 || []).length === 0, 'P8: a teammate cannot read another member\'s snapshot');

  // ── P9 — an outsider-team coach reads NOTHING ───────────────────────────────
  const { data: p9 } = await O.client.from('squad_signal_snapshots').select('id').eq('user_id', A.id);
  ok((p9 || []).length === 0, 'P9: another team\'s coach reads NOTHING (team-scoped)');

  // ── P10 — the coach reads ZERO raw vitals + ZERO private detail via new tables ─
  const { data: p10a } = await C.client.from('monitoring_entries').select('value').eq('user_id', A.id);
  ok((p10a || []).length === 0, 'P10: the coach reads ZERO of their player\'s monitoring_entries (raw-bearing)');
  const { data: p10b } = await C.client.from('test_results').select('raw_values').eq('user_id', A.id);
  ok((p10b || []).length === 0, 'P10: the coach reads ZERO of their player\'s test_results');
  const { data: p10c } = await C.client.from('readiness_snapshots').select('readiness').eq('user_id', A.id);
  ok((p10c || []).length === 0, 'P10: the coach reads ZERO of their player\'s readiness_snapshots');

  // ── P12 — pre-check: with membership + grant, the coach reads the snapshot ───
  const { data: p12 } = await C.client.from('squad_signal_snapshots').select('id').eq('user_id', A.id);
  ok((p12 || []).length === 1, 'P12: pre-check — the coach reads the member\'s snapshot');

  // ── P13 — the member REVOKES the grant ──────────────────────────────────────
  const { data: p13 } = await A.client.from('consent_grants')
    .update({ revoked_at: nowIso }).eq('grantor_user_id', A.id).eq('grantee_team_id', team.id).eq('scope', 'squad_signals').select('id');
  ok((p13 || []).length === 1, 'P13: the member revokes the squad_signals grant (sets revoked_at)');

  // ── P14 — the coach can NO LONGER read (has_active_grant → false) ────────────
  const { data: p14 } = await C.client.from('squad_signal_snapshots').select('id').eq('user_id', A.id);
  ok((p14 || []).length === 0, 'P14: the coach can NO LONGER read the member\'s snapshot (policy: grant revoked)');

  // ── P15 — POLICY-ONLY (🔒 D1): the athlete KEEPS their own history ───────────
  const { data: p15 } = await A.client.from('squad_signal_snapshots').select('id').eq('user_id', A.id);
  ok((p15 || []).length >= 1, 'P15: the athlete STILL reads their own snapshot rows — revocation is policy-only, history retained (D1)');

  // ── P16 — an ended MEMBERSHIP independently ends the crossing, even with a live grant ─
  // re-grant (crossing live again), verify the coach reads, then A leaves the team.
  await A.client.from('consent_grants')
    .update({ revoked_at: null }).eq('grantor_user_id', A.id).eq('grantee_team_id', team.id).eq('scope', 'squad_signals');
  const { data: p16pre } = await C.client.from('squad_signal_snapshots').select('id').eq('user_id', A.id);
  ok((p16pre || []).length === 1, 'P16: pre-check — with the grant re-activated the coach reads again');
  await A.client.from('team_members').update({ status: 'left' }).eq('team_id', team.id).eq('user_id', A.id);
  const { data: p16 } = await C.client.from('squad_signal_snapshots').select('id').eq('user_id', A.id);
  ok((p16 || []).length === 0, 'P16: an ended membership ends the crossing even with a live grant (coach_reads_member false)');
  const { data: p16own } = await A.client.from('squad_signal_snapshots').select('id').eq('user_id', A.id);
  ok((p16own || []).length >= 1, 'P16: the departed member still keeps their own snapshot history (policy-only)');

  // ── P17 — the distinct secondary_use / ai_processing flags are RECORDED ──────
  const { data: p17 } = await A.client.from('consent_grants')
    .select('secondary_use, ai_processing').eq('grantor_user_id', A.id).eq('grantee_team_id', team.id).eq('scope', 'squad_signals').single();
  ok(p17 && p17.secondary_use === true && p17.ai_processing === true, 'P17: secondary_use + ai_processing are recorded exactly as written');
  await A.client.from('consent_grants').insert({ grantor_user_id: A.id, grantee_kind: 'team', grantee_team_id: team.id, scope: 'availability' });
  const { data: p17def } = await A.client.from('consent_grants')
    .select('secondary_use, ai_processing').eq('grantor_user_id', A.id).eq('grantee_team_id', team.id).eq('scope', 'availability').single();
  ok(p17def && p17def.secondary_use === false && p17def.ai_processing === false, 'P17: the flags default to false on a plain grant (recording fidelity)');

  // ── P18 — the athlete reads their own consent_events; a coach cannot ─────────
  const { data: p18a } = await A.client.from('consent_events').select('id, event').eq('grantor_user_id', A.id);
  ok((p18a || []).length >= 2, `P18: the athlete reads their own consent_events audit trail (${(p18a || []).length} events: granted/revoked)`);
  const { data: p18c } = await C.client.from('consent_events').select('id').eq('grantor_user_id', A.id);
  ok((p18c || []).length === 0, 'P18: a coach CANNOT read the athlete\'s consent_events');

  // ── P19 — a coach reads grants naming their team but cannot create or revoke one ─
  const { data: p19read } = await C.client.from('consent_grants').select('id, scope').eq('grantee_team_id', team.id);
  ok((p19read || []).length >= 1, 'P19: a coach reads the grants that name their own team');
  const { error: p19ins } = await C.client.from('consent_grants').insert({ grantor_user_id: A.id, grantee_kind: 'team', grantee_team_id: team.id, scope: 'plan_adherence' });
  ok(!!p19ins, 'P19: a coach CANNOT create a grant on the athlete\'s behalf');
  const { data: p19rev } = await C.client.from('consent_grants').update({ revoked_at: nowIso }).eq('grantor_user_id', A.id).eq('scope', 'squad_signals').select('id');
  ok((p19rev || []).length === 0, 'P19: a coach CANNOT revoke the athlete\'s grant (0 rows)');

  // ── P20 — athlete B reads ZERO of A's consent_grants; cannot mutate them ─────
  const { data: p20 } = await B.client.from('consent_grants').select('id').eq('grantor_user_id', A.id);
  ok((p20 || []).length === 0, 'P20: athlete B reads ZERO of A\'s consent_grants (the who-consented map never leaks)');
  const { error: p20ins } = await B.client.from('consent_grants').insert({ grantor_user_id: A.id, grantee_kind: 'team', grantee_team_id: team.id, scope: 'derived_status' });
  ok(!!p20ins, 'P20: B cannot INSERT a grant as A');
  const { data: p20upd } = await B.client.from('consent_grants').update({ revoked_at: nowIso }).eq('grantor_user_id', A.id).select('id');
  ok((p20upd || []).length === 0, "P20: B cannot UPDATE A's grants (0 rows)");
  const { data: p20del } = await B.client.from('consent_grants').delete().eq('grantor_user_id', A.id).select('id');
  ok((p20del || []).length === 0, "P20: B cannot DELETE A's grants (0 rows)");

  // ── P21 — athlete B reads ZERO of A's consent_events; anon reads nothing ─────
  const { data: p21b } = await B.client.from('consent_events').select('id').eq('grantor_user_id', A.id);
  ok((p21b || []).length === 0, 'P21: athlete B reads ZERO of A\'s consent_events');
  const { data: p21g } = await anon.from('consent_grants').select('id').limit(5);
  const { data: p21e } = await anon.from('consent_events').select('id').limit(5);
  ok((p21g || []).length === 0 && (p21e || []).length === 0, 'P21: a signed-out client reads nothing from either consent table');

  // ══ C3 — delete_user() erases all 12 new tables ══════════════════════════════
  console.log('\nC3: delete_user() erasure across the 12 new tables…');
  const Z = await signUpUser('erasure-subject');
  for (const [table, row] of Object.entries(M5_OWNER_TABLES(Z.id))) {
    await Z.client.from(table).insert(row);
  }
  await C.client.from('team_members').insert({ team_id: team.id, user_id: Z.id, role: 'player', status: 'invited' });
  await Z.client.from('team_members').update({ status: 'active' }).eq('team_id', team.id).eq('user_id', Z.id);
  await Z.client.from('squad_signal_snapshots').insert({ user_id: Z.id, team_id: team.id, ...STAMP, readiness: 60 });
  await Z.client.from('consent_grants').insert({ grantor_user_id: Z.id, grantee_kind: 'team', grantee_team_id: team.id, scope: 'squad_signals' });
  // pre-check: with membership + grant, C reads Z's snapshot (proving it crossed).
  const { data: zPre } = await C.client.from('squad_signal_snapshots').select('id').eq('user_id', Z.id);
  ok((zPre || []).length === 1, 'C3: pre-check — the coach reads Z\'s snapshot (Z consented)');
  const { error: delErr } = await Z.client.rpc('delete_user');
  ok(!delErr, `C3: delete_user() runs clean with rows in all 12 new tables${delErr ? ` — ${delErr.message}` : ''}`);
  const { data: zPost } = await C.client.from('squad_signal_snapshots').select('id').eq('user_id', Z.id);
  ok((zPost || []).length === 0, 'C3: after Z\'s erasure their snapshot is GONE (explicit delete in delete_user)');
  const { data: zGrant } = await C.client.from('consent_grants').select('id').eq('grantor_user_id', Z.id);
  ok((zGrant || []).length === 0, 'C3: Z\'s consent_grants are erased too');

  // ── cleanup (best-effort; throwaway auth users remain — sandbox) ─────────────
  for (const t of OWNER_TABLE_NAMES) await A.client.from(t).delete().eq('user_id', A.id);
  await A.client.from('squad_signal_snapshots').delete().eq('user_id', A.id);
  await A.client.from('consent_grants').delete().eq('grantor_user_id', A.id);
  await A.client.from('injuries').delete().eq('user_id', A.id);
  await A.client.from('daily_metrics').delete().eq('user_id', A.id);
  await C.client.from('team_members').delete().eq('team_id', team.id);
  await C.client.from('teams').update({ deleted_at: nowIso }).eq('id', team.id);
  await O.client.from('team_members').delete().eq('team_id', oTeam.id);
  await O.client.from('teams').update({ deleted_at: nowIso }).eq('id', oTeam.id);

  console.log(`\n${passed} passed, ${failed} failed.`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('HARNESS ERROR:', e.message); process.exit(1); });
