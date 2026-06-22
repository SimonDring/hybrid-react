/**
 * authShell — shared chrome + styles for the auth screens (Welcome, SignIn,
 * CreateAccount). Extracted from the old Login.jsx so every auth state looks
 * consistent. Uses real theme variables only.
 */

export const INPUT = {
  width: '100%', fontSize: 16, padding: '14px 16px', borderRadius: 12,
  border: '1px solid var(--hairline)', background: 'var(--bg-surface)',
  fontFamily: 'inherit', color: 'var(--txt-strong)', marginBottom: 12,
  boxSizing: 'border-box'
};

export const BTN_PRIMARY = (active) => ({
  width: '100%', padding: 15, borderRadius: 12, border: 'none',
  background: active ? 'var(--accent)' : 'var(--bg-surface-2)',
  color: active ? 'var(--on-action)' : 'var(--txt-muted)',
  fontSize: 15, fontWeight: 600, cursor: active ? 'pointer' : 'default',
  fontFamily: 'inherit', transition: 'background 0.15s'
});

export const BTN_GHOST = {
  width: '100%', padding: 14, borderRadius: 12,
  border: '1px solid var(--hairline)', background: 'transparent',
  color: 'var(--txt-muted)', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit', marginTop: 10
};

export const BTN_SOCIAL = {
  width: '100%', padding: 14, borderRadius: 12, marginBottom: 12,
  border: '1px solid var(--hairline)', background: 'var(--bg-surface)',
  color: 'var(--txt-strong)', fontSize: 15, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit', display: 'flex',
  alignItems: 'center', justifyContent: 'center', gap: 10
};

export const LINK_BTN = {
  background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0
};

export const NOTICE = {
  padding: '14px 16px', borderRadius: 12, marginBottom: 20,
  background: 'rgba(74,93,58,0.10)', border: '1px solid rgba(74,93,58,0.30)',
  fontSize: 13, lineHeight: 1.5, color: 'var(--txt-body)'
};

// Shared page chrome so every auth state looks consistent.
export function Shell({ heading, sub, children }) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '32px 24px', maxWidth: 440, margin: '0 auto'
    }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 10 }}>
          Hybrid Training
        </div>
        <h1 className="h1" style={{ marginBottom: 8 }}>{heading}</h1>
        <p className="sub" style={{ marginBottom: 0 }}>{sub}</p>
      </div>
      {children}
    </div>
  );
}
