/**
 * strava-sync — Supabase Edge Function
 *
 * Fetches the athlete's activities from Strava (summaries) and upserts them into
 * the workouts table. Incremental: first sync imports the last 90 days; later
 * syncs fetch activities after wearable_connections.last_synced_at. Idempotent
 * via the unique (user_id, provider, provider_activity_id) index. Mirrors
 * fitbit-sync (incl. CORS preflight + real-error-in-body).
 *
 * Env: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TOKEN_URL = 'https://www.strava.com/oauth/token'
const API_BASE  = 'https://www.strava.com/api/v3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

// Map Strava's many sport_type/type values to our enum via substring rules.
function mapType(sport: string): string {
  const s = (sport || '').toLowerCase()
  if (s.includes('run')) return 'run'
  if (s.includes('ride') || s.includes('bike') || s.includes('cycl')) return 'ride'
  if (s.includes('swim')) return 'swim'
  if (s.includes('weight') || s.includes('strength') || s.includes('workout')) return 'strength'
  if (s.includes('walk') || s.includes('hike')) return 'walk'
  return 'other'
}

function normalize(act: any, userId: string): Record<string, any> {
  const start = act.start_date ? new Date(act.start_date) : null
  const elapsed = Number(act.elapsed_time) || 0
  return {
    user_id: userId,
    provider: 'strava',
    provider_activity_id: String(act.id),
    type: mapType(act.sport_type ?? act.type),
    start_time: start ? start.toISOString() : null,
    end_time: start ? new Date(start.getTime() + elapsed * 1000).toISOString() : null,
    duration_sec: Number(act.moving_time ?? act.elapsed_time) || null,
    distance_m: act.distance != null ? Number(act.distance) : null,
    avg_hr: act.average_heartrate != null ? Number(act.average_heartrate) : null,
    max_hr: act.max_heartrate != null ? Number(act.max_heartrate) : null,
    calories: act.calories != null ? Number(act.calories) : null,
    elevation_gain_m: act.total_elevation_gain != null ? Number(act.total_elevation_gain) : null,
    raw: act,
    source: 'strava'
  }
}

async function getAccessToken(supabase: any, connection: any): Promise<string> {
  const expiresAt = new Date(connection.expires_at).getTime()
  if (expiresAt > Date.now() + 5 * 60 * 1000) return connection.access_token

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: connection.refresh_token,
      client_id:     Deno.env.get('STRAVA_CLIENT_ID')!,
      client_secret: Deno.env.get('STRAVA_CLIENT_SECRET')!
    })
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)

  const t = await res.json()
  await supabase.from('wearable_connections').update({
    access_token:  t.access_token,
    refresh_token: t.refresh_token ?? connection.refresh_token,
    expires_at:    new Date(t.expires_at * 1000).toISOString()
  }).eq('user_id', connection.user_id).eq('provider', 'strava')

  return t.access_token
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const userClient  = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } }
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: connection, error: connErr } = await supabase
    .from('wearable_connections').select('*')
    .eq('user_id', user.id).eq('provider', 'strava').single()
  if (connErr || !connection) {
    return new Response(JSON.stringify({ error: 'Strava not connected' }), { status: 400, headers: jsonHeaders })
  }

  let token: string
  try { token = await getAccessToken(supabase, connection) }
  catch (e: any) {
    return new Response(JSON.stringify({ error: 'Token refresh failed', detail: e.message }), { status: 400, headers: jsonHeaders })
  }

  // Incremental window: since last sync, else last 90 days on first connect.
  const ninetyDaysAgo = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000)
  // Re-fetch a 7-day trailing overlap on every incremental sync. Strava's `after`
  // filters on activity start_date, and Garmin→Strava propagation can lag hours or
  // days — a tiny buffer would silently drop late-arriving activities. Upserts are
  // idempotent, so the overlap is free.
  const OVERLAP_SEC = 7 * 24 * 60 * 60
  const after = connection.last_synced_at
    ? Math.floor(new Date(connection.last_synced_at).getTime() / 1000) - OVERLAP_SEC
    : ninetyDaysAgo

  const synced: string[] = []
  let page = 1
  try {
    // Page through activities (100/page) until a short page signals the end.
    while (true) {
      const res = await fetch(`${API_BASE}/athlete/activities?after=${after}&per_page=100&page=${page}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'Activity fetch failed', detail: await res.text() }), { status: 400, headers: jsonHeaders })
      }
      const activities = await res.json()
      if (!Array.isArray(activities) || activities.length === 0) break

      const rows = activities.map((a: any) => normalize(a, user.id))
      const { error: upErr } = await supabase
        .from('workouts').upsert(rows, { onConflict: 'user_id,provider,provider_activity_id' })
      if (upErr) {
        console.error('[strava-sync] upsert failed:', upErr)
        // Do not advance last_synced_at — return so the next sync re-fetches this
        // window (upserts are idempotent, so already-saved pages are harmless).
        return new Response(JSON.stringify({ error: 'Upsert failed', detail: upErr.message }), { status: 400, headers: jsonHeaders })
      }
      rows.forEach(r => synced.push(r.provider_activity_id))

      if (activities.length < 100) break
      page += 1
      if (page > 20) break  // safety cap (2000 activities/sync)
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Sync exception', detail: e.message }), { status: 400, headers: jsonHeaders })
  }

  await supabase.from('wearable_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', user.id).eq('provider', 'strava')

  return new Response(JSON.stringify({ ok: true, synced }), { headers: jsonHeaders })
})
