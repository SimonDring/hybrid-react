/**
 * fitbit-sync — Supabase Edge Function
 *
 * Fetches data from the Google Health API (health.googleapis.com/v4) for a date
 * range and writes to daily_metrics. This is the successor to the Fitbit Web API
 * — Fitbit data synced to the Google Health app is accessible here.
 *
 * Endpoint pattern:
 *   GET https://health.googleapis.com/v4/users/me/dataTypes/{type}/dataPoints
 *       ?filter={type_snake_case}.date="{YYYY-MM-DD}"        (daily summary types)
 *       ?filter={type_snake_case}.sample_time...             (intraday sample types)
 *
 * Data types fetched (kebab-case in URL, snake_case in filter):
 *   steps                         → steps, calories proxy via active-energy-burned
 *   active-energy-burned          → calories_out
 *   active-minutes                → active_minutes
 *   daily-heart-rate              → resting_hr
 *   daily-heart-rate-variability  → hrv_ms
 *   daily-oxygen-saturation       → spo2_pct
 *   daily-respiratory-rate        → breathing_rate
 *   sleep                         → sleep_duration_min, sleep_*_min, sleep_score
 *
 * Request: POST { date_from?: 'YYYY-MM-DD', date_to?: 'YYYY-MM-DD' }
 * Auth:    Supabase JWT in Authorization header
 *
 * Environment variables:
 *   FITBIT_CLIENT_ID      — Google OAuth Client ID
 *   FITBIT_CLIENT_SECRET  — Google OAuth Client Secret
 *   FITBIT_TOKEN_URL      — (optional) defaults to https://oauth2.googleapis.com/token
 *   FITBIT_API_BASE       — (optional) defaults to https://health.googleapis.com
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DEFAULT_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DEFAULT_API_BASE  = 'https://health.googleapis.com'

// CORS — the Supabase gateway forwards the browser's preflight OPTIONS to this
// function (it skips JWT verification for OPTIONS), so the function itself must
// answer it with 2xx + these headers, and echo them on every other response.
// Without this, the browser blocks the request ("Failed to send request to the
// Edge Function" / "could not connect to the server") before it's ever sent.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

async function getAccessToken(supabase: any, connection: any): Promise<string> {
  const expiresAt = new Date(connection.expires_at).getTime()
  if (expiresAt > Date.now() + 5 * 60 * 1000) return connection.access_token

  const tokenUrl = Deno.env.get('FITBIT_TOKEN_URL') ?? DEFAULT_TOKEN_URL
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: connection.refresh_token,
      client_id:     Deno.env.get('FITBIT_CLIENT_ID')!,
      client_secret: Deno.env.get('FITBIT_CLIENT_SECRET')!
    })
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)

  const tokens = await res.json()
  await supabase.from('wearable_connections').update({
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token ?? connection.refresh_token,
    expires_at:    new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  }).eq('user_id', connection.user_id).eq('provider', 'fitbit')

  return tokens.access_token
}

// Fetch one data type for one day. Returns null on failure so callers degrade gracefully.
async function fetchType(
  token: string, apiBase: string, dataType: string, filter: string
): Promise<any> {
  const url = `${apiBase}/v4/users/me/dataTypes/${dataType}/dataPoints?${filter}&pageSize=100`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    console.warn(`[fitbit-sync] ${dataType} → ${res.status}: ${await res.text()}`)
    return null
  }
  const json = await res.json()
  // Log raw response once so we can verify the field structure
  console.log(`[fitbit-sync] ${dataType} raw:`, JSON.stringify(json).slice(0, 500))
  return json
}

function nextDate(date: string): string {
  const d = new Date(date)
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = []
  const cur = new Date(from)
  const end = new Date(to)
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function firstPoint(data: any): any {
  return data?.dataPoints?.[0] ?? null
}

function buildRow(date: string, userId: string, raw: Record<string, any>): Record<string, any> {
  const stepsData = raw.steps
  const calData   = raw['active-energy-burned']
  const actData   = raw['active-minutes']
  const hrData    = raw['heart-rate']
  const hrvData   = raw['daily-heart-rate-variability']
  const spo2Data  = raw['daily-oxygen-saturation']
  const respData  = raw['daily-respiratory-rate']
  const sleepData = raw.sleep

  const isoDate = (iso: string) => iso?.split('T')[0]

  // Steps — sum steps.count for all 1-minute intervals on the target date
  const steps = (() => {
    const pts = (stepsData?.dataPoints ?? []).filter((p: any) =>
      !p?.steps?.interval?.startTime || isoDate(p.steps.interval.startTime) === date
    )
    const total = pts.reduce((acc: number, p: any) => acc + (Number(p?.steps?.count) || 0), 0)
    return total || null
  })()

  // Calories — sum activeEnergyBurned.kcal for all intervals on the target date
  const calories_out = (() => {
    const pts = (calData?.dataPoints ?? []).filter((p: any) =>
      !p?.activeEnergyBurned?.interval?.startTime || isoDate(p.activeEnergyBurned.interval.startTime) === date
    )
    const total = pts.reduce((acc: number, p: any) => acc + (p?.activeEnergyBurned?.kcal || 0), 0)
    return total ? Math.round(total) : null
  })()

  // Active minutes — sum MODERATE + VIGOROUS from activeMinutesByActivityLevel
  const active_minutes = (() => {
    const pts = (actData?.dataPoints ?? []).filter((p: any) =>
      !p?.activeMinutes?.interval?.startTime || isoDate(p.activeMinutes.interval.startTime) === date
    )
    const total = pts.reduce((acc: number, p: any) => {
      const levels: any[] = p?.activeMinutes?.activeMinutesByActivityLevel ?? []
      return acc + levels
        .filter((l: any) => l.activityLevel === 'MODERATE' || l.activityLevel === 'VIGOROUS')
        .reduce((s: number, l: any) => s + (Number(l.activeMinutes) || 0), 0)
    }, 0)
    return total || null
  })()

  // Resting HR — use nonRemHeartRateBeatsPerMinute from HRV data (best daily proxy).
  // Fallback: minimum individual HR reading on the target date.
  const resting_hr = (() => {
    const hrvPoint = firstPoint(hrvData)
    const nonRem = hrvPoint?.dailyHeartRateVariability?.nonRemHeartRateBeatsPerMinute
    if (nonRem != null) return Math.round(Number(nonRem))

    const pts = (hrData?.dataPoints ?? []).filter((p: any) =>
      !p?.heartRate?.sampleTime?.physicalTime || isoDate(p.heartRate.sampleTime.physicalTime) === date
    )
    if (!pts.length) return null
    const bpms = pts.map((p: any) => Number(p?.heartRate?.beatsPerMinute)).filter(v => !isNaN(v) && v > 0)
    return bpms.length ? Math.round(Math.min(...bpms)) : null
  })()

  // HRV — dailyHeartRateVariability.averageHeartRateVariabilityMilliseconds
  const hrv_ms = (() => {
    const val = firstPoint(hrvData)?.dailyHeartRateVariability?.averageHeartRateVariabilityMilliseconds
    return val != null ? Math.round(Number(val)) : null
  })()

  // SpO2 — dailyOxygenSaturation.averagePercentage
  const spo2_pct = (() => {
    const val = firstPoint(spo2Data)?.dailyOxygenSaturation?.averagePercentage
    return val != null ? Math.round(Number(val) * 10) / 10 : null
  })()

  // Breathing rate — dailyRespiratoryRate.breathsPerMinute
  const breathing_rate = (() => {
    const val = firstPoint(respData)?.dailyRespiratoryRate?.breathsPerMinute
    return val != null ? Math.round(Number(val) * 10) / 10 : null
  })()

  // Sleep — find session whose endTime falls on the target date (sleep starts night before).
  // Stages have explicit startTime + endTime so duration = end - start.
  let deepMs = 0, remMs = 0, lightMs = 0, awakeMs = 0
  const sleepPts = (sleepData?.dataPoints ?? []).filter((p: any) =>
    !p?.sleep?.interval?.endTime || isoDate(p.sleep.interval.endTime) === date
  )
  for (const p of sleepPts) {
    for (const s of (p?.sleep?.stages ?? [])) {
      const dur  = new Date(s.endTime).getTime() - new Date(s.startTime).getTime()
      const type = (s.type ?? '').toUpperCase()
      if      (type === 'DEEP')  deepMs  += dur
      else if (type === 'REM')   remMs   += dur
      else if (type === 'LIGHT') lightMs += dur
      else if (type === 'AWAKE') awakeMs += dur
    }
  }
  const totalMs = deepMs + remMs + lightMs

  const row: Record<string, any> = {
    user_id: userId, date, source: 'fitbit',
    steps, calories_out, active_minutes, resting_hr, hrv_ms, spo2_pct, breathing_rate,
    sleep_duration_min: totalMs  ? Math.round(totalMs  / 60_000) : null,
    sleep_deep_min:     deepMs   ? Math.round(deepMs   / 60_000) : null,
    sleep_rem_min:      remMs    ? Math.round(remMs    / 60_000) : null,
    sleep_light_min:    lightMs  ? Math.round(lightMs  / 60_000) : null,
    sleep_awake_min:    awakeMs  ? Math.round(awakeMs  / 60_000) : null,
    sleep_score:     null,  // Fitbit proprietary — not in Google Health API
    readiness_score: null   // Fitbit proprietary — not in Google Health API
  }

  // Strip nulls so we never overwrite a manual entry with null
  const clean: Record<string, any> = {}
  for (const [k, v] of Object.entries(row)) {
    if (v !== null && v !== undefined) clean[k] = v
  }
  return clean
}

Deno.serve(async (req: Request) => {
  // Answer the browser's CORS preflight before anything else.
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
  const body     = await req.json().catch(() => ({}))
  const today    = new Date().toISOString().split('T')[0]
  const dateFrom = body.date_from ?? today
  const dateTo   = body.date_to   ?? today

  const { data: connection, error: connError } = await supabase
    .from('wearable_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'fitbit')
    .single()

  if (connError || !connection) {
    return new Response(JSON.stringify({ error: 'Google Health not connected' }), {
      status: 400, headers: jsonHeaders
    })
  }

  let accessToken: string
  try {
    accessToken = await getAccessToken(supabase, connection)
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Token refresh failed', detail: e.message }), {
      status: 400, headers: jsonHeaders
    })
  }

  const apiBase  = Deno.env.get('FITBIT_API_BASE') ?? DEFAULT_API_BASE
  const dates    = dateRange(dateFrom, dateTo)
  const synced: string[] = []

  for (const date of dates) {
    const nd = nextDate(date)

    // Daily summary types support date-range filtering
    const df = (type: string) => `filter=${type}.date>="${date}" AND ${type}.date<"${nd}"`
    // Intraday/interval types support no query-time filtering — fetch up to a day's worth
    // of points (steps can be 1 per minute = ~1440/day) and filter client-side by date
    const unfiltered = `pageSize=1500`

    const [stepsRaw, calRaw, actRaw, hrRaw, hrvRaw, spo2Raw, respRaw, sleepRaw] = await Promise.all([
      fetchType(accessToken, apiBase, 'steps',                        unfiltered),
      fetchType(accessToken, apiBase, 'active-energy-burned',         unfiltered),
      fetchType(accessToken, apiBase, 'active-minutes',               unfiltered),
      fetchType(accessToken, apiBase, 'heart-rate',                   unfiltered),
      fetchType(accessToken, apiBase, 'daily-heart-rate-variability', df('daily_heart_rate_variability')),
      fetchType(accessToken, apiBase, 'daily-oxygen-saturation',      df('daily_oxygen_saturation')),
      fetchType(accessToken, apiBase, 'daily-respiratory-rate',       df('daily_respiratory_rate')),
      fetchType(accessToken, apiBase, 'sleep',                        unfiltered)
    ])

    const raw = {
      steps:                    stepsRaw,
      'active-energy-burned':   calRaw,
      'active-minutes':         actRaw,
      'heart-rate':             hrRaw,
      'daily-heart-rate-variability': hrvRaw,
      'daily-oxygen-saturation': spo2Raw,
      'daily-respiratory-rate': respRaw,
      sleep:                    sleepRaw
    }

    const row = buildRow(date, user.id, raw)

    const { error: upsertError } = await supabase
      .from('daily_metrics')
      .upsert(row, { onConflict: 'user_id,date' })

    if (upsertError) {
      console.error(`[fitbit-sync] Upsert failed for ${date}:`, upsertError)
    } else {
      synced.push(date)
    }
  }

  await supabase.from('wearable_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('provider', 'fitbit')

  return new Response(JSON.stringify({ ok: true, synced }), {
    headers: jsonHeaders
  })
})
