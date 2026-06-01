/**
 * fitbit-sync — Supabase Edge Function
 *
 * Fetches Fitbit data for a date range and writes it to the daily_metrics table.
 * Called by the app on startup (today only) and manually from the Wearables screen.
 *
 * Request: POST with JSON body { date_from?: 'YYYY-MM-DD', date_to?: 'YYYY-MM-DD' }
 *   Defaults to today for both if omitted.
 *
 * Auth: the app sends the user's Supabase JWT in the Authorization header
 *   (Supabase client does this automatically via supabase.functions.invoke()).
 *
 * Data fetched per day:
 *   - Activity summary: steps, active minutes, calories
 *   - Sleep: duration, stages (deep/REM/light/awake), efficiency as sleep score
 *   - Heart rate: resting HR
 *   - HRV: daily RMSSD
 *   - SpO2: average
 *   - Breathing rate
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FITBIT_API = 'https://api.fitbit.com'

// Refresh the Fitbit access token if it expires within 5 minutes
async function getAccessToken(supabase: any, connection: any): Promise<string> {
  const expiresAt = new Date(connection.expires_at).getTime()
  const fiveMinsMs = 5 * 60 * 1000
  if (expiresAt > Date.now() + fiveMinsMs) return connection.access_token

  const clientId     = Deno.env.get('FITBIT_CLIENT_ID')!
  const clientSecret = Deno.env.get('FITBIT_CLIENT_SECRET')!

  const res = await fetch('https://api.fitbit.com/oauth2/token', {
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

  const tokens = await res.json()
  const expiresAtNew = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase.from('wearable_connections').update({
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at:    expiresAtNew
  }).eq('user_id', connection.user_id).eq('provider', 'fitbit')

  return tokens.access_token
}

// Fetch a Fitbit endpoint; return null on failure (device may not support it)
async function fitbitGet(token: string, path: string): Promise<any> {
  const res = await fetch(`${FITBIT_API}${path}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) return null
  return res.json()
}

// Build a list of YYYY-MM-DD strings between two dates (inclusive)
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
  // Verify the user's JWT
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!

  // Use the anon client + user JWT to verify identity
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } }
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

  // Service-role client for DB writes (bypasses RLS to write wearable_connections + daily_metrics)
  const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Parse date range from request body
  const body = await req.json().catch(() => ({}))
  const today     = new Date().toISOString().split('T')[0]
  const dateFrom  = body.date_from || today
  const dateTo    = body.date_to   || today

  // Load the Fitbit connection record
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

  // Get a valid access token (refreshing if needed)
  let accessToken: string
  try {
    accessToken = await getAccessToken(supabase, connection)
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Token refresh failed' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const dates = dateRange(dateFrom, dateTo)
  const synced: string[] = []

  for (const date of dates) {
    // Fetch all Fitbit endpoints in parallel
    const [activity, sleep, heartrate, hrv, spo2, breathing] = await Promise.all([
      fitbitGet(accessToken, `/1/user/-/activities/date/${date}.json`),
      fitbitGet(accessToken, `/1.2/user/-/sleep/date/${date}.json`),
      fitbitGet(accessToken, `/1/user/-/activities/heart/date/${date}/1d.json`),
      fitbitGet(accessToken, `/1/user/-/hrv/date/${date}.json`),
      fitbitGet(accessToken, `/1/user/-/spo2/date/${date}.json`),
      fitbitGet(accessToken, `/1/user/-/br/date/${date}.json`)
    ])

    const row: Record<string, any> = {
      user_id: user.id,
      date,
      source:  'fitbit'
    }

    // Activity summary
    if (activity?.summary) {
      const s = activity.summary
      row.steps          = s.steps          ?? null
      row.calories_out   = s.caloriesOut    ?? null
      row.active_minutes = ((s.fairlyActiveMinutes ?? 0) + (s.veryActiveMinutes ?? 0)) || null
    }

    // Sleep
    if (sleep?.summary) {
      row.sleep_duration_min = sleep.summary.totalMinutesAsleep ?? null
      row.sleep_deep_min     = sleep.summary.stages?.deep  ?? null
      row.sleep_rem_min      = sleep.summary.stages?.rem   ?? null
      row.sleep_light_min    = sleep.summary.stages?.light ?? null
      row.sleep_awake_min    = sleep.summary.stages?.wake  ?? null
    }
    const mainSleep = sleep?.sleep?.find((s: any) => s.isMainSleep)
    if (mainSleep) {
      // Fitbit's sleep score isn't always in the API; use efficiency (0-100) as proxy
      row.sleep_score = mainSleep.efficiency ?? null
    }

    // Resting heart rate
    const hrValue = heartrate?.['activities-heart']?.[0]?.value
    if (hrValue) {
      row.resting_hr = hrValue.restingHeartRate ?? null
    }

    // HRV (Charge 5/6, Sense — not all devices)
    const hrvEntry = hrv?.hrv?.find((h: any) => h.dateTime === date)
    if (hrvEntry?.value?.dailyRmssd != null) {
      row.hrv_ms = Math.round(hrvEntry.value.dailyRmssd * 10) / 10
    }

    // SpO2 (returns differently depending on device)
    if (Array.isArray(spo2) && spo2.length > 0) {
      row.spo2_pct = spo2[0]?.value?.avg ?? null
    } else if (spo2?.value?.avg != null) {
      row.spo2_pct = spo2.value.avg
    }

    // Breathing rate
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

  // Record sync time
  await supabase.from('wearable_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('provider', 'fitbit')

  return new Response(JSON.stringify({ ok: true, synced }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
