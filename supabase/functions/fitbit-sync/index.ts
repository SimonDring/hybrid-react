/**
 * fitbit-sync — Supabase Edge Function
 *
 * Fetches Google Health API data for a date range and writes to daily_metrics.
 * Called on app open (today) and manually from the Wearables screen.
 *
 * OAuth: Google accounts (oauth2.googleapis.com)
 * Data:  Google Health API (health.googleapis.com/v4)
 *
 * Endpoint pattern:
 *   GET /v4/users/me/dataTypes/{type}/dataPoints
 *       ?startTime=YYYY-MM-DDT00:00:00Z&endTime=YYYY-MM-DDT23:59:59Z
 *
 * Data types used:
 *   steps, active_energy_burned, activity_level,
 *   daily_resting_heart_rate, daily_heart_rate_variability,
 *   daily_oxygen_saturation, daily_respiratory_rate, sleep
 *
 * Request: POST { date_from?: 'YYYY-MM-DD', date_to?: 'YYYY-MM-DD' }
 * Auth:    Supabase JWT in Authorization header (sent automatically by supabase client)
 *
 * Environment variables:
 *   FITBIT_CLIENT_ID      — Google OAuth client ID
 *   FITBIT_CLIENT_SECRET  — Google OAuth client secret
 *   FITBIT_TOKEN_URL      — (optional) defaults to https://oauth2.googleapis.com/token
 *   FITBIT_API_BASE       — (optional) defaults to https://health.googleapis.com/v4
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Refresh access token if it expires within 5 minutes
async function getAccessToken(supabase: any, connection: any): Promise<string> {
  const expiresAt  = new Date(connection.expires_at).getTime()
  if (expiresAt > Date.now() + 5 * 60 * 1000) return connection.access_token

  const tokenUrl = Deno.env.get('FITBIT_TOKEN_URL') ?? 'https://oauth2.googleapis.com/token'
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

  const tokens       = await res.json()
  const expiresAtNew = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  await supabase.from('wearable_connections').update({
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at:    expiresAtNew
  }).eq('user_id', connection.user_id).eq('provider', 'fitbit')

  return tokens.access_token
}

// Fetch one data type for a specific day
async function fetchDay(apiBase: string, token: string, dataType: string, date: string): Promise<any> {
  const start = encodeURIComponent(`${date}T00:00:00Z`)
  const end   = encodeURIComponent(`${date}T23:59:59Z`)
  const url   = `${apiBase}/users/me/dataTypes/${dataType}/dataPoints?startTime=${start}&endTime=${end}`
  const res   = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    console.warn(`[fitbit-sync] ${dataType} on ${date} → ${res.status}`)
    return null
  }
  return res.json()
}

// Extract the first numeric value from a dataPoints response
function firstVal(data: any): number | null {
  if (!data?.dataPoints?.length) return null
  const v = data.dataPoints[0]?.value
  return v?.fpVal ?? v?.intVal ?? null
}

// Sum all numeric values across dataPoints (for intraday totals like steps)
function sumVals(data: any): number | null {
  if (!data?.dataPoints?.length) return null
  return data.dataPoints.reduce((acc: number, p: any) => {
    return acc + (p?.value?.fpVal ?? p?.value?.intVal ?? 0)
  }, 0)
}

// For activity_level: sum minutes where level is moderate (3) or vigorous (4)
function activeMinutes(data: any): number | null {
  if (!data?.dataPoints?.length) return null
  let mins = 0
  for (const p of data.dataPoints) {
    const level = p?.value?.intVal ?? p?.value?.fpVal ?? 0
    if (level >= 3) {
      const start = new Date(p.startTime).getTime()
      const end   = new Date(p.endTime).getTime()
      mins += (end - start) / 60000
    }
  }
  return Math.round(mins) || null
}

// Parse sleep dataPoints into stage totals (minutes)
function parseSleep(data: any): Record<string, number | null> {
  const out: Record<string, number | null> = {
    sleep_duration_min: null,
    sleep_deep_min:     null,
    sleep_rem_min:      null,
    sleep_light_min:    null,
    sleep_awake_min:    null,
    sleep_score:        null
  }
  if (!data?.dataPoints?.length) return out

  let deepMs = 0, remMs = 0, lightMs = 0, awakeMs = 0

  for (const p of data.dataPoints) {
    const start     = new Date(p.startTime).getTime()
    const end       = new Date(p.endTime).getTime()
    const durationMs = end - start
    // Sleep stage values: 1=awake, 2=light, 3=deep, 4=REM (Google Health API convention)
    const stage = p?.value?.intVal ?? p?.value?.fpVal ?? 0
    if      (stage === 4) remMs   += durationMs
    else if (stage === 3) deepMs  += durationMs
    else if (stage === 2) lightMs += durationMs
    else if (stage === 1) awakeMs += durationMs
  }

  const totalSleepMs = deepMs + remMs + lightMs
  out.sleep_duration_min = totalSleepMs ? Math.round(totalSleepMs / 60000) : null
  out.sleep_deep_min     = deepMs  ? Math.round(deepMs  / 60000) : null
  out.sleep_rem_min      = remMs   ? Math.round(remMs   / 60000) : null
  out.sleep_light_min    = lightMs ? Math.round(lightMs / 60000) : null
  out.sleep_awake_min    = awakeMs ? Math.round(awakeMs / 60000) : null
  return out
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

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const apiBase     = Deno.env.get('FITBIT_API_BASE') ?? 'https://health.googleapis.com/v4'

  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } }
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const body     = await req.json().catch(() => ({}))
  const today    = new Date().toISOString().split('T')[0]
  const dateFrom = body.date_from || today
  const dateTo   = body.date_to   || today

  const { data: connection, error: connError } = await supabase
    .from('wearable_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'fitbit')
    .single()

  if (connError || !connection) {
    return new Response(JSON.stringify({ error: 'Fitbit not connected' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  let accessToken: string
  try {
    accessToken = await getAccessToken(supabase, connection)
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Token refresh failed' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const dates  = dateRange(dateFrom, dateTo)
  const synced: string[] = []

  for (const date of dates) {
    // Fetch all data types in parallel
    const [
      stepsData, caloriesData, activityData,
      hrData, hrvData, spo2Data, brData, sleepData
    ] = await Promise.all([
      fetchDay(apiBase, accessToken, 'steps',                        date),
      fetchDay(apiBase, accessToken, 'active_energy_burned',         date),
      fetchDay(apiBase, accessToken, 'activity_level',               date),
      fetchDay(apiBase, accessToken, 'daily_resting_heart_rate',     date),
      fetchDay(apiBase, accessToken, 'daily_heart_rate_variability', date),
      fetchDay(apiBase, accessToken, 'daily_oxygen_saturation',      date),
      fetchDay(apiBase, accessToken, 'daily_respiratory_rate',       date),
      fetchDay(apiBase, accessToken, 'sleep',                        date)
    ])

    const row: Record<string, any> = {
      user_id: user.id,
      date,
      source:  'fitbit',
      steps:          sumVals(stepsData),
      calories_out:   sumVals(caloriesData),
      active_minutes: activeMinutes(activityData),
      resting_hr:     firstVal(hrData),
      hrv_ms:         firstVal(hrvData),
      spo2_pct:       firstVal(spo2Data),
      breathing_rate: firstVal(brData),
      ...parseSleep(sleepData)
    }

    // Strip nulls to avoid overwriting existing manual entries with null
    const clean: Record<string, any> = { user_id: row.user_id, date, source: 'fitbit' }
    for (const [k, v] of Object.entries(row)) {
      if (v !== null && v !== undefined) clean[k] = v
    }

    const { error: upsertError } = await supabase
      .from('daily_metrics')
      .upsert(clean, { onConflict: 'user_id,date' })

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
