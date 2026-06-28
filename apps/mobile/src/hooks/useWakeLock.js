import { useEffect, useRef } from 'react';

/**
 * useWakeLock(active) — keep the screen awake while `active` is true (e.g. the whole
 * time the focused-session runner is open), so the screen never auto-locks between
 * sets or during rest and the timer stays visible / its alarm reliably fires.
 *
 * Screen wake locks are auto-released when the page is hidden, so we re-acquire on
 * `visibilitychange` when the page becomes visible again. Wrapped in try/catch:
 * where the API is missing (older iOS) or the request is denied (low-power mode),
 * it's a silent no-op — the app still works, just without keeping the screen on.
 *
 * Feasibility note: Screen Wake Lock is iOS Safari 16.4+, and the installed-PWA bug
 * was fixed in iOS 18.4 — so it works on current iOS and degrades gracefully below.
 */
export function useWakeLock(active) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.wakeLock) return;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || sentinelRef.current) return;
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) { try { await sentinel.release(); } catch { /* no-op */ } return; }
        sentinelRef.current = sentinel;
        sentinel.addEventListener?.('release', () => { sentinelRef.current = null; });
      } catch { /* unsupported / denied — no-op */ }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      const s = sentinelRef.current;
      sentinelRef.current = null;
      if (s) { try { s.release(); } catch { /* no-op */ } }
    };
  }, [active]);
}

export default useWakeLock;
