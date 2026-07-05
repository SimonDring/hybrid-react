/**
 * strava-auth-callback — Supabase Edge Function
 *
 * Handles the Strava OAuth 2.0 callback: exchanges the auth code for tokens and
 * stores them in wearable_connections (provider='strava', role='secondary' —
 * Strava supplies workouts only, never baseline). Mirrors fitbit-auth-callback.
 *
 * Env (Supabase Dashboard → Edge Functions): STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APP_URL   = 'https://simondring.github.io/hybrid-react/'
const TOKEN_URL = 'https://www.strava.com/oauth/token'

Deno.serve(async (req: Request) => {
  const url   = new URL(req.url)
  const code  = url.searchParams.get('code')
  const state = url.searchParams.get('state')   // Supabase user id
  const error = url.searchParams.get('error')

  if (error || !code || !state) {
    const reason = error || 'missing_params'
    console.error('[strava-auth-callback] Bad request:', reason)
    return Response.redirect(`${APP_URL}?strava=error&reason=${reason}`)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // S1: resolve the real user from the single-use signed `state` nonce — never
  // trust the raw param as an identity. Rejects forged/expired/replayed states.
  const { data: resolvedUserId, error: stateErr } =
    await supabase.rpc('consume_oauth_state', { p_nonce: state, p_provider: 'strava' })
  if (stateErr || !resolvedUserId) {
    console.error('[strava-auth-callback] Invalid OAuth state:', stateErr?.message || 'no match')
    return Response.redirect(`${APP_URL}?strava=error&reason=invalid_state`)
  }

  const clientId     = Deno.env.get('STRAVA_CLIENT_ID')!
  const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET')!

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_id:     clientId,
      client_secret: clientSecret
    })
  })

  if (!tokenRes.ok) {
    console.error('[strava-auth-callback] Token exchange failed:', await tokenRes.text())
    return Response.redirect(`${APP_URL}?strava=error&reason=token_exchange`)
  }

  const tokens = await tokenRes.json()

  if (!tokens.refresh_token) {
    console.error('[strava-auth-callback] No refresh token in response')
    return Response.redirect(`${APP_URL}?strava=error&reason=no_refresh_token`)
  }

  // Strava returns expires_at as an absolute epoch-seconds value.
  const { error: dbError } = await supabase
    .from('wearable_connections')
    .upsert({
      user_id:          resolvedUserId,
      provider:         'strava',
      provider_user_id: tokens.athlete?.id ? String(tokens.athlete.id) : null,
      access_token:     tokens.access_token,
      refresh_token:    tokens.refresh_token,
      expires_at:       new Date(tokens.expires_at * 1000).toISOString(),
      scope:            tokens.scope ?? null,
      role:             'secondary',
      connected_at:     new Date().toISOString()
    }, { onConflict: 'user_id,provider' })

  if (dbError) {
    console.error('[strava-auth-callback] DB upsert failed:', dbError)
    return Response.redirect(`${APP_URL}?strava=error&reason=db_error`)
  }

  return Response.redirect(`${APP_URL}?strava=connected`)
})
