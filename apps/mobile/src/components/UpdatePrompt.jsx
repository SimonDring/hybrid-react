import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * UpdatePrompt — surfaces a new deploy to the user instead of swapping the bundle silently.
 *
 * The PWA is registered in `prompt` mode (vite.config.js): when a new service worker is waiting,
 * `needRefresh` flips true and we show a toast. Tapping Reload calls `updateServiceWorker(true)`
 * (skipWaiting + reload). Dismiss hides it for this session — the waiting SW still activates on the
 * next full app restart, so no one gets stuck. Mounted at the ROOT (main.jsx), above App's early
 * returns, so it also reaches a user stranded on a stale auth/onboarding screen.
 */

// Pure presentational toast — no service-worker deps, so it can be rendered for a screenshot/preview.
export function UpdateToast({ onReload, onDismiss }) {
  return (
    <div className="update-toast" role="alert" aria-live="polite">
      <span className="update-toast__msg">A new version is available.</span>
      <div className="update-toast__actions">
        <button type="button" className="update-toast__reload" onClick={onReload}>Reload</button>
        <button type="button" className="update-toast__dismiss" onClick={onDismiss} aria-label="Dismiss">Later</button>
      </div>
    </div>
  );
}

const HOUR = 60 * 60 * 1000;

export default function UpdatePrompt() {
  const regRef = useRef(null);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      regRef.current = r || null;
      // Catch a deploy that lands while the app is left open: poll hourly.
      if (r) setInterval(() => { r.update().catch(() => {}); }, HOUR);
    },
  });

  // Also check for an update whenever the app returns to the foreground (the common case for an
  // installed PWA the user reopens) — that's exactly when a fresh deploy should be noticed.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') regRef.current?.update().catch(() => {});
    };
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, []);

  // Dev/preview hook: `?updatetoast=1` forces the toast so its look can be verified without a real
  // second deploy. No effect on normal use.
  const [forced, setForced] = useState(
    () => typeof location !== 'undefined' && new URLSearchParams(location.search).get('updatetoast') === '1'
  );

  if (!needRefresh && !forced) return null;
  return (
    <UpdateToast
      onReload={() => updateServiceWorker(true)}
      onDismiss={() => { setNeedRefresh(false); setForced(false); }}
    />
  );
}
