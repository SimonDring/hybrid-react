/**
 * sound — a tiny Web Audio beep for the rest-timer completion.
 *
 * No audio asset; lazily creates one shared AudioContext. iOS only lets audio play
 * after a user gesture, so call ensureAudio() from a tap handler (e.g. logging a set)
 * to unlock the context — a later programmatic playBeep() is then allowed while the
 * screen is on. Everything is wrapped so it's a silent no-op where Web Audio is
 * unavailable; the timer's vibrate still fires.
 */

let ctx = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) { try { ctx = new AC(); } catch { return null; } }
  return ctx;
}

// Unlock / resume the audio context from within a user gesture.
export function ensureAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

// A short ~0.15s sine beep. Safe to call any time; no-ops if audio is unavailable.
export function playBeep() {
  const c = getCtx();
  if (!c) return;
  try {
    if (c.state === 'suspended') c.resume().catch(() => {});
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    const t = c.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  } catch { /* no-op */ }
}

export default { ensureAudio, playBeep };
