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

// Helpers to extract values from DataPoint objects.
// Field names may be camelCase or snake_case depending on API version — try both.
function getField(obj: any, ...keys: string[]): any {
  for (const k of keys) {
    if (obj?.[k] != null) return obj[k]
  }
  return null
}

function firstPoint(data: any): any {
  return data?.dataPoints?.[0] ?? null
}

function sumPoints(data: any, field: string, altField?: string): number | null {
  if (!data?.dataPoints?.length) return null
  let total = 0
  for (const p of data.dataPoints) {
    const inner = p[field] ?? (altField ? p[altField] : null) ?? p
    const val = getField(inner, 'count', 'value', 'intValue', 'integer_value', 'floatValue', 'float_value')
    if (val != null) total += Number(val)
  }
  return total || null
}

function buildRow(date: string, userId: string, raw: Record<string, any>): Record<string, any> {
  const stepsData  = raw.steps
  const calData    = raw['active-energy-burned']
  const actData    = raw['active-minutes']
  const hrData     = raw['daily-heart-rate']
  const hrvData    = raw['daily-heart-rate-variability']
  const spo2Data   = raw['daily-oxygen-saturation']
  const respData   = raw['daily-respiratory-rate']
  const sleepData  = raw.sleep

  // Steps — sum all intraday points
  const steps = sumPoints(stepsData, 'steps')

  // Calories — sum active energy burned points
  const calories_out = (() => {
    if (!calData?.dataPoints?.length) return null
    let total = 0
    for (const p of calData.dataPoints) {
      const inner = p.active_energy_burned ?? p.activeEnergyBurned ?? p
      const val = getField(inner, 'kilocalories', 'kcal', 'value', 'floatValue', 'float_value')
      if (val != null) total += Number(val)
    }
    return total ? Math.round(total) : null
  })()

  // Active minutes — sum all points
  const active_minutes = sumPoints(actData, 'active_minutes') ?? sumPoints(actData, 'activeMinutes')

  // Resting heart rate — daily summary, first point
  const resting_hr = (() => {
    const p = firstPoint(hrData)
    if (!p) return null
    const inner = p.daily_heart_rate ?? p.dailyHeartRate ?? p
    const val = getField(inner, 'resting_bpm', 'restingBpm', 'resting_heart_rate', 'restingHeartRate', 'value')
    return val != null ? Math.round(Number(val)) : null
  })()

  // HRV — daily summary, first point
  const hrv_ms = (() => {
    const p = firstPoint(hrvData)
    if (!p) return null
    const inner = p.daily_heart_rate_variability ?? p.dailyHeartRateVariability ?? p
    const val = getField(inner, 'rmssd', 'daily_rmssd', 'dailyRmssd', 'value')
    return val != null ? Math.round(Number(val)) : null
  })()

  // SpO2 — daily summary
  const spo2_pct = (() => {
    const p = firstPoint(spo2Data)
    if (!p) return null
    const inner = p.daily_oxygen_saturation ?? p.dailyOxygenSaturation ?? p
    const val = getField(inner, 'avg', 'average', 'value')
    return val != null ? Math.round(Number(val) * 10) / 10 : null
  })()

  // Breathing rate — daily summary
  const breathing_rate = (() => {
    const p = firstPoint(respData)
    if (!p) return null
    const inner = p.daily_respiratory_rate ?? p.dailyRespiratoryRate ?? p
    const val = getField(inner, 'breathing_rate', 'breathingRate', 'value')
    return val != null ? Math.round(Number(val) * 10) / 10 : null
  })()

  // Sleep — parse stage durations from session points
  let deepMs = 0, remMs = 0, lightMs = 0, awakeMs = 0, sleepScore = null
  for (const p of sleepData?.dataPoints ?? []) {
    const inner = p.sleep ?? p
    const stages: any[] = inner.stages ?? inner.sleep_stages ?? []
    for (const s of stages) {
      const type  = (s.type ?? s.stage ?? '').toString().toUpperCase()
      const secs  = Number(s.duration_seconds ?? s.durationSeconds ?? s.duration ?? 0)
      const ms    = secs * 1000
      if      (type.includes('DEEP'))  deepMs  += ms
      else if (type.includes('REM'))   remMs   += ms
      else if (type.includes('LIGHT')) lightMs += ms
      else if (type.includes('AWAKE') || type.includes('WAKE')) awakeMs += ms
    }
    // Sleep efficiency / score if present
    const eff = getField(inner, 'efficiency', 'sleep_efficiency', 'sleepEfficiency', 'score', 'sleep_score')
    if (eff != null && sleepScore == null) sleepScore = Math.round(Number(eff))
  }
  const totalSleepMs = deepMs + remMs + lightMs
  const sleep_duration_min = totalSleepMs ? Math.round(totalSleepMs / 60_000) : null
  const sleep_deep_min     = deepMs   ? Math.round(deepMs   / 60_000) : null
  const sleep_rem_min      = remMs    ? Math.round(remMs    / 60_000) : null
  const sleep_light_min    = lightMs  ? Math.round(lightMs  / 60_000) : null
  const sleep_awake_min    = awakeMs  ? Math.round(awakeMs  / 60_000) : null

  const row: Record<string, any> = {
    user_id: userId, date, source: 'fitbit',
    steps, calories_out, active_minutes, resting_hr, hrv_ms, spo2_pct, breathing_rate,
    sleep_duration_min, sleep_deep_min, sleep_rem_min, sleep_light_min, sleep_awake_min,
    sleep_score: sleepScore
  }

  // Strip nulls so we never overwrite a manual entry with null
  const clean: Record<string, any> = {}
  for (const [k, v] of Object.entries(row)) {
    if (v !== null && v !== undefined) clean[k] = v
  }
  return clean
}

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const userClient  = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } }
  })

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

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
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  let accessToken: string
  try {
    accessToken = await getAccessToken(supabase, connection)
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Token refresh failed', detail: e.message }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const apiBase  = Deno.env.get('FITBIT_API_BASE') ?? DEFAULT_API_BASE
  const dates    = dateRange(dateFrom, dateTo)
  const synced: string[] = []

  for (const date of dates) {
    const nd = nextDate(date)

    // Daily summary types use a date equality filter
    const dailyFilter  = (type: string) => `filter=${type}.date="${date}"`
    // Sample/interval types use a time range filter
    const sampleFilter = (type: string) =>
      `filter=${type}.sample_time.physical_time>="${date}T00:00:00Z" AND ${type}.sample_time.physical_time<"${nd}T00:00:00Z"`
    const sleepFilter  = `filter=sleep.interval.start_time>="${date}T00:00:00Z" AND sleep.interval.start_time<"${nd}T00:00:00Z"`

    const [stepsRaw, calRaw, actRaw, hrRaw, hrvRaw, spo2Raw, respRaw, sleepRaw] = await Promise.all([
      fetchType(accessToken, apiBase, 'steps',                        sampleFilter('steps')),
      fetchType(accessToken, apiBase, 'active-energy-burned',         sampleFilter('active_energy_burned')),
      fetchType(accessToken, apiBase, 'active-minutes',               sampleFilter('active_minutes')),
      fetchType(accessToken, apiBase, 'daily-heart-rate',             dailyFilter('daily_heart_rate')),
      fetchType(accessToken, apiBase, 'daily-heart-rate-variability', dailyFilter('daily_heart_rate_variability')),
      fetchType(accessToken, apiBase, 'daily-oxygen-saturation',      dailyFilter('daily_oxygen_saturation')),
      fetchType(accessToken, apiBase, 'daily-respiratory-rate',       dailyFilter('daily_respiratory_rate')),
      fetchType(accessToken, apiBase, 'sleep',                        sleepFilter)
    ])

    const raw = {
      steps:                    stepsRaw,
      'active-energy-burned':   calRaw,
      'active-minutes':         actRaw,
      'daily-heart-rate':       hrRaw,
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
    headers: { 'Content-Type': 'application/json' }
  })
})
