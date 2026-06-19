/**
 * SyncService — online-first sync layer between the app and Supabase.
 *
 * Architecture:
 *   Screens → trainingStore → SyncService → Supabase (primary)
 *                                        ↘ Database.js / localStorage (cache + fallback)
 *
 * Online-first means:
 *   - Writes go to Supabase first. On success, localStorage is updated as cache.
 *   - If Supabase fails (offline / error), falls back to localStorage.
 *   - On app startup (pullFromSupabase), fresh data is fetched from Supabase
 *     and replaces the local cache so every device starts up-to-date.
 *
 * IMPORTANT: this module is only active when the user is signed in AND Supabase
 * is configured. When either condition is false, every method delegates straight
 * to Database.services (localStorage only). This preserves the dev experience
 * when keys aren't set, and keeps things working offline.
 *
 * Table mapping (Supabase snake_case → localStorage camelCase):
 *   users                → users
 *   training_plans       → plans
 *   sessions             → sessions
 *   session_logs         → sessionLogs
 *   weekly_checkins      → weeklyCheckins
 *   reassessments        → reassessments
 *   daily_metrics        → dailyMetrics
 *   injuries             → injuries
 *   wearable_readings    → wearableReadings
 *
 * Why not rewrite Database.js: it's stable, tested, and other things depend on
 * its synchronous API. SyncService wraps it rather than replacing it, keeping
 * the blast radius of this change minimal.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import Database from './Database.js';
import * as Storage from './Storage.js';


// ---------- Helpers ----------

// Get the current Supabase user id. Returns null if not signed in.
function uid() {
  try {
    // Supabase stores the session in localStorage; we can read it synchronously.
    const raw = localStorage.getItem('sb-' + new URL(import.meta.env.VITE_SUPABASE_URL || 'https://x.x').hostname.split('.')[0] + '-auth-token');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user?.id || null;
  } catch {
    return null;
  }
}

// Is Supabase available for use right now?
function canSync() {
  return isSupabaseConfigured && !!uid();
}

// Log sync errors without crashing
function logError(context, error) {
  console.warn(`[SyncService] ${context}:`, error?.message || error);
}

// Decide which tables to replace after a cloud pull. A table whose query errored
// is skipped (we keep whatever is cached rather than blanking it), so one failed
// query can never strand the previous account's rows for the others.
export function pullTablesToReplace(results) {
  return Object.keys(results).filter((key) => !(results[key] && results[key].error));
}

// Strip fields Supabase doesn't accept on insert/upsert
// (Supabase generates id server-side via triggers, but we send our own uuid —
// that's fine. We just need to remove undefined values and ensure user_id.)
function clean(obj, userId) {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined) out[k] = v;
  });
  if (userId && !out.user_id) out.user_id = userId;
  return out;
}

// ---------- Session D: one-time local → Supabase migration ----------

/**
 * Push every existing localStorage record up to Supabase, replacing the local
 * user's UUID with the real Supabase auth.uid() so RLS policies are satisfied.
 *
 * Why: before Supabase auth was wired up, all data was stored with a locally-
 * generated UUID as user_id. Now that the user is signed in, Supabase assigns
 * a different UUID (auth.uid()). This migration remaps the FK and upserts every
 * record. It is idempotent — safe to run more than once — and marks itself done
 * in localStorage so it only does real work the first time.
 *
 * Run order in syncFromCloud(): migrate first, then pull. This ensures Supabase
 * has the full history before we overwrite localStorage with the cloud copy.
 */
export async function runSessionDMigration() {
  if (!canSync()) return { ok: false, reason: 'not signed in' };

  // Already done on this device — nothing to do
  if (Storage.load(Storage.KEYS.sessionDMigrated, false)) {
    return { ok: true, skipped: true };
  }

  const userId = uid(); // real Supabase auth.uid()

  // Strip undefined values and force user_id to the real Supabase auth.uid().
  // All local records have user_id set to the local UUID — we overwrite it here.
  const remap = (r) => {
    const out = {};
    for (const [k, v] of Object.entries(r)) {
      if (v !== undefined) out[k] = v;
    }
    out.user_id = userId;
    return out;
  };

  const sessions      = Database.tables.sessions.all().map(remap);
  const sessionLogs   = Database.tables.sessionLogs.all().map(remap);
  const checkins      = Database.tables.weeklyCheckins.all().map(remap);
  const reassessments = Database.tables.reassessments.all().map(remap);
  const dailyMetrics  = Database.tables.dailyMetrics.all().map(remap);
  const injuries      = Database.tables.injuries.all().map(remap);
  const localUser     = Database.tables.users.find(() => true);

  const ops = [];

  if (sessions.length)
    ops.push(supabase.from('sessions').upsert(sessions, { onConflict: 'id' }));
  if (sessionLogs.length)
    ops.push(supabase.from('session_logs').upsert(sessionLogs, { onConflict: 'id' }));
  if (checkins.length)
    ops.push(supabase.from('weekly_checkins').upsert(checkins, { onConflict: 'id' }));
  if (reassessments.length)
    ops.push(supabase.from('reassessments').upsert(reassessments, { onConflict: 'id' }));
  if (dailyMetrics.length)
    ops.push(supabase.from('daily_metrics').upsert(dailyMetrics, { onConflict: 'id' }));
  if (injuries.length)
    ops.push(supabase.from('injuries').upsert(injuries, { onConflict: 'id' }));

  // The signup trigger already created the users row. Just update the profile.
  if (localUser) {
    ops.push(
      supabase.from('users')
        .update({
          profile: localUser.profile || {},
          settings: localUser.settings || {},
          name: localUser.name || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
    );
  }

  try {
    const results = await Promise.all(ops);
    const errors = results.map(r => r.error).filter(Boolean);
    if (errors.length) {
      logError('runSessionDMigration', errors[0]);
      return { ok: false, reason: errors[0].message };
    }
  } catch (err) {
    logError('runSessionDMigration (exception)', err);
    return { ok: false, reason: err.message };
  }

  Storage.save(Storage.KEYS.sessionDMigrated, true);

  return {
    ok: true,
    counts: {
      sessions:      sessions.length,
      sessionLogs:   sessionLogs.length,
      checkins:      checkins.length,
      reassessments: reassessments.length,
      dailyMetrics:  dailyMetrics.length,
      injuries:      injuries.length
    }
  };
}

// ---------- Startup pull ----------

/**
 * Pull all data for the signed-in user from Supabase and replace localStorage.
 * Called once on startup (after auth is confirmed).
 * This is what makes cross-device sync work — open the app, get fresh data.
 */
export async function pullFromSupabase() {
  if (!canSync()) return { ok: false, reason: 'not configured or not signed in' };

  const userId = uid();

  try {
    // Fetch all tables in parallel.
    // NOTE: wearable_readings is intentionally NOT pulled — wearable data is
    // displayed via daily_metrics; wearable_readings is legacy/unused on the
    // client. It is still namespaced + cleared per user (see Storage), so its
    // exclusion from the pull is not an isolation gap.
    const [
      usersRes, plansRes, sessionsRes, logsRes,
      checkinsRes, reassessRes, dailyRes, injuriesRes, workoutsRes
    ] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).is('deleted_at', null),
      supabase.from('training_plans').select('*').eq('user_id', userId).is('deleted_at', null),
      supabase.from('sessions').select('*').eq('user_id', userId).is('deleted_at', null),
      supabase.from('session_logs').select('*').eq('user_id', userId).is('deleted_at', null),
      supabase.from('weekly_checkins').select('*').eq('user_id', userId).is('deleted_at', null),
      supabase.from('reassessments').select('*').eq('user_id', userId).is('deleted_at', null),
      supabase.from('daily_metrics').select('*').eq('user_id', userId).is('deleted_at', null),
      supabase.from('injuries').select('*').eq('user_id', userId).is('deleted_at', null),
      supabase.from('workouts').select('*').eq('user_id', userId).is('deleted_at', null)
    ]);

    const resultsByTable = {
      users: usersRes, plans: plansRes, sessions: sessionsRes, sessionLogs: logsRes,
      weeklyCheckins: checkinsRes, reassessments: reassessRes, dailyMetrics: dailyRes,
      injuries: injuriesRes, workouts: workoutsRes
    };

    // Log any per-table errors but do NOT abort — replace every table that came
    // back cleanly so a single failure can't leave another account's rows behind.
    Object.entries(resultsByTable).forEach(([key, res]) => {
      if (res && res.error) logError(`pullFromSupabase:${key}`, res.error);
    });

    const replaceable = pullTablesToReplace(resultsByTable);

    // users: only replace if we actually got the signed-in user's row (never blank
    // out the active profile on a transient empty/errored fetch).
    if (replaceable.includes('users') && usersRes.data?.length) {
      Database.tables.users.replaceAll(usersRes.data);
    }
    if (replaceable.includes('plans'))          Database.tables.plans.replaceAll(plansRes.data || []);
    if (replaceable.includes('sessions'))       Database.tables.sessions.replaceAll(sessionsRes.data || []);
    if (replaceable.includes('sessionLogs'))    Database.tables.sessionLogs.replaceAll(logsRes.data || []);
    if (replaceable.includes('weeklyCheckins')) Database.tables.weeklyCheckins.replaceAll(checkinsRes.data || []);
    if (replaceable.includes('reassessments')) Database.tables.reassessments.replaceAll(reassessRes.data || []);
    if (replaceable.includes('dailyMetrics'))   Database.tables.dailyMetrics.replaceAll(dailyRes.data || []);
    if (replaceable.includes('injuries'))       Database.tables.injuries.replaceAll(injuriesRes.data || []);
    if (replaceable.includes('workouts'))       Database.tables.workouts.replaceAll(workoutsRes.data || []);

    const failed = Object.keys(resultsByTable).filter((k) => !replaceable.includes(k));
    return { ok: failed.length === 0, failed };
  } catch (err) {
    logError('pullFromSupabase (exception)', err);
    return { ok: false, reason: err.message };
  }
}

// ---------- Profile / user ----------

export async function updateProfile(patch) {
  if (!canSync()) return Database.services.updateProfile(patch);
  const userId = uid();
  const profile = { ...(Database.services.getProfile()), ...patch };
  const { error } = await supabase
    .from('users')
    .update({ profile, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) {
    logError('updateProfile', error);
    return Database.services.updateProfile(patch);
  }
  return Database.services.updateProfile(patch);
}

export async function setGoals(goals) {
  return updateProfile({ goals });
}

/**
 * Soft-delete all the user's logged training data in the cloud (sessions,
 * check-ins, daily metrics, injuries, reassessments) — but keep the account and
 * profile. Uses bulk update of deleted_at, so it works with the existing
 * update-own-rows RLS (no migration needed). The plan + history disappear from
 * the app because pullFromSupabase() filters deleted_at IS NULL.
 * @returns {{ ok:boolean, local?:boolean, error?:string }}
 */
export async function deleteTrainingData() {
  if (!canSync()) return { ok: true, local: true };
  const userId = uid();
  const stamp = new Date().toISOString();
  const tables = ['session_logs', 'sessions', 'weekly_checkins', 'reassessments', 'daily_metrics', 'injuries'];
  for (const t of tables) {
    const { error } = await supabase.from(t).update({ deleted_at: stamp }).eq('user_id', userId).is('deleted_at', null);
    if (error) { logError('deleteTrainingData:' + t, error); return { ok: false, error: error.message }; }
  }
  return { ok: true };
}

/**
 * Permanently delete the signed-in user's account + all their cloud data via the
 * server-side delete_user() function (see supabase/migrations/003_delete_user.sql).
 * Local data is cleared separately by the caller after this resolves.
 * @returns {{ ok:boolean, local?:boolean, error?:string }}
 */
export async function deleteAccount() {
  if (!canSync()) return { ok: true, local: true }; // offline / not configured — local only
  const { error } = await supabase.rpc('delete_user');
  if (error) {
    logError('deleteAccount', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ---------- Sessions ----------

export async function startSession(templateRef) {
  if (!canSync()) return Database.services.startSession(templateRef);
  const userId = uid();
  // Ensure local session record exists first
  Database.services.startSession(templateRef);
  const local = Database.tables.sessions.find(s => s.template_ref === templateRef);
  if (!local) return;
  const { error } = await supabase
    .from('sessions')
    .upsert(clean(local, userId), { onConflict: 'id' });
  if (error) logError('startSession', error);
}

export async function completeSession(templateRef, payload) {
  if (!canSync()) return Database.services.completeSession(templateRef, payload);
  const userId = uid();
  Database.services.completeSession(templateRef, payload);
  const session = Database.tables.sessions.find(s => s.template_ref === templateRef);
  const log = session ? Database.tables.sessionLogs.find(l => l.session_id === session.id) : null;
  const ops = [];
  if (session) ops.push(supabase.from('sessions').upsert(clean(session, userId), { onConflict: 'id' }));
  if (log)     ops.push(supabase.from('session_logs').upsert(clean(log, userId), { onConflict: 'id' }));
  const results = await Promise.all(ops);
  results.forEach(r => { if (r.error) logError('completeSession', r.error); });
}

export async function uncompleteSession(templateRef) {
  if (!canSync()) return Database.services.uncompleteSession(templateRef);
  const userId = uid();
  const before = Database.tables.sessions.find(s => s.template_ref === templateRef);
  const log = before ? Database.tables.sessionLogs.find(l => l.session_id === before.id) : null;
  Database.services.uncompleteSession(templateRef);
  // Re-read so we push the reverted (pending, started_at null) state, not the
  // pre-uncomplete snapshot — otherwise the next cloud sync resurrects it as done.
  const updated = Database.tables.sessions.find(s => s.template_ref === templateRef);
  const ops = [];
  if (updated) ops.push(supabase.from('sessions').upsert(clean(updated, userId), { onConflict: 'id' }));
  // Soft-delete the log in Supabase
  if (log) ops.push(
    supabase.from('session_logs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', log.id)
  );
  const results = await Promise.all(ops);
  results.forEach(r => { if (r.error) logError('uncompleteSession', r.error); });
}

export async function cancelSession(templateRef) {
  if (!canSync()) return Database.services.cancelSession(templateRef);
  const userId = uid();
  const session = Database.tables.sessions.find(s => s.template_ref === templateRef);
  const log = session ? Database.tables.sessionLogs.find(l => l.session_id === session.id) : null;
  Database.services.cancelSession(templateRef);
  // Re-read so we push the reverted (pending, started_at null) state, not the
  // pre-cancel snapshot.
  const updated = Database.tables.sessions.find(s => s.template_ref === templateRef);
  const ops = [];
  if (updated) ops.push(supabase.from('sessions').upsert(clean(updated, userId), { onConflict: 'id' }));
  if (log) ops.push(
    supabase.from('session_logs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', log.id)
  );
  const results = await Promise.all(ops);
  results.forEach(r => { if (r.error) logError('cancelSession', r.error); });
}

export async function skipSession(templateRef) {
  if (!canSync()) return Database.services.skipSession(templateRef);
  const userId = uid();
  const before = Database.tables.sessions.find(s => s.template_ref === templateRef);
  const log = before ? Database.tables.sessionLogs.find(l => l.session_id === before.id) : null;
  Database.services.skipSession(templateRef);
  // Re-read so we push the updated (skipped) state, not the pre-skip snapshot.
  const updated = Database.tables.sessions.find(s => s.template_ref === templateRef);
  const ops = [];
  if (updated) ops.push(supabase.from('sessions').upsert(clean(updated, userId), { onConflict: 'id' }));
  if (log) ops.push(
    supabase.from('session_logs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', log.id)
  );
  const results = await Promise.all(ops);
  results.forEach(r => { if (r.error) logError('skipSession', r.error); });
}

// ---------- Weekly check-ins ----------

export async function addCheckin(fields) {
  if (!canSync()) return Database.services.addCheckin(fields);
  const userId = uid();
  // addCheckin returns the created record (with its id) — use that directly
  // rather than guessing via sort order, which breaks for back-dated entries.
  const created = Database.services.addCheckin(fields);
  if (!created || !created.id) {
    logError('addCheckin', 'no record returned from local create');
    return created;
  }
  const { error } = await supabase
    .from('weekly_checkins')
    .upsert(clean(created, userId), { onConflict: 'id' });
  if (error) logError('addCheckin', error);
  return created;
}

export async function deleteCheckin(id) {
  if (!canSync()) {
    Database.tables.weeklyCheckins.remove(id);
    return;
  }
  Database.tables.weeklyCheckins.remove(id);
  const { error } = await supabase
    .from('weekly_checkins')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) logError('deleteCheckin', error);
}

// ---------- Daily metrics ----------

export async function upsertDailyMetric(fields) {
  if (!canSync()) return Database.services.upsertDailyMetric(fields);
  const userId = uid();
  const result = Database.services.upsertDailyMetric(fields);
  if (!result) return;
  const { error } = await supabase
    .from('daily_metrics')
    .upsert(clean(result, userId), { onConflict: 'id' });
  if (error) logError('upsertDailyMetric', error);
  return result;
}

// ---------- Reassessments ----------

export async function setReassessAnswer(qid, value) {
  if (!canSync()) return Database.services.setReassessAnswer(qid, value);
  const userId = uid();
  Database.services.setReassessAnswer(qid, value);
  const all = Database.tables.reassessments.all();
  const record = all.find(r => r.user_id === userId || r.quarter_number === 1);
  if (!record) return;
  const { error } = await supabase
    .from('reassessments')
    .upsert(clean(record, userId), { onConflict: 'id' });
  if (error) logError('setReassessAnswer', error);
}

// ---------- Injuries ----------

export async function addInjury(fields) {
  if (!canSync()) return Database.services.addInjury(fields);
  const userId = uid();
  const result = Database.services.addInjury(fields);
  if (!result) return result;
  const { error } = await supabase
    .from('injuries')
    .upsert(clean(result, userId), { onConflict: 'id' });
  if (error) logError('addInjury', error);
  return result;
}

export async function updateInjury(id, patch) {
  if (!canSync()) return Database.services.updateInjury(id, patch);
  const userId = uid();
  const result = Database.services.updateInjury(id, patch);
  const updated = Database.tables.injuries.get(id);
  if (!updated) return result;
  const { error } = await supabase
    .from('injuries')
    .upsert(clean(updated, userId), { onConflict: 'id' });
  if (error) logError('updateInjury', error);
  return result;
}

export async function removeInjury(id) {
  if (!canSync()) return Database.services.removeInjury(id);
  Database.services.removeInjury(id);
  const { error } = await supabase
    .from('injuries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) logError('removeInjury', error);
}

export async function addRecoveryLogEntry(injuryId, entry) {
  if (!canSync()) return Database.services.addRecoveryLogEntry(injuryId, entry);
  const userId = uid();
  const result = Database.services.addRecoveryLogEntry(injuryId, entry);
  const updated = Database.tables.injuries.get(injuryId);
  if (!updated) return result;
  const { error } = await supabase
    .from('injuries')
    .upsert(clean(updated, userId), { onConflict: 'id' });
  if (error) logError('addRecoveryLogEntry', error);
  return result;
}

// ---------- Fitbit ----------

// Build the Google Health API OAuth URL.
// access_type=offline gets a refresh token. prompt=consent forces the consent screen
// so a refresh token is always issued (required on first connect and after scope changes).
export function getFitbitAuthUrl(userId) {
  const clientId    = import.meta.env.VITE_FITBIT_CLIENT_ID;
  const oauthBase   = import.meta.env.VITE_FITBIT_OAUTH_URL ?? 'https://accounts.google.com/o/oauth2/v2/auth';
  const redirectUri = encodeURIComponent(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fitbit-auth-callback`
  );
  const scopes = encodeURIComponent([
    'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
    'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
    'https://www.googleapis.com/auth/googlehealth.sleep.readonly'
  ].join(' '));
  return `${oauthBase}?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&state=${userId}&access_type=offline&prompt=consent`;
}

// Check if Fitbit is connected for the signed-in user.
export async function checkFitbitConnection() {
  if (!canSync()) return null;
  const { data, error } = await supabase
    .from('wearable_connections')
    .select('provider, connected_at, last_synced_at')
    .eq('provider', 'fitbit')
    .maybeSingle();
  if (error) { logError('checkFitbitConnection', error); return null; }
  return data || null;
}

// How many days after the last consent we start nudging to reconnect. Google
// expires refresh tokens ~7 days after consent while the OAuth app is in
// "Testing" mode, so we warn a little before that.
const RECONNECT_SOON_DAYS = 6;
// A sync error mentioning any of these is fixable by re-authorising (reconnect).
const TOKEN_ERROR_RE = /token|refresh|grant|auth|connect/i;

// Decide whether to nudge the user to reconnect Fitbit. Pure + side-effect free
// so it's easy to test. Inputs: the connection's connected_at (last consent) and
// the last sync error reason (if any). Returns one of:
//   'reconnect_now'  — a sync failed for a reconnect-fixable (token/auth) reason
//   'reconnect_soon' — no such error, but consent is old enough that the token
//                      will expire soon (proactive heads-up)
//   'ok'             — nothing to do
export function fitbitReconnectState({ connectedAt, errorReason } = {}) {
  if (errorReason && TOKEN_ERROR_RE.test(errorReason)) return 'reconnect_now';
  if (connectedAt) {
    const t = new Date(connectedAt).getTime();
    if (!isNaN(t)) {
      const days = (Date.now() - t) / (1000 * 60 * 60 * 24);
      if (days >= RECONNECT_SOON_DAYS) return 'reconnect_soon';
    }
  }
  return 'ok';
}

// Pick the most useful message out of an Edge Function's JSON error body.
// The fitbit-sync function returns { error, detail } — `detail` is the specific
// cause (e.g. the Google token-refresh failure text), so prefer it.
export function pickFitbitErrorReason(body, fallback) {
  if (body && typeof body === 'object') {
    return body.detail || body.error || fallback;
  }
  return fallback;
}

// Trigger the fitbit-sync Edge Function for a date range.
// date_from / date_to default to today inside the function if omitted.
export async function syncFitbit(dateFrom, dateTo) {
  if (!canSync()) return { ok: false, reason: 'not signed in' };
  try {
    const body = {};
    if (dateFrom) body.date_from = dateFrom;
    if (dateTo)   body.date_to   = dateTo;
    const { data, error } = await supabase.functions.invoke('fitbit-sync', { body });
    if (error) {
      logError('syncFitbit', error);
      // supabase-js reports a non-2xx as a generic FunctionsHttpError whose real
      // payload lives in error.context (the raw Response). Read it so the actual
      // reason — e.g. "Token refresh failed / invalid_grant" — reaches the UI
      // instead of a useless "non-2xx status code" message.
      let reason = error.message;
      try {
        if (error.context && typeof error.context.json === 'function') {
          const errBody = await error.context.json();
          reason = pickFitbitErrorReason(errBody, reason);
        }
      } catch { /* keep the generic reason if the body can't be parsed */ }
      return { ok: false, reason };
    }
    return data;
  } catch (err) {
    logError('syncFitbit (exception)', err);
    return { ok: false, reason: err.message };
  }
}

// Build the Strava OAuth authorize URL. client_id is public (browser-safe);
// the secret stays in the Edge Function. scope=activity:read_all reads all
// activities incl. ones marked private. state carries the Supabase user id.
export function getStravaAuthUrl(userId) {
  const clientId    = import.meta.env.VITE_STRAVA_CLIENT_ID;
  const redirectUri = encodeURIComponent(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strava-auth-callback`
  );
  return `https://www.strava.com/oauth/authorize?client_id=${clientId}` +
    `&response_type=code&redirect_uri=${redirectUri}` +
    `&approval_prompt=force&scope=activity:read_all&state=${userId}`;
}

// Trigger the strava-sync Edge Function. Reads the real failure reason from the
// function's response body (same approach as syncFitbit).
export async function syncStrava() {
  if (!canSync()) return { ok: false, reason: 'not signed in' };
  try {
    const { data, error } = await supabase.functions.invoke('strava-sync', { body: {} });
    if (error) {
      logError('syncStrava', error);
      let reason = error.message;
      try {
        if (error.context && typeof error.context.json === 'function') {
          const errBody = await error.context.json();
          reason = pickFitbitErrorReason(errBody, reason);
        }
      } catch { /* keep generic reason */ }
      return { ok: false, reason };
    }
    return data;
  } catch (err) {
    logError('syncStrava (exception)', err);
    return { ok: false, reason: err.message };
  }
}

// Read ALL of the user's wearable connections (RLS-scoped). Returns [] when not
// signed in or on error. Each row: { provider, role, connected_at, last_synced_at }.
export async function checkConnections() {
  if (!canSync()) return [];
  const { data, error } = await supabase
    .from('wearable_connections')
    .select('provider, role, connected_at, last_synced_at');
  if (error) { logError('checkConnections', error); return []; }
  return data || [];
}

// Make `provider` the user's sole primary device. Done server-side in one atomic
// statement (see migration 007) so it bypasses the SELECT-only RLS on this
// token-bearing table safely and never leaves a transient two-primary state.
export async function setDevicePrimary(provider) {
  if (!canSync()) return { ok: false, error: 'not signed in' };
  const { error } = await supabase.rpc('set_device_primary', { p_provider: provider });
  if (error) { logError('setDevicePrimary', error); return { ok: false, error: error.message }; }
  return { ok: true };
}

// ---------- Reset (dangerous — clears both local and cloud) ----------

export async function resetAll() {
  if (!canSync()) return Database.services.resetAll();
  const userId = uid();
  const tables = [
    'sessions', 'session_logs', 'weekly_checkins', 'reassessments',
    'daily_metrics', 'injuries', 'wearable_readings', 'training_plans'
  ];
  await Promise.all(
    tables.map(t =>
      supabase.from(t)
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', userId)
    )
  );
  Database.services.resetAll();
}

export default {
  runSessionDMigration,
  pullFromSupabase,
  updateProfile, setGoals,
  startSession, completeSession, uncompleteSession, cancelSession, skipSession,
  addCheckin, deleteCheckin,
  upsertDailyMetric,
  setReassessAnswer,
  addInjury, updateInjury, removeInjury, addRecoveryLogEntry,
  getFitbitAuthUrl, checkFitbitConnection, syncFitbit, getStravaAuthUrl, syncStrava, checkConnections, setDevicePrimary,
  resetAll
};
