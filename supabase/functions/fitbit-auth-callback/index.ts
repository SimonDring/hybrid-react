/**
 * fitbit-auth-callback — Supabase Edge Function
 *
 * Receives the OAuth 2.0 authorization code from Fitbit after the user
 * approves access, exchanges it for tokens, stores them in wearable_connections,
 * then redirects the user back to the app.
 *
 * Flow:
 *   App → Fitbit OAuth page → user approves → Fitbit redirects here
 *   → exchange code → store tokens → redirect to app with ?fitbit=connected
 *
 * Environment variables required (set in Supabase Dashboard → Settings → Edge Functions):
 *   FITBIT_CLIENT_ID      — from your Fitbit Developer App
 *   FITBIT_CLIENT_SECRET  — from your Fitbit Developer App
 *
 * Auto-available in all Edge Functions:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APP_URL = 'https://simondring.github.io/hybrid-react/'
const FITBIT_TOKEN_URL = 'https://api.fitbit.com/oauth2/token'

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

  // Exchange the auth code for access + refresh tokens
  const tokenRes = await fetch(FITBIT_TOKEN_URL, {
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
