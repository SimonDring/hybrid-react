const PRINCIPLES = [
  { title: 'Sleep is the foundation', body: 'Nothing else compensates. Below 7h and the plan adjusts down, not the other way around.' },
  { title: 'RPE caps are real caps', body: 'Hitting RPE 9 on a planned RPE 7 day is not winning. It is borrowing against next week.' },
  { title: 'Technique before load', body: 'Especially for swim. Especially with a sensitive tendon. The plan is built around this.' },
  { title: 'Deloads are mandatory', body: 'Skipping a deload is the single most common way to wreck a long programme. Every 4th week, no exceptions.' },
  { title: 'Outcomes gate phases', body: 'Hitting the calendar mark is not the gate. Hitting the outcome is. If outcomes are not hit, the phase repeats.' },
  { title: 'Provisional is provisional', body: 'Phases 2–5 are best-guess scaffolds. They will be rewritten with real data at quarterly reassessment.' },
  { title: 'The plan serves you, not vice versa', body: 'If the plan stops fitting reality, change the plan. Holding to a programme that no longer makes sense is identity, not training.' }
];

export default function Principles() {
  return (
    <>
      <h1 className="h1">Operating principles</h1>
      <p className="sub">The non-negotiables. If something in the plan contradicts these, the plan is wrong.</p>

      {PRINCIPLES.map((p, i) => (
        <div key={i} className="principle" style={{ display: 'grid', gridTemplateColumns: '40px 1fr', alignItems: 'start' }}>
          <div className="roman">{['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ'][i] || (i + 1)}</div>
          <div>
            <h4>{p.title}</h4>
            <p style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5 }}>{p.body}</p>
          </div>
        </div>
      ))}
    </>
  );
}
