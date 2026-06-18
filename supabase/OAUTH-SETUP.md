# OAuth setup — Google & Apple (Supabase)

These are dashboard/click-ops steps. Do them once per provider. The app code
already calls `supabase.auth.signInWithOAuth({ provider })`.

## Redirect URLs (needed by both providers)
- Supabase callback: `https://<your-project-ref>.supabase.co/auth/v1/callback`
- App return URLs (Supabase → Authentication → URL Configuration → Redirect URLs):
  - `https://<your-gh-username>.github.io/hybrid-react/`
  - `http://localhost:5173/hybrid-react/` (local dev)

## Google
1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID
   → Web application.
2. Authorized redirect URI: the Supabase callback URL above.
3. Copy the Client ID + Client Secret.
4. Supabase → Authentication → Providers → Google → enable, paste ID + Secret → Save.

## Apple
1. Requires an Apple Developer account.
2. Create an App ID, then a Services ID (this is your OAuth client_id).
3. Configure the Services ID "Sign in with Apple": add the Supabase callback URL
   as a Return URL and your domain as the website.
4. Create a Sign in with Apple private key (.p8); note the Key ID and Team ID.
5. Supabase → Authentication → Providers → Apple → enable; fill Services ID,
   Team ID, Key ID, and the .p8 key contents → Save.

## Verify
- Local: `npm run dev`, click "Continue with Google" / "Continue with Apple",
  complete the provider flow, land back in the app signed in (new accounts land
  in onboarding).
