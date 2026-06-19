/**
 * enrich-sessions — Supabase Edge Function
 *
 * For each of the user's recently-completed sessions that has a started→completed
 * window and no HR summary yet, fetch the PRIMARY device's heart-rate samples for
 * that window from the Google Health API and write avg_hr / max_hr / hr_zones
 * (Karvonen/HRR) onto the session's log row. Kept separate from fitbit-sync.
 *
 * Env: FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET (reuses the primary connection).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DEFAULT_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DEFAULT_API_BASE  = 'https://health.googleapis.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

function zoneOf(pct: number): number {
  if (pct < 0.6) return 1
  if (pct < 0.7) return 2
  if (pct < 0.8) return 3
  if (pct < 0.9) return 4
  return 5
}

// Minutes per HRR zone for samples [{hr,t(ms)}] (mirrors src/lib/hrZones.js).
function hrZonesHRR(samples: any[], hrRest: number | null, hrMax: number | null) {
  if (hrRest == null || hrMax == null || hrMax <= hrRest) return null
  const reserve = hrMax - hrRest
  const z: any = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }
  for (let i = 0; i < samples.length - 1; i++) {
    const dtMin = (samples[i + 1].t - samples[i].t) / 60000
    if (!(dtMin > 0)) continue
    const pct = Math.max(0, Math.min(1, (samples[i].hr - hrRest) / reserve))
    z['z' + zoneOf(pct)] += dtMin
  }
  return { z1: Math.round(z.z1), z2: Math.round(z.z2), z3: Math.round(z.z3), z4: Math.round(z.z4), z5: Math.round(z.z5) }
}

async function getAccessToken(supabase: any, connection: any): Promise<string> {
  const expiresAt = new Date(connection.expires_at).getTime()
  if (expiresAt > Date.now() + 5 * 60 * 1000) return connection.access_token
  const res = await fetch(Deno.env.get('FITBIT_TOKEN_URL') ?? DEFAULT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
      client_id: Deno.env.get('FITBIT_CLIENT_ID')!,
      client_secret: Deno.env.get('FITBIT_CLIENT_SECRET')!
    })
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)
  const t = await res.json()
  await supabase.from('wearable_connections').update({
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? connection.refresh_token,
    expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString()
  }).eq('user_id', connection.user_id).eq('provider', 'fitbit')
  return t.access_token
}

// Fetch heart-rate samples [{hr, t(ms)}] — all recent samples (up to pageSize=1500).
// NOTE: The Google Health intraday heart-rate dataType supports NO date/time filtering.
// The API always returns the most-recent ~1500 samples regardless of query params.
// Callers must filter client-side by session window. Historical backfill is not possible.
async function fetchHrSamples(token: string, apiBase: string): Promise<any[]> {
  const url = `${apiBase}/v4/users/me/dataTypes/heart-rate/dataPoints?pageSize=1500`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    console.warn('[enrich-sessions] HR fetch failed:', res.status)
    return []
  }
  const json = await res.json()
  const out: any[] = []
  for (const p of (json?.dataPoints ?? [])) {
    const iso = p?.heartRate?.sampleTime?.physicalTime
    const bpm = Number(p?.heartRate?.beatsPerMinute)
    if (!iso || !bpm) continue
    out.push({ hr: bpm, t: new Date(iso).getTime() })
  }
  out.sort((a, b) => a.t - b.t)
  return out
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

  // Primary connection (Fitbit/Google Health).
  const { data: connection } = await supabase.from('wearable_connections')
    .select('*').eq('user_id', user.id).eq('provider', 'fitbit').single()
  if (!connection) return new Response(JSON.stringify({ error: 'No primary device' }), { status: 400, headers: jsonHeaders })

  let token: string
  try { token = await getAccessToken(supabase, connection) }
  catch (e: any) { return new Response(JSON.stringify({ error: 'Token refresh failed', detail: e.message }), { status: 400, headers: jsonHeaders }) }

  // Dynamic hrRest (recent avg resting_hr) and observed-peak hrMax.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: metrics } = await supabase.from('daily_metrics')
    .select('resting_hr').eq('user_id', user.id).gte('date', since).is('deleted_at', null)
  const rhrs = (metrics ?? []).map((m: any) => Number(m.resting_hr)).filter((v: number) => v > 0)
  const hrRest = rhrs.length ? Math.round(rhrs.reduce((a: number, b: number) => a + b, 0) / rhrs.length) : null

  const { data: wkMax } = await supabase.from('workouts')
    .select('max_hr').eq('user_id', user.id).is('deleted_at', null)
  const ageRow = await supabase.from('users').select('profile').eq('id', user.id).single()
  const age = Number(ageRow?.data?.profile?.age) || null
  const ageEst = age ? Math.round(208 - 0.7 * age) : null
  const peak = Math.max(0, ...((wkMax ?? []).map((w: any) => Number(w.max_hr) || 0)))
  const hrMax = peak && (!ageEst || peak > ageEst) ? peak : ageEst

  // Sessions completed in the last 30 days, with a window, whose log lacks avg_hr.
  const sinceTs = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: sessions } = await supabase.from('sessions')
    .select('id, started_at, completed_at')
    .eq('user_id', user.id).eq('status', 'completed')
    .gte('completed_at', sinceTs).is('deleted_at', null)
    .not('started_at', 'is', null)

  const enriched: string[] = []
  const apiBase = Deno.env.get('FITBIT_API_BASE') ?? DEFAULT_API_BASE
  const samples = await fetchHrSamples(token, apiBase)
  if (!samples.length) console.warn('[enrich-sessions] no HR samples available')

  for (const s of (sessions ?? [])) {
    const { data: log } = await supabase.from('session_logs')
      .select('id, avg_hr, hr_source').eq('session_id', s.id).is('deleted_at', null).maybeSingle()
    if (!log || log.avg_hr != null) continue          // already summarised (or by Strava link)

    const startMs = new Date(s.started_at).getTime()
    const endMs   = new Date(s.completed_at).getTime()
    const inWindow = samples.filter((p) => p.t >= startMs && p.t <= endMs)
    if (!inWindow.length) { continue }   // session outside the fetched recent window

    const hrs = inWindow.map((p) => p.hr)
    const avg_hr = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length)
    const max_hr = Math.max(...hrs)
    const hr_zones = hrZonesHRR(inWindow, hrRest, hrMax)

    const { error: upErr } = await supabase.from('session_logs')
      .update({ avg_hr, max_hr, hr_zones, hr_source: 'fitbit' }).eq('id', log.id)
    if (!upErr) enriched.push(s.id)
    else console.error('[enrich-sessions] update failed for', s.id, upErr)
  }

  return new Response(JSON.stringify({ ok: true, enriched }), { headers: jsonHeaders })
})
