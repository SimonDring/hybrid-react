import { useState, useRef, useEffect } from 'react';

const PRESETS = [60, 90, 120];

function fmt(s) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

/**
 * RestTimer — a tap-to-run rest countdown for use between sets.
 * Pick a preset to start; tap the time to pause/resume. Vibrates on finish
 * (where supported). Fully self-contained, no persistence.
 */
export default function RestTimer() {
  const [secs, setSecs] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          if (navigator.vibrate) navigator.vibrate(250);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const start = (n) => { setSecs(n); setRunning(true); };
  const toggle = () => { if (secs > 0) setRunning(r => !r); };
  const reset = () => { setRunning(false); setSecs(0); };

  return (
    <div className="rest-timer">
      <button className={`rt-display ${running ? 'running' : ''}`} onClick={toggle} disabled={secs === 0}>
        <span className="rt-label">Rest</span>
        <span className="rt-time">{fmt(secs)}</span>
        <span className="rt-state">{secs === 0 ? 'pick a time' : running ? 'tap to pause' : 'tap to resume'}</span>
      </button>
      <div className="rt-presets">
        {PRESETS.map(n => (
          <button key={n} className="rt-preset" onClick={() => start(n)}>{n}s</button>
        ))}
        {secs > 0 && <button className="rt-preset rt-reset" onClick={reset}>Reset</button>}
      </div>
    </div>
  );
}
