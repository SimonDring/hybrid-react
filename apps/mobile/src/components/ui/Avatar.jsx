/**
 * Avatar — the user's profile image. Shows the uploaded photo when
 * `avatar.url` is set, otherwise an initials circle tinted with `avatar.color`
 * (or a stable colour derived from the name). Photo upload lands in Phase 2;
 * this component already renders a photo the moment a URL exists.
 *
 * Pure/presentational — pass `name` + `profile.avatar`. Not a button itself, so
 * it can sit inside a larger tappable region (e.g. the home header).
 */

const PALETTE = ['var(--accent)', 'var(--accent-2)', 'var(--accent-warm)', 'var(--disc-run)', 'var(--disc-swim)', 'var(--disc-cycle)'];

function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h + name.charCodeAt(i)) % PALETTE.length;
  return PALETTE[h];
}

export default function Avatar({ name, avatar, size = 42, className = '' }) {
  const url = avatar && avatar.url;
  const base = { width: size, height: size, borderRadius: '50%', flex: 'none' };

  if (url) {
    return (
      <img className={`avatar ${className}`} src={url} alt={name || 'Profile'}
        style={{ ...base, objectFit: 'cover' }} />
    );
  }

  const color = (avatar && avatar.color) || colorFor(name);
  const initials = initialsOf(name);
  return (
    <span className={`avatar avatar-initials ${className}`} aria-hidden="true"
      style={{ ...base, background: 'var(--bg-surface-2)', color, border: '1px solid var(--hairline)',
        fontWeight: 600, fontSize: Math.round(size * 0.38) }}>
      {initials || (
        <svg viewBox="0 0 24 24" width={Math.round(size * 0.5)} height={Math.round(size * 0.5)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
        </svg>
      )}
    </span>
  );
}
