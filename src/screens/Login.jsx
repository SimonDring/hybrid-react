/**
 * Login screen — email + password accounts with a "create account" mode.
 *
 *  - Sign in:        existing users enter email + password.
 *  - Create account: name + email + password (gated by the invite allowlist —
 *                    the server rejects emails that aren't invited).
 *  - Forgot password: emails a reset link.
 *
 * Account creation may require email confirmation (a Supabase Auth setting).
 * When it does, signUp returns no session and we show a "check your email" note.
 */

import { useState } from 'react';
import { useAuthStore } from '../stores/authStore.js';

const INPUT = {
  width: '100%', fontSize: 16, padding: '14px 16px', borderRadius: 12,
  border: '1px solid var(--hairline)', background: 'var(--bg-surface)',
  fontFamily: 'inherit', color: 'var(--txt-strong)', marginBottom: 12,
  boxSizing: 'border-box'
};

const BTN_PRIMARY = (active) => ({
  width: '100%', padding: 15, borderRadius: 12, border: 'none',
  background: active ? 'var(--rust)' : 'var(--bg-surface-2)',
  color: active ? '#fff' : 'var(--txt-muted)',
  fontSize: 15, fontWeight: 600, cursor: active ? 'pointer' : 'default',
  fontFamily: 'inherit', transition: 'background 0.15s'
});

const BTN_GHOST = {
  width: '100%', padding: 14, borderRadius: 12,
  border: '1px solid var(--hairline)', background: 'transparent',
  color: 'var(--txt-muted)', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit', marginTop: 10
};

const LINK_BTN = {
  background: 'none', border: 'none', color: 'var(--rust)', fontSize: 13,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0
};

const NOTICE = {
  padding: '14px 16px', borderRadius: 12, marginBottom: 20,
  background: 'rgba(74,93,58,0.10)', border: '1px solid rgba(74,93,58,0.30)',
  fontSize: 13, lineHeight: 1.5, color: 'var(--txt-body)'
};

export default function Login() {
  const signUp              = useAuthStore(s => s.signUp);
  const signInWithPassword  = useAuthStore(s => s.signInWithPassword);
  const sendPasswordReset   = useAuthStore(s => s.sendPasswordReset);
  const resetLinkSent       = useAuthStore(s => s.resetLinkSent);
  const signingUp           = useAuthStore(s => s.signingUp);
  const signingIn           = useAuthStore(s => s.signingIn);
  const resetSent           = useAuthStore(s => s.resetSent);
  const confirmEmailSent    = useAuthStore(s => s.confirmEmailSent);
  const errorMessage        = useAuthStore(s => s.errorMessage);
  const status              = useAuthStore(s => s.status);

  const [mode, setMode]   = useState('signin');   // 'signin' | 'signup'
  const [forgot, setForgot] = useState(false);
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [password, setPassword] = useState('');

  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const validPassword = password.length >= 6;
  const validName = name.trim().length > 0;

  const busy = signingUp || signingIn;
  const canSignIn = validEmail && validPassword && !busy;
  const canSignUp = validName && validEmail && validPassword && !busy;

  const submit = () => {
    if (mode === 'signup') { if (canSignUp) signUp(email, password, name); }
    else                   { if (canSignIn) signInWithPassword(email, password); }
  };
  const submitReset = () => { if (validEmail) sendPasswordReset(email); };

  const startOver = () => { resetLinkSent(); setForgot(false); setPassword(''); };

  // ---- Confirm-email state (sign-up with email confirmation on) ----
  if (confirmEmailSent) {
    return (
      <Shell heading="Check your email"
             sub={`We sent a confirmation link to ${confirmEmailSent}. Click it to finish creating your account, then come back and sign in.`}>
        <button onClick={startOver} style={BTN_GHOST}>Back to sign in</button>
      </Shell>
    );
  }

  // ---- Forgot-password state ----
  if (forgot) {
    return (
      <Shell heading="Reset password"
             sub="Enter your email and we’ll send you a link to set a new password.">
        {resetSent ? (
          <>
            <div style={NOTICE}>If an account exists for {email.trim()}, a reset link is on its way.</div>
            <button onClick={startOver} style={BTN_GHOST}>Back to sign in</button>
          </>
        ) : (
          <>
            <input type="email" inputMode="email" autoCapitalize="off" autoCorrect="off"
              placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitReset()} style={INPUT} />
            <button onClick={submitReset} disabled={!validEmail} style={BTN_PRIMARY(validEmail)}>
              Send reset link
            </button>
            <button onClick={startOver} style={BTN_GHOST}>Back to sign in</button>
          </>
        )}
        {errorMessage && <p style={{ fontSize: 13, color: 'var(--rust)', marginTop: 14 }}>{errorMessage}</p>}
      </Shell>
    );
  }

  // ---- Main sign-in / create-account form ----
  const isSignup = mode === 'signup';
  return (
    <Shell
      heading={isSignup ? 'Create your account' : 'Sign in'}
      sub={isSignup
        ? 'Set up your account to start building your plan. Accounts are invite-only during testing.'
        : 'Welcome back. Enter your email and password.'}
    >
      {status === 'not_configured' && (
        <div style={{ ...NOTICE, background: 'rgba(176,74,46,0.08)', border: '1px solid rgba(176,74,46,0.25)' }}>
          Supabase isn't configured yet. Add your keys to <code>.env.local</code> and restart the dev server.
        </div>
      )}

      {isSignup && (
        <input type="text" autoCapitalize="words" placeholder="Your name"
          value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()} style={INPUT} />
      )}
      <input type="email" inputMode="email" autoCapitalize="off" autoCorrect="off"
        placeholder="you@example.com" value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()} style={INPUT} />
      <input type="password" autoComplete={isSignup ? 'new-password' : 'current-password'}
        placeholder={isSignup ? 'Choose a password (min 6 characters)' : 'Password'}
        value={password} onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()} style={INPUT} />

      <button onClick={submit} disabled={isSignup ? !canSignUp : !canSignIn}
        style={BTN_PRIMARY(isSignup ? canSignUp : canSignIn)}>
        {busy ? (isSignup ? 'Creating…' : 'Signing in…') : (isSignup ? 'Create account' : 'Sign in')}
      </button>

      {!isSignup && (
        <button onClick={() => { setForgot(true); useAuthStore.setState({ errorMessage: null }); }}
          style={{ ...LINK_BTN, display: 'block', margin: '14px auto 0' }}>
          Forgot password?
        </button>
      )}

      {errorMessage && <p style={{ fontSize: 13, color: 'var(--rust)', marginTop: 14 }}>{errorMessage}</p>}

      <p style={{ fontSize: 13, color: 'var(--txt-muted)', marginTop: 24, textAlign: 'center' }}>
        {isSignup ? 'Already have an account?' : 'New here?'}{' '}
        <button
          onClick={() => { setMode(isSignup ? 'signin' : 'signup'); setPassword(''); useAuthStore.setState({ errorMessage: null }); }}
          style={LINK_BTN}>
          {isSignup ? 'Sign in' : 'Create an account'}
        </button>
      </p>

      <p style={{ fontSize: 11, opacity: 0.5, marginTop: 24, lineHeight: 1.5 }}>
        Your data is private to your account. Signing in lets it sync across your devices.
      </p>
    </Shell>
  );
}

// Shared page chrome so every auth state looks consistent.
function Shell({ heading, sub, children }) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '32px 24px', maxWidth: 440, margin: '0 auto'
    }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 10 }}>
          Hybrid Training
        </div>
        <h1 className="h1" style={{ marginBottom: 8 }}>{heading}</h1>
        <p className="sub" style={{ marginBottom: 0 }}>{sub}</p>
      </div>
      {children}
    </div>
  );
}
