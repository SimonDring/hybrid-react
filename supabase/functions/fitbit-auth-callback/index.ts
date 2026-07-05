/**
 * fitbit-auth-callback — Supabase Edge Function
 *
 * Handles the Fitbit OAuth 2.0 callback. Exchanges the auth code for tokens
 * and stores them in wearable_connections for use by fitbit-sync.
 *
 * Google OAuth sends credentials in the POST body (client_id + client_secret).
 *
 * Environment variables (Supabase Dashboard → Settings → Edge Functions):
 *   FITBIT_CLIENT_ID      — Google OAuth Client ID
 *   FITBIT_CLIENT_SECRET  — Google OAuth Client Secret
 *   FITBIT_TOKEN_URL      — (optional) defaults to https://oauth2.googleapis.com/token
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APP_URL = 'https://simondring.github.io/hybrid-react/'

Deno.serve(async (req: Request) => {
  const url   = new URL(req.url)
  const code  = url.searchParams.get('code')
  const state = url.searchParams.get('state')   // Supabase user ID passed via state param
  const error = url.searchParams.get('error')

  if (error || !code || !state) {
    const reason = error || 'missing_params'
    console.error('[fitbit-auth-callback] Bad request:', reason)
    return Response.redirect(`${APP_URL}?fitbit=error&reason=${reason}`)
  }

  const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
  const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // S1: resolve the real user from the single-use signed `state` nonce — never
  // trust the raw param as an identity. Rejects forged/expired/replayed states.
  const { data: resolvedUserId, error: stateErr } =
    await supabase.rpc('consume_oauth_state', { p_nonce: state, p_provider: 'fitbit' })
  if (stateErr || !resolvedUserId) {
    console.error('[fitbit-auth-callback] Invalid OAuth state:', stateErr?.message || 'no match')
    return Response.redirect(`${APP_URL}?fitbit=error&reason=invalid_state`)
  }

  const clientId     = Deno.env.get('FITBIT_CLIENT_ID')!
  const clientSecret = Deno.env.get('FITBIT_CLIENT_SECRET')!
  const redirectUri  = `${supabaseUrl}/functions/v1/fitbit-auth-callback`
  const tokenUrl     = Deno.env.get('FITBIT_TOKEN_URL') ?? 'https://oauth2.googleapis.com/token'

  // Google OAuth sends credentials in the POST body (not Basic Auth header)
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

  if (!tokens.refresh_token) {
    console.error('[fitbit-auth-callback] No refresh token in response')
    return Response.redirect(`${APP_URL}?fitbit=error&reason=no_refresh_token`)
  }

  const { error: dbError } = await supabase
    .from('wearable_connections')
    .upsert({
      user_id:          resolvedUserId,
      provider:         'fitbit',
      provider_user_id: tokens.user_id ?? null,
      access_token:     tokens.access_token,
      refresh_token:    tokens.refresh_token,
      expires_at:       new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scope:            tokens.scope,
      connected_at:     new Date().toISOString()
    }, { onConflict: 'user_id,provider' })

  if (dbError) {
    console.error('[fitbit-auth-callback] DB upsert failed:', dbError)
    return Response.redirect(`${APP_URL}?fitbit=error&reason=db_error`)
  }

  return Response.redirect(`${APP_URL}?fitbit=connected`)
})
