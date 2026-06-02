/**
 * fitbit-auth-callback — Supabase Edge Function
 *
 * Handles the Google OAuth 2.0 callback after the user authorises Fitbit/Google
 * Health API access. Exchanges the auth code for tokens and stores them.
 *
 * App registration is through Google Cloud Console (Google Health API).
 * OAuth is handled by Google accounts (accounts.google.com).
 * Data is fetched from the Google Health API (see fitbit-sync).
 *
 * Environment variables (Supabase Dashboard → Settings → Edge Functions):
 *   FITBIT_CLIENT_ID      — Google OAuth client ID
 *   FITBIT_CLIENT_SECRET  — Google OAuth client secret
 *   FITBIT_TOKEN_URL      — (optional) defaults to https://oauth2.googleapis.com/token
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
  const tokenUrl     = Deno.env.get('FITBIT_TOKEN_URL') ?? 'https://oauth2.googleapis.com/token'

  // Exchange auth code for access + refresh tokens
  // Google accepts client credentials in the POST body (unlike Fitbit which used Basic auth)
  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      client_id:     clientId,
      client_secret: clientSecret
    })
  })

  if (!tokenRes.ok) {
    const body = await tokenRes.text()
    console.error('[fitbit-auth-callback] Token exchange failed:', body)
    return Response.redirect(`${APP_URL}?fitbit=error&reason=token_exchange`)
  }

  const tokens = await tokenRes.json()

  // Google's token response has no user_id field (unlike Fitbit).
  // We use the Supabase user ID (state param) as the identifier instead.
  if (!tokens.refresh_token) {
    // This happens if prompt=consent was missing from the auth URL.
    // The user must disconnect and reconnect to force a new consent screen.
    console.error('[fitbit-auth-callback] No refresh token in response')
    return Response.redirect(`${APP_URL}?fitbit=error&reason=no_refresh_token`)
  }

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
      provider_user_id: null,   // not provided by Google OAuth
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
