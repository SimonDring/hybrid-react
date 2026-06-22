/**
 * SignIn — email + password sign-in, with two sub-states preserved from the old
 * Login screen:
 *   - Forgot password: emails a reset link.
 *   - Code sign-in (OTP): emails a 6-digit code (no password). The most
 *     PWA-friendly way in, and the only way back for older accounts that never
 *     set a password.
 * `onBack` returns to the Welcome screen.
 */

import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore.js';
import { Shell, INPUT, BTN_PRIMARY, BTN_GHOST, LINK_BTN, NOTICE } from './authShell.jsx';

export default function SignIn({ onBack }) {
  const signInWithPassword  = useAuthStore(s => s.signInWithPassword);
  const sendPasswordReset   = useAuthStore(s => s.sendPasswordReset);
  const signInWithEmail     = useAuthStore(s => s.signInWithEmail);
  const verifyOtp           = useAuthStore(s => s.verifyOtp);
  const resetLinkSent       = useAuthStore(s => s.resetLinkSent);
  const signingIn           = useAuthStore(s => s.signingIn);
  const sendingLink         = useAuthStore(s => s.sendingLink);
  const verifyingOtp        = useAuthStore(s => s.verifyingOtp);
  const linkSentTo          = useAuthStore(s => s.linkSentTo);
  const resetSent           = useAuthStore(s => s.resetSent);
  const errorMessage        = useAuthStore(s => s.errorMessage);
  const status              = useAuthStore(s => s.status);

  const [forgot, setForgot]   = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode]       = useState('');

  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const validPassword = password.length >= 6;
  const validCode = /^\d{6}$/.test(code.trim());

  const handleCodeChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
    if (val.length === 6) verifyOtp(linkSentTo, val);  // auto-submit at 6 digits
  };

  const canSignIn = validEmail && validPassword && !signingIn;
  const submit = () => { if (canSignIn) signInWithPassword(email, password); };
  const submitReset = () => { if (validEmail) sendPasswordReset(email); };
  const startOver = () => { resetLinkSent(); setForgot(false); setOtpMode(false); setPassword(''); setCode(''); };

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

  // ---- Code (OTP) sign-in: no password, works well inside an iOS PWA ----
  if (otpMode) {
    return (
      <Shell
        heading={linkSentTo ? 'Enter your code' : 'Sign in with a code'}
        sub={linkSentTo
          ? `We sent a 6-digit code to ${linkSentTo}. Enter it to sign in.`
          : 'We’ll email you a 6-digit code — no password needed.'}
      >
        {!linkSentTo ? (
          <>
            <input type="email" inputMode="email" autoCapitalize="off" autoCorrect="off"
              placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && validEmail && signInWithEmail(email)} style={INPUT} />
            <button onClick={() => validEmail && signInWithEmail(email)}
              disabled={!validEmail || sendingLink} style={BTN_PRIMARY(validEmail && !sendingLink)}>
              {sendingLink ? 'Sending…' : 'Email me a code'}
            </button>
            <button onClick={() => { setOtpMode(false); useAuthStore.setState({ errorMessage: null }); }} style={BTN_GHOST}>
              Use a password instead
            </button>
          </>
        ) : (
          <>
            <input type="text" inputMode="numeric" autoComplete="one-time-code"
              placeholder="000000" value={code} onChange={handleCodeChange}
              onKeyDown={e => e.key === 'Enter' && validCode && verifyOtp(linkSentTo, code)}
              style={{ ...INPUT, fontSize: 28, letterSpacing: '0.25em', textAlign: 'center' }} autoFocus />
            <button onClick={() => validCode && verifyOtp(linkSentTo, code)}
              disabled={!validCode || verifyingOtp} style={BTN_PRIMARY(validCode && !verifyingOtp)}>
              {verifyingOtp ? 'Verifying…' : 'Sign in'}
            </button>
            <button onClick={() => { resetLinkSent(); setCode(''); }} style={BTN_GHOST}>Use a different email</button>
            <button onClick={() => { setCode(''); signInWithEmail(linkSentTo); }}
              style={{ ...BTN_GHOST, border: 'none', fontSize: 13, marginTop: 4 }}>Resend code</button>
          </>
        )}
        {errorMessage && <p style={{ fontSize: 13, color: 'var(--rust)', marginTop: 14 }}>{errorMessage}</p>}
      </Shell>
    );
  }

  // ---- Main email + password sign-in ----
  return (
    <Shell heading="Sign in" sub="Welcome back. Enter your email and password.">
      {status === 'not_configured' && (
        <div style={{ ...NOTICE, background: 'rgba(176,74,46,0.08)', border: '1px solid rgba(176,74,46,0.25)' }}>
          Supabase isn't configured yet. Add your keys to <code>.env.local</code> and restart the dev server.
        </div>
      )}

      <input type="email" inputMode="email" autoCapitalize="off" autoCorrect="off"
        placeholder="you@example.com" value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()} style={INPUT} />
      <input type="password" autoComplete="current-password"
        placeholder="Password" value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()} style={INPUT} />

      <button onClick={submit} disabled={!canSignIn} style={BTN_PRIMARY(canSignIn)}>
        {signingIn ? 'Signing in…' : 'Sign in'}
      </button>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 14 }}>
        <button onClick={() => { setForgot(true); useAuthStore.setState({ errorMessage: null }); }} style={LINK_BTN}>
          Forgot password?
        </button>
        <button onClick={() => { setOtpMode(true); useAuthStore.setState({ errorMessage: null }); }} style={LINK_BTN}>
          Email me a code
        </button>
      </div>

      <button onClick={onBack} style={BTN_GHOST}>Back</button>

      {errorMessage && <p style={{ fontSize: 13, color: 'var(--rust)', marginTop: 14 }}>{errorMessage}</p>}
    </Shell>
  );
}
