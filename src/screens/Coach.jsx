/**
 * Coach — placeholder for the future AI coach (Stage 5, Claude via a Supabase
 * Edge Function). Non-functional for now: it sets up the vision and reserves the
 * home for the chat. The real coach will read your plan, recovery data, goals and
 * injuries to discuss changes and adapt the programme.
 */

export default function Coach() {
  return (
    <>
      <div className="eyebrow">Coming soon</div>
      <h1 className="h1">Your AI coach</h1>
      <p className="sub">
        A conversation with your plan. Soon you'll be able to talk through changes,
        set new goals, and adjust training around how life and recovery are actually going —
        powered by Claude, reading your sessions, wearable data, goals and injuries.
      </p>

      <div className="coach-preview">
        <div className="coach-bubble coach-bubble-ai">
          Hey Simon — your HRV's been trending down this week and Thursday's run felt
          hard. Want me to ease the weekend long run and shift the quality session?
        </div>
        <div className="coach-bubble coach-bubble-you">
          Yeah, and I've got a ski trip moved up to March — can we factor that in?
        </div>
        <div className="coach-bubble coach-bubble-ai">
          On it. I'll bring the ski-specific lower-body work forward and protect your knees.
        </div>
      </div>

      <div className="coach-input" aria-hidden="true">
        <span>Ask your coach…</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </div>
      <p className="sub" style={{ fontSize: 12, marginTop: 10, textAlign: 'center' }}>
        Not available yet — arriving in a later stage.
      </p>
    </>
  );
}
