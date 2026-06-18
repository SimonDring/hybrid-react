# OAuth setup — Google & Apple sign-in (Supabase)

This is a step-by-step guide to turning on "Continue with Google" and "Continue
with Apple". These are **dashboard / click-ops** steps — there's no code to write;
the app already calls `supabase.auth.signInWithOAuth({ provider })`. You do each
provider once.

Your project's real values are filled in below so you can copy/paste.

---

## How this works (plain language)

When someone taps "Continue with Google", three parties talk to each other:

1. **Your app** sends them to Google (or Apple) to log in.
2. **Google/Apple** confirms who they are, then sends them **back to Supabase**
   at a fixed "callback" address.
3. **Supabase** creates/looks up the account and sends the user **back to your
   app**, now signed in.

So you have to tell two systems about each other:
- Tell **Google/Apple**: "Supabase is allowed to receive logins at this callback
  address." → that's the **Authorized redirect URI** below.
- Tell **Supabase**: "here are my Google/Apple credentials" and "here are the app
  addresses you're allowed to send users back to." → the **Redirect URLs** below.

If any address is even slightly wrong (http vs https, a missing trailing slash,
wrong project), the login fails with a redirect/URI-mismatch error. Copy/paste
exactly — don't hand-type.

---

## Your project's addresses (copy these)

- **Supabase project ref:** `ggldomlmycvpwtzzjzcd`
- **Supabase OAuth callback (give this to Google & Apple):**
  ```
  https://ggldomlmycvpwtzzjzcd.supabase.co/auth/v1/callback
  ```
- **App return URLs (give these to Supabase):**
  ```
  https://simondring.github.io/hybrid-react/
  http://localhost:5173/hybrid-react/
  ```
  (The first is your live GitHub Pages app; the second is local `npm run dev`.)

---

## Step 0 — Tell Supabase the allowed return URLs (do this once, for both providers)

1. Go to the Supabase dashboard: <https://supabase.com/dashboard> → open your
   project.
2. Left sidebar → **Authentication** → **URL Configuration**.
3. Under **Redirect URLs**, click **Add URL** and add **both**:
   - `https://simondring.github.io/hybrid-react/`
   - `http://localhost:5173/hybrid-react/`
4. (Optional but tidy) Set **Site URL** to `https://simondring.github.io/hybrid-react/`.
5. Click **Save**.

> Why both: the app figures out where to return using
> `window.location.origin + import.meta.env.BASE_URL`. On your phone/live that's
> the github.io URL; on your laptop it's localhost. Supabase only honours return
> URLs on this allow-list, so both must be present.

---

## Step 1 — Google

Google is the easier of the two. ~10 minutes.

### 1a. Create the OAuth credentials in Google Cloud

1. Go to <https://console.cloud.google.com/>. Sign in with the Google account you
   want to own this.
2. Top bar → project dropdown → **New Project** (e.g. name it "Hybrid Training").
   Create it and make sure it's selected.
3. Left menu (☰) → **APIs & Services** → **OAuth consent screen**.
   - **User type:** External → **Create**.
   - App name: `Hybrid Training`. User support email: your email.
   - Developer contact email: your email. **Save and Continue** through the
     remaining screens (you can leave Scopes and Test users empty for now) →
     **Back to Dashboard**.
   - While testing, the app is in "Testing" mode — that's fine. (Publishing it
     later removes the "unverified app" warning, but isn't required to work.)
4. Left menu → **APIs & Services** → **Credentials**.
5. **+ Create Credentials** → **OAuth client ID**.
   - **Application type:** **Web application**.
   - **Name:** `Hybrid Training Web`.
   - Under **Authorized redirect URIs** → **Add URI**, paste **exactly**:
     ```
     https://ggldomlmycvpwtzzjzcd.supabase.co/auth/v1/callback
     ```
   - (You do **not** need to fill "Authorized JavaScript origins" for this flow.)
   - **Create**.
6. A popup shows your **Client ID** and **Client Secret**. Keep this tab open
   (or copy both somewhere safe for a minute).

### 1b. Paste the credentials into Supabase

1. Supabase dashboard → **Authentication** → **Providers** (also called
   "Sign In / Providers") → find **Google** → expand it.
2. Toggle **Enable Sign in with Google** on.
3. Paste the **Client ID** and **Client Secret** from step 1a.
4. **Save**.

### 1c. Test Google

- Run `npm run dev`, open the app, tap **Continue with Google**, pick your
  account. You should land back in the app signed in (a brand-new account goes
  to onboarding).

---

## Step 2 — Apple

Apple is fiddlier and **requires a paid Apple Developer account** ($99/yr). Budget
~30 minutes. You'll create four things: an **App ID**, a **Services ID**, a
**key**, and then assemble a **client secret**.

> Heads-up: Apple only returns the user's name on the **very first** sign-in, and
> some users choose "Hide My Email" (you get a relay address). Both are normal.

### 2a. Create an App ID

1. Go to <https://developer.apple.com/account> → **Certificates, Identifiers &
   Profiles** → **Identifiers**.
2. **+** (add) → **App IDs** → **Continue** → type **App** → **Continue**.
3. **Description:** `Hybrid Training`. **Bundle ID (Explicit):** something like
   `com.simondring.hybridtraining`.
4. Scroll the capabilities list, tick **Sign In with Apple** → **Continue** →
   **Register**.

### 2b. Create a Services ID (this becomes your OAuth `client_id`)

1. **Identifiers** → **+** → **Services IDs** → **Continue**.
2. **Description:** `Hybrid Training Web`. **Identifier:** e.g.
   `com.simondring.hybridtraining.web` → **Continue** → **Register**.
3. Click the Services ID you just made to edit it.
4. Tick **Sign In with Apple** → click **Configure**:
   - **Primary App ID:** select the App ID from step 2a.
   - **Domains and Subdomains:** `ggldomlmycvpwtzzjzcd.supabase.co`
   - **Return URLs:** paste **exactly**:
     ```
     https://ggldomlmycvpwtzzjzcd.supabase.co/auth/v1/callback
     ```
   - **Next** → **Done** → **Continue** → **Save**.
5. Note this **Services ID identifier** (e.g. `com.simondring.hybridtraining.web`)
   — Supabase calls this the **Client ID / Service ID**.

### 2c. Create a Sign in with Apple key

1. **Keys** (left menu) → **+**.
2. **Key Name:** `Hybrid Training SIWA`. Tick **Sign In with Apple** →
   **Configure** → choose your Primary App ID → **Save** → **Continue** →
   **Register**.
3. **Download** the `.p8` key file. **You can only download it once** — keep it
   safe.
4. Note the **Key ID** (shown on the key's page, ~10 characters).
5. Note your **Team ID** — top-right of the developer site, or **Membership**
   page (~10 characters).

### 2d. Enter it all into Supabase

Supabase can build the Apple "client secret" for you from these pieces (newer
dashboard), or you may need to generate it yourself (older dashboard). Try the
dashboard fields first:

1. Supabase → **Authentication** → **Providers** → **Apple** → expand, toggle on.
2. Fill in:
   - **Client IDs / Services ID:** the Services ID from step 2b
     (e.g. `com.simondring.hybridtraining.web`).
   - **Team ID:** from step 2c.
   - **Key ID:** from step 2c.
   - **Secret Key (the .p8 contents):** open the downloaded `.p8` in a text
     editor and paste the **entire** contents, including the
     `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----` lines.
3. **Save**.

> If your Supabase version instead asks for a single **Secret (JWT)** value, use
> Supabase's documented generator:
> <https://supabase.com/docs/guides/auth/social-login/auth-apple> — it shows how
> to turn the Team ID + Key ID + Services ID + `.p8` into the JWT secret. Paste
> that JWT into the **Secret Key** field. (This JWT expires ~6 months; set a
> reminder to regenerate it.)

### 2e. Test Apple

- `npm run dev` → **Continue with Apple** → complete Apple's flow → land back in
  the app signed in (new account → onboarding).

---

## Step 3 — Final checks

- [ ] Google sign-in works on `localhost:5173` and on the live github.io app.
- [ ] Apple sign-in works on both.
- [ ] A brand-new social account lands in **onboarding**; a returning one lands in
      the **app** (this is automatic — the app routes by whether a plan exists).
- [ ] Run the invite-allowlist migration first if you haven't
      (`supabase/migrations/004_remove_invite_allowlist.sql`), otherwise a
      brand-new account may be rejected.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `redirect_uri_mismatch` (Google) | The **Authorized redirect URI** in Google Cloud doesn't exactly match `https://ggldomlmycvpwtzzjzcd.supabase.co/auth/v1/callback`. Re-copy it; no trailing slash. |
| `invalid_client` (Apple) | Wrong Services ID, Team ID, Key ID, or an expired/incorrect secret JWT. Re-check 2d. |
| Logs in but lands back on the Welcome screen | The app URL isn't in Supabase **Redirect URLs** (Step 0). Add the exact origin you're testing from. |
| "Unsupported provider" / "provider is not enabled" | The provider toggle isn't on in Supabase **Providers**, or you didn't **Save**. |
| Works on localhost but not live (or vice-versa) | You only added one of the two app URLs in Step 0. Add both. |
| New email signups rejected with a DB error | The allowlist migration `004` hasn't been run yet. Run it in the SQL Editor. |
| Apple stops working after ~6 months | The Apple client-secret JWT expired. Regenerate it (2d note) and re-paste. |

---

## Where the app code lives (for reference)

- The button actions: `signInWithOAuth(provider)` in `src/stores/authStore.js`.
- The buttons: `src/screens/auth/Welcome.jsx`.
- Return-URL handling is automatic via `detectSessionInUrl` in
  `src/lib/supabaseClient.js`; on return, `onAuthStateChange` (in `authStore`)
  sets the per-user cache namespace and pulls the account's data.
