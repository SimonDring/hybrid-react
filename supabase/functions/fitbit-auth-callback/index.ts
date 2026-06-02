/**
 * fitbit-auth-callback — Supabase Edge Function
 *
 * Handles the OAuth 2.0 callback after the user authorises Fitbit access.
 * Exchanges the auth code for tokens, stores them, redirects back to the app.
 *
 * Registration note: Fitbit new-app registration has moved to Google Cloud Console
 * via the Google Health API. The Fitbit Web API endpoints (api.fitbit.com) still
 * work for data fetching, but OAuth credentials now come from Google. The token
 * and data API URLs are configurable via env vars so they can be updated without
 * a code change if Google changes the endpoints.
 *
 * Environment variables (set in Supabase Dashboard → Settings → Edge Functions):
 *   FITBIT_CLIENT_ID      — OAuth client ID (from Google Cloud Console)
 *   FITBIT_CLIENT_SECRET  — OAuth client secret (from Google Cloud Console)
 *   FITBIT_TOKEN_URL      — (optional) defaults to https://api.fitbit.com/oauth2/token
 *                           Override if Google moves the token endpoint
 *
 * Auto-available: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APP_URL = 'https://simondring.github.io/hybrid-react/'

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const code  = url.searchParams.get('code')
  const state = url.searchParams.get('state')   // Supabase user ID
  const error = url.searchParams.get('error')

  if (error || !code || !state) {
    const reason = error || 'missing_params'
    console.error('[fitbit-auth-callback] Bad request:', reason)
    return Response.redirect(`${APP_URL}?fitbit=error&reason=${reason}`)
  }

  const clientId     = Deno.env.get('FITBIT_CLIENT_ID')!
  const clientSecret = Deno.env.get('FITBIT_CLIENT_SECRET')!
  const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
  const redirectUri  = `${supabaseUrl}/functions/v1/fitbit-auth-callback`

  // Token URL is configurable — Fitbit's own endpoint is the default,
  // but Google may route this differently for apps registered via Google Health API
  const tokenUrl = Deno.env.get('FITBIT_TOKEN_URL') ?? 'https://api.fitbit.com/oauth2/token'

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
    },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: redirectUri
    })
  })

  if (!tokenRes.ok) {
    const body = await tokenRes.text()
    console.error('[fitbit-auth-callback] Token exchange failed:', body)
    return Response.redirect(`${APP_URL}?fitbit=error&reason=token_exchange`)
  }

  const tokens = await tokenRes.json()

  const supabase = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const { error: dbError } = await supabase
    .from('wearable_connections')
    .upsert({
      user_id:          state,
      provider:         'fitbit',
      provider_user_id: tokens.user_id,
      access_token:     tokens.access_token,
      refresh_token:    tokens.refresh_token,
      expires_at:       expiresAt,
      scope:            tokens.scope,
      connected_at:     new Date().toISOString()
    }, { onConflict: 'user_id,provider' })

  if (dbError) {
    console.error('[fitbit-auth-callback] DB upsert failed:', dbError)
    return Response.redirect(`${APP_URL}?fitbit=error&reason=db_error`)
  }

  return Response.redirect(`${APP_URL}?fitbit=connected`)
})
