/**
 * fitbit-sync — Supabase Edge Function
 *
 * Fetches Fitbit data for a date range and writes to daily_metrics.
 * Called on app open (today only) and manually from the Wearables screen.
 *
 * Registration note: Fitbit new-app registration has moved to Google Cloud Console
 * via the Google Health API. The Fitbit Web API data endpoints (api.fitbit.com)
 * still work for apps with valid credentials. The API base URL is configurable
 * via env var so it can be updated if Google moves the endpoints.
 *
 * Request: POST { date_from?: 'YYYY-MM-DD', date_to?: 'YYYY-MM-DD' }
 * Auth:    Supabase JWT in Authorization header (sent automatically by supabase client)
 *
 * Environment variables:
 *   FITBIT_CLIENT_ID      — OAuth client ID (from Google Cloud Console)
 *   FITBIT_CLIENT_SECRET  — OAuth client secret (from Google Cloud Console)
 *   FITBIT_TOKEN_URL      — (optional) token refresh endpoint
 *   FITBIT_API_BASE       — (optional) data API base, defaults to https://api.fitbit.com
 *
 * Auto-available: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function getAccessToken(supabase: any, connection: any): Promise<string> {
  const expiresAt  = new Date(connection.expires_at).getTime()
  const fiveMinsMs = 5 * 60 * 1000
  if (expiresAt > Date.now() + fiveMinsMs) return connection.access_token

  const clientId     = Deno.env.get('FITBIT_CLIENT_ID')!
  const clientSecret = Deno.env.get('FITBIT_CLIENT_SECRET')!
  const tokenUrl     = Deno.env.get('FITBIT_TOKEN_URL') ?? 'https://api.fitbit.com/oauth2/token'

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
    },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: connection.refresh_token
    })
  })

  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)

  const tokens      = await res.json()
  const expiresAtNew = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase.from('wearable_connections').update({
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at:    expiresAtNew
  }).eq('user_id', connection.user_id).eq('provider', 'fitbit')

  return tokens.access_token
}

async function fitbitGet(apiBase: string, token: string, path: string): Promise<any> {
  const res = await fetch(`${apiBase}${path}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) return null
  return res.json()
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
  const apiBase     = Deno.env.get('FITBIT_API_BASE') ?? 'https://api.fitbit.com'

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
    const [activity, sleep, heartrate, hrv, spo2, breathing] = await Promise.all([
      fitbitGet(apiBase, accessToken, `/1/user/-/activities/date/${date}.json`),
      fitbitGet(apiBase, accessToken, `/1.2/user/-/sleep/date/${date}.json`),
      fitbitGet(apiBase, accessToken, `/1/user/-/activities/heart/date/${date}/1d.json`),
      fitbitGet(apiBase, accessToken, `/1/user/-/hrv/date/${date}.json`),
      fitbitGet(apiBase, accessToken, `/1/user/-/spo2/date/${date}.json`),
      fitbitGet(apiBase, accessToken, `/1/user/-/br/date/${date}.json`)
    ])

    const row: Record<string, any> = { user_id: user.id, date, source: 'fitbit' }

    if (activity?.summary) {
      const s = activity.summary
      row.steps          = s.steps       ?? null
      row.calories_out   = s.caloriesOut ?? null
      row.active_minutes = ((s.fairlyActiveMinutes ?? 0) + (s.veryActiveMinutes ?? 0)) || null
    }

    if (sleep?.summary) {
      row.sleep_duration_min = sleep.summary.totalMinutesAsleep ?? null
      row.sleep_deep_min     = sleep.summary.stages?.deep  ?? null
      row.sleep_rem_min      = sleep.summary.stages?.rem   ?? null
      row.sleep_light_min    = sleep.summary.stages?.light ?? null
      row.sleep_awake_min    = sleep.summary.stages?.wake  ?? null
    }
    const mainSleep = sleep?.sleep?.find((s: any) => s.isMainSleep)
    if (mainSleep) row.sleep_score = mainSleep.efficiency ?? null

    const hrValue = heartrate?.['activities-heart']?.[0]?.value
    if (hrValue) row.resting_hr = hrValue.restingHeartRate ?? null

    const hrvEntry = hrv?.hrv?.find((h: any) => h.dateTime === date)
    if (hrvEntry?.value?.dailyRmssd != null) {
      row.hrv_ms = Math.round(hrvEntry.value.dailyRmssd * 10) / 10
    }

    if (Array.isArray(spo2) && spo2.length > 0) {
      row.spo2_pct = spo2[0]?.value?.avg ?? null
    } else if (spo2?.value?.avg != null) {
      row.spo2_pct = spo2.value.avg
    }

    const brEntry = breathing?.br?.find((b: any) => b.dateTime === date)
    if (brEntry?.value?.breathingRate != null) {
      row.breathing_rate = Math.round(brEntry.value.breathingRate * 10) / 10
    }

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
