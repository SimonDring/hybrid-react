import { useState, useRef, useEffect } from 'react';
import { playBeep } from '../lib/sound.js';

function fmt(s) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

/**
 * RestTimer — a tap-to-run rest countdown for use between sets.
 *
 * Timing is TIMESTAMP-based, not a ticking counter: we store the wall-clock moment
 * the rest ends (`endAtRef`) and derive the display from `now`. So when iOS suspends
 * the page (screen lock / backgrounded), the countdown doesn't drift — the instant
 * the page is visible again it reads the true remaining time, and if it elapsed while
 * away it completes immediately (catch-up). Completion fires exactly once (`firedRef`).
 *
 * Props (unchanged):
 *   restStart: { secs, at } — changes auto-start a rest, anchored to `at` (the real
 *     set-completion time) so the countdown is correct even if the tab was busy.
 *   onComplete: optional — fired once when the countdown reaches 0 (the runner uses it
 *     to auto-advance). Called from a timer/visibility callback (never during render).
 * Rest duration is always plan-prescribed; tap the time to pause/resume. Vibrates + beeps on finish.
 */
export default function RestTimer({ restStart, onComplete }) {
  const [secs, setSecs] = useState(0);
  const [running, setRunning] = useState(false);
  const endAtRef = useRef(null);       // wall-clock ms when the rest ends (while running)
  const pausedRef = useRef(0);         // seconds remaining while paused
  const firedRef = useRef(false);      // onComplete fires once per rest period
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // The one place a rest ends — guarded so it runs once. Called from the tick or the
  // visibility handler (post-commit callbacks), never from inside a render/updater.
  const finish = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    endAtRef.current = null;
    setRunning(false);
    setSecs(0);
    if (navigator.vibrate) navigator.vibrate(250);
    playBeep();
    onCompleteRef.current?.();
  };

  const remainingNow = () => Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));

  // Display tick — derived from the end timestamp, so a suspended interval can't drift.
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const r = remainingNow();
      setSecs(r);
      if (r <= 0) finish();
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [running]);

  // Catch-up: recompute the instant the page is visible again after a lock/background.
  useEffect(() => {
    if (!running) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const r = remainingNow();
      setSecs(r);
      if (r <= 0) finish();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
    };
  }, [running]);


  // Tap the display: pause (capture remaining) / resume (fresh end time from remaining).
  const toggle = () => {
    if (running) {
      pausedRef.current = remainingNow();
      endAtRef.current = null;
      setRunning(false);
    } else if (secs > 0) {
      endAtRef.current = Date.now() + (pausedRef.current || secs) * 1000;
      setRunning(true);
    }
  };

  // Restart the same prescribed rest from the top (plan-driven — no manual durations).
  const restart = () => {
    if (!restStart?.secs) return;
    firedRef.current = false;
    pausedRef.current = 0;
    endAtRef.current = Date.now() + restStart.secs * 1000;
    setSecs(restStart.secs);
    setRunning(true);
  };

  // Auto-start when a set is logged — restStart.at changes each time. Anchor to the
  // real set-completion timestamp so the countdown is accurate from the off.
  useEffect(() => {
    if (restStart?.secs > 0) {
      firedRef.current = false;
      endAtRef.current = (restStart.at || Date.now()) + restStart.secs * 1000;
      setSecs(remainingNow());
      setRunning(true);
    }
  }, [restStart]);

  return (
    <div className="rest-timer">
      <button className={`rt-display ${running ? 'running' : ''}`} onClick={toggle} disabled={secs === 0}>
        <span className="rt-label">Rest</span>
        <span className="rt-time">{fmt(secs)}</span>
        <span className="rt-state">{running ? 'tap to pause' : 'tap to resume'}</span>
      </button>
      {secs > 0 && (
        <div className="rt-presets">
          <button className="rt-preset rt-reset" onClick={restart}>Restart rest</button>
        </div>
      )}
    </div>
  );
}
