# Sign in with Apple — Setup Guide

**Status:** the app code is already done. The "Continue with Apple" button on the
welcome screen (`apps/mobile/src/screens/auth/Welcome.jsx`) already calls
`signInWithOAuth('apple')` in `apps/mobile/src/stores/authStore.js`. This guide is
purely about configuring two external dashboards — **Apple Developer** and
**Supabase** — so that button starts working. There is **no code to write.**

**Time:** ~30–45 minutes. **Do the phases in order** — Supabase needs values that
Apple hands you first.

> Note (2026-07-09): the general OAuth guide (Google + Apple) is
> `supabase/OAUTH-SETUP.md`. The two guides currently recommend DIFFERENT Apple
> Services IDs (`com.simondring.performanceos.web` here vs
> `com.simondring.hybridtraining.web` there) — before changing anything, check
> which ID is actually configured in the Apple Developer portal; a merge of
> these guides is queued.

---

## What you're actually doing (plain English)

Sign in with Apple is a chain of trust between three parties:

1. **Apple** — owns the user's Apple ID and does the actual "is this really you" check.
2. **Supabase** — your backend. It does the handshake with Apple on your behalf and
   creates the user account in your database.
3. **Your app** — never talks to Apple directly. It just says "Supabase, start an
   Apple sign-in," and waits for the user to come back signed in.

The flow when a user taps the button:

```
Your app  ──"start Apple sign-in"──▶  Supabase
Supabase  ──redirect──▶  Apple's sign-in page  (user approves)
Apple     ──redirect──▶  Supabase callback     (Supabase finishes the handshake)
Supabase  ──redirect──▶  Your app              (user is now signed in)
```

Everything fiddly below is just teaching Apple and Supabase to trust each other for
those middle two hops. Apple needs to know your web service is allowed to use Apple
sign-in, and Supabase needs credentials to prove to Apple that it's really you.

---

## The pieces you'll collect

You'll gather four things from Apple, then paste them into Supabase. Keep them in a
scratch note as you go:

| Piece            | What it is                                          | Looks like                                  |
| ---------------- | --------------------------------------------------- | ------------------------------------------- |
| **Team ID**      | Identifies you as the developer                     | `A1B2C3D4E5` (10 chars)                     |
| **Services ID**  | Your web app's "client ID" for Apple sign-in        | `com.simondring.performanceos.web`          |
| **Key ID**       | Identifies the signing key below                    | `F6G7H8I9J0` (10 chars)                     |
| **`.p8` file**   | The private signing key (download once!)            | `AuthKey_F6G7H8I9J0.p8`                     |

---

## Before you start

- An **active, paid Apple Developer account** (you have this now). ✓
- Access to your **Supabase project dashboard**.
- Your project-specific values (already filled in for you):
  - **Supabase project ref:** `ggldomlmycvpwtzzjzcd`
  - **Supabase callback URL:** `https://ggldomlmycvpwtzzjzcd.supabase.co/auth/v1/callback`
  - **Production app URL:** `https://simondring.github.io/hybrid-react/`
  - **Local dev URL:** `http://localhost:5173/hybrid-react/`

---

## Phase A — Apple Developer Portal

Go to **developer.apple.com/account** → click **Certificates, Identifiers & Profiles**
(or go straight to developer.apple.com/account/resources/identifiers/list).

### A1. Note your Team ID

Look at the **top-right** of the Developer site, under your name/organisation — it
shows a 10-character code. That's your **Team ID**. Copy it into your scratch note.
(You can also find it under **Membership details**.)

### A2. Create an App ID

Even though you have no native iOS app yet, Apple requires a "primary" App ID to exist
as the anchor for the web service.

1. On the **Identifiers** page, click the blue **➕** next to "Identifiers".
2. Select **App IDs** → **Continue**.
3. Select type **App** → **Continue**.
4. Fill in:
   - **Description:** `Performance OS` (just a human label)
   - **Bundle ID:** select **Explicit** and enter `com.simondring.performanceos`
     (reverse-domain style; this exact string doesn't have to match anything yet).
5. Scroll the **Capabilities** list and tick **Sign In with Apple**. Leave its
   "Edit" settings at the default (*Enable as a primary App ID*).
6. Click **Continue** → **Register**.

*Why:* this is the identity everything else hangs off. The server-to-server
notification fields can stay blank — you don't need them.

### A3. Create a Services ID  ← the important one

This becomes the **Client ID** you give to Supabase.

1. On **Identifiers**, click **➕** again.
2. Select **Services IDs** → **Continue**.
3. Fill in:
   - **Description:** `Performance OS Web`
   - **Identifier:** `com.simondring.performanceos.web`
     *(note the `.web` — it must be different from the App ID above)*
4. **Continue** → **Register**.
5. Now click **back into** the Services ID you just made (from the Identifiers list).
6. Tick the **Sign In with Apple** checkbox, then click the **Configure** button that
   appears next to it.
7. In the **Web Authentication Configuration** dialog:
   - **Primary App ID:** choose `com.simondring.performanceos` (from A2).
   - **Domains and Subdomains:** `ggldomlmycvpwtzzjzcd.supabase.co`
     *(no `https://`, no trailing slash, no path)*
   - **Return URLs:** `https://ggldomlmycvpwtzzjzcd.supabase.co/auth/v1/callback`
     *(this one DOES include `https://` and the full path)*
8. Click **Next** / **Done** in the dialog, then **Continue** → **Save**.

*Why these URLs:* when a user signs in, Apple sends them back to **Supabase**, not to
your app. So the only address Apple needs to trust is the Supabase callback. Your app's
own address is handled later, in Supabase (Phase B2).

> **Common mistake:** putting your GitHub Pages URL here. It does **not** go here —
> Apple only ever talks to Supabase. Your app URL goes in Phase B2.

### A4. Create a Sign in with Apple key

This private key is what lets Supabase prove, on every sign-in, "I'm authorised to do
Apple sign-in for this app" — without a human present.

1. In the left menu, click **Keys** → click **➕**.
2. **Key Name:** `Supabase Apple Auth Key`.
3. Tick **Sign In with Apple**, click its **Configure** button, select the **Primary
   App ID** (`com.simondring.performanceos`), and **Save**.
4. **Continue** → **Register**.
5. On the next screen, **Download** the **`.p8` file**.
   - ⚠️ **You can only download it ONCE.** Save it somewhere safe (not in the repo —
     it's a secret). If you lose it, you can't re-download; you'd have to make a new key.
6. Note the **Key ID** shown on the key's detail page (10 chars) → scratch note.

✅ **End of Phase A** you should have, in your scratch note: **Team ID**,
**Services ID** (`...web`), **Key ID**, and the **`.p8` file** saved locally.

---

## Phase B — Supabase Dashboard

Open your project at supabase.com/dashboard → select your project.

### B1. Enable the Apple provider

First, **generate the secret token**, then paste it into the dashboard. These are two
**different pages** — the generator lives on Supabase's *docs* site, and the dashboard
only stores the finished token.

**Generate the token** (use **Chrome or Firefox — NOT Safari**, the widget fails silently
in Safari):

1. Open the generator on the docs page:
   https://supabase.com/docs/guides/auth/social-login/auth-apple
2. Scroll to the **"Generate a client secret"** section — there's an embedded form right
   on the page. It runs entirely in your browser, so your `.p8` never leaves your machine.
3. Fill in the four fields (the form's labels differ slightly from Apple's names):

   | Field on the page | What to enter                                | From |
   | ----------------- | -------------------------------------------- | ---- |
   | **Account ID**    | your **Team ID**                             | A1   |
   | **Service ID**    | your **Services ID** (`...web`)              | A3   |
   | **Key ID**        | your **Key ID**                              | A4   |
   | **`.p8` key**     | the **contents of the `.p8` file** (or upload it) | A4 |

4. Click **Generate**. It outputs a long string starting `eyJ...` — that's your secret
   (the signed JWT described in **"How the secret key is built"** below). Copy it.

**Store it in the dashboard:**

5. Left sidebar → **Authentication** → **Sign In / Providers** (sometimes just
   **Providers**) → open **Apple** → toggle it **on / enabled**.
6. **Client IDs:** paste your **Services ID** → `com.simondring.performanceos.web`.
7. **Secret Key (for OAuth):** paste the `eyJ...` string from step 4.
8. Click **Save**.

> ⚠️ **Write this on your calendar now:** Apple forces this secret to **expire every 6
> months**. When it lapses, Apple sign-in silently stops working with no obvious error.
> Set a recurring reminder to regenerate it (re-run the B1 generator steps). See **Maintenance** below.

#### How the secret key is built

The "Secret Key" is **not a password you invent** — it's a short-lived, cryptographically
**signed token (a JWT)** generated from your `.p8` private key. A JWT is a compact string
in three dot-separated parts: `header.payload.signature`. Think of it as a sealed note to
Apple — *"I'm developer X, for web service Y, valid until date Z"* — stamped with a seal
only your private key can make.

Your four collected pieces each slot into it:

| JWT field | Meaning            | Value                                   | Comes from |
| --------- | ------------------ | --------------------------------------- | ---------- |
| `kid` (header) | Key identifier | your **Key ID**                         | A4         |
| `alg` (header) | Signing algorithm | `ES256` (Apple requires Elliptic Curve) | fixed      |
| `iss`     | Issuer             | your **Team ID**                        | A1         |
| `sub`     | Subject (which app)| your **Services ID**                    | A3         |
| `aud`     | Audience (to whom) | `https://appleid.apple.com`             | fixed      |
| `iat`     | Issued-at time     | now                                     | auto       |
| `exp`     | Expiry             | up to **6 months** after `iat` (Apple's hard max — this is *why* it expires every 6 months) | auto |

The **signature** is the header + payload signed with your **`.p8`** — only the private-key
holder can produce a valid one, which is how Apple knows it's genuinely you.

**You normally never build this by hand** — the generator widget on Supabase's docs page
does it (see B1 above, in Chrome/Firefox). If you ever need to make it yourself (e.g. the generator
misbehaves), you already have Node, so in a scratch folder:

```bash
npm install jsonwebtoken
```

```js
// generate-apple-secret.js
const jwt = require('jsonwebtoken');
const fs  = require('fs');

const privateKey = fs.readFileSync('./AuthKey_XXXXXXXXXX.p8'); // your .p8

const token = jwt.sign({}, privateKey, {
  algorithm: 'ES256',
  keyid:     'YOUR_KEY_ID',                       // → kid  (A4)
  issuer:    'YOUR_TEAM_ID',                       // → iss  (A1)
  subject:   'com.simondring.performanceos.web',   // → sub  (your Services ID)
  audience:  'https://appleid.apple.com',          // → aud  (always this)
  expiresIn: '180d',                               // → exp  (under Apple's 6-month cap)
});

console.log(token);
```

```bash
node generate-apple-secret.js   # prints one long eyJ... string — that's the secret
```

Copy the printed `eyJ...` string into Supabase's **Secret Key** field. Keep the `.p8` and
this script somewhere safe (not in the repo) so regenerating in 6 months is a 10-second job.

### B2. Allow your app's address back in

This is the final hop — Supabase refuses to send a signed-in user anywhere that isn't
on this allowlist.

1. Left sidebar → **Authentication** → **URL Configuration**.
2. **Site URL:** `https://simondring.github.io/hybrid-react/`
3. **Redirect URLs:** click **Add URL** and add **both**:
   - `https://simondring.github.io/hybrid-react/` (production)
   - `http://localhost:5173/hybrid-react/` (local testing — match whatever URL
     `npm run dev` actually prints)
4. **Save.**

> **This is the #1 thing people forget.** The match must be exact, trailing slash
> included. Your app code requests `https://simondring.github.io/hybrid-react/` as its
> return target (`window.location.origin + import.meta.env.BASE_URL`), so that exact URL
> must be on this list. If it isn't, you sign in and land on a Supabase error page
> instead of back in the app.

---

## Phase C — Test it

1. Run the app: `npm run dev` (from the repo root). Open the URL it prints.
2. Go to the welcome screen and click **Continue with Apple**.
3. Expected: you bounce to Apple's sign-in page → approve → land back in your app,
   **signed in**.
4. Confirm it really worked: Supabase Dashboard → **Authentication** → **Users** →
   you should see a new user whose provider is **apple**.

Test on **production** too once deployed, since the URLs differ from localhost.

---

## Troubleshooting

| Symptom                                              | Likely cause                                              | Fix                                                                 |
| --------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| Land on a Supabase error page after approving       | App URL not in Supabase **Redirect URLs** (B2)           | Add the exact URL incl. trailing slash; check localhost port       |
| `invalid_client` / Apple rejects the request        | Services ID or Return URL mismatch between Apple ↔ Supabase | Re-check A3 Return URL = the `/auth/v1/callback` URL exactly        |
| Worked, then broke ~6 months later                  | The OAuth secret expired                                  | Regenerate the secret (re-run B1 generator) — see Maintenance      |
| User has no name / weird `@privaterelay` email      | Normal Apple behaviour, not a bug                         | Apple sends name only on first sign-in; relay emails are expected  |
| Button does nothing / "Supabase is not configured"  | `.env.local` keys missing                                | Ensure `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are set      |

---

## Maintenance — the 6-month secret

Apple's "Sign in with Apple" client secret **must be regenerated every 6 months**.
This is a hard Apple rule, not a Supabase choice. When it expires, the button stops
working and there's no loud error — it just fails.

- **Set a recurring calendar reminder every ~5 months.**
- To regenerate: re-run the **Phase B1 generator steps** using the **same** Team ID,
  Services ID, Key ID, and `.p8` file. You do **not** need to redo the Apple Developer
  portal steps or make a new key — the same `.p8` keeps working.

---

## Your exact values (reference)

```
Supabase project ref:   ggldomlmycvpwtzzjzcd
Supabase callback URL:   https://ggldomlmycvpwtzzjzcd.supabase.co/auth/v1/callback
Apple "Web Domain":      ggldomlmycvpwtzzjzcd.supabase.co
Production app URL:       https://simondring.github.io/hybrid-react/
Local dev URL:            http://localhost:5173/hybrid-react/
Suggested App ID:         com.simondring.performanceos
Suggested Services ID:    com.simondring.performanceos.web
```

> **Note on Apple Health / Apple Watch:** that is a *separate, much larger* project. It
> cannot be done from this web app — Apple Health (HealthKit) is readable only from a
> native iOS app, which is Stage 7 on the roadmap. This guide covers Sign in with Apple
> only.
