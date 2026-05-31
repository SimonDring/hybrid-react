const DECISIONS = [
  { scenario: 'KNEE FLARE', title: 'Knee pain ≥3/10 during/after run', action: 'Cut run volume 50% for 1 week. Increase Reverse Nordic + ISO quad work. If still flaring at week 2, drop running entirely and reassess.' },
  { scenario: 'LIFE SHIFT', title: 'Travel / illness / 5+ day disruption', action: 'On return: drop one volume tier (e.g. from build to deload). Resume normal progression only when sleep + RHR back to baseline.' },
  { scenario: 'STRENGTH STALL', title: 'No load increase for 3 consecutive weeks', action: 'Deload. Then return at 90% with stricter RPE caps. If still stalled, sleep/nutrition audit before programming change.' },
  { scenario: 'POOR SLEEP', title: 'Sleep score <6 for 5+ days', action: 'Add full rest day. Reduce all intensity by one RPE. Caffeine cutoff 12pm. No training PRs while sleep deficit.' },
  { scenario: 'MOVE ABROAD', title: 'Confirmed 3-year move' , action: 'Phase 5+ replanned at next quarterly. Adjust race targets to new geography. Strength gym access becomes priority criterion.' },
  { scenario: 'AHEAD OF SCHEDULE', title: 'Phase gates hit early', action: 'Do NOT accelerate phase. Maintain pace, use remaining weeks to consolidate. Big PRs early are often noise.' }
];

export default function Decisions() {
  return (
    <>
      <h1 className="h1">Decision framework</h1>
      <p className="sub">Pre-decided responses to common disruptions. Removes in-the-moment debate.</p>

      {DECISIONS.map((d, i) => (
        <div key={i} className="decision-card">
          <div className="scen">{d.scenario}</div>
          <h4>{d.title}</h4>
          <p>{d.action}</p>
        </div>
      ))}
    </>
  );
}
