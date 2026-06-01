/**
 * Login screen — two-step email OTP sign-in.
 *
 * Step 1: user enters their email → Supabase sends a 6-digit code.
 * Step 2: user enters the code → verifyOtp() signs them in inside the app.
 *
 * This avoids the magic-link redirect problem on iOS PWAs, where clicking a
 * link in Mail opens Safari (a separate context) instead of the home screen app.
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

export default function Login() {
  const signInWithEmail = useAuthStore(s => s.signInWithEmail);
  const verifyOtp       = useAuthStore(s => s.verifyOtp);
  const resetLinkSent   = useAuthStore(s => s.resetLinkSent);
  const sendingLink     = useAuthStore(s => s.sendingLink);
  const verifyingOtp    = useAuthStore(s => s.verifyingOtp);
  const linkSentTo      = useAuthStore(s => s.linkSentTo);
  const errorMessage    = useAuthStore(s => s.errorMessage);
  const status          = useAuthStore(s => s.status);

  const [email, setEmail] = useState('');
  const [code, setCode]   = useState('');

  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const validCode  = /^\d{6}$/.test(code.trim());

  const submitEmail = () => { if (validEmail) signInWithEmail(email); };
  const submitCode  = () => { if (validCode)  verifyOtp(linkSentTo, code); };

  const handleCodeChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
    // Auto-submit once 6 digits are entered
    if (val.length === 6) verifyOtp(linkSentTo, val);
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '32px 24px', maxWidth: 440, margin: '0 auto'
    }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 10 }}>
          Hybrid Training
        </div>
        <h1 className="h1" style={{ marginBottom: 8 }}>
          {linkSentTo ? 'Check your email' : 'Sign in'}
        </h1>
        <p className="sub" style={{ marginBottom: 0 }}>
          {linkSentTo
            ? `We sent a 6-digit code to ${linkSentTo}. Enter it below to sign in.`
            : 'Enter your email and we’ll send you a 6-digit sign-in code. No password needed.'}
        </p>
      </div>

      {status === 'not_configured' && (
        <div style={{
          padding: '14px 16px', borderRadius: 12, marginBottom: 20,
          background: 'rgba(176,74,46,0.08)', border: '1px solid rgba(176,74,46,0.25)',
          fontSize: 13, lineHeight: 1.5, color: 'var(--txt-body)'
        }}>
          Supabase isn't configured yet. Add your keys to <code>.env.local</code> and restart the dev server.
        </div>
      )}

      {!linkSentTo ? (
        <>
          <input
            type="email"
            inputMode="email"
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitEmail()}
            style={INPUT}
          />
          <button
            onClick={submitEmail}
            disabled={!validEmail || sendingLink}
            style={BTN_PRIMARY(validEmail && !sendingLink)}
          >
            {sendingLink ? 'Sending…' : 'Send code'}
          </button>
        </>
      ) : (
        <>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            value={code}
            onChange={handleCodeChange}
            onKeyDown={e => e.key === 'Enter' && submitCode()}
            style={{ ...INPUT, fontSize: 28, letterSpacing: '0.25em', textAlign: 'center' }}
            autoFocus
          />
          <button
            onClick={submitCode}
            disabled={!validCode || verifyingOtp}
            style={BTN_PRIMARY(validCode && !verifyingOtp)}
          >
            {verifyingOtp ? 'Verifying…' : 'Sign in'}
          </button>
          <button onClick={() => { resetLinkSent(); setCode(''); }} style={BTN_GHOST}>
            Use a different email
          </button>
          <button
            onClick={() => { setCode(''); signInWithEmail(linkSentTo); }}
            style={{ ...BTN_GHOST, border: 'none', color: 'var(--txt-muted)', fontSize: 13, marginTop: 4 }}
          >
            Resend code
          </button>
        </>
      )}

      {errorMessage && (
        <p style={{ fontSize: 13, color: 'var(--rust)', marginTop: 14 }}>{errorMessage}</p>
      )}

      <p style={{ fontSize: 11, opacity: 0.5, marginTop: 28, lineHeight: 1.5 }}>
        Your data is private to your account. Signing in lets it sync across your devices.
      </p>
    </div>
  );
}
