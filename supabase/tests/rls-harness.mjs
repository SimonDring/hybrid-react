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

  // ══ WP-33: the Team spine — coach reads DERIVED only, team-scoped, never raw ══
  console.log('\nCreating a coach + an outsider coach…');
  const C = await signUpUser('coach');
  const O = await signUpUser('outsider-coach');

  // C founds a team and bootstraps their own coach membership.
  const { data: team, error: teamErr } = await C.client.from('teams')
    .insert({ name: `Harness FC ${stamp}`, sport: 'field_hockey', created_by: C.id }).select('id').single();
  ok(!teamErr && team?.id, `coach founds a team${teamErr ? ` — ${teamErr.message}` : ''}`);
  const { error: bootErr } = await C.client.from('team_members')
    .insert({ team_id: team.id, user_id: C.id, role: 'coach', status: 'active' });
  ok(!bootErr, `founder bootstraps their own coach membership${bootErr ? ` — ${bootErr.message}` : ''}`);

  // O founds a DIFFERENT team (they are a real coach — just not of A's team).
  const { data: oTeam } = await O.client.from('teams')
    .insert({ name: `Rivals ${stamp}`, created_by: O.id }).select('id').single();
  await O.client.from('team_members').insert({ team_id: oTeam.id, user_id: O.id, role: 'coach', status: 'active' });

  // C invites A and B; each player ACCEPTS by updating their own row's status.
  const { error: invErr } = await C.client.from('team_members').insert([
    { team_id: team.id, user_id: A.id, role: 'player', status: 'invited' },
    { team_id: team.id, user_id: B.id, role: 'player', status: 'invited' },
  ]);
  ok(!invErr, `coach invites two players${invErr ? ` — ${invErr.message}` : ''}`);
  const { data: accA } = await A.client.from('team_members')
    .update({ status: 'active' }).eq('team_id', team.id).eq('user_id', A.id).select('id');
  ok((accA || []).length === 1, 'player A accepts their own invite (own-row status update)');
  await B.client.from('team_members').update({ status: 'active' }).eq('team_id', team.id).eq('user_id', B.id);

  // THE ESCALATION ATTACK: A tries to promote themselves to coach.
  const { error: promoErr } = await A.client.from('team_members')
    .update({ role: 'coach' }).eq('team_id', team.id).eq('user_id', A.id);
  ok(!!promoErr, `a player CANNOT self-promote to coach (trigger: ${promoErr ? promoErr.message.slice(0, 40) : 'NOT BLOCKED!'})`);

  // Players publish their own DERIVED status.
  const { error: stErr } = await A.client.from('player_status')
    .insert({ user_id: A.id, team_id: team.id, readiness: 71, load_state: 'balanced', acwr: 1.05, adherence_pct: 88, injury_status: 'available' });
  ok(!stErr, `player A publishes their derived status${stErr ? ` — ${stErr.message}` : ''}`);
  await B.client.from('player_status')
    .insert({ user_id: B.id, team_id: team.id, readiness: 44, load_state: 'ramping', injury_status: 'modified' });

  // ══ S11 — player_status is SERVER-authoritative for the safety fields ═════════
  // A published injury_status:'available' + readiness:71, but A carries an ACTIVE
  // injury (seeded) and a logged readiness_score of 61 — the trigger overrides both.
  const { data: aStatus } = await A.client.from('player_status')
    .select('injury_status, readiness, load_state, adherence_pct').eq('user_id', A.id).single();
  ok(aStatus && aStatus.injury_status === 'modified',
    `S11: a player CANNOT publish a false availability — server derives 'modified' from their injuries (got '${aStatus?.injury_status}')`);
  ok(aStatus && aStatus.readiness === 61,
    `S11: a player CANNOT publish a fake readiness — server uses their logged score 61 (got ${aStatus?.readiness})`);
  ok(aStatus && aStatus.load_state === 'balanced' && aStatus.adherence_pct === 88,
    'S11: the soft engine-computed trend metrics pass through (no drift)');
  // Escalate: give A a red-flagged injury, then A lies again — server derives 'out'.
  await A.client.from('injuries').insert({ user_id: A.id, body_part: 'Left knee', title: 'ACL', status: 'active', red_flag_triggered: true });
  await A.client.from('player_status').update({ injury_status: 'available', readiness: 99 }).eq('user_id', A.id);
  const { data: aStatus2 } = await A.client.from('player_status')
    .select('injury_status, readiness').eq('user_id', A.id).single();
  ok(aStatus2 && aStatus2.injury_status === 'out',
    `S11: a red-flagged injury forces 'out' regardless of what the player writes (got '${aStatus2?.injury_status}')`);
  // garbage soft-metric is clamped, not stored raw
  await A.client.from('player_status').update({ adherence_pct: 9999, load_state: 'HACKED' }).eq('user_id', A.id);
  const { data: aStatus3 } = await A.client.from('player_status').select('adherence_pct, load_state').eq('user_id', A.id).single();
  ok(aStatus3 && aStatus3.adherence_pct === 100 && aStatus3.load_state === null,
    `S11: garbage soft metrics are clamped (adherence ${aStatus3?.adherence_pct}, load_state ${aStatus3?.load_state})`);

  // ══ Coach-board identity (20260709) — display_name is server-derived ═════════
  await A.client.from('users').update({ profile: { name: 'Alice Anderson' } }).eq('id', A.id);
  // a client attempt to publish a FAKE name is overridden from the profile
  await A.client.from('player_status').update({ display_name: 'HACKER' }).eq('user_id', A.id);
  const { data: idRow } = await A.client.from('player_status').select('display_name').eq('user_id', A.id).single();
  ok(idRow && idRow.display_name === 'Alice Anderson',
    `identity: display_name is server-derived from the profile, not the client (got '${idRow?.display_name}')`);
  const { data: coachSeesName } = await C.client.from('player_status').select('user_id, display_name').eq('team_id', team.id);
  ok((coachSeesName || []).some((r) => r.user_id === A.id && r.display_name === 'Alice Anderson'),
    'identity: the coach reads the player names on their team board');

  // The coach reads the WHOLE team's derived board…
  const { data: board } = await C.client.from('player_status').select('user_id, readiness, load_state, injury_status').eq('team_id', team.id);
  ok((board || []).length === 2, `coach reads the team's derived board (${(board || []).length}/2 players)`);

  // …but teammates NEVER see each other,
  const { data: peek } = await A.client.from('player_status').select('readiness').eq('user_id', B.id);
  ok((peek || []).length === 0, "a player cannot read a TEAMMATE's status (players never see each other)");

  // …an outsider coach sees nothing of this team,
  const { data: oBoard } = await O.client.from('player_status').select('readiness').eq('team_id', team.id);
  ok((oBoard || []).length === 0, "another team's coach reads NOTHING of this team");

  // …the coach cannot WRITE a player's status,
  const { data: cWrite } = await C.client.from('player_status')
    .update({ readiness: 99 }).eq('user_id', A.id).select('id');
  ok((cWrite || []).length === 0, "the coach cannot WRITE a player's status (0 rows)");

  // …and — THE BINDING RULE — the coach still reads ZERO raw vitals.
  const { data: coachVitals } = await C.client.from('daily_metrics')
    .select(RAW_VITAL_COLS).eq('user_id', A.id);
  ok((coachVitals || []).length === 0, "THE RULE: the coach reads ZERO raw vitals (hrv/rhr/sleep) of their own player");
  const { data: coachInjury } = await C.client.from('injuries').select('description, rehab_plan').eq('user_id', A.id);
  ok((coachInjury || []).length === 0, 'the coach reads ZERO private injury detail (status comes via player_status only)');

  // THE RE-POINT ATTACK: A tries to move their status onto O's team board.
  const { data: repoint, error: repointErr } = await A.client.from('player_status')
    .update({ team_id: oTeam.id }).eq('user_id', A.id).select('id');
  ok(!!repointErr || (repoint || []).length === 0, "a player cannot re-point their status at a team they're not in");

  // Roster visibility: the coach sees all 3 memberships; a player only their own.
  const { data: rosterC } = await C.client.from('team_members').select('id').eq('team_id', team.id);
  ok((rosterC || []).length === 3, `coach sees the full roster (${(rosterC || []).length}/3)`);
  const { data: rosterA } = await A.client.from('team_members').select('id').eq('team_id', team.id);
  ok((rosterA || []).length === 1, 'a player sees only their OWN membership row (no roster browsing)');

  // Signed-out: the team surfaces leak nothing.
  for (const table of ['teams', 'team_members', 'player_status']) {
    const { data } = await anon.from(table).select('id').limit(5);
    ok((data || []).length === 0, `anon reads nothing from ${table}`);
  }

  // ══ S1 — OAuth state nonces (20260707) ═══════════════════════════════════════
  const { data: nonce, error: mintErr } = await A.client.rpc('issue_oauth_state', { p_provider: 'fitbit' });
  ok(!mintErr && typeof nonce === 'string' && nonce.length >= 32, `S1: an authenticated user mints a state nonce (${nonce ? nonce.length : 0} chars)`);
  const { error: badProv } = await A.client.rpc('issue_oauth_state', { p_provider: 'evil' });
  ok(!!badProv, 'S1: minting rejects an unknown provider');
  // the nonce table is NOT directly readable (no anon/authenticated policy) — a nonce is never client-visible
  const { data: statePeek } = await A.client.from('oauth_states').select('nonce, user_id').limit(5);
  ok((statePeek || []).length === 0, 'S1: oauth_states is not directly readable by a client (nonce stays secret)');
  // consume is service_role-only — an authenticated client cannot resolve/forge identities
  const { error: consumeErr } = await A.client.rpc('consume_oauth_state', { p_nonce: nonce, p_provider: 'fitbit' });
  ok(!!consumeErr, 'S1: consume_oauth_state is denied to authenticated clients (service_role only)');
  // an anon (signed-out) client cannot mint at all
  const { error: anonMint } = await anon.rpc('issue_oauth_state', { p_provider: 'fitbit' });
  ok(!!anonMint, 'S1: a signed-out client cannot mint a nonce');

  // ══ Security hardening (20260706) — token columns + free-text bounds ══════════
  // S2: the raw OAuth token columns are unreadable even by the owning session.
  const { error: tokErr } = await A.client.from('wearable_connections').select('access_token, refresh_token').limit(1);
  ok(!!tokErr, `S2: selecting access_token/refresh_token is DENIED at the column level (${tokErr ? tokErr.code || 'error' : 'NOT DENIED!'})`);
  const { error: okColErr } = await A.client.from('wearable_connections').select('provider, connected_at').limit(1);
  ok(!okColErr, 'S2: the non-token columns are still readable (app path unbroken)');

  // S3: oversized coach-visible free-text is rejected by DB CHECK constraints.
  const injRow = inserted.find((r) => r.table === 'injuries');
  const { error: bodyErr } = await A.client.from('injuries').update({ body_part: 'x'.repeat(200) }).eq('id', injRow.id).select('id');
  ok(!!bodyErr, `S3: a 200-char injury body_part is rejected (${bodyErr ? bodyErr.code || 'error' : 'ACCEPTED!'})`);
  const { error: okBodyErr } = await A.client.from('injuries').update({ body_part: 'Right hamstring' }).eq('id', injRow.id).select('id');
  ok(!okBodyErr, 'S3: a normal body_part still updates fine');
  const { error: teamNameErr } = await C.client.from('teams').insert({ name: 'T'.repeat(200), created_by: C.id }).select('id');
  ok(!!teamNameErr, `S3: a 200-char team name is rejected (${teamNameErr ? teamNameErr.code || 'error' : 'ACCEPTED!'})`);

  // S9: a member removed by a coach cannot resurrect their own membership.
  await C.client.from('team_members').update({ status: 'left' }).eq('team_id', team.id).eq('user_id', B.id);
  const { error: rejoinErr } = await B.client.from('team_members').update({ status: 'active' }).eq('team_id', team.id).eq('user_id', B.id);
  ok(!!rejoinErr, `S9: a removed member cannot flip their own status back to active (${rejoinErr ? 'blocked' : 'NOT BLOCKED!'})`);

  // ══ Join codes (20260710) — founding + self-join ════════════════════════════
  const { data: jt, error: ctErr } = await C.client.rpc('create_team', { p_name: 'JoinTest FC', p_sport: 'field_hockey' });
  const joinTeam = Array.isArray(jt) ? jt[0] : jt;
  ok(!ctErr && joinTeam && joinTeam.join_code && joinTeam.join_code.length === 6,
    `join: a coach founds a team via create_team and gets a 6-char code (${joinTeam?.join_code})`);
  // C is auto-seated as coach
  const { data: cMem } = await C.client.from('team_members').select('role,status').eq('team_id', joinTeam.id).eq('user_id', C.id).single();
  ok(cMem && cMem.role === 'coach' && cMem.status === 'active', 'join: the founder is auto-seated as active coach');

  // A joins with the code (case-insensitive) → active player membership
  const { data: joined, error: jErr } = await A.client.rpc('join_team_with_code', { p_code: joinTeam.join_code.toLowerCase() });
  ok(!jErr && (Array.isArray(joined) ? joined[0] : joined)?.id === joinTeam.id, `join: a player self-joins by code (case-insensitive)${jErr ? ' — ' + jErr.message : ''}`);
  const { data: aJoin } = await A.client.from('team_members').select('role,status').eq('team_id', joinTeam.id).eq('user_id', A.id).single();
  ok(aJoin && aJoin.role === 'player' && aJoin.status === 'active', 'join: the joiner is an active player');

  // idempotent: joining again is a no-op (still one membership, no error)
  const { error: reErr } = await A.client.rpc('join_team_with_code', { p_code: joinTeam.join_code });
  const { count: aCount } = await A.client.from('team_members').select('id', { count: 'exact', head: true }).eq('team_id', joinTeam.id).eq('user_id', A.id);
  ok(!reErr && aCount === 1, 'join: re-joining is idempotent (one membership)');

  // invalid code rejected
  const { error: badErr } = await B.client.rpc('join_team_with_code', { p_code: 'ZZZZZZ' });
  ok(!!badErr, 'join: an invalid code is rejected');

  // rotate: coach-only; old code stops working, new code works
  const { data: newCode, error: rotErr } = await C.client.rpc('rotate_team_code', { p_team: joinTeam.id });
  ok(!rotErr && typeof newCode === 'string' && newCode !== joinTeam.join_code, `join: a coach rotates the code (${newCode})`);
  const { error: oldErr } = await B.client.rpc('join_team_with_code', { p_code: joinTeam.join_code });
  ok(!!oldErr, 'join: the OLD code no longer works after rotation');
  const { error: bRotErr } = await B.client.rpc('rotate_team_code', { p_team: joinTeam.id });
  ok(!!bRotErr, 'join: a non-coach cannot rotate the code');
  const { error: bJoinErr } = await B.client.rpc('join_team_with_code', { p_code: newCode });
  ok(!bJoinErr, 'join: the NEW code works');

  // removal respected: C removes A, A cannot rejoin via code
  await C.client.from('team_members').update({ status: 'left' }).eq('team_id', joinTeam.id).eq('user_id', A.id);
  const { error: rejErr } = await A.client.rpc('join_team_with_code', { p_code: newCode });
  ok(!!rejErr, 'join: a coach-removed player cannot rejoin via the code');

  // ══ WP-50 (20260711) — team-scoped coach reads + join_code column lockdown ═══
  // (a) A TWO-TEAM PLAYER: put A on O's team too (A is already active on C's
  // team with a status row). Each coach must read ONLY their own team's row.
  await O.client.from('team_members').insert({ team_id: oTeam.id, user_id: A.id, role: 'player', status: 'invited' });
  await A.client.from('team_members').update({ status: 'active' }).eq('team_id', oTeam.id).eq('user_id', A.id);
  const { error: twoErr } = await A.client.from('player_status')
    .insert({ user_id: A.id, team_id: oTeam.id, readiness: 55, load_state: 'ramping' });
  ok(!twoErr, `WP-50: the two-team player publishes a status row on EACH team${twoErr ? ` — ${twoErr.message}` : ''}`);
  const { data: xView } = await C.client.from('player_status').select('team_id').eq('user_id', A.id);
  ok((xView || []).length === 1 && xView[0].team_id === team.id,
    `WP-50: coach X reads ONLY their own team's row for a two-team player (${(xView || []).length}/1)`);
  const { data: yView } = await O.client.from('player_status').select('team_id').eq('user_id', A.id);
  ok((yView || []).length === 1 && yView[0].team_id === oTeam.id,
    "WP-50: coach Y CANNOT read the player's team-X row (coach reads are TEAM-scoped, not player-scoped)");
  const { data: selfView } = await A.client.from('player_status').select('team_id').eq('user_id', A.id);
  ok((selfView || []).length === 2, 'WP-50: the player still reads BOTH of their own rows');

  // (b) join_code is column-revoked: a MEMBER's select of it errors; the other
  // columns still read fine (app path unbroken). The revoke is role-wide, so
  // even the coach's DIRECT select errors — coaches go through the RPC.
  const { error: codePeek } = await A.client.from('teams').select('join_code').eq('id', oTeam.id);
  ok(!!codePeek, `WP-50: a team MEMBER cannot select teams.join_code (${codePeek ? codePeek.code || 'denied' : 'NOT DENIED!'})`);
  const { data: teamMeta, error: metaErr } = await A.client.from('teams').select('id, name, sport').eq('id', oTeam.id);
  ok(!metaErr && (teamMeta || []).length === 1, 'WP-50: the member still reads the team name/sport (non-code columns granted)');
  const { error: coachPeek } = await C.client.from('teams').select('join_code').eq('id', joinTeam.id);
  ok(!!coachPeek, 'WP-50: even a coach cannot select join_code directly (column revoked role-wide — the RPC is the path)');

  // (c) get_team_join_code: the coach gets the code; an outsider and a mere
  // member are refused.
  const { data: gotCode, error: gotErr } = await C.client.rpc('get_team_join_code', { p_team: joinTeam.id });
  ok(!gotErr && gotCode === newCode, `WP-50: the coach reads the code via the RPC (${gotCode})`);
  const { error: oGetErr } = await O.client.rpc('get_team_join_code', { p_team: joinTeam.id });
  ok(!!oGetErr, "WP-50: another team's coach cannot read the code via the RPC");
  const { error: aGetErr } = await A.client.rpc('get_team_join_code', { p_team: team.id });
  ok(!!aGetErr, 'WP-50: a player (non-coach member) cannot read their own team code via the RPC');

  // WP-50 cleanup: A's extra membership + status row on O's team go with the
  // existing oTeam/player_status cleanup below.

  // ══ F3 (20260712) — an ENDED membership ends the coach's read ════════════════
  // docs/reviews/2026-07-09-data-architecture-review.md F3: a coach-removed
  // player's derived row previously survived AND stayed coach-readable. Two
  // layers under test: the policy (coach read requires the player's ACTIVE
  // membership) and the cleanup trigger (the row itself is deleted).
  // (a) The coach-removal path: C removes B from the roster (hard DELETE).
  const { data: preRemove } = await C.client.from('player_status')
    .select('user_id').eq('team_id', team.id).eq('user_id', B.id);
  ok((preRemove || []).length === 1, "F3: pre-check — the coach reads B's row while B is an active member");
  const { data: removedRows } = await C.client.from('team_members')
    .delete().eq('team_id', team.id).eq('user_id', B.id).select('id');
  ok((removedRows || []).length === 1, 'F3: the coach removes B from the roster');
  const { data: postRemove } = await C.client.from('player_status')
    .select('user_id').eq('team_id', team.id).eq('user_id', B.id);
  ok((postRemove || []).length === 0, "F3: the coach can NO LONGER read the removed player's status row");
  const { data: bOwnRow } = await B.client.from('player_status')
    .select('id').eq('team_id', team.id).eq('user_id', B.id);
  ok((bOwnRow || []).length === 0, "F3: the derived row itself is GONE (cleanup trigger) — even B's own read finds nothing");
  // (b) The self-'left' path: A marks themselves left on O's team WITHOUT the
  // client deleting the row — the trigger must do it, and O loses the read.
  const { data: leftUpd } = await A.client.from('team_members')
    .update({ status: 'left' }).eq('team_id', oTeam.id).eq('user_id', A.id).select('id');
  ok((leftUpd || []).length === 1, 'F3: A marks themselves left on team Y (own-row status update)');
  const { data: oPostLeft } = await O.client.from('player_status')
    .select('user_id').eq('team_id', oTeam.id).eq('user_id', A.id);
  ok((oPostLeft || []).length === 0, "F3: coach Y can no longer read the departed player's row");
  const { data: aOwnY } = await A.client.from('player_status')
    .select('id').eq('team_id', oTeam.id).eq('user_id', A.id);
  ok((aOwnY || []).length === 0, 'F3: the team-Y derived row is gone (trigger), with no client-side delete');
  // (c) An ex-member cannot republish (insert requires ACTIVE membership).
  const { error: republishErr } = await B.client.from('player_status')
    .insert({ user_id: B.id, team_id: team.id, readiness: 50 });
  ok(!!republishErr, 'F3: a removed player cannot republish a status row (insert requires active membership)');

  // join-code cleanup
  await A.client.from('player_status').delete().eq('user_id', A.id);
  await C.client.from('team_members').delete().eq('team_id', joinTeam.id);
  await C.client.from('teams').update({ deleted_at: new Date().toISOString() }).eq('id', joinTeam.id);

  // Team-spine cleanup: statuses (own delete), roster (coach delete), team (soft-delete).
  await A.client.from('player_status').delete().eq('user_id', A.id);
  await B.client.from('player_status').delete().eq('user_id', B.id);
  await C.client.from('team_members').delete().eq('team_id', team.id);
  await C.client.from('teams').update({ deleted_at: new Date().toISOString() }).eq('id', team.id);
  await O.client.from('team_members').delete().eq('team_id', oTeam.id);
  await O.client.from('teams').update({ deleted_at: new Date().toISOString() }).eq('id', oTeam.id);

  // ── cleanup the seeded data rows ────────────────────────────────────────────
  for (const r of inserted) await r.client.from(r.table).delete().eq('id', r.id);
  console.log(`\nCleanup: ${inserted.length} seeded rows removed (throwaway auth users remain — sandbox).`);

  console.log(`\n${passed} passed, ${failed} failed.`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('HARNESS ERROR:', e.message); process.exit(1); });
